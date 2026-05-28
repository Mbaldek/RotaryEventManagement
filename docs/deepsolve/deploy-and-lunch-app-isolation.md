# DEEPSOLVE — Déploiement RSA + isolation de l'app déjeuners

**Auteur :** agent DEEPSOLVE
**Date :** 2026-05-28
**Statut :** propositions — aucune action n'a été exécutée (lecture seule)
**Décide :** Mathieu (Rotary Club de Paris)

---

## 0. TL;DR

- **Aujourd'hui** : un seul repo, un seul build React, un seul projet Vercel, un seul projet Supabase hébergent à la fois l'app **déjeuners statutaires** (legacy) et la **plateforme RSA** (en cours). Le « root-gate » ajouté dans `src/App.jsx:21-22` redirige *uniquement* `/` vers `/Login` sur `app.rotary-startup.org` — toutes les autres routes déjeuners (`/Dashboard`, `/TableView`, `/Reservations`…) restent accessibles à quelqu'un qui tape l'URL directement. Fuite confirmée.
- **Recommandation** : plan en **2 étages**.
  - **Étage 1 (immédiat, S) — Option A** : étendre le root-gate en un *full host-gate* React qui bloque toutes les routes déjeuners sur l'hôte plateforme, et symétriquement les routes RSA sur les hôtes legacy/dev. Coût : ~1h de code, 0 risque infra, parfaitement réversible.
  - **Étage 2 (après stabilisation RSA, L) — Option C** : extraire l'app déjeuners dans son propre repo + projet Vercel. C'est la vraie isolation, mais à différer une fois que la plateforme RSA tourne en prod et que l'on a au moins une semaine de recul.
- **Supabase** : **on garde le projet partagé** (`uaoucznptxmvhhytapso`). Les tables déjeuners n'évoluent plus, les tables RSA sont nommées distinctement (`startups`, `app_user_roles`, `editions`, `sessions`, `selection_reviews`…). Aucun bénéfice à séparer aujourd'hui.

---

## 1. État actuel — diagramme + faits

### 1.1 Schéma logique

```
                          ┌──────────────────────────────────┐
                          │  Repo git RotaryEventManagement  │
                          │  (branche main = source unique)  │
                          └────────────────┬─────────────────┘
                                           │ git push main
                                           ▼
                          ┌──────────────────────────────────┐
                          │  Projet Vercel (1 seul)          │
                          │  - build: `vite build`           │
                          │  - 1 bundle React SPA            │
                          │  - api/cron/backup-rsa (serverless)
                          └────────────────┬─────────────────┘
                                           │ même artefact servi
                ┌──────────────────────────┼──────────────────────────┐
                ▼                          ▼                          ▼
   app.rotary-startup.org      <legacy>.vercel.app           localhost:5173
   (cible plateforme RSA)      (URL héritée déjeuners)       (dev)
                │                          │                          │
                │  root-gate: /  → /Login  │                          │
                │  /Dashboard FUITE         │  /Login FUITE inverse   │
                │  /TableView FUITE         │  /MonDossier FUITE inv. │
                └──────────────────────────┴──────────────────────────┘
                                           │
                                           ▼
                          ┌──────────────────────────────────┐
                          │  Supabase uaoucznptxmvhhytapso   │
                          │  (1 seul projet partagé)         │
                          │  - tables déjeuners :            │
                          │      restaurant_tables, seats,   │
                          │      reservations, chat_messages,│
                          │      global_settings, event_*…   │
                          │  - tables RSA legacy 2026 :      │
                          │      jury_profiles, jury_scores, │
                          │      session_config, startup_*…  │
                          │  - tables plateforme RSA :       │
                          │      app_user_roles, editions,   │
                          │      sessions, startups,         │
                          │      selection_reviews           │
                          │  - profiles (commune, "Allow all"│
                          │    RLS — ne PAS y stocker droits)│
                          └──────────────────────────────────┘
```

### 1.2 Faits cités

