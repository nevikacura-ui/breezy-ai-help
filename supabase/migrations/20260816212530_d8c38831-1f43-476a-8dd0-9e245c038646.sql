CREATE TABLE public.automation_specs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  spec JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  cubix_workflow_id TEXT,
  cubix_review_url TEXT,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_specs TO authenticated;
GRANT ALL ON public.automation_specs TO service_role;
ALTER TABLE public.automation_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own automation specs" ON public.automation_specs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.action_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  tool TEXT NOT NULL,
  input JSONB,
  output JSONB,
  status TEXT NOT NULL DEFAULT 'ok',
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.action_audit TO authenticated;
GRANT ALL ON public.action_audit TO service_role;
ALTER TABLE public.action_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own action history" ON public.action_audit FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_automation_specs_user ON public.automation_specs (user_id, created_at DESC);
CREATE INDEX idx_action_audit_user ON public.action_audit (user_id, created_at DESC);