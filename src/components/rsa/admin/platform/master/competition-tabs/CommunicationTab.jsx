// CommunicationTab — onglet « Communication » du funnel de compétition.
//
// Contrôles :
//   * public_results_enabled (checkbox) — flip du gate /Resultats public.
//   * public_results_open_date — placeholder désactivé pour une activation
//     future (la colonne n'existe pas encore en DB ; on l'expose côté UI pour
//     marquer l'intention, sans persister).

import React from 'react';
import { useLang } from '@/lib/platform/i18n';
import { MUTED } from '@/components/design/tokens';
import { COMP } from '../i18n';
import { CheckboxRow, TextRow } from './fields';

export default function CommunicationTab({ values = {}, onPatch, disabled = false }) {
  const { t } = useLang();
  return (
    <div className="space-y-5">
      <CheckboxRow
        id="comp-public-results"
        label={t(COMP.publicResultsEnabled)}
        hint={t(COMP.publicResultsHint)}
        checked={!!values.public_results_enabled}
        onChange={(v) => onPatch({ public_results_enabled: v })}
        disabled={disabled}
      />

      <div className="opacity-60 cursor-not-allowed">
        <TextRow
          id="comp-public-open-date"
          label={t(COMP.publicResultsOpenDate)}
          hint={t(COMP.publicResultsOpenDateHint)}
          type="date"
          value=""
          onChange={() => { /* no-op : champ futur, non persisté */ }}
          disabled
        />
        <p className="text-[11px] mt-1" style={{ color: MUTED }}>
          {t({
            fr: 'Réservé — non encore connecté en base.',
            en: 'Reserved — not yet wired in the database.',
            de: 'Reserviert — noch nicht in der Datenbank verbunden.',
          })}
        </p>
      </div>
    </div>
  );
}
