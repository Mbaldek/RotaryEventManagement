// CustomFieldsRenderer — V2.5+ Wave Custom Fields.
//
// Composant générique qui rend N "custom fields" dynamiques à partir d'un array
// de configs (colonnes `editions.custom_fields_jury` ou `custom_fields_candidate`).
// Réutilise les contrôles du design system Élysée (Field + TextInput + Textarea +
// Select + TagSelect + Dropzone) — aucun chrome custom, 100 % tokens.
//
// Contract du field config (shape attendu — équipe A + builder équipe B) :
//   {
//     key            : string          // identifiant stable (slug) — clé dans `values`
//     type           : string          // 'text' | 'textarea' | 'email' | 'url' | 'tel'
//                                      //   | 'number' | 'select' | 'multiselect'
//                                      //   | 'checkbox' | 'date' | 'file'
//     label          : { fr,en,de } | string  // résolu via t()
//     placeholder?   : { fr,en,de } | string
//     helper?        : { fr,en,de } | string
//     required?      : boolean
//     position?      : number          // tri ascendant
//     options?       : [{ value, label:{fr,en,de}|string }] // pour select/multiselect
//     min?, max?     : number          // pour number/date
//     minLength?     : number          // pour text/textarea
//     maxLength?     : number          // idem
//     accept?        : string          // pour file (ex. '.pdf,.png')
//     maxSizeMb?     : number          // pour file (default 20)
//     pattern?       : string          // regex source (optionnel) pour text/url/tel
//   }
//
// Props :
//   fields    : array de field configs
//   values    : objet { [field.key]: value }
//   errors    : objet { [field.key]: errorMessage } (optionnel)
//   onChange  : (key, value) => void
//   lang      : 'fr' | 'en' | 'de'  (lifeline : aussi pris via useLang() si absent)
//   disabled  : boolean (form en cours de submit, etc.)
//   readonly  : boolean (preview mode : pas d'inputs interactifs — utilisé par le builder équipe B)
//   onUpload? : (file, field) => Promise<{ path:string, name:string }>
//                — handler externe pour les fields type=file. Si omis et type=file,
//                  on rend un Dropzone non-fonctionnel (avertissement console).
//   className : string
//
// API export :
//   validateCustomFields(fields, values, t) -> { [key]: errMsgString }
//
// Choix de conception :
//   - Pas de mutation interne : values est contrôlé par le parent (single source of truth).
//   - Pas de Form HTML wrapper : ce composant est INSÉRÉ dans un <form> existant
//     (JuryApplicationForm, OnePageDossier…). Il ne déclenche jamais de submit lui-même.
//   - `readonly=true` désactive tous les contrôles et masque les erreurs (mode preview).
//   - Empty state si `fields` vide : message localisé "Aucun champ supplémentaire".

import React, { useMemo } from 'react';
import {
  Field, TextInput, Textarea, Select, TagSelect, Dropzone, DateField,
  GOLD, MUTED, CREAM2, NAVY, INK,
} from '@/components/design';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';

