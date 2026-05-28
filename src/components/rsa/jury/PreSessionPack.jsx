// PreSessionPack — v1 client-side : liste de toutes les startups de la session avec
// deux liens signés par dossier (pitch deck + exec summary). Pas d'Edge function
// retargetée pour Module 3 (pre-decided default #12 : defer).
//
// L'ordre suit le `session_order` legacy si disponible sur session_config (text[] de
// noms de startup), fallback alphabétique (parité avec le legacy RsaJuryHub:264-281).

import React, { useMemo } from 'react';
import { NAVY, MUTED, CREAM2, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import DocumentLinks from './DocumentLinks';
import { UI } from './i18n';

// Ré-ordonne `startups` selon `session_order` (text[] de noms) ; fallback alpha.
function orderStartups(startups, sessionOrder) {
  if (!Array.isArray(startups) || startups.length === 0) return [];
  if (Array.isArray(sessionOrder) && sessionOrder.length > 0) {
    const idxByName = new Map(sessionOrder.map((name, i) => [name, i]));
    return [...startups].sort((a, b) => {
      const ia = idxByName.has(a.name) ? idxByName.get(a.name) : Number.POSITIVE_INFINITY;
      const ib = idxByName.has(b.name) ? idxByName.get(b.name) : Number.POSITIVE_INFINITY;
      if (ia !== ib) return ia - ib;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }
  return [...startups].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

export default function PreSessionPack({ startups, sessionConfig }) {
  const { t } = useLang();
  const ordered = useMemo(
    () => orderStartups(startups || [], sessionConfig?.session_order),
    [startups, sessionConfig?.session_order],
  );

  if (!ordered.length) {
    return (
      <div
        className="rounded-[4px] p-5 text-center"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <p className="text-[14px]" style={{ color: MUTED }}>
          {t(UI.preReadEmpty)}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[12px] mb-3" style={{ color: MUTED }}>
        {t(UI.preReadHelp)}
      </p>
      <ol className="flex flex-col gap-3 list-none m-0 p-0">
        {ordered.map((s, i) => (
          <li
            key={s.id}
            className="rounded-[4px] p-4"
            style={{ background: 'white', border: `1px solid ${CREAM2}` }}
          >
            <div className="flex items-baseline gap-3 mb-2">
              <span
                className="inline-flex items-center justify-center text-[11px] font-semibold w-6 h-6 rounded-full tabular-nums"
                style={{ background: '#fbf9f5', color: NAVY, border: `1px solid ${CREAM2}` }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <h4
                className="text-[15px] leading-tight flex-1 min-w-0"
                style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
              >
                {s.name || '—'}
              </h4>
              {s.country && (
                <span className="text-[11px]" style={{ color: MUTED }}>
                  {s.country}
                </span>
              )}
            </div>
            <DocumentLinks startup={s} compact />
          </li>
        ))}
      </ol>
    </div>
  );
}
