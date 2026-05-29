// JuryCandidate — Module 7 « Funnel d'acquisition jury ».
//
// Page PUBLIQUE (pas d'auth requise) : un futur juré arrive via un lien
//   /JuryCandidate?club=<club_id>[&edition=<edition_id>]
// et remplit en 4 steps un formulaire de candidature jury. Le RPC SECURITY DEFINER
// rsa_apply_jury accepte les soumissions anon ; la lecture des candidatures est
// verrouillée côté club_admin par la RLS jury_applications.
//
// Architecture : on imite CandidatureFunnel (Stepper, StepShell, validation déférée,
// récap final) mais on garde tout colocalisé ici car la copy + les champs diffèrent.
//
// Storage photo : bucket privé 'jury-photos' (créé par la migration M7). Upload
// direct via supabase.storage.from('jury-photos').upload(path, file). Le chemin
// est stocké dans jury_applications.photo_path ; la lecture passe par signedUrl
// côté JuryApplicationsTab (RLS limite la lecture à master_admin/club_admin/
// comité/candidat).

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import {
  PageShell,
  Eyebrow,
  Field,
  TextInput,
  Textarea,
  Select,
  TagSelect,
  Dropzone,
  NAVY,
  GOLD,
  CREAM2,
  INK,
  MUTED,
  SERIF,
  EASE,
  FOCUS_RING_CLASS,
} from '@/components/design';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { supabase } from '@/lib/supabase';
import { Club, JuryApplication } from '@/lib/rsa/entities';
import {
  JURY_STEPS,
  JURY_STEP_IDS,
  JURY_QUALITES,
  JURY_UI,
} from '@/components/rsa/candidature/juryFunnel.i18n';

const PHOTO_BUCKET = 'jury-photos';
const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 Mo
const PHOTO_ACCEPT = '.jpg,.jpeg,.png,image/jpeg,image/png';
const PHOTO_EXTS = new Set(['jpg', 'jpeg', 'png']);

// ─── helpers ──────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isBlank(v) {
  return v == null || (typeof v === 'string' && v.trim() === '');
}

function validateStep(stepId, draft) {
  const errs = {};
  if (stepId === 'identite') {
    if (isBlank(draft.fullName)) errs.fullName = 'errRequired';
    else if (draft.fullName.trim().length < 2) errs.fullName = 'errNameShort';
    if (isBlank(draft.email)) errs.email = 'errRequired';
    else if (!EMAIL_RE.test(String(draft.email).trim())) errs.email = 'errEmail';
    if (isBlank(draft.qualite)) errs.qualite = 'errQualite';
  } else if (stepId === 'presentation') {
    if (typeof draft.bio === 'string' && draft.bio.length > 1000) errs.bio = 'errBioLong';
  }
  return errs;
}

function firstStepWithMissing(draft) {
  for (const id of JURY_STEP_IDS) {
    if (id === 'review') continue;
    if (Object.keys(validateStep(id, draft)).length > 0) return id;
  }
  return null;
}

