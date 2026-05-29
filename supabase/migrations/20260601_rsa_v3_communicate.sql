-- ============================================================================
-- V3.0 — Vague 2 · Feature B : CTA "Communiquer" pré-câblé
-- ============================================================================
-- Décision verrouillée (V3 Vague 2) : on n'envoie PAS d'auto-email sur les
-- décisions individuelles de sélection (rejete/eligible) ni post-jury. À la
-- place, le master_admin / club_admin clique sur "Communiquer" à la fin du
-- workflow et choisit l'une des deux actions pré-câblées :
--
--   1. "Remercier les non-sélectionnés" → targets startups whose status is in
--      ('rejete', 'liste_attente', 'note') — i.e. recalés au niveau Espace
--      Sélection (rejete / liste_attente) ou notés lors d'une session jury sans
--      atteindre les TOP-N finalistes (note).
--   2. "Annoncer aux sélectionnés"     → targets startups whose status is in
--      ('affecte', 'finaliste', 'laureat') — i.e. à minima retenu·e·s pour
--      une session jury, jusqu'aux lauréat·e·s.
--
-- Implémentation : on réutilise l'edge function send-bulk déjà en place — pas
-- d'outbox ni de cron. La RPC `rsa_communicate_audience` :
--   - autorise (master_admin OU club_admin du club_id si fourni)
--   - liste les destinataires côté serveur (SETOF email, full_name)
--   - en dry-run : retourne { count, sample[] } (les 5 premiers emails)
--   - en mode normal : laisse l'edge function envoyer (le UI appelle
--     send-bulk après avoir validé le dry-run ; la RPC peut être consommée
--     standalone pour les dashboards / tests).
--
-- L'audit log se fait côté send-bulk (table email_sends, migration M9). Cette
-- RPC ne duplique pas la table : elle est strictement orientée "résoudre la
-- liste" + "guardrails business" (statut autorisé / kind valide).
--
-- Référence : plan V3 Vague 2, décision B (locked 2026-06).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Constantes business — quels statuts dans chaque audience kind
-- ----------------------------------------------------------------------------
-- On les inline dans la RPC (pas de table de mapping) : c'est volontairement
-- figé côté code pour que toute évolution passe par une nouvelle migration et
-- soit traçable. Mirror de la décision B :
--
--   unselected → status IN ('rejete', 'liste_attente', 'note')
--   selected   → status IN ('affecte', 'finaliste', 'laureat')

