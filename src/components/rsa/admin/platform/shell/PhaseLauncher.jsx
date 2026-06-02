// src/components/rsa/admin/platform/shell/PhaseLauncher.jsx
// Panneau de cartes-lanceurs vers les écrans existants d'une phase (Lot 1).
// Chaque carte = un Link react-router vers une route plein-écran déjà scopée
// sur l'édition. Style éditorial (carte blanche, hairline gold, ArrowRight).

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CREAM2, NAVY, MUTED, GOLD, SERIF } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';

// items : [{ key, title, hint, to }]
export default function PhaseLauncher({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((it) => (
        <Link
          key={it.key}
          to={it.to}
          className={`group rounded-[4px] p-5 bg-white flex items-start justify-between gap-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm ${FOCUS_RING_CLASS}`}
          style={{ border: `1px solid ${CREAM2}` }}
        >
          <span className="min-w-0">
            <span className="flex items-center gap-2 mb-1.5">
              <span className="h-[1.5px] w-5" style={{ background: GOLD }} aria-hidden />
            </span>
            <span
              className="block text-[16px] leading-tight"
              style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
            >
              {it.title}
            </span>
            <span className="block text-[12.5px] mt-1" style={{ color: MUTED }}>
              {it.hint}
            </span>
          </span>
          <ArrowRight
            className="w-4 h-4 mt-1 shrink-0 transition-transform group-hover:translate-x-0.5"
            style={{ color: NAVY }}
            aria-hidden
          />
        </Link>
      ))}
    </div>
  );
}
