# DEEPSOLVE — Stabilité auth + précision des droits (plateforme RSA)

**Auteur :** Claude
**Date :** 2026-05-29
**Statut :** fixes appliqués (commit séparé) — observations restantes documentées en §6
**Décide :** Mathieu

---

## 0. TL;DR

Symptômes utilisateur récurrents : **« on me kick », « je perds mes droits », « j'arrive en Forbidden alors que je suis master_admin », « le spinner reste perpétuel »**. La cause n'est PAS un seul bug : c'est une cascade de 4 fragilités enchaînées dans `auth.jsx` + `Admin.jsx`. Le commit `036762e` du 2026-06-05 a déjà supprimé la pire (kick sur `TOKEN_REFRESHED`), mais 3 autres restaient :

1. **`loadIdentity` non-idempotent** — toute query timeout reset les rôles à `[]`. → user master_admin tombe Forbidden au moindre cold-start.
2. **Pas de distinction "en train de charger l'identité" vs "chargé sans rôles"** — `Admin.jsx` renvoyait Forbidden dès `authLoading=false`, même si le watchdog 10s avait fire prématurément.
3. **Pas d'auto-retry sur outage complet** — si toutes les 4 RPC échouent (vrai outage Supabase 30s), l'user reste bloqué jusqu'au refresh manuel.

Côté **droits accuracy** : la matrice serveur (RLS + helpers `is_*`) est saine. Le seul vrai bug d'UX était que le pilotage step 3 "club admins assigné" restait TODO pour les éditions pilotées par un master_admin/competition_admin global, car il vérifiait uniquement `club_memberships`. Fixé.

Côté **profiles RLS** : la migration `20260601_rsa_v3_profiles_lockdown.sql` est bien appliquée en prod (vérifié via `pg_class.relrowsecurity = true`). La colonne `profiles.role` reste écrite par `authenticated` mais elle n'alimente AUCUN gate (les gates lisent `app_user_roles` via `has_platform_role`). Vestige inoffensif.

---

## 1. Symptômes observés (issue tracker informel)

| Symptôme | Fréquence | Sévérité |
|---|---|---|
| Master_admin → `/Admin` Forbidden après 30-50 min d'inactivité | quotidien | P0 |
| Spinner `/Admin` infini au cold-start mobile | hebdo | P0 |
| Step 3 pilotage "club admins" reste TODO malgré assignations | persistant | P1 |
| Toggle persona scope → Master invisible / casse l'URL | occasionnel | P2 |
| Magic-link arrive sur preview Vercel au lieu d'app.rotary-startup.org | rare (env mal set) | P1 |

---

## 2. Architecture actuelle

