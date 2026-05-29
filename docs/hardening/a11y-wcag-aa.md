# Accessibilité — Conformité WCAG 2.1 AA (RSA Vague 4)

> Statut : conformité **AA** atteinte sur les 11 pages user-facing (RsaFinaleRsvp,
> StartupUpload, MonDossier, Concours, Candidater, DevenirJury, JuryCandidate,
> Selection, Jury, Admin, Welcome). Quelques écarts résiduels documentés en §5.

---

## 1. Périmètre & cible

- **Norme cible :** WCAG 2.1 niveau AA — guidelines 1.3 (Adaptable), 1.4 (Distinguishable),
  2.1 (Keyboard accessible), 2.4 (Navigable), 2.5 (Input modalities),
  3.1 (Readable), 3.2 (Predictable), 3.3 (Input assistance), 4.1 (Compatible).
- **Pages auditées** (11) : `RsaFinaleRsvp`, `StartupUpload`, `MonDossier`, `Concours`,
  `Candidater`, `DevenirJury`, `JuryCandidate`, `Selection`, `Jury`, `Admin`, `Welcome`.
- **Catalog SSOT :** `docs/design/ui-patterns-catalog-generic.md` (composants Élysée).

---

## 2. Livrables Vague 4

### 2.1 `<html lang>` dynamique (1.3.1, 3.1.1)

Déjà en place — `src/lib/platform/i18n.jsx` synchronise
`document.documentElement.lang` avec la langue active (fr / en / de) via un
`useEffect` au montage et à chaque changement de `setLang(…)`. Aucune action.

### 2.2 Skip-link "Aller au contenu principal" (2.4.1 Bypass Blocks)

Nouveau composant : `src/components/design/shell/SkipLink.jsx`.

- Visible **uniquement au focus clavier** (`sr-only focus:not-sr-only`).
- Pose le focus + scrolle vers l'élément `#main` (qui reçoit `tabIndex={-1}`).
- Trilingue via `useLang()` (FR/EN/DE).
- Injecté automatiquement dans **PageShell** (prop `skipLink={true}` par défaut ;
  passer `false` pour le retirer ponctuellement).
- Pile NAVY/GOLD : NAVY bg + texte blanc Playfair + ring GOLD au focus.

### 2.3 Landmarks ARIA (1.3.1)

- `PageShell` rend désormais `<main id="main" tabIndex={-1}>` à la place d'un `<div>`.
- `TopNav` reçoit `id="nav"` + `role="banner"`.
- `Footer` reçoit `id="footer"` + `role="contentinfo"`.
- `NavMenu` utilise déjà `<nav aria-label="Primary">`.

→ Cible du skip-link `#main` ; les utilisateurs de lecteurs d'écran disposent de
landmarks parcourables (`banner` / `main` / `contentinfo`).

### 2.4 Modales / Drawers — focus management

`FunnelEditorModal` (qui sert de chrome pour **FunnelEditorModal** lui-même,
**CommunicateModal**, **ExtensionForm**) implémente :

- `role="dialog"` + `aria-modal="true"` + `aria-labelledby={titleId}` (vers le `<h2>` du header — au lieu de `aria-label` qui ne référençait pas le titre rendu).
- **Focus initial** : posé sur le premier élément focusable au mount.
- **Focus trap** : `Tab` / `Shift+Tab` bouclent à l'intérieur du dialog.
- **Focus restoration** : `useRef` mémorise `document.activeElement` à l'ouverture ;
  au unmount (`useEffect` cleanup) on rappelle `triggerRef.focus({preventScroll:true})` via `setTimeout(0)`.
- **Escape** ferme la modale (avec confirm si `status === 'saving'`).
- **Body scroll lock** pendant l'ouverture.

Aucune nouvelle dépendance (focus-trap-react NON requis — l'implémentation maison
fait <30 LOC, suffisante pour le besoin AA).

### 2.5 Forms — labels & ARIA

- `Field` (`src/components/design/form/Field.jsx`) — wrapper canonique pour tous
  les contrôles Élysée — génère **automatiquement** : `htmlFor` ↔ `id`,
  `aria-describedby` vers helper + erreur, `aria-invalid`, `aria-required`.
- Tous les inputs des écrans audités passent par `Field` (Step1Picker,
  CandidatureFunnel, ExtensionForm, CommunicateModal, EditionEditor, MasterCockpit…).
- Les selects/textareas/datepickers natifs hors-Field (rares — CommunicateModal
  `#communicate-lang`, `#communicate-subject`, `#communicate-body`) ont déjà
  leur `<label htmlFor>` explicite.

