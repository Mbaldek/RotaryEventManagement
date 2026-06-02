// KpiCard — cellule KPI rail éditorial (pattern catalog §5.2 — refonte anti-card).
//
// Ligne sans boîte : label uppercase tracked muted + valeur Playfair navy
// tabular-nums (26/32px), filet CREAM2 en haut, fond transparent. Animée au
// mount via count-up ease-out-quart (preserve-motion-preference).
//
// Props :
//   - label       : string (déjà résolu par t())
//   - value       : number | string ('—' si null)
//   - subtitle    : string (optionnel, ex. '12% des candidatures')
//   - tooltip     : string (optionnel — title="..." natif)
//   - accent      : 'gold' (par défaut, dot pour live status) | 'navy' | null
//   - dotActive   : boolean — affiche dot pulsant 'live' à côté du label si true
//   - loading     : boolean — skeleton si true

import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { NAVY, INK, MUTED, CREAM2, GOLD } from '@/components/design/tokens';
import { SERIF } from '@/components/design/tokens';

function Dot({ color, pulse }) {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${pulse ? 'animate-pulse' : ''}`}
      style={{ background: color }}
      aria-hidden
    />
  );
}

// useCountUp — anime un entier de la valeur précédente vers `target` en
// `duration` ms via rAF avec un ease-out-quart. Si reduce-motion : pas d'anim.
// Si target n'est pas un nombre (ex. '—'), renvoie target tel quel.
function useCountUp(target, duration = 900) {
  const reduce = useReducedMotion();
  const isNumber = typeof target === 'number' && Number.isFinite(target);
  const [display, setDisplay] = useState(isNumber ? (reduce ? target : 0) : target);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!isNumber) {
      setDisplay(target);
      return undefined;
    }
    if (reduce) {
      setDisplay(target);
      fromRef.current = target;
      return undefined;
    }
    const from = fromRef.current;
    const to = target;
    if (from === to) return undefined;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4); // ease-out quart
      const v = Math.round(from + (to - from) * eased);
      setDisplay(v);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduce, isNumber]);

  return display;
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
  const animated = useCountUp(value);
  return (
    <div
      className="flex flex-col gap-0.5 pt-3 pb-2"
      style={{ borderTop: `1px solid ${CREAM2}` }}
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
            style={{ color: NAVY, fontFamily: SERIF, fontWeight: 500 }}
          >
            {animated}
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
