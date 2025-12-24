-- migration_people_evolution_v2.sql

-- 1. Add columns to people table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'people' AND column_name = 'photo_url') THEN
        ALTER TABLE people ADD COLUMN photo_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'people' AND column_name = 'custom_fields') THEN
        ALTER TABLE people ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. Create history table
CREATE TABLE IF NOT EXISTS person_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 3. Enable RLS
ALTER TABLE person_history ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
DROP POLICY IF EXISTS "Users can view history of their organization" ON person_history;

CREATE POLICY "Users can view history of their organization" ON person_history
  FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert history for their organization" ON person_history;

CREATE POLICY "Users can insert history for their organization" ON person_history
  FOR INSERT
  WITH CHECK (
    organization_id = (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- 5. Helper for Storage (Optional: Run if bucket setup via UI is preferred, or use this)
-- Attempt to create bucket 'person-photos' if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('person-photos', 'person-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Allow public access to view photos
DROP POLICY IF EXISTS "Give public access to person-photos" ON storage.objects;
CREATE POLICY "Give public access to person-photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'person-photos');

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Enable upload for authenticated users" ON storage.objects;
CREATE POLICY "Enable upload for authenticated users" ON storage.objects
  FOR INSERT 
  WITH CHECK (bucket_id = 'person-photos' AND auth.role() = 'authenticated');

-- Allow users to update/delete their own uploads or generally org admins
-- Simplification: Allow authenticated update/delete for now
DROP POLICY IF EXISTS "Enable update for authenticated users" ON storage.objects;
CREATE POLICY "Enable update for authenticated users" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'person-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON storage.objects;
CREATE POLICY "Enable delete for authenticated users" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'person-photos' AND auth.role() = 'authenticated');
