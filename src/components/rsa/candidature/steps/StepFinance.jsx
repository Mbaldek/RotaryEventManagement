// Étape 4 — Finances. Entrées d'éligibilité : CA annuel + montant levé (blueprint §2.1).
// Vides = « non communiqué » (l'éligibilité traite null comme passant). Aperçu inline.

import React from 'react';
import { Field, TextInput } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { STEPS, FIELDS, UI } from '../i18n';
import StepShell from './StepShell';
import EligibilityPreview from '../EligibilityPreview';
import { validateField, parseEurInput } from '../validation';

// Convertit la saisie en nombre ou null (vide), tolérant aux séparateurs locaux
// (R-M5 : "1 000 000", "1.000.000", "1,000,000 €"…). Si la chaîne n'est pas parsable
// (frappe en cours, lettres) on renvoie la valeur brute pour ne pas casser le champ.
function toNumberOrNull(raw) {
  const s = String(raw ?? '').trim();
  if (s === '') return null;
  const parsed = parseEurInput(s);
  return parsed == null ? raw : parsed;
}

export default function StepFinance({ value, onChange, errors = {}, rules, disabled = false }) {
  const { t } = useLang();
  const v = value || {};
  const err = (field) => (errors[field] ? t(UI[errors[field]]) : undefined);

  const numField = (field) => (
    <Field label={t(FIELDS[field].label)} helper={t(FIELDS[field].help)} error={err(field)}>
      {({ id, describedBy, invalid }) => (
        <TextInput
          id={id}
          type="number"
          min="0"
          step="1000"
          inputMode="numeric"
          aria-describedby={describedBy}
          invalid={invalid}
          disabled={disabled}
          value={v[field] ?? ''}
          onChange={(e) => onChange?.(field, toNumberOrNull(e.target.value))}
        />
      )}
    </Field>
  );

  return (
    <StepShell
      eyebrow={t(STEPS[3].label)}
      title={t({ fr: 'Vos finances', en: 'Your financials', de: 'Ihre Finanzen' })}
      subtitle={t({
        fr: 'Indicatif et confidentiel. Laissez vide si vous préférez ne pas communiquer.',
        en: 'Indicative and confidential. Leave empty if you prefer not to disclose.',
        de: 'Indikativ und vertraulich. Leer lassen, wenn Sie nicht angeben möchten.',
      })}
    >
      {numField('last_revenue')}
      {numField('amount_raised')}

      <EligibilityPreview startup={v} rules={rules} onlyRules={['revenue_max', 'raised_max']} compact />
    </StepShell>
  );
}

StepFinance.validate = (v) => {
  const out = {};
  for (const f of ['last_revenue', 'amount_raised']) {
    const e = validateField(f, v?.[f], v);
    if (e) out[f] = e;
  }
  return out;
};
