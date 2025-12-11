import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Platform fee percentage (includes Stripe fees ~2.9% + platform commission)
const PLATFORM_FEE_PERCENT = 10;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EVENT-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      logStep("Auth error", { error: authError?.message });
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("User authenticated", { userId: user.id });

    // Create admin client early to bypass RLS for event lookup
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { eventId, successUrl, cancelUrl } = await req.json();

    if (!eventId || !successUrl || !cancelUrl) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get event details with organizer - use admin client to bypass RLS for private events
    const { data: event, error: eventError } = await supabaseAdmin
      .from("event")
      .select("id, name, price, currency, access_type, max_participants, organizer_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      logStep("Event not found", { error: eventError?.message });
      return new Response(JSON.stringify({ error: "Événement non trouvé" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Event found", { eventId: event.id, price: event.price, organizerId: event.organizer_id });

    if (event.access_type !== "paid") {
      return new Response(JSON.stringify({ error: "Cet événement n'est pas payant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!event.price) {
      return new Response(JSON.stringify({ error: "Prix non défini pour cet événement" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already has access
    const { data: existingMember } = await supabaseAdmin
      .from("user_event")
      .select("user_id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      return new Response(JSON.stringify({ error: "Vous avez déjà accès à cet événement" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing pending payment for this user
    const { data: pendingPayment } = await supabaseAdmin
      .from("event_payment")
      .select("id, expires_at")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (pendingPayment) {
      return new Response(JSON.stringify({ error: "Vous avez déjà un paiement en cours. Veuillez attendre 30 minutes ou finaliser votre paiement." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check max participants (count confirmed + pending reservations to prevent race conditions)
    if (event.max_participants) {
      // Count confirmed participants
      const { count: confirmedCount } = await supabaseAdmin
        .from("user_event")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);

      // Count pending payments (temporary reservations) that are not expired
      const { count: pendingCount } = await supabaseAdmin
        .from("event_payment")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString());

      const totalReserved = (confirmedCount || 0) + (pendingCount || 0);
      logStep("Checking availability", { confirmedCount, pendingCount, totalReserved, maxParticipants: event.max_participants });

      if (totalReserved >= event.max_participants) {
        return new Response(JSON.stringify({ error: "L'événement est complet ou toutes les places sont en cours de réservation" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get organizer's Stripe Connect account (supabaseAdmin already created above)
    const { data: organizerAccount } = await supabaseAdmin
      .from("organizer_stripe_account")
      .select("stripe_account_id, charges_enabled")
      .eq("user_id", event.organizer_id)
      .single();

    const amountInCents = Math.round(event.price * 100);
    const applicationFeeAmount = Math.round(amountInCents * (PLATFORM_FEE_PERCENT / 100));

    logStep("Payment calculation", {
      amountInCents,
      applicationFeeAmount,
      organizerReceives: amountInCents - applicationFeeAmount,
      hasConnectAccount: !!organizerAccount?.stripe_account_id,
    });

    // Session expires in 30 minutes
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;

    // Build checkout session options
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: (event.currency || "EUR").toLowerCase(),
            product_data: {
              name: event.name,
              description: `Accès à l'événement: ${event.name}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email,
      expires_at: expiresAt,
      metadata: {
        event_id: eventId,
        user_id: user.id,
      },
    };

    // If organizer has Stripe Connect, use transfer_data to send funds to them
    if (organizerAccount?.stripe_account_id && organizerAccount?.charges_enabled) {
      sessionOptions.payment_intent_data = {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: organizerAccount.stripe_account_id,
        },
      };
      logStep("Using Stripe Connect", { destinationAccount: organizerAccount.stripe_account_id });
    } else {
      logStep("No Connect account, payment goes to platform");
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(sessionOptions);
    logStep("Checkout session created", { sessionId: session.id });

    // Create payment record with 30 minute expiration
    const paymentExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { error: paymentError } = await supabaseAdmin
      .from("event_payment")
      .insert({
        event_id: eventId,
        user_id: user.id,
        amount: event.price,
        currency: event.currency || "EUR",
        status: "pending",
        stripe_session_id: session.id,
        expires_at: paymentExpiresAt,
      });
    
    logStep("Payment record created", { expiresAt: paymentExpiresAt });

    if (paymentError) {
      logStep("Error creating payment record", { error: paymentError.message });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
