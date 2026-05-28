-- ============================================================================
-- V2 MULTI-CLUB — Étape 1 : schéma multi-tenant
-- ============================================================================
-- Pivot architectural 2026-05-28 : passage du modèle monoclub (Rotary Paris)
-- à un modèle fédéré multi-club avec master admin + club admins locaux.
--
-- Cette migration est ADDITIVE (jamais destructive) :
--   - Crée tables `clubs`, `club_memberships`, `edition_clubs`
--   - Ajoute colonnes `editions.model`, `startups.club_id`, `sessions.club_id`
--   - Backfille les données existantes vers le club 'paris' (legacy 2026, 2027)
--   - Crée les helpers SECURITY DEFINER (is_master_admin, is_club_member, …)
--   - Étend les RLS existantes pour scope par club
--   - Seed mat.balleron@proton.me avec rôle global 'master_admin'
--
-- Référence : plan ~/.claude/plans/elegant-giggling-pie.md
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Nouvelles tables
-- ----------------------------------------------------------------------------

-- Source de vérité des clubs participants
CREATE TABLE IF NOT EXISTS public.clubs (
  id            text PRIMARY KEY,           -- 'paris', 'berlin', 'lyon'…
  name          text NOT NULL,              -- 'Rotary Club de Paris'
  region        text,                       -- 'IDF', 'Berlin', …
  contact_email text,
  contact_name  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id)
);
COMMENT ON TABLE public.clubs IS
  'V2 multi-club : un club Rotary participant à des compétitions RSA. Le master admin crée les clubs.';

-- Rôles par club (parallèle à app_user_roles pour rôles globaux)
CREATE TABLE IF NOT EXISTS public.club_memberships (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id    text NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('club_admin', 'comite', 'jury')),
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, club_id, role)
);
CREATE INDEX IF NOT EXISTS club_memberships_club_idx ON public.club_memberships(club_id);
CREATE INDEX IF NOT EXISTS club_memberships_user_idx ON public.club_memberships(user_id);
COMMENT ON TABLE public.club_memberships IS
  'Rôles par-club (club_admin, comite, jury). Les rôles globaux (master_admin, admin legacy) restent dans app_user_roles.';

-- Quels clubs participent à quelle compétition multiclub
CREATE TABLE IF NOT EXISTS public.edition_clubs (
  edition_id        text NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  club_id           text NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  eligibility_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  attached_at       timestamptz NOT NULL DEFAULT now(),
  attached_by       uuid REFERENCES auth.users(id),
  PRIMARY KEY (edition_id, club_id)
);
CREATE INDEX IF NOT EXISTS edition_clubs_edition_idx ON public.edition_clubs(edition_id);
COMMENT ON TABLE public.edition_clubs IS
  'Junction : un club participe à une édition multiclub. eligibility_rules override les règles de l''édition.';

-- ----------------------------------------------------------------------------
-- 2. Colonnes ajoutées aux tables existantes
-- ----------------------------------------------------------------------------

ALTER TABLE public.editions
  ADD COLUMN IF NOT EXISTS model text NOT NULL DEFAULT 'monoclub'
    CHECK (model IN ('monoclub', 'multiclub'));
COMMENT ON COLUMN public.editions.model IS
  'V2 : monoclub (Rotary Paris seul) ou multiclub (fédération de clubs).';

ALTER TABLE public.startups
  ADD COLUMN IF NOT EXISTS club_id text REFERENCES public.clubs(id);
COMMENT ON COLUMN public.startups.club_id IS
  'V2 : club d''appartenance du dossier candidat. NOT NULL après backfill (cf. étape 3 ci-dessous).';

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS club_id text REFERENCES public.clubs(id);
COMMENT ON COLUMN public.sessions.club_id IS
  'V2 : club organisateur de la session qualificative. NULL = Grande Finale fédérée.';

-- ----------------------------------------------------------------------------
-- 3. Backfill (legacy 2026 + 2027 draft → club 'paris')
-- ----------------------------------------------------------------------------

