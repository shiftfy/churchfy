-- Create journeys table
CREATE TABLE IF NOT EXISTS journeys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add journey_id to visitor_stages
ALTER TABLE visitor_stages 
ADD COLUMN IF NOT EXISTS journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE;

-- Add journey_id to people
ALTER TABLE people 
ADD COLUMN IF NOT EXISTS journey_id UUID REFERENCES journeys(id) ON DELETE SET NULL;

-- Add journey_id to forms
ALTER TABLE forms 
ADD COLUMN IF NOT EXISTS journey_id UUID REFERENCES journeys(id) ON DELETE SET NULL;

-- Enable RLS on journeys
ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;

-- Create policies for journeys
CREATE POLICY "Users can view their organization's journeys"
    ON journeys FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM users WHERE users.id = auth.uid()
    ));

CREATE POLICY "Admins can insert journeys"
    ON journeys FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM users WHERE users.id = auth.uid()
    ));

CREATE POLICY "Admins can update their organization's journeys"
    ON journeys FOR UPDATE
    USING (organization_id IN (
        SELECT organization_id FROM users WHERE users.id = auth.uid()
    ));

CREATE POLICY "Admins can delete their organization's journeys"
    ON journeys FOR DELETE
    USING (organization_id IN (
        SELECT organization_id FROM users WHERE users.id = auth.uid()
    ));

-- Migration: Create default journey for existing organizations
DO $$
DECLARE
    org_record RECORD;
    default_journey_id UUID;
BEGIN
    FOR org_record IN SELECT id FROM organizations LOOP
        -- Check if org already has a journey
        IF NOT EXISTS (SELECT 1 FROM journeys WHERE organization_id = org_record.id) THEN
            -- Create default journey
            INSERT INTO journeys (organization_id, title, description, is_default)
            VALUES (org_record.id, 'Jornada Padrão', 'Fluxo principal de visitantes', true)
            RETURNING id INTO default_journey_id;

            -- Link existing stages to this journey
            UPDATE visitor_stages
            SET journey_id = default_journey_id
            WHERE organization_id = org_record.id AND journey_id IS NULL;

            -- Link existing people to this journey
            UPDATE people
            SET journey_id = default_journey_id
            WHERE organization_id = org_record.id AND journey_id IS NULL;
        END IF;
    END LOOP;
END $$;
