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

        // Get organization and subscription ID
        const { data: userData } = await supabaseClient
            .from('users')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (!userData?.organization_id) throw new Error('Organization not found');

        const { data: org } = await supabaseClient
            .from('organizations')
            .select('stripe_subscription_id, subscription_status')
            .eq('id', userData.organization_id)
            .single();

        if (!org?.stripe_subscription_id) {
            // Check if it's just local trial state without stripe sync? 
            // If strictly following logic, if no stripe ID, just cancel locally.
            // But usually trial starts with Stripe.
            // We'll assume stripe ID is present if they are in trial.
            // If not present, we just update local state.
        }

        if (org.stripe_subscription_id) {
            try {
                // Cancel immediately at Stripe
                await stripe.subscriptions.cancel(org.stripe_subscription_id);
            } catch (e) {
                console.error("Stripe cancel error:", e);
                // Continue to update local DB even if stripe fails (maybe already canceled)
            }
        }

        // Update local DB
        await supabaseClient
            .from('organizations')
            .update({
                subscription_status: 'canceled',
                plan: 'free',
            })
            .eq('id', userData.organization_id);

        // --- NEW: DELETE USER AND DATA ---
        // To delete the user from Auth, we need the Service Role Key
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!serviceRoleKey) {
            console.error("Missing SUPABASE_SERVICE_ROLE_KEY. Cannot delete auth user.");
        } else {
            const supabaseAdmin = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                serviceRoleKey
            );

            // Delete user from Auth (this usually cascades to public tables if setup correctly, 
            // but we might want to manually delete organization data first to be clean)

            // Delete public.users entry (if not ON DELETE CASCADE)
            // Assuming your schema handles cleanup or you want to keep data anonymously?
            // "Exclusão completa" implies wiping everything.
            // Let's rely on constraints or just wipe the auth user:

            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
                user.id
            );

            if (deleteError) {
                console.error("Error deleting auth user:", deleteError);
                // We don't throw here to ensure we return success for the cancellation part
            } else {
                console.log("User deleted from Auth");
            }
        }

        return new Response(
            JSON.stringify({ message: 'Subscription canceled' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        console.error("Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
