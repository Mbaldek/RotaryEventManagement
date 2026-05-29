-- ============================================================================
-- V3 — Trio hero éditorial pour les compétitions (Identity tab)
-- ============================================================================
-- Trio "3·33·333" servant à composer le hero de la page publique de chaque
-- compétition :
--   * hero_title       (3)   — titre court ("Rotary Startup Award")
--   * hero_tagline     (33)  — phrase d'accroche (1 ligne ~ slogan)
--   * hero_description (333) — description longue (paragraphe édito, ~333 chars)
--
-- Tous nullable (les anciennes compétitions sans ces champs continuent de
-- s'afficher avec le name + finalists_per_session uniquement).
--
-- Pas de CHECK sur la longueur côté SQL — la convention "3·33·333" reste un
-- guide éditorial UX, pas une contrainte technique (laisse la porte ouverte
-- à des hero plus longs sur la grande finale, par ex.).
--
-- Edité depuis :
--   src/components/rsa/admin/platform/master/competition-tabs/IdentityTab.jsx
--   (autosave via useAutosaveCompetition → UPDATE public.editions)
--
-- Lu depuis :
--   * la page publique de la compétition (à brancher dans un round suivant
--     côté front — pour l'instant, le form remplit la donnée, la consommation
--     vient ensuite)
-- ============================================================================

BEGIN;

ALTER TABLE public.editions
  ADD COLUMN IF NOT EXISTS hero_title text;

ALTER TABLE public.editions
  ADD COLUMN IF NOT EXISTS hero_tagline text;

ALTER TABLE public.editions
  ADD COLUMN IF NOT EXISTS hero_description text;

COMMENT ON COLUMN public.editions.hero_title IS
  'V3 — Trio hero éditorial (3·33·333) : titre court de la compétition ' ||
  '(ex. "Rotary Startup Award"). Affiché en serif Playfair sur la page publique.';

COMMENT ON COLUMN public.editions.hero_tagline IS
  'V3 — Trio hero éditorial (3·33·333) : phrase d''accroche, slogan en une ligne ' ||
  '(ex. "Le prix qui révèle les startups d''impact en Europe."). ' ||
  'Affichée en italique serif sous le titre.';

COMMENT ON COLUMN public.editions.hero_description IS
  'V3 — Trio hero éditorial (3·33·333) : description longue de la compétition. ' ||
  'Paragraphe édito (~333 caractères indicatif). Sert d''intro à la page publique.';

COMMIT;
