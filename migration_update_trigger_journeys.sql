-- Update handle_new_visitor_response function to support Journeys

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
    v_journey_id UUID;
    v_default_stage_id UUID;
    v_current_journey_id UUID;
BEGIN
    -- Extract fields from JSONB
    v_phone := NEW.responses->>'field_phone';
    v_name := NEW.responses->>'field_name';
    v_email := NEW.responses->>'field_email';
    
    BEGIN
        v_birthdate := (NEW.responses->>'field_birthdate')::DATE;
    EXCEPTION WHEN OTHERS THEN
        v_birthdate := NULL;
    END;

    -- 1. Determine Journey ID
    -- First, check if the form is linked to a journey
    SELECT journey_id INTO v_journey_id
    FROM public.forms
    WHERE id = NEW.form_id;

    -- If form has no journey, try to find the default journey for the organization
    IF v_journey_id IS NULL THEN
        SELECT id INTO v_journey_id
        FROM public.journeys
        WHERE organization_id = NEW.organization_id AND is_default = true
        LIMIT 1;
    END IF;

    -- 2. Upsert Person
    IF v_phone IS NOT NULL AND v_phone != '' THEN
        -- Check if person exists to get current journey
        SELECT journey_id INTO v_current_journey_id FROM public.people 
        WHERE organization_id = NEW.organization_id AND phone = v_phone;

        INSERT INTO public.people (organization_id, name, phone, email, birthdate, journey_id, created_at, updated_at)
        VALUES (NEW.organization_id, COALESCE(v_name, 'Visitante sem nome'), v_phone, v_email, v_birthdate, v_journey_id, NOW(), NOW())
        ON CONFLICT (organization_id, phone) 
        DO UPDATE SET
            name = EXCLUDED.name,
            email = COALESCE(EXCLUDED.email, public.people.email),
            birthdate = COALESCE(EXCLUDED.birthdate, public.people.birthdate),
            -- Update journey only if it's explicitly set in the form (or default found) AND different from current
            journey_id = COALESCE(v_journey_id, public.people.journey_id),
            updated_at = NOW()
        RETURNING id, journey_id INTO v_person_id, v_current_journey_id;
    ELSE
        -- Create a person without phone
        INSERT INTO public.people (organization_id, name, email, birthdate, journey_id, created_at, updated_at)
        VALUES (NEW.organization_id, COALESCE(v_name, 'Visitante sem nome'), v_email, v_birthdate, v_journey_id, NOW(), NOW())
        RETURNING id, journey_id INTO v_person_id, v_current_journey_id;
    END IF;

    -- 3. Assign person_id to the response
    NEW.person_id := v_person_id;
    
    -- 4. Handle Stage Assignment
    -- If the person has a journey (newly assigned or existing), ensure they have a valid stage in that journey
    IF v_current_journey_id IS NOT NULL THEN
        -- Get the first stage of the current journey
        SELECT id INTO v_default_stage_id 
        FROM public.visitor_stages 
        WHERE organization_id = NEW.organization_id 
        AND journey_id = v_current_journey_id 
        ORDER BY position ASC LIMIT 1;

        -- Update stage if:
        -- a) Person has no stage
        -- b) Person's current stage does not belong to the current journey (e.g. they switched journeys)
        UPDATE public.people p
        SET stage_id = v_default_stage_id
        WHERE id = v_person_id
        AND (
            stage_id IS NULL 
            OR 
            NOT EXISTS (
                SELECT 1 FROM public.visitor_stages s 
                WHERE s.id = p.stage_id AND s.journey_id = v_current_journey_id
            )
        );
    END IF;

    RETURN NEW;
END;
$$;
