create table if not exists public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists otp_codes_phone_idx on public.otp_codes (phone, consumed_at, created_at desc);

create table if not exists public.otp_audit (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  action text not null,
  status text not null,
  error text, ip text, user_agent text, context text,
  created_at timestamptz not null default now()
);
create index if not exists otp_audit_phone_idx on public.otp_audit (phone, action, created_at desc);

grant all on public.otp_codes to service_role;
grant all on public.otp_audit to service_role;
alter table public.otp_codes enable row level security;
alter table public.otp_audit enable row level security;