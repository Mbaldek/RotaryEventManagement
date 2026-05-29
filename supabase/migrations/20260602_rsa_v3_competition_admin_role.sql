-- ============================================================================
-- V3 — Tier 1 admin_compétition + élargissement RLS club_admin + profile metadata
-- ============================================================================
-- Pivot architectural : ajout d'un tier intermédiaire entre master_admin (Tier 0)
-- et club_admin (Tier 2). L'admin_compétition orchestre UNE compétition (édition)
-- mono ou multiclub sans avoir les clés globales de la plateforme.
--
-- Cette migration est ADDITIVE et idempotente (CREATE IF NOT EXISTS partout) :
--   1. Table competition_admins (junction user_id × edition_id)
--   2. Helpers SECURITY DEFINER : is_competition_admin, my_competition_admin_editions,
--      is_staff_for_edition (master OU competition_admin)
--   3. RPCs SECURITY DEFINER : rsa_grant_competition_admin,
--      rsa_revoke_competition_admin, rsa_list_competition_admins
--   4. Update rsa_assign_club_role : autorise master_admin OU
--      competition_admin de l'édition à laquelle le club est attaché
--   5. Élargissement RLS lecture clubs / edition_clubs : un club_admin voit les
--      autres clubs de SA compétition (jointure via edition_clubs partagée)
--   6. RPC rsa_list_clubs_for_edition_with_counts (lecture compteurs lecteurs
--      staff édition — pour le widget "autres clubs" du Club Cockpit)
--   7. ALTER profiles : function, phone, bio, photo_path, preferred_lang,
--      profile_completed_at — metadata pour profile completion bloquant
--
-- Audit immuable : grant/revoke loggés via INSERT public.admin_audit_log.
-- Référence : plan ~/.claude/plans/elegant-giggling-pie.md section "Migration DB".
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Table competition_admins : junction (user, édition) Tier 1
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.competition_admins (
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edition_id  text        NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  granted_by  uuid        REFERENCES auth.users(id),
  granted_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, edition_id)
);

CREATE INDEX IF NOT EXISTS competition_admins_edition_idx
  ON public.competition_admins(edition_id);
CREATE INDEX IF NOT EXISTS competition_admins_user_idx
  ON public.competition_admins(user_id);

COMMENT ON TABLE public.competition_admins IS
  'V3 Tier 1 — admin_compétition. Orchestre UNE édition (mono OU multiclub) sans clés globales. Seul master_admin peut grant/revoke (RPC dédié).';

ALTER TABLE public.competition_admins ENABLE ROW LEVEL SECURITY;

-- SELECT : master_admin lit tout, l'utilisateur lit ses propres rangées (self)
DROP POLICY IF EXISTS comp_admins_read ON public.competition_admins;
CREATE POLICY comp_admins_read ON public.competition_admins FOR SELECT USING (
  public.is_master_admin()
  OR user_id = auth.uid()
);

-- INSERT/UPDATE/DELETE : aucun chemin direct, tout passe par les RPC
-- SECURITY DEFINER (rsa_grant_competition_admin / rsa_revoke_competition_admin).
-- → seul service_role peut écrire en direct (et les RPC SD bypassent la RLS).
DROP POLICY IF EXISTS comp_admins_write_denied ON public.competition_admins;
CREATE POLICY comp_admins_write_denied ON public.competition_admins FOR ALL
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());
-- NOTE : la policy est restrictive et redondante avec la RPC, c'est volontaire :
-- defense-in-depth si quelqu'un essayait un INSERT direct via PostgREST.

-- ----------------------------------------------------------------------------
-- 2. Helpers SQL SECURITY DEFINER (pattern is_master_admin / is_club_member)
-- ----------------------------------------------------------------------------

-- "Suis-je admin_compétition de cette édition ?"
CREATE OR REPLACE FUNCTION public.is_competition_admin(p_edition_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.competition_admins
     WHERE user_id    = auth.uid()
       AND edition_id = p_edition_id
  );
$$;
COMMENT ON FUNCTION public.is_competition_admin(text) IS
  'V3 : true si le user courant est admin_compétition de l''édition fournie.';

-- "Liste de mes éditions admin_compétition" — array pour le frontend (auth.jsx)
CREATE OR REPLACE FUNCTION public.my_competition_admin_editions()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(array_agg(edition_id ORDER BY edition_id), ARRAY[]::text[])
    FROM public.competition_admins
   WHERE user_id = auth.uid();
