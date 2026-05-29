// uploadCustomField — upload helper pour les fields type=file des custom fields
// dynamiques (Wave V2.5+). Sépare proprement candidat (startups) et juré
// (jury_applications) avec un layout de chemin prédictible :
//
//   candidat : editions/{edition_id}/startups/{startup_id}/custom/{field_key}/{ts}_{name}
//   juré     : editions/{edition_id}/jury/{application_id}/custom/{field_key}/{ts}_{name}
//
// Utilise le bucket privé 'dossiers' (déjà en place côté docs candidat) plutôt
// qu'un bucket dédié — la RLS dossiers_owner / dossiers_master couvre déjà
// owners + master_admin via storage.foldername (cf. migrations dossiers_*).
//
// Retourne le PATH (jamais une URL). Les lectures se font via signed URLs côté
// consommateur (admin / review jury / portail candidat), cf. signedDossierUrl()
// existant dans storage.js.
//
// Validation light côté client (ext / size) — la garde dure reste RLS + bucket cap.

import { supabase } from '@/lib/supabase';
import { DOSSIERS_BUCKET, extOf, safeFilename } from '@/lib/rsa/storage';

const DEFAULT_MAX_MB = 20;
const DEFAULT_EXTS = [
  // catégories raisonnables pour des pièces complémentaires "documents + images"
  'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx',
  'png', 'jpg', 'jpeg', 'webp', 'gif',
  'txt', 'csv', 'zip',
];

// Construit le chemin canonique pour un custom field, côté candidat ou juré.
//   ownerKind ∈ 'startup' | 'jury'
//   ownerId   : startup_id ou jury_application_id (UUID)
//   fieldKey  : slug du field (a-z0-9_-)
//   fileName  : nom original du fichier
export function buildCustomFieldPath({ editionId, ownerKind, ownerId, fieldKey, fileName }) {
  if (!editionId) throw new Error('uploadCustomField: editionId requis');
  if (!ownerId) throw new Error('uploadCustomField: ownerId requis');
  if (!fieldKey) throw new Error('uploadCustomField: fieldKey requis');
  if (ownerKind !== 'startup' && ownerKind !== 'jury') {
    throw new Error("uploadCustomField: ownerKind doit être 'startup' ou 'jury'");
  }
  const segment = ownerKind === 'startup' ? 'startups' : 'jury';
  // safeFilename garde l'extension et limite les chars dangereux.
  const safe = safeFilename(fileName || 'document');
  return `editions/${editionId}/${segment}/${ownerId}/custom/${fieldKey}/${Date.now()}_${safe}`;
}

// Valide un fichier custom selon `field.accept` (string CSV ".pdf,.png" optionnelle)
// et `field.maxSizeMb` (default 20). Renvoie { ok } ou { ok:false, reason, ... }.
export function validateCustomFile(file, { accept, maxSizeMb } = {}) {
  if (!file) return { ok: false, reason: 'format' };
  const allowed = (accept || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.startsWith('.'))
    .map((s) => s.slice(1));
  const exts = allowed.length > 0 ? allowed : DEFAULT_EXTS;
  const ext = extOf(file.name);
  if (!exts.includes(ext)) return { ok: false, reason: 'format', exts };
  const maxBytes = (Number(maxSizeMb) > 0 ? Number(maxSizeMb) : DEFAULT_MAX_MB) * 1024 * 1024;
  if (file.size > maxBytes) return { ok: false, reason: 'size', max: maxBytes };
  return { ok: true };
}

// Upload effectif. Renvoie le path stocké.
//   { editionId, ownerKind, ownerId, fieldKey, file, accept?, maxSizeMb? }
export async function uploadCustomField({
  editionId,
  ownerKind,
  ownerId,
  fieldKey,
  file,
  accept,
  maxSizeMb,
}) {
  const check = validateCustomFile(file, { accept, maxSizeMb });
  if (!check.ok) {
    const err = new Error(`custom_field_invalid:${check.reason}`);
    err.validation = check;
    throw err;
  }
  const path = buildCustomFieldPath({ editionId, ownerKind, ownerId, fieldKey, fileName: file.name });
  const { error } = await supabase.storage
    .from(DOSSIERS_BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });
  if (error) throw error;
  return path;
}

// Helper sucre — supprime un fichier custom (avant remplacement). RLS dossiers_delete
// couvre owner ou staff.
export async function removeCustomField(path) {
  if (!path) return;
  const { error } = await supabase.storage.from(DOSSIERS_BUCKET).remove([path]);
  if (error) throw error;
}