-- ----------------------------------------------------------------------------
-- 2. RPC rsa_communicate_audience(p_edition_id, p_audience_kind, p_subject,
--                                  p_html, p_dry_run, p_club_id)
-- ----------------------------------------------------------------------------
-- p_club_id est optionnel : NULL = scope master (toutes éditions, toutes
-- clubs) ; sinon on restreint aux startups du club.
--
-- En dry-run : return jsonb { count: int, sample: text[] } (jusqu'à 5 emails).
-- En mode normal : return jsonb { count: int, sample: text[] } AUSSI — la RPC
-- ne fait QUE résoudre, elle ne déclenche pas le send (le UI orchestre :
-- 1. dry-run RPC → 2. send-bulk avec audience_type='communicate_unselected'
-- ou 'communicate_selected', avec audience_filter { edition_id, club_id? }).
--
-- On peut aussi appeler send-bulk avec audience_type='club_candidates' +
-- statuses=[...] mais on garde une RPC séparée pour la SOURCE DE VÉRITÉ de la
-- décision business (quels statuts = "non-sélectionnés").
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_communicate_audience(
  p_edition_id    text,
  p_audience_kind text,
  p_subject       text DEFAULT NULL,
  p_html          text DEFAULT NULL,
  p_dry_run       boolean DEFAULT true,
  p_club_id       text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_statuses text[];
  v_count    integer := 0;
  v_sample   text[];
BEGIN
  -- ── Validation des entrées ────────────────────────────────────────────────
  IF p_edition_id IS NULL OR length(trim(p_edition_id)) = 0 THEN
    RAISE EXCEPTION 'p_edition_id requis.' USING ERRCODE = '22023';
  END IF;
  IF p_audience_kind NOT IN ('unselected', 'selected') THEN
    RAISE EXCEPTION 'p_audience_kind doit être ''unselected'' ou ''selected''.'
      USING ERRCODE = '22023';
  END IF;

  -- ── Autorisation ─────────────────────────────────────────────────────────
  -- Master scope : master_admin only.
  -- Club scope   : master_admin OR club_admin du club_id donné.
  IF p_club_id IS NULL THEN
    IF NOT public.is_master_admin() THEN
      RAISE EXCEPTION 'Seul un master_admin peut communiquer en scope global.'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT (
      public.is_master_admin()
      OR public.is_club_member(p_club_id, 'club_admin')
    ) THEN
      RAISE EXCEPTION 'Accès refusé pour le club %.', p_club_id
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- ── Mapping kind → statuts ───────────────────────────────────────────────
  IF p_audience_kind = 'unselected' THEN
    v_statuses := ARRAY['rejete', 'liste_attente', 'note'];
  ELSE
    v_statuses := ARRAY['affecte', 'finaliste', 'laureat'];
  END IF;

  -- ── Résolution ───────────────────────────────────────────────────────────
  -- DISTINCT lower(email) (canonicalisation) + filter NULL/empty.
  WITH targets AS (
    SELECT DISTINCT lower(s.email) AS email
    FROM public.startups s
    WHERE s.edition_id = p_edition_id
      AND s.status = ANY(v_statuses)
      AND s.email IS NOT NULL
      AND length(trim(s.email)) > 0
      AND (p_club_id IS NULL OR s.club_id = p_club_id)
  )
  SELECT
    count(*)::integer,
    (SELECT array_agg(email ORDER BY email)
     FROM (SELECT email FROM targets ORDER BY email LIMIT 5) t5)
  INTO v_count, v_sample
  FROM targets;

  IF v_sample IS NULL THEN
    v_sample := ARRAY[]::text[];
  END IF;

  -- ── Réponse ──────────────────────────────────────────────────────────────
  -- Toujours { count, sample } — peu importe dry-run vs normal. Le UI utilise
  -- ces deux champs pour confirmer avant d'appeler send-bulk.
  --
  -- Sujet/html sont passés en paramètres pour permettre un futur enrichissement
  -- côté serveur (templating, validation) — pour V3.0 on ne fait que les
  -- valider mollement (présence si non dry_run).
  IF NOT p_dry_run THEN
    IF p_subject IS NULL OR length(trim(p_subject)) = 0 THEN
      RAISE EXCEPTION 'p_subject requis en mode envoi.' USING ERRCODE = '22023';
    END IF;
    IF p_html IS NULL OR length(trim(p_html)) = 0 THEN
      RAISE EXCEPTION 'p_html requis en mode envoi.' USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'count',         v_count,
    'sample',        coalesce(to_jsonb(v_sample), '[]'::jsonb),
    'audience_kind', p_audience_kind,
    'edition_id',    p_edition_id,
    'club_id',       p_club_id,
    'statuses',      to_jsonb(v_statuses),
    'dry_run',       p_dry_run
  );
END;
$$;

COMMENT ON FUNCTION public.rsa_communicate_audience(text, text, text, text, boolean, text) IS
  'V3 Vague 2 — résout l''audience d''un CTA Communiquer (unselected / selected) pour une compétition (+ club optionnel). Décision business des statuts inlined.';

GRANT EXECUTE ON FUNCTION public.rsa_communicate_audience(text, text, text, text, boolean, text)
  TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Extension de rsa_resolve_audience pour 2 nouveaux types
-- ----------------------------------------------------------------------------
-- On élargit la SSOT d'audience résolution (utilisée par send-bulk) pour
-- supporter :
--   - 'communicate_unselected' : filter { edition_id, club_id? }
--   - 'communicate_selected'   : filter { edition_id, club_id? }
--
-- Cela permet au UI de réutiliser send-bulk SANS dupliquer la logique métier
-- (un seul endpoint d'envoi). La fonction reste SECURITY DEFINER, mêmes
-- guardrails d'autorisation que pour les types existants.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_resolve_audience(
  p_audience_type   text,
  p_audience_filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(email text, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_club_id     text;
  v_session_id  text;
  v_edition_id  text;
  v_statuses    text[];
  v_email       text;
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

  -- ── single_email ────────────────────────────────────────────────────────
  IF p_audience_type = 'single_email' THEN
    v_email := lower(trim(coalesce(p_audience_filter ->> 'email', '')));
    IF v_email = '' OR v_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' THEN
      RAISE EXCEPTION 'Email invalide.' USING ERRCODE = '22023';
    END IF;
    RETURN QUERY SELECT v_email, NULL::text;
    RETURN;
  END IF;

  -- ── club-scoped types ──────────────────────────────────────────────────
  IF p_audience_type IN ('club_candidates','club_finalists','club_jurys','club_comite','club_admins') THEN
    IF v_club_id IS NULL THEN
      RAISE EXCEPTION 'club_id requis pour %.', p_audience_type USING ERRCODE = '22023';
    END IF;
    IF NOT (public.is_master_admin() OR public.is_club_member(v_club_id, 'club_admin')) THEN
      RAISE EXCEPTION 'Accès refusé pour le club %.', v_club_id USING ERRCODE = '42501';
    END IF;
  END IF;

  -- ── session-scoped types ───────────────────────────────────────────────
  IF p_audience_type IN ('session_jurys','session_candidates') THEN
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

  -- ── master-only types ──────────────────────────────────────────────────
  IF p_audience_type = 'all_finalists_edition' THEN
    IF NOT public.is_master_admin() THEN
      RAISE EXCEPTION 'Seul un master_admin peut résoudre %.', p_audience_type USING ERRCODE = '42501';
    END IF;
    IF v_edition_id IS NULL THEN
      RAISE EXCEPTION 'edition_id requis pour %.', p_audience_type USING ERRCODE = '22023';
    END IF;
  END IF;

  -- ── V3 Vague 2 — communicate_* types ───────────────────────────────────
  -- edition_id requis. club_id optionnel : si fourni, master_admin OR
  -- club_admin du club. Si NULL, master_admin only.
  IF p_audience_type IN ('communicate_unselected', 'communicate_selected') THEN
    IF v_edition_id IS NULL THEN
      RAISE EXCEPTION 'edition_id requis pour %.', p_audience_type USING ERRCODE = '22023';
    END IF;
    IF v_club_id IS NULL THEN
      IF NOT public.is_master_admin() THEN
        RAISE EXCEPTION 'Seul un master_admin peut résoudre % en scope global.', p_audience_type
          USING ERRCODE = '42501';
      END IF;
    ELSE
      IF NOT (public.is_master_admin() OR public.is_club_member(v_club_id, 'club_admin')) THEN
        RAISE EXCEPTION 'Accès refusé pour le club %.', v_club_id USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  -- ── résolution effective ───────────────────────────────────────────────
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

  ELSIF p_audience_type = 'all_finalists_edition' THEN
    RETURN QUERY
      SELECT DISTINCT lower(s.email) AS email,
             coalesce(s.contact_person, s.name) AS full_name
      FROM public.startups s
      WHERE s.edition_id = v_edition_id
        AND s.status = 'finaliste'
        AND s.email IS NOT NULL;

  ELSIF p_audience_type = 'communicate_unselected' THEN
    RETURN QUERY
      SELECT DISTINCT lower(s.email) AS email,
             coalesce(s.contact_person, s.name) AS full_name
      FROM public.startups s
      WHERE s.edition_id = v_edition_id
        AND s.status IN ('rejete', 'liste_attente', 'note')
        AND s.email IS NOT NULL
        AND (v_club_id IS NULL OR s.club_id = v_club_id);

  ELSIF p_audience_type = 'communicate_selected' THEN
    RETURN QUERY
      SELECT DISTINCT lower(s.email) AS email,
             coalesce(s.contact_person, s.name) AS full_name
      FROM public.startups s
      WHERE s.edition_id = v_edition_id
        AND s.status IN ('affecte', 'finaliste', 'laureat')
        AND s.email IS NOT NULL
        AND (v_club_id IS NULL OR s.club_id = v_club_id);

  ELSE
    RAISE EXCEPTION 'Type d''audience inconnu : %.', p_audience_type USING ERRCODE = '22023';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.rsa_resolve_audience(text, jsonb) IS
  'M9 + V3 Vague 2 : résout une segmentation en SETOF (email, full_name). Inclut communicate_unselected/selected pour le CTA Communiquer.';

GRANT EXECUTE ON FUNCTION public.rsa_resolve_audience(text, jsonb) TO authenticated;

COMMIT;
