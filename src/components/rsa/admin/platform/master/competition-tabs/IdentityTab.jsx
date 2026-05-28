// IdentityTab — onglet « Identité » du funnel de compétition.
//
// Champs : id (kebab, immuable après création), name, year, model (radio
// mono/multi), status (select EDITION_STATUSES), finalists_per_session.
//
// Modes :
//   * mode='create' → tous les champs éditables ; l'ID est obligatoire & validé
//     en live via KEBAB_REGEX. Le composant remonte les erreurs via `errors`.
//   * mode='edit'   → l'ID devient read-only (immuable côté SQL également).
//
// Le composant est contrôlé : il lit `values` et émet `onPatch(partial)` à
// chaque change. C'est le hook autosave qui décide de la persistance.

import React from 'react';
import { useLang } from '@/lib/platform/i18n';
import { CREAM2, NAVY, MUTED, INK } from '@/components/design/tokens';
import { EDITION_STATUSES } from '../../i18n';
import { COMP, COMPETITION_MODELS } from '../i18n';
import { FieldLabel, TextRow, SelectRow } from './fields';

export default function IdentityTab({ values = {}, onPatch, mode = 'edit', errors = {} }) {
  const { t } = useLang();
  const isCreate = mode === 'create';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TextRow
          id="comp-id"
          label={t(COMP.idLabel)}
          hint={isCreate ? null : t(COMP.identityIdImmutableHint)}
          value={values.id}
          onChange={(v) => onPatch({ id: String(v || '').toLowerCase() })}
          disabled={!isCreate}
          monospace
          placeholder="2028-pilote"
        />
        {errors.id && (
          <p className="text-[11.5px] -mt-2" style={{ color: '#a23b2d' }}>{errors.id}</p>
        )}
        <TextRow
          id="comp-name"
          label={t(COMP.nameLabel)}
          value={values.name}
          onChange={(v) => onPatch({ name: v })}
          placeholder="Rotary Startup Award 2028"
        />
        <TextRow
          id="comp-year"
          label={t(COMP.yearLabel)}
          type="number"
          value={values.year}
          onChange={(v) => onPatch({ year: v === '' ? null : Number(v) })}
        />
        <TextRow
          id="comp-finalists-n"
          label={t({
            fr: 'Finalistes par session',
            en: 'Finalists per session',
            de: 'Finalisten pro Session',
          })}
          type="number"
          value={values.finalists_per_session ?? 1}
          onChange={(v) => onPatch({ finalists_per_session: v === '' ? 1 : Number(v) })}
        />
        <SelectRow
          id="comp-status"
          label={t(COMP.status)}
          value={values.status || 'draft'}
          onChange={(v) => onPatch({ status: v })}
          options={EDITION_STATUSES.map((s) => ({ value: s, label: s }))}
        />
      </div>

      <div>
        <FieldLabel>{t(COMP.modelLabel)}</FieldLabel>
        <div className="flex flex-col gap-1.5">
          {COMPETITION_MODELS.map((m) => (
            <label key={m} className="inline-flex items-start gap-2 text-[13px]" style={{ color: NAVY }}>
              <input
                type="radio"
                name="comp-model"
                value={m}
                checked={values.model === m}
                onChange={() => onPatch({ model: m })}
                disabled={!isCreate}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">
                  {m === 'multiclub' ? t(COMP.modelMulti) : t(COMP.modelMono)}
                </span>
                <span className="block text-[11.5px]" style={{ color: MUTED }}>
                  {m === 'multiclub' ? t(COMP.multiclubHint) : t(COMP.monoclubHint)}
                </span>
              </span>
            </label>
          ))}
        </div>
        {!isCreate && (
          <p className="text-[11px] mt-1.5" style={{ color: MUTED }}>
            {t({
              fr: 'Le modèle est défini à la création — non modifiable ensuite.',
              en: 'The model is set at creation time — not editable afterwards.',
              de: 'Das Modell wird bei der Erstellung festgelegt — danach nicht änderbar.',
            })}
          </p>
        )}
      </div>
    </div>
  );
}
