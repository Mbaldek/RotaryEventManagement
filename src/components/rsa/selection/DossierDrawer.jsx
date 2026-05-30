// DossierDrawer — right pane on lg+, full-page on mobile. Hosts the header,
// the read-only dossier sections, the timeline, and the decision/admin panels.
// Renders nothing useful if no startup is selected (the parent decides whether to
// show an empty-state hint).

import React, { useEffect, useState } from 'react';
import { ArrowLeft, AlertTriangle, Loader2, X } from 'lucide-react';
import { NAVY, INK, MUTED, GOLD, CREAM2, SERIF } from '@/components/design';
import { DANGER, TINT_DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { usePlatformAuth } from '@/lib/platform/auth';
import StatusBadge from './StatusBadge';
import DossierDetail from './DossierDetail';
import EligibilitySnapshot from './EligibilitySnapshot';
import DocumentLinks from './DocumentLinks';
import ReviewHistoryTimeline from './ReviewHistoryTimeline';
import DecisionPanel from './DecisionPanel';
import AdminOverridePanel from './AdminOverridePanel';
import { UI } from './i18n';
import { needsAdminValidation, pickEffectiveReview } from './constants';

function Section({ title, children }) {
  return (
    <section
      className="rounded-[4px] p-5 mb-4"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      {title && (
        <h3
          className="text-[11px] uppercase tracking-[0.14em] font-medium mb-3"
          style={{ color: MUTED }}
        >
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

function HeaderBar({ startup, effectiveReview, onClose, onBack, t }) {
  const validation = needsAdminValidation(effectiveReview);
  const final = !!effectiveReview?.is_final;

  return (
    <header className="flex flex-col gap-2 mb-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="lg:hidden inline-flex items-center gap-1.5 text-[12px] font-medium outline-none focus-visible:underline"
          style={{ color: NAVY }}
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> {t(UI.back)}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium outline-none focus-visible:underline"
            style={{ color: MUTED }}
            aria-label={t(UI.close)}
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        )}
      </div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h2
          className="text-[24px] leading-tight"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {startup?.name || '—'}
        </h2>
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge kind="verdict" verdict={startup?.eligibility?.verdict} />
          <StatusBadge kind="status" status={startup?.status} size="md" />
          {validation && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ background: '#fdf6e8', color: NAVY, border: `1px solid ${GOLD}` }}
            >
              {t(UI.needsValidation)}
            </span>
          )}
          {final && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-[0.08em]"
              style={{ background: GOLD, color: NAVY }}
            >
              {t(UI.finalCaption)}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

export default function DossierDrawer({
  startupId,
  startup,
  reviews = [],
  sessions = [],
  isLoading,
  isError,
  onClose,
  onBack,
  onRetry,
  // Mutations
  onSubmitReview,
  onAdminValidate,
  onAdminOverride,
  isSubmittingReview,
  isAdminValidating,
  isAdminOverriding,
}) {
  const { t } = useLang();
  const { isComite, isAdmin } = usePlatformAuth();

  // The parent fires mutate(payload) without surfacing failures here. We inject
  // a per-call onError into each handler so a failed RPC isn't silent.
  const [actionError, setActionError] = useState(null);

  // Clear any stale error when switching dossiers.
  useEffect(() => {
    setActionError(null);
  }, [startupId]);

  const withErrorFeedback = (handler) =>
    handler
      ? (payload) => {
          setActionError(null);
          handler(payload, {
            onError: () => setActionError(t(UI.actionError)),
          });
        }
      : undefined;

  const handleSubmitReviewSafe = withErrorFeedback(onSubmitReview);
  const handleAdminValidateSafe = withErrorFeedback(onAdminValidate);
  const handleAdminOverrideSafe = withErrorFeedback(onAdminOverride);

  if (!startupId) {
    return (
      <div
        className="rounded-[4px] p-6 text-center"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <p className="text-[14px]" style={{ color: MUTED }}>
          {t(UI.emptyDetailHint)}
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="rounded-[4px] p-6 text-center"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <p className="text-[14px] mb-3" style={{ color: INK }}>
          {t(UI.loadError)}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="text-[13px] font-medium px-3 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ color: NAVY, border: `1.5px solid ${GOLD}` }}
        >
          {t(UI.retry)}
        </button>
      </div>
    );
  }

  if (isLoading || !startup) {
    return (
      <div
        className="rounded-[4px] p-6 flex items-center justify-center"
        style={{ background: 'white', border: `1px solid ${CREAM2}`, minHeight: 200 }}
      >
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: GOLD }} aria-hidden />
      </div>
    );
  }

  const effective = pickEffectiveReview(reviews);
  const canDecide = isComite || isAdmin;

  return (
    <div>
      <HeaderBar
        startup={startup}
        effectiveReview={effective}
        onClose={onClose}
        onBack={onBack}
        t={t}
      />

      <Section title={t(UI.sectionDossier)}>
        <DossierDetail startup={startup} />
      </Section>

      <Section title={t(UI.sectionEligibility)}>
        <EligibilitySnapshot eligibility={startup.eligibility} />
      </Section>

      <Section title={t(UI.sectionDocuments)}>
        <DocumentLinks startup={startup} />
      </Section>

      <Section title={t(UI.sectionTimeline)}>
        <ReviewHistoryTimeline reviews={reviews} sessions={sessions} />
      </Section>

      {actionError && (
        <div
          className="rounded-[4px] p-3 mb-4 flex items-start gap-2 text-[12.5px]"
          style={{ background: TINT_DANGER, color: NAVY, border: `1px solid ${DANGER}33` }}
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: DANGER }} aria-hidden />
          <span>{actionError}</span>
        </div>
      )}

      {canDecide && (
        <DecisionPanel
          startup={startup}
          effectiveReview={effective}
          reviews={reviews}
          sessions={sessions}
          onSubmit={handleSubmitReviewSafe}
          isPending={isSubmittingReview}
          isLocked={!!effective?.is_final}
          className="mb-4"
        />
      )}

      {isAdmin && (
        <AdminOverridePanel
          startup={startup}
          effectiveReview={effective}
          sessions={sessions}
          onValidate={handleAdminValidateSafe}
          onOverride={handleAdminOverrideSafe}
          isValidating={isAdminValidating}
          isOverriding={isAdminOverriding}
        />
      )}
    </div>
  );
}
