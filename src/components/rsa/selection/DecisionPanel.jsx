// DecisionPanel — the comité form. Embedded in the DossierDrawer below the dossier
// detail. Renders a 4-option radio (a_examiner / eligible / liste_attente / rejete),
// the ClusterSelect (required for eligible), and a Textarea rationale (required for
// rejete / liste_attente). Submits via useUpsertReview.
//
// Disabled when the effective decision is is_final=true (admin lock).

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { NAVY, INK, MUTED, GOLD, CREAM2, SERIF } from '@/components/design';
import { TINT_DANGER, DANGER, SUCCESS } from '@/components/design/tokens.app';
import { Field, Textarea } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { usePlatformAuth } from '@/lib/platform/auth';
import { DECISIONS, DECISION_DEFAULT, formatDateTime } from './constants';
import { DECISION_LABELS, UI } from './i18n';
import ClusterSelect from './ClusterSelect';

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

export default function DecisionPanel({
  startup,
  effectiveReview,
  reviews = [],
  sessions = [],
  onSubmit,
  isPending,
  isLocked, // effectiveReview?.is_final
  className = '',
}) {
  const { t, lang } = useLang();
  const { authUser, profile } = usePlatformAuth();

  const reviewerName = profile?.full_name || authUser?.email || '';

  // Pre-fill from the latest non-final review by the current user, if any.
  const latestMine = (reviews || []).find(
    (r) => !r.is_final && r.reviewer_id === authUser?.id,
  );
  const isCurrentUserLatestReviewer = !!latestMine;

  const [decision, setDecision] = useState(
    latestMine?.decision || effectiveReview?.decision || DECISION_DEFAULT,
  );
  const [clusterId, setClusterId] = useState(
    latestMine?.assigned_session_id || effectiveReview?.assigned_session_id || null,
  );
  const [rationale, setRationale] = useState(
    latestMine?.rationale || effectiveReview?.rationale || '',
  );
  const [errors, setErrors] = useState({});

  // Transient "enregistré" confirmation: the parent only signals success by the
  // badge disappearing, so we surface a short-lived banner on the isPending
  // true→false falling edge after a submit we initiated (avoids re-click doubt).
  const [saved, setSaved] = useState(false);
  const submittedRef = useRef(false);
  const prevPendingRef = useRef(isPending);

  useEffect(() => {
    if (prevPendingRef.current && !isPending && submittedRef.current) {
      submittedRef.current = false;
      setSaved(true);
    }
    prevPendingRef.current = isPending;
  }, [isPending]);

  useEffect(() => {
    if (!saved) return undefined;
    const tid = setTimeout(() => setSaved(false), 3500);
    return () => clearTimeout(tid);
  }, [saved]);

  // If the props change (different dossier), reset the form.
  useEffect(() => {
    setDecision(latestMine?.decision || effectiveReview?.decision || DECISION_DEFAULT);
    setClusterId(
      latestMine?.assigned_session_id || effectiveReview?.assigned_session_id || null,
    );
    setRationale(latestMine?.rationale || effectiveReview?.rationale || '');
    setErrors({});
    setSaved(false);
    submittedRef.current = false;
  }, [startup?.id]);

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    const next = {};
    if (decision === 'eligible' && !clusterId) {
      next.cluster = t(UI.errEligibleNeedsCluster);
    }
    if (['rejete', 'liste_attente'].includes(decision) && !rationale?.trim()) {
      next.rationale = t(UI.errRationale);
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaved(false);
    submittedRef.current = true;
    onSubmit?.({
      startupId: startup.id,
      reviewerId: authUser?.id,
      reviewerName,
      decision,
      assignedSessionId: decision === 'eligible' ? clusterId : null,
      rationale: rationale?.trim() || null,
    });
  };

  // Pending-decision hint surfaced by another reviewer (soft hint per spec §7).
  const latestOther = (reviews || []).find(
    (r) => !r.is_final && r.reviewer_id !== authUser?.id,
  );

  if (isLocked) {
    return (
      <section
        className={`rounded-[4px] p-4 ${className}`}
        style={{ background: TINT_DANGER, border: `1px solid ${DANGER}33` }}
      >
        <div
          className="text-[14px]"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(UI.finalLocked)}
        </div>
        <p className="text-[12px] mt-1" style={{ color: INK }}>
          {t(UI.comiteOnlyEdit)}
        </p>
      </section>
    );
  }

  return (
    <section
      className={`rounded-[4px] p-5 ${className}`}
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
        <h3
          className="text-[18px] leading-tight"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(UI.decisionTitle)}
        </h3>
        {reviewerName && (
          <p className="text-[12px]" style={{ color: MUTED }}>
            {reviewerName}
          </p>
        )}
      </div>

      {/* Soft pending-decision hint */}
      {(latestOther || isCurrentUserLatestReviewer) && (
        <p className="text-[12px] mb-3" style={{ color: MUTED }}>
          {isCurrentUserLatestReviewer
            ? t(UI.pendingHintMine).replace(
                '{when}',
                formatDateTime(latestMine.reviewed_at, lang) || '—',
              )
            : t(UI.pendingHint)
                .replace('{who}', latestOther.reviewer_name || '—')
                .replace(
                  '{when}',
                  formatDateTime(latestOther.reviewed_at, lang) || '—',
                )}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label={t(UI.decisionField)} required>
          {() => <DecisionRadio value={decision} onChange={setDecision} disabled={isPending} />}
        </Field>

        <Field
          label={t(UI.clusterField)}
          required={decision === 'eligible'}
          helper={decision !== 'eligible' ? t(UI.clusterNone) : undefined}
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
              disabled={isPending || decision !== 'eligible'}
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
              placeholder={t(UI.rationalePlaceholder)}
              rows={4}
              disabled={isPending}
              maxLength={2000}
            />
          )}
        </Field>

        {saved && !isPending && (
          <div
            className="flex items-center gap-2 rounded-[4px] px-3 py-2 text-[12.5px]"
            style={{ background: '#ecf1e5', color: NAVY, border: `1px solid ${CREAM2}` }}
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: SUCCESS }} aria-hidden />
            {t(UI.decisionSaved)}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 text-[14px] font-medium px-5 py-2.5 rounded-[4px] text-white outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
            style={{ background: isPending ? '#7a8a9a' : NAVY }}
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            {isPending
              ? t(UI.saving)
              : isCurrentUserLatestReviewer
                ? t(UI.updateDecision)
                : t(UI.saveDecision)}
          </button>
        </div>
      </form>
    </section>
  );
}
