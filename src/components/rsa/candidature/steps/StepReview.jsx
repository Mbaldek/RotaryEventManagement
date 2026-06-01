// Étape 6 — Récapitulatif. Rendu lecture-seule de toutes les sections (lien
// « Éditer » par section), aperçu d'éligibilité complet, avertissement si des
// champs requis manquent, et les deux actions terminales (brouillon / soumettre)
// avec modale de confirmation. La soumission n'est JAMAIS bloquée par l'éligibilité,
// uniquement par les champs requis manquants (blueprint §5/§6).

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, AlertTriangle } from 'lucide-react';
import { useEditionIncubators } from '@/components/rsa/hooks/useIncubators';
import { NAVY, INK, GOLD, MUTED, CREAM2, SERIF } from '@/components/design';
import { TINT_WARNING, WARNING } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { Club } from '@/lib/rsa/entities';
import { evaluateEligibility } from '@/lib/rsa/eligibility';
import { STEPS, FIELDS, UI } from '../i18n';
import StepShell from './StepShell';
import EligibilityPreview from '../EligibilityPreview';
import { fileNameFromPath } from '../DocumentDropzone';
import { requiredMissing, firstStepWithMissing, formatDate, formatEur, SECTOR_OPTIONS } from '../validation';

function Row({ label, children }) {
  const { t } = useLang();
  const empty = children == null || children === '';
  return (
    <div className="py-2 border-b last:border-b-0" style={{ borderColor: CREAM2 }}>
      <div className="text-[10px] uppercase tracking-[0.12em] font-medium mb-0.5" style={{ color: MUTED }}>
        {label}
      </div>
      <div className="text-[14px] leading-relaxed whitespace-pre-wrap break-words" style={{ color: empty ? MUTED : INK }}>
        {empty ? t(UI.notProvided) : children}
      </div>
    </div>
  );
}

