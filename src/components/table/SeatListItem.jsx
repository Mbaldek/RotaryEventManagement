import React, { useState } from "react";
import { UserCheck, ChevronDown, ChevronUp, Mail, Phone, Briefcase, Hash, MessageSquare } from "lucide-react";

export default function SeatListItem({ seatNumber, seatData, onClick, isActive, onModify }) {
  const [expanded, setExpanded] = useState(false);
  const isReserved = seatData?.is_reserved;
  const isOccupied = seatData?.first_name;

  return (
    <div
      className={`w-full rounded-lg border transition-all ${
        isActive
          ? "bg-amber-50 border-amber-300 shadow-sm"
          : isReserved
          ? "bg-blue-50 border-blue-200"
          : isOccupied
          ? "bg-white border-stone-200 hover:border-amber-300 hover:shadow-sm"
          : "bg-stone-50 border-stone-200 border-dashed hover:border-amber-300"
      }`}
    >
      <button
        onClick={() => {
          if (isOccupied) {
            setExpanded(!expanded);
          } else {
            onClick();
          }
        }}
        type="button"
        className="w-full text-left p-3"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              isActive
                ? "bg-amber-600 text-white"
                : isReserved
                ? "bg-blue-500 text-white"
                : isOccupied
                ? "bg-stone-800 text-white"
                : "bg-stone-200 text-stone-400"
            }`}
          >
            {isReserved ? (
              <span className="text-xs font-bold">R</span>
            ) : isOccupied ? (
              <UserCheck className="w-4 h-4" />
            ) : (
              <span className="text-xs font-semibold">{seatNumber}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {isReserved ? (
              <>
                <p className="text-sm font-medium text-blue-800">Réservé</p>
                <p className="text-xs text-blue-600 truncate">{seatData.reserved_by}</p>
              </>
            ) : isOccupied ? (
              <>
                <p className="text-sm font-medium text-stone-800 truncate">
                  {seatData.first_name} {seatData.last_name}
                </p>
                <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                  {seatData.job && <span className="truncate">{seatData.job}</span>}
                  {seatData.member_number && (
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
                      #{seatData.member_number}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-stone-400 italic">Siège {seatNumber} - Libre</p>
            )}
          </div>
          {isOccupied && (
            expanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />
          )}
        </div>
      </button>

      {isOccupied && expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-stone-100 pt-3">
          {seatData.email && (
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <Mail className="w-3.5 h-3.5 text-stone-400" />
              <span>{seatData.email}</span>
            </div>
          )}
          {seatData.phone && (
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <Phone className="w-3.5 h-3.5 text-stone-400" />
              <span>{seatData.phone}</span>
            </div>
          )}
          {seatData.job && (
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <Briefcase className="w-3.5 h-3.5 text-stone-400" />
              <span>{seatData.job}</span>
            </div>
          )}
          {seatData.member_number && (
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <Hash className="w-3.5 h-3.5 text-stone-400" />
              <span>Membre n°{seatData.member_number}</span>
            </div>
          )}
          {seatData.comment && (
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
              <span>{seatData.comment}</span>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onModify ? onModify() : onClick();
            }}
            type="button"
            className="w-full mt-2 text-xs bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg font-medium transition-colors"
          >
            Modifier ce siège
          </button>
        </div>
      )}
    </div>
  );
}