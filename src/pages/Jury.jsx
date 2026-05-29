// Espace Jury — orchestrateur du Module 3.
//
// Flux : auth-gate (-> /Login) -> role-gate (jury OU admin) -> page master/detail :
//   - colonne gauche : SessionList (mes sessions assignées).
//   - colonne droite : SessionDetail (pré-lecture + scoring grid + results + admin).
//
// Stopgap embedded admin panel : JuryAssignmentsAdmin (admin only, replié par défaut).
//
// La frontière de sécurité reste la RLS + les RPC SECURITY DEFINER ; les gardes ici
// sont uniquement UX (un comité-only sans rôle 'jury' tombe sur NoAccessNotice par
// pre-decided default #6).

import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import {
  PageShell,
  Eyebrow,
  GOLD,
  NAVY,
  INK,
  MUTED,
  CREAM2,
  SERIF,
  EASE,
  FOCUS_RING_CLASS,
} from '@/components/design';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';
import { useQuery } from '@tanstack/react-query';
import { Edition } from '@/lib/rsa/entities';
import {
  SessionList,
  SessionDetail,
  JuryAssignmentsAdmin,
  useMySessions,
  compareSessions,
} from '@/components/rsa/jury';
import { UI } from '@/components/rsa/jury/i18n';

function Centered({ children, minHeight = '40vh' }) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight }}>
      {children}
    </div>
  );
}

function Spinner({ size = 6, label }) {
  return (
    <Loader2
      className={`w-${size} h-${size} animate-spin`}
      style={{ color: GOLD }}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

export default function Jury() {
  const { isAuthenticated, isJury, isAdmin, loading: authLoading, authUser } = usePlatformAuth();
  const { t } = useLang();

  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // ── Auth / role gates ──────────────────────────────────────────────────
  if (authLoading) {
    return (
      <PageShell nav width="wide">
        <Centered>
          <div role="status" aria-live="polite">
            <Spinner
              label={t({ fr: 'Chargement…', en: 'Loading…', de: 'Wird geladen…' })}
            />
          </div>
        </Centered>
      </PageShell>
    );
  }
  if (!isAuthenticated) return <Navigate to="/Login" replace />;

  if (!(isJury || isAdmin)) {
    return (
      <PageShell nav width="wide">
        <Centered minHeight="50vh">
          <div className="text-center max-w-md" role="status">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
              <span
                className="uppercase text-[10px] tracking-[0.18em] font-medium"
                style={{ color: GOLD }}
              >
                {t(UI.eyebrow)}
              </span>
              <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
            </div>
            <p className="text-[15px]" style={{ color: INK }}>
              {t(UI.noAccess)}
            </p>
          </div>
        </Centered>
      </PageShell>
    );
  }

  return (
    <PageShell nav width="wide">
      <JuryWorkspace
        authUserId={authUser?.id}
        isAdmin={isAdmin}
        selectedSessionId={selectedSessionId}
        onSelectSession={setSelectedSessionId}
      />
    </PageShell>
  );
}

function JuryWorkspace({ authUserId, isAdmin, selectedSessionId, onSelectSession }) {
  const { t } = useLang();

  const sessionsQ = useMySessions(authUserId);
  // L'édition active sert pour le admin panel (cluster select). Si admin n'a pas de
  // sessions à lui (cas fréquent), on retombe sur Edition.active().
  const activeEditionQ = useQuery({
    queryKey: ['rsa', 'jury', 'active-edition'],
    queryFn: () => Edition.active(),
    staleTime: 5 * 60 * 1000,
  });

  // Bootstrap : selectionne la première session (la plus proche dans le temps).
  useEffect(() => {
    if (!selectedSessionId && sessionsQ.data?.length) {
      const sorted = [...sessionsQ.data].sort(compareSessions);
      onSelectSession(sorted[0].id);
    }
  }, [selectedSessionId, sessionsQ.data, onSelectSession]);

  const selectedSession = useMemo(() => {
    if (!selectedSessionId || !sessionsQ.data) return null;
    return sessionsQ.data.find((s) => s.id === selectedSessionId) || null;
  }, [selectedSessionId, sessionsQ.data]);

  // L'édition pour le admin panel : celle de la session sélectionnée, sinon active.
  const adminEditionId = selectedSession?.edition_id || activeEditionQ.data?.id || null;

  if (sessionsQ.isLoading) {
    return (
      <Centered>
        <div role="status" aria-live="polite">
          <Spinner
            label={t({ fr: 'Chargement des sessions…', en: 'Loading sessions…', de: 'Sessions werden geladen…' })}
          />
        </div>
      </Centered>
    );
  }

  if (sessionsQ.isError) {
    return (
      <Centered>
        <div className="text-center" role="alert">
          <p className="text-[14px] mb-3" style={{ color: INK }}>{t(UI.loadError)}</p>
          <button
            type="button"
            onClick={() => sessionsQ.refetch()}
            className={`text-[13px] font-medium px-4 py-2 rounded-[4px] ${FOCUS_RING_CLASS}`}
            style={{ color: NAVY, border: `1.5px solid ${GOLD}` }}
          >
            {t(UI.retry)}
          </button>
        </div>
      </Centered>
    );
  }

  return (
    <>
      <header className="mb-6">
        <Eyebrow>{t(UI.eyebrow)}</Eyebrow>
        <h1
          className="text-[28px] md:text-[32px] leading-tight mt-2 mb-2"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(UI.pageTitle)}
        </h1>
        <p className="text-[14px] max-w-[60ch]" style={{ color: INK, lineHeight: 1.6 }}>
          {t(UI.pageSubtitle)}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,300px)_1fr] gap-6">
        {/* Master : SessionList */}
        <div className={selectedSessionId ? 'hidden lg:block' : ''}>
          <h2
            className="text-[11px] uppercase tracking-[0.14em] font-medium mb-3"
            style={{ color: MUTED }}
          >
            {t(UI.sectionMySessions)}
          </h2>
          <SessionList
            sessions={sessionsQ.data || []}
            selectedSessionId={selectedSessionId}
            onSelect={onSelectSession}
          />
        </div>

        {/* Detail : SessionDetail (ou hint en l'absence de session sélectionnée) */}
        <div className={selectedSessionId ? '' : 'hidden lg:block'}>
          <AnimatePresence mode="wait" initial={false}>
            {selectedSession ? (
              <motion.div
                key={`session-${selectedSession.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22, ease: EASE }}
              >
                <SessionDetail
                  session={selectedSession}
                  authUserId={authUserId}
                  isAdmin={isAdmin}
                  onBack={() => onSelectSession(null)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="session-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="rounded-[4px] p-6 text-center"
                style={{ background: 'white', border: `1px solid ${CREAM2}` }}
              >
                <p className="text-[14px]" style={{ color: MUTED }}>
                  {t({ fr: 'Sélectionnez une session.', en: 'Select a session.', de: 'Wählen Sie eine Session.' })}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Admin stopgap — assignments matrix (replié par défaut) */}
      {isAdmin && (
        <JuryAssignmentsAdmin editionId={adminEditionId} adminUserId={authUserId} />
      )}
    </>
  );
}
