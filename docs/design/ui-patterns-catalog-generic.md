# Élysée UI Patterns Catalog — V3.0 (B2B Generic)

> **Scope.** SSOT for every new screen of the V3.0 product (B2B). Extends
> [`elysee-designbook.md`](./elysee-designbook.md) — it does **not** replace it.
> The Designbook is the brand authority (palette, typography, ornament, copy
> voice). This catalog is the *production* reference: which token, which class
> string, which existing component to reuse, which microinteraction to ship,
> what to never do.
>
> **Audience.** Engineers + designers shipping admin cockpits, dashboards,
> tables, modals, settings and white-label customer surfaces for a top-tier
> B2B audience (Rotary corporate, startup CEOs, international juries).
>
> **Standard.** Linear / Stripe / Vercel-tier polish, expressed through the
> Élysée editorial vocabulary (warm cream paper, navy ink, single gold rule,
> hairlines, no shadows). Density and rigor of a SaaS dashboard, voice and
> ornament of an institutional programme.
>
> **Sources of truth, in priority order:**
> 1. Tokens — [`src/components/design/tokens.js`](../../src/components/design/tokens.js)
>    + [`src/components/design/tokens.app.js`](../../src/components/design/tokens.app.js).
> 2. Extracted components — [`src/components/design/*`](../../src/components/design/)
>    (re-exported via the barrel `@/components/design`).
> 3. Brand & copy authority — [`elysee-designbook.md`](./elysee-designbook.md).
> 4. Production patterns (modal, cockpit, card, rules editor) — the four
>    reference implementations cited throughout (§Anchors).
>
> **Golden rule (unchanged from the Designbook).**
> *"If a color needs to be saturated, a corner needs to be rounder, or a shadow
> needs to be heavier — it probably shouldn't exist. Add more white, more air,
> a finer line instead."*
>
> **Industrial inspirations to keep in mind** — Linear (command palette, density,
> URL state, transition rigor) · Stripe Dashboard (KPI cards, table density,
> chart restraint) · Vercel Dashboard (empty states, navigation persistence,
> project switcher) · shadcn/ui (form primitives + dialog primitives, re-skinned)
> · Refactoring UI (typography rhythm, spacing rhythm, color systems).

---

## Table of contents

