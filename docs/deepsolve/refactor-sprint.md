# DEEPSOLVE — Sprint refactor RotaryEventManagement

**Auteur :** agent DEEPSOLVE
**Date :** 2026-05-30
**Statut :** propositions — aucune action n'a été exécutée (lecture seule)
**Décide :** Mathieu

---

## 0. TL;DR

- **L'app est petite** : déjeuners statutaires ≈ 11 pages mini-app non déployée + RSA beta basique ≈ 12 pages plateforme + 6 pages legacy URL-active (QR jurés, emails finale). Total métier raisonnable.
- **Le code est gros pour ce qu'il fait** : 84 942 LOC src/, 364 fichiers, 11 fichiers > 800 LOC, 5 niveaux de nesting max. Dette accumulée pendant 4 vagues V3.
- **3 vagues refactor déjà livrées en session** : R-dead-code (-3 707 LOC, `0a47f63`), R5a split entities.js (`f685168`), R5b split master i18n (`ac315d5`), + doc (`f830828`).
- **R1 extraction lunch a échoué 2 fois** : trop gros pour exécution autonome dans un seul contexte (workflow 1h25 AbortError + main loop interrompu). C'est une **migration cross-repo**, pas un refactor.
- **Recommandation** : poursuite en **micro-vagues atomiques** ≤ 30 min, commit + build verify entre chaque, validation utilisateur entre vagues sensibles. Ordre dicté par sécurité (commence par zéro-risque, finit par migration).

---

## 1. État actuel — chiffres et faits

### 1.1 Métriques objectives (post-R5, commit `f830828`)

| Métrique | Valeur | Source |
|---|---:|---|
| LOC `src/` | 81 308 | `Get-ChildItem -Recurse \| Measure-Object -Line` |
| Fichiers `.js`/`.jsx` `src/` | 383 | `Get-ChildItem -Recurse \| .Count` |
| Pages `src/pages/` | 33 (11 lunch + 22 plateforme/legacy RSA) | `ls src/pages/` |
| Lint baseline | 21 erreurs (toutes `unused-imports`) | `npm run lint --quiet` |
| Build Vite | ✅ ~11s | `npm run build` |
| Plus gros chunk | `Admin` 993 kB (gzip 262) | rapport vite build |
| Plus gros fichier | `RsaDashboard.jsx` 1 934 LOC | tri par taille |

### 1.2 Cartographie réelle des trois sous-systèmes

