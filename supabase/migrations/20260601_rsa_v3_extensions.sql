-- ============================================================================
-- V3.0 — Plugins / Extensions architecture (Vague 1 — foundations)
-- ============================================================================
-- Pivot B2B 2026-06-01 : la plateforme devient un produit B2B commercial vendable
-- à d'autres Rotary clubs / corporations. Les clubs ont besoin d'étendre la
-- plateforme avec leurs propres steps de funnel, onglets cockpit, templates
-- email et webhooks — sans qu'un fork du code soit requis.
--
-- Architecture cible :
--   - 1 table `extensions` (scope master / club / edition × kind)
--   - 5 RPC SECURITY DEFINER (create / update / delete / list / activate)
--   - RLS scope-based (master_admin global, club_admin local, lecture publique
--     pour les extensions actives au scope master pour rendre les steps
--     publics dans le funnel candidature)
--
-- Le rendu réel JSON-schema des extensions arrive en V4 (marketplace) ; V3.0
-- pose uniquement l'architecture, le CRUD et le placeholder UI dans le Master
-- Cockpit + Club Cockpit. Référence : plan ~/.claude/plans/elegant-giggling-pie.md
-- section Plugins/Extensions architecture (décision H).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Table extensions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.extensions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope       text NOT NULL CHECK (scope IN ('master', 'club', 'edition')),
  kind        text NOT NULL CHECK (kind IN ('funnel_step', 'cockpit_tab', 'email_template', 'webhook')),
  name        text NOT NULL,
  description text,
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  club_id     text REFERENCES public.clubs(id) ON DELETE CASCADE,
  edition_id  text REFERENCES public.editions(id) ON DELETE CASCADE,
  position    integer NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- Garde-fou cohérence scope :
  --   master  : aucun club / aucune édition
  --   club    : club obligatoire, édition optionnelle vide
  --   edition : édition obligatoire, club optionnel
  CONSTRAINT extensions_scope_consistency CHECK (
    (scope = 'master'  AND club_id IS NULL AND edition_id IS NULL)
    OR (scope = 'club'    AND club_id IS NOT NULL AND edition_id IS NULL)
    OR (scope = 'edition' AND edition_id IS NOT NULL)
  )
);
COMMENT ON TABLE public.extensions IS
  'V3 : extensions plateforme (funnel_step / cockpit_tab / email_template / webhook). Scope master/club/edition. RPC SECURITY DEFINER pour écriture.';

CREATE INDEX IF NOT EXISTS extensions_scope_kind_idx ON public.extensions(scope, kind, active);
CREATE INDEX IF NOT EXISTS extensions_club_idx       ON public.extensions(club_id)    WHERE club_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS extensions_edition_idx    ON public.extensions(edition_id) WHERE edition_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. Trigger updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.extensions_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION public.extensions_set_updated_at() IS
  'V3 : trigger qui bump extensions.updated_at à chaque UPDATE.';

DROP TRIGGER IF EXISTS trg_extensions_updated_at ON public.extensions;
CREATE TRIGGER trg_extensions_updated_at
  BEFORE UPDATE ON public.extensions
  FOR EACH ROW EXECUTE FUNCTION public.extensions_set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. RLS — extensions
