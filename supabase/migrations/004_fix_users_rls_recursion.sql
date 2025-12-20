-- Fix infinite recursion in users table RLS policies

-- 1. Create helper functions to check roles securely (bypassing RLS)
-- These functions are SECURITY DEFINER, meaning they run with elevated privileges
-- and won't trigger the infinite recursion loop when querying the users table.

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'super_admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin_of(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND organization_id = org_id
    AND role = 'org_admin'
  );
END;
$$;

-- 2. Drop existing problematic policies on users table
DROP POLICY IF EXISTS "Super admins can view all users" ON users;
DROP POLICY IF EXISTS "Org admins can view organization users" ON users;

-- 3. Recreate policies using the secure functions
CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING ( is_super_admin() );

CREATE POLICY "Org admins can view organization users"
  ON users FOR SELECT
  TO authenticated
  USING ( is_org_admin_of(organization_id) );
