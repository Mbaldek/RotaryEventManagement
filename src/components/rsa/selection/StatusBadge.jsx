// StatusBadge — thin wrapper over @/components/design StatusPill, knowing the
// startups.status FR business vocabulary used by Module 2.
//
// Two modes:
//   <StatusBadge kind="status" status={startup.status} />
//   <StatusBadge kind="decision" decision={review.decision} />
//   <StatusBadge kind="verdict" verdict={startup.eligibility?.verdict} />

import React from 'react';
import { StatusPill } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import {
  STATUS_TO_PILL,
  DECISION_TO_PILL,
  VERDICT_TO_PILL,
} from './constants';
import { DOSSIER_STATUS_LABELS, DECISION_LABELS, VERDICT_LABELS } from './i18n';

export default function StatusBadge({
  kind = 'status',
  status,
  decision,
  verdict,
  size = 'sm',
  className = '',
}) {
  const { t } = useLang();

  if (kind === 'decision') {
    if (!decision) return null;
    const pill = DECISION_TO_PILL[decision] || 'under_review';
    return (
      <StatusPill
        kind="dossier"
        status={pill}
        label={t(DECISION_LABELS[decision]) || decision}
        size={size}
        className={className}
      />
    );
  }

  if (kind === 'verdict') {
    if (!verdict) return null;
    const pill = VERDICT_TO_PILL[verdict] || 'flagged';
    return (
      <StatusPill
        kind="eligibility"
        status={pill}
        label={t(VERDICT_LABELS[verdict]) || verdict}
        size={size}
        className={className}
      />
    );
  }

  // default: kind === 'status' (startups.status)
  if (!status) return null;
  const pill = STATUS_TO_PILL[status] || 'submitted';
  return (
    <StatusPill
      kind="dossier"
      status={pill}
      label={t(DOSSIER_STATUS_LABELS[status]) || status}
      size={size}
      className={className}
    />
  );
}
