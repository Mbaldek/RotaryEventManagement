// STUB — Club Cockpit (V2 multi-club)
//
// Sera entièrement réécrit par l'agent Étape 6. Ce stub permet juste au build
// de passer pendant que l'agent travaille. Affiche un placeholder en attendant.

import React from 'react';
import { GOLD, NAVY, INK, SERIF } from '@/components/design';

export default function ClubCockpit({ clubId }) {
  return (
    <div
      className="rounded-[4px] p-6 my-4"
      style={{ background: 'white', border: '1px solid #e8e3d9' }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
        <span
          className="uppercase text-[10px] tracking-[0.18em] font-medium"
          style={{ color: GOLD }}
        >
          Club Cockpit · V2 · {clubId || '—'}
        </span>
      </div>
      <h2
        className="text-[20px] mb-2"
        style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
      >
        Cockpit Club Admin
      </h2>
      <p className="text-[13.5px]" style={{ color: INK }}>
        Le cockpit club (Setup / Live / Results / Équipe / Règles) est en cours de
        construction.
      </p>
    </div>
  );
}
