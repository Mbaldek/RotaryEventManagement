// ScoreCell — cellule de la grille LIVE (Module 4a), portée Élysée.
//
// Trois états (cf. blueprint §2.3 "Cell shape") :
//   * — (MUTED)                                : pas de draft.
//   * n/6 (OCHRE/WARNING tint, tabular-nums)    : draft partiel (n critères saisis).
//   * N.NN (NAVY sur ACCENT/SOFT, tabular-nums) : score final soumis.
//
// Diffère du ScoreCell legacy (off-palette ambers/emerald/rose) : on reste sur la
// palette Élysée + StatusPill tokens (CREAM2 hairlines, NAVY texte, GOLD pour le
// score final). Pas de couleurs sémantiques par tranche de score — la donnée parle.

import React from 'react';
import { CREAM2, NAVY, MUTED, GOLD, INK } from '@/components/design/tokens';
import { TINT_WARNING, WARNING } from '@/components/design/tokens.app';
import { CRITERIA, criteriaFilledCount, weightedScore } from '@/lib/rsa/constants';

const EMPTY_STYLE = {
  width: 64,
  height: 36,
  color: MUTED,
};

const PARTIAL_STYLE = {
  width: 64,
  height: 36,
  background: TINT_WARNING,
  color: WARNING,
  border: `1px solid ${CREAM2}`,
};

const FINAL_STYLE = {
  width: 64,
  height: 36,
  background: '#fdf6e8',
  color: NAVY,
  border: `1px solid ${CREAM2}`,
};

export default function ScoreCell({ draft, score, onClick, weights }) {
  // Score final emporte (la grille montre le N.NN définitif quand on a un score row).
  if (score) {
    const w = weightedScore(score, weights);
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center justify-center rounded-[4px] text-[13px] font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] hover:brightness-95 transition-[filter]"
        style={FINAL_STYLE}
        aria-label={`Score ${w != null ? w.toFixed(2) : '—'} sur 5`}
        title={`Note finale : ${w != null ? w.toFixed(2) : '—'} / 5`}
      >
        <span style={{ color: GOLD }}>{w != null ? w.toFixed(2) : '—'}</span>
      </button>
    );
  }

  // Draft partiel — n/6 + barre fine.
  if (draft) {
    const filled = criteriaFilledCount(draft);
    if (filled > 0) {
      const pct = (filled / CRITERIA.length) * 100;
      return (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex flex-col items-center justify-center gap-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] hover:brightness-95 transition-[filter]"
          style={PARTIAL_STYLE}
          title={`${filled} / ${CRITERIA.length} critères saisis`}
          aria-label={`${filled} sur ${CRITERIA.length} critères`}
        >
          <span className="text-[10px] tabular-nums font-medium">{filled}/{CRITERIA.length}</span>
          <span className="block h-[2px] w-9 rounded-full overflow-hidden" style={{ background: CREAM2 }}>
            <span className="block h-full" style={{ width: `${pct}%`, background: WARNING }} aria-hidden />
          </span>
        </button>
      );
    }
  }

  // Aucun draft / draft vide.
  return (
    <span
      className="inline-flex items-center justify-center text-[14px] tabular-nums"
      style={EMPTY_STYLE}
      aria-label="Aucun brouillon"
    >
      <span style={{ color: INK, opacity: 0.4 }}>—</span>
    </span>
  );
}