-- Seed du club 'paris' (jamais drop : c'est l'ancrage de toute la donnée legacy)
INSERT INTO public.clubs (id, name, region, contact_email)
VALUES ('paris', 'Rotary Club de Paris', 'Île-de-France', 'rotaryparis1921@gmail.com')
ON CONFLICT (id) DO NOTHING;

-- Tous les dossiers existants partent sous Paris
UPDATE public.startups SET club_id = 'paris' WHERE club_id IS NULL;

-- Toutes les sessions qualificatives existantes partent sous Paris ;
-- les finales restent club_id=NULL (par convention : finale fédérée).
UPDATE public.sessions
   SET club_id = 'paris'
 WHERE club_id IS NULL
   AND kind = 'qualifying';

-- Maintenant qu'il n'y a plus de NULL, on peut verrouiller startups.club_id
ALTER TABLE public.startups ALTER COLUMN club_id SET NOT NULL;
-- sessions.club_id reste NULLABLE (finales)

-- Junction edition_clubs : 2026 et 2027 ont Paris comme participant
INSERT INTO public.edition_clubs (edition_id, club_id)
SELECT id, 'paris' FROM public.editions WHERE id IN ('2026', '2027', 'dev')
ON CONFLICT (edition_id, club_id) DO NOTHING;

-- 2027 devient multiclub (le user le configurera via le master cockpit) ;
-- 2026 reste monoclub (historique fermé) ; 'dev' reste monoclub (testing).
UPDATE public.editions SET model = 'multiclub' WHERE id = '2027';

-- ----------------------------------------------------------------------------
-- 4. Index utiles pour les RLS et requêtes per-club
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS startups_club_idx ON public.startups(club_id);
CREATE INDEX IF NOT EXISTS sessions_club_idx ON public.sessions(club_id);
CREATE INDEX IF NOT EXISTS startups_club_edition_idx ON public.startups(club_id, edition_id);
CREATE INDEX IF NOT EXISTS sessions_club_edition_idx ON public.sessions(club_id, edition_id);

-- ----------------------------------------------------------------------------
-- 5. Helpers SECURITY DEFINER (lecture du contexte d'auth, bypass RLS)
-- ----------------------------------------------------------------------------

-- "Est-ce que je suis master_admin ?" — rôle global dans app_user_roles
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.app_user_roles
     WHERE lower(email) = lower(coalesce(
             (SELECT email FROM auth.users WHERE id = auth.uid()), ''))
       AND 'master_admin' = ANY(roles)
  );
$$;
COMMENT ON FUNCTION public.is_master_admin() IS
  'V2 : retourne true si le user courant a le rôle global master_admin dans app_user_roles.';

-- "Est-ce que j'ai ce rôle dans ce club ?"
CREATE OR REPLACE FUNCTION public.is_club_member(p_club_id text, p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.club_memberships
     WHERE user_id = auth.uid()
       AND club_id = p_club_id
       AND role    = p_role
  );
$$;
COMMENT ON FUNCTION public.is_club_member(text, text) IS
  'V2 : retourne true si le user courant a le rôle spécifié dans le club spécifié.';

-- "Suis-je dans CE club (n''importe quel rôle) ?" — version simplifiée
CREATE OR REPLACE FUNCTION public.is_in_club(p_club_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_memberships
     WHERE user_id = auth.uid() AND club_id = p_club_id
  );
$$;
COMMENT ON FUNCTION public.is_in_club(text) IS
  'V2 : retourne true si le user courant a au moins un rôle dans le club.';

-- "Quels clubs je peux administrer ?" (utilisé par les hooks React + RLS jointures)
CREATE OR REPLACE FUNCTION public.my_admin_clubs()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT club_id
    FROM public.club_memberships
   WHERE user_id = auth.uid() AND role = 'club_admin'
  UNION
  SELECT id FROM public.clubs WHERE public.is_master_admin();
