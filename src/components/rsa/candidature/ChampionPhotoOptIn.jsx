// ChampionPhotoOptIn — Section MonDossier permettant au champion d'autoriser
// (opt-in) la diffusion de sa photo sur le palmarès public /Resultats
// (décision C.2 V3 Vague 2). RGPD : par défaut OFF.
//
// Affiche :
//   - un toggle Yes/No « Autoriser la diffusion de ma photo »
//   - quand opt-in = true, un Dropzone pour uploader la photo (jpg/png/webp, 8 Mo)
//
// Stockage : bucket public 'champions' via uploadChampionPhoto, RLS scopée
// owner/staff par les policies storage.objects (cf. migration
// supabase/migrations/20260601_rsa_v3_public_palmares.sql).
//
// Visibilité : on n'affiche cette section QUE quand le candidat est susceptible
// d'être champion (statut 'finaliste' ou plus avancé). Avant on évite de
// solliciter le RGPD pour rien.

import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Check, Loader2, X } from 'lucide-react';
import { NAVY, INK, GOLD, MUTED, CREAM2, SERIF } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import {
  uploadChampionPhoto,
  removeChampionPhoto,
  championPhotoPublicUrl,
  CHAMPION_PHOTO_ACCEPT,
  CHAMPION_PHOTO_MAX_SIZE,
  CHAMPION_PHOTO_EXTS,
} from '@/lib/rsa/storage';

const T = {
  fr: {
    eyebrow: 'Diffusion palmarès',
    title: 'Photo champion — palmarès public',
    intro:
      'Si votre startup est lauréate, le palmarès public /Resultats peut afficher votre photo. Pour des raisons RGPD, votre accord explicite est requis.',
    toggleLabel: 'Autoriser la diffusion de ma photo',
    toggleOn: 'Oui',
    toggleOff: 'Non',
    uploadPrompt: 'Glissez une photo (JPG / PNG / WebP, 8 Mo max)',
    uploadCta: 'Choisir une photo',
    replace: 'Remplacer',
    remove: 'Retirer',
    uploading: 'Téléversement…',
    errFormat: 'Format non supporté. Utilisez JPG, PNG ou WebP.',
    errSize: 'Photo trop lourde. Maximum 8 Mo.',
    errUpload: 'Le téléversement a échoué. Réessayez.',
    revokeNote:
      'Vous pouvez retirer votre accord à tout moment : la photo sera retirée du palmarès public.',
    portraitAlt: 'Photo soumise pour le palmarès',
  },
  en: {
    eyebrow: 'Palmares display',
    title: 'Champion photo — public palmares',
    intro:
      'If your startup wins, the public /Resultats page can display your photo. Under GDPR, your explicit consent is required.',
    toggleLabel: 'Allow my photo to be published',
    toggleOn: 'Yes',
    toggleOff: 'No',
    uploadPrompt: 'Drop a photo (JPG / PNG / WebP, 8 MB max)',
    uploadCta: 'Choose a photo',
    replace: 'Replace',
    remove: 'Remove',
    uploading: 'Uploading…',
    errFormat: 'Unsupported format. Use JPG, PNG or WebP.',
    errSize: 'Photo too heavy. Maximum 8 MB.',
    errUpload: 'Upload failed. Please try again.',
    revokeNote:
      'You can withdraw your consent at any time: the photo will be removed from the public palmares.',
    portraitAlt: 'Photo submitted for the palmares',
  },
  de: {
    eyebrow: 'Palmares-Anzeige',
    title: 'Champion-Foto — öffentliches Palmares',
    intro:
      'Falls Ihr Startup gewinnt, kann die öffentliche /Resultats-Seite Ihr Foto anzeigen. Aus DSGVO-Gründen ist Ihre ausdrückliche Zustimmung erforderlich.',
    toggleLabel: 'Veröffentlichung meines Fotos erlauben',
    toggleOn: 'Ja',
    toggleOff: 'Nein',
    uploadPrompt: 'Ein Foto ablegen (JPG / PNG / WebP, max. 8 MB)',
    uploadCta: 'Foto auswählen',
    replace: 'Ersetzen',
    remove: 'Entfernen',
    uploading: 'Wird hochgeladen…',
    errFormat: 'Nicht unterstütztes Format. Bitte JPG, PNG oder WebP.',
    errSize: 'Foto zu groß. Maximal 8 MB.',
    errUpload: 'Upload fehlgeschlagen. Bitte erneut versuchen.',
    revokeNote:
      'Sie können Ihre Zustimmung jederzeit widerrufen: Das Foto wird vom öffentlichen Palmares entfernt.',
    portraitAlt: 'Für das Palmares eingereichtes Foto',
  },
};

