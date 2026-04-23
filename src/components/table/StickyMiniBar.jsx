import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM2 = "#e8e3d9";
const MUTED = "#9090a8";

export default function StickyMiniBar({
  show,
  tableNumber,
  isPresidential,
  ratio,
  mySeatNumber,
  onPickSeat,
}) {
  const label = isPresidential ? "Présidentielle" : `Table ${tableNumber}`;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="sticky top-0 z-20 backdrop-blur-md"
          style={{
            background: "rgba(250,247,242,0.92)",
            borderBottom: `1px solid ${CREAM2}`,
          }}
        >
          <div className="max-w-[1100px] mx-auto px-5 md:px-8 py-2.5 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="text-[10px] uppercase tracking-[0.18em] font-medium"
                style={{ color: GOLD }}
              >
                {label}
              </span>
              <span className="h-3 w-[1px]" style={{ background: CREAM2 }} aria-hidden />
              <span
                className="text-[13px] tabular-nums"
                style={{ fontFamily: "'Playfair Display', serif", color: NAVY, fontWeight: 500 }}
              >
                {ratio}
              </span>
              <span className="text-[11px]" style={{ color: MUTED }}>
                sièges pris
              </span>
            </div>

            {mySeatNumber ? (
              <div
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] font-medium"
                style={{ color: NAVY }}
              >
                <span className="relative flex h-2 w-2" aria-hidden>
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ background: GOLD }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{ background: GOLD }}
                  />
                </span>
                Vous · Siège {mySeatNumber}
              </div>
            ) : onPickSeat ? (
              <button
                onClick={onPickSeat}
                className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] font-medium transition-all hover:-translate-y-[1px]"
                style={{
                  background: NAVY,
                  color: "white",
                  border: `1px solid ${NAVY}`,
                  borderRadius: 4,
                }}
              >
                Prenez place
                <ArrowUpRight
                  className="w-3.5 h-3.5 transition-transform group-hover:translate-x-[2px] group-hover:-translate-y-[2px]"
                  style={{ color: GOLD }}
                />
              </button>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
