-- Simplify handle_signup function to return VOID and raise exceptions
-- This avoids JSON serialization issues and simplifies error handling

DROP FUNCTION IF EXISTS public.handle_signup(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.handle_signup(
  p_auth_user_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_organization_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_org_slug TEXT;
  v_base_slug TEXT;
  v_counter INTEGER := 0;
BEGIN
  -- Generate base slug
  v_base_slug := lower(regexp_replace(p_organization_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := trim(both '-' from v_base_slug);
  
  IF v_base_slug IS NULL OR v_base_slug = '' THEN
    v_base_slug := 'org-' || substring(md5(random()::text) from 1 for 6);
  END IF;
  
  v_org_slug := v_base_slug;

  -- Check for collision
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = v_org_slug) LOOP
    v_counter := v_counter + 1;
    v_org_slug := v_base_slug || '-' || v_counter;
  END LOOP;
  
  -- Insert organization
  INSERT INTO organizations (name, slug, email, plan)
  VALUES (p_organization_name, v_org_slug, p_email, 'free')
  RETURNING id INTO v_org_id;
  
  -- Insert user
  INSERT INTO users (id, email, full_name, role, organization_id)
  VALUES (p_auth_user_id, p_email, p_full_name, 'org_admin', v_org_id);
  
EXCEPTION
  WHEN OTHERS THEN
    -- Propagate the error
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_signup(UUID, TEXT, TEXT, TEXT) TO authenticated;
