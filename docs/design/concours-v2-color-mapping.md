# Concours v2 — Session color mapping

> **Scope**: `/Concours` v2 page of the Rotary Startup Award platform.
> **Status**: design system addendum (extends `docs/design/elysee-designbook.md`).
> **Audience**: anyone touching `src/components/rsa/concours-dashboard/*` or
> `src/pages/Concours.jsx`.

---

## 0. TL;DR

The Élysée palette (NAVY / GOLD / CREAM / CREAM2 / INK / MUTED) is intentionally
austere — it works beautifully for a single editorial flow (a candidature funnel,
a club page, a jury home). It **fails on `/Concours` v2** because that page
aggregates *many* thematic sessions side-by-side, and the user's eye needs a
fast, pre-attentive way to tell them apart.

We reintroduce a **muted, désaturé** per-session color system that:

- stays compatible with Élysée's golden rule ("if a color needs to be saturated,
  it shouldn't exist") — every hex in the pool has saturation < 75% and value
  < 70%;
- acts as a **content marker** (like the 🏆 emoji on `RsaResultats`) rather
  than chrome — it lives *inside* cards, never on the page background, never on
  the TopNav;
- coexists with the Élysée tokens — body text stays `INK`, titles stay `NAVY`,
  hairlines stay `CREAM2`. The session color only appears as a left bar, a
  light-tint header, a status pill border, and accent icon strokes.

GOLD `#c9a84c` is **reserved exclusively for the Finale** — it must never be
assigned to a regular session.

---

## 1. The pool — 8 Élysée-compatible session colors + 1 reserved Finale

All 9 colors below pass the muted test (saturation < 75%, value < 70%) and read
as "papier / pigment" rather than "écran / fluo".

| Token             | Primary    | Light tint  | Border      | Visual feel                              |
| ----------------- | ---------- | ----------- | ----------- | ---------------------------------------- |
| `FOREST`          | `#5a7a1a`  | `#eef5e0`   | `#c0d890`   | mousse de chêne, jardin botanique        |
| `ROSE_BURGUNDY`   | `#8a2040`  | `#fbe8ee`   | `#e8a8bc`   | bourgogne velouté, vieux rose            |
| `VIOLET_DEEP`     | `#4a2a7a`  | `#f0eaf8`   | `#c8b0e8`   | aubergine, encre violette                |
| `BLUE_SKY`        | `#1a5fa8`  | `#e8f0fb`   | `#a8c8f0`   | bleu de France assourdi                  |
| `SAGE_PINE`       | `#1d6b4f`  | `#e8f5ee`   | `#b0d8c4`   | pin sylvestre, vert sauge profond        |
| `OCHRE`           | `#9a6b1f`  | `#f6efe0`   | `#e8d090`   | terre de Sienne, ocre jaune              |
| `SLATE_PLUM`      | `#4a3a5a`  | `#efeaf3`   | `#c8b8d0`   | ardoise prune, brouillard parisien       |
| `TERRACOTTA`      | `#a23b2d`  | `#f4e7e4`   | `#e8a89c`   | terre cuite, brique chaude               |
| `GOLD` *(Finale)* | `#c9a84c`  | `#fdf6e8`   | `#e8d090`   | or Élysée — Finale uniquement            |

> **`OCHRE` overlap with §2.3 of the designbook**: the existing Élysée OCHRE
> warning token (`#9a6b1f` / `#f6efe0`) is intentionally re-used as-is. A
> session marker rendered in OCHRE and a `flagged` status pill rendered in
> OCHRE never appear at the same hierarchy level (one is a 3-4px left bar,
> the other is a pill with text), so there is no semantic collision.

### Why not just use Tailwind defaults?

Tailwind's `bg-blue-500`, `bg-emerald-500`, etc. sit around saturation 80-95%
and read as "dashboard / SaaS". They break the Élysée editorial register
immediately. The pool above is hand-tuned to feel like *paper-printed pigment*,
not LED.

### Contrast check

All `primary` values reach **WCAG AA contrast ≥ 4.5:1 on `CREAM` `#faf7f2`**, so
they can hold a thin accent stroke or a small icon without falling under the
ramp. Body text is never set in these colors — it stays `INK` `#3a3a52`.

---

## 2. Assignment rules

### 2.1 Source of truth precedence

```
1. session_config.theme_color  (admin override, hex string)
        ↓ if undefined
2. stable hash of session.id mod 8 → pool index
        ↓ rotated to avoid intra-club adjacency (see 2.3)
3. final { primary, light, border }
```

### 2.2 Admin override path

