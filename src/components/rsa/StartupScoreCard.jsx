import React from "react";
import { ChevronDown, ChevronUp, Check, Loader2, Trophy } from "lucide-react";
import CriterionRating from "./CriterionRating";
import { CRITERIA, SCORE_FIELDS, weightedScore, criteriaFilledCount, MAX_WEIGHTED, SESSION_BY_ID, getSessionLabel } from "@/lib/rsa/constants";

const T = {
  fr: {
    submittedTag: "✓ Envoyé · cliquez pour modifier",
    criteriaRated: "critères notés",
    commentLabel: "Commentaire",
    commentOptional: "(optionnel · admin uniquement)",
    commentPlaceholder: "Notes libres sur cette startup…",
    criteriaRemaining: "critères restants",
    weightedTotal: "Total pondéré :",
    update: "Modifier l'envoi",
    submit: "Envoyer les notes",
  },
  en: {
    submittedTag: "✓ Submitted · click to edit",
    criteriaRated: "criteria rated",
    commentLabel: "Comment",
    commentOptional: "(optional · admin only)",
    commentPlaceholder: "Free-form notes on this startup…",
    criteriaRemaining: "criteria remaining",
    weightedTotal: "Weighted total:",
    update: "Update submission",
    submit: "Submit scores",
  },
  de: {
    submittedTag: "✓ Eingereicht · zum Bearbeiten klicken",
    criteriaRated: "Kriterien bewertet",
    commentLabel: "Kommentar",
    commentOptional: "(optional · nur Admin)",
    commentPlaceholder: "Freie Notizen zu diesem Startup…",
    criteriaRemaining: "Kriterien verbleibend",
    weightedTotal: "Gewichtete Gesamtpunktzahl:",
    update: "Einreichung aktualisieren",
    submit: "Bewertungen einreichen",
  },
};

export default function StartupScoreCard({
  startup,
  index,
  draft,
  submittedAt,
  expanded,
  disabled,
  submitting,
  lang = "fr",
  sourceSessionId,
  onToggle,
  onChangeField,
  onChangeComment,
  onSubmit,
}) {
  const t = T[lang] || T.fr;
  const filled = criteriaFilledCount(draft);
  const total = CRITERIA.length;
  const weighted = weightedScore(draft);
  const isSubmitted = !!submittedAt;
  const canSubmit = filled === total && !disabled && !submitting;

  // For grande finale cards, show which qualifying session this finalist won.
  const sourceSession = sourceSessionId ? SESSION_BY_ID[sourceSessionId] : null;
  const winnerBadge = sourceSession
    ? `${lang === "en" ? "Winner of" : lang === "de" ? "Sieger von" : "Vainqueur de"} ${getSessionLabel(sourceSession, lang)}`
    : null;

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
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-semibold text-stone-800 truncate">{startup}</div>
            {winnerBadge && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={{
                  background: sourceSession.light,
                  color: sourceSession.color,
                  border: `1px solid ${sourceSession.border}`,
                }}
                title={winnerBadge}
              >
                <Trophy className="w-3 h-3" />
                {sourceSession.emoji}
              </span>
            )}
          </div>
          <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-2">
            {isSubmitted ? (
              <span className="text-emerald-700">{t.submittedTag}</span>
            ) : (
              <span>
                {filled}/{total} {t.criteriaRated}
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
              lang={lang}
            />
          ))}

          <div>
            <label className="text-xs text-stone-500 mb-1 block">
              {t.commentLabel} <span className="text-stone-400">{t.commentOptional}</span>
            </label>
            <textarea
              value={draft?.comment ?? ""}
              onChange={(e) => onChangeComment(e.target.value)}
              disabled={disabled}
              rows={3}
              placeholder={t.commentPlaceholder}
              className="w-full text-base sm:text-sm rounded-md border border-stone-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 disabled:bg-stone-50 disabled:text-stone-400"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
            <div className="text-xs text-stone-500">
              {filled < total ? (
                <span>
                  {total - filled} {t.criteriaRemaining}
                </span>
              ) : (
                <span className="text-emerald-700">
                  {t.weightedTotal} <strong>{weighted.toFixed(2)}</strong>/{MAX_WEIGHTED.toFixed(0)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              className={`w-full sm:w-auto px-4 py-3 sm:py-2 rounded-md text-base sm:text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                canSubmit
                  ? "bg-amber-600 text-white hover:bg-amber-700 active:scale-95"
                  : "bg-stone-100 text-stone-400 cursor-not-allowed"
              }`}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitted ? t.update : t.submit}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// small helper: which fields exist in the draft (used by parent to prune on upsert)
export const DRAFT_FIELDS = [...SCORE_FIELDS, "comment"];