$$;
COMMENT ON FUNCTION public.my_competition_admin_editions() IS
  'V3 : text[] des editions où le user courant est admin_compétition. [] si aucune.';

-- "Suis-je staff (master OU competition_admin) de cette édition ?"
CREATE OR REPLACE FUNCTION public.is_staff_for_edition(p_edition_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT public.is_master_admin()
      OR public.is_competition_admin(p_edition_id);
$$;
COMMENT ON FUNCTION public.is_staff_for_edition(text) IS
  'V3 : raccourci is_master_admin() OR is_competition_admin(p_edition_id). Utilisé par les RPC qui modifient l''édition.';

-- ----------------------------------------------------------------------------
-- 3. RPCs SECURITY DEFINER : grant / revoke / list competition_admin
-- ----------------------------------------------------------------------------

-- rsa_grant_competition_admin : master_admin only ; idempotent ; audit log
CREATE OR REPLACE FUNCTION public.rsa_grant_competition_admin(
  p_user_id    uuid,
  p_edition_id text
)
RETURNS public.competition_admins
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row         public.competition_admins;
  v_actor       uuid := auth.uid();
  v_actor_email text;
  v_target_email text;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Seul un master_admin peut grant un admin_compétition.'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id ne peut pas être null.' USING ERRCODE = '22023';
  END IF;
  IF p_edition_id IS NULL OR length(trim(p_edition_id)) = 0 THEN
    RAISE EXCEPTION 'p_edition_id ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;

  -- Vérifie que la cible existe (user + édition)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Utilisateur % introuvable.', p_user_id USING ERRCODE = '23503';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.editions WHERE id = p_edition_id) THEN
    RAISE EXCEPTION 'Édition % introuvable.', p_edition_id USING ERRCODE = '23503';
  END IF;

  -- Idempotent : si la rangée existe, on rafraîchit granted_by/granted_at
  INSERT INTO public.competition_admins (user_id, edition_id, granted_by)
  VALUES (p_user_id, p_edition_id, v_actor)
  ON CONFLICT (user_id, edition_id) DO UPDATE
    SET granted_by = EXCLUDED.granted_by,
        granted_at = now()
  RETURNING * INTO v_row;

  -- Audit log (bypass aal_insert_denied via SECURITY DEFINER)
  SELECT email INTO v_actor_email  FROM auth.users WHERE id = v_actor;
  SELECT email INTO v_target_email FROM auth.users WHERE id = p_user_id;

  INSERT INTO public.admin_audit_log (
    actor_id, actor_email, action, target_kind, target_id, payload
  ) VALUES (
    v_actor,
    v_actor_email,
    'competition_admin_granted',
    'user',
    p_user_id::text,
    jsonb_build_object(
      'edition_id', p_edition_id,
      'target_email', v_target_email
    )
  );

  RETURN v_row;
END;
$$;
COMMENT ON FUNCTION public.rsa_grant_competition_admin(uuid, text) IS
  'V3 : master_admin grant le rôle admin_compétition à un user pour une édition. Idempotent. Audit log.';

-- rsa_revoke_competition_admin : master_admin only ; idempotent ; audit log
CREATE OR REPLACE FUNCTION public.rsa_revoke_competition_admin(
  p_user_id    uuid,
  p_edition_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_actor        uuid := auth.uid();
  v_actor_email  text;
  v_target_email text;
  v_deleted      int;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Seul un master_admin peut revoke un admin_compétition.'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id ne peut pas être null.' USING ERRCODE = '22023';
  END IF;
  IF p_edition_id IS NULL OR length(trim(p_edition_id)) = 0 THEN
    RAISE EXCEPTION 'p_edition_id ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.competition_admins
   WHERE user_id = p_user_id AND edition_id = p_edition_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Audit log (toujours, même si idempotent : trace de l'intention)
  SELECT email INTO v_actor_email  FROM auth.users WHERE id = v_actor;
  SELECT email INTO v_target_email FROM auth.users WHERE id = p_user_id;

  INSERT INTO public.admin_audit_log (
    actor_id, actor_email, action, target_kind, target_id, payload
  ) VALUES (
    v_actor,
    v_actor_email,
    'competition_admin_revoked',
    'user',
    p_user_id::text,
    jsonb_build_object(
      'edition_id', p_edition_id,
      'target_email', v_target_email,
      'rows_deleted', v_deleted
    )
  );
END;
$$;
COMMENT ON FUNCTION public.rsa_revoke_competition_admin(uuid, text) IS
  'V3 : master_admin revoke le rôle admin_compétition. Idempotent. Audit log même si 0 row deleted.';

-- rsa_list_competition_admins : master_admin OU competition_admin de l'édition
-- Retourne SETOF jsonb pour matcher la signature attendue par le front (rows = jsonb)
CREATE OR REPLACE FUNCTION public.rsa_list_competition_admins(p_edition_id text)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT jsonb_build_object(
           'user_id',    ca.user_id,
           'edition_id', ca.edition_id,
           'email',      u.email,
           'full_name',  COALESCE(p.full_name, ''),
           'granted_by', ca.granted_by,
           'granted_at', ca.granted_at
         )
    FROM public.competition_admins ca
    JOIN auth.users u           ON u.id = ca.user_id
    LEFT JOIN public.profiles p ON lower(p.email) = lower(u.email)
   WHERE ca.edition_id = p_edition_id
     AND (
       public.is_master_admin()
       OR public.is_competition_admin(p_edition_id)
     )
   ORDER BY u.email;
$$;
COMMENT ON FUNCTION public.rsa_list_competition_admins(text) IS
  'V3 : liste les admins_compétition d''une édition (jsonb). Accessible master_admin ou competition_admin de l''édition.';

-- ----------------------------------------------------------------------------
-- 4. Update rsa_assign_club_role — étendre l'authz matrix
--    Avant : master_admin OR club_admin du club
--    Après : + competition_admin de l'édition à laquelle le club est attaché
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
  v_user_id        uuid;
  v_email_n        text;
  v_row            public.club_memberships;
  v_is_comp_admin  boolean := false;
BEGIN
  -- Détermine si l'appelant est competition_admin d'une édition à laquelle
  -- le club p_club_id est attaché. (Un club peut être dans plusieurs éditions.)
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
    RAISE EXCEPTION 'Seul un master_admin, un competition_admin de l''édition du club, ou un club_admin du club % peut assigner un rôle.', p_club_id
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
  'V3 : assigne un rôle club. Authz élargie : master_admin OU competition_admin (édition du club) OU club_admin du club.';

-- ----------------------------------------------------------------------------
-- 5. Élargissement RLS lecture clubs / edition_clubs pour club_admin
--    Un club_admin du club X (rattaché à édition E) doit voir les autres clubs
--    de E (en SELECT) pour le widget "autres clubs" du Club Cockpit.
--    On REMPLACE les policies _read existantes par des versions élargies, sans
--    casser le pattern public-read existant : la lecture reste publique sur les
--    deux tables (déjà true), mais on ajoute une lecture ciblée comp_admin pour
--    cohérence (utile si jamais on resserre la lecture publique en V3.x).
-- ----------------------------------------------------------------------------

-- clubs : lecture publique conservée (true), pas de changement nécessaire ;
-- on confirme la policy SELECT en idempotent (NO-OP fonctionnel).
DROP POLICY IF EXISTS clubs_read ON public.clubs;
CREATE POLICY clubs_read ON public.clubs FOR SELECT USING (
  true
  OR public.is_master_admin()
  OR public.is_in_club(id)
  OR EXISTS (
    SELECT 1 FROM public.edition_clubs ec
     WHERE ec.club_id = public.clubs.id
       AND public.is_competition_admin(ec.edition_id)
  )
);
COMMENT ON POLICY clubs_read ON public.clubs IS
  'V3 : lecture publique conservée (true). Les branches OR documentent les chemins staff explicites (master, in_club, competition_admin). Préparation V3.x pour un éventuel resserrement.';

-- edition_clubs : idem, lecture publique conservée + branches staff explicites
DROP POLICY IF EXISTS ec_read ON public.edition_clubs;
CREATE POLICY ec_read ON public.edition_clubs FOR SELECT USING (
  true
  OR public.is_master_admin()
  OR public.is_competition_admin(edition_id)
  OR public.is_in_club(club_id)
);
COMMENT ON POLICY ec_read ON public.edition_clubs IS
  'V3 : lecture publique conservée. Branches OR explicites pour staff (master, competition_admin, in_club) — prépa V3.x.';

-- sessions : pas de policy directe modifiée. Le filtrage des counts côté UI
-- se fait via la RPC rsa_list_clubs_for_edition_with_counts ci-dessous, qui
-- tourne en SECURITY DEFINER et applique elle-même la garde d'autorisation.

-- ----------------------------------------------------------------------------
-- 6. RPC rsa_list_clubs_for_edition_with_counts
--    Pour le widget "Autres clubs" du Club Cockpit : liste les clubs de
--    l'édition avec compteurs (startups, sessions, finalistes) — lecture seule,
--    pas de drill-down sur les détails.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_list_clubs_for_edition_with_counts(
  p_edition_id text
)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT jsonb_build_object(
           'club_id',          c.id,
           'club_name',        c.name,
           'region',           c.region,
           'contact_email',    c.contact_email,
           'contact_name',     c.contact_name,
           'startups_count',   COALESCE(s_agg.cnt, 0),
           'sessions_count',   COALESCE(sess_agg.cnt, 0),
           'finalists_count',  COALESCE(fin_agg.cnt, 0)
         )
    FROM public.edition_clubs ec
    JOIN public.clubs c ON c.id = ec.club_id
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS cnt
        FROM public.startups st
       WHERE st.edition_id = ec.edition_id AND st.club_id = c.id
    ) s_agg ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS cnt
        FROM public.sessions sess
       WHERE sess.edition_id = ec.edition_id AND sess.club_id = c.id
    ) sess_agg ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS cnt
        FROM public.startups st
       WHERE st.edition_id = ec.edition_id
         AND st.club_id    = c.id
         AND st.status IN ('finaliste', 'laureat')
    ) fin_agg ON true
   WHERE ec.edition_id = p_edition_id
     -- Authz : master, competition_admin, ou ANY in_club d'un club de l'édition
     AND (
       public.is_master_admin()
       OR public.is_competition_admin(p_edition_id)
       OR EXISTS (
         SELECT 1 FROM public.edition_clubs ec2
          WHERE ec2.edition_id = p_edition_id
            AND public.is_in_club(ec2.club_id)
       )
     )
   ORDER BY c.name;
