// STUB — EmailStudio (M9 Email Studio, V2 multi-club)
//
// Agent M9 livre l'implémentation complète (3 onglets : Composer / Templates /
// Historique). Ce stub permet juste au build de passer pendant que l'agent
// finalise ; il sera écrasé par le vrai composant.

import React from 'react';
import { GOLD, NAVY, INK, SERIF } from '@/components/design/tokens';

export default function EmailStudio({ clubId }) {
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
          Email Studio · V2 {clubId ? `· ${clubId}` : '(master)'}
        </span>
      </div>
      <h2
        className="text-[20px] mb-2"
        style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
      >
        Composez et envoyez en un clic
      </h2>
      <p className="text-[13.5px]" style={{ color: INK }}>
        L'Email Studio (composer + segmentations + templates + historique) est en
        cours de construction. Disponible dans quelques minutes.
      </p>
    </div>
  );
}
