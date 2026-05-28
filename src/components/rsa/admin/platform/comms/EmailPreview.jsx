// EmailPreview — rendu live HTML bulletproof Élysée (Module 9).
//
// Reproduit le shell <table> de docs/design/email-templates/magic-link.md et
// supabase/functions/send-transactional/index.ts (renderEmail). Mêmes tokens
// hex (NAVY, GOLD, CREAM, CREAM2, INK, MUTED), même structure :
//   - Header NAVY + gold rule + eyebrow
//   - Body cream/white avec greeting + paragraphes + signature italique
//   - Footer hairline avec adresse contact
//
// Le composer fournit un Markdown léger (gras/italique/lien/listes). On le
// parse ici en HTML pour le preview live ET pour le `body_html` envoyé à
// l'edge function (rendu identique au mail réel).
//
// Pas de DOMPurify ici (poids inutile) : on s'assure que toute interpolation
// (subject/sender) passe par esc(). Le bodyMarkdown n'est PAS échappé HTML
// au sens strict (sinon `<strong>` deviendrait `&lt;strong&gt;`) — mais on
// échappe le brut côté markdown-to-html en construisant la chaîne via les
// builders esc() pour chaque token.

import React, { useMemo } from 'react';
import {
  NAVY, GOLD, CREAM, CREAM2, INK, MUTED,
} from '@/components/design/tokens';

// ─── HTML escape ────────────────────────────────────────────────────────────
function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Markdown light parser ──────────────────────────────────────────────────
// Supporte :
//   **gras** → <strong>
//   *italique* → <em>
//   [texte](https://url) → <a> (urls https/http/mailto uniquement)
//   - listes (ligne) → <ul><li>
//   double saut de ligne → nouveau <p>
//
// Aucune dépendance ; volontairement minimal, prévisible, et 100 % bulletproof
// pour l'email (pas d'attribut style baked par le parseur).

const URL_RE = /^(https?:\/\/|mailto:)/i;

function inlineToHtml(line) {
  // 1) escape entièrement
  let out = esc(line);
  // 2) liens [txt](url) — protéger contre URLs non whitelistées (data:, javascript:)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, txt, url) => {
    const trimmed = String(url).trim();
    const safe = URL_RE.test(trimmed) ? trimmed : '#';
    return `<a href="${esc(safe)}" target="_blank" rel="noopener noreferrer" style="color:${NAVY}; text-decoration:underline;">${esc(txt)}</a>`;
  });
  // 3) **gras** → <strong> (greedy minimal, doit être appliqué AVANT *italique*
  // car ** est un sous-cas de * en regex naïf).
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // 4) *italique*
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return out;
}

export function markdownToHtml(markdown) {
  if (!markdown) return '';
  // Split en blocs par double saut de ligne
  const blocks = String(markdown).replace(/\r\n/g, '\n').split(/\n\s*\n/);
  const html = [];

  for (const rawBlock of blocks) {
    const block = rawBlock.trim();
    if (!block) continue;

    const lines = block.split('\n');
    // Détection liste : toutes les lignes commencent par "- " (ou "* ")
    const isList = lines.every((l) => /^\s*[-*]\s+/.test(l));
    if (isList) {
      const items = lines.map((l) => {
        const item = l.replace(/^\s*[-*]\s+/, '');
        return `<li style="margin:0 0 6px 0; padding:0;">${inlineToHtml(item)}</li>`;
      }).join('');
      html.push(`<ul style="margin:0 0 16px 0; padding-left:18px; list-style:disc; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:15px; line-height:1.65; color:${INK};">${items}</ul>`);
    } else {
      // Paragraphe : on convertit les sauts de ligne simples en <br/>
      const inner = lines.map(inlineToHtml).join('<br/>');
      html.push(`<p style="margin:0 0 16px 0; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:15px; line-height:1.65; color:${INK};">${inner}</p>`);
    }
  }

  return html.join('');
}

// ─── Élysée shell ──────────────────────────────────────────────────────────
//
// Construit le HTML bulletproof complet à partir du subject + body markdown.
// La signature institutionnelle reste fixe (Rotary Startup Award), comme dans
// send-transactional/index.ts — voix éditoriale stable.

