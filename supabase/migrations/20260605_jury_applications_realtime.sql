-- ============================================================================
-- Realtime — panel « Candidatures jury » (cockpit club / compétition)
-- ============================================================================
-- Date     : 2026-06-05
--
-- Objectif :
--   Le panel JuryApplicationsTab (file d'attente des dépôts jury) doit se
--   rafraîchir SANS action manuelle quand un·e candidat·e s'inscrit via le
--   funnel public /JuryCandidate. Le composant s'abonne en postgres_changes
--   sur public.jury_applications et invalide sa query React Query.
--
--   Pré-requis serveur (objet de cette migration) :
--     1. La table doit appartenir à la publication `supabase_realtime`, sinon
--        AUCUN event WAL n'est diffusé. Elle ne l'était pas (contrairement à
--        jury_profiles / jury_scores / session_config…).
--     2. REPLICA IDENTITY FULL pour que le filtre serveur `club_id=eq.<id>`
--        reste fiable sur UPDATE/DELETE (approve/reject) en plus des INSERT.
--
--   La diffusion reste gouvernée par la RLS ja_select (master_admin / admin /
--   club_admin / comité du club / candidat lui-même) — cf.
--   20260530_rsa_v2_jury_funnel.sql §2.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'jury_applications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.jury_applications';
  END IF;
END$$;

ALTER TABLE public.jury_applications REPLICA IDENTITY FULL;

COMMIT;
