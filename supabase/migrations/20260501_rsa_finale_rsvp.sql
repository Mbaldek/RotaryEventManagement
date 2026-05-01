-- RSA 2026 — Grande Finale RSVP table
-- Roles: pitcher (winning startups), visitor (losing startups invited as guests), jury
-- RLS pattern matches existing RSA tables (jury_profiles, startup_confirmations): fully open,
-- admin gating happens client-side via VITE_RSA_ADMIN_KEY.

create table if not exists public.rsa_finale_rsvp (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('pitcher','visitor','jury')),
  prenom text not null,
  nom text not null,
  organisation text,
  email text not null,
  telephone text,
  startup_name text,
  source_session_id text,
  attending boolean not null,
  party_size int not null default 1 check (party_size between 1 and 20),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rsa_finale_rsvp_role_idx on public.rsa_finale_rsvp (role);
create index if not exists rsa_finale_rsvp_email_idx on public.rsa_finale_rsvp (email);
create index if not exists rsa_finale_rsvp_created_at_idx on public.rsa_finale_rsvp (created_at desc);

alter table public.rsa_finale_rsvp enable row level security;

create policy "public_all_rsvp"
  on public.rsa_finale_rsvp
  for all
  using (true)
  with check (true);

-- Realtime so the admin viewer updates live
alter publication supabase_realtime add table public.rsa_finale_rsvp;
