// JuryFunnel — formulaire public CANONIQUE d'inscription juré, SCOPÉ PAR COMPÉTITION.
//
// Porte UNIQUE (consolidation des ex-/DevenirJury et /JuryCandidate). Modèle
// RsaJuryForm beta restylé Élysée. Réf : docs/blueprints/jury-application-funnel.md §2,§4.
//
// editionId est TOUJOURS résolu et passé à apply() :
//   - depuis ?competition=<id> ou ?edition=<id> (URL) ;
//   - sinon, deep-link legacy /JuryCandidate?club=<id> → résolu via EditionClub.forClub ;
//   - sinon → écran de sélection de la compétition (éditions status ∈ {open, sessions}).
//
// Étapes : Identité → Présentation (bio + photo Storage privé) → Club (OBLIGATOIRE,
// hint pays/proche, pas de matching) → Disponibilités (cartes session multi-select,
// finale en carte OR, auto-lock grisé + 🔒) → Récapitulatif.
//
// Soumission : JuryApplication.apply() → rsa_apply_jury (entities/jury-applications.js),
// avec editionId + availabilitySessionIds incluant l'id finale si cochée.

import React, { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, Lock } from 'lucide-react';
import {
  PageShell,
  PlatformFooter,
  Eyebrow,
  Field,
  TextInput,
  Textarea,
  Select,
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
import { Club, Edition, EditionClub, JuryApplication } from '@/lib/rsa/entities';
import { getSessionPalette, getSessionEmoji } from '@/components/rsa/concours-dashboard/sessionTheme';
import PublicEventBadge from '@/components/rsa/public/PublicEventBadge';
import { JF, JF_STEPS, JF_STEP_IDS, JF_QUALITES } from './i18n';
import { isSessionLocked } from './autoLock';

const PHOTO_BUCKET = 'jury-photos';
const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 Mo
const PHOTO_ACCEPT = '.jpg,.jpeg,.png,image/jpeg,image/png';
const PHOTO_EXTS = new Set(['jpg', 'jpeg', 'png']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Éditions visibles dans le picker / acceptées comme scope.
const SCOPE_STATUSES = ['open', 'sessions'];

// ─── helpers validation ─────────────────────────────────────────────────────

function isBlank(v) {
  return v == null || (typeof v === 'string' && v.trim() === '');
}

// errors par step. Validation purement structurelle (le lock serveur fait foi
// sur les sessions verrouillées ; côté client elles sont grisées + non cochables).
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
  } else if (stepId === 'club') {
    if (isBlank(draft.clubId)) errs.clubId = 'errClubRequired';
  } else if (stepId === 'disponibilites') {
    const ids = draft.availabilitySessionIds || [];
    if (ids.length === 0) errs.availability = 'errSessionsRequired';
  }
  return errs;
}

