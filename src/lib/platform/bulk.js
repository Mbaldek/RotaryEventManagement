// bulk.js — helper client pour l'edge function `send-bulk` (Module 9).
//
// Wrapper unique côté React : convertit toute erreur (network, 4xx/5xx, body
// d'erreur Resend) en `{ ok: false, error: string }` pour que le composer
// affiche un toast sans avoir à parser de FunctionsHttpError.
//
// Voir aussi src/lib/platform/transactional.js — même patron (M4c).

import { supabase } from '@/lib/supabase';

/**
 * Envoie un email bulk Élysée brandé à une audience résolue serveur-side.
 *
 * @param {object} args
 * @param {string|null} [args.clubId=null]   - club courant (NULL = master global)
 * @param {string} args.audienceType         - 'single_email' | 'club_*' | 'session_*' | 'all_finalists_edition'
 * @param {Record<string, any>} [args.audienceFilter={}]
 * @param {string} args.subject
 * @param {string} args.bodyHtml             - HTML bulletproof pré-rendu côté UI
 * @param {boolean} [args.dryRun=false]      - si true, retourne { count, sample[] }
 * @param {boolean} [args.force=false]       - master_admin only ; bypass count<=100
 * @returns {Promise<
 *   | { ok: true, dry_run: true, count: number, sample: string[] }
 *   | { ok: true, sent: number, failed: number, total: number, status: 'sent'|'partial', message_ids: string[] }
 *   | { ok: false, error: string }
 * >}
 */
export async function sendBulk({
  clubId = null,
  audienceType,
  audienceFilter = {},
  subject,
  bodyHtml,
  dryRun = false,
  force = false,
}) {
  if (!audienceType) return { ok: false, error: 'missing_audience_type' };
  if (!subject || !subject.trim()) return { ok: false, error: 'missing_subject' };
  if (!bodyHtml || !bodyHtml.trim()) return { ok: false, error: 'missing_body_html' };

  try {
    const { data: res, error } = await supabase.functions.invoke('send-bulk', {
      body: {
        club_id: clubId ?? null,
        audience_type: audienceType,
        audience_filter: audienceFilter || {},
        subject,
        body_html: bodyHtml,
        dry_run: !!dryRun,
        force: !!force,
      },
    });

    if (error) {
      // FunctionsHttpError n'expose qu'un message générique ("non-2xx status code").
      // On creuse error.context pour récupérer le JSON `{ ok:false, error:'...' }`.
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
        /* contexte indisponible */
      }
      return { ok: false, error: String(detail) };
    }

    if (!res) return { ok: false, error: 'empty_response' };
    return res;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Résout une audience côté serveur sans envoyer (helper léger : on appelle le
 * dry_run de send-bulk avec un body minimal). Utile pour le compteur live de
 * l'AudienceSelector.
 *
 * Le dry-run de l'edge function refuse les subject/body vides — on passe des
 * placeholders côté preview. Le serveur ne les utilise pas en dry-run.
 */
export async function previewAudience({ clubId = null, audienceType, audienceFilter = {} }) {
  return sendBulk({
    clubId,
    audienceType,
    audienceFilter,
    subject: 'preview',
    bodyHtml: 'preview',
    dryRun: true,
  });
}
