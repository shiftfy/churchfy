-- Migration: Add settings column to forms table
-- This column will store JSONB data for form customization (e.g., colors, styles)

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'forms' AND column_name = 'settings') THEN
        ALTER TABLE public.forms ADD COLUMN settings JSONB DEFAULT '{"background_color": "#ffffff", "button_color": "#000000", "text_color": "#000000"}'::jsonb;
    END IF;
END $$;

COMMENT ON COLUMN public.forms.settings IS 'Stores form customization settings like colors and styles in JSONB format.';
