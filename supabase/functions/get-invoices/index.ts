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
        console.log("get-invoices: Authorization header received:", authHeader ? "present" : "missing")

        if (!authHeader) {
            throw new Error('Missing Authorization header')
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const token = authHeader.replace('Bearer ', '').trim()
        const {
            data: { user },
            error: userError
        } = await supabaseClient.auth.getUser(token)

        if (userError) {
            console.error("get-invoices: Error fetching user:", userError)
        }

        if (!user) {
            console.error("get-invoices: User not found.")
            throw new Error('User not authenticated')
        }
        console.log("get-invoices: User authenticated:", user.id)

        // Get user's organization from the users table
        const { data: userData, error: userDataError } = await supabaseClient
            .from('users')
            .select('organization_id')
            .eq('id', user.id)
            .single()

        if (userDataError || !userData?.organization_id) {
            console.error("get-invoices: Error getting user organization:", userDataError)
            throw new Error('Organization not found')
        }

        // Get organization's stripe_customer_id
        const { data: org, error: orgError } = await supabaseClient
            .from('organizations')
            .select('stripe_customer_id')
            .eq('id', userData.organization_id)
            .single()

        if (orgError) {
            console.error("get-invoices: Error getting organization:", orgError)
            throw new Error('Organization not found')
        }

        if (!org?.stripe_customer_id) {
            console.log("get-invoices: No Stripe customer ID found for organization")
            return new Response(
                JSON.stringify({ invoices: [] }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        }

        console.log("get-invoices: Fetching invoices for customer:", org.stripe_customer_id)

        // Fetch paid invoices from Stripe
        const invoices = await stripe.invoices.list({
            customer: org.stripe_customer_id,
            status: 'paid',
            limit: 100,
        })

        // Map invoices to a simpler format
        const formattedInvoices = invoices.data.map((invoice) => ({
            id: invoice.id,
            number: invoice.number,
            amount: invoice.amount_paid / 100, // Convert from cents
            currency: invoice.currency,
            status: invoice.status,
            created: invoice.created,
            period_start: invoice.period_start,
            period_end: invoice.period_end,
            invoice_pdf: invoice.invoice_pdf,
            hosted_invoice_url: invoice.hosted_invoice_url,
        }))

        console.log(`get-invoices: Found ${formattedInvoices.length} paid invoices`)

        return new Response(
            JSON.stringify({ invoices: formattedInvoices }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        console.error("get-invoices: Function error:", error)

        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
