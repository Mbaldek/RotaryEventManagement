// SessionList — éditorial left-pane (master) listant les sessions assignées au juré.
// Chaque ligne : nom session + date + StatusPill (kind="jury") + countdown.

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { NAVY, INK, MUTED, GOLD, CREAM2, SERIF } from '@/components/design/tokens';
import { StatusPill } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import {
  computeCountdown,
  formatShortDate,
  compareSessions,
} from './constants';
import { JURY_STATUS_LABELS, UI } from './i18n';

function renderCountdown(cd, t) {
  if (!cd) return null;
  switch (cd.kind) {
    case 'today':     return t(UI.countdownToday);
    case 'tomorrow':  return t(UI.countdownTomorrow);
    case 'yesterday': return t(UI.countdownYesterday);
    case 'in':        return t(UI.countdownIn(cd.days));
    case 'past':      return t(UI.countdownPast(cd.days));
    default:          return null;
  }
}

export default function SessionList({ sessions, selectedSessionId, onSelect }) {
  const { t, lang } = useLang();

  if (!Array.isArray(sessions) || sessions.length === 0) {
    return (
      <div
        className="rounded-[4px] p-5 text-center"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <p className="text-[14px]" style={{ color: MUTED }}>
          {t(UI.emptySessions)}
        </p>
      </div>
    );
  }

  const sorted = [...sessions].sort(compareSessions);

  return (
    <ol className="flex flex-col gap-2 list-none m-0 p-0">
      {sorted.map((s) => {
        const status = s.config?.status || 'draft';
        const cd = computeCountdown(s.session_date);
        const selected = s.id === selectedSessionId;
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect?.(s.id)}
              aria-pressed={selected}
              className="w-full text-left rounded-[4px] p-4 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{
                background: selected ? '#fdf6e8' : 'white',
                border: `1px solid ${selected ? GOLD : CREAM2}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[15px] leading-tight"
                    style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
                  >
                    {s.name || s.theme || s.id}
                  </div>
                  <div className="text-[12px] mt-1" style={{ color: INK }}>
                    {formatShortDate(s.session_date, lang)}
                    {s.club_id && (
                      <span className="ml-2" style={{ color: MUTED }}>· {s.club_id}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <StatusPill
                      kind="jury"
                      status={status}
                      label={t(JURY_STATUS_LABELS[status]) || status}
                    />
                    {cd && (
                      <span
                        className="inline-flex items-center text-[11px] font-medium"
                        style={{ color: cd.kind === 'today' ? GOLD : MUTED }}
                      >
                        {renderCountdown(cd, t)}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: MUTED }} aria-hidden />
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
