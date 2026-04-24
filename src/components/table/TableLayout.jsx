import React, { forwardRef, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { computeSeatLayouts, tableSurfaceSize } from "./seat-geometry";

// Live geometry calibration. Initial values come from URL query (so you can
// bookmark a setup), then the inline sliders let you iterate in real time.
//   pr = pin radius (% from center)
//   lr = label radius (% from center)
//   ox = horizontal offset of the whole ring system (%)
//   oy = vertical offset of the whole ring system (%)
function readInitialOverrides(defaultHalfR) {
  const fallback = {
    pinRadius: defaultHalfR,
    labelRadius: defaultHalfR + 9,
    pinOffsetX: 0,
    pinOffsetY: 0,
    labelOffsetX: 0,
    labelOffsetY: 0,
  };
  if (typeof window === "undefined") return fallback;
  const p = new URLSearchParams(window.location.search);
  const parseNum = (k, def) => {
    const v = p.get(k);
    if (v === null || v === "") return def;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : def;
  };
  // Backwards-compat: ?ox / ?oy used to shift both pin & label uniformly → now
  // maps to pin offset (the user's first calibration target).
  const legacyPinOX = parseNum("ox", 0);
  const legacyPinOY = parseNum("oy", 0);
  return {
    pinRadius: parseNum("pr", fallback.pinRadius),
    labelRadius: parseNum("lr", fallback.labelRadius),
    pinOffsetX: parseNum("pox", legacyPinOX),
    pinOffsetY: parseNum("poy", legacyPinOY),
    labelOffsetX: parseNum("lox", 0),
    labelOffsetY: parseNum("loy", 0),
  };
}

function GeometryTuner({
  halfR,
  pinR, labelR,
  pinOX, pinOY,
  labelOX, labelOY,
  onChange,
}) {
  const row = (label, hint, value, min, max, step, onValue) => (
    <div className="flex items-center gap-3 py-1">
      <div className="w-[180px] shrink-0">
        <div className="text-[12px] font-medium" style={{ color: "#0f1f3d" }}>{label}</div>
        <div className="text-[10px]" style={{ color: "#9090a8" }}>{hint}</div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onValue(parseFloat(e.target.value))}
        className="flex-1 accent-[#c9a84c]"
      />
      <div className="w-[55px] text-right text-[12px] font-mono" style={{ color: "#0f1f3d" }}>
        {value}%
      </div>
    </div>
  );

  const sectionHeader = (text, color) => (
    <div
      className="text-[10px] uppercase tracking-[0.18em] font-semibold mt-2 mb-0.5"
      style={{ color }}
    >
      {text}
    </div>
  );

  return (
    <div
      className="mt-6 mx-auto max-w-[620px] rounded-lg border px-4 py-3"
      style={{ background: "#faf7f2", borderColor: "#e8e3d9" }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11px] uppercase tracking-[0.15em] font-medium" style={{ color: "#c9a84c" }}>
          Calibration géométrie · ronde
        </div>
        <div className="text-[10px]" style={{ color: "#9090a8" }}>
          bord de la table = <span className="font-mono">{halfR}%</span>
        </div>
      </div>

      {sectionHeader("Rayons (distance au centre)", "#3a3a52")}
      {row(
        "Rayon des PINS",
        `${halfR}% = pile sur le bord · +2 = dehors · −2 = dedans`,
        pinR, 0, 50, 0.5,
        (v) => onChange({ pinRadius: v })
      )}
      {row(
        "Rayon des LABELS",
        `normalement plus grand que le rayon pins`,
        labelR, 0, 50, 0.5,
        (v) => onChange({ labelRadius: v })
      )}

      {sectionHeader("Décalage des PINS uniquement", "#b28a2a")}
      {row(
        "Pins · horizontal",
        `négatif = gauche · positif = droite`,
        pinOX, -10, 10, 0.5,
        (v) => onChange({ pinOffsetX: v })
      )}
      {row(
        "Pins · vertical",
        `négatif = haut · positif = bas`,
        pinOY, -10, 10, 0.5,
        (v) => onChange({ pinOffsetY: v })
      )}

      {sectionHeader("Décalage des LABELS uniquement", "#5a7a99")}
      {row(
        "Labels · horizontal",
        `indépendant des pins`,
        labelOX, -10, 10, 0.5,
        (v) => onChange({ labelOffsetX: v })
      )}
      {row(
        "Labels · vertical",
        `indépendant des pins`,
        labelOY, -10, 10, 0.5,
        (v) => onChange({ labelOffsetY: v })
      )}

      <div className="mt-3 pt-2 border-t text-[10px]" style={{ borderColor: "#e8e3d9", color: "#9090a8" }}>
        URL figée :{" "}
        <span className="font-mono">
          ?pr={pinR}&amp;lr={labelR}&amp;pox={pinOX}&amp;poy={pinOY}&amp;lox={labelOX}&amp;loy={labelOY}
        </span>
      </div>
    </div>
  );
}

