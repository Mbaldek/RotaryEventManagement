// Eyebrow — small section label: a short gold rule + uppercase tracked label.
// Animates in on scroll (rule scaleX 0→1, label fade). Extracted verbatim from
// src/pages/Index.jsx; visual output unchanged.
//
// Props:
//   children : node   — the label text (pass already-translated string via i18n)
//   color    : string — accent color for rule + label (default GOLD; e.g. GREEN_TODAY for "live")
//
// Trilingual note: pass the resolved string as children, e.g.
//   <Eyebrow>{t.quickAccess}</Eyebrow>. Never hard-code copy here.

import React from "react";
import { motion } from "framer-motion";
import { GOLD, EASE } from "@/components/design/tokens";
import { GOLD_TEXT } from "@/components/design/tokens.app";

// `color` controls the decorative rule (graphical, no contrast requirement).
// `textColor` controls the actual TEXT — defaults to GOLD_TEXT so the label
// passes WCAG AA on CREAM/white surfaces (~5.6:1) while the rule stays GOLD.
// Pass `textColor={color}` to opt out (e.g. on dark surfaces where pure GOLD
// already passes AA on NAVY at ~5.7:1).
export default function Eyebrow({ children, color = GOLD, textColor }) {
  const labelColor = textColor || (color === GOLD ? GOLD_TEXT : color);
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <motion.span
        className="h-[1.5px] block origin-left"
        style={{ background: color, width: 28 }}
        aria-hidden
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-20% 0px" }}
        transition={{ duration: 0.7, ease: EASE }}
      />
      <motion.span
        className="uppercase text-[10px] tracking-[0.18em] font-medium"
        style={{ color: labelColor }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-20% 0px" }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        {children}
      </motion.span>
    </div>
  );
}
