// ClubEditor — édition d'un club (Master Cockpit V2.5).
//
// Sections :
//   * En-tête           : id (eyebrow gold), name, bouton Fermer + bouton Éditer
//   * Informations du club (4 sections empilées, hairline gold)
//       - Mode lecture : tous les nouveaux champs V2.5 affichés en read-only
//       - Mode édition : <ClubForm mode="edit"> avec save/cancel
//     L'ID reste TOUJOURS read-only (jamais modifiable après création).
//   * Membres : assign/revoke (inchangé V2)
//
// V2.5 refonte 2026-05-31 — bascule entre lecture et édition via useUpdateClub.

import React, { useMemo, useState } from 'react';
import { Loader2, Plus, X, Trash2, AlertTriangle, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import {
  CREAM2, NAVY, MUTED, INK, GOLD, SERIF,
} from '@/components/design';
import { DANGER, TINT_DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { UI, CLUBS, CLUB_ROLES, COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from './i18n';
import {
  useClubMembers,
  useAssignClubRole,
  useRevokeClubRole,
  useUpdateClub,
} from './useMaster';
import ClubForm, { clubRowToForm } from './ClubForm';
// V2.5 — Invite users
import { InviteUserModal } from '@/components/rsa/invite';

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

// ── Hairline gold + uppercase eyebrow (pattern Élysée — mirror ClubForm). ──
function SectionHeader({ children }) {
  return (
    <div className="flex items-center gap-2.5 mb-3 mt-1">
      <span
        className="h-[1.5px] w-7"
        style={{ background: GOLD }}
        aria-hidden
      />
      <span
        className="uppercase text-[10px] tracking-[0.18em] font-medium"
        style={{ color: GOLD }}
      >
        {children}
      </span>
    </div>
  );
}

// ── Read-only row : libellé + valeur (ou « Non renseigné »). ───────────────
function ReadRow({ label, value, className = '' }) {
  const { t } = useLang();
  const isEmpty = value == null || value === '';
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span
        className="text-[11px] uppercase tracking-[0.12em] font-medium"
        style={{ color: INK }}
      >
        {label}
      </span>
      <span
        className="text-[13.5px] whitespace-pre-line"
        style={{ color: isEmpty ? MUTED : NAVY }}
      >
        {isEmpty ? t(CLUBS.notProvided) : value}
      </span>
    </div>
  );
}

function roleLabelFor(t, role) {
  if (role === 'club_admin') return t(CLUBS.roleClubAdmin);
  if (role === 'comite') return t(CLUBS.roleComite);
  if (role === 'jury') return t(CLUBS.roleJury);
  return role;
}

// ── ClubInfoSection : 4 sections en read-only OU le ClubForm en mode edit ──
function ClubInfoSection({ club }) {
  const { t, lang } = useLang();
  const update = useUpdateClub();
  const [editing, setEditing] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Look-up labels FR/EN/DE depuis les catalogs (pour affichage read-only).
  const countryLabel = useMemo(() => {
    if (!club.country) return null;
    const opt = COUNTRY_OPTIONS.find((c) => c.code === club.country);
    return opt ? `${opt[lang] || opt.fr} (${opt.code})` : club.country;
  }, [club.country, lang]);
  const languageLabel = useMemo(() => {
    if (!club.language) return null;
    const opt = LANGUAGE_OPTIONS.find((l) => l.code === club.language);
    return opt ? (opt[lang] || opt.fr) : club.language;
  }, [club.language, lang]);

  // Fallback : si V2.5 vide ET legacy V2 rempli, on affiche le legacy.
  const repName = (club.contact_first_name || club.contact_last_name)
    ? `${club.contact_first_name || ''} ${club.contact_last_name || ''}`.trim()
    : (club.contact_name || null);

  async function onSave(payload) {
    setSubmitError(null);
    try {
      await update.mutateAsync(payload);
      setEditing(false);
    } catch (err) {
      setSubmitError(err?.message || 'Error');
    }
  }

  return (
    <section
      className="rounded-[4px] p-5 mb-2"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      <header className="mb-4 flex items-center gap-3 flex-wrap">
        <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(CLUBS.clubInfoSectionTitle)}
        </h3>
        {!editing && (
          <button
            type="button"
            onClick={() => { setEditing(true); setSubmitError(null); }}
            className="ml-auto inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}
          >
            <Pencil className="w-3.5 h-3.5" /> {t(CLUBS.editClubAction)}
          </button>
        )}
      </header>

      {editing ? (
        <ClubForm
          mode="edit"
          clubId={club.id}
          initial={clubRowToForm(club)}
          submitting={update.isPending}
          onSubmit={onSave}
          onCancel={() => { setEditing(false); setSubmitError(null); }}
          submitError={submitError}
        />
      ) : (
        <div className="space-y-5">
          {/* 1. Informations du club */}
          <div>
            <SectionHeader>{t(CLUBS.sectionClubInfo)}</SectionHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ReadRow
                label={t(CLUBS.nameLabel)}
                value={club.name}
                className="md:col-span-2"
              />
              <ReadRow
                label={t(CLUBS.generatedIdLabel)}
                value={<span className="font-mono">{club.id}</span>}
                className="md:col-span-2"
              />
              <ReadRow label={t(CLUBS.countryLabel)}    value={countryLabel} />
              <ReadRow label={t(CLUBS.languageLabel)}   value={languageLabel} />
            </div>
          </div>

          {/* 2. Représentant */}
          <div>
            <SectionHeader>{t(CLUBS.sectionContact)}</SectionHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ReadRow label={t(CLUBS.firstNameLabel)} value={club.contact_first_name || (repName ? repName.split(' ')[0] : null)} />
              <ReadRow label={t(CLUBS.lastNameLabel)}  value={club.contact_last_name  || (repName ? repName.split(' ').slice(1).join(' ') || null : null)} />
              <ReadRow label={t(CLUBS.emailLabel)}     value={club.contact_email} />
              <ReadRow label={t(CLUBS.phoneLabel)}     value={club.contact_phone} />
            </div>
          </div>

          {/* 3. Président */}
          <div>
            <SectionHeader>{t(CLUBS.sectionPresident)}</SectionHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ReadRow label={t(CLUBS.firstNameLabel)} value={club.president_first_name} />
              <ReadRow label={t(CLUBS.lastNameLabel)}  value={club.president_last_name} />
              <ReadRow
                label={t(CLUBS.emailLabel)}
                value={club.president_email}
                className="md:col-span-2"
              />
            </div>
          </div>

          {/* 4. Coordonnées institutionnelles */}
          <div>
            <SectionHeader>{t(CLUBS.sectionAddress)}</SectionHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ReadRow label={t(CLUBS.clubEmailLabel)}   value={club.club_email} />
              <ReadRow label={t(CLUBS.clubPhoneLabel)}   value={club.club_phone} />
              <ReadRow
                label={t(CLUBS.clubAddressLabel)}
                value={club.club_address}
                className="md:col-span-2"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function RevokeButton({ club, member, onRevoke }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function onConfirm() {
    setBusy(true);
    setError(null);
    try {
      await onRevoke({ email: member.email, clubId: club.id, role: member.role });
      setOpen(false);
    } catch (err) {
      // last_admin guard côté RPC : code 23503 + texte 'dernier club_admin'
      const msg = err?.message || '';
      if (/dernier club_admin/i.test(msg) || /last.*club.*admin/i.test(msg)) {
        setError(t(CLUBS.lastClubAdmin));
      } else {
        setError(msg || 'Error');
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11.5px] px-2 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
        style={{ color: DANGER, border: `1px solid ${CREAM2}` }}
        title={t(UI.remove)}
      >
        <Trash2 className="w-3 h-3" /> {t(UI.remove)}
      </button>
    );
  }

  return (
    <div
      className="rounded-[4px] p-2 w-full"
      style={{ background: TINT_DANGER, border: `1px solid ${CREAM2}` }}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: DANGER }} />
        <div className="flex-1 min-w-0">
          <p className="text-[12px]" style={{ color: NAVY }}>
            <strong>{t(CLUBS.revokeConfirm)}</strong> {member.email} · {roleLabelFor(t, member.role)}
          </p>
          <div className="mt-2 flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-[12px] font-medium disabled:opacity-50"
              style={{ background: DANGER, color: 'white' }}
            >
              {busy && <Loader2 className="w-3 h-3 animate-spin" />}
              {t(UI.remove)}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setError(null); }}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-[12px]"
              style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
            >
              {t(UI.cancel)}
            </button>
          </div>
          {error && (
            <p className="text-[11.5px] mt-1.5" style={{ color: DANGER }}>{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MembersSection({ club }) {
  const { t } = useLang();
  const members = useClubMembers(club.id);
  const assign = useAssignClubRole();
  const revoke = useRevokeClubRole();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('club_admin');
  const [error, setError] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false); // V2.5

  const rows = useMemo(() => members.data || [], [members.data]);

  async function onAssign() {
    setError(null);
    const e = email.trim().toLowerCase();
    if (!e) {
      setError(t(UI.email));
      return;
    }
    try {
      await assign.mutateAsync({ email: e, clubId: club.id, role });
      setEmail('');
    } catch (err) {
      // user introuvable côté RPC : code 23503 + texte 'n'existe pas encore'
      const code = err?.code || '';
      const msg = err?.message || '';
      if (code === '23503' && /n['’]existe pas|does not exist/i.test(msg)) {
        setError(t(CLUBS.userNotFound));
      } else {
        setError(msg || 'Error');
      }
    }
  }

  return (
    <section
      className="rounded-[4px] p-5 mb-2"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      <header className="mb-3 flex items-center gap-3 flex-wrap">
        <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(CLUBS.membersSection)}
        </h3>
        <span className="text-[12px]" style={{ color: MUTED }}>· {rows.length}</span>
        {/* V2.5 — bouton Inviter (ouvre InviteUserModal scope=club) */}
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ background: NAVY, color: 'white' }}
        >
          <Plus className="w-3.5 h-3.5" />
          {t({ fr: 'Inviter', en: 'Invite', de: 'Einladen' })}
        </button>
      </header>
      <p className="text-[12px] mb-3" style={{ color: MUTED }}>{t(CLUBS.membersHint)}</p>

      {inviteOpen && (
        <InviteUserModal
          scope="club"
          clubId={club.id}
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

      <div
        className="rounded-[4px] p-3 mb-4"
        style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
      >
        <h4 className="text-[13px] font-medium mb-3" style={{ color: NAVY }}>
          {t(CLUBS.assignRole)}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
          <div>
            <FieldLabel htmlFor="assign-email">{t(UI.email)}</FieldLabel>
            <input
              id="assign-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(CLUBS.emailPlaceholder)}
              className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
            />
          </div>
          <div>
            <FieldLabel htmlFor="assign-role">{t(CLUBS.roleLabel)}</FieldLabel>
            <select
              id="assign-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
            >
              {CLUB_ROLES.map((r) => (
                <option key={r} value={r}>{roleLabelFor(t, r)}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={onAssign}
            disabled={assign.isPending || !email.trim()}
            className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium disabled:opacity-50"
            style={{ background: NAVY, color: 'white' }}
          >
            {assign.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t(UI.add)}
          </button>
        </div>
        {error && (
          <p className="text-[12px] mt-2" style={{ color: DANGER }}>{error}</p>
        )}
      </div>

      {members.isLoading && (
        <div className="py-4 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {members.isError && (
        <p className="text-[12.5px]" style={{ color: DANGER }}>{t(UI.loadError)}</p>
      )}

      {!members.isLoading && !members.isError && rows.length === 0 && (
        <p className="text-[13px] py-2" style={{ color: MUTED }}>{t(CLUBS.noMembers)}</p>
      )}

      {!members.isLoading && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ color: MUTED }}>
                <th className="text-left uppercase tracking-[0.14em] text-[10.5px] py-2 pr-3">
                  {t(CLUBS.memberColEmail)}
                </th>
                <th className="text-left uppercase tracking-[0.14em] text-[10.5px] py-2 pr-3">
                  {t(CLUBS.memberColRole)}
                </th>
                <th className="text-left uppercase tracking-[0.14em] text-[10.5px] py-2 pr-3">
                  {t(CLUBS.memberColGranted)}
                </th>
                <th className="text-right uppercase tracking-[0.14em] text-[10.5px] py-2">
                  {t(CLUBS.memberColActions)}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={`${m.email}-${m.role}`} className="border-t" style={{ borderColor: CREAM2 }}>
                  <td className="py-2 pr-3 align-top">
                    <p className="font-medium" style={{ color: NAVY }}>{m.email}</p>
                    {m.full_name && (
                      <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>{m.full_name}</p>
                    )}
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        background: m.role === 'club_admin' ? '#fdf6e8' : '#eff1f6',
                        color: NAVY,
                        border: `1px solid ${CREAM2}`,
                      }}
                    >
                      {roleLabelFor(t, m.role)}
                    </span>
                  </td>
                  <td className="py-2 pr-3 align-top text-[11.5px]" style={{ color: MUTED }}>
                    {m.granted_at ? String(m.granted_at).slice(0, 10) : '—'}
                  </td>
                  <td className="py-2 align-top text-right">
                    <RevokeButton
                      club={club}
                      member={m}
                      onRevoke={(vars) => revoke.mutateAsync(vars)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function ClubEditor({ club, onClose }) {
  const { t } = useLang();
  if (!club) return null;
  return (
    <div
      className="rounded-[4px] p-4 mt-2"
      style={{ background: 'white', border: `1px solid ${GOLD}` }}
    >
      <header className="mb-4 flex items-center gap-3 flex-wrap">
        <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(CLUBS.editorTitle)}
        </h3>
        <span className="uppercase tracking-[0.14em] text-[10.5px]" style={{ color: GOLD }}>
          {club.id}
        </span>
        {club.country && (
          <span className="text-[11.5px]" style={{ color: MUTED }}>· {club.country}</span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="ml-auto inline-flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
          style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
        >
          <X className="w-3.5 h-3.5" /> {t(UI.close)}
        </button>
      </header>

      {/* V2.5 — Section "Informations du club" enrichie (read-only + edit mode) */}
      <ClubInfoSection club={club} />

      <MembersSection club={club} />
    </div>
  );
}