$$;
COMMENT ON FUNCTION public.rsa_list_clubs_for_edition_with_counts(text) IS
  'V3 : liste les clubs d''une édition avec compteurs (startups/sessions/finalistes). Accessible : master, competition_admin, ou tout membre d''un club de l''édition (lecture inter-clubs limitée aux compteurs).';

-- ----------------------------------------------------------------------------
-- 7. ALTER profiles — metadata profile completion (Tier 0..2 + comite/jury)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS function             text,
  ADD COLUMN IF NOT EXISTS phone                text,
  ADD COLUMN IF NOT EXISTS bio                  text,
  ADD COLUMN IF NOT EXISTS photo_path           text,
  ADD COLUMN IF NOT EXISTS preferred_lang       text DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS profile_completed_at timestamptz;

COMMENT ON COLUMN public.profiles.function IS
  'V3 : fonction/titre dans le club ou la compétition (ex "Président commission RSA").';
COMMENT ON COLUMN public.profiles.phone IS
  'V3 : téléphone de contact (optionnel, B2B).';
COMMENT ON COLUMN public.profiles.bio IS
  'V3 : courte bio (~200 chars), affichée sur les fiches admin/jury.';
COMMENT ON COLUMN public.profiles.photo_path IS
  'V3 : path Storage (bucket admins/) — photo profil utilisée dans le cockpit.';
COMMENT ON COLUMN public.profiles.preferred_lang IS
  'V3 : langue préférée (fr|en|de). Default fr — alignement i18n par défaut.';
COMMENT ON COLUMN public.profiles.profile_completed_at IS
  'V3 : timestamp du 1er submit du profile completion form. NULL = form bloquant à afficher.';

-- ----------------------------------------------------------------------------
-- 8. Grants
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.is_competition_admin(text)                          TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.my_competition_admin_editions()                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_for_edition(text)                          TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rsa_grant_competition_admin(uuid, text)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_revoke_competition_admin(uuid, text)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_list_competition_admins(text)                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_list_clubs_for_edition_with_counts(text)        TO authenticated;

COMMIT;
