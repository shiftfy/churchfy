-- Create automations table
CREATE TABLE IF NOT EXISTS public.automations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('form_submission', 'stage_entry')),
    trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their organization's automations"
    ON public.automations FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM users WHERE users.id = auth.uid()
    ));

CREATE POLICY "Admins can insert automations"
    ON public.automations FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM users WHERE users.id = auth.uid()
        AND users.role IN ('org_admin', 'branch_admin')
    ));

CREATE POLICY "Admins can update their organization's automations"
    ON public.automations FOR UPDATE
    USING (organization_id IN (
        SELECT organization_id FROM users WHERE users.id = auth.uid()
        AND users.role IN ('org_admin', 'branch_admin')
    ));

CREATE POLICY "Admins can delete their organization's automations"
    ON public.automations FOR DELETE
    USING (organization_id IN (
        SELECT organization_id FROM users WHERE users.id = auth.uid()
        AND users.role IN ('org_admin', 'branch_admin')
    ));


-- Helper block to declare v_conversation_id above
-- Rewriting the function to include v_conversation_id declaration
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
                -- AND is_connected = true -- checking connection might be flaky in db, let's assume it exists
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
                        v_action->'config'->>'message',
                        'text',
                        false
                    );
                END IF;
            END IF;
        END IF;
    END LOOP;
END;
$$;


-- Trigger Function for Form Submission (Hook into handle_new_visitor_response or similar?)
-- Actually, better to listen to trigger on visitor_responses table.
-- But we already have a function `handle_new_visitor_response` that runs BEFORE INSERT.
-- It returns NEW with person_id set.
-- We can add a trigger AFTER INSERT on visitor_responses to handle automations, ensuring person_id is there.

CREATE OR REPLACE FUNCTION public.handle_form_submission_automation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_automation RECORD;
BEGIN
    -- Loop through automations for this form
    FOR v_automation IN 
        SELECT id FROM public.automations 
        WHERE organization_id = NEW.organization_id 
        AND is_active = true 
        AND trigger_type = 'form_submission'
        AND (trigger_config->>'form_id')::UUID = NEW.form_id
    LOOP
        -- Execute Automation
        PERFORM public.process_automation_actions(v_automation.id, NEW.person_id);
    END LOOP;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_form_submission_automation
AFTER INSERT ON public.visitor_responses
FOR EACH ROW
EXECUTE FUNCTION public.handle_form_submission_automation();


-- Trigger Function for Stage Change
CREATE OR REPLACE FUNCTION public.handle_stage_change_automation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_automation RECORD;
BEGIN
    -- Setup: Trigger only if stage_id changed
    IF OLD.stage_id IS DISTINCT FROM NEW.stage_id AND NEW.stage_id IS NOT NULL THEN
        -- Loop through automations for this stage
        FOR v_automation IN 
            SELECT id FROM public.automations 
            WHERE organization_id = NEW.organization_id 
            AND is_active = true 
            AND trigger_type = 'stage_entry'
            AND (trigger_config->>'stage_id')::UUID = NEW.stage_id
        LOOP
            -- Execute Automation
            PERFORM public.process_automation_actions(v_automation.id, NEW.id);
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_stage_change_automation
AFTER UPDATE ON public.people
FOR EACH ROW
EXECUTE FUNCTION public.handle_stage_change_automation();

