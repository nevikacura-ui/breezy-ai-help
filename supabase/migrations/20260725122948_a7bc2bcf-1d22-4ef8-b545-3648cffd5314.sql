
REVOKE ALL ON public.openrouter_spend FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.webhook_events FROM anon, authenticated, PUBLIC;
CREATE POLICY "deny all client access" ON public.openrouter_spend AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny all client access" ON public.webhook_events AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
