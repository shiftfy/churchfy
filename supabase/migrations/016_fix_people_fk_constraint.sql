-- Drop the existing foreign key constraint
ALTER TABLE public.visitor_responses
DROP CONSTRAINT IF EXISTS visitor_responses_person_id_fkey;

-- Re-add the constraint with ON DELETE SET NULL (or CASCADE if preferred, but SET NULL preserves history)
ALTER TABLE public.visitor_responses
ADD CONSTRAINT visitor_responses_person_id_fkey
FOREIGN KEY (person_id)
REFERENCES public.people(id)
ON DELETE SET NULL;
