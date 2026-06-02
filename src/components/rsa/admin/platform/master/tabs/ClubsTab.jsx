// ClubsTab — Master Cockpit, onglet « Clubs ».
//
// V2.5+ refonte 2026-05-28 :
//   - Création d'un club : modal funnel (ClubFunnel) backdrop-blur, autosave
//     debounced 600 ms après création. Plus de form inline.
//   - Édition d'un club : navigation URL state `?subview=edit-club&id={clubId}`
//     pour basculer le cockpit en mode plein-écran ClubEditView. Plus de panel
//     inline qui se déploie.
//   - La card Club ne s'expand plus : un click sur "Ouvrir" navigue.

import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Plus, ArrowRight } from 'lucide-react';
import {
  CREAM2, NAVY, MUTED, INK, GOLD, SERIF,
} from '@/components/design/tokens';
import { DANGER, FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { UI, CLUBS } from '../i18n';
import { useAllClubs, useClubMembers } from '../useMaster';
import ClubFunnel from '../ClubFunnel';

function ClubRow({ club, onOpen }) {
  const { t } = useLang();
  const members = useClubMembers(club.id);
  const memberCount = (members.data || []).length;
  const byRole = useMemo(() => {
    const out = { club_admin: 0, comite: 0, jury: 0 };
    for (const m of members.data || []) {
      if (m.role in out) out[m.role] += 1;
    }
    return out;
  }, [members.data]);

  const locTag = club.country || club.region || null;
  const repName = (club.contact_first_name || club.contact_last_name)
    ? `${club.contact_first_name || ''} ${club.contact_last_name || ''}`.trim()
    : club.contact_name || null;

  // Sous-ligne récap membres
  const memberSummary = members.isLoading
    ? null
    : memberCount === 0
      ? null
      : [
          `${memberCount} ${t(CLUBS.membersCount)}`,
          byRole.club_admin > 0 ? `${byRole.club_admin} admin` : null,
          byRole.comite > 0 ? `${byRole.comite} comité` : null,
          byRole.jury > 0 ? `${byRole.jury} jury` : null,
        ]
          .filter(Boolean)
          .join(' · ');

  return (
    <li style={{ borderBottom: `1px solid ${CREAM2}` }}>
      <button
        type="button"
        onClick={() => onOpen(club.id)}
        className={`group w-full text-left grid grid-cols-[auto_1fr_auto] items-center gap-5 py-5 outline-none transition-colors hover:bg-[#faf7f0] ${FOCUS_RING_CLASS}`}
      >
        {/* Eyebrow localisation */}
        <span
          className="uppercase text-[11px] tracking-[0.14em] self-start pt-0.5 w-16 shrink-0 truncate"
          style={{ color: GOLD, fontFamily: SERIF }}
        >
          {locTag || '—'}
        </span>

        {/* Centre : nom + sous-lignes */}
        <span className="min-w-0">
          <span
            className="block text-[20px] leading-tight"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {club.name}
          </span>

          {(repName || club.contact_email) && (
            <span className="block text-[12px] mt-0.5 truncate" style={{ color: INK }}>
              {repName}
              {repName && club.contact_email && (
                <span style={{ color: MUTED }}> · </span>
              )}
              {club.contact_email && (
                <span style={{ color: MUTED }}>{club.contact_email}</span>
              )}
            </span>
          )}

          {members.isLoading ? (
            <span className="mt-0.5 inline-flex items-center gap-1 text-[11.5px]" style={{ color: MUTED }}>
              <Loader2 className="w-3 h-3 animate-spin" aria-hidden /> {t(UI.loading)}
            </span>
          ) : memberSummary ? (
            <span className="block text-[11.5px] mt-0.5" style={{ color: MUTED }}>
              {memberSummary}
            </span>
          ) : null}
        </span>

        {/* Flèche */}
        <ArrowRight
          className="w-4 h-4 mr-1 shrink-0 transition-transform group-hover:translate-x-0.5"
          style={{ color: NAVY }}
          aria-hidden
        />
      </button>
    </li>
  );
}

export default function ClubsTab() {
  const { t } = useLang();
  const [, setParams] = useSearchParams();
  const list = useAllClubs();

  const [createOpen, setCreateOpen] = useState(false);

  const clubs = useMemo(() => list.data || [], [list.data]);

  function openClub(clubId) {
    // Refonte hiérarchie : le tab racine 'clubs' n'existe plus, l'annuaire est
    // rendu dans OverviewPanel. On revient sur ?tab=overview après fermeture
    // de ClubEditView.
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('tab', 'overview');
      p.set('subview', 'edit-club');
      p.set('id', clubId);
      return p;
    }, { replace: false });
  }

  return (
    <section className="mb-6">
      {/* Header éditorial */}
      <header className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="h-[1.5px]" style={{ background: GOLD, width: 48 }} aria-hidden />
          <span className="uppercase text-[10px] tracking-[0.18em] font-medium" style={{ color: GOLD }}>
            {t(CLUBS.sectionTitle)}
          </span>
          <span className="text-[12px]" style={{ color: MUTED }}>· {clubs.length}</span>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className={`ml-auto inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] ${FOCUS_RING_CLASS}`}
            style={{ background: NAVY, color: 'white' }}
          >
            <Plus className="w-4 h-4" aria-hidden /> {t(CLUBS.newClub)}
          </button>
        </div>
      </header>

      <ClubFunnel
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(row) => {
          // V2.6 fix N2 : aligne le comportement avec CompetitionsTab —
          // après fermeture du funnel, on bascule sur la vue édition du
          // club fraîchement créé (continuité UX, l'autosave a déjà persisté
          // tous les champs, l'EditView permet d'éditer les Membres en plus).
          if (row?.id) openClub(row.id);
        }}
      />

      {list.isLoading && (
        <div className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {list.isError && (
        <p className="text-[12.5px]" style={{ color: DANGER }}>{t(UI.loadError)}</p>
      )}

      {!list.isLoading && !list.isError && clubs.length === 0 && (
        <p className="text-[13px] py-3 italic" style={{ fontFamily: SERIF, color: MUTED }}>{t(CLUBS.noClubs)}</p>
      )}

      {!list.isLoading && clubs.length > 0 && (
        <ul className="list-none m-0 p-0" style={{ borderTop: `1px solid ${CREAM2}` }}>
          {clubs.map((c) => (
            <ClubRow key={c.id} club={c} onOpen={openClub} />
          ))}
        </ul>
      )}
    </section>
  );
}
