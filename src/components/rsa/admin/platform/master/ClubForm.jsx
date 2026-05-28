// ClubForm — V2.5 refonte du form de création/édition de club Rotary.
//
// 4 sections empilées, hairline gold Élysée :
//   1. Informations du club        — nom*, pays*, langue principale*
//   2. Représentant                — prénom*, nom*, email*, téléphone
//   3. Président                   — prénom, nom, email
//   4. Coordonnées institutionnelles — email, téléphone, adresse postale
//
// Réutilisé par ClubsTab (création) et ClubEditor (édition).
//
// Mode :
//   - mode='create' : pas d'ID préexistant. Affiche live « ↳ ID : … » sous le nom.
//   - mode='edit'   : id figé (read-only, affiché en eyebrow gold). Aucun champ
//     d'ID éditable. Le bouton submit est « Enregistrer » au lieu de « Créer ».
//
// Validation client : nom>=2, country in catalogue, language in catalogue,
// représentant first/last/email requis. Le SQL re-valide tout côté serveur.

import React, { useMemo, useState } from 'react';
import { Loader2, Save, Plus } from 'lucide-react';
import {
  CREAM2, NAVY, MUTED, INK, GOLD,
} from '@/components/design';
import { DANGER } from '@/components/design/tokens.app';
import Field from '@/components/design/form/Field';
import TextInput from '@/components/design/form/TextInput';
import Select from '@/components/design/form/Select';
import Textarea from '@/components/design/form/Textarea';
import { useLang } from '@/lib/platform/i18n';
import {
  UI, CLUBS,
  COUNTRY_OPTIONS, LANGUAGE_OPTIONS,
  EMAIL_REGEX, slugifyClubName,
} from './i18n';

// ── Section header (hairline gold + uppercase label, pattern Élysée) ────────
function SectionHeader({ children }) {
  return (
    <div className="flex items-center gap-2.5 mb-3 mt-1">
      <span
        className="h-[1.5px] w-7"
        style={{ background: GOLD }}
        aria-hidden
      />
      <span
        className="uppercase text-[10px] tracking-[0.18em] font-medium"
        style={{ color: GOLD }}
      >
        {children}
      </span>
    </div>
  );
}

// ── Champs initiaux (vide ou pré-remplis depuis une row clubs) ─────────────
export function emptyClubForm() {
  return {
    name: '',
    country: '',
    language: 'fr',
    contactFirstName: '',
    contactLastName: '',
    contactEmail: '',
    contactPhone: '',
    presidentFirstName: '',
    presidentLastName: '',
    presidentEmail: '',
    clubEmail: '',
    clubPhone: '',
    clubAddress: '',
  };
}

export function clubRowToForm(club) {
  if (!club) return emptyClubForm();
  return {
    name: club.name ?? '',
    country: club.country ?? '',
    language: club.language ?? 'fr',
    contactFirstName: club.contact_first_name ?? '',
    contactLastName: club.contact_last_name ?? '',
    contactEmail: club.contact_email ?? '',
    contactPhone: club.contact_phone ?? '',
    presidentFirstName: club.president_first_name ?? '',
    presidentLastName: club.president_last_name ?? '',
    presidentEmail: club.president_email ?? '',
    clubEmail: club.club_email ?? '',
    clubPhone: club.club_phone ?? '',
    clubAddress: club.club_address ?? '',
  };
}

