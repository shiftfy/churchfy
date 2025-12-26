-- Enable pg_net extension if not enabled (required for calling Edge Function)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to invoke the Edge Function
CREATE OR REPLACE FUNCTION public.invoke_process_automation(p_automation_id UUID, p_person_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_url TEXT;
    v_service_key TEXT;
    v_payload JSONB;
BEGIN
    -- Get URL and Key from a secure place or hardcoded if necessary for now.
    -- Ideally, these should be in vault.secrets or inferred.
    -- Assuming standard Supabase setup where we can construct the URL.
    -- But since we can't easily get env vars in PLPGSQL without vault, 
    -- we will try to rely on pg_net sending the request.
    
    -- NOTE: In local dev, this might need localhost adjustment.
    -- In prod, it needs the project URL.
    -- Since we don't have the project URL variable easily here, 
    -- we will use a workaround or Placeholder.
    
    -- IMPORTANT: User needs to ensure pg_net is configured or replace this URL.
    -- For now, we will revert to using the Logic inside the database IF the edge function is not reachable,
    -- OR we can try to use a dummy URL that the user must configure.
    
    -- HOWEVER, since the user wants a fix NOW and we can't easily deploy the edge function without CLI login,
    -- THE PREVIOUS ATTEMPT WITH pg_sleep FAILED BECAUSE OF TRANSACTION COMMIT.
    
    -- LET'S TRY A DIFFERENT DB-ONLY APPROACH FIRST:
    -- Scheduling via a queue table? No worker.
    
    -- LET'S GO BACK TO THE EDGE FUNCTION STRATEGY.
    -- I will assume the user can deploy it.
    
    v_payload := jsonb_build_object(
        'automation_id', p_automation_id,
        'person_id', p_person_id
    );

    -- This call is asynchronous 'Fire and Forget' from the DB perspective
    -- The Edge Function will handle the logic and the delays.
    -- Replace PROJECT_REF with your actual Supabase project ref if known, 
    -- or use the local function URL.
    
    -- FOR LOCAL DEVELOPMENT (which seems to be the case given 'npm run dev'):
    -- host.docker.internal works if running in docker.
    -- If running 'supabase start', functions are at http://host.docker.internal:54321/functions/v1/process-automation
    
    PERFORM net.http_post(
        url := 'http://host.docker.internal:54321/functions/v1/process-automation',
        body := v_payload
    );
    
    -- NOTE: If in production, you MUST update the URL in this function to your Supabase Project URL.
END;
$$;

-- Update the Trigger Functions to call invoke_process_automation instead of process_automation_actions

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
        -- Execute Automation via Edge Function (Async with real delay support)
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
            AND (trigger_config->>'stage_id')::UUID = NEW.stage_id
        LOOP
            -- Execute Automation via Edge Function (Async with real delay support)
            PERFORM public.invoke_process_automation(v_automation.id, NEW.id);
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;
