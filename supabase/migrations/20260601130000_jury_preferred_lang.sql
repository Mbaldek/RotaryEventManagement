-- ============================================================================
-- Task 9 — Langue de communication du juré (jury_applications.preferred_lang)
-- ============================================================================
-- Date : 2026-06-01
--
-- Ajoute la colonne preferred_lang à jury_applications (FR/EN/DE), parité avec
-- startups.preferred_lang (funnel candidat). Met à jour le RPC rsa_apply_jury
-- (SECURITY DEFINER, seul chemin d'insert du funnel jury public) pour accepter
-- et persister p_preferred_lang.
--
-- Le funnel public passe TOUJOURS par rsa_apply_jury : sans ce paramètre, la
-- valeur n'atteindrait jamais la ligne. On étend donc l'arité (11 → 12) en
-- DROP+CREATE, en reproduisant fidèlement le corps durci (rate-limit + lock).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Colonne preferred_lang
-- ----------------------------------------------------------------------------
ALTER TABLE public.jury_applications
  ADD COLUMN IF NOT EXISTS preferred_lang text NOT NULL DEFAULT 'fr';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'jury_applications_preferred_lang_check'
      AND conrelid = 'public.jury_applications'::regclass
  ) THEN
    ALTER TABLE public.jury_applications
      ADD CONSTRAINT jury_applications_preferred_lang_check
      CHECK (preferred_lang IN ('fr', 'en', 'de'));
  END IF;
END$$;

COMMENT ON COLUMN public.jury_applications.preferred_lang IS
  'Task 9 : langue de communication du juré (fr|en|de). Sert aux emails (invite/refus) et à l''UI espace juré.';

-- ----------------------------------------------------------------------------
-- 2. rsa_apply_jury — +p_preferred_lang (DROP+CREATE : l'arité passe de 11 à 12)
--    Corps reproduit fidèlement (rate-limit + lock serveur). Cf.
--    20260531_rsa_jury_role_title.sql §2.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.rsa_apply_jury(text, text, text, text, text, text, text, text, text, text[], text[]);

CREATE OR REPLACE FUNCTION public.rsa_apply_jury(
  p_club_id                  text,
  p_edition_id               text,
  p_email                    text,
  p_full_name                text,
  p_qualite                  text,
  p_organisation             text DEFAULT NULL,
  p_role_title               text DEFAULT NULL,
  p_bio                      text DEFAULT NULL,
  p_photo_path               text DEFAULT NULL,
  p_preferred_themes         text[] DEFAULT ARRAY[]::text[],
  p_availability_session_ids text[] DEFAULT ARRAY[]::text[],
  p_preferred_lang           text DEFAULT 'fr'
)
RETURNS public.jury_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_row public.jury_applications;
  v_email_n text;
  v_lang text;
  v_count_24h integer;
  v_rate_limit constant integer := 3;
BEGIN
  IF p_club_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.clubs WHERE id = p_club_id) THEN
    RAISE EXCEPTION 'Club % introuvable.', p_club_id USING ERRCODE = '23503';
  END IF;
  IF p_edition_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.editions WHERE id = p_edition_id) THEN
    RAISE EXCEPTION 'Compétition % introuvable.', p_edition_id USING ERRCODE = '23503';
  END IF;
  v_email_n := lower(trim(coalesce(p_email, '')));
  IF v_email_n = '' OR v_email_n !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' THEN
    RAISE EXCEPTION 'Email invalide.' USING ERRCODE = '22023';
  END IF;
  IF p_full_name IS NULL OR length(trim(p_full_name)) < 2 THEN
    RAISE EXCEPTION 'Nom complet requis.' USING ERRCODE = '22023';
  END IF;
  IF p_qualite NOT IN ('investisseur','entrepreneur','expert','corporate','autre') THEN
    RAISE EXCEPTION 'Qualité invalide : %.', p_qualite USING ERRCODE = '22023';
  END IF;
  IF coalesce(length(p_bio), 0) > 1000 THEN
    RAISE EXCEPTION 'Bio trop longue (max 1000).' USING ERRCODE = '22023';
  END IF;

  -- Langue de communication : fr|en|de, fallback 'fr' pour toute valeur hors liste.
  v_lang := lower(trim(coalesce(p_preferred_lang, 'fr')));
  IF v_lang NOT IN ('fr','en','de') THEN
    v_lang := 'fr';
  END IF;

  -- P1.3 : rate-limit (parité funnel candidat) — 3 candidatures / email / 24h, tous clubs/éditions.
  SELECT count(*) INTO v_count_24h
  FROM public.jury_applications
  WHERE lower(email) = v_email_n AND applied_at > now() - interval '24 hours';
  IF v_count_24h >= v_rate_limit THEN
    RAISE EXCEPTION 'rate_limit_exceeded' USING ERRCODE = '22023';
  END IF;

  -- Lock serveur : rejette une session dont la fenêtre d'inscription est fermée.
  IF p_availability_session_ids IS NOT NULL AND array_length(p_availability_session_ids, 1) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM unnest(p_availability_session_ids) AS u(sid)
      JOIN public.sessions s ON s.id = u.sid
      JOIN public.editions e ON e.id = s.edition_id
      WHERE s.session_date IS NOT NULL
        AND now()::date >= s.session_date - (CASE WHEN s.kind='finale' THEN e.finale_lock_days ELSE e.jury_lock_days END)
    ) THEN
      RAISE EXCEPTION 'Inscription fermée pour une session verrouillée.' USING ERRCODE = '22023';
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.jury_applications (
      club_id, edition_id, email, full_name, qualite, organisation, role_title, bio, photo_path,
      preferred_themes, availability_session_ids, preferred_lang
    ) VALUES (
      p_club_id, p_edition_id, v_email_n, trim(p_full_name), p_qualite,
      NULLIF(trim(coalesce(p_organisation,'')),''),
      NULLIF(trim(coalesce(p_role_title,'')),''),
      NULLIF(trim(coalesce(p_bio,'')),''), p_photo_path,
      coalesce(p_preferred_themes, ARRAY[]::text[]), coalesce(p_availability_session_ids, ARRAY[]::text[]),
      v_lang
    ) RETURNING * INTO v_row;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Candidature en attente déjà existante pour cette compétition/email.' USING ERRCODE = '23505';
  END;
  RETURN v_row;
END; $function$;

COMMENT ON FUNCTION public.rsa_apply_jury(text, text, text, text, text, text, text, text, text, text[], text[], text) IS
  'Funnel jury : soumission publique scopée compétition. +preferred_lang (langue de communication fr|en|de). Rate-limit 3/email/24h + lock serveur des sessions.';

GRANT EXECUTE ON FUNCTION public.rsa_apply_jury(text, text, text, text, text, text, text, text, text, text[], text[], text) TO anon, authenticated;

COMMIT;
