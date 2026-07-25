
REVOKE EXECUTE ON FUNCTION public.start_language_trial() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_and_bump_usage(text, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bump_usage(text, integer) FROM authenticated, anon, PUBLIC;
