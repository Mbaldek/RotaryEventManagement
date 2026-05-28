-- Rotary Startup Award — Module 4a (« Cockpit Admin : SETUP / LIVE / RESULTS »).
--
-- Dépend de :
--   20260527_rsa_platform_foundation.sql      (editions/sessions/startups + has_platform_role)
--   20260527_rsa_platform_roles_hardening.sql (app_user_roles verrouillé service_role only)
--   20260527_rsa_module1_prep.sql             (RLS startups_applicant_*, dossiers bucket)
--   20260527_rsa_module1_hardening.sql        (trigger startups_guard_update + sentinel
--                                              'rsa.allow_protected_update')
--   20260527_rsa_module2_selection.sql        (extension trigger : finalized_at/by)
--   20260527_rsa_module3_jury.sql             (rsa_lock_session / rsa_publish_session +
--                                              session_config lifecycle ; finalists_per_session)
--   Legacy : public.session_config (table 2026 reused — colonne status [draft|live|locked|published]
--            + final_ranking jsonb + session_order text[]).
--
-- Couvre docs/blueprints/module4-finale-resultats.md §2.1 / §6 / §7 / §8 / §11 (M4a slice) :
--   1) Schéma additif :
--      - editions.description_md text                (admin éditorial libre, non utilisé en SQL).
--      - editions.public_results_enabled boolean     (gate du /Resultats public — décidé par admin
--                                                     via rsa_publish_palmares en M4c ; on l'ajoute ici
--                                                     parce que SETUP l'expose dans l'éditeur édition).
--      - editions.status CHECK ('draft','open','selection','sessions','finale','closed')
--        (pre-decided default §11.8 : un CHECK prévient les fautes de frappe dans le UI SETUP).
--      - startups.prize text                          (free-text — pour M4b proclaim ; staff-only via
--                                                      l'extension du trigger startups_guard_update
--                                                      ci-dessous).
--      - app_user_roles.granted_by uuid + granted_at  (audit — qui a provisionné qui, quand).
--   2) Trigger startups_guard_update EXTENDED :
--      ajoute `prize` aux colonnes verrouillées côté candidat (sur INSERT comme sur UPDATE).
--      Le sentinel-bypass et la branche staff (comité/admin) restent identiques.
--   3) RPC SECURITY DEFINER admin-only :
--      - rsa_create_session(text, jsonb)         : insère sessions + seed session_config (status='draft')
--                                                  dans la même transaction (résout le blocker opérationnel
--                                                  rappelé en blueprint §2.1.B : sans session_config row,
--                                                  rsa_lock_session/publish UPDATE = silent no-op).
--      - rsa_assign_role(text, text[])           : UPSERT app_user_roles avec lower(email),
--                                                  validates roles ⊆ ('startup','jury','comite','admin'),
--                                                  écrit granted_by + granted_at,
--                                                  protection « last admin » avant revoke.
--      - rsa_list_app_user_roles()               : lecture admin-only de toute la table verrouillée.
--      - rsa_set_session_live(text)              : flip session_config.status 'draft'→'live'.
--      - rsa_set_session_draft(text)             : flip session_config.status 'live'→'draft' SI aucun
--                                                  platform_jury_scores n'a été soumis (one-way valve).
--      - rsa_reset_session_template(text)        : DELETE session_config + sessions row IFF status='draft'
--                                                  ET aucun assignment ET aucune startup affectée.
--                                                  Utilisé par le bouton « Reset-to-template Sessions »
--                                                  (admin SETUP, double-confirm typé "RESET").
--   Idempotence : create or replace, drop constraint if exists, add column if not exists.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. editions : nouvelles colonnes + CHECK constraint status
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.editions
  add column if not exists description_md text;

alter table public.editions
  add column if not exists public_results_enabled boolean not null default false;

-- CHECK status — sécurise le SETUP UI contre les typos. Drop puis recrée pour
-- idempotence (et pour que ré-exécuter le fichier ne lève pas).
alter table public.editions
  drop constraint if exists editions_status_check;

