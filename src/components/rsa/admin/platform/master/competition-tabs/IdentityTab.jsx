// IdentityTab — onglet « Identité » du funnel de compétition.
//
// Champs : id (kebab, immuable après création), name, year, model (radio
// mono/multi), status (select EDITION_STATUSES), finalists_per_session.
//
// Modes :
//   * mode='create' → tous les champs éditables ; l'ID est obligatoire & validé
//     en live via KEBAB_REGEX. Le composant remonte les erreurs via `errors`.
//   * mode='edit'   → l'ID devient read-only (immuable côté SQL également).
//
// Le composant est contrôlé : il lit `values` et émet `onPatch(partial)` à
// chaque change. C'est le hook autosave qui décide de la persistance.

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLang } from '@/lib/platform/i18n';
import { CREAM2, EASE, NAVY, MUTED, INK } from '@/components/design/tokens';
import { EDITION_STATUSES } from '../../i18n';
import { COMP, COMPETITION_MODELS } from '../i18n';
import { FieldLabel, TextRow, TextareaRow, SelectRow } from './fields';

// Stagger modéré sur le mount des champs (premium, pas saturé).
// Chaque enfant apparait avec opacity+y delta, décalé de 40ms.
const STAGGER_PARENT = {
  initial: {},
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};
const STAGGER_CHILD = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
};

export default function IdentityTab({ values = {}, onPatch, mode = 'edit', errors = {} }) {
  const { t } = useLang();
  const isCreate = mode === 'create';
  const reduce = useReducedMotion();
  const parent = reduce ? {} : STAGGER_PARENT;
  const child = reduce ? {} : STAGGER_CHILD;

  return (
    <motion.div className="space-y-5" variants={parent} initial="initial" animate="animate">
      <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-3" variants={child}>
        <TextRow
          id="comp-id"
          label={t(COMP.idLabel)}
          hint={isCreate ? null : t(COMP.identityIdImmutableHint)}
          value={values.id}
          onChange={(v) => onPatch({ id: String(v || '').toLowerCase() })}
          disabled={!isCreate}
          monospace
          placeholder="2028-pilote"
        />
        {errors.id && (
          <p className="text-[11.5px] -mt-2" style={{ color: '#a23b2d' }}>{errors.id}</p>
        )}
        <TextRow
          id="comp-name"
          label={t(COMP.nameLabel)}
          value={values.name}
          onChange={(v) => onPatch({ name: v })}
          placeholder="Rotary Startup Award 2028"
        />
        <TextRow
          id="comp-year"
          label={t(COMP.yearLabel)}
          type="number"
          value={values.year}
          onChange={(v) => onPatch({ year: v === '' ? null : Number(v) })}
        />
        <TextRow
          id="comp-finalists-n"
          label={t({
            fr: 'Finalistes par session',
            en: 'Finalists per session',
            de: 'Finalisten pro Session',
          })}
          type="number"
          value={values.finalists_per_session ?? 1}
          onChange={(v) => onPatch({ finalists_per_session: v === '' ? 1 : Number(v) })}
        />
        <SelectRow
          id="comp-status"
          label={t(COMP.status)}
          value={values.status || 'draft'}
          onChange={(v) => onPatch({ status: v })}
          options={EDITION_STATUSES.map((s) => ({ value: s, label: s }))}
        />
      </motion.div>

      {/* Trio hero éditorial 3·33·333 — titre court, phrase d'accroche, description longue.
          Servent à composer le hero de la page publique de la compétition. */}
      <motion.div className="pt-3" style={{ borderTop: `1px dashed ${CREAM2}` }} variants={child}>
        <FieldLabel>
          {t({
            fr: 'Hero éditorial',
            en: 'Editorial hero',
            de: 'Editorial-Hero',
          })}
        </FieldLabel>
        <p className="text-[11.5px] mb-3" style={{ color: MUTED }}>
          {t({
            fr: 'Trio 3·33·333 — un titre court, une phrase d\'accroche, puis une description plus longue.',
            en: 'Trio 3·33·333 — short title, tagline phrase, then a longer description.',
            de: 'Trio 3·33·333 — kurzer Titel, Slogan, dann eine längere Beschreibung.',
          })}
        </p>
        <div className="flex flex-col gap-3">
          <TextRow
            id="comp-hero-title"
            label={t({
              fr: 'Titre · 3',
              en: 'Title · 3',
              de: 'Titel · 3',
            })}
            value={values.hero_title}
            onChange={(v) => onPatch({ hero_title: v })}
            placeholder={t({
              fr: 'Rotary Startup Award',
              en: 'Rotary Startup Award',
              de: 'Rotary Startup Award',
            })}
          />
          <TextRow
            id="comp-hero-tagline"
            label={t({
              fr: 'Phrase d\'accroche · 33',
              en: 'Tagline · 33',
              de: 'Slogan · 33',
            })}
            value={values.hero_tagline}
            onChange={(v) => onPatch({ hero_tagline: v })}
            placeholder={t({
              fr: 'Le prix qui révèle les startups d\'impact en Europe.',
              en: 'The award that uncovers Europe\'s impact startups.',
              de: 'Der Preis, der Europas Impact-Startups sichtbar macht.',
            })}
          />
          <TextareaRow
            id="comp-hero-description"
            label={t({
              fr: 'Description · 333',
              en: 'Description · 333',
              de: 'Beschreibung · 333',
            })}
            hint={t({
              fr: 'Texte long visible sur la page publique de la compétition.',
              en: 'Long copy shown on the competition public page.',
              de: 'Langer Text auf der öffentlichen Wettbewerbsseite.',
            })}
            value={values.hero_description}
            onChange={(v) => onPatch({ hero_description: v })}
            rows={5}
            placeholder={t({
              fr: 'Décrivez le programme, son ambition, le profil des candidates, le déroulement des sessions et de la finale.',
              en: 'Describe the programme, its ambition, candidate profile, qualifying sessions and grand finale.',
              de: 'Beschreiben Sie das Programm, seine Ambition, das Profil der Kandidatinnen, den Ablauf der Sessions und des Finales.',
            })}
          />
        </div>
      </motion.div>

      <motion.div variants={child}>
        <FieldLabel>{t(COMP.modelLabel)}</FieldLabel>
        <div className="flex flex-col gap-1.5">
          {COMPETITION_MODELS.map((m) => (
            <label key={m} className="inline-flex items-start gap-2 text-[13px]" style={{ color: NAVY }}>
              <input
                type="radio"
                name="comp-model"
                value={m}
                checked={values.model === m}
                onChange={() => onPatch({ model: m })}
                disabled={!isCreate}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">
                  {m === 'multiclub' ? t(COMP.modelMulti) : t(COMP.modelMono)}
                </span>
                <span className="block text-[11.5px]" style={{ color: MUTED }}>
                  {m === 'multiclub' ? t(COMP.multiclubHint) : t(COMP.monoclubHint)}
                </span>
              </span>
            </label>
          ))}
        </div>
        {!isCreate && (
          <p className="text-[11px] mt-1.5" style={{ color: MUTED }}>
            {t({
              fr: 'Le modèle est défini à la création — non modifiable ensuite.',
              en: 'The model is set at creation time — not editable afterwards.',
              de: 'Das Modell wird bei der Erstellung festgelegt und kann anschließend nicht mehr geändert werden.',
            })}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
