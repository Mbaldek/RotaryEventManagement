// AdminShell — coquille du cockpit admin (Module 4a).
//
// Responsabilités :
//   * picker édition (édition active par défaut),
//   * picker session quand pertinent (LIVE / RESULTS),
//   * pill-toggle Élysée des 3 sous-tabs (SETUP / LIVE / RESULTS),
//   * URL state via useSearchParams (deep-link `?tab=live&session=…&edition=…` — mirror
//     du legacy RsaAdmin, pre-decided default §11.13),
//   * ModuleStatusStrip en haut,
//   * router des tabs (composants enfants reçoivent edition / session courants).
//
// Pas de garde de rôle ici : Admin.jsx fait le gate isAdmin avant de monter ce shell.

import React, { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { GOLD, NAVY, INK, MUTED, CREAM2 } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { TABS, UI } from './i18n';
import ModuleStatusStrip from './ModuleStatusStrip';
import SetupTab from './tabs/SetupTab';
import LiveTab from './tabs/LiveTab';
import ResultsTab from './tabs/ResultsTab';
import { useAdminEditions, useSessionsAdmin } from './useAdmin';

const TAB_IDS = ['setup', 'live', 'results'];

function Spinner() {
  return <Loader2 className="w-5 h-5 animate-spin" style={{ color: GOLD }} aria-hidden />;
}

function Tab({ id, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-full text-[12.5px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] transition-colors"
      style={{
        background: active ? NAVY : 'white',
        color: active ? 'white' : INK,
        border: `1px solid ${active ? NAVY : CREAM2}`,
      }}
      aria-pressed={active}
      aria-controls={`admin-panel-${id}`}
    >
      {label}
    </button>
  );
}

export default function AdminShell() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();

  // ── URL state (deep-link friendly, mirror legacy RsaAdmin shape) ─────────
  const tab        = (params.get('tab') && TAB_IDS.includes(params.get('tab')))
    ? params.get('tab')
    : 'setup';
  const editionId  = params.get('edition') || null;
  const sessionId  = params.get('session') || null;

  const setTab = (next) => {
    const p = new URLSearchParams(params);
    p.set('tab', next);
    setParams(p, { replace: true });
  };
  const setEdition = (next) => {
    const p = new URLSearchParams(params);
    if (next) p.set('edition', next); else p.delete('edition');
    // Reset session quand on change d'édition (l'ID de session n'a de sens qu'au sein
    // d'une édition).
    p.delete('session');
    setParams(p, { replace: true });
  };
  const setSession = (next) => {
    const p = new URLSearchParams(params);
    if (next) p.set('session', next); else p.delete('session');
    setParams(p, { replace: true });
  };

  // ── Données globales ─────────────────────────────────────────────────────
  const editionsQ = useAdminEditions();
  const editions  = editionsQ.data || [];

  // Bootstrap : si pas d'édition dans l'URL, on prend la 1re 'open' puis la + récente.
  useEffect(() => {
    if (editionId || !editions.length) return;
    const open = editions.find((e) => e.status === 'open');
    const fallback = open || editions[0];
    if (fallback) {
      // Ne pas appeler setEdition (qui drop session) car on initialise — on écrit directement.
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

  const sessionsQ = useSessionsAdmin(editionId);
  const sessions  = sessionsQ.data || [];
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

  return (
    <>
      <ModuleStatusStrip edition={edition} />

      {/* Edition + sub-tabs pill row. Sticky-friendly mais on n'y met pas position
          sticky pour éviter l'overlap visuel avec le halo CREAM du PageShell. */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Edition picker */}
        <label className="inline-flex items-center gap-2 text-[12.5px]" style={{ color: INK }}>
          <span className="uppercase tracking-[0.14em] text-[10.5px]" style={{ color: MUTED }}>
            {t(UI.edition)}
          </span>
          <select
            value={editionId || ''}
            onChange={(e) => setEdition(e.target.value)}
            className="rounded-[4px] px-2.5 py-1.5 text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
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

        {/* Session picker (visible quand LIVE ou RESULTS) */}
        {(tab === 'live' || tab === 'results') && (
          <label className="inline-flex items-center gap-2 text-[12.5px]" style={{ color: INK }}>
            <span className="uppercase tracking-[0.14em] text-[10.5px]" style={{ color: MUTED }}>
              {t(UI.session)}
            </span>
            <select
              value={sessionId || ''}
              onChange={(e) => setSession(e.target.value)}
              disabled={sessions.length === 0}
              className="rounded-[4px] px-2.5 py-1.5 text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
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

        {/* Pill tab row */}
        <div className="flex flex-wrap gap-1.5 ml-auto" role="tablist">
          {TAB_IDS.map((id) => (
            <Tab
              key={id}
              id={id}
              active={tab === id}
              label={t(TABS[id])}
              onClick={() => setTab(id)}
            />
          ))}
        </div>
      </div>

      {/* Panel body */}
      <div id={`admin-panel-${tab}`} role="tabpanel" aria-labelledby={`admin-tab-${tab}`}>
        {editionsQ.isLoading && (
          <div className="py-12 flex justify-center">
            <Spinner />
          </div>
        )}
        {!editionsQ.isLoading && tab === 'setup' && (
          <SetupTab
            edition={edition}
            sessions={sessions}
            isSessionsLoading={sessionsQ.isLoading}
            onSelectSession={setSession}
          />
        )}
        {!editionsQ.isLoading && tab === 'live' && (
          <LiveTab
            edition={edition}
            session={selectedSession}
          />
        )}
        {!editionsQ.isLoading && tab === 'results' && (
          <ResultsTab
            edition={edition}
            session={selectedSession}
            sessions={sessions}
            onSelectSession={setSession}
          />
        )}
      </div>
    </>
  );
}
