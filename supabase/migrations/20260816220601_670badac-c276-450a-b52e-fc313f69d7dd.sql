CREATE TABLE public.user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE TABLE public.tool_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE TABLE public.user_context (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE INDEX idx_action_audit_user_created ON public.action_audit (user_id, created_at DESC);