// MasterCockpit — coquille du cockpit Master Admin (V2 multi-club).
//
// Responsabilités :
//   * pill-toggle Élysée des 4 sous-tabs (COMPÉTITIONS / CLUBS / RÔLES GLOBAUX / FINALE FÉDÉRÉE),
//   * URL state via useSearchParams (deep-link `?tab=competitions|clubs|roles|finale`,
//     même patron qu'AdminShell),
//   * MasterStatusStrip en haut (lecture agrégée : compétition active + counts),
//   * router des tabs (composants enfants autonomes).
//
// Pas de garde de rôle ici : Admin.jsx fait le gate isMasterAdmin avant de monter ce shell.

import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import {
  CREAM2, NAVY, INK, MUTED, GOLD, EASE,
} from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { TABS, TAB_IDS, STRIP, UI } from './i18n';
import {
  useAllCompetitions,
  useAllClubs,
  useCountsForEdition,
} from './useMaster';
import CompetitionsTab from './tabs/CompetitionsTab';
import ClubsTab from './tabs/ClubsTab';
import GlobalRolesTab from './tabs/GlobalRolesTab';
import FederatedFinaleTab from './tabs/FederatedFinaleTab';
import EmailStudio from '@/components/rsa/admin/platform/comms/EmailStudio';
// V3 Vague 2 — CTA "Communiquer" pré-câblé (Feature B). Côté master, on cible
// la compétition active (ou la plus récente faute de mieux) pour résoudre
// l'audience non-sélectionnés / sélectionnés.
import CommunicatePanel from '@/components/rsa/communicate/CommunicatePanel';
import JuryApplicationsPanel from './JuryApplicationsPanel';
import CompetitionEditView from './CompetitionEditView';
import ClubEditView from './ClubEditView';
// V3.0 — Plugins/Extensions architecture (Vague 1)
import ExtensionsList from '@/components/rsa/extensions/ExtensionsList';
// V3.0 Vague 3 — Analytics real-time (Feature F)
import AnalyticsPanel from '@/components/rsa/analytics/AnalyticsPanel';

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
      aria-controls={`master-panel-${id}`}
    >
      {label}
    </button>
  );
}

function Dot({ color }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
      style={{ background: color }}
      aria-hidden
    />
  );
}

// MasterStatusStrip — bande hairline lecture agrégée plateforme.
// "Compétition active : 2027 (multiclub) · X clubs · Y candidatures · Z sessions"
function MasterStatusStrip() {
  const { t } = useLang();
  const competitions = useAllCompetitions();
  const clubsAll = useAllClubs();

  // Compétition active : 1re en status 'open'|'sessions'|'finale', sinon la + récente
  const active = useMemo(() => {
    const list = competitions.data || [];
    if (list.length === 0) return null;
    const open = list.find((c) => ['open', 'sessions', 'finale'].includes(c.status));
    return open || list[0];
  }, [competitions.data]);

  const counts = useCountsForEdition(active?.id || null);

  if (competitions.isLoading) {
    return (
      <div
        className="rounded-[4px] px-4 py-2.5 mb-6 flex items-center gap-2"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: MUTED }} />
        <span className="text-[12.5px]" style={{ color: MUTED }}>{t(UI.loading)}</span>
      </div>
    );
  }

  if (!active) {
    return (
      <div
        className="rounded-[4px] px-4 py-2.5 mb-6 text-[12.5px]"
        style={{ background: 'white', border: `1px solid ${CREAM2}`, color: INK }}
      >
        {t(STRIP.noActiveCompetition)}
      </div>
    );
  }

  const c = counts.data || {};
  return (
    <div
      className="rounded-[4px] px-4 py-2.5 mb-6 flex items-center gap-x-5 gap-y-2 flex-wrap text-[12px]"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      <span className="uppercase tracking-[0.14em] text-[10.5px]" style={{ color: MUTED }}>
        {t(STRIP.activeCompetition)}
      </span>
      <span className="inline-flex items-center gap-1.5" style={{ color: NAVY }}>
        <Dot color={GOLD} />
        <strong>{active.name}</strong>
        <span style={{ color: MUTED }}>·</span>
        <span style={{ color: INK }}>{active.year}</span>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ml-1"
          style={{
            background: active.model === 'multiclub' ? '#fdf6e8' : '#eff1f6',
            color: NAVY,
            border: `1px solid ${CREAM2}`,
          }}
        >
          {active.model}
        </span>
      </span>
      <span style={{ color: CREAM2 }}>·</span>

      <span className="inline-flex items-center gap-1.5" style={{ color: NAVY }}>
        <Dot color={GOLD} />
        <strong className="tabular-nums">{c.clubsCount ?? 0}</strong>
        <span style={{ color: INK }}>{t(STRIP.clubsCount)}</span>
      </span>
      <span className="inline-flex items-center gap-1.5" style={{ color: NAVY }}>
        <Dot color={GOLD} />
        <strong className="tabular-nums">{c.startupsCount ?? 0}</strong>
        <span style={{ color: INK }}>{t(STRIP.startupsCount)}</span>
      </span>
      <span className="inline-flex items-center gap-1.5" style={{ color: NAVY }}>
        <Dot color={GOLD} />
        <strong className="tabular-nums">{c.sessionsCount ?? 0}</strong>
        <span style={{ color: INK }}>{t(STRIP.sessionsCount)}</span>
        {((c.sessionsLive ?? 0) > 0 || (c.sessionsPublished ?? 0) > 0) && (
          <>
            <span style={{ color: MUTED }}>(</span>
            <strong className="tabular-nums">{c.sessionsLive ?? 0}</strong>
            <span style={{ color: INK }}>{t(STRIP.liveSuffix)}</span>
            <span style={{ color: MUTED }}>/</span>
            <strong className="tabular-nums">{c.sessionsPublished ?? 0}</strong>
            <span style={{ color: INK }}>{t(STRIP.publishedSuffix)}</span>
            <span style={{ color: MUTED }}>)</span>
          </>
        )}
      </span>

      <span style={{ color: CREAM2 }}>·</span>
      <span className="inline-flex items-center gap-1.5 ml-auto" style={{ color: MUTED }}>
        <strong className="tabular-nums" style={{ color: NAVY }}>
          {(competitions.data || []).length}
        </strong>
        <span>{t(STRIP.totalCompetitions)}</span>
        <span style={{ color: CREAM2 }}>·</span>
        <strong className="tabular-nums" style={{ color: NAVY }}>
          {(clubsAll.data || []).length}
        </strong>
        <span>{t(STRIP.clubsCount)}</span>
      </span>
    </div>
  );
}

