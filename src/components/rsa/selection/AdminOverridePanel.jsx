// AdminOverridePanel — admin VALIDATE / OVERRIDE actions. Only rendered for admins.
//
// Two cases:
//   A. There's a latest non-final comité review → show its summary +
//        [Valider tel quel] + [Remplacer la décision] buttons.
//   B. No comité review yet → admin can validate via the override sub-form alone
//        (acting in their dual role).
//
// Surfaces a "À valider" badge for liste_attente / rejete to align with spec §7.5.

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, Edit3 } from 'lucide-react';
import { NAVY, INK, MUTED, GOLD, CREAM2, SERIF } from '@/components/design';
import { Field, Textarea } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import StatusBadge from './StatusBadge';
import ClusterSelect from './ClusterSelect';
import { DECISIONS, DECISION_DEFAULT, formatDateTime } from './constants';
import { DECISION_LABELS, UI } from './i18n';

function DecisionRadio({ value, onChange, disabled }) {
  const { t } = useLang();
  return (
    <div role="radiogroup" className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {DECISIONS.map((d) => {
        const checked = value === d;
        return (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange?.(d)}
            className="min-h-[44px] px-3 py-2 text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: checked ? '#fdf6e8' : 'white',
              border: `1px solid ${checked ? GOLD : CREAM2}`,
              color: checked ? NAVY : INK,
              borderRadius: 4,
            }}
          >
            {t(DECISION_LABELS[d]) || d}
          </button>
        );
      })}
    </div>
  );
}

