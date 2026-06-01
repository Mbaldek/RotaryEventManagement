-- Lot A — Jury sans compte. L'approbation ne crée plus de compte/assignation ;
-- la composition d'une session se lit depuis jury_applications.
-- Cf. docs/blueprints/jury-no-account-scoring.md (Lot A).
BEGIN;

-- 1) Approbation = flip de statut SEULEMENT.
DROP FUNCTION IF EXISTS public.rsa_approve_jury_application(uuid);
CREATE OR REPLACE FUNCTION public.rsa_approve_jury_application(p_application_id uuid)
RETURNS public.jury_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_app public.jury_applications;
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
       SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
     WHERE id = p_application_id
    RETURNING * INTO v_app;
  END IF;
  RETURN v_app;
END;
$$;
REVOKE ALL ON FUNCTION public.rsa_approve_jury_application(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rsa_approve_jury_application(uuid) TO authenticated;

-- 2) Roster d'une session.
CREATE OR REPLACE FUNCTION public.rsa_session_jurors(p_session_id text)
RETURNS SETOF public.jury_applications
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_club_id text;
BEGIN
  SELECT club_id INTO v_club_id FROM public.sessions WHERE id = p_session_id;
  IF NOT (public.is_master_admin() OR (v_club_id IS NOT NULL AND public.is_club_member(v_club_id, 'club_admin'))) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT * FROM public.jury_applications ja
     WHERE p_session_id = ANY(ja.availability_session_ids)
       AND ja.status IN ('pending', 'approved')
     ORDER BY ja.status DESC, lower(ja.full_name) ASC;
END;
$$;
REVOKE ALL ON FUNCTION public.rsa_session_jurors(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rsa_session_jurors(text) TO authenticated;

-- 3) Ajout manuel d'un juré (candidature approved attachée à la session).
CREATE OR REPLACE FUNCTION public.rsa_add_manual_juror(
  p_session_id text,
  p_full_name  text,
  p_qualite    text DEFAULT NULL,
  p_email      text DEFAULT NULL
)
RETURNS public.jury_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_club_id text;
  v_edition_id text;
  v_row public.jury_applications;
BEGIN
  SELECT club_id, edition_id INTO v_club_id, v_edition_id FROM public.sessions WHERE id = p_session_id;
  IF v_club_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.sessions WHERE id = p_session_id) THEN
    RAISE EXCEPTION 'session introuvable: %', p_session_id USING ERRCODE = '23503';
  END IF;
  IF NOT (public.is_master_admin() OR (v_club_id IS NOT NULL AND public.is_club_member(v_club_id, 'club_admin'))) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_full_name IS NULL OR length(trim(p_full_name)) < 2 THEN
    RAISE EXCEPTION 'Nom requis.' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.jury_applications (
    club_id, edition_id, email, full_name, qualite,
    availability_session_ids, status, reviewed_by, reviewed_at
  ) VALUES (
    v_club_id, v_edition_id, NULLIF(lower(trim(coalesce(p_email,''))),''), trim(p_full_name),
    p_qualite, ARRAY[p_session_id]::text[], 'approved', auth.uid(), now()
  ) RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.rsa_add_manual_juror(text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rsa_add_manual_juror(text, text, text, text) TO authenticated;

-- 4) Retirer un juré d'UNE session.
CREATE OR REPLACE FUNCTION public.rsa_remove_juror_from_session(
  p_application_id uuid,
  p_session_id     text
)
RETURNS public.jury_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_club_id text;
  v_row public.jury_applications;
BEGIN
  SELECT club_id INTO v_club_id FROM public.sessions WHERE id = p_session_id;
  IF NOT (public.is_master_admin() OR (v_club_id IS NOT NULL AND public.is_club_member(v_club_id, 'club_admin'))) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.jury_applications
     SET availability_session_ids = array_remove(availability_session_ids, p_session_id)
   WHERE id = p_application_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidature % introuvable.', p_application_id USING ERRCODE = '23503';
  END IF;
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.rsa_remove_juror_from_session(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rsa_remove_juror_from_session(uuid, text) TO authenticated;

COMMIT;
