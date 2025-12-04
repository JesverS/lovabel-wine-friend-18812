import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT-SETUP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      logStep("Auth error", { error: authError?.message });
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    const { returnUrl } = await req.json();
    const origin = returnUrl || `${Deno.env.get("SITE_URL")}`;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if user already has a Stripe account
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: existingAccount } = await supabaseAdmin
      .from("organizer_stripe_account")
      .select("*")
      .eq("user_id", user.id)
      .single();

    let stripeAccountId: string;

    if (existingAccount?.stripe_account_id) {
      logStep("Existing Stripe account found", { accountId: existingAccount.stripe_account_id });
      stripeAccountId = existingAccount.stripe_account_id;
    } else {
      // Create new Express account
      logStep("Creating new Stripe Express account");
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        metadata: {
          user_id: user.id,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      stripeAccountId = account.id;
      logStep("Stripe account created", { accountId: stripeAccountId });

      // Save to database
      const { error: insertError } = await supabaseAdmin
        .from("organizer_stripe_account")
        .insert({
          user_id: user.id,
          stripe_account_id: stripeAccountId,
          account_status: "pending",
          onboarding_completed: false,
        });

      if (insertError) {
        logStep("Error saving account to database", { error: insertError.message });
        throw insertError;
      }
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}?stripe_refresh=true`,
      return_url: `${origin}?stripe_onboarding=complete`,
      type: "account_onboarding",
    });

    logStep("Account link created", { url: accountLink.url });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
