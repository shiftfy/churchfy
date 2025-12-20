-- Create a secure function to get the current user's profile
-- This bypasses RLS on the users table to prevent potential hangs/recursion during login
CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS SETOF users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM users
  WHERE id = auth.uid();
END;
$$;
