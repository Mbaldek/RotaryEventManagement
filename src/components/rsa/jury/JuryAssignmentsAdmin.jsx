// JuryAssignmentsAdmin — vue admin "Attribution des jurés" (design lift éditorial).
//
// Refonte du stopgap matrice : la vue valide deux modes (toggle souligné or) —
//   1. "Par session" : une carte par session (filet d'accent gauche, eyebrow
//      contexte, jurés assignés + actions Détails/Retirer, pool des jurés validés
//      non assignés via boutons "+ Nom"), bande Quorum en tête.
//   2. "Matrice" : la matrice juré×session existante relookée (pastilles couleur
//      en en-tête, cases √ navy, ligne totaux Playfair avec DANGER si <3).
//
// AUCUN emoji — marqueur de session = pastille ronde getSessionAccent + filet 3px.
// Cf. mockup validé docs/design/mockups/jury-admin-views.html.
//
// Source jurés : useJurorsDirectory (app_user_roles role='jury' + profiles join).
// Source sessions : useSessionsForEdition(editionId).
// Toggle case/bouton = useAssignJuror / useUnassignJuror.

import React, { useMemo, useState } from 'react';
import { Loader2, AlertTriangle, Check } from 'lucide-react';
import {
  NAVY,
  MUTED,
  CREAM2,
  SERIF,
  GOLD,
} from '@/components/design/tokens';
import { DANGER, TINT_DANGER, SUCCESS, GOLD_TEXT } from '@/components/design/tokens.app';
import { useQuery } from '@tanstack/react-query';
import { useLang } from '@/lib/platform/i18n';
import { JuryProfile } from '@/lib/rsa/entities';
import { JURY_QUALITES } from '@/components/rsa/candidature/juryFunnel.i18n';
import {
  useAllAssignments,
  useJurorsDirectory,
  useSessionsForEdition,
  useAssignJuror,
  useUnassignJuror,
} from './useJury';
import { useEditionJuryApplications } from './useJuryProfile';
import { UI } from './i18n';
import { compareSessions, formatShortDate } from './constants';
import { getSessionAccent, isFinaleSession, QUORUM_MIN } from './sessionMarker';
import JuryProfileDrawer from './JuryProfileDrawer';

// qualité (enum) -> label trilingue (miroir du résolveur du drawer).
function qualiteLabel(value, t) {
  if (!value) return '';
  const q = JURY_QUALITES.find((x) => x.value === value);
  return q ? t(q.label) : value;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function initialsOf(name, email) {
  const src = (name || email || '?').trim();
  return (
    src
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0])
      .join('')
      .toUpperCase() || '?'
  );
}

function shortSessionLabel(session) {
  return session?.name || session?.theme || session?.id || '—';
}

// Pastille ronde marqueur de session (pas d'emoji).
function Dot({ color, size = 7 }) {
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: size, height: size, background: color }}
      aria-hidden
    />
  );
}

// Avatar initiales (fond navy, texte or) — photo non chargée dans la liste pour
// rester léger ; la photo s'affiche dans le drawer.
function Avatar({ name, email }) {
  return (
    <div
      className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[11px] shrink-0"
      style={{ background: NAVY, color: GOLD, fontWeight: 600, letterSpacing: '0.03em' }}
      aria-hidden
    >
      {initialsOf(name, email)}
    </div>
  );
}

