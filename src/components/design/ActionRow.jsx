// ActionRow — clickable editorial tile: a two-digit index, a bordered circle icon,
// a serif title with a hover underline, an optional subtitle, and an ArrowUpRight
// that lifts on hover. A gold bar grows from the left and a white sheen sweeps
// across on hover. Background is a soft pastel tint (semantic). Extracted verbatim
// from src/pages/Index.jsx; visual output unchanged.
//
// Props:
//   to       : string      — react-router target (createPageUrl(...))
//   number   : number      — 1-based index, rendered zero-padded (01, 02, …)
//   title    : node        — serif title (pass translated copy)
//   subtitle : node        — optional Inter subtitle (pass translated copy)
//   icon     : LucideIcon   — icon component, rendered w-4 h-4
//   tint     : string      — pastel background (TINT_SAGE / TINT_BEIGE / TINT_BLUE / TINT_ADMIN)
//   index    : number      — 0-based, drives the mount stagger delay
//
// Trilingual note: title/subtitle are copy — pass resolved i18n strings.

import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { NAVY, GOLD, CREAM2, INK, MUTED, SERIF } from "@/components/design/tokens";

function pad2(n) {
  return String(n).padStart(2, "0");
}

export default function ActionRow({ to, number, title, subtitle, icon: Icon, tint, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.06, duration: 0.5 }}
    >
      <Link
        to={to}
        className="group block relative overflow-hidden transition-colors"
        style={{ background: tint, border: `1px solid ${CREAM2}`, borderRadius: 4 }}
      >
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-[2px] origin-top scale-y-0 group-hover:scale-y-100 transition-transform duration-500 ease-out"
          style={{ background: GOLD }}
        />
        <span
          aria-hidden
          className="absolute inset-y-0 -left-1/3 w-1/3 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
          }}
        />
        <div className="relative flex items-center gap-4 md:gap-5 px-5 py-4 md:px-6 md:py-5">
          <div
            className="text-[11px] tabular-nums font-medium shrink-0 w-6"
            style={{ color: MUTED }}
          >
            {pad2(number)}
          </div>
          <div
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-[6deg]"
            style={{
              background: "white",
              border: `1px solid ${CREAM2}`,
              boxShadow: "0 1px 0 rgba(15,31,61,0.02)",
            }}
          >
            {Icon && <Icon className="w-4 h-4" style={{ color: NAVY }} />}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[15px] md:text-base relative inline-block"
              style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
            >
              {title}
              <span
                aria-hidden
                className="absolute left-0 right-0 -bottom-0.5 h-[1px] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out"
                style={{ background: GOLD }}
              />
            </div>
            {subtitle && (
              <div className="text-xs mt-0.5" style={{ color: INK }}>
                {subtitle}
              </div>
            )}
          </div>
          <motion.div
            className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
            initial={{ x: 0, y: 0 }}
            whileHover={{ x: 3, y: -3 }}
          >
            <ArrowUpRight className="w-4 h-4" style={{ color: NAVY }} />
          </motion.div>
        </div>
      </Link>
    </motion.div>
  );
}
