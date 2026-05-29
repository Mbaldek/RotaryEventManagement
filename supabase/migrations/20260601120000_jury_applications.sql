-- ============================================================================
-- Chantier 3 — Inscription jury spontanée (form public + review master_admin)
-- ============================================================================
-- Date     : 2026-06-01
-- Blueprint: docs/blueprints/auth-routing-and-personas.md
--
-- Objectif :
--   Permettre à n'importe qui (anon ou authenticated) de candidater spontanément
--   au rôle "jury" via /DevenirJury — sans connaître de club au préalable.
--   Le master_admin review depuis le cockpit (panel JuryApplicationsPanel).
--
-- Réalité du schéma à date 2026-06-01 :
--   La table public.jury_applications EXISTE DÉJÀ (créée par la migration
--   20260530_rsa_v2_jury_funnel.sql — Module 7 funnel par club). Elle est
--   structurée pour un dépôt PAR CLUB (club_id NOT NULL, qualité requise,
--   thèmes en text[], dispos en text[]).
--
--   Le présent chantier ÉLARGIT la même table pour accueillir une 2e voie de
--   dépôt : un funnel public "spontané" sans club fixé (club_id devient
--   optionnel, on ajoute expertise jsonb, motivation/availability libres,
--   rejection_reason et created_at — alias d'applied_at, ajouté pour cohérence
--   avec les wrappers JS qui regardent created_at).
--
--   Migration ADDITIVE — pas de drop des RPC M7 existants (rsa_apply_jury,
--   rsa_approve_jury_application, rsa_reject_jury_application,
--   rsa_list_jury_applications). Les nouvelles policies ja_public_insert /
--   ja_master_select / ja_master_update remplacent celles du M7 par des règles
--   plus larges qui couvrent les DEUX voies (funnel club + funnel spontané).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Élargir la table existante
-- ----------------------------------------------------------------------------

-- club_id : NOT NULL ➝ NULLABLE (candidature spontanée sans club fixé).
ALTER TABLE public.jury_applications
  ALTER COLUMN club_id DROP NOT NULL;

-- qualite : NOT NULL ➝ NULLABLE (le funnel spontané ne le demande pas).
ALTER TABLE public.jury_applications
  ALTER COLUMN qualite DROP NOT NULL;

-- Colonnes ajoutées pour la voie spontanée. Tout est NULL-safe pour ne pas
-- casser les inserts existants du funnel club (qui n'envoient pas ces champs).
ALTER TABLE public.jury_applications
  ADD COLUMN IF NOT EXISTS expertise        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS motivation       text,
  ADD COLUMN IF NOT EXISTS availability     text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS created_at       timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.jury_applications.expertise IS
  'Chantier 3 : tableau de domaines d''expertise (["fintech","saas",…]). Voie spontanée uniquement.';
COMMENT ON COLUMN public.jury_applications.motivation IS
  'Chantier 3 : texte libre 200-2000c. Voie spontanée uniquement.';
COMMENT ON COLUMN public.jury_applications.availability IS
  'Chantier 3 : phrase libre courte décrivant la dispo. Voie spontanée uniquement (la voie club utilise availability_session_ids text[]).';
COMMENT ON COLUMN public.jury_applications.rejection_reason IS
  'Chantier 3 : raison textuelle du rejet (rendue au candidat dans l''email de refus). Alias UX de reviewer_note pour la voie spontanée.';

-- Index supplémentaire orienté "queue master_admin pending → all" (tri créa desc).
CREATE INDEX IF NOT EXISTS jury_apps_status_created_idx
  ON public.jury_applications (status, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. RLS — élargir l'insert et resserrer/aligner le master_admin
-- ----------------------------------------------------------------------------
-- M7 avait déjà créé ja_insert_public (WITH CHECK true) côté anon. On la
-- recrée à l'identique sous le nouveau nom pour cohérence de doc, en gardant
-- l'ancienne en place (idempotent). Les autres policies sont DROP/CREATE pour
-- bien couvrir la voie spontanée (qui n'a pas de club_id).

-- INSERT public — anon OU authenticated peuvent déposer. Le trigger qui suit
-- normalise email en lowercase.
DROP POLICY IF EXISTS ja_public_insert ON public.jury_applications;
CREATE POLICY ja_public_insert ON public.jury_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- SELECT — master_admin only pour la review depuis le cockpit. La policy M7
-- ja_select (lecture par club_admin/comite du club, ou par le candidat lui-même)
-- reste en place pour la voie club. La nouvelle ja_master_select ajoute le
-- master_admin scope plateforme — qui couvre AUSSI les dossiers spontanés
-- (club_id IS NULL) que ja_select ne matcherait jamais.
DROP POLICY IF EXISTS ja_master_select ON public.jury_applications;
CREATE POLICY ja_master_select ON public.jury_applications
  FOR SELECT
  USING (public.has_platform_role('master_admin'));

-- UPDATE — master_admin scope plateforme (approve/reject depuis le cockpit).
-- La policy M7 ja_update reste en place pour les club_admin.
DROP POLICY IF EXISTS ja_master_update ON public.jury_applications;
CREATE POLICY ja_master_update ON public.jury_applications
  FOR UPDATE
  USING (public.has_platform_role('master_admin'))
  WITH CHECK (public.has_platform_role('master_admin'));

-- ----------------------------------------------------------------------------
-- 3. Trigger : normaliser email en lowercase à l'insert/update
-- ----------------------------------------------------------------------------
-- Cohérent avec la convention app_user_roles / profiles (cf. R-M4 dans auth.jsx).
-- Le RPC M7 rsa_apply_jury normalise déjà côté SQL, mais l'insert direct depuis
-- le wrapper JS (entité JuryApplication.create) court-circuite ce RPC : on
-- pose donc une normalisation au niveau du trigger pour rester sûr.

CREATE OR REPLACE FUNCTION public.jury_applications_normalize_email()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(trim(NEW.email));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jury_applications_normalize_email ON public.jury_applications;
CREATE TRIGGER trg_jury_applications_normalize_email
  BEFORE INSERT OR UPDATE ON public.jury_applications
  FOR EACH ROW EXECUTE FUNCTION public.jury_applications_normalize_email();

COMMIT;
