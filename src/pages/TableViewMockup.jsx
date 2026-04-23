import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Users,
  MessageCircle,
  Search,
  X,
  Send,
  Sparkles,
  Mail,
  Briefcase,
  Hash,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — "Elysée"
const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#faf7f2";
const CREAM2 = "#e8e3d9";
const INK = "#3a3a52";
const MUTED = "#9090a8";
const SAGE = "#7ba348";

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA

const MOCK_TABLE = {
  id: "t5",
  table_number: 5,
  shape: "round",
  is_presidential: false,
  color: "amber",
};

const SEED_SEATS = [
  {
    id: "s1", seat_number: 1,
    first_name: "Claire", last_name: "Martin",
    job: "Architecte DPLG, Atelier Martin & Associés",
    member_number: "142",
    email: "c.martin@atelier-martin.fr",
    phone: "+33 6 12 34 56 78",
    comment: "Végétarienne · allergie arachides",
  },
  {
    id: "s2", seat_number: 2,
    first_name: "Philippe", last_name: "Durand",
    job: "Notaire associé",
    member_number: "089",
    email: "p.durand@etude-durand.fr",
    phone: "+33 6 98 76 54 32",
  },
  {
    id: "s3", seat_number: 3,
    first_name: "Antoine", last_name: "Leroy",
    job: "Médecin cardiologue",
    member_number: "034",
    email: "a.leroy@cabinet-leroy.fr",
    phone: "+33 6 45 67 89 01",
    isMe: true,
  },
  { id: "s4", seat_number: 4, is_reserved: true, reserved_by: "M. Dubois" },
  {
    id: "s6", seat_number: 6,
    first_name: "Sophie", last_name: "Renard",
    job: "Avocate au barreau de Paris",
    member_number: "157",
    email: "sophie.renard@avocat-paris.fr",
    comment: "Invitée par M. Leroy",
  },
  {
    id: "s7", seat_number: 7,
    first_name: "Laurent", last_name: "Bernard",
    job: "Consultant en stratégie",
    member_number: "211",
    phone: "+33 6 22 33 44 55",
  },
  // 5 and 8 left empty
];

const MOCK_ALL_TABLES = [
  { id: "t1", table_number: 1 },
  { id: "t2", table_number: 2 },
  { id: "t3", table_number: 3 },
  { id: "t4", table_number: 4 },
  { id: "t5", table_number: 5 },
  { id: "t6", table_number: 6 },
  { id: "pres", table_number: 0, is_presidential: true },
];

const MOCK_CROSS_GUESTS = [
  { id: "g1",  first_name: "Isabelle", last_name: "Moreau",   job: "Directrice marketing",  table_number: 1, seat_number: 2 },
  { id: "g2",  first_name: "Jean-Paul", last_name: "Lemoine", job: "Chirurgien",            table_number: 1, seat_number: 4 },
  { id: "g3",  first_name: "Marie",     last_name: "Perrot",  job: "Journaliste",           table_number: 2, seat_number: 1 },
  { id: "g4",  first_name: "Henri",     last_name: "Foucault", job: "Chef d'entreprise",    table_number: 2, seat_number: 3 },
  { id: "g5",  first_name: "Véronique", last_name: "Richard", job: "Architecte d'intérieur", table_number: 3, seat_number: 2 },
  { id: "g6",  first_name: "Guillaume", last_name: "Dubois",  job: "Avocat",                table_number: 3, seat_number: 5 },
  { id: "g7",  first_name: "Catherine", last_name: "Vidal",   job: "Médecin généraliste",   table_number: 4, seat_number: 1 },
  { id: "g8",  first_name: "Pierre",    last_name: "Rousseau", job: "Directeur financier",  table_number: 4, seat_number: 4 },
  { id: "g9",  first_name: "Anne",      last_name: "Joubert", job: "Consultante stratégie", table_number: 6, seat_number: 2 },
  { id: "g10", first_name: "Michel",    last_name: "Caron",   job: "Entrepreneur",          table_number: 6, seat_number: 5 },
  { id: "g11", first_name: "Hélène",    last_name: "Navarro", job: "Chef de projet",        table_number: "Prés.", seat_number: 1 },
  { id: "g12", first_name: "Xavier",    last_name: "Blanc",   job: "Gouverneur Rotary",     table_number: "Prés.", seat_number: 2, gold: true },
];

const SPEAKER = {
  name: "Marc Dupont",
  role: "Entrepreneur · Fondateur Impact&Co",
  theme: "La philanthropie en 2026 — engager une nouvelle génération",
};

