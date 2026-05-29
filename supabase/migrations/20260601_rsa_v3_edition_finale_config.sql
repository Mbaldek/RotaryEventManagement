-- ============================================================================
-- V3 — Édition × Finale configurable (équipe B)
-- ============================================================================
-- La Finale devient une entité configurable attachée à toute édition, mono OU
-- multiclub. Concrètement :
--   * editions.has_finale (bool, default false) — flag éditorial. Quand true,
--     l'édition propose une Finale dans son funnel/édition de compétition.
--   * editions.finale_config (jsonb, default {}) — config libre (name, date,
--     location, format {pitch_min, qa_min}, jury_pool_size, promote_top_n).
--     Schéma souple côté UI ; PAS de CHECK strict pour permettre l'évolution
--     sans migration.
--
-- Sémantique promote_top_n :
--   * rsa_publish_session lit la priorité suivante :
--       1) editions.finale_config->>'promote_top_n' (si présent et > 0)
--       2) editions.finalists_per_session (legacy V3 Vague 1, default 1)
--   * Cela permet à un master_admin de override le top-N par-finale-configurée
--     sans toucher au legacy finalists_per_session (qui reste utile aux écrans
--     /Concours, ResultsView et /Resultats public).
--
-- Pas de copie automatique vers les sessions kind='finale' existantes : le RPC
-- de création de la session finale (useCreateFederatedFinale en front, ou
-- rsa_create_session côté SQL) continue d'utiliser les champs du payload, et
-- la config de la finale en tant que SESSION reste dans session_config. Cette
-- table EDITION-level est donc la source-de-vérité éditoriale ("la finale
-- existe, voici sa config"), et la session finale est l'instance opérationnelle.
--
-- Dépend de :
--   * 20260601_rsa_v3_finale_membership.sql       (table pool)
--   * 20260601_rsa_v3_publish_session_extended.sql (RPC de promotion)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Colonnes has_finale + finale_config
-- ----------------------------------------------------------------------------
ALTER TABLE public.editions
  ADD COLUMN IF NOT EXISTS has_finale boolean NOT NULL DEFAULT false;

ALTER TABLE public.editions
  ADD COLUMN IF NOT EXISTS finale_config jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.editions.has_finale IS
  'V3 — Flag éditorial : l''édition a une Finale (mono OU multiclub). Quand true, ' ||
  'le funnel/edit-view de compétition affiche la section Finale et son pool.';

COMMENT ON COLUMN public.editions.finale_config IS
  'V3 — Config libre de la Finale (jsonb). Schéma indicatif : ' ||
  '{ name?, date?, location?, format?: {pitch_min, qa_min}, jury_pool_size?, promote_top_n? }. ' ||
  'Sémantique de promote_top_n : override editions.finalists_per_session pour la ' ||
  'promotion auto au moment du publish d''une session qualificative.';

-- ----------------------------------------------------------------------------
-- 2. RPC rsa_publish_session — version V3 Vague 2B
-- ----------------------------------------------------------------------------
-- REPLACE complet pour intégrer la lecture de finale_config.promote_top_n.
-- Priorité : finale_config.promote_top_n → editions.finalists_per_session → 1.
-- Garde la sémantique V3 Vague 2A (auto-promote + audit + skip si kind='finale').

CREATE OR REPLACE FUNCTION public.rsa_publish_session(p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_n              int;
  v_n_from_cfg     int;
  v_ranking        jsonb;
  v_promoted       jsonb;
  v_club_id        text;
  v_edition_id     text;
  v_kind           text;
  v_actor          uuid;
  v_actor_email    text;
  v_inserted       int;
BEGIN
  -- 1. Charger session
  SELECT club_id, edition_id, kind
    INTO v_club_id, v_edition_id, v_kind
    FROM public.sessions WHERE id = p_session_id;
  IF v_edition_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.sessions WHERE id = p_session_id) THEN
    RAISE EXCEPTION 'session_not_found: %', p_session_id USING errcode = '22023';
  END IF;

  -- 2. Permission
  IF NOT (
    public.has_platform_role('admin')
    OR public.is_master_admin()
    OR (v_club_id IS NOT NULL AND public.is_club_member(v_club_id, 'club_admin'))
  ) THEN
    RAISE EXCEPTION 'rsa_publish_session: admin only (club_id=%)', v_club_id
      USING errcode = '42501';
  END IF;

  -- 3. Lifecycle : session must be 'locked'
  IF NOT EXISTS (
    SELECT 1 FROM public.session_config
     WHERE session_id = p_session_id AND status = 'locked'
  ) THEN
    RAISE EXCEPTION 'session_not_locked: %', p_session_id USING errcode = '22023';
  END IF;

  -- 4. N = priorité finale_config.promote_top_n > finalists_per_session > 1.
  --    On lit côté édition de la session (pas via startups) pour ne pas dépendre
  --    de la présence de candidats. Fallback startups conservé en cas d'éditions
  --    legacy sans config.
  SELECT
      NULLIF((e.finale_config->>'promote_top_n')::int, 0),
      COALESCE(e.finalists_per_session, 1)
    INTO v_n_from_cfg, v_n
    FROM public.sessions ss JOIN public.editions e ON e.id = ss.edition_id
    WHERE ss.id = p_session_id LIMIT 1;

  IF v_n_from_cfg IS NOT NULL THEN
    v_n := v_n_from_cfg;
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
  --    elle-même la finale (kind='finale').
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

  -- 9. Audit row
  SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor;
  INSERT INTO public.admin_audit_log (
    actor_id, actor_email, action, target_kind, target_id, payload
  ) VALUES (
    v_actor,
    v_actor_email,
    'session_concluded',
    'session',
    p_session_id,
    jsonb_build_object(
      'edition_id',           v_edition_id,
      'club_id',              v_club_id,
      'kind',                 COALESCE(v_kind, 'qualifying'),
      'top_n',                v_n,
      'top_n_from',           CASE WHEN v_n_from_cfg IS NOT NULL THEN 'finale_config' ELSE 'finalists_per_session' END,
      'ranking',              v_ranking,
      'promoted',             v_promoted,
      'promoted_rows',        v_inserted
    )
  );
END;
$function$;

COMMENT ON FUNCTION public.rsa_publish_session(text) IS
  'V3 Vague 2B — "Conclure la session" : publie résultats + projette top-N en ' ||
  'finaliste + auto-promote top-N dans platform_finale_membership. Lit le top-N ' ||
  'depuis editions.finale_config.promote_top_n (priorité) puis editions.finalists_per_session.';

COMMIT;
