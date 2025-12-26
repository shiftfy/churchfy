-- Update process_automation_actions function to add 2s delay between actions
CREATE OR REPLACE FUNCTION public.process_automation_actions(p_automation_id UUID, p_person_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_automation RECORD;
    v_action JSONB;
    v_person RECORD;
    v_config_id UUID;
    v_conversation_id UUID;
    v_message_content TEXT;
    v_index INTEGER := 0;
BEGIN
    -- Get automation details
    SELECT * INTO v_automation FROM public.automations WHERE id = p_automation_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Get person details
    SELECT * INTO v_person FROM public.people WHERE id = p_person_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Iterate over actions
    FOR v_action IN SELECT * FROM jsonb_array_elements(v_automation.actions)
    LOOP
        -- Add 2 seconds delay between actions (skip for the first one)
        IF v_index > 0 THEN
            PERFORM pg_sleep(2);
        END IF;
        v_index := v_index + 1;

        -- TYPE: ADD TAG
        IF v_action->>'type' = 'add_tag' THEN
            BEGIN
                INSERT INTO public.person_tags (person_id, tag_id)
                VALUES (p_person_id, (v_action->'config'->>'tag_id')::UUID)
                ON CONFLICT DO NOTHING;
            EXCEPTION WHEN OTHERS THEN
                -- Ignore errors
            END;
        
        -- TYPE: SEND WHATSAPP
        ELSIF v_action->>'type' = 'send_whatsapp' THEN
            -- Check if person has phone
            IF v_person.phone IS NOT NULL AND v_person.phone != '' THEN
                -- Find active whatsapp config for organization
                SELECT id INTO v_config_id 
                FROM public.whatsapp_configs 
                WHERE organization_id = v_automation.organization_id 
                LIMIT 1;

                IF v_config_id IS NOT NULL THEN
                    -- Find or create conversation
                    SELECT id INTO v_conversation_id
                    FROM public.whatsapp_conversations
                    WHERE config_id = v_config_id AND phone_number = v_person.phone
                    LIMIT 1;

                    IF v_conversation_id IS NULL THEN
                        INSERT INTO public.whatsapp_conversations (config_id, phone_number, contact_name, status)
                        VALUES (v_config_id, v_person.phone, v_person.name, 'active')
                        RETURNING id INTO v_conversation_id;
                    END IF;

                    -- Process message content: Replace @nome with first name
                    v_message_content := v_action->'config'->>'message';
                    
                    -- Extract first name (simple split)
                    IF v_person.name IS NOT NULL THEN
                         -- Use regexp_replace to replace @nome (case insensitive) with the user's first name
                         v_message_content := regexp_replace(v_message_content, '@nome', split_part(v_person.name, ' ', 1), 'gi');
                    END IF;

                    -- Insert Message
                    INSERT INTO public.whatsapp_messages (
                        conversation_id,
                        direction,
                        content,
                        message_type,
                        is_from_ai
                    ) VALUES (
                        v_conversation_id,
                        'outbound',
                        v_message_content,
                        'text',
                        false
                    );
                END IF;
            END IF;
        END IF;
    END LOOP;
END;
$$;