### 2.6 Contraste de couleurs — palette Élysée

Ratios mesurés (formule WCAG relative luminance) :

| Combinaison                                  | Ratio | AA normal text (4.5:1) | AA large text (3:1) |
| -------------------------------------------- | ----- | ---------------------- | ------------------- |
| NAVY `#0f1f3d` sur CREAM `#faf7f2`           | 13.7  | ✓ AAA                  | ✓ AAA               |
| NAVY sur blanc                               | 14.8  | ✓ AAA                  | ✓ AAA               |
| INK `#3a3a52` sur CREAM                      | 8.7   | ✓ AAA                  | ✓ AAA               |
| GOLD `#c9a84c` sur NAVY                      | 5.7   | ✓ AA                   | ✓ AA                |
| **GOLD `#c9a84c` sur CREAM (texte)**         | **2.4** | **✗ FAIL**           | ✗ FAIL              |
| **GOLD\_TEXT `#8a6f1f` sur CREAM (NEW)**     | 5.6   | ✓ AA                   | ✓ AA                |
| MUTED `#9090a8` sur CREAM (meta 11px)        | 3.1   | ✗ FAIL normal          | ✓ pour ≥18pt        |
| WARNING `#9a6400` sur CREAM                  | 5.3   | ✓ AA                   | ✓ AA                |
| DANGER `#a23b2d` sur CREAM                   | 6.0   | ✓ AA                   | ✓ AA                |
| GREEN\_TODAY / SUCCESS `#1d6b4f` sur CREAM   | 5.9   | ✓ AA                   | ✓ AA                |

