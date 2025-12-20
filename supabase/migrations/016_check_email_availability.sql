-- Function to check if an email is already registered in the users table
-- This is useful for proactive checks during signup
CREATE OR REPLACE FUNCTION public.check_email_availability(p_email TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to bypass RLS
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.users WHERE email = p_email
  );
END;
$$;

-- Allow anyone to call this function (even unauthenticated users)
GRANT EXECUTE ON FUNCTION public.check_email_availability(TEXT) TO anon, authenticated;