-- ----------------------------------------------------------------------------
-- SELECT :
--   - Extensions actives au scope master sont lisibles publiquement (anon)
--     pour que le funnel candidature côté front puisse rendre les custom steps
--     définis globalement (cas d'usage V4 marketplace).
--   - Les autres extensions sont lisibles par master_admin OU par tout membre
--     du club concerné (club_admin / comite / jury — lecture seule).
--
-- INSERT / UPDATE / DELETE :
--   - master_admin pour scope='master'
--   - master_admin OR club_admin du club pour scope='club' / 'edition'
--
-- Toutes les écritures passent par les RPC SECURITY DEFINER en pratique ; la
-- RLS reste la frontière dure si jamais le client tape la table directement.
-- ----------------------------------------------------------------------------

ALTER TABLE public.extensions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS extensions_read  ON public.extensions;
DROP POLICY IF EXISTS extensions_write ON public.extensions;

CREATE POLICY extensions_read ON public.extensions FOR SELECT USING (
  -- Lecture publique des extensions actives master (custom steps publics)
  (scope = 'master' AND active = true)
  -- master_admin voit tout
  OR public.is_master_admin()
  -- club_admin du club voit les extensions de son club / de ses éditions club
  OR (club_id IS NOT NULL AND public.is_club_member(club_id, 'club_admin'))
  -- membres comite/jury du club voient en lecture seule
  OR (club_id IS NOT NULL AND public.is_club_member(club_id, 'comite'))
  OR (club_id IS NOT NULL AND public.is_club_member(club_id, 'jury'))
);

CREATE POLICY extensions_write ON public.extensions FOR ALL
  USING (
    public.is_master_admin()
    OR (scope IN ('club', 'edition') AND club_id IS NOT NULL
        AND public.is_club_member(club_id, 'club_admin'))
  )
  WITH CHECK (
    public.is_master_admin()
    OR (scope IN ('club', 'edition') AND club_id IS NOT NULL
        AND public.is_club_member(club_id, 'club_admin'))
  );

-- ----------------------------------------------------------------------------
-- 4. RPC — rsa_create_extension
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_create_extension(
  p_scope        text,
  p_kind         text,
  p_name         text,
  p_description  text   DEFAULT NULL,
  p_config       jsonb  DEFAULT '{}'::jsonb,
  p_club_id      text   DEFAULT NULL,
  p_edition_id   text   DEFAULT NULL,
  p_position     integer DEFAULT 0
)
RETURNS public.extensions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row public.extensions;
BEGIN
  -- Validation arguments
  IF p_scope NOT IN ('master', 'club', 'edition') THEN
    RAISE EXCEPTION 'p_scope doit être master, club ou edition.' USING ERRCODE = '22023';
  END IF;
  IF p_kind NOT IN ('funnel_step', 'cockpit_tab', 'email_template', 'webhook') THEN
    RAISE EXCEPTION 'p_kind doit être funnel_step, cockpit_tab, email_template ou webhook.' USING ERRCODE = '22023';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'p_name ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;

  -- Cohérence scope (mirror du CHECK SQL — message plus clair)
  IF p_scope = 'master' AND (p_club_id IS NOT NULL OR p_edition_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Scope master : club_id et edition_id doivent être NULL.' USING ERRCODE = '22023';
  ELSIF p_scope = 'club' AND (p_club_id IS NULL OR p_edition_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Scope club : club_id requis, edition_id doit être NULL.' USING ERRCODE = '22023';
  ELSIF p_scope = 'edition' AND p_edition_id IS NULL THEN
    RAISE EXCEPTION 'Scope edition : edition_id requis.' USING ERRCODE = '22023';
  END IF;

  -- Permission : master_admin global OU club_admin du club concerné
  IF p_scope = 'master' THEN
    IF NOT public.is_master_admin() THEN
      RAISE EXCEPTION 'Seul un master_admin peut créer une extension scope master.'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT (public.is_master_admin() OR public.is_club_member(p_club_id, 'club_admin')) THEN
      RAISE EXCEPTION 'Seul un master_admin ou un club_admin du club % peut créer une extension scope %.', p_club_id, p_scope
        USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.extensions (
    scope, kind, name, description, config, club_id, edition_id, position, created_by
  ) VALUES (
    p_scope,
    p_kind,
    trim(p_name),
    NULLIF(trim(coalesce(p_description, '')), ''),
    coalesce(p_config, '{}'::jsonb),
    p_club_id,
    p_edition_id,
    coalesce(p_position, 0),
    auth.uid()
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
COMMENT ON FUNCTION public.rsa_create_extension(text, text, text, text, jsonb, text, text, integer) IS
  'V3 : crée une extension (master_admin pour scope=master ; master_admin OR club_admin pour club/edition).';

-- ----------------------------------------------------------------------------
-- 5. RPC — rsa_update_extension
-- ----------------------------------------------------------------------------
-- Convention : NULL = ne pas toucher. Le scope, club_id et edition_id sont
-- IMMUABLES après création (sécurité : éviter le scope-escape).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_update_extension(
  p_id          uuid,
  p_name        text    DEFAULT NULL,
  p_description text    DEFAULT NULL,
  p_config      jsonb   DEFAULT NULL,
  p_position    integer DEFAULT NULL,
  p_active      boolean DEFAULT NULL
)
RETURNS public.extensions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_existing public.extensions;
  v_row      public.extensions;
BEGIN
  SELECT * INTO v_existing FROM public.extensions WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Extension % introuvable.', p_id USING ERRCODE = '22023';
  END IF;

  IF v_existing.scope = 'master' THEN
    IF NOT public.is_master_admin() THEN
      RAISE EXCEPTION 'Seul un master_admin peut modifier une extension scope master.'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT (public.is_master_admin() OR public.is_club_member(v_existing.club_id, 'club_admin')) THEN
      RAISE EXCEPTION 'Seul un master_admin ou un club_admin du club % peut modifier cette extension.', v_existing.club_id
        USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.extensions
     SET name        = CASE WHEN p_name IS NULL THEN name ELSE trim(p_name) END,
         description = CASE WHEN p_description IS NULL THEN description
                            ELSE NULLIF(trim(p_description), '') END,
         config      = CASE WHEN p_config IS NULL THEN config ELSE p_config END,
         position    = CASE WHEN p_position IS NULL THEN position ELSE p_position END,
         active      = CASE WHEN p_active IS NULL THEN active ELSE p_active END
   WHERE id = p_id
   RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
COMMENT ON FUNCTION public.rsa_update_extension(uuid, text, text, jsonb, integer, boolean) IS
  'V3 : modifie une extension (NULL = ne pas toucher). Scope/club_id/edition_id immuables.';

-- ----------------------------------------------------------------------------
-- 6. RPC — rsa_delete_extension
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_delete_extension(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_existing public.extensions;
BEGIN
  SELECT * INTO v_existing FROM public.extensions WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN;  -- idempotent
  END IF;

  IF v_existing.scope = 'master' THEN
    IF NOT public.is_master_admin() THEN
      RAISE EXCEPTION 'Seul un master_admin peut supprimer une extension scope master.'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT (public.is_master_admin() OR public.is_club_member(v_existing.club_id, 'club_admin')) THEN
      RAISE EXCEPTION 'Seul un master_admin ou un club_admin du club % peut supprimer cette extension.', v_existing.club_id
        USING ERRCODE = '42501';
    END IF;
  END IF;

  DELETE FROM public.extensions WHERE id = p_id;
END;
$$;
COMMENT ON FUNCTION public.rsa_delete_extension(uuid) IS
  'V3 : supprime une extension (idempotent — silencieux si déjà absente).';

-- ----------------------------------------------------------------------------
-- 7. RPC — rsa_list_extensions
-- ----------------------------------------------------------------------------
-- Tous les paramètres sont optionnels (NULL = pas de filtre sur ce champ).
-- La RLS extensions_read s'applique automatiquement (lecture publique pour les
-- extensions actives master ; sinon scope-based via club_id).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_list_extensions(
  p_scope      text DEFAULT NULL,
  p_kind       text DEFAULT NULL,
  p_club_id    text DEFAULT NULL,
  p_edition_id text DEFAULT NULL
)
RETURNS SETOF public.extensions
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, auth
AS $$
  SELECT *
    FROM public.extensions
   WHERE (p_scope      IS NULL OR scope      = p_scope)
     AND (p_kind       IS NULL OR kind       = p_kind)
     AND (p_club_id    IS NULL OR club_id    = p_club_id)
     AND (p_edition_id IS NULL OR edition_id = p_edition_id)
   ORDER BY position ASC, created_at ASC;
$$;
COMMENT ON FUNCTION public.rsa_list_extensions(text, text, text, text) IS
  'V3 : liste les extensions filtrées. SECURITY INVOKER : la RLS extensions_read est la vraie frontière.';

-- ----------------------------------------------------------------------------
-- 8. RPC — rsa_activate_extension (toggle on/off rapide)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_activate_extension(
  p_id     uuid,
  p_active boolean
)
RETURNS public.extensions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_existing public.extensions;
  v_row      public.extensions;
BEGIN
  IF p_active IS NULL THEN
    RAISE EXCEPTION 'p_active ne peut pas être NULL.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing FROM public.extensions WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Extension % introuvable.', p_id USING ERRCODE = '22023';
  END IF;

  IF v_existing.scope = 'master' THEN
    IF NOT public.is_master_admin() THEN
      RAISE EXCEPTION 'Seul un master_admin peut activer/désactiver une extension scope master.'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT (public.is_master_admin() OR public.is_club_member(v_existing.club_id, 'club_admin')) THEN
      RAISE EXCEPTION 'Seul un master_admin ou un club_admin du club % peut activer/désactiver cette extension.', v_existing.club_id
        USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.extensions
     SET active = p_active
   WHERE id = p_id
   RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
COMMENT ON FUNCTION public.rsa_activate_extension(uuid, boolean) IS
  'V3 : toggle on/off rapide d''une extension (UI switch).';

-- ----------------------------------------------------------------------------
-- 9. Grants
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.rsa_create_extension(text, text, text, text, jsonb, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_update_extension(uuid, text, text, jsonb, integer, boolean)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_delete_extension(uuid)                                                TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_list_extensions(text, text, text, text)                               TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rsa_activate_extension(uuid, boolean)                                     TO authenticated;

COMMIT;
