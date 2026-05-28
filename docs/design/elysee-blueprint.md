# Élysée Component-Library Blueprint

> The plan for the Élysée component library that dresses the whole RSA platform
> (startup / jury / comité / admin). Companion to
> [`elysee-audit.md`](./elysee-audit.md) (what exists + the gaps) and
> [`docs/design-system.md`](../design-system.md) (the design book).
>
> **Rules for every component below:**
> - Tokens come from [`@/components/design/tokens`](../../src/components/design/tokens.js) — never re-declare hex values inline.
> - **Copy is always a prop/child, never hard-coded.** Pass already-resolved
>   FR/EN/DE strings (see audit §8). Date/number formatting takes a `locale`.
> - Border-radius `4px` on surfaces, `9999px` only for pills/round buttons.
>   No shadows on surfaces (hairline `CREAM2` border only). No saturated gradients.
> - Visible keyboard focus = **GOLD ring** (`focus-visible:ring-2 ring-offset-2 ring-[#c9a84c]`).
> - Motion uses the editorial ease `[0.22, 1, 0.36, 1]` and respects
>   `prefers-reduced-motion`.

---

## 1. Proposed folder structure

```
src/components/design/
  index.js                 # barrel (tokens + components)
  tokens.js                # ✅ palette, fonts, easing (created)

  # — Editorial (✅ extracted from Index.jsx) —
  Eyebrow.jsx              # ✅
  EditorialTitle.jsx       # ✅
  HeroEventCard.jsx        # ✅
  ActionRow.jsx            # ✅
  UpcomingList.jsx         # ✅

  # — App shell —
  shell/
    PageShell.jsx          # bg + halo + grain + fonts + container (narrow|wide)
    TopNav.jsx             # navy bar, wordmark, role-aware menu, account
    NavMenu.jsx            # role-filtered nav items
    Footer.jsx             # hairline footer
    LanguageSwitcher.jsx   # FR/EN/DE pill toggle

  # — Form controls —
  form/
    Field.jsx              # label + required + helper + error wrapper (a11y)
    TextInput.jsx
    Textarea.jsx
    Select.jsx             # single select
    TagSelect.jsx          # multi-select tag input (sectors, countries)
    Dropzone.jsx           # file upload (deck / exec summary)
    RadioYesNo.jsx         # eligibility yes/no
    DateInput.jsx

  # — Actions —
  Button.jsx               # primary | secondary | ghost | danger, loading/icon

  # — Status & data —
  StatusPill.jsx           # dossier / eligibility / jury lifecycle
  DataTable.jsx            # editorial table (mobile → cards)
  ListRow.jsx              # queue row (comité/admin)

  # — Auth —
  auth/
    AuthLayout.jsx         # centered editorial frame
    MagicLinkForm.jsx      # email → send link → check inbox / error

  # — States & feedback —
  feedback/
    EmptyState.jsx
    ErrorState.jsx
    Skeleton.jsx           # editorial shimmer (rows/cards)
    Spinner.jsx
    Alert.jsx              # info | success | warning | danger callout
    Toast.jsx              # Élysée-themed toast (wraps/themes sonner)

  # — Shared i18n helper (recommended) —
  i18n/
    LanguageContext.jsx    # useLang(): { lang, setLang } + localStorage + <html lang>
```

`form/`, `shell/`, `auth/`, `feedback/`, `i18n/` are re-exported from the root
`index.js` barrel as they are built.

---

## 2. Existing editorial components (✅ already extracted)

### `Eyebrow`
- **Purpose:** small section label — gold rule + uppercase tracked text, scroll-reveal.
- **Props:** `children` (resolved copy), `color` (default `GOLD`; `GREEN_TODAY` for live).
- **Styling:** rule `GOLD` 28×1.5px; label `text-[10px] uppercase tracking-[0.18em]`.
- **i18n:** copy passed as children.

### `EditorialTitle`
- **Purpose:** two-line serif title (lead + italic accent).
- **Props:** `lead`, `italic`, `size` = `lg | md | sm`.
- **Styling:** Playfair, `NAVY`; sizes per the type scale (audit §3).
- **i18n:** `lead` / `italic` are resolved strings.

### `HeroEventCard`
- **Purpose:** hero card for the next/today event.
- **Props:** `event`, `locale` (default `fr-FR`), `labels` (`{ today, tomorrow, inDays(n), nextEvent, liveToday, speaker }`).
- **Styling:** white fill, `CREAM2` border, breathing `GOLD` left bar; serif title; hairline-separated speaker + meta rows.
- **i18n:** ⚠️ defaults are FR for backwards-compat; **trilingual call sites must pass `locale` + `labels`.**

