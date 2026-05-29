// LiveTab (Club Cockpit) — onglet « En direct » club-scoped.
//
// Wrapper trivial autour du LiveTab legacy : la session sélectionnée a déjà été
// filtrée par club (cf. ClubCockpit.useClubSessions). On ajoute juste une garde
// : si la session passée appartient à un AUTRE club que clubId (cas pathologique
// d'une URL deep-link copiée), on refuse de l'afficher pour ne pas masquer la
// frontière de scope côté UI.
//
// Le RPC de lock/publish accepte déjà master_admin OU club_admin du club_id de
// la session (cf. migration 20260529_rsa_v2_extend_rpcs.sql), donc aucune adap-
// tation côté serveur n'est nécessaire.

import React from 'react';
import { CREAM2, MUTED, TINT_ADMIN } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { LIVE } from '../../i18n';
import LegacyLiveTab from '../../tabs/LiveTab';

export default function LiveTab({ edition, clubId, session }) {
  const { t } = useLang();

  // Garde scope : si une session étrangère est passée (URL deep-link copiée),
  // on ne la rend pas. La RLS la masquerait de toute façon côté serveur sur les
  // requêtes de scoring, mais on évite l'affichage trompeur d'un cadre vide.
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

  return <LegacyLiveTab edition={edition} session={session} />;
}
