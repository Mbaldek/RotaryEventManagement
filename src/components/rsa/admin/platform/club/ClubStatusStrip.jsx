// ClubStatusStrip — bande hairline en haut du Club Cockpit (V2, étape 6).
//
// Décliné depuis ModuleStatusStrip.jsx mais scopé club : N sessions draft/live/
// published · M candidatures · K jurés assignés. Rendu si une édition est sélec-
// tionnée ; sinon, on affiche un message « pas d'édition active ».
//
// Pas de requêtes supplémentaires si les hooks parent les ont déjà chargées (les
// queries TanStack sont déduplicatées par queryKey).

import React from 'react';
import { CREAM2, NAVY, MUTED, GOLD, INK, TINT_ADMIN } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { CLUB_UI } from './i18n';
import { useClubStartupsSummary, useClubJuryAssignmentsCount } from './useClub';

function Dot({ color }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
      style={{ background: color }}
      aria-hidden
    />
  );
}

export default function ClubStatusStrip({ edition, clubId, sessions }) {
  const { t } = useLang();
  const summary = useClubStartupsSummary(edition?.id, clubId);
  const jurySum = useClubJuryAssignmentsCount(edition?.id, clubId);

  if (!edition) {
    return (
      <div
        className="rounded-[4px] px-4 py-2.5 mb-5 text-[12.5px]"
        style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: INK }}
      >
        {t(CLUB_UI.stripNoEdition)}
      </div>
    );
  }

  const all = sessions || [];
  const draftN     = all.filter((s) => (s.config?.status || 'draft') === 'draft').length;
  const liveN      = all.filter((s) => s.config?.status === 'live').length;
  const publishedN = all.filter((s) => s.config?.status === 'published').length;

  const counts = summary.data || {};
  const totalCandidates = counts.__total__ || 0;
  const uniqueJurors = jurySum.data?.uniqueJurors || 0;

  return (
    <div
      className="rounded-[4px] px-4 py-2.5 mb-6 flex items-center gap-x-5 gap-y-2 flex-wrap text-[12px]"
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
    >
      <span className="uppercase tracking-[0.14em] text-[10.5px]" style={{ color: MUTED }}>
        {t(CLUB_UI.edition)} · {edition.name}
      </span>
      <span style={{ color: CREAM2 }} aria-hidden>·</span>

      <span className="inline-flex items-center gap-1.5" style={{ color: NAVY }}>
        <Dot color={GOLD} />
        <strong className="tabular-nums">{all.length}</strong>
        <span style={{ color: INK }}>{t(CLUB_UI.stripSessions)}</span>
        <span style={{ color: MUTED }}>
          ({draftN}/{liveN}/{publishedN})
        </span>
      </span>

      <span className="inline-flex items-center gap-1.5" style={{ color: NAVY }}>
        <Dot color={GOLD} />
        <strong className="tabular-nums">{totalCandidates}</strong>
        <span style={{ color: INK }}>{t(CLUB_UI.stripCandidates)}</span>
      </span>

      <span className="inline-flex items-center gap-1.5" style={{ color: NAVY }}>
        <Dot color={GOLD} />
        <strong className="tabular-nums">{uniqueJurors}</strong>
        <span style={{ color: INK }}>{t(CLUB_UI.stripJurors)}</span>
      </span>
    </div>
  );
}
