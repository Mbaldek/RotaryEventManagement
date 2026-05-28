-- Rotary Startup Award — Plateforme unifiée : socle (Phase 0)
-- Étend le projet Supabase existant. Les tables "déjeuners" + RSA 2026 restent
-- intactes (archive) et seront retirées plus tard. Base vierge = nouvelles tables vides.
--
-- Colonne vertébrale : 1 table `startups` (le dossier) traversée par tous les espaces.
-- Source des seuils : Règlement Général Officiel RSA Paris–Berlin 2026 (Art. 2 & 3).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. profiles : rôles plateforme (additif, n'affecte pas l'app déjeuners)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists platform_roles text[] not null default '{}';
-- valeurs : 'startup' | 'jury' | 'comite' | 'admin' (multi-rôle : un comité peut être jury)

create or replace function public.has_platform_role(p_role text)
returns boolean
language sql stable security definer set search_path = public as $$
  -- le profil est relié au compte par email (cf. AuthContext), pas par id
  select exists (
    select 1 from public.profiles
    where lower(email) = lower(auth.jwt() ->> 'email')
      and p_role = any(platform_roles)
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. editions : multi-édition dès le départ (2026, 2027…)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.editions (
  id                text primary key,                 -- '2026'
  name              text not null,
  year              int  not null,
  status            text not null default 'draft',    -- draft|open|selection|sessions|finale|closed
  application_open  date,
  application_close date,
  selection_date    date,
  finale_date       date,
  awards_date       date,
  eligibility_rules jsonb not null default '{}',       -- règles configurables (voir seed + eligibility.js)
  prize_main        numeric,                           -- 5000 €
  prize_special     numeric,                           -- 1500 € greentech
  created_at        timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. sessions = clusters thématiques + grande finale
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.sessions (
  id           text primary key,                       -- 's1_foodtech', 'final_grande'
  edition_id   text not null references public.editions(id) on delete cascade,
  name         text not null,
  theme        text,
  kind         text not null default 'qualifying',     -- qualifying|finale
  session_date date,
  position     int  not null default 0
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. startups : LE DOSSIER (colonne vertébrale)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.startups (
  id                 uuid primary key default gen_random_uuid(),
  edition_id         text not null references public.editions(id),
  owner_id           uuid references auth.users(id),   -- compte candidat (magic link)
  -- cycle de vie : brouillon→soumis→en_selection→eligible/rejete/liste_attente→affecte→en_session→note→finaliste→laureat
  status             text not null default 'brouillon',
  -- identité & contact
  name               text not null,
  contact_person     text,
  email              text,
  phone              text,
  website            text,
  -- société (entrées d'éligibilité)
  country            text,
  creation_date      date,
  registration_number text,
  founders_majority  boolean,                          -- NOUVEAU champ (flag éligibilité)
  -- projet (Art. 4 du règlement)
  value_proposition  text,
  business_model     text,
  roadmap            text,
  team               text,
  traction           text,
  esg_impact         text,
  sectors            text[] not null default '{}',
  -- finances (entrées d'éligibilité)
  last_revenue       numeric,
  amount_raised      numeric,
  -- documents
  pitch_deck_path    text,
  exec_summary_path  text,                             -- FR & DE
  video_pitch_url    text,
  -- rattachement
  partner_institution text,
  rotary_club        text,
  -- issue de sélection
  session_id         text references public.sessions(id),
  eligibility        jsonb not null default '{}',      -- snapshot calculé (verdict + flags)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists startups_edition_idx on public.startups(edition_id);
create index if not exists startups_status_idx  on public.startups(status);
create index if not exists startups_owner_idx   on public.startups(owner_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. selection_reviews : décisions du comité (reviewer / date / motif / cluster)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.selection_reviews (
  id                  uuid primary key default gen_random_uuid(),
  startup_id          uuid not null references public.startups(id) on delete cascade,
  reviewer_id         uuid references auth.users(id),
  reviewer_name       text,
  decision            text not null,                    -- a_examiner|accepte|liste_attente|rejete
  assigned_session_id text references public.sessions(id),
  rationale           text,
  reviewed_at         timestamptz not null default now()
);
create index if not exists selection_reviews_startup_idx on public.selection_reviews(startup_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RLS (1re passe — affinée à la phase Auth)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.editions          enable row level security;
alter table public.sessions          enable row level security;
alter table public.startups          enable row level security;
alter table public.selection_reviews enable row level security;

-- editions & sessions : données de référence lisibles publiquement, écriture admin
create policy editions_read  on public.editions  for select using (true);
create policy sessions_read  on public.sessions  for select using (true);
create policy editions_admin on public.editions  for all
  using (public.has_platform_role('admin')) with check (public.has_platform_role('admin'));
create policy sessions_admin on public.sessions  for all
  using (public.has_platform_role('admin')) with check (public.has_platform_role('admin'));

-- startups : le candidat voit/édite SON dossier ; comité/jury/admin voient tout
create policy startups_read on public.startups for select
  using (owner_id = auth.uid()
         or public.has_platform_role('comite')
         or public.has_platform_role('jury')
         or public.has_platform_role('admin'));
create policy startups_write on public.startups for all
  using (owner_id = auth.uid()
         or public.has_platform_role('comite')
         or public.has_platform_role('admin'))
  with check (owner_id = auth.uid()
         or public.has_platform_role('comite')
         or public.has_platform_role('admin'));

-- selection_reviews : comité + admin
create policy reviews_comite on public.selection_reviews for all
  using (public.has_platform_role('comite') or public.has_platform_role('admin'))
  with check (public.has_platform_role('comite') or public.has_platform_role('admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Seed : édition 2026 + sessions (modèle de référence)
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.editions
  (id, name, year, status, application_open, application_close, selection_date, finale_date, awards_date, eligibility_rules, prize_main, prize_special)
values
  ('2026', 'Rotary Startup Award Paris–Berlin 2026', 2026, 'closed',
   '2026-02-01', '2026-04-15', '2026-04-30', '2026-05-26', '2026-06-02',
   '{
      "country":           {"behavior": "exclu", "allowed": ["FR","DE"]},
      "created_after":      {"behavior": "exclu", "date": "2020-01-01"},
      "revenue_max":        {"behavior": "flag",  "threshold": 500000},
      "raised_max":         {"behavior": "flag",  "threshold": 800000},
      "founders_majority":  {"behavior": "flag"},
      "registration":       {"behavior": "flag"},
      "docs_required":      {"behavior": "flag",  "docs": ["pitch_deck","exec_summary"]}
    }'::jsonb,
   5000, 1500)
on conflict (id) do nothing;

insert into public.sessions (id, edition_id, name, theme, kind, session_date, position) values
  ('s1_foodtech',  '2026', 'Foodtech & économie circulaire', 'Foodtech & économie circulaire', 'qualifying', '2026-04-30', 1),
  ('s2_social',    '2026', 'Impact social & Edtech',         'Impact social & Edtech',         'qualifying', '2026-05-06', 2),
  ('s3_tech',      '2026', 'Tech, AI, Fintech & Mobilité',   'Tech, AI, Fintech & Mobilité',   'qualifying', '2026-05-13', 3),
  ('s4_health',    '2026', 'Healthtech & Biotech',           'Healthtech & Biotech',           'qualifying', '2026-05-19', 4),
  ('s5_greentech', '2026', 'Greentech & Environnement',      'Greentech & Environnement',      'qualifying', '2026-05-21', 5),
  ('final_grande', '2026', 'Grande Finale',                  'Grande Finale',                  'finale',     '2026-05-26', 6)
on conflict (id) do nothing;
