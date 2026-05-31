-- ============================================================================
-- Session Admin Console — couche DB
-- Blueprint : docs/blueprints/session-admin-console.md  (§3 data-model, §4 RPC)
-- ============================================================================
-- Ajoute :
--   1. editions.finale_topology               — topologie de finale configurable
--   2. session_config.start_time / end_time   — horaire de session
--   3. rsa_update_session(text, jsonb)         — édition DRAFT-ONLY (patch partiel)
--   4. rsa_delete_session(text)                — suppression (logique du reset)
--      + rsa_reset_session_template devient un alias vers rsa_delete_session
--   5. rsa_set_finale_topology(text, text)     — master/admin only
--   6. rsa_resolve_audience : ajout du type 'session_all' (union candidats+jurés)
--      NB: 'session_jurys' et 'session_candidates' existaient déjà (M9 email studio).
--
-- Garde canonique réutilisée (cf. 20260529_rsa_v2_extend_rpcs.sql) :
--   has_platform_role('admin') OR is_master_admin()
--   OR (club_id IS NOT NULL AND is_club_member(club_id,'club_admin'))
--   club_id NULL (finale fédérée) → master_admin seul.
--
-- Politique d'édition : DRAFT-ONLY. Une session live/publiée est gelée
-- (rsa_update_session et rsa_delete_session refusent si status <> 'draft').
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. editions.finale_topology
-- ----------------------------------------------------------------------------
ALTER TABLE public.editions
  ADD COLUMN IF NOT EXISTS finale_topology text NOT NULL DEFAULT 'federated_only';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'editions_finale_topology_chk'
  ) THEN
    ALTER TABLE public.editions
      ADD CONSTRAINT editions_finale_topology_chk
      CHECK (finale_topology IN ('federated_only', 'club_then_federated'));
  END IF;
END$$;

COMMENT ON COLUMN public.editions.finale_topology IS
  'Topologie finale : federated_only = sessions qualif → 1 finale fédérée (club_id NULL) ; club_then_federated = finale-club par club (kind=finale, club_id=X) puis finale fédérée.';

-- ----------------------------------------------------------------------------
-- 2. session_config : horaire début / fin
-- ----------------------------------------------------------------------------
ALTER TABLE public.session_config
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time   time;

COMMENT ON COLUMN public.session_config.start_time IS 'Heure de début de session (le jour est sessions.session_date).';
COMMENT ON COLUMN public.session_config.end_time   IS 'Heure de fin de session.';

-- ----------------------------------------------------------------------------
-- 3. rsa_update_session(text, jsonb) — édition DRAFT-ONLY, patch partiel
-- ----------------------------------------------------------------------------
-- Seules les clés présentes dans p_patch sont modifiées.
--   sessions       : name, theme, session_date, position, kind, club_id
--   session_config : notes, teams_link, start_time, end_time
-- id / edition_id non patchables (PK / structurel : renommer = supprimer+recréer).
CREATE OR REPLACE FUNCTION public.rsa_update_session(p_session_id text, p_patch jsonb)
RETURNS public.sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_row      public.sessions;
  v_club_id  text;
  v_status   text;
  v_kind     text;
  v_new_club text;
