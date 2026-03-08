import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_FEE_PERCENT = 10;

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[REQUEST-EVENT-REFUND] ${step}`, details ? JSON.stringify(details) : "");
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

    const userId = userData.user.id;
    logStep("Utilisateur authentifié", { userId });

    const { eventId, message } = await req.json();
    
    if (!eventId) {
      throw new Error("eventId requis");
    }

    logStep("Paramètres reçus", { eventId, message });

    // Récupérer le paiement de l'utilisateur pour cet événement
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("event_payment")
      .select("id, amount, status")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .eq("status", "completed")
      .maybeSingle();

    if (paymentError || !payment) {
      throw new Error("Aucun paiement valide trouvé pour cet événement");
    }

    logStep("Paiement trouvé", { paymentId: payment.id, amount: payment.amount });

    // Vérifier qu'il n'y a pas déjà une demande en cours
    const { data: existingRequest } = await supabaseAdmin
      .from("event_refund_request")
      .select("id, status")
      .eq("payment_id", payment.id)
      .maybeSingle();

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        throw new Error("Vous avez déjà une demande de remboursement en attente");
      } else if (existingRequest.status === "approved") {
        throw new Error("Votre demande de remboursement a déjà été approuvée");
      }
      // Si rejetée, on pourrait permettre une nouvelle demande, mais pour simplifier on bloque
      throw new Error("Une demande de remboursement existe déjà pour ce paiement");
    }

    // Calculer le montant du remboursement (90% du montant payé)
    const refundAmount = Number(payment.amount) * (1 - PLATFORM_FEE_PERCENT / 100);

    logStep("Montant de remboursement calculé", { 
      originalAmount: payment.amount, 
      refundAmount,
      feePercent: PLATFORM_FEE_PERCENT 
    });

    // Créer la demande de remboursement
    const { data: refundRequest, error: insertError } = await supabaseAdmin
      .from("event_refund_request")
      .insert({
        event_id: eventId,
        user_id: userId,
        payment_id: payment.id,
        message: message || null,
        refund_amount: refundAmount,
        status: "pending"
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Erreur lors de la création de la demande: ${insertError.message}`);
    }

    logStep("Demande de remboursement créée", { requestId: refundRequest.id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        refundRequest: {
          id: refundRequest.id,
          refundAmount,
          status: "pending"
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
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
