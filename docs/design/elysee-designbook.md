# Élysée Designbook — THE site design book (with rules)

> The single authoritative design reference for the whole Rotary Startup Award (RSA)
> platform — landing, public RSA pages, and the multi-role app
> (startup / jury / comité / admin). This file **consolidates** the audit
> ([`elysee-audit.md`](./elysee-audit.md)) and the component blueprint
> ([`elysee-blueprint.md`](./elysee-blueprint.md)) into one document a designer or
> dev can follow without cross-referencing.
>
> **Sources of truth, in priority order:**
> 1. Tokens (exact hex/fonts/easing): [`src/components/design/tokens.js`](../../src/components/design/tokens.js).
> 2. Extracted components: [`src/components/design/*.jsx`](../../src/components/design/).
> 3. Reference implementation: [`src/pages/Index.jsx`](../../src/pages/Index.jsx).
> 4. The live landing [rotary-startup.org](https://rotary-startup.org) — the **brand
>    source of truth** for editorial voice and structure (exact hex/fonts still come
>    from `tokens.js`, never the rendered site).
>
> The legacy [`docs/design-system.md`](../design-system.md) remains the lunch-app
> (Rotary Event Management) page-refonte checklist; **this file supersedes it** for
> the RSA platform and for any new component work.

> ### How to read the rules
> Throughout, **✅ DO** / **🚫 DON'T** boxes are the binding rules. The one-line
> golden rule that governs everything:
>
> > **"If a color needs to be saturated, a corner needs to be rounder, or a shadow
> > needs to be heavier — it probably shouldn't exist. Add more white, more air, a
> > finer line instead."**

---

## 1. Brand essence & editorial voice

### 1.1 Essence
Élysée is **warm editorial print, not SaaS dashboard**. The feeling is an open book
or an institutional programme on cream paper: navy ink, a single gold rule as
ornament, Playfair Display serif for the things that matter (titles, names,
verdicts), generous whitespace, hairline separators, and **no shadows on
surfaces**. It must read as *prestigious yet welcoming* — the Rotary Startup Award
is an official, jury-backed competition that also celebrates its laureates.

Tonal anchors observed on the live landing:
- **Institutional formality** ("La Commission Rotary Startup Award — Rotary Club de
  Paris", "12 jurés indépendants", "Score moyen / 5").
- **Quiet celebration** (palmarès, laureates, "Le parcours vers la finale",
  "Rendez-vous en 2027") — dignified, never loud.
- **Transparency** — methodology and scoring are shown openly, in plain language.

### 1.2 Editorial voice (FR / EN / DE)
The platform chrome is **trilingual** (FR / EN / DE). The voice is the same in all
three: measured, precise, courteous, institutional. German and English are
faithful translations of the French intent — not literal word-for-word, but the
same register.

Signature constructions (mirror these in new copy):
- **Two-line titles**: a normal lead line + an *italic accent* line. e.g.
  "Le palmarès *et les scores*" / "Votre déjeuner *statutaire hebdomadaire*".
  The italic carries the editorial flourish.
- **Eyebrows**: short, uppercase, tracked, factual — "Bienvenue", "À venir",
  "Accès rapide", "Prochain déjeuner". Section labels, not sentences.
- **Meta lines**: factual, comma/middot-separated — "Jeudi 30 avril · 18h",
  "Score moyen / 5 — 12 jurés indépendants", "J-12".

### 1.3 Copy rules

> **✅ DO**
> - Keep titles short; let the italic accent do the emotional work.
> - Use middot `·` and em-dash `—` as editorial separators in meta lines.
> - Address users formally (FR *vous*, DE *Sie*); stay courteous and concise.
> - Spell out dates editorially ("Jeudi 30 avril · 18h"), localized per language.
> - Keep numerals and scores plain and honest ("/ 5", "12 jurés indépendants").

> **🚫 DON'T**
> - No marketing hype, exclamation storms, or growth-hacky CTAs.
> - No emoji in app chrome or UI labels. (The landing's 🏆/🥇 are *content* on the
>   results page only — never decorate the app, forms, nav, or tables with emoji.)
> - No ALL-CAPS sentences (uppercase is reserved for short eyebrows/labels).
> - No hard-coded copy in components — see §11 (i18n). Copy is always a prop/child.
> - **Pitch content stays in English** (international jury — project convention);
>   only the surrounding chrome is FR/EN/DE. See §11.

---

## 2. Color palette

All values are codified in [`tokens.js`](../../src/components/design/tokens.js).
**Never re-declare hex inline** — import the token.

### 2.1 Core palette

| Token    | Hex       | Role |
| -------- | --------- | ---- |
| `NAVY`   | `#0f1f3d` | Primary text, titles, dark accents, app-shell / TopNav background |
| `GOLD`   | `#c9a84c` | Accents only: rules, active icons, highlights, hover, focus ring |
| `CREAM`  | `#faf7f2` | Main page background — warm ivory paper |
| `CREAM2` | `#e8e3d9` | Hairlines, separators, card borders (warm beige) |
| `INK`    | `#3a3a52` | Secondary text — body copy, subtitles |
| `MUTED`  | `#9090a8` | Tertiary text — meta, eyebrows, J-X countdowns (**decorative-only**, see §9) |

### 2.2 Soft pastel tints (semantic surfaces — never saturated)

| Token         | Hex       | Semantic | Used on |
| ------------- | --------- | -------- | ------- |
| `TINT_SAGE`   | `#ecf1e5` | Success / overview | ActionRow, success Alert, `eligible`/`shortlisted` pill |
| `TINT_BEIGE`  | `#f5ede0` | Primary action | ActionRow, secondary Button hover, RadioYesNo selected |
| `TINT_BLUE`   | `#eff1f6` | Info / request | ActionRow, info Alert, `submitted`/`locked` pill |
| `TINT_ADMIN`  | `#f3ede5` | Admin | ActionRow (admin tile) |
| `GREEN_TODAY` | `#1d6b4f` | "Today" / live (a **text/dot accent**, not a fill) | live Eyebrow, `live` jury pill dot |

### 2.3 Proposed app-status colors (muted, desaturated — not yet in tokens.js)
The editorial palette has **no error/warning** color and **no focus-ring** token. To
fill app gaps without breaking the warm look, add these muted values (do **not** use
shadcn's bright `destructive` red or system amber):

| Proposed token | Hex (suggested) | Role |
| -------------- | --------------- | ---- |
| `BRICK` (danger) | `#a23b2d` (text/border) · `#f4e7e4` (tint) | Errors, `excluded`/`rejected` — muted brick, never bright red |
| `OCHRE` (warning) | `#9a6b1f` (text/border) · `#f6efe0` (tint) | Warnings, `flagged`/`under_review` — distinct from GOLD accent |
| Focus ring | `GOLD` `#c9a84c` | The single keyboard focus color, everywhere (§9) |

> When these are needed in code, add them to `tokens.js` first (e.g. `BRICK`,
> `BRICK_TINT`, `OCHRE`, `OCHRE_TINT`) and import — never inline.

### 2.4 Usage rules — when which color

> **✅ DO**
> - **Background**: `CREAM` for pages; `white` for cards/inputs; pastel tint for
>   *semantic* surfaces (ActionRow, Alert, pill). `NAVY` for the TopNav bar only.
> - **Text**: `NAVY` for titles & serif names; `INK` for body & subtitles; `MUTED`
>   for meta/eyebrows/countdowns only.
> - **Accents**: `GOLD` for rules, active/hover icon color, underlines, the focus
>   ring, the breathing left-bar. One accent color — gold — does the ornament.
> - **Borders / separators**: `CREAM2` hairlines (`1px`). Always the same weight.
> - On `NAVY` surfaces (TopNav): white text, `rgba(255,255,255,.45)` for muted sub,
>   `GOLD` for the active state, border `rgba(201,168,76,.18)`.

> **🚫 DON'T**
> - 🚫 Don't fill large surfaces with `GOLD` — it is an *accent*, used in thin
>   strokes, dots, small icons, focus rings, and active states.
> - 🚫 Don't put `MUTED` on `CREAM` for body copy or essential labels (contrast
>   ~3.3:1 — decorative/large only, §9).
> - 🚫 Don't introduce saturated reds/greens/blues. Pastel tints carry semantics.
> - 🚫 Don't tint pill *text* — pill text stays `NAVY`/`INK` for contrast; only the
>   pill background + the dot carries the tint/semantic color.

---

## 3. Typography

Two families. Loaded via `FONTS_IMPORT` (Google Fonts) — hoist it **once** at the
app shell (`PageShell`), not per page.

- **Playfair Display** (`SERIF` = `'Playfair Display', serif`) — titles, proper
  names, intervenants/laureates, italic accents, verdict labels. Weights 400/500;
  italic 400/500.
- **Inter** (`SANS` = `'Inter', sans-serif`) — body, meta, buttons, numerals, table
  cells, form labels & inputs. Loaded globally in `Layout.jsx`.

### 3.1 Type scale

| Usage             | Mobile  | Desktop | Leading | Family / weight | Implemented in |
| ----------------- | ------- | ------- | ------- | --------------- | -------------- |
| Hero `lg`         | 40px    | 56px    | 1.02    | Playfair 400    | `EditorialTitle` |
| Section `md`      | 28px    | 36px    | 1.05    | Playfair 400    | `EditorialTitle` |
| Subsection `sm`   | 22px    | 26px    | 1.1     | Playfair 400    | `EditorialTitle` |
| Card title        | 24px    | 32px    | tight   | Playfair 500    | `HeroEventCard` |
| Event / row name  | 17px    | 19px    | snug    | Playfair 500    | `UpcomingList` / `ListRow` |
| Speaker / lead name | 18px  | 20px    | snug    | Playfair 500    | `HeroEventCard` |

### 3.2 Fine type (Inter)

| Usage         | Spec |
| ------------- | ---- |
| Eyebrow       | `text-[10px] uppercase tracking-[0.18em] font-medium` |
| Mini-label    | `text-[9px]`–`text-[10px] uppercase tracking-[0.15em]` (e.g. "Intervenant", footer) |
| Body          | `text-[15px] md:text-base`, `line-height: 1.65`, color `INK` |
| Meta          | `text-xs` (11–12px), color `MUTED` |
| Form label    | `text-[11px] uppercase tracking-[0.12em]` color `MUTED` (proposed `Field`) |
| Input text    | `text-sm`/`text-base` color `INK`, placeholder `MUTED` |
| Numerals      | `tabular-nums` for indices, J-X, scores, table numerics |

### 3.3 Typography rules

> **✅ DO**
> - Use Playfair **only** for titles, names, verdicts, and italic accents.
> - Use Inter for everything functional: body, buttons, labels, meta, numbers.
> - Always ship responsive sizes (`text-[Npx] md:text-[Npx]`) — mobile-first.
> - Use `tabular-nums` for any aligned numbers (indices, scores, countdowns).
> - Set serif titles in weight 400 (hero/section) or 500 (cards/names).

> **🚫 DON'T**
> - 🚫 No Playfair for body copy, buttons, table cells, or form fields.
> - 🚫 No bold (700+) Playfair — the serif stays 400/500; emphasis comes from italic.
> - 🚫 No new font families. Two families, full stop.
> - 🚫 Don't hand-pick arbitrary sizes — use the scale above.

---

## 4. Spacing, layout, radius, shadows, gold-line motifs

### 4.1 Layout grid & container
```jsx
<div className="min-h-screen relative overflow-hidden" style={{ background: CREAM, color: NAVY }}>
  <div className="relative max-w-[680px] mx-auto px-5 md:px-8 pt-10 md:pt-16 pb-20">
    {/* content */}
  </div>
</div>
```
- **Editorial container**: `max-w-[680px]` — a reading column, not a dashboard.
- **Wide container** (data screens — comité queue, admin tables): `max-w-[1100px]`
  / `1200px` (matches the public RSA Header's `maxWidth: 1200`). Expose as a
  `width="wide"` variant of `PageShell`; **keep editorial/landing pages narrow**.
- Horizontal padding: `px-5 md:px-8` (narrow); `px-[18px]`+ for wide bars.
- Vertical rhythm between sections: `mb-12 md:mb-14` or `mb-14 md:mb-16`.
- Top meta row and footer are separated by `CREAM2` hairlines.

### 4.2 Radius

> **✅ DO** `4px` radius on surfaces (cards, inputs, buttons, dropzone). `9999px`
> (pill) only for badges, status pills, and round icon buttons. Circular (`50%`)
> for the icon dot in `ActionRow` and the TopNav monogram.

> **🚫 DON'T** `rounded-2xl` / `rounded-3xl` — not editorial. No mixed radii on one
> surface.

### 4.3 Shadows

> **✅ DO** Surfaces carry a **hairline `CREAM2` border**, no shadow. The one
> sanctioned shadow is the hero logo drop-shadow `0 12px 30px rgba(15,31,61,0.22)`.

> **🚫 DON'T** Card/box shadows, elevation layers, glows on UI surfaces. Depth comes
> from hairlines and whitespace, not shadow.

### 4.4 Gradients

> **✅ DO** Gradients only as **ambient atmosphere**: the gold radial halo behind the
> logo (`radial-gradient(... rgba(201,168,76,0.12) ...)`), the white sheen sweep on
> `ActionRow` hover, the gold blur behind the breathing left-bar. The TopNav monogram
> uses a subtle `linear-gradient(135deg, GOLD, #a07828)`.

> **🚫 DON'T** No gradient fills on buttons, inputs, page backgrounds, or cards. No
> saturated mesh gradients.

### 4.5 Signature gold-line motifs
These three are the brand's visual signature — reuse them, don't reinvent ornament:
1. **Eyebrow rule** — a 28×1.5px `GOLD` bar that animates `scaleX 0→1`, left of an
   uppercase tracked label. (`Eyebrow`.)
2. **Breathing left-bar** — a 2px `GOLD` vertical bar pinned to a card's left edge,
   with a blurred gold twin pulsing `opacity [0.3,0.9,0.3]` over 3.2s. (`HeroEventCard`.)
3. **Hover gold strokes** — on interactive rows/tiles: a gold bar grows from an edge
   (`scale-y-0 → scale-y-100`), a gold underline wipes under the title
   (`scale-x-0 → scale-x-100`, `origin-left`), a white sheen sweeps across.
   (`ActionRow`.)

> **✅ DO** Use these exact motifs for new cards/rows/tiles so the family reads as one.
> **🚫 DON'T** Invent new ornaments (corner brackets, rotating borders, particles).

### 4.6 Paper grain
A near-invisible fractal-noise overlay (`opacity 0.04`, `mix-blend-mode: multiply`)
gives the cream its paper feel — defined as `.grain-bg::before` in `Index.jsx` and to
be hoisted into `PageShell`. Keep it subtle; never above ~0.05 opacity.

---

## 5. Component catalog

> **Rules for every component:**
> - Tokens from `@/components/design/tokens` — never inline hex.
> - **Copy is always a prop/child** (resolved FR/EN/DE string); date/number
>   formatting takes a `locale`. Never bake copy in.
> - `4px` surface radius, `9999px` pills only; hairline `CREAM2` borders, no shadow;
>   no saturated gradients.
> - Visible keyboard focus = **GOLD ring** `focus-visible:ring-2 ring-offset-2 ring-[#c9a84c]`.
> - Motion uses ease `[0.22, 1, 0.36, 1]` and respects `prefers-reduced-motion` (§8).

Status legend: ✅ built · 🟡 planned (blueprint).

### 5.1 Editorial (✅ extracted to `src/components/design/`)

| Component | Purpose | Key props | Usage rules |
| --------- | ------- | --------- | ----------- |
| `Eyebrow` ✅ | Small section label: gold rule + uppercase tracked text, scroll-reveals. | `children` (copy), `color` (default `GOLD`; `GREEN_TODAY` for live). | One per section, above the title. ✅ Keep ≤ ~3 words. 🚫 No sentences, no second rule. |
| `EditorialTitle` ✅ | Two-line serif title (lead + italic accent). | `lead`, `italic`, `size` `lg\|md\|sm`. | ✅ Italic line is the accent — keep it short. 🚫 Don't stack two italic lines. |
| `HeroEventCard` ✅ | Hero card for the next/today event (or a featured dossier). | `event`, `locale` (def `fr-FR`), `labels` (`today/tomorrow/inDays(n)/nextEvent/liveToday/speaker`). | ✅ Pass `locale`+`labels` from i18n on trilingual screens. 🚫 Don't ship the FR defaults to EN/DE users. |
| `ActionRow` ✅ | Clickable editorial tile (role home tiles, primary CTAs). | `to`, `number`, `title`, `subtitle`, `icon`, `tint`, `index`. | ✅ Pick `tint` by semantics (sage=overview, beige=primary, blue=info, admin). 🚫 Don't use a saturated `tint`; numbers are zero-padded `01,02`. |
| `UpcomingList` ✅ | Numbered editorial list of upcoming events. | `events`, `eyebrow`, `title`, `titleItalic`, `typeLabels`, `locale`, `limit` (def 4). | ✅ Pass `typeLabels`/`locale` per language. 🚫 Tied to the lunch event shape — generalize (or use `ListRow`/`DataTable`) for dossier/jury data. |

### 5.2 App shell (🟡 planned)

| Component | Purpose | Usage rules |
| --------- | ------- | ----------- |
| `PageShell` 🟡 | The frame every screen sits in: `min-h-screen`, `CREAM` bg, gold halo + paper grain, fonts import once, narrow/wide container. | `width="narrow"` (default) for editorial; `width="wide"` for data screens. ✅ Sets `<html lang>` from `useLang()`; gates ambient loops behind reduced-motion. 🚫 Don't re-`@import` fonts per page once this exists. |
| `TopNav` 🟡 | Sticky `NAVY` bar: serif wordmark/monogram, role-aware `NavMenu`, `LanguageSwitcher`, account/sign-out. Formalizes the `RsaFinaleRsvp` `Header` (`background: NAVY`, height 56, border `rgba(201,168,76,.18)`, monogram `linear-gradient(135deg, GOLD, #a07828)`, white text, GOLD active). | ✅ One nav per app; reads `usePlatformAuth()`. 🚫 Don't hand-roll a per-page header anymore. |
| `NavMenu` 🟡 | Role-filtered nav items. `items:[{to,label,roles?}]` — items with `roles` show only on match; role-less items always show (startup owner). | ✅ Filter on `isJury/isComite/isAdmin`. 🚫 Don't render links a role can't use. |
| `Footer` 🟡 | Hairline footer (muted meta + doc link). `left`,`right` nodes. | ✅ `CREAM2` top border, `MUTED` text. |
| `LanguageSwitcher` 🟡 | Canonical FR/EN/DE pill toggle (reads/writes `useLang()`). Active = `GOLD` bg / `NAVY` text; inactive = transparent / muted. | ✅ The *only* place language is toggled. 🚫 Don't copy-paste the per-page toggle. |

### 5.3 Form controls (🟡 planned — highest-volume surface: the startup dossier)
> Shared input chrome: white/`CREAM` fill, `1px solid CREAM2` border, `4px` radius,
> `INK` text, `MUTED` placeholder, **GOLD focus ring**, **~44px min height on mobile**.
> Re-skin shadcn primitives to these tokens — **never ship the default theme**
> (`rounded-md`, `ring-ring`, primary blue clash with the warm palette).

| Component | Purpose | Usage rules |
| --------- | ------- | ----------- |
| `Field` 🟡 | Accessible wrapper: label + required marker + helper + error. | ✅ MUST wrap every control; associates `<label htmlFor>`, sets `aria-describedby` (helper/error), `aria-invalid`, `aria-required`. Label `text-[11px] uppercase tracking-[0.12em] MUTED`; required `*` in GOLD; error in `BRICK`. |
| `TextInput` / `Textarea` 🟡 | Single/multi-line text. | ✅ Use shared chrome; placeholder via prop. 🚫 No bare `<input>` without `Field`. |
| `Select` 🟡 | Single choice + GOLD chevron. | ✅ Re-skin `ui/select` (Radix) to Élysée. 🚫 No default theme. |
| `TagSelect` 🟡 | Multi-select removable pills (sectors, countries). | ✅ Tags reuse the neutral `StatusPill` shape (`CREAM`/pastel, × in `MUTED`). |
| `Dropzone` 🟡 | File upload (pitch deck, exec summary). Lift the drag/drop + size/type validation already inline in `StartupUpload.jsx`. | ✅ Dashed `CREAM2` border, `CREAM` fill, GOLD icon; border → GOLD on drag-over; show filename+size+replace. All strings are props. |
| `RadioYesNo` 🟡 | Binary eligibility questions (founders majority, registration). | ✅ Two segmented options; selected = GOLD ring + `TINT_BEIGE`. `value` `true\|false\|null`. |
| `DateInput` 🟡 | Date entry (creation date, deadlines) + GOLD calendar icon. | ✅ `locale`-aware; native `<input type=date>` acceptable fallback. |

### 5.4 Actions (🟡 planned)

| Component | Purpose | Usage rules |
| --------- | ------- | ----------- |
| `Button` 🟡 | The single action button (replaces off-palette `ui/button`). `variant` `primary\|secondary\|ghost\|danger`; `size` `sm\|md\|lg`; `icon`, `loading`, `disabled`, `as`. | **primary**: `NAVY` fill, white text → GOLD bar/underline (or GOLD fill) on hover. **secondary**: transparent, `1px CREAM2`, `NAVY` text → `TINT_BEIGE` hover. **ghost**: text-only `NAVY` → faint tint hover. **danger**: muted `BRICK` text/outline — never bright red. All: `4px` radius, Inter 500, GOLD focus ring, `loading`→`Spinner`. 🚫 No gradient fills, no shadow. |

### 5.5 Status & data (🟡 planned)

| Component | Purpose | Usage rules |
| --------- | ------- | ----------- |
| `StatusPill` 🟡 | Encode dossier / eligibility / jury lifecycle as a pastel pill. `status`, `kind` `dossier\|eligibility\|jury`, `label` (resolved copy). | ✅ Centralize the status→token map (§6) in this one file; `9999px` pill, `text-[11px]`, small leading dot carries the color, **text stays NAVY/INK**. 🚫 Don't color the text; don't invent ad-hoc per-page mappings. |
| `DataTable` 🟡 | Editorial table for comité/admin queues. `columns:[{key,label,align,render?}]`, `rows`, `onRowClick`, `sort`, `empty`, `loading`. | ✅ No card chrome — `MUTED` uppercase header, hairline `CREAM2` rows, `tabular-nums` right-aligned numerics, faint-tint row hover. **Collapses to `ListRow` cards below `md`** — never a silent horizontal scroll. |
| `ListRow` 🟡 | Denser queue row (table mobile fallback + standalone lists). `title`, `subtitle`, `status`, `meta`, `leading` (initials/icon), `to`/`onClick`, `trailing`. | ✅ Echo `UpcomingList` rows — hairline-separated, serif title, `StatusPill`, `ArrowUpRight` affordance. |

### 5.6 Auth (🟡 planned)

| Component | Purpose | Usage rules |
| --------- | ------- | ----------- |
| `AuthLayout` 🟡 | Centered editorial frame for unauthenticated screens. `title`, `subtitle`, `children`. | ✅ `PageShell` narrow, centered logo + halo, serif title, hairline card. |
| `MagicLinkForm` 🟡 | UI for `signInWithMagicLink` (`src/lib/platform/auth.jsx`). States: idle → sending (loading) → sent ("check your inbox") → error (`Alert`). | ✅ All copy via props (trilingual): `emailLabel/submitLabel/sentTitle/sentBody/errorLabel`. |

### 5.7 States & feedback (🟡 planned)

| Component | Purpose | Usage rules |
| --------- | ------- | ----------- |
| `EmptyState` 🟡 | "Nothing here yet". `title`, `description`, `icon`, `action`. | ✅ Centered, serif title, `MUTED` description, optional secondary `Button`. |
| `ErrorState` 🟡 | Failed query/load. `title`, `description`, `onRetry`, `retryLabel`. | ✅ Like EmptyState + `BRICK`-tinted icon + retry. |
| `Skeleton` 🟡 | Editorial loading placeholder. `variant` `line\|card\|row\|title`, `count`. | ✅ `CREAM2` blocks, soft shimmer (reduced under reduced-motion). Re-skins `ui/skeleton`. |
| `Spinner` 🟡 | Inline busy indicator. `size`, `color` (def `GOLD`). | ✅ Used inside loading `Button`s and small loads. |
| `Alert` 🟡 | Inline callout. `tone` `info\|success\|warning\|danger`, `title`, `children`, `icon`. | ✅ Pastel tint per tone (`TINT_BLUE`/`TINT_SAGE`/`OCHRE_TINT`/`BRICK_TINT`), tone-colored left hairline bar, `NAVY`/`INK` text. |
| `Toast` 🟡 | Transient feedback (saved, link sent). Theme `ui/sonner`. | ✅ White/cream surface, `CREAM2` border, GOLD/tone accent bar. 🚫 No harsh system colors. |

### 5.8 i18n helper (🟡 recommended)
`i18n/LanguageContext.jsx` → `useLang(): { lang, setLang }`, one `localStorage` key
(e.g. `rsa_lang`), seeds from `navigator.language`, sets `<html lang>`. Replaces the
per-page `T`/`localStorage` boilerplate in `RsaScore`, `RsaFinaleRsvp`, `RsaJuryView`,
`RsaPrintSheets`, `StartupUpload`. See §11.

---

## 6. Status color mapping

> **Binding rule:** the status→token map lives in **`StatusPill.jsx` only**. Every
> role (startup / jury / comité / admin) renders identical states. The pill **dot**
> carries the semantic color; **pill text stays NAVY/INK** for contrast. The map
> yields a *token + copy key* — the resolved FR/EN/DE label is passed in, never baked.

### 6.1 Eligibility — `src/lib/rsa/eligibility.js` (`VERDICT`)

| Status | Value | Tint (surface) | Accent (dot/border/text) | Meaning |
| ------ | ----- | -------------- | ------------------------ | ------- |
| Eligible | `eligible` | `TINT_SAGE` `#ecf1e5` | `GREEN_TODAY` `#1d6b4f` | No failed checks |
| Flagged | `flagged` | `OCHRE_TINT` `#f6efe0` | `OCHRE` `#9a6b1f` | Only `flag`-rule failures → comité decides |
| Excluded | `excluded` | `BRICK_TINT` `#f4e7e4` | `BRICK` `#a23b2d` | At least one `exclu`-rule failure (country / age) |

### 6.2 Jury session — `src/lib/rsa/constants.js` (`JURY_STATUS`)

| Status | Value | Tint | Accent | Meaning |
| ------ | ----- | ---- | ------ | ------- |
| Draft | `draft` | neutral `CREAM2` `#e8e3d9` | `MUTED` `#9090a8` | Session being prepared |
| Live | `live` | `TINT_SAGE` `#ecf1e5` | `GREEN_TODAY` `#1d6b4f` | Scoring open (use the live-Eyebrow green) |
| Locked | `locked` | `TINT_BLUE` `#eff1f6` | `NAVY` `#0f1f3d` | Scores frozen, not yet public |
| Published | `published` | `#fdf6e8` (gold light) | `GOLD` `#c9a84c` | Results public (palmarès) |

### 6.3 Dossier lifecycle

| Status | Value | Tint | Accent | Meaning |
| ------ | ----- | ---- | ------ | ------- |
| Draft | `draft` | neutral `CREAM2` | `MUTED` | Not yet submitted |
| Submitted | `submitted` | `TINT_BLUE` | `NAVY` | Awaiting review |
| Under review | `under_review` | `OCHRE_TINT` | `OCHRE` | Comité reviewing |
| Shortlisted | `shortlisted` | `TINT_SAGE` | `GREEN_TODAY` | Advanced |
| Finalist | `finalist` | `#fdf6e8` (gold light) | `GOLD` | In the Grande Finale |
| Winner | `winner` | `GOLD` `#c9a84c` (filled) | `NAVY` text on gold | Laureate |
| Rejected | `rejected` | `BRICK_TINT` | `BRICK` | Not retained |

> **✅ DO** Use these exact mappings; add the `OCHRE*`/`BRICK*` tokens to `tokens.js`
> before coding pills. **🚫 DON'T** improvise colors per screen or color the pill text.

---

## 7. Iconography & imagery

### 7.1 Icons
- **Library**: `lucide-react` exclusively. Thin line icons match the editorial weight.
- **Sizes**: `w-4 h-4` in actions/buttons/inputs; `w-3 h-3`–`w-3.5 h-3.5` in meta.
- **Color**: `NAVY` at rest (in the white circle of `ActionRow`); `GOLD` for active /
  meta accents (`Clock`, `MapPin`, calendar, chevrons). `MUTED` for decorative meta.

> **✅ DO** One icon library, thin strokes, the two sizes above. **🚫 DON'T** Mix icon
> sets, use filled/duotone icons, oversize them, or use emoji as icons in the UI.

### 7.2 Imagery
- The hero **Rotary wheel logo** is the primary brand image: slow 48s rotation, a
  breathing gold halo behind it, the single sanctioned drop-shadow.
- Photography is sparse and dignified if used at all; prefer whitespace + type +
  the gold rule over decorative imagery.
- The TopNav uses a small **gold monogram** ("R" on `linear-gradient(135deg, GOLD,
  #a07828)`) rather than a full logo, to stay compact.

> **✅ DO** Let the logo + gold rule + serif carry the brand. **🚫 DON'T** Stock-photo
> banners, illustrations, or decorative emoji. Results-page trophies (🏆🥇) are
> *content*, not chrome.

---

## 8. Motion & accessibility

### 8.1 Motion (framer-motion)

**Editorial easing** — use for every transition: `EASE = [0.22, 1, 0.36, 1]`
("ease-out-quart"). Imported from `tokens.js`.

| Pattern | Preset |
| ------- | ------ |
| Mount stagger (above fold) | `initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.6, delay:0.15 + index*0.06}}` |
| Scroll reveal (below fold) | `initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true, margin:"-15% 0px"}} transition={{duration:0.7, ease:EASE}}` |
| Hover icon | `group-hover:scale-110 group-hover:rotate-[6deg]` |
| Hover arrow | `whileHover={{x:3,y:-3}}` on `ArrowUpRight` |
| Hover underline | `scale-x-0 group-hover:scale-x-100 origin-left duration-500` |
| Ambient: logo | `rotate:360, duration:48s, ease:"linear"` (barely perceptible) |
| Ambient: halo | `scale:[1,1.15,1], opacity:[0.65,1,0.65], 5s easeInOut` |
| Ambient: gold bar | `opacity:[0.3,0.9,0.3], 3.2s easeInOut` |

> **✅ DO** Keep UI transitions 300–900ms with the editorial ease. Use stagger for
> mount, scroll-reveal for below-fold sections.

> **🚫 DON'T** Animated background blobs, particles, 3D card tilt, rotating conic
> borders, saturated mesh. No UI transitions `<300ms` or `>900ms` (loops excepted).

### 8.2 Accessibility (binding)

> **✅ DO**
> - **GOLD focus ring** on every interactive element:
>   `focus-visible:ring-2 ring-offset-2 ring-[#c9a84c]`. This is the single focus
>   color — editorial components currently rely on `group-hover` and **lack a
>   keyboard focus state**; new components must add it.
> - **Contrast**: NAVY-on-CREAM and INK-on-CREAM pass AA — use them for text.
> - **Labels**: every form control via `Field` (associated `<label htmlFor>`,
>   `aria-describedby` for helper/error, `aria-invalid`, `aria-required`).
> - **Reduced motion**: respect `prefers-reduced-motion` — pause/reduce the logo
>   spin, halo breathing, gold-bar pulse, and skeleton shimmer (gate in `PageShell`
>   + motion presets).
> - **Language**: set `<html lang>` to the active FR/EN/DE (via `useLang()`/`PageShell`).
> - Pastel-tint pills keep **NAVY/INK text** (not tint-colored) to hold contrast.
> - Touch targets ≥ ~44px min height on mobile (buttons, inputs, nav items).

> **🚫 DON'T**
> - 🚫 `MUTED #9090a8` on `CREAM` for body copy or essential labels (~3.3:1 — it is
>   **decorative-only**: eyebrows, meta, J-X countdowns, never load-bearing text).
> - 🚫 Hover-only affordances with no keyboard focus equivalent.
> - 🚫 Bare `<input>` without an associated label.
> - 🚫 Silent horizontal-scroll tables on mobile — collapse to cards (§5.5).
> - 🚫 shadcn's off-palette `ring-ring` focus — always the GOLD ring.

---

## 9. Trilingual rules (FR / EN / DE)

There is **no global i18n library** today. The established pattern (per-page
`const T = { fr, en, de }` + `localStorage` `rsa_*_lang` key + a FR/EN/DE pill toggle
in a navy `Header`) is used across `RsaScore`, `RsaFinaleRsvp`, `RsaJuryView`,
`RsaPrintSheets`, `StartupUpload`. Domain copy with translations is resolved via
`src/lib/rsa/constants.js` helpers: `getSessionLabel(s, lang)`, `getSessionDate(s,
lang)`, `getCriterion(c, lang)` (criteria carry an `i18n: { fr, de }` sub-object;
root values are English).

> **✅ DO**
> - **UI labels always via i18n** — components accept already-resolved strings as
>   props/children; date/number formatting takes a `locale`.
> - Resolve domain copy through the `constants.js` helpers, fed by the active `lang`.
> - Toggle language in **one place** (`LanguageSwitcher` + `useLang()`), one
>   `localStorage` key, and set `<html lang>`.
> - **Pitch content stays English** (international jury — project convention); only
>   the chrome (nav, labels, helper text, buttons, status labels) is FR/EN/DE.

> **🚫 DON'T**
> - 🚫 Hard-code any visible string inside a component (the two extracted components
>   that had baked FR — `HeroEventCard`, `UpcomingList` — now expose
>   `locale`/`labels`/`typeLabels`; pass them on trilingual screens).
> - 🚫 Re-implement the per-page `T`/`localStorage`/toggle boilerplate on new screens
>   — consume the shared `useLang()` context instead (migration is incremental and
>   non-breaking; existing pages keep their local `T` until refactored).
> - 🚫 Translate pitch/Q&A content into FR/DE — it is English by convention.

---

## 10. Page refonte / new-screen checklist

- [ ] `PageShell` (or `CREAM` bg + halo + grain + fonts once), correct `width`.
- [ ] Container `max-w-[680px]` (editorial) or `max-w-[1100px]` (data), editorial padding.
- [ ] `Eyebrow` + `EditorialTitle` for each major section.
- [ ] Cards/inputs: `4px` radius + `CREAM2` hairline, **no shadow**.
- [ ] CTAs via `ActionRow` (tiles) or `Button` (actions); GOLD accents only.
- [ ] Status shown via `StatusPill` using the §6 map (no ad-hoc colors).
- [ ] Tables via `DataTable` → collapse to `ListRow` cards on mobile.
- [ ] All copy via i18n props; `locale` passed for dates/numbers; pitch stays EN.
- [ ] Motion: editorial ease, mount stagger / scroll reveal, reduced-motion respected.
- [ ] GOLD focus ring on every interactive element; labels associated via `Field`.
- [ ] Verified at 375px and 320px; one golden path + one edge case.
- [ ] No `rounded-2xl/3xl`, no saturated gradient, no UI emoji, no inline hex.

## 11. Build order (carried from the blueprint)

1. `tokens.js` ✅ + extract editorial components ✅.
2. `i18n/LanguageContext` + `LanguageSwitcher` (everything depends on lang).
3. App shell: `PageShell`, `TopNav`, `NavMenu`, `Footer`.
4. `Button`, `Field` + form controls (unblocks the dossier — highest volume).
5. `StatusPill` (+ the shared §6 status→token map; add `OCHRE*`/`BRICK*` to tokens).
6. `feedback/*` (Empty / Error / Skeleton / Spinner / Alert / Toast).
7. `auth/AuthLayout` + `MagicLinkForm`.
8. `DataTable` + `ListRow` (comité / admin queues).