begin
  if p_patch is null then p_patch := '{}'::jsonb; end if;

  select club_id into v_club_id from public.sessions where id = p_session_id;
  if not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'session_not_found: %', p_session_id using errcode = '22023';
  end if;

  -- Permission sur le club courant.
  if not (
    public.has_platform_role('admin')
    or public.is_master_admin()
    or (v_club_id is not null and public.is_club_member(v_club_id, 'club_admin'))
  ) then
    raise exception 'forbidden:not_admin (club_id=%)', v_club_id using errcode = '42501';
  end if;

  -- DRAFT-ONLY.
  select status into v_status from public.session_config where session_id = p_session_id;
  if v_status is not null and v_status <> 'draft' then
    raise exception 'session_not_draft: %', v_status using errcode = '22023';
  end if;

  -- ── kind ──
  if p_patch ? 'kind' then
    v_kind := nullif(btrim(coalesce(p_patch->>'kind', '')), '');
    if v_kind is not null and v_kind not in ('qualifying','finale') then
      raise exception 'invalid_kind: %', v_kind using errcode = '22023';
    end if;
    if v_kind is not null then
      update public.sessions set kind = v_kind where id = p_session_id;
    end if;
  end if;

  -- ── club_id (re-vérifie le droit sur le club cible) ──
  if p_patch ? 'club_id' then
    v_new_club := nullif(btrim(coalesce(p_patch->>'club_id', '')), '');
    if not (
      public.has_platform_role('admin')
      or public.is_master_admin()
      or (v_new_club is not null and public.is_club_member(v_new_club, 'club_admin'))
    ) then
      raise exception 'forbidden:target_club (club_id=%)', v_new_club using errcode = '42501';
    end if;
    if v_new_club is not null and not exists (select 1 from public.clubs where id = v_new_club) then
      raise exception 'club_not_found: %', v_new_club using errcode = '22023';
    end if;
    update public.sessions set club_id = v_new_club where id = p_session_id;
  end if;

  -- ── name (NOT NULL : on ignore une valeur vide) ──
  if p_patch ? 'name' then
    update public.sessions
       set name = coalesce(nullif(btrim(coalesce(p_patch->>'name', '')), ''), name)
     where id = p_session_id;
  end if;

  -- ── theme (nullable) ──
  if p_patch ? 'theme' then
    update public.sessions
       set theme = nullif(btrim(coalesce(p_patch->>'theme', '')), '')
     where id = p_session_id;
  end if;

  -- ── session_date (nullable) ──
  if p_patch ? 'session_date' then
    update public.sessions
       set session_date = nullif(p_patch->>'session_date', '')::date
     where id = p_session_id;
  end if;

  -- ── position (int) ──
  if p_patch ? 'position' then
    update public.sessions
       set position = coalesce(nullif(p_patch->>'position', '')::int, position)
     where id = p_session_id;
  end if;

  -- ── session_config : notes / teams_link / horaire ──
  if p_patch ? 'notes' then
    update public.session_config
       set notes = nullif(btrim(coalesce(p_patch->>'notes', '')), ''), updated_at = now()
     where session_id = p_session_id;
  end if;
  if p_patch ? 'teams_link' then
    update public.session_config
       set teams_link = nullif(btrim(coalesce(p_patch->>'teams_link', '')), ''), updated_at = now()
     where session_id = p_session_id;
  end if;
  if p_patch ? 'start_time' then
    update public.session_config
       set start_time = nullif(p_patch->>'start_time', '')::time, updated_at = now()
     where session_id = p_session_id;
  end if;
  if p_patch ? 'end_time' then
    update public.session_config
       set end_time = nullif(p_patch->>'end_time', '')::time, updated_at = now()
     where session_id = p_session_id;
  end if;

  select * into v_row from public.sessions where id = p_session_id;
  return v_row;
end;
$function$;

