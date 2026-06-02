// src/components/rsa/allocation/ClusterColumn.jsx
// Une section cluster (L-Numbered-Hairline) : titre Playfair + date + compteur,
// liste des startups allouées avec action Déplacer / Renvoyer / Écarter.
import React from 'react';
import { CREAM2, NAVY, INK, MUTED, GOLD, SERIF } from '@/components/design/tokens';
import { Select } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { formatShortDate } from '@/components/rsa/selection/constants';
import { UI } from './i18n';

export default function ClusterColumn({ group, clusters = [], onMove, onSendBack, onReject }) {
  const { t, lang } = useLang();
  const { cluster, startups } = group;
  const moveOptions = clusters
    .filter((c) => c.id !== cluster.id)
    .map((c) => ({ value: c.id, label: c.name }));
  return (
    <section className="mb-4" style={{ borderTop: `2px solid ${GOLD}`, paddingTop: 10 }}>
      <header className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
        <h4 className="text-[16px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {cluster.name}
          {cluster.session_date && (
            <span className="text-[12px] ml-2" style={{ color: MUTED }}>
              · {formatShortDate(cluster.session_date, lang)}
            </span>
          )}
        </h4>
        <span className="text-[12px]" style={{ color: MUTED }}>
          {t(UI.startupsCount).replace('{n}', String(startups.length))}
        </span>
      </header>
      <ul className="list-none m-0 p-0">
        {startups.map((s) => (
          <li key={s.id} className="grid grid-cols-[1fr_auto] items-center gap-3 py-2"
              style={{ borderBottom: `1px solid ${CREAM2}` }}>
            <span className="text-[14px]" style={{ color: INK }}>{s.name}</span>
            <span className="flex items-center gap-2">
              <span className="w-[150px]">
                <Select
                  value=""
                  onChange={(e) => e.target.value && onMove(s.id, e.target.value)}
                  options={moveOptions}
                  placeholder={t(UI.move)}
                  disabled={!moveOptions.length}
                />
              </span>
              <button type="button" onClick={() => onSendBack(s.id)}
                      className="text-[12px] outline-none focus-visible:underline" style={{ color: MUTED }}>
                {t(UI.sendBack)}
              </button>
              <button type="button" onClick={() => onReject(s.id)}
                      className="text-[12px] outline-none focus-visible:underline" style={{ color: '#a23b3b' }}>
                {t(UI.reject)}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
