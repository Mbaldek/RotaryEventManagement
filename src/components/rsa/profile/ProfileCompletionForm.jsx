// ProfileCompletionForm — formulaire bloquant de complétion de profil.
//
// Affiché par /Welcome quand le user vient d'être invité (premier login d'un
// nouvel admin / club_admin / competition_admin / comité) OU quand son
// `profiles.full_name` est encore null pour un rôle "staff".
//
// Champs : full_name (requis), function (libre), phone (tel), bio (textarea ≤250),
//          photo (Dropzone), preferred_lang (FR/EN/DE).
//
// Submit :
//   1. (Optionnel) upload photo dans le bucket `jury-photos` sous le sous-path
//      `admins/{user_id}/{timestamp}-{filename}` — on réutilise le bucket existant
//      pour éviter une nouvelle migration de bucket Storage.
//   2. UPDATE profiles SET full_name, function, phone, bio, photo_path,
//      preferred_lang, profile_completed_at=now() WHERE id=auth.uid().
//   3. Sur succès → redirect via `redirectTo` (CTA target du rôle, computé par
//      le parent Welcome).
//
// Brand Élysée : Field/TextInput/Textarea/Select/Dropzone réutilisés depuis
// @/components/design — pas de chrome dupliqué.

import React, { useCallback, useId, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';
import {
  NAVY,
  GOLD,
  CREAM2,
  INK,
  MUTED,
  SERIF,
  EASE,
  Field,
  TextInput,
  Textarea,
  Select,
  Dropzone,
} from '@/components/design';
import { DANGER, TINT_DANGER, GOLD_TEXT, FOCUS_RING_CLASS } from '@/components/design/tokens.app';

const PHOTO_BUCKET = 'jury-photos';
const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 Mo
const PHOTO_ACCEPT = '.jpg,.jpeg,.png,image/jpeg,image/png';
const PHOTO_EXTS = new Set(['jpg', 'jpeg', 'png']);
const BIO_MAX = 250;

const T = {
  eyebrow: {
    fr: 'Bienvenue',
    en: 'Welcome',
    de: 'Willkommen',
  },
  title: {
    fr: 'Présentez-vous',
    en: 'Tell us about yourself',
    de: 'Stellen Sie sich vor',
  },
  subtitle: {
    fr: 'Quelques informations pour que vos collègues vous reconnaissent. Vous pourrez modifier ces données plus tard.',
    en: 'A few details so colleagues recognise you. You will be able to update everything later.',
    de: 'Einige Angaben, damit Ihre Kolleginnen und Kollegen Sie erkennen. Sie können alles später aktualisieren.',
  },
  fullName: { fr: 'Nom complet', en: 'Full name', de: 'Vollständiger Name' },
  fullNamePh: {
    fr: 'Ex. Mathieu Baldé',
    en: 'e.g. Jane Doe',
    de: 'z. B. Jane Doe',
  },
  function: { fr: 'Fonction', en: 'Role / function', de: 'Funktion' },
  functionPh: {
    fr: 'Ex. Past-Président, Coordinatrice startups',
    en: 'e.g. Past President, Startup coordinator',
    de: 'z. B. Past-Präsident, Startup-Koordinatorin',
  },
  phone: { fr: 'Téléphone', en: 'Phone', de: 'Telefon' },
  phonePh: {
    fr: '+33 6 12 34 56 78',
    en: '+33 6 12 34 56 78',
    de: '+49 30 1234 5678',
  },
  bio: { fr: 'Présentation courte', en: 'Short bio', de: 'Kurzbeschreibung' },
  bioPh: {
    fr: 'Quelques lignes sur votre parcours, votre rôle au club…',
    en: 'A few lines about your background, your role in the club…',
    de: 'Einige Zeilen über Ihren Werdegang, Ihre Rolle im Club…',
  },
  bioCounter: {
    fr: '{n} / {max} caractères',
    en: '{n} / {max} characters',
    de: '{n} / {max} Zeichen',
  },
  photo: { fr: 'Photo de profil', en: 'Profile photo', de: 'Profilfoto' },
  photoHelper: {
    fr: 'JPG ou PNG, 5 Mo maximum. Recommandé : portrait carré.',
    en: 'JPG or PNG, up to 5 MB. A square portrait works best.',
    de: 'JPG oder PNG, maximal 5 MB. Empfohlen: quadratisches Porträt.',
  },
  preferredLang: {
    fr: 'Langue préférée',
    en: 'Preferred language',
    de: 'Bevorzugte Sprache',
  },
  lang_fr: { fr: 'Français', en: 'French', de: 'Französisch' },
  lang_en: { fr: 'Anglais', en: 'English', de: 'Englisch' },
  lang_de: { fr: 'Allemand', en: 'German', de: 'Deutsch' },
  submit: {
    fr: 'Enregistrer et continuer',
    en: 'Save and continue',
    de: 'Speichern und fortfahren',
  },
  submitting: {
    fr: 'Enregistrement…',
    en: 'Saving…',
    de: 'Speichern…',
  },
  errRequired: {
    fr: 'Champ requis.',
    en: 'Required field.',
    de: 'Pflichtfeld.',
  },
  errBioTooLong: {
    fr: 'La présentation doit faire au plus 250 caractères.',
    en: 'Bio must be 250 characters or fewer.',
    de: 'Die Beschreibung darf höchstens 250 Zeichen lang sein.',
  },
  errPhotoFormat: {
    fr: 'Format non supporté — utilisez JPG ou PNG.',
    en: 'Unsupported format — use JPG or PNG.',
    de: 'Format nicht unterstützt — bitte JPG oder PNG verwenden.',
  },
  errPhotoSize: {
    fr: 'Image trop volumineuse (max 5 Mo).',
    en: 'Image too large (5 MB max).',
    de: 'Bild zu groß (max. 5 MB).',
  },
  errSubmit: {
    fr: "Impossible d'enregistrer votre profil. Réessayez dans un instant.",
    en: 'Could not save your profile. Please try again in a moment.',
    de: 'Profil konnte nicht gespeichert werden. Bitte erneut versuchen.',
  },
  dropPrompt: {
    fr: 'Déposez votre photo',
    en: 'Drop your photo',
    de: 'Foto hier ablegen',
  },
  dropHint: {
    fr: 'ou cliquez pour parcourir',
    en: 'or click to browse',
    de: 'oder klicken Sie zum Durchsuchen',
  },
};

const LANG_OPTIONS = (t) => [
  { value: 'fr', label: t(T.lang_fr) },
  { value: 'en', label: t(T.lang_en) },
  { value: 'de', label: t(T.lang_de) },
];

function extOf(name) {
  const m = (name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function safeFilename(name) {
  return (name || 'photo').replace(/[^\w.\-]+/g, '_').slice(-100);
}

/**
 * Props :
 *   - redirectTo      : string — URL vers laquelle naviguer après succès.
 *   - onCompleted     : () => void — callback optionnel post-save (avant redirect).
 *   - defaultLang     : 'fr'|'en'|'de' — pré-remplit le select (sinon lang courante).
 *   - initialFullName : string — pré-remplit le champ nom (depuis user_metadata).
 */
export default function ProfileCompletionForm({
  redirectTo = '/Admin',
  onCompleted,
  defaultLang,
  initialFullName,
}) {
  const { t, lang } = useLang();
  const { authUser } = usePlatformAuth();
  const reduce = useReducedMotion();
  const sectionLabelId = useId();

  const [fullName, setFullName] = useState(initialFullName || '');
  const [func, setFunc] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoError, setPhotoError] = useState(null);
  const [preferredLang, setPreferredLang] = useState(defaultLang || lang || 'fr');

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handlePhoto = useCallback((file) => {
    setPhotoError(null);
    const ext = extOf(file?.name);
    if (!PHOTO_EXTS.has(ext)) {
      setPhotoError(t(T.errPhotoFormat));
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setPhotoError(t(T.errPhotoSize));
      return;
    }
    setPhotoFile(file);
  }, [t]);

  const handlePhotoError = useCallback((code) => {
    if (code === 'format') setPhotoError(t(T.errPhotoFormat));
    else if (code === 'size') setPhotoError(t(T.errPhotoSize));
  }, [t]);

  const validate = useCallback(() => {
    const errs = {};
    if (!fullName.trim()) errs.fullName = t(T.errRequired);
    if (bio.length > BIO_MAX) errs.bio = t(T.errBioTooLong);
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [bio.length, fullName, t]);

  const onSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    if (!authUser?.id) {
      setSubmitError(t(T.errSubmit));
      return;
    }
    setSubmitting(true);
    try {
      let photoPath = null;
      if (photoFile) {
        const ext = extOf(photoFile.name);
        const safe = safeFilename(photoFile.name);
        const path = `admins/${authUser.id}/${Date.now()}-${safe}${safe.endsWith(`.${ext}`) ? '' : ''}`;
        const up = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(path, photoFile, { cacheControl: '3600', upsert: true });
        if (up.error) {
          throw up.error;
        }
        photoPath = up.data?.path || path;
      }

      const patch = {
        full_name: fullName.trim(),
        function: func.trim() || null,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        preferred_lang: preferredLang,
        profile_completed_at: new Date().toISOString(),
      };
      if (photoPath) patch.photo_path = photoPath;

      const { error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', authUser.id);
      if (error) throw error;

      onCompleted?.();
      // Redirect — full reload pour relancer le PlatformAuth (profile re-fetch).
      if (typeof window !== 'undefined') {
        window.location.assign(redirectTo || '/Admin');
      }
    } catch (err) {
       
      console.error('[ProfileCompletionForm] submit failed', err);
      setSubmitError(t(T.errSubmit));
      setSubmitting(false);
    }
  }, [authUser, bio, func, fullName, onCompleted, phone, photoFile, preferredLang, redirectTo, t, validate]);

  return (
    <section
      aria-labelledby={sectionLabelId}
      role="region"
      className="min-h-[70vh] flex items-center py-12"
    >
      <div className="w-full max-w-[680px] mx-auto px-4">
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="mb-7"
        >
          <div className="flex items-center gap-2.5 mb-3">
            <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
            <span
              className="uppercase text-[10.5px] tracking-[0.18em] font-medium"
              style={{ color: GOLD_TEXT }}
            >
              {t(T.eyebrow)}
            </span>
          </div>
          <h1
            id={sectionLabelId}
            className="font-normal"
            style={{
              fontFamily: SERIF,
              color: NAVY,
              fontSize: 'clamp(34px, 5vw, 48px)',
              lineHeight: 1.05,
              letterSpacing: '-0.005em',
            }}
          >
            {t(T.title)}
          </h1>
          <p
            className="mt-3 text-[14px] leading-relaxed"
            style={{ color: INK }}
          >
            {t(T.subtitle)}
          </p>
        </motion.div>

        <motion.form
          onSubmit={onSubmit}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
          className="rounded-[4px] p-5 md:p-7 flex flex-col gap-5"
          style={{ background: 'white', border: `1px solid ${CREAM2}` }}
          noValidate
        >
          <Field
            label={t(T.fullName)}
            required
            error={errors.fullName}
          >
            {({ id, describedBy, invalid, required }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                aria-required={required}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t(T.fullNamePh)}
                autoComplete="name"
                disabled={submitting}
              />
            )}
          </Field>

          <Field label={t(T.function)}>
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={func}
                onChange={(e) => setFunc(e.target.value)}
                placeholder={t(T.functionPh)}
                disabled={submitting}
              />
            )}
          </Field>

          <Field label={t(T.phone)}>
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                type="tel"
                aria-describedby={describedBy}
                invalid={invalid}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t(T.phonePh)}
                autoComplete="tel"
                disabled={submitting}
              />
            )}
          </Field>

          <Field
            label={t(T.bio)}
            error={errors.bio}
            helper={t(T.bioCounter).replace('{n}', String(bio.length)).replace('{max}', String(BIO_MAX))}
          >
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t(T.bioPh)}
                rows={4}
                maxLength={BIO_MAX + 50}
                disabled={submitting}
              />
            )}
          </Field>

          <Field
            label={t(T.photo)}
            helper={t(T.photoHelper)}
            error={photoError}
          >
            {({ id }) => (
              <Dropzone
                id={id}
                accept={PHOTO_ACCEPT}
                maxSizeMb={5}
                value={photoFile ? { name: photoFile.name, size: photoFile.size } : null}
                onFile={handlePhoto}
                onRemove={() => { setPhotoFile(null); setPhotoError(null); }}
                onError={handlePhotoError}
                disabled={submitting}
                labels={{
                  prompt: t(T.dropPrompt),
                  hint: t(T.dropHint),
                  errFormat: t(T.errPhotoFormat),
                  errSize: t(T.errPhotoSize),
                }}
              />
            )}
          </Field>

          <Field label={t(T.preferredLang)} required>
            {({ id, describedBy, invalid, required }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                aria-required={required}
                options={LANG_OPTIONS(t)}
                value={preferredLang}
                onChange={(e) => setPreferredLang(e.target.value)}
                disabled={submitting}
              />
            )}
          </Field>

          {submitError && (
            <p
              className="text-[13px] rounded-[4px] px-3 py-2"
              role="alert"
              style={{ background: TINT_DANGER, border: `1px solid ${CREAM2}`, color: DANGER }}
            >
              {submitError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-6 text-[14px] font-medium rounded-[4px] transition-colors ${FOCUS_RING_CLASS}`}
              style={{
                background: submitting ? MUTED : NAVY,
                color: 'white',
                border: `1px solid ${submitting ? MUTED : NAVY}`,
                cursor: submitting ? 'wait' : 'pointer',
              }}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
              {submitting ? t(T.submitting) : t(T.submit)} →
            </button>
          </div>
        </motion.form>

        <div className="mt-10 pt-5 text-[11px]" style={{ borderTop: `1px solid ${CREAM2}`, color: MUTED }}>
          Rotary Startup Award
        </div>
      </div>
    </section>
  );
}
