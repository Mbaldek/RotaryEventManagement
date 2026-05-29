-- V3.0 — profiles RLS lockdown (PRIORITÉ HAUTE)
-- Avant : policy "Allow all" hérité legacy déjeuners → n'importe qui peut read/write
--          full_name, email de tous les users.
-- Après  : self-read (id ou email JWT) + staff-read (master_admin/admin/comite) ;
--          self-update only ; INSERT/DELETE DENY (service_role uniquement).
--
-- Les RPC qui lisent profiles tournent en SECURITY DEFINER (rsa_admin_override,
-- rsa_list_club_members, etc.) → bypass RLS, non impactés.
-- Référence : docs/hardening/rls-audit-v3.md §profiles.

BEGIN;

DROP POLICY IF EXISTS "Allow all" ON public.profiles;
DROP POLICY IF EXISTS profiles_all ON public.profiles;

CREATE POLICY profiles_self_read ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

CREATE POLICY profiles_staff_read ON public.profiles FOR SELECT
  USING (
    public.is_master_admin()
    OR public.has_platform_role('admin')
    OR public.has_platform_role('comite')
  );

CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE
  USING (
    id = auth.uid()
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  WITH CHECK (
    id = auth.uid()
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- INSERT/DELETE : aucune policy = DENY total (service_role bypass RLS).

COMMIT;
