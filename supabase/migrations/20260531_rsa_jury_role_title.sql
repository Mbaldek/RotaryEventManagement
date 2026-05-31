-- ============================================================================
-- Jury — Fonction/Titre (métier réel) : nouvelle colonne role_title
-- ============================================================================
-- Date : 2026-05-31
-- Contexte : refonte du funnel /DevenirJury (JuryFunnel). On veut désormais
--   connaître le MÉTIER RÉEL du juré (fonction + entreprise), pas seulement la
--   "qualité" (catégorie investisseur/entrepreneur/expert/corporate/autre).
--   role_title = intitulé de poste libre (ex. « Directrice des investissements »).
--
-- Le funnel reste SCOPÉ par compétition (édition) ; le juré rejoint le jury de
-- la COMPÉTITION, pas d'un club — il déclare simplement son club organisateur
-- de rattachement (club_id, inchangé). Les jurés externes (non-Rotariens) sont
-- l'exception et sont saisis directement par l'admin (rsa_create_jury_profile).
--
-- Migration ADDITIVE / NULL-safe :
--   1. ADD COLUMN role_title text sur jury_applications + platform_jury_profiles
--   2. rsa_apply_jury : +p_role_title (DROP+CREATE — l'arité change) — on
--      PRÉSERVE le rate-limit 3/email/24h et le lock serveur des sessions.
--   3. rsa_approve_jury_application : reporte role_title dans platform_jury_profiles
--   4. rsa_create_jury_profile : +p_role_title (DROP+CREATE — l'arité change)
--
-- Réf : docs/blueprints/jury-application-funnel.md
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Colonnes role_title (nullable — l'obligation est côté client/funnel)
-- ----------------------------------------------------------------------------
ALTER TABLE public.jury_applications
  ADD COLUMN IF NOT EXISTS role_title text;
ALTER TABLE public.platform_jury_profiles
  ADD COLUMN IF NOT EXISTS role_title text;

COMMENT ON COLUMN public.jury_applications.role_title IS
  'Fonction/Titre — intitulé de poste réel du juré (ex. « Directrice des investissements »). Saisi par le funnel /DevenirJury.';
COMMENT ON COLUMN public.platform_jury_profiles.role_title IS
  'Fonction/Titre — intitulé de poste réel du juré, reporté depuis jury_applications à l''approbation (ou saisi via rsa_create_jury_profile).';

-- ----------------------------------------------------------------------------
-- 2. rsa_apply_jury — +p_role_title (DROP+CREATE : l'arité passe de 10 à 11)
--    On reproduit FIDÈLEMENT le corps durci en prod (rate-limit + lock serveur).
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.rsa_apply_jury(text, text, text, text, text, text, text, text, text[], text[]);

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
  p_availability_session_ids text[] DEFAULT ARRAY[]::text[]
)
RETURNS public.jury_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_row public.jury_applications;
  v_email_n text;
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
      preferred_themes, availability_session_ids
    ) VALUES (
      p_club_id, p_edition_id, v_email_n, trim(p_full_name), p_qualite,
      NULLIF(trim(coalesce(p_organisation,'')),''),
      NULLIF(trim(coalesce(p_role_title,'')),''),
      NULLIF(trim(coalesce(p_bio,'')),''), p_photo_path,
      coalesce(p_preferred_themes, ARRAY[]::text[]), coalesce(p_availability_session_ids, ARRAY[]::text[])
    ) RETURNING * INTO v_row;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Candidature en attente déjà existante pour cette compétition/email.' USING ERRCODE = '23505';
  END;
  RETURN v_row;
END; $function$;

COMMENT ON FUNCTION public.rsa_apply_jury(text, text, text, text, text, text, text, text, text, text[], text[]) IS
  'Funnel jury : soumission publique scopée compétition. +role_title (fonction/titre). Rate-limit 3/email/24h + lock serveur des sessions.';

GRANT EXECUTE ON FUNCTION public.rsa_apply_jury(text, text, text, text, text, text, text, text, text, text[], text[]) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. rsa_approve_jury_application — reporte role_title dans la fiche jury
--    (signature inchangée : CREATE OR REPLACE)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_approve_jury_application(p_application_id uuid)
RETURNS TABLE(application public.jury_applications, needs_auth_creation boolean, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE v_app public.jury_applications; v_user_id uuid;
BEGIN
  SELECT * INTO v_app FROM public.jury_applications WHERE id = p_application_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidature % introuvable.', p_application_id USING ERRCODE = '23503'; END IF;
  IF NOT (public.is_master_admin() OR public.is_club_member(v_app.club_id, 'club_admin')) THEN
    RAISE EXCEPTION 'Seul master_admin ou club_admin de % peut approuver.', v_app.club_id USING ERRCODE = '42501';
  END IF;
  IF v_app.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Candidature %, impossible d''approuver.', v_app.status USING ERRCODE = '22023';
  END IF;
  IF v_app.status = 'pending' THEN
    UPDATE public.jury_applications SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
     WHERE id = p_application_id RETURNING * INTO v_app;
  END IF;
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_app.email);
  IF v_user_id IS NULL THEN
    application := v_app; needs_auth_creation := true; user_id := NULL;
    RETURN NEXT; RETURN;
  END IF;
  INSERT INTO public.club_memberships (user_id, club_id, role, granted_by)
  VALUES (v_user_id, v_app.club_id, 'jury', auth.uid())
  ON CONFLICT (user_id, club_id, role) DO NOTHING;
  INSERT INTO public.platform_jury_profiles (user_id, qualite, organisation, role_title, bio, photo_path)
  VALUES (v_user_id, v_app.qualite, v_app.organisation, v_app.role_title, v_app.bio, v_app.photo_path)
  ON CONFLICT (user_id) DO UPDATE SET
    qualite = COALESCE(EXCLUDED.qualite, platform_jury_profiles.qualite),
    organisation = COALESCE(EXCLUDED.organisation, platform_jury_profiles.organisation),
    role_title = COALESCE(EXCLUDED.role_title, platform_jury_profiles.role_title),
    bio = COALESCE(EXCLUDED.bio, platform_jury_profiles.bio),
    photo_path = COALESCE(EXCLUDED.photo_path, platform_jury_profiles.photo_path),
    updated_at = now();
  UPDATE public.jury_applications SET approved_user_id = v_user_id WHERE id = p_application_id;
  v_app.approved_user_id := v_user_id;
  application := v_app; needs_auth_creation := false; user_id := v_user_id;
  RETURN NEXT;
END; $function$;

-- ----------------------------------------------------------------------------
-- 4. rsa_create_jury_profile — +p_role_title (DROP+CREATE : l'arité passe de 5 à 6)
--    Saisie directe d'un juré (externe) par l'admin.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.rsa_create_jury_profile(text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.rsa_create_jury_profile(
  p_qualite      text,
  p_organisation text,
  p_bio          text,
  p_photo_path   text,
  p_role_title   text DEFAULT NULL,
  p_role_hint    text DEFAULT 'special'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_new_id  uuid := gen_random_uuid();
  v_allowed boolean;
BEGIN
  v_allowed := public.is_master_admin()
            OR public.has_platform_role('admin')
            OR EXISTS (SELECT 1 FROM public.competition_admins WHERE user_id = auth.uid())
            OR EXISTS (SELECT 1 FROM public.club_memberships WHERE user_id = auth.uid() AND role = 'club_admin');

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Vous n''avez pas le droit de créer un profil juré.' USING ERRCODE = '42501';
  END IF;

  IF p_role_hint IS NOT NULL AND p_role_hint NOT IN ('regular','special') THEN
    RAISE EXCEPTION 'p_role_hint doit être ''regular'' ou ''special''.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.platform_jury_profiles (
    user_id, qualite, organisation, role_title, bio, photo_path
  ) VALUES (
    v_new_id,
    NULLIF(trim(coalesce(p_qualite, '')), ''),
    NULLIF(trim(coalesce(p_organisation, '')), ''),
    NULLIF(trim(coalesce(p_role_title, '')), ''),
    NULLIF(trim(coalesce(p_bio, '')), ''),
    NULLIF(trim(coalesce(p_photo_path, '')), '')
  );

  RETURN v_new_id;
END;
$function$;
COMMENT ON FUNCTION public.rsa_create_jury_profile(text, text, text, text, text, text) IS
  'V3 Jury V2 : crée un ghost profile (user_id = gen_random_uuid()) sans toucher auth.users. +role_title. master/competition_admin/club_admin. Retourne l''uuid pour enchaîner avec rsa_assign_juror.';

GRANT EXECUTE ON FUNCTION public.rsa_create_jury_profile(text, text, text, text, text, text) TO authenticated;

COMMIT;
