
CREATE TABLE public.openrouter_spend (
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
ALTER TABLE public.openrouter_spend ENABLE ROW LEVEL SECURITY;

-- No policies: only service_role (which bypasses RLS) may touch this table.

CREATE OR REPLACE FUNCTION public.bump_openrouter_spend(
  _model text,
  _cost numeric,
  _prompt_tokens integer,
  _completion_tokens integer
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  SELECT COALESCE(SUM(cost_usd), 0) INTO total
    FROM public.openrouter_spend WHERE month = m;
  RETURN total;
END; $$;

CREATE OR REPLACE FUNCTION public.get_openrouter_spend_month()
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(cost_usd), 0)
    FROM public.openrouter_spend
    WHERE month = to_char(now() AT TIME ZONE 'utc', 'YYYY-MM');
$$;

REVOKE ALL ON FUNCTION public.bump_openrouter_spend(text, numeric, integer, integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_openrouter_spend_month() FROM public, anon, authenticated;
