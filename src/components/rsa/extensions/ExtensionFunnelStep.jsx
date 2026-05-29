// ExtensionFunnelStep — V3.0 Vague 4.
//
// Rend une extension kind='funnel_step' comme un mini-formulaire Élysée généré
// dynamiquement depuis sa config JSON-schema (validée via schemas.js avant
// affichage). Réutilise strictement les composants design/form (Field +
// TextInput + Textarea + Select + RadioYesNo + TagSelect).
//
// Le composant est PURE (controlled) : il rend les champs et signale les
// changements via onChange(values) ; le parent (CandidatureFunnel) est
// responsable du persisting et de la validation finale.
//
// Sécurité :
//   - validateExtensionConfig() rejette toute config avec $ref/eval/...
//   - Le whitelist de field.type empêche d'injecter un widget arbitraire.
//   - Les valeurs string sont coupées à maxLength (sécurité défensive).

import React, { useMemo } from 'react';
import { Field, TextInput, Textarea, Select, RadioYesNo, TagSelect } from '@/components/design';
import { CREAM2, GOLD, NAVY, INK, MUTED, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { EXT_UI } from './i18n';
import { validateExtensionConfig } from './schemas';

function ExtensionField({ field, value, onValueChange, disabled }) {
  const helper = field.helper || null;
  const required = !!field.required;

  // Coerce defensive
  const safeValue = (() => {
    if (value === undefined || value === null) {
      if (field.type === 'boolean') return null;
      if (field.type === 'array')   return [];
      if (field.type === 'number' || field.type === 'integer') return '';
      return '';
    }
    return value;
  })();

  return (
    <Field label={field.label} required={required} helper={helper}>
      {({ id, describedBy, invalid }) => {
        if (field.type === 'string' && (field.maxLength || 0) > 200) {
          return (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={safeValue}
              rows={4}
              maxLength={field.maxLength}
              onChange={(e) => onValueChange(e.target.value)}
              disabled={disabled}
            />
          );
        }
        if (field.type === 'string') {
          return (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={safeValue}
              maxLength={field.maxLength}
              onChange={(e) => onValueChange(e.target.value)}
              disabled={disabled}
            />
          );
        }
        if (field.type === 'number' || field.type === 'integer') {
          return (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              type="number"
              inputMode={field.type === 'integer' ? 'numeric' : 'decimal'}
              step={field.type === 'integer' ? '1' : 'any'}
              min={field.min}
              max={field.max}
              value={safeValue}
              onChange={(e) => onValueChange(e.target.value)}
              disabled={disabled}
            />
          );
        }
        if (field.type === 'boolean') {
          return (
            <RadioYesNo
              id={id}
              aria-describedby={describedBy}
              value={safeValue}
              onChange={onValueChange}
              disabled={disabled}
            />
          );
        }
        if (field.type === 'enum') {
          const options = (field.enum || []).map((v) => ({ value: v, label: v }));
          return (
            <Select
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              options={[{ value: '', label: '—' }, ...options]}
              value={safeValue}
              onChange={(e) => onValueChange(e.target.value)}
              disabled={disabled}
            />
          );
        }
        if (field.type === 'array') {
          const options = (field.enum || []).map((v) => ({ value: v, label: v }));
          return (
            <TagSelect
              id={id}
              aria-describedby={describedBy}
              options={options}
              value={Array.isArray(safeValue) ? safeValue : []}
              onChange={onValueChange}
              disabled={disabled}
            />
          );
        }
        return null;
      }}
    </Field>
  );
}

export default function ExtensionFunnelStep({
  extension,
  values = {},
  onChange,
  disabled = false,
}) {
  const { t } = useLang();
  const validation = useMemo(
    () => validateExtensionConfig('funnel_step', extension?.config || {}),
    [extension?.config],
  );

  if (!validation.ok) {
    return (
      <div
        className="rounded-[4px] p-3"
        style={{ background: 'white', border: `1px dashed ${CREAM2}` }}
        role="alert"
        data-extension-id={extension.id}
      >
        <p className="text-[12px]" style={{ color: MUTED }}>
          {t({
            fr: `Extension « ${extension.name} » : configuration invalide.`,
            en: `Extension "${extension.name}": invalid configuration.`,
            de: `Erweiterung „${extension.name}“: Konfiguration ungültig.`,
          })}
        </p>
      </div>
    );
  }

  const cfg = validation.value;

  function setFieldValue(fieldName, next) {
    if (typeof onChange !== 'function') return;
    onChange({ ...(values || {}), [fieldName]: next });
  }

  return (
    <section
      className="rounded-[4px] p-4"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      data-extension-id={extension.id}
      data-extension-kind="funnel_step"
    >
      <header className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-[1.5px] w-5" style={{ background: GOLD }} aria-hidden />
          <span
            className="uppercase text-[10px] tracking-[0.18em] font-medium"
            style={{ color: GOLD }}
          >
            {t(EXT_UI.slotPlaceholder)}
          </span>
        </div>
        <h4
          className="text-[18px] leading-tight"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {cfg.title}
        </h4>
        {cfg.subtitle && (
          <p className="text-[13px] mt-1" style={{ color: INK }}>
            {cfg.subtitle}
          </p>
        )}
      </header>

      <div className="flex flex-col gap-4 mt-3">
        {cfg.fields.map((field) => (
          <ExtensionField
            key={field.name}
            field={field}
            value={values?.[field.name]}
            onValueChange={(v) => setFieldValue(field.name, v)}
            disabled={disabled}
          />
        ))}
      </div>
    </section>
  );
}
