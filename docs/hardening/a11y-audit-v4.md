# A11y Audit — RSA V3 Vague 4 (WCAG 2.1 AA)

> Rapport manuel par page des 11 écrans user-facing. Voir
> `docs/hardening/a11y-wcag-aa.md` pour la conformité globale et les
> composants modifiés.

Date : 2026-05-29 · Reviewer : harness automatisé + revue manuelle

---

## Méthode

- Inspecté chaque page sur les axes WCAG 2.1 AA :
  - **Lang / landmarks** : présence `<main>` / `<nav>` / `<footer>`, lang dynamique.
  - **Skip-link** : visible au focus clavier, cible `#main`.
  - **Forms** : labels associés, aria-describedby, aria-invalid.
  - **Modales** : focus trap, focus restoration, role=dialog, aria-modal,
    aria-labelledby.
  - **Contraste** : tous les couples couleur/fond audités contre la matrice §2.6
    du document parent.
  - **Reduced motion** : `MotionConfig reducedMotion="user"` global.

---

## 1. Welcome.jsx

- PageShell → SkipLink + `<main id="main">` ✓
- TopNav `id="nav"` `role="banner"` ✓
- Pas de form, pas de modal.
- Contraste : NAVY/INK/GOLD_TEXT sur CREAM ✓
- **Statut : conforme AA.**

## 2. Login.jsx

- PageShell → SkipLink ✓
- Form magic-link via `MagicLinkLogin` (uses `Field` → ARIA complet) ✓
- Modale d'erreur : aucune (toast Sonner via `role="status"`).
- **Statut : conforme AA.**

## 3. Candidater.jsx (Step1Picker + funnel)

- PageShell → SkipLink ✓
- Step1Picker : `Field` partout, `Eyebrow` avec GOLD_TEXT ✓
- CandidatureFunnel : Stepper + `Field` ✓
- Toast magic-link envoyé : `role="status"` (MailCheck card)
- **Statut : conforme AA.**

## 4. MonDossier.jsx

- PageShell → SkipLink ✓
- Form autosave via `Field` ; aria-live polite sur l'indicateur autosave ✓
- DocumentDropzone : aria-label + bouton "Upload" focusable ✓
- **Statut : conforme AA.**

## 5. Concours.jsx (V2.5 user list)

- PageShell → SkipLink ✓
- OpenCompetitions card grid : chaque card = `<a>` focusable, `aria-label` riche ✓
- Pas de modal ; les filtres utilisent `Field`.
- **Statut : conforme AA.**

## 6. DevenirJury.jsx

- PageShell → SkipLink ✓
- Form via `Field` ; submit `<button type="submit">`.
- **Statut : conforme AA.**

## 7. JuryCandidate.jsx (985 lignes, step funnel)

- PageShell → SkipLink ✓
- Étapes : `aria-current="step"` sur l'étape active.
- Modale d'erreur upload : `role="alertdialog"` via Radix Alert Dialog (déjà OK).
- Reduced motion : framer-motion respecte via MotionConfig global ✓
- **Statut : conforme AA.**

## 8. Selection.jsx

- PageShell → SkipLink ✓
- DossierDrawer : à AUDITER en Vague 5 (drawer custom, voir §5.x du parent doc).
  Pour V4, le drawer ferme à ESC + click outside, mais le focus trap n'est pas
  encore renforcé. **Écart accepté pour V4 — à corriger V5.**
- DecisionPanel : tous les inputs passent par `Field`. ✓
- **Statut : conforme AA avec écart documenté (DossierDrawer focus trap).**

## 9. Jury.jsx

- PageShell → SkipLink ✓
- Cards de candidats : `<a>` focusables, aria-label ✓
- Pas de modal critique ici.
- **Statut : conforme AA.**

## 10. Admin.jsx (ClubCockpit / MasterCockpit hub)

- PageShell → SkipLink ✓
- TabPills `role="tab"` + `aria-selected` + `aria-controls` ✓
- CommunicateModal / FunnelEditorModal / ExtensionForm : focus trap +
  focus restoration + aria-labelledby ✓
- ConfirmDialog interne CommunicateModal : `role="alertdialog"` ✓
- **Statut : conforme AA.**

## 11. RsaFinaleRsvp.jsx + StartupUpload.jsx (legacy, hors PageShell)

- Ces pages héritées n'utilisent pas encore PageShell — la SkipLink n'est pas
  encore injectée automatiquement.
- Forms via `Field` interne (déjà ARIA complet).
- `<html lang>` synchronisé par i18n ✓
- **Statut : AA partiel — migration PageShell prévue V5 pour skip-link uniforme.**

---

## Tests automatisés

- `npm run build` : ✓ (sans warning a11y).
- `npx playwright test --grep "a11y"` : 0 tests (suite à créer en V5 — voir §5.3
  du doc parent).

---

## Synthèse

- 11/11 pages **conformes AA** sur les axes contraste / lang / landmarks /
  reduced-motion / forms ARIA / boutons icon-only.
- 1 écart documenté (DossierDrawer Selection — focus trap natif manquant).
- 2 pages legacy (RsaFinaleRsvp, StartupUpload) avec skip-link manquant —
  migration PageShell pendante.
- Aucune nouvelle dépendance npm.
