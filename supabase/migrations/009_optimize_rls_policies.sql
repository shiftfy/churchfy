-- Optimize RLS policies to use helper functions
-- This prevents RLS recursion and improves performance by using SECURITY DEFINER functions

-- 1. Create is_branch_admin_of helper
CREATE OR REPLACE FUNCTION public.is_branch_admin_of(b_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND branch_id = b_id
    AND role = 'branch_admin'
  );
END;
$$;

-- 2. Update BRANCHES policies
DROP POLICY IF EXISTS "Org admins can manage branches" ON branches;
DROP POLICY IF EXISTS "Branch admins can view their branch" ON branches;

CREATE POLICY "Org admins can manage branches"
  ON branches FOR ALL
  TO authenticated
  USING ( is_org_admin_of(organization_id) OR is_super_admin() );

CREATE POLICY "Branch admins can view their branch"
  ON branches FOR SELECT
  TO authenticated
  USING ( is_branch_admin_of(id) );

-- 3. Update FORMS policies
DROP POLICY IF EXISTS "Admins can manage forms" ON forms;

CREATE POLICY "Admins can manage forms"
  ON forms FOR ALL
  TO authenticated
  USING (
    is_org_admin_of(organization_id) OR is_branch_admin_of(branch_id)
  );

-- 4. Update VISITOR_RESPONSES policies
DROP POLICY IF EXISTS "Admins can view visitor responses" ON visitor_responses;

CREATE POLICY "Admins can view visitor responses"
  ON visitor_responses FOR SELECT
  TO authenticated
  USING (
    is_org_admin_of(organization_id) OR is_branch_admin_of(branch_id)
  );

-- 5. Update WHATSAPP_CONFIGS policies
DROP POLICY IF EXISTS "Admins can manage WhatsApp configs" ON whatsapp_configs;

CREATE POLICY "Admins can manage WhatsApp configs"
  ON whatsapp_configs FOR ALL
  TO authenticated
  USING (
    is_org_admin_of(organization_id) OR is_branch_admin_of(branch_id)
  );

-- 6. Update KNOWLEDGE_BASE policies
DROP POLICY IF EXISTS "Admins can manage knowledge base" ON knowledge_base;

CREATE POLICY "Admins can manage knowledge base"
  ON knowledge_base FOR ALL
  TO authenticated
  USING (
    is_org_admin_of(organization_id) OR is_branch_admin_of(branch_id)
  );
