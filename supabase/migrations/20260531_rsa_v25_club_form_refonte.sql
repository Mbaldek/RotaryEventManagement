-- ============================================================================
-- V2.5 — Refonte du form création/édition de club
-- ============================================================================
-- Migration additive : étend la table `clubs` avec les champs structurés
-- (country, language, contact/président/coordonnées) et migre les RPC
-- rsa_create_club + ajoute rsa_update_club.
--
-- Backward-compat : les colonnes legacy `region` et `contact_name` restent
-- présentes (lecture) mais sont marquées DEPRECATED en COMMENT. L'UI V2.5
-- n'écrit plus dedans ; un drop éventuel arrivera en V3 après confirmation
-- qu'aucun consumer ne les lit plus.
--
-- ID : plus jamais fourni par l'utilisateur — généré côté serveur depuis le
-- nom (kebab-case lower-ASCII, max 50 chars, suffixe -2/-3/... en cas de
-- collision).
--
-- Référence : project_rsa_v25_user_management.md, section
-- « V2.5 Ajout — Refonte form création/édition de club ».
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Schéma additif sur public.clubs
-- ----------------------------------------------------------------------------
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS country               text,
  ADD COLUMN IF NOT EXISTS language              text NOT NULL DEFAULT 'fr',

  -- Représentant (contact opérationnel)
  ADD COLUMN IF NOT EXISTS contact_first_name    text,
  ADD COLUMN IF NOT EXISTS contact_last_name     text,
  ADD COLUMN IF NOT EXISTS contact_phone         text,

  -- Président du club
  ADD COLUMN IF NOT EXISTS president_first_name  text,
  ADD COLUMN IF NOT EXISTS president_last_name   text,
  ADD COLUMN IF NOT EXISTS president_email       text,

  -- Coordonnées institutionnelles
  ADD COLUMN IF NOT EXISTS club_email            text,
  ADD COLUMN IF NOT EXISTS club_phone            text,
  ADD COLUMN IF NOT EXISTS club_address          text;

