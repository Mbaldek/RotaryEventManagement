// userManagement.js — helpers client pour les edge functions V2.5 user-management.
//
// Pattern identique à src/lib/platform/transactional.js et bulk.js :
//   * convertit toute erreur (network, 4xx/5xx, body Resend) en
//     { ok: false, error: string } pour que l'UI affiche un toast sans avoir
//     à parser FunctionsHttpError ;
//   * succès : structure stable côté React.
//
// Edge functions concernées :
//   - invite-user  : crée (ou met à jour) un user et envoie un magic-link
//                    brandé Élysée avec le rôle attribué et un message custom.
//   - delete-user  : supprime DÉFINITIVEMENT un compte + cascade applicative
//                    (master_admin only, typed-confirm anti-drama).

import { supabase } from '@/lib/supabase';

const ALLOWED_ROLES = new Set([
  'master_admin',
  'admin',
  'club_admin',
  'comite',
  'jury',
]);
const CLUB_SCOPED_ROLES = new Set(['club_admin', 'comite', 'jury']);
const ALLOWED_LANGS = new Set(['fr', 'en', 'de']);

async function extractFnError(error) {
  let detail = error?.message || 'function_call_failed';
  const ctx = error?.context;
  try {
    if (ctx && typeof ctx.text === 'function') {
      const txt = await ctx.text();
      if (txt) {
        try {
          const parsed = JSON.parse(txt);
          detail = parsed?.error || parsed?.detail || txt;
        } catch {
          detail = txt;
        }
      }
    }
  } catch {
    /* contexte indisponible — on garde le message générique */
  }
  return String(detail);
}

/**
 * Invite un utilisateur (création + assignation de rôle + magic-link brandé).
 *
 * @param {object} args
 * @param {string} args.email
 * @param {('master_admin'|'admin'|'club_admin'|'comite'|'jury')} args.role
 * @param {string} [args.clubId]              — requis si role club-scoped
 * @param {string} [args.customMessage]       — note libre, max ~300c
 * @param {('fr'|'en'|'de')} [args.lang='fr']
 * @returns {Promise<
 *   | { ok: true, user_id: string, was_already_existing: boolean, magic_link_sent: boolean, resend_id?: string }
 *   | { ok: false, error: string }
 * >}
 */
export async function inviteUser({ email, role, clubId, customMessage, lang = 'fr' }) {
  // ── validation locale (court-circuite le réseau si invalide) ──
  if (typeof email !== 'string' || !email.includes('@')) {
    return { ok: false, error: 'invalid_email' };
  }
  if (!ALLOWED_ROLES.has(role)) {
    return { ok: false, error: `invalid_role:${role}` };
  }
  if (!ALLOWED_LANGS.has(lang)) {
    return { ok: false, error: `invalid_lang:${lang}` };
  }
  if (CLUB_SCOPED_ROLES.has(role) && (!clubId || typeof clubId !== 'string')) {
    return { ok: false, error: 'club_id_required_for_role' };
  }

  try {
    const { data: res, error } = await supabase.functions.invoke('invite-user', {
      body: {
        email: String(email).trim().toLowerCase(),
        role,
        club_id: clubId || undefined,
        custom_message: typeof customMessage === 'string' ? customMessage.trim() : undefined,
        lang,
      },
    });

    if (error) {
      return { ok: false, error: await extractFnError(error) };
    }
    if (!res || res.ok !== true) {
      return { ok: false, error: String(res?.error || 'unknown_error') };
    }
    return {
      ok: true,
      user_id: String(res.user_id || ''),
      was_already_existing: !!res.was_already_existing,
      magic_link_sent: !!res.magic_link_sent,
      resend_id: res.resend_id ? String(res.resend_id) : undefined,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Supprime un compte utilisateur (master_admin only, typed-confirm anti-drama).
 *
 * @param {object} args
 * @param {string} args.email
 * @param {string} args.typedConfirm  — doit être EXACTEMENT `DELETE-{email}`
 * @returns {Promise<
 *   | { ok: true, deleted_user_id: string, cascades: Record<string, unknown> }
 *   | { ok: false, error: string }
 * >}
 */
export async function deleteUser({ email, typedConfirm }) {
  if (typeof email !== 'string' || !email.includes('@')) {
    return { ok: false, error: 'invalid_email' };
  }
  if (typeof typedConfirm !== 'string' || !typedConfirm.startsWith('DELETE-')) {
    return { ok: false, error: 'invalid_confirm' };
  }

  try {
    const { data: res, error } = await supabase.functions.invoke('delete-user', {
      body: {
        email: String(email).trim().toLowerCase(),
        typed_confirm: typedConfirm.trim(),
      },
    });

    if (error) {
      return { ok: false, error: await extractFnError(error) };
    }
    if (!res || res.ok !== true) {
      return { ok: false, error: String(res?.error || 'unknown_error') };
    }
    return {
      ok: true,
      deleted_user_id: String(res.deleted_user_id || ''),
      cascades: res.cascades || {},
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Construit la chaîne typed-confirm attendue par delete-user pour un email donné.
 * Centralisé ici pour que l'UI et l'edge function partagent la même définition.
 */
export function buildDeleteConfirmString(email) {
  const trimmed = String(email || '').trim().toLowerCase();
  return `DELETE-${trimmed}`;
}
