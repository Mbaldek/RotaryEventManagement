// CalendarTab — onglet « Calendrier » du funnel de compétition.
//
// Cinq dates clés (toutes optionnelles) :
//   * application_open  : ouverture des candidatures
//   * application_close : clôture des candidatures
//   * selection_date    : date de sélection (comité)
//   * finale_date       : date de la Grande Finale
//   * awards_date       : date de remise des prix
//
// Hint éditorial — les dates ordonnent la timeline plateforme et nourrissent les
// emails de communication (open/close/awards). On les présente dans l'ordre
// chronologique naturel pour aider à raisonner.

import React from 'react';
import { useLang } from '@/lib/platform/i18n';
import { SETUP } from '../../i18n';
import { TextRow } from './fields';

export default function CalendarTab({ values = {}, onPatch }) {
  const { t } = useLang();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <TextRow
        id="comp-app-open"
        label={t(SETUP.appOpen)}
        type="date"
        value={values.application_open || ''}
        onChange={(v) => onPatch({ application_open: v || null })}
      />
      <TextRow
        id="comp-app-close"
        label={t(SETUP.appClose)}
        type="date"
        value={values.application_close || ''}
        onChange={(v) => onPatch({ application_close: v || null })}
      />
      <TextRow
        id="comp-sel-date"
        label={t(SETUP.selectionDate)}
        type="date"
        value={values.selection_date || ''}
        onChange={(v) => onPatch({ selection_date: v || null })}
      />
      <TextRow
        id="comp-fin-date"
        label={t(SETUP.finaleDate)}
        type="date"
        value={values.finale_date || ''}
        onChange={(v) => onPatch({ finale_date: v || null })}
      />
      <TextRow
        id="comp-awd-date"
        label={t(SETUP.awardsDate)}
        type="date"
        value={values.awards_date || ''}
        onChange={(v) => onPatch({ awards_date: v || null })}
      />
    </div>
  );
}
