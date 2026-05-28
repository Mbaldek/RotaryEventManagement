// SessionDetail — pane droit (master/detail) ou plein-écran mobile.
//
// Compose :
//   - Header : nom session, date, StatusPill, countdown, co-jurés.
//   - Banner contextuel selon le lifecycle (draft / live / locked / published).
//   - PreSessionPack (toujours visible >= draft).
//   - Scoring queue (live + lecture seule en locked / published) avec une carte par
//     startup ; expand on click -> ScoringPanel.
//   - ResultsView (visible en published) + bouton Admin Lock/Publish quand isAdmin.

import React, { useCallback, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Lock, Send, Users } from 'lucide-react';
import {
  NAVY,
  INK,
  MUTED,
  GOLD,
  CREAM2,
  SERIF,
  GREEN_TODAY,
  TINT_SAGE,
  TINT_BLUE,
} from '@/components/design/tokens';
import { StatusPill } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import PreSessionPack from './PreSessionPack';
import ScoringPanel from './ScoringPanel';
import ResultsView from './ResultsView';
import CoJurorsPopover from './CoJurorsPopover';
import {
  computeCountdown,
  formatShortDate,
  isSessionLive,
  isSessionLockedOrPublished,
  isSessionPublished,
  SESSION_STATUS,
} from './constants';
import { JURY_STATUS_LABELS, UI } from './i18n';
import {
  useAssignmentsForSession,
  useJuryProfiles,
  useMyDraftsForSession,
  useMyScoresForSession,
  useSaveJuryDraft,
  useStartupsForSession,
  useSubmitJuryScore,
  useLockSession,
  usePublishSession,
} from './useJury';

function CountdownLabel({ cd }) {
  const { t } = useLang();
  if (!cd) return null;
  let label = null;
  switch (cd.kind) {
    case 'today':     label = t(UI.countdownToday); break;
    case 'tomorrow':  label = t(UI.countdownTomorrow); break;
    case 'yesterday': label = t(UI.countdownYesterday); break;
    case 'in':        label = t(UI.countdownIn(cd.days)); break;
    case 'past':      label = t(UI.countdownPast(cd.days)); break;
    default: break;
  }
  if (!label) return null;
  return (
    <span
      className="text-[12px] font-medium"
      style={{ color: cd.kind === 'today' ? GREEN_TODAY : MUTED }}
    >
      {label}
    </span>
  );
}

function Banner({ status, t }) {
  if (status === SESSION_STATUS.DRAFT) {
    return (
      <div
        className="rounded-[4px] p-3 text-[13px]"
        style={{ background: '#fdf6e8', color: NAVY, border: `1px solid ${GOLD}33` }}
      >
        {t(UI.bannerDraft)}
      </div>
    );
  }
  if (status === SESSION_STATUS.LIVE) {
    return (
      <div
        className="rounded-[4px] p-3 text-[13px] inline-flex items-center gap-2"
        style={{ background: TINT_SAGE, color: GREEN_TODAY, border: `1px solid ${GREEN_TODAY}33` }}
      >
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ background: GREEN_TODAY }}
          aria-hidden
        />
        {t(UI.bannerLive)}
      </div>
    );
  }
  if (status === SESSION_STATUS.LOCKED) {
    return (
      <div
        className="rounded-[4px] p-3 text-[13px]"
        style={{ background: TINT_BLUE, color: NAVY, border: `1px solid ${CREAM2}` }}
      >
        {t(UI.bannerLocked)}
      </div>
    );
  }
  if (status === SESSION_STATUS.PUBLISHED) {
    return (
      <div
        className="rounded-[4px] p-3 text-[13px]"
        style={{ background: '#fdf6e8', color: NAVY, border: `1px solid ${GOLD}33` }}
      >
        {t(UI.bannerPublished)}
      </div>
    );
  }
  return null;
}

// Petite query inline pour le finalists_per_session (lit l'édition de la session).
function useFinalistsPerSession(editionId) {
  return useQuery({
    queryKey: ['rsa', 'jury', 'edition-finalists', editionId],
    queryFn: async () => {
      if (!editionId) return 1;
      const { data, error } = await supabase
        .from('editions')
        .select('finalists_per_session')
        .eq('id', editionId)
        .maybeSingle();
      if (error) throw error;
      return data?.finalists_per_session ?? 1;
    },
    enabled: !!editionId,
    staleTime: 5 * 60 * 1000,
  });
}

