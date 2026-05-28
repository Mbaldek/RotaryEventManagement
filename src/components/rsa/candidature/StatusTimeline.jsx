// StatusTimeline — frise verticale des jalons du cycle de vie d'un dossier soumis.
// Les jalons atteints (rang <= rang du statut courant) sont marqués GOLD ; le
// jalon courant est mis en avant. La branche `rejete` est signalée à part par le
// parent (CandidatureTracking).

import React from 'react';
import { Check } from 'lucide-react';
import { NAVY, INK, GOLD, MUTED, CREAM2 } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { TIMELINE, STATUS_RANK } from './i18n';

export default function StatusTimeline({ status }) {
  const { t } = useLang();
  const currentRank = STATUS_RANK[status] ?? 0;

  return (
    <ol className="list-none m-0 p-0">
      {TIMELINE.map((m, i) => {
        const rank = STATUS_RANK[m.id];
        const reached = currentRank >= rank;
        const isCurrent = currentRank === rank;
        const last = i === TIMELINE.length - 1;
        return (
          <li key={m.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold shrink-0"
                style={{
                  background: isCurrent ? NAVY : reached ? GOLD : 'transparent',
                  color: isCurrent ? 'white' : reached ? NAVY : MUTED,
                  border: `1.5px solid ${isCurrent ? NAVY : reached ? GOLD : CREAM2}`,
                }}
              >
                {reached && !isCurrent ? <Check className="w-3.5 h-3.5" aria-hidden /> : i + 1}
              </span>
              {!last && (
                <span className="w-px flex-1 my-1" style={{ background: reached ? GOLD : CREAM2, minHeight: 22 }} aria-hidden />
              )}
            </div>
            <div className={`pb-4 ${last ? 'pb-0' : ''}`}>
              <div
                className="text-[14px]"
                style={{ color: isCurrent ? NAVY : reached ? INK : MUTED, fontWeight: isCurrent ? 600 : 400 }}
              >
                {t(m.label)}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