alter table public.editions
  add constraint editions_status_check
  check (status in ('draft','open','selection','sessions','finale','closed'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. startups : colonne prize (pour M4b proclaim, ajoutée maintenant pour que
--    le trigger guard puisse la verrouiller)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.startups
  add column if not exists prize text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. app_user_roles : audit metadata (granted_by + granted_at)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.app_user_roles
  add column if not exists granted_by uuid references auth.users(id);

alter table public.app_user_roles
  add column if not exists granted_at timestamptz default now();

-- Backfill granted_at depuis updated_at quand vide (cohérence historique).
update public.app_user_roles
   set granted_at = updated_at
 where granted_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. EXTENSION du trigger startups_guard_update : verrouille `prize`
-- ─────────────────────────────────────────────────────────────────────────────
-- On REPLACE la fonction du trigger en gardant strictement la même surface
-- (signature, nom, branche bypass-sentinel + branche staff). Seule l'addition :
-- `prize` est lock-down côté candidat sur INSERT (default → null requis) ET
-- sur UPDATE (interdit toute distinction old/new).
-- Le trigger DDL (startups_guard_update_trg) reste attaché par nom — pas de DROP.
--
-- Référence : src/components/rsa/admin/CLAUDE-internal — diff complet du trigger
-- vs la version Module 1 dans la migration ...module1_hardening.sql §2.

create or replace function public.startups_guard_update()
returns trigger
language plpgsql as $$
declare
  v_bypass text := coalesce(current_setting('rsa.allow_protected_update', true), '');
begin
  -- 1. Bypass explicite (posé par les SECURITY DEFINER RPC autorisés en début de tx).
  if v_bypass = 't' then
    return new;
  end if;

  -- 2. Bypass staff (comité/admin).
  if public.has_platform_role('comite') or public.has_platform_role('admin') then
    return new;
  end if;

  -- 3a. Candidat sur INSERT : colonnes privilégiées DOIVENT rester aux défauts.
  if TG_OP = 'INSERT' then
    if new.status        is not null and new.status <> 'brouillon'          then raise exception 'forbidden_field:status'       using errcode = '42501'; end if;
    if new.submitted_at  is not null                                         then raise exception 'forbidden_field:submitted_at' using errcode = '42501'; end if;
    if coalesce(new.eligibility, '{}'::jsonb) <> '{}'::jsonb                 then raise exception 'forbidden_field:eligibility'  using errcode = '42501'; end if;
    if new.session_id    is not null                                         then raise exception 'forbidden_field:session_id'   using errcode = '42501'; end if;
    -- Module 2 : finalized_* sont staff-only (préservé du rewrite).
    if new.finalized_at  is not null                                         then raise exception 'forbidden_field:finalized_at' using errcode = '42501'; end if;
    if new.finalized_by  is not null                                         then raise exception 'forbidden_field:finalized_by' using errcode = '42501'; end if;
    -- prize : nouveau en M4a — staff-only même à l'insertion.
    if new.prize         is not null                                         then raise exception 'forbidden_field:prize'        using errcode = '42501'; end if;
    return new;
  end if;

  -- 3b. Candidat sur UPDATE : aucune modification autorisée sur les colonnes privilégiées.
  if new.status        is distinct from old.status        then raise exception 'forbidden_field:status'        using errcode = '42501'; end if;
  if new.submitted_at  is distinct from old.submitted_at  then raise exception 'forbidden_field:submitted_at'  using errcode = '42501'; end if;
  if new.eligibility   is distinct from old.eligibility   then raise exception 'forbidden_field:eligibility'   using errcode = '42501'; end if;
  if new.session_id    is distinct from old.session_id    then raise exception 'forbidden_field:session_id'    using errcode = '42501'; end if;
  if new.owner_id      is distinct from old.owner_id      then raise exception 'forbidden_field:owner_id'      using errcode = '42501'; end if;
  if new.edition_id    is distinct from old.edition_id    then raise exception 'forbidden_field:edition_id'    using errcode = '42501'; end if;
  -- Module 2 : finalized_* sont staff-only (préservé du rewrite).
  if new.finalized_at  is distinct from old.finalized_at  then raise exception 'forbidden_field:finalized_at'  using errcode = '42501'; end if;
  if new.finalized_by  is distinct from old.finalized_by  then raise exception 'forbidden_field:finalized_by'  using errcode = '42501'; end if;
  -- prize : nouveau en M4a — staff-only même sur UPDATE.
  if new.prize         is distinct from old.prize         then raise exception 'forbidden_field:prize'         using errcode = '42501'; end if;

  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RPC rsa_create_session(text, jsonb) — atomique sessions + session_config
-- ─────────────────────────────────────────────────────────────────────────────
-- Insère la session ET la ligne session_config (status='draft') dans la même
-- transaction. Idempotent sur sessions.id (ON CONFLICT DO NOTHING). Renvoie la row.
-- p_session jsonb : { id, name, theme, kind, session_date, position, notes }.
-- Le champ notes est facultatif et écrit dans session_config.notes si présent.

create or replace function public.rsa_create_session(
  p_edition_id text,
  p_session    jsonb
)
returns public.sessions
language plpgsql security definer set search_path = public as $$
declare
  v_row    public.sessions;
  v_id     text;
  v_name   text;
  v_kind   text;
  v_pos    int;
begin
  if not public.has_platform_role('admin') then
    raise exception 'forbidden:not_admin' using errcode = '42501';
  end if;

  -- Validation minimale (les défauts couvrent les champs absents).
  v_id := nullif(btrim(coalesce(p_session->>'id', '')), '');
  if v_id is null then
    raise exception 'missing_field:id' using errcode = '22023';
  end if;
  v_name := nullif(btrim(coalesce(p_session->>'name', '')), '');
  if v_name is null then
    raise exception 'missing_field:name' using errcode = '22023';
  end if;
  v_kind := coalesce(nullif(btrim(coalesce(p_session->>'kind', '')), ''), 'qualifying');
  if v_kind not in ('qualifying','finale') then
    raise exception 'invalid_kind: %', v_kind using errcode = '22023';
  end if;
  v_pos := coalesce(nullif(p_session->>'position', '')::int, 0);

  -- L'édition doit exister (FK le ferait aussi, mais on lève une erreur claire).
  if not exists (select 1 from public.editions where id = p_edition_id) then
    raise exception 'edition_not_found: %', p_edition_id using errcode = '22023';
  end if;

  -- 1) Insert session (idempotent : si la ligne existe, on la renvoie telle quelle).
  insert into public.sessions (id, edition_id, name, theme, kind, session_date, position)
  values (
    v_id,
    p_edition_id,
    v_name,
    nullif(btrim(coalesce(p_session->>'theme', '')), ''),
    v_kind,
    nullif(p_session->>'session_date', '')::date,
    v_pos
  )
  on conflict (id) do nothing;

  -- Re-select dans tous les cas (idempotence).
  select * into v_row from public.sessions where id = v_id;

  -- 2) Seed session_config (status='draft', notes optionnel). ON CONFLICT garantit
  --    qu'on n'écrase pas une ligne existante (cas où la session a été créée hors RPC).
  insert into public.session_config (session_id, status, notes)
  values (
    v_id,
    'draft',
    nullif(btrim(coalesce(p_session->>'notes', '')), '')
  )
  on conflict (session_id) do nothing;

  return v_row;
