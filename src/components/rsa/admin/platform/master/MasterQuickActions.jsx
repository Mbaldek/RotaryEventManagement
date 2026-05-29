// MasterQuickActions — bloc « Lancer un cycle » réutilisable.
//
// Origine : extrait de OverviewPanel.jsx (v1 du Master Cockpit). Le retour
// utilisateur sur l'overview a été : « Kick off a cycle n'est pas une activité
// sur un main dashboard, c'est un bouton dans un menu. » → On retire le bloc de
// l'overview MAIS on sauve le composant ici pour pouvoir le réutiliser
// ailleurs (page setup dédiée, contextual menu, modal d'onboarding, etc.).
//
// PROPS
//   showEyebrow : boolean — affiche l'eyebrow « Lancer un cycle » au dessus
//                 de la liste (utile en page standalone, peut être désactivé
//                 quand l'eyebrow est rendu par le parent).
//   onCreated   : ({ kind, id }) => void — callback unique pour les 3 funnels.
//                 kind ∈ { 'competition', 'club', 'invite' }. id est null pour
//                 l'invite (juste un évènement « envoyée »).
//   className   : passthrough Tailwind du wrapper <section>.
//
// CONTRAINTES
//   - Tokens Élysée only (CREAM2/NAVY/INK/GOLD/GOLD_TEXT/MUTED).
//   - i18n trilingue via OVERVIEW dict de ./i18n (quickActionsEyebrow etc.).
//   - A11y : role=region + aria-labelledby pointant sur l'eyebrow.
//   - PAS d'effet de bord global (pas de toast ici — délégué au funnel).

import React, { useState } from 'react';
import {
  Plus, ArrowUpRight, Trophy, ShieldCheck, Users, Sparkles,
} from 'lucide-react';
import {
  CREAM2, NAVY, INK, GOLD, GOLD_TEXT, FOCUS_RING_CLASS, SERIF,
} from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { OVERVIEW } from './i18n';
import CompetitionFunnel from './CompetitionFunnel';
import ClubFunnel from './ClubFunnel';
import { InviteUserModal } from '@/components/rsa/invite';
import { toast } from 'sonner';

// QuickActionRow — chaque action = LIGNE hairline (anti L-Card-Grid).
// Icône gauche, lead Playfair + hint INK, CTA navy à droite. Voir
// blueprint §16 « L-Numbered-Hairline » / variante C-Single-Primary.
function QuickActionRow({ Icon, title, hint, onClick }) {
  return (
    <li
      className="grid grid-cols-[40px_1fr_auto] items-center gap-4 py-3.5 group"
      style={{ borderTop: `1px solid ${CREAM2}` }}
    >
      <span
        className="w-10 h-10 rounded-full inline-flex items-center justify-center"
        style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
        aria-hidden
      >
        <Icon className="w-4 h-4" style={{ color: GOLD }} />
      </span>
      <div className="min-w-0">
        <p
          className="text-[15px]"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {title}
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: INK }}>{hint}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium ${FOCUS_RING_CLASS} transition-transform group-hover:translate-x-0.5`}
        style={{ background: NAVY, color: 'white' }}
        aria-label={title}
      >
        <Plus className="w-3.5 h-3.5" /> <ArrowUpRight className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}

export default function MasterQuickActions({
  showEyebrow = true,
  onCreated,
  className = '',
}) {
  const { t } = useLang();

  // Modales locales (déclenchées par les 3 lignes).
  const [competitionFunnelOpen, setCompetitionFunnelOpen] = useState(false);
  const [clubFunnelOpen, setClubFunnelOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const labelledById = showEyebrow ? 'master-quick-actions-heading' : undefined;

  return (
    <section
      className={className}
      role="region"
      aria-labelledby={labelledById}
    >
      {showEyebrow && (
        <div className="flex items-center gap-2 mb-3">
          <span className="h-[1.5px] w-6" style={{ background: GOLD }} aria-hidden />
          <span
            id={labelledById}
            className="uppercase text-[10px] tracking-[0.18em] font-medium"
            style={{ color: GOLD_TEXT }}
          >
            {t(OVERVIEW.quickActionsEyebrow)}
          </span>
        </div>
      )}
      <ul style={{ borderBottom: `1px solid ${CREAM2}` }}>
        <QuickActionRow
          Icon={Sparkles}
          title={t(OVERVIEW.quickCreateCompetition)}
          hint={t(OVERVIEW.quickCreateCompetitionHint)}
          onClick={() => setCompetitionFunnelOpen(true)}
        />
        <QuickActionRow
          Icon={Users}
          title={t(OVERVIEW.quickCreateClub)}
          hint={t(OVERVIEW.quickCreateClubHint)}
          onClick={() => setClubFunnelOpen(true)}
        />
        <QuickActionRow
          Icon={ShieldCheck}
          title={t(OVERVIEW.quickInviteMember)}
          hint={t(OVERVIEW.quickInviteMemberHint)}
          onClick={() => setInviteOpen(true)}
        />
      </ul>

      {/* Modals déclenchées par Quick actions — toast déjà émis côté funnel ;
          on relaie juste l'id créé au parent via onCreated. */}
      <CompetitionFunnel
        open={competitionFunnelOpen}
        onClose={() => setCompetitionFunnelOpen(false)}
        onCreated={(newId) => {
          setCompetitionFunnelOpen(false);
          if (typeof onCreated === 'function') {
            onCreated({ kind: 'competition', id: newId });
          }
        }}
      />
      <ClubFunnel
        open={clubFunnelOpen}
        onClose={() => setClubFunnelOpen(false)}
        onCreated={(row) => {
          if (row?.id) {
            setClubFunnelOpen(false);
            if (typeof onCreated === 'function') {
              onCreated({ kind: 'club', id: row.id });
            }
          }
        }}
      />
      {inviteOpen && (
        <InviteUserModal
          scope="global"
          onClose={() => setInviteOpen(false)}
          onSuccess={(res) => {
            toast.success(t({
              fr: res?.was_already_existing
                ? 'Rôle mis à jour, email envoyé.'
                : 'Invitation envoyée.',
              en: res?.was_already_existing
                ? 'Role updated, email sent.'
                : 'Invitation sent.',
              de: res?.was_already_existing
                ? 'Rolle aktualisiert, E-Mail versendet.'
                : 'Einladung versendet.',
            }));
            setInviteOpen(false);
            if (typeof onCreated === 'function') {
              onCreated({ kind: 'invite', id: null });
            }
          }}
        />
      )}

      {/* Trophy import — gardé pour future variante "promote champion" qui
          réutilisera la même structure de ligne hairline. */}
      <span className="sr-only" aria-hidden><Trophy className="w-0 h-0" /></span>
    </section>
  );
}