### `ActionRow`
- **Purpose:** clickable editorial tile (role home tiles).
- **Props:** `to`, `number`, `title`, `subtitle`, `icon`, `tint`, `index`.
- **Styling:** pastel `tint` bg, `CREAM2` border, growing `GOLD` bar + sheen + underline on hover.
- **i18n:** `title` / `subtitle` resolved strings.

### `UpcomingList`
- **Purpose:** numbered editorial list of upcoming events.
- **Props:** `events`, `eyebrow`, `title`, `titleItalic`, `typeLabels`, `locale`, `limit`.
- **Styling:** hairline rows, gold uppercase type badge, J-X countdown, serif titles.
- **i18n:** ⚠️ defaults FR; pass `typeLabels`/`locale`/headings for other languages. Tied to the lunch data shape — generalize per data source if reused for RSA dossiers.

---

## 3. App shell

### `PageShell`
- **Purpose:** the page frame every screen sits in — `min-h-screen`, `CREAM` bg,
  ambient gold halo + paper grain, fonts import, narrow editorial container, and
  (optional) `TopNav` + `Footer` slots.
- **Key props:** `width` = `narrow` (default, `max-w-[680px]`) | `wide` (data
  screens, e.g. `max-w-[1100px]`); `nav` (bool, render TopNav); `footer` (node).
- **Styling:** halo `radial-gradient(... rgba(201,168,76,0.12) ...)`, `.grain-bg`
  overlay, `FONTS_IMPORT` injected once (replaces per-page `@import`).
- **a11y/motion:** sets `<html lang>` from `useLang()`; gates ambient loops behind
  `prefers-reduced-motion`.

### `TopNav`
- **Purpose:** sticky navy top bar — serif wordmark, role-aware `NavMenu`,
  `LanguageSwitcher`, account/sign-out.
- **Key props:** `wordmark`, `right` (slot). Reads `usePlatformAuth()` internally.
- **Styling:** `background: NAVY`, bottom border `rgba(201,168,76,.18)`, white
  text, GOLD active state — formalizes the `RsaFinaleRsvp` `Header` pattern.

### `NavMenu`
- **Purpose:** role-filtered nav items.
- **Key props:** `items: [{ to, label, roles?: string[] }]`. Items with `roles`
  show only when `hasRole` matches; role-less items always show (startup owner).
- **i18n:** each `label` is resolved copy.

### `Footer`
- **Purpose:** hairline footer (muted meta + doc link). Generalizes the inline
  Index footer. **Props:** `left`, `right` (nodes).

### `LanguageSwitcher`
- **Purpose:** the canonical FR/EN/DE pill toggle.
- **Key props:** none required — reads/writes `useLang()`.
- **Styling:** small pills; active = `GOLD` bg / `NAVY` text, inactive = transparent
  / muted. Replaces the copy-pasted toggle in every public RSA page.

---

## 4. Form controls

> All form controls share `Field` for label/error/helper wiring and a common
> input chrome: white or `CREAM` fill, `1px solid CREAM2` border, `4px` radius,
> `INK` text, `MUTED` placeholder, **GOLD focus ring**, `~44px` min height on mobile.

### `Field`
- **Purpose:** the accessible wrapper around any control.
- **Key props:** `label`, `htmlFor`/`id`, `required`, `helper`, `error`, `children`.
- **Styling:** label `text-[11px] uppercase tracking-[0.12em] MUTED`; required marker
  GOLD `*`; error text in danger color; helper in MUTED.
- **a11y:** associates `<label htmlFor>`, sets `aria-describedby` to helper/error,
  `aria-invalid` when error present, `aria-required`.

### `TextInput` / `Textarea`
- **Purpose:** single-line / multi-line text.
- **Key props:** `value`, `onChange`, `placeholder`, `id`, `invalid`, `disabled`,
  (`rows` for textarea).
- **i18n:** `placeholder` resolved; label via `Field`.

### `Select`
- **Purpose:** single choice. **Key props:** `value`, `onChange`,
  `options: [{ value, label }]`, `placeholder`, `invalid`, `disabled`.
- **Styling:** same chrome + a GOLD chevron. May wrap `ui/select` (Radix) but
  re-skinned to Élysée; do **not** ship the default theme.

