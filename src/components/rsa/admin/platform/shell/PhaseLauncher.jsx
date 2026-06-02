// src/components/rsa/admin/platform/shell/PhaseLauncher.jsx
// Liste ÉDITORIALE des sous-écrans d'une phase (pattern L-Numbered-Hairline) —
// PAS de cards. Chaque ligne = rail numéroté + barre or verticale + titre
// Playfair + hint + meta (compteurs live) + flèche, séparées par des filets
// CREAM2. Navigation via Link react-router. Cf. ui-patterns-catalog-generic §1.5
// (filet or), L-Numbered-Hairline (StepCard de PilotageTab).

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CREAM2, NAVY, INK, MUTED, GOLD, SERIF } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';

// items : [{ key, title, hint, to, meta? }]
export default function PhaseLauncher({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <ol className="list-none m-0 p-0" style={{ borderTop: `1px solid ${CREAM2}` }}>
      {items.map((it, i) => (
        <li key={it.key} style={{ borderBottom: `1px solid ${CREAM2}` }}>
          <Link
            to={it.to}
            className={`group grid grid-cols-[52px_1fr_auto] items-stretch outline-none transition-colors hover:bg-[#faf7f0] ${FOCUS_RING_CLASS}`}
          >
            {/* Rail : numéro serif + barre or verticale */}
            <span
              className="flex items-center justify-center py-5"
              style={{ borderRight: `2px solid ${GOLD}` }}
            >
              <span className="text-[12px] tabular-nums" style={{ color: MUTED, fontFamily: SERIF }}>
                {String(i + 1).padStart(2, '0')}
              </span>
            </span>
            {/* Corps : titre Playfair + hint + meta */}
            <span className="py-5 pl-5 pr-3 min-w-0 self-center">
              <span
                className="block text-[16px] leading-tight"
                style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
              >
                {it.title}
              </span>
              <span className="block text-[12.5px] mt-1" style={{ color: MUTED }}>
                {it.hint}
                {it.meta ? <span style={{ color: INK }}> · {it.meta}</span> : null}
              </span>
            </span>
            {/* Flèche */}
            <span className="flex items-center pr-4">
              <ArrowRight
                className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                style={{ color: NAVY }}
                aria-hidden
              />
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
