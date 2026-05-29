// OnePageDossier — V3 Vague 2, feature E.
//
// Vue « single-page » du dossier candidat (toutes les sections sur une seule
// page avec collapse/expand par bloc), alternative au funnel pas-à-pas legacy.
// Réutilise les composants Step* existants comme corps des sections (pas de
// duplication de logique de validation), et applique l'autosave Supabase
// débouncé 600ms par section comme demandé.
//
// Pourquoi un autre composant à côté de CandidatureFunnel ? Le funnel garde
// son rôle (stepper navigation linéaire + soumission) pour les utilisateurs
// qui préfèrent une expérience guidée. La vue single-page apporte une
// expérience « tout sous les yeux », plus rassurante pour les candidats
// pressés ou habitués aux SaaS modernes (Stripe, Linear). Le contrôleur
// (Candidater.jsx ou MonDossier.jsx) peut choisir.
//
// Pattern :
//  - state local `draft` + setDraft (snappy)
//  - debounce 600ms pour le flush onPatch (autosave)
//  - flushPending au unmount + au submit
//  - validation différée par section (à la sortie ou au submit)
//  - chaque section affichée dans CollapsibleSection avec point GOLD si
//    incomplet et check vert si toutes les requis sont présents
//
// Conformité Élysée :
//  - 100% tokens (NAVY/GOLD/CREAM/INK/MUTED/CREAM2)
//  - framer-motion AnimatePresence
//  - aucune dépendance npm nouvelle

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, Send, AlertCircle } from 'lucide-react';
import {
  NAVY, GOLD, INK, MUTED, CREAM2, EASE,
} from '@/components/design';
import { DANGER, TINT_DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import CollapsibleSection from './CollapsibleSection';
import StepContact from './steps/StepContact';
import StepCompany from './steps/StepCompany';
import StepProject from './steps/StepProject';
import StepFinance from './steps/StepFinance';
import StepDocuments from './steps/StepDocuments';
import { stepHasMissingRequired, firstStepWithMissing } from './validation';

const AUTOSAVE_MS = 600;

const SECTIONS = [
  {
    id: 'contact',
    eyebrow: { fr: 'Section 1', en: 'Section 1', de: 'Abschnitt 1' },
    title: { fr: 'Vos coordonnées', en: 'Your contact details', de: 'Ihre Kontaktdaten' },
    subtitle: {
      fr: 'Comment vous joindre au sujet de votre candidature.',
      en: 'How to reach you about your application.',
      de: 'Wie wir Sie zu Ihrer Bewerbung erreichen.',
    },
  },
  {
    id: 'company',
    eyebrow: { fr: 'Section 2', en: 'Section 2', de: 'Abschnitt 2' },
    title: { fr: 'Société', en: 'Company', de: 'Unternehmen' },
    subtitle: {
      fr: 'Statuts, pays, date de création et capital.',
      en: 'Legal form, country, founding date and equity.',
      de: 'Rechtsform, Land, Gründungsdatum und Kapital.',
    },
  },
  {
    id: 'project',
    eyebrow: { fr: 'Section 3', en: 'Section 3', de: 'Abschnitt 3' },
    title: { fr: 'Projet', en: 'Project', de: 'Projekt' },
    subtitle: {
      fr: 'Proposition de valeur, business model, équipe.',
      en: 'Value proposition, business model, team.',
      de: 'Wertversprechen, Geschäftsmodell, Team.',
    },
  },
  {
    id: 'finance',
    eyebrow: { fr: 'Section 4', en: 'Section 4', de: 'Abschnitt 4' },
    title: { fr: 'Finances', en: 'Financials', de: 'Finanzen' },
    subtitle: {
      fr: 'Chiffre d’affaires et levées.',
      en: 'Revenue and fundraising.',
      de: 'Umsatz und Kapitalbeschaffung.',
    },
  },
  {
    id: 'documents',
    eyebrow: { fr: 'Section 5', en: 'Section 5', de: 'Abschnitt 5' },
    title: { fr: 'Documents', en: 'Documents', de: 'Dokumente' },
    subtitle: {
      fr: 'Pitch deck, executive summary, vidéo (optionnelle).',
      en: 'Pitch deck, executive summary, video (optional).',
      de: 'Pitch-Deck, Executive Summary, Video (optional).',
    },
  },
];

const UI = {
  saving: { fr: 'Sauvegarde…', en: 'Saving…', de: 'Speichere…' },
  saved: { fr: 'Enregistré', en: 'Saved', de: 'Gespeichert' },
  submit: { fr: 'Soumettre mon dossier', en: 'Submit my application', de: 'Bewerbung einreichen' },
  submitting: { fr: 'Soumission…', en: 'Submitting…', de: 'Einreichen…' },
  missingHint: {
    fr: 'Sections à compléter avant soumission',
    en: 'Sections to complete before submission',
    de: 'Vor der Einreichung zu vervollständigende Abschnitte',
  },
  closeOn: { fr: 'Clôture le', en: 'Closes on', de: 'Schluss am' },
  expandAll: { fr: 'Tout déplier', en: 'Expand all', de: 'Alles aufklappen' },
  collapseAll: { fr: 'Tout replier', en: 'Collapse all', de: 'Alles einklappen' },
};

export default function OnePageDossier({
  startup,
  edition,
  rules,
  clubLabel,
  closeDate,
  onPatch,
  onFlush,
  onSubmit,
  saving = false,
  submitting = false,
  readOnly = false,
}) {
  const { t } = useLang();
  const [draft, setDraft] = useState(startup || {});
  const [open, setOpen] = useState({
    contact: true,
    company: false,
    project: false,
    finance: false,
    documents: false,
  });
  const [sectionErrors, setSectionErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  const debounceRef = useRef(null);
  const pendingRef = useRef(null);

  // Resync quand l'identité du dossier change.
  useEffect(() => {
    setDraft(startup || {});
  }, [startup?.id]);

  // Sync des chemins de docs uploadés sans écraser saisies en cours.
  useEffect(() => {
    setDraft((d) => ({
      ...d,
      pitch_deck_path: startup?.pitch_deck_path ?? d.pitch_deck_path,
      exec_summary_path: startup?.exec_summary_path ?? d.exec_summary_path,
    }));
  }, [startup?.pitch_deck_path, startup?.exec_summary_path]);

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

  // Flush au démontage (swallow rejection).
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

  // Validation par section (utilisée pour les markers complete/incomplete).
  const validateSection = useCallback(
    (id, value) => {
      const map = {
        contact: StepContact.validate,
        company: StepCompany.validate,
        project: StepProject.validate,
        finance: StepFinance.validate,
        documents: StepDocuments.validate,
      };
      const fn = map[id];
      return fn ? fn(value) : {};
    },
    [],
  );

  // État incomplete pour chaque section (point GOLD).
  const incompleteSections = useMemo(() => {
    const out = {};
    for (const s of SECTIONS) {
      // finance : pas de requis "dur" — skip
      if (s.id === 'finance') continue;
      if (stepHasMissingRequired(draft, s.id, rules)) out[s.id] = true;
    }
    return out;
  }, [draft, rules]);

  // État complete (toutes requis OK) — montre check vert.
  const completeSections = useMemo(() => {
    const out = {};
    for (const s of SECTIONS) {
      if (s.id === 'finance') continue;
      if (!stepHasMissingRequired(draft, s.id, rules)) out[s.id] = true;
    }
    return out;
  }, [draft, rules]);

  const toggle = useCallback(
    (id) => {
      setOpen((prev) => {
        const willOpen = !prev[id];
        // Si on ferme une section : flush l'autosave + calcule ses erreurs.
        if (!willOpen) {
          flushPending();
          const errs = validateSection(id, draft);
          setSectionErrors((curr) => ({ ...curr, [id]: errs }));
        }
        return { ...prev, [id]: willOpen };
      });
    },
    [flushPending, validateSection, draft],
  );

  const expandAll = useCallback(() => {
    setOpen({ contact: true, company: true, project: true, finance: true, documents: true });
  }, []);

  const collapseAll = useCallback(() => {
    flushPending();
    setOpen({ contact: false, company: false, project: false, finance: false, documents: false });
  }, [flushPending]);

  const handleSubmit = useCallback(async () => {
    setSubmitError(null);
    await flushPending();
    const missing = firstStepWithMissing(draft, rules);
    if (missing) {
      // Ouvre TOUTES les sections en erreur + scroll vers la première
      const errs = {};
      for (const id of ['contact', 'company', 'project', 'documents']) errs[id] = validateSection(id, draft);
      setSectionErrors(errs);
      setOpen({ contact: true, company: true, project: true, finance: true, documents: true });
      if (typeof window !== 'undefined') {
        // Petit délai pour laisser l'animation expand se faire avant le scroll
        setTimeout(() => {
          const el = document.querySelector(`[data-section="${missing}"]`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      }
      return;
    }
    try {
      await onSubmit?.(draft);
    } catch (err) {
      setSubmitError(err?.message || String(err));
    }
  }, [flushPending, draft, rules, validateSection, onSubmit]);

  const errsFor = (id) => sectionErrors[id] || {};

  const renderStepBody = (id) => {
    if (id === 'contact') {
      return <StepContact value={draft} onChange={handleField} errors={errsFor('contact')} disabled={readOnly} />;
    }
    if (id === 'company') {
      return <StepCompany value={draft} onChange={handleField} errors={errsFor('company')} rules={rules} disabled={readOnly} />;
    }
    if (id === 'project') {
      return <StepProject value={draft} onChange={handleField} errors={errsFor('project')} disabled={readOnly} />;
    }
    if (id === 'finance') {
      return <StepFinance value={draft} onChange={handleField} errors={errsFor('finance')} rules={rules} disabled={readOnly} />;
    }
    if (id === 'documents') {
      return (
        <StepDocuments
          value={draft}
          onChange={handleField}
          errors={errsFor('documents')}
          rules={rules}
          editionId={edition?.id}
          startupId={startup?.id}
          disabled={readOnly}
        />
      );
    }
    return null;
  };

  const editionTag = edition?.year || edition?.name || null;
  const allOpen = Object.values(open).every(Boolean);

  return (
    <div>
      {/* Mini-banner contextualisé édition×club */}
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
              {clubLabel && (
                <>
                  <span style={{ color: MUTED }}> · </span>
                  {clubLabel}
                </>
              )}
            </span>
          </div>
          {closeDate && (
            <span className="text-[11.5px]" style={{ color: MUTED }}>
              {t(UI.closeOn)} {closeDate}
            </span>
          )}
        </div>
      )}

      {/* Toolbar : autosave indicator + expand/collapse all */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={allOpen ? collapseAll : expandAll}
          className="text-[12px] font-medium underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] rounded-[4px] px-1"
          style={{ color: NAVY }}
        >
          {allOpen ? t(UI.collapseAll) : t(UI.expandAll)}
        </button>
        {!readOnly && (
          <span
            className="text-[12px] inline-flex items-center gap-1.5"
            style={{ color: MUTED }}
            aria-live="polite"
          >
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
        )}
      </div>

      <div className="flex flex-col gap-4">
        {SECTIONS.map((section) => (
          <div key={section.id} data-section={section.id}>
            <CollapsibleSection
              eyebrow={t(section.eyebrow)}
              title={t(section.title)}
              subtitle={t(section.subtitle)}
              open={open[section.id]}
              onToggle={() => toggle(section.id)}
              complete={completeSections[section.id]}
              incomplete={incompleteSections[section.id]}
            >
              {renderStepBody(section.id)}
            </CollapsibleSection>
          </div>
        ))}
      </div>

      {/* Submit footer */}
      {!readOnly && (
        <div
          className="mt-8 pt-5 flex flex-col gap-3"
          style={{ borderTop: `1px solid ${CREAM2}` }}
        >
          {/* Liste des sections incomplètes */}
          {Object.keys(incompleteSections).length > 0 && (
            <div className="text-[12.5px]" style={{ color: MUTED }}>
              <p className="mb-1.5 uppercase tracking-[0.12em] text-[10px] font-medium" style={{ color: GOLD }}>
                {t(UI.missingHint)}
              </p>
              <ul className="flex flex-wrap gap-2">
                {Object.keys(incompleteSections).map((id) => {
                  const s = SECTIONS.find((x) => x.id === id);
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => setOpen((p) => ({ ...p, [id]: true }))}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-medium"
                        style={{ background: 'white', border: `1px solid ${CREAM2}`, color: INK }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} aria-hidden />
                        {s ? t(s.title) : id}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <AnimatePresence>
            {submitError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: EASE }}
                role="alert"
                className="flex items-start gap-2 px-3 py-2 rounded-[4px]"
                style={{ background: TINT_DANGER, border: `1px solid ${DANGER}33` }}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: DANGER }} aria-hidden />
                <p className="text-[13px] leading-relaxed" style={{ color: DANGER }}>{submitError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || Object.keys(incompleteSections).length > 0}
              className="inline-flex items-center gap-2 text-[14px] font-medium px-5 py-2.5 rounded-[4px] text-white outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: NAVY }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  {t(UI.submitting)}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" aria-hidden />
                  {t(UI.submit)}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
