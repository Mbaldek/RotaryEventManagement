-- ============================================================================
-- V3 — Prizes V2 + Jury V2 (auto-award + reassign, role tag, external jurors,
--                          president jury, kill prize.jury_type)
-- ============================================================================
-- Pivot 2026-06-04. Cette migration livre la version 2 des modules Prix et Jury :
--
--   PRIZES V2
--   ---------
--   1. rsa_publish_session AUTO-AWARDE le top1 du classement sur tous les prix
--      kind='general' rattachés à la session (awarded_to IS NULL uniquement).
--      Idempotent (jamais d'écrasement). Audit log enrichi.
--   2. Nouveau RPC rsa_reassign_prize(p_prize_id, p_new_startup_id) : permet
--      à un admin (master/competition/club selon scope) de réassigner un prix
--      déjà décerné. Trace dans admin_audit_log (action='prize_reassigned').
--   3. KILL prizes.jury_type : la distinction jury régulier / jury spécial
--      remonte au niveau ASSIGNATION (cf. JURY V2 §4) et non plus au niveau
--      prix. On drop la colonne + on recrée les RPC rsa_create_prize/
--      rsa_update_prize SANS le paramètre p_jury_type.
--
--   JURY V2
--   -------
--   4. platform_jury_assignments.role text DEFAULT 'regular'
--      CHECK (role IN ('regular','special')). 'special' = expert externe
--      non-rotarien. PUREMENT INFORMATIF — le calcul du score (moyenne
--      pondérée) ne change pas : tous les jurés assignés pèsent pareil.
--   5. Nouveau RPC rsa_assign_juror(p_session_id, p_jury_user_id, p_role) :
--      UPSERT dans platform_jury_assignments. Autorisé pour master_admin OU
--      competition_admin de l'édition OU club_admin du club de la session.
--   6. Nouveau RPC rsa_remove_juror(p_session_id, p_jury_user_id) : DELETE de
--      l'assignment, REFUSÉ si le juré a déjà soumis un score (intégrité).
--   7. FK platform_jury_profiles.user_id → auth.users DROPPED. Permet la
--      création de "ghost profiles" pour jurés externes AVANT qu'ils n'aient
--      un compte auth. Nouvelle colonne auth_linked_at timestamptz NULL —
--      remplie quand le ghost profile est lié à un auth.uid() réel (via
--      magic-link). FK assignments.jury_user_id → auth.users DROPPED itou
--      (cohérence : un ghost doit être assignable avant son auth.user).
--   8. Nouveau RPC rsa_create_jury_profile(p_qualite, p_organisation, p_bio,
--      p_photo_path, p_role_hint) RETURNS uuid : insère un platform_jury_
--      profiles avec user_id = gen_random_uuid() (ghost). Retourne l'id pour
--      enchaîner avec rsa_assign_juror.
--
--   PRESIDENT JURY
--   --------------
--   9. editions.jury_president text + editions.jury_president_photo_path text
--      — pure metadata édition-level (pas de logique métier ; affichage public
--      du palmarès et de la fiche compétition).
--
-- DÉPEND DE :
--   * 20260527_rsa_module3_jury.sql              (platform_jury_* tables + RPC)
--   * 20260531_rsa_v25_prizes.sql                (table prizes + RPC v1)
--   * 20260531_rsa_v25_competition_delete_audit  (admin_audit_log)
--   * 20260601_rsa_v3_publish_session_extended   (rsa_publish_session V3 vague 2)
--   * 20260602_rsa_v3_competition_admin_role.sql (is_competition_admin helper)
--
-- IDEMPOTENCE : DROP/ADD COLUMN IF EXISTS, DROP CONSTRAINT IF EXISTS, CREATE OR
-- REPLACE FUNCTION partout. Safe à ré-exécuter.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. EDITIONS : president jury (info-only)
-- ============================================================================
ALTER TABLE public.editions
  ADD COLUMN IF NOT EXISTS jury_president            text,
  ADD COLUMN IF NOT EXISTS jury_president_photo_path text;

COMMENT ON COLUMN public.editions.jury_president IS
  'V3 : nom du président du jury (info-only, affichage palmarès + fiche compétition).';
COMMENT ON COLUMN public.editions.jury_president_photo_path IS
  'V3 : path Storage de la photo du président du jury (bucket admins/ ou public/).';

-- ============================================================================
-- 2. PLATFORM_JURY_ASSIGNMENTS : role tag (regular|special)
-- ============================================================================
ALTER TABLE public.platform_jury_assignments
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'regular';

-- CHECK constraint en mode idempotent (DROP/ADD)
ALTER TABLE public.platform_jury_assignments
  DROP CONSTRAINT IF EXISTS platform_jury_assignments_role_check;
ALTER TABLE public.platform_jury_assignments
  ADD CONSTRAINT platform_jury_assignments_role_check
  CHECK (role IN ('regular','special'));

COMMENT ON COLUMN public.platform_jury_assignments.role IS
  'V3 Jury V2 : ''regular'' = juré rotarien standard ; ''special'' = expert externe non-rotarien. PUREMENT INFORMATIF — n''affecte pas la moyenne pondérée.';

-- ============================================================================
-- 3. PLATFORM_JURY_PROFILES : auth_linked_at + DROP FK to auth.users
-- ============================================================================
ALTER TABLE public.platform_jury_profiles
  ADD COLUMN IF NOT EXISTS auth_linked_at timestamptz;

COMMENT ON COLUMN public.platform_jury_profiles.auth_linked_at IS
  'V3 Jury V2 : timestamp du moment où ce ghost profile a été lié à un auth.users réel (via UPDATE user_id côté frontend post-magic-link). NULL = ghost non encore connecté.';

-- DROP FK platform_jury_profiles.user_id → auth.users (permet ghosts)
ALTER TABLE public.platform_jury_profiles
  DROP CONSTRAINT IF EXISTS platform_jury_profiles_user_id_fkey;

-- DROP FK platform_jury_assignments.jury_user_id → auth.users (cohérence
-- ghost — un juré externe doit pouvoir être assigné AVANT son auth.user).
ALTER TABLE public.platform_jury_assignments
  DROP CONSTRAINT IF EXISTS platform_jury_assignments_jury_user_id_fkey;

COMMENT ON COLUMN public.platform_jury_profiles.user_id IS
  'V3 Jury V2 : uuid PK. Pas de FK vers auth.users : permet la création de ghost profiles (jurés externes) avant qu''ils n''aient un compte auth. Lié plus tard via UPDATE user_id + auth_linked_at = now() côté frontend.';

COMMENT ON COLUMN public.platform_jury_assignments.jury_user_id IS
  'V3 Jury V2 : uuid (pas de FK vers auth.users — cohérence avec platform_jury_profiles ghost). Référence implicite platform_jury_profiles.user_id.';

-- ============================================================================
-- 4. PRIZES : KILL jury_type column + recreate RPCs without p_jury_type
-- ============================================================================
-- Drop des anciennes signatures qui contiennent p_jury_type avant l'ALTER DROP
-- COLUMN (sinon les fonctions perdraient leur référence en cours d'exec).
DROP FUNCTION IF EXISTS public.rsa_create_prize(text, text, text, text, text, numeric, text, text, text);
DROP FUNCTION IF EXISTS public.rsa_update_prize(uuid, text, numeric, text, text, text, text, integer);

ALTER TABLE public.prizes
  DROP COLUMN IF EXISTS jury_type;

-- Recreate rsa_create_prize sans p_jury_type
CREATE OR REPLACE FUNCTION public.rsa_create_prize(
  p_edition_id  text,
  p_club_id     text DEFAULT NULL,
  p_session_id  text DEFAULT NULL,
  p_kind        text DEFAULT 'special',
  p_name        text DEFAULT NULL,
  p_amount      numeric DEFAULT 0,
  p_currency    text DEFAULT 'EUR',
  p_description text DEFAULT NULL
)
RETURNS public.prizes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_row     public.prizes;
  v_allowed boolean;
BEGIN
  IF p_edition_id IS NULL OR length(trim(p_edition_id)) = 0 THEN
    RAISE EXCEPTION 'p_edition_id ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.editions WHERE id = p_edition_id) THEN
    RAISE EXCEPTION 'Édition % introuvable.', p_edition_id USING ERRCODE = '23503';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'p_name ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'p_amount doit être >= 0.' USING ERRCODE = '22023';
  END IF;
  IF p_kind NOT IN ('general', 'special') THEN
    RAISE EXCEPTION 'p_kind doit être ''general'' ou ''special''.' USING ERRCODE = '22023';
  END IF;
  IF p_currency NOT IN ('EUR', 'USD', 'CHF', 'GBP') THEN
    RAISE EXCEPTION 'p_currency doit être EUR, USD, CHF ou GBP.' USING ERRCODE = '22023';
  END IF;
  IF p_club_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.clubs WHERE id = p_club_id) THEN
    RAISE EXCEPTION 'Club % introuvable.', p_club_id USING ERRCODE = '23503';
  END IF;
  IF p_session_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.sessions WHERE id = p_session_id) THEN
    RAISE EXCEPTION 'Session % introuvable.', p_session_id USING ERRCODE = '23503';
  END IF;
  IF p_club_id IS NOT NULL AND p_kind = 'general' THEN
    RAISE EXCEPTION 'Un prix de club doit être de kind ''special''.' USING ERRCODE = '22023';
  END IF;

  IF p_kind = 'general' OR p_club_id IS NULL THEN
    v_allowed := public.is_master_admin() OR public.is_competition_admin(p_edition_id);
  ELSE
    v_allowed := public.is_master_admin()
              OR public.is_competition_admin(p_edition_id)
              OR public.is_club_member(p_club_id, 'club_admin');
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Vous n''avez pas le droit de créer ce prix.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.prizes (
    edition_id, club_id, session_id, kind, name, amount, currency,
    description, created_by
  )
  VALUES (
    p_edition_id,
    p_club_id,
    p_session_id,
    p_kind,
    trim(p_name),
    p_amount,
    p_currency,
    NULLIF(trim(coalesce(p_description, '')), ''),
    auth.uid()
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
COMMENT ON FUNCTION public.rsa_create_prize(text, text, text, text, text, numeric, text, text) IS
  'V3 Prizes V2 : crée un prix (jury_type SUPPRIMÉ — la distinction remonte aux assignments). master/competition_admin pour general/global ; + club_admin pour les prix de club.';

-- Recreate rsa_update_prize sans p_jury_type
CREATE OR REPLACE FUNCTION public.rsa_update_prize(
  p_id          uuid,
  p_name        text DEFAULT NULL,
  p_amount      numeric DEFAULT NULL,
  p_currency    text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_session_id  text DEFAULT NULL,
  p_position    integer DEFAULT NULL
)
RETURNS public.prizes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_existing public.prizes;
  v_row      public.prizes;
  v_allowed  boolean;
BEGIN
  SELECT * INTO v_existing FROM public.prizes WHERE id = p_id;
  IF v_existing.id IS NULL THEN
    RAISE EXCEPTION 'Prix % introuvable.', p_id USING ERRCODE = '23503';
  END IF;

  IF v_existing.kind = 'general' OR v_existing.club_id IS NULL THEN
    v_allowed := public.is_master_admin()
              OR public.is_competition_admin(v_existing.edition_id);
  ELSE
    v_allowed := public.is_master_admin()
              OR public.is_competition_admin(v_existing.edition_id)
              OR public.is_club_member(v_existing.club_id, 'club_admin');
  END IF;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Vous n''avez pas le droit d''éditer ce prix.' USING ERRCODE = '42501';
  END IF;

  IF p_name IS NOT NULL AND length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'p_name ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NOT NULL AND p_amount < 0 THEN
    RAISE EXCEPTION 'p_amount doit être >= 0.' USING ERRCODE = '22023';
  END IF;
  IF p_currency IS NOT NULL AND p_currency NOT IN ('EUR', 'USD', 'CHF', 'GBP') THEN
    RAISE EXCEPTION 'p_currency doit être EUR, USD, CHF ou GBP.' USING ERRCODE = '22023';
  END IF;
  IF p_session_id IS NOT NULL AND p_session_id <> ''
     AND NOT EXISTS (SELECT 1 FROM public.sessions WHERE id = p_session_id) THEN
    RAISE EXCEPTION 'Session % introuvable.', p_session_id USING ERRCODE = '23503';
  END IF;

  UPDATE public.prizes
     SET name        = COALESCE(NULLIF(trim(coalesce(p_name, '')), ''), name),
         amount      = COALESCE(p_amount, amount),
         currency    = COALESCE(p_currency, currency),
         description = CASE
           WHEN p_description IS NULL THEN description
           WHEN length(trim(p_description)) = 0 THEN NULL
           ELSE trim(p_description)
         END,
         session_id  = CASE
           WHEN p_session_id IS NULL THEN session_id
           WHEN p_session_id = '' THEN NULL
           ELSE p_session_id
         END,
         position    = COALESCE(p_position, position)
   WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
COMMENT ON FUNCTION public.rsa_update_prize(uuid, text, numeric, text, text, text, integer) IS
  'V3 Prizes V2 : édite un prix (jury_type SUPPRIMÉ). Chaque param NULL = ne pas toucher.';

GRANT EXECUTE ON FUNCTION public.rsa_create_prize(text, text, text, text, text, numeric, text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_update_prize(uuid, text, numeric, text, text, text, integer)
  TO authenticated;

-- ============================================================================
-- 5. RPC rsa_reassign_prize : réassigner un prix déjà décerné
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rsa_reassign_prize(
  p_prize_id        uuid,
  p_new_startup_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_prize        public.prizes;
  v_old_startup  uuid;
  v_allowed      boolean;
  v_actor        uuid := auth.uid();
  v_actor_email  text;
BEGIN
  IF p_prize_id IS NULL THEN
    RAISE EXCEPTION 'p_prize_id ne peut pas être null.' USING ERRCODE = '22023';
  END IF;
  IF p_new_startup_id IS NULL THEN
    RAISE EXCEPTION 'p_new_startup_id ne peut pas être null.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_prize FROM public.prizes WHERE id = p_prize_id;
  IF v_prize.id IS NULL THEN
    RAISE EXCEPTION 'Prix % introuvable.', p_prize_id USING ERRCODE = '23503';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.startups WHERE id = p_new_startup_id) THEN
    RAISE EXCEPTION 'Startup % introuvable.', p_new_startup_id USING ERRCODE = '23503';
  END IF;

  -- Permission : master_admin OU competition_admin de l'édition OU
  -- club_admin si le prix est rattaché à un club.
  IF v_prize.club_id IS NULL THEN
    v_allowed := public.is_master_admin()
              OR public.is_competition_admin(v_prize.edition_id);
  ELSE
    v_allowed := public.is_master_admin()
              OR public.is_competition_admin(v_prize.edition_id)
              OR public.is_club_member(v_prize.club_id, 'club_admin');
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Vous n''avez pas le droit de réassigner ce prix.'
      USING ERRCODE = '42501';
  END IF;

  v_old_startup := v_prize.awarded_to;

  UPDATE public.prizes
     SET awarded_to = p_new_startup_id,
         awarded_at = now()
   WHERE id = p_prize_id;

  -- Audit log (bypass aal_insert_denied via SECURITY DEFINER)
  SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor;
  INSERT INTO public.admin_audit_log (
    actor_id, actor_email, action, target_kind, target_id, payload
  ) VALUES (
    v_actor,
    v_actor_email,
    'prize_reassigned',
    'prize',
    p_prize_id::text,
    jsonb_build_object(
      'prize_id',         p_prize_id,
      'old_startup_id',   v_old_startup,
      'new_startup_id',   p_new_startup_id,
      'edition_id',       v_prize.edition_id,
      'club_id',          v_prize.club_id,
      'session_id',       v_prize.session_id,
      'prize_name',       v_prize.name,
      'prize_kind',       v_prize.kind
    )
  );
END;
$$;
COMMENT ON FUNCTION public.rsa_reassign_prize(uuid, uuid) IS
  'V3 Prizes V2 : réassigne un prix déjà décerné à une autre startup. master/competition_admin (édition) OU club_admin (si club_id). Trace dans admin_audit_log (action=''prize_reassigned'').';

GRANT EXECUTE ON FUNCTION public.rsa_reassign_prize(uuid, uuid) TO authenticated;

-- ============================================================================
-- 6. RPC rsa_assign_juror : UPSERT platform_jury_assignments + role tag
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rsa_assign_juror(
  p_session_id   text,
  p_jury_user_id uuid,
  p_role         text DEFAULT 'regular'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_club_id    text;
  v_edition_id text;
  v_allowed    boolean;
BEGIN
  IF p_session_id IS NULL OR length(trim(p_session_id)) = 0 THEN
    RAISE EXCEPTION 'p_session_id ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;
  IF p_jury_user_id IS NULL THEN
    RAISE EXCEPTION 'p_jury_user_id ne peut pas être null.' USING ERRCODE = '22023';
  END IF;
  IF p_role IS NULL OR p_role NOT IN ('regular','special') THEN
    RAISE EXCEPTION 'p_role doit être ''regular'' ou ''special''.' USING ERRCODE = '22023';
  END IF;

  SELECT club_id, edition_id INTO v_club_id, v_edition_id
    FROM public.sessions WHERE id = p_session_id;
  IF v_edition_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.sessions WHERE id = p_session_id) THEN
    RAISE EXCEPTION 'Session % introuvable.', p_session_id USING ERRCODE = '23503';
  END IF;

  -- Permission : master_admin OU competition_admin OU club_admin du club
  v_allowed := public.is_master_admin()
            OR (v_edition_id IS NOT NULL AND public.is_competition_admin(v_edition_id))
            OR (v_club_id    IS NOT NULL AND public.is_club_member(v_club_id, 'club_admin'));

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Vous n''avez pas le droit d''assigner un juré à cette session.'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.platform_jury_assignments (
    jury_user_id, session_id, role, created_by
  ) VALUES (
    p_jury_user_id, p_session_id, p_role, auth.uid()
  )
  ON CONFLICT (jury_user_id, session_id) DO UPDATE
    SET role       = EXCLUDED.role,
        created_by = EXCLUDED.created_by;
END;
$$;
COMMENT ON FUNCTION public.rsa_assign_juror(text, uuid, text) IS
  'V3 Jury V2 : UPSERT platform_jury_assignments avec role tag. master/competition_admin OU club_admin du club de la session.';

GRANT EXECUTE ON FUNCTION public.rsa_assign_juror(text, uuid, text) TO authenticated;

-- ============================================================================
-- 7. RPC rsa_remove_juror : DELETE assignment (refusé si scores déjà soumis)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rsa_remove_juror(
  p_session_id   text,
  p_jury_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_club_id    text;
  v_edition_id text;
  v_allowed    boolean;
  v_has_scores boolean;
BEGIN
  IF p_session_id IS NULL OR length(trim(p_session_id)) = 0 THEN
    RAISE EXCEPTION 'p_session_id ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;
  IF p_jury_user_id IS NULL THEN
    RAISE EXCEPTION 'p_jury_user_id ne peut pas être null.' USING ERRCODE = '22023';
  END IF;

  SELECT club_id, edition_id INTO v_club_id, v_edition_id
    FROM public.sessions WHERE id = p_session_id;
  IF v_edition_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.sessions WHERE id = p_session_id) THEN
    RAISE EXCEPTION 'Session % introuvable.', p_session_id USING ERRCODE = '23503';
  END IF;

  v_allowed := public.is_master_admin()
            OR (v_edition_id IS NOT NULL AND public.is_competition_admin(v_edition_id))
            OR (v_club_id    IS NOT NULL AND public.is_club_member(v_club_id, 'club_admin'));

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Vous n''avez pas le droit de retirer un juré de cette session.'
      USING ERRCODE = '42501';
  END IF;

  -- Garde : refuser si scores finaux déjà soumis (intégrité audit).
  SELECT EXISTS (
    SELECT 1 FROM public.platform_jury_scores
     WHERE session_id   = p_session_id
       AND jury_user_id = p_jury_user_id
  ) INTO v_has_scores;

  IF v_has_scores THEN
    RAISE EXCEPTION 'Impossible : ce juré a déjà soumis des scores pour cette session. Supprimez les scores d''abord (admin uniquement) avant de désassigner.'
      USING ERRCODE = '23503';
  END IF;

  DELETE FROM public.platform_jury_assignments
   WHERE session_id   = p_session_id
     AND jury_user_id = p_jury_user_id;
END;
$$;
COMMENT ON FUNCTION public.rsa_remove_juror(text, uuid) IS
  'V3 Jury V2 : DELETE platform_jury_assignments. REFUSÉ si le juré a déjà soumis des scores finaux pour cette session (intégrité).';

GRANT EXECUTE ON FUNCTION public.rsa_remove_juror(text, uuid) TO authenticated;

-- ============================================================================
-- 8. RPC rsa_create_jury_profile : ghost profile pour juré externe
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rsa_create_jury_profile(
  p_qualite      text,
  p_organisation text,
  p_bio          text,
  p_photo_path   text,
  p_role_hint    text DEFAULT 'special'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_new_id  uuid := gen_random_uuid();
  v_allowed boolean;
BEGIN
  -- Permission : master_admin OU competition_admin (n'importe quelle édition)
  -- OU club_admin (n'importe quel club). Le ghost n'est pas encore rattaché ;
  -- l'authz fine vient au moment du rsa_assign_juror.
  v_allowed := public.is_master_admin()
            OR public.has_platform_role('admin')
            OR EXISTS (
                 SELECT 1 FROM public.competition_admins
                  WHERE user_id = auth.uid()
               )
            OR EXISTS (
                 SELECT 1 FROM public.club_memberships
                  WHERE user_id = auth.uid()
                    AND role = 'club_admin'
               );

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Vous n''avez pas le droit de créer un profil juré.'
      USING ERRCODE = '42501';
  END IF;

  IF p_role_hint IS NOT NULL AND p_role_hint NOT IN ('regular','special') THEN
    RAISE EXCEPTION 'p_role_hint doit être ''regular'' ou ''special''.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.platform_jury_profiles (
    user_id, qualite, organisation, bio, photo_path
  ) VALUES (
    v_new_id,
    NULLIF(trim(coalesce(p_qualite, '')), ''),
    NULLIF(trim(coalesce(p_organisation, '')), ''),
    NULLIF(trim(coalesce(p_bio, '')), ''),
    NULLIF(trim(coalesce(p_photo_path, '')), '')
  );

  RETURN v_new_id;
END;
$$;
COMMENT ON FUNCTION public.rsa_create_jury_profile(text, text, text, text, text) IS
  'V3 Jury V2 : crée un ghost profile (user_id = gen_random_uuid()) sans toucher auth.users. master/competition_admin/club_admin. Retourne l''uuid pour enchaîner avec rsa_assign_juror.';

GRANT EXECUTE ON FUNCTION public.rsa_create_jury_profile(text, text, text, text, text) TO authenticated;

-- ============================================================================
-- 9. rsa_publish_session — V3 Vague 3 : auto-award top1 sur prix kind='general'
-- ============================================================================
-- CREATE OR REPLACE — préserve les 9 étapes V3 Vague 2 et insère un step 6bis
-- (après le snapshot session_config, avant la projection startups.finaliste) :
--   - Trouve le top1 (final_rank = 1) du v_ranking.
--   - UPDATE prizes SET awarded_to = top1, awarded_at = now()
--     WHERE session_id = p_session_id AND kind = 'general' AND awarded_to IS NULL.
--   - Capture les rows updated dans v_auto_awarded (jsonb array) — injecté
--     dans l'audit payload sous la clé 'auto_awarded_prizes'.
-- Idempotent : on ne touche pas les prix déjà awarded (awarded_to IS NULL guard).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rsa_publish_session(p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_n              int;
  v_ranking        jsonb;
  v_promoted       jsonb;
  v_club_id        text;
  v_edition_id     text;
  v_kind           text;
  v_actor          uuid;
  v_actor_email    text;
  v_inserted       int;
  v_top1_startup   uuid;
  v_auto_awarded   jsonb := '[]'::jsonb;
BEGIN
  -- 1. Charger session : club_id, edition_id, kind
  SELECT club_id, edition_id, kind
    INTO v_club_id, v_edition_id, v_kind
    FROM public.sessions WHERE id = p_session_id;
  IF v_edition_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.sessions WHERE id = p_session_id) THEN
    RAISE EXCEPTION 'session_not_found: %', p_session_id USING errcode = '22023';
  END IF;

  -- 2. Permission : admin legacy OR master_admin OR club_admin du club.
  IF NOT (
    public.has_platform_role('admin')
    OR public.is_master_admin()
    OR (v_club_id IS NOT NULL AND public.is_club_member(v_club_id, 'club_admin'))
  ) THEN
    RAISE EXCEPTION 'rsa_publish_session: admin only (club_id=%)', v_club_id
      USING errcode = '42501';
  END IF;

  -- 3. Lifecycle : session must be 'locked'.
  IF NOT EXISTS (
    SELECT 1 FROM public.session_config
     WHERE session_id = p_session_id AND status = 'locked'
  ) THEN
    RAISE EXCEPTION 'session_not_locked: %', p_session_id USING errcode = '22023';
  END IF;

  -- 4. N = editions.finalists_per_session
  SELECT COALESCE(e.finalists_per_session, 1) INTO v_n
    FROM public.startups s JOIN public.editions e ON e.id = s.edition_id
    WHERE s.session_id = p_session_id LIMIT 1;
  IF v_n IS NULL THEN
    SELECT COALESCE(e.finalists_per_session, 1) INTO v_n
      FROM public.sessions ss JOIN public.editions e ON e.id = ss.edition_id
      WHERE ss.id = p_session_id LIMIT 1;
  END IF;
  v_n := COALESCE(v_n, 1);

  -- 5. Ranking : moyenne pondérée par startup, tri DESC puis name ASC.
  WITH per_score AS (
    SELECT s.id AS startup_id, s.name AS startup_name,
           public.rsa_weighted_score(js) AS w
      FROM public.platform_jury_scores js JOIN public.startups s ON s.id = js.startup_id
     WHERE js.session_id = p_session_id
  ),
  agg AS (
    SELECT startup_id, startup_name,
           ROUND(AVG(w)::numeric, 2) AS avg_w,
           COUNT(*)::int AS n_jurors
      FROM per_score GROUP BY startup_id, startup_name
  ),
  ranked AS (
    SELECT startup_id, startup_name, avg_w, n_jurors,
           ROW_NUMBER() OVER (ORDER BY avg_w DESC, startup_name ASC)::int AS final_rank
      FROM agg
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'startup_id', startup_id, 'startup', startup_name,
    'avg', avg_w, 'n', n_jurors, 'final_rank', final_rank
  ) ORDER BY final_rank), '[]'::jsonb) INTO v_ranking FROM ranked;

  -- 6. Snapshot session_config + flip status.
  UPDATE public.session_config
     SET status = 'published', final_ranking = v_ranking, updated_at = now()
   WHERE session_id = p_session_id;

  -- 6bis. AUTO-AWARD — V3 Vague 3 :
  --   Décerne automatiquement le top1 (final_rank=1) à tous les prix
  --   kind='general' rattachés à la session, awarded_to IS NULL uniquement
  --   (jamais d'écrasement, idempotent).
  SELECT (e->>'startup_id')::uuid INTO v_top1_startup
    FROM jsonb_array_elements(v_ranking) e
   WHERE (e->>'final_rank')::int = 1
   LIMIT 1;

  IF v_top1_startup IS NOT NULL THEN
    WITH awarded AS (
      UPDATE public.prizes
         SET awarded_to = v_top1_startup,
             awarded_at = now()
       WHERE session_id = p_session_id
         AND edition_id = v_edition_id
         AND kind       = 'general'
         AND awarded_to IS NULL
      RETURNING id, name, amount, currency
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'prize_id',   id,
             'startup_id', v_top1_startup,
             'prize_name', name,
             'amount',     amount,
             'currency',   currency
           )), '[]'::jsonb)
      INTO v_auto_awarded
      FROM awarded;
  END IF;

  -- 7. Projection startups.status='finaliste' sur le top-N (bypass-sentinel).
  PERFORM set_config('rsa.allow_protected_update', 't', true);
  UPDATE public.startups st SET status = 'finaliste', updated_at = now()
   WHERE st.session_id = p_session_id
     AND st.id IN (
       SELECT (e->>'startup_id')::uuid FROM jsonb_array_elements(v_ranking) e
        WHERE (e->>'final_rank')::int <= v_n
     );
  PERFORM set_config('rsa.allow_protected_update', '', true);

  -- 8. AUTO-PROMOTE — V3 Vague 2 (inchangé).
  v_actor := auth.uid();
  v_inserted := 0;
  v_promoted := '[]'::jsonb;

  IF COALESCE(v_kind, 'qualifying') <> 'finale' THEN
    WITH top_n AS (
      SELECT (e->>'startup_id')::uuid AS startup_id,
             e->>'startup'            AS startup_name,
             (e->>'final_rank')::int  AS final_rank
        FROM jsonb_array_elements(v_ranking) e
       WHERE (e->>'final_rank')::int <= v_n
    ),
    ins AS (
      INSERT INTO public.platform_finale_membership (
        edition_id, startup_id, source_session_id, promoted_at, promoted_by
      )
      SELECT v_edition_id, startup_id, p_session_id, now(), v_actor
        FROM top_n
      ON CONFLICT (edition_id, startup_id) DO NOTHING
      RETURNING startup_id
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'startup_id', t.startup_id,
              'startup',    t.startup_name,
              'final_rank', t.final_rank
            ) ORDER BY t.final_rank), '[]'::jsonb),
           (SELECT COUNT(*)::int FROM ins)
      INTO v_promoted, v_inserted
      FROM top_n t;
  END IF;

  -- 9. Audit row (enrichi avec auto_awarded_prizes).
  SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor;
  INSERT INTO public.admin_audit_log (
    actor_id, actor_email, action, target_kind, target_id, payload
  ) VALUES (
    v_actor,
    v_actor_email,
    'session_concluded',
    'session',
    p_session_id,
    jsonb_build_object(
      'edition_id',           v_edition_id,
      'club_id',              v_club_id,
      'kind',                 COALESCE(v_kind, 'qualifying'),
      'top_n',                v_n,
      'ranking',              v_ranking,
      'promoted',             v_promoted,
      'promoted_rows',        v_inserted,
      'auto_awarded_prizes',  v_auto_awarded
    )
  );
END;
$function$;

COMMENT ON FUNCTION public.rsa_publish_session(text) IS
  'V3 Vague 3 — "Conclure la session" + auto-award. Publie résultats + projette ' ||
  'top-N en finaliste + auto-promote top-N dans platform_finale_membership + ' ||
  'auto-award du top1 sur prix kind=''general'' de la session (idempotent). ' ||
  'Trace audit log enrichi (auto_awarded_prizes).';

GRANT EXECUTE ON FUNCTION public.rsa_publish_session(text) TO authenticated;

COMMIT;
