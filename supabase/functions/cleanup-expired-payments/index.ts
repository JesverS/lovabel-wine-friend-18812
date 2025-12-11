import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import Stripe from "https://esm.sh/stripe@18.5.0";
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CLEANUP-EXPIRED-PAYMENTS] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Cleanup started");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // First, get expired payments before deleting (to expire Stripe sessions)
    const { data: expiredPayments, error: fetchError } = await supabaseAdmin
      .from('event_payment')
      .select('id, event_id, user_id, stripe_session_id')
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());

    if (fetchError) {
      logStep("Error fetching expired payments", { error: fetchError.message });
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la récupération des paiements expirés' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expiredCount = expiredPayments?.length || 0;
    logStep("Found expired payments", { count: expiredCount });

    if (expiredCount === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          cleanedCount: 0,
          message: 'Aucun paiement expiré à nettoyer' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to expire Stripe sessions (optional, they may already be expired)
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      
      for (const payment of expiredPayments) {
        if (payment.stripe_session_id) {
          try {
            await stripe.checkout.sessions.expire(payment.stripe_session_id);
            logStep("Stripe session expired", { sessionId: payment.stripe_session_id });
          } catch (stripeError) {
            // Session may already be expired or completed, ignore
            logStep("Could not expire Stripe session (may already be expired)", { 
              sessionId: payment.stripe_session_id,
              error: stripeError instanceof Error ? stripeError.message : 'Unknown error'
            });
          }
        }
      }
    }

    // Delete expired payments from database
    const expiredIds = expiredPayments.map(p => p.id);
    const { error: deleteError } = await supabaseAdmin
      .from('event_payment')
      .delete()
      .in('id', expiredIds);

    if (deleteError) {
      logStep("Error deleting expired payments", { error: deleteError.message });
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la suppression des paiements expirés' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep("Cleanup completed successfully", { cleanedCount: expiredCount });

    return new Response(
      JSON.stringify({ 
        success: true, 
        cleanedCount: expiredCount,
        cleanedPayments: expiredPayments.map(p => ({ id: p.id, eventId: p.event_id })),
        message: `${expiredCount} paiement(s) expiré(s) supprimé(s)` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logStep("Unexpected error", { error: error instanceof Error ? error.message : 'Unknown error' });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
