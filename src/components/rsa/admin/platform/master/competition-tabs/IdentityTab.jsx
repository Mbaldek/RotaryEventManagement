// IdentityTab — onglet « Identité » du funnel de compétition.
//
// Champs : id (kebab, immuable après création), name, year, model (radio
// mono/multi), finalists_per_session.
// NB : le statut/cycle de vie (draft→open→…) vit désormais dans l'onglet
// Pilotage (c'est du pilotage, pas une caractéristique fixe).
//
// Modes :
//   * mode='create' → tous les champs éditables ; l'ID est obligatoire & validé
//     en live via KEBAB_REGEX. Le composant remonte les erreurs via `errors`.
//   * mode='edit'   → l'ID devient read-only (immuable côté SQL également).
//
// Le composant est contrôlé : il lit `values` et émet `onPatch(partial)` à
// chaque change. C'est le hook autosave qui décide de la persistance.

import React, { useCallback, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useLang } from '@/lib/platform/i18n';
import { supabase } from '@/lib/supabase';
import { CREAM2, EASE, NAVY, MUTED, INK } from '@/components/design/tokens';
import { COMP, COMPETITION_MODELS } from '../i18n';
import { FieldLabel, TextRow, TextareaRow } from './fields';

// Bucket Supabase Storage existant déjà utilisé pour les photos de jury.
// Réutilisé ici car la photo du président du jury appartient sémantiquement
// au même domaine (jurys), évitant la création d'un bucket supplémentaire.
const PHOTO_BUCKET = 'jury-photos';
const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 Mo
const PHOTO_ACCEPT = '.jpg,.jpeg,.png,image/jpeg,image/png';

const safeFilename = (name) =>
  String(name || 'photo')
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);

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

  // — Upload photo du président·e du jury — purement informationnel.
  // On stocke le path renvoyé par Storage dans values.jury_president_photo_path
  // via onPatch ; l'autosave du parent (CompetitionEditView) projette le patch
  // sur la row editions correspondante.
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState(null);

  const onPickPhoto = useCallback(async (e) => {
    const file = e.target?.files?.[0];
    // Reset input pour permettre la re-sélection du même fichier.
    if (e.target) e.target.value = '';
    if (!file) return;
    setPhotoError(null);
    if (file.size > PHOTO_MAX_BYTES) {
      setPhotoError(t({
        fr: 'Fichier trop volumineux (5 Mo max).',
        en: 'File too large (5 MB max).',
        de: 'Datei zu groß (max. 5 MB).',
      }));
      return;
    }
    setPhotoUploading(true);
    try {
      const edId = values.id || 'unknown';
      const safe = safeFilename(file.name);
      const path = `editions/${edId}/president/${Date.now()}-${safe}`;
      const up = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: true });
      if (up.error) throw up.error;
      onPatch({ jury_president_photo_path: up.data?.path || path });
    } catch (err) {
      console.error('[IdentityTab] jury president photo upload failed', err);
      setPhotoError(t({
        fr: 'Échec de l’envoi de la photo.',
        en: 'Photo upload failed.',
        de: 'Foto-Upload fehlgeschlagen.',
      }));
    } finally {
      setPhotoUploading(false);
    }
  }, [onPatch, t, values.id]);

  const onClearPhoto = useCallback(() => {
    setPhotoError(null);
    onPatch({ jury_president_photo_path: null });
  }, [onPatch]);

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

      {/* Président·e du jury — info éditoriale, affichée sur la page publique
          du palmarès. Aucune logique métier : pas de vote, pas de pondération,
          pas d'autorisation spéciale. Le parent (CompetitionEditView) projette
          jury_president + jury_president_photo_path via son autosave. */}
      <motion.div className="pt-3" style={{ borderTop: `1px dashed ${CREAM2}` }} variants={child}>
        <FieldLabel>{t(COMP.juryPresidentSection)}</FieldLabel>
        <p className="text-[11.5px] mb-3" style={{ color: MUTED }}>
          {t(COMP.juryPresidentHint)}
        </p>
        <div className="flex flex-col gap-3">
          <TextRow
            id="comp-jury-president"
            label={t(COMP.juryPresidentLabel)}
            value={values.jury_president}
            onChange={(v) => onPatch({ jury_president: v })}
            placeholder={t(COMP.juryPresidentPlaceholder)}
          />
          <div>
            <FieldLabel htmlFor="comp-jury-president-photo">
              {t(COMP.juryPresidentPhotoLabel)}
            </FieldLabel>
            <div className="flex items-center gap-3 flex-wrap">
              <label
                htmlFor="comp-jury-president-photo"
                className="inline-flex items-center gap-2 text-[12px] rounded-[4px] px-3 py-1.5 cursor-pointer"
                style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
              >
                {photoUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    <span>
                      {t({
                        fr: 'Envoi…',
                        en: 'Uploading…',
                        de: 'Hochladen…',
                      })}
                    </span>
                  </>
                ) : (
                  <span>
                    {values.jury_president_photo_path
                      ? t({
                          fr: 'Remplacer la photo',
                          en: 'Replace photo',
                          de: 'Foto ersetzen',
                        })
                      : t({
                          fr: 'Choisir une photo',
                          en: 'Choose a photo',
                          de: 'Foto auswählen',
                        })}
                  </span>
                )}
              </label>
              <input
                id="comp-jury-president-photo"
                type="file"
                accept={PHOTO_ACCEPT}
                onChange={onPickPhoto}
                disabled={photoUploading}
                className="sr-only"
              />
              {values.jury_president_photo_path && (
                <>
                  <span
                    className="font-mono text-[11px] truncate max-w-[260px]"
                    title={values.jury_president_photo_path}
                    style={{ color: INK }}
                  >
                    {values.jury_president_photo_path}
                  </span>
                  <button
                    type="button"
                    onClick={onClearPhoto}
                    disabled={photoUploading}
                    className="text-[11.5px] underline-offset-2 hover:underline disabled:opacity-50"
                    style={{ color: MUTED }}
                  >
                    {t({
                      fr: 'Retirer',
                      en: 'Remove',
                      de: 'Entfernen',
                    })}
                  </button>
                </>
              )}
            </div>
            {photoError && (
              <p className="text-[11.5px] mt-1.5" style={{ color: '#a23b2d' }}>
                {photoError}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
