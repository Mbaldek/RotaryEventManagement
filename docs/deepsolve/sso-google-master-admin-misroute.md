# DEEPSOLVE — SSO Google master_admin atterrit sur /MonDossier au lieu de /Admin

**Date :** 2026-05-29
**Auteur :** Claude
**Statut :** root cause identifiée — fix Plan A prêt — Plan B (email/password) en réserve
**Décide :** Mathieu
**Issue parent :** suite directe de [auth-rights-stability.md](./auth-rights-stability.md) qui a stabilisé `/Admin` mais PAS le routing post-Login.
**Protocole :** [/DEEP_SOLVE.md](../../DEEP_SOLVE.md)

---

## 0. TL;DR

Tu cliques **Google SSO** avec `mathieubal@gmail.com` (master_admin) → la session se crée → tu atterris sur **/MonDossier** (espace candidat / startup) au lieu de **/Admin**.

**Cause :** dans `Login.jsx`, on déclare la résolution des rôles "terminée" trop tôt — soit (a) un fallback **timeout 1500 ms** fire avant que `rsa_my_roles` n'ait répondu, soit (b) le flag `identityLoaded` bascule à `true` dès qu'**une seule** des 4 RPC d'identité a réussi (`anySuccess = OR`), même si **la seule RPC qui sait que tu es master_admin** (`rsa_my_roles`) a timeout ou erreur. Résultat : `computeLandingRoute({ roles: [] })` tombe sur le fallback candidat → **/MonDossier**.

En base, tout est OK (vérifié 2026-05-29 21h via Supabase MCP) :
```
mathieubal@gmail.com  → ['admin','comite','jury','master_admin']
mat.balleron@proton.me → ['admin','comite','jury','master_admin']
auth.users mathieubal@gmail.com — provider=google, last_sign_in 2026-05-29 21:14 UTC
rsa_my_roles() — SECURITY DEFINER STABLE, retourne text[] (lower-case match)
```

→ **bug 100 % côté client**, dans le séquencement entre `setAuthUser`, les 4 RPC `loadIdentity`, le flag `identityLoaded`, et le fallback timer de `Login.jsx`.

**Fix Plan A (≈30 min, zero migration SQL) :** introduire un flag `rolesLoaded` (rsa_my_roles a *réellement* répondu — succès OU array confirmé) ; c'est ce flag qui déclenche le routing post-Login, pas `identityLoaded` (OR-de-4). Bumper le fallback Login.jsx de 1500 ms à 9 s. Ajouter un *safety net* qui refuse de naviguer vers /MonDossier tant que `rolesLoaded === false`. Retry ciblé sur `rsa_my_roles` si erreur partielle.

**Plan B (si SSO/magic-link continuent à kicker en prod après Plan A) :** ajouter login email+password — voir §7. **Non recommandé sans avoir validé que Plan A ne suffit pas.**

---

## 1. STOP — Objectif réel (§1 du protocole)

