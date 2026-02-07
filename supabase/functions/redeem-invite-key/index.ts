import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Auth client for user verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Admin client for database operations (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error('Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Token invalide', code: 'INVALID_TOKEN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log(`User ${userId} attempting to redeem invite key`);

    // Parse request body
    const { code } = await req.json();
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Code d\'invitation requis', code: 'MISSING_CODE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedCode = code.trim().toUpperCase();
    console.log(`Looking up invite key: ${trimmedCode}`);

    // Step 1: Check if user already has a role
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingRole) {
      console.log(`User ${userId} already has role: ${existingRole.role}`);
      return new Response(
        JSON.stringify({ 
          error: 'Vous avez déjà un rôle actif', 
          code: 'ALREADY_PREMIUM',
          current_role: existingRole.role 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Find the invite key
    const { data: inviteKey, error: keyError } = await supabaseAdmin
      .from('invite_key')
      .select('*')
      .eq('code', trimmedCode)
      .maybeSingle();

    if (keyError || !inviteKey) {
      console.log(`Invalid invite key: ${trimmedCode}`);
      return new Response(
        JSON.stringify({ error: 'Code d\'invitation invalide', code: 'INVALID_CODE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Validate the key
    if (!inviteKey.is_active) {
      console.log(`Invite key ${trimmedCode} is inactive`);
      return new Response(
        JSON.stringify({ error: 'Ce code n\'est plus actif', code: 'INVALID_CODE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (inviteKey.expires_at && new Date(inviteKey.expires_at) < new Date()) {
      console.log(`Invite key ${trimmedCode} has expired`);
      return new Response(
        JSON.stringify({ error: 'Ce code a expiré', code: 'CODE_EXPIRED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (inviteKey.remaining_uses <= 0) {
      console.log(`Invite key ${trimmedCode} exhausted`);
      return new Response(
        JSON.stringify({ error: 'Ce code a atteint sa limite d\'utilisation', code: 'CODE_EXHAUSTED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Check if user already used this specific key
    const { data: existingUsage } = await supabaseAdmin
      .from('invite_key_usage')
      .select('id')
      .eq('invite_key_id', inviteKey.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingUsage) {
      console.log(`User ${userId} already used key ${trimmedCode}`);
      return new Response(
        JSON.stringify({ error: 'Vous avez déjà utilisé ce code', code: 'ALREADY_USED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 5: All validations passed - assign role, track usage, decrement counter
    console.log(`Assigning role ${inviteKey.role_granted} to user ${userId}`);

    // Insert user role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: inviteKey.role_granted });

    if (roleInsertError) {
      console.error('Failed to insert user role:', roleInsertError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'attribution du rôle', code: 'INSERT_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Track usage
    const { error: usageInsertError } = await supabaseAdmin
      .from('invite_key_usage')
      .insert({ invite_key_id: inviteKey.id, user_id: userId });

    if (usageInsertError) {
      console.error('Failed to track usage:', usageInsertError);
      // Non-blocking: role is already assigned
    }

    // Decrement remaining uses
    const { error: decrementError } = await supabaseAdmin
      .from('invite_key')
      .update({ remaining_uses: inviteKey.remaining_uses - 1 })
      .eq('id', inviteKey.id);

    if (decrementError) {
      console.error('Failed to decrement remaining uses:', decrementError);
      // Non-blocking: role is already assigned
    }

    console.log(`Successfully assigned role ${inviteKey.role_granted} to user ${userId} via key ${trimmedCode}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        role: inviteKey.role_granted,
        message: 'Fonctionnalités premium activées !' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
