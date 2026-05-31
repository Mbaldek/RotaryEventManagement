-- ============================================================================
-- Fix — rsa_approve_jury_application : « column reference "user_id" is ambiguous »
-- ============================================================================
-- Date : 2026-06-05
--
-- Symptôme : à l'approbation d'une candidature jury depuis le cockpit, erreur
--   « column reference "user_id" is ambiguous » — uniquement quand le ou la
--   candidat·e possède déjà un compte auth.users (le chemin qui atteint les
--   INSERT ... ON CONFLICT).
--
-- Cause : la fonction déclare un paramètre OUT `user_id` (RETURNS TABLE(...,
--   user_id uuid)). Ce paramètre est une variable PL/pgSQL dans tout le corps
--   et entre en collision avec la colonne `user_id` référencée dans
--   `ON CONFLICT (user_id, club_id, role)` (club_memberships) et
--   `ON CONFLICT (user_id)` (platform_jury_profiles). Postgres ne peut pas
--   trancher → erreur d'ambiguïté à la planification de ces statements.
--
-- Correctif : directive `#variable_conflict use_column` en tête de fonction —
--   dans un contexte ambigu, la COLONNE l'emporte (ce que l'on veut pour les
--   cibles de ON CONFLICT). Les affectations (`user_id := ...`) restent des
--   cibles de variables et ne sont pas affectées. La signature/retour est
--   inchangée → CREATE OR REPLACE suffit, le wrapper JS (row.user_id) reste bon.
--
-- Corps strictement identique à l'existant par ailleurs.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rsa_approve_jury_application(p_application_id uuid)
 RETURNS TABLE(application jury_applications, needs_auth_creation boolean, user_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
#variable_conflict use_column
DECLARE
  v_app     public.jury_applications;
  v_user_id uuid;
BEGIN
  SELECT * INTO v_app FROM public.jury_applications WHERE id = p_application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidature % introuvable.', p_application_id USING ERRCODE = '23503';
  END IF;

  IF NOT (public.is_master_admin() OR public.is_club_member(v_app.club_id, 'club_admin')) THEN
    RAISE EXCEPTION 'Seul un master_admin ou club_admin de % peut approuver.', v_app.club_id
      USING ERRCODE = '42501';
  END IF;

  IF v_app.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Cette candidature est %, impossible d''approuver.', v_app.status
      USING ERRCODE = '22023';
  END IF;

  IF v_app.status = 'pending' THEN
    UPDATE public.jury_applications
       SET status      = 'approved',
           reviewed_by = auth.uid(),
           reviewed_at = now()
     WHERE id = p_application_id
    RETURNING * INTO v_app;
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_app.email);

  IF v_user_id IS NULL THEN
    application := v_app;
    needs_auth_creation := true;
    user_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.club_memberships (user_id, club_id, role, granted_by)
  VALUES (v_user_id, v_app.club_id, 'jury', auth.uid())
  ON CONFLICT (user_id, club_id, role) DO NOTHING;

  INSERT INTO public.platform_jury_profiles (user_id, qualite, organisation, bio, photo_path)
  VALUES (v_user_id, v_app.qualite, v_app.organisation, v_app.bio, v_app.photo_path)
  ON CONFLICT (user_id) DO UPDATE
    SET qualite      = COALESCE(EXCLUDED.qualite,      platform_jury_profiles.qualite),
        organisation = COALESCE(EXCLUDED.organisation, platform_jury_profiles.organisation),
        bio          = COALESCE(EXCLUDED.bio,          platform_jury_profiles.bio),
        photo_path   = COALESCE(EXCLUDED.photo_path,   platform_jury_profiles.photo_path),
        updated_at   = now();

  -- Auto-affecter le juré aux sessions demandées, validées contre l'édition.
  INSERT INTO public.platform_jury_assignments (jury_user_id, session_id, created_by)
  SELECT v_user_id, s.id, auth.uid()
    FROM public.sessions s
   WHERE s.id = ANY(v_app.availability_session_ids)
     AND (v_app.edition_id IS NULL OR s.edition_id = v_app.edition_id)
  ON CONFLICT (jury_user_id, session_id) DO NOTHING;

  UPDATE public.jury_applications
     SET approved_user_id = v_user_id
   WHERE id = p_application_id;

  v_app.approved_user_id := v_user_id;
  application := v_app;
  needs_auth_creation := false;
  user_id := v_user_id;
  RETURN NEXT;
END;
$function$;
