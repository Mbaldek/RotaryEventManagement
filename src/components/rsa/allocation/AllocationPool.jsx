// src/components/rsa/allocation/AllocationPool.jsx
// Liste éditoriale des éligibles à placer (L-Numbered-Hairline) : rail numéroté
// + nom + secteurs + dropdown cluster (réutilise le pattern ClusterSelect).
import React from 'react';
import { CREAM2, NAVY, MUTED, GOLD, SERIF } from '@/components/design/tokens';
import { Select } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { sectorToClusterHeuristic } from '@/components/rsa/selection/constants';
import { UI } from './i18n';

export default function AllocationPool({ pool = [], clusters = [], onAllocate }) {
  const { t } = useLang();
  if (!pool.length) {
    return <p className="text-[13px] py-4" style={{ color: MUTED }}>{t(UI.emptyPool)}</p>;
  }
  const options = clusters.map((c) => ({ value: c.id, label: c.name }));
  return (
    <ol className="list-none m-0 p-0" style={{ borderTop: `1px solid ${CREAM2}` }}>
      {pool.map((s, i) => {
        const suggestion = sectorToClusterHeuristic(s.sectors, clusters);
        const suggestedName = clusters.find((c) => c.id === suggestion)?.name;
        return (
          <li key={s.id} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 py-3"
              style={{ borderBottom: `1px solid ${CREAM2}` }}>
            <span className="text-[12px] tabular-nums text-center" style={{ color: MUTED, fontFamily: SERIF }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] leading-tight" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
                {s.name}
              </span>
              {Array.isArray(s.sectors) && s.sectors.length > 0 && (
                <span className="block text-[12px] mt-0.5" style={{ color: MUTED }}>
                  {s.sectors.join(', ')}
                  {suggestedName && (
                    <button type="button" onClick={() => onAllocate(s.id, suggestion)}
                            className="ml-2 outline-none focus-visible:underline" style={{ color: GOLD }}>
                      {t(UI.suggested).replace('{name}', suggestedName)}
                    </button>
                  )}
                </span>
              )}
            </span>
            <span className="w-[200px]">
              <Select
                value=""
                onChange={(e) => e.target.value && onAllocate(s.id, e.target.value)}
                options={options}
                placeholder={t(UI.pickCluster)}
                disabled={!clusters.length}
              />
            </span>
          </li>
        );
      })}
    </ol>
  );
}
