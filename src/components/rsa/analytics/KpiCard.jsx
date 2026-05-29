// KpiCard — carte KPI Élysée (pattern catalog §5.2).
//
// Rectangle blanc, hairline CREAM2, label uppercase tracking, valeur tabular-nums
// 26/32px Inter 500 NAVY, subtitle 11px INK, tooltip optionnel sur le label.
//
// Props :
//   - label       : string (déjà résolu par t())
//   - value       : number | string ('—' si null)
//   - subtitle    : string (optionnel, ex. '12% des candidatures')
//   - tooltip     : string (optionnel — title="..." natif)
//   - accent      : 'gold' (par défaut, dot pour live status) | 'navy' | null
//   - dotActive   : boolean — affiche dot pulsant 'live' à côté du label si true
//   - loading     : boolean — skeleton si true

import React from 'react';
import { NAVY, INK, MUTED, CREAM2, GOLD } from '@/components/design/tokens';

function Dot({ color, pulse }) {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${pulse ? 'animate-pulse' : ''}`}
      style={{ background: color }}
      aria-hidden
    />
  );
}

export default function KpiCard({
  label,
  value,
  subtitle,
  tooltip,
  accent = 'gold',
  dotActive = false,
  loading = false,
}) {
  const accentColor = accent === 'navy' ? NAVY : GOLD;
  return (
    <div
      className="rounded-[4px] p-4 md:p-5 flex flex-col gap-1"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      title={tooltip || undefined}
    >
      <span
        className="uppercase tracking-[0.14em] text-[10.5px] font-medium inline-flex items-center gap-1.5"
        style={{ color: MUTED }}
      >
        {dotActive && <Dot color={accentColor} pulse />}
        {label}
      </span>
      <div className="flex items-baseline gap-2 mt-0.5">
        {loading ? (
          <span
            className="inline-block h-[26px] md:h-[32px] w-16 rounded-[2px]"
            style={{ background: CREAM2 }}
            aria-hidden
          />
        ) : (
          <span
            className="text-[26px] md:text-[32px] tabular-nums leading-none"
            style={{ color: NAVY, fontWeight: 500 }}
          >
            {value}
          </span>
        )}
      </div>
      {subtitle && (
        <span className="text-[11px] mt-0.5" style={{ color: INK }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}
