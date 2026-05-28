// FiltersBar — horizontal Élysée bar above the queue : quick filters
// (À examiner / Décidés / À valider / Tous) + édition selector + verdict + search.
//
// Source of truth = parent state (lifted) ; this component is pure presentation.

import React from 'react';
import { Search, X } from 'lucide-react';
import { NAVY, INK, MUTED, GOLD, CREAM2 } from '@/components/design';
import { Select, TextInput, Field } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { UI, VERDICT_LABELS } from './i18n';
import { STATUS_FILTERS } from './constants';

const QUICK_TABS = [
  { id: 'toReview',   labelKey: 'filterToReview',   statusIn: STATUS_FILTERS.toReview },
  { id: 'decided',    labelKey: 'filterDecided',    statusIn: STATUS_FILTERS.decided },
  { id: 'toValidate', labelKey: 'filterToValidate', statusIn: null, needsValidation: true },
  { id: 'all',        labelKey: 'filtersAll',       statusIn: null },
];

export default function FiltersBar({
  // State props
  editionId,
  quickTab,              // 'toReview' | 'decided' | 'toValidate' | 'all'
  verdictIn,             // string[]
  search,                // string

  // Edition list (for the dropdown)
  editions = [],

  // Setters
  onEditionChange,
  onQuickTabChange,
  onVerdictChange,
  onSearchChange,
  onReset,
}) {
  const { t } = useLang();

  // Edition options : "Toutes les éditions" + each edition by id.
  const editionOptions = [
    { value: '', label: t(UI.editionAll) },
    ...editions.map((e) => ({ value: e.id, label: `${e.name} (${e.year})` })),
  ];

  // Verdict multi-select : we keep it simple as a Select with options 'all'/eligible/flagged/excluded.
  // (Multi-select would be heavier ; a single verdict filter is the common case.)
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

      {/* Secondary filters */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_180px_auto] gap-3 items-end">
        {/* Search */}
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

        {/* Edition */}
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

        {/* Verdict */}
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

        {/* Reset */}
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ color: INK, border: `1px solid ${CREAM2}` }}
        >
          <X className="w-3.5 h-3.5" style={{ color: GOLD }} aria-hidden />
          {t(UI.resetFilters)}
        </button>
      </div>
    </div>
  );
}
