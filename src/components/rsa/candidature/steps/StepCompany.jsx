// Étape 2 — Société. Identité légale + entrées d'éligibilité (blueprint §2.1).
// Inclut le NOUVEAU champ founders_majority (radio Oui/Non -> boolean).
// Aperçu d'éligibilité inline (pays / date / immatriculation / fondateurs).

import React from 'react';
import { Field, TextInput, Select, DateField, RadioYesNo } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { STEPS, FIELDS, UI } from '../i18n';
import StepShell from './StepShell';
import EligibilityPreview from '../EligibilityPreview';
import { validateField, isOtherCountry } from '../validation';
import { useEditionIncubators } from '@/components/rsa/hooks/useIncubators';

export default function StepCompany({ value, onChange, errors = {}, rules, disabled = false }) {
  const { t } = useLang();
  const v = value || {};
  const err = (field) => (errors[field] ? t(UI[errors[field]]) : undefined);

  const editionId = v?.edition_id;
  const { data: incubatorList = [] } = useEditionIncubators(editionId);
  const incubatorOptions = [
    ...incubatorList.map((inc) => ({ value: inc.id, label: inc.name })),
    { value: '__other__', label: t(UI.incubatorOther) },
  ];
  const incubatorSelectValue = v?.incubator_id ?? (v?.incubator_other != null ? '__other__' : '');
  const onIncubatorSelect = (e) => {
    const next = e.target.value;
    if (next === '__other__') {
      onChange?.('incubator_id', null);
      onChange?.('incubator_other', v?.incubator_other ?? '');
    } else {
      onChange?.('incubator_id', next || null);
      onChange?.('incubator_other', null);
    }
  };

  // Sélecteur pays : FR / DE / Autre. "Autre" => champ texte libre pour le code/pays.
  // R-H4 : on N'écrit JAMAIS le marqueur '__other__' dans le state remonté au parent
  // (autosave persisterait alors la chaîne littérale dans startups.country, polluant
  // exports + jury packs + eligibility). On garde un "mode autre" local UI ; tant que
  // l'utilisateur n'a pas tapé un libellé, la valeur stockée reste null.
  const [otherMode, setOtherMode] = React.useState(() => isOtherCountry(v.country));
  // Resynchronise le mode si la valeur arrive d'ailleurs (chargement initial, reset).
  React.useEffect(() => {
    if (v.country === 'FR' || v.country === 'DE') setOtherMode(false);
    else if (isOtherCountry(v.country)) setOtherMode(true);
  }, [v.country]);

  const selectValue = v.country === 'FR' || v.country === 'DE' ? v.country : otherMode ? 'autre' : '';

  const onCountrySelect = (e) => {
    const next = e.target.value;
    if (next === 'autre') {
      setOtherMode(true);
      // On NE TOUCHE PAS encore à v.country — on attendra que l'utilisateur tape.
      // Si une valeur 'FR'/'DE' était précédemment posée, on l'efface explicitement
      // (sinon le recap continuerait d'afficher l'ancienne valeur).
      if (v.country === 'FR' || v.country === 'DE') onChange?.('country', null);
    } else {
      setOtherMode(false);
      onChange?.('country', next || null);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <StepShell
      eyebrow={t(STEPS[1].label)}
      title={t({ fr: 'Votre société', en: 'Your company', de: 'Ihr Unternehmen' })}
      subtitle={t({
        fr: 'Identité légale et critères d’éligibilité (Règlement Art. 2).',
        en: 'Legal identity and eligibility criteria (Rules Art. 2).',
        de: 'Rechtliche Identität und Eignungskriterien (Reglement Art. 2).',
      })}
    >
      <Field label={t(FIELDS.country.label)} required helper={t(FIELDS.country.help)} error={err('country')}>
        {({ id, describedBy, invalid }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            disabled={disabled}
            value={selectValue}
            onChange={onCountrySelect}
            placeholder={t({ fr: 'Sélectionnez…', en: 'Select…', de: 'Auswählen…' })}
            options={[
              { value: 'FR', label: t(UI.countryFR) },
              { value: 'DE', label: t(UI.countryDE) },
              { value: 'autre', label: t(UI.countryOther) },
            ]}
          />
        )}
      </Field>

      {(selectValue === 'autre') && (
        <Field label={t(UI.countryOtherLabel)}>
          {({ id, describedBy }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              disabled={disabled}
              // Le marqueur '__other__' n'est plus écrit (R-H4). S'il existait encore
              // sur un brouillon antérieur, on le masque visuellement.
              value={v.country === '__other__' ? '' : (v.country ?? '')}
              onChange={(e) => {
                const next = e.target.value;
                // Vide -> on stocke null (et non '__other__') ; valeur -> on stocke la valeur.
                onChange?.('country', next.trim() === '' ? null : next);
              }}
              placeholder={t({ fr: 'Pays', en: 'Country', de: 'Land' })}
            />
          )}
        </Field>
      )}

      <Field label={t(FIELDS.incubator.label)} helper={t(FIELDS.incubator.help)}>
        {({ id, describedBy, invalid }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            disabled={disabled}
            value={incubatorSelectValue}
            onChange={onIncubatorSelect}
            placeholder={t(UI.incubatorPlaceholder)}
            options={incubatorOptions}
          />
        )}
      </Field>

      {incubatorSelectValue === '__other__' && (
        <Field label={t(UI.incubatorOtherLabel)}>
          {({ id, describedBy }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              disabled={disabled}
              value={v?.incubator_other ?? ''}
              onChange={(e) => {
                const next = e.target.value;
                onChange?.('incubator_other', next.trim() === '' ? '' : next);
              }}
              placeholder={t({ fr: 'Nom de la structure…', en: 'Structure name…', de: 'Name der Struktur…' })}
            />
          )}
        </Field>
      )}

      <Field label={t(FIELDS.creation_date.label)} required helper={t(FIELDS.creation_date.help)} error={err('creation_date')}>
        {({ id, describedBy, invalid }) => (
          <DateField
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            disabled={disabled}
            max={today}
            value={v.creation_date ?? ''}
            onChange={(e) => onChange?.('creation_date', e.target.value)}
          />
        )}
      </Field>

      <Field label={t(FIELDS.registration_number.label)} required error={err('registration_number')}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            disabled={disabled}
            value={v.registration_number ?? ''}
            onChange={(e) => onChange?.('registration_number', e.target.value)}
          />
        )}
      </Field>

      <Field label={t(FIELDS.founders_majority.label)} required helper={t(FIELDS.founders_majority.help)} error={err('founders_majority')}>
        {({ id, invalid }) => (
          <RadioYesNo
            id={id}
            name="founders_majority"
            invalid={invalid}
            disabled={disabled}
            value={typeof v.founders_majority === 'boolean' ? v.founders_majority : null}
            onChange={(b) => onChange?.('founders_majority', b)}
            yesLabel={t(UI.yes)}
            noLabel={t(UI.no)}
          />
        )}
      </Field>

      <Field label={t(FIELDS.partner_institution.label)}>
        {({ id, describedBy }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            disabled={disabled}
            value={v.partner_institution ?? ''}
            onChange={(e) => onChange?.('partner_institution', e.target.value)}
            maxLength={160}
          />
        )}
      </Field>

      <Field label={t(FIELDS.rotary_club.label)}>
        {({ id, describedBy }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            disabled={disabled}
            value={v.rotary_club ?? ''}
            onChange={(e) => onChange?.('rotary_club', e.target.value)}
          />
        )}
      </Field>

      {/* Aperçu d'éligibilité inline : seulement les règles pilotées par cette étape. */}
      <EligibilityPreview
        startup={v}
        rules={rules}
        onlyRules={['country', 'created_after', 'registration', 'founders_majority']}
        compact
      />
    </StepShell>
  );
}

StepCompany.validate = (v) => {
  const out = {};
  for (const f of ['country', 'creation_date', 'registration_number']) {
    const e = validateField(f, v?.[f], v);
    if (e) out[f] = e;
  }
  if (typeof v?.founders_majority !== 'boolean') out.founders_majority = 'errRequired';
  return out;
};