REVOKE ALL ON FUNCTION public.rsa_update_session(text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rsa_update_session(text, jsonb) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. rsa_delete_session(text) — suppression (DRAFT + 0 juré + 0 startup)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_delete_session(p_session_id text)
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

REVOKE ALL ON FUNCTION public.rsa_delete_session(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rsa_delete_session(text) TO authenticated;

-- rsa_reset_session_template : conservé en ALIAS (back-compat des appels UI/SQL
-- existants) — délègue désormais à rsa_delete_session.
CREATE OR REPLACE FUNCTION public.rsa_reset_session_template(p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  perform public.rsa_delete_session(p_session_id);
end;
$function$;

-- ----------------------------------------------------------------------------
-- 5. rsa_set_finale_topology(text, text) — décision de compétition (pas club_admin)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_set_finale_topology(p_edition_id text, p_topology text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if not (public.has_platform_role('admin') or public.is_master_admin()) then
    raise exception 'forbidden:not_admin' using errcode = '42501';
  end if;
  if p_topology not in ('federated_only', 'club_then_federated') then
    raise exception 'invalid_topology: %', p_topology using errcode = '22023';
  end if;
  if not exists (select 1 from public.editions where id = p_edition_id) then
    raise exception 'edition_not_found: %', p_edition_id using errcode = '22023';
  end if;
  update public.editions set finale_topology = p_topology where id = p_edition_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.rsa_set_finale_topology(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rsa_set_finale_topology(text, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. rsa_resolve_audience : ajout du type 'session_all' (candidats ∪ jurés)
-- ----------------------------------------------------------------------------
-- Reproduit la fonction M9 à l'identique + 1 type. 'session_jurys' et
-- 'session_candidates' restent inchangés. search_path = public, auth (joint auth.users).
CREATE OR REPLACE FUNCTION public.rsa_resolve_audience(
  p_audience_type text,
  p_audience_filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(email text, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_club_id    text;
  v_session_id text;
  v_edition_id text;
  v_statuses   text[];
  v_email      text;
  v_session_club text;
BEGIN
  IF p_audience_type IS NULL OR length(trim(p_audience_type)) = 0 THEN
    RAISE EXCEPTION 'p_audience_type ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;
  IF p_audience_filter IS NULL THEN
    p_audience_filter := '{}'::jsonb;
  END IF;

  v_club_id     := NULLIF(trim(coalesce(p_audience_filter ->> 'club_id', '')), '');
  v_session_id  := NULLIF(trim(coalesce(p_audience_filter ->> 'session_id', '')), '');
  v_edition_id  := NULLIF(trim(coalesce(p_audience_filter ->> 'edition_id', '')), '');

  IF p_audience_filter ? 'statuses' AND jsonb_typeof(p_audience_filter -> 'statuses') = 'array' THEN
    SELECT array_agg(value::text)
      INTO v_statuses
      FROM jsonb_array_elements_text(p_audience_filter -> 'statuses');
  END IF;

  -- ── single_email ──
  IF p_audience_type = 'single_email' THEN
    v_email := lower(trim(coalesce(p_audience_filter ->> 'email', '')));
    IF v_email = '' OR v_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' THEN
      RAISE EXCEPTION 'Email invalide.' USING ERRCODE = '22023';
    END IF;
    RETURN QUERY SELECT v_email, NULL::text;
    RETURN;
  END IF;

  -- ── club-scoped types ──
  IF p_audience_type IN ('club_candidates','club_finalists','club_jurys','club_comite','club_admins') THEN
    IF v_club_id IS NULL THEN
      RAISE EXCEPTION 'club_id requis pour %.', p_audience_type USING ERRCODE = '22023';
    END IF;
    IF NOT (public.is_master_admin() OR public.is_club_member(v_club_id, 'club_admin')) THEN
      RAISE EXCEPTION 'Accès refusé pour le club %.', v_club_id USING ERRCODE = '42501';
    END IF;
  END IF;

  -- ── session-scoped types (+ session_all ajouté) ──
  IF p_audience_type IN ('session_jurys','session_candidates','session_all') THEN
    IF v_session_id IS NULL THEN
      RAISE EXCEPTION 'session_id requis pour %.', p_audience_type USING ERRCODE = '22023';
    END IF;
    SELECT club_id INTO v_session_club FROM public.sessions WHERE id = v_session_id;
    IF v_session_club IS NULL AND NOT public.is_master_admin() THEN
      RAISE EXCEPTION 'Accès refusé pour la session %.', v_session_id USING ERRCODE = '42501';
    END IF;
    IF v_session_club IS NOT NULL
       AND NOT (public.is_master_admin() OR public.is_club_member(v_session_club, 'club_admin')) THEN
      RAISE EXCEPTION 'Accès refusé pour la session %.', v_session_id USING ERRCODE = '42501';
    END IF;
  END IF;

  -- ── master-only types ──
  IF p_audience_type = 'all_finalists_edition' THEN
    IF NOT public.is_master_admin() THEN
      RAISE EXCEPTION 'Seul un master_admin peut résoudre %.', p_audience_type USING ERRCODE = '42501';
    END IF;
    IF v_edition_id IS NULL THEN
      RAISE EXCEPTION 'edition_id requis pour %.', p_audience_type USING ERRCODE = '22023';
    END IF;
  END IF;

  -- ── résolution effective ──
  IF p_audience_type = 'club_candidates' THEN
    RETURN QUERY
      SELECT DISTINCT lower(s.email) AS email,
             coalesce(s.contact_person, s.name) AS full_name
      FROM public.startups s
      WHERE s.club_id = v_club_id
        AND s.email IS NOT NULL
        AND (v_edition_id IS NULL OR s.edition_id = v_edition_id)
        AND (v_statuses IS NULL OR s.status = ANY(v_statuses));

  ELSIF p_audience_type = 'club_finalists' THEN
    RETURN QUERY
      SELECT DISTINCT lower(s.email) AS email,
             coalesce(s.contact_person, s.name) AS full_name
      FROM public.startups s
      WHERE s.club_id = v_club_id
        AND s.status = 'finaliste'
        AND s.email IS NOT NULL
        AND (v_edition_id IS NULL OR s.edition_id = v_edition_id);

  ELSIF p_audience_type IN ('club_jurys','club_comite','club_admins') THEN
    RETURN QUERY
      SELECT DISTINCT lower(u.email) AS email,
             coalesce(p.full_name, u.email) AS full_name
      FROM public.club_memberships m
      JOIN auth.users u  ON u.id = m.user_id
      LEFT JOIN public.profiles p ON p.id = m.user_id
      WHERE m.club_id = v_club_id
        AND m.role = CASE p_audience_type
                       WHEN 'club_jurys'   THEN 'jury'
                       WHEN 'club_comite'  THEN 'comite'
                       WHEN 'club_admins'  THEN 'club_admin'
                     END
        AND u.email IS NOT NULL;

  ELSIF p_audience_type = 'session_jurys' THEN
    RETURN QUERY
      SELECT DISTINCT lower(u.email) AS email,
             coalesce(p.full_name, u.email) AS full_name
      FROM public.platform_jury_assignments a
      JOIN auth.users u  ON u.id = a.jury_user_id
      LEFT JOIN public.profiles p ON p.id = a.jury_user_id
      WHERE a.session_id = v_session_id
        AND u.email IS NOT NULL;

  ELSIF p_audience_type = 'session_candidates' THEN
    RETURN QUERY
      SELECT DISTINCT lower(s.email) AS email,
             coalesce(s.contact_person, s.name) AS full_name
      FROM public.startups s
      WHERE s.session_id = v_session_id
        AND s.email IS NOT NULL;

  ELSIF p_audience_type = 'session_all' THEN
    RETURN QUERY
      SELECT DISTINCT lower(s.email) AS email,
             coalesce(s.contact_person, s.name) AS full_name
      FROM public.startups s
      WHERE s.session_id = v_session_id
        AND s.email IS NOT NULL
      UNION
      SELECT DISTINCT lower(u.email) AS email,
             coalesce(p.full_name, u.email) AS full_name
      FROM public.platform_jury_assignments a
      JOIN auth.users u  ON u.id = a.jury_user_id
      LEFT JOIN public.profiles p ON p.id = a.jury_user_id
      WHERE a.session_id = v_session_id
        AND u.email IS NOT NULL;

  ELSIF p_audience_type = 'all_finalists_edition' THEN
    RETURN QUERY
      SELECT DISTINCT lower(s.email) AS email,
             coalesce(s.contact_person, s.name) AS full_name
      FROM public.startups s
      WHERE s.edition_id = v_edition_id
        AND s.status = 'finaliste'
        AND s.email IS NOT NULL;

  ELSE
    RAISE EXCEPTION 'Type d''audience inconnu : %.', p_audience_type USING ERRCODE = '22023';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rsa_resolve_audience(text, jsonb) TO authenticated;

COMMIT;