$$;
COMMENT ON FUNCTION public.my_admin_clubs() IS
  'V2 : SETOF text des club_id que le user courant peut administrer (club_admin direct OU master_admin = tous).';

-- "Mes memberships complets (tous rôles, tous clubs)" — pour les hooks React
CREATE OR REPLACE FUNCTION public.my_club_memberships()
RETURNS TABLE(club_id text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT club_id, role
    FROM public.club_memberships
   WHERE user_id = auth.uid()
   ORDER BY club_id, role;
$$;
COMMENT ON FUNCTION public.my_club_memberships() IS
  'V2 : liste les memberships (club_id, role) du user courant. Lu par PlatformAuthProvider côté React.';

-- ----------------------------------------------------------------------------
-- 6. Activation RLS sur les nouvelles tables
-- ----------------------------------------------------------------------------

ALTER TABLE public.clubs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edition_clubs    ENABLE ROW LEVEL SECURITY;

-- clubs : lecture publique (besoin pour le dropdown de candidature) ;
-- écriture master_admin uniquement (via RPC dédié rsa_create_club, étape 2)
DROP POLICY IF EXISTS clubs_read   ON public.clubs;
DROP POLICY IF EXISTS clubs_write  ON public.clubs;
CREATE POLICY clubs_read  ON public.clubs FOR SELECT USING (true);
CREATE POLICY clubs_write ON public.clubs FOR ALL
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

-- club_memberships : lecture self + master_admin + club_admins de mon club ;
-- écriture master_admin OU club_admin du club (RPC dédié, étape 2)
DROP POLICY IF EXISTS cm_read  ON public.club_memberships;
DROP POLICY IF EXISTS cm_write ON public.club_memberships;
CREATE POLICY cm_read ON public.club_memberships FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_master_admin()
  OR public.is_club_member(club_id, 'club_admin')
);
CREATE POLICY cm_write ON public.club_memberships FOR ALL
  USING (public.is_master_admin() OR public.is_club_member(club_id, 'club_admin'))
  WITH CHECK (public.is_master_admin() OR public.is_club_member(club_id, 'club_admin'));

-- edition_clubs : lecture publique (besoin pour candidat de choisir son club) ;
-- écriture master_admin uniquement
DROP POLICY IF EXISTS ec_read  ON public.edition_clubs;
DROP POLICY IF EXISTS ec_write ON public.edition_clubs;
CREATE POLICY ec_read  ON public.edition_clubs FOR SELECT USING (true);
CREATE POLICY ec_write ON public.edition_clubs FOR ALL
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

-- ----------------------------------------------------------------------------
-- 7. Extension des RLS sur les tables existantes (scope par club)
-- ----------------------------------------------------------------------------
-- IMPORTANT : on ne supprime PAS les contrôles existants (owner, staff…).
-- On les ENRICHIT avec un branch club (master_admin ou rôle club).
-- ----------------------------------------------------------------------------

-- STARTUPS : lecture (candidat propriétaire OU staff global OU staff du club)
DROP POLICY IF EXISTS startups_read       ON public.startups;
DROP POLICY IF EXISTS startups_staff_write ON public.startups;
CREATE POLICY startups_read ON public.startups FOR SELECT USING (
  owner_id = auth.uid()
  OR public.is_master_admin()
  OR public.has_platform_role('admin')                    -- legacy : admin global
  OR public.has_platform_role('comite')                   -- legacy : comité global (Paris monoclub)
  OR public.has_platform_role('jury')                     -- legacy : jury global
  OR public.is_club_member(club_id, 'club_admin')
  OR public.is_club_member(club_id, 'comite')
  OR public.is_club_member(club_id, 'jury')
);
-- Écriture staff : admin global OU club_admin/comite du club du dossier
CREATE POLICY startups_staff_write ON public.startups FOR ALL
  USING (
    public.is_master_admin()
    OR public.has_platform_role('admin')
    OR public.has_platform_role('comite')
    OR public.is_club_member(club_id, 'club_admin')
    OR public.is_club_member(club_id, 'comite')
  )
  WITH CHECK (
    public.is_master_admin()
    OR public.has_platform_role('admin')
    OR public.has_platform_role('comite')
    OR public.is_club_member(club_id, 'club_admin')
    OR public.is_club_member(club_id, 'comite')
  );
