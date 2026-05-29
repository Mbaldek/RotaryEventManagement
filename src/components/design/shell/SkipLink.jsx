// SkipLink — WCAG 2.1 AA bypass-block (SC 2.4.1).
//
// Visually hidden until focused, becomes a NAVY pill at the top-left of the
// viewport when the keyboard user tabs into the page. Anchors to the page's
// `<main id="main">` region (PageShell renders one automatically).
//
// Implementation notes :
//   - Uses `sr-only` (Tailwind utility from tailwindcss-animate) until :focus,
//     then absolutely-positioned NAVY pill with GOLD focus ring.
//   - Resolved copy via useLang() — FR/EN/DE.
//   - On click, we move focus AND scroll to #main so the next Tab lands on the
//     first interactive element of the content (not back at the top of the nav).
//   - href defaults to "#main" but can be overridden via `targetId` for pages
//     that need a different landmark.

import React, { useCallback } from "react";
import { NAVY, GOLD, SERIF } from "@/components/design/tokens";
import { useLang } from "@/lib/platform/i18n";

const T = {
  skip: {
    fr: "Aller au contenu principal",
    en: "Skip to main content",
    de: "Zum Hauptinhalt springen",
  },
};

export default function SkipLink({ targetId = "main", label }) {
  const { t } = useLang();

  const onClick = useCallback(
    (e) => {
      e.preventDefault();
      if (typeof document === "undefined") return;
      const target = document.getElementById(targetId);
      if (!target) return;
      // Ensure the landmark can be focused without becoming a tab stop.
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      target.focus({ preventScroll: false });
      try {
        target.scrollIntoView({ block: "start", behavior: "smooth" });
      } catch {
        target.scrollIntoView();
      }
    },
    [targetId],
  );

  const text = label || t(T.skip);

  return (
    <a
      href={`#${targetId}`}
      onClick={onClick}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-[4px] focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{
        background: NAVY,
        color: "white",
        fontFamily: SERIF,
        fontSize: 13,
        // focus ring color via inline so it works with the Tailwind focus: prefix
        ['--tw-ring-color']: GOLD,
        ['--tw-ring-offset-color']: NAVY,
      }}
    >
      {text}
    </a>
  );
}
