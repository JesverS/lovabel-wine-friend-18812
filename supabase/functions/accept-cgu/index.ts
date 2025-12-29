import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Vérifier l'authentification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Créer client Supabase avec le token utilisateur
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      console.error('User not found or error:', userError)
      return new Response(JSON.stringify({ error: 'Utilisateur non trouvé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Récupérer les données du body
    const body = await req.json()
    const { acceptance_method, cgu_version, cgu_text } = body

    if (!cgu_version || !cgu_text) {
      return new Response(JSON.stringify({ error: 'Version et texte CGU requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 4. Récupérer les métadonnées
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      req.headers.get('cf-connecting-ip') || 
                      req.headers.get('x-real-ip') || null
    const userAgent = req.headers.get('user-agent') || null

    // 5. Calculer le hash SHA-256 du texte CGU
    const encoder = new TextEncoder()
    const data = encoder.encode(cgu_text)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const consentTextHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    console.log(`Processing CGU acceptance for user ${user.id}, version ${cgu_version}`)

    // 6. Client admin pour insérer (bypass RLS car pas de policy INSERT)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 7. Insérer le consentement
    const { error: insertError } = await supabaseAdmin
      .from('cgu_acceptance')
      .insert({
        user_id: user.id,
        cgu_version: cgu_version,
        acceptance_method: acceptance_method || 'unknown',
        ip_address: ipAddress,
        user_agent: userAgent,
        consent_text_hash: consentTextHash
      })

    if (insertError) {
      // Si déjà accepté cette version (violation contrainte unique)
      if (insertError.code === '23505') {
        console.log(`CGU v${cgu_version} already accepted by user ${user.id}`)
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'CGU déjà acceptées',
          version: cgu_version 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      console.error('Insert error:', insertError)
      throw insertError
    }

    console.log(`CGU v${cgu_version} accepted by user ${user.id} from IP ${ipAddress}`)

    return new Response(JSON.stringify({ 
      success: true, 
      version: cgu_version 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('Error in accept-cgu:', error)
    const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
