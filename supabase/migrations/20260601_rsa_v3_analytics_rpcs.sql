-- ============================================================================
-- V3.0 — Vague 3 · Feature F : Analytics real-time RPCs
-- ============================================================================
-- Décision F.1 verrouillée : analytics real-time via Supabase Realtime channels
-- (pattern du live scoring existant — useLiveScores).
-- Décision F.2 : single-edition focus (pas de cross-edition / pas d'FP&A).
--
-- Cette migration est ADDITIVE (lecture seule) :
--   - Crée 4 RPC SECURITY DEFINER qui renvoient des agrégats jsonb scopés par
--     `edition_id` + `club_id` optionnel.
--   - GRANT EXECUTE TO authenticated (anon explicitement exclu).
--   - Aucune nouvelle table, aucun trigger, aucune policy : la barrière de
--     sécurité reste la RLS existante + le check d'autorisation en début de
--     chaque RPC (master_admin OR club_admin/comite du club si p_club_id).
--
-- Realtime côté client (hook useAnalytics) : sub sur platform_jury_scores,
-- platform_jury_assignments et startups → invalidate les queries TanStack.
--
-- Référence : plan V3 Vague 3, décision F (locked 2026-06).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. Helper interne : check d'accès au scope (edition + club optionnel)
-- ----------------------------------------------------------------------------
-- Renvoie true si l'appelant est :
--   - master_admin (peut tout voir)
--   - club_admin OU comite du p_club_id (si p_club_id IS NOT NULL)
-- Note : pas de helper SQL séparé pour rester localisé — on inline le check
-- dans chaque RPC pour traçabilité.

-- ----------------------------------------------------------------------------
-- 1. rsa_analytics_funnel_overview(p_edition_id, p_club_id)
-- ----------------------------------------------------------------------------
-- Retourne un funnel agrégé pour une édition (et optionnellement un club).
-- Renvoie jsonb :
-- {
--   "applied":       int,   -- status IN ('soumis','en_selection','eligible','liste_attente','affecte','en_session','note','finaliste','laureat','rejete')
--   "eligible":      int,   -- status IN ('eligible','affecte','en_session','note','finaliste','laureat')
--   "in_review":     int,   -- status IN ('en_selection','eligible','liste_attente','affecte','en_session')
--   "scored":        int,   -- status IN ('note','finaliste','laureat')
--   "selected":      int,   -- status IN ('affecte','en_session','note','finaliste','laureat')
--   "finaliste":     int,   -- status IN ('finaliste','laureat')
--   "laureat":       int,   -- status = 'laureat'
--   "rejected":      int,   -- status IN ('rejete')
--   "conversion_rate_per_stage": {  -- ratio (n_stage / applied) en %, arrondi à 1 décimale
--      "applied":    100.0,
--      "in_review":  ratio,
--      "eligible":   ratio,
--      "selected":   ratio,
--      "scored":     ratio,
--      "finaliste":  ratio,
--      "laureat":    ratio
--   }
-- }
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_analytics_funnel_overview(
  p_edition_id text,
  p_club_id    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_applied    int := 0;
  v_eligible   int := 0;
  v_in_review  int := 0;
  v_scored     int := 0;
  v_selected   int := 0;
  v_finaliste  int := 0;
  v_laureat    int := 0;
  v_rejected   int := 0;
  v_rates      jsonb;
BEGIN
  -- ── Validation ───────────────────────────────────────────────────────────
  IF p_edition_id IS NULL OR length(trim(p_edition_id)) = 0 THEN
    RAISE EXCEPTION 'p_edition_id requis.' USING ERRCODE = '22023';
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication requise.' USING ERRCODE = '42501';
  END IF;

  -- ── Autorisation ─────────────────────────────────────────────────────────
  IF p_club_id IS NULL THEN
    -- scope master : master_admin only
    IF NOT public.is_master_admin() THEN
      RAISE EXCEPTION 'Seul un master_admin peut consulter les analytics globales.'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    -- scope club : master_admin OR club_admin/comite du club
    IF NOT (
      public.is_master_admin()
      OR public.is_club_member(p_club_id, 'club_admin')
      OR public.is_club_member(p_club_id, 'comite')
    ) THEN
      RAISE EXCEPTION 'Vous n''êtes pas autorisé à consulter les analytics de ce club.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- ── Agrégation funnel ────────────────────────────────────────────────────
  -- On lit tous les status pertinents en une passe et on bucket côté SQL.
  -- "applied" = toute candidature qui a quitté l'état 'brouillon'.
  SELECT
    COUNT(*) FILTER (
      WHERE s.status IN ('soumis','en_selection','eligible','liste_attente',
                          'affecte','en_session','note','finaliste','laureat','rejete')
    ),
    COUNT(*) FILTER (
      WHERE s.status IN ('eligible','affecte','en_session','note','finaliste','laureat')
    ),
    COUNT(*) FILTER (
      WHERE s.status IN ('en_selection','eligible','liste_attente','affecte','en_session')
    ),
    COUNT(*) FILTER (
      WHERE s.status IN ('note','finaliste','laureat')
    ),
    COUNT(*) FILTER (
      WHERE s.status IN ('affecte','en_session','note','finaliste','laureat')
    ),
    COUNT(*) FILTER (
      WHERE s.status IN ('finaliste','laureat')
    ),
    COUNT(*) FILTER (
      WHERE s.status = 'laureat'
    ),
    COUNT(*) FILTER (
      WHERE s.status = 'rejete'
    )
  INTO v_applied, v_eligible, v_in_review, v_scored, v_selected, v_finaliste, v_laureat, v_rejected
  FROM public.startups s
  WHERE s.edition_id = p_edition_id
    AND (p_club_id IS NULL OR s.club_id = p_club_id);

  -- ── Ratios % (1 décimale) — applied = 100 par convention ────────────────
  v_rates := jsonb_build_object(
    'applied',   100.0,
    'in_review', CASE WHEN v_applied > 0 THEN ROUND((v_in_review::numeric / v_applied) * 1000) / 10 ELSE 0 END,
    'eligible',  CASE WHEN v_applied > 0 THEN ROUND((v_eligible::numeric  / v_applied) * 1000) / 10 ELSE 0 END,
    'selected',  CASE WHEN v_applied > 0 THEN ROUND((v_selected::numeric  / v_applied) * 1000) / 10 ELSE 0 END,
    'scored',    CASE WHEN v_applied > 0 THEN ROUND((v_scored::numeric    / v_applied) * 1000) / 10 ELSE 0 END,
    'finaliste', CASE WHEN v_applied > 0 THEN ROUND((v_finaliste::numeric / v_applied) * 1000) / 10 ELSE 0 END,
    'laureat',   CASE WHEN v_applied > 0 THEN ROUND((v_laureat::numeric   / v_applied) * 1000) / 10 ELSE 0 END
  );

  RETURN jsonb_build_object(
    'applied',    v_applied,
    'eligible',   v_eligible,
    'in_review',  v_in_review,
    'scored',     v_scored,
    'selected',   v_selected,
    'finaliste',  v_finaliste,
    'laureat',    v_laureat,
    'rejected',   v_rejected,
    'conversion_rate_per_stage', v_rates
  );
END;
$$;

COMMENT ON FUNCTION public.rsa_analytics_funnel_overview(text, text) IS
'V3 Vague 3 — Funnel agrégé (applied → laureat) pour une édition (option : scope club).';

GRANT EXECUTE ON FUNCTION public.rsa_analytics_funnel_overview(text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.rsa_analytics_funnel_overview(text, text) FROM anon, public;

-- ----------------------------------------------------------------------------
-- 2. rsa_analytics_clubs_breakdown(p_edition_id)
-- ----------------------------------------------------------------------------
-- Par club, count des startups par status (master_admin only).
-- Renvoie jsonb :
-- [
--   {
--     "club_id":   text,
--     "club_name": text,
--     "country":   text | null,
--     "applied":   int,
--     "eligible":  int,
--     "selected":  int,
--     "scored":    int,
--     "finaliste": int,
--     "laureat":   int,
--     "rejected":  int,
--     "total":     int       -- total tous status (y compris brouillon)
--   },
--   ...
-- ]
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_analytics_clubs_breakdown(
  p_edition_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  IF p_edition_id IS NULL OR length(trim(p_edition_id)) = 0 THEN
    RAISE EXCEPTION 'p_edition_id requis.' USING ERRCODE = '22023';
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication requise.' USING ERRCODE = '42501';
  END IF;
  -- Master scope uniquement : un club_admin n'a pas à voir le breakdown
  -- des autres clubs. Pour son propre club il consulte le funnel_overview.
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Seul un master_admin peut consulter le breakdown par club.'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(
    jsonb_agg(row_to_jsonb(r) ORDER BY r.applied DESC, r.club_name ASC),
    '[]'::jsonb
  )
  INTO v_rows
  FROM (
    SELECT
      c.id         AS club_id,
      c.name       AS club_name,
      c.country    AS country,
      COUNT(s.*) FILTER (
        WHERE s.status IN ('soumis','en_selection','eligible','liste_attente',
                            'affecte','en_session','note','finaliste','laureat','rejete')
      )::int AS applied,
      COUNT(s.*) FILTER (
        WHERE s.status IN ('eligible','affecte','en_session','note','finaliste','laureat')
      )::int AS eligible,
      COUNT(s.*) FILTER (
        WHERE s.status IN ('affecte','en_session','note','finaliste','laureat')
      )::int AS selected,
      COUNT(s.*) FILTER (
        WHERE s.status IN ('note','finaliste','laureat')
      )::int AS scored,
      COUNT(s.*) FILTER (
        WHERE s.status IN ('finaliste','laureat')
      )::int AS finaliste,
      COUNT(s.*) FILTER (
        WHERE s.status = 'laureat'
      )::int AS laureat,
      COUNT(s.*) FILTER (
        WHERE s.status = 'rejete'
      )::int AS rejected,
      COUNT(s.*)::int AS total
    FROM public.edition_clubs ec
    JOIN public.clubs c ON c.id = ec.club_id
    LEFT JOIN public.startups s
      ON s.club_id = c.id AND s.edition_id = ec.edition_id
    WHERE ec.edition_id = p_edition_id
    GROUP BY c.id, c.name, c.country
  ) r;

  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION public.rsa_analytics_clubs_breakdown(text) IS
'V3 Vague 3 — Breakdown par club des startups d''une édition (master_admin only).';

GRANT EXECUTE ON FUNCTION public.rsa_analytics_clubs_breakdown(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.rsa_analytics_clubs_breakdown(text) FROM anon, public;

-- ----------------------------------------------------------------------------
-- 3. rsa_analytics_jury_activity(p_edition_id, p_club_id)
-- ----------------------------------------------------------------------------
-- Par juré, count des sessions assignées vs sessions scorées + avg time-to-score
-- (= diff submitted_at - assigned_at, agrégé en heures sur les scores finaux).
-- Renvoie jsonb :
-- [
--   {
--     "jury_user_id":          uuid,
--     "qualite":               text | null,    -- vient de platform_jury_profiles
--     "organisation":          text | null,
--     "assignments_count":     int,    -- nb (startup,session) assignations dont la session est dans l'édition (+ club si scope)
--     "scores_submitted":      int,    -- nb scores finaux soumis (subset des assignments)
--     "completion_rate":       numeric, -- % (scores_submitted / assignments_count), 1 décimale, 0 si pas d'assignments
--     "avg_time_to_score_hours": numeric | null  -- moyenne heures (NULL si aucun score)
--   },
--   ...
-- ]
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_analytics_jury_activity(
  p_edition_id text,
  p_club_id    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  IF p_edition_id IS NULL OR length(trim(p_edition_id)) = 0 THEN
    RAISE EXCEPTION 'p_edition_id requis.' USING ERRCODE = '22023';
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication requise.' USING ERRCODE = '42501';
  END IF;

  -- Autorisation : master OR club_admin/comite du club
  IF p_club_id IS NULL THEN
    IF NOT public.is_master_admin() THEN
      RAISE EXCEPTION 'Seul un master_admin peut consulter l''activité jury globale.'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT (
      public.is_master_admin()
      OR public.is_club_member(p_club_id, 'club_admin')
      OR public.is_club_member(p_club_id, 'comite')
    ) THEN
      RAISE EXCEPTION 'Vous n''êtes pas autorisé à consulter l''activité jury de ce club.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- ── Agrégation par jury_user_id ──────────────────────────────────────────
  -- assignments : (jury_user_id) × COUNT(session_id) où sessions filtrées par
  -- edition_id et (option) club_id.
  -- scores : sub-count des assignments où un platform_jury_scores existe.
  -- time-to-score : extract epoch (submitted_at - assigned_at) / 3600.
  --
  -- Note : on garde les sessions kind='qualifying' ET kind='finale' (pour
  -- la finale fédérée club_id IS NULL, le scope master inclut tout).

  SELECT COALESCE(
    jsonb_agg(row_to_jsonb(r) ORDER BY r.scores_submitted DESC NULLS LAST,
                                       r.assignments_count DESC,
                                       r.qualite ASC NULLS LAST),
    '[]'::jsonb
  )
  INTO v_rows
  FROM (
    SELECT
      a.jury_user_id,
      pj.qualite,
      pj.organisation,
      COUNT(DISTINCT a.session_id)::int AS assignments_count,
      COUNT(DISTINCT sc.session_id) FILTER (WHERE sc.startup_id IS NOT NULL)::int
        AS scores_submitted_sessions,
      COUNT(sc.startup_id)::int AS scores_submitted,
      CASE
        WHEN COUNT(a.session_id) > 0 THEN
          ROUND( (COUNT(sc.startup_id)::numeric / COUNT(a.session_id)::numeric) * 1000 ) / 10
        ELSE 0
      END AS completion_rate,
      CASE
        WHEN COUNT(sc.startup_id) > 0 THEN
          ROUND(
            (AVG(EXTRACT(EPOCH FROM (sc.submitted_at - a.assigned_at)) / 3600))::numeric,
            2
          )
        ELSE NULL
      END AS avg_time_to_score_hours
    FROM public.platform_jury_assignments a
    JOIN public.sessions sess ON sess.id = a.session_id
    LEFT JOIN public.platform_jury_profiles pj
      ON pj.user_id = a.jury_user_id
    LEFT JOIN public.platform_jury_scores sc
      ON sc.jury_user_id = a.jury_user_id
     AND sc.session_id   = a.session_id
    WHERE sess.edition_id = p_edition_id
      AND (
        p_club_id IS NULL
        OR sess.club_id = p_club_id
      )
    GROUP BY a.jury_user_id, pj.qualite, pj.organisation
  ) r;

  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION public.rsa_analytics_jury_activity(text, text) IS
'V3 Vague 3 — Activité jury par juré (sessions assignées vs scorées + avg time-to-score).';

GRANT EXECUTE ON FUNCTION public.rsa_analytics_jury_activity(text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.rsa_analytics_jury_activity(text, text) FROM anon, public;

-- ----------------------------------------------------------------------------
-- 4. rsa_analytics_conversion_rates(p_edition_id, p_club_id)
-- ----------------------------------------------------------------------------
-- Funnel applied → selected avec ratio entre étapes (et pas seulement vs applied).
-- Retourne jsonb :
-- {
--   "stages": [
--     { "key": "applied",   "count": int, "pct_of_applied": numeric, "pct_of_previous": numeric | null },
--     { "key": "in_review", "count": int, ... },
--     { "key": "eligible",  "count": int, ... },
--     { "key": "selected",  "count": int, ... },
--     { "key": "scored",    "count": int, ... },
--     { "key": "finaliste", "count": int, ... },
--     { "key": "laureat",   "count": int, ... }
--   ]
-- }
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_analytics_conversion_rates(
  p_edition_id text,
  p_club_id    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_applied   int := 0;
  v_in_review int := 0;
  v_eligible  int := 0;
  v_selected  int := 0;
  v_scored    int := 0;
  v_finaliste int := 0;
  v_laureat   int := 0;
  v_stages    jsonb := '[]'::jsonb;
BEGIN
  IF p_edition_id IS NULL OR length(trim(p_edition_id)) = 0 THEN
    RAISE EXCEPTION 'p_edition_id requis.' USING ERRCODE = '22023';
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication requise.' USING ERRCODE = '42501';
  END IF;

  IF p_club_id IS NULL THEN
    IF NOT public.is_master_admin() THEN
      RAISE EXCEPTION 'Seul un master_admin peut consulter le funnel global.'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT (
      public.is_master_admin()
      OR public.is_club_member(p_club_id, 'club_admin')
      OR public.is_club_member(p_club_id, 'comite')
    ) THEN
      RAISE EXCEPTION 'Vous n''êtes pas autorisé à consulter le funnel de ce club.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT
    COUNT(*) FILTER (
      WHERE s.status IN ('soumis','en_selection','eligible','liste_attente',
                          'affecte','en_session','note','finaliste','laureat','rejete')
    ),
    COUNT(*) FILTER (
      WHERE s.status IN ('en_selection','eligible','liste_attente','affecte','en_session')
    ),
    COUNT(*) FILTER (
      WHERE s.status IN ('eligible','affecte','en_session','note','finaliste','laureat')
    ),
    COUNT(*) FILTER (
      WHERE s.status IN ('affecte','en_session','note','finaliste','laureat')
    ),
    COUNT(*) FILTER (
      WHERE s.status IN ('note','finaliste','laureat')
    ),
    COUNT(*) FILTER (
      WHERE s.status IN ('finaliste','laureat')
    ),
    COUNT(*) FILTER (
      WHERE s.status = 'laureat'
    )
  INTO v_applied, v_in_review, v_eligible, v_selected, v_scored, v_finaliste, v_laureat
  FROM public.startups s
  WHERE s.edition_id = p_edition_id
    AND (p_club_id IS NULL OR s.club_id = p_club_id);

  -- Helper inline pour le ratio (en %, 1 décimale), null si num/denom 0.
  v_stages := jsonb_build_array(
    jsonb_build_object('key','applied',  'count',v_applied,
      'pct_of_applied', CASE WHEN v_applied>0 THEN 100.0 ELSE 0 END,
      'pct_of_previous', NULL),
    jsonb_build_object('key','in_review','count',v_in_review,
      'pct_of_applied', CASE WHEN v_applied>0 THEN ROUND((v_in_review::numeric/v_applied)*1000)/10 ELSE 0 END,
      'pct_of_previous',CASE WHEN v_applied>0 THEN ROUND((v_in_review::numeric/v_applied)*1000)/10 ELSE NULL END),
    jsonb_build_object('key','eligible', 'count',v_eligible,
      'pct_of_applied', CASE WHEN v_applied>0 THEN ROUND((v_eligible::numeric/v_applied)*1000)/10 ELSE 0 END,
      'pct_of_previous',CASE WHEN v_in_review>0 THEN ROUND((v_eligible::numeric/v_in_review)*1000)/10 ELSE NULL END),
    jsonb_build_object('key','selected', 'count',v_selected,
      'pct_of_applied', CASE WHEN v_applied>0 THEN ROUND((v_selected::numeric/v_applied)*1000)/10 ELSE 0 END,
      'pct_of_previous',CASE WHEN v_eligible>0 THEN ROUND((v_selected::numeric/v_eligible)*1000)/10 ELSE NULL END),
    jsonb_build_object('key','scored',   'count',v_scored,
      'pct_of_applied', CASE WHEN v_applied>0 THEN ROUND((v_scored::numeric/v_applied)*1000)/10 ELSE 0 END,
      'pct_of_previous',CASE WHEN v_selected>0 THEN ROUND((v_scored::numeric/v_selected)*1000)/10 ELSE NULL END),
    jsonb_build_object('key','finaliste','count',v_finaliste,
      'pct_of_applied', CASE WHEN v_applied>0 THEN ROUND((v_finaliste::numeric/v_applied)*1000)/10 ELSE 0 END,
      'pct_of_previous',CASE WHEN v_scored>0 THEN ROUND((v_finaliste::numeric/v_scored)*1000)/10 ELSE NULL END),
    jsonb_build_object('key','laureat',  'count',v_laureat,
      'pct_of_applied', CASE WHEN v_applied>0 THEN ROUND((v_laureat::numeric/v_applied)*1000)/10 ELSE 0 END,
      'pct_of_previous',CASE WHEN v_finaliste>0 THEN ROUND((v_laureat::numeric/v_finaliste)*1000)/10 ELSE NULL END)
  );

  RETURN jsonb_build_object('stages', v_stages);
END;
$$;

COMMENT ON FUNCTION public.rsa_analytics_conversion_rates(text, text) IS
'V3 Vague 3 — Taux de conversion par étape du funnel (applied → laureat).';

GRANT EXECUTE ON FUNCTION public.rsa_analytics_conversion_rates(text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.rsa_analytics_conversion_rates(text, text) FROM anon, public;

COMMIT;
