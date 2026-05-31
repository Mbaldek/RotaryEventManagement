# Design Upgrade — Audit (app.rotary-startup.org)

> **Scope.** **Plateforme RSA uniquement** — `app.rotary-startup.org`. Les 12
> pages de l'app déjeuners (`LUNCH_PAGES` dans
> [`src/App.jsx:56-60`](../../src/App.jsx#L56-L60)) sont **hors scope** : elles
> redirigent vers `/Login` sur le domaine plateforme.
>
> **Lunch hors scope (rappel).** AdminControl, Archives, Dashboard,
> EventPlanning, **Features**, FloorPlan, **Index**, ReservationRequest,
> Reservations, TableView, TableViewMockup, UserManagement.
>
> **Pages plateforme auditées (22).** Login, Welcome, Concours, Candidater,
> StartupUpload, MonDossier, DevenirJury, Jury, JuryCandidate, Selection,
> Resultats, Marketplace, Admin, RsaAdmin, RsaDashboard, RsaJuryHub,
> RsaJuryView, RsaJuryForm, RsaScore, RsaRecap, RsaFinaleResults,
> RsaFinaleRsvp. RsaPrintSheets exclu (print-only).
>
> **Référence éditoriale plateforme.** [`DevenirJury.jsx`](../../src/pages/DevenirJury.jsx) :
> pure Élysée 5/5 (PageShell narrow + Eyebrow + EditorialTitle + JuryApplicationForm,
> trilingual, motion-wrapped, intro `max-w-[60ch]`). Sert de gold standard pour
> toutes les pages plateforme à upgrader.
>
> **Companion docs.**
> - Blueprint d'upgrade : [`design-upgrade-blueprint.md`](./design-upgrade-blueprint.md)
> - Grammaire de variantes : [`ui-patterns-catalog-generic.md §16`](./ui-patterns-catalog-generic.md#16-block-variant-grammar-anti-template)
> - Brand authority : [`elysee-designbook.md`](./elysee-designbook.md)
> - SSOT historique : [`elysee-audit.md`](./elysee-audit.md) (gaps du système — complémentaire)
> - Isolation lunch/plateforme : [`docs/deepsolve/deploy-and-lunch-app-isolation.md`](../deepsolve/deploy-and-lunch-app-isolation.md)

---

## Table of contents

1. [Score & maturity matrix](#1-score--maturity-matrix-22-pages-plateforme)
2. [Catalogue des "smells IA generated"](#2-catalogue-des-smells-ia-generated)
3. [Audit par archétype plateforme](#3-audit-par-archétype-plateforme)
4. [Quick-wins vs deep-refactor](#4-quick-wins-vs-deep-refactor)
5. [Sécurité avant design](#5-sécurité-avant-design)
6. [Distance au système](#6-distance-au-système)

---

## 1. Score & maturity matrix (22 pages plateforme)

Score Élysée **/5** : 1 = hex inline + pas de shell, 5 = référence éditoriale.
Score Anti-template **/5** : 1 = clone visuel de la page voisine, 5 = signature
éditoriale propre.

| # | Page | Archétype | Élysée | Anti-template | Smells dominants | Priorité |
| - | ---- | --------- | ------ | ------------- | ---------------- | -------- |
| 1 | `DevenirJury` | Vitrine RSA | **5** | 4 | Clone visuel de `Candidater` (même séquence eyebrow/title/intro) | mid (variation) |
| 2 | `Welcome` | Hub post-login | **5** | 4 | Single hero, peu différencié par rôle | mid |
| 3 | `Resultats` | Vitrine RSA | **5** | 4 | OK mais ranking-table monotone | low |
| 4 | `Candidater` | Funnel public | 4 | 4 | Mêmes patterns que DevenirJury | mid |
| 5 | `Login` | Auth | 4 | 4 | OK, minimal | low |
| 6 | `Jury` | Hub jury | 4 | 4 | Master/détail propre, layout split standard | mid |
| 7 | `JuryCandidate` | Funnel jury | 4 | 4 | Stepper 4 étapes OK | low |
| 8 | `Selection` | Queue comité | 4 | 4 | FiltersBar + Queue + Drawer propre | low |
| 9 | `Admin` | Router shell | **5** | n/a | Routeur, pas un écran propre | — |
| 10 | `Concours` | Vitrine RSA | 3 | 3 | `H-Ambient` exécuté puis **rejeté** (faux logo, selector, cards). Refonte « La Saison » validée 2026-05-31 → [`blueprints/concours-saison-redesign.md`](../blueprints/concours-saison-redesign.md) | en cours |
| 11 | `Marketplace` | Catalogue extensions | 3 | 2 | Cards d'extension toutes égales (pas de featured) | mid |
| 12 | `MonDossier` | Dashboard perso | 3 | 3 | Page shell OK ; auditer `CandidatureFunnel`/`Tracking` | mid |
| 13 | `StartupUpload` | Funnel | **2** | 2 | Inline hex partout, deux option-cards symétriques, color-scheme session inline | high |
| 14 | `RsaJuryHub` | Hub jury legacy | **2** | 2 | Tokens hex inline, cards session avec couleurs injectées, repetitive | high |
| 15 | `RsaJuryView` | Tableau jury×session legacy | **2** | 1 | Table hand-rolled, pas de StatusPill, hex inline | high |
| 16 | `RsaScore` | Scoring | **2** | 2 | StartupScoreCard répété, pas de hiérarchie draft/live/locked | high |
| 17 | `RsaDashboard` | Checklist J-x | **2** | 1 | Tasks flat, pas de groupement par phase | high |
| 18 | `RsaAdmin` | Admin RSA legacy | **2** | 2 | Tab-switcher Setup/Decks/Live/Results/Finale plat, pas de PageShell | high |
| 19 | `RsaRecap` | Reporting | **2** | 1 | Ranking table monotone, vue startups ≡ vue juries | mid |
| 20 | `RsaFinaleResults` | Reveal public | **2** | 1 | Podium + table = `RsaRecap` visuellement | high (event-critical post-mortem) |
| 21 | `RsaFinaleRsvp` | RSVP public | **2** | 2 | Radio cards roles avec couleurs inline + Header local concurrent à TopNav | high |
| 22 | `RsaJuryForm` | Form jury legacy | **1** | 1 | **Secrets Supabase inline (SB_URL, SB_KEY)**, pas de PageShell, form hand-rolled | **URGENT (sécu + design)** |

### 1.1 Synthèse par bucket

| Bucket | Pages | Action |
| ------ | ----- | ------ |
| **A. Référence Élysée plateforme** (5/5) | DevenirJury, Welcome, Resultats, Admin (router) | À **dévarier** — leur réplication mécanique = source #1 du smell IA |
| **B. Élysée mid + monotonie** | Candidater, Login, Jury, JuryCandidate, Selection, Concours, Marketplace, MonDossier | Variation éditoriale ; assigner variantes hero/section/list distinctes |
| **C. Tokens hardcodés + shell ad-hoc** | StartupUpload, RsaJuryHub, RsaJuryView, RsaScore, RsaDashboard, RsaAdmin, RsaRecap, RsaFinaleResults, RsaFinaleRsvp | Migration tokens + adoption shell + variantes |
| **D. Sécurité + design** | RsaJuryForm | **URGENT** secrets Supabase, puis refonte |

**Aucune page plateforme en pure shadcn off-palette** (les 4 cas du genre — Features, AdminControl, UserManagement, EventPlanning — étaient tous lunch et sont sortis du scope).

---

## 2. Catalogue des "smells IA generated"

10 smells recensés, classés par criticité sur le scope plateforme.

### 2.1 Smell #1 — La séquence canonique répétée

> Page = `PageShell` → `Eyebrow` → `EditorialTitle` → paragraphe intro → grid
> de cards. Tel quel sur **6 pages plateforme** (DevenirJury, Candidater,
> Welcome, Concours, Marketplace, Resultats partiellement).

C'est exactement ce qui fait "scaffold AI". Le shell est sain ; c'est l'**absence
de variation entre ces 6 pages** qui produit l'effet template.

**Correctif** : grammaire de variantes (catalog §16) + adjacence (blueprint §1).

### 2.2 Smell #2 — Hex tokens inline

```jsx
// ❌ Smell IA
const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#faf7f2";
```

**Présent dans** : RsaJuryHub, RsaJuryView, RsaJuryForm, RsaScore, RsaDashboard,
RsaRecap, RsaFinaleResults, RsaFinaleRsvp, StartupUpload, RsaAdmin.

**Correctif** : `import { NAVY, GOLD, CREAM } from "@/components/design"`.

### 2.3 Smell #3 — Cartes-grille toutes égales

`Concours.jsx` (sessions), `Marketplace.jsx` (extensions), `RsaJuryHub.jsx`
(sessions), `RsaDashboard.jsx` (checks). Toutes les cartes ont le même poids.

**Correctif** : variantes `L-Mosaic` (1 featured + grid) ou `L-Editorial-Pair`
(alternance gauche/droite) — catalog §16.3.

### 2.4 Smell #4 — Palette parasite

Couleurs `bg-amber-*`, `bg-blue-*`, `bg-purple-*` injectées par session/rôle.
**Présent dans** : `RsaJuryHub` (badges session), `RsaFinaleRsvp` (radio rôles),
`StartupUpload` (sessions FoodTech vert / Social bordeaux / Tech violet…).

**Correctif** : palette **stricte** NAVY/GOLD/INK/MUTED + TINT_*. Les
"couleurs de session" doivent être **dérivées** d'un map central, pas inline.

### 2.5 Smell #5 — Pas de hiérarchie d'états

`RsaScore` (draft / live / locked / published — identiques visuellement),
`RsaDashboard` (J-5/J-3/J-1/J-0 sans groupement), `RsaJuryView` (sessions tous
au même statut visuel).

**Correctif** : `StatusPill` (existe — [`src/components/design/StatusPill.jsx`](../../src/components/design/StatusPill.jsx))
+ variation de fond + ornement de phase (eyebrow numérotée "01 — J-5"…).

### 2.6 Smell #6 — Header local concurrent à TopNav

Pages publiques RSA qui réimplémentent un Header sticky navy local avec leur
propre pill toggle FR/EN/DE. Observé sur `RsaFinaleRsvp:742`.

**Correctif** : `TopNav` unique + `LanguageSwitcher` unique. Source de vérité
unique pour `<html lang>`.

### 2.7 Smell #7 — Secrets en clair (sécurité)

```jsx
const SB_URL = "https://xxx.supabase.co";
const SB_KEY = "eyJhbGciOi…";
```

**Confirmé sur** : `RsaJuryForm.jsx`. **À grep** : RsaScore, RsaDashboard,
RsaJuryView.

**Correctif** : `import { supabase } from "@/lib/supabase"` (déjà initialisé via `.env`).

### 2.8 Smell #8 — Padding/density homogène

Toutes les pages utilisent `comfortable` (40px row, 16-20px padding). Un
dashboard de 16 checks (`RsaDashboard`) devrait être `compact` (32px) ; un
hub éditorial (`Welcome`) devrait rester `spacious` (48px).

**Correctif** : `<PageShell density="compact|comfortable|spacious">` — à
ajouter au shell.

### 2.9 Smell #9 — Aucune signature micro-interaction par page

Toutes les pages utilisent la même mount-stagger générique. **Aucune signature
visuelle propre** au funnel candidate vs jury vs admin.

**Correctif** : 4 signatures (catalog §16.6) — `M-Editorial-Veil` (vitrine),
`M-Gold-Sweep` (funnel candidate), `M-Slide-Cards` (cockpit jury),
`M-Hairline-Reveal` (admin queue). Une par archétype, jamais croisées.

### 2.10 Smell #10 — Fork RSA legacy 2026 / plateforme V2-V3

Les pages `Rsa*` (RsaJuryHub, RsaJuryView, RsaJuryForm, RsaScore, RsaDashboard,
RsaRecap, RsaFinaleResults, RsaFinaleRsvp, RsaAdmin) sont les écrans **legacy
2026** du programme post-Grande-Finale (26 mai 2026). Elles cohabitent avec les
écrans **plateforme V2-V3** (Jury, JuryCandidate, Selection, Admin, Marketplace,
Concours, Candidater, MonDossier).

**Décision à prendre** (cf. blueprint §4) : deprecate les `Rsa*` au profit du
funnel V2-V3, ou les conserver et les aligner.

---

## 3. Audit par archétype plateforme

### 3.1 Vitrine RSA (public, auth-free)

**Pages.** Concours, Candidater, DevenirJury, Resultats, Marketplace.

**Signature actuelle.** Toutes en pattern Élysée éditorial (hero centré +
sections empilées). DevenirJury + Resultats à 5/5, Candidater à 4/5,
Concours à 3/5 (délègue), Marketplace à 3/5.

**Smell dominant.** Adjacence : ces 5 pages se retrouvent côte à côte dans le
funnel "découvrir le programme" — actuellement, séquences trop similaires.

**Pistes de variation** (point de départ — cf. blueprint §3.1 pour le détail) :
- `Concours` — `H-Ambient` rejeté (faux logo, selector, cards) ; refonte
  éditoriale chronologique « La Saison » (frise = nav, sessions dans l'ordre).
- `Candidater` — un compteur d'étape (`01 / 03`) pour assumer le funnel.
- `DevenirJury` — une barre gold verticale gauche, voix institutionnelle.
- `Resultats` — un voile éditorial au mount + giant year, registre cérémonial.
- `Marketplace` — un giant tabular numéral (`27 extensions`) + grid mosaic
  avec une extension featured.

À adapter, combiner, ou remplacer si une autre voie sert mieux le contenu.

### 3.2 Auth & post-auth hub

**Pages.** Login, Welcome.

**Signature actuelle.** Login délègue à `MagicLinkLogin` (sobre, correct).
Welcome utilise PageShell + Eyebrow + EditorialTitle (5/5).

**Pistes de variation.**
- `Login` → H-Typo-Only + S-Quiet + E-Quiet-Line.
- `Welcome` → H-Typo-Only role-aware (`Bonjour, Mathieu.` en serif 100px) +
  S-Quiet + E-Editorial-Letter.

Note : Login + Welcome partagent `H-Typo-Only` volontairement — la continuité
visuelle entrée → hub fait partie du discours éditorial (le moment d'arrivée).

### 3.3 Funnel candidat (dossier startup)

**Pages.** Candidater (entry), StartupUpload (deck upload), MonDossier (tracking).

**Signature actuelle.** Mélange : MonDossier shell Élysée OK, StartupUpload
ad-hoc inline, Candidater Élysée OK.

**Smell dominant.** Pas de progression visuelle continue entre les 3 étapes.

**Pistes de variation.**
- `Candidater` → H-Step-Pictogram + S-Numbered + L-Numbered-Hairline +
  signature **M-Gold-Sweep**.
- `StartupUpload` → H-Form-Invitation + Dropzone + Field stack + M-Gold-Sweep.
- `MonDossier` → H-Vertical-Rule + S-Quiet + L-Timeline (états dossier) +
  M-Gold-Sweep.

Toutes partagent `M-Gold-Sweep` — c'est la **signature funnel** qui les lie.

### 3.4 Hub jury V2-V3

**Pages.** Jury, JuryCandidate, Selection.

**Signature actuelle.** Élysée 4/5. Architecture master/détail propre sur
`Jury`, stepper propre sur `JuryCandidate`, master/queue/drawer sur `Selection`.

**Smell dominant.** Très peu — c'est la zone la mieux servie de la plateforme.

**Pistes de variation.**
- `Jury` → H-Cockpit-Split + L-Numbered-Hairline + M-Slide-Cards.
- `JuryCandidate` → H-Step-Pictogram + L-Compact-Table + M-Slide-Cards.
- `Selection` → H-Cockpit-Split + L-Compact-Table + M-Hairline-Reveal.

### 3.5 RSA legacy 2026 (post-Grande-Finale)

**Pages.** RsaAdmin, RsaDashboard, RsaJuryHub, RsaJuryView, RsaJuryForm,
RsaScore, RsaRecap, RsaFinaleResults, RsaFinaleRsvp.

**Signature actuelle.** Tous 1-2/5. Hex inline, pas de PageShell, hand-rolled
forms, secrets en clair, table hand-rolled.

**Smell dominant.** **Smell #10** — fork avec plateforme V2-V3. Décision à
prendre : deprecate ou aligner.

**Si conservées** (Phase 2 — décision PM, cf. blueprint §4) :
- `RsaJuryForm` → **Étape 0 sécurité** + H-Step-Pictogram + Field stack + M-Gold-Sweep.
- `RsaJuryHub` → quick-win tokens + L-Numbered-Hairline.
- `RsaJuryView` → quick-win tokens + L-Compact-Table + StatusPill.
- `RsaScore` → H-Cockpit-Split + L-Compact-Table + M-Slide-Cards.
- `RsaDashboard` → H-Cockpit-Split + L-Timeline groupée par J-x + M-Slide-Cards.
- `RsaAdmin` → H-Cockpit-Split + TabPill Élysée + URL state + M-Hairline-Reveal.
- `RsaRecap` → H-Index-Numeral (`Σ 47 dossiers`) + L-Compact-Table.
- `RsaFinaleResults` → H-Reveal-Curtain + L-Podium-Mosaic + M-Editorial-Veil.
- `RsaFinaleRsvp` → H-Form-Invitation + Field stack + retirer le Header local.

**Si deprecated** (recommandation pour V3) : retirer du `pages.config.js` et
`PAGES`, garder dans git history. Cf. blueprint §4.5.

### 3.6 Admin platform V2-V3

**Page.** Admin.jsx (router shell).

**Signature.** Router pur, pas un écran propre — délègue à `AdminShell` (V1
legacy), `MasterCockpit`, `ClubCockpit`. Ces sub-cockpits sont à auditer
séparément (hors ce doc).

### 3.7 Schisme architectural Finale/Sessions (cockpit admin)

**Surface.** `CompetitionEditView` > onglet `Finale` + onglet `Sessions`.

**Constat.** Le cockpit traite la **finale** comme une entité distincte d'une
**session**, alors qu'au niveau DB c'est juste `sessions.kind='finale'`. Deux
chemins parallèles construisent le même objet :

| Aspect | Onglet `Sessions` | Onglet `Finale` |
| ------ | ----------------- | --------------- |
| Création | `SessionsManager` → RPC `rsa_create_session` (`kind='qualifying'`) | `FinaleSessionRow` → `useCreateFinale` → RPC `rsa_create_session` (`kind='finale'`) |
| Config éditoriale | `session_config` jsonb (date, format, top-N) | `editions.finale_config` jsonb (date, format, top-N, lieu, jury_pool_size) — **redondant** |
| Flag | aucun | `editions.has_finale` boolean — **redondant avec l'existence d'une ligne `sessions` `kind='finale'`** |
| Lifecycle | StatusPill `draft/live/published` | Pas de pill cohérente |

**Smells dominants.** #1 (clone visuel de la grammaire de section) + un smell
hors-catalogue : **duplication de primitive**. L'UI laisse penser que la finale
est un module à part, ce qui :

- empêche la création d'une finale **interne de club** (cas V2.5+, un club qui
  veut sa propre finale en plus de ses sessions qualificatives) ;
- produit un crash silencieux au check de la case `has_finale` (le composant
  `FinaleManagement` se monte avec des hooks qui assument des données pas
  encore présentes — état local pas hydraté depuis `competition.has_finale` /
  `competition.finale_config`) ;
- alourdit le pilotage (`PilotageTab` doit lire `has_finale` au lieu de
  dériver depuis la liste des sessions).

**Action.** Fold l'onglet `Finale` dans `Sessions`. Cf.
[`blueprints/sessions-finale-unification.md`](../blueprints/sessions-finale-unification.md)
pour le plan détaillé (migration SQL, drawer kind-aware, dérivation du flag).

**Priorité.** Mid (pas event-critical, mais bloque la V2.5 multi-club et
masque un crash).

---

## 4. Quick-wins vs deep-refactor

### 4.1 Quick-wins (< 30 min / page)

Migration tokens, pas de restructuration.

| Page | Action | Impact |
| ---- | ------ | ------ |
| `RsaJuryHub` | Hex inline → imports tokens | tokens compliance |
| `RsaJuryView` | idem + ajouter StatusPill | tokens + smell #5 |
| `RsaScore` | idem | tokens compliance |
| `RsaDashboard` | idem + grouper checks par phase (eyebrow J-5/J-3/J-0) | tokens + smell #5 |
| `RsaRecap` | idem | tokens compliance |
| `RsaFinaleResults` | idem | tokens compliance |
| `RsaFinaleRsvp` | idem + retirer Header local | tokens + smell #6 |
| `StartupUpload` | idem + tokens session via map central | tokens + smell #4 |
| `RsaAdmin` | idem + TabPill | tokens + smell #5 |

**Total quick-wins** : ~5h.

### 4.2 Deep-refactor (1–4h / page)

Restructuration : nouveau hero, nouvelle list/grid, nouvelle signature micro.

| Page | Variante hero | Variante list | Signature micro | Estim. |
| ---- | ------------- | ------------- | --------------- | ------ |
| `RsaJuryForm` | H-Step-Pictogram | Field stack | M-Gold-Sweep | 3h (après sécu) |
| `RsaScore` | H-Cockpit-Split | L-Compact-Table | M-Slide-Cards | 3h |
| `RsaDashboard` | H-Cockpit-Split | L-Timeline groupée | M-Slide-Cards | 3h |
| `RsaAdmin` | H-Cockpit-Split | TabPill + sub-pages | M-Hairline-Reveal | 4h |
| `RsaFinaleResults` | H-Reveal-Curtain | L-Podium-Mosaic | M-Editorial-Veil | 3h |
| `RsaFinaleRsvp` | H-Form-Invitation | Field stack | M-Editorial-Veil | 2h |
| `Marketplace` | H-Index-Numeral | L-Featured-Mosaic | M-Slide-Cards | 3h |
| `Welcome` | H-Typo-Only role-aware | — | M-Editorial-Veil | 2h |
| `DevenirJury` | H-Vertical-Rule | — | M-Editorial-Veil | 1h |
| `StartupUpload` | H-Form-Invitation | Dropzone | M-Gold-Sweep | 2h |
| `MonDossier` | H-Vertical-Rule | L-Timeline | M-Gold-Sweep | 3h |
| `Candidater` | H-Step-Pictogram | L-Numbered-Hairline | M-Gold-Sweep | 1h |
| `Resultats` | H-Reveal-Curtain | L-Podium-Mosaic | M-Editorial-Veil | 2h |

**Total deep-refactor** : ~32h.

---

## 5. Sécurité avant design

Bloque toute autre intervention. **À faire en premier**.

| Page | Issue | Action |
| ---- | ----- | ------ |
| `RsaJuryForm` | Secrets Supabase inline (`SB_URL`, `SB_KEY`) | Migrer vers `import { supabase } from "@/lib/supabase"` — 1h |
| `RsaScore` | À vérifier | Grep `SB_URL`/`SB_KEY`/`eyJhbGciOi` — 15min |
| `RsaDashboard` | À vérifier | idem |
| `RsaJuryView` | À vérifier | idem |

---

## 6. Distance au système

| Catégorie | Pages | Couverture Élysée actuelle | Effort total | Risque |
| --------- | ----- | -------------------------- | ------------ | ------ |
| Vitrine RSA publique | 5 | 70 % (DevenirJury/Resultats/Candidater OK ; Concours/Marketplace mid) | ~9h | low |
| Auth + Hub post-auth | 2 | 90 % (Login + Welcome déjà Élysée) | ~2h | low |
| Funnel candidat | 3 | 60 % | ~8h | medium |
| Jury V2-V3 | 3 | 90 % | ~3h | low |
| RSA legacy 2026 | 9 | 25 % | ~25h | **high** (sécu + décision deprecate) |
| Admin platform | 1 | 100 % (router) | — | low |

**Total cible.** ~47h pour atteindre cible Élysée + anti-template 4/5 sur
toutes les pages C/D plateforme. Détail du séquencement → blueprint §5.

---

## Annexes

- Source de vérité pour la séparation lunch/plateforme : [`src/App.jsx:56-60`](../../src/App.jsx#L56-L60) (`LUNCH_PAGES` Set).
- Layout standalone (RSA platform pages without lunch chrome) : [`src/Layout.jsx:9`](../../src/Layout.jsx#L9) (`STANDALONE_PAGES`).
- Brand authority : [`elysee-designbook.md`](./elysee-designbook.md) §1–11.
- Tokens : [`tokens.js`](../../src/components/design/tokens.js) + [`tokens.app.js`](../../src/components/design/tokens.app.js).
- Catalogue de variantes : [`ui-patterns-catalog-generic.md`](./ui-patterns-catalog-generic.md) §16.
- Plan d'upgrade : [`design-upgrade-blueprint.md`](./design-upgrade-blueprint.md).
- Memory plateforme : `project_rsa_platform_rebuild.md`, `project_rsa_v3_b2b_pivot.md`.
