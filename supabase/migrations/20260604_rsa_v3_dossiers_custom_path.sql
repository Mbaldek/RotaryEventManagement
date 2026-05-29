-- ============================================================================
-- V3 — Bucket 'dossiers' : ouvrir segment[5] = 'custom' (startups + jury)
-- ============================================================================
-- Contexte : la migration 20260527_rsa_module1_hardening.sql verrouillait
-- l'écriture dans le bucket privé 'dossiers' au schéma de paths suivant :
--   editions/{edition_id}/startups/{startup_id}/(pitch_deck|exec_summary)/<file>
--
-- Avec l'arrivée des custom fields per edition (cf.
-- 20260604_rsa_v3_custom_fields_per_edition.sql), un field de type 'file' doit
-- pouvoir uploader sous :
--   editions/{edition_id}/startups/{startup_id}/custom/{field_key}/{ts}_{name}.{ext}
--
-- Et pour les custom fields jury (form jury), on accepte aussi :
--   editions/{edition_id}/jury/{application_id}/custom/{field_key}/<file>
--
-- Cette migration :
--   1. Recrée dossiers_insert / dossiers_update en autorisant segment[5]='custom'
--      pour la branche startups (en gardant pitch_deck / exec_summary inchangé)
--   2. Ajoute une branche parallèle "jury" : segment[3]='jury' permet à un
--      anon/auth qui maitrise l'application_id (UUID, non-devinable) d'uploader
--      un fichier custom dans son dossier jury. La RPC funnel jury normalise
--      les paths côté serveur ; le client front respecte la convention.
--   3. Recrée dossiers_read et dossiers_delete avec les mêmes branches pour ne
--      pas casser le lifecycle (download / suppression d'un fichier custom).
--
-- Sécurité :
--   - Branche startups : reste owns_startup-gated (le candidat ne peut écrire
--     que dans SES propres startups). dossiers_staff (comite/admin) inchangé.
--   - Branche jury : segment[3]='jury' + segment[5]='custom' uniquement, et
--     SEUL le master_admin / club_admin / comite (= is_dossier_staff()) peut
--     écrire OU le candidat lui-même via match d'email (lookup jury_applications
--     par id = segment[4] et email = JWT email). Pour les anon (funnel public),
--     on accepte l'INSERT si segment[3]='jury' et segment[5]='custom' (le RPC
--     valide en amont ; cohérent avec jp_insert qui accepte tout sur jury-photos).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Helper : owns_jury_application_by_id (par UUID, match email JWT)
-- ----------------------------------------------------------------------------
-- Renvoie true si l'utilisateur courant matche l'email de la candidature jury
-- d'id donné. Utilisé pour autoriser le candidat à uploader/relire ses propres
-- fichiers custom (jury) en self-service.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.owns_jury_application(p_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.jury_applications ja
     WHERE ja.id::text = p_id
       AND lower(ja.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
COMMENT ON FUNCTION public.owns_jury_application(text) IS
  'V3 — Vrai si le caller (par email JWT) est l''auteur de la candidature jury d''id p_id. Utilisé par les policies storage du bucket dossiers (branche jury).';

GRANT EXECUTE ON FUNCTION public.owns_jury_application(text) TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- 2. Recréer dossiers_insert (startups : ajout 'custom' ; nouvelle branche jury)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS dossiers_insert ON storage.objects;
CREATE POLICY dossiers_insert ON storage.objects FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    bucket_id = 'dossiers'
    AND (
      -- Branche STARTUPS : owner_id ou staff, segment[5] ∈ {pitch_deck, exec_summary, custom}
      (
        (storage.foldername(name))[1] = 'editions'
        AND (storage.foldername(name))[3] = 'startups'
        AND (storage.foldername(name))[5] IN ('pitch_deck','exec_summary','custom')
        AND public.owns_startup((storage.foldername(name))[4])
      )
      -- Branche JURY : segment[5]='custom' (file fields du form jury). Le RPC
      -- funnel jury normalise ; les anon sont acceptés ici car le funnel public
      -- doit pouvoir uploader avant que la candidature soit dans auth.users.
      OR (
        (storage.foldername(name))[1] = 'editions'
        AND (storage.foldername(name))[3] = 'jury'
        AND (storage.foldername(name))[5] = 'custom'
      )
      -- Staff plateforme : full access
      OR public.has_platform_role('comite')
      OR public.has_platform_role('admin')
    )
  );

-- ----------------------------------------------------------------------------
-- 3. Recréer dossiers_update (mêmes branches)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS dossiers_update ON storage.objects;
CREATE POLICY dossiers_update ON storage.objects FOR UPDATE
  TO authenticated, anon
  USING (
    bucket_id = 'dossiers'
    AND (
      (
        (storage.foldername(name))[1] = 'editions'
        AND (storage.foldername(name))[3] = 'startups'
        AND (storage.foldername(name))[5] IN ('pitch_deck','exec_summary','custom')
        AND public.owns_startup((storage.foldername(name))[4])
      )
      OR (
        (storage.foldername(name))[1] = 'editions'
        AND (storage.foldername(name))[3] = 'jury'
        AND (storage.foldername(name))[5] = 'custom'
        AND public.owns_jury_application((storage.foldername(name))[4])
      )
      OR public.has_platform_role('comite')
      OR public.has_platform_role('admin')
    )
  )
  WITH CHECK (
    bucket_id = 'dossiers'
    AND (
      (
        (storage.foldername(name))[1] = 'editions'
        AND (storage.foldername(name))[3] = 'startups'
        AND (storage.foldername(name))[5] IN ('pitch_deck','exec_summary','custom')
        AND public.owns_startup((storage.foldername(name))[4])
      )
      OR (
        (storage.foldername(name))[1] = 'editions'
        AND (storage.foldername(name))[3] = 'jury'
        AND (storage.foldername(name))[5] = 'custom'
        AND public.owns_jury_application((storage.foldername(name))[4])
      )
      OR public.has_platform_role('comite')
      OR public.has_platform_role('admin')
    )
  );

-- ----------------------------------------------------------------------------
-- 4. Recréer dossiers_read (élargie à la branche jury + custom)
-- ----------------------------------------------------------------------------
-- La policy existante autorise startups owners + is_dossier_staff. On ajoute
-- la branche jury : le candidat lui-même (via email JWT) peut télécharger ses
-- propres fichiers custom.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS dossiers_read ON storage.objects;
CREATE POLICY dossiers_read ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dossiers'
    AND (
      (
        (storage.foldername(name))[1] = 'editions'
        AND (storage.foldername(name))[3] = 'startups'
        AND public.owns_startup((storage.foldername(name))[4])
      )
      OR (
        (storage.foldername(name))[1] = 'editions'
        AND (storage.foldername(name))[3] = 'jury'
        AND (storage.foldername(name))[5] = 'custom'
        AND public.owns_jury_application((storage.foldername(name))[4])
      )
      OR public.is_dossier_staff()
    )
  );

-- ----------------------------------------------------------------------------
-- 5. Recréer dossiers_delete (élargie identiquement)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS dossiers_delete ON storage.objects;
CREATE POLICY dossiers_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'dossiers'
    AND (
      (
        (storage.foldername(name))[1] = 'editions'
        AND (storage.foldername(name))[3] = 'startups'
        AND public.owns_startup((storage.foldername(name))[4])
      )
      OR (
        (storage.foldername(name))[1] = 'editions'
        AND (storage.foldername(name))[3] = 'jury'
        AND (storage.foldername(name))[5] = 'custom'
        AND public.owns_jury_application((storage.foldername(name))[4])
      )
      OR public.has_platform_role('comite')
      OR public.has_platform_role('admin')
    )
  );

COMMIT;
