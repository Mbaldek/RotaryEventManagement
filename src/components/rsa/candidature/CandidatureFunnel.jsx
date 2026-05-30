// CandidatureFunnel — coquille du tunnel : Stepper + navigation (Précédent/Suivant
// + clic d'étape) + barre d'actions (brouillon) + orchestration de l'autosave
// débouncé. Tient un état local du dossier (snappy), informe le parent via
// onPatch (autosave débouncé) et onFlush (enregistrement immédiat). La soumission
// est gérée depuis StepReview via onSubmit.
//
// Validation différée : on ne calcule les erreurs inline d'une étape que lorsque
// l'utilisateur la quitte ou tente de soumettre (highlightStep). En brouillon, on
// ne bloque jamais la navigation.

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { NAVY, INK, MUTED, GOLD, CREAM2, EASE, SERIF } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import Stepper from './Stepper';
import { STEP_IDS, UI } from './i18n';
import { stepHasMissingRequired, firstStepWithMissing } from './validation';
import StepContact from './steps/StepContact';
import StepCompany from './steps/StepCompany';
import StepProject from './steps/StepProject';
import StepFinance from './steps/StepFinance';
import StepDocuments from './steps/StepDocuments';
import StepClub from './steps/StepClub';
import StepReview from './steps/StepReview';
// V2.5+ Wave Custom Fields — fields dynamiques par compétition (edition.custom_fields_candidate).
// Remplace l'ancienne architecture Extensions (drop 2026-05-29 équipe D).
import CustomFieldsRenderer, { validateCustomFields } from '@/components/rsa/forms/CustomFieldsRenderer';
import { uploadCustomField } from '@/lib/rsa/uploadCustomField';

const AUTOSAVE_MS = 800;

