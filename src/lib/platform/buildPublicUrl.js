// buildPublicUrl — helper centralisé pour générer les URLs publiques RSA
// (candidater, devenir juré, vue publique des résultats, etc.).
//
// Source de vérité de l'origine :
//   1) `import.meta.env.VITE_APP_URL` (défini en build pour la prod canonique) ;
//   2) `window.location.origin` (fallback runtime — dev, preview Vercel, etc.).
//
// Volontairement minimal : construit l'URL via WHATWG `URL`, filtre les params
// null/undefined/'' pour éviter `?edition=` vide quand l'appelant ne fournit pas
// la valeur. Toujours stringify (les UUID numériques restent des UUID, mais on
// est défensif si jamais un id arrive en number).
//
// Usage :
//   buildPublicUrl('/Candidater', { edition: edition.id })
//   buildPublicUrl('/Concours')                              // sans params
//   buildPublicUrl('/DevenirJury', { edition: editionId, club: 'paris' })

const SAFE_FALLBACK = 'http://localhost:5173';

function resolveOrigin() {
  // En prod : VITE_APP_URL est la source canonique (peut différer du host de
  // l'admin — ex. admin sur app.rotary-startup.org mais URL publique sur
  // rotary-startup.org). Si absent, on retombe sur l'origin courant.
  const envUrl =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_APP_URL
      : undefined;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return SAFE_FALLBACK;
}

export function buildPublicUrl(path, params = {}) {
  const origin = resolveOrigin();
  // `new URL(path, base)` accepte aussi bien '/Candidater' que 'Candidater'.
  const url = new URL(path, origin);
  if (params && typeof params === 'object') {
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export default buildPublicUrl;