export default function SessionDetail({
  session,           // { id, name, theme, session_date, edition_id, config: session_config row }
  authUserId,
  isAdmin,
  onBack,
}) {
  const { t, lang } = useLang();
  const sessionId = session?.id;
  const status = session?.config?.status || SESSION_STATUS.DRAFT;

  const startupsQ = useStartupsForSession(sessionId);
  const assignmentsQ = useAssignmentsForSession(sessionId);
  const draftsQ = useMyDraftsForSession(sessionId, authUserId);
  const myScoresQ = useMyScoresForSession(sessionId, authUserId);

  const lockMut = useLockSession();
  const publishMut = usePublishSession();
  const saveDraft = useSaveJuryDraft();
  const submitScore = useSubmitJuryScore();

  const finalistsPerEdition = useFinalistsPerSession(session?.edition_id);

  const draftByStartup = useMemo(() => {
    const m = new Map();
    for (const d of draftsQ.data || []) m.set(d.startup_id, d);
    return m;
  }, [draftsQ.data]);

  const scoreByStartup = useMemo(() => {
    const m = new Map();
    for (const s of myScoresQ.data || []) m.set(s.startup_id, s);
    return m;
  }, [myScoresQ.data]);

  // Co-jurés (sans moi).
  const otherJurorIds = useMemo(() => {
    const ids = (assignmentsQ.data || [])
      .map((a) => a.jury_user_id)
      .filter((id) => id && id !== authUserId);
    return Array.from(new Set(ids));
  }, [assignmentsQ.data, authUserId]);

  const profilesQ = useJuryProfiles(otherJurorIds);

  // Joint des profils juré + profiles.full_name pour le popover co-jurors.
  // On lit profiles via une petite query inline (RLS profiles = "Allow all" cf. C1).
  const fullProfilesQ = useQuery({
    queryKey: ['rsa', 'jury', 'co-jurors-profiles', sessionId, ...otherJurorIds.sort()],
    queryFn: async () => {
      if (!otherJurorIds.length) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', otherJurorIds);
      if (error) throw error;
      return data || [];
    },
    enabled: otherJurorIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const jurorsForPopover = useMemo(() => {
    const profByUid = new Map((fullProfilesQ.data || []).map((p) => [p.id, p]));
    const jpByUid = new Map((profilesQ.data || []).map((p) => [p.user_id, p]));
    return otherJurorIds.map((uid) => {
      const prof = profByUid.get(uid);
      const jp = jpByUid.get(uid);
      return {
        user_id: uid,
        email: prof?.email || null,
        display_name: prof?.full_name || prof?.email || null,
        qualite: jp?.qualite || null,
        organisation: jp?.organisation || null,
      };
    });
  }, [otherJurorIds, fullProfilesQ.data, profilesQ.data]);

  const [coJurorsOpen, setCoJurorsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const readOnlyScoring = isSessionLockedOrPublished(status) || !isSessionLive(status);

  const handleToggleExpand = (sid) => {
    setExpandedId((prev) => (prev === sid ? null : sid));
  };

  const handleSaveDraft = useCallback(
    (startup) => ({ patch }) => {
      if (!startup?.id || !authUserId) return;
      saveDraft.mutate({
        startupId: startup.id,
        sessionId,
        juryUserId: authUserId,
        patch,
      });
    },
    [authUserId, saveDraft, sessionId],
  );

  const handleSubmit = useCallback(
    (startup) => ({ scores, comment }) => {
      if (!startup?.id || !authUserId) return;
      submitScore.mutate({
        startupId: startup.id,
        sessionId,
        scores,
        comment,
        juryUserId: authUserId,
      });
    },
    [authUserId, submitScore, sessionId],
  );

  const handleLock = () => {
    if (!sessionId) return;
    if (!window.confirm(t(UI.adminLockConfirm))) return;
    lockMut.mutate(sessionId);
  };

  const handlePublish = () => {
    if (!sessionId) return;
    if (!window.confirm(t(UI.adminPublishConfirm))) return;
    publishMut.mutate(sessionId);
  };

  if (!session) {
    return (
      <div
        className="rounded-[4px] p-6 text-center"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <p className="text-[14px]" style={{ color: MUTED }}>
          {t({ fr: 'Sélectionnez une session dans la liste.',
                en: 'Select a session from the list.',
                de: 'Wählen Sie eine Session aus der Liste.' })}
        </p>
      </div>
    );
  }

  const cd = computeCountdown(session.session_date);

  return (
    <div>
      {/* Bouton retour (mobile) */}
      <div className="lg:hidden mb-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium outline-none focus-visible:underline"
          style={{ color: NAVY }}
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> {t(UI.back)}
        </button>
      </div>

      {/* Header */}
      <header className="mb-4">
        <div className="flex items-baseline gap-2 mb-2 flex-wrap">
          <h2
            className="text-[24px] leading-tight"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {session.name || session.theme || session.id}
          </h2>
          <StatusPill
            kind="jury"
            status={status}
            label={t(JURY_STATUS_LABELS[status]) || status}
          />
          <CountdownLabel cd={cd} />
        </div>
        <div className="text-[13px]" style={{ color: INK }}>
          {formatShortDate(session.session_date, lang)}
        </div>

        {/* Co-jurés link */}
        {otherJurorIds.length > 0 && (
          <button
            type="button"
            onClick={() => setCoJurorsOpen((o) => !o)}
            className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium outline-none focus-visible:underline"
            style={{ color: NAVY }}
          >
            <Users className="w-3.5 h-3.5" aria-hidden />
            {t(UI.coJurorsBtn(otherJurorIds.length))}
          </button>
        )}
        <CoJurorsPopover
          open={coJurorsOpen}
          onClose={() => setCoJurorsOpen(false)}
          jurors={jurorsForPopover}
        />
      </header>

      <div className="mb-4">
        <Banner status={status} t={t} />
      </div>

      {/* Pré-lecture (toujours visible) */}
      <section
        className="rounded-[4px] p-4 mb-4"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <h3
          className="text-[11px] uppercase tracking-[0.14em] font-medium mb-3"
          style={{ color: MUTED }}
        >
          {t(UI.preReadTitle)}
        </h3>
        {startupsQ.isLoading ? (
          <div className="flex items-center gap-2 text-[12px]" style={{ color: MUTED }}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            {t({ fr: 'Chargement…', en: 'Loading…', de: 'Wird geladen…' })}
          </div>
        ) : (
          <PreSessionPack
            startups={startupsQ.data || []}
            sessionConfig={session.config}
          />
        )}
      </section>

      {/* Scoring queue (visible >= live ; en draft : message d'attente déjà rendu via Banner) */}
      {status !== SESSION_STATUS.DRAFT && (
        <section
          className="rounded-[4px] p-4 mb-4"
          style={{ background: 'white', border: `1px solid ${CREAM2}` }}
        >
          <h3
            className="text-[11px] uppercase tracking-[0.14em] font-medium mb-3"
            style={{ color: MUTED }}
          >
            {t(UI.scoringTitle)}
          </h3>
          {startupsQ.isLoading ? (
            <div className="flex items-center gap-2 text-[12px]" style={{ color: MUTED }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              {t({ fr: 'Chargement…', en: 'Loading…', de: 'Wird geladen…' })}
            </div>
          ) : (
            <ol className="flex flex-col gap-2 list-none m-0 p-0">
              {(startupsQ.data || []).map((s, i) => (
                <li key={s.id}>
                  <ScoringPanel
                    startup={s}
                    index={i}
                    expanded={expandedId === s.id}
                    onToggle={() => handleToggleExpand(s.id)}
                    draft={draftByStartup.get(s.id) || null}
                    myScore={scoreByStartup.get(s.id) || null}
                    onSaveDraft={handleSaveDraft(s)}
                    onSubmit={handleSubmit(s)}
                    savingDraft={saveDraft.isPending}
                    submitting={submitScore.isPending}
                    readOnly={readOnlyScoring}
                    submitError={submitScore.isError ? submitScore.error : null}
                  />
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {/* Résultats (visible en published) */}
      {isSessionPublished(status) && (
        <section
          className="mb-4"
        >
          <ResultsView
            sessionConfig={session.config}
            finalistsPerSession={finalistsPerEdition.data ?? 1}
          />
        </section>
      )}

      {/* Admin — Lock / Publish */}
      {isAdmin && (
        <section
          className="rounded-[4px] p-4 mb-4"
          style={{ background: '#fbf9f5', border: `1px solid ${GOLD}33` }}
        >
          <h3
            className="text-[13px] mb-3"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {t(UI.adminTitle)}
          </h3>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={handleLock}
              disabled={lockMut.isPending || status !== SESSION_STATUS.LIVE}
              className="inline-flex items-center gap-2 text-[13px] font-medium px-4 py-2 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
              style={{
                background: status === SESSION_STATUS.LIVE && !lockMut.isPending ? NAVY : '#e6e3da',
                color: status === SESSION_STATUS.LIVE && !lockMut.isPending ? 'white' : MUTED,
                cursor: status === SESSION_STATUS.LIVE && !lockMut.isPending ? 'pointer' : 'not-allowed',
              }}
              aria-disabled={status !== SESSION_STATUS.LIVE}
              title={status !== SESSION_STATUS.LIVE ? t(UI.adminLockNeedsLive) : undefined}
            >
              {lockMut.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              ) : (
                <Lock className="w-3.5 h-3.5" aria-hidden />
              )}
              {t(UI.adminLockBtn)}
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishMut.isPending || status !== SESSION_STATUS.LOCKED}
              className="inline-flex items-center gap-2 text-[13px] font-medium px-4 py-2 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
              style={{
                background: status === SESSION_STATUS.LOCKED && !publishMut.isPending ? GOLD : '#e6e3da',
                color: status === SESSION_STATUS.LOCKED && !publishMut.isPending ? NAVY : MUTED,
                cursor: status === SESSION_STATUS.LOCKED && !publishMut.isPending ? 'pointer' : 'not-allowed',
              }}
              aria-disabled={status !== SESSION_STATUS.LOCKED}
              title={status !== SESSION_STATUS.LOCKED ? t(UI.adminPublishNeedsLocked) : undefined}
            >
              {publishMut.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              ) : (
                <Send className="w-3.5 h-3.5" aria-hidden />
              )}
              {t(UI.adminPublishBtn)}
            </button>
          </div>
          {(lockMut.isError || publishMut.isError) && (
            <p className="text-[12px] mt-2" style={{ color: '#a23b2d' }}>
              {String(
                lockMut.error?.message || publishMut.error?.message ||
                  t({ fr: 'Action échouée.', en: 'Action failed.', de: 'Aktion fehlgeschlagen.' }),
              )}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
