-- Add discipler fields to people table
-- This allows tracking who is a discipler and the discipler-disciple relationship

-- Add is_discipler column to mark people who are disciplers
ALTER TABLE public.people 
ADD COLUMN IF NOT EXISTS is_discipler BOOLEAN DEFAULT false;

-- Add discipler_id column to track who is discipling this person
ALTER TABLE public.people 
ADD COLUMN IF NOT EXISTS discipler_id UUID REFERENCES public.people(id) ON DELETE SET NULL;

-- Create index for faster queries on disciplers
CREATE INDEX IF NOT EXISTS idx_people_is_discipler ON public.people(is_discipler) WHERE is_discipler = true;

-- Create index for faster queries on disciple relationships
CREATE INDEX IF NOT EXISTS idx_people_discipler_id ON public.people(discipler_id) WHERE discipler_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.people.is_discipler IS 'Indicates if this person is a discipler';
COMMENT ON COLUMN public.people.discipler_id IS 'Reference to the discipler responsible for this person';
