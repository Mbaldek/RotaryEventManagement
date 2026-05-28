-- ============================================================================
-- V2 MULTI-CLUB — Module 7 : funnel d'acquisition jury
-- ============================================================================
-- Permet à un club d'ouvrir un formulaire d'inscription public pour recruter
-- des jurés, plutôt que devoir les saisir un par un manuellement.
--
-- Flow :
--   1. Un futur juré arrive sur /JuryCandidate?club=paris (form public)
--   2. Il remplit : nom, email, qualité, organisation, bio, photo (option),
--      thèmes préférés, dispos sessions ouvertes du club
--   3. POST → INSERT public.jury_applications(status='pending') via RPC
--   4. Email envoyé : "Reçu, on revient vers toi"
--   5. Le club_admin voit dans Cockpit Club → onglet "Candidatures jury"
--   6. Approve → INSERT magic-link Supabase Auth (côté edge function)
--           + INSERT club_memberships(role='jury')
--           + INSERT platform_jury_profiles(qualite, organisation, bio, photo)
--           + email "Bienvenue, voici ton lien d'accès"
--   7. Reject → status='rejected' + email "Désolé, candidature non retenue"
--
-- Cette migration livre UNIQUEMENT le schéma DB + RPC. L'edge function de
-- création du compte auth.users + magic-link + email est livrée séparément
-- dans M7 partie 2 (supabase/functions/approve-jury-application).
--
-- Référence : plan ~/.claude/plans/elegant-giggling-pie.md §Module 7
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Table jury_applications
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.jury_applications (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id                  text NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  edition_id               text REFERENCES public.editions(id) ON DELETE SET NULL, -- optionnel : la candidature peut être généraliste

  -- Identité
  email                    text NOT NULL,
  full_name                text NOT NULL,
  qualite                  text NOT NULL CHECK (qualite IN ('investisseur', 'entrepreneur', 'expert', 'corporate', 'autre')),
  organisation             text,
  bio                      text,                                    -- max ~600c côté client
  photo_path               text,                                    -- Storage bucket 'jury-photos' (privé)

  -- Préférences
  preferred_themes         text[] NOT NULL DEFAULT ARRAY[]::text[],  -- ex. ['foodtech', 'tech', 'social']
  availability_session_ids text[] NOT NULL DEFAULT ARRAY[]::text[],  -- IDs des sessions qu'il pourrait honorer

  -- Workflow
  status                   text NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  applied_at               timestamptz NOT NULL DEFAULT now(),
  reviewed_by              uuid REFERENCES auth.users(id),
  reviewed_at              timestamptz,
  reviewer_note            text,                                    -- raison du reject ou note interne

  -- Suivi
  approved_user_id         uuid REFERENCES auth.users(id),          -- rempli après création du compte
  approval_email_sent_at   timestamptz
);

CREATE INDEX IF NOT EXISTS jury_apps_club_status_idx ON public.jury_applications(club_id, status);
CREATE INDEX IF NOT EXISTS jury_apps_email_idx ON public.jury_applications(lower(email));

COMMENT ON TABLE public.jury_applications IS
  'M7 : candidatures jury soumises via le funnel public /JuryCandidate. Validation par club_admin.';

-- Une seule candidature pending par (club, email) à la fois — évite les doublons
CREATE UNIQUE INDEX IF NOT EXISTS jury_apps_one_pending_per_email_per_club
  ON public.jury_applications(club_id, lower(email))
  WHERE status = 'pending';

-- ----------------------------------------------------------------------------
-- 2. RLS
-- ----------------------------------------------------------------------------

ALTER TABLE public.jury_applications ENABLE ROW LEVEL SECURITY;

-- Anyone (anon ou authenticated) peut INSERT — c'est l'essence du funnel public.
-- Mais le RPC rsa_apply_jury normalise/sanitise.
DROP POLICY IF EXISTS ja_insert_public ON public.jury_applications;
CREATE POLICY ja_insert_public ON public.jury_applications FOR INSERT
  WITH CHECK (true);

