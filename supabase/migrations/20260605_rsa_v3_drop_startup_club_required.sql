-- ============================================================================
-- V3 — Candidature : club_id n'est plus posé par le candidat
-- ============================================================================
-- Le funnel candidat ne demande plus de choisir un club : la startup candidate
-- au concours en général, l'admin (master/competition_admin) route ensuite vers
-- un club organisateur (par pays/affinité). Avant : startups.club_id NOT NULL +
-- picker UX visible. Après : nullable, assigné post-soumission par admin.
--
-- Impacts :
--   - startups.club_id devient nullable
--   - rsa_create_pending_application accepte déjà p_club_id NULL (cf. branche
--     "Club attaché à l'édition (si fourni)") — pas de changement RPC
--   - Les RPC selection (rsa_finalize_review etc.) lisent startups.club_id ;
--     si NULL, v_club_id reste NULL → club_admin ne pourra pas finalize tant
--     que master/competition_admin n'a pas routé. C'est le comportement voulu.
-- ============================================================================

BEGIN;

ALTER TABLE public.startups ALTER COLUMN club_id DROP NOT NULL;

COMMENT ON COLUMN public.startups.club_id IS
  'Club organisateur attribué à la startup. NULL = candidature non encore routée par master/competition_admin (assignement post-soumission). Le candidat ne choisit JAMAIS son club lui-même.';

COMMENT ON TABLE public.edition_clubs IS
  'Junction édition × club : clubs organisateurs participant à une compétition. Sert au routing admin (assignation d''une startup à un club après soumission) et au scoping des rôles club_admin/comite/jury. Le candidat ne consulte plus cette table directement.';

COMMIT;
