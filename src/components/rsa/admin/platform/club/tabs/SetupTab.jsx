// SetupTab (Club Cockpit) — onglet « Configuration » club-scoped.
//
// Compose le seul panneau pertinent pour un club_admin local : SessionsManager
// avec clubId injecté (filtre + verrouille la création sur le club courant).
// On NE rend PAS EditionEditor ici : la compétition est définie par le master
// admin, le club_admin ne doit pas pouvoir modifier les métadonnées globales
// (dates, prix, statut). Pour overrider les règles d'éligibilité du club, voir
// l'onglet « Règles » qui ne touche QUE edition_clubs.eligibility_rules.
//
// Pourquoi pas RolesManager non plus : les rôles plateforme (admin global) sont
// out-of-scope club. La gestion d'équipe scoped club passe par TeamTab.

import React from 'react';
import { CREAM2, MUTED, INK, GOLD, NAVY, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { usePlatformAuth } from '@/lib/platform/auth';
import { UI } from '../../i18n';
import { CLUB_SETUP } from '../i18n';
import SessionsManager from '../../SessionsManager';
import OtherClubsSection from '../OtherClubsSection';

export default function SetupTab({ edition, clubId, sessions, isSessionsLoading, onSelectSession }) {
  const { t } = useLang();
  const { roles, hasClubRole, isMasterAdmin } = usePlatformAuth();

  // OtherClubsSection est strictement réservé aux club_admin : les master_admin
  // et competition_admin disposent déjà de la liste complète des clubs participants
  // dans leurs cockpits dédiés (ClubsTab du Master + onglet correspondant).
  const isCompetitionAdmin = Array.isArray(roles) && roles.includes('competition_admin');
  const isClubAdminOfThis = clubId && typeof hasClubRole === 'function'
    ? hasClubRole(clubId, 'club_admin')
    : false;
  const showOtherClubs = isClubAdminOfThis && !isMasterAdmin && !isCompetitionAdmin;

  if (!edition) {
    return (
      <div
        className="rounded-[4px] p-6 text-center"
        style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
      >
        <p className="text-[13px]" style={{ color: MUTED }}>{t(UI.loading)}</p>
      </div>
    );
  }

  return (
    <>
      {/* Intro — explique le rôle de cet onglet vs Master Cockpit. */}
      <section
        className="rounded-[4px] p-5 mb-6"
        style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
      >
        <h3
          className="text-[18px] mb-2"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {edition.name}
        </h3>
        <p className="text-[13px]" style={{ color: INK }}>{t(CLUB_SETUP.intro)}</p>
        <p
          className="text-[12px] mt-3 px-3 py-2 rounded-[4px]"
          style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}`, color: NAVY }}
        >
          <span className="uppercase tracking-[0.14em] text-[10.5px] mr-2" style={{ color: GOLD }}>·</span>
          {t(CLUB_SETUP.fluidityHint)}
        </p>
      </section>

      <SessionsManager
        editionId={edition.id}
        sessions={sessions || []}
        isLoading={isSessionsLoading}
        onSelectSession={onSelectSession}
        clubId={clubId}
      />

      {showOtherClubs && (
        <OtherClubsSection editionId={edition.id} clubId={clubId} />
      )}
    </>
  );
}
