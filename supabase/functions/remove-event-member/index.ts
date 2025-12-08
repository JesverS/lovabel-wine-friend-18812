import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { member_user_id, event_id } = await req.json();

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
    const { data: payment } = await supabase
      .from('event_payment')
      .select('id, stripe_payment_intent_id, amount, currency, status')
      .eq('event_id', event_id)
      .eq('user_id', member_user_id)
      .eq('status', 'completed')
      .single();

    // Si paiement trouvé, effectuer le remboursement via Stripe
    if (payment && payment.stripe_payment_intent_id) {
      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (stripeSecretKey) {
        try {
          const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
          
          // Effectuer le remboursement
          await stripe.refunds.create({
            payment_intent: payment.stripe_payment_intent_id,
            reason: 'requested_by_customer',
          });
          
          console.log(`Refund created for payment ${payment.id}`);
          
          // Mettre à jour le statut du paiement
          await supabase
            .from('event_payment')
            .update({ 
              status: 'refunded', 
              refunded_at: new Date().toISOString() 
            })
            .eq('id', payment.id);
            
          console.log(`Payment ${payment.id} marked as refunded`);
        } catch (stripeError) {
          console.error('Stripe refund error:', stripeError);
          // Continue avec la suppression même si le remboursement échoue
          // L'organisateur pourra rembourser manuellement via Stripe Dashboard
        }
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
      JSON.stringify({ success: true, refunded: !!payment }), 
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
