import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { automation_id, person_id } = await req.json()
        if (!automation_id || !person_id) throw new Error('Missing automation_id or person_id')

        const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_SERVICE_ROLE_KEY ?? '')

        // 1. Fetch Automation & Person
        const { data: automation } = await supabase.from('automations').select('*').eq('id', automation_id).single()
        const { data: person } = await supabase.from('people').select('*').eq('id', person_id).single()

        if (!automation || !person) throw new Error('Automation or Person not found')

        const actions = automation.actions || []
        console.log(`[Automation] Iniciando ${actions.length} ações para ${person.phone}`)

        for (let i = 0; i < actions.length; i++) {
            const action = actions[i]

            // APLICAR PAUSA DE 2 SEGUNDOS ENTRE AS AÇÕES
            if (i > 0) {
                console.log(`[Automation] Pausando 2s antes da ação ${i + 1}...`)
                await new Promise(resolve => setTimeout(resolve, 2000))
            }

            console.log(`[Automation] Executando: ${action.type} (${i + 1}/${actions.length})`)

            if (action.type === 'send_whatsapp') {
                const { data: config } = await supabase.from('whatsapp_configs').select('id').eq('organization_id', automation.organization_id).limit(1).maybeSingle()

                if (config && person.phone) {
                    // Busca/Cria conversa
                    let convId
                    const { data: existing } = await supabase.from('whatsapp_conversations').select('id').eq('config_id', config.id).eq('phone_number', person.phone).maybeSingle()

                    if (existing) {
                        convId = existing.id
                    } else {
                        const { data: created } = await supabase.from('whatsapp_conversations').insert({
                            config_id: config.id,
                            phone_number: person.phone,
                            contact_name: person.name,
                            status: 'active'
                        }).select('id').single()
                        convId = created?.id
                    }

                    if (convId) {
                        let msg = action.config?.message || ''
                        const firstName = person.name?.split(' ')[0] || ''
                        msg = msg.replace(/@nome/gi, firstName)

                        // Inserção no banco que dispara o webhook
                        await supabase.from('whatsapp_messages').insert({
                            conversation_id: convId,
                            direction: 'outbound',
                            content: msg,
                            message_type: 'text',
                            is_from_ai: false
                        })
                        console.log(`[Automation] Mensagem ${i + 1} enviada.`)
                    }
                }
            } else if (action.type === 'add_tag') {
                const tagId = action.config?.tag_id
                if (tagId) {
                    await supabase.from('person_tags').insert({ person_id, tag_id: tagId })
                }
            }
        }

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })
    } catch (error) {
        console.error("Error:", error.message)
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
    }
})
