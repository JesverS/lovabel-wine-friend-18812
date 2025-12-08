import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    const { event_id } = body;

    if (!event_id) {
      return new Response(
        JSON.stringify({ error: 'event_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que l'utilisateur a le droit de voir les revenus (organizer, co_organizer, admin)
    const { data: userRole } = await supabaseAdmin
      .from('user_event')
      .select('role')
      .eq('event_id', event_id)
      .eq('user_id', user.id)
      .single();

    if (!userRole || !['organizer', 'co_organizer', 'admin'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé à voir les revenus de cet événement' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer tous les paiements de l'événement
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('event_payment')
      .select('id, amount, currency, status, completed_at, refunded_at, stripe_payment_intent_id, user_id, created_at')
      .eq('event_id', event_id)
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('Payments fetch error:', paymentsError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la récupération des paiements' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les profils des utilisateurs ayant payé
    const userIds = [...new Set(payments?.map(p => p.user_id) || [])];
    let userProfiles: Record<string, any> = {};
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('user_profiles')
        .select('id, full_name, logo_adress, slug')
        .in('id', userIds);
      
      if (profiles) {
        userProfiles = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      }
    }

    // Calculer les totaux
    const completedPayments = payments?.filter(p => p.status === 'completed') || [];
    const refundedPayments = payments?.filter(p => p.status === 'refunded') || [];
    const pendingPayments = payments?.filter(p => p.status === 'pending') || [];

    const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalRefunded = refundedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const platformFeePercent = 10;
    const netRevenue = totalRevenue * (1 - platformFeePercent / 100);

    // Formater les paiements avec les profils
    const formattedPayments = payments?.map(p => ({
      ...p,
      user: userProfiles[p.user_id] || null
    })) || [];

    console.log(`Event ${event_id}: ${completedPayments.length} completed, ${refundedPayments.length} refunded, ${pendingPayments.length} pending`);

    return new Response(
      JSON.stringify({
        totalRevenue,
        totalRefunded,
        netRevenue,
        platformFeePercent,
        participantCount: completedPayments.length,
        refundedCount: refundedPayments.length,
        pendingCount: pendingPayments.length,
        payments: formattedPayments,
        currency: payments?.[0]?.currency || 'EUR'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-event-revenue:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