function extOf(name) {
  const m = (name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function safeFilename(name) {
  return (name || 'photo').replace(/[^\w.\-]+/g, '_').slice(-100);
}

// ─── Stepper local ────────────────────────────────────────────────────────

function JuryStepper({ current, onStep, incompleteSteps = {} }) {
  const { t } = useLang();
  const currentIndex = JURY_STEPS.findIndex((s) => s.id === current);
  return (
    <nav aria-label="Étapes" className="mb-7">
      {/* Mobile */}
      <div className="md:hidden">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[11px] uppercase tracking-[0.14em] font-medium" style={{ color: MUTED }}>
            {t({ fr: 'Étape', en: 'Step', de: 'Schritt' })} {currentIndex + 1} / {JURY_STEPS.length}
          </span>
          <span className="text-[15px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
            {t(JURY_STEPS[currentIndex]?.label)}
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: CREAM2 }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / JURY_STEPS.length) * 100}%`, background: GOLD }}
          />
        </div>
      </div>
      {/* Desktop */}
      <ol className="hidden md:flex items-center gap-1 list-none m-0 p-0">
        {JURY_STEPS.map((step, i) => {
          const isCurrent = step.id === current;
          const isPast = i < currentIndex;
          const incomplete = incompleteSteps[step.id];
          return (
            <li key={step.id} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => onStep?.(step.id)}
                aria-current={isCurrent ? 'step' : undefined}
                className={`group flex items-center gap-2 rounded-[4px] px-1 py-1 ${FOCUS_RING_CLASS}`}
              >
                <span
                  className="relative inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold shrink-0 transition-colors"
                  style={{
                    background: isCurrent ? NAVY : isPast ? GOLD : 'transparent',
                    color: isCurrent ? 'white' : isPast ? NAVY : MUTED,
                    border: `1.5px solid ${isCurrent ? NAVY : isPast ? GOLD : CREAM2}`,
                  }}
                >
                  {isPast ? <Check className="w-3.5 h-3.5" aria-hidden /> : i + 1}
                  {incomplete && !isCurrent && (
                    <span
                      aria-hidden
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                      style={{ background: GOLD, border: '1.5px solid white' }}
                    />
                  )}
                </span>
                <span
                  className="text-[12px] font-medium whitespace-nowrap"
                  style={{ color: isCurrent ? NAVY : INK }}
                >
                  {t(step.label)}
                </span>
              </button>
              {i < JURY_STEPS.length - 1 && (
                <span className="flex-1 h-px mx-2" style={{ background: CREAM2 }} aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── Step shell réutilisable (titre Playfair + sous-titre + corps) ────────

function StepHeader({ eyebrow, title, subtitle }) {
  return (
    <div>
      {eyebrow && (
        <div className="flex items-center gap-2.5 mb-2">
          <span className="h-[1.5px] w-6" style={{ background: GOLD }} aria-hidden />
          <span className="uppercase text-[10px] tracking-[0.16em] font-medium" style={{ color: GOLD }}>
            {eyebrow}
          </span>
        </div>
      )}
      <h2 className="text-[24px] leading-tight mb-1.5" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
        {title}
      </h2>
      {subtitle && (
        <p className="text-[14px] leading-relaxed mb-6" style={{ color: INK }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────

function StepIdentite({ draft, errors, onField }) {
  const { t } = useLang();
  return (
    <div>
      <StepHeader
        eyebrow={t(JURY_STEPS[0].label)}
        title={t(JURY_UI.step1Title)}
        subtitle={t(JURY_UI.step1Subtitle)}
      />
      <div className="flex flex-col gap-5">
        <Field
          label={t(JURY_UI.fullName)}
          required
          error={errors.fullName ? t(JURY_UI[errors.fullName]) : undefined}
        >
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={draft.fullName ?? ''}
              onChange={(e) => onField('fullName', e.target.value)}
              placeholder={t({ fr: 'Prénom Nom', en: 'First Last', de: 'Vorname Nachname' })}
              autoComplete="name"
            />
          )}
        </Field>

        <Field
          label={t(JURY_UI.email)}
          required
          helper={t(JURY_UI.emailHelp)}
          error={errors.email ? t(JURY_UI[errors.email]) : undefined}
        >
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              type="email"
              aria-describedby={describedBy}
              invalid={invalid}
              value={draft.email ?? ''}
              onChange={(e) => onField('email', e.target.value)}
              placeholder="vous@exemple.org"
              autoComplete="email"
            />
          )}
        </Field>

        <Field
          label={t(JURY_UI.qualite)}
          required
          helper={t(JURY_UI.qualiteHelp)}
          error={errors.qualite ? t(JURY_UI[errors.qualite]) : undefined}
        >
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={draft.qualite ?? ''}
              onChange={(e) => onField('qualite', e.target.value)}
              placeholder={t(JURY_UI.qualitePlaceholder)}
              options={JURY_QUALITES.map((q) => ({ value: q.value, label: t(q.label) }))}
            />
          )}
        </Field>

        <Field label={t(JURY_UI.organisation)} helper={t(JURY_UI.organisationHelp)}>
          {({ id }) => (
            <TextInput
              id={id}
              value={draft.organisation ?? ''}
              onChange={(e) => onField('organisation', e.target.value)}
              placeholder={t({ fr: 'Fonds, entreprise, cabinet…', en: 'Fund, company, firm…', de: 'Fonds, Unternehmen, Kanzlei…' })}
              autoComplete="organization"
            />
          )}
        </Field>
      </div>
    </div>
  );
}

function PhotoDropzone({ value, onChange, t }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const labels = {
    prompt: t(JURY_UI.dzPrompt),
    hint: t(JURY_UI.dzHint),
    uploading: t(JURY_UI.dzUploading),
    replace: t(JURY_UI.dzReplace),
    remove: t(JURY_UI.dzRemove),
    errFormat: t(JURY_UI.dzErrFormat),
    errSize: t(JURY_UI.dzErrSize),
  };

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const ext = extOf(file.name);
    if (!PHOTO_EXTS.has(ext)) {
      setError(t(JURY_UI.dzErrFormat));
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setError(t(JURY_UI.dzErrSize));
      return;
    }
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      // Chemin déterministe sans nécessité d'auth : timestamp + random suffix.
      const random = Math.random().toString(36).slice(2, 10);
      const path = `incoming/${Date.now()}_${random}_${safeFilename(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, {
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        });
      if (upErr) throw upErr;
      setProgress(100);
      onChange({ path, name: file.name, size: file.size });
    } catch (e) {
      console.error('[JuryCandidate] photo upload failed', e);
      setError(t(JURY_UI.dzErrUpload));
    } finally {
      setUploading(false);
    }
  }, [onChange, t]);

  const handleRemove = useCallback(() => {
    // Best-effort : suppression du fichier dans le bucket. Pas bloquant.
    if (value?.path) {
      supabase.storage.from(PHOTO_BUCKET).remove([value.path]).catch(() => {});
    }
    onChange(null);
  }, [value, onChange]);

  return (
    <Dropzone
      accept={PHOTO_ACCEPT}
      maxSizeMb={5}
      value={value ? { name: value.name, size: value.size } : null}
      onFile={handleFile}
      onRemove={value ? handleRemove : undefined}
      onError={(code) => setError(code === 'size' ? t(JURY_UI.dzErrSize) : t(JURY_UI.dzErrFormat))}
      uploading={uploading}
      progress={progress}
      error={error}
      labels={labels}
    />
  );
}

