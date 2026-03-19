import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, Circle, CheckCircle2, Palette, BookmarkCheck } from "lucide-react";
import { createPageUrl } from "@/utils";

const colorClasses = {
  amber: "bg-gradient-to-br from-amber-100 to-amber-50 border-amber-200",
  blue: "bg-gradient-to-br from-blue-100 to-blue-50 border-blue-200",
  green: "bg-gradient-to-br from-green-100 to-green-50 border-green-200",
  purple: "bg-gradient-to-br from-purple-100 to-purple-50 border-purple-200",
  red: "bg-gradient-to-br from-red-100 to-red-50 border-red-200",
  pink: "bg-gradient-to-br from-pink-100 to-pink-50 border-pink-200",
  orange: "bg-gradient-to-br from-orange-100 to-orange-50 border-orange-200",
  slate: "bg-gradient-to-br from-slate-100 to-slate-50 border-slate-200",
};

export default function TableCard({ table, occupiedCount, reservedCount = 0, totalSeats, onCustomize }) {
  const navigate = useNavigate();
  const totalTaken = occupiedCount + reservedCount;
  const occupancyRate = Math.round((totalTaken / totalSeats) * 100);
  const colorClass = colorClasses[table.color || "amber"];
  const isRound = (table.shape || "round") === "round";

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-lg transition-all group">
      {/* Visual Preview */}
      <div className="flex items-center justify-center mb-4">
        <div
          className={`w-24 h-24 ${isRound ? "rounded-full" : "rounded-2xl"} ${colorClass} border-4 shadow-md flex items-center justify-center transition-transform group-hover:scale-105`}
          style={{ transform: `rotate(${table.rotation || 0}deg)` }}
        >
          <span className="text-2xl font-light text-stone-600">
            {table.is_presidential ? "★" : table.table_number}
          </span>
        </div>
      </div>

      {/* Table Info */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-stone-800">
          {table.is_presidential ? "Table Présidentielle" : `Table ${table.table_number}`}
        </h3>
        <p className="text-xs text-stone-400 mt-1">
          {isRound ? "Ronde" : "Carrée"} · {totalSeats} sièges
        </p>
      </div>

      {/* Occupancy Stats */}
      <div className="bg-stone-50 rounded-xl p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm text-stone-600">Occupés</span>
          </div>
          <span className="text-sm font-semibold text-stone-800">{occupiedCount}</span>
        </div>
        {reservedCount > 0 && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-stone-600">Réservés</span>
            </div>
            <span className="text-sm font-semibold text-stone-800">{reservedCount}</span>
          </div>
        )}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Circle className="w-4 h-4 text-stone-400" />
            <span className="text-sm text-stone-600">Libres</span>
          </div>
          <span className="text-sm font-semibold text-stone-800">{totalSeats - totalTaken}</span>
        </div>
        {/* Progress Bar */}
        <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
            style={{ width: `${(occupiedCount / totalSeats) * 100}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
            style={{ width: `${(reservedCount / totalSeats) * 100}%` }}
          />
        </div>
        <p className="text-xs text-stone-500 text-center mt-2">{occupancyRate}% occupé</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => navigate(createPageUrl("TableView") + `?id=${table.id}`)}
          className="flex-1 bg-stone-800 hover:bg-stone-900 text-white text-sm py-2 rounded-lg transition-colors"
        >
          Voir
        </button>
        <button
          onClick={() => onCustomize(table)}
          className="flex items-center justify-center w-10 h-10 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
        >
          <Palette className="w-4 h-4 text-stone-600" />
        </button>
      </div>
    </div>
  );
}