export default function MasterCockpit() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();

  // ── Compétition active pour CommunicatePanel (V3 Vague 2) ────────────────
  // On résout la même édition que MasterStatusStrip (1re en open/sessions/finale,
  // sinon la + récente). Le CommunicatePanel a besoin d'un editionId pour
  // résoudre l'audience non-sélectionnés / sélectionnés.
  const allCompetitions = useAllCompetitions();
  const activeCompetition = useMemo(() => {
    const list = allCompetitions.data || [];
    if (list.length === 0) return null;
    const open = list.find((c) => ['open', 'sessions', 'finale'].includes(c.status));
    return open || list[0];
  }, [allCompetitions.data]);

  // URL state : ?tab=competitions|clubs|roles|finale|comms
  const tab = (params.get('tab') && TAB_IDS.includes(params.get('tab')))
    ? params.get('tab')
    : 'competitions';

  // V3 — Subview pour les vues d'édition plein-cockpit.
  //   ?subview=edit-competition&id={editionId} → CompetitionEditView
  //   ?subview=edit-club&id={clubId}           → ClubEditView
  const subview = params.get('subview');
  const subviewId = params.get('id');

  const setTab = (next) => {
    const p = new URLSearchParams(params);
    p.set('tab', next);
    // Quitter le subview quand on bascule de tab.
    p.delete('subview');
    p.delete('id');
    setParams(p, { replace: true });
  };

  const clearSubview = () => {
    const p = new URLSearchParams(params);
    p.set('tab', tab);
    p.delete('subview');
    p.delete('id');
    setParams(p, { replace: true });
  };

  // Sous-vue d'édition de compétition — remplace le shell standard.
  if (subview === 'edit-competition' && subviewId && tab === 'competitions') {
    return (
      <CompetitionEditView
        editionId={subviewId}
        onClose={clearSubview}
      />
    );
  }

  // Sous-vue d'édition de club — remplace le shell standard.
  if (subview === 'edit-club' && subviewId && tab === 'clubs') {
    return (
      <ClubEditView
        clubId={subviewId}
        onClose={clearSubview}
      />
    );
  }

  return (
    <>
      <MasterStatusStrip />

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 mb-6" role="tablist">
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

      {/* Panel body */}
      <div id={`master-panel-${tab}`} role="tabpanel" aria-labelledby={`master-tab-${tab}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            {tab === 'competitions' && <CompetitionsTab />}
            {tab === 'clubs'        && <ClubsTab />}
            {tab === 'roles'        && <GlobalRolesTab />}
            {tab === 'jury_apps'    && <JuryApplicationsPanel />}
            {tab === 'finale'       && <FederatedFinaleTab />}
            {tab === 'comms'        && (
              <>
                <CommunicatePanel editionId={activeCompetition?.id || null} clubId={null} />
                <EmailStudio /* clubId undefined = master global */ />
              </>
            )}
            {tab === 'analytics'    && (
              <AnalyticsPanel
                scope="master"
                editionId={activeCompetition?.id || null}
                clubId={null}
              />
            )}
            {tab === 'extensions'   && <ExtensionsList scope="master" />}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