function StepPresentation({ draft, errors, onField }) {
  const { t } = useLang();
  const bioLen = (draft.bio || '').length;
  return (
    <div>
      <StepHeader
        eyebrow={t(JURY_STEPS[1].label)}
        title={t(JURY_UI.step2Title)}
        subtitle={t(JURY_UI.step2Subtitle)}
      />
      <div className="flex flex-col gap-5">
        <Field
          label={t(JURY_UI.bio)}
          helper={t(JURY_UI.bioHelp)}
          error={errors.bio ? t(JURY_UI[errors.bio]) : undefined}
        >
          {({ id, describedBy, invalid }) => (
            <div>
              <Textarea
                id={id}
                rows={5}
                aria-describedby={describedBy}
                invalid={invalid}
                value={draft.bio ?? ''}
                onChange={(e) => onField('bio', e.target.value)}
                placeholder={t({
                  fr: 'Parcours, expertises, motivation…',
                  en: 'Background, expertise, motivation…',
                  de: 'Werdegang, Expertise, Motivation…',
                })}
              />
              <div className="text-right text-[11px] mt-1" style={{ color: bioLen > 1000 ? DANGER : MUTED }}>
                {bioLen} / 1000 {t(JURY_UI.charCount)}
              </div>
            </div>
          )}
        </Field>

        <Field
          label={
            <>
              {t(JURY_UI.photo)} <span style={{ color: MUTED }}>· {t(JURY_UI.optional)}</span>
            </>
          }
          helper={t(JURY_UI.photoHelp)}
        >
          <PhotoDropzone
            value={draft.photo}
            onChange={(next) => onField('photo', next)}
            t={t}
          />
        </Field>
      </div>
    </div>
  );
}