-- CHECK contraintes ajoutées séparément (IF NOT EXISTS pas supporté sur CHECK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clubs_language_check'
  ) THEN
    ALTER TABLE public.clubs
      ADD CONSTRAINT clubs_language_check
      CHECK (language IN ('fr','en','de','it','es','nl','pt'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clubs_country_check'
  ) THEN
    -- 2 lettres uppercase ASCII OU NULL (le NULL est toléré le temps du backfill)
    ALTER TABLE public.clubs
      ADD CONSTRAINT clubs_country_check
      CHECK (country IS NULL OR country ~ '^[A-Z]{2}$');
  END IF;
END$$;

-- COMMENT documentation des colonnes V2.5
COMMENT ON COLUMN public.clubs.country IS
  'V2.5 : code ISO 3166 alpha-2 (FR, DE, BE, CH, ...). Remplace region.';
COMMENT ON COLUMN public.clubs.language IS
  'V2.5 : langue principale du club (fr/en/de/it/es/nl/pt). Sert au pré-remplissage UI et communications.';
COMMENT ON COLUMN public.clubs.contact_first_name IS
  'V2.5 : prénom du représentant opérationnel (remplace contact_name).';
COMMENT ON COLUMN public.clubs.contact_last_name IS
  'V2.5 : nom du représentant opérationnel (remplace contact_name).';
COMMENT ON COLUMN public.clubs.contact_phone IS
  'V2.5 : téléphone du représentant opérationnel.';
COMMENT ON COLUMN public.clubs.president_first_name IS
  'V2.5 : prénom du président du club.';
COMMENT ON COLUMN public.clubs.president_last_name IS
  'V2.5 : nom du président du club.';
COMMENT ON COLUMN public.clubs.president_email IS
  'V2.5 : email du président du club.';
COMMENT ON COLUMN public.clubs.club_email IS
  'V2.5 : email institutionnel du club.';
COMMENT ON COLUMN public.clubs.club_phone IS
  'V2.5 : téléphone institutionnel du club.';
COMMENT ON COLUMN public.clubs.club_address IS
  'V2.5 : adresse postale institutionnelle du club (multi-ligne).';

-- DEPRECATED — backward-compat lecture uniquement
COMMENT ON COLUMN public.clubs.region IS
  'DEPRECATED V2.5 — remplacé par country/contact_first+last_name. Garder pour backward-compat lecture, drop prévu V3.';
COMMENT ON COLUMN public.clubs.contact_name IS
  'DEPRECATED V2.5 — remplacé par contact_first_name + contact_last_name. Garder pour backward-compat lecture, drop prévu V3.';

-- ----------------------------------------------------------------------------
-- 2. Backfill du club Paris existant
-- ----------------------------------------------------------------------------
-- Seul le pays et la langue sont déduisibles avec certitude. Les autres champs
-- (contact_first/last/phone, président, coordonnées institutionnelles) restent
-- NULL : l'utilisateur les renseignera via le nouveau form V2.5.
UPDATE public.clubs
   SET country  = 'FR'
 WHERE id = 'paris' AND country IS NULL;

UPDATE public.clubs
   SET language = 'fr'
 WHERE id = 'paris' AND language IS NULL;

-- ----------------------------------------------------------------------------
-- 3. RPC rsa_create_club V2.5 — ID auto-généré, signature étendue
-- ----------------------------------------------------------------------------
-- Drop de la signature V2 avant de recréer avec la nouvelle (Postgres ne fait
-- pas le matching sur les noms de paramètres par défaut).
DROP FUNCTION IF EXISTS public.rsa_create_club(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.rsa_create_club(text, text, text, text, text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.rsa_create_club(
  p_name                  text,
  p_country               text,
  p_language              text DEFAULT 'fr',
  p_contact_first_name    text DEFAULT NULL,
  p_contact_last_name     text DEFAULT NULL,
  p_contact_email         text DEFAULT NULL,
  p_contact_phone         text DEFAULT NULL,
  p_president_first_name  text DEFAULT NULL,
  p_president_last_name   text DEFAULT NULL,
  p_president_email       text DEFAULT NULL,
  p_club_email            text DEFAULT NULL,
  p_club_phone            text DEFAULT NULL,
  p_club_address          text DEFAULT NULL
)
RETURNS public.clubs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row      public.clubs;
  v_name     text;
  v_country  text;
  v_language text;
  v_base_id  text;
  v_id       text;
  v_suffix   integer := 2;
BEGIN
  -- 0. Authorization
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Seul un master_admin peut créer un club.'
      USING ERRCODE = '42501';
  END IF;

  -- 1. Normalisation + validation
  v_name := trim(coalesce(p_name, ''));
  IF length(v_name) < 2 THEN
    RAISE EXCEPTION 'p_name doit contenir au moins 2 caractères.'
      USING ERRCODE = '22023';
  END IF;

  v_country := upper(trim(coalesce(p_country, '')));
  IF v_country !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'p_country doit être un code ISO 3166 alpha-2 (2 lettres majuscules, ex. FR, DE).'
      USING ERRCODE = '22023';
  END IF;

  v_language := lower(trim(coalesce(p_language, 'fr')));
  IF v_language NOT IN ('fr','en','de','it','es','nl','pt') THEN
    RAISE EXCEPTION 'p_language doit être fr/en/de/it/es/nl/pt.'
      USING ERRCODE = '22023';
  END IF;

  -- 2. Génération de l'ID depuis le nom
  --    - lowercase ASCII
  --    - remplace tout caractère non [a-z0-9] par '-'
  --    - trim des '-' en début/fin
  --    - tronque à 50 chars
  v_base_id := regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g');
  v_base_id := regexp_replace(v_base_id, '^-+|-+$', '', 'g');
  IF length(v_base_id) = 0 THEN
    RAISE EXCEPTION 'p_name ne contient aucun caractère alphanumérique exploitable pour générer un id.'
      USING ERRCODE = '22023';
  END IF;
  IF length(v_base_id) > 50 THEN
    v_base_id := substr(v_base_id, 1, 50);
    -- ré-trim au cas où le slice tomberait sur '-'
    v_base_id := regexp_replace(v_base_id, '-+$', '', 'g');
  END IF;

  -- 3. Résolution de collision : -2, -3, ...
  v_id := v_base_id;
  WHILE EXISTS (SELECT 1 FROM public.clubs WHERE id = v_id) LOOP
    v_id := substr(v_base_id, 1, 50 - length('-' || v_suffix::text)) || '-' || v_suffix::text;
    v_suffix := v_suffix + 1;
    IF v_suffix > 99 THEN
      RAISE EXCEPTION 'Impossible de générer un id unique pour « % » (trop de collisions).', v_name
        USING ERRCODE = '23505';
    END IF;
  END LOOP;

  -- 4. INSERT — tous les champs en une fois
  INSERT INTO public.clubs (
    id, name,
    country, language,
    contact_first_name, contact_last_name, contact_email, contact_phone,
    president_first_name, president_last_name, president_email,
    club_email, club_phone, club_address,
    created_by
  )
  VALUES (
    v_id, v_name,
    v_country, v_language,
    NULLIF(trim(coalesce(p_contact_first_name, '')), ''),
    NULLIF(trim(coalesce(p_contact_last_name, '')), ''),
    lower(NULLIF(trim(coalesce(p_contact_email, '')), '')),
    NULLIF(trim(coalesce(p_contact_phone, '')), ''),
    NULLIF(trim(coalesce(p_president_first_name, '')), ''),
    NULLIF(trim(coalesce(p_president_last_name, '')), ''),
    lower(NULLIF(trim(coalesce(p_president_email, '')), '')),
    lower(NULLIF(trim(coalesce(p_club_email, '')), '')),
    NULLIF(trim(coalesce(p_club_phone, '')), ''),
    NULLIF(trim(coalesce(p_club_address, '')), ''),
    auth.uid()
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.rsa_create_club(
  text, text, text,
  text, text, text, text,
  text, text, text,
  text, text, text
) IS
  'V2.5 : master_admin crée un club. ID auto-généré depuis le nom (kebab-case, collision-safe -2/-3/...).';

GRANT EXECUTE ON FUNCTION public.rsa_create_club(
  text, text, text,
  text, text, text, text,
  text, text, text,
  text, text, text
) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. RPC rsa_update_club — édition (master_admin OR club_admin)
-- ----------------------------------------------------------------------------
-- L'ID n'est jamais modifiable. Le nom EST modifiable (l'id reste figé).
-- Tous les autres champs : NULL = ne pas toucher.
--
-- Note : il n'y a pas de manière propre de distinguer « passer NULL pour
-- vider » de « passer NULL pour ne pas toucher » sans un second paramètre.
-- Convention V2.5 : NULL = ne pas toucher. Pour vider un champ, le UI envoie
-- la chaîne vide (qui sera normalisée NULLIF côté serveur).
DROP FUNCTION IF EXISTS public.rsa_update_club(
  text, text, text, text,
  text, text, text, text,
  text, text, text,
  text, text, text
);

CREATE OR REPLACE FUNCTION public.rsa_update_club(
  p_id                    text,
  p_name                  text DEFAULT NULL,
  p_country               text DEFAULT NULL,
  p_language              text DEFAULT NULL,
  p_contact_first_name    text DEFAULT NULL,
  p_contact_last_name     text DEFAULT NULL,
  p_contact_email         text DEFAULT NULL,
  p_contact_phone         text DEFAULT NULL,
  p_president_first_name  text DEFAULT NULL,
  p_president_last_name   text DEFAULT NULL,
  p_president_email       text DEFAULT NULL,
  p_club_email            text DEFAULT NULL,
  p_club_phone            text DEFAULT NULL,
  p_club_address          text DEFAULT NULL
)
RETURNS public.clubs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row      public.clubs;
  v_country  text;
  v_language text;
BEGIN
  -- 0. Authorization : master_admin OR club_admin du club
  IF NOT (public.is_master_admin() OR public.is_club_member(p_id, 'club_admin')) THEN
    RAISE EXCEPTION 'Seul un master_admin ou un club_admin du club % peut le modifier.', p_id
      USING ERRCODE = '42501';
  END IF;

  -- 1. Validation des champs structurés (seulement si fournis)
  IF p_country IS NOT NULL THEN
    v_country := upper(trim(p_country));
    IF v_country !~ '^[A-Z]{2}$' THEN
      RAISE EXCEPTION 'p_country doit être un code ISO 3166 alpha-2 (2 lettres majuscules).'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_language IS NOT NULL THEN
    v_language := lower(trim(p_language));
    IF v_language NOT IN ('fr','en','de','it','es','nl','pt') THEN
      RAISE EXCEPTION 'p_language doit être fr/en/de/it/es/nl/pt.'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_name IS NOT NULL AND length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'p_name doit contenir au moins 2 caractères.'
      USING ERRCODE = '22023';
  END IF;

  -- 2. UPDATE — COALESCE garde la valeur existante quand le paramètre est NULL.
  --    Pour les champs « string vide → NULL », on accepte que l'UI envoie la
  --    chaîne vide et on la normalise via NULLIF.
  UPDATE public.clubs SET
    name                 = COALESCE(NULLIF(trim(p_name), ''), name),
    country              = COALESCE(v_country, country),
    language             = COALESCE(v_language, language),
    contact_first_name   = CASE WHEN p_contact_first_name   IS NULL THEN contact_first_name   ELSE NULLIF(trim(p_contact_first_name), '')   END,
    contact_last_name    = CASE WHEN p_contact_last_name    IS NULL THEN contact_last_name    ELSE NULLIF(trim(p_contact_last_name), '')    END,
    contact_email        = CASE WHEN p_contact_email        IS NULL THEN contact_email        ELSE lower(NULLIF(trim(p_contact_email), '')) END,
    contact_phone        = CASE WHEN p_contact_phone        IS NULL THEN contact_phone        ELSE NULLIF(trim(p_contact_phone), '')        END,
    president_first_name = CASE WHEN p_president_first_name IS NULL THEN president_first_name ELSE NULLIF(trim(p_president_first_name), '') END,
    president_last_name  = CASE WHEN p_president_last_name  IS NULL THEN president_last_name  ELSE NULLIF(trim(p_president_last_name), '')  END,
    president_email      = CASE WHEN p_president_email      IS NULL THEN president_email      ELSE lower(NULLIF(trim(p_president_email), '')) END,
    club_email           = CASE WHEN p_club_email           IS NULL THEN club_email           ELSE lower(NULLIF(trim(p_club_email), ''))    END,
    club_phone           = CASE WHEN p_club_phone           IS NULL THEN club_phone           ELSE NULLIF(trim(p_club_phone), '')           END,
    club_address         = CASE WHEN p_club_address         IS NULL THEN club_address         ELSE NULLIF(trim(p_club_address), '')         END
  WHERE id = p_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Club % introuvable.', p_id USING ERRCODE = '23503';
  END IF;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.rsa_update_club(
  text, text, text, text,
  text, text, text, text,
  text, text, text,
  text, text, text
) IS
  'V2.5 : met à jour un club. master_admin OR club_admin du club. NULL = ne pas toucher au champ.';

GRANT EXECUTE ON FUNCTION public.rsa_update_club(
  text, text, text, text,
  text, text, text, text,
  text, text, text,
  text, text, text
) TO authenticated;

COMMIT;
