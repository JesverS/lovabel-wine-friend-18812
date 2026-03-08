import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-PENDING-PAYMENT] ${step}${detailsStr}`);
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

    const { paymentId } = await req.json();

    if (!paymentId) {
      return new Response(JSON.stringify({ error: "paymentId manquant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the pending payment and verify ownership
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("event_payment")
      .select("id, stripe_session_id, user_id, status")
      .eq("id", paymentId)
      .maybeSingle();

    if (paymentError || !payment) {
      logStep("Payment not found", { paymentId });
      return new Response(JSON.stringify({ error: "Paiement non trouvé" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    if (payment.user_id !== user.id) {
      logStep("Unauthorized - not owner", { paymentUserId: payment.user_id, requestUserId: user.id });
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow canceling pending payments
    if (payment.status !== 'pending') {
      logStep("Payment not pending", { status: payment.status });
      return new Response(JSON.stringify({ error: "Ce paiement ne peut pas être annulé" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Expire the Stripe session
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    try {
      await stripe.checkout.sessions.expire(payment.stripe_session_id);
      logStep("Stripe session expired", { sessionId: payment.stripe_session_id });
    } catch (stripeError) {
      // Session might already be expired, continue anyway
      logStep("Stripe session expire failed (might already be expired)", { error: stripeError });
    }

    // Delete the payment record to free up the spot
    const { error: deleteError } = await supabaseAdmin
      .from("event_payment")
      .delete()
      .eq("id", paymentId);

    if (deleteError) {
      logStep("Delete error", { error: deleteError.message });
      return new Response(JSON.stringify({ error: "Erreur lors de l'annulation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Payment cancelled successfully", { paymentId });

    return new Response(JSON.stringify({ success: true }), {
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
