-- ============================================================================
-- V2.5 — Dashboard public du concours (page /Concours)
-- ============================================================================
-- Pivot 2026-05-31 : la page /Concours est une vitrine éditoriale ouverte à
-- tout utilisateur authentifié (jury, comité, club_admin, master_admin,
-- candidat). Elle reconstitue en un coup d'œil l'état d'une compétition :
-- clubs participants, sessions par club + leur statut/comptage jurés/comptage
-- startups/finaliste, et la section Grande Finale fédérée.
--
-- Cette migration est ADDITIVE (uniquement lecture) :
--   - Crée 2 RPC SECURITY DEFINER (`rsa_concours_edition_overview`,
--     `rsa_concours_session_detail`) qui renvoient du jsonb agrégé.
--   - GRANT EXECUTE aux rôles `authenticated` (anon explicitement exclu :
--     même si la page est en lecture seule, on tient à conserver la barrière
--     magic-link pour les vues détaillées).
--   - N'ajoute AUCUNE table, AUCUNE policy, AUCUN trigger : la frontière de
--     sécurité reste la RLS existante. Les RPC ne lisent que des colonnes
--     non-sensibles (pas de email perso, pas de owner_id, pas de scores
--     individuels, pas de qualité jurée hors profil affiché).
--
-- Référence :
--   - project_rsa_v25_user_management.md §"Dashboard public du concours"
--   - src/pages/RsaJuryHub.jsx (pattern legacy V1)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. rsa_concours_edition_overview : tout-en-un pour rendre la page /Concours
-- ----------------------------------------------------------------------------
-- Renvoie un jsonb de la forme :
-- {
--   "edition": { ...editions row sans colonnes sensibles },
--   "clubs":   [ { id, name, country, language, ...attachment } ],
--   "sessions_by_club": { "<club_id>": [ { id, name, theme, kind, session_date,
--                          position, club_id, config: { status,
--                          jury_pack_path, final_ranking } } ] },
--   "finale_sessions": [ ... ],   -- sessions kind='finale' AND club_id IS NULL
--   "startups_by_club": { "<club_id>": <count> },
--   "startups_by_session": { "<session_id>": <count> },
--   "jurors_by_session":   { "<session_id>": <count of distinct jury_user_id> },
--   "finalists_by_source_session": { "<session_id>": { startup_name } },
--   "finalists":           [ { startup_name, source_session_id, source_session_name } ],
--   "finalists_count":     <int>,
--   "prizes":              [ ... ]
-- }
--
-- Accès : authenticated only. RLS sous-jacente :
--   - editions / sessions / clubs / edition_clubs / prizes : SELECT public
--   - startups : SELECT visible aux candidats sur leur propre dossier + staff ;
--     mais on n'expose ici que des AGRÉGATS (count + nom du finaliste publié) —
--     pas de donnée individuelle de candidature.
--   - platform_jury_assignments : SELECT staff/jury/admin ; on aggrege par
--     session_id et on ne renvoie que des counts (jamais d'identifiants jurés).

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

  -- Garde-fou : un appelant doit être authentifié. anon est rejeté.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication requise pour consulter le dashboard.'
      USING ERRCODE = '42501';
  END IF;

  -- ── Edition (champs publics uniquement) ────────────────────────────────────
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

  -- ── Clubs rattachés à la compétition ───────────────────────────────────────
  SELECT coalesce(jsonb_agg(
           jsonb_build_object(
             'id', c.id,
             'name', c.name,
             'country', c.country,
             'language', c.language,
             'attachment', jsonb_build_object(
               'attached_at', ec.attached_at,
               -- on n'expose PAS eligibility_rules (interne admin)
               'has_overrides', (ec.eligibility_rules <> '{}'::jsonb)
             )
           )
           ORDER BY c.name
         ), '[]'::jsonb)
    INTO v_clubs
    FROM public.edition_clubs ec
    JOIN public.clubs c ON c.id = ec.club_id
   WHERE ec.edition_id = p_edition_id;

  -- ── Sessions par club (qualifying) ─────────────────────────────────────────
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
          'jury_pack_path', cfg.jury_pack_path
          -- final_ranking volontairement exclu (poids lourd ; le drawer le
          -- lit séparément si besoin via rsa_concours_session_detail).
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

  -- ── Finale fédérée (kind='finale' AND club_id IS NULL) ─────────────────────
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
               'jury_pack_path', cfg.jury_pack_path
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

  -- ── Counts startups par club ───────────────────────────────────────────────
  SELECT coalesce(jsonb_object_agg(club_id, n), '{}'::jsonb)
    INTO v_startups_by_club
    FROM (
      SELECT s.club_id, count(*)::int AS n
        FROM public.startups s
       WHERE s.edition_id = p_edition_id
         AND s.club_id IS NOT NULL
       GROUP BY s.club_id
    ) g;

  -- ── Counts startups par session ────────────────────────────────────────────
  SELECT coalesce(jsonb_object_agg(session_id, n), '{}'::jsonb)
    INTO v_startups_by_session
    FROM (
      SELECT s.session_id, count(*)::int AS n
        FROM public.startups s
       WHERE s.edition_id = p_edition_id
         AND s.session_id IS NOT NULL
       GROUP BY s.session_id
    ) g;

  -- ── Counts jurés (distincts) par session ───────────────────────────────────
  -- On lit platform_jury_assignments en bypass RLS (SECURITY DEFINER) ; on ne
  -- renvoie QUE le count (jamais les jury_user_id) → pas de fuite d'identité.
  SELECT coalesce(jsonb_object_agg(session_id, n), '{}'::jsonb)
    INTO v_jurors_by_session
    FROM (
      SELECT pja.session_id, count(DISTINCT pja.jury_user_id)::int AS n
        FROM public.platform_jury_assignments pja
        JOIN public.sessions sess ON sess.id = pja.session_id
       WHERE sess.edition_id = p_edition_id
       GROUP BY pja.session_id
    ) g;

  -- ── Finalistes par source session (juste le nom de la startup) ─────────────
  -- Critère : startup.status IN ('finaliste','laureat') AND session_id donnée.
  -- On expose le NOM uniquement (pas owner_id, pas email).
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

  -- ── Liste finaliste(s) à plat (pour la section Grande Finale) ──────────────
  SELECT coalesce(jsonb_agg(
           jsonb_build_object(
             'startup_name', s.name,
             'source_session_id', s.session_id,
             'source_session_name', sess.name
           )
           ORDER BY s.name
         ), '[]'::jsonb)
    INTO v_finalists
    FROM public.startups s
    LEFT JOIN public.sessions sess ON sess.id = s.session_id
   WHERE s.edition_id = p_edition_id
     AND s.status IN ('finaliste', 'laureat');

  -- ── Count finalistes ───────────────────────────────────────────────────────
  SELECT count(*)::int
    INTO v_finalists_count
    FROM public.startups s
   WHERE s.edition_id = p_edition_id
     AND s.status IN ('finaliste', 'laureat');

  -- ── Prix de la compétition (palmarès en cours / définitif) ─────────────────
  -- prizes a SELECT public, on peut tout exposer (name, amount, currency,
  -- club_id, session_id, awarded_to). Aucune donnée sensible.
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
  'V2.5 : agrège l''état d''une compétition pour la page publique /Concours. Authenticated only. Renvoie un jsonb (clubs, sessions par club, counts startups/jurés, finalistes, prix). Ne fuit aucune donnée sensible (pas d''email, owner_id, scores individuels).';

REVOKE ALL ON FUNCTION public.rsa_concours_edition_overview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rsa_concours_edition_overview(text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. rsa_concours_session_detail : détail d'une session pour le drawer
-- ----------------------------------------------------------------------------
-- Renvoie :
-- {
--   "session": { ...sessions row },
--   "config":  { status, jury_pack_path, final_ranking, session_order },
--   "startups": [ { id, name, status, pitch_deck_path, exec_summary_path } ],
--   "jurors":   [ { user_id, full_name, qualite, organisation, photo_path } ]
-- }
--
-- Pour les startups : on expose name + status + chemins documents (les chemins
-- restent des paths bucket "uploads" ; l'URL publique elle-même est résolue
-- côté client via supabase.storage.getPublicUrl — c'est déjà le pattern du
-- legacy V1 JuryHub).
-- Pour les jurés : on expose nom (profiles.full_name) + qualité + organisation
-- + photo (= ce qu'un juré voit déjà aujourd'hui dans LiveTab via le popover
-- co-jurys). On n'expose JAMAIS l'email.

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
BEGIN
  IF p_session_id IS NULL OR length(trim(p_session_id)) = 0 THEN
    RAISE EXCEPTION 'p_session_id ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication requise pour consulter le détail de session.'
      USING ERRCODE = '42501';
  END IF;

  -- ── Session ────────────────────────────────────────────────────────────────
  SELECT to_jsonb(sess) INTO v_session
    FROM public.sessions sess
   WHERE sess.id = p_session_id;

  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Session % introuvable.', p_session_id USING ERRCODE = '23503';
  END IF;

  -- ── Config (status, jury_pack_path, etc.) ──────────────────────────────────
  SELECT jsonb_build_object(
           'status', cfg.status,
           'jury_pack_path', cfg.jury_pack_path,
           'session_order', cfg.session_order,
           'final_ranking', cfg.final_ranking
         )
    INTO v_config
    FROM public.session_config cfg
   WHERE cfg.session_id = p_session_id;

  -- ── Startups (sans owner_id, sans email, sans téléphone) ───────────────────
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

  -- ── Jurés confirmés (assignment + profile + platform_jury_profile) ─────────
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
  'V2.5 : détail agrégé d''une session pour le drawer de la page publique /Concours. Authenticated only. Expose startups (nom, status, chemins documents) et jurés (nom, qualité, organisation, photo) sans aucune donnée sensible (pas d''email, owner_id, scores).';

REVOKE ALL ON FUNCTION public.rsa_concours_session_detail(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rsa_concours_session_detail(text) TO authenticated;

COMMIT;
