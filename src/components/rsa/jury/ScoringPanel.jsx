// ScoringPanel — Module 3 (« Espace Jury »).
//
// Port restylé Élysée du legacy StartupScoreCard.jsx (2026). Wired sur les hooks
// useSaveJuryDraft / useSubmitJuryScore + la résolution état (draft / score final).
//
// Modèle :
//   - draft local (state) initialisé depuis le serveur (myScore final s'il existe,
//     sinon myDraft s'il existe). Tout changement appelle un autosave débouncé.
//   - Submit : valide les 6 critères 0..5 -> RPC -> reset draft (wipe serveur via le RPC).
//   - Read-only : si la session est locked/published OU si on est admin sur un score
//     d'un autre juré, on affiche les valeurs sans interaction.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Check, Loader2 } from 'lucide-react';
import {
  NAVY,
  INK,
  GOLD,
  CREAM2,
  MUTED,
  SERIF,
  GREEN_TODAY,
  TINT_SAGE,
} from '@/components/design/tokens';
import {
  CRITERIA,
  SCORE_FIELDS,
  MAX_WEIGHTED,
  weightedScore,
  criteriaFilledCount,
} from '@/lib/rsa/constants';
import { useLang } from '@/lib/platform/i18n';
import CriterionRating from './CriterionRating';
import DocumentLinks from './DocumentLinks';
import { SCORE_PROGRESS, UI } from './i18n';

const DRAFT_FIELDS = [...SCORE_FIELDS, 'comment'];

function pickDraftShape(source) {
  if (!source) return {};
  const out = {};
  for (const k of DRAFT_FIELDS) {
    if (source[k] != null) out[k] = source[k];
  }
  return out;
}

// Petit débounceur ad-hoc — on évite d'ajouter une dep externe juste pour ça.
function useDebouncedCallback(fn, delay) {
  const ref = useRef(fn);
  const timer = useRef(null);
  useEffect(() => { ref.current = fn; }, [fn]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (...args) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => ref.current(...args), delay);
  };
}

