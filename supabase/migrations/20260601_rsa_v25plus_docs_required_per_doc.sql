-- ============================================================================
-- V2.5+ — `docs_required` pivot : un objet par document, behavior individuel
-- ============================================================================
-- Avant (V2.5 wave 1) : un toggle global + une liste interne de docs partagent
-- le même behavior :
--   "docs_required": { "behavior": "flag", "docs": ["pitch_deck","exec_summary"] }
--
-- Après (V2.5+) : chaque doc est une clé indépendante avec son propre behavior.
-- Un doc absent du dictionnaire = pas demandé du tout.
--   "docs_required": {
--     "pitch_deck":   { "behavior": "exclu" },   -- bloquant
--     "exec_summary": { "behavior": "flag"  },   -- warning comité
--     "financials":   { "behavior": "flag"  }
--     // "video_pitch" absent : pas demandé
--   }
--
-- Cette migration :
--   1. Transforme `editions.eligibility_rules.docs_required` du vieux format
--      vers le nouveau (chaque doc listé reçoit le behavior global).
--      Idempotence : le WHERE filtre les anciens formats (présence de la clé
--      `docs` -> array). Une re-run ne touche pas les rows déjà migrées.
--   2. Recrée la RPC `rsa_evaluate_eligibility(startup, jsonb)` (CREATE OR REPLACE)
--      en remplaçant UNIQUEMENT la branche `docs_required`. Tous les autres
--      critères (country, created_after, revenue_max, raised_max,
--      founders_majority, registration) restent strictement identiques pour
--      ne pas casser leur sémantique.
--
-- Dépend de :
--   20260527_rsa_module1_hardening.sql (version initiale de la RPC)
--   20260527_rsa_platform_foundation.sql (table editions, JSON seed format vieux)
--
-- Cette migration N'APPLIQUE PAS de hardening RLS / trigger : seulement le
-- format JSON + la lecture serveur de ce format dans la RPC.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Backfill : convertir docs_required ancien format vers V2.5+
-- ─────────────────────────────────────────────────────────────────────────────
-- Détection ancien format : `docs_required.docs` est un array (présent UNIQUEMENT
-- dans l'ancien schéma). Pour chaque entrée du tableau, on construit la paire
-- (doc_key, {behavior: ancien_behavior}) et on remplace l'objet entier.
--
-- Cas limite : si l'array `docs` est vide ⇒ l'objet résultant est `{}` ⇒ aucun
-- doc demandé. Cohérent avec la sémantique "clé absente = pas demandé".
--
-- Sécurité du nested SELECT : `coalesce(jsonb_object_agg(...), '{}'::jsonb)`
-- protège contre les arrays vides (sinon jsonb_object_agg renverrait NULL).

UPDATE public.editions
   SET eligibility_rules = jsonb_set(
     eligibility_rules,
     '{docs_required}',
     (
       SELECT coalesce(
         jsonb_object_agg(
           doc,
           jsonb_build_object(
             'behavior',
             coalesce(eligibility_rules->'docs_required'->>'behavior', 'flag')
           )
         ),
         '{}'::jsonb
       )
       FROM jsonb_array_elements_text(eligibility_rules->'docs_required'->'docs') AS doc
     )
   )
 WHERE eligibility_rules ? 'docs_required'
   AND jsonb_typeof(eligibility_rules->'docs_required'->'docs') = 'array';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Recrée rsa_evaluate_eligibility — UNIQUEMENT la branche docs_required change
-- ─────────────────────────────────────────────────────────────────────────────
-- Tous les autres critères (country, created_after, revenue_max, raised_max,
-- founders_majority, registration) restent inchangés (twin pur de la version
-- initiale 20260527_rsa_module1_hardening.sql).
--
-- Nouvelle logique docs_required (V2.5+) :
--   for each (doc_key, {behavior}) in rules.docs_required:
--     - si doc_key ∉ {pitch_deck, exec_summary} : ignoré (pas wired en storage)
--     - si le path correspondant est NULL/vide :
--         behavior='exclu' ⇒ ajoute à missing_exclu  ⇒ v_excl := true
--         behavior='flag'  ⇒ ajoute à missing_flag
--   ⇒ si quelque chose manque, un seul failure entry (rule='docs_required')
--     dont le `behavior` reflète la sévérité MAX (exclu > flag), avec un
--     champ `missing_exclu` / `missing_flag` listant les docs concernés.
--
-- Compat backward : on accepte encore l'ancien format ({behavior, docs:[]}) en
-- LECTURE (au cas où une édition non migrée appellerait la RPC) — on convertit
-- à la volée. Le backfill ci-dessus garantit qu'en pratique on n'a que du V2.5+.

CREATE OR REPLACE FUNCTION public.rsa_evaluate_eligibility(p_row public.startups, p_rules jsonb)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_failed jsonb := '[]'::jsonb;
  v_excl   boolean := false;
  v_country_allowed text[];
  v_after  date;
  v_rev    numeric;
  v_raised numeric;
  v_regn   text;
  v_digits text;
  v_docs_cfg jsonb;
  v_missing_exclu text[] := array[]::text[];
  v_missing_flag  text[] := array[]::text[];
  v_doc_key text;
  v_doc_beh text;
  v_doc_present boolean;
BEGIN
  -- country (par défaut 'exclu')
  IF p_rules ? 'country' AND coalesce(p_rules->'country'->>'behavior','off') <> 'off' THEN
    SELECT array(SELECT jsonb_array_elements_text(p_rules->'country'->'allowed')) INTO v_country_allowed;
    IF p_row.country IS NULL
       OR p_row.country = '__other__'
       OR NOT (p_row.country = any(v_country_allowed)) THEN
      v_failed := v_failed || jsonb_build_object('rule','country','behavior',p_rules->'country'->>'behavior');
      v_excl   := v_excl OR (p_rules->'country'->>'behavior') = 'exclu';
    END IF;
  END IF;

  -- created_after (par défaut 'exclu')
  IF p_rules ? 'created_after' AND coalesce(p_rules->'created_after'->>'behavior','off') <> 'off' THEN
    v_after := (p_rules->'created_after'->>'date')::date;
    IF p_row.creation_date IS NULL OR p_row.creation_date < v_after THEN
      v_failed := v_failed || jsonb_build_object('rule','created_after','behavior',p_rules->'created_after'->>'behavior');
      v_excl   := v_excl OR (p_rules->'created_after'->>'behavior') = 'exclu';
    END IF;
  END IF;

  -- revenue_max (flag) — null = passe
  IF p_rules ? 'revenue_max' AND coalesce(p_rules->'revenue_max'->>'behavior','off') <> 'off' THEN
    v_rev := (p_rules->'revenue_max'->>'threshold')::numeric;
    IF p_row.last_revenue IS NOT NULL AND p_row.last_revenue >= v_rev THEN
      v_failed := v_failed || jsonb_build_object('rule','revenue_max','behavior',p_rules->'revenue_max'->>'behavior');
      v_excl   := v_excl OR (p_rules->'revenue_max'->>'behavior') = 'exclu';
    END IF;
  END IF;

  -- raised_max (flag) — null = passe
  IF p_rules ? 'raised_max' AND coalesce(p_rules->'raised_max'->>'behavior','off') <> 'off' THEN
    v_raised := (p_rules->'raised_max'->>'threshold')::numeric;
    IF p_row.amount_raised IS NOT NULL AND p_row.amount_raised >= v_raised THEN
      v_failed := v_failed || jsonb_build_object('rule','raised_max','behavior',p_rules->'raised_max'->>'behavior');
      v_excl   := v_excl OR (p_rules->'raised_max'->>'behavior') = 'exclu';
    END IF;
  END IF;

  -- founders_majority (flag) — ok ssi true ; null/false ⇒ failed
  IF p_rules ? 'founders_majority' AND coalesce(p_rules->'founders_majority'->>'behavior','off') <> 'off' THEN
    IF p_row.founders_majority IS DISTINCT FROM true THEN
      v_failed := v_failed || jsonb_build_object('rule','founders_majority','behavior',p_rules->'founders_majority'->>'behavior');
      v_excl   := v_excl OR (p_rules->'founders_majority'->>'behavior') = 'exclu';
    END IF;
  END IF;

  -- registration (flag) — placeholder si vide / que des 0 / 123123…
  IF p_rules ? 'registration' AND coalesce(p_rules->'registration'->>'behavior','off') <> 'off' THEN
    v_regn  := coalesce(p_row.registration_number, '');
    v_digits := regexp_replace(v_regn, '\D', '', 'g');
    IF v_regn = ''
       OR length(v_digits) = 0
       OR v_digits ~ '^0+$'
       OR v_digits ~ '^(?:123){2,}$'
    THEN
      v_failed := v_failed || jsonb_build_object('rule','registration','behavior',p_rules->'registration'->>'behavior');
      v_excl   := v_excl OR (p_rules->'registration'->>'behavior') = 'exclu';
    END IF;
  END IF;

  -- ───────────────────────────────────────────────────────────────────────────
  -- docs_required (V2.5+) — un behavior par document
  -- ───────────────────────────────────────────────────────────────────────────
  -- Compat lecture : on accepte les DEUX formats. Si on détecte l'ancien
  -- (`docs` array), on convertit à la volée vers le nouveau pour traiter
  -- uniformément la boucle ci-dessous.
  IF p_rules ? 'docs_required' THEN
    v_docs_cfg := p_rules->'docs_required';

    -- Si format legacy détecté ({behavior, docs:[]}) : convert in-place.
    IF jsonb_typeof(v_docs_cfg->'docs') = 'array' THEN
      v_doc_beh := coalesce(v_docs_cfg->>'behavior', 'flag');
      SELECT coalesce(
               jsonb_object_agg(doc, jsonb_build_object('behavior', v_doc_beh)),
               '{}'::jsonb
             )
        INTO v_docs_cfg
        FROM jsonb_array_elements_text((p_rules->'docs_required')->'docs') AS doc;
    END IF;

    -- Itération sur chaque doc_key demandé. Seuls pitch_deck et exec_summary
    -- ont une colonne dans `startups` (financials/video_pitch en V2.5+ ne sont
    -- pas encore wired ⇒ on les ignore silencieusement, comme côté front).
    FOR v_doc_key, v_doc_beh IN
      SELECT key, value->>'behavior'
        FROM jsonb_each(v_docs_cfg)
       WHERE jsonb_typeof(value) = 'object'
    LOOP
      IF v_doc_beh IS NULL OR v_doc_beh = 'off' THEN CONTINUE; END IF;

      v_doc_present := CASE v_doc_key
        WHEN 'pitch_deck'   THEN p_row.pitch_deck_path   IS NOT NULL AND length(btrim(p_row.pitch_deck_path))   > 0
        WHEN 'exec_summary' THEN p_row.exec_summary_path IS NOT NULL AND length(btrim(p_row.exec_summary_path)) > 0
        ELSE NULL  -- doc non wired ⇒ ignore (NULL ⇒ jamais ajouté ci-dessous)
      END;

      IF v_doc_present IS FALSE THEN
        IF v_doc_beh = 'exclu' THEN
          v_missing_exclu := v_missing_exclu || v_doc_key;
        ELSIF v_doc_beh = 'flag' THEN
          v_missing_flag  := v_missing_flag  || v_doc_key;
        END IF;
      END IF;
    END LOOP;

    IF array_length(v_missing_exclu, 1) IS NOT NULL OR array_length(v_missing_flag, 1) IS NOT NULL THEN
      v_failed := v_failed || jsonb_build_object(
        'rule',     'docs_required',
        'behavior', CASE WHEN array_length(v_missing_exclu, 1) IS NOT NULL THEN 'exclu' ELSE 'flag' END,
        'missing_exclu', to_jsonb(v_missing_exclu),
        'missing_flag',  to_jsonb(v_missing_flag)
      );
      v_excl := v_excl OR array_length(v_missing_exclu, 1) IS NOT NULL;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'verdict',
      CASE
        WHEN v_excl THEN 'excluded'
        WHEN jsonb_array_length(v_failed) > 0 THEN 'flagged'
        ELSE 'eligible'
      END,
    'failed', v_failed
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rsa_evaluate_eligibility(public.startups, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.rsa_evaluate_eligibility(public.startups, jsonb) TO authenticated;

COMMIT;
