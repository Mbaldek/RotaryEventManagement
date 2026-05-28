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

export default function Eyebrow({ children, color = GOLD }) {
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
        style={{ color }}
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
