// Routage post-login plateforme RSA — fonction PURE (testable hors React).
//
// Pourquoi pur : on veut un seul endroit (Login.jsx) qui sait où renvoyer
// l'utilisateur après un magic link. La règle de priorité doit être
// déterministe, auditable, et identique en SSR/CSR/test — d'où un module
// sans dépendances React/Supabase.
//
// Priorités (cf. Chantier 1 + ÉQUIPE A F1 + ÉQUIPE C nav-refactor) :
//   1. ?next= whitelisté (deep-link explicite)
//   2. intent=candidate -> /MonDossier?edition=..&club=..
//   3. intent=jury-onboard -> /Welcome?role=jury[&edition=..]
//   4. master_admin -> /Admin
//   4bis. competition_admin (>=1) -> /Admin?scope=competition:<première édition>
//   5. club_admin (>=1) -> /Admin?scope=club:<premier club admin>
//   6. admin (legacy global) -> /Admin
//   7. comite (global ou club) -> /Selection
//   8. jury (global ou club) -> /Jury
//   9. fallback -> /MonDossier (candidat par défaut, MonDossier gère picker/edit)
//
// 4bis (competition_admin) — un rôle "admin d'une édition unique" qui voit
// uniquement le scope d'une compétition (V2.5+). On le place AVANT club_admin
// car il décrit un scope plus large (une édition recouvre potentiellement plusieurs
// clubs) et garde la cohérence avec les autres priorités admin (master > scope édition
// > scope club > admin legacy global).
//
// F1 — `hasDossier` retiré : que l'utilisateur ait ou non un dossier ouvert,
// la cible finale était déjà la même (/MonDossier). On évite ainsi une query
// `select id from startups` bloquante sur /Login (200-500ms gagnées).

// Whitelist des `?next=` autorisés. Bloque les redirections vers des hôtes
// externes (open-redirect) ou des routes inattendues. On accepte uniquement
// les espaces internes connus, suivis de `/`, `?` ou fin de chaîne.
export const ALLOWED_NEXT = /^\/(MonDossier|Selection|Jury|Admin|Welcome|Candidater|DevenirJury)(\/|\?|$)/;

function cleanStr(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

// Construit une querystring en omettant les couples dont la valeur est nulle/vide.
function buildQuery(params) {
  const parts = [];
  for (const [k, v] of Object.entries(params)) {
    const cv = cleanStr(v);
    if (cv) parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(cv)}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export function computeLandingRoute({
  roles = [],
  clubMemberships = [],
  competitionAdminEditions = [],
  nextParam = null,
  intent = null,
  editionId = null,
  clubId = null,
} = {}) {
  const safeRoles = Array.isArray(roles) ? roles : [];
  const safeCM = Array.isArray(clubMemberships) ? clubMemberships : [];
  const safeCA = Array.isArray(competitionAdminEditions) ? competitionAdminEditions : [];
  const next = cleanStr(nextParam);
  const edition = cleanStr(editionId);
  const club = cleanStr(clubId);

  // 1. Deep-link whitelisté — confiance explicite à l'appel précédent.
  if (next && ALLOWED_NEXT.test(next)) return next;

  // 2. Intent candidat : on file direct sur MonDossier avec le contexte
  //    pré-rempli (edition/club) — utile pour les liens publics RSA.
  if (intent === 'candidate') {
    return `/MonDossier${buildQuery({ edition, club })}`;
  }

  // 3. Intent jury : page d'onboarding dédiée.
  if (intent === 'jury-onboard') {
    return `/Welcome${buildQuery({ role: 'jury', edition })}`;
  }

  // 4. master_admin gagne TOUJOURS contre les rôles plus locaux : il
  //    administre la fédération entière, pas un club isolé.
  if (safeRoles.includes('master_admin')) return '/Admin';

  // 4bis. competition_admin : scope sur SA première édition. AdminShell résout
  //    le scope `competition:<id>` à partir de l'URL. Placé avant club_admin
  //    car une édition est typiquement un cadre plus large qu'un club isolé
  //    (et en V2.5 un competition_admin pilote l'édition multi-club).
  if (safeCA.length > 0) {
    return `/Admin?scope=competition:${safeCA[0]}`;
  }

  // 5. club_admin sans master : scope sur SON premier club (cas habituel
  //    en V2 où une présidente n'a qu'un club).
  const firstClubAdmin = safeCM.find((m) => m && m.role === 'club_admin');
  if (firstClubAdmin) return `/Admin?scope=club:${firstClubAdmin.club_id}`;

  // 6. admin global legacy (V1) — équivalent master en l'absence de master.
  if (safeRoles.includes('admin')) return '/Admin';

  // 7. comité : page Sélection (revue dossiers).
  const isComite = safeRoles.includes('comite') || safeCM.some((m) => m && m.role === 'comite');
  if (isComite) return '/Selection';

  // 8. jury : page Jury (notation).
  const isJury = safeRoles.includes('jury') || safeCM.some((m) => m && m.role === 'jury');
  if (isJury) return '/Jury';

  // 9. Aucun rôle : on renvoie sur MonDossier — c'est l'espace candidat par
  //    défaut. MonDossier sait gérer les deux cas (picker si pas de dossier,
  //    édition si dossier existant), donc inutile de pré-vérifier ici.
  return '/MonDossier';
}

// Parse une chaîne window.location.search-style ("?a=1&b=2" ou "a=1&b=2")
// et retourne les quatre champs reconnus, nettoyés (trim + null si vide/absent).
// On garde la signature minimaliste : on n'expose que ce que Login consomme.
export function parseLoginQuery(searchString) {
  const empty = { next: null, intent: null, edition: null, club: null };
  if (typeof searchString !== 'string' || !searchString.length) return empty;
  const raw = searchString[0] === '?' ? searchString.slice(1) : searchString;
  if (!raw.length) return empty;
  const out = { ...empty };
  for (const pair of raw.split('&')) {
    if (!pair) continue;
    const eqIdx = pair.indexOf('=');
    const rawKey = eqIdx === -1 ? pair : pair.slice(0, eqIdx);
    const rawVal = eqIdx === -1 ? '' : pair.slice(eqIdx + 1);
    let key;
    let val;
    try {
      key = decodeURIComponent(rawKey);
      val = decodeURIComponent(rawVal.replace(/\+/g, ' '));
    } catch {
      // segment malformé — on l'ignore plutôt que de planter toute la query.
      continue;
    }
    if (key === 'next') out.next = cleanStr(val);
    else if (key === 'intent') out.intent = cleanStr(val);
    else if (key === 'edition') out.edition = cleanStr(val);
    else if (key === 'club') out.club = cleanStr(val);
  }
  return out;
}