export default function ScoringPanel({
  startup,
  index,
  expanded,
  onToggle,
  // Server state
  draft,            // platform_jury_score_drafts row or null
  myScore,          // platform_jury_scores row or null (final)
  // Mutations
  onSaveDraft,      // ({ patch }) => Promise / void
  onSubmit,         // ({ scores, comment }) => Promise
  savingDraft,
  submitting,
  // Lifecycle
  readOnly,         // session locked|published OR admin reviewing someone else's score
  // Optional error to surface
  submitError,
}) {
  const { t } = useLang();
  const isSubmitted = !!myScore;

  // Source de vérité pour le pré-remplissage : myScore (final) -> draft -> empty.
  const initial = useMemo(
    () => ({ ...pickDraftShape(draft), ...pickDraftShape(myScore) }),
    // Re-init quand le startup change OU quand on a une nouvelle soumission OU un draft serveur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startup?.id, myScore?.updated_at, draft?.updated_at],
  );

  const [local, setLocal] = useState(initial);

  // Re-sync si initial change (re-fetch côté serveur, ex. après submit).
  useEffect(() => {
    setLocal(initial);
  }, [initial]);

  const filled = criteriaFilledCount(local);
  const total = CRITERIA.length;
  const weighted = weightedScore(local);
  const canSubmit = filled === total && !readOnly && !submitting;

  // Autosave débouncé (~600 ms) sur les changements de scores/comment.
  const debouncedSave = useDebouncedCallback((patch) => {
    if (readOnly) return;
    onSaveDraft?.({ patch });
  }, 600);

  const handleField = (key, value) => {
    if (readOnly) return;
    setLocal((prev) => {
      const next = { ...prev, [key]: value };
      debouncedSave({ [key]: value });
      return next;
    });
  };

  const handleComment = (value) => {
    if (readOnly) return;
    setLocal((prev) => {
      const next = { ...prev, comment: value };
      debouncedSave({ comment: value });
      return next;
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const scores = SCORE_FIELDS.reduce((acc, f) => {
      acc[f] = local[f];
      return acc;
    }, {});
    onSubmit?.({ scores, comment: local.comment ?? null });
  };

  // Header (always visible).
  return (
    <div
      className="rounded-[4px]"
      style={{
        background: expanded ? 'white' : 'white',
        border: `1px solid ${expanded ? GOLD : CREAM2}`,
        boxShadow: expanded ? '0 1px 0 rgba(15,31,61,0.04)' : 'none',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
        aria-expanded={expanded}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0"
          style={{
            background: isSubmitted ? TINT_SAGE : '#fbf9f5',
            color: isSubmitted ? GREEN_TODAY : INK,
            border: `1px solid ${isSubmitted ? GREEN_TODAY : CREAM2}`,
          }}
        >
          {isSubmitted ? <Check className="w-4 h-4" aria-hidden /> : (index ?? 0) + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[15px] truncate"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {startup?.name || '—'}
          </div>
          <div className="text-[12px] mt-0.5 flex items-center gap-2" style={{ color: MUTED }}>
            {isSubmitted && (
              <span style={{ color: GREEN_TODAY }}>{t(SCORE_PROGRESS.submitted)}</span>
            )}
            {!isSubmitted && filled === 0 && (
              <span>{t(SCORE_PROGRESS.toRate)}</span>
            )}
            {!isSubmitted && filled > 0 && (
              <span className="tabular-nums">
                {t(SCORE_PROGRESS.partial(filled))}
                {weighted != null && (
                  <span className="ml-2" style={{ color: GOLD }}>
                    · {weighted.toFixed(2)}/{MAX_WEIGHTED.toFixed(0)}
                  </span>
                )}
              </span>
            )}
            {isSubmitted && weighted != null && (
              <span className="tabular-nums">
                · {weighted.toFixed(2)}/{MAX_WEIGHTED.toFixed(0)}
              </span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4" style={{ color: MUTED }} aria-hidden />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: MUTED }} aria-hidden />
        )}
      </button>

      {expanded && (
        <div
          className="p-4 flex flex-col gap-3"
          style={{ borderTop: `1px solid ${CREAM2}` }}
        >
          {/* Documents du dossier — signed URLs (5 min TTL) */}
          <DocumentLinks startup={startup} compact />

          {/* 6 critères */}
          {CRITERIA.map((c) => (
            <CriterionRating
              key={c.id}
              criterion={c}
              value={local?.[c.id] ?? null}
              onChange={(v) => handleField(c.id, v)}
              disabled={readOnly}
            />
          ))}

          {/* Commentaire (optionnel, staff-only) */}
          <div>
            <label
              className="text-[11px] uppercase tracking-[0.1em] mb-1 block"
              style={{ color: MUTED }}
            >
              {t(UI.commentLabel)} <span style={{ color: MUTED }}>{t(UI.commentOptional)}</span>
            </label>
            <textarea
              value={local?.comment ?? ''}
              onChange={(e) => handleComment(e.target.value)}
              disabled={readOnly}
              rows={3}
              placeholder={t(UI.commentPlaceholder)}
              maxLength={2000}
              className="w-full text-[14px] rounded-[4px] px-3 py-2 outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#c9a84c]"
              style={{
                background: readOnly ? '#fbf9f5' : 'white',
                color: NAVY,
                border: `1px solid ${CREAM2}`,
              }}
            />
          </div>

          {/* Footer : remaining/total + submit */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
            <div className="text-[12px]" style={{ color: MUTED }}>
              {!readOnly && filled < total && (
                <span>{t(UI.remaining(total - filled))}</span>
              )}
              {!readOnly && filled === total && weighted != null && (
                <span style={{ color: GREEN_TODAY }}>
                  {t(UI.weightedTotal)}{' '}
                  <strong className="tabular-nums">{weighted.toFixed(2)}</strong>/{MAX_WEIGHTED.toFixed(0)}
                </span>
              )}
              {!readOnly && savingDraft && (
                <span className="ml-2" style={{ color: MUTED }}>
                  · {t({ fr: 'Sauvegarde…', en: 'Saving…', de: 'Speichert…' })}
                </span>
              )}
              {!readOnly && !savingDraft && filled > 0 && (
                <span className="ml-2" style={{ color: MUTED }}>
                  · {t(UI.autosaved)}
                </span>
              )}
              {submitError && (
                <span className="ml-2" style={{ color: '#a23b2d' }}>
                  · {t(UI.submitError)}
                </span>
              )}
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="inline-flex items-center justify-center gap-2 text-[14px] font-medium px-4 py-2.5 sm:py-2 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] transition-colors"
                style={{
                  background: canSubmit ? NAVY : '#e6e3da',
                  color: canSubmit ? 'white' : MUTED,
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                }}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                {isSubmitted ? t(UI.update) : t(UI.submit)}
              </button>
            )}
          </div>
          {!readOnly && !canSubmit && filled > 0 && filled < total && (
            <p className="text-[11px]" style={{ color: MUTED }}>
              {t(UI.cannotSubmit)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
