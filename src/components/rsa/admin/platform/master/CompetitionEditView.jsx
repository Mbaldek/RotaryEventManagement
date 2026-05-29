// CompetitionEditView — vue PLEIN-COCKPIT pour ÉDITER une compétition existante.
//
// Layout (pas modal, vue normale dans MasterCockpit) :
//   * Header : bouton "← Compétitions" + eyebrow gold + titre Playfair
//     "Édition de compétition · {name}" + statut autosave aligné à droite.
//   * Pill row de tabs (6 — IDENTITÉ / CALENDRIER / CLUBS / RÈGLES / PRIX /
//     COMMUNICATION) — TOUS éditables (pas de mode création progressive).
//   * Body : render de la tab active.
//   * Footer : lien rouge subtil "Supprimer cette compétition" (à gauche)
//     ouvre la DeleteCompetitionModal existante.
//
// Reçoit `editionId` (string), récupère la compétition depuis le cache via
// useAllCompetitions, monte useAutosaveCompetition pour pousser chaque patch.
// Les tabs sont partagées avec CompetitionFunnel (mêmes composants).

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  CREAM2, GOLD, MUTED, NAVY, SERIF,
} from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import CockpitTabs from '@/components/design/shell/CockpitTabs';
import { useLang } from '@/lib/platform/i18n';
import { StatusIndicator } from '../funnel/FunnelEditorModal';
import useAutosaveCompetition from '../funnel/useAutosaveCompetition';
import { COMP, UI } from './i18n';
import { useAllCompetitions } from './useMaster';
import IdentityTab from './competition-tabs/IdentityTab';
import CalendarTab from './competition-tabs/CalendarTab';
import ClubsTab from './competition-tabs/ClubsTab';
import RulesTab from './competition-tabs/RulesTab';
import PrizesTab from './competition-tabs/PrizesTab';
import CommunicationTab from './competition-tabs/CommunicationTab';
import DeleteCompetitionModal from './DeleteCompetitionModal';

