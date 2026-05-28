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
import { Loader2, Plus, ChevronRight } from 'lucide-react';
import {
  CREAM2, NAVY, MUTED, INK, GOLD, SERIF,
} from '@/components/design';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { UI, CLUBS } from '../i18n';
import { useAllClubs, useClubMembers } from '../useMaster';
import ClubFunnel from '../ClubFunnel';

function ClubCard({ club, onOpen }) {
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

  return (
    <li
      className="group rounded-[4px] p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm hover:border-[#c9a84c]/60"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className="text-[16px]"
              style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
            >
              {club.name}
            </h4>
            {locTag && (
              <span className="text-[11.5px]" style={{ color: GOLD }}>· {locTag}</span>
            )}
          </div>
          <p className="text-[11px] mt-0.5 font-mono" style={{ color: MUTED }}>{club.id}</p>
          {(repName || club.contact_email) && (
            <p className="text-[12px] mt-1" style={{ color: INK }}>
              {repName}
              {repName && club.contact_email && <span style={{ color: MUTED }}> · </span>}
              {club.contact_email && (
                <span style={{ color: MUTED }}>{club.contact_email}</span>
              )}
            </p>
          )}
          <div className="mt-2 flex items-center gap-x-3 gap-y-1 flex-wrap text-[12px]" style={{ color: INK }}>
            {members.isLoading ? (
              <span className="inline-flex items-center gap-1.5" style={{ color: MUTED }}>
                <Loader2 className="w-3 h-3 animate-spin" /> {t(UI.loading)}
              </span>
            ) : (
              <>
                <span><strong className="tabular-nums">{memberCount}</strong> {t(CLUBS.membersCount)}</span>
                {memberCount > 0 && (
                  <>
                    <span style={{ color: CREAM2 }}>·</span>
                    <span style={{ color: MUTED }}>
                      {byRole.club_admin > 0 && (<><strong className="tabular-nums" style={{ color: NAVY }}>{byRole.club_admin}</strong> admin </>)}
                      {byRole.comite > 0 && (<><strong className="tabular-nums" style={{ color: NAVY }}>{byRole.comite}</strong> comité </>)}
                      {byRole.jury > 0 && (<><strong className="tabular-nums" style={{ color: NAVY }}>{byRole.jury}</strong> jury</>)}
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpen(club.id)}
          className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ background: 'white', color: NAVY, border: `1px solid ${CREAM2}` }}
        >
          {t(CLUBS.openClub)} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
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
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('tab', 'clubs');
      p.set('subview', 'edit-club');
      p.set('id', clubId);
      return p;
    }, { replace: false });
  }

  return (
    <section className="mb-6">
      <header className="mb-4 flex items-center gap-3 flex-wrap">
        <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(CLUBS.sectionTitle)}
        </h3>
        <span className="text-[12px]" style={{ color: MUTED }}>· {clubs.length}</span>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ background: NAVY, color: 'white' }}
        >
          <Plus className="w-4 h-4" /> {t(CLUBS.newClub)}
        </button>
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
        <p className="text-[13px] py-3" style={{ color: MUTED }}>{t(CLUBS.noClubs)}</p>
      )}

      {!list.isLoading && clubs.length > 0 && (
        <ul className="space-y-3">
          {clubs.map((c) => (
            <ClubCard key={c.id} club={c} onOpen={openClub} />
          ))}
        </ul>
      )}
    </section>
  );
}
