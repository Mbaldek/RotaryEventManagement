# Élysée Design Audit — for the unified RSA platform

> Audit of the current "Élysée" editorial design and the gaps to fill before it
> can dress a full multi-role platform (app.rotary-startup.org: startup / jury /
> comité / admin). Companion to [`docs/design-system.md`](../design-system.md)
> (the design book) and [`elysee-blueprint.md`](./elysee-blueprint.md) (the
> component-library plan). Reference implementation: [`src/pages/Index.jsx`](../../src/pages/Index.jsx).

---

## 1. What "Élysée" is today

A warm, editorial, paper-like aesthetic — closer to an open book than a SaaS
dashboard. Narrow `max-w-[680px]` container, generous whitespace, hairline
separators, no shadows on surfaces, Playfair Display serif for titles and an
italic accent line as a signature. It currently covers **landing / editorial
pages only** (Index, the public RSA pages). It does **not** yet provide an app
shell, form controls, data tables, or auth layouts in this style — those screens
(e.g. `StartupUpload.jsx`, the `Rsa*` pages) each re-implement their own ad-hoc
styling with inline tokens, which is exactly what this design system must unify.

---

## 2. Design tokens

Canonical palette (now also exported from
[`src/components/design/tokens.js`](../../src/components/design/tokens.js) so it
stops being copy-pasted at the top of every page):

| Token       | Value       | Role |
| ----------- | ----------- | ---- |
| `NAVY`      | `#0f1f3d`   | Primary text, titles, dark accents, app-shell background |
| `GOLD`      | `#c9a84c`   | Accents: rules, active icons, highlights, hover |
| `CREAM`     | `#faf7f2`   | Main page background (warm ivory paper) |
| `CREAM2`    | `#e8e3d9`   | Hairlines, separators, card borders |
| `INK`       | `#3a3a52`   | Secondary text (body, subtitles) |
| `MUTED`     | `#9090a8`   | Tertiary text (meta, eyebrows, J-X countdowns) |

Soft pastel tints (never saturated):

| Token         | Value     | Semantic |
| ------------- | --------- | -------- |
| `TINT_SAGE`   | `#ecf1e5` | Success / overview |
| `TINT_BEIGE`  | `#f5ede0` | Primary action |
| `TINT_BLUE`   | `#eff1f6` | Info / request |
| `TINT_ADMIN`  | `#f3ede5` | Admin |
| `GREEN_TODAY` | `#1d6b4f` | "Today" / live status |

**Token gaps for an app:** there is no defined **error/danger** color (shadcn's
`destructive` red clashes with the warm palette), no **warning/amber** distinct
from GOLD, and no neutral **focus-ring** color. The blueprint proposes muted,
desaturated additions (a brick `#a23b2d`, an ochre warning, and a GOLD-based
focus ring) rather than bright system colors, per the design book's "if a color
needs to be saturated, it probably shouldn't exist" rule.

---

## 3. Typography scale

Two families: **Playfair Display** (serif — titles, names, italic accents,
weights 400/500) and **Inter** (sans — body, meta, buttons, numerals). Inter is
global via `Layout.jsx`; Playfair is currently `@import`-ed per page inside a
`<style>` tag (gap: should be hoisted to the app shell once — see `FONTS_IMPORT`
in tokens.js).

| Usage           | Mobile  | Desktop | Leading | Implemented in |
| --------------- | ------- | ------- | ------- | -------------- |
| Hero `lg`       | 40px    | 56px    | 1.02    | `EditorialTitle` |
| Section `md`    | 28px    | 36px    | 1.05    | `EditorialTitle` |
| Subsection `sm` | 22px    | 26px    | 1.1     | `EditorialTitle` |
| Card title      | 24px    | 32px    | tight   | `HeroEventCard` (inline) |
| Event name      | 17px    | 19px    | snug    | `UpcomingList` (inline) |

Fine type: Eyebrow `text-[10px] uppercase tracking-[0.18em] font-medium`; meta
`text-xs`; mini-labels `text-[9px] uppercase tracking-[0.15em]`.

**Gap:** the scale stops at editorial sizes. An app needs defined **body/label/
input/caption** sizes (form labels, table cells, button text, helper/error text)
that are not in the book today. The blueprint formalizes these.

---

## 4. Existing editorial components (now extracted)

All five were inline in `Index.jsx`. They are extracted **non-destructively** to
`src/components/design/` (new files only; `Index.jsx` is untouched and keeps its
local copies). Visual output is byte-for-byte equivalent; the extracts add
optional props for trilingual call sites.

