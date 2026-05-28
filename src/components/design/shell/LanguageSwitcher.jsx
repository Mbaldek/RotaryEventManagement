// LanguageSwitcher — the canonical FR/EN/DE pill toggle. Reads/writes the shared
// language context (@/lib/platform/i18n). Replaces the copy-pasted toggle hand-rolled
// at the top of every public RSA page (RsaFinaleRsvp `Header`, StartupUpload, …).
//
// Props:
//   variant : "onNavy" (default) | "onCream" — adapts inactive colors to the surface.
//   size    : "sm" (default) | "md"
//   className : optional extra classes on the wrapper.
//
// Styling: small pills; active = GOLD bg / NAVY text, inactive = transparent / muted.
// GOLD focus ring + a11y aria-pressed on each pill.

import React from "react";
import { NAVY, GOLD, MUTED } from "@/components/design/tokens";
import { useLang, LANGS } from "@/lib/platform/i18n";

export default function LanguageSwitcher({ variant = "onNavy", size = "sm", className = "" }) {
  const { lang, setLang } = useLang();

  const pad = size === "md" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]";
  const inactiveText = variant === "onNavy" ? "rgba(255,255,255,0.45)" : MUTED;
  const inactiveBorder = variant === "onNavy" ? "rgba(255,255,255,0.2)" : "rgba(144,144,168,0.3)";

  return (
    <div className={`flex items-center gap-1 ${className}`} role="group" aria-label="Language">
      {LANGS.map((l) => {
        const on = lang === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={on}
            className={`${pad} rounded-full font-medium uppercase tracking-[0.08em] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] ${
              variant === "onNavy" ? "focus-visible:ring-offset-[#0f1f3d]" : "focus-visible:ring-offset-[#faf7f2]"
            }`}
            style={{
              background: on ? GOLD : "transparent",
              color: on ? NAVY : inactiveText,
              border: `1px solid ${on ? GOLD : inactiveBorder}`,
            }}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
