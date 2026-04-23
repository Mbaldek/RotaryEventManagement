import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Palette, ArrowUpRight } from "lucide-react";
import { createPageUrl } from "@/utils";

// Design tokens — "Elysée" (see docs/design-system.md)
const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const BORDER = "#e8e3d9";        // warm beige border — Elysée
const BORDER_SOFT = "#f0ece4";    // softer divider
const INK = "#3a3a52";
const MUTED = "#9090a8";

// Soft pastel tints
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

// ─────────────────────────────────────────────────────────────────────────────
// SVG visual: table + seats around the perimeter, animated fill-in

function TableVisual({ table, totalSeats, occupiedCount, reservedCount, tint }) {
  const size = 116;
  const cx = size / 2;
  const cy = size / 2;
  const shape = table.shape || "round";
  const isRound = shape === "round";
  const isRectangle = shape === "rectangle";
  const isPresidential = table.is_presidential;

  // Seat placement
  const seats = [];
  if (isRound) {
    const r = 44;
    for (let i = 0; i < totalSeats; i++) {
      const angle = -Math.PI / 2 + (i / totalSeats) * 2 * Math.PI;
      seats.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
  } else {
    const halfW = isRectangle ? 30 : 22;
    const halfH = isRectangle ? 15 : 22;
    const off = 10;
    let longTotal = Math.round((totalSeats * 2 * halfW) / (2 * halfW + 2 * halfH));
    if (longTotal % 2 !== 0) {
      longTotal = longTotal + 1 <= totalSeats ? longTotal + 1 : Math.max(0, longTotal - 1);
    }
    longTotal = Math.min(totalSeats, Math.max(0, longTotal));
    const topCount = longTotal / 2;
    const bottomCount = longTotal / 2;
    const shortTotal = totalSeats - longTotal;
    const rightCount = Math.ceil(shortTotal / 2);
    const leftCount = shortTotal - rightCount;

    const left = cx - halfW;
    const right = cx + halfW;
    const top = cy - halfH;
    const bottom = cy + halfH;

    for (let i = 0; i < topCount; i++) {
      const t = (i + 0.5) / topCount;
      seats.push({ x: left + 2 * halfW * t, y: top - off });
    }
    for (let i = 0; i < rightCount; i++) {
      const t = (i + 0.5) / rightCount;
      seats.push({ x: right + off, y: top + 2 * halfH * t });
    }
    for (let i = 0; i < bottomCount; i++) {
      const t = (i + 0.5) / bottomCount;
      seats.push({ x: right - 2 * halfW * t, y: bottom + off });
    }
    for (let i = 0; i < leftCount; i++) {
      const t = (i + 0.5) / leftCount;
      seats.push({ x: left - off, y: bottom - 2 * halfH * t });
    }
  }

  const stateFor = (i) =>
    i < occupiedCount ? "occupied" : i < occupiedCount + reservedCount ? "reserved" : "free";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block"
    >
      {/* soft ring glow behind seats (appears on reveal) */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={isRound ? 50 : 40}
        fill="none"
        stroke={GOLD}
        strokeOpacity={0.15}
        strokeWidth={1}
        strokeDasharray="1 3"
        initial={{ opacity: 0, rotate: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.15, duration: 0.8 }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />

      {/* Table body */}
      {isRound ? (
        <motion.circle
          cx={cx}
          cy={cy}
          r={26}
          fill={tint}
          stroke={NAVY}
          strokeOpacity={0.12}
          strokeWidth={1}
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
      ) : (
        <motion.rect
          x={cx - (isRectangle ? 30 : 22)}
          y={cy - (isRectangle ? 15 : 22)}
          width={isRectangle ? 60 : 44}
          height={isRectangle ? 30 : 44}
          rx={3}
          fill={tint}
          stroke={NAVY}
          strokeOpacity={0.12}
          strokeWidth={1}
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
      )}

      {/* Table center mark */}
      <motion.text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Playfair Display', serif"
        fontWeight="500"
        fontSize={isPresidential ? 22 : 16}
        fill={isPresidential ? GOLD : NAVY}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.35, duration: 0.4 }}
      >
        {isPresidential ? "★" : table.table_number}
      </motion.text>

      {/* Seats */}
      {seats.map((s, i) => {
        const state = stateFor(i);
        const fill = state === "occupied" ? NAVY : state === "reserved" ? GOLD : "white";
        const stroke = state === "free" ? "rgba(15,31,61,0.18)" : fill;
        return (
          <motion.circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={4.5}
            fill={fill}
            stroke={stroke}
            strokeWidth={1.25}
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{
              delay: 0.4 + i * 0.035,
              duration: 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{ transformOrigin: `${s.x}px ${s.y}px` }}
          />
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function TableCard({
  table,
  occupiedCount,
  reservedCount = 0,
  totalSeats,
  onCustomize,
}) {
  const navigate = useNavigate();
  const totalTaken = occupiedCount + reservedCount;
  const freeCount = Math.max(0, totalSeats - totalTaken);
  const tint = TINTS[table.color || "amber"];
  const shape = table.shape || "round";
  const shapeLabel =
    shape === "round" ? "Ronde" : shape === "rectangle" ? "Rectangulaire" : "Carrée";

  const occupiedPct = (occupiedCount / totalSeats) * 100;
  const reservedPct = (reservedCount / totalSeats) * 100;

  const name = table.is_presidential
    ? "Présidentielle"
    : `Table ${table.table_number}`;
  const typeLabel = `${shapeLabel} · ${totalSeats} sièges`;

  return (
    <div
      className="group relative h-full flex flex-col transition-all duration-300 hover:-translate-y-[2px]"
      style={{
        background: "white",
        border: `1px solid ${BORDER}`,
        borderRadius: 4,
      }}
    >
      {/* Hover gold left accent */}
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[2px] origin-top scale-y-0 group-hover:scale-y-100 transition-transform duration-500 ease-out"
        style={{ background: GOLD }}
      />

      <div className="p-4 md:p-5 flex-1 flex flex-col">
        {/* Header — eyebrow only, no percentage */}
        <div className="mb-3">
          <span
            className="text-[10px] uppercase tracking-[0.15em] font-medium"
            style={{ color: GOLD }}
          >
            {table.is_presidential ? "★ Présidentielle" : `N° ${table.table_number}`}
          </span>
        </div>

        {/* Visual */}
        <div className="flex items-center justify-center mb-4">
          <div className="transition-transform duration-500 group-hover:scale-[1.04]">
            <TableVisual
              table={table}
              totalSeats={totalSeats}
              occupiedCount={occupiedCount}
              reservedCount={reservedCount}
              tint={tint}
            />
          </div>
        </div>

        {/* Name */}
        <div className="text-center mb-4">
          <h3
            className="text-[17px] md:text-[19px] leading-tight"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: NAVY,
              fontWeight: 500,
            }}
          >
            {name}
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>
            {typeLabel}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div
            className="relative w-full h-[2px] overflow-hidden flex"
            style={{ background: BORDER_SOFT }}
          >
            <motion.div
              className="h-full"
              style={{ background: NAVY }}
              initial={{ width: 0 }}
              whileInView={{ width: `${occupiedPct}%` }}
              viewport={{ once: true }}
              transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.div
              className="h-full"
              style={{ background: GOLD }}
              initial={{ width: 0 }}
              whileInView={{ width: `${reservedPct}%` }}
              viewport={{ once: true }}
              transition={{ delay: 0.55, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div
            className="flex items-center justify-between mt-2 text-[10.5px] tabular-nums"
            style={{ color: INK }}
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: NAVY }} />
              {occupiedCount}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
              {reservedCount}
            </span>
            <span className="inline-flex items-center gap-1.5" style={{ color: MUTED }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full border" style={{ borderColor: "rgba(15,31,61,0.18)" }} />
              {freeCount}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-between mt-auto pt-3"
          style={{ borderTop: `1px solid ${BORDER_SOFT}` }}
        >
          <button
            onClick={() => navigate(createPageUrl("TableView") + `?id=${table.id}`)}
            className="group/btn inline-flex items-center gap-1.5 text-[13px] transition-colors"
            style={{
              color: NAVY,
              fontFamily: "'Playfair Display', serif",
              fontWeight: 500,
            }}
          >
            <span className="italic">Voir la table</span>
            <ArrowUpRight
              className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-[2px] group-hover/btn:-translate-y-[2px]"
              style={{ color: GOLD }}
            />
          </button>
          <button
            onClick={() => onCustomize(table)}
            aria-label="Personnaliser la table"
            className="inline-flex items-center justify-center w-7 h-7 transition-all duration-200 hover:rotate-[8deg]"
            style={{
              color: MUTED,
              border: `1px solid ${BORDER}`,
              borderRadius: 4,
            }}
          >
            <Palette className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
