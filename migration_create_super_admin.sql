-- Migration: Create Super Admin User
-- This migration creates or updates the super admin user with proper credentials

-- First, ensure the super admin user exists in auth.users
-- Note: This assumes the user has already signed up via the normal signup flow
-- If not, you'll need to create them manually in Supabase Auth dashboard first

-- Create a special "Platform Admin" organization for super admins
DO $$
DECLARE
    v_super_admin_org_id UUID;
    v_super_admin_user_id UUID;
BEGIN
    -- Check if super admin organization exists
    SELECT id INTO v_super_admin_org_id 
    FROM public.organizations 
    WHERE username = 'platform-admin';

    -- Create super admin organization if it doesn't exist
    IF v_super_admin_org_id IS NULL THEN
        INSERT INTO public.organizations (name, username, slug, plan)
        VALUES ('Platform Admin', 'platform-admin', 'platform-admin', 'enterprise')
        RETURNING id INTO v_super_admin_org_id;
        
        RAISE NOTICE 'Created Platform Admin organization with ID: %', v_super_admin_org_id;
    END IF;

    -- Get the auth user ID for the super admin email
    SELECT id INTO v_super_admin_user_id
    FROM auth.users
    WHERE email = 'shitfy.gestao@gmail.com';

    IF v_super_admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Super admin user not found in auth.users. Please create account via signup first with email: shitfy.gestao@gmail.com';
    END IF;

    -- Check if user profile exists
    IF EXISTS (SELECT 1 FROM public.users WHERE id = v_super_admin_user_id) THEN
        -- Update existing user to super_admin role
        UPDATE public.users
        SET 
            role = 'super_admin',
            organization_id = v_super_admin_org_id,
            full_name = 'Super Admin',
            updated_at = NOW()
        WHERE id = v_super_admin_user_id;
        
        RAISE NOTICE 'Updated existing user to super_admin role';
    ELSE
        -- Create new user profile
        INSERT INTO public.users (id, email, full_name, role, organization_id)
        VALUES (
            v_super_admin_user_id,
            'shitfy.gestao@gmail.com',
            'Super Admin',
            'super_admin',
            v_super_admin_org_id
        );
        
        RAISE NOTICE 'Created new super_admin user profile';
    END IF;

END $$;

-- Create helper function to check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Add RLS policies for super admin access to all tables
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Super admins can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Super admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Super admins can update any user" ON public.users;
DROP POLICY IF EXISTS "Super admins can delete any user" ON public.users;
DROP POLICY IF EXISTS "Super admins can view all people" ON public.people;
DROP POLICY IF EXISTS "Super admins can view all journeys" ON public.journeys;
DROP POLICY IF EXISTS "Super admins can view all forms" ON public.forms;
DROP POLICY IF EXISTS "Super admins can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Super admins can delete organizations" ON public.organizations;

-- Create policies
CREATE POLICY "Super admins can view all organizations"
    ON public.organizations FOR SELECT
    USING (public.is_super_admin());

CREATE POLICY "Super admins can view all users"
    ON public.users FOR SELECT
    USING (public.is_super_admin());

CREATE POLICY "Super admins can update any user"
    ON public.users FOR UPDATE
    USING (public.is_super_admin());

CREATE POLICY "Super admins can delete any user"
    ON public.users FOR DELETE
    USING (public.is_super_admin());

CREATE POLICY "Super admins can view all people"
    ON public.people FOR SELECT
    USING (public.is_super_admin());

CREATE POLICY "Super admins can view all journeys"
    ON public.journeys FOR SELECT
    USING (public.is_super_admin());

CREATE POLICY "Super admins can view all forms"
    ON public.forms FOR SELECT
    USING (public.is_super_admin());

CREATE POLICY "Super admins can update organizations"
    ON public.organizations FOR UPDATE
    USING (public.is_super_admin());

CREATE POLICY "Super admins can delete organizations"
    ON public.organizations FOR DELETE
    USING (public.is_super_admin());

-- Add is_blocked column to organizations table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'is_blocked'
    ) THEN
        ALTER TABLE public.organizations 
        ADD COLUMN is_blocked BOOLEAN DEFAULT false NOT NULL;
        
        RAISE NOTICE 'Added is_blocked column to organizations table';
    END IF;
END $$;

-- Create index on is_blocked for performance
CREATE INDEX IF NOT EXISTS idx_organizations_is_blocked 
ON public.organizations(is_blocked);

COMMENT ON COLUMN public.organizations.is_blocked IS 'When true, users from this organization cannot login';
