import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REQUEST-PAYOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const body = await req.json();
    const { method, amount, currency = 'eur' } = body;
    logStep("Request body", { method, amount, currency });

    // Get user's Stripe account
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: stripeAccount, error: accountError } = await supabaseAdmin
      .from('organizer_stripe_account')
      .select('stripe_account_id, charges_enabled, payouts_enabled')
      .eq('user_id', user.id)
      .single();

    if (accountError || !stripeAccount) {
      throw new Error("No Stripe account configured for this user");
    }

    if (!stripeAccount.payouts_enabled) {
      throw new Error("Payouts are not enabled for this Stripe account");
    }

    logStep("Stripe account found", { stripeAccountId: stripeAccount.stripe_account_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get account balance
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccount.stripe_account_id
    });
    logStep("Balance retrieved", balance);

    const availableBalance = balance.available.find((b: { currency: string; amount: number }) => b.currency === currency.toLowerCase());
    if (!availableBalance) {
      return new Response(JSON.stringify({
        success: false,
        error: `No balance available in ${currency.toUpperCase()}`,
        availableAmount: 0,
        currency: currency.toUpperCase()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const availableAmount = availableBalance.amount; // In cents
    logStep("Available balance", { availableAmount, currency });

    // If no amount specified, return balance info (no method validation needed)
    if (!amount) {
      // Calculate instant payout fee (1.5% with minimum 0.50€)
      const instantFeePercent = 1.5;
      const instantMinFee = 50; // 0.50€ in cents
      const instantFee = Math.max(Math.round(availableAmount * instantFeePercent / 100), instantMinFee);
      
      return new Response(JSON.stringify({
        success: true,
        balanceOnly: true,
        availableAmount: availableAmount / 100,
        currency: currency.toUpperCase(),
        payoutOptions: {
          standard: {
            method: 'standard',
            fee: 0,
            feeDescription: 'Gratuit',
            deliveryTime: '1-2 jours ouvrables',
            netAmount: availableAmount / 100
          },
          instant: {
            method: 'instant',
            fee: instantFee / 100,
            feePercent: instantFeePercent,
            feeDescription: `${instantFeePercent}% (min. 0,50 ${currency.toUpperCase()})`,
            deliveryTime: '~30 minutes',
            netAmount: (availableAmount - instantFee) / 100
          }
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Validate method only when creating a payout
    if (!method || !['standard', 'instant'].includes(method)) {
      throw new Error("Invalid payout method. Use 'standard' or 'instant'.");
    }

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    // Check if amount is available
    if (amountInCents > availableAmount) {
      return new Response(JSON.stringify({
        success: false,
        error: `Insufficient balance. Available: ${(availableAmount / 100).toFixed(2)} ${currency.toUpperCase()}`,
        availableAmount: availableAmount / 100,
        requestedAmount: amount
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create payout
    const payoutParams: Stripe.PayoutCreateParams = {
      amount: amountInCents,
      currency: currency.toLowerCase(),
      method: method === 'instant' ? 'instant' : 'standard',
    };

    logStep("Creating payout", payoutParams);

    const payout = await stripe.payouts.create(payoutParams, {
      stripeAccount: stripeAccount.stripe_account_id
    });

    logStep("Payout created", { payoutId: payout.id, status: payout.status });

    // Calculate fee for response
    let fee = 0;
    if (method === 'instant') {
      fee = Math.max(Math.round(amountInCents * 1.5 / 100), 50) / 100;
    }

    return new Response(JSON.stringify({
      success: true,
      payout: {
        id: payout.id,
        amount: payout.amount / 100,
        currency: payout.currency.toUpperCase(),
        method: method,
        status: payout.status,
        arrivalDate: payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : null,
        fee: fee
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
