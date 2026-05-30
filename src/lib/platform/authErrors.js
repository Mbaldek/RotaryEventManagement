// authErrors — helpers purs pour classer les erreurs renvoyées par les RPC
// d'identité (rsa_my_roles & co). Module SÉPARÉ d'auth.jsx pour rester
// importable en test node:test (auth.jsx tire React / import.meta.env / JSX).
//
// Contexte : un access_token mort (refresh_token 400, JWT expiré, session
// zombie) fait que rsa_my_roles renvoie une 401/JWT-error à CHAQUE appel. Dans
// ce cas, retry est inutile (le token ne ressuscitera pas) — il faut au
// contraire LÂCHER la session locale pour retomber sur le formulaire de login.
// À l'inverse, un timeout réseau (notre sentinelle withTimeout) est transitoire
// et DOIT être retenté, pas traité comme un token mort.
//
// Cf. docs/deepsolve/sso-google-master-admin-misroute.md (§254 : « si présent
// mais expiré : signOut local + re-login »).

// true UNIQUEMENT pour une erreur d'authentification définitive (le serveur a
// répondu et a rejeté le JWT). false pour un timeout / erreur réseau / null —
// qui sont transitoires et doivent être retentés.
export function isAuthError(error) {
  if (!error) return false;

  // Notre sentinelle de timeout (withTimeout dans auth.jsx) : message
  // « <label> timeout <ms>ms ». Transitoire — surtout PAS un token mort.
  const msg = String(error.message ?? '').toLowerCase();
  if (msg.includes('timeout')) return false;

  // Codes explicites : HTTP 401/403 ou codes PostgREST JWT (PGRST301 = JWT
  // expired/invalid, PGRST302 = anonymous non autorisé).
  const code = String(error.code ?? error.status ?? '').toUpperCase();
  if (code === '401' || code === '403' || code === 'PGRST301' || code === 'PGRST302') {
    return true;
  }

  // Fallback sur le message (selon les versions de gotrue / postgrest le code
  // peut manquer mais le message reste explicite).
  return (
    msg.includes('jwt') ||
    msg.includes('token is expired') ||
    msg.includes('token expired') ||
    msg.includes('invalid claim') ||
    msg.includes('not authorized') ||
    msg.includes('unauthorized') ||
    msg.includes('invalid refresh token')
  );
}
