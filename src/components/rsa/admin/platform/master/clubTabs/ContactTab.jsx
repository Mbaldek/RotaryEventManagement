// ContactTab — onglet "Représentant" (contact opérationnel) partagé entre
// ClubFunnel et ClubEditView.
//
// Props :
//   - values        : { contactFirstName, contactLastName, contactEmail, contactPhone }
//   - onChange      : (partial) => void
//   - errors        : { contactFirstName?, contactLastName?, contactEmail? } — pas
//                     utilisé en mode autosave (les erreurs SQL remontent via le
//                     status indicator), uniquement utile en mode 'create' du funnel
//                     si on veut bloquer la création.
//   - disabled      : bool

import React from 'react';
import { Field, TextInput } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { CLUBS } from '../i18n';

export default function ContactTab({
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
          label={t(CLUBS.firstNameLabel)}
          error={errors.contactFirstName}
        >
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={values.contactFirstName || ''}
              onChange={(e) => set('contactFirstName', e.target.value)}
              autoComplete="given-name"
              disabled={disabled}
            />
          )}
        </Field>

        <Field
          label={t(CLUBS.lastNameLabel)}
          error={errors.contactLastName}
        >
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={values.contactLastName || ''}
              onChange={(e) => set('contactLastName', e.target.value)}
              autoComplete="family-name"
              disabled={disabled}
            />
          )}
        </Field>

        <Field
          label={t(CLUBS.emailLabel)}
          error={errors.contactEmail}
        >
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              type="email"
              aria-describedby={describedBy}
              invalid={invalid}
              value={values.contactEmail || ''}
              onChange={(e) => set('contactEmail', e.target.value)}
              placeholder={t(CLUBS.emailPlaceholder)}
              autoComplete="email"
              disabled={disabled}
            />
          )}
        </Field>

        <Field label={t(CLUBS.phoneLabel)}>
          {({ id }) => (
            <TextInput
              id={id}
              type="tel"
              value={values.contactPhone || ''}
              onChange={(e) => set('contactPhone', e.target.value)}
              autoComplete="tel"
              disabled={disabled}
            />
          )}
        </Field>
      </div>
    </div>
  );
}
