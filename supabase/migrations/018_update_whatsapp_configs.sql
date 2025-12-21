-- Migration: Update whatsapp_configs for Evolution API integration

-- Add columns for Evolution API instance details
ALTER TABLE public.whatsapp_configs
ADD COLUMN IF NOT EXISTS instance_name TEXT,
ADD COLUMN IF NOT EXISTS instance_id TEXT,
ADD COLUMN IF NOT EXISTS api_token TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disconnected';  -- disconnected, connecting, connected

-- Ensure uniqueness per organization (simple approach for now, assuming 1 instance per org)
-- If we want per branch later, we can adjust.
-- DO $$
-- BEGIN
--     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_configs_organization_id_key') THEN
--         ALTER TABLE public.whatsapp_configs ADD CONSTRAINT whatsapp_configs_organization_id_key UNIQUE (organization_id);
--     END IF;
-- END $$;

COMMENT ON COLUMN public.whatsapp_configs.instance_name IS 'Name of the instance in Evolution API';
COMMENT ON COLUMN public.whatsapp_configs.api_token IS 'Token for the specific Evolution API instance. Used to control this instance.';
COMMENT ON COLUMN public.whatsapp_configs.status IS 'Current connection status: disconnected, connecting, connected';

-- Update RLS if needed (002 already enabled it and added policies)
-- Just ensuring the policies cover update/insert for these new fields (which they do as they are row-level).