export default function CompetitionEditView({ editionId, onClose }) {
  const { t } = useLang();
  const competitions = useAllCompetitions();
  const competition = useMemo(
    () => (competitions.data || []).find((c) => c.id === editionId) || null,
    [competitions.data, editionId],
  );

  const [activeTab, setActiveTab] = useState('identity');
  const [deleteStep, setDeleteStep] = useState(0);

  // Init des valeurs autosave depuis la compétition. On remonte un hook par
  // editionId (key sur le composant ne serait pas nécessaire ici car
  // useAutosaveCompetition track lastSavedAt + pendingRef pour le bon ID).
  const initialValues = useMemo(() => {
    if (!competition) return {};
    return {
      id:                       competition.id,
      name:                     competition.name || '',
      year:                     competition.year ?? '',
      status:                   competition.status || 'draft',
      model:                    competition.model || 'multiclub',
      finalists_per_session:    competition.finalists_per_session ?? 1,
      application_open:         competition.application_open || null,
      application_close:        competition.application_close || null,
      selection_date:           competition.selection_date || null,
      finale_date:              competition.finale_date || null,
      awards_date:              competition.awards_date || null,
      eligibility_rules:        competition.eligibility_rules || {},
      public_results_enabled:   !!competition.public_results_enabled,
      description_md:           competition.description_md || '',
      // Champs legacy non éditables ici mais à préserver côté state.
      prize_main:               competition.prize_main ?? null,
      prize_special:            competition.prize_special ?? null,
    };
  }, [competition]);

  const auto = useAutosaveCompetition({
    editionId: editionId || null,
    initialValues,
    debounceMs: 600,
  });
  const { values, patch, reset, status, statusMessage } = auto;

  // Rehydrate quand la compétition serveur change (ex. nouveau fetch après
  // invalidation suite à une mutation externe). Compare sur quelques clés
  // sensibles pour éviter de bouger en boucle.
  useEffect(() => {
    if (!competition) return;
    // Premier mount → l'init est faite par useAutosaveCompetition.initialValues.
    // Ici on ne fait rien d'agressif, on laisse le state local prévaloir tant que
    // l'utilisateur n'a pas explicitement quitté la vue. (Si besoin un jour, on
    // peut comparer updated_at vs lastSavedAt et reset proprement.)
    // Cf. EditionEditor.jsx pour le même choix conservateur.
  }, [competition?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const competitionRef = useMemo(() => ({
    id: editionId,
    name: values.name,
    model: values.model,
  }), [editionId, values.name, values.model]);

  const tabs = useMemo(() => ([
    {
      id: 'identity',
      label: t(COMP.tabIdentity),
      render: () => <IdentityTab values={values} onPatch={patch} mode="edit" />,
    },
    {
      id: 'calendar',
      label: t(COMP.tabCalendar),
      render: () => <CalendarTab values={values} onPatch={patch} />,
    },
    {
      id: 'clubs',
      label: t(COMP.tabClubs),
      disabled: values.model === 'monoclub',
      render: () => <ClubsTab competition={competitionRef} mode="edit" />,
    },
    {
      id: 'rules',
      label: t(COMP.tabRules),
      render: () => <RulesTab values={values} onPatch={patch} />,
    },
    {
      id: 'prizes',
      label: t(COMP.tabPrizes),
      render: () => <PrizesTab competition={competitionRef} mode="edit" />,
    },
    {
      id: 'comm',
      label: t(COMP.tabCommunication),
      render: () => <CommunicationTab values={values} onPatch={patch} />,
    },
  ]), [t, values, patch, competitionRef]);

  if (competitions.isLoading) {
    return (
      <div className="py-10 flex items-center justify-center gap-2" style={{ color: MUTED }}>
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-[13px]">{t(UI.loading)}</span>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="py-10 text-center">
        <p className="text-[13px]" style={{ color: MUTED }}>
          {t({
            fr: 'Compétition introuvable.',
            en: 'Competition not found.',
            de: 'Wettbewerb nicht gefunden.',
          })}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px]"
          style={{ background: 'white', color: NAVY, border: `1px solid ${CREAM2}` }}
        >
          <ArrowLeft className="w-4 h-4" /> {t(COMP.backToCompetitions)}
        </button>
      </div>
    );
  }

  return (
    <section>
      {/* Header */}
      <div className="mb-4 flex items-start gap-3 flex-wrap">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-[12.5px] px-2.5 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ background: 'white', color: NAVY, border: `1px solid ${CREAM2}` }}
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          {t(COMP.backToCompetitions)}
        </button>
        <div className="flex-1 min-w-0">
          <p
            className="uppercase tracking-[0.18em] text-[10.5px] font-medium"
            style={{ color: GOLD }}
          >
            {t(COMP.funnelEyebrow)}
          </p>
          <h2
            className="text-[22px] md:text-[26px] leading-tight"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 400 }}
          >
            {t(COMP.funnelEditTitle)}
            {competition.name && (
              <>
                <span style={{ color: MUTED }}> · </span>
                <span>{competition.name}</span>
              </>
            )}
          </h2>
        </div>
        <div className="self-center">
          <StatusIndicator status={status} statusMessage={statusMessage} />
        </div>
      </div>

      {/* Tabs — underline editorial style */}
      <CockpitTabs
        idPrefix="competition-edit"
        items={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          disabled: tab.disabled,
        }))}
        active={activeTab}
        onChange={setActiveTab}
        ariaLabel="Competition edit navigation"
        className="mb-5"
      />

      {/* Body */}
      <div
        id={`competition-edit-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`competition-edit-tab-${activeTab}`}
        className="rounded-[4px] p-5 mb-4"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        {tabs.find((tab) => tab.id === activeTab)?.render?.()}
      </div>

      {/* Footer destructif */}
      <div
        className="pt-4 mt-2 flex items-center justify-between gap-3 flex-wrap"
        style={{ borderTop: `1px solid ${CREAM2}` }}
      >
        <button
          type="button"
          onClick={() => setDeleteStep(1)}
          className="text-[11.5px] underline opacity-60 hover:opacity-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] rounded-[2px]"
          style={{ color: DANGER }}
        >
          {t(COMP.deleteCompetitionLink)}
        </button>
        <StatusIndicator status={status} statusMessage={statusMessage} />
      </div>

      <DeleteCompetitionModal
        competition={competition}
        step={deleteStep}
        setStep={setDeleteStep}
        onDeleted={() => {
          setDeleteStep(0);
          onClose?.();
        }}
      />
    </section>
  );
}
