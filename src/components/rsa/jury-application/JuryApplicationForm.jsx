// JuryApplicationForm — formulaire public d'inscription jury (chantier 3).
//
// Page parente : /DevenirJury (pas d'auth requise). Pose les champs dans le
// style Élysée (Field + TextInput/Textarea/Select/TagSelect) et appelle
// JuryApplication.create. États : idle → submitting → success | error.
//
// Notes :
//   * Édition cible : query inline minimale (`status='open'`) plutôt que la
//     méthode `Edition.openForApply()` qui est livrée par Agent B en parallèle —
//     l'orchestrateur consolidera plus tard.
//   * Club préféré : dépendant de l'édition, lit edition_clubs join clubs.
//   * Validation côté client AVANT submit — la RLS/trigger fait foi côté serveur.
//   * Pas d'auth-gate : n'importe qui peut postuler.

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2 } from 'lucide-react';
import {
  Field,
  TextInput,
  Textarea,
  Select,
  TagSelect,
  NAVY,
  GOLD,
  CREAM,
  CREAM2,
  INK,
  MUTED,
  SERIF,
  EASE,
  TINT_SAGE,
} from '@/components/design';
import { DANGER, SUCCESS, FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { supabase } from '@/lib/supabase';
import { JuryApplication } from '@/lib/rsa/jury-applications';
import CustomFieldsRenderer, { validateCustomFields } from '@/components/rsa/forms/CustomFieldsRenderer';
import {
  UI,
  EXPERTISE_OPTIONS,
  MOTIVATION_MIN,
  MOTIVATION_MAX,
  EMAIL_RE,
} from './i18n';

const EMPTY = {
  email: '',
  fullName: '',
  editionId: '',
  clubId: '',
  expertise: [],
  motivation: '',
  availability: '',
  // V2.5+ Wave Custom Fields — payload des champs dynamiques (cf. edition.custom_fields_jury).
  custom_data: {},
};

function isBlank(v) {
  return v == null || (typeof v === 'string' && v.trim() === '');
}

function validate(draft, t) {
  const errs = {};
  if (isBlank(draft.email)) errs.email = t(UI.errRequired);
  else if (!EMAIL_RE.test(String(draft.email).trim())) errs.email = t(UI.errEmail);

  if (isBlank(draft.fullName)) errs.fullName = t(UI.errRequired);
  else if (draft.fullName.trim().length < 2) errs.fullName = t(UI.errNameShort);

  if (!Array.isArray(draft.expertise) || draft.expertise.length === 0) {
    errs.expertise = t(UI.errExpertiseEmpty);
  }

  const mlen = (draft.motivation || '').trim().length;
  if (mlen === 0) errs.motivation = t(UI.errRequired);
  else if (mlen < MOTIVATION_MIN) errs.motivation = t(UI.errMotivationShort);
  else if (mlen > MOTIVATION_MAX) errs.motivation = t(UI.errMotivationLong);

  return errs;
}

export default function JuryApplicationForm({ initialEdition = null, initialClub = null }) {
  const { lang, t } = useLang();
  // Pré-remplissage URL params : si ?edition=X&club=Y dans /DevenirJury,
  // on pré-charge les 2 champs et on les masque (mini-compétition).
  const [draft, setDraft] = useState({
    ...EMPTY,
    editionId: initialEdition || '',
    clubId: initialClub || '',
  });
  const editionLocked = !!initialEdition;
  const clubLocked = !!initialClub;
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'
  const [submitError, setSubmitError] = useState(null);

  // Éditions ouvertes au dépôt (pour le select). Query inline — on évite la
  // dépendance à Edition.openForApply() livrée par Agent B en parallèle.
  const [editions, setEditions] = useState([]);
  const [loadingEditions, setLoadingEditions] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('editions')
          .select('id, name, year, status, custom_fields_jury')
          .in('status', ['open', 'sessions'])
          .order('year', { ascending: false });
        if (active) setEditions(Array.isArray(data) ? data : []);
      } catch {
        if (active) setEditions([]);
      } finally {
        if (active) setLoadingEditions(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Clubs attachés à l'édition sélectionnée. Vide si pas d'édition.
  const [clubs, setClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(false);

  useEffect(() => {
    if (!draft.editionId) {
      setClubs([]);
      return undefined;
    }
    let active = true;
    setLoadingClubs(true);
    (async () => {
      try {
        const { data } = await supabase
          .from('edition_clubs')
          .select('club_id, club:clubs(id, name)')
          .eq('edition_id', draft.editionId);
        if (active) {
          const list = (Array.isArray(data) ? data : [])
            .map((row) => row.club)
            .filter(Boolean);
          setClubs(list);
        }
      } catch {
        if (active) setClubs([]);
      } finally {
        if (active) setLoadingClubs(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [draft.editionId]);

  const editionOptions = useMemo(
    () =>
      editions.map((e) => ({
        value: e.id,
        label: e.name ? `${e.name} (${e.year || e.id})` : String(e.year || e.id),
      })),
    [editions],
  );
  const clubOptions = useMemo(
    () => clubs.map((c) => ({ value: c.id, label: c.name || c.id })),
    [clubs],
  );
  const expertiseOptions = useMemo(
    () => EXPERTISE_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) })),
    [t],
  );

  // V2.5+ — édition sélectionnée → on en extrait les custom_fields_jury.
  // L'absence de colonne (DB pas encore migrée) ou la valeur null donnent [].
  const selectedEdition = useMemo(
    () => editions.find((e) => e.id === draft.editionId) || null,
    [editions, draft.editionId],
  );
  const customFields = useMemo(() => {
    const raw = selectedEdition?.custom_fields_jury;
    return Array.isArray(raw) ? raw : [];
  }, [selectedEdition]);

  const patch = (partial) => {
    setDraft((p) => ({ ...p, ...partial }));
    // Efface l'erreur dès que le user retape (UX positive).
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(partial).forEach((k) => {
        delete next[k];
      });
      return next;
    });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (status === 'submitting') return;
    setSubmitError(null);

    const errs = validate(draft, t);
    // V2.5+ Custom fields — validation séparée puis mergée sous `custom_data`.
    const customErrs = validateCustomFields(customFields, draft.custom_data || {}, t);
    if (Object.keys(customErrs).length > 0) {
      errs.custom_data = customErrs;
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      // Focus le premier champ en erreur (UX a11y minimale).
      const first = Object.keys(errs)[0];
      // Cas custom_data : focus le premier sous-champ custom invalide.
      if (first === 'custom_data') {
        const firstCustom = Object.keys(customErrs)[0];
        const elc = firstCustom ? document.getElementById(`cf-${firstCustom}`) : null;
        if (elc && typeof elc.focus === 'function') elc.focus();
      } else {
        const el = document.getElementById(`devenir-jury-${first}`);
        if (el && typeof el.focus === 'function') el.focus();
      }
      return;
    }

    setStatus('submitting');
    try {
      await JuryApplication.create({
        email: draft.email,
        fullName: draft.fullName.trim(),
        editionId: draft.editionId || null,
        clubId: draft.clubId || null,
        expertise: draft.expertise,
        motivation: draft.motivation.trim(),
        availability: draft.availability.trim() || null,
        customData: draft.custom_data || {},
      });
      setStatus('success');
    } catch (err) {
      // Garde la trace en console pour le diag, message générique côté UI.
      console.error('[DevenirJury] submit failed:', err);
      setSubmitError(err?.message || null);
      setStatus('error');
    }
  }

  // ── État success — bandeau Élysée
  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="rounded-md p-6 md:p-8 flex flex-col items-center text-center gap-3"
        style={{ background: TINT_SAGE, border: `1px solid ${CREAM2}` }}
      >
        <CheckCircle2 className="w-8 h-8" style={{ color: SUCCESS }} aria-hidden />
        <h2
          className="text-[24px] md:text-[28px] font-normal"
          style={{ fontFamily: SERIF, color: NAVY }}
        >
          {t(UI.successTitle)}
        </h2>
        <p className="text-[14px] leading-relaxed" style={{ color: INK }}>
          {t(UI.successBody)}
        </p>
      </motion.div>
    );
  }

  const motivationLen = (draft.motivation || '').length;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* Email */}
      <Field
        label={t(UI.fieldEmail)}
        id="devenir-jury-email"
        required
        helper={t(UI.emailHelper)}
        error={errors.email}
      >
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            type="email"
            autoComplete="email"
            value={draft.email}
            placeholder={t(UI.emailPlaceholder)}
            invalid={invalid}
            aria-describedby={describedBy}
            onChange={(e) => patch({ email: e.target.value })}
          />
        )}
      </Field>

      {/* Nom complet */}
      <Field
        label={t(UI.fieldFullName)}
        id="devenir-jury-fullName"
        required
        error={errors.fullName}
      >
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            autoComplete="name"
            value={draft.fullName}
            placeholder={t(UI.fullNamePlaceholder)}
            invalid={invalid}
            aria-describedby={describedBy}
            onChange={(e) => patch({ fullName: e.target.value })}
          />
        )}
      </Field>

      {/* Édition cible — masquée si pré-remplie via URL ?edition= */}
      {editionLocked ? (
        <input type="hidden" name="editionId" value={draft.editionId} />
      ) : (
        <Field
          label={t(UI.fieldEdition)}
          id="devenir-jury-editionId"
          helper={t(UI.editionHelper)}
          error={errors.editionId}
        >
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              value={draft.editionId}
              onChange={(e) => patch({ editionId: e.target.value, clubId: '' })}
              disabled={loadingEditions || editionOptions.length === 0}
              placeholder={t(UI.editionPlaceholder)}
              options={editionOptions}
              invalid={invalid}
              aria-describedby={describedBy}
            />
          )}
        </Field>
      )}

      {/* Club préféré (optionnel) — masqué si pré-rempli via URL ?club= */}
      {clubLocked ? (
        <input type="hidden" name="clubId" value={draft.clubId} />
      ) : (
        <Field
          label={t(UI.fieldClub)}
          id="devenir-jury-clubId"
          helper={t(UI.clubHelper)}
        >
          {({ id, describedBy }) => (
            <Select
              id={id}
              value={draft.clubId}
              onChange={(e) => patch({ clubId: e.target.value })}
              disabled={!draft.editionId || loadingClubs || clubOptions.length === 0}
              placeholder={
                !draft.editionId
                  ? t(UI.clubPlaceholder)
                  : clubOptions.length === 0
                    ? t(UI.clubNoneSelected)
                    : t(UI.clubPlaceholder)
              }
              options={clubOptions}
              aria-describedby={describedBy}
            />
          )}
        </Field>
      )}

      {/* Expertise (multi-chips) */}
      <Field
        label={t(UI.fieldExpertise)}
        id="devenir-jury-expertise"
        required
        helper={t(UI.expertiseHelper)}
        error={errors.expertise}
      >
        {({ id, describedBy, invalid }) => (
          <TagSelect
            id={id}
            value={draft.expertise}
            onChange={(next) => patch({ expertise: next })}
            options={expertiseOptions}
            placeholder={t(UI.expertisePlaceholder)}
            max={4}
            invalid={invalid}
            aria-describedby={describedBy}
          />
        )}
      </Field>

      {/* Motivation */}
      <Field
        label={t(UI.fieldMotivation)}
        id="devenir-jury-motivation"
        required
        helper={
          <span>
            {motivationLen}/{MOTIVATION_MAX} {t(UI.charsCounter)}
          </span>
        }
        error={errors.motivation}
      >
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            rows={6}
            value={draft.motivation}
            placeholder={t(UI.motivationPlaceholder)}
            invalid={invalid}
            aria-describedby={describedBy}
            onChange={(e) => patch({ motivation: e.target.value })}
          />
        )}
      </Field>

      {/* Disponibilité (optionnel, court) */}
      <Field
        label={t(UI.fieldAvailability)}
        id="devenir-jury-availability"
      >
        {({ id, describedBy }) => (
          <TextInput
            id={id}
            value={draft.availability}
            placeholder={t(UI.availabilityPlaceholder)}
            aria-describedby={describedBy}
            onChange={(e) => patch({ availability: e.target.value })}
          />
        )}
      </Field>

      {/* V2.5+ Wave — custom fields jury par compétition (rendus uniquement si non vides) */}
      {customFields.length > 0 && (
        <div
          className="pt-4 mt-2 flex flex-col gap-1"
          style={{ borderTop: `1px solid ${CREAM2}` }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="h-[1.5px] w-5" style={{ background: GOLD }} aria-hidden />
            <span
              className="uppercase text-[10px] tracking-[0.16em] font-medium"
              style={{ color: GOLD }}
            >
              {lang === 'en'
                ? 'Additional questions'
                : lang === 'de'
                  ? 'Zusätzliche Fragen'
                  : 'Questions supplémentaires'}
            </span>
          </div>
          <CustomFieldsRenderer
            fields={customFields}
            values={draft.custom_data || {}}
            errors={errors.custom_data || {}}
            onChange={(key, value) => {
              // Efface l'erreur granulaire du sous-champ touché (UX positive)
              setErrors((prev) => {
                if (!prev?.custom_data?.[key]) return prev;
                const subNext = { ...prev.custom_data };
                delete subNext[key];
                const next = { ...prev };
                if (Object.keys(subNext).length === 0) delete next.custom_data;
                else next.custom_data = subNext;
                return next;
              });
              setDraft((d) => ({
                ...d,
                custom_data: { ...(d.custom_data || {}), [key]: value },
              }));
            }}
            lang={lang}
            disabled={status === 'submitting'}
          />
        </div>
      )}

      {/* Erreur globale (submit) */}
      {status === 'error' && (
        <div
          role="alert"
          className="rounded-md px-4 py-3 text-[13px]"
          style={{ background: '#f6e7e3', border: `1px solid ${CREAM2}`, color: DANGER }}
        >
          <strong className="font-medium">{t(UI.errorTitle)} : </strong>
          {submitError || t(UI.errorBody)}
        </div>
      )}

      {/* CTA */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-[13px] font-medium transition-colors ${FOCUS_RING_CLASS}`}
          style={{
            background: status === 'submitting' ? CREAM : NAVY,
            color: status === 'submitting' ? MUTED : 'white',
            border: `1px solid ${status === 'submitting' ? CREAM2 : NAVY}`,
            cursor: status === 'submitting' ? 'wait' : 'pointer',
          }}
        >
          {status === 'submitting' && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
          {status === 'submitting' ? t(UI.submitting) : t(UI.submitCta)}
        </button>
      </div>

      {/* Petit foot de garantie : pas de hot air, calmer la friction perçue */}
      <p className="text-xs mt-1" style={{ color: MUTED }}>
        <span style={{ color: GOLD }}>·</span>{' '}
        {lang === 'en'
          ? 'No commitment until your application is reviewed.'
          : lang === 'de'
            ? 'Keine Verpflichtung, solange Ihre Bewerbung nicht geprüft wurde.'
            : 'Aucun engagement tant que votre candidature n’est pas examinée.'}
      </p>
    </form>
  );
}
