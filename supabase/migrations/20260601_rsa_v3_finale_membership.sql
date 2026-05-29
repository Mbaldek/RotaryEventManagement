-- ============================================================================
-- V3 Vague 2 — Feature A.1 : auto-promote to federated finale
-- ============================================================================
-- Décision A.1 verrouillée : un seul acte du club_admin / master_admin sur le
-- cockpit Live d'une session qualificative — « Conclure la session et
-- officialiser les résultats et promouvoir le vainqueur en finale ». Pas de
-- bouton séparé "Promouvoir" : la promotion top-N se fait automatiquement
-- côté serveur à la publication.
--
-- Décision A.3 : le pool de la Grande Finale est curé par master_admin via
-- cette table dédiée (PLUS l'union des jurys de club). C'est le master_admin
-- seul (ou la RPC SECURITY DEFINER au moment du publish) qui peut retirer un
-- finaliste promu accidentellement.
--
-- Cette migration pose UNIQUEMENT la table + RLS + index. L'extension du RPC
-- rsa_publish_session pour insérer dans cette table est dans la migration
-- soeur 20260601_rsa_v3_publish_session_extended.sql.
--
-- DESIGN — clé primaire (edition_id, startup_id) :
--   * On promeut au pool de l'édition (et pas de la session) car une édition
--     a UNE finale fédérée. Un startup ne peut être promue qu'une fois par
--     édition (idempotence via ON CONFLICT DO NOTHING dans le RPC).
--   * source_session_id permet la traçabilité (depuis quelle session de club
--     a-t-elle été promue ?) mais reste informationnel : ON DELETE SET NULL
--     pour ne pas casser le pool si on supprime une session a posteriori.
--
-- DESIGN — RLS :
--   * SELECT : staff (admin legacy + master_admin + comité legacy) — pour
--     que le Master Cockpit puisse afficher le pool. PAS de visibilité côté
--     candidat (cohérence M3 : le candidat voit son startup.status='finaliste'
--     uniquement).
--   * INSERT/UPDATE/DELETE : master_admin uniquement via JWT. Le RPC d'auto-
--     promote (SECURITY DEFINER) bypasse cette politique pour le INSERT au
--     moment du publish d'une session.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Table platform_finale_membership
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_finale_membership (
  edition_id        text        NOT NULL REFERENCES public.editions(id)  ON DELETE CASCADE,
  startup_id        uuid        NOT NULL REFERENCES public.startups(id)  ON DELETE CASCADE,
  source_session_id text                 REFERENCES public.sessions(id)  ON DELETE SET NULL,
  promoted_at       timestamptz NOT NULL DEFAULT now(),
  promoted_by       uuid                 REFERENCES auth.users(id),
  PRIMARY KEY (edition_id, startup_id)
);

CREATE INDEX IF NOT EXISTS platform_finale_membership_edition_idx
  ON public.platform_finale_membership(edition_id);

CREATE INDEX IF NOT EXISTS platform_finale_membership_session_idx
  ON public.platform_finale_membership(source_session_id);

COMMENT ON TABLE public.platform_finale_membership IS
  'V3 Vague 2 — Pool des startups promues à la Grande Finale fédérée d''une édition. ' ||
  'Une row = une startup qualifiée pour la finale (idempotent via PK). Géré côté ' ||
  'serveur par rsa_publish_session (auto-promote top-N) ou directement par ' ||
  'master_admin (retrait manuel d''un finaliste).';

-- ----------------------------------------------------------------------------
-- 2. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.platform_finale_membership ENABLE ROW LEVEL SECURITY;

-- SELECT : staff plateforme (admin legacy + comité legacy + master_admin) +
-- club_admin du club d'origine de la startup (pour voir ses championnes).
DROP POLICY IF EXISTS pfm_read ON public.platform_finale_membership;
CREATE POLICY pfm_read ON public.platform_finale_membership FOR SELECT
  TO authenticated
  USING (
    public.has_platform_role('admin')
    OR public.has_platform_role('comite')
    OR public.is_master_admin()
    OR EXISTS (
      SELECT 1 FROM public.startups s
       WHERE s.id = platform_finale_membership.startup_id
         AND s.club_id IS NOT NULL
         AND public.is_club_member(s.club_id, 'club_admin')
    )
  );

-- INSERT direct : master_admin uniquement (le RPC publish a SECURITY DEFINER
-- et bypasse RLS pour l'insert auto-promote).
DROP POLICY IF EXISTS pfm_insert_master ON public.platform_finale_membership;
CREATE POLICY pfm_insert_master ON public.platform_finale_membership FOR INSERT
  TO authenticated
  WITH CHECK (public.is_master_admin());

-- UPDATE : master_admin uniquement (rarement utile, mais consistant).
DROP POLICY IF EXISTS pfm_update_master ON public.platform_finale_membership;
CREATE POLICY pfm_update_master ON public.platform_finale_membership FOR UPDATE
  TO authenticated
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

-- DELETE : master_admin uniquement (retirer un finaliste promu accidentellement).
DROP POLICY IF EXISTS pfm_delete_master ON public.platform_finale_membership;
CREATE POLICY pfm_delete_master ON public.platform_finale_membership FOR DELETE
  TO authenticated
  USING (public.is_master_admin());

-- ----------------------------------------------------------------------------
-- 3. RPC rsa_remove_finalist(edition_id, startup_id) — master_admin only
-- ----------------------------------------------------------------------------
-- Aide à conserver le palmarès cohérent : retire la startup du pool finale
-- ET la rétrograde startups.status='note' (elle reste évaluée mais plus
-- finaliste). Trace l'action dans admin_audit_log.
--
-- SECURITY DEFINER pour le bypass-sentinel du trigger startups_guard_update
-- + pour pouvoir écrire dans admin_audit_log (aal_insert_denied côté JWT).

CREATE OR REPLACE FUNCTION public.rsa_remove_finalist(
  p_edition_id text,
  p_startup_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor       uuid;
  v_actor_email text;
  v_count       int;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'rsa_remove_finalist: master_admin only'
      USING errcode = '42501';
  END IF;

  -- 1. Retirer du pool finale (idempotent : pas d'erreur si absent).
  DELETE FROM public.platform_finale_membership
   WHERE edition_id = p_edition_id
     AND startup_id = p_startup_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- 2. Si la startup est encore en status='finaliste', la rétrograde 'note'
  --    (bypass-sentinel pour le trigger startups_guard_update).
  PERFORM set_config('rsa.allow_protected_update', 't', true);
  UPDATE public.startups
     SET status = 'note', updated_at = now()
   WHERE id = p_startup_id
     AND edition_id = p_edition_id
     AND status = 'finaliste';
  PERFORM set_config('rsa.allow_protected_update', '', true);

  -- 3. Audit log
  v_actor := auth.uid();
  SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor;
  INSERT INTO public.admin_audit_log (
    actor_id, actor_email, action, target_kind, target_id, payload
  ) VALUES (
    v_actor,
    v_actor_email,
    'finale_membership_removed',
    'startup',
    p_startup_id::text,
    jsonb_build_object(
      'edition_id', p_edition_id,
      'rows_removed', v_count
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.rsa_remove_finalist(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.rsa_remove_finalist(text, uuid) TO authenticated;

COMMENT ON FUNCTION public.rsa_remove_finalist(text, uuid) IS
  'V3 Vague 2 — Master-admin-only : retire une startup du pool finale fédérée ' ||
  'et la rétrograde status=note. Idempotent. Trace admin_audit_log.';

COMMIT;