- **Un seul `<Router>`** dans `src/App.jsx:87` enveloppe tous les routes — déjeuners ET RSA.
- **Auto-registration** des pages dans `src/pages.config.js:79-106` : 26 pages déclarées (déjeuners + RSA legacy + plateforme), toutes montées en `/<NomDePage>` par le `.map` de `src/App.jsx:63-73`.
- **Root-gate hôte** : `src/App.jsx:21-22` détecte `window.location.hostname.startsWith('app.rotary-startup')`, et `src/App.jsx:54-62` redirige `/` → `/Login` *seulement pour la racine*. Toutes les autres routes restent ouvertes sur tous les hôtes.
- **`Layout` standalone-set** : `src/Layout.jsx:9` liste 15 pages affichées sans chrome déjeuners (`Login`, `MonDossier`, `Selection`, `RsaJuryHub`, etc.). Cela évite la nav rotary sur les pages plateforme, mais n'empêche pas le rendu : les routes restent atteignables.
- **Providers globaux** (`src/App.jsx:83-96`) : `AuthProvider` (déjeuners), `PlatformAuthProvider` (RSA), `LanguageProvider`, `QueryClientProvider` — partagés par les deux apps, ce qui simplifie la cohabitation mais alourdit le bundle déjeuners avec du code RSA et vice-versa.
- **`vercel.json`** existe (racine repo) : déclare le cron RSA (`/api/cron/backup-rsa`, 03h00 Paris), un rewrite SPA `/((?!api/).*) → /index.html` et des en-têtes CSP. Donc Vercel est déjà câblé sur ce repo.
- **`src/lib/supabase.js`** : client unique, lit `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` depuis `import.meta.env`. Partagé par tout le code (déjeuners et RSA).
- **`src/lib/platform/auth.jsx:25`** : redirect magic link via `VITE_APP_URL || window.location.origin`. Si `VITE_APP_URL` n'est pas défini sur Vercel, les magic links pointeront sur l'origine d'où la demande a été émise — ok pour `app.rotary-startup.org`, mais à surveiller.

### 1.3 Pages déjeuners qui « fuient » sur le host plateforme

Liste exhaustive (extrait `src/pages.config.js`) — toutes accessibles aujourd'hui en tapant `https://app.rotary-startup.org/<Nom>` :

| Page | Route | Statut sur plateforme |
|---|---|---|
| `Index` | `/Index` | fuite (root est déjà geré, mais `/Index` direct passe) |
| `Dashboard` | `/Dashboard` | **fuite** |
| `TableView` | `/TableView` | **fuite** |
| `TableViewMockup` | `/TableViewMockup` | **fuite** |
| `Reservations` | `/Reservations` | **fuite** |
| `ReservationRequest` | `/ReservationRequest` | **fuite** |
| `EventPlanning` | `/EventPlanning` | **fuite** |
| `FloorPlan` | `/FloorPlan` | **fuite** |
| `Archives` | `/Archives` | **fuite** |
| `AdminControl` | `/AdminControl` | **fuite** (lien dans la nav déjeuners, mais qui pourrait pointer ici en cas d'erreur) |
| `UserManagement` | `/UserManagement` | **fuite** |
| `Features` | `/Features` | **fuite** |

Et symétriquement, sur l'URL legacy déjeuners, toutes les pages RSA (`/Login`, `/MonDossier`, `/Selection`, `/RsaJuryHub`, …) sont accessibles aussi — moins grave puisque l'URL legacy n'est pas communiquée publiquement, mais cela peut polluer la mémoire des navigateurs et l'historique SEO.

---

## 2. Les deux questions indépendantes

Les deux problèmes sont **orthogonaux** — il faut les traiter séparément :

### 2.a — DÉPLOIEMENT : « Comment je pousse en prod le travail RSA en cours ? »

- Le repo est déjà branché à Vercel. **Tout push sur `main` redéploye `app.rotary-startup.org`**. C'est probablement pour ça que la prod sert encore l'ancien build : aucun push récent n'a recompilé (à confirmer : voir Vercel dashboard → Deployments → date du dernier prod deploy).
- **Risque** : le code RSA en cours n'a JAMAIS tourné en prod. On a 17 fichiers modifiés/ajoutés (cf. `git status`). Pousser sur `main` = déploy direct = pas de filet.
- **Alternatives** :
  1. **PR + preview branch** : `git checkout -b rsa/platform-launch` + push → Vercel crée une URL preview `https://<branch>-<hash>.vercel.app`. On teste *avec les vraies données Supabase de prod*, mais sur une URL séparée. On merge sur `main` quand on est confiant.
  2. **`vercel --prod` ciblé** depuis local : pousse l'état courant en prod sans passer par git. Évite de polluer l'historique main si on doit reverter. Demande la CLI Vercel installée et login.
  3. **Direct push `main`** : simple, mais aucune session de validation entre `git push` et `app.rotary-startup.org` qui sert le nouveau code. À ne faire QUE si la PR preview a été validée.
- **Rollback** : Vercel garde l'historique des deployments. Dashboard → Deployments → ancien deploy → menu `...` → **Promote to Production**. Effectif en < 30s, zéro modification git nécessaire. C'est le vrai filet de sécurité.
- **À faire AVANT le premier deploy prod** (checklist en §5).

### 2.b — ISOLATION : « Comment je sépare proprement l'app déjeuners de la plateforme RSA ? »

Quatre options analysées en §3. La fuite actuelle est cosmétique mais réelle : un visiteur de la plateforme RSA peut bidouiller l'URL et tomber sur le dashboard déjeuners (qui demande probablement un login, mais c'est du code mort sur le mauvais domaine).

