-- ============================================================================
-- V2 MULTI-CLUB — Étape 2 : RPC création/gestion clubs
-- ============================================================================
-- RPC SECURITY DEFINER pour que le master_admin (et les club_admins quand
-- approprié) puissent créer/modifier compétitions, clubs et rôles.
--
-- Tous les RPC valident l'autorisation côté serveur via is_master_admin() ou
-- is_club_member() avant toute modification, et lèvent EXCEPTION '42501'
-- (insufficient_privilege) ou '23xxx' (data violations) selon le cas.
--
-- Référence : plan ~/.claude/plans/elegant-giggling-pie.md
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- rsa_create_competition : crée une nouvelle édition (compétition)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_create_competition(
  p_id    text,
  p_name  text,
  p_year  integer,
  p_model text DEFAULT 'monoclub'
)
RETURNS public.editions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row public.editions;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Seul un master_admin peut créer une compétition.'
      USING ERRCODE = '42501';
  END IF;

  IF p_id IS NULL OR length(trim(p_id)) = 0 THEN
    RAISE EXCEPTION 'p_id ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'p_name ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;
  IF p_year IS NULL OR p_year < 2020 OR p_year > 2100 THEN
    RAISE EXCEPTION 'p_year doit être entre 2020 et 2100.' USING ERRCODE = '22023';
  END IF;
  IF p_model NOT IN ('monoclub', 'multiclub') THEN
    RAISE EXCEPTION 'p_model doit être ''monoclub'' ou ''multiclub''.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.editions (id, name, year, status, model)
  VALUES (p_id, p_name, p_year, 'draft', p_model)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
COMMENT ON FUNCTION public.rsa_create_competition(text, text, integer, text) IS
  'V2 : master_admin crée une compétition (édition). Status initial = draft. Model monoclub OU multiclub.';

-- ----------------------------------------------------------------------------
-- rsa_create_club : crée un nouveau club
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_create_club(
  p_id            text,
  p_name          text,
  p_region        text DEFAULT NULL,
  p_contact_email text DEFAULT NULL,
  p_contact_name  text DEFAULT NULL
)
RETURNS public.clubs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row public.clubs;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Seul un master_admin peut créer un club.'
      USING ERRCODE = '42501';
  END IF;

  IF p_id IS NULL OR length(trim(p_id)) = 0 THEN
    RAISE EXCEPTION 'p_id ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'p_name ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;
  -- id en kebab-case court (cohérent avec 'paris', 'berlin', 'lyon-1')
  IF p_id !~ '^[a-z][a-z0-9-]{0,49}$' THEN
    RAISE EXCEPTION 'p_id doit être en kebab-case (a-z, 0-9, tiret), commencer par une lettre, max 50 chars.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.clubs (id, name, region, contact_email, contact_name, created_by)
  VALUES (
    lower(trim(p_id)),
    trim(p_name),
    NULLIF(trim(p_region), ''),
    lower(NULLIF(trim(p_contact_email), '')),
    NULLIF(trim(p_contact_name), ''),
    auth.uid()
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
COMMENT ON FUNCTION public.rsa_create_club(text, text, text, text, text) IS
  'V2 : master_admin crée un nouveau club. id normalisé en kebab-case.';

-- ----------------------------------------------------------------------------
-- rsa_attach_club_to_edition : ajoute un club à une compétition multiclub
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_attach_club_to_edition(
  p_edition_id        text,
  p_club_id           text,
  p_eligibility_rules jsonb DEFAULT '{}'::jsonb
)
RETURNS public.edition_clubs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row     public.edition_clubs;
  v_model   text;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Seul un master_admin peut attacher un club à une édition.'
      USING ERRCODE = '42501';
  END IF;

  SELECT model INTO v_model FROM public.editions WHERE id = p_edition_id;
  IF v_model IS NULL THEN
    RAISE EXCEPTION 'Édition % introuvable.', p_edition_id USING ERRCODE = '22023';
  END IF;
  IF v_model = 'monoclub' AND EXISTS (
    SELECT 1 FROM public.edition_clubs WHERE edition_id = p_edition_id
  ) THEN
    RAISE EXCEPTION 'L''édition % est monoclub et a déjà un club attaché. Bascule-la en multiclub d''abord.', p_edition_id
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.edition_clubs (edition_id, club_id, eligibility_rules, attached_by)
  VALUES (p_edition_id, p_club_id, COALESCE(p_eligibility_rules, '{}'::jsonb), auth.uid())
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
COMMENT ON FUNCTION public.rsa_attach_club_to_edition(text, text, jsonb) IS
  'V2 : master_admin attache un club à une compétition. eligibility_rules override les règles globales de l''édition.';

-- ----------------------------------------------------------------------------
-- rsa_detach_club_from_edition : retire un club d'une compétition
-- (autorisé seulement si aucune startup ni session du club n'existe pour cette édition)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_detach_club_from_edition(
  p_edition_id text,
  p_club_id    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Seul un master_admin peut détacher un club d''une édition.'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.startups
     WHERE edition_id = p_edition_id AND club_id = p_club_id
  ) THEN
    RAISE EXCEPTION 'Impossible : des candidatures existent déjà pour le club % dans l''édition %.', p_club_id, p_edition_id
      USING ERRCODE = '23503';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sessions
     WHERE edition_id = p_edition_id AND club_id = p_club_id
  ) THEN
    RAISE EXCEPTION 'Impossible : des sessions existent déjà pour le club % dans l''édition %.', p_club_id, p_edition_id
      USING ERRCODE = '23503';
  END IF;

  DELETE FROM public.edition_clubs
   WHERE edition_id = p_edition_id AND club_id = p_club_id;
