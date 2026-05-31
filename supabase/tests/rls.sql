-- Tests de sécurité RLS / privilèges (pgTAP). Codifie les invariants du hardening.
-- Exécution : `supabase test db` (local) ou via psql sur une base avec pgtap.
-- CI : à brancher dans .github/workflows/ci.yml une fois les secrets DB fournis
--       (cf. placeholders PLAYWRIGHT_* / service_role).
--
-- Couvre :
--   1. RLS activé sur les tables sensibles de la plateforme.
--   2. Deny-all (RLS on + 0 policy) sur les tables server-only.
--   3. Régression hardening : aucune RPC admin/staff n'est exécutable par `anon`.
--   4. search_path pinné sur les fonctions précédemment "mutable".

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(13);

-- ── 1. RLS activé sur les tables sensibles ────────────────────────────────
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.startups'::regclass),
  'RLS activé sur startups');
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.jury_applications'::regclass),
  'RLS activé sur jury_applications');
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.platform_jury_scores'::regclass),
  'RLS activé sur platform_jury_scores');
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.platform_jury_assignments'::regclass),
  'RLS activé sur platform_jury_assignments');
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.selection_reviews'::regclass),
  'RLS activé sur selection_reviews');

-- ── 2. Deny-all (RLS on + aucune policy) sur les tables server-only ───────
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.app_config'::regclass)
  AND (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='app_config') = 0,
  'app_config = deny-all (RLS on, 0 policy)');
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.chat_messages'::regclass)
  AND (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='chat_messages') = 0,
  'chat_messages = deny-all (RLS on, 0 policy)');
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.pending_applications_log'::regclass)
  AND (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='pending_applications_log') = 0,
  'pending_applications_log = deny-all (RLS on, 0 policy)');

-- ── 3. Régression : aucune RPC admin/staff exécutable par anon ────────────
SELECT is(
  (SELECT count(*)::int
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'rsa_create_competition','rsa_delete_competition','rsa_award_prize','rsa_grant_competition_admin',
        'rsa_assign_role','rsa_lock_session','rsa_publish_session','rsa_admin_override','rsa_finalize_review',
        'rsa_list_audit_log','rsa_analytics_jury_activity','rsa_analytics_clubs_breakdown','admin_clear_all_chats',
        'rsa_submit_dossier','rsa_approve_jury_application','rsa_reject_jury_application'])
      AND has_function_privilege('anon', p.oid, 'execute')),
  0,
  'aucune RPC admin/staff exécutable par anon (revoke hardening tenu)');

-- Les RPC publiques légitimes RESTENT exécutables par anon (anti-régression inverse).
SELECT ok(
  (SELECT bool_and(has_function_privilege('anon', p.oid, 'execute'))
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('rsa_apply_jury','rsa_create_pending_application','rsa_list_clubs')),
  'les RPC publiques (apply_jury / pending / list_clubs) restent anon');

-- ── 4. search_path pinné (anti-hijack SECURITY DEFINER) ───────────────────
SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN ('rsa_evaluate_eligibility','rsa_weighted_score','rsa_validate_custom_data',
                        'startups_guard_update','startups_normalize_pending_email')
      AND p.proconfig IS NULL),
  0,
  'search_path pinné sur les fonctions précédemment mutable');

-- ── 5. Anti-doublon jury par (édition, email) présent ─────────────────────
SELECT ok(
  EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public'
          AND indexname='jury_apps_one_pending_per_email_per_edition'),
  'index anti-doublon jury (edition,email) présent');

-- ── 6. is_premium / colonnes de rôle non écrivables par le candidat ───────
-- (placeholder de cohérence : les rôles vivent dans app_user_roles, écriture
--  service_role only — vérifié via les policies, test d'isolation à enrichir
--  avec des fixtures user A/B en suivi.)
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.app_user_roles'::regclass),
  'RLS activé sur app_user_roles (rôles non self-grantables)');

SELECT * FROM finish();
ROLLBACK;
