import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

// Commission plateforme (même valeur que dans le checkout)
const PLATFORM_FEE_PERCENT = 10;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const { payment_id, member_user_id, event_id, skip_refund, reason } = body;

    // Valider qu'on a soit payment_id, soit member_user_id + event_id
    if (!payment_id && (!member_user_id || !event_id)) {
      return new Response(
        JSON.stringify({ error: 'payment_id ou (member_user_id + event_id) requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let payment = null;
    let targetUserId: string;
    let targetEventId: string;

    if (payment_id) {
      // Mode 1 : récupérer le paiement par ID
      const { data, error: paymentError } = await supabaseAdmin
        .from('event_payment')
        .select('id, stripe_payment_intent_id, amount, currency, user_id, event_id, status')
        .eq('id', payment_id)
        .single();

      if (paymentError || !data) {
        return new Response(
          JSON.stringify({ error: 'Paiement non trouvé' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      payment = data;
      targetUserId = payment.user_id;
      targetEventId = payment.event_id;
    } else {
      // Mode 2 : chercher le paiement par member_user_id + event_id
      const { data: payments } = await supabaseAdmin
        .from('event_payment')
        .select('id, stripe_payment_intent_id, amount, currency, user_id, event_id, status')
        .eq('event_id', event_id)
        .eq('user_id', member_user_id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      payment = payments?.[0] || null;
      targetUserId = member_user_id;
      targetEventId = event_id;
    }

    // Vérifier que l'utilisateur a le droit de rembourser (organizer ou co_organizer)
    const { data: userRole } = await supabaseAdmin
      .from('user_event')
      .select('role')
      .eq('event_id', targetEventId)
      .eq('user_id', user.id)
      .single();

    if (!userRole || !['organizer', 'co_organizer'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Seuls les organisateurs peuvent effectuer cette action' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Si skip_refund = true, supprimer directement l'accès sans remboursement
    if (skip_refund) {
      const { error: deleteError } = await supabaseAdmin
        .from('user_event')
        .delete()
        .eq('event_id', targetEventId)
        .eq('user_id', targetUserId);

      if (deleteError) {
        console.error('User event delete error:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la suppression du membre' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Member removed without refund: user ${targetUserId} from event ${targetEventId}`);
      return new Response(
        JSON.stringify({ success: true, skipped_refund: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Si pas de paiement trouvé, supprimer le membre sans remboursement
    if (!payment) {
      const { error: deleteError } = await supabaseAdmin
        .from('user_event')
        .delete()
        .eq('event_id', targetEventId)
        .eq('user_id', targetUserId);

      if (deleteError) {
        console.error('User event delete error:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la suppression du membre' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Member removed (no payment found): user ${targetUserId} from event ${targetEventId}`);
      return new Response(
        JSON.stringify({ success: true, no_payment: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifications du paiement pour le remboursement
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

    // Montant original payé par le client
    const originalAmount = parseFloat(String(payment.amount));
    
    if (isNaN(originalAmount) || originalAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Montant de paiement invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Rembourser uniquement ce que l'organisateur a reçu (montant - commission plateforme)
    const organizerReceived = originalAmount * (1 - PLATFORM_FEE_PERCENT / 100);
    const refundAmountCents = Math.round(organizerReceived * 100);

    console.log('Refund calculation:', {
      originalAmount,
      platformFeePercent: PLATFORM_FEE_PERCENT,
      organizerReceived,
      refundAmountCents
    });

    // Effectuer le remboursement Stripe
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-08-27.basil' });

    try {
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        amount: refundAmountCents,
        reverse_transfer: true,
        reason: reason || 'requested_by_customer',
      });

      console.log('Refund created:', { refundId: refund.id, amount: refund.amount });
    } catch (stripeError: any) {
      console.error('Stripe refund error:', stripeError);
      return new Response(
        JSON.stringify({ error: `Erreur Stripe: ${stripeError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mettre à jour le statut du paiement
    const { error: updateError } = await supabaseAdmin
      .from('event_payment')
      .update({ 
        status: 'refunded', 
        refunded_at: new Date().toISOString(),
        metadata: {
          original_amount: originalAmount,
          refunded_amount: organizerReceived,
        }
      })
      .eq('id', payment.id);

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
      .eq('event_id', targetEventId)
      .eq('user_id', targetUserId);

    if (deleteError) {
      console.error('User event delete error:', deleteError);
    }

    console.log(`Refund successful: payment ${payment.id}, user removed from event`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Remboursement effectué avec succès',
        original_amount: originalAmount,
        refunded_amount: organizerReceived
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
