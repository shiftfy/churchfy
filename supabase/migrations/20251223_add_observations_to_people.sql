-- Add observations column to people table
ALTER TABLE people ADD COLUMN IF NOT EXISTS observations TEXT;
