import React from "react";
import { ChevronDown, ChevronUp, Check, Loader2 } from "lucide-react";
import CriterionRating from "./CriterionRating";
import { CRITERIA, SCORE_FIELDS, weightedScore, criteriaFilledCount, MAX_WEIGHTED } from "@/lib/rsa/constants";

export default function StartupScoreCard({
  startup,
  index,
  draft,
  submittedAt,
  expanded,
  disabled,
  submitting,
  onToggle,
  onChangeField,
  onChangeComment,
  onSubmit,
}) {
  const filled = criteriaFilledCount(draft);
  const total = CRITERIA.length;
  const weighted = weightedScore(draft);
  const isSubmitted = !!submittedAt;
  const canSubmit = filled === total && !disabled && !submitting;

  return (
    <div
      className={`rounded-xl border transition-shadow ${
        expanded ? "border-amber-300 shadow-sm bg-white" : "border-stone-200 bg-white/70 hover:bg-white"
      }`}
    >
      {/* Header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
            isSubmitted ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"
          }`}
        >
          {isSubmitted ? <Check className="w-4 h-4" /> : index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-stone-800 truncate">{startup}</div>
          <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-2">
            {isSubmitted ? (
              <span className="text-emerald-700">✓ Submitted · click to edit</span>
            ) : (
              <span>
                {filled}/{total} criteria rated
                {weighted != null && (
                  <span className="ml-2 text-amber-700 font-medium">
                    · {weighted.toFixed(2)}/{MAX_WEIGHTED.toFixed(0)}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-stone-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-stone-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-stone-100 p-4 space-y-3">
          {CRITERIA.map((c) => (
            <CriterionRating
              key={c.id}
              criterion={c}
              value={draft?.[c.id] ?? null}
              onChange={(v) => onChangeField(c.id, v)}
              disabled={disabled}
            />
          ))}

          <div>
            <label className="text-xs text-stone-500 mb-1 block">
              Comment <span className="text-stone-400">(optional · admin only)</span>
            </label>
            <textarea
              value={draft?.comment ?? ""}
              onChange={(e) => onChangeComment(e.target.value)}
              disabled={disabled}
              rows={2}
              placeholder="Free-form notes on this startup…"
              className="w-full text-sm rounded-md border border-stone-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 disabled:bg-stone-50 disabled:text-stone-400"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-xs text-stone-500">
              {filled < total ? (
                <span>{total - filled} criteria remaining</span>
              ) : (
                <span className="text-emerald-700">
                  Weighted total: <strong>{weighted.toFixed(2)}</strong>/{MAX_WEIGHTED.toFixed(0)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                canSubmit
                  ? "bg-amber-600 text-white hover:bg-amber-700 active:scale-95"
                  : "bg-stone-100 text-stone-400 cursor-not-allowed"
              }`}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitted ? "Update submission" : "Submit scores"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// small helper: which fields exist in the draft (used by parent to prune on upsert)
export const DRAFT_FIELDS = [...SCORE_FIELDS, "comment"];
