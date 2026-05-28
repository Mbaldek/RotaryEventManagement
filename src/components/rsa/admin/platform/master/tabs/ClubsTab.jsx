// ClubsTab — Master Cockpit, onglet « Clubs ».
//
// V2.5 refonte 2026-05-31 :
//   - Form de création utilise <ClubForm> partagé (4 sections empilées hairline gold)
//   - ID auto-généré côté serveur depuis le nom — plus de champ "Identifiant" exposé
//   - Le clic sur un club ouvre le ClubEditor enrichi (lecture seule + bouton Éditer)
//
// La gestion des membres reste portée par ClubEditor (inchangée).

import React, { useMemo, useState } from 'react';
import { Loader2, Plus, ChevronRight, X } from 'lucide-react';
import {
  CREAM2, NAVY, MUTED, INK, GOLD, SERIF,
} from '@/components/design';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { UI, CLUBS } from '../i18n';
import { useAllClubs, useCreateClub, useClubMembers } from '../useMaster';
import ClubEditor from '../ClubEditor';
import ClubForm from '../ClubForm';

function ClubCard({ club, isOpen, onOpen }) {
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

  // V2.5 : on affiche country (nouveau) ; fallback region pour clubs legacy non backfillés.
  const locTag = club.country || club.region || null;
  // Représentant : nouveau format (first/last) ; fallback contact_name.
  const repName = (club.contact_first_name || club.contact_last_name)
    ? `${club.contact_first_name || ''} ${club.contact_last_name || ''}`.trim()
    : club.contact_name || null;

  return (
    <li
      className="rounded-[4px] p-4"
      style={{
        background: isOpen ? '#fdf6e8' : 'white',
        border: `1px solid ${isOpen ? GOLD : CREAM2}`,
      }}
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
          onClick={() => onOpen(isOpen ? null : club.id)}
          className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ background: isOpen ? NAVY : 'white', color: isOpen ? 'white' : NAVY, border: `1px solid ${isOpen ? NAVY : CREAM2}` }}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <>
              <X className="w-3.5 h-3.5" /> {t(UI.close)}
            </>
          ) : (
            <>
              {t(CLUBS.openClub)} <ChevronRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </li>
  );
}

export default function ClubsTab() {
  const { t } = useLang();
  const list = useAllClubs();
  const create = useCreateClub();

  const [openId, setOpenId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState(null);
  // Petite clé qui force le remount de ClubForm pour reset les champs après création.
  const [formKey, setFormKey] = useState(0);

  const clubs = useMemo(() => list.data || [], [list.data]);
  const openClub = useMemo(() => clubs.find((c) => c.id === openId) || null, [clubs, openId]);

  async function onCreate(payload) {
    setFormError(null);
    try {
      const created = await create.mutateAsync(payload);
      setShowForm(false);
      setFormKey((k) => k + 1);
      if (created?.id) {
        setOpenId(created.id);
      }
    } catch (err) {
      setFormError(err?.message || 'Error');
    }
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
          onClick={() => {
            setShowForm((v) => !v);
            setFormError(null);
            setFormKey((k) => k + 1);
          }}
          className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ background: NAVY, color: 'white' }}
        >
          <Plus className="w-4 h-4" /> {t(CLUBS.newClub)}
        </button>
      </header>

      {showForm && (
        <div
          className="rounded-[4px] p-5 mb-4"
          style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
        >
          <h4
            className="text-[16px] mb-4"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {t(CLUBS.newClub)}
          </h4>
          <ClubForm
            key={formKey}
            mode="create"
            submitting={create.isPending}
            onSubmit={onCreate}
            onCancel={() => {
              setShowForm(false);
              setFormError(null);
              setFormKey((k) => k + 1);
            }}
            submitError={formError}
          />
        </div>
      )}

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
            <React.Fragment key={c.id}>
              <ClubCard
                club={c}
                isOpen={openId === c.id}
                onOpen={setOpenId}
              />
              {openId === c.id && openClub && (
                <li>
                  <ClubEditor club={openClub} onClose={() => setOpenId(null)} />
                </li>
              )}
            </React.Fragment>
          ))}
        </ul>
      )}
    </section>
  );
}
