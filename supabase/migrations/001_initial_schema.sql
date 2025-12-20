-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ORGANIZATIONS TABLE
-- =====================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  logo_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster slug lookups
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- =====================================================
-- BRANCHES TABLE
-- =====================================================
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_branches_organization ON branches(organization_id);
CREATE INDEX idx_branches_slug ON branches(slug);

-- =====================================================
-- USERS TABLE (extends auth.users)
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'org_admin', 'branch_admin')),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_users_email ON users(email);

-- =====================================================
-- FORMS TABLE
-- =====================================================
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_forms_organization ON forms(organization_id);
CREATE INDEX idx_forms_branch ON forms(branch_id);
CREATE INDEX idx_forms_slug ON forms(slug);

-- =====================================================
-- VISITOR_RESPONSES TABLE
-- =====================================================
CREATE TABLE visitor_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  responses JSONB NOT NULL DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_visitor_responses_form ON visitor_responses(form_id);
CREATE INDEX idx_visitor_responses_organization ON visitor_responses(organization_id);
CREATE INDEX idx_visitor_responses_created ON visitor_responses(created_at DESC);

-- =====================================================
-- WHATSAPP_CONFIGS TABLE
-- =====================================================
CREATE TABLE whatsapp_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  phone_number TEXT,
  webhook_url TEXT,
  openai_api_key TEXT, -- Will be encrypted at application level
  use_churchfy_api BOOLEAN DEFAULT false,
  ai_model TEXT,
  ai_temperature NUMERIC,
  is_connected BOOLEAN DEFAULT false,
  last_connection TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_whatsapp_configs_organization ON whatsapp_configs(organization_id);
CREATE INDEX idx_whatsapp_configs_branch ON whatsapp_configs(branch_id);

-- =====================================================
-- WHATSAPP_CONVERSATIONS TABLE
-- =====================================================
CREATE TABLE whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_id UUID REFERENCES whatsapp_configs(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'pending')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_whatsapp_conversations_config ON whatsapp_conversations(config_id);
CREATE INDEX idx_whatsapp_conversations_phone ON whatsapp_conversations(phone_number);
CREATE INDEX idx_whatsapp_conversations_status ON whatsapp_conversations(status);

-- =====================================================
-- WHATSAPP_MESSAGES TABLE
-- =====================================================
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document')),
  is_from_ai BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_whatsapp_messages_conversation ON whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_sent_at ON whatsapp_messages(sent_at DESC);

-- =====================================================
-- KNOWLEDGE_BASE TABLE
-- =====================================================
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  category TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_knowledge_base_organization ON knowledge_base(organization_id);
CREATE INDEX idx_knowledge_base_branch ON knowledge_base(branch_id);
CREATE INDEX idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX idx_knowledge_base_tags ON knowledge_base USING GIN(tags);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON forms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_configs_updated_at BEFORE UPDATE ON whatsapp_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_conversations_updated_at BEFORE UPDATE ON whatsapp_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
