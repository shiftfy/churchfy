ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS church_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.organizations.church_metadata IS 'Stores unstructured church data for AI context: pastors, groups, services, etc.';
