-- Public onboarding, per-event trial, Bit deposit flow, referrals (apply in Supabase SQL editor)

create table if not exists public.onboarding_leads (
  id uuid primary key default gen_random_uuid(),
  organizer_name text not null,
  partner_name text,
  phone text not null,
  email text not null,
  event_type text not null,
  event_date date,
  estimated_guests int not null check (estimated_guests between 1 and 2000),
  channels jsonb not null default '{"whatsapp":true,"email":false,"phone":false}'::jsonb,
  notes text,
  status text not null default 'submitted',
  referral_code text not null unique,
  referred_by_code text,
  quoted_deposit_ils numeric(10,2),
  quoted_total_ils numeric(10,2),
  quoted_due_now_ils numeric(10,2),
  quoted_minimum_commitment_ils numeric(10,2),
  quoted_estimated_responses int,
  billing_model text not null default 'per_response',
  operator_notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists onboarding_leads_email_idx on public.onboarding_leads (email);
create index if not exists onboarding_leads_status_idx on public.onboarding_leads (status);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.onboarding_leads (id) on delete cascade,
  slug text not null unique,
  event_type text not null,
  organizer_access_token text not null unique,
  trial_invites_sent int not null default 0,
  trial_invites_cap int not null default 5,
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'deposit_paid', 'paid_full')),
  channels jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_lead_id_idx on public.events (lead_id);
create index if not exists events_organizer_token_idx on public.events (organizer_access_token);

create table if not exists public.referral_credits (
  id uuid primary key default gen_random_uuid(),
  beneficiary_lead_id uuid not null references public.onboarding_leads (id) on delete cascade,
  friend_lead_id uuid not null references public.onboarding_leads (id) on delete cascade,
  amount_ils numeric(10,2) not null,
  reason text not null default 'friend_deposit_paid',
  created_at timestamptz not null default now(),
  unique (beneficiary_lead_id, friend_lead_id)
);

alter table public.invitees
  add column if not exists event_id uuid references public.events (id) on delete cascade;

create index if not exists invitees_event_id_idx on public.invitees (event_id);

create table if not exists public.customer_feedback (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(trim(message)) >= 3),
  page_url text,
  organizer_email text,
  event_id uuid references public.events (id) on delete set null,
  lead_id uuid references public.onboarding_leads (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists customer_feedback_created_idx on public.customer_feedback (created_at desc);

alter table public.onboarding_leads enable row level security;
alter table public.events enable row level security;
alter table public.referral_credits enable row level security;
alter table public.customer_feedback enable row level security;

drop policy if exists "anon_insert_onboarding_leads" on public.onboarding_leads;
create policy "anon_insert_onboarding_leads" on public.onboarding_leads
  for insert to anon with check (true);

drop policy if exists "service_all_onboarding" on public.onboarding_leads;
create policy "service_all_onboarding" on public.onboarding_leads
  for all to service_role using (true) with check (true);

drop policy if exists "service_all_events" on public.events;
create policy "service_all_events" on public.events
  for all to service_role using (true) with check (true);

drop policy if exists "service_all_referral_credits" on public.referral_credits;
create policy "service_all_referral_credits" on public.referral_credits
  for all to service_role using (true) with check (true);

drop policy if exists "anon_insert_feedback" on public.customer_feedback;
create policy "anon_insert_feedback" on public.customer_feedback
  for insert to anon with check (true);

drop policy if exists "service_all_feedback" on public.customer_feedback;
create policy "service_all_feedback" on public.customer_feedback
  for all to service_role using (true) with check (true);
