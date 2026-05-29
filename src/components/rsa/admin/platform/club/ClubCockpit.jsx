// ClubCockpit — coquille du Cockpit Club (V2 multi-club, étape 6).
//
// Décliné depuis AdminShell.jsx (legacy SSOT pour Setup/Live/Results). Mêmes
// fondations Élysée :
//   * picker compétition (édition active par défaut),
//   * picker session quand pertinent (LIVE / RESULTS),
//   * tabs pill : SETUP / LIVE / RESULTS / TEAM / RULES,
//   * URL state via useSearchParams (deep-link ?tab=live&edition=…&session=…),
//   * ClubStatusStrip en haut (synthèse club-scoped).
//
// Le clubId vient en prop (passé par src/pages/Admin.jsx via le selector de
// scope) ; il ne change pas pendant la session courante. Si l'utilisateur change
// de club via le selector parent, Admin.jsx remonte un nouveau ClubCockpit (key
// implicite via remount), ce qui re-bootstrap l'URL state.
//
// Pas de garde de rôle ici : Admin.jsx l'a déjà faite (master_admin OU club_admin
// du club courant). Le serveur reste l'ultime frontière (RLS + RPC étendus).

import React, { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, MapPin, Mail } from 'lucide-react';
import { GOLD, NAVY, INK, MUTED, CREAM2, SERIF, EASE, TINT_ADMIN } from '@/components/design/tokens';
import { DANGER, FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import CockpitTabs from '@/components/design/shell/CockpitTabs';
import { useLang } from '@/lib/platform/i18n';
import { CLUB_TABS, CLUB_UI, TAB_IDS } from './i18n';
import ClubStatusStrip from './ClubStatusStrip';
import ClubSetupTab from './tabs/SetupTab';
import ClubLiveTab from './tabs/LiveTab';
import ClubResultsTab from './tabs/ResultsTab';
import ClubTeamTab from './tabs/TeamTab';
import ClubRulesTab from './tabs/RulesTab';
import JuryApplicationsTab from './tabs/JuryApplicationsTab';
// CommsTab : monté seulement si l'EmailStudio M9 a livré son shell (lazy import pour
// rester tolérant pendant la mise en place — fallback minimal sinon).
import EmailStudio from '@/components/rsa/admin/platform/comms/EmailStudio';
// V3 Vague 2 — CTA "Communiquer" pré-câblé (Feature B). Affiché au-dessus du
// shell EmailStudio dans l'onglet Communications du Club Cockpit.
import CommunicatePanel from '@/components/rsa/communicate/CommunicatePanel';
// V2.5 — Module Prix
import PrizesList from '@/components/rsa/prizes/PrizesList';
// V3.0 Vague 3 — Analytics real-time (Feature F)
import AnalyticsPanel from '@/components/rsa/analytics/AnalyticsPanel';
import { useClub, useClubEditions, useClubSessions } from './useClub';

function Spinner({ label }) {
  return (
    <Loader2
      className="w-5 h-5 animate-spin"
      style={{ color: GOLD }}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

export default function ClubCockpit({ clubId }) {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();

  // ── URL state (deep-link friendly, mirror AdminShell shape) ─────────────
  const tab = (params.get('tab') && TAB_IDS.includes(params.get('tab')))
    ? params.get('tab')
    : 'setup';
  const editionId = params.get('edition') || null;
  const sessionId = params.get('session') || null;

  const setTab = (next) => {
    const p = new URLSearchParams(params);
    p.set('tab', next);
    setParams(p, { replace: true });
  };
  const setEdition = (next) => {
    const p = new URLSearchParams(params);
    if (next) p.set('edition', next); else p.delete('edition');
    p.delete('session'); // reset session quand on change d'édition
    setParams(p, { replace: true });
  };
  const setSession = (next) => {
    const p = new URLSearchParams(params);
    if (next) p.set('session', next); else p.delete('session');
    setParams(p, { replace: true });
  };

  // ── Données club + éditions ──────────────────────────────────────────────
  const clubQ = useClub(clubId);
  const editionsQ = useClubEditions();
  const editions = editionsQ.data || [];

  // Bootstrap : 1re 'open' puis la + récente.
  useEffect(() => {
    if (editionId || !editions.length) return;
    const open = editions.find((e) => e.status === 'open');
    const fallback = open || editions[0];
    if (fallback) {
      const p = new URLSearchParams(params);
      p.set('edition', fallback.id);
      setParams(p, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editionId, editions.length]);

  const edition = useMemo(
    () => editions.find((e) => e.id === editionId) || null,
    [editions, editionId],
  );

  // Sessions du club pour l'édition courante (filtrées serveur+client).
  const sessionsQ = useClubSessions(editionId, clubId);
  const sessions = sessionsQ.data || [];

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === sessionId) || null,
    [sessions, sessionId],
  );

  // Bootstrap session : si on est sur LIVE/RESULTS sans session, prend la 1re.
  useEffect(() => {
    if (sessionId || !sessions.length) return;
    if (tab === 'live' || tab === 'results') {
      const p = new URLSearchParams(params);
      p.set('session', sessions[0].id);
      setParams(p, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, sessions.length, tab]);

  // ── Header club ──────────────────────────────────────────────────────────
  const club = clubQ.data;
  const clubLabel = club?.name || clubId;

  return (
    <>
      {/* En-tête éditorial CLUB */}
      <section className="mb-5">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
          <span
            className="uppercase text-[10px] tracking-[0.18em] font-medium"
            style={{ color: GOLD }}
          >
            {t(CLUB_UI.eyebrow)} · {clubLabel}
          </span>
        </div>
        <h2
          className="text-[24px] leading-tight mb-1"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(CLUB_UI.titlePrefix)} {clubLabel}
        </h2>
        <p className="text-[13.5px]" style={{ color: INK }}>{t(CLUB_UI.subtitle)}</p>
        {clubQ.isLoading && (
          <p className="text-[12px] mt-2" style={{ color: MUTED }}>{t(CLUB_UI.loadingClub)}</p>
        )}
        {!clubQ.isLoading && !club && (
          <p className="text-[12.5px] mt-2" role="alert" style={{ color: DANGER }}>{t(CLUB_UI.clubNotFound)}</p>
        )}
        {club && (club.region || club.contact_email || club.contact_name) && (
          <div className="mt-3 flex items-center gap-4 flex-wrap text-[12px]" style={{ color: MUTED }}>
            {club.region && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {club.region}
              </span>
            )}
            {(club.contact_name || club.contact_email) && (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {club.contact_name && <span>{club.contact_name}</span>}
                {club.contact_email && (
                  <a
                    href={`mailto:${club.contact_email}`}
                    className={`underline decoration-1 underline-offset-2 rounded-[2px] ${FOCUS_RING_CLASS}`}
                    style={{ color: NAVY }}
                  >
                    {club.contact_email}
                  </a>
                )}
              </span>
            )}
          </div>
        )}
      </section>

      <ClubStatusStrip edition={edition} clubId={clubId} sessions={sessions} />

      {/* Filter row — pickers édition/session (vrais filtres de data, distincts des tabs nav) */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <label className="inline-flex items-center gap-2 text-[12.5px]" style={{ color: INK }}>
          <span className="uppercase tracking-[0.14em] text-[10.5px] font-medium" style={{ color: MUTED }}>
            {t(CLUB_UI.edition)}
          </span>
          <select
            value={editionId || ''}
            onChange={(e) => setEdition(e.target.value)}
            className={`rounded-[4px] px-2.5 py-1.5 text-[12.5px] ${FOCUS_RING_CLASS}`}
            style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
          >
            {editions.length === 0 && <option value="">—</option>}
            {editions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} · {e.status}
              </option>
            ))}
          </select>
        </label>

        {/* Session picker (LIVE / RESULTS) */}
        {(tab === 'live' || tab === 'results') && (
          <label className="inline-flex items-center gap-2 text-[12.5px]" style={{ color: INK }}>
            <span className="uppercase tracking-[0.14em] text-[10.5px] font-medium" style={{ color: MUTED }}>
              {t(CLUB_UI.session)}
            </span>
            <select
              value={sessionId || ''}
              onChange={(e) => setSession(e.target.value)}
              disabled={sessions.length === 0}
              className={`rounded-[4px] px-2.5 py-1.5 text-[12.5px] ${FOCUS_RING_CLASS}`}
              style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
            >
              {sessions.length === 0 && <option value="">—</option>}
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.config?.status || 'draft'}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Tabs box — fond TINT_ADMIN clair, pour séparer du fond CREAM page. */}
      <div
        className="rounded-[4px] px-3 md:px-4 pt-2 mb-4"
        style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
      >
        <CockpitTabs
          idPrefix="club"
          items={TAB_IDS.map((id) => ({ id, label: t(CLUB_TABS[id]) }))}
          active={tab}
          onChange={setTab}
          ariaLabel={t(CLUB_UI.eyebrow)}
        />
      </div>

      {/* Panel body — surface blanche + hairline pour se détacher du fond CREAM. */}
      <div
        id={`club-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`club-tab-${tab}`}
        className="rounded-[4px] p-4 md:p-6"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        {editionsQ.isLoading && (
          <div className="py-12 flex justify-center" role="status" aria-live="polite">
            <Spinner
              label={t({ fr: 'Chargement…', en: 'Loading…', de: 'Wird geladen…' })}
            />
          </div>
        )}
        {!editionsQ.isLoading && (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              {tab === 'setup' && (
                <ClubSetupTab
                  edition={edition}
                  clubId={clubId}
                  sessions={sessions}
                  isSessionsLoading={sessionsQ.isLoading}
                  onSelectSession={setSession}
                />
              )}
              {tab === 'live' && (
                <ClubLiveTab edition={edition} clubId={clubId} session={selectedSession} />
              )}
              {tab === 'results' && (
                <ClubResultsTab
                  edition={edition}
                  clubId={clubId}
                  session={selectedSession}
                  sessions={sessions}
                  onSelectSession={setSession}
                />
              )}
              {tab === 'team' && (
                <ClubTeamTab clubId={clubId} />
              )}
              {tab === 'jury_applications' && (
                <JuryApplicationsTab clubId={clubId} />
              )}
              {tab === 'rules' && (
                <ClubRulesTab edition={edition} clubId={clubId} />
              )}
              {tab === 'prizes' && (
                <PrizesList editionId={editionId} clubId={clubId} scope="club" />
              )}
              {tab === 'comms' && (
                <>
                  <CommunicatePanel editionId={editionId} clubId={clubId} />
                  <EmailStudio clubId={clubId} edition={edition} />
                </>
              )}
              {tab === 'analytics' && (
                <AnalyticsPanel scope="club" editionId={editionId} clubId={clubId} />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </>
  );
}