// Validation client. Retourne { ok, errors: { field: msgKey } }.
function validateClubForm(form, t) {
  const errors = {};
  if (!form.name || form.name.trim().length < 2) {
    errors.name = t(CLUBS.errNameTooShort);
  }
  if (!form.country) {
    errors.country = t(CLUBS.errCountryRequired);
  } else if (!COUNTRY_OPTIONS.some((c) => c.code === form.country)) {
    errors.country = t(CLUBS.errCountryRequired);
  }
  if (!form.language) {
    errors.language = t(CLUBS.errLanguageRequired);
  } else if (!LANGUAGE_OPTIONS.some((l) => l.code === form.language)) {
    errors.language = t(CLUBS.errLanguageRequired);
  }
  if (!form.contactFirstName || !form.contactFirstName.trim()) {
    errors.contactFirstName = t(CLUBS.errContactFirstName);
  }
  if (!form.contactLastName || !form.contactLastName.trim()) {
    errors.contactLastName = t(CLUBS.errContactLastName);
  }
  const ce = (form.contactEmail || '').trim();
  if (!ce) {
    errors.contactEmail = t(CLUBS.errContactEmail);
  } else if (!EMAIL_REGEX.test(ce)) {
    errors.contactEmail = t(CLUBS.errEmailFormat);
  }
  // Champs email optionnels : si remplis, doivent être valides
  const pe = (form.presidentEmail || '').trim();
  if (pe && !EMAIL_REGEX.test(pe)) {
    errors.presidentEmail = t(CLUBS.errEmailFormat);
  }
  const cle = (form.clubEmail || '').trim();
  if (cle && !EMAIL_REGEX.test(cle)) {
    errors.clubEmail = t(CLUBS.errEmailFormat);
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// ClubForm
//
// Props :
//   mode      : 'create' | 'edit'
//   initial   : valeurs initiales (objet camelCase, cf. emptyClubForm / clubRowToForm)
//   clubId    : id figé (uniquement mode='edit', affiché en eyebrow)
//   submitting: bool — désactive le bouton submit + spinner
//   onSubmit  : (formValues) => Promise — appelle createClub / updateClub
//   onCancel  : () => void — bouton « Annuler »
//   submitError: string|null — erreur serveur à afficher en bas
// ─────────────────────────────────────────────────────────────────────────────
export default function ClubForm({
  mode = 'create',
  initial,
  clubId = null,
  submitting = false,
  onSubmit,
  onCancel,
  submitError = null,
}) {
  const { t, lang } = useLang();
  const [form, setForm] = useState(() => (initial ? { ...emptyClubForm(), ...initial } : emptyClubForm()));
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);

  const countryOptions = useMemo(
    () => COUNTRY_OPTIONS.map((c) => ({ value: c.code, label: c[lang] || c.fr })),
    [lang],
  );
  const languageOptions = useMemo(
    () => LANGUAGE_OPTIONS.map((l) => ({ value: l.code, label: l[lang] || l.fr })),
    [lang],
  );

  const previewId = useMemo(() => slugifyClubName(form.name), [form.name]);

  function set(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
    // si l'utilisateur corrige un champ erroné, on enlève son erreur live
    if (touched) {
      setErrors((p) => {
        if (!p[field]) return p;
        const next = { ...p };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit() {
    setTouched(true);
    const v = validateClubForm(form, t);
    setErrors(v.errors);
    if (!v.ok) return;
    // Trim toutes les valeurs string avant submit
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, val]) => [k, typeof val === 'string' ? val.trim() : val]),
    );
    if (mode === 'edit' && clubId) {
      payload.id = clubId;
    }
    await onSubmit?.(payload);
  }

  return (
    <div className="space-y-5">
      {/* ── 1. Informations du club ────────────────────────────────────── */}
      <section>
        <SectionHeader>{t(CLUBS.sectionClubInfo)}</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label={t(CLUBS.nameLabel)}
            required
            error={errors.name}
            helper={
              mode === 'create' && form.name.trim().length >= 2
                ? `↳ ${t(CLUBS.generatedIdLabel)} : ${previewId || '—'}`
                : null
            }
            className="md:col-span-2"
          >
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder={t(CLUBS.clubNamePlaceholder)}
                autoComplete="organization"
              />
            )}
          </Field>

          {mode === 'edit' && clubId && (
            <Field
              label={t(CLUBS.generatedIdLabel)}
              helper={t(CLUBS.generatedIdHint)}
              className="md:col-span-2"
            >
              {({ id }) => (
                <TextInput
                  id={id}
                  value={clubId}
                  readOnly
                  disabled
                  className="font-mono"
                />
              )}
            </Field>
          )}

          <Field
            label={t(CLUBS.countryLabel)}
            required
            error={errors.country}
          >
            {({ id, describedBy, invalid }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
                placeholder={t(CLUBS.pickCountry)}
                options={countryOptions}
              />
            )}
          </Field>

          <Field
            label={t(CLUBS.languageLabel)}
            required
            error={errors.language}
          >
            {({ id, describedBy, invalid }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={form.language}
                onChange={(e) => set('language', e.target.value)}
                placeholder={t(CLUBS.pickLanguage)}
                options={languageOptions}
              />
            )}
          </Field>
        </div>
      </section>

      {/* ── 2. Représentant ─────────────────────────────────────────────── */}
      <section>
        <SectionHeader>{t(CLUBS.sectionContact)}</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label={t(CLUBS.firstNameLabel)}
            required
            error={errors.contactFirstName}
          >
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={form.contactFirstName}
                onChange={(e) => set('contactFirstName', e.target.value)}
                autoComplete="given-name"
              />
            )}
          </Field>

          <Field
            label={t(CLUBS.lastNameLabel)}
            required
            error={errors.contactLastName}
          >
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={form.contactLastName}
                onChange={(e) => set('contactLastName', e.target.value)}
                autoComplete="family-name"
              />
            )}
          </Field>

          <Field
            label={t(CLUBS.emailLabel)}
            required
            error={errors.contactEmail}
          >
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                type="email"
                aria-describedby={describedBy}
                invalid={invalid}
                value={form.contactEmail}
                onChange={(e) => set('contactEmail', e.target.value)}
                placeholder={t(CLUBS.emailPlaceholder)}
                autoComplete="email"
              />
            )}
          </Field>

          <Field label={t(CLUBS.phoneLabel)}>
            {({ id }) => (
              <TextInput
                id={id}
                type="tel"
                value={form.contactPhone}
                onChange={(e) => set('contactPhone', e.target.value)}
                autoComplete="tel"
              />
            )}
          </Field>
        </div>
      </section>

      {/* ── 3. Président ────────────────────────────────────────────────── */}
      <section>
        <SectionHeader>{t(CLUBS.sectionPresident)}</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t(CLUBS.firstNameLabel)}>
            {({ id }) => (
              <TextInput
                id={id}
                value={form.presidentFirstName}
                onChange={(e) => set('presidentFirstName', e.target.value)}
              />
            )}
          </Field>

          <Field label={t(CLUBS.lastNameLabel)}>
            {({ id }) => (
              <TextInput
                id={id}
                value={form.presidentLastName}
                onChange={(e) => set('presidentLastName', e.target.value)}
              />
            )}
          </Field>

          <Field
            label={t(CLUBS.emailLabel)}
            error={errors.presidentEmail}
            className="md:col-span-2"
          >
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                type="email"
                aria-describedby={describedBy}
                invalid={invalid}
                value={form.presidentEmail}
                onChange={(e) => set('presidentEmail', e.target.value)}
                placeholder={t(CLUBS.emailPlaceholder)}
              />
            )}
          </Field>
        </div>
      </section>

      {/* ── 4. Coordonnées institutionnelles ─────────────────────────────── */}
      <section>
        <SectionHeader>{t(CLUBS.sectionAddress)}</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label={t(CLUBS.clubEmailLabel)}
            error={errors.clubEmail}
          >
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                type="email"
                aria-describedby={describedBy}
                invalid={invalid}
                value={form.clubEmail}
                onChange={(e) => set('clubEmail', e.target.value)}
                placeholder={t(CLUBS.emailPlaceholder)}
              />
            )}
          </Field>

          <Field label={t(CLUBS.clubPhoneLabel)}>
            {({ id }) => (
              <TextInput
                id={id}
                type="tel"
                value={form.clubPhone}
                onChange={(e) => set('clubPhone', e.target.value)}
              />
            )}
          </Field>

          <Field
            label={t(CLUBS.clubAddressLabel)}
            className="md:col-span-2"
          >
            {({ id }) => (
              <Textarea
                id={id}
                rows={3}
                value={form.clubAddress}
                onChange={(e) => set('clubAddress', e.target.value)}
                placeholder={t(CLUBS.clubAddressPlaceholder)}
              />
            )}
          </Field>
        </div>
      </section>

      {/* ── Footer actions ────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 pt-4 border-t"
        style={{ borderColor: CREAM2 }}
      >
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] text-[13px] font-medium disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ background: NAVY, color: 'white' }}
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : mode === 'edit' ? (
            <Save className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {submitting
            ? t(UI.saving)
            : mode === 'edit'
              ? t(CLUBS.saveEdit)
              : t(UI.create)}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-[4px] text-[13px] disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
            style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
          >
            {t(CLUBS.cancelEdit)}
          </button>
        )}

        {submitError && (
          <span className="text-[12px]" style={{ color: DANGER }}>
            {submitError}
          </span>
        )}

        {touched && Object.keys(errors).length > 0 && !submitError && (
          <span className="text-[12px]" style={{ color: MUTED }}>
            {Object.keys(errors).length} {Object.keys(errors).length > 1 ? 'champs invalides' : 'champ invalide'}
          </span>
        )}
      </div>
    </div>
  );
}
