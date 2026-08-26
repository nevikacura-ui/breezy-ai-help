CREATE TABLE IF NOT EXISTS public.bot_memory (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  bot_id TEXT NOT NULL,
  facts JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bot_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_memory TO authenticated;
GRANT ALL ON public.bot_memory TO service_role;
ALTER TABLE public.bot_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own agent memory" ON public.bot_memory FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  bot_id TEXT,
  title TEXT NOT NULL,
  notes TEXT,
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reminders_user_due_idx ON public.reminders (user_id, due_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own reminders" ON public.reminders FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);