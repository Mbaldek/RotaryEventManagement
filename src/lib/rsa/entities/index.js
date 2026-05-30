// Façade — re-exporte toutes les entités RSA par domaine.
//
// Préserve la surface publique de l'ancien `@/lib/rsa/entities.js` (one-file).
// Aucun import existant ne doit changer : `import { Startup, JuryScore, ... } from
// '@/lib/rsa/entities'` continue de résoudre via ce fichier (index.js).
//
// Pour ajouter une nouvelle entité : créer son fichier de domaine puis ajouter
// un re-export ici. Les imports cross-domaine se font via chemins relatifs
// internes au dossier (`./_createEntity`, etc.).

export { Edition, createCompetition } from './editions';
export { RsaSession } from './sessions';
export { AppUserRole } from './app-user-roles';
export { Startup } from './startups';
export { SelectionReview } from './selection';
export { JuryProfile, JuryAssignment, JuryDraft, JuryScore } from './jury';
export { Club, ClubMembership, EditionClub } from './clubs';
export { CompetitionAdmin } from './competition-admins';
export { JuryApplication } from './jury-applications';
