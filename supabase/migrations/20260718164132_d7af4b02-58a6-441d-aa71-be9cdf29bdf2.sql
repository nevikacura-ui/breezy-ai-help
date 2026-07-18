
-- 1. profiles.trial_started_at
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

-- 2. webhook idempotency
ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS event_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_source_event_id_unique
  ON public.webhook_events (source, event_id)
  WHERE event_id IS NOT NULL;

-- 3. Atomic quota check + bump. Returns TRUE if within quota (and increments),
-- FALSE if over. Pro users bypass. Runs SECURITY DEFINER; caller is auth.uid().
CREATE OR REPLACE FUNCTION public.check_and_bump_usage(
  _kind TEXT,
  _n INTEGER DEFAULT 1,
  _limit INTEGER DEFAULT 5
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  today DATE := (now() AT TIME ZONE 'utc')::date;
  cur INTEGER;
  is_pro_now BOOLEAN;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT (is_pro AND (pro_until IS NULL OR pro_until > now()))
    INTO is_pro_now FROM public.profiles WHERE user_id = uid;
  IF COALESCE(is_pro_now, FALSE) THEN
    -- Pro: still record usage for analytics but don't gate.
    INSERT INTO public.usage_daily(user_id, day) VALUES (uid, today)
      ON CONFLICT (user_id, day) DO NOTHING;
    IF _kind = 'text' THEN
      UPDATE public.usage_daily SET text_count = text_count + _n WHERE user_id = uid AND day = today;
    ELSIF _kind = 'media' THEN
      UPDATE public.usage_daily SET media_count = media_count + _n WHERE user_id = uid AND day = today;
    ELSIF _kind = 'voice' THEN
      UPDATE public.usage_daily SET voice_count = voice_count + _n WHERE user_id = uid AND day = today;
    END IF;
    RETURN TRUE;
  END IF;

  INSERT INTO public.usage_daily(user_id, day) VALUES (uid, today)
    ON CONFLICT (user_id, day) DO NOTHING;

  IF _kind = 'text' THEN
    SELECT text_count INTO cur FROM public.usage_daily WHERE user_id = uid AND day = today FOR UPDATE;
    IF cur + _n > _limit THEN RETURN FALSE; END IF;
    UPDATE public.usage_daily SET text_count = text_count + _n WHERE user_id = uid AND day = today;
  ELSIF _kind = 'media' THEN
    SELECT media_count INTO cur FROM public.usage_daily WHERE user_id = uid AND day = today FOR UPDATE;
    IF cur + _n > _limit THEN RETURN FALSE; END IF;
    UPDATE public.usage_daily SET media_count = media_count + _n WHERE user_id = uid AND day = today;
  ELSIF _kind = 'voice' THEN
    SELECT voice_count INTO cur FROM public.usage_daily WHERE user_id = uid AND day = today FOR UPDATE;
    IF cur + _n > _limit THEN RETURN FALSE; END IF;
    UPDATE public.usage_daily SET voice_count = voice_count + _n WHERE user_id = uid AND day = today;
  ELSE
    RAISE EXCEPTION 'bad kind %', _kind;
  END IF;
  RETURN TRUE;
END; $$;

GRANT EXECUTE ON FUNCTION public.check_and_bump_usage(TEXT, INTEGER, INTEGER) TO authenticated;

-- 4. Language trial: idempotent starter.
CREATE OR REPLACE FUNCTION public.start_language_trial()
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  ts TIMESTAMPTZ;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT trial_started_at INTO ts FROM public.profiles WHERE user_id = uid;
  IF ts IS NULL THEN
    UPDATE public.profiles SET trial_started_at = now(), updated_at = now()
      WHERE user_id = uid RETURNING trial_started_at INTO ts;
  END IF;
  RETURN ts;
END; $$;

GRANT EXECUTE ON FUNCTION public.start_language_trial() TO authenticated;
