// InfoTab — onglet "Informations" partagé entre ClubFunnel (création) et
// ClubEditView (édition).
//
// Props :
//   - values        : { name, country, language }
//   - onChange      : (partial) => void   — patch fragmenté (autosave / create)
//   - errors        : { name?, country?, language? } (validation client en mode create)
//   - mode          : 'create' | 'edit'
//   - clubId        : string|null (eyebrow + readonly preview en mode edit)
//   - disabled      : bool (lock global)
//
// En mode create : un panneau "↳ ID : rotary-club-de-berlin" se met à jour live
// dès que le nom dépasse 2 caractères. Le pays et la langue sont aussi requis.
//
// En mode edit : on affiche l'ID figé en eyebrow gold + un champ ID readonly,
// le name + country + language restent éditables (autosave côté parent).

import React, { useMemo } from 'react';
import {
  CREAM2, NAVY, MUTED, GOLD,
  Field, TextInput, Select,
} from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { CLUBS, COUNTRY_OPTIONS, LANGUAGE_OPTIONS, slugifyClubName } from '../i18n';

export default function InfoTab({
  values = {},
  onChange,
  errors = {},
  mode = 'create',
  clubId = null,
  disabled = false,
}) {
  const { t, lang } = useLang();

  const countryOptions = useMemo(
    () => COUNTRY_OPTIONS.map((c) => ({ value: c.code, label: c[lang] || c.fr })),
    [lang],
  );
  const languageOptions = useMemo(
    () => LANGUAGE_OPTIONS.map((l) => ({ value: l.code, label: l[lang] || l.fr })),
    [lang],
  );

  const previewId = useMemo(() => slugifyClubName(values.name), [values.name]);

  function set(field, value) {
    onChange?.({ [field]: value });
  }

  return (
    <div className="space-y-5">
      {mode === 'edit' && clubId && (
        <div
          className="rounded-[4px] px-4 py-3"
          style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="uppercase text-[10.5px] tracking-[0.14em]"
              style={{ color: GOLD }}
            >
              {t(CLUBS.generatedIdLabel)}
            </span>
            <span className="font-mono text-[12.5px]" style={{ color: NAVY }}>
              {clubId}
            </span>
          </div>
          <p className="text-[11.5px] mt-1" style={{ color: MUTED }}>
            {t(CLUBS.generatedIdHint)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label={t(CLUBS.nameLabel)}
          required
          error={errors.name}
          helper={
            mode === 'create' && (values.name || '').trim().length >= 2
              ? `↳ ${t(CLUBS.generatedIdLabel)} : ${previewId || '—'}`
              : null
          }
          className="md:col-span-2"
        >
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={values.name || ''}
              onChange={(e) => set('name', e.target.value)}
              placeholder={t(CLUBS.clubNamePlaceholder)}
              autoComplete="organization"
              disabled={disabled}
            />
          )}
        </Field>

        <Field
          label={t(CLUBS.countryLabel)}
          required
          error={errors.country}
        >
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={values.country || ''}
              onChange={(e) => set('country', e.target.value)}
              placeholder={t(CLUBS.pickCountry)}
              options={countryOptions}
              disabled={disabled}
            />
          )}
        </Field>

        <Field
          label={t(CLUBS.languageLabel)}
          required
          error={errors.language}
        >
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={values.language || ''}
              onChange={(e) => set('language', e.target.value)}
              placeholder={t(CLUBS.pickLanguage)}
              options={languageOptions}
              disabled={disabled}
            />
          )}
        </Field>
      </div>
    </div>
  );
}
