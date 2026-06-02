-- Découplage éligibilité / allocation (Module 2.5).
-- Réf : docs/blueprints/selection-allocation-decoupling.md
--
-- 1. rsa_apply_selection_review : 'eligible' projette désormais status='eligible'
--    (session NULL) au lieu de 'affecte'+session obligatoire. On RETIRE la garde
--    eligible_requires_session : l'allocation est une étape distincte (admin).
-- 2. rsa_admin_override : idem, on retire l'exigence de session pour 'eligible'.
-- 3. NOUVEAU rsa_allocate_startup(p_startup_id, p_session_id) : admin-only,
--    eligible|affecte -> affecte + session_id. Valide kind='qualifying' + édition.
--
-- Pas de contrainte CHECK sur startups.status -> aucune migration d'enum.
-- Idempotence : create or replace.

-- ── 1. Reprojection dans rsa_apply_selection_review ───────────────────────────
create or replace function public.rsa_apply_selection_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = public as $$
declare
  v_review     public.selection_reviews%rowtype;
  v_new_status text;
  v_new_session text;
begin
  if not (public.has_platform_role('comite') or public.has_platform_role('admin')) then
    raise exception 'rsa_apply_selection_review: forbidden' using errcode = '42501';
  end if;

  select * into v_review from public.selection_reviews where id = p_review_id;
  if not found then
    raise exception 'review_not_found: %', p_review_id using errcode = '22023';
  end if;

  if not v_review.is_final and exists (
    select 1 from public.selection_reviews
     where startup_id = v_review.startup_id
       and id <> v_review.id
       and (is_final = true or reviewed_at > v_review.reviewed_at)
  ) then
    raise exception 'cannot_apply_superseded_review' using errcode = '42501';
  end if;

  -- Décision -> statut projeté. 'eligible' ne porte PLUS de session (découplage).
  v_new_status := case v_review.decision
    when 'a_examiner'    then 'en_selection'
    when 'eligible'      then 'eligible'
    when 'liste_attente' then 'liste_attente'
    when 'rejete'        then 'rejete'
    else null
  end;
  if v_new_status is null then
    raise exception 'unknown_decision: %', v_review.decision using errcode = '22023';
  end if;

  -- Toutes les décisions de revue remettent session_id à NULL : l'allocation se
  -- fait exclusivement via rsa_allocate_startup, post-éligibilité.
  v_new_session := null;

  perform set_config('rsa.allow_protected_update', 't', true);

  update public.startups
     set status       = v_new_status,
         session_id   = v_new_session,
         finalized_at = case when v_review.is_final then now()      else finalized_at end,
         finalized_by = case when v_review.is_final then auth.uid() else finalized_by end,
         updated_at   = now()
   where id = v_review.startup_id;

  perform set_config('rsa.allow_protected_update', '', true);
end;
$$;

-- ── 2. rsa_admin_override : retrait de l'exigence session pour 'eligible' ─────
create or replace function public.rsa_admin_override(
  p_startup_id uuid,
  p_decision text,
  p_assigned_session_id text,
  p_rationale text,
  p_overrides_review_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public as $$
declare
  v_new_id uuid;
  v_admin_name text;
begin
  if not public.has_platform_role('admin') then
    raise exception 'rsa_admin_override: admin only' using errcode = '42501';
  end if;

  if p_decision not in ('a_examiner','eligible','rejete','liste_attente') then
    raise exception 'invalid_decision: %', p_decision using errcode = '22023';
  end if;
  -- (retiré : eligible_requires_session — l'allocation est désormais séparée)

  -- Clear ANY existing is_final row for this startup before inserting the new one
  -- (the partial-unique index allows only one). Caller-independent: the Allocation
  -- screen calls with p_overrides_review_id=NULL, so we cannot rely on it.
  update public.selection_reviews
     set is_final = false
   where startup_id = p_startup_id
     and is_final = true;

  select coalesce(p.full_name, auth.jwt() ->> 'email') into v_admin_name
    from public.profiles p
   where lower(p.email) = lower(auth.jwt() ->> 'email')
   limit 1;
  if v_admin_name is null then
    v_admin_name := auth.jwt() ->> 'email';
  end if;

  insert into public.selection_reviews(
    startup_id, reviewer_id, reviewer_name, decision, assigned_session_id,
    rationale, is_final, overrides_review_id
  ) values (
    p_startup_id, auth.uid(), v_admin_name, p_decision, p_assigned_session_id,
    nullif(btrim(coalesce(p_rationale, '')), ''), true, p_overrides_review_id
  )
  returning id into v_new_id;

  perform public.rsa_apply_selection_review(v_new_id);
  return v_new_id;
end;
$$;

-- ── 3. NOUVEAU : rsa_allocate_startup(p_startup_id, p_session_id) ──────────────
-- Admin-only. eligible|affecte -> affecte + session_id. N'écrit PAS de review
-- (l'allocation est orthogonale à la décision d'éligibilité). session_id reste
-- le SSOT consommé en aval (running order, jury).
create or replace function public.rsa_allocate_startup(
  p_startup_id uuid,
  p_session_id text
)
returns void
language plpgsql
security definer
set search_path = public as $$
declare
  v_startup public.startups%rowtype;
  v_session public.sessions%rowtype;
begin
  if not public.has_platform_role('admin') then
    raise exception 'rsa_allocate_startup: admin only' using errcode = '42501';
  end if;

  select * into v_startup from public.startups where id = p_startup_id;
  if not found then
    raise exception 'startup_not_found: %', p_startup_id using errcode = '22023';
  end if;
  if v_startup.status not in ('eligible','affecte') then
    raise exception 'startup_not_allocatable: %', v_startup.status using errcode = '42501';
  end if;

  select * into v_session from public.sessions where id = p_session_id;
  if not found then
    raise exception 'session_not_found: %', p_session_id using errcode = '22023';
  end if;
  if v_session.kind <> 'qualifying' then
    raise exception 'session_not_qualifying: %', v_session.kind using errcode = '42501';
  end if;
  if v_session.edition_id <> v_startup.edition_id then
    raise exception 'session_edition_mismatch' using errcode = '42501';
  end if;

  perform set_config('rsa.allow_protected_update', 't', true);
  update public.startups
     set status     = 'affecte',
         session_id = p_session_id,
         updated_at = now()
   where id = p_startup_id;
  perform set_config('rsa.allow_protected_update', '', true);
end;
$$;

revoke all on function public.rsa_allocate_startup(uuid, text) from public;
grant execute on function public.rsa_allocate_startup(uuid, text) to authenticated;

-- Re-déclaration explicite des grants pour les deux fonctions remplacées (policy hardening).
revoke all on function public.rsa_apply_selection_review(uuid) from public;
grant execute on function public.rsa_apply_selection_review(uuid) to authenticated;
revoke all on function public.rsa_admin_override(uuid, text, text, text, uuid) from public;
grant execute on function public.rsa_admin_override(uuid, text, text, text, uuid) to authenticated;
