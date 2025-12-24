-- Add discipler_id column to people table
ALTER TABLE people ADD COLUMN IF NOT EXISTS discipler_id UUID REFERENCES people(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_people_discipler_id ON people(discipler_id);