function firstStepWithMissing(draft) {
  for (const id of JF_STEP_IDS) {
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

function formatSessionDate(raw, lang) {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  const locale = lang === 'en' ? 'en-GB' : lang === 'de' ? 'de-DE' : 'fr-FR';
  return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
}

// ─── Stepper ────────────────────────────────────────────────────────────────

function Stepper({ current, onStep, incompleteSteps = {} }) {
  const { t } = useLang();
  const currentIndex = JF_STEPS.findIndex((s) => s.id === current);
  return (
    <nav aria-label={t(JF.step)} className="mb-7">
      {/* Mobile */}
      <div className="md:hidden">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[11px] uppercase tracking-[0.14em] font-medium" style={{ color: MUTED }}>
            {t(JF.step)} {currentIndex + 1} / {JF_STEPS.length}
          </span>
          <span className="text-[15px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
            {t(JF_STEPS[currentIndex]?.label)}
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: CREAM2 }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / JF_STEPS.length) * 100}%`, background: GOLD }}
          />
        </div>
      </div>
      {/* Desktop */}
      <ol className="hidden md:flex items-center gap-1 list-none m-0 p-0">
        {JF_STEPS.map((stepDef, i) => {
          const isCurrent = stepDef.id === current;
          const isPast = i < currentIndex;
          const incomplete = incompleteSteps[stepDef.id];
          return (
            <li key={stepDef.id} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => onStep?.(stepDef.id)}
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
                <span className="text-[12px] font-medium whitespace-nowrap" style={{ color: isCurrent ? NAVY : INK }}>
                  {t(stepDef.label)}
                </span>
              </button>
              {i < JF_STEPS.length - 1 && (
                <span className="flex-1 h-px mx-2" style={{ background: CREAM2 }} aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── Step header (opener S-Numbered "01 — Identité") ──────────────────────────

function StepHeader({ eyebrow, title, subtitle, step, total }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-3 flex-wrap">
        <span className="tabular-nums text-[14px]" style={{ fontFamily: SERIF, color: GOLD }}>
          {String(step).padStart(2, '0')}
        </span>
        <span aria-hidden className="h-px w-7" style={{ background: CREAM2 }} />
        <span className="text-[14px] uppercase tracking-[0.12em]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {eyebrow}
        </span>
        <span className="ml-2 text-[10.5px] tabular-nums" style={{ color: MUTED }}>
          / {String(total).padStart(2, '0')}
        </span>
      </div>
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

// ─── Step 1 — Identité ────────────────────────────────────────────────────────

function StepIdentite({ draft, errors, onField }) {
  const { t } = useLang();
  return (
    <div>
      <StepHeader eyebrow={t(JF_STEPS[0].label)} title={t(JF.step1Title)} subtitle={t(JF.step1Subtitle)} step={1} total={JF_STEPS.length} />
      <div className="flex flex-col gap-5">
        <Field label={t(JF.fullName)} required error={errors.fullName ? t(JF[errors.fullName]) : undefined}>
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={draft.fullName ?? ''}
              onChange={(e) => onField('fullName', e.target.value)}
              placeholder={t(JF.fullNamePlaceholder)}
              autoComplete="name"
            />
          )}
        </Field>

        <Field label={t(JF.email)} required helper={t(JF.emailHelp)} error={errors.email ? t(JF[errors.email]) : undefined}>
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

        <Field label={t(JF.qualite)} required helper={t(JF.qualiteHelp)} error={errors.qualite ? t(JF[errors.qualite]) : undefined}>
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={draft.qualite ?? ''}
              onChange={(e) => onField('qualite', e.target.value)}
              placeholder={t(JF.qualitePlaceholder)}
              options={JF_QUALITES.map((q) => ({ value: q.value, label: t(q.label) }))}
            />
          )}
        </Field>

        <Field label={t(JF.organisation)} helper={t(JF.organisationHelp)}>
          {({ id }) => (
            <TextInput
              id={id}
              value={draft.organisation ?? ''}
              onChange={(e) => onField('organisation', e.target.value)}
              placeholder={t(JF.organisationPlaceholder)}
              autoComplete="organization"
            />
          )}
        </Field>
      </div>
    </div>
  );
}

// ─── Photo dropzone (upload Storage privé jury-photos) ────────────────────────

function PhotoDropzone({ value, onChange, t }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const labels = {
    prompt: t(JF.dzPrompt),
    hint: t(JF.dzHint),
    uploading: t(JF.dzUploading),
    replace: t(JF.dzReplace),
    remove: t(JF.dzRemove),
    errFormat: t(JF.dzErrFormat),
    errSize: t(JF.dzErrSize),
  };

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const ext = extOf(file.name);
    if (!PHOTO_EXTS.has(ext)) { setError(t(JF.dzErrFormat)); return; }
    if (file.size > PHOTO_MAX_BYTES) { setError(t(JF.dzErrSize)); return; }
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const random = Math.random().toString(36).slice(2, 10);
      const path = `incoming/${Date.now()}_${random}_${safeFilename(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
      if (upErr) throw upErr;
      setProgress(100);
      onChange({ path, name: file.name, size: file.size });
    } catch (e) {

      console.error('[JuryFunnel] photo upload failed', e);
      setError(t(JF.dzErrUpload));
    } finally {
      setUploading(false);
    }
  }, [onChange, t]);

  const handleRemove = useCallback(() => {
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
      onError={(code) => setError(code === 'size' ? t(JF.dzErrSize) : t(JF.dzErrFormat))}
      uploading={uploading}
      progress={progress}
      error={error}
      labels={labels}
    />
  );
}

// ─── Step 2 — Présentation ────────────────────────────────────────────────────

