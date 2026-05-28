// Upload des documents de dossier vers le bucket PRIVÉ 'dossiers' (RSA Module 1).
//
// Bucket privé + RLS storage.objects scopée au propriétaire/staff
// (cf. supabase/migrations/20260527_rsa_module1_prep.sql, section C2). On ne réutilise
// PAS le bucket public legacy 'uploads' (db.js#uploadFile) : les decks/exec summaries
// sont confidentiels (RGPD + Règlement Art. 10).
//
// Convention de chemin (doit matcher les policies storage.objects de la migration) :
//   editions/{edition_id}/startups/{startup_id}/{kind}/{timestamp}_{safeName}.{ext}
// On stocke ce CHEMIN (pas une URL publique) dans startups.pitch_deck_path /
// exec_summary_path, puis on génère une signed URL courte durée à la demande pour lire.
//
// Validation type/taille : reprise de l'approche de src/pages/StartupUpload.jsx
// (extOf / isAllowed / safeFilename) ; la RLS + le plafond bucket restent la garde dure.

import { supabase } from '@/lib/supabase';

export const DOSSIERS_BUCKET = 'dossiers';

// Types de documents -> sous-dossier {kind} dans le chemin + contraintes.
// 'deck'         : pitch deck, PDF/PPT(X), max 50 Mo (même plafond que StartupUpload).
// 'exec_summary' : executive summary FR & DE, PDF (+ docx toléré), max 20 Mo.
export const DOC_KINDS = {
  deck: {
    folder: 'pitch_deck',
    maxSize: 50 * 1024 * 1024,
    exts: ['pdf', 'ppt', 'pptx'],
    accept:
      '.pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
  exec_summary: {
    folder: 'exec_summary',
    maxSize: 20 * 1024 * 1024,
    exts: ['pdf', 'doc', 'docx'],
    accept:
      '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
};

// ── Helpers de validation (calqués sur StartupUpload.jsx) ────────────────────
export function extOf(name) {
  const m = (name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

export function safeFilename(name) {
  return (name || 'document').replace(/[^\w.\-]+/g, '_').slice(-100);
}

// Valide un fichier pour un kind donné. Renvoie { ok } ou { ok:false, reason, max }.
// reason ∈ 'unknown_kind' | 'format' | 'size' — à mapper sur les messages i18n du funnel.
export function validateDossierFile(kind, file) {
  const spec = DOC_KINDS[kind];
  if (!spec) return { ok: false, reason: 'unknown_kind' };
  if (!file) return { ok: false, reason: 'format' };
  const ext = extOf(file.name);
  if (!spec.exts.includes(ext)) return { ok: false, reason: 'format', exts: spec.exts };
  if (file.size > spec.maxSize) return { ok: false, reason: 'size', max: spec.maxSize };
  return { ok: true };
}

// Construit le chemin de stockage conforme aux policies RLS de la migration.
export function buildDossierPath({ editionId, startupId, kind, fileName }) {
  const spec = DOC_KINDS[kind];
  const folder = spec ? spec.folder : kind;
  return `editions/${editionId}/startups/${startupId}/${folder}/${Date.now()}_${safeFilename(fileName)}`;
}

// ── Upload ───────────────────────────────────────────────────────────────────
// Upload d'un document de dossier. Valide côté client puis pousse via le client
// Supabase authentifié (la session JWT porte auth.uid() -> RLS storage.objects).
//
// Si `onProgress` est fourni, on passe par XHR pour suivre la progression
// (upload.onprogress, comme StartupUpload.jsx) ; sinon on utilise le SDK storage.
// Dans les deux cas on renvoie le CHEMIN (à stocker dans *_path), pas une URL.
//
// upsert=false par défaut : pas d'écrasement silencieux (chaque upload a un timestamp
// unique de toute façon). Le doc précédent peut être nettoyé séparément (removeDossierFile).
export async function uploadDossierFile({ editionId, startupId, kind, file, onProgress, upsert = false }) {
  const check = validateDossierFile(kind, file);
  if (!check.ok) {
    const err = new Error(`dossier_file_invalid:${check.reason}`);
    err.validation = check;
    throw err;
  }

  const path = buildDossierPath({ editionId, startupId, kind, fileName: file.name });

  // Voie SDK (simple) si aucun suivi de progression demandé.
  if (typeof onProgress !== 'function') {
    const { error } = await supabase.storage
      .from(DOSSIERS_BUCKET)
      .upload(path, file, {
        upsert,
        contentType: file.type || 'application/octet-stream',
      });
    if (error) throw error;
    return path;
  }

  // Voie XHR pour la progression. On récupère l'access token de la session courante
  // afin d'authentifier la requête (sinon la RLS storage.objects refuse l'insert).
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // R-H1 : on N'AUTORISE PAS le fallback sur l'anon key en Authorization. Sans JWT
  // utilisateur, auth.uid() est NULL et owns_startup() renvoie false => la policy
  // refuserait de toute façon, mais on échoue tôt avec un message exploitable
  // (« veuillez vous reconnecter ») plutôt qu'un 401 opaque.
  if (!accessToken) {
    throw new Error('auth_required');
  }

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/${DOSSIERS_BUCKET}/${path}`);
    xhr.setRequestHeader('apikey', apiKey);
    // Bearer = JWT de l'utilisateur (jamais l'anon key) => auth.uid() exploitable par la RLS.
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', upsert ? 'true' : 'false');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((100 * e.loaded) / e.total));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload_status_${xhr.status}`));
    xhr.onerror = () => reject(new Error('upload_network'));
    xhr.send(file);
  });

  return path;
}

// ── Lecture ────────────────────────────────────────────────────────────────
// URL signée courte durée pour visualiser/télécharger un doc privé.
// TTL par défaut 300 s (R-M3) : 60 s est trop tight pour un pitch deck 50 Mo
// sur connexion lente — le lien expirait en plein download. 5 min reste raisonnable
// (les liens ne sont jamais embarqués dans des emails — toujours re-générés au clic).
export async function signedDossierUrl(path, expiresIn = 300) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(DOSSIERS_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl ?? null;
}

// Plusieurs URLs signées en un appel (ex. liste de docs côté suivi/jury). Même TTL.
export async function signedDossierUrls(paths, expiresIn = 300) {
  const clean = (paths || []).filter(Boolean);
  if (clean.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(DOSSIERS_BUCKET)
    .createSignedUrls(clean, expiresIn);
  if (error) throw error;
  // map { path -> signedUrl }
  return (data || []).reduce((acc, item) => {
    if (item?.path && item?.signedUrl) acc[item.path] = item.signedUrl;
    return acc;
  }, {});
}

// ── Suppression (optionnel) ──────────────────────────────────────────────────
// Retire un objet (RLS dossiers_delete : propriétaire ou staff). Utile pour remplacer
// un doc avant deadline sans laisser d'orphelin de stockage.
export async function removeDossierFile(path) {
  if (!path) return;
  const { error } = await supabase.storage.from(DOSSIERS_BUCKET).remove([path]);
  if (error) throw error;
}
