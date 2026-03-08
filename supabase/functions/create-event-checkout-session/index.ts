import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
      .select("id, name, price, currency, access_type, max_participants, organizer_id, start_date")
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

    // Vérifier que l'événement n'est pas déjà passé
    if (event.start_date && new Date(event.start_date) < new Date()) {
      logStep("Event already started", { startDate: event.start_date });
      return new Response(JSON.stringify({ error: "Cet événement est déjà passé ou en cours" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      .select("id, expires_at, stripe_session_id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .single();

    // If there's a pending payment, try to return the existing Stripe session URL
    if (pendingPayment) {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2025-08-27.basil",
      });

      try {
        const existingSession = await stripe.checkout.sessions.retrieve(pendingPayment.stripe_session_id);
        
        // If session is still open, return its URL
        if (existingSession.status === 'open' && existingSession.url) {
          logStep("Returning existing session URL", { sessionId: existingSession.id });
          return new Response(JSON.stringify({ url: existingSession.url }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // Session is expired or completed, clean it up
        logStep("Existing session no longer valid, cleaning up", { status: existingSession.status });
        await supabaseAdmin
          .from("event_payment")
          .delete()
          .eq("id", pendingPayment.id);
          
      } catch (stripeError) {
        logStep("Error retrieving existing session, cleaning up", { error: stripeError });
        await supabaseAdmin
          .from("event_payment")
          .delete()
          .eq("id", pendingPayment.id);
      }
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get organizer's Stripe Connect account
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

    // Create Stripe checkout session FIRST
    const session = await stripe.checkout.sessions.create(sessionOptions);
    logStep("Checkout session created", { sessionId: session.id });

    // ATOMIC RESERVATION: Use RPC function to reserve spot with FOR UPDATE lock
    // This prevents race conditions when multiple users try to book the last spot
    const { data: reservation, error: reservationError } = await supabaseAdmin
      .rpc('reserve_event_spot', {
        p_event_id: eventId,
        p_user_id: user.id,
        p_stripe_session_id: session.id,
        p_amount: event.price,
        p_currency: event.currency || 'EUR'
      });

    // Check if reservation failed
    if (reservationError) {
      logStep("Reservation RPC error", { error: reservationError.message });
      // Expire the Stripe session since we couldn't reserve the spot
      try {
        await stripe.checkout.sessions.expire(session.id);
        logStep("Stripe session expired due to reservation failure");
      } catch (expireError) {
        logStep("Failed to expire Stripe session", { error: expireError });
      }
      return new Response(JSON.stringify({ error: "Erreur lors de la réservation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reservationResult = reservation?.[0];
    if (!reservationResult?.success) {
      logStep("Reservation failed - event full", { result: reservationResult });
      // Expire the Stripe session since we couldn't reserve the spot
      try {
        await stripe.checkout.sessions.expire(session.id);
        logStep("Stripe session expired - event full");
      } catch (expireError) {
        logStep("Failed to expire Stripe session", { error: expireError });
      }
      return new Response(JSON.stringify({ 
        error: reservationResult?.error_message || "L'événement est complet" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Spot reserved atomically", { paymentId: reservationResult.payment_id });

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
