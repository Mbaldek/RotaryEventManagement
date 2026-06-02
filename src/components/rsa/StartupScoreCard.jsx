import React from "react";
import { ChevronDown, ChevronUp, Check, Loader2, Trophy } from "lucide-react";
import CriterionRating from "./CriterionRating";
import { CRITERIA, SCORE_FIELDS, weightedScore, criteriaFilledCount, MAX_WEIGHTED, SESSION_BY_ID, getSessionLabel } from "@/lib/rsa/constants";
import { NAVY, CREAM2, INK, MUTED, TINT_SAGE } from "@/components/design/tokens";
import { SUCCESS, GOLD_TEXT } from "@/components/design/tokens.app";

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
    <div style={{ borderBottom: `1px solid ${CREAM2}` }}>
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] hover:bg-[#faf7f0] transition-colors"
      >
        {/* Status indicator: index number or checkmark */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
          style={
            isSubmitted
              ? { background: TINT_SAGE, color: SUCCESS }
              : { background: CREAM2, color: MUTED }
          }
        >
          {isSubmitted ? <Check className="w-4 h-4" /> : index + 1}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold truncate" style={{ color: NAVY }}>{startup}</span>
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
          <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: MUTED }}>
            {isSubmitted ? (
              <span style={{ color: SUCCESS }}>{t.submittedTag}</span>
            ) : (
              <span>
                {filled}/{total} {t.criteriaRated}
                {weighted != null && (
                  <span className="ml-2 font-medium" style={{ color: GOLD_TEXT }}>
                    · {weighted.toFixed(2)}/{MAX_WEIGHTED.toFixed(0)}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        {expanded ? (
          <ChevronUp className="w-4 h-4 shrink-0" style={{ color: MUTED }} />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0" style={{ color: MUTED }} />
        )}
      </button>

      {/* Expanded detail — no card wrapper, just content below a hairline */}
      {expanded && (
        <div
          className="pb-5 space-y-3"
          style={{ borderTop: `1px solid ${CREAM2}`, paddingTop: 16 }}
        >
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
            <label className="text-xs mb-1 block" style={{ color: MUTED }}>
              {t.commentLabel}{" "}
              <span style={{ color: MUTED, opacity: 0.7 }}>{t.commentOptional}</span>
            </label>
            <textarea
              value={draft?.comment ?? ""}
              onChange={(e) => onChangeComment(e.target.value)}
              disabled={disabled}
              rows={3}
              placeholder={t.commentPlaceholder}
              className="w-full text-base sm:text-sm rounded-[4px] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50"
              style={{
                border: `1px solid ${CREAM2}`,
                color: INK,
                background: "transparent",
              }}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
            <div className="text-xs" style={{ color: MUTED }}>
              {filled < total ? (
                <span>
                  {total - filled} {t.criteriaRemaining}
                </span>
              ) : (
                <span style={{ color: SUCCESS }}>
                  {t.weightedTotal} <strong>{weighted.toFixed(2)}</strong>/{MAX_WEIGHTED.toFixed(0)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-[4px] text-base sm:text-sm font-medium transition-all flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              style={
                canSubmit
                  ? { background: NAVY, color: "white", border: `1px solid ${NAVY}` }
                  : { background: CREAM2, color: MUTED, border: `1px solid ${CREAM2}` }
              }
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
