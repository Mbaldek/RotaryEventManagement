import React, { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

export default function CriterionRating({ criterion, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const weightPct = Math.round(criterion.weight * 100);

  return (
    <div className="border border-stone-200 rounded-lg bg-white">
      <div className="flex items-start justify-between gap-3 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-stone-800 text-sm">{criterion.label}</span>
            <span className="text-[10px] uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              {weightPct}%
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5 leading-snug">{criterion.desc}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-stone-400 hover:text-stone-700 transition-colors p-1"
          aria-label="Show rating anchors"
        >
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* 0-5 segmented buttons — larger touch target on mobile */}
      <div className="flex gap-1 px-3 pb-3">
        {[0, 1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => onChange(n)}
              className={`flex-1 min-w-0 h-11 sm:h-10 rounded-md text-base sm:text-sm font-semibold transition-all ${
                selected
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"}`}
            >
              {n}
            </button>
          );
        })}
      </div>

      {open && (
        <div className="border-t border-stone-100 bg-stone-50 px-3 py-2 rounded-b-lg">
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mb-1.5">
            <Info className="w-3 h-3" /> Score anchors
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <React.Fragment key={n}>
                <dt
                  className={`text-xs font-semibold ${
                    value === n ? "text-amber-700" : "text-stone-400"
                  }`}
                >
                  {n}
                </dt>
                <dd
                  className={`text-xs leading-snug ${
                    value === n ? "text-stone-800" : "text-stone-500"
                  }`}
                >
                  {criterion.anchors[n]}
                </dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