-- (les policies startups_applicant_* pour les inserts/updates self du candidat
--  ne sont PAS modifiées : owner_id = auth.uid() reste la garde principale.)

-- SELECTION_REVIEWS : staff peut lire si master_admin OU rôle (global OU club)
-- pour la startup. Jointure via startups.club_id.
DROP POLICY IF EXISTS reviews_staff_read ON public.selection_reviews;
CREATE POLICY reviews_staff_read ON public.selection_reviews FOR SELECT USING (
  public.is_master_admin()
  OR public.has_platform_role('admin')
  OR public.has_platform_role('comite')
  OR public.has_platform_role('jury')
  OR EXISTS (
    SELECT 1 FROM public.startups s
     WHERE s.id = selection_reviews.startup_id
       AND (
         public.is_club_member(s.club_id, 'club_admin')
         OR public.is_club_member(s.club_id, 'comite')
         OR public.is_club_member(s.club_id, 'jury')
       )
  )
);

-- PLATFORM_JURY_ASSIGNMENTS : lecture juré self + staff global + staff du club de la session
DROP POLICY IF EXISTS pja_read ON public.platform_jury_assignments;
CREATE POLICY pja_read ON public.platform_jury_assignments FOR SELECT USING (
  jury_user_id = auth.uid()
  OR public.is_master_admin()
  OR public.has_platform_role('admin')
  OR public.has_platform_role('comite')
  OR EXISTS (
    SELECT 1 FROM public.sessions sess
     WHERE sess.id = platform_jury_assignments.session_id
       AND (
         public.is_club_member(sess.club_id, 'club_admin')
         OR public.is_club_member(sess.club_id, 'comite')
       )
  )
);

-- PLATFORM_JURY_SCORES : juré self + staff (global ou du club via session)
DROP POLICY IF EXISTS pjs_jury_self_read ON public.platform_jury_scores;
CREATE POLICY pjs_jury_self_read ON public.platform_jury_scores FOR SELECT USING (
  jury_user_id = auth.uid()
  OR public.is_master_admin()
  OR public.has_platform_role('admin')
  OR public.has_platform_role('comite')
  OR EXISTS (
    SELECT 1 FROM public.sessions sess
     WHERE sess.id = platform_jury_scores.session_id
       AND (
         public.is_club_member(sess.club_id, 'club_admin')
         OR public.is_club_member(sess.club_id, 'comite')
       )
  )
);

-- ----------------------------------------------------------------------------
-- 8. Seed master_admin : mat.balleron@proton.me
-- ----------------------------------------------------------------------------
-- Ajoute 'master_admin' au tableau roles SANS supprimer les rôles existants
-- (admin, comite, jury — déjà en place V1).
-- ----------------------------------------------------------------------------

UPDATE public.app_user_roles
   SET roles = CASE
                 WHEN 'master_admin' = ANY(roles) THEN roles
                 ELSE array_append(roles, 'master_admin')
               END,
       updated_at = now()
 WHERE lower(email) = 'mat.balleron@proton.me';

-- Si l'utilisateur n'existe pas encore dans app_user_roles, on l'insère
INSERT INTO public.app_user_roles (email, roles, note)
SELECT 'mat.balleron@proton.me', ARRAY['master_admin', 'admin'], 'V2 master admin (auto-seeded)'
 WHERE NOT EXISTS (
   SELECT 1 FROM public.app_user_roles WHERE lower(email) = 'mat.balleron@proton.me'
 );

-- ----------------------------------------------------------------------------
-- 9. Grants
-- ----------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.is_master_admin()              TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_club_member(text, text)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_in_club(text)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_admin_clubs()               TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_club_memberships()          TO authenticated;

COMMIT;
