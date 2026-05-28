// PageShell — the page frame every Élysée screen sits in. min-h-screen, CREAM bg,
// ambient gold halo + paper grain, the Playfair fonts import (once, instead of the
// per-page @import), and a narrow editorial container (or a wider one for data
// screens). Optionally renders TopNav + Footer slots.
//
// Faithfully reproduces the ambient halo + .grain-bg from src/pages/Index.jsx
// (lines 512-540) so screens match the landing page pixel-for-pixel.
//
// Props:
//   width    : "narrow" (default, max-w-[680px], editorial) | "wide" (max-w-[1100px], data screens)
//   nav      : node | bool — render a TopNav. Pass a <TopNav/> node, or `true` for a default one.
//   footer   : node — render a Footer below the content.
//   halo     : bool (default true) — show the ambient gold halo + grain.
//   className: extra classes on the inner content container.
//   children : page content.
//
// Motion: the breathing halo is gated behind prefers-reduced-motion (handled in CSS
// via the .rsa-halo animation; reduced-motion users get a static halo).

import React from "react";
import { CREAM, NAVY, FONTS_IMPORT } from "@/components/design/tokens";
import TopNav from "@/components/design/shell/TopNav";

const SHELL_CSS = `
${FONTS_IMPORT}
.rsa-grain::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.04;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
@keyframes rsaHaloBreathe { 0%,100% { opacity: 0.85 } 50% { opacity: 1 } }
.rsa-halo { animation: rsaHaloBreathe 7s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .rsa-halo { animation: none; }
}
`;

const WIDTHS = {
  narrow: "max-w-[680px]",
  wide: "max-w-[1100px]",
};

export default function PageShell({
  width = "narrow",
  nav = false,
  footer = null,
  halo = true,
  className = "",
  children,
}) {
  const container = WIDTHS[width] || WIDTHS.narrow;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: CREAM, color: NAVY }}>
      <style>{SHELL_CSS}</style>

      {halo && (
        <>
          {/* Ambient gold halo + paper grain (matches Index.jsx) */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none rsa-halo"
            style={{
              background:
                "radial-gradient(ellipse 50% 30% at 50% 8%, rgba(201,168,76,0.12), transparent 70%)",
            }}
          />
          <div aria-hidden className="absolute inset-0 pointer-events-none rsa-grain" />
        </>
      )}

      {/* Top nav: pass a node, or `true` for the default role-aware TopNav. */}
      {nav === true ? <TopNav /> : nav}

      <div className={`relative ${container} mx-auto px-5 md:px-8 pt-10 md:pt-16 pb-20 ${className}`}>
        {children}
      </div>

      {footer}
    </div>
  );
}
