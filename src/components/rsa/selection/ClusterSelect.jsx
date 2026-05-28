// ClusterSelect — Select restricted to the dossier's edition qualifying sessions.
// Pre-fills via sectorToClusterHeuristic and surfaces a soft "suggéré" caption.

import React, { useMemo } from 'react';
import { GOLD } from '@/components/design';
import { Select } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { UI } from './i18n';
import { formatShortDate, sectorToClusterHeuristic } from './constants';

export default function ClusterSelect({
  value,
  onChange,
  sessions = [],
  startup,
  allowEmpty = true,
  disabled = false,
  showSuggestionCaption = true,
  id,
  invalid = false,
}) {
  const { t, lang } = useLang();

  const qualifying = useMemo(
    () => sessions.filter((s) => s.kind === 'qualifying'),
    [sessions],
  );

  const suggestion = useMemo(
    () => sectorToClusterHeuristic(startup?.sectors, qualifying),
    [startup?.sectors, qualifying],
  );

  const options = useMemo(() => {
    const opts = qualifying.map((s) => {
      const date = formatShortDate(s.session_date, lang);
      return {
        value: s.id,
        label: date ? `${s.name} (${date})` : s.name,
      };
    });
    if (allowEmpty) {
      return [{ value: '', label: t(UI.clusterNone) }, ...opts];
    }
    return opts;
  }, [qualifying, allowEmpty, t, lang]);

  const effectiveValue = value ?? '';
  const showSuggested =
    showSuggestionCaption &&
    suggestion &&
    !value &&
    qualifying.length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <Select
        id={id}
        value={effectiveValue}
        onChange={(e) => onChange?.(e.target.value || null)}
        options={options}
        placeholder={!allowEmpty ? t(UI.clusterPlaceholder) : undefined}
        disabled={disabled}
        invalid={invalid}
      />
      {showSuggested && (
        <button
          type="button"
          onClick={() => onChange?.(suggestion)}
          className="text-[11px] text-left outline-none focus-visible:underline"
          style={{ color: GOLD }}
        >
          {t(UI.clusterSuggested)}
        </button>
      )}
    </div>
  );
}