const FOOTER_BY_LANG = {
  fr: {
    contact: 'Contact :',
    noReply: 'Ne pas répondre à cet email — utilisez l’adresse de contact ci-dessous.',
  },
  en: {
    contact: 'Contact:',
    noReply: 'Please do not reply to this email — use the contact address below.',
  },
  de: {
    contact: 'Kontakt:',
    noReply: 'Bitte antworten Sie nicht auf diese E-Mail — verwenden Sie die Kontaktadresse unten.',
  },
};

const SIGNATURE_BY_LANG = {
  fr: 'Rotary Startup Award',
  en: 'Rotary Startup Award',
  de: 'Rotary Startup Award',
};

const EYEBROW_BY_LANG = {
  fr: 'COMMUNICATION OFFICIELLE',
  en: 'OFFICIAL COMMUNICATION',
  de: 'OFFIZIELLE MITTEILUNG',
};

const CONTACT_EMAIL = 'contact@rotary-startup.org';

export function buildEmailHtml({ subject, bodyMarkdown, lang = 'fr' }) {
  const safeLang = ['fr', 'en', 'de'].includes(lang) ? lang : 'fr';
  const bodyHtml = markdownToHtml(bodyMarkdown);
  const footer = FOOTER_BY_LANG[safeLang];
  const signature = SIGNATURE_BY_LANG[safeLang];
  const eyebrow = EYEBROW_BY_LANG[safeLang];

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${safeLang}">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light only" />
    <title>${esc(subject)}</title>
    <style type="text/css">
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600&display=swap');
      a { text-decoration: none; }
      @media only screen and (max-width: 480px) {
        .rsa-container { width: 100% !important; }
        .rsa-px { padding-left: 24px !important; padding-right: 24px !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:${CREAM}; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:${CREAM};">
      ${esc(subject)} — Rotary Startup Award
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CREAM};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" class="rsa-container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px; max-width:560px; background-color:#ffffff; border:1px solid ${CREAM2};">

            <tr>
              <td align="center" bgcolor="${NAVY}" style="background-color:${NAVY}; padding:36px 24px 28px 24px;">
                <div style="font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-weight:500; font-size:22px; line-height:1.2; color:#ffffff; letter-spacing:0.01em;">
                  Rotary Startup Award
                </div>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:14px auto 0 auto;">
                  <tr>
                    <td height="2" bgcolor="${GOLD}" style="background-color:${GOLD}; line-height:2px; font-size:0; width:40px;">&nbsp;</td>
                  </tr>
                </table>
                <div style="margin-top:10px; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:10px; line-height:1.4; color:${GOLD}; letter-spacing:0.18em; text-transform:uppercase;">
                  ${esc(eyebrow)}
                </div>
              </td>
            </tr>

            <tr>
              <td class="rsa-px" bgcolor="#ffffff" style="background-color:#ffffff; padding:40px 48px 24px 48px;">
                ${bodyHtml}
                <p style="margin:24px 0 4px 0; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-style:italic; font-size:15px; line-height:1.5; color:${NAVY};">
                  ${esc(signature)}
                </p>
              </td>
            </tr>

            <tr>
              <td class="rsa-px" bgcolor="#ffffff" style="background-color:#ffffff; padding:0 48px 32px 48px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="border-top:1px solid ${CREAM2}; padding-top:20px; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:11px; line-height:1.6; color:${MUTED}; text-align:center;">
                      Rotary Startup Award<br />
                      ${esc(footer.noReply)}<br />
                      ${esc(footer.contact)} <a href="mailto:${CONTACT_EMAIL}" style="color:${NAVY}; text-decoration:underline;">${CONTACT_EMAIL}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// ─── React preview wrapper ─────────────────────────────────────────────────
// Rend le HTML dans un sandboxed <iframe> via srcDoc — protège la page de tout
// CSS qui leak (l'email shell repaint le body en CREAM, ce qui casserait le
// cockpit). srcDoc évite aussi le coût d'une requête réseau.

export default function EmailPreview({ subject, bodyMarkdown, lang = 'fr', className = '' }) {
  const html = useMemo(
    () => buildEmailHtml({ subject, bodyMarkdown, lang }),
    [subject, bodyMarkdown, lang],
  );

  return (
    <iframe
      title="Élysée email preview"
      srcDoc={html}
      sandbox=""
      className={`w-full h-full border-0 ${className}`}
      style={{ background: CREAM, minHeight: 540 }}
    />
  );
}
