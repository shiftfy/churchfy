-- Safe casting and error handling for automations

-- 1. Ensure pg_net is enabled (Required for Edge Functions calls)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Robust invoke_process_automation with error handling
CREATE OR REPLACE FUNCTION public.invoke_process_automation(p_automation_id UUID, p_person_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_url TEXT;
    v_payload JSONB;
BEGIN
    -- Production URL for the Edge Function
    v_url := 'https://vgpiowqyxhqgzawieymu.supabase.co/functions/v1/process-automation';
    
    v_payload := jsonb_build_object(
        'automation_id', p_automation_id,
        'person_id', p_person_id
    );

    BEGIN
        -- Attempt to call the Edge Function
        PERFORM net.http_post(
            url := v_url,
            body := v_payload,
            headers := '{"Content-Type": "application/json"}'::jsonb
        );
    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the transaction (Form Submission)
        RAISE WARNING 'Failed to invoke automation process: %', SQLERRM;
    END;
END;
$$;

-- 3. Fix trigger functions to avoid UUID casting errors
-- Using text comparison prevents "invalid input syntax for type uuid" if JSON contains invalid data

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
        -- Safe comparison: compare strings instead of casting JSON value to UUID which might fail
        AND trigger_config->>'form_id' = NEW.form_id::text
    LOOP
        -- Execute Automation via Edge Function
        PERFORM public.invoke_process_automation(v_automation.id, NEW.person_id);
    END LOOP;
    
    RETURN NEW;
END;
$$;

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
             -- Safe comparison: compare strings instead of casting JSON value to UUID which might fail
            AND trigger_config->>'stage_id' = NEW.stage_id::text
        LOOP
            -- Execute Automation via Edge Function
            PERFORM public.invoke_process_automation(v_automation.id, NEW.id);
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;