// ── i18n local (renderer chrome only — les labels des fields viennent du config) ─
const RUI = {
  empty: {
    fr: 'Aucun champ supplémentaire pour cette compétition.',
    en: 'No additional question for this competition.',
    de: 'Keine zusätzlichen Fragen für diesen Wettbewerb.',
  },
  errRequired:     { fr: 'Champ requis.',         en: 'Required field.',      de: 'Pflichtfeld.' },
  errEmail:        { fr: 'Email invalide.',        en: 'Invalid email.',       de: 'Ungültige E-Mail.' },
  errUrl:          { fr: 'URL invalide.',          en: 'Invalid URL.',         de: 'Ungültige URL.' },
  errTel:          { fr: 'Téléphone invalide.',    en: 'Invalid phone.',       de: 'Ungültige Telefonnummer.' },
  errNumber:       { fr: 'Nombre invalide.',       en: 'Invalid number.',      de: 'Ungültige Zahl.' },
  errMin:          { fr: 'Valeur trop basse.',     en: 'Value too low.',       de: 'Wert zu niedrig.' },
  errMax:          { fr: 'Valeur trop élevée.',    en: 'Value too high.',      de: 'Wert zu hoch.' },
  errMinLength:    { fr: 'Texte trop court.',      en: 'Text too short.',      de: 'Text zu kurz.' },
  errMaxLength:    { fr: 'Texte trop long.',       en: 'Text too long.',       de: 'Text zu lang.' },
  errPattern:      { fr: 'Format invalide.',       en: 'Invalid format.',      de: 'Ungültiges Format.' },
  errMultiEmpty:   { fr: 'Sélectionnez au moins une option.', en: 'Pick at least one option.', de: 'Wählen Sie mindestens eine Option aus.' },
  errFileMissing:  { fr: 'Fichier requis.',        en: 'File required.',       de: 'Datei erforderlich.' },
  selectPlaceholder: { fr: 'Choisir…', en: 'Choose…', de: 'Auswählen…' },
  multiSelectPlaceholder: { fr: 'Ajouter…', en: 'Add…', de: 'Hinzufügen…' },
  checkboxOff: { fr: 'Non', en: 'No',  de: 'Nein' },
  checkboxOn:  { fr: 'Oui', en: 'Yes', de: 'Ja' },
  dropPrompt:  { fr: 'Déposez votre fichier ici', en: 'Drop your file here', de: 'Datei hier ablegen' },
  dropHint:    { fr: 'ou cliquez pour parcourir', en: 'or click to browse',  de: 'oder klicken zum Auswählen' },
  uploading:   { fr: 'Envoi…', en: 'Uploading…', de: 'Hochladen…' },
  replace:     { fr: 'Remplacer', en: 'Replace', de: 'Ersetzen' },
  remove:      { fr: 'Retirer',   en: 'Remove',  de: 'Entfernen' },
  errFormat:   { fr: 'Format non supporté.', en: 'Unsupported format.', de: 'Nicht unterstütztes Format.' },
  errSize:     { fr: 'Fichier trop volumineux.', en: 'File too large.', de: 'Datei zu groß.' },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// URL : accepte http(s)://, scheme-less treated as invalid pour éviter les
// faux positifs.
const URL_RE = /^https?:\/\/[^\s]+$/i;
// Téléphone : libéral — chiffres, +, espaces, points, parenthèses, tirets.
const TEL_RE = /^[+0-9][0-9\s().\-]{5,}$/;

// ── Helpers ────────────────────────────────────────────────────────────────────
// Résout un libellé qui peut être { fr,en,de } OU string.
function resolveLabel(value, lang, fallback = '') {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value[lang] ?? value.fr ?? value.en ?? value.de ?? fallback;
  }
  return String(value);
}

// Tri stable par `position` (fallback ordre d'apparition).
function sortFields(fields) {
  if (!Array.isArray(fields)) return [];
  return [...fields]
    .map((f, idx) => ({ f, idx }))
    .sort((a, b) => {
      const pa = typeof a.f.position === 'number' ? a.f.position : 1e9 + a.idx;
      const pb = typeof b.f.position === 'number' ? b.f.position : 1e9 + b.idx;
      return pa - pb;
    })
    .map(({ f }) => f);
}

