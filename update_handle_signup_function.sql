-- Update handle_signup function to accept username parameter
-- This function is called during user registration

CREATE OR REPLACE FUNCTION public.handle_signup(
    p_auth_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_organization_name TEXT,
    p_username TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_organization_id UUID;
BEGIN
    -- Create organization with username
    INSERT INTO public.organizations (name, username, plan)
    VALUES (p_organization_name, p_username, 'free')
    RETURNING id INTO v_organization_id;

    -- Create user profile
    INSERT INTO public.users (id, email, full_name, role, organization_id)
    VALUES (p_auth_user_id, p_email, p_full_name, 'org_admin', v_organization_id);
END;
$$;
