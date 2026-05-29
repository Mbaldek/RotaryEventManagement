// SessionJurorsList — panneau "Composition du jury" pour une session.
//
// Rendu sous chaque session dans le SessionsManager du Club Cockpit. Affiche
// la liste des jurés assignés (avec badge role 'regular' / 'special') + bouton
// "Ajouter un juré" qui ouvre AddJurorModal.
//
// Permissions : la frontière de sécu est SERVEUR (RPC SECURITY DEFINER côté
// rsa_assign_juror / rsa_remove_juror — voir migration 20260604).

import React, { useState } from 'react';
import { Loader2, Plus, Trash2, UserPlus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { CREAM2, NAVY, MUTED, INK, GOLD, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { SESSION_JURY } from '@/components/rsa/admin/platform/master/i18n';
import {
  useSessionJurors,
  useRemoveJuror,
  isJurorRemovalBlockedByScores,
} from './useJury';
import AddJurorModal from './AddJurorModal';

function RoleBadge({ role }) {
  const { t } = useLang();
  if (role === 'special') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em]"
        style={{ background: '#fdf6e8', color: NAVY, border: `1px solid ${GOLD}` }}
        title={t(SESSION_JURY.roleSpecialHint)}
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} aria-hidden />
        {t(SESSION_JURY.roleSpecial)}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em]"
      style={{ background: 'white', color: NAVY, border: `1px solid ${CREAM2}` }}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: NAVY }} aria-hidden />
      {t(SESSION_JURY.roleRegular)}
    </span>
  );
}

function GhostHint() {
  const { t } = useLang();
  return (
    <span
      className="inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 text-[10px]"
      style={{ background: TINT_ADMIN, color: MUTED, border: `1px solid ${CREAM2}` }}
      title={t(SESSION_JURY.ghostBadge)}
    >
      {t(SESSION_JURY.ghostBadge)}
    </span>
  );
}

function JurorRow({ row, onRemove, busy }) {
  const { t } = useLang();
  const p = row.profile || {};
  const displayName =
    p.qualite
      ? p.qualite + (p.organisation ? ' · ' + p.organisation : '')
      : (p.organisation || row.jury_user_id?.slice(0, 8) || '—');
  const isGhost = !p.auth_linked_at;
  return (
    <li
      className="py-2.5 flex items-center gap-3 flex-wrap"
      style={{ borderTop: `1px solid ${CREAM2}` }}
    >
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0"
        style={{ background: row.role === 'special' ? '#fdf6e8' : 'white', border: `1px solid ${CREAM2}` }}
        aria-hidden
      >
        {row.role === 'special'
          ? <UserPlus className="w-3.5 h-3.5" style={{ color: GOLD }} />
          : <UserCheck className="w-3.5 h-3.5" style={{ color: NAVY }} />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium" style={{ color: NAVY }}>
            {displayName}
          </span>
          <RoleBadge role={row.role} />
          {isGhost && <GhostHint />}
        </div>
        {p.bio && (
          <p className="text-[11.5px] mt-0.5 line-clamp-2" style={{ color: INK }}>{p.bio}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] disabled:opacity-50"
        style={{ color: DANGER, border: `1px solid ${CREAM2}`, background: 'white' }}
        title={t(SESSION_JURY.remove)}
      >
        {busy
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <Trash2 className="w-3 h-3" />}
        {t(SESSION_JURY.remove)}
      </button>
    </li>
  );
}

export default function SessionJurorsList({ sessionId, clubId }) {
  const { t } = useLang();
  const jurorsQ = useSessionJurors(sessionId);
  const remove = useRemoveJuror(sessionId);

  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function handleRemove(juryUserId) {
    setBusyId(juryUserId);
    try {
      await remove.mutateAsync({ juryUserId });
      toast.success(t(SESSION_JURY.jurorRemoved));
    } catch (err) {
      if (isJurorRemovalBlockedByScores(err)) {
        toast.error(t(SESSION_JURY.removeBlockedScores));
      } else {
        toast.error(err?.message || 'Error');
      }
    } finally {
      setBusyId(null);
    }
  }

  const rows = jurorsQ.data || [];

  return (
    <section
      className="rounded-[4px] p-3 mt-2"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      aria-label={t(SESSION_JURY.sectionTitle)}
    >
      <header className="flex items-center gap-2 flex-wrap mb-1.5">
        <h5
          className="text-[12.5px] uppercase tracking-[0.14em] font-medium"
          style={{ color: NAVY, fontFamily: SERIF }}
        >
          {t(SESSION_JURY.sectionTitle)}
        </h5>
        <span className="text-[11.5px]" style={{ color: MUTED }}>· {rows.length}</span>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
          style={{ background: NAVY, color: 'white' }}
        >
          <Plus className="w-3.5 h-3.5" />
          {t(SESSION_JURY.addJuror)}
        </button>
      </header>

      <p className="text-[11.5px] mb-1" style={{ color: MUTED }}>
        {t(SESSION_JURY.sectionHint)}
      </p>

      {jurorsQ.isLoading && (
        <div className="py-3 flex justify-center">
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {!jurorsQ.isLoading && rows.length === 0 && (
        <p className="text-[12px] py-2" style={{ color: MUTED }}>
          {t(SESSION_JURY.empty)}
        </p>
      )}

      {!jurorsQ.isLoading && rows.length > 0 && (
        <ul className="mt-1">
          {rows.map((r) => (
            <JurorRow
              key={r.jury_user_id}
              row={r}
              busy={busyId === r.jury_user_id}
              onRemove={() => handleRemove(r.jury_user_id)}
            />
          ))}
        </ul>
      )}

      {modalOpen && (
        <AddJurorModal
          sessionId={sessionId}
          clubId={clubId}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  );
}
