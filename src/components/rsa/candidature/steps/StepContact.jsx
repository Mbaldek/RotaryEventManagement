// Étape 1 — Contact. Qui contacter et comment (blueprint §2.1).
import React from 'react';
import { Field, TextInput, Select } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { STEPS, FIELDS, UI } from '../i18n';
import StepShell from './StepShell';
import { validateField, normalizeUrl } from '../validation';

export default function StepContact({ value, onChange, errors = {}, disabled = false }) {
  const { t } = useLang();
  const v = value || {};
  const set = (field) => (e) => onChange?.(field, e.target.value);
  const err = (field) => (errors[field] ? t(UI[errors[field]]) : undefined);

  return (
    <StepShell
      eyebrow={t(STEPS[0].label)}
      title={t({ fr: 'Vos coordonnées', en: 'Your contact details', de: 'Ihre Kontaktdaten' })}
      subtitle={t({
        fr: 'Comment vous joindre au sujet de votre candidature.',
        en: 'How to reach you about your application.',
        de: 'Wie wir Sie zu Ihrer Bewerbung erreichen.',
      })}
    >
      <Field label={t(FIELDS.name.label)} required error={err('name')}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            disabled={disabled}
            value={v.name ?? ''}
            onChange={set('name')}
            maxLength={120}
          />
        )}
      </Field>

      <Field label={t(FIELDS.contact_person.label)} required error={err('contact_person')}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            disabled={disabled}
            value={v.contact_person ?? ''}
            onChange={set('contact_person')}
            maxLength={120}
          />
        )}
      </Field>

      <Field label={t(FIELDS.email.label)} required helper={t(FIELDS.email.help)} error={err('email')}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            type="email"
            aria-describedby={describedBy}
            invalid={invalid}
            disabled={disabled}
            value={v.email ?? ''}
            onChange={set('email')}
          />
        )}
      </Field>

      <Field label={t(FIELDS.phone.label)} error={err('phone')}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            type="tel"
            aria-describedby={describedBy}
            invalid={invalid}
            disabled={disabled}
            value={v.phone ?? ''}
            onChange={set('phone')}
          />
        )}
      </Field>

      <Field label={t(FIELDS.website.label)} helper={t(FIELDS.website.help)} error={err('website')}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            type="url"
            placeholder="exemple.com"
            aria-describedby={describedBy}
            invalid={invalid}
            disabled={disabled}
            value={v.website ?? ''}
            onChange={set('website')}
            onBlur={(e) => {
              const norm = normalizeUrl(e.target.value);
              if (norm !== (v.website ?? '')) onChange?.('website', norm);
            }}
          />
        )}
      </Field>

      <Field label={t(FIELDS.preferred_lang.label)} helper={t(FIELDS.preferred_lang.help)}>
        {({ id, describedBy }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            disabled={disabled}
            value={v.preferred_lang ?? 'fr'}
            onChange={set('preferred_lang')}
            options={[
              { value: 'fr', label: 'Français' },
              { value: 'en', label: 'English' },
              { value: 'de', label: 'Deutsch' },
            ]}
          />
        )}
      </Field>
    </StepShell>
  );
}

// Validation de l'étape (réutilisée par le funnel pour les points « incomplet »).
StepContact.validate = (v) => {
  const out = {};
  for (const f of ['name', 'contact_person', 'email', 'phone', 'website']) {
    const e = validateField(f, v?.[f], v);
    if (e) out[f] = e;
  }
  return out;
};
