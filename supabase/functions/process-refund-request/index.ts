import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[PROCESS-REFUND-REQUEST] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Authentifier l'utilisateur
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header manquant");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Utilisateur non authentifié");
    }

    const processorId = userData.user.id;
    logStep("Utilisateur authentifié", { processorId });

    const { requestId, action, rejectionReason } = await req.json();
    
    if (!requestId || !action) {
      throw new Error("requestId et action requis");
    }

    if (!["approve", "reject"].includes(action)) {
      throw new Error("Action invalide. Utilisez 'approve' ou 'reject'");
    }

    logStep("Paramètres reçus", { requestId, action, rejectionReason });

    // Récupérer la demande de remboursement
    const { data: refundRequest, error: requestError } = await supabaseAdmin
      .from("event_refund_request")
      .select(`
        *,
        event_payment:payment_id (
          id,
          amount,
          stripe_payment_intent_id,
          event_id,
          user_id
        )
      `)
      .eq("id", requestId)
      .single();

    if (requestError || !refundRequest) {
      throw new Error("Demande de remboursement introuvable");
    }

    if (refundRequest.status !== "pending") {
      throw new Error("Cette demande a déjà été traitée");
    }

    logStep("Demande trouvée", { 
      requestId: refundRequest.id,
      eventId: refundRequest.event_id,
      paymentId: refundRequest.payment_id
    });

    // Vérifier que l'utilisateur est organizer ou co_organizer de l'événement
    const { data: membership, error: memberError } = await supabaseAdmin
      .from("user_event")
      .select("role")
      .eq("event_id", refundRequest.event_id)
      .eq("user_id", processorId)
      .single();

    if (memberError || !membership || !["organizer", "co_organizer"].includes(membership.role)) {
      throw new Error("Vous n'avez pas les droits pour traiter cette demande");
    }

    logStep("Droits vérifiés", { role: membership.role });

    if (action === "approve") {
      // Effectuer le remboursement Stripe
      const payment = refundRequest.event_payment;
      
      if (!payment.stripe_payment_intent_id) {
        throw new Error("Impossible de rembourser: pas de payment intent Stripe");
      }

      // Calculer le montant à rembourser en centimes
      const refundAmountCents = Math.round(Number(refundRequest.refund_amount) * 100);

      logStep("Remboursement Stripe en cours", { 
        paymentIntentId: payment.stripe_payment_intent_id,
        refundAmountCents
      });

      // Créer le remboursement Stripe avec reverse_transfer
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        amount: refundAmountCents,
        reverse_transfer: true,
      });

      logStep("Remboursement Stripe effectué", { refundId: refund.id });

      // Mettre à jour le paiement
      await supabaseAdmin
        .from("event_payment")
        .update({ 
          status: "refunded",
          refunded_at: new Date().toISOString()
        })
        .eq("id", payment.id);

      // Supprimer l'utilisateur de l'événement
      await supabaseAdmin
        .from("user_event")
        .delete()
        .eq("event_id", refundRequest.event_id)
        .eq("user_id", refundRequest.user_id);

      logStep("Utilisateur retiré de l'événement");

      // Mettre à jour la demande
      await supabaseAdmin
        .from("event_refund_request")
        .update({
          status: "approved",
          processed_at: new Date().toISOString(),
          processed_by: processorId
        })
        .eq("id", requestId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: "approved",
          refundId: refund.id
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );

    } else {
      // Rejeter la demande
      await supabaseAdmin
        .from("event_refund_request")
        .update({
          status: "rejected",
          processed_at: new Date().toISOString(),
          processed_by: processorId,
          rejection_reason: rejectionReason || null
        })
        .eq("id", requestId);

      logStep("Demande rejetée", { rejectionReason });

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: "rejected"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    logStep("Erreur", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
