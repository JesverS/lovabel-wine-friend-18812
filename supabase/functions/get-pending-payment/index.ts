import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-PENDING-PAYMENT] ${step}${detailsStr}`);
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

    const { eventId } = await req.json();

    if (!eventId) {
      return new Response(JSON.stringify({ error: "eventId manquant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get pending payment for this user/event
    const { data: pendingPayment, error: paymentError } = await supabaseAdmin
      .from("event_payment")
      .select("id, stripe_session_id, expires_at, amount, currency")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (paymentError || !pendingPayment) {
      logStep("No pending payment found");
      return new Response(JSON.stringify({ 
        hasPending: false 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Pending payment found", { paymentId: pendingPayment.id });

    // Retrieve Stripe session to get the URL
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    try {
      const session = await stripe.checkout.sessions.retrieve(pendingPayment.stripe_session_id);
      
      // Check if session is still valid
      if (session.status === 'expired' || session.status === 'complete') {
        logStep("Stripe session no longer valid", { status: session.status });
        
        // Clean up the expired/completed payment record
        await supabaseAdmin
          .from("event_payment")
          .update({ status: session.status === 'complete' ? 'completed' : 'expired' })
          .eq("id", pendingPayment.id);
        
        return new Response(JSON.stringify({ 
          hasPending: false 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      logStep("Returning pending payment info", { 
        sessionStatus: session.status,
        expiresAt: pendingPayment.expires_at 
      });

      return new Response(JSON.stringify({
        hasPending: true,
        paymentId: pendingPayment.id,
        stripeUrl: session.url,
        expiresAt: pendingPayment.expires_at,
        amount: pendingPayment.amount,
        currency: pendingPayment.currency,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (stripeError) {
      logStep("Stripe session retrieval error", { error: stripeError });
      
      // If we can't retrieve the session, it's probably invalid
      await supabaseAdmin
        .from("event_payment")
        .update({ status: 'expired' })
        .eq("id", pendingPayment.id);
      
      return new Response(JSON.stringify({ 
        hasPending: false 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