-- SELECT : master_admin OR club_admin/comite du club. Le candidat lui-même peut
-- voir SA candidature s'il est connecté avec le même email (futur use case :
-- page "ma candidature").
DROP POLICY IF EXISTS ja_select ON public.jury_applications;
CREATE POLICY ja_select ON public.jury_applications FOR SELECT USING (
  public.is_master_admin()
  OR public.has_platform_role('admin')
  OR public.is_club_member(club_id, 'club_admin')
  OR public.is_club_member(club_id, 'comite')
  OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- UPDATE/DELETE : master_admin OR club_admin du club.
DROP POLICY IF EXISTS ja_update ON public.jury_applications;
CREATE POLICY ja_update ON public.jury_applications FOR UPDATE
  USING (public.is_master_admin() OR public.is_club_member(club_id, 'club_admin'))
  WITH CHECK (public.is_master_admin() OR public.is_club_member(club_id, 'club_admin'));

DROP POLICY IF EXISTS ja_delete ON public.jury_applications;
CREATE POLICY ja_delete ON public.jury_applications FOR DELETE
  USING (public.is_master_admin() OR public.is_club_member(club_id, 'club_admin'));

-- ----------------------------------------------------------------------------
-- 3. RPC rsa_apply_jury — soumission d'une candidature (public, anon OK)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rsa_apply_jury(
  p_club_id                  text,
  p_edition_id               text,
  p_email                    text,
  p_full_name                text,
  p_qualite                  text,
  p_organisation             text DEFAULT NULL,
  p_bio                      text DEFAULT NULL,
  p_photo_path               text DEFAULT NULL,
  p_preferred_themes         text[] DEFAULT ARRAY[]::text[],
  p_availability_session_ids text[] DEFAULT ARRAY[]::text[]
)
RETURNS public.jury_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row     public.jury_applications;
  v_email_n text;
BEGIN
  -- Validation
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
    RAISE EXCEPTION 'Nom complet requis (min 2 caractères).' USING ERRCODE = '22023';
  END IF;
  IF p_qualite NOT IN ('investisseur','entrepreneur','expert','corporate','autre') THEN
    RAISE EXCEPTION 'Qualité invalide : %.', p_qualite USING ERRCODE = '22023';
  END IF;
  IF coalesce(length(p_bio), 0) > 1000 THEN
    RAISE EXCEPTION 'Bio trop longue (max 1000 caractères).' USING ERRCODE = '22023';
  END IF;

  -- Insert avec gestion ON CONFLICT (un seul pending par (club, email))
  BEGIN
    INSERT INTO public.jury_applications (
      club_id, edition_id, email, full_name, qualite, organisation, bio, photo_path,
      preferred_themes, availability_session_ids
    ) VALUES (
      p_club_id,
      p_edition_id,
      v_email_n,
      trim(p_full_name),
      p_qualite,
      NULLIF(trim(coalesce(p_organisation, '')), ''),
      NULLIF(trim(coalesce(p_bio, '')), ''),
      p_photo_path,
      coalesce(p_preferred_themes, ARRAY[]::text[]),
      coalesce(p_availability_session_ids, ARRAY[]::text[])
    )
    RETURNING * INTO v_row;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Une candidature en attente existe déjà pour cet email dans ce club.'
        USING ERRCODE = '23505';
  END;

  RETURN v_row;
END;
$$;
COMMENT ON FUNCTION public.rsa_apply_jury IS
  'M7 : soumission publique d''une candidature jury. Anti-doublon : 1 pending par (club, email).';

