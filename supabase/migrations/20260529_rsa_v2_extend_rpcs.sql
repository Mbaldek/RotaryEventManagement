-- ============================================================================
-- V2 MULTI-CLUB — Étape 3 : extension des RPC existants pour scope par club
-- ============================================================================
-- Les RPC actuels (Modules 2, 3, 4a) checkent has_platform_role('admin') ou
-- 'comite' — rôles GLOBAUX. En V2 multi-club, on étend ces checks pour
-- accepter aussi :
--   - is_master_admin()                                 → vue globale plateforme
--   - is_club_member(<club_id>, 'club_admin'/'comite')  → autonomie locale
--
-- Le club_id est dérivé de :
--   - startups.club_id pour les RPC de sélection (apply/finalize/override)
--   - sessions.club_id pour les RPC de session (lock/publish/set_live/etc.)
--
-- Les rôles legacy globaux ('admin', 'comite') RESTENT valides (backward-compat
-- pour 2026 monoclub). Les nouveaux rôles club s'ajoutent en disjonction.
--
-- Référence : plan ~/.claude/plans/elegant-giggling-pie.md
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- rsa_apply_selection_review : autorise comité du club de la startup
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_apply_selection_review(p_review_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_review     public.selection_reviews%rowtype;
  v_club_id    text;
  v_new_status text;
  v_new_session text;
begin
  -- 1. Charger la review
  select * into v_review from public.selection_reviews where id = p_review_id;
  if not found then raise exception 'review_not_found: %', p_review_id using errcode = '22023'; end if;

  -- 2. Dériver le club du dossier
  select club_id into v_club_id from public.startups where id = v_review.startup_id;

  -- 3. Permission : legacy (admin/comite global) OR V2 (master_admin OR club_admin/comite du club)
  if not (
    public.has_platform_role('comite')
    or public.has_platform_role('admin')
    or public.is_master_admin()
    or public.is_club_member(v_club_id, 'club_admin')
    or public.is_club_member(v_club_id, 'comite')
  ) then
    raise exception 'rsa_apply_selection_review: forbidden (club_id=%)', v_club_id using errcode = '42501';
  end if;

  -- 4. Garde anti-supersession (inchangé)
  if not v_review.is_final and exists (
    select 1 from public.selection_reviews
     where startup_id = v_review.startup_id
       and id <> v_review.id
       and (is_final = true or reviewed_at > v_review.reviewed_at)
  ) then
    raise exception 'cannot_apply_superseded_review' using errcode = '42501';
  end if;

  -- 5. Projection (inchangée)
  v_new_status := case v_review.decision
    when 'a_examiner' then 'en_selection'
    when 'eligible' then 'affecte'
    when 'liste_attente' then 'liste_attente'
    when 'rejete' then 'rejete'
    else null end;
  if v_new_status is null then raise exception 'unknown_decision: %', v_review.decision using errcode = '22023'; end if;

  if v_review.decision = 'eligible' then
    if v_review.assigned_session_id is null then raise exception 'eligible_requires_session' using errcode = '22023'; end if;
    v_new_session := v_review.assigned_session_id;
  else
    v_new_session := null;
  end if;

  perform set_config('rsa.allow_protected_update', 't', true);
  update public.startups
     set status = v_new_status,
         session_id = v_new_session,
         finalized_at = case when v_review.is_final then now() else finalized_at end,
         finalized_by = case when v_review.is_final then auth.uid() else finalized_by end,
         updated_at = now()
   where id = v_review.startup_id;
  perform set_config('rsa.allow_protected_update', '', true);
end;
$function$;

-- ----------------------------------------------------------------------------
-- rsa_finalize_review : autorise master_admin + club_admin du club du dossier
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_finalize_review(p_review_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_review  public.selection_reviews%rowtype;
  v_club_id text;
begin
  select * into v_review from public.selection_reviews where id = p_review_id;
  if not found then raise exception 'review_not_found: %', p_review_id using errcode = '22023'; end if;

  select club_id into v_club_id from public.startups where id = v_review.startup_id;

  if not (
    public.has_platform_role('admin')
    or public.is_master_admin()
    or public.is_club_member(v_club_id, 'club_admin')
  ) then
    raise exception 'rsa_finalize_review: admin only (club_id=%)', v_club_id using errcode = '42501';
  end if;

  if v_review.is_final then return; end if;
  update public.selection_reviews set is_final = true where id = p_review_id;
  perform public.rsa_apply_selection_review(p_review_id);
end;
$function$;

-- ----------------------------------------------------------------------------
-- rsa_admin_override : autorise master_admin + club_admin du club du dossier
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_admin_override(
  p_startup_id uuid,
  p_decision text,
  p_assigned_session_id text,
  p_rationale text,
  p_overrides_review_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_new_id     uuid;
  v_admin_name text;
  v_club_id    text;
begin
  select club_id into v_club_id from public.startups where id = p_startup_id;

  if not (
    public.has_platform_role('admin')
    or public.is_master_admin()
    or public.is_club_member(v_club_id, 'club_admin')
  ) then
    raise exception 'rsa_admin_override: admin only (club_id=%)', v_club_id using errcode = '42501';
  end if;

  if p_decision not in ('a_examiner','eligible','rejete','liste_attente') then
    raise exception 'invalid_decision: %', p_decision using errcode = '22023';
  end if;
  if p_decision = 'eligible' and p_assigned_session_id is null then
    raise exception 'eligible_requires_session' using errcode = '22023';
  end if;

  if p_overrides_review_id is not null then
    update public.selection_reviews set is_final = false
     where id = p_overrides_review_id and is_final = true;
  end if;

  select coalesce(p.full_name, auth.jwt() ->> 'email') into v_admin_name
    from public.profiles p where lower(p.email) = lower(auth.jwt() ->> 'email') limit 1;
  if v_admin_name is null then v_admin_name := auth.jwt() ->> 'email'; end if;

  insert into public.selection_reviews(
    startup_id, reviewer_id, reviewer_name, decision, assigned_session_id,
    rationale, is_final, overrides_review_id
  ) values (
    p_startup_id, auth.uid(), v_admin_name, p_decision, p_assigned_session_id,
    nullif(btrim(coalesce(p_rationale, '')), ''), true, p_overrides_review_id
  ) returning id into v_new_id;

  perform public.rsa_apply_selection_review(v_new_id);
  return v_new_id;
end;
$function$;

-- ----------------------------------------------------------------------------
-- rsa_lock_session : autorise master_admin + club_admin du club de la session
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_lock_session(p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_count   int;
  v_club_id text;
begin
  select club_id into v_club_id from public.sessions where id = p_session_id;
  if v_club_id is null and not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'session_not_found: %', p_session_id using errcode = '22023';
  end if;

  -- club_id NULL = finale fédérée → réservée master_admin (et admin legacy)
  if not (
    public.has_platform_role('admin')
    or public.is_master_admin()
    or (v_club_id is not null and public.is_club_member(v_club_id, 'club_admin'))
  ) then
    raise exception 'rsa_lock_session: admin only (club_id=%)', v_club_id using errcode = '42501';
  end if;

  update public.session_config set status='locked', updated_at=now()
   where session_id = p_session_id and status = 'live';
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'session_not_live_or_missing: %', p_session_id using errcode = '22023';
  end if;

  perform set_config('rsa.allow_protected_update', 't', true);
  update public.startups set status='note', updated_at=now()
   where session_id = p_session_id and status in ('affecte','en_session');
  perform set_config('rsa.allow_protected_update', '', true);
end;
$function$;

-- ----------------------------------------------------------------------------
-- rsa_publish_session : idem
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_publish_session(p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_n       int;
  v_ranking jsonb;
  v_club_id text;
begin
  select club_id into v_club_id from public.sessions where id = p_session_id;
  if v_club_id is null and not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'session_not_found: %', p_session_id using errcode = '22023';
  end if;

  if not (
    public.has_platform_role('admin')
    or public.is_master_admin()
    or (v_club_id is not null and public.is_club_member(v_club_id, 'club_admin'))
  ) then
    raise exception 'rsa_publish_session: admin only (club_id=%)', v_club_id using errcode = '42501';
  end if;

  if not exists (select 1 from public.session_config where session_id = p_session_id and status = 'locked') then
    raise exception 'session_not_locked: %', p_session_id using errcode = '22023';
  end if;

  select coalesce(e.finalists_per_session, 1) into v_n
    from public.startups s join public.editions e on e.id = s.edition_id
    where s.session_id = p_session_id limit 1;
  if v_n is null then
    select coalesce(e.finalists_per_session, 1) into v_n
      from public.sessions ss join public.editions e on e.id = ss.edition_id
      where ss.id = p_session_id limit 1;
  end if;
  v_n := coalesce(v_n, 1);

  with per_score as (
    select s.id as startup_id, s.name as startup_name, public.rsa_weighted_score(js) as w
      from public.platform_jury_scores js join public.startups s on s.id = js.startup_id
     where js.session_id = p_session_id
  ),
  agg as (
    select startup_id, startup_name, round(avg(w)::numeric, 2) as avg_w, count(*)::int as n_jurors
      from per_score group by startup_id, startup_name
  ),
  ranked as (
    select startup_id, startup_name, avg_w, n_jurors,
           row_number() over (order by avg_w desc, startup_name asc)::int as final_rank
      from agg
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'startup_id', startup_id, 'startup', startup_name,
    'avg', avg_w, 'n', n_jurors, 'final_rank', final_rank
  ) order by final_rank), '[]'::jsonb) into v_ranking from ranked;

  update public.session_config
     set status='published', final_ranking=v_ranking, updated_at=now()
   where session_id = p_session_id;

  perform set_config('rsa.allow_protected_update', 't', true);
  update public.startups st set status='finaliste', updated_at=now()
   where st.session_id = p_session_id
     and st.id in (
       select (e->>'startup_id')::uuid from jsonb_array_elements(v_ranking) e
        where (e->>'final_rank')::int <= v_n
     );
  perform set_config('rsa.allow_protected_update', '', true);
end;
$function$;

-- ----------------------------------------------------------------------------
-- rsa_create_session : accepte p_session.club_id ; check droit sur ce club
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_create_session(p_edition_id text, p_session jsonb)
RETURNS sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_row     public.sessions;
  v_id      text;
  v_name    text;
  v_kind    text;
  v_pos     int;
  v_club_id text;
begin
  v_id := nullif(btrim(coalesce(p_session->>'id', '')), '');
  if v_id is null then raise exception 'missing_field:id' using errcode = '22023'; end if;
  v_name := nullif(btrim(coalesce(p_session->>'name', '')), '');
  if v_name is null then raise exception 'missing_field:name' using errcode = '22023'; end if;
  v_kind := coalesce(nullif(btrim(coalesce(p_session->>'kind', '')), ''), 'qualifying');
  if v_kind not in ('qualifying','finale') then raise exception 'invalid_kind: %', v_kind using errcode = '22023'; end if;
  v_pos := coalesce(nullif(p_session->>'position', '')::int, 0);

  if not exists (select 1 from public.editions where id = p_edition_id) then
    raise exception 'edition_not_found: %', p_edition_id using errcode = '22023';
  end if;

  -- club_id : NULL si finale fédérée, sinon club explicite dans le payload
  v_club_id := nullif(btrim(coalesce(p_session->>'club_id', '')), '');

  -- Permission : club_admin du club spécifié OR admin global OR master_admin (pour finale ou cross-club)
  if not (
    public.has_platform_role('admin')
    or public.is_master_admin()
    or (v_club_id is not null and public.is_club_member(v_club_id, 'club_admin'))
  ) then
    raise exception 'rsa_create_session: forbidden (club_id=%)', v_club_id using errcode = '42501';
  end if;

  -- Si club spécifié, il doit exister
  if v_club_id is not null and not exists (select 1 from public.clubs where id = v_club_id) then
    raise exception 'club_not_found: %', v_club_id using errcode = '22023';
  end if;

  insert into public.sessions (id, edition_id, name, theme, kind, session_date, position, club_id)
  values (v_id, p_edition_id, v_name,
    nullif(btrim(coalesce(p_session->>'theme', '')), ''), v_kind,
    nullif(p_session->>'session_date', '')::date, v_pos, v_club_id)
  on conflict (id) do nothing;

  select * into v_row from public.sessions where id = v_id;

  insert into public.session_config (session_id, status, notes, teams_link)
  values (v_id, 'draft',
    nullif(btrim(coalesce(p_session->>'notes', '')), ''),
    nullif(btrim(coalesce(p_session->>'teams_link', '')), ''))
  on conflict (session_id) do nothing;

  return v_row;
end;
$function$;

-- ----------------------------------------------------------------------------
-- rsa_set_session_live, rsa_set_session_draft, rsa_reset_session_template
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_set_session_live(p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_count   int;
  v_club_id text;
begin
  select club_id into v_club_id from public.sessions where id = p_session_id;
  if not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'session_not_found: %', p_session_id using errcode = '22023';
  end if;
  if not (
    public.has_platform_role('admin')
    or public.is_master_admin()
    or (v_club_id is not null and public.is_club_member(v_club_id, 'club_admin'))
  ) then
    raise exception 'forbidden:not_admin (club_id=%)', v_club_id using errcode = '42501';
  end if;
  update public.session_config set status='live', session_active=true, activated_at=now(), updated_at=now()
   where session_id = p_session_id and status = 'draft';
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'session_not_draft_or_missing_config: %', p_session_id using errcode = '22023'; end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rsa_set_session_draft(p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_count   int;
  v_club_id text;
begin
  select club_id into v_club_id from public.sessions where id = p_session_id;
  if not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'session_not_found: %', p_session_id using errcode = '22023';
  end if;
  if not (
    public.has_platform_role('admin')
    or public.is_master_admin()
    or (v_club_id is not null and public.is_club_member(v_club_id, 'club_admin'))
  ) then
    raise exception 'forbidden:not_admin (club_id=%)', v_club_id using errcode = '42501';
  end if;
  if exists (select 1 from public.platform_jury_scores where session_id = p_session_id) then
    raise exception 'session_already_scored: %', p_session_id using errcode = '22023';
  end if;
  update public.session_config set status='draft', session_active=false, activated_at=null, updated_at=now()
   where session_id = p_session_id and status = 'live';
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'session_not_live_or_missing_config: %', p_session_id using errcode = '22023'; end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rsa_reset_session_template(p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_status  text;
  v_club_id text;
begin
  select club_id into v_club_id from public.sessions where id = p_session_id;
  if not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'session_not_found: %', p_session_id using errcode = '22023';
  end if;
  if not (
    public.has_platform_role('admin')
    or public.is_master_admin()
    or (v_club_id is not null and public.is_club_member(v_club_id, 'club_admin'))
  ) then
    raise exception 'forbidden:not_admin (club_id=%)', v_club_id using errcode = '42501';
  end if;
  select status into v_status from public.session_config where session_id = p_session_id;
  if v_status is not null and v_status <> 'draft' then
    raise exception 'session_not_draft: %', v_status using errcode = '22023';
  end if;
  if exists (select 1 from public.platform_jury_assignments where session_id = p_session_id) then
    raise exception 'session_has_assignments: %', p_session_id using errcode = '22023';
  end if;
  if exists (select 1 from public.startups where session_id = p_session_id) then
    raise exception 'session_has_startups: %', p_session_id using errcode = '22023';
  end if;
  delete from public.session_config where session_id = p_session_id;
  delete from public.sessions       where id         = p_session_id;
end;
$function$;

COMMIT;
