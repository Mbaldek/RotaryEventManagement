-- ============================================================================
-- V3 — Custom Fields per Edition (jury + candidat) + custom_data per dossier
-- ============================================================================
-- Pivot architecture 2026-06-04 : on remplace l'usine à gaz "extensions" (table
-- générique, CRUD multi-scopes, marketplace install) par une approche directe :
--   - chaque édition porte SES propres schémas de formulaire (jsonb) jury et
--     candidat sous editions.custom_fields_jury / custom_fields_candidate ;
--   - chaque dossier (startup / jury_application) stocke les réponses sous
--     custom_data jsonb.
--
-- Le formulaire est édité côté admin dans CompetitionEditView > Formulaires ;
-- le rendu funnel (Candidater + DevenirJury) lit ces schémas à la volée et
-- valide côté client puis côté serveur via les RPCs / trigger ci-dessous.
--
-- Schéma d'un field (au sens JSON, validé applicativement) :
--   {
--     "key": "odd_objectifs",            -- string, slug auto-gen côté UI admin
--     "label":       { "fr": "...", "en": "...", "de": "..." },
--     "type":        "text|textarea|email|url|tel|number|select|multiselect|checkbox|date|file",
--     "required":    true|false,
--     "placeholder": { "fr": "...", ... },                       -- optionnel
--     "help_text":   { "fr": "...", ... },                       -- optionnel
--     "options":     [{ "value": "x", "label": { "fr": "...", ... } }, ...],
--     "validation":  { "min": 0, "max": 100, "min_items": 1,
--                      "max_items": 3, "pattern": "regex",
--                      "max_chars": 250 },
--     "position":    0                                            -- ordre form
--   }
--
-- Validation serveur : trigger BEFORE INSERT/UPDATE sur startups + un trigger
-- équivalent sur jury_applications, qui vérifient que chaque field "required"
-- du schéma de l'édition est rempli dans custom_data avant d'autoriser le
-- passage en status='soumis' / 'pending'. Les drafts ('brouillon') restent
-- libres de partial data — la validation ne s'applique qu'à la soumission.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Colonnes JSONB : schemas form (côté édition) + données form (côté dossier)
-- ----------------------------------------------------------------------------

-- Editions : schémas form (jury + candidat). Default [] = pas de field custom.
ALTER TABLE public.editions
  ADD COLUMN IF NOT EXISTS custom_fields_jury      jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.editions
  ADD COLUMN IF NOT EXISTS custom_fields_candidate jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.editions.custom_fields_jury IS
  'V3 — Array de field configs pour formulaire jury, géré par admin via CompetitionEditView > Formulaires.';
COMMENT ON COLUMN public.editions.custom_fields_candidate IS
  'V3 — Array de field configs pour formulaire candidat, géré par admin via CompetitionEditView > Formulaires.';

-- Garde-fous JSON : les deux colonnes doivent rester des arrays (jamais object/null).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'editions_custom_fields_jury_is_array'
       AND conrelid = 'public.editions'::regclass
  ) THEN
    ALTER TABLE public.editions
      ADD CONSTRAINT editions_custom_fields_jury_is_array
      CHECK (jsonb_typeof(custom_fields_jury) = 'array');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'editions_custom_fields_candidate_is_array'
       AND conrelid = 'public.editions'::regclass
  ) THEN
    ALTER TABLE public.editions
      ADD CONSTRAINT editions_custom_fields_candidate_is_array
      CHECK (jsonb_typeof(custom_fields_candidate) = 'array');
  END IF;
END $$;

-- Jury applications : data form. Default {} = aucune réponse.
ALTER TABLE public.jury_applications
  ADD COLUMN IF NOT EXISTS custom_data jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.jury_applications.custom_data IS
  'V3 — Réponses aux custom_fields_jury de l''édition (key → value). Validé par trigger avant passage en status=pending.';

-- Startups : data form. Default {} = aucune réponse.
ALTER TABLE public.startups
  ADD COLUMN IF NOT EXISTS custom_data jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.startups.custom_data IS
  'V3 — Réponses aux custom_fields_candidate de l''édition (key → value). Validé par trigger avant passage en status=soumis.';

