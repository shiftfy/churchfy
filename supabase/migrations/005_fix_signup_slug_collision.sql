-- Fix signup slug collision issue
-- This migration updates the handle_signup function to automatically handle duplicate slugs
-- by appending a counter (e.g., 'church-name-1') if the slug already exists.

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
  v_base_slug TEXT;
  v_counter INTEGER := 0;
  v_result jsonb;
BEGIN
  -- Generate base slug: replace non-alphanumeric chars with hyphens, lowercase
  v_base_slug := lower(regexp_replace(p_organization_name, '[^a-zA-Z0-9]+', '-', 'g'));
  -- Remove leading/trailing hyphens
  v_base_slug := trim(both '-' from v_base_slug);
  
  -- Ensure slug is not empty
  IF v_base_slug IS NULL OR v_base_slug = '' THEN
    v_base_slug := 'org-' || substring(md5(random()::text) from 1 for 6);
  END IF;
  
  v_org_slug := v_base_slug;

  -- Check for collision and append counter if necessary
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = v_org_slug) LOOP
    v_counter := v_counter + 1;
    v_org_slug := v_base_slug || '-' || v_counter;
  END LOOP;
  
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
