-- ============================================================================
-- V3 Vague 2 — Feature A : rsa_publish_session étendu = "Conclure la session"
-- ============================================================================
-- Décision A.1 : un seul acte d'admin = publication + promotion automatique
-- du top-N en finale fédérée. Aucun bouton "Promouvoir" séparé.
--
-- Ce REPLACE de rsa_publish_session conserve la logique V2 (rank par moyenne
-- pondérée, projection startups.status='finaliste' sur le top-N) ET ajoute :
--   1. INSERT INTO platform_finale_membership des startups du top-N
--      (idempotent via ON CONFLICT (edition_id, startup_id) DO NOTHING).
--   2. Audit row dans admin_audit_log avec le snapshot (ranking + finalists).
--   3. Le top-N est lu depuis editions.finalists_per_session (déjà géré V2).
--
-- Dépend de :
--   * 20260527_rsa_module3_jury.sql             (RPC original + helpers weighted)
--   * 20260529_rsa_v2_extend_rpcs.sql           (extension club_admin + master_admin)
--   * 20260531_rsa_v25_competition_delete_audit (admin_audit_log table)
--   * 20260601_rsa_v3_finale_membership.sql     (platform_finale_membership table)
--
-- GUARD :
--   * club_admin du club de la session OU master_admin OU admin legacy.
--   * Idempotence : pas de re-promote si déjà finaliste (ON CONFLICT).
--   * Les sessions de type 'finale' (club_id=NULL) NE déclenchent PAS l'auto-
--     promote : elles SONT la finale, il n'y a rien au-dessus. Pour la finale
--     fédérée, le RPC continue de publier (status=published + ranking snapshot
--     + finaliste projection) mais skip l'auto-promote (no-op INSERT).
-- ============================================================================

BEGIN;

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
  -- 1. Charger session : club_id, edition_id, kind
  SELECT club_id, edition_id, kind
    INTO v_club_id, v_edition_id, v_kind
    FROM public.sessions WHERE id = p_session_id;
  IF v_edition_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.sessions WHERE id = p_session_id) THEN
    RAISE EXCEPTION 'session_not_found: %', p_session_id USING errcode = '22023';
  END IF;

  -- 2. Permission : admin legacy OR master_admin OR club_admin du club de la session.
  --    club_id NULL = finale fédérée → master_admin (ou admin legacy) uniquement.
  IF NOT (
    public.has_platform_role('admin')
    OR public.is_master_admin()
    OR (v_club_id IS NOT NULL AND public.is_club_member(v_club_id, 'club_admin'))
  ) THEN
    RAISE EXCEPTION 'rsa_publish_session: admin only (club_id=%)', v_club_id
      USING errcode = '42501';
  END IF;

  -- 3. Lifecycle : la session doit être 'locked' (la transition live → locked
  --    a été faite via rsa_lock_session).
  IF NOT EXISTS (
    SELECT 1 FROM public.session_config
     WHERE session_id = p_session_id AND status = 'locked'
  ) THEN
    RAISE EXCEPTION 'session_not_locked: %', p_session_id USING errcode = '22023';
  END IF;

  -- 4. N = editions.finalists_per_session (depuis l'édition d'une startup ; fallback
  --    sur edition de la session). Default = 1.
  SELECT COALESCE(e.finalists_per_session, 1) INTO v_n
    FROM public.startups s JOIN public.editions e ON e.id = s.edition_id
    WHERE s.session_id = p_session_id LIMIT 1;
  IF v_n IS NULL THEN
    SELECT COALESCE(e.finalists_per_session, 1) INTO v_n
      FROM public.sessions ss JOIN public.editions e ON e.id = ss.edition_id
      WHERE ss.id = p_session_id LIMIT 1;
  END IF;
  v_n := COALESCE(v_n, 1);

  -- 5. Ranking : moyenne pondérée par startup, tri DESC puis name ASC.
  WITH per_score AS (
    SELECT s.id AS startup_id, s.name AS startup_name,
           public.rsa_weighted_score(js) AS w
      FROM public.platform_jury_scores js JOIN public.startups s ON s.id = js.startup_id
     WHERE js.session_id = p_session_id
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

  -- 6. Snapshot session_config + flip status.
  UPDATE public.session_config
     SET status = 'published', final_ranking = v_ranking, updated_at = now()
   WHERE session_id = p_session_id;

  -- 7. Projection startups.status='finaliste' sur le top-N (bypass-sentinel).
  PERFORM set_config('rsa.allow_protected_update', 't', true);
  UPDATE public.startups st SET status = 'finaliste', updated_at = now()
   WHERE st.session_id = p_session_id
     AND st.id IN (
       SELECT (e->>'startup_id')::uuid FROM jsonb_array_elements(v_ranking) e
        WHERE (e->>'final_rank')::int <= v_n
     );
  PERFORM set_config('rsa.allow_protected_update', '', true);

  -- 8. AUTO-PROMOTE — V3 Vague 2 :
  --    Insère le top-N dans platform_finale_membership SAUF si la session est
  --    elle-même la finale (kind='finale') : pas de pool au-dessus.
  --    ON CONFLICT DO NOTHING : idempotent si la startup est déjà finaliste
  --    d'une autre session (cas pathologique, mais on l'absorbe sans crash).
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

  -- 9. Audit row (immuable côté JWT, SECURITY DEFINER bypasse aal_insert_denied).
  SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor;
  INSERT INTO public.admin_audit_log (
    actor_id, actor_email, action, target_kind, target_id, payload
  ) VALUES (
    v_actor,
    v_actor_email,
    'session_concluded',                  -- décision A.1 : "concluded" pas "published"
    'session',
    p_session_id,
    jsonb_build_object(
      'edition_id',           v_edition_id,
      'club_id',              v_club_id,
      'kind',                 COALESCE(v_kind, 'qualifying'),
      'top_n',                v_n,
      'ranking',              v_ranking,
      'promoted',             v_promoted,
      'promoted_rows',        v_inserted
    )
  );
END;
$function$;

COMMENT ON FUNCTION public.rsa_publish_session(text) IS
  'V3 Vague 2 — "Conclure la session" : publie résultats + projette top-N en ' ||
  'finaliste + auto-promote top-N dans platform_finale_membership (sauf si la ' ||
  'session est elle-même la finale fédérée). Trace audit log. Décision A.1.';

COMMIT;