function StepPreferences({ draft, sessions, themeOptions, onField }) {
  const { t } = useLang();
  const usePicker = themeOptions.length > 0;
  return (
    <div>
      <StepHeader
        eyebrow={t(JURY_STEPS[2].label)}
        title={t(JURY_UI.step3Title)}
        subtitle={t(JURY_UI.step3Subtitle)}
      />
      <div className="flex flex-col gap-5">
        <Field
          label={t(JURY_UI.themes)}
          helper={usePicker ? t(JURY_UI.themesHelp) : t(JURY_UI.themesFreeformHelp)}
        >
          {({ id }) =>
            usePicker ? (
              <TagSelect
                id={id}
                value={Array.isArray(draft.preferredThemes) ? draft.preferredThemes : []}
                onChange={(next) => onField('preferredThemes', next)}
                placeholder={t(JURY_UI.themesPlaceholder)}
                options={themeOptions.map((o) => ({ value: o.value, label: t(o.label) }))}
                max={5}
              />
            ) : (
              <TextInput
                id={id}
                value={draft.themesFreeform ?? ''}
                onChange={(e) => onField('themesFreeform', e.target.value)}
                placeholder={t(JURY_UI.themesFreeformPlaceholder)}
              />
            )
          }
        </Field>

        <Field label={t(JURY_UI.availability)} helper={t(JURY_UI.availabilityHelp)}>
          {() => (
            <div className="flex flex-col gap-2">
              {sessions.length === 0 && (
                <p className="text-[13px]" style={{ color: MUTED }}>
                  {t(JURY_UI.availabilityNone)}
                </p>
              )}
              {sessions.map((s) => {
                const checked = (draft.availabilitySessionIds || []).includes(s.id);
                const dateLabel = s.session_date
                  ? new Date(s.session_date).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '';
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-[4px] cursor-pointer transition-colors ${FOCUS_RING_CLASS}`}
                    style={{
                      background: checked ? '#fdf6e8' : 'white',
                      border: `1px solid ${checked ? GOLD : CREAM2}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const cur = new Set(draft.availabilitySessionIds || []);
                        if (cur.has(s.id)) cur.delete(s.id);
                        else cur.add(s.id);
                        onField('availabilitySessionIds', Array.from(cur));
                      }}
                      className="accent-[#0f1f3d]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-medium" style={{ color: NAVY }}>{s.name}</p>
                      {(s.theme || dateLabel) && (
                        <p className="text-[12px]" style={{ color: MUTED }}>
                          {[s.theme, dateLabel].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </Field>
      </div>
    </div>
  );
}

function ReviewBlock({ title, children, onEdit }) {
  const { t } = useLang();
  return (
    <div
      className="rounded-[4px] p-4 mb-4"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[14px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {title}
        </h3>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className={`text-[12px] font-medium underline decoration-1 underline-offset-2 rounded-[2px] ${FOCUS_RING_CLASS}`}
            style={{ color: NAVY }}
          >
            {t(JURY_UI.edit)}
          </button>
        )}
      </div>
      <div className="text-[13px]" style={{ color: INK }}>
        {children}
      </div>
    </div>
  );
}

function StepReview({ draft, sessions, themeOptions, onEditStep, onSubmit, submitting, submitError, missing }) {
  const { t } = useLang();
  const qualiteLabel =
    JURY_QUALITES.find((q) => q.value === draft.qualite)?.label || null;

  const themesText = useMemo(() => {
    if (themeOptions.length > 0) {
      const labels = (draft.preferredThemes || [])
        .map((v) => themeOptions.find((o) => o.value === v))
        .filter(Boolean)
        .map((o) => t(o.label));
      return labels.length ? labels.join(', ') : null;
    }
    return draft.themesFreeform || null;
  }, [draft.preferredThemes, draft.themesFreeform, themeOptions, t]);

  const availabilityText = useMemo(() => {
    const ids = draft.availabilitySessionIds || [];
    if (!ids.length) return null;
    return ids
      .map((id) => sessions.find((s) => s.id === id))
      .filter(Boolean)
      .map((s) => s.name)
      .join(', ');
  }, [draft.availabilitySessionIds, sessions]);

  return (
    <div>
      <StepHeader
        eyebrow={t(JURY_STEPS[3].label)}
        title={t(JURY_UI.step4Title)}
        subtitle={t(JURY_UI.step4Subtitle)}
      />

      <ReviewBlock title={t(JURY_UI.reviewSectionIdentity)} onEdit={() => onEditStep('identite')}>
        <ul className="space-y-1">
          <li><strong style={{ color: NAVY }}>{t(JURY_UI.fullName)} : </strong>{draft.fullName || <em style={{ color: MUTED }}>{t(JURY_UI.notProvided)}</em>}</li>
          <li><strong style={{ color: NAVY }}>{t(JURY_UI.email)} : </strong>{draft.email || <em style={{ color: MUTED }}>{t(JURY_UI.notProvided)}</em>}</li>
          <li><strong style={{ color: NAVY }}>{t(JURY_UI.qualite)} : </strong>{qualiteLabel ? t(qualiteLabel) : <em style={{ color: MUTED }}>{t(JURY_UI.notProvided)}</em>}</li>
          <li><strong style={{ color: NAVY }}>{t(JURY_UI.organisation)} : </strong>{draft.organisation || <em style={{ color: MUTED }}>{t(JURY_UI.notProvided)}</em>}</li>
        </ul>
      </ReviewBlock>

      <ReviewBlock title={t(JURY_UI.reviewSectionPresentation)} onEdit={() => onEditStep('presentation')}>
        <p className="whitespace-pre-wrap mb-2">{draft.bio || <em style={{ color: MUTED }}>{t(JURY_UI.notProvided)}</em>}</p>
        <p style={{ color: MUTED, fontSize: 12 }}>
          {draft.photo
            ? `${t(JURY_UI.photo)} : ${draft.photo.name}`
            : t(JURY_UI.noPhoto)}
        </p>
      </ReviewBlock>

      <ReviewBlock title={t(JURY_UI.reviewSectionPreferences)} onEdit={() => onEditStep('preferences')}>
        <p><strong style={{ color: NAVY }}>{t(JURY_UI.themes)} : </strong>{themesText || <em style={{ color: MUTED }}>{t(JURY_UI.noThemes)}</em>}</p>
        <p className="mt-1"><strong style={{ color: NAVY }}>{t(JURY_UI.availability)} : </strong>{availabilityText || <em style={{ color: MUTED }}>{t(JURY_UI.noAvailability)}</em>}</p>
      </ReviewBlock>

      {missing && (
        <p className="text-[13px] mb-3" role="alert" style={{ color: DANGER }}>
          {t(JURY_UI.errMissing)}
        </p>
      )}
      {submitError && (
        <p className="text-[13px] mb-3" role="alert" style={{ color: DANGER }}>{submitError}</p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className={`inline-flex items-center gap-2 text-[15px] font-medium px-6 py-3 rounded-[4px] text-white disabled:opacity-60 ${FOCUS_RING_CLASS}`}
        style={{ background: NAVY }}
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
        {submitting ? t(JURY_UI.submitting) : t(JURY_UI.submit)}
      </button>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────

export default function JuryCandidate() {
  const { t, lang } = useLang();
  const [params, setParams] = useSearchParams();
  const prefersReducedMotion = useReducedMotion();

  const clubIdParam = params.get('club') || '';
  const editionIdParam = params.get('edition') || null;

  // ── Données : clubs disponibles + sessions du club ─────────────────────
  const clubsQ = useQuery({
    queryKey: ['rsa', 'jury-candidate', 'clubs'],
    queryFn: () => Club.listAll(),
    staleTime: 5 * 60 * 1000,
  });

  const selectedClub = useMemo(() => {
    if (!clubIdParam) return null;
    return (clubsQ.data || []).find((c) => c.id === clubIdParam) || null;
  }, [clubsQ.data, clubIdParam]);

  // Sessions ouvertes : on charge les sessions de l'édition la plus récente
  // qui ait des sessions pour ce club. Pour rester simple, on les filtre côté
  // client à partir de la liste des sessions du club (sessions.club_id = …).
  const sessionsQ = useQuery({
    queryKey: ['rsa', 'jury-candidate', 'sessions', clubIdParam],
    queryFn: async () => {
      if (!clubIdParam) return [];
      // Public read : la RLS sessions_read est publique pour status !== 'draft' ;
      // on n'expose donc pas les sessions en brouillon. On accepte une lecture
      // directe par club_id sans dévoiler le contenu confidentiel.
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, theme, session_date, club_id, edition_id, kind')
        .eq('club_id', clubIdParam)
        .order('session_date', { ascending: true });
      if (error) {
        // Tolérance : si la lecture est refusée (cas inhabituel), on retombe
        // sur un funnel sans sessions (le candidat saisit ses thèmes libres).
        console.warn('[JuryCandidate] sessions read failed', error);
        return [];
      }
      return data || [];
    },
    enabled: !!clubIdParam,
    staleTime: 60 * 1000,
  });

  const sessions = sessionsQ.data || [];
  // Clusters proposés = liste unique des thèmes des sessions du club.
  const themeOptions = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const s of sessions) {
      if (!s.theme || seen.has(s.theme)) continue;
      seen.add(s.theme);
      out.push({ value: s.theme, label: { fr: s.theme, en: s.theme, de: s.theme } });
    }
    return out;
  }, [sessions]);

  // ── Funnel state ────────────────────────────────────────────────────────
  const [draft, setDraft] = useState({
    fullName: '',
    email: '',
    qualite: '',
    organisation: '',
    bio: '',
    photo: null, // { path, name, size }
    preferredThemes: [],
    themesFreeform: '',
    availabilitySessionIds: [],
  });
  const [step, setStep] = useState('identite');
  const [stepErrors, setStepErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const pendingPhotoRef = useRef(null);

  const onField = useCallback((field, val) => {
    setDraft((d) => ({ ...d, [field]: val }));
  }, []);

  const goTo = useCallback((next) => {
    setStepErrors((prev) => ({ ...prev, [step]: validateStep(step, draft) }));
    setStep(next);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, draft]);

  const editFrom = useCallback((stepId) => {
    setStep(stepId);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const incompleteSteps = useMemo(() => {
    const out = {};
    for (const id of JURY_STEP_IDS) {
      if (id === 'review') continue;
      if (Object.keys(validateStep(id, draft)).length > 0) out[id] = true;
    }
    return out;
  }, [draft]);

  const missing = useMemo(() => firstStepWithMissing(draft) !== null, [draft]);

  const handleSubmit = useCallback(async () => {
    setSubmitError(null);
    const m = firstStepWithMissing(draft);
    if (m) {
      const errs = {};
      for (const id of JURY_STEP_IDS) if (id !== 'review') errs[id] = validateStep(id, draft);
      setStepErrors(errs);
      setStep(m);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!selectedClub) return;
    setSubmitting(true);
    pendingPhotoRef.current = draft.photo?.path || null;
    try {
      const themes = themeOptions.length > 0
        ? draft.preferredThemes || []
        : (draft.themesFreeform || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
      await JuryApplication.apply({
        clubId: selectedClub.id,
        editionId: editionIdParam,
        email: draft.email,
        fullName: draft.fullName,
        qualite: draft.qualite,
        organisation: draft.organisation || null,
        bio: draft.bio || null,
        photoPath: draft.photo?.path || null,
        preferredThemes: themes,
        availabilitySessionIds: draft.availabilitySessionIds || [],
      });
      setConfirmed(true);
    } catch (err) {
      console.error('[JuryCandidate] submit failed', err);
      const msg = String(err?.message || '');
      if (msg.includes('Candidature en attente') || msg.includes('23505')) {
        setSubmitError(t(JURY_UI.alreadyPending));
      } else {
        setSubmitError(t(JURY_UI.submitError));
      }
    } finally {
      setSubmitting(false);
    }
  }, [draft, selectedClub, editionIdParam, themeOptions, t]);

  // ── Garde-fou : pas de clubId → écran picker ───────────────────────────
  const allClubs = clubsQ.data || [];

  if (clubsQ.isLoading) {
    return (
      <PageShell>
        <div
          className="min-h-[40vh] flex items-center justify-center"
          role="status"
          aria-live="polite"
        >
          <Loader2
            className="w-6 h-6 animate-spin"
            style={{ color: GOLD }}
            aria-label={t(JURY_UI.loading)}
          />
        </div>
      </PageShell>
    );
  }

  if (clubsQ.isError) {
    return (
      <PageShell>
        <div
          className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-center"
          role="alert"
        >
          <p className="text-[14px]" style={{ color: INK }}>{t(JURY_UI.loadError)}</p>
          <button
            type="button"
            onClick={() => clubsQ.refetch()}
            className={`text-[13px] font-medium px-4 py-2 rounded-[4px] text-white ${FOCUS_RING_CLASS}`}
            style={{ background: NAVY }}
          >
            {t(JURY_UI.retry)}
          </button>
        </div>
      </PageShell>
    );
  }

  // ── Écran de confirmation post-soumission ──────────────────────────────
  if (confirmed && selectedClub) {
    const body = (t(JURY_UI.thanksBody) || '').replace('{club}', selectedClub.name || selectedClub.id);
    return (
      <PageShell>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: EASE }}
        >
          <Eyebrow>{t(JURY_UI.eyebrow)}</Eyebrow>
          <h1
            className="text-[28px] md:text-[34px] leading-tight mt-2 mb-3"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {t(JURY_UI.thanksTitle)}
          </h1>
          <p className="text-[15px] leading-relaxed mb-4" style={{ color: INK }}>{body}</p>
          <p className="text-[13.5px] leading-relaxed" style={{ color: MUTED }}>{t(JURY_UI.thanksNext)}</p>
        </motion.div>
      </PageShell>
    );
  }

  // ── Picker de club (pas de ?club= ou club introuvable) ─────────────────
  if (!clubIdParam) {
    return (
      <PageShell>
        <Eyebrow>{t(JURY_UI.eyebrow)}</Eyebrow>
        <h1
          className="text-[28px] md:text-[34px] leading-tight mt-2 mb-3"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(JURY_UI.title)}
        </h1>
        <p className="text-[15px] leading-relaxed mb-7" style={{ color: INK }}>{t(JURY_UI.subtitle)}</p>

        <Field label={t(JURY_UI.clubPickerTitle)} helper={t(JURY_UI.clubPickerHint)} required>
          {({ id }) => (
            <Select
              id={id}
              value=""
              onChange={(e) => {
                const p = new URLSearchParams(params);
                p.set('club', e.target.value);
                setParams(p, { replace: true });
              }}
              placeholder={t(JURY_UI.clubPickerPlaceholder)}
              options={allClubs.map((c) => ({
                value: c.id,
                label: `${c.name}${c.region ? ` · ${c.region}` : ''}`,
              }))}
            />
          )}
        </Field>
        {allClubs.length === 0 && (
          <p className="text-[13px] mt-3" style={{ color: MUTED }}>{t(JURY_UI.noClubs)}</p>
        )}
      </PageShell>
    );
  }

  if (clubIdParam && !selectedClub) {
    return (
      <PageShell>
        <div
          className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-center"
          role="alert"
        >
          <p className="text-[14px]" style={{ color: DANGER }}>{t(JURY_UI.clubMissing)}</p>
          <button
            type="button"
            onClick={() => {
              const p = new URLSearchParams(params);
              p.delete('club');
              setParams(p, { replace: true });
            }}
            className={`text-[13px] font-medium px-4 py-2 rounded-[4px] text-white ${FOCUS_RING_CLASS}`}
            style={{ background: NAVY }}
          >
            {t(JURY_UI.clubPickerPlaceholder)}
          </button>
        </div>
      </PageShell>
    );
  }

  // ── Funnel principal ───────────────────────────────────────────────────
  const currentIndex = JURY_STEP_IDS.indexOf(step);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === JURY_STEP_IDS.length - 1;
  const errsFor = (id) => stepErrors[id] || {};

  let stepNode = null;
  if (step === 'identite') stepNode = <StepIdentite draft={draft} errors={errsFor('identite')} onField={onField} />;
  else if (step === 'presentation') stepNode = <StepPresentation draft={draft} errors={errsFor('presentation')} onField={onField} />;
  else if (step === 'preferences') stepNode = <StepPreferences draft={draft} sessions={sessions} themeOptions={themeOptions} onField={onField} />;
  else if (step === 'review') stepNode = (
    <StepReview
      draft={draft}
      sessions={sessions}
      themeOptions={themeOptions}
      onEditStep={editFrom}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitError={submitError}
      missing={missing}
    />
  );

  return (
    <PageShell>
      <header className="mb-6">
        <Eyebrow>{t(JURY_UI.eyebrow)} · {selectedClub.name || selectedClub.id}</Eyebrow>
        <h1
          className="text-[28px] md:text-[32px] leading-tight mt-2 mb-2"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(JURY_UI.title)}
        </h1>
        <p className="text-[14px] max-w-[60ch]" style={{ color: INK, lineHeight: 1.6 }}>{t(JURY_UI.subtitle)}</p>
      </header>

      <JuryStepper current={step} onStep={goTo} incompleteSteps={incompleteSteps} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: EASE }}
          role="tabpanel"
          id={`jury-step-panel-${step}`}
        >
          {stepNode}
        </motion.div>
      </AnimatePresence>

      {!isLast && (
        <div className="flex items-center justify-between gap-3 mt-8 pt-5" style={{ borderTop: `1px solid ${CREAM2}` }}>
          <button
            type="button"
            onClick={() => !isFirst && goTo(JURY_STEP_IDS[currentIndex - 1])}
            disabled={isFirst}
            className={`inline-flex items-center gap-1.5 text-[14px] font-medium px-3 py-2 rounded-[4px] disabled:opacity-40 disabled:cursor-not-allowed ${FOCUS_RING_CLASS}`}
            style={{ color: INK }}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            {t(JURY_UI.prev)}
          </button>
          <button
            type="button"
            onClick={() => goTo(JURY_STEP_IDS[currentIndex + 1])}
            className={`inline-flex items-center gap-1.5 text-[14px] font-medium px-4 py-2 rounded-[4px] text-white ${FOCUS_RING_CLASS}`}
            style={{ background: NAVY }}
          >
            {t(JURY_UI.next)}
            <ArrowRight className="w-4 h-4" aria-hidden />
          </button>
        </div>
      )}

      {isLast && !isFirst && (
        <div className="flex items-center justify-between gap-3 mt-8 pt-5" style={{ borderTop: `1px solid ${CREAM2}` }}>
          <button
            type="button"
            onClick={() => goTo(JURY_STEP_IDS[currentIndex - 1])}
            className={`inline-flex items-center gap-1.5 text-[14px] font-medium px-3 py-2 rounded-[4px] ${FOCUS_RING_CLASS}`}
            style={{ color: INK }}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            {t(JURY_UI.prev)}
          </button>
        </div>
      )}
    </PageShell>
  );
}
