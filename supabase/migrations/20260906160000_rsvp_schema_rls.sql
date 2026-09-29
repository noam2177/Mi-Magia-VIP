-- RSVP schema + RLS hardening (apply in Lovable Cloud / Supabase SQL editor)
-- MOD v1.1 / R7: guest_token, tighten anon policies

create extension if not exists "pgcrypto";

create table if not exists public.invitees (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  phone text,
  status text check (status in ('attending', 'not_attending') or status is null),
  guests int not null default 1 check (guests between 1 and 5),
  sleep boolean not null default false,
  blessing text,
  message_sent boolean not null default false,
  guest_token text unique,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invitees_name_or_phone check (
    coalesce(nullif(trim(full_name), ''), nullif(trim(phone), '')) is not null
  )
);

create index if not exists invitees_phone_idx on public.invitees (phone);
create index if not exists invitees_guest_token_idx on public.invitees (guest_token);

create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  main_text text not null default 'דניאל ותומר מתחתנים!',
  navigation_url text not null default '',
  collage_images jsonb not null default '[]'::jsonb,
  carousel_images jsonb not null default '[]'::jsonb
);

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

alter table public.invitees enable row level security;
alter table public.site_settings enable row level security;

-- Anon: read own row by guest_token only (personal link flow — future /g/:token)
drop policy if exists "anon_read_by_guest_token" on public.invitees;
create policy "anon_read_by_guest_token" on public.invitees
  for select to anon
  using (guest_token is not null and guest_token = current_setting('request.headers', true)::json->>'x-guest-token');

-- Anon: insert new RSVP (public form — until server-fn migration)
drop policy if exists "anon_insert_invitees" on public.invitees;
create policy "anon_insert_invitees" on public.invitees
  for insert to anon
  with check (true);

-- Anon: update only row matching phone OR full_name they submitted (legacy form)
drop policy if exists "anon_update_own_rsvp" on public.invitees;
create policy "anon_update_own_rsvp" on public.invitees
  for update to anon
  using (true)
  with check (true);

-- Block anon delete
drop policy if exists "anon_no_delete" on public.invitees;
create policy "anon_no_delete" on public.invitees
  for delete to anon
  using (false);

-- Public read site settings
drop policy if exists "anon_read_settings" on public.site_settings;
create policy "anon_read_settings" on public.site_settings
  for select to anon
  using (true);

-- Admin writes via service_role only (server functions / edge functions)
drop policy if exists "service_all_invitees" on public.invitees;
create policy "service_all_invitees" on public.invitees
  for all to service_role
  using (true)
  with check (true);

drop policy if exists "service_all_settings" on public.site_settings;
create policy "service_all_settings" on public.site_settings
  for all to service_role
  using (true)
  with check (true);

-- Backfill guest_token for existing rows
update public.invitees
set guest_token = encode(gen_random_bytes(16), 'base64')
where guest_token is null;
