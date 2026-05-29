// Élysée — extension tokens for the multi-role app (NEW, additive to tokens.js).
//
// The audit (docs/design/elysee-audit.md §2) flagged that the editorial palette
// has no error/danger color, no warning/amber distinct from GOLD, and no neutral
// focus-ring color. shadcn's bright `destructive` red clashes with the warm paper
// look, so we add MUTED, DESATURATED additions per the design book's rule
// ("if a color needs to be saturated, it probably shouldn't exist").
//
// These live in a separate file so the canonical tokens.js stays untouched; both
// are re-exported from @/components/design.

import { GOLD } from "@/components/design/tokens";

// — Semantic status colors (muted, never bright system colors) —
export const DANGER = "#a23b2d"; // muted brick — errors, "excluded", "rejected"
export const TINT_DANGER = "#f6e7e3"; // soft brick tint background for danger pills/alerts
export const WARNING = "#9a6400"; // ochre — warnings, "flagged", "under review"
export const TINT_WARNING = "#f7eddc"; // soft ochre tint background for warning pills/alerts
export const SUCCESS = "#1d6b4f"; // reuse GREEN_TODAY hue for success text/icons
// (TINT_SAGE / TINT_BLUE already exist in tokens.js for success / info backgrounds.)

// — Accessible GOLD text variant (WCAG AA on CREAM/white surfaces) —
// The canonical GOLD #c9a84c sits at ~2.4:1 on CREAM (#faf7f2) — fine for
// decorative accents (rules, dot bullets, icons, focus rings) but FAILS WCAG
// AA for body/eyebrow TEXT. Use GOLD_TEXT for any GOLD-colored TEXT rendered
// on a light surface ; keep GOLD itself for graphical accents only.
//   GOLD_TEXT  #8a6f1f  →  ~5.6:1 on CREAM   ✓ AA normal text
//   (still recognisable as the same warm gold — same hue, just darker value)
export const GOLD_TEXT = "#8a6f1f";

// — Focus ring — a single GOLD ring used by every interactive control —
export const FOCUS_RING = GOLD;
// Tailwind utility string for the standardized visible keyboard focus.
// (Surfaces add `focus-visible:ring-offset-[#faf7f2]` to match CREAM where needed.)
export const FOCUS_RING_CLASS =
  "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]";

// — Surface chrome shared by form controls / cards —
export const RADIUS = 4; // surfaces (px); pills/round buttons use 9999px
export const HAIRLINE = "#e8e3d9"; // === CREAM2; named for "1px solid border" intent
