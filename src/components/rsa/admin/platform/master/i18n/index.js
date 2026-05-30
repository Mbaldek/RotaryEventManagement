// i18n trilingue (FR/EN/DE) du Master Cockpit V2 (RSA multi-club).
//
// Forme { fr, en, de } compatible useLang().t(dict). Aucune string utilisateur n'est
// hardcodée dans les composants : tout passe par ce dictionnaire.
//
// Les copies EN/DE sont rédigées pour un usage institutionnel (master_admin parle
// à des Rotary clubs internationaux). Les notes "TODO refine DE copy" marquent les
// libellés qui devront être validés par un relecteur DE natif.
//
// ── R5b (refactor 2026-05-30) ───────────────────────────────────────────────
// Ce dump i18n a été splitté par tab/section dans ./i18n/<section>.js pour
// rester maintenable. Cet index.js sert de facade : il re-exporte exactement
// les mêmes symboles que l'ancien i18n.js monolithique. Aucun changement
// d'API côté composants.
export { TABS, TAB_IDS } from './tabs';
export { COMP_ADMINS } from './competition-admins';
export { UI, STRIP } from './ui';
export { COMP } from './competitions';
export { PILOTAGE } from './pilotage';
export { CLUBS, CLUB_ROW_ACTIONS } from './clubs';
export { ROLES } from './roles';
export { FINALE } from './finale';
export { OVERVIEW } from './overview';
export { DIFFUSION } from './diffusion';
export { COMMUNICATION_REFONTE } from './communication';
export {
  COMPETITION_MODELS,
  CLUB_ROLES,
  KEBAB_REGEX,
  COUNTRY_OPTIONS,
  LANGUAGE_OPTIONS,
  EMAIL_REGEX,
  slugifyClubName,
} from './constants';
export {
  FORMULAIRES,
  CUSTOM_FIELD_MODAL,
  CUSTOM_FIELD_TYPES,
  CUSTOM_FIELD_TYPES_WITH_OPTIONS,
} from './formulaires';
export { SESSION_JURY } from './session-jury';