function Section({ stepId, title, onEdit, children, disabled }) {
  const { t } = useLang();
  return (
    <div className="rounded-[4px] bg-white p-4" style={{ border: `1px solid ${CREAM2}` }}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[16px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {title}
        </h3>
        {!disabled && (
          <button
            type="button"
            onClick={() => onEdit?.(stepId)}
            className="inline-flex items-center gap-1 text-[12px] font-medium rounded-[4px] px-1.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ color: GOLD }}
          >
            <Pencil className="w-3 h-3" aria-hidden />
            {t(UI.edit)}
          </button>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ConfirmModal({ open, excluded, closeDate, onConfirm, onCancel, submitting }) {
  const { t } = useLang();
  if (!open) return null;
  const body = t(UI.confirmBody).replace('{date}', closeDate || '—');
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,31,61,0.45)' }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-[460px] rounded-[6px] bg-white p-6" style={{ border: `1px solid ${CREAM2}` }}>
        <h3 className="text-[20px] mb-3" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(UI.confirmTitle)}
        </h3>
        <p className="text-[14px] leading-relaxed" style={{ color: INK }}>
          {body}
        </p>
        {excluded && (
          <div className="flex items-start gap-2 mt-3 rounded-[4px] p-3" style={{ background: TINT_WARNING }}>
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: WARNING }} aria-hidden />
            <p className="text-[13px] leading-relaxed" style={{ color: INK }}>
              {t(UI.confirmExcluded)}
            </p>
          </div>
        )}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="text-[14px] font-medium px-4 py-2 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ color: INK, border: `1px solid ${CREAM2}` }}
          >
            {t(UI.cancel)}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="text-[14px] font-medium px-4 py-2 rounded-[4px] text-white outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ background: submitting ? '#7a8a9a' : NAVY }}
          >
            {submitting ? t(UI.submitting) : t(UI.confirmCta)}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StepReview({ value, onEdit, rules, onSubmit, submitting = false, closeDate, disabled = false, editionId }) {
  const { t, lang } = useLang();
  const v = value || {};
  const [confirmOpen, setConfirmOpen] = useState(false);

  // V2.5+ : la liste des champs requis dépend de `rules` (docs_required par
  // édition). requiredMissing(v, rules) délègue à validation.js#requiredFields.
  const missing = useMemo(() => requiredMissing(v, rules), [v, rules]);
  const canSubmit = missing.length === 0;
  const verdict = useMemo(() => evaluateEligibility(v, rules).verdict, [v, rules]);

  // Résout le nom lisible du club affilié (recap). On ne fetch que si un club est
  // choisi ; la liste est mise en cache (staleTime). Repli sur l'id si non résolu.
  const { data: clubs = [] } = useQuery({
    queryKey: ['rsa', 'clubs', 'all'],
    queryFn: () => Club.listAll(),
    enabled: !!v.club_id,
    staleTime: 5 * 60 * 1000,
  });
  const clubLabel = useMemo(() => {
    if (!v.club_id) return null;
    const found = clubs.find((c) => c.id === v.club_id);
    return found?.name || v.club_id;
  }, [clubs, v.club_id]);

  // Résout le nom lisible de l'incubateur déclaré (recap).
  const { data: incubatorList = [] } = useEditionIncubators(editionId);
  const incubatorLabel = useMemo(() => {
    if (v.incubator_id) {
      const found = incubatorList.find((inc) => inc.id === v.incubator_id);
      return found?.name || v.incubator_id;
    }
    if (v.incubator_other) return v.incubator_other;
    return null;
  }, [incubatorList, v.incubator_id, v.incubator_other]);

  const sectorLabel = (id) => {
    const o = SECTOR_OPTIONS.find((s) => s.value === id);
    return o ? t(o.label) : id;
  };
  const yesNo = (b) => (b === true ? t(UI.yes) : b === false ? t(UI.no) : null);
  const countryLabel =
    v.country === 'FR' ? t(UI.countryFR) : v.country === 'DE' ? t(UI.countryDE) : v.country === '__other__' ? null : v.country || null;

  const handleSubmitClick = () => {
    if (!canSubmit) {
      const step = firstStepWithMissing(v, rules);
      if (step) onEdit?.(step, { highlight: true });
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <StepShell
      eyebrow={t(STEPS[6].label)}
      title={t({ fr: 'Récapitulatif', en: 'Review', de: 'Zusammenfassung' })}
      subtitle={t(UI.reviewIntro)}
    >
      {/* Section Contact */}
      <Section stepId="contact" title={t(STEPS[0].label)} onEdit={onEdit} disabled={disabled}>
        <Row label={t(FIELDS.name.label)}>{v.name}</Row>
        <Row label={t(FIELDS.contact_person.label)}>{v.contact_person}</Row>
        <Row label={t(FIELDS.email.label)}>{v.email}</Row>
        <Row label={t(FIELDS.phone.label)}>{v.phone}</Row>
        <Row label={t(FIELDS.website.label)}>{v.website}</Row>
      </Section>

      {/* Section Société */}
      <Section stepId="company" title={t(STEPS[1].label)} onEdit={onEdit} disabled={disabled}>
        <Row label={t(FIELDS.country.label)}>{countryLabel}</Row>
        <Row label={t(FIELDS.creation_date.label)}>{v.creation_date ? formatDate(v.creation_date, lang) : null}</Row>
        <Row label={t(FIELDS.registration_number.label)}>{v.registration_number}</Row>
        <Row label={t(FIELDS.founders_majority.label)}>{yesNo(v.founders_majority)}</Row>
        <Row label={t(FIELDS.partner_institution.label)}>{v.partner_institution}</Row>
        <Row label={t(FIELDS.rotary_club.label)}>{v.rotary_club}</Row>
        <Row label={t(FIELDS.incubator.label)}>{incubatorLabel}</Row>
      </Section>

      {/* Section Projet */}
      <Section stepId="project" title={t(STEPS[2].label)} onEdit={onEdit} disabled={disabled}>
        <Row label={t(FIELDS.value_proposition.label)}>{v.value_proposition}</Row>
        <Row label={t(FIELDS.business_model.label)}>{v.business_model}</Row>
        <Row label={t(FIELDS.roadmap.label)}>{v.roadmap}</Row>
        <Row label={t(FIELDS.team.label)}>{v.team}</Row>
        <Row label={t(FIELDS.traction.label)}>{v.traction}</Row>
        <Row label={t(FIELDS.esg_impact.label)}>{v.esg_impact}</Row>
        <Row label={t(FIELDS.sectors.label)}>
          {Array.isArray(v.sectors) && v.sectors.length ? v.sectors.map(sectorLabel).join(' · ') : null}
        </Row>
      </Section>

      {/* Section Finances */}
      <Section stepId="finance" title={t(STEPS[3].label)} onEdit={onEdit} disabled={disabled}>
        <Row label={t(FIELDS.last_revenue.label)}>{v.last_revenue != null && v.last_revenue !== '' ? formatEur(v.last_revenue, lang) : null}</Row>
        <Row label={t(FIELDS.amount_raised.label)}>{v.amount_raised != null && v.amount_raised !== '' ? formatEur(v.amount_raised, lang) : null}</Row>
      </Section>

      {/* Section Documents */}
      <Section stepId="documents" title={t(STEPS[4].label)} onEdit={onEdit} disabled={disabled}>
        <Row label={t(FIELDS.pitch_deck_path.label)}>{v.pitch_deck_path ? fileNameFromPath(v.pitch_deck_path) : null}</Row>
        <Row label={t(FIELDS.exec_summary_path.label)}>{v.exec_summary_path ? fileNameFromPath(v.exec_summary_path) : null}</Row>
        <Row label={t(FIELDS.video_pitch_url.label)}>{v.video_pitch_url}</Row>
      </Section>

      {/* Section Club — affiliation obligatoire (blueprint §5) */}
      <Section stepId="club" title={t(STEPS[5].label)} onEdit={onEdit} disabled={disabled}>
        <Row label={t(FIELDS.club_id.label)}>{clubLabel}</Row>
      </Section>

      {/* Aperçu d'éligibilité complet */}
      <EligibilityPreview startup={v} rules={rules} />

      {/* Avertissement champs requis manquants */}
      {!canSubmit && (
        <div className="flex items-start gap-2 rounded-[4px] p-3" style={{ background: TINT_WARNING }}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: WARNING }} aria-hidden />
          <div className="text-[13px] leading-relaxed" style={{ color: INK }}>
            <p className="font-medium" style={{ color: NAVY }}>{t(UI.missingRequired)}</p>
            <ul className="mt-1 list-disc pl-4">
              {missing.map((m) => (
                <li key={m.field}>{t(FIELDS[m.field]?.label) || m.field}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Action terminale : soumettre (le brouillon est géré par la barre du funnel) */}
      {!disabled && (
        <button
          type="button"
          onClick={handleSubmitClick}
          disabled={submitting}
          className="w-full text-[15px] font-medium px-5 py-3 rounded-[4px] text-white outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] transition-colors"
          style={{ background: submitting ? '#7a8a9a' : !canSubmit ? '#7a8a9a' : NAVY }}
          aria-disabled={!canSubmit || submitting}
        >
          {submitting ? t(UI.submitting) : t(UI.submit)}
        </button>
      )}

      <ConfirmModal
        open={confirmOpen}
        excluded={verdict === 'excluded'}
        closeDate={closeDate}
        submitting={submitting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await onSubmit?.();
          setConfirmOpen(false);
        }}
      />
    </StepShell>
  );
}
