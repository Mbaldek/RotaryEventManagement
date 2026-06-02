-- 20260608_rsa_incubators_staff_insert.sql
-- Permet à tout staff (master / competition_admin / club_admin) de CRÉER un
-- incubateur dans la base globale (les clubs apportent leur propre réseau de
-- relais). MODIFY/DELETE restent réservés au master_admin (la base est partagée
-- entre éditions/clubs : on ne renomme/supprime pas l'incubateur d'un autre).
begin;

drop policy if exists incubators_write  on public.incubators;
drop policy if exists incubators_insert on public.incubators;
drop policy if exists incubators_modify on public.incubators;
drop policy if exists incubators_delete on public.incubators;

-- INSERT : tout staff plateforme/club.
create policy incubators_insert on public.incubators for insert
  with check (
        public.is_master_admin()
     or public.has_platform_role('admin')
     or exists (select 1 from public.competition_admins where user_id = auth.uid())
     or exists (select 1 from public.club_memberships where user_id = auth.uid() and role = 'club_admin')
  );

-- UPDATE / DELETE : master_admin uniquement.
create policy incubators_modify on public.incubators for update
  using (public.is_master_admin()) with check (public.is_master_admin());
create policy incubators_delete on public.incubators for delete
  using (public.is_master_admin());

commit;
