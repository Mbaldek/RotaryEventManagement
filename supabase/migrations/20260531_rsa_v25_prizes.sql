-- ============================================================================
-- V2.5 — Module Prix (CRUD multi-clubs)
-- ============================================================================
-- Pivot 2026-05-31 : remplace les colonnes rigides editions.prize_main /
-- editions.prize_special par une table `prizes` flexible permettant :
--   * plusieurs prix par compétition (grand prix, prix spéciaux),
--   * prix attaché à un club spécifique (sponsorisé par les partenaires locaux),
--   * prix attaché à une session thématique (cluster) OU au niveau édition,
--   * jury régulier ou jury spécial,
--   * audit du palmarès (awarded_to + awarded_at sur la startup lauréate).
--
-- Cette migration est ADDITIVE :
--   - Crée la table `prizes` + indexes
--   - Ajoute les helpers RPC SECURITY DEFINER (create / update / delete / award / list)
--   - Pose les policies RLS (SELECT public ; INSERT/UPDATE/DELETE selon scope)
--   - Backfille editions.prize_main / editions.prize_special en lignes prizes
--     (kind='general' / 'special', club_id=NULL, session_id=NULL)
--   - Marque editions.prize_main et editions.prize_special comme DEPRECATED
--
-- Référence : project_rsa_v25_user_management.md §"Module Prix"
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Table `prizes`
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prizes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id  text NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  club_id     text REFERENCES public.clubs(id) ON DELETE CASCADE,    -- NULL = prix au niveau compétition
  session_id  text REFERENCES public.sessions(id) ON DELETE SET NULL, -- NULL = prix au niveau édition/club
  kind        text NOT NULL CHECK (kind IN ('general','special')),
  name        text NOT NULL,
  amount      numeric NOT NULL CHECK (amount >= 0),
  currency    text NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR','USD','CHF','GBP')),
  jury_type   text NOT NULL DEFAULT 'regular' CHECK (jury_type IN ('regular','special')),
  description text,
  position    integer NOT NULL DEFAULT 0,
  awarded_to  uuid REFERENCES public.startups(id) ON DELETE SET NULL,
  awarded_at  timestamptz,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.prizes IS
  'V2.5 : prix d''une compétition. Peut être attaché à un club et/ou une session, ou rester global (club_id IS NULL = grand prix compétition).';

CREATE INDEX IF NOT EXISTS prizes_edition_idx  ON public.prizes(edition_id);
CREATE INDEX IF NOT EXISTS prizes_club_idx     ON public.prizes(club_id);
CREATE INDEX IF NOT EXISTS prizes_session_idx  ON public.prizes(session_id);
CREATE INDEX IF NOT EXISTS prizes_awarded_idx  ON public.prizes(awarded_to);

-- ----------------------------------------------------------------------------
-- 2. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;

-- SELECT public : palmarès accessible à tous (anon + authenticated)
DROP POLICY IF EXISTS prizes_read ON public.prizes;
CREATE POLICY prizes_read ON public.prizes
  FOR SELECT
  USING (true);

-- INSERT : master_admin pour kind='general' OU club_id IS NULL ;
--          master_admin OR club_admin du club pour les autres
DROP POLICY IF EXISTS prizes_insert ON public.prizes;
CREATE POLICY prizes_insert ON public.prizes
  FOR INSERT
  WITH CHECK (
    CASE
      WHEN kind = 'general' OR club_id IS NULL
        THEN public.is_master_admin()
      ELSE public.is_master_admin() OR public.is_club_member(club_id, 'club_admin')
    END
  );

-- UPDATE : même règle
DROP POLICY IF EXISTS prizes_update ON public.prizes;
CREATE POLICY prizes_update ON public.prizes
  FOR UPDATE
  USING (
    CASE
      WHEN kind = 'general' OR club_id IS NULL
        THEN public.is_master_admin()
      ELSE public.is_master_admin() OR public.is_club_member(club_id, 'club_admin')
    END
  )
  WITH CHECK (
    CASE
      WHEN kind = 'general' OR club_id IS NULL
        THEN public.is_master_admin()
      ELSE public.is_master_admin() OR public.is_club_member(club_id, 'club_admin')
    END
  );

-- DELETE : même règle (les RPC ajoutent en plus la vérif awarded_to IS NULL)
DROP POLICY IF EXISTS prizes_delete ON public.prizes;
CREATE POLICY prizes_delete ON public.prizes
  FOR DELETE
  USING (
    CASE
      WHEN kind = 'general' OR club_id IS NULL
        THEN public.is_master_admin()
      ELSE public.is_master_admin() OR public.is_club_member(club_id, 'club_admin')
    END
  );

-- ----------------------------------------------------------------------------
-- 3. RPC SECURITY DEFINER
-- ----------------------------------------------------------------------------

-- rsa_create_prize : crée un nouveau prix
CREATE OR REPLACE FUNCTION public.rsa_create_prize(
  p_edition_id  text,
  p_club_id     text DEFAULT NULL,
  p_session_id  text DEFAULT NULL,
  p_kind        text DEFAULT 'special',
  p_name        text DEFAULT NULL,
  p_amount      numeric DEFAULT 0,
  p_currency    text DEFAULT 'EUR',
  p_jury_type   text DEFAULT 'regular',
  p_description text DEFAULT NULL
)
RETURNS public.prizes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row     public.prizes;
  v_allowed boolean;
