-- Fix the Trigger URL to point to the production Edge Function
-- This ensures the asynchronous processing works correctly with delays
CREATE OR REPLACE FUNCTION public.invoke_process_automation(p_automation_id UUID, p_person_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_url TEXT;
    v_payload JSONB;
BEGIN
    -- Hardcoded production URL for reliability
    v_url := 'https://vgpiowqyxhqgzawieymu.supabase.co/functions/v1/process-automation';
    
    v_payload := jsonb_build_object(
        'automation_id', p_automation_id,
        'person_id', p_person_id
    );

    -- Call the Edge Function asynchronously via pg_net
    PERFORM net.http_post(
        url := v_url,
        body := v_payload,
        headers := '{"Content-Type": "application/json"}'::jsonb
    );
END;
$$;