import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[LEAVE-EVENT] ${step}`, details ? JSON.stringify(details) : "");
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

    const { eventId } = await req.json();
    
    if (!eventId) {
      throw new Error("eventId requis");
    }

    logStep("Paramètres reçus", { eventId });

    // Vérifier que l'utilisateur est bien participant (pas organizer/co_organizer/admin)
    const { data: membership, error: memberError } = await supabaseAdmin
      .from("user_event")
      .select("role, access_origin")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .single();

    if (memberError || !membership) {
      throw new Error("Vous n'êtes pas inscrit à cet événement");
    }

    logStep("Membership trouvé", { role: membership.role, access_origin: membership.access_origin });

    // Empêcher les organisateurs/co_organisateurs/admins de quitter via cette fonction
    if (["organizer", "co_organizer", "admin"].includes(membership.role)) {
      throw new Error("Les organisateurs et administrateurs ne peuvent pas quitter l'événement via cette méthode");
    }

    // Vérifier qu'il n'y a pas de paiement associé
    const { data: payment } = await supabaseAdmin
      .from("event_payment")
      .select("id, status")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .eq("status", "completed")
      .maybeSingle();

    if (payment) {
      throw new Error("Vous avez payé pour cet événement. Utilisez la demande de remboursement ou quittez sans remboursement.");
    }

    // Supprimer l'inscription
    const { error: deleteError } = await supabaseAdmin
      .from("user_event")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", userId);

    if (deleteError) {
      throw new Error(`Erreur lors de la désinscription: ${deleteError.message}`);
    }

    logStep("Utilisateur désinscrit avec succès");

    return new Response(
      JSON.stringify({ success: true }),
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
