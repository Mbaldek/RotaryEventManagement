-- ============================================================================
-- V3 — Étend rsa_assign_role pour accepter `master_admin` (nouveau Tier 0)
-- ============================================================================
-- Contexte : la fonction rsa_assign_role (M4a, migration 20260527) n'acceptait
-- que les rôles legacy ('startup','jury','comite','admin'). Or, depuis V3, le
-- rôle global `master_admin` est stocké dans app_user_roles.roles[] via l'edge
-- function invite-user (qui fait un UPSERT direct bypass RPC). Conséquence :
-- toute reprise via l'UI RolesManager → rsa_assign_role refuse la ligne avec
-- l'erreur `invalid_roles: master_admin` car le rôle existant n'est pas dans la
-- liste blanche.
--
-- Cette migration :
--   1. Ajoute `master_admin` à l'allowlist de la fonction.
--   2. Étend last_admin_protection : la garde refuse désormais aussi de retirer
--      le DERNIER user qui détient master_admin OU admin (raccourci : "global
--      admin"), pour ne pas se locker hors plateforme.
--
-- Pourquoi pas competition_admin / club_admin ? Ces rôles sont scopés (édition,
-- club) et stockés dans competition_admins / club_memberships, pas dans
-- app_user_roles.roles[]. Les inclure ici n'aurait aucun sens.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.rsa_assign_role(
  p_email text,
  p_roles text[]
)
RETURNS public.app_user_roles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row       public.app_user_roles;
  v_email     text;
  v_clean     text[];
  v_invalid   text[];
  v_caller    uuid := auth.uid();
  v_remaining int;
  v_target_was_global_admin boolean;
  v_target_will_be_global_admin boolean;
BEGIN
  IF NOT public.has_platform_role('admin') THEN
    RAISE EXCEPTION 'forbidden:not_admin' USING ERRCODE = '42501';
  END IF;

  v_email := lower(btrim(coalesce(p_email, '')));
  IF v_email = '' THEN
    RAISE EXCEPTION 'missing_field:email' USING ERRCODE = '22023';
  END IF;

  -- Sanitize : trim + lower + dédup + retire les vides.
  IF p_roles IS NULL THEN
    v_clean := '{}';
  ELSE
    SELECT coalesce(array_agg(DISTINCT lower(btrim(r))), '{}')
      INTO v_clean
      FROM unnest(p_roles) AS r
     WHERE btrim(coalesce(r, '')) <> '';
  END IF;

  -- V3 — allowlist élargie : master_admin ajouté (admin reste pour compat).
  SELECT coalesce(array_agg(r), '{}') INTO v_invalid
    FROM unnest(v_clean) AS r
   WHERE r NOT IN ('startup','jury','comite','admin','master_admin');
  IF array_length(v_invalid, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'invalid_roles: %', array_to_string(v_invalid, ',')
      USING ERRCODE = '22023';
  END IF;

  -- Last-global-admin protection : si la cible PERD son statut global admin
  -- (master_admin OR admin) et qu'il n'en reste aucun autre dans la table, on
  -- refuse. Évite le lockout total de la plateforme.
  v_target_will_be_global_admin :=
    ('admin' = ANY(v_clean)) OR ('master_admin' = ANY(v_clean));

  IF NOT v_target_will_be_global_admin THEN
    SELECT EXISTS (
      SELECT 1 FROM public.app_user_roles
       WHERE lower(email) = v_email
         AND ('admin' = ANY(roles) OR 'master_admin' = ANY(roles))
    ) INTO v_target_was_global_admin;

    IF v_target_was_global_admin THEN
      SELECT count(*) INTO v_remaining
        FROM public.app_user_roles
       WHERE ('admin' = ANY(roles) OR 'master_admin' = ANY(roles))
         AND lower(email) <> v_email;
      IF v_remaining = 0 THEN
        RAISE EXCEPTION 'last_admin_protection' USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  INSERT INTO public.app_user_roles (email, roles, granted_by, granted_at, updated_at)
    VALUES (v_email, v_clean, v_caller, now(), now())
    ON CONFLICT (email) DO UPDATE
      SET roles      = EXCLUDED.roles,
          granted_by = EXCLUDED.granted_by,
          granted_at = EXCLUDED.granted_at,
          updated_at = now()
    RETURNING * INTO v_row;

  RETURN v_row;
END$$;

COMMENT ON FUNCTION public.rsa_assign_role(text, text[]) IS
  'V3 : assigne les rôles globaux d''un user dans app_user_roles. Accepte startup/jury/comite/admin/master_admin. Last-global-admin protection : refuse si la dernière ligne avec admin OU master_admin disparaît.';

-- ----------------------------------------------------------------------------
-- V3 — Étend rsa_list_club_members / rsa_revoke_club_role à competition_admin
-- ----------------------------------------------------------------------------
-- Le 20260602 a déjà ouvert rsa_assign_club_role au competition_admin de
-- l'édition à laquelle le club est rattaché. Pour que le nouveau RolesTab du
-- CompetitionEditView puisse LIRE les membres et RETIRER des rôles, on étend
-- les deux RPC restantes avec le même prédicat « competition_admin d'une
-- édition contenant ce club ».
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
   AND (
        public.is_master_admin()
     OR public.is_club_member(p_club_id, 'club_admin')
     OR EXISTS (
          SELECT 1 FROM public.edition_clubs ec
           WHERE ec.club_id = p_club_id
             AND public.is_competition_admin(ec.edition_id)
        )
   )
 ORDER BY cm.role, u.email;
$$;
COMMENT ON FUNCTION public.rsa_list_club_members(text) IS
  'V3 : liste les membres d''un club. Accessible : master_admin, club_admin du club, OU competition_admin d''une édition à laquelle le club est attaché.';

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
  v_user_id        uuid;
  v_email_n        text;
  v_remaining      int;
  v_is_comp_admin  boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM public.edition_clubs ec
     WHERE ec.club_id = p_club_id
       AND public.is_competition_admin(ec.edition_id)
  ) INTO v_is_comp_admin;

  IF NOT (
       public.is_master_admin()
    OR public.is_club_member(p_club_id, 'club_admin')
    OR v_is_comp_admin
  ) THEN
    RAISE EXCEPTION 'Seul un master_admin, un competition_admin de l''édition du club, ou un club_admin du club % peut retirer un rôle.', p_club_id
      USING ERRCODE = '42501';
  END IF;

  v_email_n := lower(trim(coalesce(p_email, '')));
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_email_n;
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Last-club-admin protection : seul un master_admin peut forcer la suppression
  -- du dernier club_admin. Un competition_admin n'a pas ce pouvoir override.
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
  'V3 : retire un rôle club. Authz : master_admin, club_admin du club, OU competition_admin d''une édition contenant le club. Last-club-admin protection : seul master_admin peut forcer.';

COMMIT;