export default function AdminOverridePanel({
  startup,
  effectiveReview,
  sessions = [],
  onValidate,
  onOverride,
  isValidating,
  isOverriding,
  className = '',
}) {
  const { t, lang } = useLang();
  const [showOverride, setShowOverride] = useState(false);

  const isFinal = effectiveReview?.is_final;
  const hasComite = !!effectiveReview && !isFinal;
  const needsValidation =
    hasComite && ['rejete', 'liste_attente'].includes(effectiveReview?.decision);

  // Override sub-form state, pre-filled from the effective review.
  const [decision, setDecision] = useState(
    effectiveReview?.decision || DECISION_DEFAULT,
  );
  const [clusterId, setClusterId] = useState(effectiveReview?.assigned_session_id || null);
  const [rationale, setRationale] = useState(effectiveReview?.rationale || '');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setDecision(effectiveReview?.decision || DECISION_DEFAULT);
    setClusterId(effectiveReview?.assigned_session_id || null);
    setRationale(effectiveReview?.rationale || '');
    setErrors({});
    setShowOverride(false);
  }, [startup?.id, effectiveReview?.id]);

  const handleValidate = () => {
    if (!effectiveReview?.id) return;
    onValidate?.({ reviewId: effectiveReview.id, startupId: startup.id });
  };

  const handleOverride = (e) => {
    e?.preventDefault?.();
    const next = {};
    if (decision === 'eligible' && !clusterId) next.cluster = t(UI.errEligibleNeedsCluster);
    if (['rejete', 'liste_attente'].includes(decision) && !rationale?.trim()) {
      next.rationale = t(UI.errRationale);
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onOverride?.({
      startupId: startup.id,
      decision,
      assignedSessionId: decision === 'eligible' ? clusterId : null,
      rationale: rationale?.trim() || null,
      overridesReviewId: effectiveReview?.id || null,
    });
  };

  return (
    <section
      className={`rounded-[4px] p-5 ${className}`}
      style={{ background: '#fbf9f5', border: `1px solid ${GOLD}33` }}
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
        <h3
          className="text-[16px] leading-tight"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(UI.adminTitle)}
        </h3>
        {needsValidation && (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ background: '#fdf6e8', color: NAVY, border: `1px solid ${GOLD}` }}
          >
            {t(UI.needsValidation)}
          </span>
        )}
      </div>

      {/* Summary of the current effective decision */}
      {effectiveReview ? (
        <div
          className="rounded-[4px] p-3 mb-3"
          style={{ background: 'white', border: `1px solid ${CREAM2}` }}
        >
          <div className="flex items-center gap-2 flex-wrap text-[12px]" style={{ color: MUTED }}>
            <span>{formatDateTime(effectiveReview.reviewed_at, lang) || '—'}</span>
            <span>·</span>
            <span style={{ color: INK }}>{effectiveReview.reviewer_name || '—'}</span>
            {isFinal && (
              <span
                className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] font-medium"
                style={{ background: GOLD, color: NAVY }}
              >
                {t(UI.finalCaption)}
              </span>
            )}
          </div>
          <div className="mt-1.5">
            <StatusBadge kind="decision" decision={effectiveReview.decision} />
          </div>
          {effectiveReview.rationale && (
            <blockquote
              className="mt-2 text-[13px] italic leading-relaxed"
              style={{
                fontFamily: SERIF,
                color: INK,
                borderLeft: `2px solid ${GOLD}`,
                paddingLeft: 10,
              }}
            >
              « {effectiveReview.rationale} »
            </blockquote>
          )}
        </div>
      ) : (
        <p className="text-[13px] mb-3" style={{ color: MUTED }}>
          {t(UI.noEffectiveDecision)}
        </p>
      )}

      {/* Action buttons (only if not yet final + a comité review exists) */}
      {hasComite && !showOverride && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleValidate}
            disabled={isValidating}
            className="inline-flex items-center gap-2 text-[13px] font-medium px-4 py-2 rounded-[4px] text-white outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
            style={{ background: isValidating ? '#7a8a9a' : NAVY }}
          >
            {isValidating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
            )}
            {t(UI.adminValidate)}
          </button>
          <button
            type="button"
            onClick={() => setShowOverride(true)}
            className="inline-flex items-center gap-2 text-[13px] font-medium px-4 py-2 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
            style={{ color: NAVY, border: `1.5px solid ${GOLD}` }}
          >
            <Edit3 className="w-3.5 h-3.5" aria-hidden />
            {t(UI.adminOverride)}
          </button>
        </div>
      )}

      {/* Direct override when there's no comité review yet, OR override after click */}
      {(showOverride || !hasComite) && (
        <form onSubmit={handleOverride} className="flex flex-col gap-4 mt-3">
          <h4
            className="text-[14px]"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {t(UI.adminOverrideTitle)}
          </h4>

          <Field label={t(UI.decisionField)} required>
            {() => <DecisionRadio value={decision} onChange={setDecision} disabled={isOverriding} />}
          </Field>

          <Field
            label={t(UI.clusterField)}
            required={decision === 'eligible'}
            error={errors.cluster}
          >
            {({ id, invalid }) => (
              <ClusterSelect
                id={id}
                value={clusterId}
                onChange={setClusterId}
                sessions={sessions}
                startup={startup}
                allowEmpty={decision !== 'eligible'}
                disabled={isOverriding || decision !== 'eligible'}
                invalid={invalid}
              />
            )}
          </Field>

          <Field
            label={t(UI.rationaleField)}
            required={['rejete', 'liste_attente'].includes(decision)}
            helper={t(UI.rationaleRequired)}
            error={errors.rationale}
          >
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={4}
                disabled={isOverriding}
                maxLength={2000}
              />
            )}
          </Field>

          <div className="flex justify-end gap-2">
            {showOverride && hasComite && (
              <button
                type="button"
                onClick={() => setShowOverride(false)}
                disabled={isOverriding}
                className="text-[13px] font-medium px-4 py-2 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
                style={{ color: INK, border: `1px solid ${CREAM2}` }}
              >
                {t(UI.adminCancel)}
              </button>
            )}
            <button
              type="submit"
              disabled={isOverriding}
              className="inline-flex items-center gap-2 text-[13px] font-medium px-4 py-2 rounded-[4px] text-white outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
              style={{ background: isOverriding ? '#7a8a9a' : NAVY }}
            >
              {isOverriding && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
              {t(UI.adminOverrideSubmit)}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
