-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA extensions;

-- Function to send outbound messages to n8n webhook via pg_net
CREATE OR REPLACE FUNCTION public.send_whatsapp_to_n8n()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payload JSONB;
    v_url TEXT := 'https://n8n-webhook.kq8ehu.easypanel.host/webhook/79a5f9b6-e825-441b-ad55-a7836ca90f5e';
    v_request_id BIGINT;
BEGIN
    -- Only process outbound messages
    IF NEW.direction = 'outbound' THEN
        -- Construct Payload by joining tables to get instance info and phone number
        SELECT
            jsonb_build_object(
                'instanceName', c.instance_name,
                'apikey', c.api_token,
                'number', conv.phone_number,
                'remoteJid', conv.phone_number,
                'text', NEW.content,
                'messageId', NEW.id
            ) INTO v_payload
        FROM
            public.whatsapp_conversations conv
            JOIN public.whatsapp_configs c ON conv.config_id = c.id
        WHERE
            conv.id = NEW.conversation_id;

        -- Send only if we found config and instance name is set
        IF v_payload IS NOT NULL AND (v_payload->>'instanceName') IS NOT NULL THEN
             -- Using pg_net to send async POST request
             -- Note: This requires the pg_net extension to be enabled and configured
             SELECT net.http_post(
                url := v_url,
                body := v_payload,
                headers := '{"Content-Type": "application/json"}'::jsonb
            ) INTO v_request_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create Trigger on whatsapp_messages
DROP TRIGGER IF EXISTS trigger_send_whatsapp_n8n ON public.whatsapp_messages;

CREATE TRIGGER trigger_send_whatsapp_n8n
AFTER INSERT ON public.whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION public.send_whatsapp_to_n8n();
