// Shared input chrome for Élysée form controls — keeps every control visually
// consistent: white fill, 1px CREAM2 hairline border, 4px radius, INK text,
// MUTED placeholder, GOLD focus ring, ~44px min height on mobile. Danger border
// when invalid. Disabled = dimmed CREAM fill.
//
// Internal helper (not exported from the barrel). Controls import { inputBase, inputStyle }.

import { CREAM, CREAM2, INK } from "@/components/design/tokens";
import { DANGER } from "@/components/design/tokens.app";

// Tailwind classes shared by text-like controls.
export const inputBase =
  "w-full min-h-[44px] md:min-h-[40px] px-3.5 py-2.5 text-[14px] rounded-[4px] " +
  "transition-colors outline-none placeholder:text-[#9090a8] " +
  "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-[#faf7f2] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

// Inline style for the chrome (border color flips on invalid/focus via CSS where
// the ring handles focus; the border is the resting state).
export function inputStyle({ invalid = false, disabled = false } = {}) {
  return {
    background: disabled ? CREAM : "white",
    border: `1px solid ${invalid ? DANGER : CREAM2}`,
    color: INK,
    fontFamily: "'Inter', sans-serif",
  };
}