| Component        | File | Reusable as-is? | Notes |
| ---------------- | ---- | --------------- | ----- |
| `Eyebrow`        | `Eyebrow.jsx` | ✅ Yes | Pure layout; copy passed as children. Drop-in everywhere. |
| `EditorialTitle` | `EditorialTitle.jsx` | ✅ Yes | lead + italic accent, 3 sizes. Drop-in. |
| `HeroEventCard`  | `HeroEventCard.jsx` | ⚠️ Mostly | Had **hard-coded FR copy** ("Aujourd'hui", "Intervenant", `fr-FR` locale). Extract exposes `locale` + `labels` overrides with FR defaults. Shape is reusable; copy must be fed by i18n. |
| `ActionRow`      | `ActionRow.jsx` | ✅ Yes | Pure layout + pastel tint; copy passed as props. Drop-in for any role's home tiles. |
| `UpcomingList`   | `UpcomingList.jsx` | ⚠️ Mostly | Had hard-coded `EVENT_TYPE_LABELS` (FR) + `fr-FR` locale. Extract exposes `typeLabels`, `locale`, `eyebrow`, `title`, `titleItalic`. Tied to the lunch-event data shape (`event_type`, `speaker_name`); generalize per data source. |

Also reusable as patterns (documented in the book, not yet componentized): the
**ambient gold halo + paper grain**, the **animated logo** (48s rotation +
breathing halo), the editorial easing `[0.22, 1, 0.36, 1]`, the mount-stagger and
scroll-reveal motion presets. These belong in the app shell / a `<PageShell>`.

---

## 5. GAPS — what a multi-role app needs that does not exist

The current system has **zero** of the following in Élysée style. Each is a
backlog item detailed in the blueprint.

### 5.1 App shell
- **Top nav** (navy bar, serif wordmark, role-aware menu items, language switcher,
  account/sign-out). Today `Layout.jsx` is `bg-stone-50` and off-palette; the
  public Rsa pages each hand-roll a sticky navy `Header` (see `RsaFinaleRsvp.jsx`
  line 742) with the FR/EN/DE pill toggle — that toggle is the de-facto pattern to
  standardize.
- **Role-aware menu**: nav items must filter on `usePlatformAuth()` roles
  (`isJury` / `isComite` / `isAdmin`, plus the role-less authenticated startup
  owner). No shared component does this.
- **Footer** (hairline top border, muted meta, doc link) — exists only inline at
  the bottom of `Index.jsx`.
- **Page shell wrapper**: the `min-h-screen` + CREAM background + halo + grain +
  narrow container + fonts import is repeated; should be one `<PageShell>`.

### 5.2 Form controls (the biggest gap — the startup dossier is form-heavy)
None exist in Élysée style. shadcn primitives (`ui/input`, `ui/textarea`,
`ui/select`, `ui/checkbox`, `ui/radio-group`) exist but are **default-themed**
(rounded-md, ring-`ring`, primary blue) — they do not match the warm hairline
paper look. Needed:
- Text input, textarea (hairline `CREAM2` border, CREAM/white fill, GOLD focus).
- Select (single) + **multi-select tag input** (sectors, countries — the dossier
  has multiple categorizations).
- **File upload / dropzone** — the dossier needs pitch deck + exec summary upload.
  `StartupUpload.jsx` already does drag/drop + size/type validation inline; that
  logic should be lifted into a styled `<Dropzone>`.
- **Radio yes/no** (eligibility questions: founders majority, registration, etc.).
- **Date** input (creation date, deadlines).
- Shared **field wrapper**: label + required marker + helper + error text +
  `aria-describedby` wiring (accessibility gap today).

### 5.3 Buttons
Only the editorial `ActionRow` (a link tile) and ad-hoc inline buttons exist.
shadcn `ui/button` is off-palette. Needed: **primary** (NAVY fill / GOLD on
hover or GOLD fill), **secondary** (hairline outline), **ghost/text**, plus a
loading/disabled state and an icon button — all in Élysée tokens.

### 5.4 Status pills / badges — dossier lifecycle
The platform has real lifecycle state that needs visual encoding:
- Eligibility verdicts (`src/lib/rsa/eligibility.js`): `eligible` / `flagged` /
  `excluded`.
- Jury session status (`constants.js` `JURY_STATUS`): `draft` / `live` /
  `locked` / `published`.
- Dossier progress (`draft`, submitted, under review, shortlisted, finalist,
  winner, rejected).
No pill/badge component encodes these in Élysée pastels today (`ui/badge` is
default-themed). Needed: a `<StatusPill status>` mapping each state → a pastel
tint + dot/icon.

### 5.5 Data tables & list rows — comité/admin queues
The comité reviews dossiers; admin manages users/sessions. There is no editorial
table or queue-row component. `UpcomingList` is the closest pattern (numbered
hairline rows) but is event-specific. Needed: an editorial **DataTable** (header
row, hairline-separated rows, sortable, right-aligned numerics with `tabular-nums`)
and a denser **ListRow** for queues (avatar/initials, title, status pill, meta,
action affordance). Must degrade to stacked cards on mobile (no raw horizontal
scroll — book §7).