END;
$$;
COMMENT ON FUNCTION public.rsa_detach_club_from_edition(text, text) IS
  'V2 : master_admin détache un club. Refusé si startups OU sessions existent (intégrité).';

-- ----------------------------------------------------------------------------
-- rsa_assign_club_role : assigne un rôle à un user dans un club
-- Pré-requis : le user doit déjà exister dans auth.users (cad s'être connecté
-- au moins une fois via magic-link). Sinon RAISE clair.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_assign_club_role(
  p_email   text,
  p_club_id text,
  p_role    text
)
RETURNS public.club_memberships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_email_n text;
  v_row     public.club_memberships;
BEGIN
  IF NOT (public.is_master_admin() OR public.is_club_member(p_club_id, 'club_admin')) THEN
    RAISE EXCEPTION 'Seul un master_admin ou un club_admin du club % peut assigner un rôle.', p_club_id
      USING ERRCODE = '42501';
  END IF;

  IF p_role NOT IN ('club_admin', 'comite', 'jury') THEN
    RAISE EXCEPTION 'p_role doit être club_admin, comite ou jury.' USING ERRCODE = '22023';
  END IF;

  v_email_n := lower(trim(coalesce(p_email, '')));
  IF v_email_n = '' THEN
    RAISE EXCEPTION 'p_email ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_email_n;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'L''utilisateur % n''existe pas encore. Demandez-lui de se connecter via /Login (magic-link) puis réessayez.', v_email_n
      USING ERRCODE = '23503';
  END IF;

  -- Vérifie que le club existe
  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE id = p_club_id) THEN
    RAISE EXCEPTION 'Le club % n''existe pas.', p_club_id USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.club_memberships (user_id, club_id, role, granted_by)
  VALUES (v_user_id, p_club_id, p_role, auth.uid())
  ON CONFLICT (user_id, club_id, role) DO UPDATE
    SET granted_by = EXCLUDED.granted_by,
        granted_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
COMMENT ON FUNCTION public.rsa_assign_club_role(text, text, text) IS
  'V2 : master_admin ou club_admin assigne un rôle à un email dans un club. User doit pré-exister dans auth.users.';

-- ----------------------------------------------------------------------------
-- rsa_revoke_club_role : retire un rôle d'un user dans un club
-- Protection : refuse de retirer le DERNIER club_admin du club (sinon orphan)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_revoke_club_role(
  p_email   text,
  p_club_id text,
  p_role    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id  uuid;
  v_email_n  text;
  v_remaining int;
BEGIN
  IF NOT (public.is_master_admin() OR public.is_club_member(p_club_id, 'club_admin')) THEN
    RAISE EXCEPTION 'Seul un master_admin ou un club_admin du club % peut retirer un rôle.', p_club_id
      USING ERRCODE = '42501';
  END IF;

  v_email_n := lower(trim(coalesce(p_email, '')));
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_email_n;
  IF v_user_id IS NULL THEN
    RETURN;  -- idempotent : si user n'existe pas, rien à faire
  END IF;

  IF p_role = 'club_admin' THEN
    SELECT count(*) INTO v_remaining
      FROM public.club_memberships
     WHERE club_id = p_club_id AND role = 'club_admin'
       AND NOT (user_id = v_user_id);
    IF v_remaining = 0 AND NOT public.is_master_admin() THEN
      RAISE EXCEPTION 'Impossible : ce serait le dernier club_admin du club %. Un master_admin peut forcer.', p_club_id
        USING ERRCODE = '23503';
    END IF;
  END IF;

  DELETE FROM public.club_memberships
   WHERE user_id = v_user_id AND club_id = p_club_id AND role = p_role;
END;
$$;
COMMENT ON FUNCTION public.rsa_revoke_club_role(text, text, text) IS
  'V2 : retire un rôle club. Garde-fou : refuse de retirer le dernier club_admin (sauf master_admin override).';

-- ----------------------------------------------------------------------------
-- rsa_list_clubs : liste les clubs (lecture publique mais via RPC pour cohérence)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_list_clubs()
RETURNS SETOF public.clubs
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT * FROM public.clubs ORDER BY name;
$$;
COMMENT ON FUNCTION public.rsa_list_clubs() IS
  'V2 : liste tous les clubs. Lecture publique (utilisé par le dropdown candidature).';

-- ----------------------------------------------------------------------------
-- rsa_list_club_members : liste les membres d'un club (avec emails)
-- Réservé master_admin OU club_admin du club
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_list_club_members(p_club_id text)
RETURNS TABLE(
  user_id    uuid,
  email      text,
  full_name  text,
  role       text,
  granted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    cm.user_id,
    u.email,
    coalesce(p.full_name, '')::text AS full_name,
    cm.role,
    cm.granted_at
  FROM public.club_memberships cm
  JOIN auth.users u ON u.id = cm.user_id
  LEFT JOIN public.profiles p ON lower(p.email) = lower(u.email)
 WHERE cm.club_id = p_club_id
   AND (public.is_master_admin() OR public.is_club_member(p_club_id, 'club_admin'))
 ORDER BY cm.role, u.email;
$$;
COMMENT ON FUNCTION public.rsa_list_club_members(text) IS
  'V2 : liste les membres d''un club. Réservé master_admin ou club_admin du club (filter dans le SELECT).';

-- ----------------------------------------------------------------------------
-- Grants
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.rsa_create_competition(text, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_create_club(text, text, text, text, text)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_attach_club_to_edition(text, text, jsonb)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_detach_club_from_edition(text, text)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_assign_club_role(text, text, text)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_revoke_club_role(text, text, text)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_list_clubs()                                   TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rsa_list_club_members(text)                       TO authenticated;

COMMIT;
