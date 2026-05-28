// ConcoursStatusPill — pill de statut session (Élysée navy/gold + sémantique).
//
// Reproduit visuellement le pattern RsaJuryHub V1 (SessionStatusBadge) tout en
// restant strictement dans la palette Élysée :
//   - draft     -> "À venir" (gris muted, fond cream)
//   - live      -> "En direct" (rouge vif, point pulsant)
//   - locked    -> "Notations closes" (orange ambré)
//   - published -> "Résultats publiés" (vert sage)
// Si days < 0 et status != 'published', on affiche "Terminée" (souvent une
// session live qui a passé minuit sans être encore lockée).
//
// Props :
//   status : 'draft' | 'live' | 'locked' | 'published'
//   days   : number | null — issu de computeCountdown si applicable
//   t      : function de useLang() (déjà résolu côté parent)
//   T      : dictionnaire i18n (UI de concours-dashboard/i18n.js)

import React from 'react';
import { Check, Calendar, Lock } from 'lucide-react';
import { CREAM, CREAM2, INK, MUTED, GREEN_TODAY } from '@/components/design/tokens';

const PALETTE = {
  draft: { bg: 'white', border: CREAM2, fg: INK, icon: Calendar },
  live: { bg: 'rgba(220,38,38,0.10)', border: 'rgba(220,38,38,0.35)', fg: '#b91c1c', icon: null },
  locked: { bg: 'rgba(201,168,76,0.10)', border: 'rgba(201,168,76,0.45)', fg: '#8a6b1f', icon: Lock },
  published: { bg: 'rgba(29,107,79,0.10)', border: 'rgba(29,107,79,0.35)', fg: GREEN_TODAY, icon: Check },
  finished: { bg: CREAM, border: CREAM2, fg: MUTED, icon: Check },
};

export default function ConcoursStatusPill({ status, days, T, t }) {
  // Resolved label.
  let key = status || 'draft';
  // Si la session est draft mais la date est passée, on bascule en "Terminée".
  if (key === 'draft' && typeof days === 'number' && days < 0) {
    key = 'finished';
  }

  const palette = PALETTE[key] || PALETTE.draft;
  const Icon = palette.icon;

  const label = (() => {
    switch (key) {
      case 'live': return t(T.statusLive);
      case 'locked': return t(T.statusLocked);
      case 'published': return t(T.statusPublished);
      case 'finished': return t(T.statusFinished);
      case 'draft':
      default: return t(T.statusDraft);
    }
  })();

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[10.5px] font-medium uppercase tracking-[0.1em]"
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.fg,
      }}
    >
      {key === 'live' && (
        <span
          aria-hidden
          className="inline-block"
          style={{
            width: 7,
            height: 7,
            background: '#dc2626',
            borderRadius: '50%',
            animation: 'concoursStatusPulse 1.5s ease-in-out infinite',
          }}
        />
      )}
      {key !== 'live' && Icon && <Icon className="w-3 h-3" />}
      {label}
      <style>{`
        @keyframes concoursStatusPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </span>
  );
}
