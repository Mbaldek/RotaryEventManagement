// Étape 5 — Documents (V2.5+).
//
// La liste des documents demandés est désormais DYNAMIQUE et dérivée de la
// configuration `edition.eligibility_rules.docs_required` (chaque doc ayant son
// propre toggle + behavior individuel côté admin). Pour chaque doc présent :
//   - behavior='exclu' ⇒ Dropzone REQUIS (badge "Requis" rouge subtle, manquant bloque le submit)
//   - behavior='flag'  ⇒ Dropzone RECOMMANDÉ (badge "Recommandé" gold subtle, non bloquant)
//   - clé absente      ⇒ pas affiché du tout
//
// Le lien vidéo (URL) reste un champ optionnel séparé tant que `video_pitch` est
// catalogué mais pas wired en storage. Si l'admin l'active dans `docs_required`,
// on l'affiche en tête de la zone "URLs" avec son badge correspondant.

import React, { useMemo } from 'react';
import { Lock, AlertCircle, Info } from 'lucide-react';
import { Field, TextInput, INK, MUTED, CREAM2 } from '@/components/design';
import { TINT_DANGER, DANGER, TINT_WARNING, WARNING } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { STEPS, FIELDS, UI } from '../i18n';
import StepShell from './StepShell';
import DocumentDropzone from '../DocumentDropzone';
import EligibilityPreview from '../EligibilityPreview';
import { validateField } from '../validation';

// Configuration trans-doc : pour chaque doc_key catalogue, on liste
//   - field           : colonne `startups` portant la valeur (path ou URL)
//   - kind            : DocumentDropzone kind (null = URL ou pas wired)
//   - i18nKey         : entrée FIELDS pour label + help
//   - inputType       : 'dropzone' | 'url' (par défaut dropzone)
// `field` null + `kind` null = doc catalogué mais pas encore wired (financials
// en V2.5+) ⇒ on le skip silencieusement (TODO storage à brancher).
const DOC_RENDER_CONFIG = {
  pitch_deck: {
    field: 'pitch_deck_path',
    kind: 'deck',
    i18nKey: 'pitch_deck_path',
    inputType: 'dropzone',
  },
  exec_summary: {
    field: 'exec_summary_path',
    kind: 'exec_summary',
    i18nKey: 'exec_summary_path',
    inputType: 'dropzone',
  },
  financials: {
    field: null, // TODO: brancher storage + colonne `financials_path`
    kind: null,
    i18nKey: 'financials_path',
    inputType: 'dropzone',
  },
  video_pitch: {
    // Pas un upload : on réutilise le champ URL existant.
    field: 'video_pitch_url',
    kind: null,
    i18nKey: 'video_pitch_url',
    inputType: 'url',
  },
};

// Lit la config docs depuis les rules. Tolère le format legacy
// (`{behavior, docs:[]}`) pour les éditions encore non migrées.
function readDocsRequested(rules) {
  const raw = rules?.docs_required;
  if (!raw || typeof raw !== 'object') return {};
  // legacy
  if (Array.isArray(raw.docs)) {
    const beh = raw.behavior === 'exclu' ? 'exclu' : 'flag';
    const out = {};
    for (const k of raw.docs) if (typeof k === 'string') out[k] = { behavior: beh };
    return out;
  }
  // V2.5+
  const out = {};
  for (const [k, entry] of Object.entries(raw)) {
    if (entry && typeof entry === 'object' && (entry.behavior === 'exclu' || entry.behavior === 'flag')) {
      out[k] = { behavior: entry.behavior };
    }
  }
  return out;
}

function DocBadge({ behavior, t }) {
  const isRequired = behavior === 'exclu';
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] uppercase tracking-[0.12em] font-medium"
      style={{
        background: isRequired ? TINT_DANGER : TINT_WARNING,
        color: isRequired ? DANGER : WARNING,
      }}
    >
      {isRequired ? t(UI.required) : t(UI.recommended)}
    </span>
  );
}