// ── Validation ────────────────────────────────────────────────────────────────
// Renvoie { [key]: errMsgString } — clés ABSENTES quand pas d'erreur.
// `t` accepte (dict) -> string ; passe un dict { fr,en,de }.
export function validateCustomFields(fields, values, t) {
  const out = {};
  const v = values || {};
  const tt = typeof t === 'function' ? t : (d) => (typeof d === 'string' ? d : d?.fr ?? '');
  for (const f of sortFields(fields)) {
    if (!f || !f.key || !f.type) continue;
    const val = v[f.key];
    const isEmpty =
      val == null ||
      (typeof val === 'string' && val.trim() === '') ||
      (Array.isArray(val) && val.length === 0);

    if (f.required && isEmpty) {
      out[f.key] = f.type === 'file' ? tt(RUI.errFileMissing) : tt(RUI.errRequired);
      continue;
    }
    if (isEmpty) continue;

    switch (f.type) {
      case 'email':
        if (!EMAIL_RE.test(String(val).trim())) out[f.key] = tt(RUI.errEmail);
        break;
      case 'url':
        if (!URL_RE.test(String(val).trim())) out[f.key] = tt(RUI.errUrl);
        break;
      case 'tel':
        if (!TEL_RE.test(String(val).trim())) out[f.key] = tt(RUI.errTel);
        break;
      case 'number': {
        const n = Number(val);
        if (!Number.isFinite(n)) {
          out[f.key] = tt(RUI.errNumber);
        } else if (typeof f.min === 'number' && n < f.min) {
          out[f.key] = tt(RUI.errMin);
        } else if (typeof f.max === 'number' && n > f.max) {
          out[f.key] = tt(RUI.errMax);
        }
        break;
      }
      case 'text':
      case 'textarea': {
        const s = String(val);
        if (typeof f.minLength === 'number' && s.trim().length < f.minLength) {
          out[f.key] = tt(RUI.errMinLength);
        } else if (typeof f.maxLength === 'number' && s.length > f.maxLength) {
          out[f.key] = tt(RUI.errMaxLength);
        } else if (f.pattern) {
          try {
            const re = new RegExp(f.pattern);
            if (!re.test(s)) out[f.key] = tt(RUI.errPattern);
          } catch {
            // pattern invalide côté config — on ignore plutôt que de bloquer le user.
          }
        }
        break;
      }
      case 'multiselect':
        if (Array.isArray(val) && val.length === 0 && f.required) {
          out[f.key] = tt(RUI.errMultiEmpty);
        }
        break;
      case 'select':
      case 'checkbox':
      case 'date':
      case 'file':
      default:
        // pas de validation supplémentaire
        break;
    }
  }
  return out;
}