### `TagSelect` (multi-select)
- **Purpose:** multiple values shown as removable pills (sectors, countries).
- **Key props:** `value: string[]`, `onChange`, `options`, `placeholder`, `max?`.
- **Styling:** selected tags as `CREAM`/pastel pills with a × in `MUTED`;
  input chrome below. Tags reuse `StatusPill`'s neutral pill shape.

### `Dropzone`
- **Purpose:** file upload (pitch deck, exec summary). Lift the drag/drop + size/
  type validation already inline in `StartupUpload.jsx` into one component.
- **Key props:** `accept` (e.g. `.pdf,.pptx,.ppt`), `maxSizeMb`, `value` (file/url),
  `onFile`, `uploading`, `progress`, `error`, plus copy props (`promptLabel`,
  `hintLabel`, `replaceLabel`).
- **Styling:** dashed `CREAM2` border, `CREAM` fill, GOLD upload icon; on drag-over
  the border goes GOLD. Shows filename + size + replace/remove once chosen.
- **i18n:** all visible strings are props.

### `RadioYesNo`
- **Purpose:** binary eligibility questions (founders majority, registration…).
- **Key props:** `value` (`true|false|null`), `onChange`, `yesLabel`, `noLabel`,
  `id`, `invalid`. Renders a Radix radio-group re-skinned.
- **Styling:** two pill/segmented options; selected = `GOLD` ring + `TINT_BEIGE`.

### `DateInput`
- **Purpose:** date entry (creation date, deadlines).
- **Key props:** `value`, `onChange`, `min`, `max`, `locale`, `invalid`.
- **Styling:** input chrome + GOLD calendar icon. May wrap `ui/calendar` in a
  popover for rich picking; native `<input type=date>` acceptable as a fallback.

---

## 5. Buttons — `Button`
- **Purpose:** the single action button (replaces off-palette `ui/button` for
  Élysée screens).
- **Key props:** `variant` = `primary | secondary | ghost | danger`; `size` =
  `sm | md | lg`; `icon` (lucide), `iconPosition`; `loading`, `disabled`;
  `as` (`button` | link).
- **Styling:**
  - `primary`: `NAVY` fill, white text → GOLD bar/underline or GOLD fill on hover.
  - `secondary`: transparent, `1px CREAM2` border, `NAVY` text → `TINT_BEIGE` hover.
  - `ghost`: text-only `NAVY` → subtle tint on hover.
  - `danger`: muted brick (`#a23b2d`) text/outline — never bright red.
  - All: `4px` radius, Inter 500, GOLD focus ring, `loading` shows the `Spinner`.
- **i18n:** label via children.

---

## 6. Status & data

### `StatusPill`
- **Purpose:** encode the dossier / eligibility / jury lifecycles as pastel pills.
- **Key props:** `status` (string), `kind` = `dossier | eligibility | jury`,
  `label` (resolved copy override), `size`.
- **Status map (tint · dot/icon, NAVY/INK text throughout for contrast):**
  - **eligibility** (`src/lib/rsa/eligibility.js`): `eligible` → `TINT_SAGE`/green;
    `flagged` → ochre warning tint; `excluded` → brick danger tint.
  - **jury** (`constants.js` `JURY_STATUS`): `draft` → neutral `CREAM2`;
    `live` → `GREEN_TODAY`; `locked` → `TINT_BLUE`; `published` → `GOLD`.
  - **dossier:** `draft` → neutral; `submitted` → `TINT_BLUE`; `under_review` →
    ochre; `shortlisted` → `TINT_SAGE`; `finalist` → `GOLD`; `winner` → `GOLD`
    (filled); `rejected` → brick.
- **Styling:** `9999px` pill, `text-[11px]`, small leading dot. Centralize the
  status→token map in this file so all roles render identical states.
- **i18n:** the map yields a token + a *copy key*; the resolved label is passed in
  (or looked up via `useLang()`), never hard-coded.

### `DataTable`
- **Purpose:** editorial table for comité/admin queues.
- **Key props:** `columns: [{ key, label, align, render? }]`, `rows`, `onRowClick`,
  `sort`, `onSort`, `empty` (EmptyState node), `loading`.
- **Styling:** no card chrome — header row in `MUTED` uppercase, hairline `CREAM2`
  row separators, `tabular-nums` right-aligned numerics, row hover = faint tint.
- **Responsive:** **collapses to stacked `ListRow` cards below `md`** — never a
  silent horizontal scroll (book §7).