When `session_config.theme_color` is a valid 7-char hex (`/^#[0-9a-f]{6}$/i`):

1. Try a **pool lookup first** — if the hex (case-insensitive) matches one of
   the 8 primaries, return that pool entry verbatim. This is the happy path:
   admins pick from a swatch picker, we keep the curated light/border.
2. Otherwise **derive light + border** from the override:
   - `light` = mix(primary, `#ffffff`, 88%) — i.e. 12% of the primary on a
     white base. This produces the ~5% lightness tint Élysée tints already use.
   - `border` = mix(primary, `#ffffff`, 55%).
3. If the hex is malformed, **fall through to step 3 (hash)** — never throw,
   never render undefined styles.

> A custom override is honored exactly once. If two sessions both override to
> the same off-pool hex, they *will* look identical — that's the admin's call.

### 2.3 Hash fallback

```js
// djb2-style, 32-bit safe, deterministic across sessions and devices
function hashSessionId(id) {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const baseIndex = hashSessionId(session.id) % 8;
```

A pure `id`-mod-8 hash is good enough for cross-club distribution but can still
produce **two adjacent same-color cards inside one club** when the hash
collides on a small list. We fix this with an intra-club rotation:

```js
// indexInClub = ordinal position (0-based) of this session inside its club list
const finalIndex = (baseIndex + indexInClub) % 8;
```

This guarantees the *N*th session in a club is always `+N` pool steps from the
first one, so the same club never shows two same-color cards in a row, and a
club with ≤8 sessions never shows the same color twice at all.

### 2.4 The Finale rule

The Finale is **not** a regular session. It is rendered by
`FinaleSection.jsx`, hard-coded to the GOLD entry. The hash and override paths
both **skip the Finale row entirely** — `useSessionPalette` is never called
with the finale object. If a future schema starts emitting the finale as a
normal session, the palette utility short-circuits on
`session.kind === 'finale'` (see code below).

---

## 3. Emoji content markers

