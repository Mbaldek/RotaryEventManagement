// ResultsTab (Club Cockpit) — onglet « Résultats » club-scoped.
//
// Wrapper trivial autour du ResultsTab legacy : on lui passe uniquement les
// sessions du club (filtrées par ClubCockpit), donc la vue cross-session
// affichera juste les sessions de Paris (par ex.) et pas celles des autres.
// La session sélectionnée est elle aussi déjà filtrée par club.

import React from 'react';
import { CREAM2, MUTED, TINT_ADMIN } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { LIVE } from '../../i18n';
import LegacyResultsTab from '../../tabs/ResultsTab';

export default function ResultsTab({ edition, clubId, session, sessions, onSelectSession }) {
  const { t } = useLang();

  if (session && clubId && session.club_id && session.club_id !== clubId) {
    return (
      <div
        className="rounded-[4px] p-6 text-center"
        style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
      >
        <p className="text-[13px]" style={{ color: MUTED }}>{t(LIVE.pickSession)}</p>
      </div>
    );
  }

  return (
    <LegacyResultsTab
      edition={edition}
      session={session}
      sessions={sessions}
      onSelectSession={onSelectSession}
    />
  );
}
