// JuryAssignmentsAdmin — panneau admin-only embarqué dans la page Jury.
//
// Stopgap (pre-decided default #4) en attendant Module 4 : permet à un admin
// d'assigner / retirer des jurés × sessions sans quitter la page Jury.
//
// Source jurés : app_user_roles WHERE 'jury' ∈ roles (lecture admin only).
// Source sessions : RsaSession.filter({ edition_id }) sur l'édition active.
//
// UI : matrice checkbox juré × session. Toggle = useAssignJuror / useUnassignJuror.

import React, { useMemo, useState } from 'react';
import { Loader2, Settings2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import {
  NAVY,
  INK,
  MUTED,
  GOLD,
  CREAM2,
  SERIF,
} from '@/components/design/tokens';
import { DANGER, TINT_DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import {
  useAllAssignments,
  useJurorsDirectory,
  useSessionsForEdition,
  useAssignJuror,
  useUnassignJuror,
} from './useJury';
import { UI } from './i18n';
import { compareSessions } from './constants';

export default function JuryAssignmentsAdmin({ editionId, adminUserId }) {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [toggleError, setToggleError] = useState(false);

  const jurors = useJurorsDirectory();
  const sessions = useSessionsForEdition(editionId);
  const assignments = useAllAssignments();
  const assign = useAssignJuror();
  const unassign = useUnassignJuror();

  const sortedSessions = useMemo(() => {
    const arr = Array.isArray(sessions.data) ? [...sessions.data] : [];
    return arr.sort(compareSessions);
  }, [sessions.data]);

  // Index : Set("juryUserId|sessionId") pour O(1) lookup.
  const assignedIndex = useMemo(() => {
    const set = new Set();
    for (const a of assignments.data || []) {
      set.add(`${a.jury_user_id}|${a.session_id}`);
    }
    return set;
  }, [assignments.data]);

  const isLoading = jurors.isLoading || sessions.isLoading || assignments.isLoading;

  const handleToggle = async (juror, session) => {
    if (!juror?.user_id) return; // juror sans profil = pas d'auth.uid() -> can't assign yet
    const key = `${juror.user_id}|${session.id}`;
    const has = assignedIndex.has(key);
    setToggleError(false);
    try {
      if (has) {
        await unassign.mutateAsync({ juryUserId: juror.user_id, sessionId: session.id });
      } else {
        await assign.mutateAsync({
          juryUserId: juror.user_id,
          sessionId: session.id,
          createdBy: adminUserId ?? null,
        });
      }
    } catch {
      // mutateAsync rejette si la RPC échoue — on surface un feedback au lieu
      // de laisser la promesse rejetée non gérée.
      setToggleError(true);
    }
  };

  return (
    <section
      className="rounded-[4px] p-4 mt-6"
      style={{ background: '#fbf9f5', border: `1px solid ${GOLD}33` }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Settings2 className="w-4 h-4" style={{ color: GOLD }} aria-hidden />
          <span
            className="text-[14px]"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {t(UI.assignmentsTitle)}
          </span>
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4" style={{ color: MUTED }} aria-hidden />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: MUTED }} aria-hidden />
        )}
      </button>

      {open && (
        <div className="mt-3">
          <p className="text-[12px] mb-3" style={{ color: INK }}>
            {t(UI.assignmentsHelp)}
          </p>

          {toggleError && (
            <div
              className="rounded-[4px] p-2.5 mb-3 flex items-start gap-2 text-[12px]"
              style={{ background: TINT_DANGER, color: NAVY, border: `1px solid ${DANGER}33` }}
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: DANGER }} aria-hidden />
              <span>{t(UI.assignmentError)}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center gap-2 text-[12px]" style={{ color: MUTED }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              {t({ fr: 'Chargement…', en: 'Loading…', de: 'Wird geladen…' })}
            </div>
          ) : (jurors.data || []).length === 0 ? (
            <p className="text-[13px]" style={{ color: MUTED }}>
              {t(UI.assignmentsEmpty)}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th
                      className="text-left text-[11px] uppercase tracking-[0.1em] py-2 pr-3"
                      style={{ color: MUTED, borderBottom: `1px solid ${CREAM2}` }}
                    >
                      {t(UI.jurorCol)}
                    </th>
                    {sortedSessions.map((s) => (
                      <th
                        key={s.id}
                        className="text-center text-[11px] uppercase tracking-[0.1em] py-2 px-2"
                        style={{ color: MUTED, borderBottom: `1px solid ${CREAM2}` }}
                      >
                        {s.name || s.id}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(jurors.data || []).map((j) => (
                    <tr key={j.email}>
                      <td
                        className="text-[13px] py-2 pr-3 whitespace-nowrap"
                        style={{ color: NAVY, borderBottom: `1px solid ${CREAM2}` }}
                      >
                        <div style={{ fontFamily: SERIF, fontWeight: 500 }}>
                          {j.full_name || j.email}
                        </div>
                        {j.full_name && (
                          <div className="text-[11px]" style={{ color: MUTED }}>
                            {j.email}
                          </div>
                        )}
                        {!j.user_id && (
                          <div className="text-[10px]" style={{ color: '#a23b2d' }}>
                            {t({ fr: 'Jamais connecté (pas d\'auth.uid())',
                                  en: 'Never signed in (no auth.uid())',
                                  de: 'Nie angemeldet (keine auth.uid())' })}
                          </div>
                        )}
                      </td>
                      {sortedSessions.map((s) => {
                        const checked = j.user_id
                          ? assignedIndex.has(`${j.user_id}|${s.id}`)
                          : false;
                        const disabled = !j.user_id || assign.isPending || unassign.isPending;
                        return (
                          <td
                            key={s.id}
                            className="text-center py-2 px-2"
                            style={{ borderBottom: `1px solid ${CREAM2}` }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => handleToggle(j, s)}
                              aria-label={`${j.email} ↔ ${s.id}`}
                              style={{ accentColor: NAVY }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