// Design tokens — "Elysée"
const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#faf7f2";
const CREAM2 = "#e8e3d9";
const INK = "#3a3a52";
const MUTED = "#9090a8";

const TINTS = {
  amber: "#f5ede0",
  blue: "#eff1f6",
  green: "#ecf1e5",
  purple: "#f0ebf5",
  red: "#f5e8e8",
  pink: "#f7e9ee",
  orange: "#f7ebe0",
  slate: "#eff0f2",
};

function getInitials(first, last) {
  const a = (first || "").trim().charAt(0);
  const b = (last || "").trim().charAt(0);
  return (a + b).toUpperCase() || "·";
}

// ─────────────────────────────────────────────────────────────────────────────
// Status pin — animated status dot at the seat position

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
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <motion.span
        aria-hidden
        className="absolute rounded-full"
        style={{ inset: -6, background: c.halo }}
        animate={{
          scale: [1, 1.55, 1],
          opacity: status === "empty" ? [0.35, 0.08, 0.35] : [0.7, 0.2, 0.7],
        }}
        transition={{ duration: cycle, repeat: Infinity, ease: "easeInOut" }}
      />
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
      {status === "me" && (
        <motion.span
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{ inset: -3, border: `1.5px solid ${GOLD}` }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.9, 0.2, 0.9] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
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
// Seat label — name + role (or empty / reserved state)

function SeatLabel({ seat, status, seatNumber, align = "center" }) {
  const alignClass =
    align === "left" ? "items-start text-left" :
    align === "right" ? "items-end text-right" :
    "items-center text-center";

  if (status === "empty") {
    return (
      <div className={`flex flex-col ${alignClass} leading-tight max-w-[110px]`}>
        <span className="text-[9px] uppercase tracking-[0.18em] font-medium" style={{ color: MUTED }}>
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
        <span className="text-[9px] uppercase tracking-[0.18em] font-medium" style={{ color: GOLD }}>
          Siège {seatNumber}
        </span>
        <span
          className="text-[11.5px] italic mt-0.5"
          style={{ color: GOLD, fontFamily: "'Playfair Display', serif", fontWeight: 500 }}
        >
          Réservé
        </span>
        {seat?.reserved_by && (
          <span className="text-[10px] mt-0.5" style={{ color: MUTED }}>{seat.reserved_by}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${alignClass} leading-tight`}>
      {status === "me" ? (
        <span className="text-[9px] uppercase tracking-[0.18em] font-medium" style={{ color: GOLD }}>
          Vous · {seatNumber}
        </span>
      ) : (
        <span className="text-[9px] uppercase tracking-[0.18em] font-medium" style={{ color: MUTED }}>
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
        <span className="text-[10px] mt-0.5 truncate max-w-[120px]" style={{ color: MUTED }}>
          {seat.job}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Seat unit — pin + label, both clickable, label registers a ref for popover
// anchoring.

const SeatUnit = forwardRef(function SeatUnit(
  { seat, seatNumber, isMe, isLiveNew, layout, onClick, onHover },
  ref
) {
  const isReserved = seat?.is_reserved;
  const isOccupied = !!seat?.first_name;
  const status = isMe ? "me" : isReserved ? "reserved" : isOccupied ? "occupied" : "empty";

  const ariaLabel = isOccupied
    ? `Siège ${seatNumber} · ${seat.first_name} ${seat.last_name}`
    : isReserved
    ? `Siège ${seatNumber} · réservé`
    : `Siège ${seatNumber} · libre`;

  const handleClick = () => onClick?.(seatNumber, seat);
  const handleHover = () => onHover?.(seatNumber, seat);

  const enterDelay = 0.2 + Math.min(seatNumber, 16) * 0.04;

  return (
    <>
      <motion.button
        onClick={handleClick}
        onMouseEnter={handleHover}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: enterDelay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        whileHover={isReserved ? {} : { scale: 1.18 }}
        whileTap={isReserved ? {} : { scale: 0.95 }}
        disabled={isReserved}
        aria-label={ariaLabel}
        className="absolute"
        style={{
          left: `${layout.pinPos.leftPct}%`,
          top: `${layout.pinPos.topPct}%`,
          transform: "translate(-50%, -50%)",
          background: "transparent",
          border: 0,
          padding: 0,
          cursor: isReserved ? "not-allowed" : "pointer",
        }}
      >
        <StatusPin status={status} isLiveNew={isLiveNew} />
      </motion.button>

      <motion.button
        ref={ref}
        onClick={handleClick}
        onMouseEnter={handleHover}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: enterDelay + 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        whileHover={isReserved ? {} : { y: -1 }}
        disabled={isReserved}
        aria-hidden
        tabIndex={-1}
        className="absolute px-2 py-1 transition-colors"
        style={{
          left: `${layout.labelPos.leftPct}%`,
          top: `${layout.labelPos.topPct}%`,
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
// Orientation icons — animated SVG

function StageIcon() {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
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
      <rect x="11.5" y="4" width="5" height="10" rx="2.5" />
      <path d="M8 12.5 a6 6 0 0 0 12 0" />
      <line x1="14" y1="18.5" x2="14" y2="22" />
      <line x1="10" y1="22" x2="18" y2="22" />
      <path d="M3 24.5 L25 24.5" strokeWidth="2.2" />
    </svg>
  );
}

function WindowIcon() {
  return (
    <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <rect x="4" y="3" width="20" height="22" rx="0.5" />
      <line x1="14" y1="3" x2="14" y2="25" strokeWidth="1.8" />
      <line x1="4" y1="14" x2="24" y2="14" strokeWidth="1.8" />
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
        cx="10" cy="8.5" r="1.2"
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
      <path d="M6 24 L6 5 Q6 3 8 3 L20 3 Q22 3 22 5 L22 24" strokeWidth="1.8" />
      <line x1="3" y1="24.5" x2="25" y2="24.5" strokeWidth="2.2" />
      <path d="M10 5 L10 24" strokeDasharray="1.5 2" opacity="0.55" />
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

const MARKER_PALETTE = {
  stage:  { bg: "#f5ecd1", border: "#e0d3a7", icon: "#b28a2a", halo: "rgba(201,168,76,0.35)" },
  window: { bg: "#e1eaf3", border: "#cbd5e0", icon: "#5a7a99", halo: "rgba(90,122,153,0.30)" },
  door:   { bg: "#e4eed7", border: "#c7d4b3", icon: "#5a7a3a", halo: "rgba(90,122,58,0.30)" },
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
        <motion.span
          aria-hidden
          className="absolute rounded-full"
          style={{ inset: -8, background: p.halo }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.05, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay }}
        />
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

export default function TableLayout({
  seats = [],
  onSeatClick,
  onSeatHover,
  activeSeatId,
  liveNewSeatNumber,
  tableNumber,
  isPresidential = false,
  shape = "round",
  color = "amber",
  rotation = 0,
  seatCount,
  seatRefs,
}) {
  const totalSeats = seatCount ?? (isPresidential ? 12 : 8);
  const defaultHalfR = isPresidential ? 31 : 28;
  const initialOverrides = useMemo(() => readInitialOverrides(defaultHalfR), [defaultHalfR]);
  const [tune, setTune] = useState(initialOverrides);
  const updateTune = (patch) => setTune((t) => ({ ...t, ...patch }));

  const layouts = computeSeatLayouts(totalSeats, shape, {
    isPresidential,
    rotationDeg: rotation,
    pinRadius: tune.pinRadius,
    labelRadius: tune.labelRadius,
    pinOffsetX: tune.pinOffsetX,
    pinOffsetY: tune.pinOffsetY,
    labelOffsetX: tune.labelOffsetX,
    labelOffsetY: tune.labelOffsetY,
  });
  const tint = TINTS[color] || TINTS.amber;
  const surface = tableSurfaceSize(shape, isPresidential);

  return (
    <div className="relative w-full max-w-[820px] mx-auto pb-4">
      {/* Padded wrapper so side markers can sit outside the seat canvas */}
      <div className="relative mx-auto" style={{ paddingLeft: 80, paddingRight: 80 }}>
        <div className="relative w-full aspect-square">
          {/* Warm ambient glow */}
          <div
            aria-hidden
            className="absolute inset-[22%] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(201,168,76,0.12), transparent 70%)",
            }}
          />

          {/* Table surface */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className={`flex flex-col items-center justify-center ${
                surface.rounded ? "rounded-full" : "rounded-[6px]"
              }`}
              style={{
                width: `${surface.w}%`,
                height: `${surface.h}%`,
                background: tint,
                border: `1px solid ${CREAM2}`,
                transform: `rotate(${rotation}deg)`,
                boxShadow:
                  "inset 0 0 0 1px rgba(15,31,61,0.04), 0 3px 18px rgba(15,31,61,0.06)",
              }}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="text-[10px] uppercase tracking-[0.22em] font-medium"
                style={{ color: GOLD, transform: `rotate(-${rotation}deg)` }}
              >
                Table
              </div>
              <div
                className="leading-none mt-1"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: isPresidential ? GOLD : NAVY,
                  fontWeight: 500,
                  fontSize: shape === "rectangle" ? 36 : 52,
                  transform: `rotate(-${rotation}deg)`,
                }}
              >
                {isPresidential ? "★" : tableNumber}
              </div>
            </motion.div>
          </div>

          {/* Seats */}
          {layouts.map((layout, idx) => {
            const seatNumber = idx + 1;
            const seatData = seats.find((s) => s.seat_number === seatNumber);
            const isMe = seatData?.id === activeSeatId;
            const isLive = liveNewSeatNumber === seatNumber;
            return (
              <SeatUnit
                key={seatNumber}
                ref={seatRefs ? (el) => { seatRefs.current[seatNumber] = el; } : undefined}
                seat={seatData}
                seatNumber={seatNumber}
                isMe={isMe}
                isLiveNew={isLive}
                layout={layout}
                onClick={onSeatClick}
                onHover={onSeatHover}
              />
            );
          })}
        </div>

        {/* Side markers — outside the canvas in the padding */}
        <div className="absolute z-10" style={{ right: "-72px", top: "50%", transform: "translateY(-50%)" }}>
          <OrientationMarker icon={<StageIcon />} label="Estrade" type="stage" delay={0.5} />
        </div>
        <div className="absolute z-10" style={{ left: "-72px", top: "50%", transform: "translateY(-50%)" }}>
          <OrientationMarker icon={<WindowIcon />} label="Fenêtre" type="window" delay={0.4} />
        </div>
      </div>

      {/* Entrée — in flow below the canvas */}
      <div className="flex justify-center mt-6">
        <OrientationMarker icon={<DoorIcon />} label="Entrée" type="door" delay={0.6} />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-2 mt-6 text-[10.5px]">
        <span className="inline-flex items-center gap-1.5" style={{ color: INK }}>
          <span className="w-2 h-2 rounded-full" style={{ background: "#7ba348" }} />
          Présent
        </span>
        <span className="inline-flex items-center gap-1.5" style={{ color: INK }}>
          <span className="w-2 h-2 rounded-full" style={{ background: GOLD, boxShadow: `0 0 0 2px ${CREAM}` }} />
          Vous
        </span>
        <span className="inline-flex items-center gap-1.5" style={{ color: INK }}>
          <span className="w-2 h-2 rounded-full bg-white" style={{ border: `1.5px dashed ${GOLD}` }} />
          Réservé
        </span>
        <span className="inline-flex items-center gap-1.5" style={{ color: MUTED }}>
          <span className="w-2 h-2 rounded-full" style={{ background: "#bdb7aa" }} />
          Libre
        </span>
      </div>

      <GeometryTuner
        halfR={defaultHalfR}
        pinR={tune.pinRadius}
        labelR={tune.labelRadius}
        pinOX={tune.pinOffsetX}
        pinOY={tune.pinOffsetY}
        labelOX={tune.labelOffsetX}
        labelOY={tune.labelOffsetY}
        onChange={updateTune}
      />
    </div>
  );
}

export { getInitials };
