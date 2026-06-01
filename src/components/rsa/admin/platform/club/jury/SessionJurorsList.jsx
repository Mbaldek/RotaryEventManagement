import React, { useState } from 'react';
import { Plus, Loader2, Check, X } from 'lucide-react';
import { NAVY, GOLD, MUTED, CREAM2 } from '@/components/design/tokens';
import { DANGER, FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { SESSION_JURY } from '@/components/rsa/admin/platform/master/i18n';
import { useSessionJurorRoster, useApproveJuror, useRemoveJurorFromSession } from './useJury';
import AddJurorModal from './AddJurorModal';

function JurorLine({ row, right }) {
  const sub = [row.qualite, row.organisation].filter(Boolean).join(' · ');
  return (
    <li className="flex items-center gap-3 py-1.5">
      <span className="flex-1 text-[12.5px]" style={{ color: NAVY }}>
        {row.full_name}{sub && <span style={{ color: MUTED }}> — {sub}</span>}
      </span>
      {right}
    </li>
  );
}

export default function SessionJurorsList({ sessionId, clubId }) {
  const { t } = useLang();
  const rosterQ = useSessionJurorRoster(sessionId);
  const approve = useApproveJuror(sessionId);
  const removeFromSession = useRemoveJurorFromSession(sessionId);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const assigned = rosterQ.data?.assigned || [];
  const pending = rosterQ.data?.pending || [];

  const run = async (id, fn) => {
    setBusyId(id);
    try { await fn(); } finally { setBusyId(null); }
  };

  return (
    <section className="rounded-[4px] p-3 mt-2" style={{ border: `1px solid ${CREAM2}` }} aria-label={t(SESSION_JURY.sectionTitle)}>
      <header className="flex items-center gap-2 mb-2">
        <h5 className="uppercase text-[10.5px] tracking-[0.14em] font-medium" style={{ color: MUTED }}>
          {t(SESSION_JURY.sectionTitle)}
        </h5>
        <span className="text-[11px]" style={{ color: MUTED }}>· {assigned.length} {t(SESSION_JURY.assignedShort)} · {pending.length} {t(SESSION_JURY.pendingShort)}</span>
        <button type="button" onClick={() => setModalOpen(true)}
          className={`ml-auto inline-flex items-center gap-1 text-[11.5px] px-2 py-1 rounded-[4px] ${FOCUS_RING_CLASS}`}
          style={{ background: NAVY, color: 'white' }}>
          <Plus className="w-3.5 h-3.5" aria-hidden /> {t(SESSION_JURY.addJuror)}
        </button>
      </header>

      {rosterQ.isLoading && <Loader2 className="w-4 h-4 animate-spin" style={{ color: GOLD }} aria-hidden />}

      {!rosterQ.isLoading && assigned.length === 0 && pending.length === 0 && (
        <p className="text-[12px]" style={{ color: MUTED }}>{t(SESSION_JURY.empty)}</p>
      )}

      {assigned.length > 0 && (
        <>
          <p className="uppercase text-[10px] tracking-[0.12em] mt-1 mb-0.5" style={{ color: GOLD }}>{t(SESSION_JURY.groupAssigned)}</p>
          <ul>
            {assigned.map((r) => (
              <JurorLine key={r.id} row={r} right={
                <button type="button" disabled={busyId === r.id}
                  onClick={() => run(r.id, () => removeFromSession.mutateAsync(r.id))}
                  className={`text-[11.5px] inline-flex items-center gap-1 ${FOCUS_RING_CLASS}`} style={{ color: DANGER }}>
                  <X className="w-3.5 h-3.5" aria-hidden /> {t(SESSION_JURY.remove)}
                </button>
              } />
            ))}
          </ul>
        </>
      )}

      {pending.length > 0 && (
        <>
          <p className="uppercase text-[10px] tracking-[0.12em] mt-2 mb-0.5" style={{ color: MUTED }}>{t(SESSION_JURY.groupPending)}</p>
          <ul>
            {pending.map((r) => (
              <JurorLine key={r.id} row={r} right={
                <button type="button" disabled={busyId === r.id}
                  onClick={() => run(r.id, () => approve.mutateAsync(r.id))}
                  className={`text-[11.5px] inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] ${FOCUS_RING_CLASS}`}
                  style={{ border: `1px solid ${CREAM2}`, color: NAVY }}>
                  <Check className="w-3.5 h-3.5" aria-hidden /> {t(SESSION_JURY.approve)}
                </button>
              } />
            ))}
          </ul>
        </>
      )}

      {modalOpen && <AddJurorModal sessionId={sessionId} clubId={clubId} onClose={() => setModalOpen(false)} />}
    </section>
  );
}
