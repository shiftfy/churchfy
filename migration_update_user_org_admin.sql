-- Update function to update user details AND organization name
CREATE OR REPLACE FUNCTION public.update_user_admin(
    p_user_id UUID,
    p_full_name TEXT,
    p_email TEXT,
    p_role TEXT,
    p_organization_id UUID,
    p_organization_name TEXT DEFAULT NULL
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

    -- Update user details
    UPDATE public.users
    SET 
        full_name = p_full_name,
        email = p_email,
        role = p_role::public.user_role,
        organization_id = p_organization_id,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Update organization name if provided and ID is valid
    IF p_organization_id IS NOT NULL AND p_organization_name IS NOT NULL THEN
        UPDATE public.organizations
        SET 
            name = p_organization_name,
            updated_at = NOW()
        WHERE id = p_organization_id;
    END IF;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_admin(UUID, TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;
