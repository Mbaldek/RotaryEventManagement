# Design Upgrade — Blueprint (app.rotary-startup.org)

> **Scope.** Plateforme RSA uniquement (22 pages). Les 12 pages lunch
> (`LUNCH_PAGES` dans [`src/App.jsx:56-60`](../../src/App.jsx#L56-L60)) sont
> hors scope.
>
> **Postulat central.** Le smell IA n'est **pas** dans le shell, les tokens ou
> la typo (le système Élysée est solide sur la plateforme). Il est dans la
> **répétition mécanique de la même séquence de blocs** sur 6 pages plateforme.
> Le correctif n'est pas "plus de polish" mais **plus de variation contrôlée** :
> grammaire de variantes par bloc + règle d'attribution + adjacence interdite.
>
> **Companion docs.**
> - Audit : [`design-upgrade-audit.md`](./design-upgrade-audit.md)
> - Catalogue de variantes : [`ui-patterns-catalog-generic.md §16`](./ui-patterns-catalog-generic.md#16-block-variant-grammar-anti-template)
> - Brand authority : [`elysee-designbook.md`](./elysee-designbook.md)
> - Build plan composants base : [`elysee-blueprint.md`](./elysee-blueprint.md)

---

## Table of contents

1. [La règle anti-template](#1-la-règle-anti-template)
2. [Grammaire de variantes (sommaire)](#2-grammaire-de-variantes-sommaire)
3. [Matrice d'attribution — page × variante](#3-matrice-dattribution--page--variante)
4. [Plans d'upgrade par page](#4-plans-dupgrade-par-page)
5. [Phasing & priorités](#5-phasing--priorités)
6. [Critères d'acceptation](#6-critères-dacceptation)
7. [Garde-fous (ESLint, tests visuels)](#7-garde-fous-eslint-tests-visuels)

---

## 1. Principe anti-template

### 1.1 L'idée

Le shell Élysée + tokens + typo donnent une **identité de marque** — c'est
voulu, ça doit rester homogène. L'effet "IA generated" naît quand l'**identité
de marque écrase la spécificité éditoriale de chaque page** : tout devient un
PageShell + Eyebrow + Title + Grid, et le user lit la même page trois fois de
suite.

L'approche dissocie deux couches :
- **Couche identité** (stable) : tokens, typo, focus ring, hairline, gold rule.
- **Couche éditoriale** (variée par page) : hero, section opener, list/grid,
  empty state, CTA, signature micro-interaction — choisie pour servir le
  contenu de la page.

### 1.2 Comment varier — sans dogme

Deux pages voisines (dans la nav ou dans un funnel) gagnent à avoir des
silhouettes distinctes. Si elles se retrouvent par réflexe avec le même
hero + même grid + même opener, c'est le signal pour piocher autre chose
dans le catalog §16 — ou inventer.

Ce n'est pas une règle dure : si deux pages voisines partagent
volontairement un trait (Login + Welcome avec H-Typo-Only pour marquer
"l'arrivée"), c'est un choix éditorial assumé, pas une violation.

### 1.3 Suggestions par bloc

Pour chaque page, six décisions à prendre (ou à sauter) :

| Bloc | Variantes au catalogue | Source |
| ---- | ---------------------- | ------ |
| Hero (`H-*`) | 9 (cf. §2.1) | catalog §16.1 |
| Section opener (`S-*`) | 5 (cf. §2.2) | catalog §16.2 |
| List/grid (`L-*`) | 7 (cf. §2.3) | catalog §16.3 |
| Empty/loading/error state (`E-*`) | 4 (cf. §2.4) | catalog §16.4 |
| CTA cluster (`C-*`) | 4 (cf. §2.5) | catalog §16.5 |

+ **1 signature micro-interaction** parmi 4 (`M-*`), souvent partagée par toutes
les pages d'un même funnel pour signaler la continuité, distincte d'un
funnel à l'autre.

### 1.4 À garder en tête

- **Hors catalog est bienvenu.** Si une page demande un hero ou une liste que
  le catalog §16 n'a pas, invente. Si la trouvaille est réutilisable, on la
  rapatrie ensuite dans le catalog pour les pages suivantes.
- **L'identité reste stable.** Tokens, focus ring, typo, gold rule — ces
  briques ne se variantisent pas.
- **La variation ne couvre pas la dette.** Coller un H-Form-Invitation à
  `StartupUpload` sans migrer les hex inline ne le rend pas Élysée — la
  conformité tokens et la variation éditoriale sont deux chantiers séparés.

---

## 2. Grammaire de variantes (sommaire)

Détail complet dans catalog §16. Ici, la table de référence pour assigner.

### 2.1 Hero variants (plateforme)

Pool réduit aux variantes pertinentes pour la plateforme (les variantes lunch
H-Map-Compass, H-Timeline-Year, H-Calendar-Lockup ont été retirées du pool ;
elles n'ont pas de page cible sur app.rotary-startup.org).

| Code | Nom | Description courte | Reference plateforme |
| ---- | --- | ------------------ | -------------------- |
| `H-Editorial` | Editorial centré | eyebrow + serif title + italic accent + intro `max-w-[60ch]` | `DevenirJury.jsx` (actuel) |
| `H-Typo-Only` | Typographic-only | giant serif lockup 80–120px, ligne italique, **pas d'image** | Login, Welcome refit |
| `H-Index-Numeral` | Index numéral | giant numeral tabular (1–999, 110–160px) + label | Marketplace refit, RsaRecap |
| `H-Ambient` | Ambient logo | logo qui respire + halo gold + pitch court | Concours |
| `H-Vertical-Rule` | Vertical rule | barre gold gauche 2px + texte stacké | DevenirJury refit, MonDossier |
| `H-Cockpit-Split` | Cockpit split | titre serif compact + KPI rail droit sticky | Jury, Selection, RsaScore, RsaAdmin |
| `H-Form-Invitation` | Invitation letter | eyebrow + serif + accent gold + date introduisant un form | StartupUpload, RsaFinaleRsvp |
| `H-Reveal-Curtain` | Reveal curtain | voile CREAM se lève en 600ms, giant rank | Resultats, RsaFinaleResults |
| `H-Step-Pictogram` | Step pictogram | step number (`01 / 03`) + serif title + intro | Candidater, JuryCandidate, RsaJuryForm |

### 2.2 Section opener variants

| Code | Nom | Description courte |
| ---- | --- | ------------------ |
| `S-Gold-Rule` | Gold rule + eyebrow | barre 28×1.5 GOLD + eyebrow tracked |
| `S-Numbered` | Numérotée | `01 — Préparation`, `02 — Sélection`, en serif tabular |
| `S-Verb-Led` | Verb-led | verbe à l'impératif en eyebrow (`AGISSEZ`, `RÉFLÉCHISSEZ`) |
| `S-Date-Stamp` | Date stamp | `J-12 · 17 mai 2026` en serif, jalon dans un funnel |
| `S-Quiet` | Quiet | titre serif `sm` sans eyebrow, hairline simple |

### 2.3 List/grid variants

| Code | Nom | Description courte |
| ---- | --- | ------------------ |
| `L-Numbered-Hairline` | Numbered hairline | rows numérotées 01/N, hairline entre, eyebrow gold sur hover |
| `L-Card-Grid` | Card grid 2/3 cols | grille uniforme — **à éviter par défaut** |
| `L-Editorial-Pair` | Editorial pair | alternance gauche/droite avec image 1/3 + texte 2/3 |
| `L-Mosaic` | Mosaic asymétrique | 1 carte hero 2/3 + 2 cartes 1/3 + N rows |
| `L-Timeline` | Timeline | vertical hairline + dates avec jalon gold |
| `L-Compact-Table` | Compact table | DataTable Élysée density `compact` |
| `L-Podium-Mosaic` | Podium reveal | 3 grandes cards 1/2/3 + table collapse |

### 2.4 Empty / loading / error state variants

| Code | Description |
| ---- | ----------- |
| `E-Quiet-Line` | une ligne serif italique muted, pas de bordure |
| `E-Hairline-Card` | card dashed CREAM2 + icon MUTED + serif title + intro + CTA |
| `E-Editorial-Letter` | "Aucun dossier encore." en serif italique grand format |
| `E-Diagnostic` | Alert tone="danger" + details collapsible (pour les erreurs) |

### 2.5 CTA cluster variants

| Code | Description |
| ---- | ----------- |
| `C-Single-Primary` | un seul bouton NAVY |
| `C-Pair-Primary-Ghost` | bouton NAVY + ghost text à droite |
| `C-Triplet-Layered` | NAVY + outline + ghost (3 niveaux d'engagement) |
| `C-Inline-Editorial` | CTA fondu dans la prose ("→ Postulez ici" GOLD avec underline animé) |

### 2.6 Signature micro-interactions

| Code | Description | Archétype cible |
| ---- | ----------- | --------------- |
| `M-Editorial-Veil` | voile CREAM 0.6 → 0 en 600ms au mount + stagger sections 80ms | Vitrine RSA, public-facing event |
| `M-Gold-Sweep` | barre gold scaleX 0→1 + texte y 4→0 à chaque transition d'étape | Funnel candidat |
| `M-Slide-Cards` | KPI/cards y 12→0, stagger 60ms, easing rigide | Cockpit jury, scoring |
| `M-Hairline-Reveal` | hairline scaleX 0→1 left-origin 400ms + items fade sur le passage | Admin queue, comité |

---

## 3. Suggestions d'attribution — page × variante

22 pages plateforme. Chaque ligne propose un point de départ — combo qui sert
*a priori* l'intent de la page et la distingue de ses voisines. À **adapter**
quand l'éditorial appelle autre chose (ou à inventer hors catalog).

### 3.1 Vitrine RSA publique (groupe TopNav 1)

| Page | Hero | Opener | List/grid | Empty | CTA | Micro |
| ---- | ---- | ------ | --------- | ----- | --- | ----- |
| `Concours` | H-Ambient | S-Date-Stamp | L-Mosaic | E-Hairline-Card | C-Single-Primary | M-Editorial-Veil |
| `Candidater` | H-Step-Pictogram | S-Numbered | L-Numbered-Hairline | E-Hairline-Card | C-Single-Primary | M-Gold-Sweep |
| `DevenirJury` | H-Vertical-Rule | S-Verb-Led | L-Numbered-Hairline | E-Quiet-Line | C-Pair-Primary-Ghost | M-Editorial-Veil |
| `Resultats` | H-Reveal-Curtain | S-Gold-Rule | L-Podium-Mosaic | E-Editorial-Letter | C-Inline-Editorial | M-Editorial-Veil |
| `Marketplace` | H-Index-Numeral *(`27 extensions`)* | S-Verb-Led | L-Mosaic | E-Hairline-Card | C-Triplet-Layered | M-Slide-Cards |

Note : Candidater = funnel donc bascule en `M-Gold-Sweep` (rupture délibérée vs
ses voisines vitrine pour signaler "ici on agit, on ne lit plus").

### 3.2 Auth & post-auth hub

| Page | Hero | Opener | List/grid | Empty | CTA | Micro |
| ---- | ---- | ------ | --------- | ----- | --- | ----- |
| `Login` | H-Typo-Only | S-Quiet | — | E-Quiet-Line | C-Single-Primary | M-Editorial-Veil |
| `Welcome` | H-Typo-Only *(role-aware)* | S-Quiet | — | E-Editorial-Letter | C-Single-Primary | M-Editorial-Veil |

**Continuité assumée** : Login → Welcome partagent H-Typo-Only +
S-Quiet + M-Editorial-Veil. La continuité visuelle "entrée → hub" est ici
intentionnelle : le rôle éditorial est jumeau ("le moment d'arrivée"). On
garde le combo.

### 3.3 Funnel candidat (auth)

| Page | Hero | Opener | List/grid | Empty | CTA | Micro |
| ---- | ---- | ------ | --------- | ----- | --- | ----- |
| `Candidater` *(repris)* | H-Step-Pictogram | S-Numbered | L-Numbered-Hairline | E-Hairline-Card | C-Single-Primary | M-Gold-Sweep |
| `StartupUpload` | H-Form-Invitation | S-Date-Stamp | — (Dropzone + Field stack) | E-Diagnostic | C-Pair-Primary-Ghost | M-Gold-Sweep |
| `MonDossier` | H-Vertical-Rule *(role-aware)* | S-Quiet | L-Timeline (états dossier) | E-Editorial-Letter | C-Triplet-Layered | M-Gold-Sweep |

Toutes partagent `M-Gold-Sweep` — c'est voulu (signature funnel candidat),
c'est ce qui les **lie**.

### 3.4 Hub jury V2-V3 (auth)

| Page | Hero | Opener | List/grid | Empty | CTA | Micro |
| ---- | ---- | ------ | --------- | ----- | --- | ----- |
| `Jury` | H-Cockpit-Split | S-Gold-Rule | L-Numbered-Hairline | E-Hairline-Card | C-Single-Primary | M-Slide-Cards |
| `JuryCandidate` | H-Step-Pictogram | S-Numbered | L-Compact-Table | E-Quiet-Line | C-Pair-Primary-Ghost | M-Slide-Cards |
| `Selection` | H-Cockpit-Split | S-Date-Stamp | L-Compact-Table | E-Quiet-Line | C-Pair-Primary-Ghost | M-Hairline-Reveal |

Note : Selection partage `H-Cockpit-Split` avec Jury — mais bascule en
`M-Hairline-Reveal` (signature admin) car Selection est côté comité, pas jury.
Le rythme reste lisible côte à côte.

### 3.5 Admin platform (auth)

| Page | Hero | Opener | List/grid | Empty | CTA | Micro |
| ---- | ---- | ------ | --------- | ----- | --- | ----- |
| `Admin` | (router — pas d'écran propre) |

### 3.6 RSA legacy 2026 (auth ou token-gated)

| Page | Hero | Opener | List/grid | Empty | CTA | Micro |
| ---- | ---- | ------ | --------- | ----- | --- | ----- |
| `RsaAdmin` | H-Cockpit-Split | S-Date-Stamp | TabPills + sub-pages | — | C-Single-Primary | M-Hairline-Reveal |
| `RsaDashboard` | H-Cockpit-Split | S-Numbered (J-5/J-3/J-0) | L-Timeline groupée | E-Quiet-Line | C-Single-Primary | M-Slide-Cards |
| `RsaJuryHub` | H-Vertical-Rule | S-Date-Stamp | L-Numbered-Hairline | E-Hairline-Card | C-Single-Primary | M-Slide-Cards |
| `RsaJuryView` | H-Cockpit-Split | S-Gold-Rule | L-Compact-Table | E-Quiet-Line | C-Pair-Primary-Ghost | M-Hairline-Reveal |
| `RsaJuryForm` | H-Step-Pictogram | S-Numbered | (Field stack) | E-Diagnostic | C-Single-Primary | M-Gold-Sweep |
| `RsaScore` | H-Cockpit-Split | S-Date-Stamp | L-Compact-Table | E-Diagnostic | C-Triplet-Layered | M-Slide-Cards |
| `RsaRecap` | H-Index-Numeral (`Σ 47 dossiers`) | S-Gold-Rule | L-Compact-Table | E-Quiet-Line | C-Pair-Primary-Ghost | M-Hairline-Reveal |
| `RsaFinaleResults` | H-Reveal-Curtain | S-Quiet | L-Podium-Mosaic | E-Editorial-Letter | C-Inline-Editorial | M-Editorial-Veil |
| `RsaFinaleRsvp` | H-Form-Invitation | S-Date-Stamp | (Field stack) | E-Diagnostic | C-Single-Primary | M-Editorial-Veil |

Note : RsaFinaleResults + RsaFinaleRsvp basculent en `M-Editorial-Veil`
(événement public) — rupture délibérée vs le reste RSA legacy admin.

---

## 4. Plans d'upgrade par page

Format : **🎯 Cible** → **🧱 Build** → **❌ Remove** → **✓ Acceptance**.

### 4.1 `RsaJuryForm.jsx` — URGENT (sécu + design)

⚠️ **Étape 0 (sécurité)** : retirer `SB_URL` / `SB_KEY` en clair. Migrer vers
`import { supabase } from "@/lib/supabase"`. **À faire avant tout le reste**.

🎯 H-Step-Pictogram + S-Numbered + Field stack + E-Diagnostic + C-Single-Primary
+ M-Gold-Sweep.

🧱 Build.
- `PageShell width="narrow"` + Field Élysée + Dropzone pour photo.
- Eyebrow `INSCRIPTION JURY` + étape (`01 / 04`).

❌ Remove. Tous les `const NAVY = "#…"` locaux. Le hand-rolled form. Secrets.

✓ Acceptance.
- 0 secret hardcodé (grep `eyJhbGciOi` → 0 hit).
- 0 hex inline.
- PageShell présent.

---

### 4.2 `RsaScore.jsx`

🎯 H-Cockpit-Split + S-Date-Stamp + L-Compact-Table + E-Diagnostic +
C-Triplet-Layered + M-Slide-Cards.

🧱 Build.
- `PageShell width="wide"` + KPI rail droit (`N startups · M scores · K jury connectés`).
- StatusPill draft/live/locked/published dans le header.
- StartupScoreCard reskinnée — 6 critères collapsibles avec slider 0-5.

❌ Remove. Hex inline. StartupScoreCard répétitif sans hiérarchie d'état.

✓ Acceptance.
- StatusPill visible.
- 0 hex inline.
- État draft/live/locked/published visuellement distinct.

---

### 4.3 `RsaDashboard.jsx`

🎯 H-Cockpit-Split + S-Numbered (J-5/J-3/J-0) + L-Timeline groupée + E-Quiet-Line
+ C-Single-Primary + M-Slide-Cards.

🧱 Build.
- `PageShell width="wide"` + Cockpit-Split (`16 checks · 12 done`).
- L-Timeline groupée par phase J-x avec eyebrow numérotée `01 — J-5`,
  `02 — J-3`, `03 — J-1`, `04 — J-0`.
- Checkbox Élysée (CREAM2 → GOLD check).

❌ Remove. Tasks flat. Hex inline.

✓ Acceptance.
- Groupement par phase visible.
- 0 hex inline.

---

### 4.4 `RsaAdmin.jsx`

🎯 H-Cockpit-Split + S-Date-Stamp + TabPills + — + C-Single-Primary +
M-Hairline-Reveal.

🧱 Build.
- `PageShell width="wide"` + TopNav.
- TabPills Élysée (catalog §3.2) : Setup / Decks / Live / Results / Finale,
  état URL (`?tab=…`).
- Cockpit header avec date édition (`ÉDITION 2026 · J-3`).

❌ Remove. Tab-switcher plat. Pas de PageShell. Gate password local (à
remplacer par PlatformAuth).

✓ Acceptance.
- TabPills + URL state OK.
- PageShell présent.
- 0 password en clair.

---

### 4.5 `RsaFinaleResults.jsx`

🎯 H-Reveal-Curtain + S-Quiet + L-Podium-Mosaic + E-Editorial-Letter +
C-Inline-Editorial + M-Editorial-Veil.

🧱 Build.
- Hero `H-Reveal-Curtain` : au mount, voile CREAM 0.6 → 0 sur 600ms révélant
  l'eyebrow `GRANDE FINALE 2026` + giant rank "OR · ARGENT · BRONZE".
- L-Podium-Mosaic : 3 grandes cards podium (1er au centre 2× plus grand) +
  table collapse pour rangs 4-N.
- Auto-update via Supabase Realtime (pattern existant).

❌ Remove. Ranking-table monotone identique à `RsaRecap`. Hex inline.

✓ Acceptance.
- Podium visuel ≠ vue Recap (silhouettes différentes côte à côte).
- Voile mount-only en 600ms.

---

### 4.6 `RsaFinaleRsvp.jsx`

🎯 H-Form-Invitation + S-Date-Stamp + Field stack + E-Diagnostic +
C-Single-Primary + M-Editorial-Veil.

🧱 Build.
- Hero `H-Form-Invitation` : eyebrow `INVITATION` + serif "RSVP — Grande
  Finale" + accent gold + `Mardi 26 mai 2026 · 16h–19h · Cyrus Conseil` en
  serif italique.
- Role select : pas radio cards colorées. 3 lignes éditoriales hairline
  séparées avec eyebrow GOLD + label NAVY + meta INK.
- TopNav unique (supprimer le Header local sticky navy ligne 742).

❌ Remove. Header local. Radio cards avec couleurs inline par rôle.

✓ Acceptance.
- TopNav unique (1 seul lang switcher dans le DOM).
- 3 rôles présentés en lignes éditoriales (pas cards radios colorées).

---

### 4.7 `Marketplace.jsx`

🎯 H-Index-Numeral (`27 extensions`) + S-Verb-Led + L-Mosaic + E-Hairline-Card
+ C-Triplet-Layered + M-Slide-Cards.

🧱 Build.
- Hero : giant "27" tabular + label `EXTENSIONS` + intro `Étendez votre programme`.
- L-Mosaic : 1 extension featured (carte 2/3, image + accent gold long) + 4
  cartes 1/3.
- Opener `ÉTENDEZ` verb-led.

❌ Remove. Grille uniforme actuelle.

✓ Acceptance.
- Une carte featured visuellement distincte des autres.

---

### 4.8 `Welcome.jsx`

🎯 H-Typo-Only + S-Quiet + — + E-Editorial-Letter + C-Single-Primary +
M-Editorial-Veil.

🧱 Build.
- Hero giant serif `Bonjour, Mathieu.` en 90-110px sur fond CREAM. Sous-ligne
  italique `Voici votre tableau.`
- Role-aware copy : startup, jury, comité, admin → 4 italic lines différentes.
- CTA single primary `→ Accédez à votre dossier` (ou jury / admin selon rôle).

❌ Remove. Stats actuelles (StatCell, AnimatedNumber).

✓ Acceptance.
- Pas de KPI, pas de grid sur Welcome.
- Hero giant serif visible avant le fold.

---

### 4.9 `DevenirJury.jsx`

🎯 H-Vertical-Rule + S-Verb-Led + L-Numbered-Hairline + E-Quiet-Line +
C-Pair-Primary-Ghost + M-Editorial-Veil.

🧱 Build.
- Hero `H-Vertical-Rule` : barre gold 2px à 24px du bord gauche, à sa droite
  eyebrow `MISSION JURY 2026` + serif `Devenez juge` (italic accent : `d'un
  programme international`) + meta MUTED `7 sessions · ~3h d'engagement`.
- Section openers verb-led : `ENGAGEZ-VOUS`, `RENCONTREZ`, `ÉVALUEZ`.
- L-Numbered-Hairline pour les "Sessions à juger".

❌ Remove. Le clone visuel de `Candidater` (même séquence eyebrow-title-intro).

✓ Acceptance.
- Placée à côté de `Candidater`, silhouette différente (vertical rule vs step pictogram).

---

### 4.10 `StartupUpload.jsx`

🎯 H-Form-Invitation + S-Date-Stamp + Dropzone + Field stack + E-Diagnostic +
C-Pair-Primary-Ghost + M-Gold-Sweep.

🧱 Build.
- `PageShell width="narrow"`.
- Hero `H-Form-Invitation` : eyebrow `DOSSIER 2026` + serif "Téléchargez votre
  deck" + accent gold + meta session (`Session 3 · FoodTech · J-12`).
- Dropzone Élysée (existe).
- Couleur session = via `getSessionColor(sessionId)` (map central), pas inline.

❌ Remove. Hex inline. Color injection inline par session.

✓ Acceptance.
- 0 hex inline.
- Couleur session dérivée d'un helper central.

---

### 4.11 `MonDossier.jsx`

🎯 H-Vertical-Rule + S-Quiet + L-Timeline + E-Editorial-Letter + C-Triplet-Layered
+ M-Gold-Sweep.

🧱 Build.
- Hero `H-Vertical-Rule` role-aware : barre gold + eyebrow `MON DOSSIER` +
  serif `{startup.name}` + meta MUTED (statut + date).
- L-Timeline : états dossier (Soumis → Éligibilité → Comité → Sélection → Finale)
  avec jalon gold sur l'état courant.
- CTA Triplet : `Modifier le deck` (primary) + `Voir mes scores` (outline) +
  `Quitter le programme` (ghost danger).

❌ Remove. CandidatureTracking si redondant.

✓ Acceptance.
- L-Timeline visible.
- Pas de KPI grid redondante avec Welcome.

---

### 4.12 `Candidater.jsx`

🎯 H-Step-Pictogram + S-Numbered + L-Numbered-Hairline + E-Hairline-Card +
C-Single-Primary + M-Gold-Sweep.

🧱 Build.
- Hero `H-Step-Pictogram` : `01 / 03` tabular + serif `Postulez au programme` +
  intro.
- L-Numbered-Hairline pour OpenCompetitions.

❌ Remove. Hero clone de DevenirJury.

✓ Acceptance.
- Step pictogram visible.
- Côte à côte avec DevenirJury : silhouettes distinctes.

---

### 4.13 `Concours.jsx`

🎯 H-Ambient + S-Date-Stamp + L-Mosaic + E-Hairline-Card + C-Single-Primary +
M-Editorial-Veil.

🧱 Build.
- Audit `ConcoursHero` — s'il est déjà H-Ambient OK ; sinon refit.
- ClubSection L-Mosaic : 1 session featured (la prochaine) + grid des autres.

❌ (à confirmer après audit sub-composants).

✓ Acceptance.
- 1 session featured ≠ autres visuellement.

---

### 4.14 `Resultats.jsx`

🎯 H-Reveal-Curtain + S-Gold-Rule + L-Podium-Mosaic + E-Editorial-Letter +
C-Inline-Editorial + M-Editorial-Veil.

🧱 Build.
- Lift de `H-Reveal-Curtain` depuis le pattern Finale.
- L-Podium-Mosaic 3+N pour le palmarès.
- CTA inline éditorial `→ Découvrez chaque lauréate`.

❌ Remove. Hero éditorial centré actuel.

✓ Acceptance.
- Voile mount-only.
- Podium ≠ table monotone.

---

### 4.15 Pages plateforme déjà 4-5/5 — variation seulement

`Login`, `Jury`, `JuryCandidate`, `Selection`, `Admin`.

Pas de refit lourd. Vérifier matrice §3 et appliquer **uniquement les
changements qui les distinguent** :
- `Login` → H-Typo-Only (au lieu du MagicLinkLogin embed sans hero éditorial). Effort ~1h.
- `Jury` → H-Cockpit-Split + KPI rail. Effort ~1h.
- `JuryCandidate` → S-Numbered + L-Compact-Table pour les sessions assignées. Effort ~1h.
- `Selection` → ajouter signature `M-Hairline-Reveal`. Effort ~30min.

---

### 4.16 RSA legacy — décision deprecate ou aligner

Audit confirme que les pages `RsaJuryHub`, `RsaJuryView`, `RsaJuryForm`,
`RsaScore`, `RsaDashboard`, `RsaRecap`, `RsaFinaleResults`, `RsaFinaleRsvp`,
`RsaAdmin` font partie du V1 monoclub 2026. La Grande Finale du 26 mai 2026
est passée ; reconstruction plateforme RSA en cours
(memory `project_rsa_platform_rebuild.md`).

**Recommandation :**

| Page | Statut | Action |
| ---- | ------ | ------ |
| `RsaJuryForm` | **Sécu d'abord** | Étape 0 sécu (1h), puis décision deprecate |
| `RsaJuryHub`, `RsaJuryView` | Garder en attendant V3 | Quick-win tokens (2h total) |
| `RsaScore`, `RsaDashboard`, `RsaAdmin` | Garder, aligner | Deep refactor (10h total) — utiles tant que V3 jury n'est pas livré |
| `RsaRecap`, `RsaFinaleResults`, `RsaFinaleRsvp` | Garder pour réutilisation 2027 | Refit complet (8h total) |

**À discuter avec PM avant toute deprecation.**

### 4.17 Cockpit admin — Finale fold into SessionsTab

**Surface.** `CompetitionEditView` (master/competition cockpit). Pas une page,
une architecture d'onglets.

**Constat (audit [§3.7](./design-upgrade-audit.md#37-schisme-architectural-finalesessions-cockpit-admin)).**
L'onglet `Finale` duplique la primitive « session » avec son propre flag
(`editions.has_finale`), sa propre config (`editions.finale_config`) et son
propre formulaire de création (`FinaleSessionRow` + `useCreateFinale`). C'est
juste `sessions.kind='finale'` au final.

**Cible.** Drop l'onglet `Finale`. Le bandeau « Grande Finale » s'affiche en
tête de `SessionsTab` ; sa création passe par le même `SessionsManager` que
les sessions qualificatives (avec `kind='finale'`, `club_id=null` pré-remplis).
Le drawer d'une session de `kind='finale'` montre les blocs bonus (pool,
champions, sources) en accordéon — pas en onglet séparé. Cf. pattern
[`D-K` au catalog §5.9](./ui-patterns-catalog-generic.md#59-kind-aware-session-detail-drawer).

**Pourquoi ici plutôt qu'en feature blueprint pur.** L'évolution est portée
par le **principe anti-template** : deux UIs (Sessions + Finale) qui font la
même chose, à un kind près, sont une réplique inutile. La fusion est autant
une décision design qu'archi.

**Variantes / patterns mobilisés :**
- Liste : `L-Grouped-Hairline` (groupes : Grande Finale → puis 1 groupe par
  club).
- Empty state Grande Finale : `E-CTA-Inline` (« Aucune grande finale planifiée
  — *Créer* »).
- Détail : drawer kind-aware `D-K` (catalog §5.9).
- Micro : `M-Hairline-Reveal` sur l'ouverture des blocs bonus.

**Plan détaillé** (migration SQL, ordre code/schema, critères d'acceptation,
risques) : [`blueprints/sessions-finale-unification.md`](../blueprints/sessions-finale-unification.md).

**Estim.** 5h30 (4h code + 1h SQL + 30 min cleanup). À planifier après
stabilisation V2.

---

## 5. Phasing & priorités

### Phase 0 — Sécurité (avant tout) · 2h

| # | Tâche | Page |
| - | ----- | ---- |
| 0.1 | Migrer secrets Supabase → `@/lib/supabase` | `RsaJuryForm` |
| 0.2 | Grep `eyJhbGciOi` / `SB_URL` / `SB_KEY` sur tout `src/pages/` et `src/components/rsa/` | (vérification) |

### Phase 1 — Variation des 4 pages "déjà Élysée" voisines · ~6h

But : casser l'effet template entre les pages vitrine RSA adjacentes.

| # | Page | Effort |
| - | ---- | ------ |
| 1.1 | `Welcome` H-Typo-Only role-aware | 2h |
| 1.2 | `DevenirJury` H-Vertical-Rule | 1h |
| 1.3 | `Candidater` H-Step-Pictogram + S-Numbered | 1h |
| 1.4 | `Resultats` H-Reveal-Curtain + L-Podium-Mosaic | 2h |

### Phase 2 — Refit pages plateforme tokens-hardcodés · ~10h

| # | Page | Effort |
| - | ---- | ------ |
| 2.1 | `StartupUpload` migration tokens + H-Form-Invitation | 2h |
| 2.2 | `MonDossier` H-Vertical-Rule + L-Timeline | 3h |
| 2.3 | `Marketplace` H-Index-Numeral + L-Mosaic | 3h |
| 2.4 | `Login` H-Typo-Only | 1h |
| 2.5 | `Jury` H-Cockpit-Split | 1h |

### Phase 3 — RSA legacy refit · ~16h

| # | Page | Effort |
| - | ---- | ------ |
| 3.1 | `RsaJuryHub` quick-win tokens | 1h |
| 3.2 | `RsaJuryView` quick-win tokens + StatusPill | 1h |
| 3.3 | `RsaScore` H-Cockpit-Split | 3h |
| 3.4 | `RsaDashboard` H-Cockpit-Split + L-Timeline groupée | 3h |
| 3.5 | `RsaAdmin` H-Cockpit-Split + TabPill | 4h |
| 3.6 | `RsaFinaleResults` H-Reveal-Curtain | 2h |
| 3.7 | `RsaFinaleRsvp` H-Form-Invitation | 2h |

### Phase 4 — Composants à extraire pour le catalogue · ~6h

| # | Tâche | Effort |
| - | ----- | ------ |
| 4.1 | Extraire `Hero/Editorial.jsx` + `Hero/TypoOnly.jsx` + `Hero/IndexNumeral.jsx` | 2h |
| 4.2 | Extraire `Hero/CockpitSplit.jsx` + `Hero/FormInvitation.jsx` + `Hero/RevealCurtain.jsx` + `Hero/StepPictogram.jsx` + `Hero/VerticalRule.jsx` | 3h |
| 4.3 | Extraire `List/PodiumMosaic.jsx` | 1h |

### Phase 5 — Garde-fous · ~2h

| # | Tâche | Effort |
| - | ----- | ------ |
| 5.1 | ESLint custom rule : forbid hex inline en `src/pages/` | 1h |
| 5.2 | ESLint no-restricted-imports sur `@/components/ui/{card,button}` dans pages plateforme | 1h |

**Total estimé. ~42h** (vs ~47h dans l'audit — phases serrées).

---

## 6. Critères d'acceptation

### 6.1 Conformité Élysée
- [ ] `import { … } from "@/components/design"` présent, **0 hex inline** dans
  le fichier (sauf tokens.js).
- [ ] `<PageShell>` utilisé.
- [ ] `<TopNav>` unique dans le DOM.
- [ ] Focus ring GOLD sur tout élément interactif.

### 6.2 Anti-template (indicateurs)
- [ ] La page a une silhouette **distincte** de ses voisines TopNav / funnel
  (on les voit côte à côte, on ne les confond pas).
- [ ] Les blocs principaux (hero, list/grid, opener) ne sont pas tous au
  réflexe par défaut — l'un d'eux au moins exprime un choix éditorial spécifique
  à cette page.
- [ ] La signature micro-interaction sert l'archétype (funnel = sweep, vitrine
  = veil, cockpit = slide, admin = hairline) — ou diverge volontairement.
- [ ] Une ligne de commentaire en tête de fichier documente le combo choisi
  (hero / micro / raison) pour le prochain qui passe.

### 6.3 Accessibilité
- [ ] `prefers-reduced-motion` respecté.
- [ ] Tous les inputs encapsulés dans `<Field>`.
- [ ] Contraste AA.
- [ ] Touch targets ≥ 44px sur mobile.

### 6.4 Performance
- [ ] Aucun composant > 800 lignes.
- [ ] Lazy-load (déjà fait via React.lazy dans `pages.config.js`).
- [ ] React Query staleTime conforme catalog §11.3.

### 6.5 Test visuel
- [ ] Côte à côte avec la page précédente dans la nav : silhouettes
  visuellement distinctes.
- [ ] Côte à côte avec la page suivante : idem.
- [ ] Screenshot mobile 375 + tablet 768 + desktop 1280.

---

## 7. Garde-fous (ESLint, tests visuels)

### 7.1 ESLint custom — interdire hex inline

```js
// eslint-plugin-elysee/no-inline-hex.js
module.exports = {
  meta: { type: "problem", docs: { description: "Use design tokens, not inline hex" } },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value === "string" && /^#[0-9a-f]{3,8}$/i.test(node.value)) {
          const file = context.getFilename();
          if (file.includes("/components/design/tokens")) return;
          context.report({ node, message: "Hex literal forbidden — import from @/components/design" });
        }
      },
    };
  },
};
```

Activer sur `src/pages/**` et `src/components/rsa/**`.

### 7.2 ESLint — interdire shadcn Card/Button dans pages plateforme

```js
"no-restricted-imports": ["error", {
  patterns: [{
    group: ["@/components/ui/card", "@/components/ui/button", "@/components/ui/input"],
    message: "Use @/components/design primitives instead.",
  }],
}]
```

Allowlist : pages lunch (12 pages dans `LUNCH_PAGES`) exemptées tant qu'elles
n'ont pas migré.

### 7.3 Test visuel — adjacency snapshot (optionnel)

Si l'effort vaut le coup à terme : pour chaque paire de pages voisines
plateforme, screenshot 1280×800 + comparer histograms NAVY/GOLD. Une
similarité > 75 % flag la page pour relook. Outil naturel : Playwright +
pixelmatch dans `tests/visual/adjacency.spec.ts`. **Non bloquant** — c'est
un outil de revue, pas un gate CI.

---

## Annexes

- Variantes détaillées (recettes JSX) : [`ui-patterns-catalog-generic.md §16`](./ui-patterns-catalog-generic.md#16-block-variant-grammar-anti-template).
- Audit complet : [`design-upgrade-audit.md`](./design-upgrade-audit.md).
- Brand authority : [`elysee-designbook.md`](./elysee-designbook.md).
- Composants existants : [`src/components/design/`](../../src/components/design/).
- Source séparation lunch/plateforme : [`src/App.jsx:56-60`](../../src/App.jsx#L56-L60).
- Memory : `project_rsa_platform_rebuild.md`, `project_rsa_v3_b2b_pivot.md`,
  `project_design_upgrade_trilogy.md`.
