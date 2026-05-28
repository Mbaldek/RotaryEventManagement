// ClubsTab — Master Cockpit, onglet « Clubs ».
//
// Liste tous les clubs, form de création (id, name, region, contact_email, contact_name).
// Le clic sur un club ouvre le ClubEditor en panneau inline (membres, assign/revoke).

import React, { useMemo, useState } from 'react';
import { Loader2, Plus, ChevronRight, X } from 'lucide-react';
import {
  CREAM2, NAVY, MUTED, INK, GOLD, SERIF,
} from '@/components/design';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { UI, CLUBS, KEBAB_REGEX } from '../i18n';
import { useAllClubs, useCreateClub, useClubMembers } from '../useMaster';
import ClubEditor from '../ClubEditor';

function FieldLabel({ children, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block uppercase tracking-[0.14em] text-[10.5px] mb-1.5"
      style={{ color: MUTED }}
    >
      {children}
    </label>
  );
}

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
            {club.region && (
              <span className="text-[11.5px]" style={{ color: GOLD }}>· {club.region}</span>
            )}
          </div>
          <p className="text-[11px] mt-0.5 font-mono" style={{ color: MUTED }}>{club.id}</p>
          {(club.contact_name || club.contact_email) && (
            <p className="text-[12px] mt-1" style={{ color: INK }}>
              {club.contact_name}
              {club.contact_name && club.contact_email && <span style={{ color: MUTED }}> · </span>}
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
  const [form, setForm] = useState({ id: '', name: '', region: '', contactEmail: '', contactName: '' });
  const [formError, setFormError] = useState(null);

  const clubs = useMemo(() => list.data || [], [list.data]);
  const openClub = useMemo(() => clubs.find((c) => c.id === openId) || null, [clubs, openId]);

  function resetForm() {
    setForm({ id: '', name: '', region: '', contactEmail: '', contactName: '' });
    setFormError(null);
  }

  async function onCreate() {
    setFormError(null);
    const id = String(form.id || '').trim().toLowerCase();
    const name = String(form.name || '').trim();
    if (!id || !KEBAB_REGEX.test(id)) {
      setFormError(t(CLUBS.invalidId));
      return;
    }
    if (!name) {
      setFormError(t(CLUBS.nameLabel));
      return;
    }
    try {
      await create.mutateAsync({
        id,
        name,
        region: form.region?.trim() || null,
        contactEmail: form.contactEmail?.trim() || null,
        contactName: form.contactName?.trim() || null,
      });
      setShowForm(false);
      resetForm();
      setOpenId(id);
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
          onClick={() => setShowForm((v) => !v)}
          className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ background: NAVY, color: 'white' }}
        >
          <Plus className="w-4 h-4" /> {t(CLUBS.newClub)}
        </button>
      </header>

      {showForm && (
        <div
          className="rounded-[4px] p-4 mb-4"
          style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="new-club-id">{t(CLUBS.idLabel)}</FieldLabel>
              <input
                id="new-club-id"
                type="text"
                value={form.id}
                onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))}
                placeholder="berlin"
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
              />
              <p className="mt-1 text-[11px]" style={{ color: MUTED }}>{t(CLUBS.idHint)}</p>
            </div>
            <div>
              <FieldLabel htmlFor="new-club-name">{t(CLUBS.nameLabel)}</FieldLabel>
              <input
                id="new-club-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Rotary Club Berlin"
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
              />
            </div>
            <div>
              <FieldLabel htmlFor="new-club-region">{t(CLUBS.regionLabel)}</FieldLabel>
              <input
                id="new-club-region"
                type="text"
                value={form.region}
                onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                placeholder="Berlin"
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
              />
            </div>
            <div>
              <FieldLabel htmlFor="new-club-contact-name">{t(CLUBS.contactNameLabel)}</FieldLabel>
              <input
                id="new-club-contact-name"
                type="text"
                value={form.contactName}
                onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
              />
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="new-club-contact-email">{t(CLUBS.contactEmailLabel)}</FieldLabel>
              <input
                id="new-club-contact-email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
                placeholder={t(CLUBS.emailPlaceholder)}
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onCreate}
              disabled={create.isPending}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50"
              style={{ background: NAVY, color: 'white' }}
            >
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {t(UI.create)}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm(); }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-[12.5px]"
              style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
            >
              {t(UI.cancel)}
            </button>
            {formError && (
              <span className="text-[12px]" style={{ color: DANGER }}>{formError}</span>
            )}
          </div>
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