-- ----------------------------------------------------------------------------
-- 4. RPC rsa_reject_jury_application — refus (master_admin/club_admin)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rsa_reject_jury_application(
  p_application_id uuid,
  p_note           text DEFAULT NULL
)
RETURNS public.jury_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row    public.jury_applications;
BEGIN
  SELECT * INTO v_row FROM public.jury_applications WHERE id = p_application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidature % introuvable.', p_application_id USING ERRCODE = '23503';
  END IF;

  IF NOT (public.is_master_admin() OR public.is_club_member(v_row.club_id, 'club_admin')) THEN
    RAISE EXCEPTION 'Seul un master_admin ou club_admin de % peut rejeter.', v_row.club_id
      USING ERRCODE = '42501';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Cette candidature est déjà %, impossible de la rejeter.', v_row.status
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.jury_applications
     SET status        = 'rejected',
         reviewed_by   = auth.uid(),
         reviewed_at   = now(),
         reviewer_note = NULLIF(trim(coalesce(p_note, '')), '')
   WHERE id = p_application_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
COMMENT ON FUNCTION public.rsa_reject_jury_application IS
  'M7 : refus d''une candidature jury. status=pending → rejected. Réservé master_admin/club_admin.';

-- ----------------------------------------------------------------------------
-- 5. RPC rsa_approve_jury_application — approbation (master_admin/club_admin)
-- ----------------------------------------------------------------------------
-- Cette RPC fait ce qu'elle peut côté SQL :
--   - flip status='approved' + reviewed_*
--   - si auth.users contient déjà l'email, crée club_memberships(role='jury')
--     et platform_jury_profiles directement
--   - retourne la ligne avec un flag `needs_auth_creation`
-- Si needs_auth_creation=true, le client doit appeler l'edge function
-- send-jury-welcome qui (a) crée le compte via Supabase admin API
--                      (b) envoie un magic-link branded Élysée
--                      (c) re-déclenche cet RPC qui finira le setup.
-- ----------------------------------------------------------------------------

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
    -- Le client doit déclencher l'edge function send-jury-welcome
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
  'M7 : approuve une candidature jury. Si user existe : crée membership+profile direct. Sinon retourne needs_auth_creation=true pour que le client appelle l''edge function send-jury-welcome.';

-- ----------------------------------------------------------------------------
-- 6. RPC rsa_list_jury_applications — listing pour le club_admin
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rsa_list_jury_applications(
  p_club_id text,
  p_status  text DEFAULT NULL                                       -- NULL = all
)
RETURNS SETOF public.jury_applications
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT *
    FROM public.jury_applications
   WHERE club_id = p_club_id
     AND (p_status IS NULL OR status = p_status)
     AND (public.is_master_admin() OR public.is_club_member(p_club_id, 'club_admin'))
   ORDER BY applied_at DESC;
$$;
COMMENT ON FUNCTION public.rsa_list_jury_applications IS
  'M7 : liste les candidatures jury d''un club. Réservé master_admin/club_admin (filter en WHERE).';

-- ----------------------------------------------------------------------------
-- 7. Storage : bucket privé jury-photos
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('jury-photos', 'jury-photos', false)
ON CONFLICT (id) DO NOTHING;

-- INSERT public (le funnel d'inscription peut uploader sans être authentifié)
-- La normalisation/validation des paths est gérée côté client/RPC.
DROP POLICY IF EXISTS jp_insert ON storage.objects;
CREATE POLICY jp_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'jury-photos');

-- SELECT : master_admin, club_admin/comite, OR le candidat lui-même
DROP POLICY IF EXISTS jp_read ON storage.objects;
CREATE POLICY jp_read ON storage.objects FOR SELECT USING (
  bucket_id = 'jury-photos' AND (
    public.is_master_admin()
    OR public.has_platform_role('admin')
    OR EXISTS (
      SELECT 1 FROM public.jury_applications ja
       WHERE ja.photo_path = storage.objects.name
         AND (
           public.is_club_member(ja.club_id, 'club_admin')
           OR public.is_club_member(ja.club_id, 'comite')
           OR lower(ja.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
         )
    )
  )
);

-- ----------------------------------------------------------------------------
-- 8. Grants
-- ----------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.rsa_apply_jury(text, text, text, text, text, text, text, text, text[], text[]) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rsa_reject_jury_application(uuid, text)                                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_approve_jury_application(uuid)                                               TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_list_jury_applications(text, text)                                           TO authenticated;

COMMIT;