// ── Composant ──────────────────────────────────────────────────────────────────
export default function CustomFieldsRenderer({
  fields = [],
  values = {},
  errors = {},
  onChange,
  lang: forcedLang,
  disabled = false,
  readonly = false,
  onUpload,
  className = '',
}) {
  const { lang: ctxLang, t } = useLang();
  const lang = forcedLang || ctxLang || 'fr';
  const sorted = useMemo(() => sortFields(fields), [fields]);

  // Empty state — utile dans le builder équipe B en preview mode.
  if (!sorted || sorted.length === 0) {
    return (
      <div
        className={`text-[13px] italic px-3 py-2.5 rounded-[4px] ${className}`}
        style={{ background: 'white', border: `1px dashed ${CREAM2}`, color: MUTED }}
      >
        {t(RUI.empty)}
      </div>
    );
  }

  const ro = readonly;
  const dis = disabled || readonly;

  const setKey = (key, value) => {
    if (ro) return;
    onChange?.(key, value);
  };

  return (
    <div
      role="group"
      aria-label={lang === 'en'
        ? 'Additional questions'
        : lang === 'de'
          ? 'Zusätzliche Fragen'
          : 'Questions supplémentaires'}
      className={`flex flex-col gap-5 ${className}`}
    >
      {sorted.map((f) => {
        if (!f || !f.key || !f.type) return null;
        const label = resolveLabel(f.label, lang, f.key);
        const placeholder = f.placeholder ? resolveLabel(f.placeholder, lang) : undefined;
        const helper = f.helper ? resolveLabel(f.helper, lang) : undefined;
        const err = !ro ? (errors?.[f.key] || undefined) : undefined;
        const val = values?.[f.key];

        // ── checkbox : Field portant le label + une case + on/off mini status ─
        if (f.type === 'checkbox') {
          const fieldId = `cf-${f.key}`;
          const helperId = helper ? `${fieldId}-help` : undefined;
          const errId = err ? `${fieldId}-err` : undefined;
          const describedBy = [errId, helperId].filter(Boolean).join(' ') || undefined;
          const checked = !!val;
          return (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label
                htmlFor={fieldId}
                className="flex items-start gap-2.5 cursor-pointer"
                style={{ color: INK }}
              >
                <input
                  id={fieldId}
                  type="checkbox"
                  checked={checked}
                  disabled={dis}
                  aria-required={f.required || undefined}
                  aria-invalid={!!err || undefined}
                  aria-describedby={describedBy}
                  onChange={(e) => setKey(f.key, e.target.checked)}
                  className="mt-0.5 w-4 h-4 cursor-pointer accent-[#0f1f3d]"
                />
                <span className="text-[14px] leading-snug">
                  {label}
                  {f.required && (
                    <span aria-hidden style={{ color: GOLD }}>{' *'}</span>
                  )}
                </span>
              </label>
              {err ? (
                <p id={errId} className="text-xs pl-6" style={{ color: DANGER }} role="alert">
                  {err}
                </p>
              ) : helper ? (
                <p id={helperId} className="text-xs pl-6" style={{ color: MUTED }}>
                  {helper}
                </p>
              ) : null}
            </div>
          );
        }

        // ── file : Dropzone (réutilise Élysée). Upload externe via onUpload. ──
        if (f.type === 'file') {
          const accept = f.accept || undefined;
          const maxSizeMb = typeof f.maxSizeMb === 'number' ? f.maxSizeMb : 20;
          // val attendu : { path, name, size? } ou null.
          const currentFile = val && typeof val === 'object' ? val : null;
          const fileName = currentFile?.name || (currentFile?.path
            ? currentFile.path.split('/').pop().replace(/^\d+_/, '')
            : null);
          const showValue = fileName ? { name: fileName, size: currentFile?.size } : null;

          const handleFile = async (file) => {
            if (ro) return;
            if (typeof onUpload !== 'function') {
              // pas d'uploader fourni — on stocke juste le nom local (preview / fallback).
              setKey(f.key, { name: file.name, size: file.size, path: null, pending: true });
              return;
            }
            try {
              const result = await onUpload(file, f);
              if (result && result.path) {
                setKey(f.key, { path: result.path, name: result.name || file.name, size: file.size });
              }
            } catch {
              // l'erreur est exposée par le parent via `errors[f.key]`.
            }
          };

          return (
            <Field
              key={f.key}
              label={label}
              id={`cf-${f.key}`}
              required={!!f.required}
              helper={helper}
              error={err}
            >
              {({ id }) => (
                <Dropzone
                  id={id}
                  accept={accept}
                  maxSizeMb={maxSizeMb}
                  value={showValue}
                  onFile={handleFile}
                  onRemove={ro ? undefined : () => setKey(f.key, null)}
                  disabled={dis}
                  labels={{
                    prompt: t(RUI.dropPrompt),
                    hint: t(RUI.dropHint),
                    uploading: t(RUI.uploading),
                    replace: t(RUI.replace),
                    remove: t(RUI.remove),
                    errFormat: t(RUI.errFormat),
                    errSize: t(RUI.errSize),
                  }}
                />
              )}
            </Field>
          );
        }

        // ── multiselect : TagSelect (chips removables) ───────────────────────
        if (f.type === 'multiselect') {
          const opts = (f.options || []).map((o) => ({
            value: o.value,
            label: resolveLabel(o.label, lang, String(o.value)),
          }));
          return (
            <Field
              key={f.key}
              label={label}
              id={`cf-${f.key}`}
              required={!!f.required}
              helper={helper}
              error={err}
            >
              {({ id, describedBy, invalid }) => (
                <TagSelect
                  id={id}
                  value={Array.isArray(val) ? val : []}
                  onChange={(next) => setKey(f.key, next)}
                  options={opts}
                  placeholder={placeholder || t(RUI.multiSelectPlaceholder)}
                  max={typeof f.max === 'number' ? f.max : undefined}
                  invalid={invalid}
                  disabled={dis}
                  aria-describedby={describedBy}
                />
              )}
            </Field>
          );
        }

        // ── select ────────────────────────────────────────────────────────────
        if (f.type === 'select') {
          const opts = (f.options || []).map((o) => ({
            value: o.value,
            label: resolveLabel(o.label, lang, String(o.value)),
          }));
          return (
            <Field
              key={f.key}
              label={label}
              id={`cf-${f.key}`}
              required={!!f.required}
              helper={helper}
              error={err}
            >
              {({ id, describedBy, invalid }) => (
                <Select
                  id={id}
                  value={val ?? ''}
                  onChange={(e) => setKey(f.key, e.target.value)}
                  options={opts}
                  placeholder={placeholder || t(RUI.selectPlaceholder)}
                  invalid={invalid}
                  disabled={dis}
                  aria-describedby={describedBy}
                  aria-required={f.required || undefined}
                />
              )}
            </Field>
          );
        }

        // ── date ──────────────────────────────────────────────────────────────
        if (f.type === 'date') {
          return (
            <Field
              key={f.key}
              label={label}
              id={`cf-${f.key}`}
              required={!!f.required}
              helper={helper}
              error={err}
            >
              {({ id, describedBy, invalid }) => (
                <DateField
                  id={id}
                  value={val || ''}
                  onChange={(e) => setKey(f.key, e.target.value)}
                  min={f.min || undefined}
                  max={f.max || undefined}
                  invalid={invalid}
                  disabled={dis}
                  aria-describedby={describedBy}
                  aria-required={f.required || undefined}
                />
              )}
            </Field>
          );
        }

        // ── textarea ──────────────────────────────────────────────────────────
        if (f.type === 'textarea') {
          return (
            <Field
              key={f.key}
              label={label}
              id={`cf-${f.key}`}
              required={!!f.required}
              helper={helper}
              error={err}
            >
              {({ id, describedBy, invalid }) => (
                <Textarea
                  id={id}
                  rows={f.rows || 4}
                  value={val || ''}
                  placeholder={placeholder}
                  maxLength={typeof f.maxLength === 'number' ? f.maxLength : undefined}
                  invalid={invalid}
                  disabled={dis}
                  aria-describedby={describedBy}
                  aria-required={f.required || undefined}
                  onChange={(e) => setKey(f.key, e.target.value)}
                />
              )}
            </Field>
          );
        }

        // ── text/email/url/tel/number ─────────────────────────────────────────
        const nativeType =
          f.type === 'email' ? 'email'
          : f.type === 'url' ? 'url'
          : f.type === 'tel' ? 'tel'
          : f.type === 'number' ? 'number'
          : 'text';
        const autoComplete =
          f.type === 'email' ? 'email'
          : f.type === 'tel' ? 'tel'
          : f.type === 'url' ? 'url'
          : undefined;

        return (
          <Field
            key={f.key}
            label={label}
            id={`cf-${f.key}`}
            required={!!f.required}
            helper={helper}
            error={err}
          >
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                type={nativeType}
                autoComplete={autoComplete}
                value={val ?? ''}
                placeholder={placeholder}
                min={f.type === 'number' && typeof f.min === 'number' ? f.min : undefined}
                max={f.type === 'number' && typeof f.max === 'number' ? f.max : undefined}
                maxLength={typeof f.maxLength === 'number' && (f.type === 'text') ? f.maxLength : undefined}
                pattern={typeof f.pattern === 'string' && f.pattern ? f.pattern : undefined}
                invalid={invalid}
                disabled={dis}
                aria-describedby={describedBy}
                aria-required={f.required || undefined}
                onChange={(e) => setKey(f.key, e.target.value)}
              />
            )}
          </Field>
        );
      })}

      {/* Tiny footer sentinel — purement décoratif, garde l'unité visuelle Élysée
          quand le bloc est inséré dans un form parent. */}
      <div className="sr-only" aria-hidden style={{ color: NAVY }} />
    </div>
  );
}