export default function StepDocuments({ value, onChange, errors = {}, rules, editionId, startupId, disabled = false }) {
  const { t } = useLang();
  const v = value || {};

  const requested = useMemo(() => readDocsRequested(rules), [rules]);
  const anyFlagRequested = useMemo(
    () => Object.values(requested).some((e) => e.behavior === 'flag'),
    [requested],
  );
  const docKeysInOrder = ['pitch_deck', 'exec_summary', 'financials', 'video_pitch'];
  const docsToRender = docKeysInOrder
    .filter((k) => requested[k])
    .map((k) => ({ key: k, behavior: requested[k].behavior, cfg: DOC_RENDER_CONFIG[k] }))
    .filter((d) => d.cfg && (d.cfg.field || d.cfg.inputType === 'url'));

  return (
    <StepShell
      eyebrow={t(STEPS[4].label)}
      title={t({ fr: 'Vos documents', en: 'Your documents', de: 'Ihre Dokumente' })}
      subtitle={t({
        fr: 'Pièces attendues pour votre dossier de candidature. Documents strictement confidentiels au jury et à l’organisateur.',
        en: 'Files expected for your application dossier. Documents strictly confidential to the jury and organiser.',
        de: 'Erwartete Dokumente für Ihr Bewerbungsdossier. Streng vertraulich für Jury und Veranstalter.',
      })}
    >
      {/* Aucun doc demandé : note neutre + on n'affiche aucun Dropzone. */}
      {docsToRender.length === 0 && (
        <div
          className="flex items-start gap-2 rounded-[4px] p-3"
          style={{ background: 'white', border: `1px solid ${CREAM2}` }}
        >
          <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: MUTED }} aria-hidden />
          <p className="text-[13px]" style={{ color: INK }}>
            {t(UI.docsNoneRequested)}
          </p>
        </div>
      )}

      {docsToRender.map((d) => {
        const i18nField = FIELDS[d.cfg.i18nKey] || { label: { fr: d.key, en: d.key, de: d.key } };
        const isRequired = d.behavior === 'exclu';
        const fieldErr = errors[d.cfg.field];

        // Champ URL (video_pitch) : on garde TextInput, mais avec le badge.
        if (d.cfg.inputType === 'url') {
          return (
            <Field
              key={d.key}
              label={
                <span className="inline-flex items-center gap-2">
                  {t(i18nField.label)}
                  <DocBadge behavior={d.behavior} t={t} />
                </span>
              }
              helper={i18nField.help ? t(i18nField.help) : undefined}
              required={isRequired}
              error={fieldErr ? t(UI[fieldErr]) : undefined}
            >
              {({ id, describedBy, invalid }) => (
                <TextInput
                  id={id}
                  type="url"
                  placeholder="https://"
                  aria-describedby={describedBy}
                  invalid={invalid}
                  disabled={disabled}
                  value={v[d.cfg.field] ?? ''}
                  onChange={(e) => onChange?.(d.cfg.field, e.target.value)}
                />
              )}
            </Field>
          );
        }

        // Champ Dropzone (pitch_deck / exec_summary).
        return (
          <Field
            key={d.key}
            label={
              <span className="inline-flex items-center gap-2">
                {t(i18nField.label)}
                <DocBadge behavior={d.behavior} t={t} />
              </span>
            }
            helper={i18nField.help ? t(i18nField.help) : undefined}
            required={isRequired}
            error={fieldErr ? t(UI[fieldErr]) : undefined}
          >
            <DocumentDropzone
              kind={d.cfg.kind}
              editionId={editionId}
              startupId={startupId}
              value={v[d.cfg.field] || null}
              onChange={(path) => onChange?.(d.cfg.field, path)}
              disabled={disabled}
            />
          </Field>
        );
      })}

      {/* Si seulement des docs `flag` sont demandés mais manquants : info préventive
          (non bloquante, le submit reste possible). Le bouton ne signale ce qui
          est bloquant qu'en cas d'exclu manquant. */}
      {anyFlagRequested && docsToRender.some((d) => d.behavior === 'flag' && !v[d.cfg.field]) && (
        <div className="flex items-start gap-2 rounded-[4px] p-3" style={{ background: TINT_WARNING }}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: WARNING }} aria-hidden />
          <p className="text-[13px] leading-relaxed" style={{ color: INK }}>
            {t(UI.docsFlagNotice)}
          </p>
        </div>
      )}

      <div className="flex items-start gap-2 text-[12px]" style={{ color: MUTED }}>
        <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
        <span style={{ color: INK }}>
          {t({
            fr: 'Vos fichiers sont stockés de façon privée et chiffrée. Seuls le jury et l’organisateur y accèdent, via des liens temporaires.',
            en: 'Your files are stored privately and encrypted. Only the jury and organiser access them, via temporary links.',
            de: 'Ihre Dateien werden privat und verschlüsselt gespeichert. Nur Jury und Veranstalter greifen über temporäre Links darauf zu.',
          })}
        </span>
      </div>

      <EligibilityPreview startup={v} rules={rules} onlyRules={['docs_required']} compact />
    </StepShell>
  );
}

// Validation inline d'étape : on revalide les champs DOC connus si présents.
// La règle bloquante (Submit) vient de `requiredMissing(value, rules)`.
StepDocuments.validate = (v) => {
  const out = {};
  for (const f of ['pitch_deck_path', 'exec_summary_path', 'video_pitch_url']) {
    const e = validateField(f, v?.[f], v);
    if (e) out[f] = e;
  }
  return out;
};
