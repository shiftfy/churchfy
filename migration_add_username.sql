-- Migration: Add username field to organizations table
-- This username will be used in public URLs (e.g., churchfy.com/username/form-slug)
-- Once set, it cannot be changed to protect existing QR codes and links

-- Add username column to organizations table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' AND column_name = 'username') THEN
        ALTER TABLE public.organizations ADD COLUMN username TEXT;
    END IF;
END $$;

-- Add unique constraint (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_username_key') THEN
        ALTER TABLE public.organizations ADD CONSTRAINT organizations_username_key UNIQUE (username);
    END IF;
END $$;

-- Add format constraint (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'username_format') THEN
        ALTER TABLE public.organizations ADD CONSTRAINT username_format CHECK (username ~ '^[a-z0-9-]+$');
    END IF;
END $$;

-- Add comment explaining the field
COMMENT ON COLUMN public.organizations.username IS 'URL-safe username for the organization. Once set, cannot be changed to protect existing links and QR codes.';

-- For existing organizations without username, generate one from the name
-- This is a one-time migration helper with duplicate handling
DO $$
DECLARE
    org RECORD;
    base_username TEXT;
    final_username TEXT;
    counter INTEGER;
BEGIN
    FOR org IN SELECT id, name FROM public.organizations WHERE username IS NULL
    LOOP
        -- Generate base username
        base_username := LOWER(
            REGEXP_REPLACE(
                REGEXP_REPLACE(
                    TRANSLATE(
                        org.name,
                        'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
                        'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
                    ),
                    '[^a-zA-Z0-9\s-]',
                    '',
                    'g'
                ),
                '\s+',
                '-',
                'g'
            )
        );
        
        -- Check if username exists, if so add a number
        final_username := base_username;
        counter := 1;
        
        WHILE EXISTS (SELECT 1 FROM public.organizations WHERE username = final_username) LOOP
            final_username := base_username || '-' || counter;
            counter := counter + 1;
        END LOOP;
        
        -- Update the organization with the unique username
        UPDATE public.organizations SET username = final_username WHERE id = org.id;
    END LOOP;
END $$;

-- Make username NOT NULL after populating existing records (if not already)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'organizations' 
               AND column_name = 'username' 
               AND is_nullable = 'YES') THEN
        ALTER TABLE public.organizations ALTER COLUMN username SET NOT NULL;
    END IF;
END $$;
