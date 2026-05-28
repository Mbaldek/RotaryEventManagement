// Étape 5 — Documents. Pitch deck + executive summary (FR & DE, un seul document
// combiné) via DocumentDropzone -> storage.js. Lien vidéo de pitch facultatif.
// Note de confidentialité (RGPD + Art. 10).

import React from 'react';
import { Lock } from 'lucide-react';
import { Field, TextInput, INK, MUTED } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { STEPS, FIELDS, UI } from '../i18n';
import StepShell from './StepShell';
import DocumentDropzone from '../DocumentDropzone';
import EligibilityPreview from '../EligibilityPreview';
import { validateField } from '../validation';

export default function StepDocuments({ value, onChange, errors = {}, rules, editionId, startupId, disabled = false }) {
  const { t } = useLang();
  const v = value || {};

  return (
    <StepShell
      eyebrow={t(STEPS[4].label)}
      title={t({ fr: 'Vos documents', en: 'Your documents', de: 'Ihre Dokumente' })}
      subtitle={t({
        fr: 'Pitch deck et executive summary (FR & DE). Documents strictement confidentiels au jury et à l’organisateur.',
        en: 'Pitch deck and executive summary (FR & DE). Documents strictly confidential to the jury and organiser.',
        de: 'Pitch-Deck und Executive Summary (FR & DE). Dokumente streng vertraulich für Jury und Veranstalter.',
      })}
    >
      <Field
        label={t(FIELDS.pitch_deck_path.label)}
        required
        helper={t(FIELDS.pitch_deck_path.help)}
        error={errors.pitch_deck_path ? t(UI[errors.pitch_deck_path]) : undefined}
      >
        <DocumentDropzone
          kind="deck"
          editionId={editionId}
          startupId={startupId}
          value={v.pitch_deck_path || null}
          onChange={(path) => onChange?.('pitch_deck_path', path)}
          disabled={disabled}
        />
      </Field>

      <Field
        label={t(FIELDS.exec_summary_path.label)}
        required
        helper={t(FIELDS.exec_summary_path.help)}
        error={errors.exec_summary_path ? t(UI[errors.exec_summary_path]) : undefined}
      >
        <DocumentDropzone
          kind="exec_summary"
          editionId={editionId}
          startupId={startupId}
          value={v.exec_summary_path || null}
          onChange={(path) => onChange?.('exec_summary_path', path)}
          disabled={disabled}
        />
      </Field>

      <Field label={t(FIELDS.video_pitch_url.label)} helper={t(FIELDS.video_pitch_url.help)} error={errors.video_pitch_url ? t(UI[errors.video_pitch_url]) : undefined}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            type="url"
            placeholder="https://"
            aria-describedby={describedBy}
            invalid={invalid}
            disabled={disabled}
            value={v.video_pitch_url ?? ''}
            onChange={(e) => onChange?.('video_pitch_url', e.target.value)}
          />
        )}
      </Field>

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

StepDocuments.validate = (v) => {
  const out = {};
  for (const f of ['pitch_deck_path', 'exec_summary_path', 'video_pitch_url']) {
    const e = validateField(f, v?.[f], v);
    if (e) out[f] = e;
  }
  return out;
};