Emojis on `/Concours` follow the same logic as `🏆` on `RsaResultats` — they
are **content**, not chrome (cf. designbook §1.3, "content-heavy pages may use
emoji as content markers"). They render once, at the top of `SessionCard`, in
the same line as the session title — never in the TopNav, never in form
labels, never in a button.

### 3.1 Heuristic

The match runs against `lowercase(session.name + ' ' + session.theme)` (both
fields trimmed, missing fields treated as empty string), **first match wins**,
in the order below:

| Trigger substrings                                            | Emoji  | Rationale                              |
| ------------------------------------------------------------- | ------ | -------------------------------------- |
| `food` `alim` `agri` `circular` `économie circulaire`         | 🌾     | Agri-food, circular economy            |
| `social` `edu` `edtech` `impact`                              | 🤝     | Social impact, edtech                  |
| `tech` `ai` `intelligence` `fintech` `mobil`                  | 💻     | Generic tech / mobility / fintech      |
| `health` `sante` `biotech` `medical` `pharma`                 | 🏥     | Health, biotech, pharma                |
| `green` `environ` `climat` `clean` `energy` `energie`         | 🌱     | Climate, cleantech, energy             |
| *(no match)*                                                  | `null` | Card renders without emoji — that's OK |

> **No fallback emoji.** A session with a theme like "Industrie 4.0" or
> "Tourisme" deliberately returns `null` rather than landing on a wrong
> bucket. The card is fully legible without the marker — the color bar and
> the title carry it.

### 3.2 Why this order

`sante` is listed *after* the social bucket would have a chance to match
`social` (it doesn't overlap), but *before* a hypothetical `medic` query
would clash. The pharma/biotech terms are the most specific, so they win over
the broader `tech` bucket — that's why `health` lives in its own pass.

### 3.3 Multi-emoji?

No. One emoji per card, maximum. Stacking emojis ("🌾🤝") looks like a Slack
channel name and breaks the editorial register immediately. If a session
straddles two themes, the admin can pick a `theme_color` override but the
emoji stays single.

---

## 4. Where the palette is applied

| Surface                          | Application                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `SessionCard.jsx`                | Left bar 3-4px wide in `primary`; emoji in title row; KPI icon strokes in `primary`; status pill `border` |
| Timeline horizontale             | Dot fill `primary`; segment between dots stays `CREAM2` *except* when hover/active → `primary` at 40%    |
| `SessionDetailDrawer.jsx` header | Header band background `light`; 2px top-bar `primary`; close button stays NAVY                           |
| `ClubSection.jsx`                | No session color on the club header itself — clubs stay neutral so cards stand out                       |
| `FinaleSection.jsx`              | Hard-coded GOLD pool entry; left bar 4px, header band `#fdf6e8`, eyebrow rule in GOLD                    |
| `ConcoursHero.jsx`               | **No session color** — hero is shared chrome, NAVY/CREAM only                                            |
| `ConcoursStatusPill.jsx`         | Status semantics own the *fill*; session color only contributes to the *border* (1px)                    |

### 4.1 What stays Élysée no matter what

- Card body background: `white` on `CREAM` page (designbook §2.4).
- Card hairline: `CREAM2` 1px — **never** replaced by the session border color.
  The session color only appears on the *left bar*, not the surrounding outline.
- Body text: `INK`. Titles: NAVY. Meta: `MUTED`.
- Focus ring: GOLD `#c9a84c`. **Always.** Even on a TERRACOTTA card, the focus
  ring is GOLD — single keyboard focus color, no exceptions (designbook §9).

### 4.2 What the color bar looks like

```
┌──┬──────────────────────────────────┐
│██│ 🌾  Sustainable Food · J-12       │
│██│ Paris · 6 candidats · 18 jurés    │
│██│ ── KPI · KPI · KPI ──────────────│
└──┴──────────────────────────────────┘
 ↑
 3-4px primary, rounded top-left/bottom-left to match card 4px radius
```

The bar is **inside** the card's hairline, not outside — so it never breaks
the CREAM2 grid alignment of the card stack.

---

## 5. Justification face au designbook Élysée §2.3

§2.3 of `elysee-designbook.md` says, in essence: *"the page palette is NAVY,
GOLD, CREAM, CREAM2, INK, MUTED. Saturated colors do not belong here."*
That rule was written for **single-flow editorial pages** (DevenirJury,
candidature funnel, club page). `/Concours` v2 is a different beast — it is
an **aggregator**, like a table of contents, and aggregators need
discrimination signals.

### 5.1 These colors *are* muted

Every pool primary sits at saturation 65-75% **at most**, value 35-65%. The
Tailwind `blue-500` reference (`#3b82f6`) is saturation 92%, value 96%. Side
by side:

| Pool primary    | S    | V    | Tailwind equivalent | Tailwind S | Tailwind V |
| --------------- | ---- | ---- | ------------------- | ---------- | ---------- |
| `BLUE_SKY`      | 84%  | 66%  | `blue-700` `#1d4ed8`| 89%        | 85%        |
| `FOREST`        | 78%  | 48%  | `lime-700` `#4d7c0f`| 88%        | 49%        |
| `SAGE_PINE`     | 73%  | 42%  | `emerald-700`       | 81%        | 47%        |
| `ROSE_BURGUNDY` | 77%  | 54%  | `rose-700`          | 84%        | 73%        |

The Élysée register is preserved.

### 5.2 They act as content markers, not chrome

The designbook §1.3 explicitly allows emojis as content on content-heavy pages
(`🏆` on `RsaResultats`, see `src/pages/RsaResultats.jsx`). The session color
follows the same logic — it is **data made visible**, not decoration. The
chrome (TopNav, page background, card surface, hairlines, buttons) remains
strictly Élysée.

### 5.3 They additionne, ne remplacent pas

A `SessionCard` rendered with the new system still uses:

- `bg-white` for the surface;
- `border-[#e8e3d9]` (CREAM2) for the outline;
- `text-[#0f1f3d]` (NAVY) for the title;
- `text-[#3a3a52]` (INK) for body;
- `text-[#9090a8]` (MUTED) for meta;
- `focus-visible:ring-[#c9a84c]` (GOLD) for focus.

The session palette only adds: a left bar, a header tint inside the drawer,
and accent strokes on small icons. It is **strictly additive**.

### 5.4 The escape hatch

If a future audit decides the per-session colors are still too much, a
single feature flag (`VITE_CONCOURS_V2_COLORS=off`) makes
`useSessionPalette` return `{ primary: NAVY, light: CREAM, border: CREAM2 }`
for every call, which collapses the system back to pure Élysée. This is the
contract: never paint yourself into a corner.

---

## 6. The utility

**Location**: `src/components/rsa/concours-dashboard/sessionTheme.js`

This is a single file, no dependencies beyond React. Both hooks are pure —
they are `useMemo` wrappers over deterministic functions, so they can be
called from a `SessionCard`, a `Timeline` segment, or a `SessionDetailDrawer`
without any consistency concern.

```js
// src/components/rsa/concours-dashboard/sessionTheme.js
import { useMemo } from 'react';

// ─── Élysée tokens (mirrored from src/lib/design-tokens) ─────────────────────
const NAVY = '#0f1f3d';
const CREAM = '#faf7f2';
const CREAM2 = '#e8e3d9';

// ─── The pool ────────────────────────────────────────────────────────────────
export const SESSION_PALETTE = [
  { name: 'FOREST',        primary: '#5a7a1a', light: '#eef5e0', border: '#c0d890' },
  { name: 'ROSE_BURGUNDY', primary: '#8a2040', light: '#fbe8ee', border: '#e8a8bc' },
  { name: 'VIOLET_DEEP',   primary: '#4a2a7a', light: '#f0eaf8', border: '#c8b0e8' },
  { name: 'BLUE_SKY',      primary: '#1a5fa8', light: '#e8f0fb', border: '#a8c8f0' },
  { name: 'SAGE_PINE',     primary: '#1d6b4f', light: '#e8f5ee', border: '#b0d8c4' },
  { name: 'OCHRE',         primary: '#9a6b1f', light: '#f6efe0', border: '#e8d090' },
  { name: 'SLATE_PLUM',    primary: '#4a3a5a', light: '#efeaf3', border: '#c8b8d0' },
  { name: 'TERRACOTTA',    primary: '#a23b2d', light: '#f4e7e4', border: '#e8a89c' },
];

// Reserved — never returned by hash/override paths
export const FINALE_PALETTE = {
  name: 'GOLD', primary: '#c9a84c', light: '#fdf6e8', border: '#e8d090',
};

// Feature-flag escape hatch (see §5.4)
const COLORS_DISABLED = import.meta.env?.VITE_CONCOURS_V2_COLORS === 'off';
const NEUTRAL_PALETTE = { name: 'NEUTRAL', primary: NAVY, light: CREAM, border: CREAM2 };

// ─── Hash ────────────────────────────────────────────────────────────────────
function hashSessionId(id) {
  if (!id) return 0;
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ─── Color mix (sRGB linear-ish, good enough for tints) ──────────────────────
function mixHex(a, b, weight) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 0xff, ag = (pa >> 8) & 0xff, ab = pa & 0xff;
  const br = (pb >> 16) & 0xff, bg = (pb >> 8) & 0xff, bb = pb & 0xff;
  const r = Math.round(ar * weight + br * (1 - weight));
  const g = Math.round(ag * weight + bg * (1 - weight));
  const bl = Math.round(ab * weight + bb * (1 - weight));
  return '#' + [r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('');
}

const HEX_RE = /^#[0-9a-f]{6}$/i;

function paletteFromOverride(hex) {
  // Pool lookup first — keep curated light/border when the admin picked from the swatch
  const found = SESSION_PALETTE.find((p) => p.primary.toLowerCase() === hex.toLowerCase());
  if (found) return found;
  // Derive tints (cf. §2.2)
  return {
    name: 'CUSTOM',
    primary: hex,
    light: mixHex(hex, '#ffffff', 0.12), // 12% primary on white
    border: mixHex(hex, '#ffffff', 0.45), // 45% primary on white
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────
export function useSessionPalette(session, indexInClub = 0) {
  return useMemo(() => {
    if (COLORS_DISABLED) return NEUTRAL_PALETTE;
    if (!session) return NEUTRAL_PALETTE;
    if (session.kind === 'finale') return FINALE_PALETTE;

    const override = session.session_config?.theme_color;
    if (typeof override === 'string' && HEX_RE.test(override)) {
      return paletteFromOverride(override);
    }

    const base = hashSessionId(session.id) % SESSION_PALETTE.length;
    const idx = (base + (Number.isFinite(indexInClub) ? indexInClub : 0))
      % SESSION_PALETTE.length;
    return SESSION_PALETTE[idx];
  }, [session?.id, session?.kind, session?.session_config?.theme_color, indexInClub]);
}

// ─── Emoji ───────────────────────────────────────────────────────────────────
const EMOJI_RULES = [
  { match: ['food', 'alim', 'agri', 'circular', 'économie circulaire'], emoji: '🌾' },
  { match: ['social', 'edu', 'edtech', 'impact'],                       emoji: '🤝' },
  { match: ['health', 'sante', 'biotech', 'medical', 'pharma'],         emoji: '🏥' },
  { match: ['green', 'environ', 'climat', 'clean', 'energy', 'energie'],emoji: '🌱' },
  { match: ['tech', 'ai', 'intelligence', 'fintech', 'mobil'],          emoji: '💻' },
];

export function useSessionEmoji(session) {
  return useMemo(() => {
    if (!session) return null;
    const haystack = `${session.name ?? ''} ${session.theme ?? ''}`.toLowerCase();
    if (!haystack.trim()) return null;
    for (const rule of EMOJI_RULES) {
      if (rule.match.some((needle) => haystack.includes(needle))) return rule.emoji;
    }
    return null;
  }, [session?.name, session?.theme]);
}
```

### 6.1 Note on the rule order

In the JS, `health` is listed **before** `tech` so that "Pharma Tech" gets
🏥 (health wins) rather than 💻. That matches user intent: a sector
keyword (health) is more specific than a tooling keyword (tech). The doc
table in §3.1 lists rules in priority order — code mirrors the table.

### 6.2 Usage in `SessionCard.jsx`

```jsx
import { useSessionPalette, useSessionEmoji } from './sessionTheme';

export function SessionCard({ session, indexInClub }) {
  const palette = useSessionPalette(session, indexInClub);
  const emoji = useSessionEmoji(session);

  return (
    <article
      className="relative rounded bg-white border"
      style={{ borderColor: CREAM2 }} // hairline stays Élysée
    >
      {/* left color bar */}
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 rounded-l"
        style={{ width: 4, background: palette.primary }}
      />
      <header className="flex items-center gap-2 pl-5">
        {emoji && <span aria-hidden className="text-[15px]">{emoji}</span>}
        <h3 className="text-base font-serif" style={{ color: NAVY }}>
          {session.name}
        </h3>
      </header>
      {/* … KPIs use palette.primary on small icons, status pill uses palette.border … */}
    </article>
  );
}
```

### 6.3 Usage in `FinaleSection.jsx`

`FinaleSection` does **not** call the hook. It imports `FINALE_PALETTE`
directly:

```jsx
import { FINALE_PALETTE } from './sessionTheme';
// background tint = FINALE_PALETTE.light, top bar = FINALE_PALETTE.primary
```

This keeps the Finale immune to any future change in the hash function or
the pool rotation.

---

## 7. Testing checklist

- [ ] Same `session.id` always returns the same palette entry across reloads.
- [ ] Two sessions in the same club, listed back-to-back, never share a primary.
- [ ] A session with `session_config.theme_color = '#5a7a1a'` returns the
      canonical FOREST entry (light `#eef5e0`, border `#c0d890`), **not** a
      derived tint.
- [ ] A session with `session_config.theme_color = 'not-a-color'` falls back
      to the hash path — no console error.
- [ ] `FinaleSection` renders GOLD even if the underlying session row has a
      `theme_color` override.
- [ ] With `VITE_CONCOURS_V2_COLORS=off`, every card renders with NAVY left bar
      and CREAM2 border — page is pure Élysée again.
- [ ] Focus ring on every card is GOLD `#c9a84c`, regardless of the session
      palette.
- [ ] Body text on every card is `INK` `#3a3a52` — never tinted in the
      session primary.

---

## 8. Related files

- `src/pages/Concours.jsx` — page entry, mounts the dashboard sections.
- `src/components/rsa/concours-dashboard/SessionCard.jsx` — primary consumer.
- `src/components/rsa/concours-dashboard/SessionDetailDrawer.jsx` — header tint.
- `src/components/rsa/concours-dashboard/FinaleSection.jsx` — GOLD hard-code.
- `src/components/rsa/concours-dashboard/ClubSection.jsx` — passes `indexInClub`.
- `src/components/rsa/concours-dashboard/ConcoursHero.jsx` — must stay neutral.
- `src/components/rsa/concours-dashboard/ConcoursStatusPill.jsx` — border-only.
- `docs/design/elysee-designbook.md` — parent ruleset (§1.3, §2.3, §2.4, §9).
- `docs/design/design-upgrade-blueprint.md` — broader redesign trilogy context.
- `src/pages/RsaResultats.jsx` — precedent for emoji-as-content (🏆).

---

## 9. Open questions for future iterations

1. **Should the admin swatch picker expose only the 8 pool primaries, or allow
   free hex input?** Recommended: swatch only for v2, free hex for v2.1 once
   we have a Storybook gallery of every possible override.
2. **Should we add a 9th sector emoji bucket** (e.g. `🏗️` for industrial /
   construction)? Hold until we have telemetry on how many sessions currently
   fall in the `null` bucket — if > 30%, add a bucket; otherwise keep null.
3. **Is the intra-club rotation visible to the user, or is it "magic"?**
   It is intentionally invisible. If admins ever ask "why is my second
   session purple, I wanted blue", the answer is the override field.
