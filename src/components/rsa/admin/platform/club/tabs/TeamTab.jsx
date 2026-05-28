// TeamTab (Club Cockpit) — onglet « Équipe » club-scoped.
//
// Décliné depuis RolesManager.jsx (legacy app_user_roles global), pattern adapté
// à club_memberships :
//   * Liste : rsa_list_club_members (RPC SECURITY DEFINER, restrict to master_admin
//     ou club_admin du club) — JOIN auth.users + profiles pour rendre l'email/nom.
//   * Provisionnement : (email, role) -> rsa_assign_club_role.
//   * Retrait : confirm typé "RETIRER" -> rsa_revoke_club_role.
//
// Le serveur applique :
//   - 'membership_must_exist_in_auth' si l'email n'a jamais signé in (R-V2 §2.4).
//     C'est attendu : on documente côté UI via CLUB_TEAM.loginNote.
//   - 'last_club_admin' garde-fou pour éviter qu'un club perde son seul admin.

import React, { useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { CREAM2, NAVY, MUTED, GOLD, INK, SERIF } from '@/components/design/tokens';
import { DANGER, TINT_DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { UI } from '../../i18n';
import { CLUB_TEAM, CLUB_ROLE_OPTIONS } from '../i18n';
import {
  useClubMembers,
  useAssignClubMember,
  useRevokeClubMember,
} from '../useClub';

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

// Renvoie un string (utilisé dans <option>, <li>, etc.) — pas un composant.
function roleLabelText(role, t) {
  if (role === 'club_admin') return t(CLUB_TEAM.roleClubAdmin);
  if (role === 'comite')     return t(CLUB_TEAM.roleComite);
  if (role === 'jury')       return t(CLUB_TEAM.roleJury);
  return role;
}

function RemoveButton({ email, role, onRevoke, busy }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState(null);

  async function onConfirm() {
    const expected = t(CLUB_TEAM.confirmRemoveTyped);
    if (typed !== expected) {
      setError(`${t(CLUB_TEAM.confirmRemoveTyped)} ?`);
      return;
    }
    setError(null);
    try {
      await onRevoke({ email, role });
      setOpen(false);
      setTyped('');
    } catch (err) {
      setError(err?.message || 'Error');
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
        style={{ color: DANGER, border: `1px solid ${CREAM2}` }}
        title={t(CLUB_TEAM.remove)}
      >
        <Trash2 className="w-3 h-3" /> {t(CLUB_TEAM.remove)}
      </button>
    );
  }

  return (
    <div
      className="rounded-[4px] p-3 mt-2 w-full"
      style={{ background: TINT_DANGER, border: `1px solid ${CREAM2}` }}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: DANGER }} />
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px]" style={{ color: NAVY }}>
            <strong>{t(CLUB_TEAM.confirmRemoveTitle)} — {email} ({role}).</strong>
          </p>
          <p className="text-[12px] mt-1" style={{ color: INK }}>{t(CLUB_TEAM.confirmRemoveBody)}</p>
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={t(CLUB_TEAM.confirmRemoveTyped)}
              className="flex-1 text-[12.5px] rounded-[4px] px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
            />
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy || typed !== t(CLUB_TEAM.confirmRemoveTyped)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50"
              style={{ background: DANGER, color: 'white' }}
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t(CLUB_TEAM.remove)}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setTyped(''); setError(null); }}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px]"
              style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
            >
              {t(UI.cancel)}
            </button>
          </div>
          {error && (
            <p className="text-[12px] mt-2" style={{ color: DANGER }}>{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TeamTab({ clubId }) {
  const { t } = useLang();
  const membersQ = useClubMembers(clubId);
  const assign   = useAssignClubMember(clubId);
  const revoke   = useRevokeClubMember(clubId);

  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('comite');
  const [createError, setCreateError] = useState(null);

  // Group rows par email pour affichage condensé : un membre cumule potentielle-
  // ment club_admin + comite + jury sur un même club (par ex. un président qui
  // siège aussi au comité). On affiche la liste de rôles par ligne email.
  const rowsByEmail = useMemo(() => {
    const map = new Map();
    for (const r of membersQ.data || []) {
      const email = String(r.email || '').toLowerCase();
      if (!map.has(email)) map.set(email, { email, full_name: r.full_name, user_id: r.user_id, roles: [] });
      map.get(email).roles.push({
        role: r.role,
        granted_at: r.granted_at,
        granted_by: r.granted_by,
      });
    }
    return Array.from(map.values()).sort((a, b) => a.email.localeCompare(b.email));
  }, [membersQ.data]);

  async function onAssignNew() {
    setCreateError(null);
    const email = newEmail.trim().toLowerCase();
    if (!email) {
      setCreateError(`${t(CLUB_TEAM.email)} ?`);
      return;
    }
    try {
      await assign.mutateAsync({ email, role: newRole });
      setNewEmail('');
    } catch (err) {
      setCreateError(err?.message || 'Error');
    }
  }

  return (
    <section
      className="rounded-[4px] p-5 mb-6"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      <header className="mb-4 flex items-center gap-3 flex-wrap">
        <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(CLUB_TEAM.sectionTitle)}
        </h3>
        <span className="text-[12px]" style={{ color: MUTED }}>· {rowsByEmail.length}</span>
      </header>

      {/* Provisionnement */}
      <div
        className="rounded-[4px] p-4 mb-5"
        style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
      >
        <h4 className="text-[13px] font-medium mb-3" style={{ color: NAVY }}>
          {t(CLUB_TEAM.assignTitle)}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <FieldLabel htmlFor="club-team-email">{t(CLUB_TEAM.email)}</FieldLabel>
            <input
              id="club-team-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={t(CLUB_TEAM.emailPlaceholder)}
              className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
            />
          </div>
          <div>
            <FieldLabel htmlFor="club-team-role">{t(CLUB_TEAM.role)}</FieldLabel>
            <select
              id="club-team-role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
            >
              {CLUB_ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{roleLabelText(r, t)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onAssignNew}
            disabled={assign.isPending || !newEmail.trim()}
            className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium disabled:opacity-50"
            style={{ background: NAVY, color: 'white' }}
          >
            {assign.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t(CLUB_TEAM.add)}
          </button>
          {createError && (
            <span className="text-[12px]" style={{ color: DANGER }}>{createError}</span>
          )}
        </div>
      </div>

      {/* Liste */}
      {membersQ.isLoading && (
        <div className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {membersQ.isError && (
        <p className="text-[12.5px]" style={{ color: DANGER }}>{t(UI.loadError)}</p>
      )}

      {!membersQ.isLoading && !membersQ.isError && rowsByEmail.length === 0 && (
        <p className="text-[13px] py-3" style={{ color: MUTED }}>{t(CLUB_TEAM.noMembers)}</p>
      )}

      {!membersQ.isLoading && rowsByEmail.length > 0 && (
        <ul className="divide-y" style={{ borderColor: CREAM2 }}>
          {rowsByEmail.map((row) => (
            <li key={row.email} className="py-3 flex items-start gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <p className="text-[13px] font-medium" style={{ color: NAVY }}>
                  {row.full_name ? `${row.full_name} · ` : ''}{row.email}
                </p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {row.roles.map((r) => (
                    <li
                      key={r.role}
                      className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-0.5 rounded-full"
                      style={{ background: '#fdf6e8', color: NAVY, border: `1px solid ${CREAM2}` }}
                    >
                      <span style={{ color: GOLD }}>·</span>
                      {roleLabelText(r.role, t)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-1 items-end w-full sm:w-auto">
                {row.roles.map((r) => (
                  <RemoveButton
                    key={r.role}
                    email={row.email}
                    role={r.role}
                    busy={revoke.isPending}
                    onRevoke={(vars) => revoke.mutateAsync(vars)}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Note d'usage */}
      <p
        className="text-[11.5px] mt-5 px-3 py-2 rounded-[4px]"
        style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}`, color: INK }}
      >
        {t(CLUB_TEAM.loginNote)}
      </p>
    </section>
  );
}