```
┌────────────────────────── App (App.jsx) ────────────────────────────┐
│                                                                      │
│   isPlatformHost(host) ──── true ──► PlatformAuthProvider seul       │
│                          └─ false ──► AuthContext legacy + Platform  │
│                                                                      │
│   PlatformAuthProvider (auth.jsx)                                    │
│   ├── IIFE init :                                                    │
│   │     1. getSession() [timeout 8s, watchdog 10s]                   │
│   │     2. setAuthUser(session.user)                                 │
│   │     3. loadIdentity(email) ──► 4 RPC parallèles :                │
│   │           - profiles                                             │
│   │           - rsa_my_roles            (SECURITY DEFINER)           │
│   │           - my_club_memberships     (SECURITY DEFINER)           │
│   │           - my_competition_admin_editions (SECURITY DEFINER)     │
│   │     4. setLoading(false)                                         │
│   │                                                                  │
│   └── onAuthStateChange :                                            │
│         SIGNED_IN / USER_UPDATED   ─► loadIdentity                   │
│         TOKEN_REFRESHED / INITIAL_SESSION ─► SKIP (fix 036762e)      │
│         SIGNED_OUT ─► clear tout                                     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Gates UI :**
- `Admin.jsx` : `authLoading` → spinner ; sinon `isAuthenticated` → Login redirect ; sinon rôle check (master / club_admin / legacy admin) → Forbidden si rien.
- Persona scope : `?scope=master|competition:X|club:X` filtré contre `scopeOptions` côté client. Master peut tout simuler. Non-master limité à ses propres clubs.

**RLS serveur (résumé, audit complet dans `rls-audit-v3.md`) :**

| Table | RLS | Read | Write |
|---|---|---|---|
| `app_user_roles` | ✅ ON | self-read email match | service_role + RPC `rsa_assign_role` |
| `club_memberships` | ✅ ON | self + club_admin + master | RPC `rsa_assign_club_role` / `rsa_revoke_club_role` |
| `competition_admins` | ✅ ON | self + master + comp_admin de l'édition | RPC `rsa_grant_competition_admin` / `_revoke_` |
| `profiles` | ✅ ON | self + master/admin/comite | self_update (colonne `role` vestigial) |
| `clubs` | ✅ ON | public + staff branches | master + RPC |
| `editions` | ✅ ON | public non-draft + admin | admin RPC |
| `startups` | ✅ ON | owner + staff | owner + staff + triggers |

**Verdict :** la matrice serveur est solide. Les problèmes étaient côté client uniquement.

---

## 3. Root causes identifiées

### RC1 — `loadIdentity` non-idempotent (P0 — cause principale du kickout)

**Fichier :** [`src/lib/platform/auth.jsx:144-149`](../../src/lib/platform/auth.jsx)

**Code avant :**
```js
setProfile(profRes?.data ?? null);
setRoles(Array.isArray(rolesRes?.data) ? rolesRes.data : []);
setClubMemberships(Array.isArray(cmRes?.data) ? cmRes.data : []);
setCompetitionAdminEditions(Array.isArray(caRes?.data) ? caRes.data.map((v) => String(v)) : []);
```

**Problème :** chaque appel à `loadIdentity` ÉCRASE l'état avec `[]` si la RPC a renvoyé une erreur (timeout, network, RPC down). Conséquence :
- T+0 : user logge → `roles=['master_admin']` chargé OK.
- T+30min : `TOKEN_REFRESHED` (fixé par 036762e, ignore loadIdentity).
- T+~1h : un SIGNED_IN re-fire (refresh manuel ou onglet caché qui rouvre), RPC `rsa_my_roles` timeout 8s sur cold-start → **`setRoles([])`** → next render `/Admin` voit `isMasterAdmin=false` → Forbidden.

### RC2 — Pas de flag "identityLoaded" (P0 — Forbidden flash)

**Problème :** `loading=false` signifie "init terminé" mais pas "identité chargée". Si le **watchdog 10s** fire alors que `loadIdentity` est encore en vol sur un réseau lent, on a `loading=false ∧ roles=[]` → Admin.jsx montre Forbidden flash → user pense que ses droits sont cassés.

### RC3 — Pas de retry sur outage complet (P1)

Si les 4 RPC échouent simultanément (vrai outage backend 30s+), l'utilisateur restait bloqué. Aucun mécanisme de relance en arrière-plan.

### RC4 — Pilotage step 3 (P1 — confusion droits)

**Fichier :** [`src/components/rsa/admin/platform/master/usePilotageStatus.js:126-128`](../../src/components/rsa/admin/platform/master/usePilotageStatus.js)

`step3.missingClubs` cherchait des `club_admin` dans `club_memberships`. Une édition pilotée en central par un master_admin (qui peut TOUT) ou un competition_admin (qui peut tout sur SES clubs) gardait step 3 en TODO pour toujours → l'admin pense qu'il "manque quelqu'un".

### RC5 — Persona scope bypass (P2 — accuracy mais non-bloquant)

Master_admin peut taper `?scope=competition:closed-edition` → fallback `effectiveScope` gère bien. Pour non-master, `scopeOptions` filtre. Ceinture/bretelles. RLS bloque les queries du serveur silencieusement si l'user simule au-delà de ses droits — symptôme : page vide plutôt que Forbidden. **Acceptable** car le serveur reste l'autorité.

---

## 4. Fixes appliqués (commit en cours)

### Fix 1 — `loadIdentity` idempotent
[`auth.jsx:147-178`](../../src/lib/platform/auth.jsx) — chaque setter est wrappé : `if (xxxRes?.error) preserve previous else setState(data)`. Un timeout ne reset PLUS l'état. Le serveur reste l'autorité finale (au query suivant RLS bloque si vraiment plus de droits).

### Fix 2 — `identityLoaded` flag exposé
[`auth.jsx`](../../src/lib/platform/auth.jsx) — nouveau state `identityLoaded` (false → true après 1er succès partiel d'au moins 1 RPC ou si user pas authentifié).

### Fix 3 — `Admin.jsx` gate sur `identityLoaded`
[`Admin.jsx:135-150`](../../src/pages/Admin.jsx) — avant de trancher sur Forbidden, on attend `identityLoaded=true`. Si le watchdog fire avant la fin des RPC, on garde un spinner. Plus de Forbidden flash.

### Fix 4 — Auto-retry sur full outage
[`auth.jsx:286-292`](../../src/lib/platform/auth.jsx) — si les 4 RPC ont toutes échoué (vrai outage), on programme 2 retries (T+3s et T+8s) en arrière-plan. L'utilisateur n'a plus besoin de F5.

### Fix 5 — Pilotage step 3 fallback (commit précédent `e2ccc4d`)
[`usePilotageStatus.js:116-132`](../../src/components/rsa/admin/platform/master/usePilotageStatus.js) — si un master_admin ou un competition_admin de l'édition est connecté, tous les clubs sont considérés "couverts". Step 3 = done.

### Fix 6 — `rsa_assign_role` accepte master_admin (commit `12ee500`)
Migration `20260603_rsa_v3_assign_role_master_admin.sql` — étend l'allowlist + protège le dernier global_admin.

---

## 5. Vérifications post-fix recommandées

1. **Smoke test session longue (P0)** : login master_admin → laisser onglet ouvert 2h → revenir sur `/Admin` → doit afficher MasterCockpit, pas Forbidden. Console doit montrer `onAuthStateChange skipping loadIdentity for TOKEN_REFRESHED`.

2. **Smoke test cold-start mobile (P0)** : sur smartphone, ouvrir app.rotary-startup.org/Admin depuis tab fermée 24h. Soit succès direct, soit spinner > Forbidden (jamais Forbidden flash). Console : `[PlatformAuth] init watchdog fired` toléré 1× max.

3. **Smoke test outage simulé (P1)** : DevTools → Network → Offline → recharger /Admin. Doit afficher spinner. Repasser Online. Doit charger identité dans les 8s (via retry T+3s) sans F5.

4. **Smoke test step 3 pilotage (P1)** : ouvrir une compétition avec 0 club_admin local mais un master_admin connecté → step 3 doit afficher "Done".

5. **Audit DB (annuel)** :
   ```sql
   SELECT relrowsecurity FROM pg_class WHERE relname IN ('profiles','app_user_roles','club_memberships','competition_admins','startups','selection_reviews');
   ```
   Tous doivent être `true`.

---

## 6. Travail restant (P2/P3, non bloquant)

- **`profiles.role` writable par authenticated** — vestigial mais cosmétique. Migration future : `REVOKE UPDATE (role) ON profiles FROM authenticated, anon` + drop column si confirmé inutilisé.
- **Persona scope validation côté serveur** — ajouter RPC `is_scope_valid_for_user(scope text)` pour que l'UI puisse refuser un scope invalide *avant* d'envoyer des queries qui retourneront du vide.
- **Sentry alert sur `identityLoaded=false` persistant > 30s** — pour détecter en prod les outages réels.
- **Test Playwright "session resilience"** — simuler 5 cycles `TOKEN_REFRESHED` + 1 outage de 10s, vérifier qu'aucun Forbidden n'apparaît.
- **`AuthContext` legacy retirable** — quand l'app déjeuners sera extraite (cf. deepsolve `deploy-and-lunch-app-isolation.md`), on supprime tout le legacy auth path et on simplifie `App.jsx`.

---

## 7. Lignes directrices pour l'avenir

Toute logique de gate côté client doit respecter ces invariants :

1. **Pas de Forbidden tant que l'identité n'a pas été chargée au moins une fois** — utiliser `identityLoaded`.
2. **Préserver l'état précédent** sur erreur transitoire — ne pas reset à `[]` au moindre timeout.
3. **Serveur = source de vérité** — le client peut afficher "trop" optimistement, la RLS bloque les vraies opérations interdites.
4. **Pas de wipe destructif** (localStorage clear, signOut local) sur timeout — préserver les tokens, laisser le user retenter naturellement.
5. **Toujours logger** quel événement supabase auth a déclenché un re-chargement (`onAuthStateChange { event }`) pour pouvoir diagnostiquer les kick inattendus en prod.

---

**Fin du document.**
