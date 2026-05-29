// RolesTab — onglet « Rôles » du CompetitionEditView (master_admin OU
// competition_admin de l'édition). Deux sections :
//
//   1. Admins compétition : liste des competition_admins de l'édition
//      (RPC rsa_list_competition_admins). Master only peut INVITE/REVOKE
//      (rsa_grant_competition_admin / rsa_revoke_competition_admin) ; les
//      competition_admin voient en lecture seule.
//
//   2. Équipes des clubs participants : pour chaque club attaché à l'édition
//      (useClubsForEdition), un panneau expandable affichant les membres
//      (club_admin / comité / jury) avec bouton « Inviter » (InviteUserModal
//      scope='club') et bouton « Retirer ». Les RPC rsa_list_club_members /
//      rsa_assign_club_role / rsa_revoke_club_role ont été étendues en
//      20260603 pour accepter competition_admin de l'édition.
//
// Pas de gate de rôle côté composant : la frontière sécurité est serveur
// (les RPC retournent 0 row ou 403 si non autorisé). Le composant masque
// simplement les CTAs « invite competition_admin » pour les non-master, car
// l'edge function `invite-user` refusera de toute façon.

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Loader2, Plus, ShieldCheck, Users, ChevronRight, ChevronDown,
  AlertTriangle, Trash2, Mail,
} from 'lucide-react';
import {
  CREAM2, NAVY, GOLD, MUTED, INK, SERIF, TINT_ADMIN,
} from '@/components/design/tokens';
import {
  DANGER, TINT_DANGER, FOCUS_RING_CLASS,
} from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { usePlatformAuth } from '@/lib/platform/auth';
import { supabase } from '@/lib/supabase';
import { inviteUser } from '@/lib/platform/userManagement';
import { InviteUserModal } from '@/components/rsa/invite';
import {
  useClubsForEdition,
  useClubMembers,
  useRevokeClubRole,
} from '../useMaster';
import { COMP_ADMINS, UI } from '../i18n';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLES_TAB_I18N = {
  introMaster: {
    fr: 'Gérez les admins de cette compétition (vous seul·e en tant que master), puis les équipes de chaque club participant (admin, comité, jury).',
    en: 'Manage this competition’s admins (master-only), then the team of each participating club (admin, committee, jury).',
    de: 'Verwalten Sie die Administratoren dieses Wettbewerbs (nur Master) und anschließend das Team jedes teilnehmenden Clubs (Admin, Ausschuss, Jury).',
  },
  introCompetition: {
    fr: 'Vous administrez cette compétition. Gérez les équipes des clubs participants ci-dessous (admin, comité, jury).',
    en: 'You administer this competition. Manage the participating clubs’ teams below (admin, committee, jury).',
    de: 'Sie verwalten diesen Wettbewerb. Verwalten Sie unten die Teams der teilnehmenden Clubs (Admin, Ausschuss, Jury).',
  },
  sectionClubsTitle: {
    fr: 'Équipes des clubs participants',
    en: 'Participating clubs’ teams',
    de: 'Teams der teilnehmenden Clubs',
  },
  noClubs: {
    fr: 'Aucun club attaché à cette compétition. Attachez d’abord un club via l’onglet Clubs.',
    en: 'No club attached to this competition yet. Attach a club first via the Clubs tab.',
    de: 'Diesem Wettbewerb ist noch kein Club zugeordnet. Fügen Sie zuerst über den Reiter Clubs einen Club hinzu.',
  },
  inviteMember: {
    fr: 'Inviter un membre',
    en: 'Invite a member',
    de: 'Mitglied einladen',
  },
  noMembers: {
    fr: 'Aucun membre dans ce club.',
    en: 'No members in this club yet.',
    de: 'Noch keine Mitglieder in diesem Club.',
  },
  membersCount: {
    fr: '{n} membre·s',
    en: '{n} members',
    de: '{n} Mitglieder',
  },
  removeRole: {
    fr: 'Retirer',
    en: 'Remove',
    de: 'Entfernen',
  },
  removeConfirm: {
    fr: 'Tapez RETIRER pour confirmer',
    en: 'Type REMOVE to confirm',
    de: 'Tippen Sie REMOVE zur Bestätigung',
  },
  removeWord: {
    fr: 'RETIRER',
    en: 'REMOVE',
    de: 'REMOVE',
  },
  removeError: {
    fr: 'Impossible de retirer ce rôle : ',
    en: 'Could not remove this role: ',
    de: 'Diese Rolle konnte nicht entfernt werden: ',
  },
  inviteSuccess: {
    fr: 'Invitation envoyée.',
    en: 'Invitation sent.',
    de: 'Einladung versendet.',
  },
  readOnlyForCompAdmin: {
    fr: 'Seul un master_admin peut promouvoir ou retirer un admin compétition.',
    en: 'Only a master_admin can promote or revoke a competition admin.',
    de: 'Nur ein master_admin kann eine·n Wettbewerbsadministrator·in ernennen oder entziehen.',
  },
};