function StepPresentation({ draft, errors, onField }) {
  const { t } = useLang();
  const bioLen = (draft.bio || '').length;
  return (
    <div>
      <StepHeader eyebrow={t(JF_STEPS[1].label)} title={t(JF.step2Title)} subtitle={t(JF.step2Subtitle)} step={2} total={JF_STEPS.length} />
      <div className="flex flex-col gap-5">
        <Field label={t(JF.bio)} helper={t(JF.bioHelp)} error={errors.bio ? t(JF[errors.bio]) : undefined}>
          {({ id, describedBy, invalid }) => (
            <div>
              <Textarea
                id={id}
                rows={5}
                aria-describedby={describedBy}
                invalid={invalid}
                value={draft.bio ?? ''}
                onChange={(e) => onField('bio', e.target.value)}
                placeholder={t(JF.bioPlaceholder)}
              />
              <div className="text-right text-[11px] mt-1" style={{ color: bioLen > 1000 ? DANGER : MUTED }}>
                {bioLen} / 1000 {t(JF.charCount)}
              </div>
            </div>
          )}
        </Field>

        <Field
          label={<>{t(JF.photo)} <span style={{ color: MUTED }}>· {t(JF.optional)}</span></>}
          helper={t(JF.photoHelp)}
        >
          <PhotoDropzone value={draft.photo} onChange={(next) => onField('photo', next)} t={t} />
        </Field>
      </div>
    </div>
  );
}

// ─── Step 3 — Club (OBLIGATOIRE, hint pays/proche, pas de matching) ───────────

function StepClub({ draft, errors, onField, clubs }) {
  const { t } = useLang();
  return (
    <div>
      <StepHeader eyebrow={t(JF_STEPS[2].label)} title={t(JF.step3Title)} subtitle={t(JF.step3Subtitle)} step={3} total={JF_STEPS.length} />
      <Field label={t(JF.club)} required helper={t(JF.clubHint)} error={errors.clubId ? t(JF[errors.clubId]) : undefined}>
        {({ id, describedBy, invalid }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            value={draft.clubId ?? ''}
            onChange={(e) => onField('clubId', e.target.value)}
            placeholder={t(JF.clubPlaceholder)}
            options={clubs.map((c) => ({ value: c.id, label: c.name || c.id }))}
            disabled={clubs.length === 0}
          />
        )}
      </Field>
      {clubs.length === 0 && (
        <p className="text-[13px] mt-3" style={{ color: MUTED }}>{t(JF.clubNone)}</p>
      )}
    </div>
  );
}

// ─── Carte session (qualifying ou finale) ─────────────────────────────────────

