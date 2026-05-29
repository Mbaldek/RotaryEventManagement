-- V3.0 — session_config RLS lockdown (PRIORITÉ HAUTE)
-- Avant : policy "public_all_session_config" using(true) with check(true) → anon
--          peut SELECT/UPDATE teams_link, airtable_link, jury_pack_path,
--          final_ranking, status, admin_overrides.
-- Après  :
--   SELECT : staff (master/admin/comite/jury globaux ou club-scoped) OR rows
--            de sessions à status='published' (palmarès public /Resultats).
--   INSERT/UPDATE/DELETE : DENY direct ; seuls les RPC SECURITY DEFINER
--   (rsa_lock_session, rsa_publish_session, rsa_create_session, rsa_set_session_live,
--    rsa_set_session_draft, rsa_reset_session_template) peuvent écrire.
--
-- Référence : docs/hardening/rls-audit-v3.md §session_config.

BEGIN;

DROP POLICY IF EXISTS public_all_session_config ON public.session_config;
DROP POLICY IF EXISTS "Allow all" ON public.session_config;

-- SELECT : staff OR session publiée (lecture publique palmarès)
CREATE POLICY sc_read_staff ON public.session_config FOR SELECT USING (
  public.is_master_admin()
  OR public.has_platform_role('admin')
  OR public.has_platform_role('comite')
  OR public.has_platform_role('jury')
  OR EXISTS (
    SELECT 1 FROM public.sessions sess
     WHERE sess.id = session_config.session_id
       AND sess.club_id IS NOT NULL
       AND (
         public.is_club_member(sess.club_id, 'club_admin')
         OR public.is_club_member(sess.club_id, 'comite')
         OR public.is_club_member(sess.club_id, 'jury')
       )
  )
  OR (session_config.status = 'published')  -- palmarès public /Resultats lecture anon
);

-- Écriture : DENY direct. Les RPC SECURITY DEFINER restent la seule voie.
CREATE POLICY sc_insert_denied ON public.session_config FOR INSERT WITH CHECK (false);
CREATE POLICY sc_update_denied ON public.session_config FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY sc_delete_denied ON public.session_config FOR DELETE USING (false);

COMMIT;
