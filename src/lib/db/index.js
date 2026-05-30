// Facade db — re-exporte les entités lunch + RSA legacy au top level pour ne pas
// casser les imports existants `from '@/lib/db'`. Split en sous-modules pour
// préparer l'extraction lunch future (R1) : `lunch.js` partira avec le repo
// lunch, `rsa-legacy.js` restera ici jusqu'à migration URL (cf. docs/deepsolve/
// rsa-legacy-url-migration.md), et `_createEntity.js` sera dupliqué.

export { createEntity } from './_createEntity';

export {
  Seat,
  RestaurantTable,
  Reservation,
  GlobalSettings,
  EventHistory,
  UpcomingEvent,
  User,
  Chat,
  getCurrentUser,
  uploadFile,
} from './lunch';

export {
  JuryProfile,
  StartupConfirmation,
  JuryScoringSession,
  SessionConfig,
  JuryScore,
  FinaleRsvp,
  JuryScoreDraft,
} from './rsa-legacy';
