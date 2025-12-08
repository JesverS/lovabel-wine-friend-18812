import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Supprimer les paiements pending expirés (créés il y a plus de 24h ou expires_at dépassé)
    const { data: expiredPayments, error } = await supabaseAdmin
      .from('event_payment')
      .delete()
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())
      .select('id, event_id, user_id');

    if (error) {
      console.error('Cleanup error:', error);
      return new Response(
        JSON.stringify({ error: 'Erreur lors du nettoyage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanedCount = expiredPayments?.length || 0;
    console.log(`Cleanup completed: ${cleanedCount} expired pending payments removed`);

    if (cleanedCount > 0) {
      console.log('Cleaned payments:', expiredPayments);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        cleanedCount,
        message: `${cleanedCount} paiement(s) expiré(s) supprimé(s)` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in cleanup-expired-payments:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
