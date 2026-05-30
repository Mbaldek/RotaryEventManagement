// withTimeout — race une requête supabase contre un timeout, en NORMALISANT
// d'abord le thenable en vraie Promise. Module séparé (pur, testé) pour
// verrouiller le contrat contre la régression ci-dessous.
//
// BUG ROOT CAUSE (introduit 2026-06-04, fixé 2026-05-30) : les query builders
// PostgREST — supabase.from(...).maybeSingle(), supabase.rpc(...) — sont des
// THENABLES (ils implémentent .then) mais PAS de vraies Promises : ils n'ont
// NI .catch NI .finally. Appeler `builder.catch(() => {})` jette
// « TypeError: catch is not a function », ce qui faisait throw loadIdentity
// AVANT le moindre appel réseau → roles/rolesLoaded jamais posés → spinner
// /Login perpétuel + « onAuthStateChange failed / init failed: X.catch is not
// a function » en console. Cf. docs/deepsolve/sso-google-master-admin-misroute.md §11.
//
// Fix : Promise.resolve(promise) adopte le thenable (déclenche son exécution
// une seule fois) et renvoie une vraie Promise sur laquelle .catch fonctionne.

export function withTimeout(promise, ms, label) {
  // Normalise thenable → vraie Promise (gère les builders PostgREST sans .catch).
  const normalized = Promise.resolve(promise);
  // Swallow late rejection : si le timeout gagne la race et que la promesse
  // sous-jacente rejette ensuite (AbortError navigator.locks volé entre tabs /
  // double-mount StrictMode), l'erreur reste « handled » même si plus personne
  // n'attend la valeur — pas d'« Uncaught (in promise) ».
  normalized.catch(() => {});
  return Promise.race([
    normalized,
    new Promise((resolve) =>
      setTimeout(
        () => resolve({ data: null, error: { message: `${label} timeout ${ms}ms` } }),
        ms,
      ),
    ),
  ]);
}
