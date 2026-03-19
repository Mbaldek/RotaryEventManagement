import React from "react";
import { motion } from "framer-motion";
import { User } from "lucide-react";

// Seat positions for 8-seat round table
const seatPositions8 = [
  { top: "5%", left: "50%", transform: "translateX(-50%)", label: "Haut" },
  { top: "15%", right: "15%", label: "Haut-droite" },
  { top: "50%", right: "5%", transform: "translateY(-50%)", label: "Droite" },
  { bottom: "15%", right: "15%", label: "Bas-droite" },
  { bottom: "5%", left: "50%", transform: "translateX(-50%)", label: "Bas" },
  { bottom: "15%", left: "15%", label: "Bas-gauche" },
  { top: "50%", left: "5%", transform: "translateY(-50%)", label: "Gauche" },
  { top: "15%", left: "15%", label: "Haut-gauche" },
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

const colorClasses = {
  amber: { bg: "from-amber-100 to-amber-50", border: "border-amber-200" },
  blue: { bg: "from-blue-100 to-blue-50", border: "border-blue-200" },
  green: { bg: "from-green-100 to-green-50", border: "border-green-200" },
  purple: { bg: "from-purple-100 to-purple-50", border: "border-purple-200" },
  red: { bg: "from-red-100 to-red-50", border: "border-red-200" },
  pink: { bg: "from-pink-100 to-pink-50", border: "border-pink-200" },
  orange: { bg: "from-orange-100 to-orange-50", border: "border-orange-200" },
  slate: { bg: "from-slate-100 to-slate-50", border: "border-slate-200" },
};

export default function TableLayout({ seats, onSeatClick, activeSeatId, tableNumber, isPresidential = false, shape = "round", color = "amber", rotation = 0 }) {
  const maxSeats = isPresidential ? 12 : 8;
  const seatPositions = isPresidential ? seatPositions12 : seatPositions8;
  
  const getSeatData = (seatNum) => seats.find((s) => s.seat_number === seatNum);

  const colors = colorClasses[color] || colorClasses.amber;
  const isRound = shape === "round";

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-3">
        <h2 className="text-lg font-semibold text-stone-800">
          {isPresidential ? "Table Présidentielle" : `Table ${tableNumber}`}
        </h2>
        <p className="text-xs text-stone-400">{maxSeats} sièges</p>
      </div>

      <div className="relative w-full pb-[100%]">
        {/* Table Surface */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className={`${isPresidential ? 'w-[65%] h-[65%]' : 'w-[60%] h-[60%]'} ${isRound ? 'rounded-full' : 'rounded-3xl'} bg-gradient-to-br ${colors.bg} border-4 ${colors.border} shadow-xl flex items-center justify-center transition-all`}
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <div className="text-center">
              <div className="text-4xl font-light text-stone-800/30">
                {isPresidential ? "★" : tableNumber}
              </div>
            </div>
          </div>
        </div>

        {/* Estrade - à droite du siège 3 */}
        <div className="absolute top-[50%] right-[-8%] transform translate-y-[-50%] bg-stone-700 text-white px-2 py-1 rounded text-[9px] font-medium shadow-md z-10">
          Estrade
        </div>

        {/* Fenêtre - à gauche du siège 7 */}
        <div className="absolute top-[50%] left-[-8%] transform translate-y-[-50%] bg-blue-100 text-blue-700 px-2 py-1 rounded text-[9px] font-medium border border-blue-300 z-10">
          Fenêtre
        </div>

        {/* Entrée - en bas du siège 5 */}
        <div className="absolute bottom-[-6%] left-[50%] transform translate-x-[-50%] bg-green-100 text-green-700 px-2 py-1 rounded text-[9px] font-medium border border-green-300 z-10">
          Entrée
        </div>

        {/* Seats around the table */}
        {Array.from({ length: maxSeats }, (_, i) => i + 1).map((seatNum) => {
          const seatData = getSeatData(seatNum);
          const isOccupied = seatData?.first_name;
          const isActive = seatData?.id === activeSeatId;
          const position = seatPositions[seatNum - 1];

          const isReserved = seatData?.is_reserved;

          return (
            <motion.button
              key={seatNum}
              onClick={() => onSeatClick(seatNum, seatData)}
              className={`absolute w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all ${
                isActive
                  ? "bg-amber-600 text-white shadow-lg ring-4 ring-amber-300"
                  : isReserved
                  ? "bg-blue-100 border-2 border-blue-300 text-blue-700 cursor-not-allowed"
                  : isOccupied
                  ? "bg-white border-2 border-stone-300 text-stone-700 hover:border-amber-400 hover:shadow-md"
                  : "bg-stone-100 border-2 border-dashed border-stone-300 text-stone-400 hover:border-amber-400 hover:bg-amber-50"
              }`}
              style={position}
              whileHover={{ scale: isReserved ? 1 : 1.1 }}
              whileTap={{ scale: isReserved ? 1 : 0.95 }}
              disabled={isReserved}
            >
              {isReserved ? (
                <>
                  <div className="text-[10px] font-bold">R</div>
                  <div className="text-[8px] leading-tight">Réservé</div>
                </>
              ) : isOccupied ? (
                <>
                  <User className="w-4 h-4" />
                  <div className="text-[8px] leading-tight text-center px-1 truncate w-full">
                    Siège {seatNum}
                  </div>
                </>
              ) : (
                <>
                  <User className="w-4 h-4" />
                  <span className="text-[9px] font-medium">{seatNum}</span>
                </>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}