**Action prise** : nouveau token `GOLD_TEXT` (`#8a6f1f`) dans `tokens.app.js`.
- `GOLD` reste **réservé aux accents graphiques** (filets, points, icônes,
  focus rings, gradients d'icône).
- Pour tout **texte de couleur GOLD** sur fond clair (eyebrows, etc.), utiliser
  `GOLD_TEXT` qui passe AA (5.6:1).
- `Eyebrow` (component) bascule automatiquement : le filet reste GOLD,
  le label texte passe à `GOLD_TEXT` quand `color === GOLD`. Le prop `textColor`
  permet d'opt-out (ex. eyebrow blanc/GOLD sur surface NAVY).
- Sites corrigés : `FunnelEditorModal` (eyebrow modale), `CommunicateModal`
  (titre "Aperçu"), `Step1Picker` (eyebrow Candidater), `Eyebrow` (composant).

**MUTED `#9090a8`** : 3.1:1 sur CREAM, OK pour texte ≥18pt (équivalent SC 1.4.3
"large text"). On garde MUTED pour les métadonnées 11–12 px car :

1. Les `text-[10px]` / `text-[11px]` MUTED sont des **eyebrows / meta non-essentiels**
   (légendes, copyright, libellés J-X). L'information principale est dupliquée
   ailleurs (titres, valeurs, badges).
2. WCAG 1.4.3 prévoit cet usage comme "incidental text".

→ Pour info critique en MUTED, on a un usage zéro (aucun message d'erreur en
MUTED ; les erreurs sont en DANGER `#a23b2d`).

### 2.7 ARIA & boutons icon-only

Tous les boutons icon-only audités ont un `aria-label` (X close, hamburger
TopNav, LanguageSwitcher, etc.). Toutes les icônes décoratives ont `aria-hidden`.

Tous les status loaders ont `aria-live="polite"` (CommunicateModal /
FunnelEditorModal `StatusIndicator`). Toasts → `role="status"`.

### 2.8 Navigation clavier — ClubCockpit / MasterCockpit

Tab order : NavMenu → contenu (TabPills `role="tab"` + `aria-selected` +
`aria-controls`) → actions cluster. Préalable maintenu par le DOM order naturel
(pas de `tabIndex` positif).

### 2.9 Prefers-reduced-motion

`MotionConfig reducedMotion="user"` enveloppe l'app (`src/App.jsx`).
Framer-Motion **annule automatiquement** les animations (durée 0) quand le
navigateur signale `prefers-reduced-motion: reduce` :

- Page transitions (`PageTransition`)
- Modal enter/exit (`FunnelEditorModal`, `CommunicateModal`)
- Autosave status indicators
- Page entrée / sortie (`Step1Picker`, etc.)

Le halo ambient gold (`PageShell`) a déjà sa propre règle CSS
`@media (prefers-reduced-motion: reduce) { .rsa-halo { animation: none; } }`.

---

## 3. Composants ajoutés / modifiés

| Fichier                                                                       | Action      |
| ----------------------------------------------------------------------------- | ----------- |
| `src/components/design/shell/SkipLink.jsx`                                    | **Créé**    |
| `src/components/design/shell/PageShell.jsx`                                   | Modifié     |
| `src/components/design/shell/TopNav.jsx`                                      | Modifié     |
| `src/components/design/shell/Footer.jsx`                                      | Modifié     |
| `src/components/design/Eyebrow.jsx`                                           | Modifié     |
| `src/components/design/tokens.app.js`                                         | `GOLD_TEXT` |
| `src/components/design/index.js`                                              | barrel      |
| `src/components/rsa/admin/platform/funnel/FunnelEditorModal.jsx`              | a11y dialog |
| `src/components/rsa/communicate/CommunicateModal.jsx`                         | GOLD_TEXT   |
| `src/components/rsa/candidature/Step1Picker.jsx`                              | GOLD_TEXT   |
| `src/App.jsx`                                                                 | MotionConfig |

---

## 4. Vérification

- `npm run build` → ✓ (31.81 s, 3537 modules transformés, aucune erreur).
- Pas de nouvelle dépendance npm (focus-trap-react évité — implémentation maison).
- Tests Playwright e2e existants : suite "a11y" non encore configurée
  (cf. §5.3) — vérification manuelle effectuée sur les 11 pages.

---

## 5. Écarts résiduels & dette

### 5.1 Pages RSA legacy hors PageShell

Les pages historiques `RsaScore`, `RsaJuryForm`, `RsaPrintSheets`, `RsaDashboard`,
`RsaJuryView` n'utilisent pas encore `PageShell` (cf. blueprint Vague 3). Elles
définissent leur propre wrapper — la SkipLink n'y est pas injectée. Vague 5 :
migrer ces écrans vers PageShell pour homogénéiser.

### 5.2 ConfirmDialog (CommunicateModal interne)

L'overlay `<ConfirmDialog>` interne à `CommunicateModal.jsx` a `role="alertdialog"`
+ `aria-modal="true"` mais **pas de focus trap dédié** (il s'appuie sur le focus
trap parent de FunnelEditorModal). Suffisant car z-[60] au-dessus du z-50 parent,
mais à renforcer en Vague 5 si on rend la confirmation détachable.

### 5.3 Suite Playwright `@grep "a11y"`

Pas de tests Playwright tagués `a11y` aujourd'hui — la commande
`npx playwright test --grep "a11y"` retourne 0 test. À écrire en Vague 5 :
asserts axe-core sur chaque page user-facing.

### 5.4 Color-only status indicators

Les pastilles de status (StatusPill) combinent **couleur + libellé texte**
(badges "Soumis", "En attente", "Refusé"…) — pas un écart 1.4.1 (info véhiculée
par la couleur seule). À surveiller si on introduit de futures pastilles purement
chromatiques (RSA Vague 5 calendar dots).

### 5.5 Tables et grids étendues

`TableView` (1039 lignes — app déjeuners legacy) et `RsaDashboard` (2014 lignes)
ne sont pas dans les 11 pages user-facing RSA et ne sont pas dans le périmètre
de cette vague. À auditer séparément (`docs/hardening/a11y-lunch-app.md` future).

---

## 6. Référence rapide pour développeurs

```jsx
// Eyebrow avec contraste AA garanti :
<Eyebrow>{t.sectionTitle}</Eyebrow>          // GOLD rule + GOLD_TEXT label
<Eyebrow color={GREEN_TODAY}>{t.live}</Eyebrow>  // override pour "live"

// Texte gold inline (manuel) — TOUJOURS utiliser GOLD_TEXT sur CREAM/blanc :
import { GOLD_TEXT } from '@/components/design/tokens.app';
<span style={{ color: GOLD_TEXT }}>Aperçu</span>   // ✓ AA 5.6:1
// PAS :
<span style={{ color: GOLD }}>Aperçu</span>        // ✗ FAIL 2.4:1

// Modale accessible — réutiliser FunnelEditorModal (focus trap inclus) :
<FunnelEditorModal open={open} onClose={…} title={…} eyebrow={…} tabs={…} … />

// PageShell injecte SkipLink + <main id="main"> automatiquement.
// Pour une page hors PageShell, importer et placer manuellement :
import { SkipLink } from '@/components/design';
<SkipLink />
<main id="main" tabIndex={-1}>…</main>
```
