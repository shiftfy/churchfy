-- Add UPDATE policy for visitor_responses
CREATE POLICY "Admins can update visitor responses"
  ON public.visitor_responses FOR UPDATE
  TO authenticated
  USING (is_org_admin_of(organization_id) OR is_branch_admin_of(branch_id))
  WITH CHECK (is_org_admin_of(organization_id) OR is_branch_admin_of(branch_id));

-- Add DELETE policy for visitor_responses
CREATE POLICY "Admins can delete visitor responses"
  ON public.visitor_responses FOR DELETE
  TO authenticated
  USING (is_org_admin_of(organization_id) OR is_branch_admin_of(branch_id));
