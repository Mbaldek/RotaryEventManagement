// MembersPanel — onglet "Membres" du ClubEditView (Master Cockpit V2.5+).
//
// Extrait à l'identique de MembersSection (ClubEditor.jsx) pour pouvoir être
// utilisé dans la nouvelle vue d'édition tab-based, sans toucher ClubEditor.jsx
// qui reste fonctionnel pendant la transition. La logique CRUD
// club_memberships, l'invite + le garde-fou "last club_admin" sont inchangés.

import React, { useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  CREAM2, NAVY, MUTED, INK, SERIF,
} from '@/components/design';
import { DANGER, TINT_DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { UI, CLUBS, CLUB_ROLES } from '../i18n';
import {
  useClubMembers,
  useAssignClubRole,
  useRevokeClubRole,
} from '../useMaster';
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

function roleLabelFor(t, role) {
  if (role === 'club_admin') return t(CLUBS.roleClubAdmin);
  if (role === 'comite') return t(CLUBS.roleComite);
  if (role === 'jury') return t(CLUBS.roleJury);
  return role;
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

export default function MembersPanel({ club }) {
  const { t } = useLang();
  const members = useClubMembers(club.id);
  const assign = useAssignClubRole();
  const revoke = useRevokeClubRole();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('club_admin');
  const [error, setError] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);

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
    <div className="space-y-4">
      <header className="flex items-center gap-3 flex-wrap">
        <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(CLUBS.membersSection)}
        </h3>
        <span className="text-[12px]" style={{ color: MUTED }}>· {rows.length}</span>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ background: NAVY, color: 'white' }}
        >
          <Plus className="w-3.5 h-3.5" />
          {t(CLUBS.inviteAction)}
        </button>
      </header>
      <p className="text-[12px]" style={{ color: MUTED }}>{t(CLUBS.membersHint)}</p>

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
        className="rounded-[4px] p-3"
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
    </div>
  );
}
