BEGIN;

-- Add only the nullable profile field used by the existing language trial.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;

CREATE TABLE IF NOT EXISTS public.bot_memory (
  user_id uuid NOT NULL,
  bot_id text NOT NULL,
  facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bot_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_memory TO authenticated;
GRANT ALL ON public.bot_memory TO service_role;
ALTER TABLE public.bot_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own agent memory" ON public.bot_memory
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  bot_id text,
  title text NOT NULL,
  notes text,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'open',
  delivery_attempts integer NOT NULL DEFAULT 0,
  last_error text,
  last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reminders_user_due_idx ON public.reminders (user_id, due_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own reminders" ON public.reminders
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.automation_specs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  summary text,
  spec jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  cubix_workflow_id text,
  cubix_review_url text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_specs_user ON public.automation_specs (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_specs TO authenticated;
GRANT ALL ON public.automation_specs TO service_role;
ALTER TABLE public.automation_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own automation specs" ON public.automation_specs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.action_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  tool text NOT NULL,
  input jsonb,
  output jsonb,
  status text NOT NULL DEFAULT 'ok',
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_action_audit_user_created ON public.action_audit (user_id, created_at DESC);
GRANT SELECT ON public.action_audit TO authenticated;
GRANT ALL ON public.action_audit TO service_role;
ALTER TABLE public.action_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own action history" ON public.action_audit
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  account_email text,
  scopes text[] NOT NULL DEFAULT '{}',
  access_token_enc text,
  refresh_token_enc text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
GRANT SELECT, DELETE ON public.user_integrations TO authenticated;
GRANT ALL ON public.user_integrations TO service_role;
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own integrations readable" ON public.user_integrations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own integrations removable" ON public.user_integrations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.tool_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  permission text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  always_ask boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tool_permissions TO authenticated;
GRANT ALL ON public.tool_permissions TO service_role;
ALTER TABLE public.tool_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tool permissions" ON public.tool_permissions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_context (
  user_id uuid PRIMARY KEY,
  role text,
  business_context text,
  tone text,
  preferred_language text,
  approved_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_context TO authenticated;
GRANT ALL ON public.user_context TO service_role;
ALTER TABLE public.user_context ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user context" ON public.user_context
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.openrouter_spend (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month text NOT NULL,
  model text NOT NULL,
  cost_usd numeric NOT NULL DEFAULT 0,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month, model)
);
GRANT ALL ON public.openrouter_spend TO service_role;
REVOKE ALL ON public.openrouter_spend FROM anon, authenticated, PUBLIC;
ALTER TABLE public.openrouter_spend ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  session_id text NOT NULL DEFAULT 'anonymous',
  path text NOT NULL DEFAULT '/',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_events_event_created_idx ON public.analytics_events (event, created_at DESC);
GRANT INSERT ON public.analytics_events TO anon;
GRANT INSERT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log analytics events" ON public.analytics_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- The existing token table stays unchanged; add its missing owner-only policy.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT ALL ON public.push_tokens TO service_role;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_tokens' AND policyname = 'own push tokens'
  ) THEN
    CREATE POLICY "own push tokens" ON public.push_tokens
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.check_and_bump_usage(
  _kind text,
  _n integer DEFAULT 1,
  _limit integer DEFAULT 5
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'utc')::date;
  cur integer;
  is_pro_now boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _n < 1 OR _limit < 0 THEN RAISE EXCEPTION 'invalid usage increment or limit'; END IF;

  SELECT (is_pro AND (pro_until IS NULL OR pro_until > now()))
    INTO is_pro_now FROM public.profiles WHERE id = uid;
  IF COALESCE(is_pro_now, false) THEN
    INSERT INTO public.usage_daily(user_id, day) VALUES (uid, today)
      ON CONFLICT (user_id, day) DO NOTHING;
    IF _kind = 'text' THEN
      UPDATE public.usage_daily SET text_count = text_count + _n WHERE user_id = uid AND day = today;
    ELSIF _kind = 'media' THEN
      UPDATE public.usage_daily SET media_count = media_count + _n WHERE user_id = uid AND day = today;
    ELSIF _kind = 'voice' THEN
      UPDATE public.usage_daily SET voice_count = voice_count + _n WHERE user_id = uid AND day = today;
    ELSE
      RAISE EXCEPTION 'bad kind %', _kind;
    END IF;
    RETURN true;
  END IF;

  INSERT INTO public.usage_daily(user_id, day) VALUES (uid, today)
    ON CONFLICT (user_id, day) DO NOTHING;
  IF _kind = 'text' THEN
    SELECT text_count INTO cur FROM public.usage_daily WHERE user_id = uid AND day = today FOR UPDATE;
    IF cur + _n > _limit THEN RETURN false; END IF;
    UPDATE public.usage_daily SET text_count = text_count + _n WHERE user_id = uid AND day = today;
  ELSIF _kind = 'media' THEN
    SELECT media_count INTO cur FROM public.usage_daily WHERE user_id = uid AND day = today FOR UPDATE;
    IF cur + _n > _limit THEN RETURN false; END IF;
    UPDATE public.usage_daily SET media_count = media_count + _n WHERE user_id = uid AND day = today;
  ELSIF _kind = 'voice' THEN
    SELECT voice_count INTO cur FROM public.usage_daily WHERE user_id = uid AND day = today FOR UPDATE;
    IF cur + _n > _limit THEN RETURN false; END IF;
    UPDATE public.usage_daily SET voice_count = voice_count + _n WHERE user_id = uid AND day = today;
  ELSE
    RAISE EXCEPTION 'bad kind %', _kind;
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.check_and_bump_usage(text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_and_bump_usage(text, integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_language_trial()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  ts timestamptz;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT trial_started_at INTO ts FROM public.profiles WHERE id = uid;
  IF ts IS NULL THEN
    UPDATE public.profiles SET trial_started_at = now(), updated_at = now()
      WHERE id = uid RETURNING trial_started_at INTO ts;
  END IF;
  RETURN ts;
END $$;
REVOKE ALL ON FUNCTION public.start_language_trial() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_language_trial() TO authenticated;

CREATE OR REPLACE FUNCTION public.bump_openrouter_spend(
  _model text,
  _cost numeric,
  _prompt_tokens integer,
  _completion_tokens integer
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  m text := to_char(now() AT TIME ZONE 'utc', 'YYYY-MM');
  total numeric;
BEGIN
  INSERT INTO public.openrouter_spend (month, model, cost_usd, prompt_tokens, completion_tokens)
    VALUES (m, _model, _cost, _prompt_tokens, _completion_tokens)
  ON CONFLICT (month, model) DO UPDATE
    SET cost_usd = public.openrouter_spend.cost_usd + EXCLUDED.cost_usd,
        prompt_tokens = public.openrouter_spend.prompt_tokens + EXCLUDED.prompt_tokens,
        completion_tokens = public.openrouter_spend.completion_tokens + EXCLUDED.completion_tokens,
        updated_at = now();
  SELECT COALESCE(SUM(cost_usd), 0) INTO total FROM public.openrouter_spend WHERE month = m;
  RETURN total;
END $$;
REVOKE ALL ON FUNCTION public.bump_openrouter_spend(text, numeric, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_openrouter_spend(text, numeric, integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.get_openrouter_spend_month()
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(SUM(cost_usd), 0) FROM public.openrouter_spend
  WHERE month = to_char(now() AT TIME ZONE 'utc', 'YYYY-MM');
$$;
REVOKE ALL ON FUNCTION public.get_openrouter_spend_month() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_openrouter_spend_month() TO service_role;

COMMIT;
