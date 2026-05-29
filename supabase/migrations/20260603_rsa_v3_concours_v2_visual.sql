-- ============================================================================
-- V3 — Concours dashboard v2 : couleur thématique + winner inline + gating
-- ============================================================================
-- Refonte visuelle 360 de la page /Concours. Cette migration enrichit les deux
-- RPC publiques (auth only) ajoutées en V2.5 :
--
--   1. Ajoute la colonne `session_config.theme_color text NULL` — override admin
--      de la couleur thématique (mix auto + override : si NULL, le front pioche
--      dans un pool de 8 couleurs via hash de session.id).
--   2. Étend `rsa_concours_edition_overview` :
--        - chaque session.config gagne `theme_color`
--        - chaque session.config gagne `winner` (jsonb { startup_name, score })
--          dérivé du final_ranking[0] SI status='published', sinon null
--        - exposé pour rendre la mini-récap card du Concours sans round-trip
--   3. Étend `rsa_concours_session_detail` :
--        - config.theme_color
--        - config.final_ranking exposé UNIQUEMENT si status='published'
--          (avant : exposé pour tout statut — léger leak des bouchons admin
--          quand la session est lockée mais pas encore publiée)
--
-- Sécurité : aucune nouvelle donnée sensible. theme_color = hex public ;
-- final_ranking déjà accessible aux jurés via /RsaScore (legacy), on resserre
-- juste le gating à published uniquement sur le dashboard public.
--
-- Référence :
--   - docs/blueprints/concours-v2-redesign.md
--   - docs/design/concours-v2-color-mapping.md
--   - docs/hardening/concours-v2-rls-audit.md
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. session_config.theme_color (override admin)
-- ----------------------------------------------------------------------------
-- Hex couleur (#RRGGBB) que le master_admin ou competition_admin peut poser
-- depuis la SessionsTab du CompetitionEditView pour figer une teinte par
-- session. NULL = couleur dérivée par le front (palette tournante).

ALTER TABLE public.session_config
  ADD COLUMN IF NOT EXISTS theme_color text NULL;

COMMENT ON COLUMN public.session_config.theme_color IS
  'V3 Concours v2 : override couleur thématique session (hex #RRGGBB). NULL => couleur dérivée par le front via hash(session.id) sur pool 8 couleurs.';

-- Léger garde-fou : si défini, doit être un hex valide. CHECK soft (pas FAIL
-- en cas de bug front, juste docs).
ALTER TABLE public.session_config
  DROP CONSTRAINT IF EXISTS session_config_theme_color_format;
ALTER TABLE public.session_config
  ADD CONSTRAINT session_config_theme_color_format
  CHECK (theme_color IS NULL OR theme_color ~* '^#[0-9a-f]{6}$');

-- ----------------------------------------------------------------------------
-- 2. rsa_concours_edition_overview — v2 (theme_color + winner inline)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rsa_concours_edition_overview(p_edition_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_edition jsonb;
  v_clubs jsonb;
  v_sessions_by_club jsonb;
  v_finale_sessions jsonb;
  v_startups_by_club jsonb;
  v_startups_by_session jsonb;
  v_jurors_by_session jsonb;
  v_finalists_by_source jsonb;
  v_finalists jsonb;
  v_finalists_count int;
  v_prizes jsonb;
BEGIN
  IF p_edition_id IS NULL OR length(trim(p_edition_id)) = 0 THEN
    RAISE EXCEPTION 'p_edition_id ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication requise pour consulter le dashboard.'
      USING ERRCODE = '42501';
  END IF;

  SELECT to_jsonb(e) - 'eligibility_rules' INTO v_edition
    FROM public.editions e
   WHERE e.id = p_edition_id;

  IF v_edition IS NULL THEN
    RETURN jsonb_build_object(
      'edition', NULL,
      'clubs', '[]'::jsonb,
      'sessions_by_club', '{}'::jsonb,
      'finale_sessions', '[]'::jsonb,
      'startups_by_club', '{}'::jsonb,
      'startups_by_session', '{}'::jsonb,
      'jurors_by_session', '{}'::jsonb,
      'finalists_by_source_session', '{}'::jsonb,
      'finalists', '[]'::jsonb,
      'finalists_count', 0,
      'prizes', '[]'::jsonb
    );
  END IF;

  SELECT coalesce(jsonb_agg(
           jsonb_build_object(
             'id', c.id,
             'name', c.name,
             'country', c.country,
             'language', c.language,
             'attachment', jsonb_build_object(
               'attached_at', ec.attached_at,
               'has_overrides', (ec.eligibility_rules <> '{}'::jsonb)
             )
           )
           ORDER BY c.name
         ), '[]'::jsonb)
    INTO v_clubs
    FROM public.edition_clubs ec
    JOIN public.clubs c ON c.id = ec.club_id
   WHERE ec.edition_id = p_edition_id;

  -- ── Sessions par club (qualifying) — enrichies V3 : theme_color + winner ──
  -- winner extrait de cfg.final_ranking[0] uniquement quand published.
  WITH s AS (
    SELECT
      sess.id,
      sess.club_id,
      jsonb_build_object(
        'id', sess.id,
        'edition_id', sess.edition_id,
        'club_id', sess.club_id,
        'name', sess.name,
        'theme', sess.theme,
        'kind', sess.kind,
        'session_date', sess.session_date,
        'position', sess.position,
        'config', jsonb_build_object(
          'status', cfg.status,
          'jury_pack_path', cfg.jury_pack_path,
          'theme_color', cfg.theme_color,
          'winner', CASE
            WHEN cfg.status = 'published'
             AND jsonb_typeof(cfg.final_ranking) = 'array'
             AND jsonb_array_length(cfg.final_ranking) > 0
            THEN jsonb_build_object(
              'startup_name', cfg.final_ranking->0->>'startup_name',
              'final_score', cfg.final_ranking->0->'final_score',
              'juror_count', cfg.final_ranking->0->'juror_count'
            )
            ELSE NULL
          END
        )
      ) AS row
    FROM public.sessions sess
    LEFT JOIN public.session_config cfg ON cfg.session_id = sess.id
    WHERE sess.edition_id = p_edition_id
      AND sess.kind = 'qualifying'
      AND sess.club_id IS NOT NULL
    ORDER BY sess.position, sess.session_date
  )
  SELECT coalesce(jsonb_object_agg(club_id, sess_arr), '{}'::jsonb)
    INTO v_sessions_by_club
    FROM (
      SELECT s.club_id, jsonb_agg(s.row ORDER BY (s.row->>'position')::int, s.row->>'session_date') AS sess_arr
        FROM s
       GROUP BY s.club_id
    ) g;

  -- ── Finale fédérée (kind='finale' AND club_id IS NULL) ─ enrichie V3 ─
  SELECT coalesce(jsonb_agg(
           jsonb_build_object(
             'id', sess.id,
             'edition_id', sess.edition_id,
             'club_id', sess.club_id,
             'name', sess.name,
             'theme', sess.theme,
             'kind', sess.kind,
             'session_date', sess.session_date,
             'position', sess.position,
             'config', jsonb_build_object(
               'status', cfg.status,
               'jury_pack_path', cfg.jury_pack_path,
               'theme_color', cfg.theme_color,
               'winner', CASE
                 WHEN cfg.status = 'published'
                  AND jsonb_typeof(cfg.final_ranking) = 'array'
                  AND jsonb_array_length(cfg.final_ranking) > 0
                 THEN jsonb_build_object(
                   'startup_name', cfg.final_ranking->0->>'startup_name',
                   'final_score', cfg.final_ranking->0->'final_score',
                   'juror_count', cfg.final_ranking->0->'juror_count'
                 )
                 ELSE NULL
               END
             )
           )
           ORDER BY sess.session_date
         ), '[]'::jsonb)
    INTO v_finale_sessions
    FROM public.sessions sess
    LEFT JOIN public.session_config cfg ON cfg.session_id = sess.id
   WHERE sess.edition_id = p_edition_id
     AND sess.kind = 'finale'
     AND sess.club_id IS NULL;

  SELECT coalesce(jsonb_object_agg(club_id, n), '{}'::jsonb)
    INTO v_startups_by_club
    FROM (
      SELECT s.club_id, count(*)::int AS n
        FROM public.startups s
       WHERE s.edition_id = p_edition_id
         AND s.club_id IS NOT NULL
       GROUP BY s.club_id
    ) g;

  SELECT coalesce(jsonb_object_agg(session_id, n), '{}'::jsonb)
    INTO v_startups_by_session
    FROM (
      SELECT s.session_id, count(*)::int AS n
        FROM public.startups s
       WHERE s.edition_id = p_edition_id
         AND s.session_id IS NOT NULL
       GROUP BY s.session_id
    ) g;

  SELECT coalesce(jsonb_object_agg(session_id, n), '{}'::jsonb)
    INTO v_jurors_by_session
    FROM (
      SELECT pja.session_id, count(DISTINCT pja.jury_user_id)::int AS n
        FROM public.platform_jury_assignments pja
        JOIN public.sessions sess ON sess.id = pja.session_id
       WHERE sess.edition_id = p_edition_id
       GROUP BY pja.session_id
    ) g;

  SELECT coalesce(jsonb_object_agg(session_id, finalist_obj), '{}'::jsonb)
    INTO v_finalists_by_source
    FROM (
      SELECT s.session_id,
             jsonb_build_object(
               'startup_name', s.name,
               'status', s.status
             ) AS finalist_obj
        FROM public.startups s
       WHERE s.edition_id = p_edition_id
         AND s.status IN ('finaliste', 'laureat')
         AND s.session_id IS NOT NULL
    ) g;

  -- ── Liste finaliste(s) à plat — enrichie V3 avec source_session_theme_color
  --     pour que le front colore la chip avec la session source.
  SELECT coalesce(jsonb_agg(
           jsonb_build_object(
             'startup_name', s.name,
             'source_session_id', s.session_id,
             'source_session_name', sess.name,
             'source_session_theme_color', cfg.theme_color
           )
           ORDER BY s.name
         ), '[]'::jsonb)
    INTO v_finalists
    FROM public.startups s
    LEFT JOIN public.sessions sess ON sess.id = s.session_id
    LEFT JOIN public.session_config cfg ON cfg.session_id = s.session_id
   WHERE s.edition_id = p_edition_id
     AND s.status IN ('finaliste', 'laureat');

  SELECT count(*)::int
    INTO v_finalists_count
    FROM public.startups s
   WHERE s.edition_id = p_edition_id
     AND s.status IN ('finaliste', 'laureat');

  SELECT coalesce(jsonb_agg(
           jsonb_build_object(
             'id', p.id,
             'club_id', p.club_id,
             'session_id', p.session_id,
             'kind', p.kind,
             'name', p.name,
             'amount', p.amount,
             'currency', p.currency,
             'awarded_to', p.awarded_to,
             'awarded_at', p.awarded_at
           )
           ORDER BY p.position, p.created_at
         ), '[]'::jsonb)
    INTO v_prizes
    FROM public.prizes p
   WHERE p.edition_id = p_edition_id;

  RETURN jsonb_build_object(
    'edition', v_edition,
    'clubs', v_clubs,
    'sessions_by_club', v_sessions_by_club,
    'finale_sessions', v_finale_sessions,
    'startups_by_club', v_startups_by_club,
    'startups_by_session', v_startups_by_session,
    'jurors_by_session', v_jurors_by_session,
    'finalists_by_source_session', v_finalists_by_source,
    'finalists', v_finalists,
    'finalists_count', v_finalists_count,
    'prizes', v_prizes
  );
END;
$$;

COMMENT ON FUNCTION public.rsa_concours_edition_overview(text) IS
  'V3 Concours v2 : overview agrégé d''une édition pour la page publique /Concours. Authenticated only. Chaque session.config inclut theme_color (override admin) et winner inline (si status=published). Ne fuit aucune donnée sensible.';

REVOKE ALL ON FUNCTION public.rsa_concours_edition_overview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rsa_concours_edition_overview(text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. rsa_concours_session_detail — v2 (theme_color + final_ranking gated)
-- ----------------------------------------------------------------------------
-- Avant : final_ranking exposé indépendamment du statut.
-- Après : final_ranking exposé UNIQUEMENT si status='published'.

CREATE OR REPLACE FUNCTION public.rsa_concours_session_detail(p_session_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_session jsonb;
  v_config jsonb;
  v_startups jsonb;
  v_jurors jsonb;
  v_status text;
BEGIN
  IF p_session_id IS NULL OR length(trim(p_session_id)) = 0 THEN
    RAISE EXCEPTION 'p_session_id ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication requise pour consulter le détail de session.'
      USING ERRCODE = '42501';
  END IF;

  SELECT to_jsonb(sess) INTO v_session
    FROM public.sessions sess
   WHERE sess.id = p_session_id;

  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Session % introuvable.', p_session_id USING ERRCODE = '23503';
  END IF;

  -- Config — gating final_ranking sur status='published'.
  SELECT cfg.status INTO v_status
    FROM public.session_config cfg
   WHERE cfg.session_id = p_session_id;

  SELECT jsonb_build_object(
           'status', cfg.status,
           'jury_pack_path', cfg.jury_pack_path,
           'theme_color', cfg.theme_color,
           'session_order', cfg.session_order,
           'final_ranking', CASE
             WHEN cfg.status = 'published' THEN cfg.final_ranking
             ELSE NULL
           END
         )
    INTO v_config
    FROM public.session_config cfg
   WHERE cfg.session_id = p_session_id;

  SELECT coalesce(jsonb_agg(
           jsonb_build_object(
             'id', s.id,
             'name', s.name,
             'status', s.status,
             'pitch_deck_path', s.pitch_deck_path,
             'exec_summary_path', s.exec_summary_path,
             'sectors', s.sectors
           )
           ORDER BY s.name
         ), '[]'::jsonb)
    INTO v_startups
    FROM public.startups s
   WHERE s.session_id = p_session_id;

  SELECT coalesce(jsonb_agg(
           jsonb_build_object(
             'user_id', pja.jury_user_id,
             'full_name', p.full_name,
             'qualite', pjp.qualite,
             'organisation', pjp.organisation,
             'photo_path', pjp.photo_path
           )
           ORDER BY coalesce(p.full_name, '')
         ), '[]'::jsonb)
    INTO v_jurors
    FROM public.platform_jury_assignments pja
    LEFT JOIN public.profiles p ON p.id = pja.jury_user_id
    LEFT JOIN public.platform_jury_profiles pjp ON pjp.user_id = pja.jury_user_id
   WHERE pja.session_id = p_session_id;

  RETURN jsonb_build_object(
    'session', v_session,
    'config', coalesce(v_config, '{}'::jsonb),
    'startups', v_startups,
    'jurors', v_jurors
  );
END;
$$;

COMMENT ON FUNCTION public.rsa_concours_session_detail(text) IS
  'V3 Concours v2 : détail agrégé d''une session pour le drawer de la page /Concours. Authenticated only. final_ranking gaté sur status=published. theme_color exposé.';

REVOKE ALL ON FUNCTION public.rsa_concours_session_detail(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rsa_concours_session_detail(text) TO authenticated;

COMMIT;