// 8-seat round positions around a table
const SEAT_POSITIONS_8 = [
  { top: "3%",  left: "50%",   x: "-50%", y: "0" },
  { top: "13%", right: "12%",  x: "0",    y: "0" },
  { top: "50%", right: "3%",   x: "0",    y: "-50%" },
  { bottom: "13%", right: "12%", x: "0",  y: "0" },
  { bottom: "3%", left: "50%", x: "-50%", y: "0" },
  { bottom: "13%", left: "12%", x: "0",   y: "0" },
  { top: "50%", left: "3%",    x: "0",    y: "-50%" },
  { top: "13%", left: "12%",   x: "0",    y: "0" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Small UI atoms

function Eyebrow({ children, color = GOLD }) {
  return (
    <div className="flex items-center gap-2.5">
      <motion.span
        className="h-[1.5px] block origin-left"
        style={{ background: color, width: 28 }}
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
      <span
        className="uppercase text-[10px] tracking-[0.18em] font-medium"
        style={{ color }}
      >
        {children}
      </span>
    </div>
  );
}

function getInitials(first, last) {
  const a = (first || "").trim().charAt(0);
  const b = (last || "").trim().charAt(0);
  return (a + b).toUpperCase() || "·";
}

// ─────────────────────────────────────────────────────────────────────────────
// Speaker ribbon — ice-breaker at the very top

function SpeakerRibbon({ speaker }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden"
      style={{
        background: "rgba(201,168,76,0.08)",
        borderBottom: `1px solid ${CREAM2}`,
      }}
    >
      <div className="max-w-[1100px] mx-auto px-5 md:px-8 py-3 flex items-center gap-3 flex-wrap">
        <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} />
        <span
          className="text-[10px] uppercase tracking-[0.18em] font-medium shrink-0"
          style={{ color: GOLD }}
        >
          Aujourd'hui
        </span>
        <span
          className="h-[1px] w-6 shrink-0"
          style={{ background: CREAM2 }}
          aria-hidden
        />
        <span
          className="text-[13px] md:text-[14px] shrink-0"
          style={{ fontFamily: "'Playfair Display', serif", color: NAVY, fontWeight: 500 }}
        >
          {speaker.name}
        </span>
        <span className="text-[11px] shrink-0 hidden sm:inline" style={{ color: MUTED }}>
          · {speaker.role} ·
        </span>
        <span
          className="text-[12px] md:text-[13px] italic truncate"
          style={{ fontFamily: "'Playfair Display', serif", color: INK }}
        >
          « {speaker.theme} »
        </span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Top nav — back, calendar, salon toggle, table switcher

function TopNav({ onOpenSalon, salonCount, currentTableId, tables }) {
  return (
    <div
      className="sticky top-0 z-30 backdrop-blur-md"
      style={{
        background: "rgba(250,247,242,0.85)",
        borderBottom: `1px solid ${CREAM2}`,
      }}
    >
      <div className="max-w-[1100px] mx-auto px-5 md:px-8 py-3 flex items-center justify-between gap-3 flex-wrap">
        <Link
          to={createPageUrl("Index")}
          className="group inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] transition-colors"
          style={{ color: MUTED }}
        >
          <ArrowLeft
            className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1"
            style={{ color: GOLD }}
          />
          <span>Retour</span>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenSalon}
            className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] font-medium transition-all hover:-translate-y-[1px]"
            style={{
              background: "white",
              color: NAVY,
              border: `1px solid ${GOLD}`,
              borderRadius: 4,
            }}
          >
            <Users className="w-3.5 h-3.5" style={{ color: GOLD }} />
            <span>Le salon</span>
            <span
              className="ml-1 px-1.5 py-0.5 text-[9px] tabular-nums"
              style={{ background: CREAM, color: NAVY, borderRadius: 2 }}
            >
              {salonCount}
            </span>
          </button>

          <button
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] font-medium transition-all hover:-translate-y-[1px]"
            style={{
              background: "white",
              color: NAVY,
              border: `1px solid ${CREAM2}`,
              borderRadius: 4,
            }}
          >
            <CalendarDays className="w-3.5 h-3.5" style={{ color: GOLD }} />
            Calendrier
          </button>

          <div
            className="flex items-center gap-0.5 p-0.5"
            style={{ border: `1px solid ${CREAM2}`, borderRadius: 4, background: "white" }}
          >
            {tables.map((t) => {
              const active = t.id === currentTableId;
              return (
                <button
                  key={t.id}
                  className="w-7 h-7 flex items-center justify-center text-[11px] tabular-nums transition-all"
                  style={{
                    background: active ? NAVY : "transparent",
                    color: active ? "white" : MUTED,
                    borderRadius: 3,
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 500,
                  }}
                >
                  {t.is_presidential ? "★" : t.table_number}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sticky mini-bar — appears when the user scrolls past the hero

function StickyMiniBar({ show, tableNumber, ratio, mySeatNumber, onPickSeat }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="sticky top-[49px] z-20 backdrop-blur-md"
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
                Table {tableNumber}
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
                <span
                  className="relative flex h-2 w-2"
                  aria-hidden
                >
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
            ) : (
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
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero — eyebrow, big title, stats, progress bar, main CTA

function Hero({ table, stats, mySeatNumber, onPickSeat }) {
  const { total, occupied, reserved, free } = stats;
  const occupiedPct = (occupied / total) * 100;
  const reservedPct = (reserved / total) * 100;

  return (
    <div className="mb-8 md:mb-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-start justify-between gap-6 flex-wrap"
      >
        <div className="min-w-0">
          <Eyebrow>
            {table.is_presidential ? "Présidentielle" : `Table N° ${table.table_number}`}
          </Eyebrow>
          <h1
            className="text-[36px] md:text-[56px] leading-[1.02] mt-3"
            style={{ fontFamily: "'Playfair Display', serif", color: NAVY }}
          >
            {table.is_presidential ? (
              <>
                La table <span className="italic">présidentielle</span>
              </>
            ) : (
              <>
                Table <span className="italic">cinq</span>
              </>
            )}
          </h1>

          <div
            className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-4 text-[13px]"
            style={{ color: INK }}
          >
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: NAVY }}
              />
              {occupied} présent{occupied > 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: GOLD }}
              />
              {reserved} réservé{reserved > 1 ? "s" : ""}
            </span>
            <span
              className="inline-flex items-center gap-1.5"
              style={{ color: MUTED }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full border"
                style={{ borderColor: CREAM2 }}
              />
              {free} libre{free > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Primary CTA — state-aware */}
        {mySeatNumber ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 220, damping: 20 }}
            className="inline-flex items-center gap-3 px-5 py-3"
            style={{
              background: "white",
              border: `1px solid ${GOLD}`,
              borderRadius: 4,
            }}
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
            <div className="text-left">
              <div
                className="text-[9px] uppercase tracking-[0.18em] font-medium"
                style={{ color: GOLD }}
              >
                Vous êtes
              </div>
              <div
                className="text-[15px] leading-tight"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: NAVY,
                  fontWeight: 500,
                }}
              >
                au siège {mySeatNumber}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            onClick={onPickSeat}
            className="group inline-flex items-center gap-2 px-5 py-3 text-[12px] uppercase tracking-[0.18em] font-medium transition-all hover:-translate-y-[1px]"
            style={{
              background: NAVY,
              color: "white",
              borderRadius: 4,
            }}
          >
            <span>Prenez place</span>
            <ArrowUpRight
              className="w-4 h-4 transition-transform group-hover:translate-x-[2px] group-hover:-translate-y-[2px]"
              style={{ color: GOLD }}
            />
          </motion.button>
        )}
      </motion.div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-6"
      >
        <div
          className="relative w-full h-[3px] overflow-hidden flex"
          style={{ background: CREAM2 }}
        >
          <motion.div
            className="h-full"
            style={{ background: NAVY }}
            initial={{ width: 0 }}
            animate={{ width: `${occupiedPct}%` }}
            transition={{ delay: 0.5, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="h-full"
            style={{ background: GOLD }}
            initial={{ width: 0 }}
            animate={{ width: `${reservedPct}%` }}
            transition={{ delay: 0.8, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated status pin — the core visual signal of each seat

const PIN_STYLES = {
  occupied: { bg: "#7ba348", halo: "rgba(123,163,72,0.35)", border: "1px solid rgba(15,31,61,0.08)" },
  me:       { bg: GOLD,      halo: "rgba(201,168,76,0.45)", border: "1px solid rgba(201,168,76,0.6)" },
  reserved: { bg: "white",   halo: "rgba(201,168,76,0.25)", border: `1.5px dashed ${GOLD}` },
  empty:    { bg: "#bdb7aa", halo: "rgba(15,31,61,0.06)",   border: "1px solid rgba(15,31,61,0.08)" },
};

function StatusPin({ status, size = 14, isLiveNew }) {
  const c = PIN_STYLES[status];
  const cycle = status === "me" ? 2.0 : status === "occupied" ? 2.8 : 3.6;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      {/* Breathing halo */}
      <motion.span
        aria-hidden
        className="absolute rounded-full"
        style={{
          inset: -6,
          background: c.halo,
        }}
        animate={{
          scale: [1, 1.55, 1],
          opacity: status === "empty" ? [0.35, 0.08, 0.35] : [0.7, 0.2, 0.7],
        }}
        transition={{ duration: cycle, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Pin dot */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: c.bg,
          border: c.border,
          boxShadow:
            status === "me"
              ? `0 0 0 3px ${CREAM}, 0 2px 6px rgba(201,168,76,0.3)`
              : "0 1px 2px rgba(15,31,61,0.15)",
        }}
      />

      {/* Gold ring for "me" */}
      {status === "me" && (
        <motion.span
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{ inset: -3, border: `1.5px solid ${GOLD}` }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.9, 0.2, 0.9] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Live join splash */}
      {isLiveNew && (
        <>
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ border: `2px solid ${GOLD}` }}
            initial={{ scale: 1, opacity: 0.9 }}
            animate={{ scale: 3.5, opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ border: `1.5px solid ${GOLD}` }}
            initial={{ scale: 1, opacity: 0.85 }}
            animate={{ scale: 4.5, opacity: 0 }}
            transition={{ duration: 1.6, delay: 0.2, ease: "easeOut" }}
          />
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Seat label — name + role (or empty state)

function SeatLabel({ seat, status, seatNumber, align = "center" }) {
  const alignClass =
    align === "left" ? "items-start text-left" :
    align === "right" ? "items-end text-right" :
    "items-center text-center";

  if (status === "empty") {
    return (
      <div className={`flex flex-col ${alignClass} leading-tight max-w-[110px]`}>
        <span
          className="text-[9px] uppercase tracking-[0.18em] font-medium"
          style={{ color: MUTED }}
        >
          Siège {seatNumber}
        </span>
        <span
          className="text-[11px] italic mt-0.5"
          style={{ color: MUTED, fontFamily: "'Playfair Display', serif" }}
        >
          Libre — cliquez
        </span>
      </div>
    );
  }

  if (status === "reserved") {
    return (
      <div className={`flex flex-col ${alignClass} leading-tight max-w-[110px]`}>
        <span
          className="text-[9px] uppercase tracking-[0.18em] font-medium"
          style={{ color: GOLD }}
        >
          Siège {seatNumber}
        </span>
        <span
          className="text-[11.5px] italic mt-0.5"
          style={{ color: GOLD, fontFamily: "'Playfair Display', serif", fontWeight: 500 }}
        >
          Réservé
        </span>
        {seat?.reserved_by && (
          <span className="text-[10px] mt-0.5" style={{ color: MUTED }}>
            {seat.reserved_by}
          </span>
        )}
      </div>
    );
  }

  // Occupied or me
  return (
    <div className={`flex flex-col ${alignClass} leading-tight`}>
      {status === "me" ? (
        <span
          className="text-[9px] uppercase tracking-[0.18em] font-medium"
          style={{ color: GOLD }}
        >
          Vous · {seatNumber}
        </span>
      ) : (
        <span
          className="text-[9px] uppercase tracking-[0.18em] font-medium"
          style={{ color: MUTED }}
        >
          Siège {seatNumber}
        </span>
      )}
      <span
        className="text-[12px] md:text-[12.5px] mt-0.5"
        style={{
          fontFamily: "'Playfair Display', serif",
          color: NAVY,
          fontWeight: 500,
          lineHeight: 1.15,
        }}
      >
        {seat.first_name} {seat.last_name}
      </span>
      {seat.job && (
        <span
          className="text-[10px] mt-0.5 truncate max-w-[120px]"
          style={{ color: MUTED }}
        >
          {seat.job}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Seat unit — positioned wrapper containing pin + label, clickable

// Circular seat layout — 8 seats at equal angles around the table.
// Pin is placed at the circular position; label extends outward (away from table).
// Each seat has its own transform so the PIN CENTER lands exactly on the circle.
//
// Angles (clockwise from 12 o'clock):
//   1=0°, 2=45°, 3=90°, 4=135°, 5=180°, 6=225°, 7=270°, 8=315°

// Two concentric circles — pins on the inner ring, labels on the outer.
// Both are centered on the TABLE center, so every pin sits on one circle
// and every label center sits on another.
const R_PIN = 24;     // pin circle radius (% of canvas from center)
const R_LABEL = 36;   // label circle radius (% of canvas from center)

function polarPos(angleDeg, r) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return {
    left: `${50 + r * Math.cos(a)}%`,
    top: `${50 + r * Math.sin(a)}%`,
  };
}

// Layout per seat (1..8).
//   - flexClass / order: how pin + label sit within the block (pin on the
//                        TABLE-facing side, label on the outer side)
//   - align:             text alignment within the label
// The block's VISUAL CENTER is always placed on the SEAT_RING circle,
// so every seat sits on a clean concentric ring around the table.
const SEAT_LAYOUT = [
  // 1 (0°, top) — label above, pin below (pin = closer to table)
  { angle:   0, align: "center", flexClass: "flex flex-col items-center",         order: ["label","pin"] },
  // 2 (45°, upper-right) — pin LEFT (table-side), label right
  { angle:  45, align: "left",   flexClass: "flex flex-row items-center",         order: ["pin","label"] },
  // 3 (90°, right)
  { angle:  90, align: "left",   flexClass: "flex flex-row items-center",         order: ["pin","label"] },
  // 4 (135°, lower-right)
  { angle: 135, align: "left",   flexClass: "flex flex-row items-center",         order: ["pin","label"] },
  // 5 (180°, bottom) — pin above (closer to table), label below
  { angle: 180, align: "center", flexClass: "flex flex-col items-center",         order: ["pin","label"] },
  // 6 (225°, lower-left) — pin RIGHT (table-side), label left
  { angle: 225, align: "right",  flexClass: "flex flex-row-reverse items-center", order: ["pin","label"] },
  // 7 (270°, left)
  { angle: 270, align: "right",  flexClass: "flex flex-row-reverse items-center", order: ["pin","label"] },
  // 8 (315°, upper-left)
  { angle: 315, align: "right",  flexClass: "flex flex-row-reverse items-center", order: ["pin","label"] },
];

const SeatUnit = React.forwardRef(function SeatUnit(
  { seat, seatNumber, isMe, isLiveNew, layout, onClick, onHover },
  ref
) {
  const isReserved = seat?.is_reserved;
  const isOccupied = !!seat?.first_name;
  const status = isMe ? "me" : isReserved ? "reserved" : isOccupied ? "occupied" : "empty";

  const pinPos = polarPos(layout.angle, R_PIN);
  const labelPos = polarPos(layout.angle, R_LABEL);

  const ariaLabel = isOccupied
    ? `Siège ${seatNumber} · ${seat.first_name} ${seat.last_name}`
    : isReserved
    ? `Siège ${seatNumber} · réservé`
    : `Siège ${seatNumber} · libre`;

  const handleClick = () => onClick(seatNumber, seat);
  const handleHover = () => onHover?.(seatNumber, seat);

  return (
    <>
      {/* PIN — inner circle (closer to the table) */}
      <motion.button
        onClick={handleClick}
        onMouseEnter={handleHover}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay: 0.25 + seatNumber * 0.05,
          duration: 0.45,
          ease: [0.22, 1, 0.36, 1],
        }}
        whileHover={isReserved ? {} : { scale: 1.18 }}
        whileTap={isReserved ? {} : { scale: 0.95 }}
        disabled={isReserved}
        aria-label={ariaLabel}
        className="absolute"
        style={{
          left: pinPos.left,
          top: pinPos.top,
          transform: "translate(-50%, -50%)",
          background: "transparent",
          border: 0,
          padding: 0,
          cursor: isReserved ? "not-allowed" : "pointer",
        }}
      >
        <StatusPin status={status} isLiveNew={isLiveNew} />
      </motion.button>

      {/* LABEL — outer circle (clean concentric ring, all labels aligned) */}
      <motion.button
        ref={ref}
        onClick={handleClick}
        onMouseEnter={handleHover}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.35 + seatNumber * 0.05,
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
        whileHover={isReserved ? {} : { y: -1 }}
        disabled={isReserved}
        aria-hidden
        tabIndex={-1}
        className="absolute px-2 py-1 transition-colors"
        style={{
          left: labelPos.left,
          top: labelPos.top,
          transform: "translate(-50%, -50%)",
          background: "transparent",
          border: 0,
          cursor: isReserved ? "not-allowed" : "pointer",
          borderRadius: 4,
        }}
      >
        <SeatLabel
          seat={seat}
          status={status}
          seatNumber={seatNumber}
          align={layout.align}
        />
      </motion.button>
    </>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Room orientation icons — animated SVG

function StageIcon() {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      {/* Sound waves pulse */}
      <motion.path
        d="M6 13 Q7.5 11 9 13"
        animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "7.5px 13px" }}
      />
      <motion.path
        d="M19 13 Q20.5 11 22 13"
        animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.3, ease: "easeInOut" }}
        style={{ transformOrigin: "20.5px 13px" }}
      />
      {/* Microphone */}
      <rect x="11.5" y="4" width="5" height="10" rx="2.5" />
      <path d="M8 12.5 a6 6 0 0 0 12 0" />
      <line x1="14" y1="18.5" x2="14" y2="22" />
      <line x1="10" y1="22" x2="18" y2="22" />
      {/* Stage platform */}
      <path d="M3 24.5 L25 24.5" strokeWidth="2.2" />
    </svg>
  );
}

function WindowIcon() {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      {/* Window frame */}
      <rect x="4" y="3" width="20" height="22" rx="0.5" />
      <line x1="14" y1="3" x2="14" y2="25" strokeWidth="1.8" />
      <line x1="4" y1="14" x2="24" y2="14" strokeWidth="1.8" />
      {/* Sun rays shimmering inside panes */}
      <motion.g
        animate={{ opacity: [0.3, 0.9, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <line x1="7" y1="7" x2="11" y2="7" strokeWidth="1" opacity="0.6" />
        <line x1="7" y1="10" x2="10" y2="10" strokeWidth="1" opacity="0.5" />
        <line x1="17" y1="18" x2="21" y2="18" strokeWidth="1" opacity="0.6" />
        <line x1="17" y1="21" x2="20" y2="21" strokeWidth="1" opacity="0.5" />
      </motion.g>
      <motion.circle
        cx="10"
        cy="8.5"
        r="1.2"
        fill="currentColor"
        opacity="0.3"
        animate={{ opacity: [0.2, 0.55, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
    </svg>
  );
}

function DoorIcon() {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      {/* Door frame */}
      <path d="M6 24 L6 5 Q6 3 8 3 L20 3 Q22 3 22 5 L22 24" strokeWidth="1.8" />
      {/* Floor */}
      <line x1="3" y1="24.5" x2="25" y2="24.5" strokeWidth="2.2" />
      {/* Opening line */}
      <path d="M10 5 L10 24" strokeDasharray="1.5 2" opacity="0.55" />
      {/* Entering arrow — bouncing gently */}
      <motion.g
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <line x1="14" y1="14" x2="14" y2="21" strokeWidth="1.4" />
        <path d="M11.5 18.5 L14 21 L16.5 18.5" strokeWidth="1.4" />
      </motion.g>
    </svg>
  );
}

// Marker color palettes per room type
const MARKER_PALETTE = {
  stage: {
    bg: "#f5ecd1",
    border: "#e0d3a7",
    icon: "#b28a2a",
    halo: "rgba(201,168,76,0.35)",
  },
  window: {
    bg: "#e1eaf3",
    border: "#cbd5e0",
    icon: "#5a7a99",
    halo: "rgba(90,122,153,0.30)",
  },
  door: {
    bg: "#e4eed7",
    border: "#c7d4b3",
    icon: "#5a7a3a",
    halo: "rgba(90,122,58,0.30)",
  },
};

function OrientationMarker({ icon, label, type, delay = 0.35 }) {
  const p = MARKER_PALETTE[type];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-2 pointer-events-none select-none"
    >
      <div className="relative">
        {/* Outer halo pulse */}
        <motion.span
          aria-hidden
          className="absolute rounded-full"
          style={{ inset: -8, background: p.halo }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.05, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay }}
        />
        {/* Secondary slower halo */}
        <motion.span
          aria-hidden
          className="absolute rounded-full"
          style={{ inset: -4, background: p.halo, opacity: 0.5 }}
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: delay + 0.4 }}
        />
        <div
          className="relative w-[58px] h-[58px] rounded-full flex items-center justify-center"
          style={{
            background: p.bg,
            border: `1px solid ${p.border}`,
            color: p.icon,
            boxShadow: "0 3px 12px rgba(15,31,61,0.08), inset 0 0 0 1px rgba(255,255,255,0.6)",
          }}
        >
          {icon}
        </div>
      </div>
      <span
        className="text-[10px] uppercase tracking-[0.2em] font-medium whitespace-nowrap"
        style={{ color: p.icon }}
      >
        {label}
      </span>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Table canvas — bigger table, pins always table-side, icon markers outside

function TableCanvas({
  table,
  seats,
  myId,
  liveNewSeatNumber,
  onSeatClick,
  setHoveredSeat,
  seatRefs,
}) {
  const maxSeats = table.is_presidential ? 12 : 8;

  return (
    <div className="relative w-full max-w-[820px] mx-auto pb-4">
      {/* Padded wrapper so side markers can sit outside the seat canvas */}
      <div
        className="relative mx-auto"
        style={{ paddingLeft: 80, paddingRight: 80 }}
      >
        {/* Seat canvas — square */}
        <div className="relative w-full pb-[100%]">
          {/* Warm ambient glow */}
          <div
            aria-hidden
            className="absolute inset-[22%] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(201,168,76,0.12), transparent 70%)",
            }}
          />

          {/* Table surface — slightly bigger (~40% of canvas) */}
          <motion.div
            className="absolute rounded-full flex flex-col items-center justify-center"
            style={{
              inset: "30%",
              background: "#f5ede0",
              border: `1px solid ${CREAM2}`,
              boxShadow:
                "inset 0 0 0 1px rgba(15,31,61,0.04), 0 3px 18px rgba(15,31,61,0.06)",
            }}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="text-[10px] uppercase tracking-[0.22em] font-medium"
              style={{ color: GOLD }}
            >
              Table
            </div>
            <div
              className="text-[52px] leading-none mt-1"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: NAVY,
                fontWeight: 500,
              }}
            >
              {table.table_number}
            </div>
          </motion.div>

          {/* Seats */}
          {Array.from({ length: maxSeats }, (_, i) => i + 1).map((seatNum) => {
            const seat = seats.find((s) => s.seat_number === seatNum);
            const layout = SEAT_LAYOUT[seatNum - 1];
            const isMe = seat?.id === myId;
            const isLiveNew = liveNewSeatNumber === seatNum;

            return (
              <SeatUnit
                key={seatNum}
                ref={(el) => (seatRefs.current[seatNum] = el)}
                seat={seat}
                seatNumber={seatNum}
                isMe={isMe}
                isLiveNew={isLiveNew}
                layout={layout}
                onClick={onSeatClick}
                onHover={setHoveredSeat}
              />
            );
          })}
        </div>

        {/* Orientation markers — side markers sit OUTSIDE the canvas in the padding */}
        {/* Estrade — RIGHT */}
        <div className="absolute z-10" style={{ right: "-72px", top: "50%", transform: "translateY(-50%)" }}>
          <OrientationMarker icon={<StageIcon />} label="Estrade" type="stage" delay={0.5} />
        </div>
        {/* Fenêtre — LEFT */}
        <div className="absolute z-10" style={{ left: "-72px", top: "50%", transform: "translateY(-50%)" }}>
          <OrientationMarker icon={<WindowIcon />} label="Fenêtre" type="window" delay={0.4} />
        </div>
      </div>

      {/* Entrée — in flow below the canvas */}
      <div className="flex justify-center mt-6">
        <OrientationMarker icon={<DoorIcon />} label="Entrée" type="door" delay={0.6} />
      </div>

      {/* Legend */}
      <div
        className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-10 text-[10px] uppercase tracking-[0.15em]"
        style={{ color: MUTED, fontWeight: 500 }}
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#7ba348" }} />
          Présent
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: GOLD }} />
          Vous
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full border" style={{ borderColor: GOLD, borderStyle: "dashed" }} />
          Réservé
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#bdb7aa" }} />
          Libre
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Guest popover — card that appears next to hovered/selected seat

function GuestPopover({ open, seat, seats, onChat, onClose, anchorRect }) {
  if (!open || !seat) return null;

  const neighbors = (() => {
    const max = 8;
    const prev = seat.seat_number === 1 ? max : seat.seat_number - 1;
    const next = seat.seat_number === max ? 1 : seat.seat_number + 1;
    return {
      left: seats.find((s) => s.seat_number === prev),
      right: seats.find((s) => s.seat_number === next),
    };
  })();

  const CARD_W = 264;
  const CARD_H_APPROX = 280;
  const style = (() => {
    if (!anchorRect) return { top: 120, left: 120 };
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
          anchorRect.left + anchorRect.width / 2 - style.left
        )
      )
    : CARD_W / 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: style.placeAbove ? 6 : -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: style.placeAbove ? 6 : -6, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="fixed z-40"
      style={{
        top: style.top,
        left: style.left,
        width: CARD_W,
        background: "white",
        border: `1px solid ${CREAM2}`,
        borderRadius: 4,
        boxShadow: "0 10px 30px rgba(15,31,61,0.10)",
      }}
    >
      {/* Arrow */}
      <span
        aria-hidden
        className="absolute w-2.5 h-2.5 rotate-45"
        style={{
          top: style.placeAbove ? "auto" : -5,
          bottom: style.placeAbove ? -5 : "auto",
          left: arrowLeft,
          marginLeft: -5,
          background: "white",
          borderTop: style.placeAbove ? "none" : `1px solid ${CREAM2}`,
          borderLeft: style.placeAbove ? "none" : `1px solid ${CREAM2}`,
          borderBottom: style.placeAbove ? `1px solid ${CREAM2}` : "none",
          borderRight: style.placeAbove ? `1px solid ${CREAM2}` : "none",
        }}
      />

      {/* Chat CTA — top-right icon button */}
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

      {/* Identity — no "Siège X" header, name takes the stage */}
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
          <p
            className="text-[12px] mt-1.5"
            style={{ color: INK, lineHeight: 1.4 }}
          >
            {seat.job}
          </p>
        )}
      </div>

      {/* Contact — left-aligned, icon + value */}
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

      {/* Comment */}
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

      {/* Neighbors — flowing prose, no right-aligned values */}
      {(neighbors.left?.first_name || neighbors.right?.first_name) && (
        <div
          className="px-4 py-3 space-y-1.5 text-[11.5px]"
          style={{ borderTop: `1px solid ${CREAM2}`, color: INK }}
        >
          {neighbors.left?.first_name && (
            <div>
              <span style={{ color: MUTED }}>← </span>
              <span
                className="italic"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
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
              <span
                className="italic"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {neighbors.right.first_name} {neighbors.right.last_name}
              </span>
              <span className="text-[10px]" style={{ color: MUTED }}>
                {" "}· voisin de droite
              </span>
            </div>
          )}
        </div>
      )}

      {/* Member footer — at the very end */}
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

// Tiny inline phone icon (lucide Phone is already imported in other files;
// we inline a minimal SVG here to keep this mockup self-contained)
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

// ─────────────────────────────────────────────────────────────────────────────
// Salon drawer — cross-table directory

function SalonDrawer({ open, onClose, guests, onChat }) {
  const [query, setQuery] = useState("");
  const filtered = guests.filter((g) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      `${g.first_name} ${g.last_name}`.toLowerCase().includes(q) ||
      (g.job || "").toLowerCase().includes(q) ||
      String(g.table_number).toLowerCase().includes(q)
    );
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 backdrop-blur-sm"
            style={{ background: "rgba(15,31,61,0.35)" }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[420px] flex flex-col"
            style={{ background: CREAM, borderLeft: `1px solid ${CREAM2}` }}
          >
            <div
              className="px-5 py-5 flex items-start justify-between gap-3"
              style={{ borderBottom: `1px solid ${CREAM2}` }}
            >
              <div>
                <Eyebrow>Le salon</Eyebrow>
                <h2
                  className="text-[22px] leading-tight mt-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: NAVY,
                    fontWeight: 500,
                  }}
                >
                  Qui est <span className="italic">à la salle ?</span>
                </h2>
                <p className="text-[11px] mt-1" style={{ color: MUTED }}>
                  {guests.length} convive{guests.length > 1 ? "s" : ""} toutes tables confondues
                </p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 w-8 h-8 flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                style={{ border: `1px solid ${CREAM2}`, borderRadius: 4 }}
              >
                <X className="w-4 h-4" style={{ color: MUTED }} />
              </button>
            </div>

            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${CREAM2}` }}>
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{ background: "white", border: `1px solid ${CREAM2}`, borderRadius: 4 }}
              >
                <Search className="w-3.5 h-3.5" style={{ color: MUTED }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher par nom, rôle, table…"
                  className="flex-1 bg-transparent text-[13px] outline-none"
                  style={{ color: NAVY, fontFamily: "Inter, sans-serif" }}
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="text-[10px] uppercase tracking-[0.1em]"
                    style={{ color: MUTED }}
                  >
                    Effacer
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {filtered.length === 0 ? (
                <div
                  className="text-center py-10 text-[13px] italic"
                  style={{ color: MUTED, fontFamily: "'Playfair Display', serif" }}
                >
                  Personne ne correspond à « {query} ».
                </div>
              ) : (
                filtered.map((g, i) => (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 + i * 0.025, duration: 0.35 }}
                    className="group relative flex items-center gap-3 p-3 transition-all hover:-translate-y-[1px] overflow-hidden"
                    style={{
                      background: "white",
                      border: `1px solid ${CREAM2}`,
                      borderRadius: 4,
                    }}
                  >
                    <span
                      aria-hidden
                      className="absolute left-0 top-0 bottom-0 w-[2px] origin-top scale-y-0 group-hover:scale-y-100 transition-transform duration-500 ease-out"
                      style={{ background: GOLD }}
                    />
                    <div
                      className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                      style={{
                        background: g.gold ? GOLD : NAVY,
                        color: "white",
                        fontFamily: "'Playfair Display', serif",
                        fontWeight: 500,
                        fontSize: 12,
                      }}
                    >
                      {getInitials(g.first_name, g.last_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[14px] leading-tight truncate"
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          color: NAVY,
                          fontWeight: 500,
                        }}
                      >
                        {g.first_name} {g.last_name}
                      </div>
                      {g.job && (
                        <div className="text-[11px] truncate" style={{ color: INK }}>
                          {g.job}
                        </div>
                      )}
                    </div>
                    <span
                      className="shrink-0 text-[10px] uppercase tracking-[0.12em] font-medium px-2 py-0.5"
                      style={{
                        color: GOLD,
                        border: `1px solid ${CREAM2}`,
                        borderRadius: 2,
                      }}
                    >
                      {g.table_number === "Prés." ? "★" : `T. ${g.table_number}`}
                    </span>
                    <button
                      onClick={() => onChat(g)}
                      aria-label="Chat"
                      className="shrink-0 w-8 h-8 flex items-center justify-center transition-all hover:scale-110"
                      style={{
                        background: "rgba(201,168,76,0.10)",
                        border: `1px solid ${CREAM2}`,
                        borderRadius: 4,
                      }}
                    >
                      <MessageCircle className="w-3.5 h-3.5" style={{ color: GOLD }} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat drawer — conversation panel

function ChatDrawer({ open, target, onClose }) {
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, from: "them", content: "Bonjour, ravi de vous retrouver !", time: "12:34" },
    { id: 2, from: "me", content: "Idem, à quelle table êtes-vous ?", time: "12:35" },
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setMessages([
        { id: 1, from: "them", content: "Bonjour, ravi de vous retrouver !", time: "12:34" },
        { id: 2, from: "me", content: "Idem, à quelle table êtes-vous ?", time: "12:35" },
      ]);
    }
  }, [target?.id]); // eslint-disable-line

  const send = (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    setMessages((m) => [
      ...m,
      { id: Date.now(), from: "me", content: msg.trim(), time: "maintenant" },
    ]);
    setMsg("");
  };

  return (
    <AnimatePresence>
      {open && target && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-4 right-4 z-50 w-[min(380px,calc(100vw-2rem))] h-[460px] flex flex-col"
          style={{
            background: "white",
            border: `1px solid ${CREAM2}`,
            borderRadius: 4,
            boxShadow: "0 12px 32px rgba(15,31,61,0.18)",
          }}
        >
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{ borderBottom: `1px solid ${CREAM2}` }}
          >
            <div
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                background: NAVY,
                color: "white",
                fontFamily: "'Playfair Display', serif",
                fontWeight: 500,
                fontSize: 12,
              }}
            >
              {getInitials(target.first_name, target.last_name)}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-[10px] uppercase tracking-[0.15em] font-medium"
                style={{ color: GOLD }}
              >
                {target.table_number ? `Table ${target.table_number}` : `Siège ${target.seat_number}`}
              </div>
              <div
                className="text-[14px] leading-tight truncate"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: NAVY,
                  fontWeight: 500,
                }}
              >
                {target.first_name} {target.last_name}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="shrink-0 w-7 h-7 flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.04)]"
              style={{ borderRadius: 3 }}
            >
              <X className="w-4 h-4" style={{ color: MUTED }} />
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto p-4 space-y-3"
            style={{ background: CREAM }}
          >
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[80%] px-3 py-2 text-[13px] leading-snug"
                  style={
                    m.from === "me"
                      ? {
                          background: NAVY,
                          color: "white",
                          borderRadius: "3px 3px 0 3px",
                          fontFamily: "Inter, sans-serif",
                        }
                      : {
                          background: "white",
                          color: NAVY,
                          border: `1px solid ${CREAM2}`,
                          borderRadius: "3px 3px 3px 0",
                          fontFamily: "Inter, sans-serif",
                        }
                  }
                >
                  {m.content}
                  <div
                    className="text-[9px] uppercase tracking-[0.12em] mt-1"
                    style={{ color: m.from === "me" ? "rgba(255,255,255,0.5)" : MUTED }}
                  >
                    {m.time}
                  </div>
                </div>
              </motion.div>
            ))}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={send}
            className="p-3 flex items-center gap-2"
            style={{ borderTop: `1px solid ${CREAM2}`, background: "white" }}
          >
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Écrire un mot…"
              className="flex-1 bg-transparent text-[13px] px-3 py-2 outline-none"
              style={{
                color: NAVY,
                border: `1px solid ${CREAM2}`,
                borderRadius: 4,
              }}
            />
            <button
              type="submit"
              aria-label="Envoyer"
              className="w-9 h-9 flex items-center justify-center transition-all hover:-translate-y-[1px]"
              style={{
                background: NAVY,
                borderRadius: 4,
              }}
            >
              <Send className="w-3.5 h-3.5" style={{ color: GOLD }} />
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Seat Form mini-modal — when picking an empty seat

function PickField({ label, required, type = "text", value, onChange, placeholder }) {
  return (
    <div>
      <label
        className="block text-[10px] uppercase tracking-[0.15em] font-medium mb-1"
        style={{ color: MUTED }}
      >
        {label}{required && <span style={{ color: GOLD }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-[14px] outline-none transition-colors focus:border-[color:var(--b)]"
        style={{
          background: "white",
          border: `1px solid ${CREAM2}`,
          borderRadius: 4,
          color: NAVY,
          fontFamily: "Inter, sans-serif",
          ["--b"]: GOLD,
        }}
      />
    </div>
  );
}

function SeatPickModal({ open, seatNumber, onClose, onConfirm }) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    job: "",
    email: "",
    phone: "",
    member_number: "",
    comment: "",
  });

  useEffect(() => {
    if (!open) {
      setForm({
        first_name: "",
        last_name: "",
        job: "",
        email: "",
        phone: "",
        member_number: "",
        comment: "",
      });
    }
  }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const canSubmit = form.first_name.trim() && form.last_name.trim();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,31,61,0.5)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[480px] max-h-[90vh] overflow-auto"
            style={{ background: CREAM, border: `1px solid ${CREAM2}`, borderRadius: 4 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-6 py-5 flex items-start justify-between gap-3"
              style={{ borderBottom: `1px solid ${CREAM2}` }}
            >
              <div>
                <Eyebrow>Siège {seatNumber}</Eyebrow>
                <h3
                  className="text-[26px] md:text-[30px] leading-tight mt-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: NAVY,
                    fontWeight: 500,
                  }}
                >
                  Prenez <span className="italic">place</span>
                </h3>
                <p className="text-[12px] mt-1.5" style={{ color: INK }}>
                  Renseignez vos informations. Vous pourrez les modifier à tout moment.
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Fermer"
                className="shrink-0 w-8 h-8 flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                style={{ border: `1px solid ${CREAM2}`, borderRadius: 4 }}
              >
                <X className="w-4 h-4" style={{ color: MUTED }} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (canSubmit) onConfirm({ ...form });
              }}
              className="px-6 py-5"
            >
              {/* Identity — row */}
              <div className="mb-5">
                <div
                  className="text-[9px] uppercase tracking-[0.18em] font-medium mb-3"
                  style={{ color: GOLD }}
                >
                  — Identité
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <PickField
                    label="Prénom"
                    required
                    value={form.first_name}
                    onChange={set("first_name")}
                    placeholder="Antoine"
                  />
                  <PickField
                    label="Nom"
                    required
                    value={form.last_name}
                    onChange={set("last_name")}
                    placeholder="Leroy"
                  />
                </div>
                <div className="mt-3">
                  <PickField
                    label="Profession"
                    value={form.job}
                    onChange={set("job")}
                    placeholder="Médecin cardiologue"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="mb-5">
                <div
                  className="text-[9px] uppercase tracking-[0.18em] font-medium mb-3"
                  style={{ color: GOLD }}
                >
                  — Contact
                </div>
                <div className="space-y-3">
                  <PickField
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder="antoine.leroy@example.fr"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <PickField
                      label="Téléphone"
                      type="tel"
                      value={form.phone}
                      onChange={set("phone")}
                      placeholder="+33 6…"
                    />
                    <PickField
                      label="N° membre"
                      value={form.member_number}
                      onChange={set("member_number")}
                      placeholder="034"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <div
                  className="text-[9px] uppercase tracking-[0.18em] font-medium mb-3"
                  style={{ color: GOLD }}
                >
                  — Remarques
                </div>
                <label
                  className="block text-[10px] uppercase tracking-[0.15em] font-medium mb-1"
                  style={{ color: MUTED }}
                >
                  Commentaire
                </label>
                <textarea
                  value={form.comment}
                  onChange={set("comment")}
                  rows={2}
                  placeholder="Régime, allergie, invité par…"
                  className="w-full px-3 py-2 text-[14px] outline-none resize-none focus:border-[color:var(--b)]"
                  style={{
                    background: "white",
                    border: `1px solid ${CREAM2}`,
                    borderRadius: 4,
                    color: NAVY,
                    fontFamily: "Inter, sans-serif",
                    ["--b"]: GOLD,
                  }}
                />
              </div>

              <div
                className="flex gap-2 pt-4"
                style={{ borderTop: `1px solid ${CREAM2}` }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-[11px] uppercase tracking-[0.15em] font-medium transition-all"
                  style={{
                    background: "transparent",
                    color: MUTED,
                    border: `1px solid ${CREAM2}`,
                    borderRadius: 4,
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="group flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[11px] uppercase tracking-[0.15em] font-medium transition-all disabled:opacity-40"
                  style={{
                    background: NAVY,
                    color: "white",
                    borderRadius: 4,
                  }}
                >
                  Confirmer ma place
                  <ArrowUpRight
                    className="w-3.5 h-3.5 transition-transform group-hover:translate-x-[2px] group-hover:-translate-y-[2px]"
                    style={{ color: GOLD }}
                  />
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN

export default function TableViewMockup() {
  const [seats, setSeats] = useState(SEED_SEATS);
  const [myId, setMyId] = useState("s3");
  const mySeat = seats.find((s) => s.id === myId);

  const [hoveredSeat, setHoveredSeat] = useState(null);
  const [hoveredData, setHoveredData] = useState(null);
  const [hoveredRect, setHoveredRect] = useState(null);

  const [pickingSeat, setPickingSeat] = useState(null);
  const [salonOpen, setSalonOpen] = useState(false);
  const [chatTarget, setChatTarget] = useState(null);
  const [liveNewSeatNumber, setLiveNewSeatNumber] = useState(null);
  const [showMiniBar, setShowMiniBar] = useState(false);

  const seatRefs = useRef({});
  const heroRef = useRef(null);

  // Scroll — reveal mini bar when hero leaves the viewport
  useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      setShowMiniBar(rect.bottom < 56);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Demo: 4 seconds after load, simulate a convive joining seat 5
  useEffect(() => {
    const t = setTimeout(() => {
      setSeats((prev) => {
        if (prev.find((s) => s.seat_number === 5)) return prev;
        return [
          ...prev,
          {
            id: "s5new",
            seat_number: 5,
            first_name: "Élise",
            last_name: "Vasseur",
            job: "Vétérinaire",
            member_number: "188",
          },
        ];
      });
      setLiveNewSeatNumber(5);
      setTimeout(() => setLiveNewSeatNumber(null), 1800);
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  // Stats
  const stats = useMemo(() => {
    const total = MOCK_TABLE.is_presidential ? 12 : 8;
    const occupied = seats.filter((s) => s.first_name).length;
    const reserved = seats.filter((s) => s.is_reserved).length;
    return { total, occupied, reserved, free: total - occupied - reserved };
  }, [seats]);

  // Handlers
  const handleSeatClick = (seatNumber, seat) => {
    if (seat?.first_name) {
      const el = seatRefs.current[seatNumber];
      const rect = el?.getBoundingClientRect();
      setHoveredSeat(seatNumber);
      setHoveredData(seat);
      setHoveredRect(rect || null);
    } else if (!seat?.is_reserved) {
      setPickingSeat(seatNumber);
    }
  };

  const handleHover = (seatNumber, seat) => {
    if (seatNumber && seat?.first_name) {
      const el = seatRefs.current[seatNumber];
      const rect = el?.getBoundingClientRect();
      setHoveredSeat(seatNumber);
      setHoveredData(seat);
      setHoveredRect(rect || null);
    } else if (!seatNumber) {
      // leave — handled by popover close on outside click
    }
  };

  const handleChat = (target) => {
    setChatTarget(target);
    setHoveredSeat(null);
    setHoveredData(null);
    setSalonOpen(false);
  };

  const handleConfirmSeat = (info) => {
    const num = pickingSeat;
    const id = `me${num}`;
    setSeats((prev) => {
      const filtered = prev.filter((s) => s.seat_number !== num);
      return [...filtered, { id, seat_number: num, ...info }];
    });
    setMyId(id);
    setPickingSeat(null);
  };

  // Salon count = mock guests + current table occupied
  const salonCount = MOCK_CROSS_GUESTS.length + stats.occupied;

  return (
    <div
      className="min-h-screen relative"
      style={{ background: CREAM, color: NAVY }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
      `}</style>

      <SpeakerRibbon speaker={SPEAKER} />

      <TopNav
        onOpenSalon={() => setSalonOpen(true)}
        salonCount={salonCount}
        currentTableId={MOCK_TABLE.id}
        tables={MOCK_ALL_TABLES}
      />

      <StickyMiniBar
        show={showMiniBar}
        tableNumber={MOCK_TABLE.table_number}
        ratio={`${stats.occupied + stats.reserved}/${stats.total}`}
        mySeatNumber={mySeat?.seat_number}
        onPickSeat={() => {
          const empty = Array.from({ length: stats.total }, (_, i) => i + 1).find(
            (n) => !seats.find((s) => s.seat_number === n)
          );
          if (empty) setPickingSeat(empty);
        }}
      />

      <div className="relative max-w-[1100px] mx-auto px-5 md:px-8 pt-8 md:pt-12 pb-24">
        <div ref={heroRef}>
          <Hero
            table={MOCK_TABLE}
            stats={stats}
            mySeatNumber={mySeat?.seat_number}
            onPickSeat={() => {
              const empty = Array.from({ length: stats.total }, (_, i) => i + 1).find(
                (n) => !seats.find((s) => s.seat_number === n)
              );
              if (empty) setPickingSeat(empty);
            }}
          />
        </div>

        <div className="mt-6 md:mt-8">
          <TableCanvas
            table={MOCK_TABLE}
            seats={seats}
            myId={myId}
            liveNewSeatNumber={liveNewSeatNumber}
            onSeatClick={handleSeatClick}
            hoveredSeat={hoveredSeat}
            setHoveredSeat={handleHover}
            seatRefs={seatRefs}
          />
        </div>

        {/* Hint */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8 text-[11px] italic"
          style={{ color: MUTED, fontFamily: "'Playfair Display', serif" }}
        >
          Survolez ou cliquez un siège pour en savoir plus.
          <br className="sm:hidden" />
          <span className="hidden sm:inline"> · </span>
          Ouvrez <span className="not-italic uppercase tracking-[0.15em]" style={{ color: GOLD }}>Le salon</span> pour retrouver un convive à une autre table.
        </motion.div>
      </div>

      {/* Popovers + drawers */}
      <AnimatePresence>
        {hoveredSeat && hoveredData && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => {
                setHoveredSeat(null);
                setHoveredData(null);
              }}
            />
            <GuestPopover
              open
              seat={hoveredData}
              seats={seats}
              anchorRect={hoveredRect}
              onClose={() => {
                setHoveredSeat(null);
                setHoveredData(null);
              }}
              onChat={handleChat}
            />
          </>
        )}
      </AnimatePresence>

      <SalonDrawer
        open={salonOpen}
        onClose={() => setSalonOpen(false)}
        guests={MOCK_CROSS_GUESTS}
        onChat={handleChat}
      />

      <ChatDrawer
        open={!!chatTarget}
        target={chatTarget}
        onClose={() => setChatTarget(null)}
      />

      <SeatPickModal
        open={!!pickingSeat}
        seatNumber={pickingSeat}
        onClose={() => setPickingSeat(null)}
        onConfirm={handleConfirmSeat}
      />
    </div>
  );
}