// ── Hooks data ──────────────────────────────────────────────────────────────
function useCompetitionAdmins(editionId) {
  return useQuery({
    queryKey: ['rsa', 'master', 'competition-admins', editionId],
    enabled: !!editionId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rsa_list_competition_admins', {
        p_edition_id: editionId,
      });
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });
}

function useRevokeCompetitionAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ editionId, userId }) => {
      const { error } = await supabase.rpc('rsa_revoke_competition_admin', {
        p_user_id: userId,
        p_edition_id: editionId,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: ['rsa', 'master', 'competition-admins', vars.editionId],
      });
    },
  });
}

// ── Section 1 — Admins compétition ─────────────────────────────────────────
function CompetitionAdminsSection({ editionId, editionName, canMutate, t, lang }) {
  const adminsQ = useCompetitionAdmins(editionId);
  const revoke = useRevokeCompetitionAdmin();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteErr, setInviteErr] = useState(null);
  const [inviting, setInviting] = useState(false);

  const fmtDate = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
  };

  async function onInvite(e) {
    e?.preventDefault?.();
    setInviteErr(null);
    const normalized = inviteEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      setInviteErr(t(COMP_ADMINS.errInvalidEmail));
      return;
    }
    setInviting(true);
    try {
      const res = await inviteUser({
        email: normalized,
        role: 'competition_admin',
        editionId,
        lang,
      });
      if (!res?.ok) throw new Error(res?.error || 'invite_failed');
      toast.success(t(COMP_ADMINS.inviteSuccess));
      setInviteEmail('');
      setInviteOpen(false);
      adminsQ.refetch?.();
    } catch (err) {
      setInviteErr(t(COMP_ADMINS.inviteError) + (err?.message || ''));
    } finally {
      setInviting(false);
    }
  }

  async function onRevoke(row) {
    const word = t(ROLES_TAB_I18N.removeWord);
    const typed = window.prompt(`${word} ${row.email}`);
    if (!typed || typed.trim() !== `${word} ${row.email}`) return;
    try {
      await revoke.mutateAsync({ editionId, userId: row.user_id });
      toast.success(t(COMP_ADMINS.revokeSuccess));
    } catch (err) {
      toast.error(t(COMP_ADMINS.revokeError) + ' ' + (err?.message || ''));
    }
  }

  return (
    <section className="mb-8">
      <header className="mb-3 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4" style={{ color: GOLD }} aria-hidden />
            <h3 className="text-[16px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
              {t(COMP_ADMINS.sectionTitle)}
            </h3>
            <span className="text-[12px]" style={{ color: MUTED }}>
              · {(adminsQ.data || []).length}
            </span>
          </div>
          {!canMutate && (
            <p className="text-[11.5px]" style={{ color: MUTED }}>
              {t(ROLES_TAB_I18N.readOnlyForCompAdmin)}
            </p>
          )}
        </div>
        {canMutate && !inviteOpen && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-[4px] text-[13px] font-medium ${FOCUS_RING_CLASS}`}
            style={{ background: NAVY, color: 'white' }}
          >
            <Plus className="w-4 h-4" aria-hidden />
            {t(COMP_ADMINS.inviteButton)}
          </button>
        )}
      </header>

      {canMutate && inviteOpen && (
        <form
          onSubmit={onInvite}
          className="rounded-[4px] p-4 mb-4 flex flex-wrap items-end gap-3"
          style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
        >
          <div className="flex-1 min-w-[260px]">
            <label className="block uppercase tracking-[0.14em] text-[10.5px] mb-1.5" style={{ color: MUTED }}>
              {t(COMP_ADMINS.emailLabel)}
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={t(COMP_ADMINS.emailPlaceholder)}
              autoFocus
              disabled={inviting}
              className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
            />
            {editionName && (
              <p className="text-[11.5px] mt-1" style={{ color: MUTED }}>
                {t(COMP_ADMINS.modalSubtitle)} — <em>{editionName}</em>
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={inviting || !inviteEmail.trim()}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-[4px] text-[13px] font-medium ${FOCUS_RING_CLASS} disabled:opacity-50`}
            style={{ background: NAVY, color: 'white' }}
          >
            {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {inviting ? t(COMP_ADMINS.inviting) : t(COMP_ADMINS.inviteSubmit)}
          </button>
          <button
            type="button"
            onClick={() => { setInviteOpen(false); setInviteEmail(''); setInviteErr(null); }}
            disabled={inviting}
            className={`text-[13px] px-3 py-2 rounded-[4px] ${FOCUS_RING_CLASS}`}
            style={{ color: INK, background: 'white', border: `1px solid ${CREAM2}` }}
          >
            {t(UI.cancel)}
          </button>
          {inviteErr && (
            <p className="w-full text-[12.5px]" style={{ color: DANGER }} role="alert">
              {inviteErr}
            </p>
          )}
        </form>
      )}

      <div className="rounded-[4px] overflow-hidden" style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}>
        {adminsQ.isLoading && (
          <div className="py-6 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
          </div>
        )}
        {adminsQ.isError && (
          <p className="text-[12.5px] m-4 px-3 py-2 rounded-[4px]" role="alert"
             style={{ background: TINT_DANGER, border: `1px solid ${CREAM2}`, color: DANGER }}>
            {t(COMP_ADMINS.loadError)}
          </p>
        )}
        {!adminsQ.isLoading && !adminsQ.isError && (adminsQ.data || []).length === 0 && (
          <div className="p-6 text-center">
            <p className="text-[13px]" style={{ color: NAVY, fontFamily: SERIF, fontWeight: 500 }}>
              {t(COMP_ADMINS.empty)}
            </p>
            <p className="text-[12px] mt-1" style={{ color: MUTED }}>
              {t(COMP_ADMINS.emptyHint)}
            </p>
          </div>
        )}
        {!adminsQ.isLoading && !adminsQ.isError && (adminsQ.data || []).length > 0 && (
          <ul className="list-none m-0 p-0">
            {(adminsQ.data || []).map((row, idx) => (
              <li
                key={row.email || row.user_id || idx}
                className="px-4 py-3 flex items-center gap-4 flex-wrap"
                style={{ borderTop: idx === 0 ? 'none' : `1px solid ${CREAM2}` }}
              >
                <div className="flex-1 min-w-[200px]">
                  <p className="text-[13.5px]" style={{ color: NAVY, fontWeight: 500 }}>
                    {row.full_name || row.email || '—'}
                  </p>
                  <p className="text-[12px]" style={{ color: MUTED }}>{row.email}</p>
                </div>
                <div className="text-[11.5px]" style={{ color: INK }}>
                  <span className="uppercase tracking-[0.14em] text-[10.5px] mr-1.5" style={{ color: MUTED }}>
                    {t(COMP_ADMINS.colGrantedAt)}
                  </span>
                  {fmtDate(row.granted_at)}
                </div>
                {canMutate && (
                  <button
                    type="button"
                    onClick={() => onRevoke(row)}
                    disabled={revoke.isPending}
                    className={`text-[12px] px-2.5 py-1.5 rounded-[4px] ${FOCUS_RING_CLASS} disabled:opacity-50`}
                    style={{ color: DANGER, background: 'white', border: `1px solid ${CREAM2}` }}
                  >
                    {t(COMP_ADMINS.revokeAction)}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// ── Section 2 — Équipes par club ───────────────────────────────────────────
function roleBadgeColor(role) {
  if (role === 'club_admin') return { bg: '#fdf6e8', fg: NAVY };
  if (role === 'comite')     return { bg: TINT_ADMIN, fg: NAVY };
  if (role === 'jury')       return { bg: '#eef3ee', fg: NAVY };
  return { bg: TINT_ADMIN, fg: NAVY };
}

function ClubTeamPanel({ club, editionId, defaultOpen, t }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [inviteOpen, setInviteOpen] = useState(false);
  const membersQ = useClubMembers(open ? club.id : null);
  const revoke = useRevokeClubRole();

  const groupedByEmail = React.useMemo(() => {
    const map = new Map();
    for (const r of membersQ.data || []) {
      const key = String(r.email || '').toLowerCase();
      if (!map.has(key)) {
        map.set(key, { email: r.email, full_name: r.full_name, user_id: r.user_id, roles: [] });
      }
      map.get(key).roles.push({ role: r.role, granted_at: r.granted_at });
    }
    return Array.from(map.values()).sort((a, b) => (a.email || '').localeCompare(b.email || ''));
  }, [membersQ.data]);

  async function onRemove(email, role) {
    const word = t(ROLES_TAB_I18N.removeWord);
    const typed = window.prompt(`${word} ${email} (${role})`);
    if (!typed || typed.trim() !== `${word} ${email} (${role})`) return;
    try {
      await revoke.mutateAsync({ email, clubId: club.id, role });
      toast.success(t(COMP_ADMINS.revokeSuccess));
    } catch (err) {
      toast.error(t(ROLES_TAB_I18N.removeError) + (err?.message || ''));
    }
  }

  const clubName = club.club?.name || club.name || club.club_id || club.id;
  const totalMembers = (membersQ.data || []).length;

  return (
    <li
      className="rounded-[4px] overflow-hidden"
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${FOCUS_RING_CLASS}`}
        style={{ background: open ? '#fdf6e8' : TINT_ADMIN }}
        aria-expanded={open}
      >
        {open
          ? <ChevronDown className="w-4 h-4 shrink-0" style={{ color: GOLD }} aria-hidden />
          : <ChevronRight className="w-4 h-4 shrink-0" style={{ color: GOLD }} aria-hidden />}
        <Users className="w-4 h-4 shrink-0" style={{ color: MUTED }} aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] truncate" style={{ color: NAVY, fontWeight: 500 }}>
            {clubName}
          </p>
          {open && totalMembers > 0 && (
            <p className="text-[11.5px]" style={{ color: MUTED }}>
              {t(ROLES_TAB_I18N.membersCount).replace('{n}', String(totalMembers))}
            </p>
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4" style={{ borderTop: `1px solid ${CREAM2}` }}>
          <div className="flex justify-end my-3">
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium ${FOCUS_RING_CLASS}`}
              style={{ background: NAVY, color: 'white' }}
            >
              <Plus className="w-3.5 h-3.5" aria-hidden />
              {t(ROLES_TAB_I18N.inviteMember)}
            </button>
          </div>

          {membersQ.isLoading && (
            <div className="py-4 flex justify-center">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: MUTED }} />
            </div>
          )}
          {membersQ.isError && (
            <p className="text-[12px] px-3 py-2 rounded-[4px]" role="alert"
               style={{ background: TINT_DANGER, border: `1px solid ${CREAM2}`, color: DANGER }}>
              {t(UI.loadError)}
            </p>
          )}
          {!membersQ.isLoading && !membersQ.isError && groupedByEmail.length === 0 && (
            <p className="text-[12.5px] py-2" style={{ color: MUTED }}>
              {t(ROLES_TAB_I18N.noMembers)}
            </p>
          )}
          {!membersQ.isLoading && groupedByEmail.length > 0 && (
            <ul className="divide-y" style={{ borderColor: CREAM2 }}>
              {groupedByEmail.map((row) => (
                <li key={row.email} className="py-2.5 flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-[12.5px]" style={{ color: NAVY, fontWeight: 500 }}>
                      {row.full_name ? `${row.full_name} · ` : ''}{row.email}
                    </p>
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                      {row.roles.map((r) => {
                        const c = roleBadgeColor(r.role);
                        return (
                          <li
                            key={r.role}
                            className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full"
                            style={{ background: c.bg, color: c.fg, border: `1px solid ${CREAM2}` }}
                          >
                            <span style={{ color: GOLD }}>·</span>
                            {r.role}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {row.roles.map((r) => (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => onRemove(row.email, r.role)}
                        disabled={revoke.isPending}
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-[4px] ${FOCUS_RING_CLASS} disabled:opacity-50`}
                        style={{ color: DANGER, border: `1px solid ${CREAM2}`, background: 'white' }}
                      >
                        <Trash2 className="w-3 h-3" aria-hidden />
                        {t(ROLES_TAB_I18N.removeRole)} {r.role}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {inviteOpen && (
        <InviteUserModal
          scope="club"
          clubId={club.id || club.club_id}
          onClose={() => setInviteOpen(false)}
          onSuccess={() => {
            toast.success(t(ROLES_TAB_I18N.inviteSuccess));
            membersQ.refetch?.();
          }}
        />
      )}
    </li>
  );
}

// ── Component principal ────────────────────────────────────────────────────
export default function RolesTab({ editionId, editionName }) {
  const { t, lang } = useLang();
  const { isMasterAdmin } = usePlatformAuth();
  const clubsQ = useClubsForEdition(editionId);

  // Normalise les rows edition_clubs : useClubsForEdition renvoie soit un objet
  // {club_id, club: {...}} soit l'objet club nu selon le RPC ; on s'aligne sur
  // { id, club_id, name } pour le rendu.
  const clubs = React.useMemo(() => {
    const rows = clubsQ.data || [];
    return rows.map((r) => ({
      id: r.club?.id || r.club_id || r.id,
      club_id: r.club_id || r.id,
      name: r.club?.name || r.name || r.club_id || r.id,
      club: r.club,
    }));
  }, [clubsQ.data]);

  return (
    <section className="flex flex-col">
      <p className="text-[13px] mb-5" style={{ color: INK }}>
        {isMasterAdmin
          ? t(ROLES_TAB_I18N.introMaster)
          : t(ROLES_TAB_I18N.introCompetition)}
      </p>

      <CompetitionAdminsSection
        editionId={editionId}
        editionName={editionName}
        canMutate={isMasterAdmin}
        t={t}
        lang={lang}
      />

      <section>
        <header className="mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: GOLD }} aria-hidden />
          <h3 className="text-[16px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
            {t(ROLES_TAB_I18N.sectionClubsTitle)}
          </h3>
          <span className="text-[12px]" style={{ color: MUTED }}>· {clubs.length}</span>
        </header>

        {clubsQ.isLoading && (
          <div className="py-6 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
          </div>
        )}
        {clubsQ.isError && (
          <p className="text-[12.5px] px-3 py-2 rounded-[4px]" role="alert"
             style={{ background: TINT_DANGER, border: `1px solid ${CREAM2}`, color: DANGER }}>
            {t(UI.loadError)}
          </p>
        )}
        {!clubsQ.isLoading && !clubsQ.isError && clubs.length === 0 && (
          <div className="rounded-[4px] p-5 flex items-start gap-2.5"
               style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}>
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: GOLD }} aria-hidden />
            <p className="text-[12.5px]" style={{ color: INK }}>
              {t(ROLES_TAB_I18N.noClubs)}
            </p>
          </div>
        )}
        {clubs.length > 0 && (
          <ul className="list-none m-0 p-0 flex flex-col gap-2">
            {clubs.map((c, idx) => (
              <ClubTeamPanel
                key={c.id || idx}
                club={c}
                editionId={editionId}
                defaultOpen={idx === 0 && clubs.length === 1}
                t={t}
              />
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
