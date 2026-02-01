import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface WineLabelData {
  wine_name: string | null;
  domain_name: string | null;
  year: number | null;
  appellation: string | null;
  wine_type: 'rouge' | 'blanc' | 'rosé' | 'effervescent' | 'autre' | null;
  alcohol_percentage: number | null;
  volume_ml: number | null;
  region: string | null;
  custom_region: string | null;
  confidence: number;
  // Resolved IDs after matching
  domain_id: string | null;
  appellation_id: number | null;
  domain_created: boolean;
  appellation_created: boolean;
}

// Valid region enum values for domain_region
const VALID_REGIONS = [
  'Alsace', 'Beaujolais', 'Bordeaux', 'Bourgogne', 'Champagne',
  'Corse', 'Jura', 'Languedoc-Roussillon', 'Loire', 'Provence',
  'Rhône', 'Sud-Ouest'
];

// Mapping from AI response variations to enum values
const REGION_MAPPING: Record<string, string> = {
  'alsace': 'Alsace',
  'beaujolais': 'Beaujolais',
  'bordeaux': 'Bordeaux',
  'bourgogne': 'Bourgogne',
  'burgundy': 'Bourgogne',
  'champagne': 'Champagne',
  'corse': 'Corse',
  'corsica': 'Corse',
  'jura': 'Jura',
  'languedoc': 'Languedoc-Roussillon',
  'languedoc-roussillon': 'Languedoc-Roussillon',
  'roussillon': 'Languedoc-Roussillon',
  'loire': 'Loire',
  'vallée de la loire': 'Loire',
  'val de loire': 'Loire',
  'provence': 'Provence',
  'rhône': 'Rhône',
  'rhone': 'Rhône',
  'vallée du rhône': 'Rhône',
  'côtes du rhône': 'Rhône',
  'sud-ouest': 'Sud-Ouest',
  'sud ouest': 'Sud-Ouest',
  'southwest': 'Sud-Ouest',
};

