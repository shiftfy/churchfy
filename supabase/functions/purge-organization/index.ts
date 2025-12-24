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
        if (!authHeader) throw new Error('Missing Authorization header')

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const token = authHeader.replace('Bearer ', '').trim()
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

        if (userError || !user) {
            throw new Error('User not authenticated')
        }

        // 1. Get user data and role
        const { data: userData, error: userDataError } = await supabaseClient
            .from('users')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();

        if (userDataError || !userData?.organization_id) {
            throw new Error('Organization not found');
        }

        // Only org_admin can purge the whole organization
        if (userData.role !== 'org_admin') {
            throw new Error('Unauthorized: Only organization administrators can delete the account');
        }

        const orgId = userData.organization_id;

        // 2. Get Organization details (Stripe)
        const { data: org, error: orgError } = await supabaseClient
            .from('organizations')
            .select('stripe_subscription_id, stripe_customer_id')
            .eq('id', orgId)
            .single();

        if (orgError) throw new Error('Organization details not found');

        // 3. Cancel Stripe Subscription immediately if exists
        if (org.stripe_subscription_id) {
            try {
                await stripe.subscriptions.cancel(org.stripe_subscription_id);
                console.log(`Stripe subscription ${org.stripe_subscription_id} canceled.`);
            } catch (e) {
                console.error("Error canceling Stripe subscription:", e);
            }
        }

        // 4. Delete Stripe Customer if exists
        if (org.stripe_customer_id) {
            try {
                await stripe.customers.del(org.stripe_customer_id);
                console.log(`Stripe customer ${org.stripe_customer_id} deleted.`);
            } catch (e) {
                console.error("Error deleting Stripe customer:", e);
            }
        }

        // 5. Get all users belonging to this organization to delete from Auth
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!serviceRoleKey) {
            throw new Error("Missing service role key for purge operation");
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            serviceRoleKey
        );

        const { data: orgUsers, error: usersError } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('organization_id', orgId);

        if (usersError) {
            console.error("Error fetching organization users:", usersError);
        }

        // 6. Delete users from Auth
        if (orgUsers && orgUsers.length > 0) {
            for (const orgUser of orgUsers) {
                const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(orgUser.id);
                if (deleteUserError) {
                    console.error(`Error deleting auth user ${orgUser.id}:`, deleteUserError);
                } else {
                    console.log(`Auth user ${orgUser.id} deleted.`);
                }
            }
        }

        // 7. Delete the organization (should cascade to all related tables based on our schema)
        const { error: deleteOrgError } = await supabaseAdmin
            .from('organizations')
            .delete()
            .eq('id', orgId);

        if (deleteOrgError) {
            console.error("Error deleting organization:", deleteOrgError);
            throw new Error(`Failed to delete organization data: ${deleteOrgError.message}`);
        }

        console.log(`Organization ${orgId} and all associated data purged.`);

        return new Response(
            JSON.stringify({ message: 'Organization and account successfully deleted.' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        console.error("Purge Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