// ── Bande Quorum ───────────────────────────────────────────────────────────
function QuorumStrip({ sessions, countBySession, t }) {
  return (
    <div
      className="flex items-stretch rounded-[3px] overflow-hidden mb-8"
      style={{ border: `1px solid ${CREAM2}`, background: '#fff' }}
    >
      {sessions.map((s, i) => {
        const n = countBySession.get(s.id) || 0;
        const under = n < QUORUM_MIN;
        const accent = getSessionAccent(s);
        const fin = isFinaleSession(s);
        return (
          <div
            key={s.id}
            className="flex-1 px-3.5 pt-4 pb-3.5"
            style={{
              borderLeft: i === 0 ? 'none' : `1px solid ${CREAM2}`,
              background: fin ? '#fdfaf1' : 'transparent',
            }}
          >
            <div
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] mb-2 whitespace-nowrap overflow-hidden text-ellipsis"
              style={{ color: MUTED }}
              title={shortSessionLabel(s)}
            >
              <Dot color={accent} />
              <span className="truncate">{shortSessionLabel(s)}</span>
            </div>
            <div
              className="text-[27px] leading-none"
              style={{ fontFamily: SERIF, fontWeight: 500, color: under ? DANGER : NAVY }}
            >
              {n}
            </div>
            <div
              className="text-[10.5px] mt-1.5 tracking-[0.02em]"
              style={{ color: under ? DANGER : SUCCESS }}
            >
              {under ? t(UI.quorumMissing(QUORUM_MIN - n)) : t(UI.quorumMet)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Bouton-texte action (sobre, souligné au survol) ────────────────────────
function LinkAct({ children, onClick, danger, disabled, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="text-[11.5px] tracking-[0.02em] bg-transparent border-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] rounded-[2px] disabled:opacity-50"
      style={{
        color: MUTED,
        borderBottom: '1px solid transparent',
        paddingBottom: 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = danger ? DANGER : NAVY;
        e.currentTarget.style.borderBottomColor = danger ? '#e6cfc9' : CREAM2;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = MUTED;
        e.currentTarget.style.borderBottomColor = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

// ── Carte session (vue Par session) ────────────────────────────────────────
function SessionCard({
  session,
  assignedJurors,
  poolRequested,
  poolOthers,
  lang,
  t,
  onDetails,
  onRemove,
  onAdd,
  busy,
}) {
  const accent = getSessionAccent(session);
  const fin = isFinaleSession(session);
  const n = assignedJurors.length;
  const under = n < QUORUM_MIN;
  const dateLabel = formatShortDate(session.session_date, lang);
  const eyebrow = fin
    ? t(UI.contextFinale(dateLabel))
    : t(UI.contextQualifying(dateLabel));
  const [copied, setCopied] = useState(false);

  async function copyEmails() {
    const emails = assignedJurors.map((j) => j.email).filter(Boolean).join(', ');
    if (!emails) return;
    try {
      await navigator.clipboard.writeText(emails);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard indisponible — silencieux */
    }
  }

  // Bouton « + Nom » du pool. requested = le juré a demandé cette session
  // (bordure or + pastille), sinon ajout libre (override owner).
  const poolBtn = (j, requested) => (
    <button
      key={j.user_id || j.email}
      type="button"
      disabled={busy || !j.user_id}
      onClick={() => onAdd(j, session)}
      title={!j.user_id ? j.email : requested ? t(UI.requestedDot) : undefined}
      className="inline-flex items-center text-[12px] rounded-[2px] px-3 py-1.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] disabled:opacity-50"
      style={{ border: `1px solid ${requested ? GOLD : CREAM2}`, background: '#fff', color: NAVY }}
      onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.borderColor = GOLD; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = requested ? GOLD : CREAM2; }}
    >
      <span style={{ color: GOLD_TEXT, marginRight: 6 }}>+</span>
      {j.full_name || j.email}
      {requested && <span style={{ marginLeft: 6 }}><Dot color={GOLD} size={6} /></span>}
    </button>
  );

  return (
    <div
      className="relative rounded-[3px] overflow-hidden mb-3.5"
      style={{ border: `1px solid ${CREAM2}`, background: '#fff' }}
    >
      <span
        className="absolute left-0 top-0 bottom-0"
        style={{ width: 3, background: accent }}
        aria-hidden
      />
      {/* Head */}
      <div className="flex items-start gap-4 pl-6 pr-5 pt-4 pb-3.5">
        <div className="flex-1 min-w-0">
          <div className="text-[9.5px] uppercase tracking-[0.16em] mb-1" style={{ color: MUTED }}>
            {eyebrow}
          </div>
          <div
            className="text-[17.5px] leading-tight"
            style={{ fontFamily: SERIF, fontWeight: 500, color: NAVY }}
          >
            {shortSessionLabel(session)}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[12.5px]" style={{ color: NAVY }}>
            {t(UI.jurorsCount(n))} ·{' '}
            <span style={{ color: under ? DANGER : SUCCESS }}>
              {under ? t(UI.quorumNotMet) : t(UI.quorumMetInline)}
            </span>
          </div>
          <div className="mt-1.5">
            <button
              type="button"
              onClick={copyEmails}
              disabled={n === 0}
              className="text-[11px] tracking-[0.04em] bg-transparent border-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] rounded-[2px] disabled:opacity-50"
              style={{ color: GOLD_TEXT, borderBottom: '1px solid transparent', paddingBottom: 1 }}
              onMouseEnter={(e) => { e.currentTarget.style.borderBottomColor = GOLD; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
            >
              {copied ? t(UI.copyEmailsDone) : t(UI.copyEmails)}
            </button>
          </div>
        </div>
      </div>

      {/* Liste jurés assignés */}
      <div className="pt-0.5 pb-1">
        {assignedJurors.length === 0 ? (
          <div
            className="text-[12.5px] pl-6 pr-5 py-3"
            style={{ color: MUTED, borderTop: `1px solid ${CREAM2}` }}
          >
            {t(UI.noJuror)}
          </div>
        ) : (
          assignedJurors.map((j) => (
            <div
              key={j.email}
              className="flex items-center gap-3.5 pl-6 pr-5 py-3"
              style={{ borderTop: `1px solid ${CREAM2}` }}
            >
              <Avatar name={j.full_name} email={j.email} />
              <div className="flex-1 min-w-0 flex items-baseline gap-2.5 flex-wrap">
                <span className="text-[14px]" style={{ color: NAVY, fontWeight: 500 }}>
                  {j.full_name || j.email}
                </span>
                {j.subtitle && (
                  <span className="text-[12px]" style={{ color: MUTED }}>
                    {j.subtitle}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <LinkAct onClick={() => onDetails(j)}>{t(UI.detailsAct)}</LinkAct>
                <LinkAct danger disabled={busy} onClick={() => onRemove(j, session)}>
                  {t(UI.removeAct)}
                </LinkAct>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pool — scindé : ont demandé cette session / autres jurés */}
      <div
        className="pl-6 pr-5 py-3.5 space-y-2.5"
        style={{ borderTop: `1px solid ${CREAM2}`, background: '#f5f2ec' }}
      >
        {poolRequested.length === 0 && poolOthers.length === 0 ? (
          <span className="text-[11.5px]" style={{ color: MUTED }}>
            {t(UI.poolEmpty)}
          </span>
        ) : (
          <>
            {poolRequested.length > 0 && (
              <div className="flex flex-wrap gap-2.5 items-center">
                <span className="text-[10px] uppercase tracking-[0.14em] mr-0.5" style={{ color: GOLD_TEXT }}>
                  {t(UI.poolRequested)}
                </span>
                {poolRequested.map((j) => poolBtn(j, true))}
              </div>
            )}
            {poolOthers.length > 0 && (
              <div className="flex flex-wrap gap-2.5 items-center">
                <span className="text-[10px] uppercase tracking-[0.14em] mr-0.5" style={{ color: MUTED }}>
                  {t(UI.poolOthers)}
                </span>
                {poolOthers.map((j) => poolBtn(j, false))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Vue Matrice (relookée éditorial) ───────────────────────────────────────
function MatrixView({ rowGroups, requestedIndex, sessions, assignedIndex, countBySession, onToggle, busy, t }) {
  return (
    <div
      className="rounded-[3px] overflow-auto"
      style={{ border: `1px solid ${CREAM2}`, background: '#fff' }}
    >
      <table className="border-collapse w-full text-[12.5px]" style={{ minWidth: 680 }}>
        <thead>
          <tr>
            <th
              className="text-left px-2.5 py-3 text-[11px] uppercase tracking-[0.1em]"
              style={{ background: NAVY, color: '#fff', fontWeight: 500, fontFamily: SERIF }}
            >
              {t(UI.jurorCol)}
            </th>
            {sessions.map((s) => (
              <th
                key={s.id}
                className="px-2.5 py-3 text-[11px] uppercase tracking-[0.1em] whitespace-nowrap"
                style={{ background: NAVY, color: '#fff', fontWeight: 500 }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Dot color={getSessionAccent(s)} />
                  {shortSessionLabel(s)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowGroups.map((g) => (
            <React.Fragment key={g.key}>
              <tr>
                <td
                  colSpan={sessions.length + 1}
                  className="text-left px-2.5 py-2 text-[10px] uppercase tracking-[0.14em]"
                  style={{ background: '#f5f2ec', color: MUTED, borderBottom: `1px solid ${CREAM2}` }}
                >
                  {g.label}
                </td>
              </tr>
              {g.jurors.map((j) => (
                <tr key={j.user_id || j.email}>
                  <td
                    className="text-left px-2.5 py-3 whitespace-nowrap"
                    style={{ color: NAVY, borderBottom: `1px solid ${CREAM2}`, fontFamily: SERIF }}
                  >
                    <div style={{ fontWeight: 500 }}>{j.full_name || j.email}</div>
                    {j.full_name && (
                      <div className="text-[11px]" style={{ color: MUTED, fontFamily: 'Inter, sans-serif' }}>
                        {j.email}
                      </div>
                    )}
                    {!j.user_id && (
                      <div className="text-[10px]" style={{ color: DANGER, fontFamily: 'Inter, sans-serif' }}>
                        {t({
                          fr: "Jamais connecté (pas d'auth.uid())",
                          en: 'Never signed in (no auth.uid())',
                          de: 'Nie angemeldet (keine auth.uid())',
                        })}
                      </div>
                    )}
                  </td>
                  {sessions.map((s) => {
                    const checked = j.user_id ? assignedIndex.has(`${j.user_id}|${s.id}`) : false;
                    const requested = j.user_id ? requestedIndex.has(`${j.user_id}|${s.id}`) : false;
                    const disabled = !j.user_id || busy;
                    return (
                      <td
                        key={s.id}
                        className="text-center px-2.5 py-3"
                        style={{ borderBottom: `1px solid ${CREAM2}` }}
                      >
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          aria-label={`${j.email} ↔ ${shortSessionLabel(s)}${requested && !checked ? ` · ${t(UI.requestedDot)}` : ''}`}
                          title={requested && !checked ? t(UI.requestedDot) : undefined}
                          disabled={disabled}
                          onClick={() => onToggle(j, s)}
                          className="w-[22px] h-[22px] rounded-[3px] mx-auto flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{
                            border: checked
                              ? `1px solid ${NAVY}`
                              : requested
                              ? `1px solid ${GOLD}`
                              : '1px solid #d4d0e0',
                            background: checked ? NAVY : '#fff',
                            color: '#fff',
                          }}
                        >
                          {checked ? (
                            <Check className="w-3 h-3" aria-hidden />
                          ) : requested ? (
                            <span
                              className="rounded-full"
                              style={{ width: 7, height: 7, background: GOLD }}
                              aria-hidden
                            />
                          ) : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td
              className="text-left px-2.5 py-3"
              style={{
                borderTop: `2px solid ${CREAM2}`,
                background: '#f5f2ec',
                color: NAVY,
                fontFamily: SERIF,
                fontWeight: 600,
              }}
            >
              {t(UI.totalRow)}
            </td>
            {sessions.map((s) => {
              const n = countBySession.get(s.id) || 0;
              const under = n < QUORUM_MIN;
              return (
                <td
                  key={s.id}
                  className="text-center px-2.5 py-3 tabular-nums"
                  style={{
                    borderTop: `2px solid ${CREAM2}`,
                    background: '#f5f2ec',
                    fontFamily: SERIF,
                    fontWeight: 600,
                    color: under ? DANGER : NAVY,
                  }}
                >
                  {n}
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Composant principal ─────────────────────────────────────────────────────
export default function JuryAssignmentsAdmin({ editionId, adminUserId }) {
  const { t, lang } = useLang();
  const [view, setView] = useState('sess'); // 'sess' | 'mx'
  const [toggleError, setToggleError] = useState(false);
  const [drawer, setDrawer] = useState(null); // { juryUserId, email, fullName } | null

  const jurors = useJurorsDirectory();
  const sessionsQ = useSessionsForEdition(editionId);
  const assignments = useAllAssignments();
  const editionApps = useEditionJuryApplications(editionId);
  const assign = useAssignJuror();
  const unassign = useUnassignJuror();

  const sortedSessions = useMemo(() => {
    const arr = Array.isArray(sessionsQ.data) ? [...sessionsQ.data] : [];
    return arr.sort(compareSessions);
  }, [sessionsQ.data]);

  // Index Set("juryUserId|sessionId") pour O(1) lookup.
  const assignedIndex = useMemo(() => {
    const set = new Set();
    for (const a of assignments.data || []) set.add(`${a.jury_user_id}|${a.session_id}`);
    return set;
  }, [assignments.data]);

  // Annuaire brut (email/full_name/user_id) puis enrichi du profil juré.
  const rawJurors = useMemo(() => jurors.data || [], [jurors.data]);
  const jurorUserIds = useMemo(
    () => rawJurors.map((j) => j.user_id).filter(Boolean),
    [rawJurors],
  );
  // Profils (qualité/organisation) pour peupler le sous-titre des lignes juré.
  const profilesQ = useQuery({
    queryKey: ['rsa', 'jury', 'directory-profiles', ...jurorUserIds.slice().sort()],
    queryFn: () => JuryProfile.forIds(jurorUserIds),
    enabled: jurorUserIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const profileByUserId = useMemo(() => {
    const m = new Map();
    for (const p of profilesQ.data || []) m.set(p.user_id, p);
    return m;
  }, [profilesQ.data]);
  // subtitle = « qualité · organisation » (le drawer affiche le profil complet).
  const jurorList = useMemo(
    () =>
      rawJurors.map((j) => {
        const p = j.user_id ? profileByUserId.get(j.user_id) : null;
        if (!p) return j;
        const sub = [qualiteLabel(p.qualite, t), p.organisation].filter(Boolean).join(' · ');
        return sub ? { ...j, subtitle: sub } : j;
      }),
    [rawJurors, profileByUserId, t],
  );

  // Comptes par session (jurés assignés ayant un user_id).
  const countBySession = useMemo(() => {
    const m = new Map();
    for (const s of sortedSessions) m.set(s.id, 0);
    for (const a of assignments.data || []) {
      if (m.has(a.session_id)) m.set(a.session_id, (m.get(a.session_id) || 0) + 1);
    }
    return m;
  }, [assignments.data, sortedSessions]);

  // user_id -> juror, pour résoudre les assignments en objets juré.
  const jurorByUserId = useMemo(() => {
    const m = new Map();
    for (const j of jurorList) if (j.user_id) m.set(j.user_id, j);
    return m;
  }, [jurorList]);

  // ── Scope « candidats de cette compétition » (blueprint jury-session-allocation) ──
  // editionSessionIdSet : colonnes de la matrice.
  // requestedIndex      : Set("uid|sid") des sessions demandées (∩ sessions de l'édition).
  // candidateRows       : jurés ayant postulé (candidature approuvée) à cette édition.
  // otherRows           : jurés affectés à une session de l'édition SANS candidature
  //                       (invités directs / grandes personnalités) — jamais masqués.
  const editionSessionIdSet = useMemo(
    () => new Set(sortedSessions.map((s) => s.id)),
    [sortedSessions],
  );

  const appsByUserId = editionApps.data?.byUserId || null;

  const requestedIndex = useMemo(() => {
    const set = new Set();
    if (appsByUserId) {
      for (const [uid, entry] of appsByUserId) {
        for (const sid of entry.wishes) {
          if (editionSessionIdSet.has(sid)) set.add(`${uid}|${sid}`);
        }
      }
    }
    return set;
  }, [appsByUserId, editionSessionIdSet]);

  const candidateRows = useMemo(() => {
    if (!appsByUserId) return [];
    const rows = [];
    for (const [uid, entry] of appsByUserId) {
      rows.push(
        jurorByUserId.get(uid) || { user_id: uid, email: entry.email, full_name: entry.fullName },
      );
    }
    rows.sort((a, b) =>
      String(a.full_name || a.email || '').localeCompare(String(b.full_name || b.email || '')),
    );
    return rows;
  }, [appsByUserId, jurorByUserId]);

  const assignedUserIdsInEdition = useMemo(() => {
    const set = new Set();
    for (const a of assignments.data || []) {
      if (editionSessionIdSet.has(a.session_id)) set.add(a.jury_user_id);
    }
    return set;
  }, [assignments.data, editionSessionIdSet]);

  const otherRows = useMemo(() => {
    const rows = [];
    for (const uid of assignedUserIdsInEdition) {
      if (appsByUserId && appsByUserId.has(uid)) continue;
      rows.push(jurorByUserId.get(uid) || { user_id: uid, email: uid, full_name: null });
    }
    rows.sort((a, b) =>
      String(a.full_name || a.email || '').localeCompare(String(b.full_name || b.email || '')),
    );
    return rows;
  }, [assignedUserIdsInEdition, appsByUserId, jurorByUserId]);

  const allRows = useMemo(() => [...candidateRows, ...otherRows], [candidateRows, otherRows]);

  const rowGroups = useMemo(() => {
    const groups = [];
    if (candidateRows.length) {
      groups.push({ key: 'cand', label: t(UI.rowGroupCandidates), jurors: candidateRows });
    }
    if (otherRows.length) {
      groups.push({ key: 'other', label: t(UI.rowGroupOthers), jurors: otherRows });
    }
    return groups;
  }, [candidateRows, otherRows, t]);

  // Assignments par session -> liste de jurés (résolus).
  const assignedBySession = useMemo(() => {
    const m = new Map();
    for (const s of sortedSessions) m.set(s.id, []);
    for (const a of assignments.data || []) {
      if (!m.has(a.session_id)) continue;
      const j = jurorByUserId.get(a.jury_user_id);
      if (j) m.get(a.session_id).push(j);
    }
    return m;
  }, [assignments.data, sortedSessions, jurorByUserId]);

  // sessions assignées d'un juré (pour le drawer).
  const sessionIdsByUser = useMemo(() => {
    const m = new Map();
    for (const a of assignments.data || []) {
      if (!m.has(a.jury_user_id)) m.set(a.jury_user_id, []);
      m.get(a.jury_user_id).push(a.session_id);
    }
    return m;
  }, [assignments.data]);

  const busy = assign.isPending || unassign.isPending;

  const isLoading =
    jurors.isLoading || sessionsQ.isLoading || assignments.isLoading || editionApps.isLoading;
  const isError = jurors.isError || sessionsQ.isError || assignments.isError;

  async function toggleAssign(juror, session, forceState) {
    if (!juror?.user_id) return;
    const key = `${juror.user_id}|${session.id}`;
    const has = assignedIndex.has(key);
    const shouldAssign = forceState === 'add' ? true : forceState === 'remove' ? false : !has;
    setToggleError(false);
    try {
      if (shouldAssign && !has) {
        await assign.mutateAsync({
          juryUserId: juror.user_id,
          sessionId: session.id,
          createdBy: adminUserId ?? null,
        });
      } else if (!shouldAssign && has) {
        await unassign.mutateAsync({ juryUserId: juror.user_id, sessionId: session.id });
      }
    } catch {
      setToggleError(true);
    }
  }

  const drawerAssignedIds = drawer
    ? sessionIdsByUser.get(drawer.juryUserId) || []
    : [];

  return (
    <section className="mt-8">
      {/* Header éditorial */}
      <div className="flex items-center gap-3 mb-2.5">
        <span className="h-px w-[34px]" style={{ background: GOLD }} aria-hidden />
        <span className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: GOLD_TEXT }}>
          {t(UI.eyebrow)}
        </span>
      </div>
      <h2 className="text-[26px] leading-tight" style={{ fontFamily: SERIF, fontWeight: 500, color: NAVY }}>
        {t(UI.assignTitle)}
      </h2>
      <p className="text-[13.5px] mt-2 max-w-[560px] leading-relaxed" style={{ color: MUTED }}>
        {t(UI.assignLead)}
      </p>

      {/* Barre toggle */}
      <div
        className="flex items-end justify-between mt-7 mb-6"
        style={{ borderBottom: `1px solid ${CREAM2}` }}
      >
        <div className="inline-flex gap-6" role="tablist" aria-label={t(UI.assignTitle)}>
          {[
            { key: 'sess', label: t(UI.viewBySession) },
            { key: 'mx', label: t(UI.viewMatrix) },
          ].map((tab) => {
            const on = view === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setView(tab.key)}
                className="relative bg-transparent border-0 pb-3 text-[13px] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] rounded-[2px]"
                style={{ color: on ? NAVY : MUTED, fontWeight: on ? 500 : 400 }}
              >
                {tab.label}
                {on && (
                  <span
                    className="absolute left-0 right-0"
                    style={{ bottom: -1, height: 2, background: GOLD }}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="hidden sm:block text-[10px] uppercase tracking-[0.16em] pb-3" style={{ color: MUTED }}>
          {t(UI.quorumHint)}
        </div>
      </div>

      {/* Légende des états de case (✓ affecté · ○ demandé) */}
      <div className="flex items-center gap-5 mb-5 text-[11px]" style={{ color: MUTED }}>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-[15px] h-[15px] rounded-[3px] inline-flex items-center justify-center"
            style={{ background: NAVY }}
            aria-hidden
          >
            <Check className="w-2.5 h-2.5" style={{ color: '#fff' }} />
          </span>
          {t(UI.legendAssigned)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-[15px] h-[15px] rounded-[3px] inline-flex items-center justify-center"
            style={{ border: `1px solid ${GOLD}`, background: '#fff' }}
            aria-hidden
          >
            <span className="rounded-full" style={{ width: 6, height: 6, background: GOLD }} />
          </span>
          {t(UI.legendRequested)}
        </span>
      </div>

      {/* Erreur de toggle */}
      {toggleError && (
        <div
          className="rounded-[4px] p-2.5 mb-4 flex items-start gap-2 text-[12px]"
          style={{ background: TINT_DANGER, color: NAVY, border: `1px solid ${DANGER}33` }}
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: DANGER }} aria-hidden />
          <span>{t(UI.assignmentError)}</span>
        </div>
      )}

      {/* États globaux */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-[13px]" style={{ color: MUTED }}>
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          {t(UI.drawerLoading)}
        </div>
      ) : isError ? (
        <div
          className="rounded-[4px] p-3 flex items-start gap-2 text-[13px]"
          style={{ background: TINT_DANGER, color: NAVY, border: `1px solid ${DANGER}33` }}
          role="alert"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: DANGER }} aria-hidden />
          {t(UI.loadError)}
        </div>
      ) : sortedSessions.length === 0 ? (
        <p className="text-[13px]" style={{ color: MUTED }}>
          {t(UI.noSessions)}
        </p>
      ) : allRows.length === 0 ? (
        <p className="text-[13px]" style={{ color: MUTED }}>
          {t(UI.noCandidates)}
        </p>
      ) : (
        <>
          {/* Bande Quorum (toujours visible) */}
          <QuorumStrip sessions={sortedSessions} countBySession={countBySession} t={t} />

          {view === 'sess' ? (
            <div>
              {sortedSessions.map((s) => {
                const assignedJurors = assignedBySession.get(s.id) || [];
                const assignedUserIds = new Set(assignedJurors.map((j) => j.user_id));
                const notAssigned = allRows.filter(
                  (j) => j.user_id && !assignedUserIds.has(j.user_id),
                );
                const poolRequested = notAssigned.filter((j) =>
                  requestedIndex.has(`${j.user_id}|${s.id}`),
                );
                const poolOthers = notAssigned.filter(
                  (j) => !requestedIndex.has(`${j.user_id}|${s.id}`),
                );
                return (
                  <SessionCard
                    key={s.id}
                    session={s}
                    assignedJurors={assignedJurors}
                    poolRequested={poolRequested}
                    poolOthers={poolOthers}
                    lang={lang}
                    t={t}
                    busy={busy}
                    onDetails={(j) =>
                      setDrawer({ juryUserId: j.user_id, email: j.email, fullName: j.full_name })
                    }
                    onRemove={(j, sess) => toggleAssign(j, sess, 'remove')}
                    onAdd={(j, sess) => toggleAssign(j, sess, 'add')}
                  />
                );
              })}
            </div>
          ) : (
            <MatrixView
              rowGroups={rowGroups}
              requestedIndex={requestedIndex}
              sessions={sortedSessions}
              assignedIndex={assignedIndex}
              countBySession={countBySession}
              onToggle={(j, s) => toggleAssign(j, s)}
              busy={busy}
              t={t}
            />
          )}
        </>
      )}

      {/* Drawer profil juré */}
      <JuryProfileDrawer
        open={!!drawer}
        onClose={() => setDrawer(null)}
        juryUserId={drawer?.juryUserId}
        email={drawer?.email}
        fullName={drawer?.fullName}
        editionId={editionId}
        sessions={sortedSessions}
        assignedSessionIds={drawerAssignedIds}
      />
    </section>
  );
}