> Quand un master_admin se connecte sur la plateforme (par n'importe quel moyen — SSO Google, SSO Microsoft, magic-link), il doit atterrir sur **/Admin** dès le premier render, sans clignotement, sans étape intermédiaire, sans avoir à retaper l'URL.

Sous-objectif : aucun utilisateur (master, club_admin, comité, juré) ne doit voir l'espace candidat (/MonDossier) si ses rôles le qualifient pour autre chose. Le fallback /MonDossier est réservé aux **vrais candidats sans rôle**.

---

## 2. DIAGNOSTIC (§2 du protocole)

### 2.1 Reproduction

| Étape | Action | Attendu | Obtenu |
|-------|--------|---------|--------|
| 1 | `app.rotary-startup.org/Login` en navigation privée | form magic-link + SSO | ✅ |
| 2 | Clic "Google" | redirect Google OAuth | ✅ |
| 3 | Sélection `mathieubal@gmail.com` | retour callback Supabase | ✅ |
| 4 | Atterrissage | **/Admin** (master_admin) | **/MonDossier** ❌ |
| 5 | Taper `/Admin` manuellement | accès accordé | ✅ (rôles ont fini par charger) |

Le bug **n'est pas systématique** — il dépend de la latence des RPC. C'est pourquoi il revient après chaque fix partiel : on traite des manifestations différentes du même problème de timing.

### 2.2 Trace côté client (séquence d'événements)

```
t=0     Click Google → supabase.auth.signInWithOAuth → window.location = google
t=...   user accepte sur accounts.google.com
t=...   redirect → app.rotary-startup.org/Login#access_token=...
t=0ms   /Login monte
        PlatformAuthProvider mount
        ├─ state initial : loading=true, authUser=null, roles=[], identityLoaded=false
        └─ useEffect : registers onAuthStateChange + lance IIFE init

t=~5ms  Supabase-js détecte le hash → parse → stocke en localStorage
        fire INITIAL_SESSION (skipped par notre noop set — OK)

t=~20ms IIFE: getSession() resolve → session.user = {email: mathieubal@gmail.com}
        setAuthUser(session.user)   ◄── isAuthenticated devient TRUE
        await loadIdentity(email)   ◄── lance 4 RPC en Promise.all

t=~25ms Login.jsx useEffect ré-évalue :
        isAuthenticated=true, roles=[], clubMemberships=[], identityLoaded=false
        → schedule setTimeout(() => setResolved(true), 1500ms)  ❶ FALLBACK TIMER

t=~30ms Les 4 RPC partent en parallèle. Sur réseau froid mobile / cold-start Postgres :
        - profiles                       ~200ms  ✅
        - rsa_my_roles                  ~1800ms  (slow) — ou erreur transitoire
        - my_club_memberships            ~600ms  ✅
        - my_competition_admin_editions  ~500ms  ✅

t=1500ms ❶ setTimeout fire → setResolved(true) — MAIS roles toujours []
         Login render : <Navigate to={computeLandingRoute({ roles: [] })} />
         computeLandingRoute fallback → "/MonDossier"  ❌❌❌

t=1800ms rsa_my_roles répond enfin → setRoles(['admin','comite','jury','master_admin'])
         setIdentityLoaded(true)
         MAIS on est DÉJÀ sur /MonDossier — Login.jsx n'est plus monté.
```

**Variante (Race C — la plus pernicieuse) :** si `rsa_my_roles` *erreur* (timeout 8 s, transient TCP reset, RPC down 200 ms) mais que les 3 autres RPC réussissent, `anySuccess = TRUE`, `setIdentityLoaded(true)` fire en ~600 ms (AVANT les 1500 ms du fallback), et même séquence → routing avec `roles=[]` → /MonDossier.

### 2.3 Pourquoi c'est revenu après les fixes précédents

Les fixes 2026-05-29 / 2026-06-04 / 2026-06-05 ont chacun traité une manifestation distincte du même problème de timing :

| Date | Commit | Symptôme traité | Manifestation |
|------|--------|-----------------|---------------|
| 2026-05-29 | (auth.jsx) | Spinner /Admin infini | watchdog 10s, getSession timeout 8s |
| 2026-06-04 | c7eff0c  | AbortError uncaught | single-flight loadIdentity + late rejection swallow |
| 2026-06-05 | 036762e  | Kick master_admin après 30 min | skip loadIdentity sur TOKEN_REFRESHED |
| 2026-06-05 | (auth.jsx) | Forbidden /Admin cold-start | loadIdentity idempotent (préserve l'état sur erreur) |
| 2026-05-30 | (auth.jsx) | SSO Google → /MonDossier | Plan A ci-dessous (rolesLoaded + safety net) |
| 2026-05-30 | 701addd  | **Safety-net = boucle perpétuelle sur session morte** | **Plan A.2 ci-dessous (§10)** |

Tous = même classe de bug : **timing entre l'auth client Supabase, le state React, et le routing**. Le Plan A est le dernier maillon visible.

### 2.4 Anti-pattern présent dans le code

Application du tableau §75-86 du protocole :

| Symptôme | Vrai problème |
|----------|---------------|
| `setTimeout(setResolved, 1500)` dans Login.jsx (line 93) | timer arbitraire pour cacher une race async — **anti-pattern §159** |
| `anySuccess = !err1 || !err2 || !err3 || !err4` | mauvaise source de vérité (OR de signaux non-équivalents) — **anti-pattern "State désynchronisé"** |
| 4 RPC traitées comme équivalentes alors que `rsa_my_roles` est canonique pour le routing | **asymétrie de criticité non modélisée** |

---

## 3. EXPLORER (§3 du protocole)

### 3.1 Supabase

- `rsa_my_roles` retourne `text[]` (jamais null grâce à `coalesce(roles, '{}')`). Pas de bug serveur.
- Pas besoin de nouvel RPC, de view, ou de migration.
- Les 4 RPC sont déjà en `SECURITY DEFINER STABLE` → safe sous RLS.

### 3.2 Comment d'autres apps gèrent ce cas

- **Pattern "auth-aware router"** (NextAuth, Clerk, RemixAuth) : route changes attendent la résolution **complète** de l'identité avant de prendre une décision de navigation. Pas de fallback timer.
- **Pattern "guarded landing"** : une page de landing (`/auth/callback`) qui ne décide qu'après réception du JWT décodé ET d'au moins un appel canonique. Notre Login.jsx joue ce rôle, mais avec le mauvais signal.

### 3.3 Simplification possible

Au lieu d'attendre 4 RPC en parallèle → attendre **rsa_my_roles seule** pour le routing, et laisser les 3 autres charger en arrière-plan (elles n'affectent QUE l'UI post-routing : navigation, badges, scopes). Plus simple = moins de race conditions.

→ retenu pour le Plan A : on garde les 4 RPC en parallèle pour la perf, mais on **isole** le flag `rolesLoaded` pour le routing.

---

## 4. DÉCIDER (§4 du protocole)

| Critère | Plan A (`rolesLoaded` flag) | Plan B (email/password) | Plan C (séparer rsa_my_roles en boot séquentiel) |
|---------|------------------------------|--------------------------|---------------------------------------------------|
| Fiabilité | ✅ traite la cause | ⚠️ ajoute un flow, n'élimine pas le bug pour SSO/magic | ✅ |
| Simplicité | ✅ +1 state, ~10 lignes | ❌ nouveau flow + UI + migration | ⚠️ -1 RPC en parallèle, +latence boot |
| Maintenabilité | ✅ flag explicite et nommé | ⚠️ surface auth doublée | ✅ |
| Performance | ✅ aucun coût | ✅ aucun coût | ❌ +200-500ms boot (RPC séquentielle) |
| Effort | ~30 min | 2-3 h | ~1 h |

**Décision :** Plan A. Plan C est plus chirurgical mais coûte plus de latence boot pour tous les users. Plan B en réserve si Plan A ne suffit pas.

---

## 5. PROPOSER avant de coder (§5 du protocole)

### Patches proposés (résumé)

**Patch 1 — `src/lib/platform/auth.jsx` : flag `rolesLoaded` dédié à `rsa_my_roles`**
- ajouter `const [rolesLoaded, setRolesLoaded] = useState(false)`
- dans `loadIdentityImpl`, après le bloc `if (rolesRes?.error) { ... } else if (Array.isArray) { setRoles(rolesRes.data); }` → ajouter `setRolesLoaded(true)` uniquement quand la RPC a réellement répondu sans erreur (data = array, même vide)
- exposer `rolesLoaded` dans le `value` du context
- reset à `false` dans `signOut`

**Patch 2 — `src/lib/platform/auth.jsx` : retry ciblé sur `rsa_my_roles`**
- `loadIdentityImpl` retourne aussi `rolesErrored: !!rolesRes?.error`
- dans l'IIFE init, si `rolesErrored` (même avec `anySuccess`), schedule 2 retries à 1.5 s et 5 s

**Patch 3 — `src/pages/Login.jsx` : attendre `rolesLoaded` (pas `identityLoaded`) + safety net**
- remplacer `identityLoaded` par `rolesLoaded` dans la résolution
- bumper `ROLE_RESOLVE_TIMEOUT_MS` 1500 → 9000 (aligné sur les timeouts RPC internes)
- safety net : si on a expiré le timeout SANS que `rolesLoaded === true` ET que `roles.length === 0` ET `clubMemberships.length === 0`, **NE PAS naviguer** vers /MonDossier — rester sur le spinner Login. Les retries auth.jsx finissent par populer `roles`, et le useEffect ré-évalue.

**Patch 4 (bonus, défense en profondeur) — `src/pages/MonDossier.jsx`**
- si l'utilisateur arrive sur /MonDossier avec `isMasterAdmin || isAdmin`, afficher un toast/banner "Tu es administrateur — aller à /Admin ?" plutôt que de présenter le funnel candidat directement.

### Risques

- ⚠️ Le bump 1500 → 9000 ms allonge le spinner "Loading your workspace" pour les *vrais candidats sans rôle* en cas de panne RPC. Acceptable : le candidat voit un spinner clean, pas un funnel cassé.
- ⚠️ Le safety net pourrait masquer un cas où l'utilisateur a vraiment perdu tous ses rôles. Mitigation : Sentry breadcrumb à chaque safety-net trigger pour observer.

### Fichiers modifiés (estimé)

- `src/lib/platform/auth.jsx` (~15 lignes ajoutées)
- `src/pages/Login.jsx` (~10 lignes modifiées)
- `src/pages/MonDossier.jsx` (optionnel, Patch 4 — ~20 lignes)
- `src/lib/platform/__tests__/auth.rolesLoaded.test.js` (nouveau, ~50 lignes — voir §6.2)

Pas de migration SQL. Pas de touche à `postLoginRoute.js` (la fonction est correcte, on l'appelait juste avec un argument faussement définitif).

---

## 6. Test plan

### 6.1 Tests unitaires existants
`postLoginRoute.test.js` reste couvert — aucun cas à ajouter, la fonction est correcte.

### 6.2 Nouveau test d'intégration (Patch 1+2)
- Mock `supabase.rpc('rsa_my_roles')` pour retourner `{ data: null, error: 'timeout' }` → vérifier que `rolesLoaded` reste `false` après le 1er load.
- Puis mock une réponse réussie au retry → vérifier que `rolesLoaded` passe à `true` et `roles` est populé.
- Vérifier que `signOut` reset `rolesLoaded` à `false`.

### 6.3 Smoke manuel (à passer après deploy preview Vercel)
1. **Incognito → `/Login` → Google SSO `mathieubal@gmail.com`** → DOIT atterrir sur **/Admin**, pas /MonDossier.
2. **Refresh sur /Admin** → reste sur /Admin (no kick — regression sur fixes antérieurs).
3. **DevTools → Network → throttle "Slow 3G" → SSO Google** → toujours /Admin (après 3-5 s spinner acceptable).
4. **Magic-link `mat.balleron@proton.me`** → DOIT atterrir sur /Admin.
5. **SSO Google avec compte candidat de test sans rôle** → /MonDossier (comportement attendu fallback).
6. **Throttle réseau + force-quit pendant le load des RPC** → safety net doit refuser de naviguer.

### 6.4 Observabilité prod
- Garder le `console.warn('[Login] redirect →', target, { roles, ... })` existant.
- Ajouter dans Sentry une breadcrumb `auth.routing` au moment du `<Navigate>` post-login.
- Ajouter une breadcrumb `auth.safety_net_hit` quand le safety net refuse de naviguer (signale un cas à investiguer).

---

## 7. Plan B (réserve) — Email/password en backup

À considérer **uniquement** si après Plan A on observe encore des kicks ou des plaintes utilisateur de stabilité.

### Pourquoi pas remplacer SSO/magic-link

- SSO reste utile pour les jurés CEO (DLP/throttling email entreprise sur magic-link).
- Magic-link a un argument anti-phishing (one-shot, pas de password à exfiltrer).
- Remplacer = re-onboarder tous les comptes existants (master, club_admins, jurés, candidats) — coût élevé pour un bénéfice incertain.

### Plan d'ajout (additif, pas un remplacement)

1. **Supabase Dashboard** → Auth → Providers → Email → activer password (déjà actif par défaut, vérifier).
2. **Migration utilisateurs existants** : flux "Set initial password" via le bouton "Reset password" Supabase (envoie un email → form → password set). Pas de migration SQL.
3. **UI Login.jsx** : ajouter un toggle "Connexion par mot de passe" qui révèle un champ password sous l'email. Boutons côte-à-côte : "Se connecter" (password) | "M'envoyer un magic-link" | SSO Google | SSO Microsoft.
4. **API** : `supabase.auth.signInWithPassword({ email, password })` — supporté nativement, zero migration backend.
5. **Routing post-login** : identique au Plan A (computeLandingRoute lit `roles`). Le bug du Plan A se manifesterait aussi en password-flow si on ne le fixe pas — donc **Plan B sans Plan A ne résout rien**.
6. **Sécu** : enforcer min 12 chars + 1 chiffre + 1 majuscule côté UI, bcrypt côté Supabase (par défaut), rate-limit anti-bruteforce côté Supabase (config dashboard).

**Effort :** ~2-3 h UI + 30 min config + smoke tests. Aucune migration DB.

### Pourquoi je ne le fais pas maintenant

1. Plan A devrait éliminer le symptôme actuel — pas besoin d'introduire un nouveau flow.
2. Email/password sans 2FA réduit la sécurité vs magic-link (qui est essentiellement OTP one-shot).
3. Si Plan B devient nécessaire, c'est une PR séparée, ~2 h, low-risk.

**Décision attendue de Mathieu :** appliquer Plan A en priorité, ré-évaluer 7-10 jours plus tard si Plan B est nécessaire.

---

## 8. Notes pour la prochaine fois

- **Ne JAMAIS** synchroniser une décision de routing sur un flag "OR de plusieurs sources" si UNE source est canonique. Ici `rsa_my_roles` était canonique — diluée dans un `anySuccess`.
- **Toujours** garder les logs `console.warn('[PlatformAuth] init start' → 'getSession resolved' → 'loadIdentity result' → 'loadIdentity done' → '[Login] redirect → X')`. Suffit d'ouvrir DevTools quand le bug réapparaît pour reconstituer la séquence.
- **Si bug réapparaît malgré Plan A** : probablement navigator.locks (sb-*-auth-token) qui hang sur multi-tab. Inspecter via DevTools → Application → Local Storage → clé `sb-uaoucznptxmvhhytapso-auth-token`. Si présent mais expiré : signOut local + re-login.
- **Anti-pattern à éviter à l'avenir** : `setTimeout(setResolved, N)` comme béquille pour cacher une async race. Préférer un flag réactif basé sur l'état réel des promesses.

---

## 10. Plan A.2 — Le safety net pouvait devenir une boucle perpétuelle (2026-05-30, commit `701addd`)

**Régression du Plan A, exactement le risque flaggé §181.** Le safety net (Login.jsx) refuse de router tant que `rolesLoaded === false`. Sur une **session zombie** (refresh_token → `400`, JWT mort), `rsa_my_roles` renvoie une **401 à chaque appel** → `rolesLoaded` ne passe JAMAIS à `true` → spinner « Vérification de vos accès… » **perpétuel**, sans formulaire SSO ni bouton de sortie. Confirmé par les logs auth (`POST | 400 | /auth/v1/token?grant_type=refresh_token`) ; côté DB tout était sain (rôles présents, `rsa_my_roles` OK).

Deux défauts combinés :
1. **Retry avalé par le single-flight sur SSO.** Le retry ciblé `rsa_my_roles` n'était programmé que par l'IIFE init. Sur SSO, `getSession` (IIFE) et l'événement `SIGNED_IN` lancent deux `loadIdentity` concurrents ; le single-flight (commit `c7eff0c`) n'en exécute qu'un, l'autre caller reçoit `undefined`. Si `SIGNED_IN` gagnait le lock, l'IIFE recevait `undefined` → **aucun retry programmé**, et le chemin `onAuthStateChange` n'en programmait aucun.
2. **Aucune sortie de secours.** Le `ForceLogoutLink` (F10, conçu pile pour les sessions zombies) ne vit que dans le formulaire de login — inatteignable tant que le safety net tient.

**Fix (`701addd`) :**
- `src/lib/platform/authErrors.js` (nouveau, pur, testé — `auth.isAuthError.test.js`, 11 cas) : `isAuthError()` distingue une **401/JWT-error définitive** (PGRST301, message « JWT expired »…) d'un **timeout transitoire** (notre sentinelle `withTimeout` — surtout pas à confondre).
- `auth.jsx` : `loadIdentityImpl` retourne `rolesAuthError`. Logique retry/recovery centralisée dans `handleLoadResult`, appelée par **l'IIFE ET `onAuthStateChange(SIGNED_IN)`** (ferme le trou §1). Recovery session zombie : si `rolesAuthError && !anySuccess` (JWT rejeté ET aucune RPC réussie = token globalement mort), `signOut({scope:'local'})` → `SIGNED_OUT` → form de login. Retry inutile sur un token mort.
- `Login.jsx` : **escape hatch ultime** indépendant de toute détection — après `SAFETY_NET_ESCAPE_MS` (6s) dans le safety net, on révèle `ForceLogoutLink`. Filet de sécurité quelle que soit la cause.

**Garde-fou anti-régression :** la recovery ne fire QUE sur `rolesAuthError && !anySuccess` — un timeout (faux positif réseau froid, cf. fix 2026-05-29) n'est jamais classé auth-error, donc ne déclenche jamais de signOut. On ne réintroduit pas l'éjection des sessions valides.

---

## 11. VRAIE cause-racine — `withTimeout` crashait sur le thenable PostgREST (2026-05-30, commit `9c5a3e5`)

**Mea culpa : le Plan A.2 (§10) traitait une fausse piste.** Le diagnostic « session morte » reposait sur les logs serveur (un `refresh_token 400`) + une console PARTIELLE. La console COMPLÈTE a révélé l'erreur réelle :

```
[PlatformAuth] onAuthStateChange failed: TypeError: X.catch is not a function
[PlatformAuth] init failed (tokens preserved): TypeError: X.catch is not a function
```

**Cause :** `withTimeout` (ajouté au single-flight le 2026-06-04) faisait `promise.catch(() => {})` sur le résultat de `supabase.from(...).maybeSingle()` / `supabase.rpc(...)`. Or **les query builders PostgREST sont des _thenables_ (ils ont `.then`) mais PAS de vraies Promises — ils n'ont ni `.catch` ni `.finally`**. La ligne jetait donc `TypeError: catch is not a function` SYNCHRONEMENT, à la première des 4 requêtes → `loadIdentityImpl` throw AVANT le moindre appel réseau → `loadIdentity` throw → capturé par le try/catch de l'IIFE et de `onAuthStateChange`. Conséquence : `setRoles`/`setRolesLoaded(true)` jamais atteints → `rolesLoaded` éternellement `false` → safety-net spinner perpétuel.

**Indice sous-exploité §2 :** il n'y avait AUCUN appel `rsa_my_roles` dans les logs API serveur. C'était cohérent — `loadIdentity` crashait avant d'émettre la moindre requête. Cet indice aurait dû primer sur le `refresh_token 400` (événement antérieur, sans rapport).

**Fix (`9c5a3e5`) :** `src/lib/platform/promiseTimeout.js` (pur, testé — `promiseTimeout.test.js`, 5 cas dont la régression « thenable sans `.catch` »). `withTimeout` normalise d'abord : `const normalized = Promise.resolve(promise)` (adopte le thenable, exécution unique) PUIS `normalized.catch(() => {})` + `Promise.race`. `auth.jsx` importe ce helper et supprime la version inline cassée.

**Statut des fixes §10 (Plan A.2) :** conservés — ils restent corrects et utiles en défense en profondeur (escape hatch `ForceLogoutLink` après 6s ; retry centralisé `handleLoadResult` piloté aussi par `onAuthStateChange`/SSO ; recovery sur vraie 401). Ils ne suffisaient simplement pas, car la cause réelle était en amont (`loadIdentity` ne s'exécutait jamais).

**Leçon (systematic-debugging) :** ne pas proposer de fix sur une console partielle. La console COMPLÈTE (avec la stack `X.catch is not a function`) pointait directement la ligne. Exiger l'erreur exacte AVANT toute hypothèse.

---

## 9. Liens

- Protocole : [/DEEP_SOLVE.md](../../DEEP_SOLVE.md)
- Fixes antérieurs : [auth-rights-stability.md](./auth-rights-stability.md), [login-audit-v4.md](../hardening/login-audit-v4.md)
- Code à modifier : [src/lib/platform/auth.jsx](../../src/lib/platform/auth.jsx), [src/pages/Login.jsx](../../src/pages/Login.jsx)
- RPC source de vérité : `public.rsa_my_roles()` (Supabase, project `uaoucznptxmvhhytapso`)