-- Garde-fous JSON : custom_data DOIT être un object (jamais array/null/scalar).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'jury_applications_custom_data_is_object'
       AND conrelid = 'public.jury_applications'::regclass
  ) THEN
    ALTER TABLE public.jury_applications
      ADD CONSTRAINT jury_applications_custom_data_is_object
      CHECK (jsonb_typeof(custom_data) = 'object');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'startups_custom_data_is_object'
       AND conrelid = 'public.startups'::regclass
  ) THEN
    ALTER TABLE public.startups
      ADD CONSTRAINT startups_custom_data_is_object
      CHECK (jsonb_typeof(custom_data) = 'object');
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Helper interne : validation custom_data vs schema de l'édition
-- ----------------------------------------------------------------------------
-- Vérifie que tous les fields "required" du schéma p_schema sont présents et
-- non-vides dans p_data. RAISE 'custom_field_required: %' sinon. Les types
-- "checkbox" tolèrent les valeurs falsy : un required:true sur checkbox impose
-- que la valeur soit booleén true (cas opt-in obligatoire — CGU, etc.).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_validate_custom_data(
  p_schema jsonb,
  p_data   jsonb
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_field   jsonb;
  v_key     text;
  v_required boolean;
  v_type    text;
  v_value   jsonb;
BEGIN
  IF p_schema IS NULL OR jsonb_typeof(p_schema) <> 'array' THEN
    RETURN; -- pas de schéma, rien à valider
  END IF;

  FOR v_field IN SELECT * FROM jsonb_array_elements(p_schema)
  LOOP
    v_required := COALESCE((v_field ->> 'required')::boolean, false);
    IF NOT v_required THEN
      CONTINUE;
    END IF;

    v_key  := v_field ->> 'key';
    v_type := COALESCE(v_field ->> 'type', 'text');
    IF v_key IS NULL OR length(trim(v_key)) = 0 THEN
      CONTINUE; -- field mal formé côté schéma, on n'a rien à valider
    END IF;

    v_value := p_data -> v_key;

    -- Présence
    IF v_value IS NULL OR jsonb_typeof(v_value) = 'null' THEN
      RAISE EXCEPTION 'custom_field_required: %', v_key USING ERRCODE = '22023';
    END IF;

    -- Non-vide selon le type
    CASE v_type
      WHEN 'text','textarea','email','url','tel','date','file' THEN
        IF jsonb_typeof(v_value) <> 'string' OR length(trim(v_value #>> '{}')) = 0 THEN
          RAISE EXCEPTION 'custom_field_required: %', v_key USING ERRCODE = '22023';
        END IF;
      WHEN 'number' THEN
        IF jsonb_typeof(v_value) NOT IN ('number','string')
           OR (jsonb_typeof(v_value) = 'string' AND length(trim(v_value #>> '{}')) = 0)
        THEN
          RAISE EXCEPTION 'custom_field_required: %', v_key USING ERRCODE = '22023';
        END IF;
      WHEN 'select' THEN
        IF jsonb_typeof(v_value) <> 'string' OR length(trim(v_value #>> '{}')) = 0 THEN
          RAISE EXCEPTION 'custom_field_required: %', v_key USING ERRCODE = '22023';
        END IF;
      WHEN 'multiselect' THEN
        IF jsonb_typeof(v_value) <> 'array' OR jsonb_array_length(v_value) = 0 THEN
          RAISE EXCEPTION 'custom_field_required: %', v_key USING ERRCODE = '22023';
        END IF;
      WHEN 'checkbox' THEN
        IF jsonb_typeof(v_value) <> 'boolean' OR (v_value)::text <> 'true' THEN
          RAISE EXCEPTION 'custom_field_required: %', v_key USING ERRCODE = '22023';
        END IF;
      ELSE
        -- type inconnu → on vérifie juste la présence (déjà fait ci-dessus)
        NULL;
    END CASE;
  END LOOP;
END;
$$;
COMMENT ON FUNCTION public.rsa_validate_custom_data(jsonb, jsonb) IS
  'V3 — Valide qu''un custom_data jsonb satisfait les fields "required" d''un schéma jsonb (custom_fields_jury / custom_fields_candidate). RAISE custom_field_required: <key>.';

-- ----------------------------------------------------------------------------
-- 3. Trigger : valider startups.custom_data lors du passage brouillon → soumis
-- ----------------------------------------------------------------------------
-- On valide UNIQUEMENT au moment où le dossier devient "soumis" — un brouillon
-- peut rester partiel. La RPC rsa_submit_dossier (module1_hardening) flip le
-- status ; ce trigger se déclenche à ce moment-là.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.startups_validate_custom_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema jsonb;
BEGIN
  -- On valide uniquement si le dossier est soumis (ou tout autre statut > brouillon).
  -- Un brouillon peut rester partiel — la validation arrive à la submission.
  IF NEW.status = 'brouillon' THEN
    RETURN NEW;
  END IF;

  -- Si UPDATE et le statut n'a pas changé ET custom_data n'a pas changé, skip.
  IF TG_OP = 'UPDATE'
     AND OLD.status = NEW.status
     AND OLD.custom_data IS NOT DISTINCT FROM NEW.custom_data
  THEN
    RETURN NEW;
  END IF;

  SELECT custom_fields_candidate INTO v_schema
    FROM public.editions
   WHERE id = NEW.edition_id;

  IF v_schema IS NULL OR jsonb_array_length(v_schema) = 0 THEN
    RETURN NEW;
  END IF;

  PERFORM public.rsa_validate_custom_data(v_schema, COALESCE(NEW.custom_data, '{}'::jsonb));
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION public.startups_validate_custom_data() IS
  'V3 — Trigger : valide startups.custom_data vs editions.custom_fields_candidate au passage status<>brouillon.';

DROP TRIGGER IF EXISTS trg_startups_validate_custom_data ON public.startups;
CREATE TRIGGER trg_startups_validate_custom_data
  BEFORE INSERT OR UPDATE ON public.startups
  FOR EACH ROW EXECUTE FUNCTION public.startups_validate_custom_data();

-- ----------------------------------------------------------------------------
-- 4. Trigger : valider jury_applications.custom_data à l'insert/update
-- ----------------------------------------------------------------------------
-- Pas de notion de "draft" côté jury_applications : un insert = une soumission
-- effective. On valide donc à l'insert et à tout update qui touche custom_data.
-- L'edition_id est nullable côté funnel spontané — dans ce cas, pas de schéma
-- à appliquer, on skip.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.jury_applications_validate_custom_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema jsonb;
BEGIN
  IF NEW.edition_id IS NULL THEN
    RETURN NEW; -- candidature spontanée sans édition fixée : pas de schéma
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.custom_data IS NOT DISTINCT FROM NEW.custom_data
     AND OLD.edition_id IS NOT DISTINCT FROM NEW.edition_id
  THEN
    RETURN NEW;
  END IF;

  SELECT custom_fields_jury INTO v_schema
    FROM public.editions
   WHERE id = NEW.edition_id;

  IF v_schema IS NULL OR jsonb_array_length(v_schema) = 0 THEN
    RETURN NEW;
  END IF;

  PERFORM public.rsa_validate_custom_data(v_schema, COALESCE(NEW.custom_data, '{}'::jsonb));
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION public.jury_applications_validate_custom_data() IS
  'V3 — Trigger : valide jury_applications.custom_data vs editions.custom_fields_jury à l''insert/update.';

DROP TRIGGER IF EXISTS trg_jury_applications_validate_custom_data ON public.jury_applications;
CREATE TRIGGER trg_jury_applications_validate_custom_data
  BEFORE INSERT OR UPDATE ON public.jury_applications
  FOR EACH ROW EXECUTE FUNCTION public.jury_applications_validate_custom_data();

-- ----------------------------------------------------------------------------
-- 5. Grants helpers
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.rsa_validate_custom_data(jsonb, jsonb) TO authenticated, anon;

COMMIT;