end$$;

revoke all on function public.rsa_create_session(text, jsonb) from public, anon;
grant execute on function public.rsa_create_session(text, jsonb) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RPC rsa_assign_role(text, text[]) — UPSERT app_user_roles, admin only
-- ─────────────────────────────────────────────────────────────────────────────
-- Provisionne ou révoque des rôles pour un email (clé normalisée lower()).
-- Validation : roles ⊆ ('startup','jury','comite','admin'). Une liste vide ([])
-- équivaut à une révocation totale (on écrit roles='{}' ; pas de DELETE pour
-- préserver les colonnes d'audit). Last-admin protection : refuse si la révocation
-- du rôle 'admin' laisse 0 admin dans la table.

create or replace function public.rsa_assign_role(
  p_email text,
  p_roles text[]
)
returns public.app_user_roles
language plpgsql security definer set search_path = public as $$
declare
  v_row       public.app_user_roles;
  v_email     text;
  v_clean     text[];
  v_invalid   text[];
  v_caller    uuid := auth.uid();
  v_remaining int;
begin
  if not public.has_platform_role('admin') then
    raise exception 'forbidden:not_admin' using errcode = '42501';
  end if;

  v_email := lower(btrim(coalesce(p_email, '')));
  if v_email = '' then
    raise exception 'missing_field:email' using errcode = '22023';
  end if;

  -- Sanitize : trim + lower + dédup + retire les vides. Tableau final = v_clean.
  if p_roles is null then
    v_clean := '{}';
  else
    select coalesce(array_agg(distinct lower(btrim(r))), '{}')
      into v_clean
      from unnest(p_roles) as r
     where btrim(coalesce(r, '')) <> '';
  end if;

  -- Validation : aucun rôle inconnu.
  select coalesce(array_agg(r), '{}') into v_invalid
    from unnest(v_clean) as r
   where r not in ('startup','jury','comite','admin');
  if array_length(v_invalid, 1) is not null then
    raise exception 'invalid_roles: %', array_to_string(v_invalid, ',') using errcode = '22023';
  end if;

  -- Last-admin protection : si les rôles cibles N'INCLUENT PAS 'admin' ET la cible
  -- ACTUELLE est admin, on s'assure qu'il restera au moins un autre admin.
  if not ('admin' = any(v_clean)) then
    select count(*) into v_remaining
      from public.app_user_roles
     where 'admin' = any(roles)
       and lower(email) <> v_email;
    if v_remaining = 0
       and exists (
         select 1 from public.app_user_roles
          where lower(email) = v_email and 'admin' = any(roles)
       )
    then
      raise exception 'last_admin_protection' using errcode = 'P0001';
    end if;
  end if;

  -- UPSERT : la PK email est déjà stockée lowercase par convention.
  insert into public.app_user_roles (email, roles, granted_by, granted_at, updated_at)
    values (v_email, v_clean, v_caller, now(), now())
    on conflict (email) do update
      set roles      = excluded.roles,
          granted_by = excluded.granted_by,
          granted_at = excluded.granted_at,
          updated_at = now()
    returning * into v_row;

  return v_row;
end$$;

revoke all on function public.rsa_assign_role(text, text[]) from public, anon;
grant execute on function public.rsa_assign_role(text, text[]) to authenticated;

-- Lecture admin de la table verrouillée (sans cette RPC, app_user_roles n'a qu'une
-- policy self_read et l'admin ne pourrait pas afficher la liste dans le UI SETUP).
create or replace function public.rsa_list_app_user_roles()
returns setof public.app_user_roles
language sql security definer set search_path = public as $$
  select * from public.app_user_roles
   where public.has_platform_role('admin')
   order by updated_at desc;
$$;

revoke all on function public.rsa_list_app_user_roles() from public, anon;
grant execute on function public.rsa_list_app_user_roles() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RPC rsa_set_session_live(text) — flip session_config 'draft'→'live'
-- ─────────────────────────────────────────────────────────────────────────────
-- Pendant amont de rsa_lock_session (M3) : ouvre une session au scoring. Admin only.
-- Refuse si la session n'existe pas OU si la ligne session_config n'existe pas OU
-- si le status n'est pas 'draft' (one-way Draft→Live).

create or replace function public.rsa_set_session_live(p_session_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  if not public.has_platform_role('admin') then
    raise exception 'forbidden:not_admin' using errcode = '42501';
  end if;

  if not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'session_not_found: %', p_session_id using errcode = '22023';
  end if;

  update public.session_config
     set status        = 'live',
         session_active = true,
         activated_at  = now(),
         updated_at    = now()
   where session_id = p_session_id
     and status = 'draft';

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'session_not_draft_or_missing_config: %', p_session_id using errcode = '22023';
  end if;
end$$;

revoke all on function public.rsa_set_session_live(text) from public, anon;
grant execute on function public.rsa_set_session_live(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. RPC rsa_set_session_draft(text) — flip session_config 'live'→'draft'
-- ─────────────────────────────────────────────────────────────────────────────
-- Permet d'annuler l'ouverture d'une session SI aucun score final n'a été soumis.
-- One-way valve : dès qu'un platform_jury_scores existe pour la session, rsa_set_session_draft
-- refuse (l'admin doit DELETE manuellement les scores avant — politique pjs_admin_delete).

create or replace function public.rsa_set_session_draft(p_session_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  if not public.has_platform_role('admin') then
    raise exception 'forbidden:not_admin' using errcode = '42501';
  end if;

  if not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'session_not_found: %', p_session_id using errcode = '22023';
  end if;

  -- One-way valve : refuse si scores soumis.
  if exists (
    select 1 from public.platform_jury_scores where session_id = p_session_id
  ) then
    raise exception 'session_already_scored: %', p_session_id using errcode = '22023';
  end if;

  update public.session_config
     set status        = 'draft',
         session_active = false,
         activated_at  = null,
         updated_at    = now()
   where session_id = p_session_id
     and status = 'live';

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'session_not_live_or_missing_config: %', p_session_id using errcode = '22023';
  end if;
end$$;

revoke all on function public.rsa_set_session_draft(text) from public, anon;
grant execute on function public.rsa_set_session_draft(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. RPC rsa_reset_session_template(text) — DELETE session_config + sessions
-- ─────────────────────────────────────────────────────────────────────────────
-- Bouton « Reset-to-template Sessions » du SETUP (pre-decided default §11.9). Supprime
-- la ligne session_config ET la ligne sessions pour la clé donnée, IFF :
--   * session_config.status = 'draft' (jamais ouverte) ;
--   * aucun platform_jury_assignments associé (jury pas encore provisionné) ;
--   * aucune startup affectée (session_id = p_session_id).
-- L'UI SETUP impose en plus un typed-confirm "RESET" côté client.

create or replace function public.rsa_reset_session_template(p_session_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_status  text;
begin
  if not public.has_platform_role('admin') then
    raise exception 'forbidden:not_admin' using errcode = '42501';
  end if;

  if not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'session_not_found: %', p_session_id using errcode = '22023';
  end if;

  -- Status DOIT être draft.
  select status into v_status
    from public.session_config
   where session_id = p_session_id;
  if v_status is not null and v_status <> 'draft' then
    raise exception 'session_not_draft: %', v_status using errcode = '22023';
  end if;

  -- Refuse si jurés déjà assignés.
  if exists (
    select 1 from public.platform_jury_assignments where session_id = p_session_id
  ) then
    raise exception 'session_has_assignments: %', p_session_id using errcode = '22023';
  end if;

  -- Refuse si startups déjà affectées.
  if exists (
    select 1 from public.startups where session_id = p_session_id
  ) then
    raise exception 'session_has_startups: %', p_session_id using errcode = '22023';
  end if;

  -- DELETE en cascade logique : d'abord session_config puis sessions
  -- (la FK sessions→session_config est dans l'autre sens : session_config.session_id
  --  REFERENCES sessions(id) ; donc on supprime session_config en premier).
  delete from public.session_config where session_id = p_session_id;
  delete from public.sessions       where id         = p_session_id;
end$$;

revoke all on function public.rsa_reset_session_template(text) from public, anon;
grant execute on function public.rsa_reset_session_template(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTES / OPEN ITEMS (pour l'orchestrateur)
-- ─────────────────────────────────────────────────────────────────────────────
-- (a) Le sentinel-bypass pattern N'EST PAS posé ici : aucune des RPC M4a n'écrit dans
--     `startups` sur des colonnes verrouillées (rsa_lock_session / rsa_publish_session
--     restent dans la migration M3 et continuent de poser leur propre sentinel).
--     L'ajout de `prize` au trigger guard sera consommé en M4b par rsa_proclaim_winner
--     (qui posera son propre sentinel — cf. blueprint §7.7).
-- (b) `editions.public_results_enabled` est ajoutée maintenant mais le flip côté
--     public reste à venir : la RPC `rsa_publish_palmares` arrivera en M4c en même temps
--     que la vue `public.public_palmares`. SETUP affiche le toggle (lecture/écriture
--     admin via la policy editions_admin déjà en place), mais sans /Resultats public il
--     n'a aucun effet observable côté candidat.
-- (c) `app_user_roles.granted_by` est nullable : les rôles bootstrap (admin initial) seront
--     provisionnés via service_role / Supabase Studio et n'ont pas de granted_by — d'où la
--     nullabilité. Toutes les écritures via rsa_assign_role pinent auth.uid().
-- (d) Le CHECK editions_status_check est ajouté SANS NOT VALID : les éditions existantes
--     ('2026' status='closed') matchent déjà. Aucune migration de données nécessaire.
-- (e) rsa_reset_session_template ne touche pas aux dossiers (startups) ni aux drafts/scores
--     (puisqu'on refuse l'opération si une session a déjà été live). C'est volontairement
--     une opération « toute douce » qui défait UNIQUEMENT le seed de session_config + sessions.
