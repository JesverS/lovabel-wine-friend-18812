import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

// Configuration des frais de remboursement (configurable via secrets)
const DEFAULT_REFUND_FEE_PERCENT = 3.5;
const DEFAULT_REFUND_FEE_FIXED = 0.30;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Récupérer les frais configurables
    const REFUND_FEE_PERCENT = parseFloat(Deno.env.get('REFUND_FEE_PERCENT') || String(DEFAULT_REFUND_FEE_PERCENT));
    const REFUND_FEE_FIXED = parseFloat(Deno.env.get('REFUND_FEE_FIXED') || String(DEFAULT_REFUND_FEE_FIXED));
    
    console.log('Refund fee config:', { REFUND_FEE_PERCENT, REFUND_FEE_FIXED });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { payment_id, reason } = body;

    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: 'payment_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer le paiement
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('event_payment')
      .select('id, stripe_payment_intent_id, amount, currency, user_id, event_id, status')
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: 'Paiement non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payment.status === 'refunded') {
      return new Response(
        JSON.stringify({ error: 'Ce paiement a déjà été remboursé' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payment.status !== 'completed') {
      return new Response(
        JSON.stringify({ error: 'Seuls les paiements complétés peuvent être remboursés' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que l'utilisateur a le droit de rembourser (organizer ou co_organizer)
    const { data: userRole } = await supabaseAdmin
      .from('user_event')
      .select('role')
      .eq('event_id', payment.event_id)
      .eq('user_id', user.id)
      .single();

    if (!userRole || !['organizer', 'co_organizer'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Seuls les organisateurs peuvent effectuer des remboursements' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convertir explicitement en nombre pour éviter NaN
    const amount = parseFloat(String(payment.amount));
    
    // Calculer les frais estimés (fourchette haute pour protéger l'organisateur)
    const estimatedFees = (amount * REFUND_FEE_PERCENT / 100) + REFUND_FEE_FIXED;
    const refundAmount = Math.max(0, amount - estimatedFees);
    const refundAmountCents = Math.round(refundAmount * 100);

    console.log('Refund calculation:', {
      originalAmount: amount,
      estimatedFees,
      refundAmount,
      refundAmountCents
    });

    // Effectuer le remboursement Stripe
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-08-27.basil' });

    try {
      // Créer le remboursement partiel avec reverse_transfer
      // Le remboursement est débité du compte Connect de l'organisateur
      // La différence (marge) reste sur le compte plateforme
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        amount: refundAmountCents, // Remboursement partiel en centimes
        reverse_transfer: true, // Débite le compte Connect de l'organisateur
        reason: reason || 'requested_by_customer',
      });

      console.log('Stripe refund created:', refund.id, 'amount:', refundAmountCents);
    } catch (stripeError: any) {
      console.error('Stripe refund error:', stripeError);
      return new Response(
        JSON.stringify({ error: `Erreur Stripe: ${stripeError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mettre à jour le statut du paiement avec les détails du remboursement
    const { error: updateError } = await supabaseAdmin
      .from('event_payment')
      .update({ 
        status: 'refunded', 
        refunded_at: new Date().toISOString(),
        metadata: {
          original_amount: amount,
          refunded_amount: refundAmount,
          fees_retained: estimatedFees,
        }
      })
      .eq('id', payment_id);

    if (updateError) {
      console.error('Payment update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Remboursement effectué mais erreur de mise à jour en base' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Supprimer l'accès de l'utilisateur à l'événement
    const { error: deleteError } = await supabaseAdmin
      .from('user_event')
      .delete()
      .eq('event_id', payment.event_id)
      .eq('user_id', payment.user_id);

    if (deleteError) {
      console.error('User event delete error:', deleteError);
      // Ne pas échouer car le remboursement est fait
    }

    console.log(`Refund successful: payment ${payment_id}, user ${payment.user_id} removed from event ${payment.event_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Remboursement effectué avec succès',
        original_amount: amount,
        refunded_amount: refundAmount,
        fees_retained: estimatedFees
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in refund-event-payment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
