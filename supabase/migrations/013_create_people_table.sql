-- Create people table
CREATE TABLE IF NOT EXISTS public.people (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    birthdate DATE,
    stage_id UUID REFERENCES public.visitor_stages(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, phone)
);

-- Add person_id to visitor_responses
ALTER TABLE public.visitor_responses 
ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES public.people(id);

-- Enable RLS on people
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

-- RLS Policies for people
CREATE POLICY "Admins can view people"
  ON public.people FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'org_admin'
    )
    OR
    organization_id IN (
      SELECT organization_id FROM branches WHERE id IN (
        SELECT branch_id FROM users WHERE id = auth.uid() AND role = 'branch_admin'
      )
    )
  );

CREATE POLICY "Admins can update people"
  ON public.people FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'org_admin'
    )
    OR
    organization_id IN (
      SELECT organization_id FROM branches WHERE id IN (
        SELECT branch_id FROM users WHERE id = auth.uid() AND role = 'branch_admin'
      )
    )
  );

CREATE POLICY "Admins can insert people"
  ON public.people FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'org_admin'
    )
    OR
    organization_id IN (
      SELECT organization_id FROM branches WHERE id IN (
        SELECT branch_id FROM users WHERE id = auth.uid() AND role = 'branch_admin'
      )
    )
  );
  
-- Allow system (triggers) to bypass RLS if needed, but triggers run as owner usually.
-- However, for the public form submission (anon), we need to allow INSERT via trigger.
-- The trigger runs with the privileges of the function owner (if SECURITY DEFINER).

-- Function to handle new visitor response and upsert person
CREATE OR REPLACE FUNCTION public.handle_new_visitor_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_phone TEXT;
    v_name TEXT;
    v_email TEXT;
    v_birthdate DATE;
    v_person_id UUID;
    v_default_stage_id UUID;
BEGIN
    -- Extract fields from JSONB
    -- Assuming keys: field_phone, field_name, field_email, field_birthdate
    v_phone := NEW.responses->>'field_phone';
    v_name := NEW.responses->>'field_name';
    v_email := NEW.responses->>'field_email';
    
    BEGIN
        v_birthdate := (NEW.responses->>'field_birthdate')::DATE;
    EXCEPTION WHEN OTHERS THEN
        v_birthdate := NULL;
    END;

    -- If no phone, we can't link effectively in this model, but let's try to insert anyway or skip?
    -- Requirement: "apenas o número como contato fixo". Phone is key.
    -- If no phone, we create a person without phone? Or require phone?
    -- Let's assume phone is required for this logic, or we generate a placeholder?
    -- For now, if phone is present:
    
    IF v_phone IS NOT NULL AND v_phone != '' THEN
        -- Upsert Person
        INSERT INTO public.people (organization_id, name, phone, email, birthdate, created_at, updated_at)
        VALUES (NEW.organization_id, COALESCE(v_name, 'Visitante sem nome'), v_phone, v_email, v_birthdate, NOW(), NOW())
        ON CONFLICT (organization_id, phone) 
        DO UPDATE SET
            name = EXCLUDED.name, -- Update name to latest? Or keep original? Let's update.
            email = COALESCE(EXCLUDED.email, public.people.email),
            birthdate = COALESCE(EXCLUDED.birthdate, public.people.birthdate),
            updated_at = NOW()
        RETURNING id INTO v_person_id;
    ELSE
        -- Create a person without phone (not unique constraint violation)
        -- But we can't easily deduplicate later.
        INSERT INTO public.people (organization_id, name, email, birthdate, created_at, updated_at)
        VALUES (NEW.organization_id, COALESCE(v_name, 'Visitante sem nome'), v_email, v_birthdate, NOW(), NOW())
        RETURNING id INTO v_person_id;
    END IF;

    -- Assign person_id to the response
    NEW.person_id := v_person_id;
    
    -- Assign stage to person if not set
    -- Get default stage (position 0)
    SELECT id INTO v_default_stage_id FROM public.visitor_stages 
    WHERE organization_id = NEW.organization_id ORDER BY position ASC LIMIT 1;
    
    IF v_default_stage_id IS NOT NULL THEN
        UPDATE public.people SET stage_id = v_default_stage_id 
        WHERE id = v_person_id AND stage_id IS NULL;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger
DROP TRIGGER IF EXISTS trigger_handle_new_visitor_response ON public.visitor_responses;
CREATE TRIGGER trigger_handle_new_visitor_response
BEFORE INSERT ON public.visitor_responses
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_visitor_response();

-- Data Migration: Populate people from existing responses
DO $$
DECLARE
    r RECORD;
    v_phone TEXT;
    v_name TEXT;
    v_email TEXT;
    v_birthdate DATE;
    v_person_id UUID;
    v_stage_id UUID;
BEGIN
    FOR r IN SELECT * FROM public.visitor_responses WHERE person_id IS NULL LOOP
        v_phone := r.responses->>'field_phone';
        v_name := r.responses->>'field_name';
        v_email := r.responses->>'field_email';
        v_stage_id := r.stage_id; -- Get the stage from the response
        
        BEGIN
            v_birthdate := (r.responses->>'field_birthdate')::DATE;
        EXCEPTION WHEN OTHERS THEN
            v_birthdate := NULL;
        END;

        IF v_phone IS NOT NULL AND v_phone != '' THEN
            INSERT INTO public.people (organization_id, name, phone, email, birthdate, stage_id, created_at, updated_at)
            VALUES (r.organization_id, COALESCE(v_name, 'Visitante sem nome'), v_phone, v_email, v_birthdate, v_stage_id, r.created_at, NOW())
            ON CONFLICT (organization_id, phone) 
            DO UPDATE SET
                stage_id = COALESCE(public.people.stage_id, EXCLUDED.stage_id) -- Keep existing stage if set
            RETURNING id INTO v_person_id;
        ELSE
            INSERT INTO public.people (organization_id, name, email, birthdate, stage_id, created_at, updated_at)
            VALUES (r.organization_id, COALESCE(v_name, 'Visitante sem nome'), v_email, v_birthdate, v_stage_id, r.created_at, NOW())
            RETURNING id INTO v_person_id;
        END IF;

        -- Update response
        UPDATE public.visitor_responses SET person_id = v_person_id WHERE id = r.id;
    END LOOP;
END;
$$;