### `ListRow`
- **Purpose:** denser queue row (mobile table fallback + standalone lists).
- **Key props:** `title`, `subtitle`, `status` (→ StatusPill), `meta`, `leading`
  (initials/icon), `to`/`onClick`, `trailing`.
- **Styling:** echoes `UpcomingList` rows — hairline-separated, serif title,
  status pill, `ArrowUpRight` affordance.

---

## 7. Auth

### `AuthLayout`
- **Purpose:** centered editorial frame for unauthenticated screens.
- **Key props:** `title`, `subtitle`, `children`.
- **Styling:** `PageShell` narrow, centered logo + halo, serif title, hairline card.

### `MagicLinkForm`
- **Purpose:** UI for `signInWithMagicLink` (`src/lib/platform/auth.jsx`).
- **Key props:** `onSubmit(email)`, `redirectPath`, plus copy props (`emailLabel`,
  `submitLabel`, `sentTitle`, `sentBody`, `errorLabel`).
- **States:** idle (email `TextInput` + primary `Button`) → sending (loading) →
  sent ("check your inbox" confirmation) → error (`Alert`).
- **i18n:** all copy via props; trilingual.

---

## 8. States & feedback

### `EmptyState`
- **Purpose:** "nothing here yet" for empty queries.
- **Key props:** `title`, `description`, `icon`, `action` (node).
- **Styling:** centered, serif title, MUTED description, optional secondary Button.

### `ErrorState`
- **Purpose:** failed React Query / load error.
- **Key props:** `title`, `description`, `onRetry`, `retryLabel`.
- **Styling:** like EmptyState with a brick-tinted icon + retry Button.

### `Skeleton`
- **Purpose:** editorial loading placeholder.
- **Key props:** `variant` = `line | card | row | title`, `count`.
- **Styling:** `CREAM2` blocks with a soft shimmer (reduced under
  `prefers-reduced-motion`). Re-skins `ui/skeleton`.

### `Spinner`
- **Purpose:** inline busy indicator (buttons, small loads).
- **Key props:** `size`, `color` (default `GOLD`).

### `Alert` (callout)
- **Purpose:** inline form feedback / eligibility notices.
- **Key props:** `tone` = `info | success | warning | danger`, `title`, `children`,
  `icon`.
- **Styling:** pastel tint per tone (`TINT_BLUE` / `TINT_SAGE` / ochre / brick),
  left GOLD or tone-colored hairline bar, NAVY/INK text.

### `Toast`
- **Purpose:** transient feedback (save succeeded, link sent).
- **Implementation:** theme the existing `ui/sonner` provider to Élysée — white/
  cream surface, `CREAM2` border, GOLD/tone accent bar, no harsh system colors.
- **Key props:** standard sonner API; a `tone` accent maps to the Alert tones.
- **i18n:** message strings supplied by caller (resolved copy).

---

## 9. Internationalization plan

- Keep components **copy-agnostic**: resolved FR/EN/DE strings in, no baked copy.
- Introduce `i18n/LanguageContext.jsx` exposing `useLang(): { lang, setLang }`,
  persisting to a single `localStorage` key (e.g. `rsa_lang`), seeding from
  `navigator.language`, and setting `<html lang>`. This **replaces the per-page
  `T`/`localStorage` boilerplate** found in `RsaScore`, `RsaFinaleRsvp`,
  `RsaJuryView`, `RsaPrintSheets`, `StartupUpload`.
- `LanguageSwitcher` and `PageShell`/`TopNav` consume `useLang()`; domain copy keeps
  using the `src/lib/rsa/constants.js` helpers (`getSessionLabel`, `getCriterion`,
  …) but now fed by the shared `lang`.
- Migration is incremental and non-breaking: new screens use the context; existing
  pages keep their local `T` until refactored.

## 10. Build order (suggested)

1. `tokens.js` ✅ + extract editorial components ✅.
2. `i18n/LanguageContext` + `LanguageSwitcher` (everything else depends on lang).
3. App shell: `PageShell`, `TopNav`, `NavMenu`, `Footer`.
4. `Button`, `Field` + form controls (`TextInput`, `Textarea`, `Select`,
   `RadioYesNo`, `DateInput`, `TagSelect`, `Dropzone`) — unblocks the dossier.
5. `StatusPill` (+ the shared status→token map).
6. `feedback/*` (Empty/Error/Skeleton/Spinner/Alert/Toast).
7. `auth/AuthLayout` + `MagicLinkForm`.
8. `DataTable` + `ListRow` (comité/admin queues).
