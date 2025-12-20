-- 1. Create Bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS (if not already enabled)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Organization Policies
-- Allow users to view their organization
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
CREATE POLICY "Users can view their own organization"
ON organizations FOR SELECT
USING (
  id IN (
    SELECT organization_id 
    FROM users 
    WHERE auth.uid() = id
  )
);

-- Allow admins to update their organization
DROP POLICY IF EXISTS "Admins can update their organization" ON organizations;
CREATE POLICY "Admins can update their organization"
ON organizations FOR UPDATE
USING (
  id IN (
    SELECT organization_id 
    FROM users 
    WHERE auth.uid() = id 
    AND role IN ('super_admin', 'org_admin')
  )
);

-- 3. User Policies
-- Allow users to view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- 4. Storage Policies (for 'avatars' bucket)
-- Note: Ensure you have created a public bucket named 'avatars' in the Supabase Storage dashboard.

-- Allow public read access
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Allow authenticated uploads
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- Allow users to update/delete their own uploads
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' AND auth.uid() = owner );

DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
USING ( bucket_id = 'avatars' AND auth.uid() = owner );
