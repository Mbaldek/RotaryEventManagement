// CompetitionFunnel — modal funnel pour CRÉER une nouvelle compétition.
//
// Flow :
//   1. Modal s'ouvre sur tab "Identité" vide ; les 5 autres tabs sont
//      verrouillées (disabled) tant que la compétition n'a pas été créée.
//   2. User remplit id + name + year + model → quand tous valides, bouton
//      "Créer et continuer" déclenche useCreateCompetition.
//   3. Success → on a un editionId → on bascule en mode autosave (les autres
//      tabs deviennent éditables, chaque change autosave debounced).
//   4. User édite librement, l'indicateur "Enregistré il y a Xs" rassure.
//   5. User ferme → flush autosave → toast "Compétition créée" → onClose.
//
// Le composant reste DRY avec CompetitionEditView en partageant les tab
// renderers (IdentityTab, CalendarTab, etc.).

import React, { useCallback, useMemo, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { CREAM2, INK, MUTED, NAVY } from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import FunnelEditorModal from '../funnel/FunnelEditorModal';
import useAutosaveCompetition from '../funnel/useAutosaveCompetition';
import {
  COMP, KEBAB_REGEX, UI,
} from './i18n';
import { useCreateCompetition } from './useMaster';
import IdentityTab from './competition-tabs/IdentityTab';
import CalendarTab from './competition-tabs/CalendarTab';
import ClubsTab from './competition-tabs/ClubsTab';
import RulesTab from './competition-tabs/RulesTab';
import PrizesTab from './competition-tabs/PrizesTab';
import CommunicationTab from './competition-tabs/CommunicationTab';
import { SectionNote } from './competition-tabs/fields';

const TAB_ORDER = ['identity', 'calendar', 'clubs', 'rules', 'prizes', 'comm'];

export default function CompetitionFunnel({ open, onClose, onCreated }) {
  const { t } = useLang();
  const create = useCreateCompetition();

  const [activeTab, setActiveTab] = useState('identity');
  const [createdId, setCreatedId] = useState(null);
  const [createError, setCreateError] = useState(null);

  // Autosave hook — editionId arrive après création ; tant qu'il est null, le
  // hook accumule les patchs en local sans taper Supabase. Au moment du create
  // success on push l'editionId puis on flush ce qui s'est accumulé.
  const auto = useAutosaveCompetition({
    editionId: createdId,
    initialValues: {
      id: '',
      name: '',
      year: new Date().getFullYear() + 1,
      model: 'multiclub',
      status: 'draft',
      finalists_per_session: 1,
      application_open: null,
      application_close: null,
      selection_date: null,
      finale_date: null,
      awards_date: null,
      eligibility_rules: {},
      public_results_enabled: false,
    },
    debounceMs: 600,
  });

  const { values, patch, flush, status, statusMessage, reset } = auto;

  const isCreated = !!createdId;

  // Validation identity (avant create)
  const identityErrors = useMemo(() => {
    const errs = {};
    if (isCreated) return errs;
    const id = String(values.id || '').trim().toLowerCase();
    if (id && !KEBAB_REGEX.test(id)) errs.id = t(COMP.invalidId);
    return errs;
  }, [values.id, isCreated, t]);

  const canCreate = useMemo(() => {
    if (isCreated) return false;
    const id = String(values.id || '').trim().toLowerCase();
    const name = String(values.name || '').trim();
    const year = Number(values.year);
    if (!id || !KEBAB_REGEX.test(id)) return false;
    if (!name) return false;
    if (!Number.isFinite(year) || year < 2020 || year > 2100) return false;
    if (!['monoclub', 'multiclub'].includes(values.model)) return false;
    return true;
  }, [values, isCreated]);

  const handleCreate = useCallback(async () => {
    if (!canCreate) return;
    setCreateError(null);
    const id = String(values.id || '').trim().toLowerCase();
    try {
      await create.mutateAsync({
        id,
        name: String(values.name || '').trim(),
        year: Number(values.year),
        model: values.model,
      });
      setCreatedId(id);
      // Une fois createdId set, l'autosave est armé. On flush les éventuels
      // champs non-création (status, finalists, etc.) que le user aurait déjà
      // saisis avant de cliquer "Créer et continuer".
      // (Le patch suivant déclenchera la sauvegarde naturellement.)
      // NB : on ne flush pas immédiatement car editionIdRef n'a pas encore
      // été mis à jour par le useEffect du hook ; les patchs ultérieurs
      // captureront le delta restant.
    } catch (err) {
      setCreateError(err?.message || 'Error');
    }
  }, [canCreate, create, values]);

  const handleClose = useCallback(async () => {
    // Flush final avant fermeture (best effort).
    try { await flush?.(); } catch { /* noop */ }
    if (isCreated) {
      toast.success(t(COMP.competitionCreated), {
        description: values.name ? `« ${values.name} »` : undefined,
      });
      onCreated?.(createdId);
    }
    // Reset interne pour la prochaine ouverture.
    reset({
      id: '',
      name: '',
      year: new Date().getFullYear() + 1,
      model: 'multiclub',
      status: 'draft',
      finalists_per_session: 1,
      eligibility_rules: {},
      public_results_enabled: false,
    });
    setCreatedId(null);
    setCreateError(null);
    setActiveTab('identity');
    onClose?.();
  }, [flush, isCreated, t, values.name, onCreated, createdId, reset, onClose]);

  // Construit l'objet "competition" minimal à passer aux tabs Clubs/Prizes
  // (qui ont besoin de comp.id et comp.model pour leur affichage).
  const competitionRef = useMemo(() => ({
    id: createdId,
    name: values.name,
    model: values.model,
  }), [createdId, values.name, values.model]);

  const tabs = useMemo(() => ([
    {
      id: 'identity',
      label: t(COMP.tabIdentity),
      render: () => (
        <div className="space-y-5">
          {!isCreated && (
            <SectionNote>{t(COMP.identityFirstHint)}</SectionNote>
          )}
          <IdentityTab
            values={values}
            onPatch={patch}
            mode={isCreated ? 'edit' : 'create'}
            errors={identityErrors}
          />
          {!isCreated && (
            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleCreate}
                disabled={!canCreate || create.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50"
                style={{ background: NAVY, color: 'white' }}
              >
                {create.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Sparkles className="w-4 h-4" />}
                {t(COMP.createAndContinue)}
              </button>
              {createError && (
                <span className="text-[12px]" style={{ color: DANGER }}>{createError}</span>
              )}
              {!createError && !canCreate && (
                <span className="text-[11.5px]" style={{ color: MUTED }}>
                  {t({
                    fr: 'Renseignez identifiant, nom, année et modèle pour continuer.',
                    en: 'Fill in identifier, name, year and model to continue.',
                    de: 'Erfassen Sie Kennung, Name, Jahr und Modell, um fortzufahren.',
                  })}
                </span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'calendar',
      label: t(COMP.tabCalendar),
      disabled: !isCreated,
      render: () => <CalendarTab values={values} onPatch={patch} />,
    },
    {
      id: 'clubs',
      label: t(COMP.tabClubs),
      disabled: !isCreated || values.model === 'monoclub',
      render: () => <ClubsTab competition={competitionRef} mode={isCreated ? 'edit' : 'create'} />,
    },
    {
      id: 'rules',
      label: t(COMP.tabRules),
      disabled: !isCreated,
      render: () => <RulesTab values={values} onPatch={patch} />,
    },
    {
      id: 'prizes',
      label: t(COMP.tabPrizes),
      disabled: !isCreated,
      render: () => <PrizesTab competition={competitionRef} mode={isCreated ? 'edit' : 'create'} />,
    },
    {
      id: 'comm',
      label: t(COMP.tabCommunication),
      disabled: !isCreated,
      render: () => <CommunicationTab values={values} onPatch={patch} />,
    },
  ]), [t, isCreated, values, patch, identityErrors, canCreate, create.isPending, createError, competitionRef, handleCreate]);

  const titleSuffix = isCreated && values.name ? ` · ${values.name}` : '';

  return (
    <FunnelEditorModal
      open={open}
      onClose={handleClose}
      title={`${t(COMP.funnelNewTitle)}${titleSuffix}`}
      eyebrow={t(COMP.funnelEyebrow)}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(id) => {
        // Si l'utilisateur essaye d'ouvrir une tab disabled, on le ramène sur identity.
        const target = tabs.find((tab) => tab.id === id);
        if (target?.disabled) {
          setActiveTab('identity');
          return;
        }
        setActiveTab(id);
      }}
      status={isCreated ? status : 'idle'}
      statusMessage={isCreated ? statusMessage : ''}
      width="standard"
    />
  );
}
