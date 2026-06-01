-- 20260607_rsa_incubators.sql
-- Module Incubateurs : base globale, opt-in par compétition, déclaration candidat, config pack com.
begin;

-- 1. Base globale d'incubateurs (infos minimales, réutilisable entre éditions)
create table if not exists public.incubators (
  id          text primary key,
  name        text not null,
  country     text,
  language    text,
  website     text,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id)
);
comment on table public.incubators is 'Base globale des incubateurs/écoles relayeurs. Opt-in par édition via edition_incubators.';

-- 2. Opt-in : sous-ensemble proposé dans le form candidat de CETTE compétition
create table if not exists public.edition_incubators (
  edition_id    text not null references public.editions(id) on delete cascade,
  incubator_id  text not null references public.incubators(id) on delete cascade,
  position      int  not null default 0,
  primary key (edition_id, incubator_id)
);
create index if not exists edition_incubators_edition_idx on public.edition_incubators(edition_id);

-- 3. Déclaration côté startup (sourcing, SANS impact éligibilité)
alter table public.startups add column if not exists incubator_id    text references public.incubators(id);
alter table public.startups add column if not exists incubator_other text;

-- 4. Config éditoriale + assets du pack de com (niveau compétition)
alter table public.editions add column if not exists comm_pack_config jsonb not null default '{}'::jsonb;

-- ============ RLS ============
alter table public.incubators        enable row level security;
alter table public.edition_incubators enable row level security;

-- incubators : lecture publique (alimente le select candidat) ; écriture master ou tout competition_admin
drop policy if exists incubators_read  on public.incubators;
drop policy if exists incubators_write on public.incubators;
create policy incubators_read  on public.incubators for select using (true);
create policy incubators_write on public.incubators for all
  using  (public.is_master_admin() or exists (select 1 from public.competition_admins ca where ca.user_id = auth.uid()))
  with check (public.is_master_admin() or exists (select 1 from public.competition_admins ca where ca.user_id = auth.uid()));

-- edition_incubators : lecture publique ; écriture via RPC uniquement (defense-in-depth)
drop policy if exists edition_incubators_read         on public.edition_incubators;
drop policy if exists edition_incubators_write_denied on public.edition_incubators;
create policy edition_incubators_read on public.edition_incubators for select using (true);
create policy edition_incubators_write_denied on public.edition_incubators for all
  using  (public.is_master_admin())
  with check (public.is_master_admin());

-- ============ RPC : remplacer l'opt-in d'une édition (set + positions par ordre du tableau) ============
create or replace function public.rsa_set_edition_incubators(p_edition_id text, p_incubator_ids text[])
returns void
language plpgsql
security definer
set search_path = public as $$
begin
  if not (public.is_master_admin() or public.is_competition_admin(p_edition_id)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.edition_incubators
   where edition_id = p_edition_id
     and (p_incubator_ids is null or not (incubator_id = any(p_incubator_ids)));

  if p_incubator_ids is not null then
    insert into public.edition_incubators (edition_id, incubator_id, position)
    select p_edition_id, ids.id, ids.ord - 1
      from unnest(p_incubator_ids) with ordinality as ids(id, ord)
    on conflict (edition_id, incubator_id)
      do update set position = excluded.position;
  end if;
end;
$$;

-- ============ Grants ============
revoke all on function public.rsa_set_edition_incubators(text, text[]) from public;
grant execute on function public.rsa_set_edition_incubators(text, text[]) to authenticated;

commit;
