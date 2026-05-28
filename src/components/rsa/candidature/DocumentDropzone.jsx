// DocumentDropzone — tuile d'upload d'un document de dossier (pitch deck / exec
// summary). Enrobe le <Dropzone> du design system et délègue l'upload réel à
// storage.js (bucket privé 'dossiers', RLS sur startup_id). Suivi de progression
// via uploadDossierFile({ onProgress }). Stocke le CHEMIN retourné dans *_path.
//
// IMPORTANT : la ligne dossier (startup) doit exister AVANT le 1er upload (RLS
// storage clé sur startup_id) — l'orchestrateur crée le brouillon tôt, on suppose
// donc startupId présent ici.

import React, { useState, useCallback } from 'react';
import { Dropzone } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { UI } from './i18n';
import { DOC_KINDS, uploadDossierFile, removeDossierFile } from '@/lib/rsa/storage';

// Nom de fichier lisible à partir d'un chemin de stockage (…/{ts}_{safeName}).
export function fileNameFromPath(path) {
  if (!path) return '';
  const last = String(path).split('/').pop() || '';
  return last.replace(/^\d+_/, '');
}

export default function DocumentDropzone({
  kind, // 'deck' | 'exec_summary'
  editionId,
  startupId,
  value, // chemin de stockage actuel (string) ou null
  onChange, // (path|null) => void  — persiste dans *_path
  disabled = false,
}) {
  const { t } = useLang();
  const spec = DOC_KINDS[kind];
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const labels = {
    prompt: t(UI.dzPrompt),
    hint: t(UI.dzHint),
    uploading: t(UI.dzUploading),
    replace: t(UI.dzReplace),
    remove: t(UI.dzRemove),
    errFormat: t(UI.dzErrFormat),
    errSize: t(UI.dzErrSize),
  };

  const handleFile = useCallback(
    async (file) => {
      if (!file || !startupId || !editionId) return;
      setError(null);
      setUploading(true);
      setProgress(0);
      const previous = value;
      try {
        const path = await uploadDossierFile({
          editionId,
          startupId,
          kind,
          file,
          onProgress: (pct) => setProgress(pct),
        });
        onChange?.(path);
        // Nettoyage best-effort de l'ancien fichier (ne bloque pas en cas d'échec).
        if (previous && previous !== path) {
          removeDossierFile(previous).catch(() => {});
        }
      } catch (e) {
        const reason = e?.validation?.reason;
        if (reason === 'format') setError(t(UI.dzErrFormat));
        else if (reason === 'size') setError(t(UI.dzErrSize));
        else setError(t(UI.dzErrUpload));
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [editionId, startupId, kind, value, onChange, t],
  );

  const handleRemove = useCallback(() => {
    const previous = value;
    onChange?.(null);
    if (previous) removeDossierFile(previous).catch(() => {});
  }, [value, onChange]);

  return (
    <Dropzone
      accept={spec?.accept}
      maxSizeMb={spec ? spec.maxSize / (1024 * 1024) : 50}
      value={value ? { name: fileNameFromPath(value) } : null}
      onFile={handleFile}
      onRemove={value ? handleRemove : undefined}
      onError={(code) => setError(code === 'size' ? t(UI.dzErrSize) : t(UI.dzErrFormat))}
      uploading={uploading}
      progress={progress}
      disabled={disabled || !startupId}
      error={error}
      labels={labels}
    />
  );
}
