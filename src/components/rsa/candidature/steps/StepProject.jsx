// Étape 3 — Projet (Art. 4 du règlement). Cœur du dossier : value_proposition,
// business_model, roadmap, team, traction, esg_impact + secteurs (TagSelect).
// Helper « En anglais de préférence (jury international) » + compteur souple.

import React from 'react';
import { Field, Textarea, TagSelect } from '@/components/design';
import { MUTED } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { STEPS, FIELDS, UI } from '../i18n';
import StepShell from './StepShell';
import { validateField, SECTOR_OPTIONS } from '../validation';

// Champ texte long avec compteur de caractères (souple, non bloquant).
function LongText({ field, value, onChange, error, required, disabled, softMax, extraHelp }) {
  const { t } = useLang();
  const text = value ?? '';
  const help = (
    <span>
      {t(UI.preferEn)}
      {extraHelp ? ` ${extraHelp}` : ''}
    </span>
  );
  return (
    <Field
      label={t(FIELDS[field].label)}
      required={required}
      helper={help}
      error={error ? t(UI[error]) : undefined}
    >
      {({ id, describedBy, invalid }) => (
        <div>
          <Textarea
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            disabled={disabled}
            rows={field === 'value_proposition' || field === 'business_model' ? 5 : 4}
            value={text}
            onChange={(e) => onChange?.(field, e.target.value)}
          />
          {softMax && (
            <div className="text-[11px] mt-1 text-right" style={{ color: MUTED }}>
              {text.length} / ~{softMax} {t(UI.charCount)}
            </div>
          )}
        </div>
      )}
    </Field>
  );
}

export default function StepProject({ value, onChange, errors = {}, disabled = false }) {
  const { t } = useLang();
  const v = value || {};

  const sectorOptions = SECTOR_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }));

  return (
    <StepShell
      eyebrow={t(STEPS[2].label)}
      title={t({ fr: 'Votre projet', en: 'Your project', de: 'Ihr Projekt' })}
      subtitle={t({
        fr: 'Le cœur de votre dossier (Règlement Art. 4). En anglais de préférence — le jury est international.',
        en: 'The core of your application (Rules Art. 4). Preferably in English — the jury is international.',
        de: 'Der Kern Ihrer Bewerbung (Reglement Art. 4). Vorzugsweise auf Englisch — die Jury ist international.',
      })}
    >
      <LongText field="value_proposition" value={v.value_proposition} onChange={onChange} error={errors.value_proposition} required disabled={disabled} softMax={600} />
      <LongText field="business_model" value={v.business_model} onChange={onChange} error={errors.business_model} required disabled={disabled} />
      <LongText field="roadmap" value={v.roadmap} onChange={onChange} error={errors.roadmap} required disabled={disabled} />
      <LongText field="team" value={v.team} onChange={onChange} error={errors.team} required disabled={disabled} extraHelp={t(FIELDS.team.help)} />
      <LongText field="traction" value={v.traction} onChange={onChange} error={errors.traction} required disabled={disabled} extraHelp={t(FIELDS.traction.help)} />
      <LongText field="esg_impact" value={v.esg_impact} onChange={onChange} error={errors.esg_impact} disabled={disabled} />

      <Field
        label={t(FIELDS.sectors.label)}
        required
        helper={t(FIELDS.sectors.help)}
        error={errors.sectors ? t(UI[errors.sectors]) : undefined}
      >
        {({ id, invalid }) => (
          <TagSelect
            id={id}
            invalid={invalid}
            disabled={disabled}
            value={Array.isArray(v.sectors) ? v.sectors : []}
            onChange={(next) => onChange?.('sectors', next)}
            options={sectorOptions}
            placeholder={t({ fr: 'Ajouter un secteur…', en: 'Add a sector…', de: 'Sektor hinzufügen…' })}
          />
        )}
      </Field>
    </StepShell>
  );
}

StepProject.validate = (v) => {
  const out = {};
  for (const f of ['value_proposition', 'business_model', 'roadmap', 'team', 'traction', 'sectors']) {
    const e = validateField(f, v?.[f], v);
    if (e) out[f] = e;
  }
  return out;
};