---

## 3. Options d'isolation — analyse comparée

### Option A — Host-gate React étendu (filtre au niveau routeur)

**Idée :** garder un seul repo et un seul bundle, mais étendre le code de `src/App.jsx` pour que :

- sur `app.rotary-startup.org`, seules les routes RSA soient montées (les autres rendent `<PageNotFound />` ou redirigent vers `/Login`),
- sur les autres hôtes (legacy `.vercel.app`, `localhost`), c'est l'inverse.

**Implémentation concrète :**

```js
// Dans src/App.jsx (pseudo-code) :
const LUNCH_PAGES = new Set([
  'Index','Dashboard','TableView','TableViewMockup','Reservations',
  'ReservationRequest','EventPlanning','FloorPlan','Archives',
  'AdminControl','UserManagement','Features'
]);
const RSA_PAGES = new Set([
  'Login','MonDossier','Selection',
  'RsaScore','RsaDashboard','RsaJuryForm','RsaJuryHub','RsaJuryView',
  'RsaAdmin','RsaRecap','RsaFinaleResults','RsaFinaleRsvp',
  'RsaPrintSheets','StartupUpload'
]);

const allowed = (path) => isPlatformHost()
  ? RSA_PAGES.has(path)
  : LUNCH_PAGES.has(path) || RSA_PAGES.has(path); // legacy host garde tout

// Dans le .map des routes :
{Object.entries(Pages).filter(([path]) => allowed(path)).map(...)}
```

