-- ============================================================================
-- Auto-affectation des sessions demandées à l'approbation d'une candidature jury
-- ============================================================================
-- Date     : 2026-05-31
-- Blueprint: docs/blueprints/jury-session-allocation.md
--
-- Objectif :
--   À l'approbation d'une candidature jury (rsa_approve_jury_application), une
--   fois le compte auth créé, affecter automatiquement le juré aux sessions qu'il
--   avait demandées (jury_applications.availability_session_ids). L'owner décoche
--   ensuite dans la matrice ce qu'il refuse (« OK mais 1 sur 2 »).
--
-- Migration ADDITIVE : CREATE OR REPLACE de la fonction M7 à l'identique + un seul
--   bloc INSERT idempotent. Aucune DDL de table, aucun nouveau GRANT.
--
-- Types (confirmés) : sessions.id = text, availability_session_ids = text[],
--   platform_jury_assignments.session_id = text → s.id = ANY(...) direct, sans cast.
--   Si availability_session_ids est NULL, `= ANY(NULL)` ne matche rien (no-op sûr).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rsa_approve_jury_application(p_application_id uuid)
RETURNS TABLE(
  application          public.jury_applications,
  needs_auth_creation  boolean,
  user_id              uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
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
    -- Pour les re-runs idempotents (edge function fait approve, on rappelle pour finaliser)
    RAISE EXCEPTION 'Cette candidature est %, impossible d''approuver.', v_app.status
      USING ERRCODE = '22023';
  END IF;

  -- Flag status si pas déjà fait
  IF v_app.status = 'pending' THEN
    UPDATE public.jury_applications
       SET status      = 'approved',
           reviewed_by = auth.uid(),
           reviewed_at = now()
     WHERE id = p_application_id
    RETURNING * INTO v_app;
  END IF;

  -- L'utilisateur existe-t-il dans auth.users ?
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_app.email);

  IF v_user_id IS NULL THEN
    -- Le client doit déclencher l'edge function send-jury-welcome / invite-user
    application := v_app;
    needs_auth_creation := true;
    user_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- L'utilisateur existe : on peut créer le membership + profil
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

  -- NOUVEAU (blueprint jury-session-allocation) : auto-affecter le juré aux sessions
  -- qu'il a demandées, validées contre l'édition de la candidature. Idempotent
  -- (ON CONFLICT sur le PK composite jury_user_id, session_id).
  INSERT INTO public.platform_jury_assignments (jury_user_id, session_id, created_by)
  SELECT v_user_id, s.id, auth.uid()
    FROM public.sessions s
   WHERE s.id = ANY(v_app.availability_session_ids)
     AND (v_app.edition_id IS NULL OR s.edition_id = v_app.edition_id)
  ON CONFLICT (jury_user_id, session_id) DO NOTHING;

  -- Mémorise l'user_id sur la candidature
  UPDATE public.jury_applications
     SET approved_user_id = v_user_id
   WHERE id = p_application_id;

  v_app.approved_user_id := v_user_id;
  application := v_app;
  needs_auth_creation := false;
  user_id := v_user_id;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.rsa_approve_jury_application IS
  'M7 + blueprint jury-session-allocation : approuve une candidature jury. Si user existe : crée membership+profile, AUTO-AFFECTE les sessions demandées (availability_session_ids), puis renvoie needs_auth_creation=false. Sinon renvoie needs_auth_creation=true pour que le client appelle invite-user.';
