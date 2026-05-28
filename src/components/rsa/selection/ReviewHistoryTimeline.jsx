// ReviewHistoryTimeline — vertical gold-rule timeline of every selection_reviews
// row for a dossier, most recent first. Read-only audit view.

import React from 'react';
import { Lock } from 'lucide-react';
import { NAVY, INK, MUTED, GOLD, CREAM2, SERIF } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import StatusBadge from './StatusBadge';
import { UI } from './i18n';
import { formatDateTime } from './constants';

function shortId(id) {
  if (!id) return '';
  return String(id).slice(0, 4);
}

function Row({ review, sessions, t, lang, isFirst, isLast }) {
  const isAdmin = review.is_final; // proxy ; admin override always writes is_final
  const session = sessions?.find((s) => s.id === review.assigned_session_id) || null;
  const overrideTarget = review.overrides_review_id ? shortId(review.overrides_review_id) : null;

  return (
    <li className="flex gap-3">
      {/* Spine */}
      <div className="flex flex-col items-center">
        <span
          className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold shrink-0"
          style={{
            background: isFirst ? NAVY : 'transparent',
            color: isFirst ? 'white' : NAVY,
            border: `1.5px solid ${isFirst ? NAVY : GOLD}`,
          }}
          aria-hidden
        >
          {isAdmin ? <Lock className="w-3 h-3" /> : '•'}
        </span>
        {!isLast && (
          <span
            aria-hidden
            className="w-px flex-1 my-1"
            style={{ background: GOLD, minHeight: 28 }}
          />
        )}
      </div>

      {/* Content */}
      <div className="pb-5 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap text-[12px]" style={{ color: MUTED }}>
          <span>{formatDateTime(review.reviewed_at, lang) || '—'}</span>
          <span>·</span>
          <span style={{ color: INK }}>{review.reviewer_name || '—'}</span>
          <span
            className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] font-medium"
            style={{
              background: isAdmin ? '#fdf6e8' : '#fbf9f5',
              color: NAVY,
              border: `1px solid ${isAdmin ? GOLD : CREAM2}`,
            }}
          >
            {isAdmin ? t(UI.roleAdmin) : t(UI.roleComite)}
          </span>
          {review.is_final && (
            <span
              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] font-medium"
              style={{ background: GOLD, color: NAVY }}
            >
              {t(UI.finalCaption)}
            </span>
          )}
          {overrideTarget && (
            <span style={{ color: MUTED }}>
              · {t(UI.overrideOf).replace('{id}', overrideTarget)}
            </span>
          )}
        </div>

        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          <StatusBadge kind="decision" decision={review.decision} />
          {session && (
            <span
              className="text-[12px] inline-flex items-center px-2 py-0.5 rounded-full"
              style={{ background: '#fbf9f5', border: `1px solid ${CREAM2}`, color: INK }}
            >
              {t(UI.assignedTo)} · {session.name}
            </span>
          )}
        </div>

        {review.rationale ? (
          <blockquote
            className="mt-2 text-[13px] italic leading-relaxed"
            style={{ fontFamily: SERIF, color: INK, borderLeft: `2px solid ${GOLD}`, paddingLeft: 10 }}
          >
            « {review.rationale} »
          </blockquote>
        ) : (
          <p className="mt-1 text-[12px]" style={{ color: MUTED }}>
            {t(UI.rationaleNone)}
          </p>
        )}
      </div>
    </li>
  );
}

export default function ReviewHistoryTimeline({ reviews, sessions = [] }) {
  const { t, lang } = useLang();

  if (!Array.isArray(reviews) || reviews.length === 0) {
    return (
      <p className="text-[13px]" style={{ color: MUTED }}>
        {t(UI.timelineEmpty)}
      </p>
    );
  }

  // Defensive sort : most recent first.
  const ordered = [...reviews].sort((a, b) => {
    const ta = a.reviewed_at ? Date.parse(a.reviewed_at) : 0;
    const tb = b.reviewed_at ? Date.parse(b.reviewed_at) : 0;
    return tb - ta;
  });

  return (
    <ol className="list-none m-0 p-0">
      {ordered.map((r, i) => (
        <Row
          key={r.id}
          review={r}
          sessions={sessions}
          t={t}
          lang={lang}
          isFirst={i === 0}
          isLast={i === ordered.length - 1}
        />
      ))}
    </ol>
  );
}
