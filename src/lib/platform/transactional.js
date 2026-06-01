// transactional.js — helper client pour l'edge function `send-transactional`.
//
// Module 4c, Plateforme RSA. Cf. supabase/functions/send-transactional/index.ts
// et docs/hardening/m4c-edge-function-deploy.md pour le contrat de payload et
// la matrice rôles -> types autorisés.
//
// Wrapper unique côté React : convertit toute erreur (network, 4xx/5xx, body
// d'erreur Resend) en `{ ok: false, error: string }` pour que les callers M2/M3
// puissent afficher un toast sans avoir à parser de FunctionsHttpError. Le succès
// renvoie l'id Resend (utile pour audit, retries idempotents côté UI).

import { supabase } from '@/lib/supabase';

const ALLOWED_TYPES = new Set([
  'selection_decision',
  'jury_assignment',
  'session_published',
  'results_published',
  'session_running_order',
  'jury_scoring_invite',
]);

const ALLOWED_LANGS = new Set(['fr', 'en', 'de']);

/**
 * Envoie un email transactionnel brandé Élysée via l'edge function.
 *
 * @param {object} args
 * @param {('selection_decision'|'jury_assignment'|'session_published'|'results_published'|'session_running_order')} args.type
 * @param {string} args.recipient_email
 * @param {string} [args.recipient_name]
 * @param {('fr'|'en'|'de')} [args.lang='fr']
 * @param {Record<string, any>} [args.data={}]
 * @returns {Promise<{ ok: true, id: string } | { ok: false, error: string }>}
 */
export async function sendTransactional({
  type,
  recipient_email,
  recipient_name,
  lang = 'fr',
  data = {},
}) {
  // Validation locale (court-circuite l'appel réseau si la payload est invalide).
  // L'edge function re-valide tout server-side (single source of truth).
  if (!ALLOWED_TYPES.has(type)) {
    return { ok: false, error: `invalid_type:${type}` };
  }
  if (!ALLOWED_LANGS.has(lang)) {
    return { ok: false, error: `invalid_lang:${lang}` };
  }
  if (typeof recipient_email !== 'string' || !recipient_email.includes('@')) {
    return { ok: false, error: 'invalid_recipient_email' };
  }

  try {
    const { data: res, error } = await supabase.functions.invoke('send-transactional', {
      body: {
        type,
        recipient_email,
        recipient_name: recipient_name ?? undefined,
        lang,
        data: data || {},
      },
    });

    if (error) {
      // FunctionsHttpError n'expose qu'un message générique ("non-2xx status code").
      // On creuse error.context pour récupérer le JSON `{ ok:false, error:'...' }`
      // renvoyé par l'edge function — cf. pattern DecksTab.jsx generateJuryPack().
      let detail = error.message || 'send_failed';
      const ctx = error.context;
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
        /* contexte indisponible : on garde le message générique */
      }
      return { ok: false, error: String(detail) };
    }

    if (!res || res.ok !== true) {
      return { ok: false, error: String(res?.error || 'unknown_error') };
    }
    return { ok: true, id: String(res.id || '') };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