function SessionCard({ session, indexInClub, checked, locked, onToggle }) {
  const { t, lang } = useLang();
  const isFinale = session.kind === 'finale';
  const palette = getSessionPalette(session, indexInClub);
  const emoji = getSessionEmoji(session);
  const dateLabel = formatSessionDate(session.session_date, lang);

  // Couleurs : grisé si locked ; sinon palette session (tint si coché).
  const borderColor = locked ? '#e8e0d8' : checked ? palette.primary : CREAM2;
  const bg = locked ? '#f5f3ee' : checked ? palette.light : 'white';
  const titleColor = locked ? '#a0a0a8' : checked ? palette.primary : NAVY;

  return (
    <button
      type="button"
      onClick={locked ? undefined : onToggle}
      aria-pressed={checked}
      aria-disabled={locked || undefined}
      disabled={locked}
      className={`relative w-full text-left flex items-start gap-3 px-4 py-3 rounded-[6px] transition-colors ${FOCUS_RING_CLASS} ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      style={{ background: bg, border: `1.5px solid ${borderColor}`, opacity: locked ? 0.6 : 1 }}
    >
      {/* Barre de couleur gauche (content marker) — masquée si locked. */}
      {!locked && (
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 rounded-l-[5px]"
          style={{ width: 4, background: palette.primary }}
        />
      )}
      {/* Checkbox */}
      <span
        aria-hidden
        className="mt-0.5 w-[18px] h-[18px] rounded-[4px] shrink-0 flex items-center justify-center transition-colors"
        style={{
          border: locked ? '1.5px dashed #c0c0c0' : checked ? 'none' : '1.5px solid #d0d0e0',
          background: locked ? 'transparent' : checked ? palette.primary : 'white',
        }}
      >
        {checked && !locked && <Check className="w-3 h-3" style={{ color: 'white' }} strokeWidth={3} />}
        {locked && <Lock className="w-2.5 h-2.5" style={{ color: '#a0a0a8' }} />}
      </span>
      <div className="flex-1 min-w-0 pl-1">
        <div className="flex items-center gap-2 flex-wrap">
          {emoji && <span aria-hidden className="text-[14px] leading-none">{emoji}</span>}
          <span className="text-[14px] font-medium" style={{ color: titleColor }}>
            {isFinale ? t(JF.finaleCardTitle) : session.name}
          </span>
          {locked && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium tracking-[0.02em]"
              style={{ background: '#e8e0d8', color: '#7a6048' }}
            >
              {t(JF.closedTag)}
            </span>
          )}
        </div>
        <p className="text-[12px] mt-0.5" style={{ color: locked ? '#a0a0a8' : MUTED }}>
          {isFinale
            ? (locked ? t(JF.closedNote) : t(JF.finaleCardNote))
            : [session.theme, dateLabel].filter(Boolean).join(' · ') || (locked ? t(JF.closedNote) : '')}
        </p>
      </div>
    </button>
  );
}

// ─── Step 4 — Disponibilités ──────────────────────────────────────────────────

function StepDisponibilites({ draft, errors, onField, qualifyingSessions, finaleSession, edition }) {
  const { t } = useLang();
  const selected = new Set(draft.availabilitySessionIds || []);

  const toggle = useCallback((sid) => {
    const cur = new Set(draft.availabilitySessionIds || []);
    if (cur.has(sid)) cur.delete(sid); else cur.add(sid);
    onField('availabilitySessionIds', Array.from(cur));
  }, [draft.availabilitySessionIds, onField]);

  const hasAny = qualifyingSessions.length > 0 || !!finaleSession;

  return (
    <div>
      <StepHeader eyebrow={t(JF_STEPS[3].label)} title={t(JF.step4Title)} subtitle={t(JF.step4Subtitle)} step={4} total={JF_STEPS.length} />
      {errors.availability && (
        <p className="text-[13px] mb-3" role="alert" style={{ color: DANGER }}>{t(JF[errors.availability])}</p>
      )}
      {!hasAny ? (
        <p className="text-[13px]" style={{ color: MUTED }}>{t(JF.sessionsNone)}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {qualifyingSessions.map((s, i) => (
            <SessionCard
              key={s.id}
              session={s}
              indexInClub={i}
              checked={selected.has(s.id)}
              locked={isSessionLocked(s, edition)}
              onToggle={() => toggle(s.id)}
            />
          ))}
          {finaleSession && (
            <SessionCard
              session={finaleSession}
              indexInClub={0}
              checked={selected.has(finaleSession.id)}
              locked={isSessionLocked(finaleSession, edition)}
              onToggle={() => toggle(finaleSession.id)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Review ───────────────────────────────────────────────────────────────────

function ReviewBlock({ title, children, onEdit }) {
  const { t } = useLang();
  return (
    <div className="rounded-[4px] p-4 mb-4" style={{ background: 'white', border: `1px solid ${CREAM2}` }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[14px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>{title}</h3>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className={`text-[12px] font-medium underline decoration-1 underline-offset-2 rounded-[2px] ${FOCUS_RING_CLASS}`}
            style={{ color: NAVY }}
          >
            {t(JF.edit)}
          </button>
        )}
      </div>
      <div className="text-[13px]" style={{ color: INK }}>{children}</div>
    </div>
  );
}

// Pastilles sessions choisies (palette + emoji), finale en OR.
function SessionPills({ sessionIds, sessions }) {
  const { t, lang } = useLang();
  const chosen = sessionIds
    .map((id) => sessions.find((s) => s.id === id))
    .filter(Boolean);
  if (chosen.length === 0) return <em style={{ color: MUTED }}>{t(JF.noAvailability)}</em>;
  return (
    <div className="flex flex-wrap gap-2">
      {chosen.map((s, i) => {
        const palette = getSessionPalette(s, i);
        const emoji = getSessionEmoji(s);
        const isFinale = s.kind === 'finale';
        const label = isFinale ? t(JF.finaleCardTitle) : (s.name || s.theme || s.id);
        const date = isFinale ? '' : formatSessionDate(s.session_date, lang);
        return (
          <span
            key={s.id}
            className="text-[11.5px] px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1"
            style={{ background: palette.light, color: palette.primary, border: `1px solid ${palette.border}` }}
          >
            {emoji && <span aria-hidden>{emoji}</span>}
            {label}{date ? ` · ${date}` : ''}
          </span>
        );
      })}
    </div>
  );
}

function StepReview({ draft, sessions, clubs, onEditStep, onSubmit, submitting, submitError, missing }) {
  const { t } = useLang();
  const qualiteLabel = JF_QUALITES.find((q) => q.value === draft.qualite)?.label || null;
  const clubName = clubs.find((c) => c.id === draft.clubId)?.name || draft.clubId || null;

  return (
    <div>
      <StepHeader eyebrow={t(JF_STEPS[4].label)} title={t(JF.step5Title)} subtitle={t(JF.step5Subtitle)} step={5} total={JF_STEPS.length} />

      <ReviewBlock title={t(JF.reviewIdentity)} onEdit={() => onEditStep('identite')}>
        <ul className="space-y-1">
          <li><strong style={{ color: NAVY }}>{t(JF.fullName)} : </strong>{draft.fullName || <em style={{ color: MUTED }}>{t(JF.notProvided)}</em>}</li>
          <li><strong style={{ color: NAVY }}>{t(JF.email)} : </strong>{draft.email || <em style={{ color: MUTED }}>{t(JF.notProvided)}</em>}</li>
          <li><strong style={{ color: NAVY }}>{t(JF.qualite)} : </strong>{qualiteLabel ? t(qualiteLabel) : <em style={{ color: MUTED }}>{t(JF.notProvided)}</em>}</li>
          <li><strong style={{ color: NAVY }}>{t(JF.organisation)} : </strong>{draft.organisation || <em style={{ color: MUTED }}>{t(JF.notProvided)}</em>}</li>
        </ul>
      </ReviewBlock>

      <ReviewBlock title={t(JF.reviewPresentation)} onEdit={() => onEditStep('presentation')}>
        <p className="whitespace-pre-wrap mb-2">{draft.bio || <em style={{ color: MUTED }}>{t(JF.notProvided)}</em>}</p>
        <p style={{ color: MUTED, fontSize: 12 }}>
          {draft.photo ? `${t(JF.photo)} : ${draft.photo.name}` : t(JF.noPhoto)}
        </p>
      </ReviewBlock>

      <ReviewBlock title={t(JF.reviewClub)} onEdit={() => onEditStep('club')}>
        <p><strong style={{ color: NAVY }}>{t(JF.club)} : </strong>{clubName || <em style={{ color: MUTED }}>{t(JF.notProvided)}</em>}</p>
      </ReviewBlock>

      <ReviewBlock title={t(JF.reviewAvailability)} onEdit={() => onEditStep('disponibilites')}>
        <SessionPills sessionIds={draft.availabilitySessionIds || []} sessions={sessions} />
      </ReviewBlock>

      {missing && <p className="text-[13px] mb-3" role="alert" style={{ color: DANGER }}>{t(JF.errMissing)}</p>}
      {submitError && <p className="text-[13px] mb-3" role="alert" style={{ color: DANGER }}>{submitError}</p>}

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className={`inline-flex items-center gap-2 text-[15px] font-medium px-6 py-3 rounded-[4px] text-white disabled:opacity-60 ${FOCUS_RING_CLASS}`}
        style={{ background: NAVY }}
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
        {submitting ? t(JF.submitting) : t(JF.submit)}
      </button>
      <p className="text-[11px] mt-3" style={{ color: MUTED }}>
        <span style={{ color: GOLD }}>·</span> {t(JF.legal)}
      </p>
    </div>
  );
}

// ─── Shells loading / error ───────────────────────────────────────────────────

function LoadingShell() {
  const { t } = useLang();
  return (
    <PageShell nav width="narrow" footer={<PlatformFooter width="narrow" />}>
      <div className="min-h-[40vh] flex items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} aria-label={t(JF.loading)} />
      </div>
    </PageShell>
  );
}

function ErrorShell({ message, onRetry }) {
  const { t } = useLang();
  return (
    <PageShell nav width="narrow" footer={<PlatformFooter width="narrow" />}>
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-center" role="alert">
        <p className="text-[14px]" style={{ color: INK }}>{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={`text-[13px] font-medium px-4 py-2 rounded-[4px] text-white ${FOCUS_RING_CLASS}`}
            style={{ background: NAVY }}
          >
            {t(JF.retry)}
          </button>
        )}
      </div>
    </PageShell>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function JuryFunnel() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const prefersReducedMotion = useReducedMotion();

  // editionId résolu depuis ?competition= (canonique) OU ?edition= (forward-compat
  // des liens DiffusionSection/legacy). ?club= = deep-link legacy /JuryCandidate.
  const editionParam = params.get('competition') || params.get('edition') || '';
  const clubParam = params.get('club') || '';

  // ── 1. Liste des éditions scope (open|sessions) — pour picker + résolution ──
  const editionsQ = useQuery({
    queryKey: ['rsa', 'jury-funnel', 'editions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('editions')
        .select('*')
        .in('status', SCOPE_STATUSES)
        .order('year', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── 2. Résolution edition_id depuis ?club= legacy (si pas de edition param) ──
  const resolvedFromClubQ = useQuery({
    queryKey: ['rsa', 'jury-funnel', 'resolve-club', clubParam],
    queryFn: () => EditionClub.forClub(clubParam),
    enabled: !editionParam && !!clubParam,
    staleTime: 5 * 60 * 1000,
  });

  const editionId = editionParam || resolvedFromClubQ.data || '';

  // ── 3. Édition résolue (objet complet pour les lock_days) ──────────────────
  const editionQ = useQuery({
    queryKey: ['rsa', 'jury-funnel', 'edition', editionId],
    queryFn: () => Edition.get(editionId),
    enabled: !!editionId,
    staleTime: 5 * 60 * 1000,
  });

  // ── 4. Clubs de l'édition ──────────────────────────────────────────────────
  const clubsQ = useQuery({
    queryKey: ['rsa', 'jury-funnel', 'clubs', editionId],
    queryFn: async () => {
      const rows = await EditionClub.forEdition(editionId);
      const out = (Array.isArray(rows) ? rows : [])
        .map((r) => r.club)
        .filter(Boolean);
      // Si la junction edition_clubs ne porte pas le club embed (RLS), fallback
      // sur la liste publique complète des clubs.
      if (out.length === 0) {
        try { return await Club.listAll(); } catch { return []; }
      }
      return out;
    },
    enabled: !!editionId,
    staleTime: 60 * 1000,
  });

  // ── 5. Sessions de l'édition (lecture publique status<>'draft') ────────────
  const sessionsQ = useQuery({
    queryKey: ['rsa', 'jury-funnel', 'sessions', editionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, theme, session_date, club_id, edition_id, kind, position')
        .eq('edition_id', editionId)
        .order('position', { ascending: true });
      if (error) {

        console.warn('[JuryFunnel] sessions read failed', error);
        return [];
      }
      return data || [];
    },
    enabled: !!editionId,
    staleTime: 60 * 1000,
  });

  const editions = editionsQ.data || [];
  const edition = editionQ.data || editions.find((e) => e.id === editionId) || null;
  const clubs = clubsQ.data || [];
  const sessions = useMemo(() => sessionsQ.data || [], [sessionsQ.data]);
  const qualifyingSessions = useMemo(() => sessions.filter((s) => s.kind !== 'finale'), [sessions]);
  const finaleSession = useMemo(() => sessions.find((s) => s.kind === 'finale') || null, [sessions]);

  // ── Funnel state ────────────────────────────────────────────────────────────
  const [draft, setDraft] = useState({
    fullName: '',
    email: '',
    qualite: '',
    organisation: '',
    bio: '',
    photo: null, // { path, name, size }
    clubId: clubParam || '',
    availabilitySessionIds: [],
  });
  const [step, setStep] = useState('identite');
  const [stepErrors, setStepErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  // Pré-remplit clubId depuis ?club= (deep-link legacy) dès que présent.
  React.useEffect(() => {
    if (clubParam) setDraft((d) => (d.clubId ? d : { ...d, clubId: clubParam }));
  }, [clubParam]);

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
    for (const id of JF_STEP_IDS) {
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
      for (const id of JF_STEP_IDS) if (id !== 'review') errs[id] = validateStep(id, draft);
      setStepErrors(errs);
      setStep(m);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!editionId) return;
    setSubmitting(true);
    try {
      await JuryApplication.apply({
        clubId: draft.clubId,
        editionId,
        email: draft.email,
        fullName: draft.fullName,
        qualite: draft.qualite,
        organisation: draft.organisation || null,
        bio: draft.bio || null,
        photoPath: draft.photo?.path || null,
        preferredThemes: [],
        availabilitySessionIds: draft.availabilitySessionIds || [],
      });
      setConfirmed(true);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {

      console.error('[JuryFunnel] submit failed', err);
      const msg = String(err?.message || '');
      if (/en attente|already|23505|duplicate/i.test(msg)) setSubmitError(t(JF.alreadyPending));
      else setSubmitError(t(JF.submitError));
    } finally {
      setSubmitting(false);
    }
  }, [draft, editionId, t]);

  // ── Garde-fous chargement / erreur ─────────────────────────────────────────
  if (editionsQ.isLoading || (clubParam && !editionParam && resolvedFromClubQ.isLoading)) {
    return <LoadingShell />;
  }
  if (editionsQ.isError) {
    return <ErrorShell message={t(JF.loadError)} onRetry={() => editionsQ.refetch()} />;
  }

  // ── Écran de confirmation post-soumission ──────────────────────────────────
  if (confirmed) {
    const competitionName = edition?.name || editionId;
    const clubName = clubs.find((c) => c.id === draft.clubId)?.name || draft.clubId || '';
    const body = (t(JF.thanksBody) || '')
      .replace('{competition}', competitionName)
      .replace('{club}', clubName);
    return (
      <PageShell nav width="narrow" footer={<PlatformFooter width="narrow" />}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: EASE }}>
          <Eyebrow>{t(JF.eyebrow)}</Eyebrow>
          <h1 className="text-[28px] md:text-[34px] leading-tight mt-2 mb-3" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
            {t(JF.thanksTitle)}
          </h1>
          <p className="text-[15px] leading-relaxed mb-4" style={{ color: INK }}>{body}</p>
          <div className="rounded-[4px] p-4 mb-4" style={{ background: 'white', border: `1px solid ${CREAM2}` }}>
            <p className="uppercase text-[10px] tracking-[0.16em] font-medium mb-2.5" style={{ color: GOLD }}>{t(JF.thanksRecap)}</p>
            <p className="text-[14px] mb-1" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>{draft.fullName}</p>
            <p className="text-[12.5px] mb-3" style={{ color: MUTED }}>
              {[draft.qualite ? t(JF_QUALITES.find((q) => q.value === draft.qualite)?.label || { fr: '', en: '', de: '' }) : '', draft.organisation].filter(Boolean).join(' · ')}
            </p>
            <SessionPills sessionIds={draft.availabilitySessionIds || []} sessions={sessions} />
          </div>
          <p className="text-[13.5px] leading-relaxed" style={{ color: MUTED }}>{t(JF.thanksNext)}</p>
        </motion.div>
      </PageShell>
    );
  }

  // ── Picker de compétition (pas d'editionId résolu) ─────────────────────────
  if (!editionId) {
    return (
      <PageShell nav width="narrow" footer={<PlatformFooter width="narrow" />}>
        <Eyebrow>{t(JF.pickCompetitionEyebrow)}</Eyebrow>
        <h1 className="text-[28px] md:text-[34px] leading-tight mt-2 mb-3" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(JF.pickCompetitionTitle)}
        </h1>
        <p className="text-[15px] leading-relaxed mb-7" style={{ color: INK }}>{t(JF.pickCompetitionSubtitle)}</p>
        <Field label={t(JF.pickCompetitionLabel)} required>
          {({ id }) => (
            <Select
              id={id}
              value=""
              onChange={(e) => {
                const p = new URLSearchParams(params);
                p.set('competition', e.target.value);
                p.delete('edition');
                setParams(p, { replace: true });
              }}
              placeholder={t(JF.pickCompetitionPlaceholder)}
              options={editions.map((e) => ({
                value: e.id,
                label: e.name ? `${e.name}${e.year ? ` · ${e.year}` : ''}` : String(e.year || e.id),
              }))}
              disabled={editions.length === 0}
            />
          )}
        </Field>
        {editions.length === 0 && (
          <p className="text-[13px] mt-3" style={{ color: MUTED }}>{t(JF.noCompetitions)}</p>
        )}
      </PageShell>
    );
  }

  // editionId présent mais introuvable (édition close/draft ou id erroné).
  if (editionId && !editionQ.isLoading && editions.length > 0 && !edition && editionQ.isFetched) {
    return (
      <ErrorShell
        message={t(JF.competitionMissing)}
        onRetry={() => {
          const p = new URLSearchParams(params);
          p.delete('competition'); p.delete('edition'); p.delete('club');
          setParams(p, { replace: true });
        }}
      />
    );
  }

  // ── Funnel principal ───────────────────────────────────────────────────────
  const currentIndex = JF_STEP_IDS.indexOf(step);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === JF_STEP_IDS.length - 1;
  const errsFor = (id) => stepErrors[id] || {};

  let stepNode = null;
  if (step === 'identite') stepNode = <StepIdentite draft={draft} errors={errsFor('identite')} onField={onField} />;
  else if (step === 'presentation') stepNode = <StepPresentation draft={draft} errors={errsFor('presentation')} onField={onField} />;
  else if (step === 'club') stepNode = <StepClub draft={draft} errors={errsFor('club')} onField={onField} clubs={clubs} />;
  else if (step === 'disponibilites') stepNode = (
    <StepDisponibilites
      draft={draft}
      errors={errsFor('disponibilites')}
      onField={onField}
      qualifyingSessions={qualifyingSessions}
      finaleSession={finaleSession}
      edition={edition}
    />
  );
  else if (step === 'review') stepNode = (
    <StepReview
      draft={draft}
      sessions={sessions}
      clubs={clubs}
      onEditStep={editFrom}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitError={submitError}
      missing={missing}
    />
  );

  return (
    <PageShell nav width="narrow" footer={<PlatformFooter width="narrow" />}>
      {/* Hero H-Vertical-Rule — barre gold gauche + texte stacké. */}
      <header className="mb-8 pl-6 md:pl-8 relative">
        <span aria-hidden className="absolute left-0 top-1 bottom-1 w-[2px]" style={{ background: GOLD }} />
        <span className="uppercase text-[10.5px] tracking-[0.18em] font-medium block" style={{ color: GOLD }}>
          {t(JF.eyebrow)}
        </span>
        <h1 className="mt-3 text-[32px] md:text-[40px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 400, lineHeight: 1.05 }}>
          {t(JF.title)} <span className="italic" style={{ color: INK }}>{t(JF.titleItalic)}</span>
        </h1>
        <p className="mt-4 text-[14.5px] leading-relaxed max-w-[58ch]" style={{ color: INK, lineHeight: 1.65 }}>
          {t(JF.pitch)}
        </p>
        <p className="mt-5 text-[12px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>
          <Link to="/Candidater" className="underline-offset-4 hover:underline" style={{ color: NAVY, textDecorationColor: GOLD }}>
            {t(JF.backToCandidater)}
          </Link>
        </p>
      </header>

      <PublicEventBadge editionId={editionId} clubId={draft.clubId || clubParam || null} kind="jury" />

      <Stepper current={step} onStep={goTo} incompleteSteps={incompleteSteps} />

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
            onClick={() => !isFirst && goTo(JF_STEP_IDS[currentIndex - 1])}
            disabled={isFirst}
            className={`inline-flex items-center gap-1.5 text-[14px] font-medium px-3 py-2 rounded-[4px] disabled:opacity-40 disabled:cursor-not-allowed ${FOCUS_RING_CLASS}`}
            style={{ color: INK }}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            {t(JF.prev)}
          </button>
          <button
            type="button"
            onClick={() => goTo(JF_STEP_IDS[currentIndex + 1])}
            className={`inline-flex items-center gap-1.5 text-[14px] font-medium px-4 py-2 rounded-[4px] text-white ${FOCUS_RING_CLASS}`}
            style={{ background: NAVY }}
          >
            {t(JF.next)}
            <ArrowRight className="w-4 h-4" aria-hidden />
          </button>
        </div>
      )}

      {isLast && (
        <div className="flex items-center justify-between gap-3 mt-8 pt-5" style={{ borderTop: `1px solid ${CREAM2}` }}>
          <button
            type="button"
            onClick={() => goTo(JF_STEP_IDS[currentIndex - 1])}
            className={`inline-flex items-center gap-1.5 text-[14px] font-medium px-3 py-2 rounded-[4px] ${FOCUS_RING_CLASS}`}
            style={{ color: INK }}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            {t(JF.prev)}
          </button>
        </div>
      )}
    </PageShell>
  );
}
