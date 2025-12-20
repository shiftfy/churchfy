-- Add DELETE policy for people table
CREATE POLICY "Admins can delete people"
  ON public.people FOR DELETE
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

-- Ensure is_archived column exists (redundant if 014 ran, but safe)
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
