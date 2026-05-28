-- ============================================================================
-- V2.5 — Suppression compétition (3-step typed-confirm) + table d'audit log
-- ============================================================================
-- Fournit :
--   * Table `admin_audit_log` (append-only depuis JWT, INSERT autorisé seulement
--     côté SECURITY DEFINER via les RPC).
--   * RPC `rsa_count_competition_dependencies(p_id)` : retourne les compteurs
--     d'entités liées à une édition pour le step 1 de la modale de confirmation.
--   * RPC `rsa_delete_competition(p_id, p_typed_confirm)` : suppression complète
--     avec typed-confirm "SUPPRIMER {name}", log dans admin_audit_log, et retour
--     du snapshot jsonb des entités supprimées (pour toast détaillé côté UI).
--   * RPC `rsa_list_audit_log(p_limit, p_action)` : lecture paginée.
--
-- Référence : project_rsa_v25_user_management (section "Save/Delete sur form
--   compétition") + section "Audit log qui a fait quoi quand".
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Table d'audit immuable
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid REFERENCES auth.users(id),
  actor_email  text,                              -- snapshot au moment de l'action
  action       text NOT NULL,                     -- ex 'competition_deleted', 'club_role_assigned', 'club_created'
  target_kind  text,                              -- ex 'edition', 'club', 'startup', 'user'
  target_id    text,                              -- ID de la ressource ciblée
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_actor_idx       ON public.admin_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_action_idx      ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx  ON public.admin_audit_log(created_at DESC);

COMMENT ON TABLE public.admin_audit_log IS
  'V2.5 — log audit des actions critiques (delete, role assign, etc.). Append-only, jamais d''UPDATE/DELETE depuis JWT. Les RPC SECURITY DEFINER bypassent l''INSERT denied (intentionnel : audit immuable côté JWT).';

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aal_select         ON public.admin_audit_log;
CREATE POLICY aal_select ON public.admin_audit_log FOR SELECT USING (
  public.is_master_admin() OR public.has_platform_role('admin')
);

DROP POLICY IF EXISTS aal_insert_denied  ON public.admin_audit_log;
CREATE POLICY aal_insert_denied ON public.admin_audit_log FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS aal_update_denied  ON public.admin_audit_log;
CREATE POLICY aal_update_denied ON public.admin_audit_log FOR UPDATE USING (false);

DROP POLICY IF EXISTS aal_delete_denied  ON public.admin_audit_log;
CREATE POLICY aal_delete_denied ON public.admin_audit_log FOR DELETE USING (false);

-- ----------------------------------------------------------------------------
-- 2. rsa_count_competition_dependencies : pré-comptage pour la modale
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_count_competition_dependencies(p_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_clubs_count        int;
  v_sessions_total     int;
  v_sessions_draft     int;
  v_sessions_live      int;
  v_sessions_published int;
  v_startups_count     int;
  v_reviews_count      int;
  v_scores_count       int;
  v_name               text;
  v_year               int;
  v_model              text;
BEGIN
  IF NOT (public.is_master_admin() OR public.has_platform_role('admin')) THEN
    RAISE EXCEPTION 'Seul un master_admin peut consulter les dépendances d''une compétition.'
      USING ERRCODE = '42501';
  END IF;

  SELECT name, year, model INTO v_name, v_year, v_model
    FROM public.editions WHERE id = p_id;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Édition % introuvable.', p_id USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::int INTO v_clubs_count
    FROM public.edition_clubs WHERE edition_id = p_id;

  SELECT count(*)::int INTO v_sessions_total
    FROM public.sessions WHERE edition_id = p_id;

  -- Statuts via session_config (LEFT JOIN car certaines sessions historiques peuvent
  -- ne pas avoir de ligne session_config → fallback 'draft').
  SELECT
    count(*) FILTER (WHERE COALESCE(sc.status, 'draft') = 'draft')::int,
    count(*) FILTER (WHERE COALESCE(sc.status, 'draft') = 'live')::int,
    count(*) FILTER (WHERE COALESCE(sc.status, 'draft') = 'published')::int
  INTO v_sessions_draft, v_sessions_live, v_sessions_published
  FROM public.sessions s
  LEFT JOIN public.session_config sc ON sc.session_id = s.id
  WHERE s.edition_id = p_id;

  SELECT count(*)::int INTO v_startups_count
    FROM public.startups WHERE edition_id = p_id;

  SELECT count(*)::int INTO v_reviews_count
    FROM public.selection_reviews sr
    JOIN public.startups st ON st.id = sr.startup_id
   WHERE st.edition_id = p_id;

  SELECT count(*)::int INTO v_scores_count
    FROM public.platform_jury_scores pjs
    JOIN public.startups st ON st.id = pjs.startup_id
   WHERE st.edition_id = p_id;

  RETURN jsonb_build_object(
    'edition_id',           p_id,
    'name',                 v_name,
    'year',                 v_year,
    'model',                v_model,
    'clubs_count',          v_clubs_count,
    'sessions_total',       v_sessions_total,
    'sessions_draft',       v_sessions_draft,
    'sessions_live',        v_sessions_live,
    'sessions_published',   v_sessions_published,
    'startups_count',       v_startups_count,
    'reviews_count',        v_reviews_count,
    'scores_count',         v_scores_count
  );
END;
$$;

COMMENT ON FUNCTION public.rsa_count_competition_dependencies(text) IS
  'V2.5 : retourne le snapshot des dépendances d''une édition (clubs, sessions, startups, reviews, scores) pour la modale de suppression. Master_admin OR admin.';

-- ----------------------------------------------------------------------------
-- 3. rsa_delete_competition : suppression typée + log audit
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_delete_competition(
  p_id            text,
  p_typed_confirm text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_actor          uuid;
  v_actor_email    text;
  v_name           text;
  v_year           int;
  v_model          text;
  v_expected       text;
  v_snapshot       jsonb;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Seul un master_admin peut supprimer une compétition.'
      USING ERRCODE = '42501';
  END IF;

  IF p_id IS NULL OR length(trim(p_id)) = 0 THEN
    RAISE EXCEPTION 'p_id ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;
  IF p_typed_confirm IS NULL THEN
    RAISE EXCEPTION 'typed_confirm_missing' USING ERRCODE = '22023';
  END IF;

  SELECT name, year, model INTO v_name, v_year, v_model
    FROM public.editions WHERE id = p_id;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Édition % introuvable.', p_id USING ERRCODE = '22023';
  END IF;

  v_expected := 'SUPPRIMER ' || v_name;
  IF p_typed_confirm <> v_expected THEN
    RAISE EXCEPTION 'typed_confirm_mismatch' USING ERRCODE = '22023';
  END IF;

  -- Snapshot des compteurs AVANT delete (pour audit + retour UI)
  v_snapshot := public.rsa_count_competition_dependencies(p_id);

  -- Suppression : il faut nettoyer manuellement ce qui n'est pas en CASCADE depuis editions.
  -- FK existantes :
  --   sessions.edition_id          ON DELETE CASCADE                ← OK
  --   edition_clubs.edition_id     ON DELETE CASCADE                ← OK
  --   startups.edition_id          PAS DE CASCADE                   ← à faire à la main
  --   selection_reviews.startup_id ON DELETE CASCADE (depuis startups)  ← OK une fois startups deleted
  --   platform_jury_scores.startup_id ON DELETE CASCADE              ← OK une fois startups deleted
  --   platform_jury_scores.session_id PAS DE CASCADE                ← à faire à la main avant sessions cascade
  --
  -- Ordre : nettoyer scores via session_id, supprimer startups (cascade reviews+scores via startup_id),
  -- puis DELETE editions cascade sessions + edition_clubs.

  DELETE FROM public.platform_jury_scores
   WHERE session_id IN (SELECT id FROM public.sessions WHERE edition_id = p_id);

  DELETE FROM public.startups WHERE edition_id = p_id;

  DELETE FROM public.editions WHERE id = p_id;

  -- Log audit (bypass de la policy aal_insert_denied via SECURITY DEFINER)
  v_actor       := auth.uid();
  SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor;

  INSERT INTO public.admin_audit_log (
    actor_id, actor_email, action, target_kind, target_id, payload
  ) VALUES (
    v_actor,
    v_actor_email,
    'competition_deleted',
    'edition',
    p_id,
    v_snapshot
  );

  RETURN v_snapshot;
END;
$$;

COMMENT ON FUNCTION public.rsa_delete_competition(text, text) IS
  'V2.5 : suppression complète d''une compétition (édition). Master_admin only. Typed-confirm = "SUPPRIMER {name}". Log dans admin_audit_log avec snapshot des compteurs supprimés.';

-- ----------------------------------------------------------------------------
-- 4. rsa_list_audit_log : lecture paginée
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_list_audit_log(
  p_limit  int  DEFAULT 50,
  p_action text DEFAULT NULL
)
RETURNS SETOF public.admin_audit_log
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT *
    FROM public.admin_audit_log
   WHERE (public.is_master_admin() OR public.has_platform_role('admin'))
     AND (p_action IS NULL OR action = p_action)
   ORDER BY created_at DESC
   LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 500));
$$;

COMMENT ON FUNCTION public.rsa_list_audit_log(int, text) IS
  'V2.5 : lecture paginée de l''audit log. Master_admin OR admin global. Limite cap 500.';

-- ----------------------------------------------------------------------------
-- 5. Grants
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.rsa_count_competition_dependencies(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_delete_competition(text, text)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_list_audit_log(int, text)            TO authenticated;

COMMIT;
