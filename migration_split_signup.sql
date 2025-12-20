-- Function to handle new user signup WITHOUT organization
-- This is called immediately after supabase.auth.signUp()
CREATE OR REPLACE FUNCTION public.handle_new_user_signup(
    p_auth_user_id UUID,
    p_email TEXT,
    p_full_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role, organization_id)
    VALUES (p_auth_user_id, p_email, p_full_name, 'org_admin', NULL);
    -- organization_id is NULL initially
END;
$$;

-- Function to create organization and link to existing user
-- This is called at the end of the Onboarding flow
CREATE OR REPLACE FUNCTION public.create_organization_and_link(
    p_user_id UUID,
    p_org_name TEXT,
    p_org_username TEXT,
    p_members_count TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_referral_source TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_organization_id UUID;
    v_exists BOOLEAN;
BEGIN
    -- Check if username is taken (redundant check for safety)
    SELECT EXISTS (SELECT 1 FROM public.organizations WHERE username = p_org_username) INTO v_exists;
    IF v_exists THEN
        RAISE EXCEPTION 'Username already taken';
    END IF;

    -- Create organization (slug = username)
    INSERT INTO public.organizations (name, username, slug, plan, address)
    VALUES (p_org_name, p_org_username, p_org_username, 'free', p_address)
    RETURNING id INTO v_organization_id;

    -- Update user with organization_id and optional onboarding fields if we were to store them
    -- For now, we mainly link the organization
    UPDATE public.users
    SET organization_id = v_organization_id,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- We could store members_count and referral_source in specific analytics tables or fields if they existed
    -- For now, we'll just log or ignore them as they are "onboarding info" - assuming we might want to add columns later
    -- or if they are just for the record. 
    -- Let's check if we should add them to organization? 
    -- The schema showed 'address' in organization, so we used it.
    
    RETURN jsonb_build_object(
        'organization_id', v_organization_id,
        'success', true
    );
END;
$$;
