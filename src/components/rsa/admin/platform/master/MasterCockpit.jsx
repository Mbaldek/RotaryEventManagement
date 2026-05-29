// MasterCockpit — coquille du cockpit Master Admin (V2 multi-club).
//
// Responsabilités :
//   * pill-toggle Élysée des 4 sous-tabs (COMPÉTITIONS / CLUBS / RÔLES GLOBAUX / FINALE),
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
  CREAM2, NAVY, INK, MUTED, GOLD, EASE, CockpitTabs, TINT_ADMIN,
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
import CompetitionAdminsTab from './tabs/CompetitionAdminsTab';
// FinaleTab retiré du master cockpit 2026-05-29 : la Finale est un attribut
// d'une compétition (editions.has_finale), elle vit dans CompetitionEditView
// > tab Finale (combine FinaleSection toggle + FinaleManagement contenu).
// Pas un objet plateforme standalone.
// JuryApplicationsPanel retiré du master cockpit 2026-05-29 : les candidatures
// jury sont scopées (edition_id, club_id) et arrivent directement chez le
// club_admin du club concerné via /DevenirJury?edition=X&club=Y. Le master_admin
// peut bascule via le persona selector vers un club s'il veut consulter.
// Composant gardé temporairement, à supprimer une fois confirmé inutile.
import CompetitionEditView from './CompetitionEditView';
import ClubEditView from './ClubEditView';
// Équipe A — Overview landing + Advanced consolidation. Les tabs comms /
// extensions / analytics / marketplace sont absorbés ici (voir TAB_IDS).
import OverviewPanel from './OverviewPanel';
import AdvancedSection from './AdvancedSection';

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

  // URL state : ?tab=overview|competitions|clubs|roles|jury_apps|finale|advanced
  // Default = 'overview' (équipe A — landing dashboard).
  const tab = (params.get('tab') && TAB_IDS.includes(params.get('tab')))
    ? params.get('tab')
    : 'overview';

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

      {/* Tabs box — fond TINT_ADMIN clair, pour séparer du fond CREAM page. */}
      <div
        className="rounded-[4px] px-3 md:px-4 pt-2 mb-4"
        style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
      >
        <CockpitTabs
          idPrefix="master"
          items={TAB_IDS.map((id) => ({ id, label: t(TABS[id]) }))}
          active={tab}
          onChange={setTab}
          ariaLabel="Master cockpit navigation"
        />
      </div>

      {/* Panel body — surface blanche + hairline pour se détacher du fond CREAM. */}
      <div
        id={`master-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`master-tab-${tab}`}
        className="rounded-[4px] p-4 md:p-6"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            {tab === 'overview'           && <OverviewPanel />}
            {tab === 'competitions'       && <CompetitionsTab />}
            {tab === 'clubs'              && <ClubsTab />}
            {tab === 'roles'              && <GlobalRolesTab />}
            {tab === 'competition_admins' && <CompetitionAdminsTab />}
            {tab === 'advanced'           && <AdvancedSection />}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
