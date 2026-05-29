-- ============================================================================
-- V3.0 Vague 4 — Marketplace Install (rsa_install_extension_to_club)
-- ============================================================================
-- V4 du module Extensions = rendu réel + Marketplace.
--
-- Cette migration ajoute UN seul RPC : rsa_install_extension_to_club, qui
-- clone une extension scope='master' (active=true) vers le scope='club' d'un
-- club donné, avec un nouveau row indépendant (config copiée, position 0,
-- active=true par défaut). Permet aux club_admin de "consommer" le catalogue
-- master sans permission d'écriture sur les extensions master.
--
-- Sécurité :
--   - master_admin OR club_admin du club concerné peuvent installer.
--   - La source DOIT être scope='master' ET active=true (pas d'install
--     d'extensions club d'autres clubs ou de master désactivés).
--   - Le scope du nouvel enregistrement est forcé à 'club' (pas d'élévation).
--   - description / kind / config sont copiés tels quels.
--   - Idempotence soft : si une extension du même kind+name existe déjà pour
--     ce club, on retourne la ligne existante (pas de duplicata silencieux).
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.rsa_install_extension_to_club(
  p_master_extension_id uuid,
  p_club_id             text
)
RETURNS public.extensions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_source   public.extensions;
  v_existing public.extensions;
  v_row      public.extensions;
BEGIN
  IF p_master_extension_id IS NULL THEN
    RAISE EXCEPTION 'p_master_extension_id requis.' USING ERRCODE = '22023';
  END IF;
  IF p_club_id IS NULL OR length(trim(p_club_id)) = 0 THEN
    RAISE EXCEPTION 'p_club_id requis.' USING ERRCODE = '22023';
  END IF;

  -- Permission : master_admin OR club_admin du club cible
  IF NOT (public.is_master_admin() OR public.is_club_member(p_club_id, 'club_admin')) THEN
    RAISE EXCEPTION 'Seul un master_admin ou un club_admin du club % peut installer une extension.', p_club_id
      USING ERRCODE = '42501';
  END IF;

  -- Source : doit exister, être scope='master' ET active=true.
  SELECT * INTO v_source FROM public.extensions WHERE id = p_master_extension_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Extension master % introuvable.', p_master_extension_id USING ERRCODE = '22023';
  END IF;
  IF v_source.scope <> 'master' THEN
    RAISE EXCEPTION 'Seules les extensions scope=master peuvent être installées (source: %).', v_source.scope
      USING ERRCODE = '22023';
  END IF;
  IF NOT v_source.active THEN
    RAISE EXCEPTION 'L''extension master % est inactive : impossible à installer.', p_master_extension_id
      USING ERRCODE = '22023';
  END IF;

  -- Idempotence soft : même kind + même name → retourne l'existant.
  SELECT * INTO v_existing
    FROM public.extensions
   WHERE scope = 'club'
     AND club_id = p_club_id
     AND kind    = v_source.kind
     AND name    = v_source.name
   LIMIT 1;
  IF FOUND THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.extensions (
    scope, kind, name, description, config, club_id, edition_id, position, active, created_by
  ) VALUES (
    'club',
    v_source.kind,
    v_source.name,
    v_source.description,
    v_source.config,
    p_club_id,
    NULL,
    0,
    true,
    auth.uid()
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
COMMENT ON FUNCTION public.rsa_install_extension_to_club(uuid, text) IS
  'V3 Vague 4 (Marketplace) : clone une extension scope=master active vers un club. Idempotent (kind+name).';

GRANT EXECUTE ON FUNCTION public.rsa_install_extension_to_club(uuid, text) TO authenticated;

COMMIT;
