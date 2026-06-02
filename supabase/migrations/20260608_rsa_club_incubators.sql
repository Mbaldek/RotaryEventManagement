-- 20260608_rsa_club_incubators.sql
-- Évolution Incubateurs : opt-in + contact relais scopés (compétition, club).
--
-- Pourquoi : le contact relais (personne + email à qui l'on envoie le kit) dépend
-- de la relation club↔incubateur. En multi-club chaque club gère SA liste + SON
-- contact depuis son cockpit ; en monoclub tout reste au niveau compétition (le
-- club unique est résolu via edition_clubs). On déplace donc l'opt-in ET le
-- contact depuis edition_incubators (per-édition) vers club_incubators (per-club).
--
-- edition_incubators est CONSERVÉE (dépréciée) le temps de la bascule ; le funnel
-- candidat lit désormais l'UNION des opt-in de l'édition via club_incubators.
begin;

-- 1. Opt-in + contact, scopé (compétition, club).
create table if not exists public.club_incubators (
  edition_id    text not null references public.editions(id)  on delete cascade,
  club_id       text not null references public.clubs(id)     on delete cascade,
  incubator_id  text not null references public.incubators(id) on delete cascade,
  position      int  not null default 0,
  contact_name  text,
  contact_email text,
  primary key (edition_id, club_id, incubator_id)
);
create index if not exists club_incubators_edition_idx on public.club_incubators(edition_id);
create index if not exists club_incubators_club_idx     on public.club_incubators(edition_id, club_id);
comment on table public.club_incubators is
  'Opt-in incubateurs + contact relais (personne/email) scopé (compétition, club). Remplace edition_incubators.';

-- 2. Data-migration : edition_incubators -> club_incubators pour le club UNIQUE
--    attaché à chaque édition. Les éditions multi-club (>1 club attaché) sont
--    ignorées (on ne peut pas deviner le club ; la feature est neuve, peu/pas de
--    données concernées). Idempotent via on conflict do nothing.
insert into public.club_incubators (edition_id, club_id, incubator_id, position)
select ei.edition_id, single.club_id, ei.incubator_id, ei.position
  from public.edition_incubators ei
  join (
    select edition_id, min(club_id) as club_id
      from public.edition_clubs
     group by edition_id
    having count(*) = 1
  ) single on single.edition_id = ei.edition_id
on conflict (edition_id, club_id, incubator_id) do nothing;

-- ============ RLS ============
alter table public.club_incubators enable row level security;

-- Lecture publique (alimente le funnel candidat — union des opt-in de l'édition).
-- Écriture refusée en direct : tout passe par le RPC SECURITY DEFINER ci-dessous.
drop policy if exists club_incubators_read         on public.club_incubators;
drop policy if exists club_incubators_write_denied on public.club_incubators;
create policy club_incubators_read on public.club_incubators for select using (true);
create policy club_incubators_write_denied on public.club_incubators for all
  using  (public.is_master_admin())
  with check (public.is_master_admin());

-- ============ RPC : remplacer l'opt-in + contact d'un club pour une édition ============
-- p_rows : jsonb array ordonné ; chaque élément
--   { "incubator_id": text, "contact_name": text|null, "contact_email": text|null }
-- L'ordre du tableau = position (0-based). Set complet (delete des absents).
create or replace function public.rsa_set_club_incubators(
  p_edition_id text,
  p_club_id    text,
  p_rows       jsonb
)
returns void
language plpgsql
security definer
set search_path = public as $$
declare
  v_ids text[];
begin
  if not (
        public.is_master_admin()
     or public.is_competition_admin(p_edition_id)
     or public.is_club_member(p_club_id, 'club_admin')
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Le club doit être attaché à la compétition.
  if not exists (
    select 1 from public.edition_clubs
     where edition_id = p_edition_id and club_id = p_club_id
  ) then
    raise exception 'club % not attached to edition %', p_club_id, p_edition_id
      using errcode = '23503';
  end if;

  p_rows := coalesce(p_rows, '[]'::jsonb);

  select array_agg(elem->>'incubator_id')
    into v_ids
    from jsonb_array_elements(p_rows) as elem;

  -- Supprime les opt-in du club qui ne sont plus dans la liste.
  delete from public.club_incubators
   where edition_id = p_edition_id
     and club_id    = p_club_id
     and (v_ids is null or not (incubator_id = any(v_ids)));

  -- Upsert opt-in + contact, position = index dans le tableau.
  insert into public.club_incubators
        (edition_id, club_id, incubator_id, position, contact_name, contact_email)
  select p_edition_id,
         p_club_id,
         elem->>'incubator_id',
         (ord - 1)::int,
         nullif(trim(coalesce(elem->>'contact_name',  '')), ''),
         nullif(trim(coalesce(elem->>'contact_email', '')), '')
    from jsonb_array_elements(p_rows) with ordinality as t(elem, ord)
  on conflict (edition_id, club_id, incubator_id) do update
    set position      = excluded.position,
        contact_name  = excluded.contact_name,
        contact_email = excluded.contact_email;
end;
$$;

revoke all on function public.rsa_set_club_incubators(text, text, jsonb) from public;
-- Supabase re-grant anon/authenticated via default privileges sur public.* :
-- revoke anon explicitement (defense-in-depth ; cf. hardening RSA).
revoke execute on function public.rsa_set_club_incubators(text, text, jsonb) from anon;
grant execute on function public.rsa_set_club_incubators(text, text, jsonb) to authenticated;

commit;
