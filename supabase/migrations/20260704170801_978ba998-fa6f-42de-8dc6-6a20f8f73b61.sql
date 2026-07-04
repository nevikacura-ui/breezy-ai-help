
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- keep bump_usage callable by authenticated (needed by the app), revoke from anon
REVOKE ALL ON FUNCTION public.bump_usage(TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bump_usage(TEXT, INT) TO authenticated;
