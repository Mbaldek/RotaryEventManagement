import React from "react";
import { CRITERIA, MAX_WEIGHTED, weightedScore, criteriaFilledCount } from "@/lib/rsa/constants";

export default function ScoreCell({ scoreRow, onClick }) {
  if (!scoreRow) {
    return (
      <div className="w-16 h-10 flex items-center justify-center text-stone-300 text-xs">
        —
      </div>
    );
  }
  const filled = criteriaFilledCount(scoreRow);
  const w = weightedScore(scoreRow);
  const complete = filled === CRITERIA.length;

  if (!complete) {
    // Partial: progress indicator
    const pct = (filled / CRITERIA.length) * 100;
    return (
      <button
        onClick={onClick}
        className="w-16 h-10 flex flex-col items-center justify-center gap-0.5 hover:bg-stone-50 rounded"
        title={`${filled}/${CRITERIA.length} criteria entered`}
      >
        <span className="text-[10px] text-stone-400">{filled}/{CRITERIA.length}</span>
        <div className="w-10 h-1 bg-stone-200 rounded-full overflow-hidden">
          <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
        </div>
      </button>
    );
  }

  // Complete: show weighted score
  const hue = w >= 4 ? "emerald" : w >= 3 ? "amber" : w >= 2 ? "orange" : "rose";
  const bg = {
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    orange: "bg-orange-50 text-orange-800 border-orange-200",
    rose: "bg-rose-50 text-rose-800 border-rose-200",
  }[hue];
  return (
    <button
      onClick={onClick}
      className={`w-16 h-10 rounded font-semibold text-sm border ${bg} hover:brightness-95`}
      title={`${w.toFixed(2)} / ${MAX_WEIGHTED.toFixed(0)} — click for details`}
    >
      {w.toFixed(1)}
    </button>
  );
}
