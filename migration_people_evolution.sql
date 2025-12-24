-- migration_people_evolution.sql

-- Add photo and custom fields to people table
ALTER TABLE people 
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Create history table
CREATE TABLE IF NOT EXISTS person_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- e.g., 'stage_change', 'info_update', 'created', 'discipler_assigned'
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb, -- Stores details like { "old_stage": "...", "new_stage": "..." }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS for person_history
ALTER TABLE person_history ENABLE ROW LEVEL SECURITY;

-- Note: Adjust policies based on your existing pattern. Assuming direct link or via metadata.
-- Policy for viewing history
CREATE POLICY "Users can view history of their organization" ON person_history
  FOR SELECT
  USING (organization_id = (SELECT organization_id FROM public.users_secure_view WHERE id = auth.uid()));
  -- Note: Replace 'public.users_secure_view' with whatever mechanism you use to map auth.uid() to organization_id. 
  -- If you rely on the client sending the right org_id and trust authenticated users, you might use a simpler check or match against the people table.
  -- A safer generic policy if you store org_id in auth.users metadata:
  -- USING (organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id'));

-- For now, simplest policy if you don't have a specific view:
-- CREATE POLICY "Enable access to authenticated users" ON person_history FOR ALL USING (auth.role() = 'authenticated');