1. [Foundations](#1-foundations) — tokens, type, spacing, radius, hairlines, focus, elevation
2. [Layout patterns](#2-layout-patterns) — PageShell, header, sections, footer, grid
3. [Navigation](#3-navigation) — TopNav, pill tabs, URL state, breadcrumbs, selectors, command palette
4. [Forms](#4-forms) — Field + controls, V3.0 additions (combobox, multi-select, stepper, color, rich text), validation, autosave
5. [Data display](#5-data-display) — tables, KPI cards, charts, empty/loading/error states, cards, status pills
6. [Overlays](#6-overlays) — modals, drawers, popovers, toasts, typed-confirm
7. [Feedback & communication](#7-feedback--communication) — email templates, banners, progress, spinners
8. [Microinteractions](#8-microinteractions) — press, hover, tab transitions, modal, autosave indicator
9. [Accessibility WCAG AA](#9-accessibility-wcag-aa) — contrast, focus, ARIA, keyboard, screen reader
10. [Internationalization](#10-internationalization-frende) — useLang, dict, Intl, LTR
11. [Performance](#11-performance) — lazy routes, images, react-query, skeleton thresholds
12. [White-label V3.0](#12-white-label-v30) — CSS variables, logo slot, footer signature
13. [Extension UI patterns](#13-extension-ui-patterns-v30) — plugin slots, JSON-Schema → form, webhooks
14. [Anti-patterns](#14-anti-patterns) — the binding "never do this" list
15. [Anchors / file map](#15-anchors--file-map) — every reference file in one place

---

## 1. Foundations

### 1.1 Palette tokens

All hex values live in code. **Never declare hex inline.** Import from the
barrel: `import { NAVY, GOLD, CREAM, DANGER, FOCUS_RING_CLASS } from "@/components/design"`.

#### 1.1.1 Core (`tokens.js`)

| Token         | Hex       | Role                                                                 |
| ------------- | --------- | -------------------------------------------------------------------- |
| `NAVY`        | `#0f1f3d` | Primary text, serif titles, dark accents, TopNav background          |
| `GOLD`        | `#c9a84c` | Accents only — rules, active icons, hover, focus ring                |
| `CREAM`       | `#faf7f2` | Page background — warm ivory paper                                   |
| `CREAM2`      | `#e8e3d9` | Hairlines, separators, card borders (warm beige)                     |
| `INK`         | `#3a3a52` | Secondary text — body copy, subtitles, form labels                   |
| `MUTED`       | `#9090a8` | Tertiary text — meta, eyebrows, J-X (**decorative-only**, §9.1)      |
| `TINT_SAGE`   | `#ecf1e5` | Success / overview surfaces (ActionRow, success pill)                |
| `TINT_BEIGE`  | `#f5ede0` | Primary action surface (RadioYesNo selected, secondary hover)        |
| `TINT_BLUE`   | `#eff1f6` | Info / request surfaces (info Alert, `submitted`/`locked` pill)      |
| `TINT_ADMIN`  | `#f3ede5` | Admin ActionRow tile                                                 |
| `GREEN_TODAY` | `#1d6b4f` | "Today" / live (text/dot accent, never a fill)                       |

#### 1.1.2 App extensions (`tokens.app.js`)

| Token            | Hex       | Role                                                                  |
| ---------------- | --------- | --------------------------------------------------------------------- |
| `DANGER`         | `#a23b2d` | Muted brick — errors, `excluded`, `rejected` (never bright red)       |
| `TINT_DANGER`    | `#f6e7e3` | Soft brick tint background for danger pills/alerts                    |
| `WARNING`        | `#9a6400` | Ochre — warnings, `flagged`, `under_review` (distinct from GOLD)      |
| `TINT_WARNING`   | `#f7eddc` | Soft ochre tint background for warning pills/alerts                   |
| `SUCCESS`        | `#1d6b4f` | Reuses `GREEN_TODAY` hue for success text/icons                       |
| `FOCUS_RING`     | `#c9a84c` | The single keyboard focus color, everywhere                           |
| `FOCUS_RING_CLASS` | (utility) | `outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]` |
| `RADIUS`         | `4`       | Surface radius (px); pills/round buttons use `9999px`                 |
| `HAIRLINE`       | `#e8e3d9` | Alias of CREAM2, named for "1px solid border" intent                  |

> **DO** Import every color/spacing/easing/font-stack from the barrel.
> **DO NOT** Re-declare hex in a component. **DO NOT** introduce a saturated
> red/blue/green from shadcn — re-skin to `DANGER`/`TINT_DANGER` etc.

### 1.2 Typography

Two families, loaded once at the shell (`PageShell` hoists `FONTS_IMPORT`).

| Family            | Token   | Used for                                                      |
| ----------------- | ------- | ------------------------------------------------------------- |
| Playfair Display  | `SERIF` | Titles, proper names, jury verdicts, italic accents (400/500) |
| Inter             | `SANS`  | Everything functional: body, meta, buttons, labels, numerals  |

#### 1.2.1 Type scale (binding — pick from this table, don't free-style sizes)

| Usage              | Mobile  | Desktop | Leading | Family / weight  | Example component        |
| ------------------ | ------- | ------- | ------- | ---------------- | ------------------------ |
| Hero (`lg`)        | 40 px   | 56 px   | 1.02    | Playfair 400     | `EditorialTitle size="lg"` |
| Section (`md`)     | 28 px   | 36 px   | 1.05    | Playfair 400     | `EditorialTitle size="md"` |
| Subsection (`sm`)  | 22 px   | 26 px   | 1.10    | Playfair 400     | `EditorialTitle size="sm"` |
| Modal title        | 22 px   | 26 px   | tight   | Playfair 400     | `FunnelEditorModal`      |
| Card title         | 17 px   | 19 px   | snug    | Playfair 500     | `SessionCard`            |
| KPI value          | 26 px   | 32 px   | 1.0     | Inter 500 tabular-nums | KPI card (§5.2)    |
| Eyebrow            | 10 px   | 10.5 px | —       | Inter 500 uppercase `tracking-[0.18em]` | `Eyebrow` |
| Form label         | 11 px   | 11 px   | —       | Inter 500 uppercase `tracking-[0.12em]` | `Field` |
| Body               | 15 px   | 16 px   | 1.65    | Inter 400 color INK | every prose block      |
| Meta               | 11–12 px | 11–12 px | —      | Inter 400 color MUTED | row meta, footer       |
| Table cell         | 12.5 px | 13 px   | 1.5     | Inter 400, numerics `tabular-nums` | `DataTable` |

> **DO** Use `tabular-nums` for every aligned number (KPI, scores, indices, J-X, table numerics).
> **DO** Use italic Playfair (`font-style: italic`) for accent lines in titles.
> **DO NOT** Bold Playfair (700+). **DO NOT** Use Playfair for body, buttons, table cells, form fields.
> **DO NOT** Introduce a third font family.

### 1.3 Spacing rhythm — the 4 px grid

All spacing uses Tailwind's 4 px-multiples. Pick the densest level that still
breathes. Three "density modes" govern dashboard surfaces:

| Density       | Row height | Vertical gap between fields | Card padding             | When                                 |
| ------------- | ---------- | --------------------------- | ------------------------ | ------------------------------------ |
| `compact`     | 32 px      | 8 px                        | `p-3` (12 px)            | Tables with > 30 rows, list drawers  |
| `comfortable` | 40 px      | 12 px                       | `p-4` md:`p-5` (16/20 px) | Default — admin cockpits, forms      |
| `spacious`    | 48 px      | 20 px                       | `p-6` md:`p-8` (24/32 px) | Editorial/landing/auth screens       |

Section vertical rhythm: `mb-12 md:mb-14` (compact) → `mb-14 md:mb-16`
(comfortable) → `mb-16 md:mb-24` (spacious editorial).

> **DO** Use `gap-*` (flex/grid) rather than chained margins. **DO NOT** Use
> arbitrary pixel values that don't fall on the 4 px grid (no `px-[7px]`,
> `mt-[13px]`).

### 1.4 Border radius

| Surface                                   | Radius     | Source             |
| ----------------------------------------- | ---------- | ------------------ |
| Cards, inputs, buttons, dropzone, modal   | `4px`      | `RADIUS` (`tokens.app.js`) |
| Pills (status, tabs), round icon buttons  | `9999px`   | `rounded-full`     |
| Icon dot in ActionRow, TopNav monogram    | `50%`      | `rounded-full`     |
| **Exception** — SessionCard hero          | `10px`     | One sanctioned softer corner for high-emphasis cards (§5.4) |

> **DO NOT** Use `rounded-md` / `rounded-lg` / `rounded-2xl` / `rounded-3xl`.
> They are SaaS-default, not editorial. **DO NOT** Mix radii within a single
> composition.

### 1.5 The hairline gold rule (signature ornament)

Three motifs reused across every screen — never invent new ornament:

1. **Eyebrow rule** — a 28×1.5 px GOLD bar that animates `scaleX 0→1`, left of
   an uppercase tracked label.
   ```jsx
   <span className="h-[1.5px] w-7 bg-[#c9a84c]" />
   ```
2. **Breathing left-bar** — a 2 px GOLD vertical bar pinned to a card's left
   edge, optionally with a blurred gold twin pulsing
   `opacity [0.3, 0.9, 0.3]` over 3.2 s. See `HeroEventCard`.
3. **Hover gold strokes** — interactive rows/tiles: gold bar grows from an edge
   (`scale-y-0 → scale-y-100`), gold underline wipes under the title
   (`scale-x-0 → scale-x-100, origin-left, duration-500`), white sheen sweeps
   across. See `ActionRow`.

> **DO** Reuse these three exact motifs so the component family reads as one.
> **DO NOT** Invent ornaments (corner brackets, rotating borders, particles,
> gradient outlines).

### 1.6 Focus rings

A single ring color (GOLD) on every interactive element:

```jsx
import { FOCUS_RING_CLASS } from "@/components/design";

<button className={`px-3 py-2 rounded-[4px] ${FOCUS_RING_CLASS}`}>…</button>
```

The class string resolves to:
`outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]`.

On NAVY surfaces (TopNav, primary buttons), add a NAVY ring offset so the gold
ring is visible against the dark background:
`focus-visible:ring-offset-[#0f1f3d]`.

On CREAM surfaces (cards on the page background), use
`focus-visible:ring-offset-[#faf7f2]`.

> **DO** Add the focus ring class to every clickable / focusable element.
> **DO NOT** Use `ring-ring` (shadcn default) or remove the ring entirely.

### 1.7 Elevation (flat by default)

Surfaces are flat — depth comes from hairlines and whitespace. The sanctioned
shadows:

| Shadow                           | Where                                                      |
| -------------------------------- | ---------------------------------------------------------- |
| `boxShadow: "0 1px 0 rgba(15,31,61,0.02)"` | Round icon containers in ActionRow only           |
| `hover:shadow-sm`                | Card hover lift (cards with translate, §5.4)               |
| `0 12px 30px rgba(15,31,61,0.22)` | The single hero logo drop-shadow                          |

> **DO NOT** Apply `shadow`, `shadow-md`, `shadow-lg`, glow, neumorphic, or
> "soft UI" effects to any surface.

### 1.8 Breakpoints (Tailwind defaults — codified)

| Token  | Width   | Used for                                       |
| ------ | ------- | ---------------------------------------------- |
| (base) | < 640   | Mobile single-column                           |
| `sm:`  | ≥ 640   | Two-column grids, denser meta                  |
| `md:`  | ≥ 768   | Desktop nav, table-as-table (else cards)       |
| `lg:`  | ≥ 1024  | Three-column grids, full cockpit layouts       |
| `xl:`  | ≥ 1280  | Reserved for >3-column charts/grids            |

Test every new screen at **320 px**, **375 px**, **768 px**, **1280 px**.

---

## 2. Layout patterns

### 2.1 PageShell — narrow vs wide

[`src/components/design/shell/PageShell.jsx`](../../src/components/design/shell/PageShell.jsx)

Every screen sits in a `PageShell`. Two widths:

| Width                | Container         | Use for                                                  |
| -------------------- | ----------------- | -------------------------------------------------------- |
| `width="narrow"` (default) | `max-w-[680px]` | Editorial / landing / auth / single-task forms       |
| `width="wide"`       | `max-w-[1100px]`  | Cockpits, tables, multi-column dashboards                |

```jsx
import { PageShell, TopNav } from "@/components/design";

export default function MyScreen() {
  return (
    <PageShell width="wide" nav={<TopNav />} footer={<Footer />}>
      {/* page content */}
    </PageShell>
  );
}
```

The shell hoists the Playfair `FONTS_IMPORT` once, paints the ambient gold halo
and the paper-grain overlay, and respects `prefers-reduced-motion` for the halo
breathing. **Never** re-import fonts per page.

### 2.2 Editorial header

Every major screen opens with the eyebrow + serif title + INK intro pattern:

```jsx
import { Eyebrow, EditorialTitle, INK } from "@/components/design";

<header className="mb-10 md:mb-14">
  <Eyebrow>{t(T.eyebrow)}</Eyebrow>
  <EditorialTitle
    lead={t(T.titleLead)}
    italic={t(T.titleAccent)}
    size="md"
  />
  <p className="mt-4 text-[15px] md:text-base max-w-[60ch]" style={{ color: INK, lineHeight: 1.65 }}>
    {t(T.intro)}
  </p>
</header>
```

### 2.3 Stacked sections + hairline gold separators

Sections are separated by whitespace + a 1 px CREAM2 hairline. When a section
deserves an editorial flourish (top of a major block), prepend the 28×1.5 px
GOLD rule:

```jsx
<section className="pt-10 mt-10" style={{ borderTop: `1px solid ${CREAM2}` }}>
  <div className="flex items-center gap-2 mb-3">
    <span aria-hidden className="h-[1.5px] w-7" style={{ background: GOLD }} />
    <span className="uppercase tracking-[0.18em] text-[10.5px] font-medium" style={{ color: GOLD }}>
      {t(T.sectionEyebrow)}
    </span>
  </div>
  …
</section>
```

### 2.4 Sticky modal/edit-page footer

For edit screens with autosave or a primary commit action, pin a sticky footer
to the bottom of the form column (or modal). See `FunnelEditorModal` footer.

```jsx
<footer
  className="sticky bottom-0 px-6 py-3 flex items-center justify-between gap-3 flex-wrap"
  style={{ borderTop: `1px solid ${CREAM2}`, background: "white" }}
>
  <div>{destructiveSlot /* e.g. delete with typed-confirm */}</div>
  <div className="flex items-center gap-4">
    <StatusIndicator status={autosaveStatus} />
    <button className="…NAVY primary button…">{t(T.close)}</button>
  </div>
</footer>
```

### 2.5 Responsive grids

Tailwind defaults, mobile-first:

```jsx
{/* 1 col mobile, 2 cols sm, 3 cols lg */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  …
</div>
```

For mixed-emphasis dashboards (hero + KPIs): use `lg:grid-cols-[2fr_1fr_1fr]`
sparingly — never more than three "weight classes" in one row.

---

## 3. Navigation

### 3.1 TopNav — role-aware

[`src/components/design/shell/TopNav.jsx`](../../src/components/design/shell/TopNav.jsx)
+ [`NavMenu.jsx`](../../src/components/design/shell/NavMenu.jsx).

Sticky NAVY bar, `h-14`, gold monogram + serif wordmark + role-filtered nav +
`LanguageSwitcher` + sign-out. The default menu is filtered by
`usePlatformAuth().hasRole`. Mobile collapses behind a hamburger drawer.

> **DO** Reuse the existing `TopNav` everywhere. Override `wordmark` /
> `subtitle` / `items` if a page needs them.
> **DO NOT** Hand-roll a per-page header. **DO NOT** Add per-page language
> toggles — there is exactly one `LanguageSwitcher` (in `TopNav`).

### 3.2 Pill tabs (the V2.5+ tab pattern)

Used by `MasterCockpit`, `FunnelEditorModal`, every cockpit-style screen.

```jsx
function TabPill({ id, label, active, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      role="tab"
      aria-selected={active}
      aria-controls={`panel-${id}`}
      className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium ${FOCUS_RING_CLASS} transition-colors disabled:cursor-not-allowed disabled:opacity-50`}
      style={{
        background: active ? NAVY : "white",
        color: active ? "white" : INK,
        border: `1px solid ${active ? NAVY : CREAM2}`,
      }}
    >
      {label}
    </button>
  );
}
```

Wrap in a `role="tablist"` container, render the active panel below with
`role="tabpanel"` and `id="panel-{id}"`.

### 3.3 URL state — `useSearchParams`

Every tab/subview/selector that a user might bookmark or share must live in
the URL. The `MasterCockpit` pattern:

```jsx
import { useSearchParams } from "react-router-dom";

const [params, setParams] = useSearchParams();
const tab = params.get("tab") || "competitions";
const subview = params.get("subview");
const id = params.get("id");

const setTab = (next) => setParams((p) => { p.set("tab", next); p.delete("subview"); p.delete("id"); return p; });
```

Conventional keys: `?tab=…&subview=…&id=…&q=…&filter=…&sort=…&page=…&density=…`.
Always preserve unrelated params on update (`setParams((p) => { p.set(...); return p; })`).

### 3.4 Breadcrumbs / back link

For drill-downs (Edition picker → Session detail), prefer a single editorial
back link over a multi-segment breadcrumb:

```jsx
<button
  type="button"
  onClick={() => setParams((p) => { p.delete("id"); return p; })}
  className={`inline-flex items-center gap-1.5 text-[12.5px] mb-4 ${FOCUS_RING_CLASS} rounded-[4px] px-1.5 py-1`}
  style={{ color: INK }}
>
  <ArrowLeft className="w-3.5 h-3.5" />
  {t(T.backToList)}
</button>
```

Multi-segment breadcrumbs are reserved for ≥3 levels deep (rare in V3.0).

### 3.5 Selector dropdowns (scope picker, edition picker, session picker)

A common cockpit affordance: pick a scope (e.g. "All clubs" vs "Paris" vs
"Berlin"), pick an edition (2026 / 2027), pick a session. Implement as a
re-skinned `Select` from `@/components/design`. The selected state is reflected
in the URL (`?scope=paris&edition=2027`).

Visual: NAVY chevron, CREAM2 hairline, GOLD focus ring. Prefer **two
juxtaposed selects** over a single multi-select for scope + edition pickers
(clearer mental model).

### 3.6 Command palette (V3.0 — Linear-style)

**Goal.** `⌘K` / `Ctrl+K` opens an editorial command palette — quick navigation
(jump to a club / edition / startup / session), quick action ("Create
competition", "Invite jury"), quick search.

**Visual.** Centered modal, narrow (`max-w-[640px]`), white surface, CREAM2
hairline, no shadow. Input is plain (no border) at the top with a GOLD search
icon. Below, sectioned results: "Pages", "Actions", "Recent".

```jsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent
    className="max-w-[640px] p-0 rounded-[4px] overflow-hidden"
    style={{ background: "white", border: `1px solid ${CREAM2}` }}
  >
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${CREAM2}` }}>
      <Search className="w-4 h-4" style={{ color: GOLD }} />
      <input
        autoFocus
        placeholder={t(T.palettePlaceholder)}
        className="flex-1 bg-transparent outline-none text-[14px]"
        style={{ color: INK }}
      />
      <kbd className="text-[10px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-[4px]"
           style={{ color: MUTED, border: `1px solid ${CREAM2}` }}>ESC</kbd>
    </div>
    {/* result groups: section header (eyebrow), item row (icon + label + arrow) */}
  </DialogContent>
</Dialog>
```

Keyboard: `↑↓` navigates, `Enter` selects, `Esc` closes. Each result row gets
the GOLD focus ring on hover/keyboard-active. Use the same tab transition
microinteraction (§8.3) if the palette filters between result groups.

---

## 4. Forms

### 4.1 The `Field` contract

[`src/components/design/form/Field.jsx`](../../src/components/design/form/Field.jsx)

Every input lives in a `Field`. It owns label/required/helper/error chrome
and the ARIA wiring (`htmlFor`, `aria-describedby`, `aria-invalid`,
`aria-required`). Two usage modes — the render-prop form is the safe path:

```jsx
<Field
  label={t(T.email)}
  required
  helper={t(T.emailHelper)}
  error={errors.email}
>
  {({ id, describedBy, invalid }) => (
    <TextInput
      id={id}
      aria-describedby={describedBy}
      invalid={invalid}
      placeholder={t(T.emailPlaceholder)}
      value={email}
      onChange={(e) => setEmail(e.target.value)}
    />
  )}
</Field>
```

### 4.2 Existing controls (re-use, don't reinvent)

| Control       | Module                                              | Notes                                              |
| ------------- | --------------------------------------------------- | -------------------------------------------------- |
| `TextInput`   | `@/components/design/form/TextInput`                | Single-line text; forwards ref + native props.     |
| `Textarea`    | `@/components/design/form/Textarea`                 | Multi-line text.                                   |
| `Select`      | `@/components/design/form/Select`                   | Single choice; re-skinned Radix.                   |
| `TagSelect`   | `@/components/design/form/TagSelect`                | Multi-select removable pills.                      |
| `Dropzone`    | `@/components/design/form/Dropzone`                 | File upload with drag/drop + size/type validation. |
| `RadioYesNo`  | `@/components/design/form/RadioYesNo`               | Binary segmented control.                          |
| `DateField`   | `@/components/design/form/DateField`                | Date entry, GOLD calendar icon.                    |

Shared chrome ([`form/chrome.js`](../../src/components/design/form/chrome.js)):
`inputBase` Tailwind string + `inputStyle({ invalid, disabled })` inline style.
**Every new text-like control re-uses these.**

### 4.3 V3.0 additions (planned — to build)

These compose on top of the `Field` contract and `form/chrome.js`. Build them
under `src/components/design/form/` and export from the barrel.

#### 4.3.1 `ComboBox` — autocomplete single-select

For clubs, sessions, startups (search-as-you-type, can pick from result list).
Use **headlessui Combobox** or **downshift** re-skinned to Élysée chrome.

```jsx
<Field label={t(T.club)} required>
  {({ id, describedBy, invalid }) => (
    <ComboBox
      id={id}
      aria-describedby={describedBy}
      invalid={invalid}
      options={clubs}
      getLabel={(c) => c.name}
      value={form.clubId}
      onChange={(v) => setForm({ ...form, clubId: v })}
      placeholder={t(T.clubPlaceholder)}
      noResultsLabel={t(T.noResults)}
    />
  )}
</Field>
```

Visual: same `inputBase` chrome + a CREAM2 hairline panel below with hover-tint
(`background: TINT_BLUE`) on the highlighted option, GOLD checkmark on the
selected one. Max-height `max-h-[280px]` with internal scroll.

#### 4.3.2 `MultiSelect` — chips

Like `TagSelect` but with a typeahead input. Selected items render as
removable pills inside the input area. Backspace on empty input removes the
last chip.

#### 4.3.3 `NumberInput` — with `+` / `−` stepper

For seats, quorum, score caps. Use INK chevrons inside the input, NAVY on hover,
GOLD ring on focus. `inputMode="numeric"` + `tabular-nums` + min/max/step.

```jsx
<div className="inline-flex items-center" style={{ border: `1px solid ${CREAM2}`, borderRadius: 4, background: "white" }}>
  <button type="button" onClick={dec} className="w-9 h-9 inline-flex items-center justify-center" aria-label="Decrement">
    <Minus className="w-3.5 h-3.5" style={{ color: INK }} />
  </button>
  <input
    type="text" inputMode="numeric" pattern="[0-9]*"
    value={value} onChange={onChange}
    className="w-16 text-center bg-transparent outline-none text-[14px] tabular-nums"
    style={{ color: INK }}
  />
  <button type="button" onClick={inc} className="w-9 h-9 inline-flex items-center justify-center" aria-label="Increment">
    <Plus className="w-3.5 h-3.5" style={{ color: INK }} />
  </button>
</div>
```

#### 4.3.4 `ColorPicker` — simple swatch + hex input

For white-label (§12) — clubs override their accent within a curated set
of swatches plus a free-form hex input.

```jsx
<div className="flex items-center gap-3">
  <div className="flex gap-1.5">
    {PRESETS.map((hex) => (
      <button
        key={hex}
        type="button"
        onClick={() => onChange(hex)}
        aria-label={hex}
        className={`w-7 h-7 rounded-full ${FOCUS_RING_CLASS}`}
        style={{ background: hex, border: hex === value ? `2px solid ${NAVY}` : `1px solid ${CREAM2}` }}
      />
    ))}
  </div>
  <input
    type="text" maxLength={7}
    value={value} onChange={(e) => onChange(e.target.value)}
    className="w-24 px-2 py-1.5 text-[12px] tabular-nums rounded-[4px]"
    style={{ background: "white", border: `1px solid ${CREAM2}`, color: INK }}
  />
</div>
```

Constrain swatches to brand-safe muted tones. Validate hex with luminance
check (no near-black / near-white).

#### 4.3.5 `RichText` — minimal editor

For custom email templates (intro/footer paragraphs) and long descriptions.
Scope: **bold / italic / link / unordered list / ordered list** — nothing
more. Use `@tiptap/react` with the **starter-kit minus** (no headings, no
horizontal rule, no code block, no image — these belong in markdown sources,
not in user-edited rich text).

Visual: hairline CREAM2 toolbar pinned to top, GOLD active state for the
current mark, `inputBase` chrome for the editable area, max height with
internal scroll. Output is sanitized HTML.

### 4.4 Validation patterns

| Stage              | UX                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------- |
| **Inline live**    | On `blur` after first interaction — never while typing. Show `error` prop on the `Field`.     |
| **Submit hard**    | On submit, focus the first invalid field, scroll into view, set `aria-invalid`.               |
| **Async (server)** | Show inline error in `Field.error`; if global (e.g. 5xx), `Alert tone="danger"` above the form. |
| **Required marker** | The GOLD `*` rendered by `Field` when `required`.                                             |
| **Optional marker** | Add `(optional)` in INK in the helper if a required-field-dominant form benefits from it.    |

> **DO** Use a single source of truth for validation (e.g. zod or yup) and feed
> error messages into `Field`. **DO NOT** Show inline errors before the user
> has interacted with the field. **DO NOT** Use red borders without an
> associated error message (no silent invalid state).

### 4.5 Autosave indicator

Pattern: `useAutosaveCompetition` (existing) — every change debounces ~600 ms
then writes; the modal/edit page footer shows the `StatusIndicator` exported
from `FunnelEditorModal`:

| Status   | Visual                                                                  |
| -------- | ----------------------------------------------------------------------- |
| `idle`   | nothing                                                                 |
| `saving` | `Loader2` gold spinner + "Sauvegarde…" (MUTED text)                     |
| `saved`  | `Check` green + "Enregistré" (MUTED text), 1.5 s then fades             |
| `error`  | DANGER text "Erreur — réessayez" (inline retry on click)                |

Always pair autosave with `aria-live="polite"` (saving/saved) or
`aria-live="assertive"` (error).

> **DO NOT** Use a "Save" button for autosaving forms — it confuses the user.
> If you ship one for legacy reasons, mark it secondary and gate it behind
> dirty state.

---

## 5. Data display

### 5.1 Tables — Élysée `DataTable`

The B2B workhorse. Hairline rows, no row borders below the last, cream-tinted
hover, sortable headers, pagination, density toggle. **Collapses to `ListRow`
cards below `md`** — never silent horizontal scroll.

#### 5.1.1 Visual spec

```jsx
<div className="overflow-hidden rounded-[4px]" style={{ border: `1px solid ${CREAM2}`, background: "white" }}>
  <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
    <thead>
      <tr style={{ borderBottom: `1px solid ${CREAM2}` }}>
        {columns.map((col) => (
          <th
            key={col.key}
            scope="col"
            className={`px-4 py-2.5 text-left uppercase tracking-[0.12em] text-[10.5px] font-medium ${col.sortable ? "cursor-pointer select-none" : ""}`}
            style={{ color: MUTED }}
            onClick={col.sortable ? () => onSort(col.key) : undefined}
          >
            <span className="inline-flex items-center gap-1">
              {col.label}
              {col.sortable && (sort.key === col.key
                ? (sort.dir === "asc" ? <ChevronUp className="w-3 h-3" style={{ color: GOLD }} /> : <ChevronDown className="w-3 h-3" style={{ color: GOLD }} />)
                : <ChevronsUpDown className="w-3 h-3" style={{ color: MUTED }} />)}
            </span>
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, i) => (
        <tr
          key={row.id}
          onClick={() => onRowClick?.(row)}
          className="cursor-pointer transition-colors"
          style={{
            borderBottom: i === rows.length - 1 ? "none" : `1px solid ${CREAM2}`,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#faf7f2")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {columns.map((col) => (
            <td
              key={col.key}
              className={`px-4 py-3 ${col.align === "right" ? "text-right tabular-nums" : ""}`}
              style={{ color: INK }}
            >
              {col.render ? col.render(row) : row[col.key]}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

#### 5.1.2 Density toggle

A 3-position segmented control in the table toolbar:

```jsx
<div className="inline-flex rounded-full" style={{ border: `1px solid ${CREAM2}`, background: "white" }}>
  {["compact", "comfortable", "spacious"].map((d) => (
    <button
      key={d}
      type="button"
      onClick={() => setDensity(d)}
      className={`px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] rounded-full ${FOCUS_RING_CLASS}`}
      style={{ background: density === d ? NAVY : "transparent", color: density === d ? "white" : MUTED }}
    >
      {t(T.density[d])}
    </button>
  ))}
</div>
```

Density swaps `py-1.5` (compact) / `py-3` (comfortable) / `py-4` (spacious) on `<td>`.

#### 5.1.3 Filters

Filter chips above the table — each a NAVY pill when active, hairline pill when
inactive. Always render a "Clear all" affordance when ≥1 filter is active. Sync
to URL: `?filter=status:live,country:fr`.

#### 5.1.4 Bulk actions

When ≥1 row is selected (checkbox column), a sticky bulk-action bar replaces
the table toolbar:

```jsx
<div className="flex items-center justify-between px-4 py-2 rounded-[4px]"
     style={{ background: TINT_BLUE, border: `1px solid ${CREAM2}` }}>
  <span className="text-[12.5px]" style={{ color: NAVY }}>
    {t(T.selectedN)(selected.length)}
  </span>
  <div className="flex items-center gap-2">
    <button className="…secondary…">{t(T.exportCsv)}</button>
    <button className="…danger…">{t(T.archive)}</button>
  </div>
</div>
```

#### 5.1.5 Pagination

Page size 25 default, options `[25, 50, 100]`. Pagination control: previous /
1 2 3 … / next, with current page styled NAVY filled and others hairline. Sync
`?page=2&per=50`.

#### 5.1.6 Export CSV

Always available next to filters; client-side serialize the **current**
filtered+sorted view, not the entire dataset, and name the file
`{entity}-{YYYY-MM-DD}.csv`.

### 5.2 KPI cards

```jsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
  {kpis.map((k) => (
    <div
      key={k.label}
      className="rounded-[4px] p-4 md:p-5 flex flex-col gap-1"
      style={{ background: "white", border: `1px solid ${CREAM2}` }}
    >
      <span className="uppercase tracking-[0.14em] text-[10.5px] font-medium" style={{ color: MUTED }}>
        {k.label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-[26px] md:text-[32px] tabular-nums" style={{ color: NAVY, fontWeight: 500 }}>
          {k.value}
        </span>
        {k.delta != null && (
          <span
            className="text-[12px] tabular-nums inline-flex items-center gap-0.5"
            style={{ color: k.delta >= 0 ? SUCCESS : DANGER }}
          >
            {k.delta >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(k.delta).toFixed(1)}%
          </span>
        )}
      </div>
      {k.subtitle && (
        <span className="text-[11px]" style={{ color: INK }}>{k.subtitle}</span>
      )}
    </div>
  ))}
</div>
```

Delta colors: **positive = `SUCCESS`** (sage green), **negative = `DANGER`**
(brick) — but only when the metric has a "good" direction (revenue up = good;
churn up = bad → flip color). For metrics without a moral direction (e.g.
"sessions"), use `MUTED` and `GOLD` for the arrow.

### 5.3 Charts — Recharts in Élysée palette

```jsx
const CHART_COLORS = {
  primary: NAVY,       // line / bar primary
  accent: GOLD,        // line / bar accent or single highlight
  positive: SUCCESS,
  negative: DANGER,
  warning: WARNING,
  grid: CREAM2,
  axis: MUTED,
  tooltipBg: "white",
  tooltipBorder: CREAM2,
};
```

Patterns:

| Chart        | Recipe                                                                                  |
| ------------ | --------------------------------------------------------------------------------------- |
| **Timeline** (line) | `LineChart` + `Line stroke={NAVY} strokeWidth={2} dot={false}`, GOLD accent for the secondary series. |
| **Bar** (stacked) | `BarChart` + `Bar` in NAVY / GOLD / TINT_BLUE / TINT_SAGE — never saturated.    |
| **Heatmap**  | Build with `recharts` `Treemap` or custom grid; cells in `linear-gradient` from CREAM2 (low) to GOLD (high). |
| **Funnel**   | Custom — horizontal bars NAVY → GOLD, hairline drop between stages, % label in MUTED.   |
| **Donut**    | Reserved for ≤4 slices; otherwise prefer a bar chart. NAVY + GOLD + TINT_SAGE + TINT_BLUE.|

Tooltip: white surface, CREAM2 hairline, no shadow, serif title (the
hovered label), INK body. Axis ticks in MUTED `text-[10px]`.

### 5.4 Cards — hover lift

The card pattern from `SessionCard` and `ActionRow` — hairline CREAM2,
`-translate-y-0.5` + `shadow-sm` + `border-[#c9a84c]/60` on hover, GOLD focus
ring. Radius is `4px` for most cards; `SessionCard` uses `10px` as the single
sanctioned softer corner for high-emphasis hero cards.

```jsx
<article
  className={`bg-white rounded-[4px] p-4 md:p-5 flex flex-col gap-4 cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm hover:border-[#c9a84c]/60 ${FOCUS_RING_CLASS}`}
  style={{ border: `1px solid ${CREAM2}` }}
>
  …
</article>
```

### 5.5 Status pills

[`src/components/design/StatusPill.jsx`](../../src/components/design/StatusPill.jsx).
The shared status→tone map lives in `STATUS_MAP` and serves three lifecycles
(`eligibility` / `jury` / `dossier`). Every role renders identical states.

> **DO** Pass a resolved FR/EN/DE `label`. **DO NOT** Color pill text — the
> dot carries the tone, the text stays NAVY/INK for contrast. **DO NOT**
> Invent a per-screen color mapping.

V3.0 status additions to keep in mind (extend `STATUS_MAP` in the same file
when needed):

| Lifecycle  | Status      | Tone          |
| ---------- | ----------- | ------------- |
| `webhook`  | `pending`   | NEUTRAL       |
| `webhook`  | `delivered` | SUCCESS       |
| `webhook`  | `failed`    | DANGER        |
| `invite`   | `sent`      | INFO          |
| `invite`   | `accepted`  | SUCCESS       |
| `invite`   | `expired`   | NEUTRAL       |
| `payment`  | `due`       | WARN          |
| `payment`  | `paid`      | SUCCESS       |
| `payment`  | `failed`    | DANGER        |

### 5.6 Empty states

```jsx
<div className="rounded-[4px] py-10 px-6 text-center" style={{ background: "white", border: `1px dashed ${CREAM2}` }}>
  <Icon className="w-6 h-6 mx-auto" style={{ color: MUTED }} />
  <h3 className="mt-4 text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
    {t(T.emptyTitle)}
  </h3>
  <p className="mt-2 text-[13px] max-w-[40ch] mx-auto" style={{ color: INK }}>
    {t(T.emptyDescription)}
  </p>
  {action && (
    <button
      className={`mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-[4px] text-[13px] font-medium ${FOCUS_RING_CLASS}`}
      style={{ background: NAVY, color: "white" }}
    >
      {action.label}
    </button>
  )}
</div>
```

Vercel-style: never an oversized illustration. Use a single lucide icon at
`w-6 h-6` in MUTED, the serif title, INK description, one primary CTA.

### 5.7 Loading states

| Trigger                                 | Use                                                |
| --------------------------------------- | -------------------------------------------------- |
| Initial route load                      | Route-level Suspense fallback with `SkeletonList`. |
| Data fetch < 500 ms                     | Nothing — let React Query show stale data.         |
| Data fetch ≥ 500 ms                     | `Skeleton` placeholders that mirror final layout.  |
| Button/input busy                       | Inline `Loader2` gold spinner inside the control.  |
| Background autosave                     | `StatusIndicator` in the footer (§4.5).            |

[`src/components/design/Skeleton.jsx`](../../src/components/design/Skeleton.jsx)
exports `Skeleton` + `SkeletonList`. To build on top:

```jsx
// SkeletonCard — matches a KPI card silhouette
export function SkeletonCard() {
  return (
    <div className="rounded-[4px] p-4 md:p-5" style={{ background: "white", border: `1px solid ${CREAM2}` }}>
      <Skeleton height={11} width="40%" className="mb-3" />
      <Skeleton height={28} width="60%" />
      <Skeleton height={11} width="30%" className="mt-2" />
    </div>
  );
}

// SkeletonChart — placeholder for a chart panel
export function SkeletonChart({ height = 240 }) {
  return (
    <div className="rounded-[4px] p-4" style={{ background: "white", border: `1px solid ${CREAM2}` }}>
      <Skeleton height={14} width="30%" className="mb-3" />
      <Skeleton height={height} />
    </div>
  );
}
```

### 5.8 Error states

```jsx
<div className="rounded-[4px] p-5" style={{ background: TINT_DANGER, border: `1px solid ${DANGER}33` }}>
  <div className="flex items-start gap-3">
    <AlertTriangle className="w-4 h-4 mt-0.5" style={{ color: DANGER }} />
    <div className="flex-1 min-w-0">
      <h3 className="text-[14px] font-medium" style={{ color: NAVY }}>
        {t(T.errorTitle)}
      </h3>
      <p className="mt-1 text-[13px]" style={{ color: INK }}>
        {t(T.errorMessage)}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium ${FOCUS_RING_CLASS}`}
        style={{ background: "white", color: NAVY, border: `1px solid ${CREAM2}` }}
      >
        <RotateCw className="w-3.5 h-3.5" />
        {t(T.retry)}
      </button>
      {detail && (
        <details className="mt-3">
          <summary className="text-[11px] cursor-pointer" style={{ color: MUTED }}>
            {t(T.technicalDetail)}
          </summary>
          <pre className="mt-1 text-[10.5px] p-2 rounded-[4px] overflow-x-auto" style={{ background: "white", border: `1px solid ${CREAM2}`, color: INK }}>
            {detail}
          </pre>
        </details>
      )}
    </div>
  </div>
</div>
```

---

## 6. Overlays

### 6.1 Modals — `FunnelEditorModal` pattern

[`src/components/rsa/admin/platform/funnel/FunnelEditorModal.jsx`](../../src/components/rsa/admin/platform/funnel/FunnelEditorModal.jsx)
is the canonical Élysée modal. Lift its shell pattern into a generic
`Dialog`/`Modal` component for V3.0 if a reusable primitive is needed.

Key specs:

- Backdrop: `rgba(250,247,242,0.6)` (CREAM at 60%) + `backdrop-filter: blur(8px)`
  with `-webkit-backdrop-filter` fallback. Safari fallback: opaque `rgba(15,31,61,0.45)` when
  `@supports not (backdrop-filter: blur(0))`.
- Animation: backdrop `opacity 0→1` (200 ms ease). Dialog `opacity + scale 0.97 + y 8 → 1/1/0`
  (280 ms ease `EASE`).
- Surface: white, CREAM2 hairline, `rounded-[4px]`, `max-w-[920px]` standard
  or `max-w-[1100px]` wide.
- Header sticky: eyebrow GOLD + serif title NAVY + close button (X) right.
- Tab pill row (optional): NAVY active, white-CREAM2 inactive (§3.2).
- Body scrollable: `px-6 py-5`.
- Footer sticky: destructive slot left, autosave `StatusIndicator` + close right.
- Behavior: ESC closes (with confirm if `status === "saving"`), click-outside
  closes, `body` scroll lock on open, focus trap minimal (Tab/Shift+Tab cycle,
  initial focus on first focusable), `role="dialog" aria-modal="true" aria-label`.

> **DO** Reuse the `FunnelEditorModal` shell for every multi-tab configuration
> surface. **DO NOT** Hand-roll a new modal — extract a generic one first.

### 6.2 Drawers — slide-in from the right

For detail views that should preserve list context (`SessionDetailDrawer`
pattern). Slide-in from right, `max-w-[480px]` (single column) or `max-w-[720px]`
(wide / split). Same backdrop blur as modals.

```jsx
<motion.aside
  initial={{ x: "100%" }}
  animate={{ x: 0 }}
  exit={{ x: "100%" }}
  transition={{ duration: 0.3, ease: EASE }}
  className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[480px] flex flex-col"
  style={{ background: "white", borderLeft: `1px solid ${CREAM2}` }}
  role="dialog" aria-modal="true" aria-label={title}
>
  {/* header sticky: title + close */}
  {/* body scrollable */}
  {/* footer sticky (optional) */}
</motion.aside>
```

### 6.3 Popovers

For form helpers, contextual info, mini-toolbars. Re-skin Radix Popover:

| Variant      | Visual                                                                  |
| ------------ | ----------------------------------------------------------------------- |
| **Tooltip**  | Small (`max-w-[240px]`), NAVY surface, white text, `text-[11px]`, no arrow, 6 ms delay open / 0 ms close. Use for icon-only buttons and column header hints. |
| **Popover**  | Larger (`max-w-[360px]`), white surface, CREAM2 hairline, INK body, `text-[12.5px]`. Use for "configure column" / "more options" / "share". |

Both: animate `opacity + scale 0.96 → 1` (180 ms `EASE`), GOLD focus ring on
trigger.

### 6.4 Toasts — Sonner re-skin

Theme the existing `ui/sonner` to Élysée:

```jsx
// In the Sonner config
{
  toastOptions: {
    style: {
      background: "white",
      color: NAVY,
      border: `1px solid ${CREAM2}`,
      borderLeft: `2px solid ${NAVY}`,
      borderRadius: 4,
      fontFamily: "'Inter', sans-serif",
      fontSize: 13,
    },
    classNames: {
      title: "font-medium",
      description: "text-[12px] mt-0.5",
    },
  },
}
```

Tone variants override the left border color:

| Tone       | Left border |
| ---------- | ----------- |
| `default`  | `NAVY`      |
| `success`  | `GREEN_TODAY` |
| `error`    | `DANGER`    |
| `warning`  | `WARNING`   |
| `info`     | `NAVY`      |

Position: bottom-right desktop, bottom-center mobile. Duration: 4 s default,
6 s for errors, persistent for actionable (with explicit dismiss).

### 6.5 Confirmations — 3-step typed-confirm

For destructive actions (delete competition, delete club, purge data). Pattern
lifted from `DeleteCompetitionModal`:

1. **Step 1 — preview.** Show what will be deleted (counts of dependents).
   Primary action: "Continuer".
2. **Step 2 — typed confirmation.** "Tapez `{name}` pour confirmer" — text
   input must exactly match. Primary action: "Supprimer" stays disabled until
   match.
3. **Step 3 — execute.** Spinner during call, success toast, modal closes,
   list refreshes.

The "Supprimer" button uses the `danger` variant (muted brick text + outline,
never bright red).

```jsx
<button
  type="button"
  disabled={typed !== expected}
  onClick={onConfirm}
  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-[4px] text-[13px] font-medium ${FOCUS_RING_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
  style={{ background: "white", color: DANGER, border: `1px solid ${DANGER}` }}
>
  {t(T.delete)}
</button>
```

> **DO NOT** Use a single `confirm()` for any irreversible action — always the
> 3-step pattern. **DO NOT** Pre-fill the typed input.

---

## 7. Feedback & communication

### 7.1 Email templates — Élysée bulletproof `<table>`

Source: [`docs/deepsolve/email-smtp-resend-setup.md`](../deepsolve/email-smtp-resend-setup.md).
Existing magic-link template is the canonical example.

Rules:

- **Table-based layout** — no flex, no grid, no CSS variables, no SVG.
- **Inline styles only** — no `<style>` block; some clients strip them.
- **Web-safe fonts** — Georgia serif fallback for Playfair; Helvetica/Arial
  fallback for Inter. Font import attempted via `<link>` head (works in
  ~60% of clients) with fallback intact.
- **Single column**, max 600 px wide, centered.
- **CREAM background**, white card with CREAM2 hairline border (`border-collapse: separate`).
- **GOLD hairline rule** above the title (28×1.5 px, rendered as a tiny `<td>`
  with `background-color: #c9a84c; height: 2px; width: 28px;`).
- **NAVY primary CTA** as a `<table>` button:

```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr><td bgcolor="#0f1f3d" style="border-radius:4px;">
    <a href="{{url}}" target="_blank"
       style="display:inline-block;padding:12px 24px;color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:500;text-decoration:none;border-radius:4px;">
      {{cta}}
    </a>
  </td></tr>
</table>
```

- **Footer** — small Inter (with Helvetica fallback), MUTED color, hairline
  separator, signature: *"Rotary Startup Award — Commission Rotary Club de
  Paris"*.

Always provide a plain-text alternative (`text/plain` part).

### 7.2 Banners — inline contextual alerts

Use `Alert` (planned in Designbook §5.7) — left tone-colored 2 px bar, pastel
tint background, INK body, optional dismiss.

```jsx
function Alert({ tone = "info", title, children, onDismiss }) {
  const TONE = {
    info:    { bg: TINT_BLUE,    bar: NAVY,          icon: Info },
    success: { bg: TINT_SAGE,    bar: GREEN_TODAY,   icon: Check },
    warning: { bg: TINT_WARNING, bar: WARNING,       icon: AlertTriangle },
    danger:  { bg: TINT_DANGER,  bar: DANGER,        icon: AlertCircle },
  }[tone];
  const Icon = TONE.icon;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className="rounded-[4px] p-3 md:p-4 flex items-start gap-3"
      style={{ background: TONE.bg, borderLeft: `2px solid ${TONE.bar}` }}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: TONE.bar }} aria-hidden />
      <div className="flex-1 min-w-0">
        {title && <div className="text-[13px] font-medium" style={{ color: NAVY }}>{title}</div>}
        <div className="text-[12.5px] mt-0.5" style={{ color: INK }}>{children}</div>
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className={`p-1 -m-1 rounded-[4px] ${FOCUS_RING_CLASS}`} aria-label="Dismiss">
          <X className="w-3.5 h-3.5" style={{ color: MUTED }} />
        </button>
      )}
    </div>
  );
}
```

### 7.3 Progress bars

| Variant      | Use                                                                |
| ------------ | ------------------------------------------------------------------ |
| **Linear**   | Form completion, file upload, multi-step wizard, autosave throttle. |
| **Circular** | Inline busy in compact spaces (autosave indicator, button spinner). |

Linear:

```jsx
<div className="h-1 w-full rounded-full overflow-hidden" style={{ background: CREAM2 }}>
  <div
    className="h-full transition-[width] duration-300 ease-out"
    style={{ width: `${pct}%`, background: GOLD }}
    role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
  />
</div>
```

Circular (size = 20 px default):

```jsx
<svg width={20} height={20} viewBox="0 0 20 20" role="progressbar" aria-valuenow={pct}>
  <circle cx="10" cy="10" r="8" fill="none" stroke={CREAM2} strokeWidth="2" />
  <circle cx="10" cy="10" r="8" fill="none" stroke={GOLD} strokeWidth="2"
          strokeDasharray={Math.PI * 16} strokeDashoffset={Math.PI * 16 * (1 - pct / 100)}
          transform="rotate(-90 10 10)" />
</svg>
```

### 7.4 Spinners

Single pattern: `<Loader2 className="w-4 h-4 animate-spin" style={{ color: GOLD }} />`
inside the surface that's busy (button, input, footer indicator). The GOLD
spinner is the platform's "I'm thinking" cue.

> **DO NOT** Use a full-screen spinner overlay. Either skeleton, or inline.

---

## 8. Microinteractions

The motion language. Every transition uses `EASE = [0.22, 1, 0.36, 1]` and
respects `prefers-reduced-motion`.

### 8.1 Press feedback

`button:active { transform: scale(0.98); }` — already in `index.css`. Confirms
the click without animation overhead.

### 8.2 Hover lift (cards)

`hover:-translate-y-0.5 hover:shadow-sm hover:border-[#c9a84c]/60`,
`transition-all duration-200 ease-out`. Lifts ~2 px, adds the only sanctioned
shadow, hints with a softened GOLD border.

### 8.3 Tab transitions — `AnimatePresence mode="wait"`

When switching between cockpit tabs or modal tabs:

```jsx
<AnimatePresence mode="wait" initial={false}>
  <motion.div
    key={activeTab}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.22, ease: EASE }}
  >
    {renderTab(activeTab)}
  </motion.div>
</AnimatePresence>
```

### 8.4 Modal — scale + y + backdrop blur

Backdrop `opacity 0→1` (200 ms). Dialog `opacity + scale 0.97 + y 8 → 1/1/0`
(280 ms `EASE`). See §6.1.

### 8.5 Autosave indicator — `saving` / `saved` fade

`StatusIndicator` from `FunnelEditorModal`. `saving` slides in `y 2 → 0`,
`saved` scales in `0.92 → 1`. Both with `aria-live="polite"`.

### 8.6 Reduced motion (binding)

All ambient loops (logo rotation, halo breathing, gold-bar pulse, skeleton
shimmer) gate behind:

```css
@media (prefers-reduced-motion: reduce) {
  .rsa-halo, .rsa-bar-pulse, .animate-pulse { animation: none !important; }
}
```

framer-motion: gate variants behind
`const reduce = useReducedMotion();` and switch to `transition: { duration: 0 }`.

> **DO** Keep UI transitions 180–700 ms. **DO NOT** Animations longer than
> 900 ms (loops excepted), bounce eases, rotating conic borders, particles,
> 3D card tilt.

---

## 9. Accessibility WCAG AA

### 9.1 Contrast

Verified on `CREAM` (`#faf7f2`):

| Pair                   | Ratio | Verdict        |
| ---------------------- | ----- | -------------- |
| `NAVY` on `CREAM`      | 13.8:1 | AAA (text & UI) |
| `INK` on `CREAM`       | 8.6:1  | AAA            |
| `MUTED` on `CREAM`     | 3.3:1  | **decorative only** — eyebrows, meta, J-X. Never load-bearing text. |
| `GOLD` on `NAVY`       | 6.4:1  | AA large + UI  |
| `NAVY` on `GOLD`       | 6.4:1  | AA             |
| `DANGER` on `CREAM`    | 5.8:1  | AA             |
| `WARNING` on `CREAM`   | 7.4:1  | AAA            |
| `GREEN_TODAY` on `CREAM` | 5.9:1 | AA             |

> **DO NOT** Use `MUTED` for any text the user must read to act (button label,
> form value, table cell content). Only for **decoration**.

### 9.2 Focus visible

Every interactive element gets the GOLD ring (§1.6). Hover-only affordances
are forbidden — every hover must have a keyboard equivalent.

### 9.3 ARIA — the essentials checklist

| Element                          | ARIA                                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| Tab buttons                      | `role="tab" aria-selected={active} aria-controls={panelId}`                         |
| Tab panels                       | `role="tabpanel" id={panelId} aria-labelledby={tabId}`                              |
| Modal                            | `role="dialog" aria-modal="true" aria-label={title}`                                |
| Toggle (on/off)                  | `role="switch" aria-checked={active}`                                                |
| Toggle button (pressed state)    | `aria-pressed={active}`                                                              |
| Form inputs                      | wired by `Field` (`aria-describedby`, `aria-invalid`, `aria-required`)              |
| Live regions (autosave, toast)   | `aria-live="polite"` (info) / `aria-live="assertive"` (error)                       |
| Icon-only button                 | `aria-label="…"`                                                                     |
| Decorative icon                  | `aria-hidden`                                                                        |
| Progressbar                      | `role="progressbar" aria-valuemin aria-valuemax aria-valuenow`                       |

### 9.4 Keyboard navigation (binding)

| Key            | Action                                                                          |
| -------------- | ------------------------------------------------------------------------------- |
| `Tab` / `Shift+Tab` | Move focus forward / backward. Modals trap focus.                          |
| `Enter`        | Activate the focused button / link.                                             |
| `Space`        | Activate buttons, toggle checkboxes, scroll a focused region.                    |
| `Esc`          | Close modal, drawer, popover, command palette.                                  |
| `↑ ↓`          | Navigate within `ComboBox` / `MultiSelect` / command palette / table rows (when row navigation enabled). |
| `← →`          | Navigate within tab lists (when `role="tablist"`).                              |
| `⌘K` / `Ctrl+K` | Open command palette.                                                          |

### 9.5 Screen reader

- All form labels live in `Field` (associated via `htmlFor`).
- Page titles in `<h1>` once per page; section titles in `<h2>` / `<h3>` —
  never skip a level.
- Status changes announced via `aria-live`.
- Decorative ornaments (gold rule, sheen sweep, breathing bar) carry
  `aria-hidden`.
- Visually-hidden labels use `sr-only` (already supported by Tailwind).

### 9.6 Touch targets

Minimum 44×44 px on mobile (Apple HIG / WCAG 2.5.5). The shared `inputBase`
sets `min-h-[44px] md:min-h-[40px]`. Apply the same to mobile nav links and
button-sized icons.

---

## 10. Internationalization (FR/EN/DE)

### 10.1 `useLang()` + `dict { fr, en, de }`

Pattern from `src/lib/platform/i18n.jsx`. Every screen:

```jsx
import { useLang } from "@/lib/platform/i18n";

const T = {
  title:    { fr: "Tableau de bord", en: "Dashboard", de: "Dashboard" },
  greeting: { fr: "Bonjour", en: "Hello", de: "Hallo" },
  // For interpolated copy, use a function:
  itemsCount: {
    fr: (n) => `${n} élément${n > 1 ? "s" : ""}`,
    en: (n) => `${n} item${n > 1 ? "s" : ""}`,
    de: (n) => `${n} Element${n === 1 ? "" : "e"}`,
  },
  // TODO refine DE copy — review with a native speaker before launch
  legalDe: { fr: "Mentions légales", en: "Legal notice", de: "Impressum" },
};

const { t, lang } = useLang();
<h1>{t(T.title)}</h1>
<p>{t(T.itemsCount)(items.length)}</p>
```

> **DO** Annotate every German-only string that needs native review with
> `// TODO refine DE copy`. **DO NOT** Hard-code a visible string inside a
> component — always go through the dict.

### 10.2 Intl formats

Dates, numbers, currencies use `Intl` with the active locale:

```jsx
const fmtDate = new Intl.DateTimeFormat(localeMap[lang], { dateStyle: "long" });
const fmtMoney = new Intl.NumberFormat(localeMap[lang], { style: "currency", currency: "EUR" });
const localeMap = { fr: "fr-FR", en: "en-GB", de: "de-DE" };
```

For sessions and editorial dates, prefer the existing `formatSessionDate(date, lang)`
helper from `src/lib/rsa/constants.js`.

### 10.3 Direction — LTR only

V3.0 ships LTR only (no RTL locale). Do not use `start`/`end` logical
properties prematurely; stick to `left`/`right`. Revisit when an RTL locale
(AR/HE) is on the roadmap.

### 10.4 Pitch content stays English

Editorial convention: jury-facing pitch content (titles, abstracts, Q&A) stays
English regardless of chrome language (international jury). Only the chrome
(nav, labels, helpers, buttons, status pills) is FR/EN/DE.

---

## 11. Performance

### 11.1 Lazy-load routes

Every route component is split via `React.lazy`:

```jsx
import { lazy, Suspense } from "react";
import { SkeletonList } from "@/components/design";

const AdminCockpit = lazy(() => import("@/pages/AdminCockpit"));

<Route
  path="/Admin"
  element={
    <Suspense fallback={<SkeletonList count={5} height={80} />}>
      <AdminCockpit />
    </Suspense>
  }
/>
```

Initial bundle target: **≤ 200 KB gzipped** for the landing + auth. Cockpit
bundles split per role.

### 11.2 Images

- Always set explicit `width` + `height` (CLS).
- Hero/logo: served from `/public` (small, brand-controlled).
- User uploads: Supabase Storage with `transform={{ width, quality }}`.
- Decorative images: `loading="lazy"`, `decoding="async"`.

### 11.3 React Query — generous `staleTime`

```jsx
useQuery({
  queryKey: ["competitions"],
  queryFn: fetchCompetitions,
  staleTime: 5 * 60 * 1000,        // 5 min for stable lists
  gcTime: 30 * 60 * 1000,
});
```

| Data criticality          | `staleTime`         |
| ------------------------- | ------------------- |
| Static catalogs (clubs, criteria) | 5–15 min     |
| Dashboards, lists         | 60–120 s            |
| Cockpit detail (autosave) | 30 s                |
| Real-time (live scoring)  | 0 (subscribe)       |

### 11.4 Skeleton > spinner threshold

Show a skeleton when the load is `≥ 500 ms`. Below that, let stale data render
or show nothing. A spinner is for **in-control busy** (button, input, footer
indicator) — never as a page-level loader.

---

## 12. White-label (V3.0 readiness)

V3.0 ships a multi-club mode where each club can lightly customise its
surface. The customization is **scoped to two CSS variables** (the brand keeps
its institutional voice — clubs only modulate the accent and the wordmark).

### 12.1 CSS variables override

Add at the document root, scoped under a club's mount:

```jsx
<div
  style={{
    "--rsa-navy": club.brandNavy || NAVY,
    "--rsa-gold": club.brandGold || GOLD,
  }}
>
  …
</div>
```

In components, opt-in to override-aware tokens via `var(--rsa-navy, #0f1f3d)`.
Default tokens stay the source for non-club surfaces.

Validate the override at write time:

- `--rsa-navy` luminance must remain in `[5, 25]` (still dark).
- `--rsa-gold` luminance must remain in `[55, 75]` (still warm accent, not red).
- Reject any color that breaks AA on `CREAM`.

### 12.2 Logo / wordmark slot

`TopNav` already accepts `wordmark` and `subtitle` props. White-label clubs
override:

```jsx
<TopNav
  wordmark={club.wordmark || "Rotary Startup Award 2026"}
  subtitle={club.subtitle}
/>
```

A future `TopNav` extension can also accept a `logoNode` prop for clubs that
ship an SVG mark (must be ≤ 30 px tall, monochrome — re-tinted to the active
`--rsa-gold`).

### 12.3 Footer signature

Same pattern as wordmark — the `Footer` accepts `left` / `right` nodes;
white-labeled clubs override to "Club Rotary de {name} — RSA". The default
"Rotary Startup Award — Commission Rotary Club de Paris" remains for the
platform surface.

---

## 13. Extension UI patterns (V3.0)

V3.0 introduces light extensibility — third-party clubs (or future
integrators) can extend funnel steps, cockpit tabs, and webhook configuration
without forking the codebase.

### 13.1 Plugin slots — `<ExtensionSlot />`

A named slot that renders all extensions registered for a kind. Extensions
register via a manifest at boot:

```jsx
// Slot usage
<ExtensionSlot kind="funnel_step" position="after-eligibility" ctx={{ dossier }} />
<ExtensionSlot kind="cockpit_tab" ctx={{ scope, edition }} />

// Slot implementation (sketch)
function ExtensionSlot({ kind, position, ctx }) {
  const extensions = useExtensions(kind, position);
  return (
    <>
      {extensions.map((ext) => (
        <ext.Component key={ext.id} ctx={ctx} />
      ))}
    </>
  );
}
```

Conventional kinds:

| Kind             | Where                                                         |
| ---------------- | ------------------------------------------------------------- |
| `funnel_step`    | Insert a custom step in the candidature funnel (FunnelEditorModal pattern). |
| `cockpit_tab`    | Add a tab in `MasterCockpit` or `ClubCockpit`.                |
| `dossier_panel`  | Add a panel in the dossier detail drawer.                     |
| `nav_item`       | Add a `NavMenu` entry (role-aware).                           |
| `kpi_card`       | Inject a KPI card in the dashboard hero.                      |

Every extension follows the same visual rules (Élysée tokens, hairline cards,
GOLD focus ring) — the slot does **not** add a frame; the extension is
responsible for its own card chrome.

### 13.2 Custom config UI — JSON Schema → form

For extension configuration (e.g. "Webhook config: URL + events + secret"), an
extension exposes a JSON Schema; the platform renders a form from it using the
existing `Field` + form controls. Inspired by Refactoring UI's "let the data
shape the form".

Schema → control mapping:

| JSON Schema             | Control                                  |
| ----------------------- | ---------------------------------------- |
| `type: "string"`        | `TextInput`                              |
| `type: "string", format: "email"` | `TextInput type="email"`        |
| `type: "string", format: "uri"` | `TextInput type="url"`            |
| `type: "string", enum: [...]` | `Select`                            |
| `type: "string", format: "date"` | `DateField`                       |
| `type: "string", maxLength > 200` | `Textarea`                       |
| `type: "number"` / `integer` | `NumberInput` (with min/max/step)    |
| `type: "boolean"`       | `RadioYesNo` or `StatusToggle`           |
| `type: "array", items.enum: [...]` | `MultiSelect`                   |

The form uses `Field` for labels (`title` in schema), helper (`description`),
required (`required` array on parent), error (validation messages).

### 13.3 Webhook config form

A concrete instance of §13.2 — fields:

| Field      | Control                               |
| ---------- | ------------------------------------- |
| URL        | `TextInput type="url"` (required, regex validated) |
| Events     | `MultiSelect` (predefined list)       |
| Secret     | `TextInput type="password"` + "Generate" button (NAVY secondary) |
| Active     | `StatusToggle` (`role="switch"`)      |
| Description | `Textarea` (optional, max 280)       |

Display recent deliveries below as a `DataTable` with `webhook` status pills
(§5.5).

---

## 14. Anti-patterns

The binding list of "never do this". When in doubt, default to NOT doing.

### Visual

- Bright system colors (`#ef4444` red, `#22c55e` green, `#3b82f6` blue). Use
  `DANGER` / `SUCCESS` / `NAVY` / `TINT_*`.
- `rounded-md` / `rounded-lg` / `rounded-2xl` / `rounded-3xl` — radius is `4px`
  for surfaces, `9999px` for pills, period.
- `shadow-md` / `shadow-lg` / glow / neumorphic / "soft UI". Flat with
  hairlines.
- Saturated gradient backgrounds, mesh gradients, animated conic borders.
- Hex declared inline in a component. Always import from the barrel.
- Emojis in chrome (nav, buttons, labels, tables, form helpers). The only
  sanctioned emojis are *content* (results page trophies).
- More than two font families.
- Bold (700+) Playfair.

### Layout / spacing

- Pixel values off the 4 px grid (no `px-[7px]`, `mt-[13px]`).
- Mixed radii within a single composition.
- Silent horizontal scroll on tables. Collapse to `ListRow` cards on mobile.
- Per-page font `@import`. Hoist into `PageShell`.
- Re-implementing the language switcher per page. One `LanguageSwitcher`.

### Motion

- UI transitions `< 180 ms` (feels broken) or `> 900 ms` (feels slow), loops
  excepted.
- Bouncy eases (`cubic-bezier(.68,-.55,.27,1.55)`), spring overshoot,
  3D card tilt on hover, particles.
- Animated loops without a `prefers-reduced-motion` gate.

### Forms

- Bare `<input>` without an associated `<label>` / `Field`.
- Inline validation while the user is still typing (do on blur).
- "Save" button on autosaving forms.
- Silent invalid state — every red border must have an error message.
- Pre-filled typed-confirm input on destructive actions.

### Navigation

- Multi-segment breadcrumb for ≤ 2 levels. Use a single "← Back to X" link.
- Hand-rolled per-page header. Use `TopNav`.
- State that should be in the URL kept in component state (lose-on-refresh).

### Accessibility

- `MUTED` color on essential text.
- Hover-only affordances with no keyboard equivalent.
- Removed focus ring (`outline-none` without `focus-visible:ring-*`).
- Modal without focus trap and ESC handler.

### Communication

- HTML emails with `<style>` blocks, `<flex>`, `<grid>`, web fonts as the
  only fallback. Use bulletproof `<table>` + Helvetica/Georgia fallback.
- Toast for blocking errors. Use an inline `Alert tone="danger"`.
- Full-screen spinner overlay. Use skeleton or inline.

---

## 15. Anchors / file map

### Tokens

- [`src/components/design/tokens.js`](../../src/components/design/tokens.js) — core palette + EASE + SERIF + SANS + FONTS_IMPORT.
- [`src/components/design/tokens.app.js`](../../src/components/design/tokens.app.js) — DANGER / WARNING / SUCCESS / FOCUS_RING / RADIUS / HAIRLINE.
- [`src/components/design/index.js`](../../src/components/design/index.js) — the barrel: import everything from `@/components/design`.

### Editorial primitives

- [`Eyebrow.jsx`](../../src/components/design/Eyebrow.jsx) — uppercase gold-rule label.
- [`EditorialTitle.jsx`](../../src/components/design/EditorialTitle.jsx) — two-line serif title.
- [`HeroEventCard.jsx`](../../src/components/design/HeroEventCard.jsx) — breathing left-bar pattern.
- [`ActionRow.jsx`](../../src/components/design/ActionRow.jsx) — clickable editorial tile with gold strokes.
- [`UpcomingList.jsx`](../../src/components/design/UpcomingList.jsx) — numbered editorial list.

### App shell

- [`shell/PageShell.jsx`](../../src/components/design/shell/PageShell.jsx) — frame, halo, grain, fonts.
- [`shell/TopNav.jsx`](../../src/components/design/shell/TopNav.jsx) — sticky NAVY bar, role-aware.
- [`shell/NavMenu.jsx`](../../src/components/design/shell/NavMenu.jsx) — role-filtered items.
- [`shell/Footer.jsx`](../../src/components/design/shell/Footer.jsx) — hairline footer.
- [`shell/LanguageSwitcher.jsx`](../../src/components/design/shell/LanguageSwitcher.jsx) — FR/EN/DE pill toggle.

### Forms

- [`form/chrome.js`](../../src/components/design/form/chrome.js) — shared input chrome (Tailwind + style).
- [`form/Field.jsx`](../../src/components/design/form/Field.jsx) — label / required / helper / error + ARIA.
- [`form/TextInput.jsx`](../../src/components/design/form/TextInput.jsx).
- [`form/Textarea.jsx`](../../src/components/design/form/Textarea.jsx).
- [`form/Select.jsx`](../../src/components/design/form/Select.jsx).
- [`form/TagSelect.jsx`](../../src/components/design/form/TagSelect.jsx).
- [`form/Dropzone.jsx`](../../src/components/design/form/Dropzone.jsx).
- [`form/RadioYesNo.jsx`](../../src/components/design/form/RadioYesNo.jsx).
- [`form/DateField.jsx`](../../src/components/design/form/DateField.jsx).

### Status + loading

- [`StatusPill.jsx`](../../src/components/design/StatusPill.jsx) — `STATUS_MAP` for eligibility / jury / dossier.
- [`Skeleton.jsx`](../../src/components/design/Skeleton.jsx) — `Skeleton` + `SkeletonList`.

### Auth

- [`auth/MagicLinkLogin.jsx`](../../src/components/design/auth/MagicLinkLogin.jsx) — single-door magic-link login.

### Production reference implementations

- [`rsa/admin/platform/funnel/FunnelEditorModal.jsx`](../../src/components/rsa/admin/platform/funnel/FunnelEditorModal.jsx) — modal pattern, autosave indicator, focus trap, backdrop blur.
- [`rsa/admin/platform/master/MasterCockpit.jsx`](../../src/components/rsa/admin/platform/master/MasterCockpit.jsx) — cockpit shell, pill tabs, URL state, status strip.
- [`rsa/concours-dashboard/SessionCard.jsx`](../../src/components/rsa/concours-dashboard/SessionCard.jsx) — card hover-lift pattern.
- [`rsa/eligibility/EligibilityRulesEditor.jsx`](../../src/components/rsa/eligibility/EligibilityRulesEditor.jsx) — toggle + params card pattern.

### Documentation

- [`docs/design/elysee-designbook.md`](./elysee-designbook.md) — brand SSOT (this catalog extends it).
- [`docs/design/elysee-audit.md`](./elysee-audit.md) — palette gap audit that produced `tokens.app.js`.
- [`docs/design/elysee-blueprint.md`](./elysee-blueprint.md) — component build order.
- [`docs/deepsolve/email-smtp-resend-setup.md`](../deepsolve/email-smtp-resend-setup.md) — bulletproof email template recipe.

---

## How to use this catalog

- **In code.** Before building a new UI surface, search this file for the
  closest pattern (table of contents → section → anchor file). Reuse before
  reinventing. If the pattern is *almost* right but needs a tweak, extend the
  existing component in `src/components/design/` and update this catalog in
  the same PR.
- **In design reviews.** Reference the anchor section (e.g. "§5.1
  DataTable density toggle") in PR comments. If something deviates, justify
  why or roll back.
- **In agent prompts.** Pass this file path explicitly:
  `docs/design/ui-patterns-catalog-generic.md` — agents should consult it
  alongside `elysee-designbook.md` before designing any new screen.
- **When extending V3.0.** New patterns (extensions, white-label, command
  palette) are documented here as they ship. Treat this catalog as a living
  document — every new pattern lands here as part of its PR.
