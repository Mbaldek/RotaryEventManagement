import React from "react";
import { motion } from "framer-motion";
import { MessageCircle, Mail } from "lucide-react";
import { neighborsOf } from "./seat-geometry";

const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#faf7f2";
const CREAM2 = "#e8e3d9";
const INK = "#3a3a52";
const MUTED = "#9090a8";

function PhoneIconStub() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={GOLD}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5 shrink-0"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

const CARD_W = 264;
const CARD_H_APPROX = 280;

export default function GuestPopover({ open, seat, seats, totalSeats, anchorRect, onChat }) {
  if (!open || !seat) return null;

  const { prev, next } = neighborsOf(seat.seat_number, totalSeats);
  const neighbors = {
    left: prev != null ? seats.find((s) => s.seat_number === prev) : null,
    right: next != null ? seats.find((s) => s.seat_number === next) : null,
  };

  const placement = (() => {
    if (!anchorRect) return { top: 120, left: 120, placeAbove: false };
    const spaceBelow = window.innerHeight - (anchorRect.top + anchorRect.height);
    const placeAbove = spaceBelow < CARD_H_APPROX + 20;
    const top = placeAbove
      ? Math.max(12, anchorRect.top - CARD_H_APPROX - 10)
      : anchorRect.top + anchorRect.height + 10;
    const left = Math.min(
      Math.max(12, anchorRect.left + anchorRect.width / 2 - CARD_W / 2),
      window.innerWidth - CARD_W - 12
    );
    return { top, left, placeAbove };
  })();

  const arrowLeft = anchorRect
    ? Math.max(
        16,
        Math.min(
          CARD_W - 20,
          anchorRect.left + anchorRect.width / 2 - placement.left
        )
      )
    : CARD_W / 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: placement.placeAbove ? 6 : -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: placement.placeAbove ? 6 : -6, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="fixed z-40"
      style={{
        top: placement.top,
        left: placement.left,
        width: CARD_W,
        background: "white",
        border: `1px solid ${CREAM2}`,
        borderRadius: 4,
        boxShadow: "0 10px 30px rgba(15,31,61,0.10)",
      }}
    >
      <span
        aria-hidden
        className="absolute w-2.5 h-2.5 rotate-45"
        style={{
          top: placement.placeAbove ? "auto" : -5,
          bottom: placement.placeAbove ? -5 : "auto",
          left: arrowLeft,
          marginLeft: -5,
          background: "white",
          borderTop: placement.placeAbove ? "none" : `1px solid ${CREAM2}`,
          borderLeft: placement.placeAbove ? "none" : `1px solid ${CREAM2}`,
          borderBottom: placement.placeAbove ? `1px solid ${CREAM2}` : "none",
          borderRight: placement.placeAbove ? `1px solid ${CREAM2}` : "none",
        }}
      />

      {onChat && (
        <motion.button
          onClick={() => onChat(seat)}
          aria-label="Démarrer une conversation"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center transition-all"
          style={{
            background: "rgba(201,168,76,0.14)",
            border: `1px solid ${CREAM2}`,
            color: GOLD,
            borderRadius: 999,
          }}
        >
          <MessageCircle className="w-4 h-4" />
        </motion.button>
      )}

      <div className="px-4 pt-4 pb-3 pr-12">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: "#7ba348" }}
            aria-hidden
          />
          <span
            className="text-[9px] uppercase tracking-[0.18em] font-medium"
            style={{ color: "#5a7a3a" }}
          >
            Présent
          </span>
        </div>
        <h3
          className="text-[19px] leading-tight"
          style={{
            fontFamily: "'Playfair Display', serif",
            color: NAVY,
            fontWeight: 500,
          }}
        >
          {seat.first_name} <span className="italic">{seat.last_name}</span>
        </h3>
        {seat.job && (
          <p className="text-[12px] mt-1.5" style={{ color: INK, lineHeight: 1.4 }}>
            {seat.job}
          </p>
        )}
      </div>

      {(seat.email || seat.phone) && (
        <div
          className="px-4 py-3 space-y-2"
          style={{ borderTop: `1px solid ${CREAM2}` }}
        >
          {seat.email && (
            <a
              href={`mailto:${seat.email}`}
              className="flex items-center gap-2.5 text-[12px] transition-colors hover:opacity-70"
              style={{ color: INK }}
            >
              <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} />
              <span className="truncate" style={{ fontFamily: "Inter, sans-serif" }}>
                {seat.email}
              </span>
            </a>
          )}
          {seat.phone && (
            <a
              href={`tel:${seat.phone.replace(/\s/g, "")}`}
              className="flex items-center gap-2.5 text-[12px] transition-colors hover:opacity-70"
              style={{ color: INK }}
            >
              <PhoneIconStub />
              <span style={{ fontFamily: "Inter, sans-serif" }}>{seat.phone}</span>
            </a>
          )}
        </div>
      )}

      {seat.comment && (
        <div
          className="px-4 py-3 text-[12px] italic"
          style={{
            borderTop: `1px solid ${CREAM2}`,
            background: CREAM,
            color: INK,
            fontFamily: "'Playfair Display', serif",
            lineHeight: 1.4,
          }}
        >
          « {seat.comment} »
        </div>
      )}

      {(neighbors.left?.first_name || neighbors.right?.first_name) && (
        <div
          className="px-4 py-3 space-y-1.5 text-[11.5px]"
          style={{ borderTop: `1px solid ${CREAM2}`, color: INK }}
        >
          {neighbors.left?.first_name && (
            <div>
              <span style={{ color: MUTED }}>← </span>
              <span className="italic" style={{ fontFamily: "'Playfair Display', serif" }}>
                {neighbors.left.first_name} {neighbors.left.last_name}
              </span>
              <span className="text-[10px]" style={{ color: MUTED }}>
                {" "}· voisin de gauche
              </span>
            </div>
          )}
          {neighbors.right?.first_name && (
            <div>
              <span style={{ color: MUTED }}>→ </span>
              <span className="italic" style={{ fontFamily: "'Playfair Display', serif" }}>
                {neighbors.right.first_name} {neighbors.right.last_name}
              </span>
              <span className="text-[10px]" style={{ color: MUTED }}>
                {" "}· voisin de droite
              </span>
            </div>
          )}
        </div>
      )}

      {seat.member_number && (
        <div
          className="px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] font-medium"
          style={{
            borderTop: `1px solid ${CREAM2}`,
            color: MUTED,
            background: "rgba(201,168,76,0.05)",
          }}
        >
          Membre Rotary
          <span style={{ color: GOLD, fontWeight: 600 }}>
            {"  ·  "}N° {seat.member_number}
          </span>
        </div>
      )}
    </motion.div>
  );
}