export default function ChampionPhotoOptIn({
  startup,
  editionId,
  onPatch,
  disabled = false,
}) {
  const { t } = useLang();
  const tT = t(T);
  const [optIn, setOptIn] = useState(!!startup?.champion_photo_optin);
  const [photoPath, setPhotoPath] = useState(startup?.champion_photo_path || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Sync local state when parent re-renders with fresh data.
  useEffect(() => {
    setOptIn(!!startup?.champion_photo_optin);
    setPhotoPath(startup?.champion_photo_path || null);
  }, [startup?.champion_photo_optin, startup?.champion_photo_path]);

  const handleToggle = useCallback(
    (next) => {
      setOptIn(next);
      setError(null);
      if (!next && photoPath) {
        // Si on désopte avec une photo existante, on la retire aussi (silencieux).
        removeChampionPhoto(photoPath).catch(() => {});
        setPhotoPath(null);
        onPatch?.({ champion_photo_optin: false, champion_photo_path: null });
      } else {
        onPatch?.({ champion_photo_optin: next });
      }
    },
    [photoPath, onPatch],
  );

  const handleFile = useCallback(
    async (file) => {
      if (!file || !startup?.id || !editionId) return;
      setError(null);
      setUploading(true);
      const previous = photoPath;
      try {
        const path = await uploadChampionPhoto({
          editionId,
          startupId: startup.id,
          file,
        });
        setPhotoPath(path);
        onPatch?.({ champion_photo_path: path, champion_photo_optin: true });
        if (previous && previous !== path) {
          removeChampionPhoto(previous).catch(() => {});
        }
      } catch (e) {
        const reason = e?.validation?.reason;
        if (reason === 'format') setError(tT.errFormat);
        else if (reason === 'size') setError(tT.errSize);
        else setError(tT.errUpload);
      } finally {
        setUploading(false);
      }
    },
    [startup?.id, editionId, photoPath, onPatch, tT],
  );

  const handleRemove = useCallback(() => {
    const previous = photoPath;
    setPhotoPath(null);
    onPatch?.({ champion_photo_path: null });
    if (previous) removeChampionPhoto(previous).catch(() => {});
  }, [photoPath, onPatch]);

  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const previewUrl = photoPath ? championPhotoPublicUrl(photoPath) : null;

  return (
    <section className="rounded-[6px] bg-white p-5 md:p-6" style={{ border: `1px solid ${CREAM2}` }}>
      <div className="flex items-center gap-2.5 mb-2">
        <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
        <span className="uppercase text-[10px] tracking-[0.18em] font-medium" style={{ color: GOLD }}>
          {tT.eyebrow}
        </span>
      </div>
      <h3
        className="text-[20px] mb-2"
        style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
      >
        {tT.title}
      </h3>
      <p className="text-[13.5px] mb-4" style={{ color: INK }}>{tT.intro}</p>

      {/* Toggle Yes/No */}
      <fieldset className="mb-4">
        <legend className="text-[12px] font-medium mb-2" style={{ color: NAVY }}>
          {tT.toggleLabel}
        </legend>
        <div role="radiogroup" className="inline-flex rounded-[4px]" style={{ border: `1px solid ${CREAM2}` }}>
          <button
            type="button"
            role="radio"
            aria-checked={optIn === true}
            onClick={() => handleToggle(true)}
            disabled={disabled}
            className="px-4 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50"
            style={{
              background: optIn ? GOLD : 'transparent',
              color: optIn ? NAVY : INK,
              fontWeight: optIn ? 500 : 400,
              borderRight: `1px solid ${CREAM2}`,
            }}
          >
            <Check className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" aria-hidden />
            {tT.toggleOn}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={optIn === false}
            onClick={() => handleToggle(false)}
            disabled={disabled}
            className="px-4 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50"
            style={{
              background: !optIn ? '#f1eee7' : 'transparent',
              color: INK,
              fontWeight: !optIn ? 500 : 400,
            }}
          >
            <X className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" aria-hidden />
            {tT.toggleOff}
          </button>
        </div>
      </fieldset>

      {/* Zone upload — visible uniquement si opt-in */}
      {optIn && (
        <div className="mt-4">
          {previewUrl ? (
            <div className="flex items-center gap-4">
              <img
                src={previewUrl}
                alt={tT.portraitAlt}
                className="w-[88px] h-[88px] rounded-full object-cover shrink-0"
                style={{ border: `2px solid ${GOLD}` }}
              />
              <div className="flex flex-col gap-2">
                <label
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[13px] font-medium text-white cursor-pointer outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#c9a84c] ${
                    uploading || disabled ? 'opacity-60 pointer-events-none' : ''
                  }`}
                  style={{ background: NAVY }}
                >
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Camera className="w-3.5 h-3.5" aria-hidden />
                  )}
                  {uploading ? tT.uploading : tT.replace}
                  <input
                    type="file"
                    accept={CHAMPION_PHOTO_ACCEPT}
                    onChange={onInputChange}
                    className="sr-only"
                    disabled={uploading || disabled}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={uploading || disabled}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50"
                  style={{ background: 'transparent', color: INK, border: `1px solid ${CREAM2}` }}
                >
                  <X className="w-3.5 h-3.5" aria-hidden />
                  {tT.remove}
                </button>
              </div>
            </div>
          ) : (
            <label
              className={`block rounded-[4px] p-5 text-center cursor-pointer ${
                uploading || disabled ? 'opacity-60 pointer-events-none' : ''
              }`}
              style={{ border: `1.5px dashed ${GOLD}`, background: '#fdf6e8' }}
            >
              {uploading ? (
                <p className="text-[13.5px] inline-flex items-center gap-2" style={{ color: NAVY }}>
                  <Loader2 className="w-4 h-4 animate-spin" /> {tT.uploading}
                </p>
              ) : (
                <>
                  <p className="text-[13.5px] mb-2" style={{ color: INK }}>{tT.uploadPrompt}</p>
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[13px] font-medium text-white"
                    style={{ background: NAVY }}
                  >
                    <Camera className="w-3.5 h-3.5" aria-hidden />
                    {tT.uploadCta}
                  </span>
                </>
              )}
              <input
                type="file"
                accept={CHAMPION_PHOTO_ACCEPT}
                onChange={onInputChange}
                className="sr-only"
                disabled={uploading || disabled}
              />
            </label>
          )}
          {error && (
            <p className="text-[12.5px] mt-2" style={{ color: '#a23b2d' }} role="alert">
              {error}
            </p>
          )}
          <p className="text-[11.5px] mt-3" style={{ color: MUTED }}>
            {tT.revokeNote}
          </p>
        </div>
      )}
    </section>
  );
}

// Stable export pour pouvoir tester max/exts depuis d'autres modules au besoin.
export const championPhotoLimits = {
  maxBytes: CHAMPION_PHOTO_MAX_SIZE,
  exts: CHAMPION_PHOTO_EXTS,
};
