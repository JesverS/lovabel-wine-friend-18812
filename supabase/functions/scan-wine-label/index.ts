import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  confidence: number;
}

const SYSTEM_PROMPT = `Tu es un expert en vins français et internationaux. Analyse cette photo d'étiquette de bouteille de vin et extrais les informations suivantes.

RÈGLES IMPORTANTES:
1. Extrais UNIQUEMENT les informations visibles sur l'étiquette
2. Si une information n'est pas clairement visible, retourne null
3. Pour le type de vin, déduis-le de l'appellation, du cépage mentionné, ou de la couleur dominante de l'étiquette
4. Sépare bien le nom de la cuvée du nom du domaine/château
5. Pour l'appellation, inclus le niveau (AOC, AOP, IGP, Grand Cru, Premier Cru, etc.)
6. Le champ "confidence" représente ta confiance globale dans l'extraction (0 à 1)

MAPPINGS TYPES DE VIN:
- Appellations rouges typiques: Pauillac, Saint-Émilion, Pomerol, Côtes du Rhône rouge, Bourgogne rouge, etc.
- Appellations blanches typiques: Chablis, Meursault, Pouilly-Fumé, Sancerre blanc, Alsace, etc.
- Appellations rosées typiques: Côtes de Provence, Bandol rosé, Tavel, etc.
- Effervescents: Champagne, Crémant, Prosecco, Cava, etc.

RÉGIONS FRANÇAISES: Bordeaux, Bourgogne, Champagne, Vallée de la Loire, Vallée du Rhône, Alsace, Provence, Languedoc-Roussillon, Sud-Ouest, Jura, Savoie, Corse

Retourne UNIQUEMENT un objet JSON valide, sans texte avant ou après.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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
}`
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
        temperature: 0.1, // Low temperature for more consistent extraction
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

    let wineData: WineLabelData;
    try {
      wineData = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError, jsonContent);
      return new Response(
        JSON.stringify({ error: 'Impossible de parser la réponse IA', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and sanitize the response
    const sanitizedData: WineLabelData = {
      wine_name: typeof wineData.wine_name === 'string' ? wineData.wine_name.trim() : null,
      domain_name: typeof wineData.domain_name === 'string' ? wineData.domain_name.trim() : null,
      year: typeof wineData.year === 'number' && wineData.year > 1800 && wineData.year <= new Date().getFullYear() ? wineData.year : null,
      appellation: typeof wineData.appellation === 'string' ? wineData.appellation.trim() : null,
      wine_type: ['rouge', 'blanc', 'rosé', 'effervescent', 'autre'].includes(wineData.wine_type as string) ? wineData.wine_type : null,
      alcohol_percentage: typeof wineData.alcohol_percentage === 'number' && wineData.alcohol_percentage > 0 && wineData.alcohol_percentage < 100 ? wineData.alcohol_percentage : null,
      volume_ml: typeof wineData.volume_ml === 'number' && wineData.volume_ml > 0 ? wineData.volume_ml : null,
      region: typeof wineData.region === 'string' ? wineData.region.trim() : null,
      confidence: typeof wineData.confidence === 'number' ? Math.min(1, Math.max(0, wineData.confidence)) : 0.5,
    };

    console.log('Sanitized wine data:', sanitizedData);

    return new Response(
      JSON.stringify({ success: true, data: sanitizedData }),
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
