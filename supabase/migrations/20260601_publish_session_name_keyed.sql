-- Rebranche rsa_publish_session sur le store NAME-KEYED (flux jury sans compte).
-- Le classement agrège jury_scores (clé startup_name) au lieu de platform_jury_scores
-- (clé startup_id), avec les POIDS DE SESSION (session_config.score_weights, défaut
-- 20/20/20/20/10/10). startup_id résolu par join startup_name → startups de la session
-- (nécessaire pour la projection finaliste + finale_membership). Le reste (lifecycle
-- locked, top-N, projection 'finaliste', auto-promote finale_membership, audit) est
-- conservé à l'identique. Appliqué via MCP : version 20260601_publish_session_name_keyed.

CREATE OR REPLACE FUNCTION public.rsa_publish_session(p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_n            int;
  v_ranking      jsonb;
  v_promoted     jsonb;
  v_club_id      text;
  v_edition_id   text;
  v_kind         text;
  v_actor        uuid;
  v_actor_email  text;
  v_inserted     int;
BEGIN
  SELECT club_id, edition_id, kind
    INTO v_club_id, v_edition_id, v_kind
    FROM public.sessions WHERE id = p_session_id;
  IF v_edition_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.sessions WHERE id = p_session_id) THEN
    RAISE EXCEPTION 'session_not_found: %', p_session_id USING errcode = '22023';
  END IF;

  IF NOT (
    public.has_platform_role('admin')
    OR public.is_master_admin()
    OR (v_club_id IS NOT NULL AND public.is_club_member(v_club_id, 'club_admin'))
  ) THEN
    RAISE EXCEPTION 'rsa_publish_session: admin only (club_id=%)', v_club_id
      USING errcode = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.session_config
     WHERE session_id = p_session_id AND status = 'locked'
  ) THEN
    RAISE EXCEPTION 'session_not_locked: %', p_session_id USING errcode = '22023';
  END IF;

  SELECT COALESCE(e.finalists_per_session, 1) INTO v_n
    FROM public.startups s JOIN public.editions e ON e.id = s.edition_id
    WHERE s.session_id = p_session_id LIMIT 1;
  IF v_n IS NULL THEN
    SELECT COALESCE(e.finalists_per_session, 1) INTO v_n
      FROM public.sessions ss JOIN public.editions e ON e.id = ss.edition_id
      WHERE ss.id = p_session_id LIMIT 1;
  END IF;
  v_n := COALESCE(v_n, 1);

  -- Ranking NAME-KEYED + poids de session (pct, défaut 20/20/20/20/10/10).
  -- Note pondérée 0..5 = somme(score_i * pct_i)/100. Lignes incomplètes exclues.
  WITH wts AS (
    SELECT
      COALESCE((sc.score_weights ->> 'score_value_prop')::numeric, 20)     AS w_vp,
      COALESCE((sc.score_weights ->> 'score_market')::numeric, 20)         AS w_mk,
      COALESCE((sc.score_weights ->> 'score_business_model')::numeric, 20) AS w_bm,
      COALESCE((sc.score_weights ->> 'score_team')::numeric, 20)           AS w_tm,
      COALESCE((sc.score_weights ->> 'score_pitch_quality')::numeric, 10)  AS w_pq,
      COALESCE((sc.score_weights ->> 'score_societal_impact')::numeric, 10) AS w_si
      FROM public.session_config sc WHERE sc.session_id = p_session_id
  ),
  per_score AS (
    SELECT s.id AS startup_id, s.name AS startup_name,
           ( js.score_value_prop     * w.w_vp
           + js.score_market         * w.w_mk
           + js.score_business_model * w.w_bm
           + js.score_team           * w.w_tm
           + js.score_pitch_quality  * w.w_pq
           + js.score_societal_impact * w.w_si ) / 100.0 AS w
      FROM public.jury_scores js
      JOIN public.startups s ON s.name = js.startup_name AND s.session_id = p_session_id
      CROSS JOIN wts w
     WHERE js.session_id = p_session_id
       AND js.score_value_prop IS NOT NULL AND js.score_market IS NOT NULL
       AND js.score_business_model IS NOT NULL AND js.score_team IS NOT NULL
       AND js.score_pitch_quality IS NOT NULL AND js.score_societal_impact IS NOT NULL
  ),
  agg AS (
    SELECT startup_id, startup_name,
           ROUND(AVG(w)::numeric, 2) AS avg_w,
           COUNT(*)::int AS n_jurors
      FROM per_score GROUP BY startup_id, startup_name
  ),
  ranked AS (
    SELECT startup_id, startup_name, avg_w, n_jurors,
           ROW_NUMBER() OVER (ORDER BY avg_w DESC, startup_name ASC)::int AS final_rank
      FROM agg
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'startup_id', startup_id, 'startup', startup_name,
    'avg', avg_w, 'n', n_jurors, 'final_rank', final_rank
  ) ORDER BY final_rank), '[]'::jsonb) INTO v_ranking FROM ranked;

  UPDATE public.session_config
     SET status = 'published', final_ranking = v_ranking, updated_at = now()
   WHERE session_id = p_session_id;

  PERFORM set_config('rsa.allow_protected_update', 't', true);
  UPDATE public.startups st SET status = 'finaliste', updated_at = now()
   WHERE st.session_id = p_session_id
     AND st.id IN (
       SELECT (e->>'startup_id')::uuid FROM jsonb_array_elements(v_ranking) e
        WHERE (e->>'final_rank')::int <= v_n
     );
  PERFORM set_config('rsa.allow_protected_update', '', true);

  v_actor := auth.uid();
  v_inserted := 0;
  v_promoted := '[]'::jsonb;

  IF COALESCE(v_kind, 'qualifying') <> 'finale' THEN
    WITH top_n AS (
      SELECT (e->>'startup_id')::uuid AS startup_id,
             e->>'startup'            AS startup_name,
             (e->>'final_rank')::int  AS final_rank
        FROM jsonb_array_elements(v_ranking) e
       WHERE (e->>'final_rank')::int <= v_n
    ),
    ins AS (
      INSERT INTO public.platform_finale_membership (
        edition_id, startup_id, source_session_id, promoted_at, promoted_by
      )
      SELECT v_edition_id, startup_id, p_session_id, now(), v_actor
        FROM top_n
      ON CONFLICT (edition_id, startup_id) DO NOTHING
      RETURNING startup_id
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'startup_id', t.startup_id,
              'startup',    t.startup_name,
              'final_rank', t.final_rank
            ) ORDER BY t.final_rank), '[]'::jsonb),
           (SELECT COUNT(*)::int FROM ins)
      INTO v_promoted, v_inserted
      FROM top_n t;
  END IF;

  SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor;
  INSERT INTO public.admin_audit_log (
    actor_id, actor_email, action, target_kind, target_id, payload
  ) VALUES (
    v_actor, v_actor_email, 'session_concluded', 'session', p_session_id,
    jsonb_build_object(
      'edition_id', v_edition_id, 'club_id', v_club_id,
      'kind', COALESCE(v_kind, 'qualifying'), 'top_n', v_n,
      'ranking', v_ranking, 'promoted', v_promoted, 'promoted_rows', v_inserted,
      'source', 'name_keyed'
    )
  );
END;
$function$;

COMMENT ON FUNCTION public.rsa_publish_session(text) IS
  'Conclure la session — NAME-KEYED (jury_scores) + poids de session. Publie + projette '
  'top-N finaliste + auto-promote finale_membership (sauf finale) + audit. '
  'Remplace l''agrégation platform_jury_scores (flux jury sans compte).';
