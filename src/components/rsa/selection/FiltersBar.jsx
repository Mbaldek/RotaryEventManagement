// FiltersBar — barre Élysée au-dessus du tableau : quick filters
// (À examiner / Décidés / À valider / Tous) + recherche + Édition + Club + Statut
// + Secteur (multi) + Verdict + Reset.
//
// Source of truth = parent state (lifted) ; ce composant est de la présentation pure.

import React from 'react';
import { Search, X } from 'lucide-react';
import { NAVY, INK, MUTED, GOLD, CREAM2 } from '@/components/design';
import { Select, TextInput, TagSelect, Field } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { UI, VERDICT_LABELS, DOSSIER_STATUS_LABELS } from './i18n';
import { STATUS_FILTERS } from './constants';

const QUICK_TABS = [
  { id: 'toReview',   labelKey: 'filterToReview',   statusIn: STATUS_FILTERS.toReview },
  { id: 'decided',    labelKey: 'filterDecided',    statusIn: STATUS_FILTERS.decided },
  { id: 'toValidate', labelKey: 'filterToValidate', statusIn: null, needsValidation: true },
  { id: 'all',        labelKey: 'filtersAll',       statusIn: null },
];

// Statuts proposés dans le selecteur Statut (sous-ensemble pertinent côté staff).
const STATUS_OPTION_KEYS = [
  'soumis', 'en_selection', 'eligible', 'liste_attente',
  'affecte', 'en_session', 'note', 'finaliste', 'laureat', 'rejete',
];

export default function FiltersBar({
  // State props
  editionId,
  quickTab,              // 'toReview' | 'decided' | 'toValidate' | 'all'
  verdictIn,             // string[]
  search,                // string
  clubId,                // string | null
  statusValue,           // string | '' (selecteur explicite, prime sur quickTab)
  sectorIn,              // string[]

  // Listes (pour les dropdowns)
  editions = [],
  clubs = [],            // [{ id, name }]
  sectorOptions = [],    // [{ value, label }]

  // Setters
  onEditionChange,
  onQuickTabChange,
  onVerdictChange,
  onSearchChange,
  onClubChange,
  onStatusChange,
  onSectorChange,
  onReset,
}) {
  const { t } = useLang();

  const editionOptions = [
    { value: '', label: t(UI.editionAll) },
    ...editions.map((e) => ({ value: e.id, label: `${e.name} (${e.year})` })),
  ];

  const clubOptions = [
    { value: '', label: t(UI.clubAll) },
    ...clubs.map((c) => ({ value: c.id, label: c.name || c.id })),
  ];

  const statusOptions = [
    { value: '', label: t(UI.statusAll) },
    ...STATUS_OPTION_KEYS.map((k) => ({ value: k, label: t(DOSSIER_STATUS_LABELS[k]) || k })),
  ];

  const verdictValue = verdictIn?.length === 1 ? verdictIn[0] : '';
  const verdictOptions = [
    { value: '', label: t(UI.filtersAll) },
    { value: 'eligible', label: t(VERDICT_LABELS.eligible) },
    { value: 'flagged',  label: t(VERDICT_LABELS.flagged) },
    { value: 'excluded', label: t(VERDICT_LABELS.excluded) },
  ];

  return (
    <div className="mb-5">
      {/* Quick tabs */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {QUICK_TABS.map((tab) => {
          const active = tab.id === quickTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onQuickTabChange?.(tab.id)}
              className="px-3 py-1.5 text-[12px] font-medium rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
              style={{
                background: active ? NAVY : 'transparent',
                color: active ? 'white' : INK,
                border: `1px solid ${active ? NAVY : CREAM2}`,
              }}
            >
              {t(UI[tab.labelKey])}
            </button>
          );
        })}
      </div>

      {/* Secondary filters — ligne 1 : recherche + édition + club */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_220px] gap-3 items-end mb-3">
        <Field label={t(UI.searchPlaceholder)} hideLabel>
          {({ id }) => (
            <div className="relative">
              <Search
                aria-hidden
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: MUTED }}
              />
              <TextInput
                id={id}
                value={search ?? ''}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder={t(UI.searchPlaceholder)}
                className="pl-9"
              />
            </div>
          )}
        </Field>

        <Field label={t(UI.editionLabel)}>
          {({ id }) => (
            <Select
              id={id}
              value={editionId ?? ''}
              onChange={(e) => onEditionChange?.(e.target.value || null)}
              options={editionOptions}
            />
          )}
        </Field>

        <Field label={t(UI.clubLabel)}>
          {({ id }) => (
            <Select
              id={id}
              value={clubId ?? ''}
              onChange={(e) => onClubChange?.(e.target.value || null)}
              options={clubOptions}
            />
          )}
        </Field>
      </div>

      {/* Secondary filters — ligne 2 : statut + verdict + secteur + reset */}
      <div className="grid grid-cols-1 md:grid-cols-[200px_200px_1fr_auto] gap-3 items-end">
        <Field label={t(UI.statusLabel)}>
          {({ id }) => (
            <Select
              id={id}
              value={statusValue ?? ''}
              onChange={(e) => onStatusChange?.(e.target.value)}
              options={statusOptions}
            />
          )}
        </Field>

        <Field label={t(UI.verdictLabel)}>
          {({ id }) => (
            <Select
              id={id}
              value={verdictValue}
              onChange={(e) => onVerdictChange?.(e.target.value ? [e.target.value] : [])}
              options={verdictOptions}
            />
          )}
        </Field>

        <Field label={t(UI.sectorLabel)}>
          {({ id }) => (
            <TagSelect
              id={id}
              value={Array.isArray(sectorIn) ? sectorIn : []}
              onChange={(next) => onSectorChange?.(next)}
              options={sectorOptions}
              placeholder={t(UI.sectorPlaceholder)}
            />
          )}
        </Field>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] self-end"
          style={{ color: INK, border: `1px solid ${CREAM2}` }}
        >
          <X className="w-3.5 h-3.5" style={{ color: GOLD }} aria-hidden />
          {t(UI.resetFilters)}
        </button>
      </div>
    </div>
  );
}
