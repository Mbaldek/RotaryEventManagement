// Élysée design tokens — single source of truth for the editorial palette.
// See docs/design-system.md and docs/design/elysee-audit.md.
//
// These mirror the constants currently duplicated at the top of src/pages/Index.jsx
// (and most Rsa* pages). New design-system components import from here instead of
// re-declaring them inline, so the palette can evolve in one place.

export const NAVY = "#0f1f3d"; // primary text, titles, dark accents
export const GOLD = "#c9a84c"; // accents (rules, icons, highlights, hover)
export const CREAM = "#faf7f2"; // main background — warm ivory paper
export const CREAM2 = "#e8e3d9"; // hairlines, separators, card borders (warm beige)
export const INK = "#3a3a52"; // secondary text (body, subtitles)
export const MUTED = "#9090a8"; // tertiary text (meta, eyebrows, J-X)

// Soft pastel tints — never saturated. Used for ActionRow / status semantics.
export const TINT_SAGE = "#ecf1e5"; // success / overview
export const TINT_BEIGE = "#f5ede0"; // primary action
export const TINT_BLUE = "#eff1f6"; // info / request
export const TINT_ADMIN = "#f3ede5"; // admin
export const GREEN_TODAY = "#1d6b4f"; // "today" / live status

// Shared font stacks.
export const SERIF = "'Playfair Display', serif"; // editorial titles, names, accents
export const SANS = "'Inter', sans-serif"; // body, meta, buttons, numerals

// Editorial easing — "ease-out-quart". Use for every framer-motion transition.
export const EASE = [0.22, 1, 0.36, 1];

// Google Fonts import string — drop into a <style> tag once at the app shell level
// instead of per page (current pages each @import it).
export const FONTS_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');";
