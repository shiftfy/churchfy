-- Create visitor_stages table
CREATE TABLE IF NOT EXISTS public.visitor_stages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.visitor_stages ENABLE ROW LEVEL SECURITY;

-- Add stage_id to visitor_responses
ALTER TABLE public.visitor_responses ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.visitor_stages(id) ON DELETE SET NULL;

-- RLS Policies for visitor_stages
CREATE POLICY "Admins can manage visitor stages"
  ON public.visitor_stages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = visitor_stages.organization_id
      AND users.role IN ('org_admin', 'branch_admin')
    )
  );

-- Function to create default stages
CREATE OR REPLACE FUNCTION public.create_default_visitor_stages(org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if stages already exist to avoid duplicates
    IF NOT EXISTS (SELECT 1 FROM public.visitor_stages WHERE organization_id = org_id) THEN
        INSERT INTO public.visitor_stages (organization_id, title, position)
        VALUES
            (org_id, '1ª visita', 0),
            (org_id, 'Conversão', 1),
            (org_id, 'Discipulado', 2),
            (org_id, 'Membro', 3);
    END IF;
END;
$$;

-- Run for existing organizations
DO $$
DECLARE
    org RECORD;
BEGIN
    FOR org IN SELECT id FROM organizations LOOP
        PERFORM create_default_visitor_stages(org.id);
    END LOOP;
END $$;
