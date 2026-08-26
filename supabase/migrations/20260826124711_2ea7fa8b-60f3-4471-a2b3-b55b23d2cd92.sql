create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  properties jsonb not null default '{}',
  session_id text not null default 'anonymous',
  path text not null default '/',
  created_at timestamptz not null default now()
);

GRANT INSERT ON public.analytics_events TO anon;
GRANT INSERT, SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

create policy "Anyone can log analytics events"
on public.analytics_events
for insert
to anon, authenticated
with check (true);

create index analytics_events_event_created_idx on public.analytics_events (event, created_at desc);