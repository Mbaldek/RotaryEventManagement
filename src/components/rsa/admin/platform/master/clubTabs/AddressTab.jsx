// AddressTab — onglet "Coordonnées institutionnelles" partagé entre ClubFunnel
// et ClubEditView. Email du club + téléphone + adresse postale (textarea 3 rows).
//
// Props :
//   - values    : { clubEmail, clubPhone, clubAddress }
//   - onChange  : (partial) => void
//   - errors    : { clubEmail? } (validation client optionnelle)
//   - disabled  : bool

import React from 'react';
import { Field, TextInput, Textarea } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { CLUBS } from '../i18n';

export default function AddressTab({
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
        <Field
          label={t(CLUBS.clubEmailLabel)}
          error={errors.clubEmail}
        >
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              type="email"
              aria-describedby={describedBy}
              invalid={invalid}
              value={values.clubEmail || ''}
              onChange={(e) => set('clubEmail', e.target.value)}
              placeholder={t(CLUBS.emailPlaceholder)}
              disabled={disabled}
            />
          )}
        </Field>

        <Field label={t(CLUBS.clubPhoneLabel)}>
          {({ id }) => (
            <TextInput
              id={id}
              type="tel"
              value={values.clubPhone || ''}
              onChange={(e) => set('clubPhone', e.target.value)}
              disabled={disabled}
            />
          )}
        </Field>

        <Field
          label={t(CLUBS.clubAddressLabel)}
          className="md:col-span-2"
        >
          {({ id }) => (
            <Textarea
              id={id}
              rows={3}
              value={values.clubAddress || ''}
              onChange={(e) => set('clubAddress', e.target.value)}
              placeholder={t(CLUBS.clubAddressPlaceholder)}
              disabled={disabled}
            />
          )}
        </Field>
      </div>
    </div>
  );
}
