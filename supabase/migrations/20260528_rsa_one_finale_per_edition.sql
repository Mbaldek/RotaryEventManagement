-- Correctif : l'index `session_config_only_one_final` interdisait plus d'une finale
-- dans TOUTE la table — ce qui empêche d'ouvrir une 2ème édition (ex. 2027) tant
-- que la finale 2026 reste en base. On veut "une finale par édition", pas "une
-- finale au total".
--
-- Stratégie : on remplace l'index global par un trigger BEFORE INSERT OR UPDATE
-- qui rejette toute mise à is_final=true s'il existe déjà une autre session_config
-- finale dans la même édition (via JOIN sessions). Le trigger lit sessions.edition_id
-- au moment de la vérification, donc pas besoin de dénormaliser de colonne.

DROP INDEX IF EXISTS public.session_config_only_one_final;

CREATE OR REPLACE FUNCTION public.session_config_enforce_one_finale_per_edition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_edition_id text;
  v_conflict_id text;
BEGIN
  IF NOT NEW.is_final THEN
    RETURN NEW;
  END IF;

  SELECT edition_id INTO v_edition_id
    FROM public.sessions
   WHERE id = NEW.session_id;

  IF v_edition_id IS NULL THEN
    -- Pas de session liée -> on laisse passer ; la FK ailleurs cassera s'il y a lieu.
    RETURN NEW;
  END IF;

  SELECT sc.session_id INTO v_conflict_id
    FROM public.session_config sc
    JOIN public.sessions s ON s.id = sc.session_id
   WHERE sc.is_final = true
     AND s.edition_id = v_edition_id
     AND sc.session_id <> NEW.session_id
   LIMIT 1;

  IF v_conflict_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Edition % already has a finale session (%). Only one finale is allowed per edition.',
      v_edition_id, v_conflict_id
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_session_config_one_finale_per_edition ON public.session_config;
CREATE TRIGGER trg_session_config_one_finale_per_edition
  BEFORE INSERT OR UPDATE OF is_final, session_id
  ON public.session_config
  FOR EACH ROW
  EXECUTE FUNCTION public.session_config_enforce_one_finale_per_edition();
