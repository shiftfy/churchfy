// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL')
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Validate critical environment variables
if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.error("Missing Evolution API configuration")
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const getHeaders = (apikey?: string) => ({
    'Content-Type': 'application/json',
    'apikey': apikey || EVOLUTION_API_KEY || '',
})

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
            throw new Error('Server misconfiguration: Missing Evolution API URL or Key in Secrets')
        }

        console.log('=== Starting WhatsApp Manager Request ===')
        console.log('ENV Check - EVOLUTION_API_URL:', EVOLUTION_API_URL ? 'SET' : 'MISSING')
        console.log('ENV Check - EVOLUTION_API_KEY:', EVOLUTION_API_KEY ? 'SET' : 'MISSING')
        console.log('ENV Check - SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING')
        console.log('ENV Check - SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'SET' : 'MISSING')
        console.log('ENV Check - SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING')

        const authHeader = req.headers.get('Authorization')
        console.log('Auth Header Present:', !!authHeader)
        console.log('Auth Header first 30 chars:', authHeader?.substring(0, 30))

        if (!authHeader) {
            console.error('FATAL: Missing Authorization header')
            throw new Error('Missing Authorization header')
        }

        console.log('Creating Supabase client for auth check...')
        const supabaseClient = createClient(
            SUPABASE_URL ?? '',
            SUPABASE_ANON_KEY ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        // Extract token ensuring 'Bearer ' is handled (like create-subscription does)
        const token = authHeader.replace('Bearer ', '').trim()

        console.log('Calling getUser() with explicit token...')
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

        if (userError) {
            console.error('User Auth Error Object:', JSON.stringify(userError))
            throw new Error('User authentication failed: ' + userError.message)
        }

        if (!user) {
            console.error('FATAL: No user returned from getUser()')
            throw new Error('User not authenticated: No user found')
        }

        console.log('✓ User authenticated:', user.id, user.email)

        // Get user organization
        const { data: userData } = await supabaseClient
            .from('users')
            .select('organization_id')
            .eq('id', user.id)
            .single()

        if (!userData?.organization_id) {
            throw new Error('User has no organization')
        }

        const organizationId = userData.organization_id
        const { action, payload } = await req.json()

        // Admin check (using service role to check role if needed, or trusting RLS if implemented correctly)
        // For critical actions like create/delete, we might want to ensure role is admin.
        // Assuming RLS on whatsapp_configs handles visibility.

        if (action === 'create') {
            const { instanceName, webhookUrl } = payload || {}
            if (!instanceName) throw new Error('Instance name required')

            console.log('Creating instance in Evolution API...')
            console.log('Evolution API URL:', EVOLUTION_API_URL)
            console.log('Instance name:', instanceName)

            // 1. Create in Evolution API (v2 format)
            const createBody: any = {
                instanceName,
                qrcode: true,  // v2: Generate QR code
                integration: "WHATSAPP-BAILEYS"  // v2: Use Baileys integration
            }

            // Add webhook configuration if provided
            if (webhookUrl) {
                createBody.webhook = {
                    url: webhookUrl,
                    byEvents: false,
                    base64: false,
                    events: [
                        'MESSAGES_UPSERT',
                        'MESSAGES_UPDATE',
                        'MESSAGES_DELETE',
                        'SEND_MESSAGE',
                        'CONNECTION_UPDATE',
                        'QRCODE_UPDATED'
                    ]
                }
            }

            console.log('Request body:', JSON.stringify(createBody))

            const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(createBody),
            })

            const data = await response.json()
            console.log('Evolution API response status:', response.status)
            console.log('Evolution API response data:', JSON.stringify(data))

            if (!response.ok) {
                console.error('Evolution API error:', data)
                throw new Error(data.message || data.error || JSON.stringify(data) || 'Failed to create instance')
            }

            // 2. Save to DB (using service role to bypass RLS)
            const adminClient = createClient(SUPABASE_URL ?? '', SUPABASE_SERVICE_ROLE_KEY ?? '')

            console.log('Saving to DB for org:', organizationId)
            console.log('Instance data:', data.instance?.instanceName, data.instance?.instanceId)
            console.log('Hash data:', data.hash?.apikey ? 'present' : 'missing')

            // Check if the data structure is correct for v2
            const savedInstanceName = data.instance?.instanceName || data.instanceName || payload.instanceName
            const savedInstanceId = data.instance?.instanceId || data.instance?.id || null
            const savedApiToken = data.hash?.apikey || data.apikey || null

            // Update existing record
            const { data: updateData, error: dbError } = await adminClient
                .from('whatsapp_configs')
                .update({
                    instance_name: savedInstanceName,
                    instance_id: savedInstanceId,
                    api_token: savedApiToken,
                    status: 'created',
                    updated_at: new Date().toISOString()
                })
                .eq('organization_id', organizationId)
                .select()

            if (dbError) {
                console.error('DB Update Error:', dbError)
            } else {
                console.log('DB Update Success:', updateData)
            }

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        if (action === 'connect') {
            const { instanceName } = payload || {}
            // Fetch token from DB to ensure we use the correct one? Or use Master Key?
            // Using Master Key to connect is fine.

            const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
                method: 'GET',
                headers: getHeaders(),
            })

            const data = await response.json()
            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: response.status,
            })
        }

        if (action === 'fetch') {
            const { instanceName } = payload || {}

            // Evolution API v2: Use connectionState endpoint
            const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
                method: 'GET',
                headers: getHeaders(),
            })

            const connectionData = await response.json()

            // Normalize the response to return a consistent format
            // v2 returns: { instance: { instanceName, state } } or { state: "open" }
            const state = connectionData?.instance?.state || connectionData?.state || 'close'

            return new Response(JSON.stringify({
                instance: {
                    instanceName,
                    status: state, // 'open', 'close', 'connecting'
                    state: state
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        if (action === 'delete') {
            const { instanceName } = payload || {}

            const response = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
                method: 'DELETE',
                headers: getHeaders(),
            })

            if (response.ok) {
                // Clear from DB
                const adminClient = createClient(SUPABASE_URL ?? '', SUPABASE_SERVICE_ROLE_KEY ?? '')
                await adminClient
                    .from('whatsapp_configs')
                    .update({
                        instance_name: null,
                        instance_id: null,
                        api_token: null,
                        status: 'disconnected',
                        is_connected: false
                    })
                    .eq('organization_id', organizationId)
            }

            return new Response(JSON.stringify({ success: response.ok }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: response.status,
            })
        }

        throw new Error('Invalid action')

    } catch (error) {
        console.error("Function Error:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
