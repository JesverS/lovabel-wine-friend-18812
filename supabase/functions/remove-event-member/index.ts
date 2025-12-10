import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Commission plateforme (même valeur que dans le checkout)
const PLATFORM_FEE_PERCENT = 10;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { member_user_id, event_id, skip_refund } = await req.json();

    // Vérifier le rôle de l'utilisateur dans l'événement
    const { data: userRole, error: roleError } = await supabase
      .from('user_event')
      .select('role')
      .eq('user_id', user.id)
      .eq('event_id', event_id)
      .single();

    if (roleError || !userRole) {
      return new Response(
        JSON.stringify({ error: 'Vous n\'êtes pas membre de cet événement' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Seuls organizer et co_organizer peuvent retirer
    if (userRole.role !== 'organizer' && userRole.role !== 'co_organizer') {
      return new Response(
        JSON.stringify({ error: 'Permissions insuffisantes' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier le membre à retirer
    const { data: memberRole, error: memberError } = await supabase
      .from('user_event')
      .select('role')
      .eq('user_id', member_user_id)
      .eq('event_id', event_id)
      .single();

    if (memberError || !memberRole) {
      return new Response(
        JSON.stringify({ error: 'Membre introuvable' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ne pas retirer l'organizer
    if (memberRole.role === 'organizer') {
      return new Response(
        JSON.stringify({ error: 'Impossible de retirer l\'organisateur' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier si le membre a un paiement complété pour cet événement
    const { data: payments } = await supabase
      .from('event_payment')
      .select('id, stripe_payment_intent_id, amount, currency, status')
      .eq('event_id', event_id)
      .eq('user_id', member_user_id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1);

    const payment = payments && payments.length > 0 ? payments[0] : null;
    let refundInfo = null;

    // Si paiement trouvé et skip_refund n'est pas demandé, effectuer le remboursement
    if (payment && payment.stripe_payment_intent_id && !skip_refund) {
      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (!stripeSecretKey) {
        console.error('STRIPE_SECRET_KEY not configured');
        return new Response(
          JSON.stringify({ error: 'Configuration Stripe manquante.' }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-08-27.basil' });
        
        // Montant original payé par le client
        const originalAmount = parseFloat(String(payment.amount));
        
        if (isNaN(originalAmount) || originalAmount <= 0) {
          console.error('Invalid payment amount:', payment.amount);
          return new Response(
            JSON.stringify({ error: 'Montant de paiement invalide.' }), 
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
        
        // Rembourser depuis le compte Connect de l'organisateur
        const refund = await stripe.refunds.create({
          payment_intent: payment.stripe_payment_intent_id,
          amount: refundAmountCents,
          reverse_transfer: true,
          reason: 'requested_by_customer',
        });
        
        console.log('Refund created:', { refundId: refund.id, amount: refund.amount });
        
        // Mettre à jour le statut du paiement
        await supabase
          .from('event_payment')
          .update({ 
            status: 'refunded', 
            refunded_at: new Date().toISOString(),
            metadata: {
              refund_id: refund.id,
              original_amount: originalAmount,
              refunded_amount: organizerReceived,
            }
          })
          .eq('id', payment.id);

        refundInfo = {
          original_amount: originalAmount,
          refunded_amount: organizerReceived,
        };
      } catch (stripeError: any) {
        console.error('Stripe refund error:', stripeError.message);
        return new Response(
          JSON.stringify({ 
            error: 'Échec du remboursement Stripe.',
            details: stripeError.message 
          }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Retirer le membre
    const { error } = await supabase
      .from('user_event')
      .delete()
      .eq('user_id', member_user_id)
      .eq('event_id', event_id);

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true, 
        refunded: !!refundInfo,
        skipped_refund: !!skip_refund,
        refund_info: refundInfo
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error removing member:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
