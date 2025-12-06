import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!signature || !webhookSecret) {
      console.error("Missing signature or webhook secret");
      return new Response(JSON.stringify({ error: "Configuration manquante" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("Webhook signature verification failed:", message);
      return new Response(JSON.stringify({ error: "Signature invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Webhook event received:", event.type);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const eventId = session.metadata?.event_id;
      const userId = session.metadata?.user_id;

      if (!eventId || !userId) {
        console.error("Missing metadata in session:", session.id);
        return new Response(JSON.stringify({ error: "Métadonnées manquantes" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Processing payment for event ${eventId}, user ${userId}`);

      // Update payment record
      const { error: updateError } = await supabaseAdmin
        .from("event_payment")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq("stripe_session_id", session.id);

      if (updateError) {
        console.error("Error updating payment:", updateError);
      }

      // Check if user already exists in user_event
      const { data: existingMember } = await supabaseAdmin
        .from("user_event")
        .select("user_id")
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingMember) {
        // Add user as participant with 'paid' access_origin
        const { error: memberError } = await supabaseAdmin
          .from("user_event")
          .insert({
            event_id: eventId,
            user_id: userId,
            role: "participant",
            access_origin: "paid",
          });

        if (memberError) {
          console.error("Error adding event participant:", memberError);
          return new Response(JSON.stringify({ error: "Erreur lors de l'ajout du participant" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log(`User ${userId} added as paid participant to event ${eventId}`);
      } else {
        console.log(`User ${userId} already exists in event ${eventId}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
