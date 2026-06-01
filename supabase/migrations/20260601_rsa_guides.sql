-- Guides contextuels par espace (drawer + CRUD admin). Multiclub-ready.
-- Cf. docs/superpowers/specs/2026-06-01-guides-contextuels-design.md
--
-- NB : editions.id est TEXT → guides.edition_id est TEXT.

-- 1. Tables -----------------------------------------------------------------
create table if not exists public.guides (
  id            uuid primary key default gen_random_uuid(),
  space         text not null check (space in ('admin','selection','jury','dossier','concours')),
  edition_id    text null references public.editions(id) on delete cascade,
  title         jsonb not null default '{}'::jsonb,   -- { fr, en, de }
  body_md       jsonb not null default '{}'::jsonb,   -- { fr, en, de }
  sort_order    int  not null default 0,
  is_published  boolean not null default false,
  updated_at    timestamptz not null default now(),
  updated_by    uuid null references auth.users(id) on delete set null
);
create index if not exists guides_space_edition_sort_idx
  on public.guides (space, edition_id, sort_order);

create table if not exists public.guide_acks (
  user_id      uuid not null references auth.users(id) on delete cascade,
  space        text not null,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, space)
);

-- 2. Helper : qui peut éditer les guides (tier admin / hiérarchie V3) --------
-- SECURITY INVOKER : la lecture privilégiée est déléguée à des helpers DEFINER.
-- IMPORTANT : competition_admin et club_admin ne sont PAS dans app_user_roles
-- (has_platform_role renverrait toujours false pour eux) — ils vivent dans
-- competition_admins / club_memberships. On délègue donc à :
--   is_master_admin()                : master_admin (DEFINER)
--   my_competition_admin_editions()  : text[] des éditions admin_compétition (DEFINER)
--   my_club_memberships()            : TABLE(club_id, role) du user (DEFINER)
-- has_platform_role('admin') couvre l'admin legacy. Pas d'advisor "definer
-- executable by authenticated" car la fonction elle-même reste INVOKER.
create or replace function public.rsa_can_edit_guides()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.has_platform_role('admin')
      or public.is_master_admin()
      or coalesce(array_length(public.my_competition_admin_editions(), 1), 0) > 0
      or exists (
           select 1 from public.my_club_memberships() m
            where m.role = 'club_admin'
         );
$$;
revoke all on function public.rsa_can_edit_guides() from public, anon;
grant execute on function public.rsa_can_edit_guides() to authenticated;

-- 3. RLS --------------------------------------------------------------------
alter table public.guides enable row level security;
alter table public.guide_acks enable row level security;

-- guides : lecture publiée pour tout authentifié ; brouillons + écriture = admins
drop policy if exists guides_read on public.guides;
create policy guides_read on public.guides
  for select to authenticated
  using (is_published = true or public.rsa_can_edit_guides());

drop policy if exists guides_write on public.guides;
create policy guides_write on public.guides
  for all to authenticated
  using (public.rsa_can_edit_guides())
  with check (public.rsa_can_edit_guides());

-- guide_acks : chacun ne voit/écrit que ses propres lignes
drop policy if exists guide_acks_own on public.guide_acks;
create policy guide_acks_own on public.guide_acks
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 4. Anti-anon (pattern hardening repo) -------------------------------------
revoke all on public.guides from anon;
revoke all on public.guide_acks from anon;
