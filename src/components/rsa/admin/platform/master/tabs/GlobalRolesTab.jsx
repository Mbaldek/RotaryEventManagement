// GlobalRolesTab — Master Cockpit, onglet « Rôles globaux ».
//
// Réutilise EXACTEMENT le RolesManager du M4a (rôles dans app_user_roles :
// startup / jury / comite / admin et le futur master_admin). Le wrapping ici
// se contente d'ajouter un disclaimer pour bien faire comprendre au master_admin
// que les rôles club_admin / comité / jury PAR CLUB sont dans Clubs → [club] →
// Membres.
//
// On NE duplique PAS le composant : on le compose pour rester sur une seule
// source de vérité (RolesManager.jsx).

import React, { useState } from 'react';
import { Info, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { CREAM2, NAVY, INK, GOLD, SERIF } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { ROLES } from '../i18n';
import RolesManager from '../../RolesManager';
import { InviteUserModal } from '@/components/rsa/invite';

export default function GlobalRolesTab() {
  const { t } = useLang();
  const [inviteOpen, setInviteOpen] = useState(false);
  return (
    <section className="mb-6">
      <header className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(ROLES.sectionTitle)}
        </h3>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[4px] text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ background: NAVY, color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          {t({ fr: 'Inviter un administrateur', en: 'Invite an administrator', de: 'Administrator/in einladen' })}
        </button>
      </header>

      <div
        className="rounded-[4px] p-3 mb-5 flex items-start gap-2.5"
        style={{ background: '#eff1f6', border: `1px solid ${CREAM2}` }}
      >
        <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: GOLD }} />
        <p className="text-[12.5px]" style={{ color: INK }}>
          {t(ROLES.disclaimer)}
        </p>
      </div>

      <RolesManager />

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
          }}
        />
      )}
    </section>
  );
}
