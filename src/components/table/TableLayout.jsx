import React from "react";
import { motion } from "framer-motion";

// Design tokens — "Elysée"
const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#faf7f2";
const CREAM2 = "#e8e3d9";
const MUTED = "#9090a8";

// Soft pastel tints — same map as TableCard
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

// Seat positions for 8-seat round table
const seatPositions8 = [
  { top: "5%", left: "50%", transform: "translateX(-50%)" },
  { top: "15%", right: "15%" },
  { top: "50%", right: "5%", transform: "translateY(-50%)" },
  { bottom: "15%", right: "15%" },
  { bottom: "5%", left: "50%", transform: "translateX(-50%)" },
  { bottom: "15%", left: "15%" },
  { top: "50%", left: "5%", transform: "translateY(-50%)" },
  { top: "15%", left: "15%" },
];

// Seat positions for 12-seat round table (presidential)
const seatPositions12 = [
  { top: "5%", left: "50%", transform: "translateX(-50%)" },
  { top: "10%", right: "25%", transform: "translateX(50%)" },
  { top: "20%", right: "10%", transform: "translateX(50%)" },
  { top: "40%", right: "3%", transform: "translateY(-50%)" },
  { bottom: "25%", right: "8%", transform: "translateY(50%)" },
  { bottom: "8%", right: "30%", transform: "translateX(50%)" },
  { bottom: "5%", left: "50%", transform: "translateX(-50%)" },
  { bottom: "8%", left: "30%", transform: "translateX(-50%)" },
  { bottom: "25%", left: "8%", transform: "translateY(50%)" },
  { top: "40%", left: "3%", transform: "translateY(-50%)" },
  { top: "20%", left: "10%", transform: "translateX(-50%)" },
  { top: "10%", left: "25%", transform: "translateX(-50%)" },
];

function getInitials(first, last) {
  const a = (first || "").trim().charAt(0);
  const b = (last || "").trim().charAt(0);
  return (a + b).toUpperCase() || "·";
}

function RoomMarker({ children, position, dashSide = "left" }) {
  const dash = (
    <span className="h-[1px] w-3" style={{ background: GOLD }} aria-hidden />
  );
  return (
    <div
      className="absolute z-10 inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em]"
      style={position}
    >
      {dashSide === "left" && dash}
      <span style={{ color: MUTED, fontWeight: 500 }}>{children}</span>
      {dashSide === "right" && dash}
    </div>
  );
}

export default function TableLayout({
  seats,
  onSeatClick,
  activeSeatId,
  tableNumber,
  isPresidential = false,
  shape = "round",
  color = "amber",
  rotation = 0,
}) {
  const maxSeats = isPresidential ? 12 : 8;
  const seatPositions = isPresidential ? seatPositions12 : seatPositions8;
  const getSeatData = (seatNum) => seats.find((s) => s.seat_number === seatNum);
  const tint = TINTS[color] || TINTS.amber;
  const isRound = shape === "round";

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative w-full pb-[100%]">
        {/* Ambient soft gold ring */}
        <div
          aria-hidden
          className="absolute inset-[3%] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(201,168,76,0.06), transparent 60%)",
          }}
        />

        {/* Table Surface */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className={`${
              isPresidential ? "w-[62%] h-[62%]" : "w-[56%] h-[56%]"
            } ${isRound ? "rounded-full" : "rounded-[4px]"} flex items-center justify-center`}
            style={{
              background: tint,
              border: `1px solid ${CREAM2}`,
              transform: `rotate(${rotation}deg)`,
              boxShadow: "inset 0 0 0 1px rgba(15,31,61,0.04)",
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="text-[56px] md:text-[72px] leading-none"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: isPresidential ? GOLD : NAVY,
                opacity: 0.22,
                fontWeight: 500,
                transform: `rotate(-${rotation}deg)`,
              }}
            >
              {isPresidential ? "★" : tableNumber}
            </div>
          </motion.div>
        </div>

        {/* Room markers — editorial, minimal */}
        <RoomMarker
          position={{ top: "50%", right: "-2%", transform: "translateY(-50%)" }}
          dashSide="left"
        >
          Estrade
        </RoomMarker>
        <RoomMarker
          position={{ top: "50%", left: "-2%", transform: "translateY(-50%)" }}
          dashSide="right"
        >
          Fenêtre
        </RoomMarker>
        <RoomMarker
          position={{ bottom: "-4%", left: "50%", transform: "translateX(-50%)" }}
          dashSide="left"
        >
          Entrée
        </RoomMarker>

        {/* Seats */}
        {Array.from({ length: maxSeats }, (_, i) => i + 1).map((seatNum) => {
          const seatData = getSeatData(seatNum);
          const isOccupied = !!seatData?.first_name;
          const isActive = seatData?.id === activeSeatId;
          const isReserved = seatData?.is_reserved;
          const position = seatPositions[seatNum - 1];
          const fullName = isOccupied
            ? `${seatData.first_name || ""} ${seatData.last_name || ""}`.trim()
            : null;

          // Visual style per state
          let bg, border, textColor, label;
          if (isActive) {
            bg = NAVY;
            border = `2px solid ${GOLD}`;
            textColor = "white";
            label = getInitials(seatData.first_name, seatData.last_name);
          } else if (isReserved) {
            bg = "white";
            border = `1.5px dashed ${GOLD}`;
            textColor = GOLD;
            label = "R";
          } else if (isOccupied) {
            bg = "white";
            border = `1.5px solid ${NAVY}`;
            textColor = NAVY;
            label = getInitials(seatData.first_name, seatData.last_name);
          } else {
            bg = CREAM;
            border = `1px dashed ${CREAM2}`;
            textColor = MUTED;
            label = seatNum;
          }

          return (
            <div
              key={seatNum}
              className="absolute group"
              style={position}
            >
              <motion.button
                onClick={() => onSeatClick(seatNum, seatData)}
                className="relative w-11 h-11 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: bg,
                  border,
                  color: textColor,
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: isReserved ? "not-allowed" : "pointer",
                  boxShadow: isActive
                    ? `0 0 0 4px rgba(201,168,76,0.2)`
                    : "none",
                }}
                whileHover={{ scale: isReserved ? 1 : 1.08 }}
                whileTap={{ scale: isReserved ? 1 : 0.94 }}
                disabled={isReserved}
                aria-label={
                  fullName
                    ? `Siège ${seatNum} · ${fullName}`
                    : isReserved
                    ? `Siège ${seatNum} réservé`
                    : `Siège ${seatNum} libre`
                }
              >
                {label}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                    style={{ background: GOLD }}
                  />
                )}
              </motion.button>

              {/* Hover tooltip — first + last name */}
              {fullName && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-2 pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 whitespace-nowrap z-20"
                  style={{
                    background: NAVY,
                    color: "white",
                    borderRadius: 3,
                    padding: "4px 9px",
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 500,
                    fontSize: 12,
                    boxShadow: "0 4px 12px rgba(15,31,61,0.18)",
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute left-1/2 -top-1 -translate-x-1/2 w-2 h-2 rotate-45"
                    style={{ background: NAVY }}
                  />
                  <span className="relative italic">{fullName}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
