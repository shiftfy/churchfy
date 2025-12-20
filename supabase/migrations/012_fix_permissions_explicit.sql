-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.is_org_admin_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_branch_admin_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Ensure visitor_responses policies are correct
DROP POLICY IF EXISTS "Admins can update visitor responses" ON public.visitor_responses;
DROP POLICY IF EXISTS "Admins can delete visitor responses" ON public.visitor_responses;

CREATE POLICY "Admins can update visitor responses"
  ON public.visitor_responses FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'org_admin'
    )
    OR
    branch_id IN (
      SELECT branch_id FROM users WHERE id = auth.uid() AND role = 'branch_admin'
    )
  );

CREATE POLICY "Admins can delete visitor responses"
  ON public.visitor_responses FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'org_admin'
    )
    OR
    branch_id IN (
      SELECT branch_id FROM users WHERE id = auth.uid() AND role = 'branch_admin'
    )
  );
