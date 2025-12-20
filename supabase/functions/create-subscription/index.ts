// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        console.log("Raw Auth Header:", authHeader ? authHeader.substring(0, 20) + "..." : "null")

        if (!authHeader) {
            throw new Error('Missing Authorization header')
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        // Extract token ensuring 'Bearer ' is handled
        const token = authHeader.replace('Bearer ', '').trim()

        // Get current user explicitly passing the token
        console.log("Buscando usuário com token explícito...")
        const {
            data: { user },
            error: userError
        } = await supabaseClient.auth.getUser(token)

        if (userError) {
            console.error("Erro ao buscar usuário (auth.getUser):", userError)
        }

        if (!user) {
            console.error("Usuário não encontrado. Token inválido ou expirado.")
            throw new Error('User not authenticated')
        }
        console.log("Usuário autenticado:", user.id)

        const { planId, organizationId } = await req.json()
        console.log("Dados recebidos:", { planId, organizationId })

        if (!['one', 'campus'].includes(planId)) {
            throw new Error('Invalid plan')
        }

        const priceId = planId === 'one'
            ? 'price_1SgB6ER5Gkg9LiP4XL3B2khz'
            : 'price_1SgB6jR5Gkg9LiP4cFqcZ75J';

        // 1. Check if organization already has stripe_customer_id
        const { data: org } = await supabaseClient
            .from('organizations')
            .select('stripe_customer_id')
            .eq('id', organizationId)
            .single();

        let customerId = org?.stripe_customer_id;

        // 2. If not, create Customer in Stripe
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    supabase_user_id: user.id,
                    organization_id: organizationId
                }
            });
            customerId = customer.id;

            // Save to DB
            await supabaseClient
                .from('organizations')
                .update({ stripe_customer_id: customerId })
                .eq('id', organizationId);
        }

        // 3. Create Subscription (with 7 days trial)
        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            trial_period_days: 7,
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
            metadata: {
                organization_id: organizationId,
                plan_id: planId
            }
        });

        let clientSecret = "";
        if (subscription.pending_setup_intent) {
            clientSecret = subscription.pending_setup_intent.client_secret;
        } else if (subscription.latest_invoice && typeof subscription.latest_invoice !== 'string' && subscription.latest_invoice.payment_intent) {
            clientSecret = subscription.latest_invoice.payment_intent.client_secret;
        } else {
            const setupIntent = await stripe.setupIntents.create({
                customer: customerId,
                payment_method_types: ['card'],
            })
            clientSecret = setupIntent.client_secret
        }

        // Update organization with sub ID
        await supabaseClient
            .from('organizations')
            .update({
                stripe_subscription_id: subscription.id,
                plan_id: planId
            })
            .eq('id', organizationId);

        return new Response(
            JSON.stringify({
                subscriptionId: subscription.id,
                clientSecret
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        console.error("Function Error:", error);

        let errorMessage = error.message;
        if (error?.type === 'StripeInvalidRequestError') {
            errorMessage = `Stripe Error: ${error.message}`;
        }

        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
