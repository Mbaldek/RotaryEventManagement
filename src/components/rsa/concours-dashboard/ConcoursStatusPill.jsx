// ConcoursStatusPill v2 — pill statut session avec teinte session-aware (V3).
//
// Refonte : le pill prend désormais des tint* optionnels (bg/border/fg) pour
// s'aligner sur la palette thématique de la session quand il est rendu sur
// une card colorée. Si aucun tint passé, on retombe sur la sémantique Élysée
// d'origine (live = rouge, locked = ambré, published = sage, draft = neutre).
//
// Comportement inchangé : si days < 0 et status != 'published', on bascule
// en "Terminée".

import React from 'react';
import { Check, Calendar, Lock } from 'lucide-react';
import { CREAM, CREAM2, INK, MUTED, GREEN_TODAY } from '@/components/design/tokens';

const DEFAULT_PALETTE = {
  draft: { bg: 'white', border: CREAM2, fg: INK, icon: Calendar },
  live: { bg: 'rgba(220,38,38,0.10)', border: 'rgba(220,38,38,0.35)', fg: '#b91c1c', icon: null },
  locked: { bg: 'rgba(201,168,76,0.10)', border: 'rgba(201,168,76,0.45)', fg: '#8a6b1f', icon: Lock },
  published: { bg: 'rgba(29,107,79,0.10)', border: 'rgba(29,107,79,0.35)', fg: GREEN_TODAY, icon: Check },
  finished: { bg: CREAM, border: CREAM2, fg: MUTED, icon: Check },
};

export default function ConcoursStatusPill({ status, days, T, t, tintBg, tintBorder, tintFg }) {
  let key = status || 'draft';
  if (key === 'draft' && typeof days === 'number' && days < 0) {
    key = 'finished';
  }

  const palette = DEFAULT_PALETTE[key] || DEFAULT_PALETTE.draft;
  const Icon = palette.icon;

  // Live status keeps its red regardless of session theme color (semantic).
  // For other statuses, if tintBg/tintBorder/tintFg passed, override the
  // default neutral chrome to align with the session palette.
  const usesTint = key !== 'live' && tintBg && tintBorder && tintFg;
  const bg = usesTint ? tintBg : palette.bg;
  const border = usesTint ? tintBorder : palette.border;
  const fg = usesTint ? tintFg : palette.fg;

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
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[10.5px] font-semibold uppercase tracking-[0.1em] whitespace-nowrap"
      style={{ background: bg, border: `1px solid ${border}`, color: fg }}
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
