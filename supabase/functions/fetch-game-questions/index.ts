import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier que l'utilisateur est authentifié
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { wineId, nbPlayers } = await req.json();
    
    if (!wineId || !nbPlayers) {
      throw new Error('wineId and nbPlayers are required');
    }

    console.log(`Fetching questions for wine ${wineId} with ${nbPlayers} players`);

    // 1. Récupérer les infos du vin
    const { data: wine, error: wineError } = await supabase
      .from('wine')
      .select(`
        id,
        name,
        year,
        type,
        domain:domain_id (
          id,
          name,
          region
        )
      `)
      .eq('id', wineId)
      .single();

    if (wineError || !wine) {
      throw new Error('Wine not found');
    }

    const domain = Array.isArray(wine.domain) ? wine.domain[0] : wine.domain;
    const wineRegion = domain.region;
    
    // Mapper le type de vin vers la couleur (correspondant à la table wine_type)
    // Types: 1=rouge, 2=blanc, 5=rosé, 7=autre, 8=effervescent
    const wineTypeMap: { [key: number]: string } = {
      1: 'red',     // rouge
      2: 'white',   // blanc
      5: 'rose',    // rosé
      7: 'all',     // autre
      8: 'eff',     // effervescent
    };
    
    const wineColor = wineTypeMap[wine.type] || 'all';

    console.log(`Wine region: ${wineRegion}, color: ${wineColor}`);

    // 2. Sélectionner les questions de type 1 (nbPlayers)
    const { data: type1Questions, error: type1Error } = await supabase
      .from('game_question')
      .select('*')
      .eq('answer_type', 1)
      .or(`apply_to_region.eq.${wineRegion},apply_to_region.is.null`)
      .or(`apply_to_color.eq.${wineColor},apply_to_color.eq.all`)
      .limit(nbPlayers * 2); // Prendre plus pour avoir du choix

    if (type1Error) {
      console.error('Error fetching type 1 questions:', type1Error);
      throw type1Error;
    }

    // 3. Sélectionner les questions de type 3
    const { data: type3Questions, error: type3Error } = await supabase
      .from('game_question')
      .select('*')
      .eq('answer_type', 3)
      .or(`apply_to_region.eq.${wineRegion},apply_to_region.is.null`)
      .or(`apply_to_color.eq.${wineColor},apply_to_color.eq.all`)
      .limit(nbPlayers * 2);

    if (type3Error) {
      console.error('Error fetching type 3 questions:', type3Error);
      throw type3Error;
    }

    // 3b. Récupérer les facts correspondants
    const factKeys = type3Questions?.map(q => q.fact_key).filter(Boolean) || [];
    let factsMap: Record<string, any> = {};
    
    if (factKeys.length > 0) {
      const { data: facts, error: factsError } = await supabase
        .from('game_wine_facts')
        .select('*')
        .in('fact_key', factKeys)
        .eq('region', wineRegion)
        .or(`wine_type.eq.${wineColor},wine_type.eq.all`);

      if (factsError) {
        console.error('Error fetching wine facts:', factsError);
        throw factsError;
      }

      factsMap = (facts || []).reduce((acc, fact) => {
        acc[fact.fact_key] = fact;
        return acc;
      }, {} as Record<string, any>);
    }

    // 4. Sélectionner les questions de type 4
    const { data: type4Questions, error: type4Error } = await supabase
      .from('game_question')
      .select('*')
      .eq('answer_type', 4)
      .or(`apply_to_region.eq.${wineRegion},apply_to_region.is.null`)
      .or(`apply_to_color.eq.${wineColor},apply_to_color.eq.all`)
      .limit(8); // Prendre plus pour avoir du choix

    if (type4Error) {
      console.error('Error fetching type 4 questions:', type4Error);
      throw type4Error;
    }

    // 5. Mélanger et sélectionner le bon nombre de questions
    const shuffleArray = (array: any[]) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    const selectedType1 = shuffleArray(type1Questions || []).slice(0, nbPlayers);
    const selectedType3 = shuffleArray(type3Questions || []).slice(0, nbPlayers);
    const selectedType4 = shuffleArray(type4Questions || []).slice(0, 4);

    // 6. Assigner les joueurs pour les questions de type 1 et 3
    const playerIndices = Array.from({ length: nbPlayers }, (_, i) => i);
    const shuffledPlayerIndices = shuffleArray(playerIndices);

    const formattedType1 = selectedType1.map((q, idx) => ({
      id: q.id,
      question: q.question,
      answer_type: 1,
      assigned_player: shuffledPlayerIndices[idx % nbPlayers],
    }));

    const shuffledPlayerIndicesType3 = shuffleArray(playerIndices);
    const formattedType3 = selectedType3.map((q: any, idx) => {
      const fact = factsMap[q.fact_key];
      return {
        id: q.id,
        question: q.question,
        answer_type: 3,
        fact_key: q.fact_key,
        correct_answers: fact?.correct_answers || [],
        incorrect_answers: fact?.incorrect_answers || [],
        assigned_player: shuffledPlayerIndicesType3[idx % nbPlayers],
      };
    });

    const formattedType4 = selectedType4.map((q) => ({
      id: q.id,
      question: q.question,
      answer_type: 4,
    }));

    // 7. Combiner et mélanger toutes les questions
    const allQuestions = [
      ...formattedType1,
      ...formattedType3,
      ...formattedType4,
    ];

    const finalQuestions = shuffleArray(allQuestions).slice(0, 20);

    console.log(`Returning ${finalQuestions.length} questions`);

    return new Response(
      JSON.stringify({
        questions: finalQuestions,
        wine: {
          id: wine.id,
          name: wine.name,
          year: wine.year,
          domain: domain.name,
          region: wineRegion,
          color: wineColor,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in fetch-game-questions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
