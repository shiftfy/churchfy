-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's data
CREATE OR REPLACE FUNCTION get_current_user_data()
RETURNS TABLE (
  user_id UUID,
  user_role TEXT,
  org_id UUID,
  branch_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT id, role, organization_id, branch_id
  FROM users
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ORGANIZATIONS POLICIES
-- =====================================================

-- Super admins can view all organizations
CREATE POLICY "Super admins can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Org admins can view their own organization
CREATE POLICY "Org admins can view their organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = organizations.id
      AND users.role IN ('org_admin', 'branch_admin')
    )
  );

-- Anyone can insert organizations (for signup)
CREATE POLICY "Anyone can insert organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Org admins can update their own organization
CREATE POLICY "Org admins can update their organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = organizations.id
      AND users.role = 'org_admin'
    )
  );

-- =====================================================
-- BRANCHES POLICIES
-- =====================================================

-- Org admins can manage all branches in their organization
CREATE POLICY "Org admins can manage branches"
  ON branches FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = branches.organization_id
      AND users.role IN ('super_admin', 'org_admin')
    )
  );

-- Branch admins can view their own branch
CREATE POLICY "Branch admins can view their branch"
  ON branches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.branch_id = branches.id
      AND users.role = 'branch_admin'
    )
  );

-- =====================================================
-- USERS POLICIES
-- =====================================================

-- Users can view their own data
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Super admins can view all users
CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- Org admins can view users in their organization
CREATE POLICY "Org admins can view organization users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid()
      AND u.organization_id = users.organization_id
      AND u.role = 'org_admin'
    )
  );

-- Anyone can insert users (for signup)
CREATE POLICY "Anyone can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can update their own data
CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- =====================================================
-- FORMS POLICIES
-- =====================================================

-- Public forms are viewable by anyone (for visitor form submission)
CREATE POLICY "Public forms are viewable by anyone"
  ON forms FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Org/branch admins can manage forms
CREATE POLICY "Admins can manage forms"
  ON forms FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (
        (users.organization_id = forms.organization_id AND users.role = 'org_admin')
        OR (users.branch_id = forms.branch_id AND users.role = 'branch_admin')
      )
    )
  );

-- =====================================================
-- VISITOR_RESPONSES POLICIES
-- =====================================================

-- Anyone can submit visitor responses
CREATE POLICY "Anyone can submit visitor responses"
  ON visitor_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Org/branch admins can view responses
CREATE POLICY "Admins can view visitor responses"
  ON visitor_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (
        (users.organization_id = visitor_responses.organization_id AND users.role = 'org_admin')
        OR (users.branch_id = visitor_responses.branch_id AND users.role = 'branch_admin')
      )
    )
  );

-- =====================================================
-- WHATSAPP_CONFIGS POLICIES
-- =====================================================

-- Org/branch admins can manage WhatsApp configs
CREATE POLICY "Admins can manage WhatsApp configs"
  ON whatsapp_configs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (
        (users.organization_id = whatsapp_configs.organization_id AND users.role = 'org_admin')
        OR (users.branch_id = whatsapp_configs.branch_id AND users.role = 'branch_admin')
      )
    )
  );

-- =====================================================
-- WHATSAPP_CONVERSATIONS & MESSAGES POLICIES
-- =====================================================

-- Admins can view conversations and messages
CREATE POLICY "Admins can view conversations"
  ON whatsapp_conversations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN whatsapp_configs ON (
        users.organization_id = whatsapp_configs.organization_id 
        OR users.branch_id = whatsapp_configs.branch_id
      )
      WHERE users.id = auth.uid()
      AND whatsapp_configs.id = whatsapp_conversations.config_id
    )
  );

CREATE POLICY "Admins can view messages"
  ON whatsapp_messages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN whatsapp_configs ON (
        users.organization_id = whatsapp_configs.organization_id 
        OR users.branch_id = whatsapp_configs.branch_id
      )
      JOIN whatsapp_conversations ON whatsapp_conversations.config_id = whatsapp_configs.id
      WHERE users.id = auth.uid()
      AND whatsapp_conversations.id = whatsapp_messages.conversation_id
    )
  );

-- =====================================================
-- KNOWLEDGE_BASE POLICIES
-- =====================================================

-- Org/branch admins can manage knowledge base
CREATE POLICY "Admins can manage knowledge base"
  ON knowledge_base FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (
        (users.organization_id = knowledge_base.organization_id AND users.role = 'org_admin')
        OR (users.branch_id = knowledge_base.branch_id AND users.role = 'branch_admin')
      )
    )
  );
