// Footer — hairline editorial footer. Generalizes the inline footer at the bottom
// of src/pages/Index.jsx: a top CREAM2 hairline, muted meta on the left, optional
// links/nodes on the right.
//
// Props:
//   left   : node — muted meta (default © line; pass resolved copy for trilingual).
//   right  : node — links / secondary nodes.
//   width  : "narrow" (default) | "wide" — matches PageShell container widths.
//   className : extra classes.
//
// Copy is always a prop — never hard-coded here (the © fallback is intentionally
// language-neutral).

import React from "react";
import { CREAM2, MUTED } from "@/components/design/tokens";

const WIDTHS = {
  narrow: "max-w-[680px]",
  wide: "max-w-[1100px]",
};

export default function Footer({ left, right, width = "narrow", className = "" }) {
  const container = WIDTHS[width] || WIDTHS.narrow;
  const year = new Date().getFullYear();

  return (
    <footer className="relative" style={{ borderTop: `1px solid ${CREAM2}` }}>
      <div
        className={`${container} mx-auto px-5 md:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${className}`}
      >
        <div className="text-[11px]" style={{ color: MUTED }}>
          {left ?? `© ${year} Rotary Startup Award`}
        </div>
        {right && <div className="text-[11px] flex items-center gap-4">{right}</div>}
      </div>
    </footer>
  );
}