| Sous-système | Pages | Statut prod | Composants liés |
|---|---|---|---|
| **A. Lunch (déjeuners)** | Index, Dashboard, Reservations, EventPlanning, FloorPlan, TableView, Archives, AdminControl, ReservationRequest, UserManagement, Features | **Jamais déployé**, sera fini plus tard ([App.jsx:27-28](../../src/App.jsx#L27-L28) `isPlatformHost` hack) | `components/{calendar,dashboard,reservations,table,notifications,feedback}/`, `lib/AuthContext.jsx`, `lib/db.js` (partagé) |
| **B. RSA legacy beta (URL-active)** | RsaDashboard, RsaJuryHub, RsaScore, RsaRecap, RsaFinaleResults, RsaFinaleRsvp, RsaPrintSheets, StartupUpload, RsaJuryForm, RsaJuryView, RsaAdmin | **Endpoints URL actifs** (QR codes jurés, emails finale, deep links admin) | Composants inline dans chaque page + `components/rsa/admin/*` (V3 admin qui les LINKE), `lib/db.js` entities `JuryProfile`/`JuryScore`/etc |
| **C. Plateforme RSA V3** | Login, MonDossier, Selection, Jury, Admin, Concours, DevenirJury, Candidater, Welcome, Resultats, JuryCandidate | En cours de finalisation, partiellement déployé | `components/rsa/{candidature,selection,jury,admin/platform,...}/`, `lib/platform/*`, `lib/rsa/entities/*` (post-R5a) |

### 1.3 Couplages observés (pourquoi le refactor est piégeux)

1. **`lib/db.js`** (250 LOC) exporte simultanément :
   - Entités lunch (`Seat`, `RestaurantTable`, `Reservation`, `User`, `Chat` RPCs, `GlobalSettings`…)
   - Entités RSA legacy (`JuryProfile`, `JuryScore`, `JuryScoringSession`, `SessionConfig`, `FinaleRsvp`, `JuryScoreDraft`)
   - Importé par **34 fichiers** : 17 lunch + 6 Rsa* legacy + **8 composants admin V3 actifs** (`DecksTab`, `LiveTab`, `SetupTab`, `ResultsTab`, `CommunicationsSection`, `RsvpTab`, `FinalistsPicker`, `ResultsAnnounceSection`) + entities V3 + autres.

2. **Pages RSA legacy = endpoints URL ciblés** par V3 admin :
   - `/RsaScore?s=...` — **QR codes jurés** (`LiveTab:152,190`, `SetupTab:177`, `JurorLinkQR:27`, `DecksTab:1096,1175`, `FinaleEmailsSection:361`, `SessionDetailDrawer:269`)
   - `/RsaRecap?s=...` — boutons récap (`ResultsTab:367,378`, `CommunicationsSection:539,565,591`)
   - `/RsaJuryHub` — emails finale (`FinaleEmailsSection:362`, `CommunicationsSection:543,569,595`)
   - `/RsaDashboard` — lien `RsaAdmin.jsx:197`

3. **Double provider auth** ([App.jsx:38-51](../../src/App.jsx#L38-L51)) :
   - `AuthProvider` (lunch) gated par `isPlatformHost()`
   - `PlatformAuthProvider` (V3) toujours monté
   - `useAuthOrNull` + `LEGACY_AUTH_FALLBACK` = hack pour ne pas faire fuiter lunch sur domaine plateforme

4. **`STANDALONE_PAGES` Set** ([Layout.jsx:9](../../src/Layout.jsx#L9)) : 21 pages sur 33. Le Layout chrome lunch est devenu minoritaire mais reste le **défaut**.

### 1.4 Vagues déjà livrées dans ce sprint

| Vague | Commit | LOC delta | Fichiers delta |
|---|---|---:|---:|
| R-dead-code (5 morts confirmés) | `0a47f63` | -3 707 | -5 |
| R5a entities.js → 9 domaines + facade | `f685168` | ~+30 | +11 |
| R5b master i18n → 14 tabs + facade | `ac315d5` | ~+40 | +15 |
| docs annexe MAJ | `f830828` | +49 | +0 |
| **Cumulé** | | **-3 588** | **+21** |

---

## 2. Erreurs précédentes — leçons à intégrer

### 2.1 Tentative 1 — Workflow 1-agent énorme (R1 lunch)

- **Cause d'échec** : un seul agent chargé de "copier 11 pages + 6 dossiers + 8 libs partagés + valider build cible + purger main + simplifier App/Layout + commits cross-repo" → 1h25min → AbortError.
- **Leçon** : un agent unique n'absorbe pas un sprint complet. Ses tools (Write/Edit/Bash) sont synchrones, chaque fichier copié = 1 round-trip. À 92 fichiers × 5-10 secondes, c'est inévitable.

### 2.2 Tentative 2 — Main loop Copy-Item + Write rejected

- **Cause d'échec** : j'ai enchaîné en mode sweep (PowerShell Copy-Item bulk → Write App.jsx → Write Layout → Write pages.config) sans validation par étape. Utilisateur a interrompu, à raison.
- **Leçon** : "smart fast" ≠ "tout en parallèle". L'opérateur ne voit pas ce qui se passe entre les commits. Pour une migration sensible, valider après **chaque** fichier critique.

### 2.3 Tentative 0 — Audit RSA legacy import-only

- **Faille découverte** : l'agent kill a aborté à raison après détection que 4 pages "orphan-import" sont en réalité **endpoints URL actifs** (QR codes, emails). L'audit import-graph est **incomplet** sans grep des `href={`/X...`}` et `createPageUrl("X")`.
- **Leçon** : tout audit de page doit grep aussi les `href`, `to=`, `createPageUrl`, `navigate` qui ciblent son nom.

### 2.4 Leçons consolidées

1. **Vague atomique = ≤ 30 min, ≤ 10 fichiers touchés, 1 commit, 1 build verify.**
2. **Validation utilisateur entre vagues sensibles** (migration cross-repo, suppression de page URL-active, restructure routing).
3. **Audit page = import-graph + URL-graph** (ne plus jamais se contenter du premier).
4. **Lunch n'est pas une vague, c'est un sprint dédié** (cf. §5).

---

## 3. Recadrage — c'est petit

Vu de l'extérieur, "Rotary Event Management" c'est :

- **Une mini-app de gestion réservation déjeuner** (table → siège → réservation → chat convives). Concept simple, données simples, ≈ 11 pages.
- **Une plateforme beta Startup Awards 2026** (candidat dépose dossier → comité review → jury score → finale annonce résultat). Concept clair, ≈ 12 pages V3 + 6 pages legacy beta encore branchées par URL.

Le **vrai problème** n'est pas la complexité métier — c'est l'accumulation : 4 vagues V3 livrées en 2 jours, beaucoup de "parked for future", peu de cleanup, et un module beta legacy qu'on n'a jamais retiré parce qu'il sert encore d'endpoint.

**Stratégie générale recommandée** : on ne touche au gros (lunch extract, fusion admin, kill legacy) **qu'après** avoir réduit la surface de risque par des micro-vagues claires.

---

## 4. Plan step-by-step — micro-vagues atomiques

### 4.1 Liste ordonnée (du moins risqué au plus risqué)

| # | Vague | Scope | Effort | Risque | Verify |
|---|---|---|---|---|---|
| **µ1** | Lint:fix baseline | `npm run lint:fix` sur les 21 unused-imports | 5 min | 0 | lint OK, build OK |
| **µ2** | Split db.js en `db/lunch.js` + `db/rsa-legacy.js` + facade | Refactor structurel local, imports inchangés via facade | 15 min | Faible | build OK, grep imports |
| **µ3** | Audit URL templated des 4 routes RSA legacy | Doc seulement : produire la liste exacte (file:line) des `href`/`navigate`/`createPageUrl` vers `/RsaScore`, `/RsaRecap`, `/RsaJuryHub`, `/RsaDashboard` | 20 min | 0 | doc créé |
| **µ4** | Maj `docs/REFACTOR-MAIN.md` annexe avec µ1-µ3 livrés | 1 edit MD | 5 min | 0 | — |
| **µ5** | Décision utilisateur : sort des RSA legacy ? | Question : (a) garder tel quel, (b) migrer URLs vers routes V3 (vague feature séparée), (c) kill + accepter URLs 404 | — | — | — |
| **µ6** | Si décision (a) µ5 : isolation RSA legacy dans `src/pages/legacy/` | `git mv` 11 fichiers, MAJ imports lazy dans `pages.config.js`, MAJ `STANDALONE_PAGES` Set. Zéro changement de comportement. | 20 min | Faible | build OK, routes inchangées |
| **µ7** | Si décision (b) µ5 : créer doc deepsolve dédié URL migration | Pas d'exécution. Définit pour chaque URL legacy son remplaçant V3 et le breakdown des composants à modifier. | 30 min | 0 | doc créé |
| **µ8** | R3 fusion admin (partiel post-R-dead-code) | `UserManagement.jsx` (lunch) reste séparé. `Admin.jsx` / `RsaAdmin.jsx` : audit + décision merge vs garder. | 30 min | Faible-moyen | build OK, nav inchangée |
| **µ9** | R-tail-bis : 2e passe knip après µ1-µ8 | Re-run knip avec mode strict (URL grep + import grep). Liste de zombies confirmés. | 10 min | 0 | rapport |
| **µ10** | Kill confirmés µ9 | Suppressions atomiques par lot ≤ 5 fichiers. | 15 min/lot | Faible | build OK |

**Total µ1-µ10 sans R1 lunch** : ~3h-3h30 cumulées, 6-8 commits, gain LOC ≈ -2k à -4k (selon issue µ5).

### 4.2 Sprint dédié lunch extract (HORS micro-vagues)

R1 lunch reste **hors scope du sprint refactor courant**. Si Mathieu veut le faire, c'est un sprint séparé de **2-3h focus continu** avec ces étapes (chaque étape = 1 validation utilisateur) :

| Étape | Scope | Verify |
|---|---|---|
| L1 | mkdir `c:\Users\mathi\Desktop\rotary-event-lunch\` + configs (package.json épuré, vite, tailwind, postcss, jsconfig, index.html) | dir structure |
| L2 | Copy-Item 11 pages lunch + 6 component dirs | grep imports cassés |
| L3 | Duplicate (pas move) `db.js`, `AuthContext.jsx`, ui/, design/, supabase, utils, query-client, ErrorBoundary, NavigationTracker, PageNotFound | grep imports cassés |
| L4 | Écrire `src/{App,Layout,main,pages.config}.jsx` minimaux côté lunch | npm install OK |
| L5 | `cd lunch && npm install && npm run build` | build cible OK ⇒ valider avant L6 |
| L6 | git init + commit "init lunch repo" côté lunch | — |
| L7 | Purger 11 pages + 6 component dirs du repo principal | grep imports orphelins |
| L8 | Simplifier `App.jsx` main (retirer AuthProviderGate, `isPlatformHost`, LUNCH_PAGES, LEGACY_AUTH_FALLBACK) | lint OK |
| L9 | Simplifier `Layout.jsx` main (retirer STANDALONE_PAGES set) | lint OK |
| L10 | `npm run build` main | build OK ⇒ commit `refactor(R1): extract lunch app` |
| L11 | Mathieu : GitHub remote + Vercel deploy lunch repo (hors session) | — |

**Notes critiques pour L** :
- `db.js` reste dans le main (utilisé par 8 admin V3) — duplication assumée.
- `AuthContext.jsx` peut être removed du main si décision (a) ou (b) sur µ5 ; sinon conservé.
- Welcome.jsx et JuryCandidate.jsx restent en main (utilisés par plateforme).
- UserManagement.jsx déménage avec lunch (chain AdminControl → UserManagement).

---

## 5. Invariants à préserver — tous les commits doivent valider

1. **Magic-link plateforme** — `/Login` → email → callback → `postLoginRoute`. Test manuel après chaque vague qui touche `App.jsx`/`Layout.jsx`/`auth.jsx`.
2. **QR codes jurés** — `/RsaScore?s=...` reste accessible tant que µ5 n'a pas tranché.
3. **Emails finale templates** — URLs `/RsaJuryHub` et `/RsaRecap` valides tant que µ5 = (a) ou (b).
4. **RLS Supabase** — aucun bypass `supabase.from(...).insert/update/delete` ajouté sur tables sensibles. Pas concerné par µ1-µ4 (lecture/refactor seulement).
5. **Single-flight `loadIdentity`** — patch 2026-06-04 dans `auth.jsx`. Ne pas réintroduire double load.
6. **`computePrimaryNav`** — source unique nav tier-dominante. Pas touché.
7. **Design tokens** — `components/design/tokens.js` unique source de couleur. Pas touché.
8. **Lint baseline ≤ 21** — sauf µ1 qui doit le réduire à 0.

---

## 6. Décisions à prendre — questions ouvertes

À trancher avant exécution :

1. **µ5 — Sort des 6 pages RSA legacy** :
   - (a) Garder tel quel et les ranger dans `src/pages/legacy/` (cosmétique, zéro risque)
   - (b) Migrer les URLs vers routes V3 équivalentes puis kill (vague feature, ~1 journée)
   - (c) Kill maintenant + accepter URLs 404 pendant transition (risqué si Mathieu utilise les QR codes en démo)

2. **R1 lunch — Quand ?**
   - (a) Maintenant, sprint dédié de 2-3h focus
   - (b) Plus tard, après stabilisation prod RSA V3
   - (c) Jamais — lunch est gelé, on accepte la cohabitation indéfiniment

3. **Validation par vague** :
   - (a) Mathieu valide entre chaque µ (slow, safe)
   - (b) Mathieu valide après chaque groupe de 3 µ (équilibré)
   - (c) Autonomie complète µ1-µ4 (zéro-risque), validation pour µ5+

4. **Doc deepsolve par sprint** :
   - Faut-il un nouveau deepsolve pour le sprint lunch extract (avant L1) ?
   - Faut-il un deepsolve pour la migration URL legacy (si décision (b) µ5) ?

---

## 7. Recommandation finale

**Mathieu lance autoriser :**

1. **µ1 immédiatement** — lint:fix. Zéro risque, 5 min. Si OK, on enchaîne.
2. **µ2 + µ3 ensuite** — split db.js + audit URL. Refactor + doc, faible risque. Commit séparés.
3. **µ4** — MAJ doc annexe.
4. **PAUSE pour décision µ5** avec Mathieu.

Puis selon réponses §6 :
- µ6 OU µ7 (suivant décision (a)/(b) sur RSA legacy)
- µ8 fusion admin partiel
- µ9 + µ10 cleanup final

**Pas de R1 lunch tant que µ1-µ10 ne sont pas verts.** Sprint lunch séparé planifié explicitement avec Mathieu, déclenché par décision §6.2.

**Fichiers de référence :**
- `docs/REFACTOR-MAIN.md` (playbook générique + annexe projet)
- `docs/deepsolve/deploy-and-lunch-app-isolation.md` (analyse Options A/B/C/D, recommande C plus tard)
- `src/App.jsx:27-62` (hacks isPlatformHost/AuthProviderGate/LUNCH_PAGES)
- `src/Layout.jsx:9` (STANDALONE_PAGES Set)
- `src/lib/db.js` (entités mixtes lunch+RSA legacy, 34 importers)
- Mémoire : `project_rsa_v3_b2b_pivot`, `project_design_upgrade_trilogy`, `project_auth_lock_storm_fix`.

---

## 8. Mode opératoire pour exécution

Quand Mathieu valide une vague µN :

1. Je l'annonce en 1 phrase (scope précis).
2. J'exécute (1-3 outils max).
3. Je commit avec format `refactor(µN): titre — gain` ou `chore(µN): titre`.
4. Je lance `npm run build` (et `lint` si pertinent).
5. Je remonte : commit hash, LOC delta, lint count, build status.
6. **J'attends validation avant µN+1** (sauf décision §6.3 = (c) autonomie µ1-µ4).

Pas de workflow géant. Pas de fan-out multi-agent. Une vague, un commit, un build, un report. Slowly clean.
