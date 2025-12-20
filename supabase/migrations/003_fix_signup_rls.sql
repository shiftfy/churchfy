-- =====================================================
-- FIX SIGNUP RLS ISSUE
-- =====================================================
-- This migration creates a secure function to handle signup
-- that bypasses RLS in a controlled manner

-- Drop the old policy that was causing issues
DROP POLICY IF EXISTS "Anyone can insert organizations" ON organizations;

-- Create a secure function for signup
CREATE OR REPLACE FUNCTION public.handle_signup(
  p_auth_user_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_organization_name TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_org_slug TEXT;
  v_result jsonb;
BEGIN
  -- Generate slug from organization name
  v_org_slug := lower(regexp_replace(p_organization_name, '\s+', '-', 'g'));
  
  -- Insert organization
  INSERT INTO organizations (name, slug, email, plan)
  VALUES (p_organization_name, v_org_slug, p_email, 'free')
  RETURNING id INTO v_org_id;
  
  -- Insert user with org_admin role
  INSERT INTO users (id, email, full_name, role, organization_id)
  VALUES (p_auth_user_id, p_email, p_full_name, 'org_admin', v_org_id);
  
  -- Return success with organization ID
  v_result := jsonb_build_object(
    'success', true,
    'organization_id', v_org_id
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    v_result := jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
    RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.handle_signup(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.handle_signup IS 'Securely creates organization and user records during signup process';