### 5.6 Magic-link login layout
`src/lib/platform/auth.jsx` provides `signInWithMagicLink`, but there is **no UI**.
Needed: a centered editorial auth screen (logo, serif title, email field, "send
link" button, "check your inbox" confirmation state, error state) — trilingual.

### 5.7 Empty / loading / error / skeleton states
None standardized. shadcn `ui/skeleton` exists but is default-themed. Needed:
editorial **EmptyState** (serif title + muted line + optional action),
**Skeleton** rows/cards in CREAM2 shimmer, an **ErrorState** (for failed queries),
and an inline **Spinner**. Critical for the React Query data screens (jury hub,
comité queue).

### 5.8 Toasts / alerts
`ui/sonner` + `ui/toast` exist but are default-themed. Needed: an Élysée toast
(navy text on white/cream, GOLD or pastel accent bar, no harsh colors) and an
inline **Alert/Callout** (info / success / warning / danger pastels) for form
submission feedback and eligibility notices.

---

## 6. Responsive considerations

- Container stays `max-w-[680px]` for editorial reading; **app/data screens may
  need a wider container** (e.g. comité queue, admin tables) — the blueprint adds
  a `wide` variant to `<PageShell>` while keeping editorial pages narrow.
- Mobile-first: every type size ships `text-[Npx] md:text-[Npx]`. Tables must
  collapse to cards on mobile, never horizontal-scroll silently (use
  `.scrollbar-hide` only when scroll is explicit).
- Touch targets: ActionRow rows are comfortably tall; new buttons/inputs must hit
  ~44px min height on mobile.

## 7. Accessibility considerations (notable gaps)

- **Focus states**: editorial components rely on `group-hover` and have no visible
  keyboard focus ring. shadcn defaults use `ring-ring` (off-palette). The blueprint
  standardizes a **GOLD focus ring** (`focus-visible:ring-2 ring-[#c9a84c]`) on all
  interactive components.
- **Contrast**: NAVY on CREAM and INK on CREAM pass AA. **MUTED `#9090a8` on CREAM
  is borderline** (~3.3:1) — acceptable for large/decorative meta only, never for
  body copy or essential labels. Pastel-tint pills must keep NAVY/INK text, not
  tint-colored text, to hold contrast.
- **Labels**: form controls today are inline `<input>`s without associated
  `<label htmlFor>`/`aria-describedby`. The field wrapper must enforce
  label association, required-state announcement, and error linkage.
- **Motion**: respect `prefers-reduced-motion` — the ambient loops (logo spin,
  halo breathing, gold-bar pulse) should pause/reduce. Not handled today; add to
  `<PageShell>` and motion presets.
- **Language**: the app shell must set `<html lang>` to the active FR/EN/DE so
  screen readers pronounce correctly (not done by the current per-page toggles).

---

## 8. Internationalization (FR/EN/DE) — current state

There is **no global i18n library** (no i18next, no react-intl). The established
pattern, used across the public RSA pages (`RsaScore`, `RsaFinaleRsvp`,
`RsaJuryView`, `RsaPrintSheets`, `StartupUpload`), is:

1. A local `const T = { fr: {...}, en: {...}, de: {...} }` table per page.
2. `const LANGS = ["fr", "en", "de"]` and a `lang` state, **persisted to
   `localStorage`** (`rsa_*_lang` keys), defaulting from `navigator.language`.
3. A FR/EN/DE **pill toggle** in the page header (the navy `Header` pattern).
4. Domain copy that already carries translations is resolved via helpers in
   `src/lib/rsa/constants.js`: `getSessionLabel(s, lang)`, `getSessionDate(s, lang)`,
   `getCriterion(c, lang)` (criteria carry an `i18n: { de, fr }` sub-object).

**Implication for the design system:** components must be **copy-agnostic** —
they accept already-resolved strings as props/children, never hard-code labels.
The two extracted components that *had* baked-in French (`HeroEventCard`,
`UpcomingList`) now expose `locale`/`labels`/`typeLabels` overrides. The blueprint
recommends consolidating the per-page `T` pattern behind a single shared
`useLang()`/language-context + a top-level `<LanguageSwitcher>` so the app shell
owns the toggle and `localStorage` key, instead of every page re-implementing it.

---

## 9. Summary of recommendations

1. Adopt `src/components/design/tokens.js` everywhere; stop duplicating the
   palette and `@import` per page.
2. Build the app shell (`PageShell`, `TopNav`, role-aware menu, `Footer`,
   `LanguageSwitcher`) first — it unblocks every role's screens.
3. Build the Élysée form-control set (field wrapper + inputs + dropzone + radio
   yes/no) — the startup dossier is the highest-volume surface.
4. Add `StatusPill` covering eligibility + jury + dossier lifecycles.
5. Add `DataTable`/`ListRow` for comité/admin queues with mobile card fallback.
6. Add auth, empty/loading/error/skeleton, and toast/alert primitives.
7. Standardize a GOLD focus ring and `prefers-reduced-motion` handling.
8. Centralize i18n behind a shared language context; keep all components
   copy-agnostic.
