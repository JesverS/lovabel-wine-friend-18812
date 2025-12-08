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

    // Récupérer tous les événements où l'utilisateur est organizer ou co_organizer
    const { data: userEvents } = await supabaseAdmin
      .from('user_event')
      .select('event_id')
      .eq('user_id', user.id)
      .in('role', ['organizer', 'co_organizer']);

    if (!userEvents || userEvents.length === 0) {
      return new Response(
        JSON.stringify({
          totalRevenue: 0,
          totalRefunded: 0,
          netRevenue: 0,
          platformFeePercent: 10,
          eventCount: 0,
          events: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const eventIds = userEvents.map(ue => ue.event_id);

    // Récupérer les informations des événements
    const { data: events } = await supabaseAdmin
      .from('event')
      .select('id, name, slug, start_date, access_type, price, currency')
      .in('id', eventIds);

    // Récupérer tous les paiements pour ces événements
    const { data: payments } = await supabaseAdmin
      .from('event_payment')
      .select('id, amount, currency, status, completed_at, refunded_at, event_id, created_at')
      .in('event_id', eventIds)
      .order('created_at', { ascending: false });

    // Calculer les totaux globaux
    const completedPayments = payments?.filter(p => p.status === 'completed') || [];
    const refundedPayments = payments?.filter(p => p.status === 'refunded') || [];

    const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalRefunded = refundedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const platformFeePercent = 10;
    const netRevenue = totalRevenue * (1 - platformFeePercent / 100);

    // Grouper par événement
    const eventRevenueMap: Record<string, { completed: number; refunded: number; count: number }> = {};
    
    payments?.forEach(p => {
      if (!eventRevenueMap[p.event_id]) {
        eventRevenueMap[p.event_id] = { completed: 0, refunded: 0, count: 0 };
      }
      if (p.status === 'completed') {
        eventRevenueMap[p.event_id].completed += p.amount || 0;
        eventRevenueMap[p.event_id].count++;
      } else if (p.status === 'refunded') {
        eventRevenueMap[p.event_id].refunded += p.amount || 0;
      }
    });

    // Formater les événements avec leurs revenus
    const eventsWithRevenue = events?.map(event => ({
      ...event,
      revenue: eventRevenueMap[event.id]?.completed || 0,
      refunded: eventRevenueMap[event.id]?.refunded || 0,
      netRevenue: (eventRevenueMap[event.id]?.completed || 0) * (1 - platformFeePercent / 100),
      participantCount: eventRevenueMap[event.id]?.count || 0
    })).sort((a, b) => b.revenue - a.revenue) || [];

    console.log(`Organizer ${user.id}: ${eventIds.length} events, ${totalRevenue} total revenue`);

    return new Response(
      JSON.stringify({
        totalRevenue,
        totalRefunded,
        netRevenue,
        platformFeePercent,
        eventCount: eventIds.length,
        participantCount: completedPayments.length,
        events: eventsWithRevenue
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-organizer-revenue:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
