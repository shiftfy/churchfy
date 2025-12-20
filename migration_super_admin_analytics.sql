-- Migration: Super Admin Analytics Views and Functions
-- Creates database views and functions for platform-wide analytics

-- Create view for platform statistics
CREATE OR REPLACE VIEW public.platform_stats AS
SELECT
    (SELECT COUNT(*) FROM public.users) as total_users,
    (SELECT COUNT(*) FROM public.organizations WHERE username != 'platform-admin') as total_organizations,
    (SELECT COUNT(*) FROM public.journeys) as total_journeys,
    (SELECT COUNT(*) FROM public.people) as total_visitors,
    (SELECT COUNT(*) FROM public.forms) as total_forms,
    (SELECT COUNT(*) FROM public.visitor_responses) as total_responses;

-- Grant access to authenticated users (will be protected by RLS in application)
GRANT SELECT ON public.platform_stats TO authenticated;

-- Create view for organization rankings by visitor count
CREATE OR REPLACE VIEW public.organization_rankings AS
SELECT 
    o.id,
    o.name,
    o.username,
    o.slug,
    o.is_blocked,
    o.created_at,
    COUNT(DISTINCT p.id) as visitor_count,
    COUNT(DISTINCT u.id) as user_count,
    COUNT(DISTINCT j.id) as journey_count,
    COUNT(DISTINCT f.id) as form_count
FROM public.organizations o
LEFT JOIN public.people p ON p.organization_id = o.id
LEFT JOIN public.users u ON u.organization_id = o.id
LEFT JOIN public.journeys j ON j.organization_id = o.id
LEFT JOIN public.forms f ON f.organization_id = o.id
WHERE o.username != 'platform-admin'  -- Exclude platform admin org
GROUP BY o.id, o.name, o.username, o.slug, o.is_blocked, o.created_at
ORDER BY visitor_count DESC, o.created_at DESC;

-- Grant access to authenticated users
GRANT SELECT ON public.organization_rankings TO authenticated;

-- Create function to get all users with organization details
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    organization_id UUID,
    organization_name TEXT,
    organization_username TEXT,
    branch_id UUID,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow super admins to execute this function
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied. Super admin privileges required.';
    END IF;

    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.full_name,
        u.role::TEXT,
        u.organization_id,
        o.name as organization_name,
        o.username as organization_username,
        u.branch_id,
        u.avatar_url,
        u.phone,
        u.created_at,
        u.updated_at
    FROM public.users u
    LEFT JOIN public.organizations o ON o.id = u.organization_id
    ORDER BY u.created_at DESC;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_users_admin() TO authenticated;

-- Create function to block/unblock organization
CREATE OR REPLACE FUNCTION public.toggle_organization_block(
    p_organization_id UUID,
    p_is_blocked BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow super admins to execute this function
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied. Super admin privileges required.';
    END IF;

    -- Prevent blocking the platform admin organization
    IF EXISTS (
        SELECT 1 FROM public.organizations 
        WHERE id = p_organization_id AND username = 'platform-admin'
    ) THEN
        RAISE EXCEPTION 'Cannot block the platform admin organization';
    END IF;

    UPDATE public.organizations
    SET 
        is_blocked = p_is_blocked,
        updated_at = NOW()
    WHERE id = p_organization_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.toggle_organization_block(UUID, BOOLEAN) TO authenticated;

-- Create function to delete organization (with cascade)
CREATE OR REPLACE FUNCTION public.delete_organization_admin(
    p_organization_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow super admins to execute this function
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied. Super admin privileges required.';
    END IF;

    -- Prevent deleting the platform admin organization
    IF EXISTS (
        SELECT 1 FROM public.organizations 
        WHERE id = p_organization_id AND username = 'platform-admin'
    ) THEN
        RAISE EXCEPTION 'Cannot delete the platform admin organization';
    END IF;

    -- Delete organization (cascade will handle related records)
    DELETE FROM public.organizations
    WHERE id = p_organization_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_organization_admin(UUID) TO authenticated;

-- Create function to update user details
CREATE OR REPLACE FUNCTION public.update_user_admin(
    p_user_id UUID,
    p_full_name TEXT,
    p_email TEXT,
    p_role TEXT,
    p_organization_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow super admins to execute this function
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied. Super admin privileges required.';
    END IF;

    -- Validate role
    IF p_role NOT IN ('super_admin', 'org_admin', 'branch_admin') THEN
        RAISE EXCEPTION 'Invalid role. Must be super_admin, org_admin, or branch_admin';
    END IF;

    UPDATE public.users
    SET 
        full_name = p_full_name,
        email = p_email,
        role = p_role::public.user_role,
        organization_id = p_organization_id,
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_admin(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;

-- Create function to delete user
CREATE OR REPLACE FUNCTION public.delete_user_admin(
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow super admins to execute this function
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Access denied. Super admin privileges required.';
    END IF;

    -- Prevent deleting yourself
    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot delete your own account';
    END IF;

    -- Delete user from public.users (auth.users must be deleted separately via Supabase Auth API)
    DELETE FROM public.users
    WHERE id = p_user_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_admin(UUID) TO authenticated;

-- Create index on users.role for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Create index on organizations.is_blocked for performance
CREATE INDEX IF NOT EXISTS idx_organizations_blocked ON public.organizations(is_blocked) WHERE is_blocked = true;
