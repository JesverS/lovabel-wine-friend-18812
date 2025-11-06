import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    const { domain_id } = await req.json();

    if (!domain_id) {
      throw new Error('domain_id is required');
    }

    console.log(`Creating bucket for domain: ${domain_id}`);

    // Créer le bucket avec l'UUID du domaine
    const { error: bucketError } = await supabase.storage.createBucket(domain_id, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
    });

    // Si le bucket existe déjà, ce n'est pas une erreur
    if (bucketError && !bucketError.message.includes('already exists')) {
      console.error('Error creating bucket:', bucketError);
      throw bucketError;
    }

    console.log(`Bucket created successfully for domain: ${domain_id}`);

    return new Response(
      JSON.stringify({ success: true, bucket_id: domain_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-domain-bucket function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
