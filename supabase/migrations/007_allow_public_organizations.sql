-- Allow public read access to organizations so public forms can validate organization slugs
-- This is necessary for the route /:orgSlug/:branchSlug to work, as it joins with the organizations table
CREATE POLICY "Anyone can view organizations"
ON organizations FOR SELECT
TO anon, authenticated
USING (true);