- **Pros** : ~1 fichier touché, ~30 lignes, complètement réversible (revert d'un commit). Pas de changement d'infra, pas de DNS, pas de Vercel à reconfigurer. Ferme la fuite immédiatement.
- **Cons** : pas une « vraie » séparation — le bundle reste mixte (les pages déjeuners sont téléchargées par le navigateur même si elles ne s'affichent pas). Pas de gain de poids. Si quelqu'un modifie le routeur sans relire ces sets, la protection saute.
- **Effort** : S (< 1h).
- **Risque** : faible. Effet de bord possible : si une route plateforme oublie d'être ajoutée à `RSA_PAGES`, elle disparaît silencieusement de prod. → mitigation : test manuel des routes RSA après deploy.
- **Rollback** : `git revert <sha>` + push.
- **Responsabilités utilisateur** : aucune — tout en code.

### Option B — Vercel rewrites/redirects via `vercel.json`

**Idée :** au niveau edge Vercel, déclarer des `redirects` host-aware pour les paths déjeuners sur l'hôte plateforme, et vice-versa.

**Réalité technique :** Vercel `redirects`/`rewrites` supportent `has` avec `type: 'host'`. Donc on peut écrire :

```json
{
  "redirects": [
    {
      "source": "/Dashboard",
      "has": [{"type":"host","value":"app.rotary-startup.org"}],
      "destination": "/Login",
      "permanent": false
    },
    // ... × 12 routes déjeuners
  ]
}
```

- **Pros** : agit à l'edge avant même que React ne charge, donc pas de flash de la mauvaise page. Déclaratif.
- **Cons** : très verbeux (1 entrée par route × 2 hôtes = ~24 entrées). Difficile à tester en local (le host est `localhost`, donc les rules ne matchent pas — il faut deploy preview ou bidouiller `/etc/hosts`). Doit être maintenu en parallèle de `pages.config.js`. Ne couvre PAS les sous-routes dynamiques (mais on n'en a pas vraiment côté déjeuners).
- **Effort** : S/M (1-2h, dont la partie « tester sans casser » qui est pénible).
- **Risque** : moyen. Une faute de frappe dans `vercel.json` peut casser le rewrite SPA existant qui sert `/index.html` (ligne 9-13 de `vercel.json` actuel — fragile à éditer).
- **Rollback** : revert du commit `vercel.json` + push. Effet sur le prochain deploy.
- **Responsabilités utilisateur** : aucune.

### Option C — Extraction full de l'app déjeuners (nouveau repo + nouveau projet Vercel)

**Idée :** déménager les pages déjeuners + leur Layout + leur AuthContext + leur lib dépendante dans un repo `rotary-lunch` autonome, avec son propre Vercel. Le repo actuel devient *uniquement* RSA. Supabase reste partagé.

**Steps de migration (proposition) :**

1. Créer un nouveau repo `rotary-lunch` (privé, GitHub).
2. Copier en bloc : `src/pages/{Index,Dashboard,TableView,TableViewMockup,Reservations,ReservationRequest,EventPlanning,FloorPlan,Archives,AdminControl,UserManagement,Features}.jsx`, `src/Layout.jsx` (dans sa version pré-standalone-set, sans la branche RSA), `src/lib/{supabase,AuthContext,db,query-client,utils,NavigationTracker,PageNotFound}.js[x]`, `src/components/{admin,calendar,dashboard,feedback,notifications,reservations,table,ui}/**`, `src/hooks/**`, `index.html`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `components.json`, `jsconfig.json`, `eslint.config.js`, `package.json` (épuré).
3. Régénérer `pages.config.js` avec uniquement les pages déjeuners (le commentaire en tête `src/pages.config.js:1-8` indique qu'il est auto-généré → re-run du générateur dans le nouveau repo).
4. Nettoyer `package.json` : retirer les deps RSA-only (`@stripe/*`, `qrcode.react`, `react-leaflet`, `three`, `jspdf`, `html2canvas`, etc. — auditer ce qui est réellement utilisé côté déjeuners).
5. Créer un projet Vercel `rotary-lunch`, brancher au nouveau repo, configurer `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (mêmes valeurs que l'actuel).
6. Choisir un domaine pour l'app déjeuners (cf. annexe §8 — décision à prendre).
7. Tester l'app déjeuners isolée : login, dashboard, réservations, planning.
8. Dans le repo actuel : supprimer les pages déjeuners et leurs dépendances, ne garder que RSA. Le repo actuel devient propre.
9. Repointer DNS si l'app déjeuners a un domaine custom existant.

**Ce qui casse pendant la migration :**

- Pendant le temps où l'extraction est en cours (branche, pas mergée), rien n'est cassé en prod (l'ancien build continue de servir tout).
- Au moment du switch DNS / suppression du code dans le repo principal, la fenêtre où l'app déjeuners pourrait ne pas être accessible doit être courte (< 1h, idéalement de nuit).
- Les utilisateurs déjeuners doivent recevoir la nouvelle URL.

**Pros :** isolation réelle. Builds indépendants, deps indépendantes, deploys indépendants, plus aucune fuite possible. Maintenance future de RSA plus simple.
**Cons :** effort important. Risque de casser silencieusement quelque chose si une dépendance partagée est oubliée. Demande à Mathieu de prendre une décision sur le futur URL de l'app déjeuners.
**Effort :** L (1-2 jours de travail concentré + 1 journée de validation).
**Risque :** moyen-élevé pendant la migration ; faible après.
**Rollback :** garder la branche du repo actuel intacte jusqu'à validation complète du nouveau repo. Si désastre, on revient à l'état précédent (le repo actuel sert toujours).
**Responsabilités utilisateur :** créer le repo, le projet Vercel, choisir le domaine, valider l'app extraite.

### Option D — Monorepo avec entries Vite séparées (`apps/lunch` + `apps/rsa` + `packages/shared`)

**Idée :** un seul repo, mais deux builds Vite distincts (`apps/lunch/vite.config.js` et `apps/rsa/vite.config.js`), deux projets Vercel pointés respectivement sur `apps/lunch/dist` et `apps/rsa/dist`, et un dossier `packages/shared` pour le code commun (Supabase client, UI primitives, etc.).

**Pros :** isolation au build, infrastructure git/CI partagée, partage facile du code commun, déploys séparés.
**Cons :** complexité de setup (workspaces npm/pnpm, configuration Vercel pour pointer sur un sous-dossier, scripts de build/CI à adapter). Ré-arranger 26 pages + lib + components est aussi lourd que C. Vercel doit être configuré avec « Root Directory » par projet, ce qui n'est pas trivial sur un repo qui n'utilisait pas ce schéma.
**Effort :** L+ (équivalent à C, plus la couche workspaces).
**Risque :** moyen. La maintenance future est plus simple qu'une duplication, mais le setup initial peut faire perdre du temps.
**Rollback :** restructurer en arrière demande du travail.
**Responsabilités utilisateur :** créer le 2e projet Vercel, le configurer correctement (Root Directory).

**Verdict :** D n'apporte pas grand-chose de plus que C, pour plus de complexité. À écarter sauf si on prévoit d'autres apps Rotary à venir et qu'on veut un monorepo « hub ».

---

## 4. Recommandation

**Plan en 2 étages.**

### Étage 1 — Tout de suite : appliquer l'Option A

**Pourquoi :** ferme la fuite visible en quelques lignes, sans toucher à l'infra. Permet de pousser RSA en prod sans honte (`app.rotary-startup.org/Dashboard` ne renverra plus le dashboard déjeuners). Réversible en un revert.

Code à écrire (proposé en §3.A) : un seul fichier (`src/App.jsx`), deux `Set` (`LUNCH_PAGES` / `RSA_PAGES`), un filtre dans le `.map` des routes, et le root-gate existant qui reste comme il est.

### Étage 2 — Plus tard (après validation prod RSA) : migrer vers l'Option C

**Quand :** après au moins une semaine de prod RSA stable (pas de bug critique, magic links fonctionnent, jurys peuvent se connecter, candidats peuvent uploader). Idéalement après le premier vrai cycle 2027 lancé.

**Pourquoi pas tout de suite :** l'extraction prend 1-2 jours et déstabiliserait le repo en même temps que la mise en prod RSA. Trop de risques cumulés. L'Option A nous achète le temps de faire ça proprement.

**Pourquoi pas l'Option B :** moins flexible, plus difficile à tester. L'Option A fait le même job en code React, qu'on contrôle mieux.

**Pourquoi pas l'Option D :** complexité injustifiée tant qu'on n'a que 2 apps.

---

## 5. Deploy playbook — premier passage en prod RSA

### 5.1 Pré-checks (à faire AVANT `git push`)

| # | Check | Comment vérifier |
|---|---|---|
| 1 | Migrations Supabase appliquées | `supabase/migrations/20260527_rsa_platform_foundation.sql` et `20260527_rsa_platform_roles_hardening.sql` existent dans `supabase/migrations/`. Vérifier via Supabase Dashboard → Database → Migrations qu'elles sont appliquées en prod. |
| 2 | Magic link Auth activé | Supabase Dashboard → Authentication → Providers → **Email** : `Enable Email provider` ON, `Confirm email` ON. |
| 3 | Redirect URLs ajoutées | Supabase Dashboard → Authentication → URL Configuration → **Site URL** = `https://app.rotary-startup.org`. **Redirect URLs** doit contenir : `https://app.rotary-startup.org/**`, `http://localhost:5173/**` (dev), et la legacy `.vercel.app` si on l'utilise encore en preview. |
| 4 | Env vars Vercel | Dashboard Vercel → Project → Settings → Environment Variables, vérifier (Production scope) : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`. Optionnel : `VITE_APP_URL=https://app.rotary-startup.org` pour forcer le redirect des magic links. |
| 5 | Rôles plateforme provisionnés | Au moins 1 admin dans `app_user_roles` : `INSERT INTO app_user_roles (email, roles) VALUES ('mathieubal@gmail.com', '{admin}');` (via service_role dans Supabase SQL Editor). Sinon personne ne pourra accéder à l'admin RSA. |
| 6 | Bucket `uploads` revu | Cf. `docs/hardening/foundation-auth-rls-review.md` (criticals C2/C3 mentionnés en mémoire). À traiter avant d'exposer le formulaire candidat. |
| 7 | Lint OK | `npm run lint` propre. |
| 8 | Build OK en local | `npm run build` réussit sans warning bloquant. |
| 9 | Option A appliquée | Vérifier que les routes déjeuners ne sont plus accessibles sur le host plateforme (test local en bidouillant le hostname dans devtools, OU sur la preview Vercel). |

### 5.2 Deploy via PR + preview (recommandé)

```bash
git checkout -b rsa/platform-launch
git add src/App.jsx src/Layout.jsx src/pages.config.js \
        src/components/design src/components/rsa/candidature \
        src/lib/platform src/lib/rsa src/pages/Login.jsx src/pages/MonDossier.jsx \
        supabase/migrations/20260527_*
git commit -m "feat(rsa-platform): launch — auth + dossier + selection"
git push -u origin rsa/platform-launch
```

Vercel crée automatiquement une URL preview du type `https://rsa-platform-launch-<hash>-<team>.vercel.app`. **Important** : sur cette URL preview, le host ne commence PAS par `app.rotary-startup`, donc le root-gate ne s'active pas — il faut tester les pages RSA en allant *directement* sur leurs URLs (`/Login`, `/MonDossier`, etc.). Pour tester le routing en mode « plateforme », ajouter temporairement le domaine preview dans les Supabase redirect URLs, ou simuler le host via devtools.

Quand satisfait : merger la PR vers `main` → Vercel redéploye automatiquement `app.rotary-startup.org`.

### 5.3 Deploy direct (si Mathieu préfère, accepte le risque)

```bash
git add <files>
git commit -m "feat(rsa-platform): launch"
git push origin main
```

Vercel déploye en prod en ~2-3 min. **Pas de filet** — utiliser uniquement si étape 5.2 a déjà été validée sur une preview équivalente.

### 5.4 Vérifications post-deploy

1. Ouvrir `https://app.rotary-startup.org/` en navigation privée → doit rediriger vers `/Login` (root-gate).
2. Saisir un email (le sien) → vérifier réception magic link → cliquer → doit atterrir sur `/MonDossier` ou `/Selection` (selon rôle).
3. Visiter `https://app.rotary-startup.org/Dashboard` → doit afficher 404 ou rediriger vers `/Login` (validation Option A). Si la page déjeuners s'affiche encore, c'est que l'Option A n'a pas été appliquée → revert ou hotfix.
4. Vérifier console navigateur : 0 erreur Supabase, 0 erreur 401/403.
5. Vérifier `https://app.rotary-startup.org/api/cron/backup-rsa` (avec le bon header `Authorization: Bearer <CRON_SECRET>`) répond 200 — le cron Vercel marche.

### 5.5 Rollback

Si quelque chose casse en prod :

1. Vercel Dashboard → Project → **Deployments**.
2. Trouver le dernier deployment marqué *Production* qui fonctionnait (avant le passage RSA).
3. Menu `...` → **Promote to Production**.
4. Confirmer. Effectif en < 30s, l'ancien build redevient actif sans modifier le repo git.
5. Investiguer le problème en local sans la pression du prod cassé.

**Pas besoin de toucher à git pour rollback** — c'est le gros avantage de Vercel.

---

## 6. Supabase — pourquoi on garde le projet partagé

**Décision recommandée :** conserver `uaoucznptxmvhhytapso` comme unique projet Supabase pour les deux apps.

**Justifications :**

- **Coût** : chaque projet Supabase = un quota (DB size, connections, MAU Auth). En garder un seul économise un plan payant si on dépasse free tier.
- **Aucun conflit de schéma** : tables déjeuners (`restaurant_tables`, `seats`, `reservations`, `chat_messages`, `global_settings`, `event_history`, `upcoming_events`) et tables RSA (`startups`, `app_user_roles`, `editions`, `sessions`, `selection_reviews`, plus le legacy `jury_*`, `session_config`, `startup_*`) ont des noms distincts. Pas de risque de collision.
- **`profiles` partagé** : c'est une table commune (Auth users + leur identité). RSA s'appuie dessus pour l'identité mais ne stocke PAS de rôles dedans (cf. mémoire `project_rsa_platform_rebuild` et `src/lib/platform/auth.jsx:6-17`). Pas de conflit fonctionnel.
- **Données déjeuners gelées** : l'app déjeuners ne va plus évoluer. Ses tables vivent leur vie tranquille (au pire elles seront archivées + supprimées le jour où l'app déjeuners est vraiment retirée).
- **Backup déjà en place** : le cron `/api/cron/backup-rsa` sauvegarde déjà les tables RSA legacy quotidiennement (cf. `api/cron/backup-rsa.js`). À étendre pour couvrir les nouvelles tables plateforme (`startups`, `app_user_roles`, `selection_reviews`…) — task séparée.

**Conséquence importante :** même après extraction de l'app déjeuners vers son propre repo (Option C, étage 2), Supabase peut rester partagé. Les deux apps continueront à pointer sur le même `VITE_SUPABASE_URL`. La séparation Supabase n'aurait de sens que si :
- l'app déjeuners est retirée définitivement (alors on supprime les tables legacy, et le projet ne contient plus que du RSA), OU
- on a un besoin légal de cloisonnement des données (pas le cas aujourd'hui).

---

## 7. Variables d'environnement Vercel — liste exhaustive

| Variable | Scope | Origine | Utilisation | Critique ? |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | Production, Preview, Development | Supabase → Settings → API → Project URL | `src/lib/supabase.js:3` (client navigateur) | OUI |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview, Development | Supabase → Settings → API → `anon public` key | `src/lib/supabase.js:4` (client navigateur) | OUI |
| `VITE_APP_URL` | Production | `https://app.rotary-startup.org` | `src/lib/platform/auth.jsx:25` — base URL des magic links | Recommandé (sinon fallback `window.location.origin`) |
| `SUPABASE_URL` | Production | Même valeur que `VITE_SUPABASE_URL`, sans préfixe VITE_ | `api/cron/backup-rsa.js` (serverless, pas de prefix Vite) | OUI pour le cron |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | Supabase → Settings → API → `service_role` key | `api/cron/backup-rsa.js` — accès full DB | **CRITIQUE — secret serveur, jamais exposer** |
| `CRON_SECRET` | Production | Générer une chaîne aléatoire longue (e.g. `openssl rand -hex 32`) | `api/cron/backup-rsa.js` — auth du cron Vercel | OUI |

**Edge functions Supabase :** `supabase/functions/consolidate-jury-pack/` existe. Vérifier ses propres env vars (généralement `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` injectées automatiquement par Supabase, mais à confirmer si elle a des secrets custom).

**Notes :**
- Les variables sans préfixe `VITE_` ne sont **PAS** exposées au navigateur (bonne pratique sécurité). Le service_role key DOIT rester sans préfixe.
- Après tout ajout/modification de variable Vercel, **redéployer** pour qu'elle prenne effet (les variables sont injectées au build pour les `VITE_*`, et au runtime pour les autres).

---

## 8. Annexe — known unknowns à confirmer avec Mathieu

À clarifier avant de lancer l'étage 2 (extraction Option C) :

1. **URL actuelle de l'app déjeuners en prod.** Aujourd'hui c'est `app.rotary-startup.org` qui sert l'ancien build (parce que pas de deploy RSA encore). Mais y a-t-il une URL legacy `.vercel.app` ou un domaine custom (`rotary-paris.org/dejeuners`?) que les rotariens utilisent en pratique ? Si oui, la séparation devra préserver cette URL.
2. **Qui utilise encore l'app déjeuners ?** Régulièrement ou occasionnellement ? Si c'est tombé en désuétude (Mathieu a écrit « legacy » → suggère oui), on peut envisager de la **mettre en sommeil** plutôt que de l'extraire — un simple « cette app sera bientôt déplacée, contacter Mathieu » sur `/Index` suffirait.
3. **Domaine cible si extraction.** Options : `lunch.rotary-paris.org`, `dejeuners.rotary-paris.org`, sous-domaine d'un Rotary district, ou conservation d'une URL `.vercel.app`. Décision DNS = Mathieu.
4. **Acceptation de retirer la DB déjeuners.** Si on extrait l'app vers son propre Vercel mais qu'on garde Supabase partagé (recommandé), les tables déjeuners restent. À quel moment Mathieu veut-il les archiver / supprimer ? Réponse probable : « jamais avant que l'app déjeuners soit vraiment retirée » → on garde tout.
5. **Compte Vercel** : un seul compte/team ou plusieurs ? L'extraction crée un 2e projet Vercel qui doit être branché à un compte. Si compte free tier individuel, attention aux limites simultanées.
6. **CI/CD** : aujourd'hui il n'y a pas de GitHub Actions visible (juste `vercel.json`). Si Mathieu veut une CI (tests, lint check) avant deploy, c'est à ajouter — utile dans les deux apps.
7. **Bug critiques `hardening/foundation-auth-rls-review.md`** : la mémoire mentionne des C2/C3 (bucket `uploads` public, upload legacy) à clôturer avant exposition publique. À traiter en parallèle, pas bloquant pour l'isolation/deploy mais bloquant pour ouvrir la candidature.

---

## 9. Résumé exécutif — 3 décisions à prendre

1. **Décision déploiement** : preview branch (PR) ou push direct sur `main` pour le premier deploy RSA ? → recommandation : **preview branch** la première fois, puis push direct par la suite.
2. **Décision isolation** : appliquer l'Option A maintenant (filtre routes par hôte), ou attendre l'extraction Option C ? → recommandation : **Option A maintenant**, Option C plus tard.
3. **Décision long-terme app déjeuners** : extraction dans un nouveau repo (Option C) ou retrait pur et simple (si plus utilisée) ? → à trancher dans 2-3 semaines, après recul sur la prod RSA.

**Fichiers de référence cités :**
- `C:\Users\mathi\Desktop\Active projects\RotaryEventManagement\src\App.jsx` (root-gate actuel)
- `C:\Users\mathi\Desktop\Active projects\RotaryEventManagement\src\Layout.jsx` (STANDALONE_PAGES)
- `C:\Users\mathi\Desktop\Active projects\RotaryEventManagement\src\pages.config.js` (26 pages auto-registered)
- `C:\Users\mathi\Desktop\Active projects\RotaryEventManagement\src\lib\supabase.js` (client unique)
- `C:\Users\mathi\Desktop\Active projects\RotaryEventManagement\src\lib\platform\auth.jsx` (PlatformAuthProvider)
- `C:\Users\mathi\Desktop\Active projects\RotaryEventManagement\vercel.json` (cron + CSP + SPA rewrite)
- `C:\Users\mathi\Desktop\Active projects\RotaryEventManagement\api\cron\backup-rsa.js` (cron Vercel)
- `C:\Users\mathi\Desktop\Active projects\RotaryEventManagement\docs\RSA_LIVE.md` (env vars historiques)
- `C:\Users\mathi\Desktop\Active projects\RotaryEventManagement\docs\hardening\foundation-auth-rls-review.md` (criticals sécurité)
- `C:\Users\mathi\.claude\projects\c--Users-mathi-Desktop-Active-projects-RotaryEventManagement\memory\project_rsa_platform_rebuild.md` (décisions verrouillées)