BEGIN
  -- Validation
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
  IF p_jury_type NOT IN ('regular', 'special') THEN
    RAISE EXCEPTION 'p_jury_type doit être ''regular'' ou ''special''.' USING ERRCODE = '22023';
  END IF;
  IF p_club_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.clubs WHERE id = p_club_id) THEN
    RAISE EXCEPTION 'Club % introuvable.', p_club_id USING ERRCODE = '23503';
  END IF;
  IF p_session_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.sessions WHERE id = p_session_id) THEN
    RAISE EXCEPTION 'Session % introuvable.', p_session_id USING ERRCODE = '23503';
  END IF;

  -- Garde-fou : un club ne peut créer qu'un prix 'special' attaché à lui-même.
  IF p_club_id IS NOT NULL AND p_kind = 'general' THEN
    RAISE EXCEPTION 'Un prix de club doit être de kind ''special''.' USING ERRCODE = '22023';
  END IF;

  -- Autorisation
  IF p_kind = 'general' OR p_club_id IS NULL THEN
    v_allowed := public.is_master_admin();
  ELSE
    v_allowed := public.is_master_admin() OR public.is_club_member(p_club_id, 'club_admin');
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Vous n''avez pas le droit de créer ce prix.'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.prizes (
    edition_id, club_id, session_id, kind, name, amount, currency,
    jury_type, description, created_by
  )
  VALUES (
    p_edition_id,
    p_club_id,
    p_session_id,
    p_kind,
    trim(p_name),
    p_amount,
    p_currency,
    p_jury_type,
    NULLIF(trim(coalesce(p_description, '')), ''),
    auth.uid()
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
COMMENT ON FUNCTION public.rsa_create_prize(text, text, text, text, text, numeric, text, text, text) IS
  'V2.5 : crée un prix. master_admin pour general/finale ; master_admin OR club_admin pour les prix de club.';

-- ----------------------------------------------------------------------------
-- rsa_update_prize : UPDATE des champs non-NULL (chaque param NULL = ne pas toucher)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_update_prize(
  p_id          uuid,
  p_name        text DEFAULT NULL,
  p_amount      numeric DEFAULT NULL,
  p_currency    text DEFAULT NULL,
  p_jury_type   text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_session_id  text DEFAULT NULL,
  p_position    integer DEFAULT NULL
)
RETURNS public.prizes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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

  -- Autorisation
  IF v_existing.kind = 'general' OR v_existing.club_id IS NULL THEN
    v_allowed := public.is_master_admin();
  ELSE
    v_allowed := public.is_master_admin()
              OR public.is_club_member(v_existing.club_id, 'club_admin');
  END IF;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Vous n''avez pas le droit d''éditer ce prix.'
      USING ERRCODE = '42501';
  END IF;

  -- Validation des params non-NULL
  IF p_name IS NOT NULL AND length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'p_name ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NOT NULL AND p_amount < 0 THEN
    RAISE EXCEPTION 'p_amount doit être >= 0.' USING ERRCODE = '22023';
  END IF;
  IF p_currency IS NOT NULL AND p_currency NOT IN ('EUR', 'USD', 'CHF', 'GBP') THEN
    RAISE EXCEPTION 'p_currency doit être EUR, USD, CHF ou GBP.' USING ERRCODE = '22023';
  END IF;
  IF p_jury_type IS NOT NULL AND p_jury_type NOT IN ('regular', 'special') THEN
    RAISE EXCEPTION 'p_jury_type doit être ''regular'' ou ''special''.' USING ERRCODE = '22023';
  END IF;
  IF p_session_id IS NOT NULL AND p_session_id <> ''
     AND NOT EXISTS (SELECT 1 FROM public.sessions WHERE id = p_session_id) THEN
    RAISE EXCEPTION 'Session % introuvable.', p_session_id USING ERRCODE = '23503';
  END IF;

  UPDATE public.prizes
     SET name        = COALESCE(NULLIF(trim(coalesce(p_name, '')), ''), name),
         amount      = COALESCE(p_amount, amount),
         currency    = COALESCE(p_currency, currency),
         jury_type   = COALESCE(p_jury_type, jury_type),
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
COMMENT ON FUNCTION public.rsa_update_prize(uuid, text, numeric, text, text, text, text, integer) IS
  'V2.5 : édite un prix. Chaque param NULL = ne pas toucher. p_session_id = '''' pour vider.';

-- ----------------------------------------------------------------------------
-- rsa_delete_prize : refuse si awarded_to IS NOT NULL
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_delete_prize(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_existing public.prizes;
  v_allowed  boolean;
BEGIN
  SELECT * INTO v_existing FROM public.prizes WHERE id = p_id;
  IF v_existing.id IS NULL THEN
    RETURN; -- idempotent
  END IF;

  IF v_existing.awarded_to IS NOT NULL THEN
    RAISE EXCEPTION 'Impossible : ce prix a déjà été décerné. Annulez la remise avant de supprimer.'
      USING ERRCODE = '23503';
  END IF;

  IF v_existing.kind = 'general' OR v_existing.club_id IS NULL THEN
    v_allowed := public.is_master_admin();
  ELSE
    v_allowed := public.is_master_admin()
              OR public.is_club_member(v_existing.club_id, 'club_admin');
  END IF;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Vous n''avez pas le droit de supprimer ce prix.'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.prizes WHERE id = p_id;
END;
$$;
COMMENT ON FUNCTION public.rsa_delete_prize(uuid) IS
  'V2.5 : supprime un prix. Refusé si awarded_to non NULL (intégrité audit).';

-- ----------------------------------------------------------------------------
-- rsa_award_prize : SET awarded_to + awarded_at
--   * Prix général/finale (club_id IS NULL) : master_admin only
--   * Prix de club : master_admin OR club_admin du club
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_award_prize(
  p_id         uuid,
  p_startup_id uuid
)
RETURNS public.prizes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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

  IF p_startup_id IS NULL THEN
    RAISE EXCEPTION 'p_startup_id ne peut pas être NULL.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.startups WHERE id = p_startup_id) THEN
    RAISE EXCEPTION 'Startup % introuvable.', p_startup_id USING ERRCODE = '23503';
  END IF;

  IF v_existing.kind = 'general' OR v_existing.club_id IS NULL THEN
    v_allowed := public.is_master_admin();
  ELSE
    v_allowed := public.is_master_admin()
              OR public.is_club_member(v_existing.club_id, 'club_admin');
  END IF;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Vous n''avez pas le droit de décerner ce prix.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.prizes
     SET awarded_to = p_startup_id,
         awarded_at = now()
   WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
COMMENT ON FUNCTION public.rsa_award_prize(uuid, uuid) IS
  'V2.5 : décerne un prix à une startup. master_admin pour general/finale ; master_admin OR club_admin pour prix de club.';

-- ----------------------------------------------------------------------------
-- rsa_list_prizes : liste filtrée par édition (+club_id, +session_id optionnels)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_list_prizes(
  p_edition_id text,
  p_club_id    text DEFAULT NULL,
  p_session_id text DEFAULT NULL
)
RETURNS SETOF public.prizes
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT *
    FROM public.prizes
   WHERE edition_id = p_edition_id
     AND (p_club_id    IS NULL OR club_id    = p_club_id)
     AND (p_session_id IS NULL OR session_id = p_session_id)
   ORDER BY position ASC, created_at ASC;
$$;
COMMENT ON FUNCTION public.rsa_list_prizes(text, text, text) IS
  'V2.5 : liste les prix d''une compétition (filtre optionnel par club_id ou session_id). Lecture publique.';

-- ----------------------------------------------------------------------------
-- 4. Backfill : convertir editions.prize_main / editions.prize_special
-- ----------------------------------------------------------------------------
-- Convention : on évite les doublons si la migration est ré-exécutée par
-- erreur (UNIQUE par (edition_id, kind, name) au sens fonctionnel).

-- Grand Prix RSA (prize_main)
INSERT INTO public.prizes (edition_id, club_id, session_id, kind, name, amount, currency, position)
SELECT e.id, NULL, NULL, 'general', 'Grand Prix RSA', e.prize_main, 'EUR', 1
  FROM public.editions e
 WHERE e.prize_main IS NOT NULL
   AND e.prize_main > 0
   AND NOT EXISTS (
     SELECT 1 FROM public.prizes p
      WHERE p.edition_id = e.id
        AND p.kind = 'general'
        AND p.name = 'Grand Prix RSA'
        AND p.club_id IS NULL
   );

-- Prix Spécial (prize_special)
INSERT INTO public.prizes (edition_id, club_id, session_id, kind, name, amount, currency, position)
SELECT e.id, NULL, NULL, 'special', 'Prix Spécial', e.prize_special, 'EUR', 2
  FROM public.editions e
 WHERE e.prize_special IS NOT NULL
   AND e.prize_special > 0
   AND NOT EXISTS (
     SELECT 1 FROM public.prizes p
      WHERE p.edition_id = e.id
        AND p.kind = 'special'
        AND p.name = 'Prix Spécial'
        AND p.club_id IS NULL
   );

-- Marquer les colonnes héritées comme DEPRECATED (gardées pour backward-compat lecture)
COMMENT ON COLUMN public.editions.prize_main IS
  'DEPRECATED V2.5 — remplacé par la table prizes (kind=''general''). Gardé pour backward-compat lecture, ne plus écrire ici.';
COMMENT ON COLUMN public.editions.prize_special IS
  'DEPRECATED V2.5 — remplacé par la table prizes (kind=''special''). Gardé pour backward-compat lecture, ne plus écrire ici.';

-- ----------------------------------------------------------------------------
-- 5. Grants
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.rsa_create_prize(text, text, text, text, text, numeric, text, text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_update_prize(uuid, text, numeric, text, text, text, text, integer)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_delete_prize(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_award_prize(uuid, uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_list_prizes(text, text, text)
  TO authenticated, anon;

COMMIT;
