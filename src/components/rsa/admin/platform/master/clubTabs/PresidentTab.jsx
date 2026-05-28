// PresidentTab — onglet "Président" partagé entre ClubFunnel et ClubEditView.
//
// Props :
//   - values    : { presidentFirstName, presidentLastName, presidentEmail }
//   - onChange  : (partial) => void
//   - errors    : { presidentEmail? } (validation client optionnelle)
//   - disabled  : bool

import React from 'react';
import { Field, TextInput } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { CLUBS } from '../i18n';

export default function PresidentTab({
  values = {},
  onChange,
  errors = {},
  disabled = false,
}) {
  const { t } = useLang();

  function set(field, value) {
    onChange?.({ [field]: value });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label={t(CLUBS.firstNameLabel)}>
          {({ id }) => (
            <TextInput
              id={id}
              value={values.presidentFirstName || ''}
              onChange={(e) => set('presidentFirstName', e.target.value)}
              disabled={disabled}
            />
          )}
        </Field>

        <Field label={t(CLUBS.lastNameLabel)}>
          {({ id }) => (
            <TextInput
              id={id}
              value={values.presidentLastName || ''}
              onChange={(e) => set('presidentLastName', e.target.value)}
              disabled={disabled}
            />
          )}
        </Field>

        <Field
          label={t(CLUBS.emailLabel)}
          error={errors.presidentEmail}
          className="md:col-span-2"
        >
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              type="email"
              aria-describedby={describedBy}
              invalid={invalid}
              value={values.presidentEmail || ''}
              onChange={(e) => set('presidentEmail', e.target.value)}
              placeholder={t(CLUBS.emailPlaceholder)}
              disabled={disabled}
            />
          )}
        </Field>
      </div>
    </div>
  );
}