export default function CandidatureFunnel({
  startup,
  edition,
  rules,
  onPatch, // (patch) => void — autosave débouncé (le parent fait saveDraft)
  onFlush, // (patch) => Promise — enregistrement immédiat
  onSubmit, // (draft) => Promise — soumission (status soumis + snapshot)
  onCancel, // () => void — optionnel : retour à la vue suivi (édition d'un dossier soumis)
  saving = false,
  submitting = false,
  readOnly = false,
  initialStep = 'contact',
  closeDate,
}) {
  const { t } = useLang();
  const [draft, setDraft] = useState(startup || {});
  const [step, setStep] = useState(initialStep);
  const [stepErrors, setStepErrors] = useState({}); // { stepId: { field: errKey } }
  const debounceRef = useRef(null);
  const pendingRef = useRef(null);

  // Resynchronise quand l'identité du dossier change (nouveau chargement).
  useEffect(() => {
    setDraft(startup || {});
  }, [startup?.id]);

  // Fusionne les chemins de documents uploadés (qui arrivent par le parent après
  // upload) sans écraser les saisies locales en cours.
  useEffect(() => {
    setDraft((d) => ({
      ...d,
      pitch_deck_path: startup?.pitch_deck_path ?? d.pitch_deck_path,
      exec_summary_path: startup?.exec_summary_path ?? d.exec_summary_path,
    }));
  }, [startup?.pitch_deck_path, startup?.exec_summary_path]);

  // R-M1 : flushPending DOIT renvoyer la promesse du parent pour que le submit
  // puisse l'attendre. Sans cela, la mutation d'autosave en vol pouvait écraser la
  // ligne soumise dans le cache (onSettled tardif). On retourne donc le résultat
  // de onFlush (qui renvoie une Promise<row>) ; les callers qui ne s'en soucient
  // pas (unmount, bouton "Enregistrer le brouillon") peuvent ignorer le retour.
  const flushPending = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (pendingRef.current && Object.keys(pendingRef.current).length) {
      const patch = pendingRef.current;
      pendingRef.current = null;
      return Promise.resolve(onFlush?.(patch));
    }
    return Promise.resolve();
  }, [onFlush]);

  // Flush au démontage. On ne peut pas await dans un cleanup React ; on swallow
  // l'éventuelle rejection (TanStack Query l'a déjà gérée via onError).
  useEffect(() => () => { flushPending().catch(() => {}); }, [flushPending]);

  const queueAutosave = useCallback(
    (patch) => {
      pendingRef.current = { ...(pendingRef.current || {}), ...patch };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const acc = pendingRef.current;
        pendingRef.current = null;
        debounceRef.current = null;
        if (acc && Object.keys(acc).length) onPatch?.(acc);
      }, AUTOSAVE_MS);
    },
    [onPatch],
  );

  const handleField = useCallback(
    (field, val) => {
      setDraft((d) => ({ ...d, [field]: val }));
      queueAutosave({ [field]: val });
    },
    [queueAutosave],
  );

  // Validation à la sortie d'étape (pour le point « incomplet » + erreurs inline).
  const validateStep = useCallback((stepId, value) => {
    const map = {
      contact: StepContact.validate,
      company: StepCompany.validate,
      project: StepProject.validate,
      finance: StepFinance.validate,
      documents: StepDocuments.validate,
      club: StepClub.validate,
    };
    const fn = map[stepId];
    return fn ? fn(value) : {};
  }, []);

  const goTo = useCallback(
    (next) => {
      // En quittant l'étape courante : flush autosave + calcule ses erreurs inline.
      flushPending();
      const errs = validateStep(step, draft);
      setStepErrors((prev) => ({ ...prev, [step]: errs }));
      setStep(next);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [flushPending, validateStep, step, draft],
  );

  const currentIndex = STEP_IDS.indexOf(step);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === STEP_IDS.length - 1;

  // V2.5+ Wave Custom Fields — fields dynamiques côté candidat.
  const customFields = useMemo(() => {
    const raw = edition?.custom_fields_candidate;
    return Array.isArray(raw) ? raw : [];
  }, [edition?.custom_fields_candidate]);
  const customErrorsLive = useMemo(
    () => validateCustomFields(customFields, draft.custom_data || {}, t),
    [customFields, draft.custom_data, t],
  );

  // Points « incomplet » par étape (champs requis manquants) — sans bloquer.
  // V2.5+ : `rules` est nécessaire pour déterminer les docs requis dynamiquement.
  // Les custom fields s'affichent au step `documents` — on cumule leur état
  // d'incomplétude (au moins un required fautif) au flag documents.
  const incompleteSteps = useMemo(() => {
    const out = {};
    for (const id of STEP_IDS) {
      if (id === 'review' || id === 'finance') continue; // finance n'a pas de requis
      if (stepHasMissingRequired(draft, id, rules)) out[id] = true;
    }
    if (
      customFields.some((f) => f?.required)
      && Object.keys(customErrorsLive).length > 0
    ) {
      out.documents = true;
    }
    return out;
  }, [draft, rules, customFields, customErrorsLive]);

  // Soumission : valide tout, saute à la 1re étape fautive sinon délègue.
  // R-M1 : on AWAIT le flush avant d'appeler onSubmit pour s'assurer que la dernière
  // autosave en vol s'est settled — sinon son onSettled pourrait écraser la ligne
  // post-submit dans le cache TanStack Query.
  const handleSubmit = useCallback(async () => {
    await flushPending();
    const missingStep = firstStepWithMissing(draft, rules);
    // V2.5+ — bloque aussi si custom fields requis incomplets / format invalide.
    const customErrs = validateCustomFields(customFields, draft.custom_data || {}, t);
    const hasCustomErr = Object.keys(customErrs).length > 0;
    if (missingStep || hasCustomErr) {
      const errs = {};
      for (const id of ['contact', 'company', 'project', 'documents', 'club']) errs[id] = validateStep(id, draft);
      if (hasCustomErr) {
        // Stocke les erreurs custom à côté du step documents pour rendu inline.
        errs.documents = { ...(errs.documents || {}), __custom: customErrs };
      }
      setStepErrors(errs);
      setStep(missingStep || 'documents');
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    await onSubmit?.(draft);
  }, [flushPending, draft, rules, validateStep, onSubmit, customFields, t]);

  // Saut vers une étape depuis le récap (avec surlignage éventuel).
  const editFrom = useCallback(
    (stepId, opts) => {
      if (opts?.highlight) {
        const errs = {};
        for (const id of ['contact', 'company', 'project', 'documents', 'club']) errs[id] = validateStep(id, draft);
        setStepErrors((prev) => ({ ...prev, ...errs }));
      }
      setStep(stepId);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [validateStep, draft],
  );

  // Retour au suivi (mode édition d'un dossier soumis) : on flush l'autosave en
  // vol pour ne perdre aucune saisie, puis on rend la main au parent.
  const handleCancel = useCallback(() => {
    flushPending();
    onCancel?.();
  }, [flushPending, onCancel]);

  const errsFor = (id) => stepErrors[id] || {};

  let stepNode = null;
  if (step === 'contact') {
    stepNode = <StepContact value={draft} onChange={handleField} errors={errsFor('contact')} disabled={readOnly} />;
  } else if (step === 'company') {
    stepNode = <StepCompany value={draft} onChange={handleField} errors={errsFor('company')} rules={rules} disabled={readOnly} />;
  } else if (step === 'project') {
    stepNode = <StepProject value={draft} onChange={handleField} errors={errsFor('project')} disabled={readOnly} />;
  } else if (step === 'finance') {
    stepNode = <StepFinance value={draft} onChange={handleField} errors={errsFor('finance')} rules={rules} disabled={readOnly} />;
  } else if (step === 'documents') {
    stepNode = (
      <>
        <StepDocuments
          value={draft}
          onChange={handleField}
          errors={errsFor('documents')}
          rules={rules}
          editionId={edition?.id}
          startupId={startup?.id}
          disabled={readOnly}
        />
        {/* V2.5+ Wave Custom Fields — bloc dynamique par compétition.
            Persisté dans startups.custom_data (jsonb) via l'autosave parent. */}
        {customFields.length > 0 && (
          <div
            className="pt-5 mt-4 flex flex-col gap-3"
            style={{ borderTop: `1px solid ${CREAM2}` }}
          >
            <div className="flex items-center gap-2">
              <span className="h-[1.5px] w-6" style={{ background: GOLD }} aria-hidden />
              <span
                className="uppercase text-[10px] tracking-[0.16em] font-medium"
                style={{ color: GOLD }}
              >
                {t({
                  fr: 'Questions supplémentaires',
                  en: 'Additional questions',
                  de: 'Zusätzliche Fragen',
                })}
              </span>
            </div>
            <h3
              className="text-[18px] leading-tight"
              style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
            >
              {t({
                fr: 'Spécifique à cette compétition',
                en: 'Specific to this competition',
                de: 'Spezifisch für diesen Wettbewerb',
              })}
            </h3>
            <CustomFieldsRenderer
              fields={customFields}
              values={draft.custom_data || {}}
              errors={(errsFor('documents') && errsFor('documents').__custom) || {}}
              onChange={(key, value) => {
                // Clear l'erreur granulaire (UX positive).
                setStepErrors((prev) => {
                  const prevDocs = (prev && prev.documents) || {};
                  const sub = (prevDocs.__custom) || {};
                  if (!sub[key]) return prev;
                  const subNext = { ...sub };
                  delete subNext[key];
                  const docsNext = { ...prevDocs };
                  if (Object.keys(subNext).length === 0) delete docsNext.__custom;
                  else docsNext.__custom = subNext;
                  return { ...prev, documents: docsNext };
                });
                const merged = { ...(draft.custom_data || {}), [key]: value };
                setDraft((d) => ({ ...d, custom_data: merged }));
                queueAutosave({ custom_data: merged });
              }}
              disabled={readOnly}
              readonly={readOnly}
              onUpload={async (file, field) => {
                if (!edition?.id || !startup?.id) {
                  throw new Error('upload_no_owner_yet');
                }
                const path = await uploadCustomField({
                  editionId: edition.id,
                  ownerKind: 'startup',
                  ownerId: startup.id,
                  fieldKey: field.key,
                  file,
                  accept: field.accept,
                  maxSizeMb: field.maxSizeMb,
                });
                return { path, name: file.name };
              }}
            />
          </div>
        )}
      </>
    );
  } else if (step === 'club') {
    stepNode = (
      <StepClub
        value={draft}
        onChange={handleField}
        errors={errsFor('club')}
        editionId={edition?.id}
        disabled={readOnly}
      />
    );
  } else if (step === 'review') {
    stepNode = (
      <StepReview
        value={draft}
        onEdit={editFrom}
        rules={rules}
        onSubmit={handleSubmit}
        submitting={submitting}
        closeDate={closeDate}
        disabled={readOnly}
      />
    );
  }

  // Mini-banner contextualisé toujours visible (au-dessus du Stepper). Rappelle
  // en permanence à QUELLE compétition le dossier est rattaché + la date de
  // clôture, pour que le candidat ne perde jamais le repère. Pas de mention de
  // club : la startup candidate au concours en général, l'admin route ensuite.
  const editionTag = edition?.year || edition?.name || null;
  const contextDeadline = closeDate
    ? t({ fr: `Clôture le ${closeDate}`, en: `Closes on ${closeDate}`, de: `Schluss am ${closeDate}` })
    : null;

  return (
    <div>
      {editionTag && (
        <div
          className="mb-5 rounded-[4px] px-3.5 py-2 flex flex-wrap items-center justify-between gap-2"
          style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
        >
          <div className="flex items-center gap-2.5">
            <span className="h-[1.5px] w-5" style={{ background: GOLD }} aria-hidden />
            <span
              className="uppercase text-[10px] tracking-[0.18em] font-medium"
              style={{ color: GOLD }}
            >
              {editionTag}
            </span>
          </div>
          {contextDeadline && (
            <span className="text-[11.5px]" style={{ color: MUTED }}>
              {contextDeadline}
            </span>
          )}
        </div>
      )}
      {/* Mode édition d'un dossier déjà soumis : retour explicite vers le suivi
          (sinon quasi dead-end — l'utilisateur repart à l'étape 1 sans issue). */}
      {onCancel && (
        <button
          type="button"
          onClick={handleCancel}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium rounded-[4px] px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ color: NAVY }}
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          {t({
            fr: 'Revenir au suivi de mon dossier',
            en: 'Back to application tracking',
            de: 'Zurück zur Bewerbungsverfolgung',
          })}
        </button>
      )}
      <Stepper current={step} onStep={goTo} incompleteSteps={incompleteSteps} />

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 9 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
      >
        {stepNode}
      </motion.div>

      {/* Barre de navigation / actions */}
      <div className="flex items-center justify-between gap-3 mt-8 pt-5" style={{ borderTop: `1px solid ${CREAM2}` }}>
        <button
          type="button"
          onClick={() => !isFirst && goTo(STEP_IDS[currentIndex - 1])}
          disabled={isFirst}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium px-3 py-2 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: INK }}
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          {t(UI.prev)}
        </button>

        <div className="flex items-center gap-3">
          {/* Indicateur d'autosave + bouton brouillon (masqués en lecture seule) */}
          {!readOnly && (
            <>
              <span className="text-[12px] inline-flex items-center gap-1.5" style={{ color: MUTED }} aria-live="polite">
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                    {t(UI.saving)}
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" style={{ color: GOLD }} aria-hidden />
                    {t(UI.saved)}
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={flushPending}
                className="hidden sm:inline-flex items-center text-[13px] font-medium px-3 py-2 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
                style={{ color: NAVY, border: `1px solid ${CREAM2}` }}
              >
                {t(UI.saveDraft)}
              </button>
            </>
          )}

          {!isLast && (
            <button
              type="button"
              onClick={() => goTo(STEP_IDS[currentIndex + 1])}
              className="inline-flex items-center gap-1.5 text-[14px] font-medium px-4 py-2 rounded-[4px] text-white outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
              style={{ background: NAVY }}
            >
              {t(UI.next)}
              <ArrowRight className="w-4 h-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
