// STUB — Master Cockpit (V2 multi-club)
//
// Sera entièrement réécrit par l'agent Étape 5. Ce stub permet juste au build
// de passer pendant que l'agent travaille. Affiche un placeholder en attendant.
//
// Quand l'agent ship, il remplace ce fichier intégralement par le vrai
// MasterCockpit (tabs Compétitions / Clubs / Rôles globaux / Finale fédérée).

import React from 'react';
import { GOLD, NAVY, INK, SERIF } from '@/components/design';

export default function MasterCockpit() {
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
          Master Cockpit · V2
        </span>
      </div>
      <h2
        className="text-[20px] mb-2"
        style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
      >
        Cockpit Master Admin
      </h2>
      <p className="text-[13.5px]" style={{ color: INK }}>
        Le cockpit master (compétitions, clubs, rôles globaux, finale fédérée) est
        en cours de construction.
      </p>
    </div>
  );
}