const SYSTEM_PROMPT = `Tu es un expert en vins français et internationaux. Analyse cette photo d'étiquette de bouteille de vin et extrais les informations suivantes.

RÈGLES IMPORTANTES:
1. Extrais UNIQUEMENT les informations visibles sur l'étiquette
2. Si une information n'est pas clairement visible, retourne null
3. Pour le type de vin, déduis-le de l'appellation, du cépage mentionné, ou de la couleur dominante de l'étiquette
4. Sépare bien le nom de la cuvée du nom du domaine/château
5. Pour l'appellation, inclus le niveau (AOC, AOP, IGP, Grand Cru, Premier Cru, etc.)
6. Le champ "confidence" représente ta confiance globale dans l'extraction (0 à 1)
7. IMPORTANT: Si le nom du vin est identique au nom du domaine, ou s'il n'y a pas de nom de cuvée spécifique, mets le même nom dans wine_name et domain_name

MAPPINGS TYPES DE VIN:
- Appellations rouges typiques: Pauillac, Saint-Émilion, Pomerol, Côtes du Rhône rouge, Bourgogne rouge, etc.
- Appellations blanches typiques: Chablis, Meursault, Pouilly-Fumé, Sancerre blanc, Alsace, etc.
- Appellations rosées typiques: Côtes de Provence, Bandol rosé, Tavel, etc.
- Effervescents: Champagne, Crémant, Prosecco, Cava, etc.

RÉGIONS FRANÇAISES VALIDES:
Alsace, Beaujolais, Bordeaux, Bourgogne, Champagne, Corse, Jura, Languedoc-Roussillon, Loire, Provence, Rhône, Sud-Ouest

Si la région n'est pas dans cette liste (par exemple: Savoie, Californie, Espagne, Italie), retourne quand même le nom de la région trouvée.

Retourne UNIQUEMENT un objet JSON valide, sans texte avant ou après.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
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
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    const { image_base64 } = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: 'Image base64 requise' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Service IA non configuré' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine MIME type from base64 header or default to jpeg
    let mimeType = 'image/jpeg';
    let cleanBase64 = image_base64;
    
    if (image_base64.startsWith('data:')) {
      const matches = image_base64.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        cleanBase64 = matches[2];
      }
    }

    console.log('Sending image to Lovable AI for wine label analysis...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyse cette étiquette de vin et extrais les informations au format JSON suivant:
{
  "wine_name": "nom de la cuvée (sans le domaine)" ou null,
  "domain_name": "nom du domaine/château/producteur" ou null,
  "year": millésime (nombre) ou null,
  "appellation": "appellation complète avec niveau" ou null,
  "wine_type": "rouge" | "blanc" | "rosé" | "effervescent" | "autre" ou null,
  "alcohol_percentage": degré d'alcool (nombre) ou null,
  "volume_ml": volume en ml (nombre) ou null,
  "region": "région viticole" ou null,
  "confidence": nombre entre 0 et 1
}

IMPORTANT: Si le vin n'a pas de nom de cuvée distinct du domaine, mets le nom du domaine dans wine_name.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${cleanBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requêtes atteinte, réessayez plus tard' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crédits IA épuisés' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Erreur du service IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'Pas de réponse de l\'IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI Response:', content);

    // Parse JSON from response (handle potential markdown code blocks)
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.slice(7);
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith('```')) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();

    let rawWineData: any;
    try {
      rawWineData = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError, jsonContent);
      return new Response(
        JSON.stringify({ error: 'Impossible de parser la réponse IA', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize AI data
    const wineName = typeof rawWineData.wine_name === 'string' ? rawWineData.wine_name.trim() : null;
    const domainName = typeof rawWineData.domain_name === 'string' ? rawWineData.domain_name.trim() : null;
    const appellationName = typeof rawWineData.appellation === 'string' ? rawWineData.appellation.trim() : null;
    const extractedRegion = typeof rawWineData.region === 'string' ? rawWineData.region.trim() : null;

    // Fallback: if wine_name is null, use domain_name
    const finalWineName = wineName || domainName;

    // Normalize region to enum value
    let normalizedRegion: string | null = null;
    let customRegion: string | null = null;

    if (extractedRegion) {
      const lowerRegion = extractedRegion.toLowerCase();
      
      // Check direct mapping
      if (REGION_MAPPING[lowerRegion]) {
        normalizedRegion = REGION_MAPPING[lowerRegion];
      } else {
        // Check if it's already a valid region (case-insensitive)
        const matchedRegion = VALID_REGIONS.find(
          r => r.toLowerCase() === lowerRegion
        );
        if (matchedRegion) {
          normalizedRegion = matchedRegion;
        } else {
          // Not in enum, store as custom region
          normalizedRegion = 'other';
          customRegion = extractedRegion;
        }
      }
    }

    // Initialize result data
    let resultData: WineLabelData = {
      wine_name: finalWineName,
      domain_name: domainName,
      year: typeof rawWineData.year === 'number' && rawWineData.year > 1800 && rawWineData.year <= new Date().getFullYear() ? rawWineData.year : null,
      appellation: appellationName,
      wine_type: ['rouge', 'blanc', 'rosé', 'effervescent', 'autre'].includes(rawWineData.wine_type) ? rawWineData.wine_type : null,
      alcohol_percentage: typeof rawWineData.alcohol_percentage === 'number' && rawWineData.alcohol_percentage > 0 && rawWineData.alcohol_percentage < 100 ? rawWineData.alcohol_percentage : null,
      volume_ml: typeof rawWineData.volume_ml === 'number' && rawWineData.volume_ml > 0 ? rawWineData.volume_ml : null,
      region: normalizedRegion,
      custom_region: customRegion,
      confidence: typeof rawWineData.confidence === 'number' ? Math.min(1, Math.max(0, rawWineData.confidence)) : 0.5,
      domain_id: null,
      appellation_id: null,
      domain_created: false,
      appellation_created: false,
    };

    // Match or create domain if domain_name is present
    if (domainName) {
      console.log(`Matching domain: "${domainName}"`);
      
      // Search for similar domain using pg_trgm similarity
      const { data: matchedDomains, error: domainSearchError } = await supabaseAdmin.rpc(
        'search_similar_domain',
        { search_name: domainName, threshold: 0.8 }
      );

      if (domainSearchError) {
        console.error('Domain search error:', domainSearchError);
        // Try a simpler exact match fallback
        const { data: exactMatch } = await supabaseAdmin
          .from('domain')
          .select('id, name')
          .ilike('name', domainName)
          .limit(1)
          .maybeSingle();
        
        if (exactMatch) {
          resultData.domain_id = exactMatch.id;
          resultData.domain_name = exactMatch.name;
          console.log(`Found exact domain match: ${exactMatch.name} (${exactMatch.id})`);
        }
      } else if (matchedDomains && matchedDomains.length > 0) {
        // Use the best match
        resultData.domain_id = matchedDomains[0].id;
        resultData.domain_name = matchedDomains[0].name;
        console.log(`Found similar domain: ${matchedDomains[0].name} (similarity: ${matchedDomains[0].sim})`);
      }

      // Create domain if no match found
      if (!resultData.domain_id) {
        console.log(`Creating new domain: "${domainName}"`);
        
        const { data: newDomain, error: createDomainError } = await supabaseAdmin
          .from('domain')
          .insert({
            name: domainName,
            region: normalizedRegion as any || 'unknown',
            custom_region: customRegion,
          })
          .select('id, name')
          .single();

        if (createDomainError) {
          console.error('Failed to create domain:', createDomainError);
        } else if (newDomain) {
          resultData.domain_id = newDomain.id;
          resultData.domain_created = true;
          console.log(`Created new domain: ${newDomain.name} (${newDomain.id})`);
        }
      }
    }

    // Match or create appellation if appellation name is present
    if (appellationName) {
      console.log(`Matching appellation: "${appellationName}"`);
      
      // Search for similar appellation using pg_trgm similarity
      const { data: matchedAppellations, error: appellationSearchError } = await supabaseAdmin.rpc(
        'search_similar_appellation',
        { search_name: appellationName, threshold: 0.8 }
      );

      if (appellationSearchError) {
        console.error('Appellation search error:', appellationSearchError);
        // Try a simpler exact match fallback
        const { data: exactMatch } = await supabaseAdmin
          .from('appellation')
          .select('id, nom')
          .ilike('nom', appellationName)
          .limit(1)
          .maybeSingle();
        
        if (exactMatch) {
          resultData.appellation_id = exactMatch.id;
          resultData.appellation = exactMatch.nom;
          console.log(`Found exact appellation match: ${exactMatch.nom} (${exactMatch.id})`);
        }
      } else if (matchedAppellations && matchedAppellations.length > 0) {
        // Use the best match
        resultData.appellation_id = matchedAppellations[0].id;
        resultData.appellation = matchedAppellations[0].nom;
        console.log(`Found similar appellation: ${matchedAppellations[0].nom} (similarity: ${matchedAppellations[0].sim})`);
      }

      // Create appellation if no match found
      if (!resultData.appellation_id) {
        console.log(`Creating new appellation: "${appellationName}"`);
        
        const { data: newAppellation, error: createAppellationError } = await supabaseAdmin
          .from('appellation')
          .insert({
            nom: appellationName,
          })
          .select('id, nom')
          .single();

        if (createAppellationError) {
          console.error('Failed to create appellation:', createAppellationError);
        } else if (newAppellation) {
          resultData.appellation_id = newAppellation.id;
          resultData.appellation_created = true;
          console.log(`Created new appellation: ${newAppellation.nom} (${newAppellation.id})`);
        }
      }
    }

    console.log('Final scan result:', resultData);

    return new Response(
      JSON.stringify({ success: true, data: resultData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('scan-wine-label error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
