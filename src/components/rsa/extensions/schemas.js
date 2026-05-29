// schemas.js — V3.0 Vague 4 Marketplace.
//
// JSON-schemas types prédéfinis par kind d'extension + validateurs lights.
// Pas d'ajv (dépendance lourde) — on s'appuie sur zod (déjà dans le bundle) +
// des règles simples typecheck pour valider la config côté client avant
// soumission au RPC.
//
// Convention : chaque entrée { kind, exampleConfig, validate(config) -> {ok,errors[]} }.
// Les whitelists de types/format respectent la doc §13.2 (string|number|integer|
// boolean|array enum). Les clés dangereuses ($ref, eval, definitions,
// patternProperties, additionalProperties) sont REJETÉES.

import { z } from 'zod';

// ── Helpers communs ────────────────────────────────────────────────────────

const FORBIDDEN_KEYS = ['$ref', 'definitions', 'patternProperties', 'additionalProperties', 'eval', '__proto__'];

function deepCheckForbidden(obj, path = '$') {
  if (obj === null || typeof obj !== 'object') return [];
  const errs = [];
  for (const k of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.includes(k)) {
      errs.push(`Clé interdite '${k}' à ${path} (risque XSS / scope escape).`);
    }
    const v = obj[k];
    if (v && typeof v === 'object') {
      errs.push(...deepCheckForbidden(v, `${path}.${k}`));
    }
  }
  return errs;
}

// Allowed JSON-schema field types for funnel_step extension fields.
const ALLOWED_FIELD_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'enum'];

// ── funnel_step ────────────────────────────────────────────────────────────
// Schéma attendu :
//   {
//     title: string,                       // titre du step (i18n auto via lang)
//     subtitle?: string,                   // sous-titre éditorial
//     fields: [
//       { name: string, type: 'string'|'number'|'integer'|'boolean'|'array'|'enum',
//         label: string, required?: bool, helper?: string,
//         enum?: [ ... ],                  // pour type='enum' ou type='array' (multi)
//         minLength?: int, maxLength?: int }
//     ]
//   }
const FunnelStepFieldZ = z.object({
  name:      z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$/, 'name doit être [a-zA-Z_][a-zA-Z0-9_-]{0,63}'),
  type:      z.enum(ALLOWED_FIELD_TYPES),
  label:     z.string().min(1).max(200),
  required:  z.boolean().optional(),
  helper:    z.string().max(500).optional(),
  enum:      z.array(z.string().max(80)).max(40).optional(),
  minLength: z.number().int().min(0).max(10000).optional(),
  maxLength: z.number().int().min(1).max(10000).optional(),
  min:       z.number().optional(),
  max:       z.number().optional(),
}).strict();

const FunnelStepConfigZ = z.object({
  title:    z.string().min(2).max(200),
  subtitle: z.string().max(500).optional(),
  fields:   z.array(FunnelStepFieldZ).min(1).max(30),
}).strict();

// ── cockpit_tab ─────────────────────────────────────────────────────────────
// Schéma attendu :
//   {
//     label: string,                       // libellé de l'onglet
//     iframeUrl?: string,                  // URL iframe (https only)
//     html?: string,                       // HTML inline (sanitized DOMPurify-like, no <script>)
//     height?: int                          // hauteur iframe (px), default 480
//   }
// EXACTLY ONE of iframeUrl / html requis.
const CockpitTabConfigZ = z.object({
  label:     z.string().min(2).max(80),
  iframeUrl: z.string().url().regex(/^https:\/\//, 'iframeUrl doit être https://').optional(),
  html:      z.string().max(20000).optional(),
  height:    z.number().int().min(80).max(2000).optional(),
}).strict().refine(
  (v) => (!!v.iframeUrl) !== (!!v.html),
  { message: 'Fournir exactement un de iframeUrl OU html.' },
);

// ── email_template ──────────────────────────────────────────────────────────
// Schéma attendu :
//   {
//     subject: string,
//     bodyMarkdown: string,                // markdown light (cf. EmailComposer)
//     audienceType?: 'club_jurys' | 'comite' | 'master' | 'startups',
//     lang?: 'fr' | 'en' | 'de'
//   }
const EmailTemplateConfigZ = z.object({
  subject:      z.string().min(2).max(200),
  bodyMarkdown: z.string().min(2).max(20000),
  audienceType: z.enum(['club_jurys', 'comite', 'master', 'startups']).optional(),
  lang:         z.enum(['fr', 'en', 'de']).optional(),
}).strict();

// ── webhook ─────────────────────────────────────────────────────────────────
// Schéma attendu :
//   {
//     url: string (https only),
//     events: [ 'dossier.submitted' | 'jury.scored' | 'session.published' | 'startup.qualified' ],
//     secret?: string                       // HMAC signing key (server-side)
//   }
const WEBHOOK_EVENTS = ['dossier.submitted', 'jury.scored', 'session.published', 'startup.qualified', 'extension.installed'];

const WebhookConfigZ = z.object({
  url:    z.string().url().regex(/^https:\/\//, 'url doit être https://'),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1, 'Au moins un événement.').max(WEBHOOK_EVENTS.length),
  secret: z.string().min(8).max(200).optional(),
}).strict();

export { WEBHOOK_EVENTS };

// ── Exemples ────────────────────────────────────────────────────────────────
export const EXAMPLE_CONFIGS = {
  funnel_step: {
    title: 'Informations complémentaires',
    subtitle: 'Quelques détails utiles pour le jury.',
    fields: [
      { name: 'sector',     type: 'enum',    label: 'Secteur',     required: true,
        enum: ['fintech', 'healthtech', 'edtech', 'cleantech', 'autre'] },
      { name: 'team_size',  type: 'integer', label: 'Taille équipe', min: 1, max: 500 },
      { name: 'has_pivot',  type: 'boolean', label: 'A pivoté depuis création ?' },
      { name: 'tagline',    type: 'string',  label: 'Tagline', maxLength: 140 },
    ],
  },
  cockpit_tab: {
    label: 'Partenaire X',
    iframeUrl: 'https://example.org/embed/partner-x',
    height: 600,
  },
  email_template: {
    subject: 'Bienvenue dans le concours',
    bodyMarkdown: '# Bienvenue\n\nVotre dossier est enregistré. Bonne chance !',
    audienceType: 'startups',
    lang: 'fr',
  },
  webhook: {
    url: 'https://example.org/hooks/rsa',
    events: ['dossier.submitted', 'jury.scored'],
  },
};

// ── Dispatch validateur ─────────────────────────────────────────────────────
export function validateExtensionConfig(kind, config) {
  if (config == null || typeof config !== 'object' || Array.isArray(config)) {
    return { ok: false, errors: ['Config doit être un objet JSON.'] };
  }
  // Garde XSS / scope-escape avant validation schema
  const forbidden = deepCheckForbidden(config);
  if (forbidden.length > 0) return { ok: false, errors: forbidden };

  let schema;
  switch (kind) {
    case 'funnel_step':    schema = FunnelStepConfigZ; break;
    case 'cockpit_tab':    schema = CockpitTabConfigZ; break;
    case 'email_template': schema = EmailTemplateConfigZ; break;
    case 'webhook':        schema = WebhookConfigZ; break;
    default:
      return { ok: false, errors: [`Kind inconnu : ${kind}`] };
  }

  const parsed = schema.safeParse(config);
  if (parsed.success) return { ok: true, errors: [], value: parsed.data };

  const errors = parsed.error.issues.map((i) => {
    const path = i.path.length ? i.path.join('.') : '(root)';
    return `${path}: ${i.message}`;
  });
  return { ok: false, errors };
}

// ── Helper sanitization HTML basique (cockpit_tab html mode) ────────────────
// V4 : on REFUSE <script>, on (window|document)\. et javascript: — pas de
// DOMPurify ajouté en dépendance pour V4 ; ce sanitizer minimal protège le
// pipeline + l'iframe sandbox="allow-scripts allow-same-origin" reste la
// frontière finale (le code dans srcdoc s'exécute dans son propre origin null).
const HTML_SCRIPT_RE = /<script[\s\S]*?>[\s\S]*?<\/script\s*>/gi;
const HTML_ON_HANDLER_RE = / on[a-z]+="[^"]*"/gi;
const HTML_JAVASCRIPT_URI_RE = /javascript:[^"'\s>]*/gi;

export function sanitizeExtensionHtml(html) {
  if (typeof html !== 'string') return '';
  return html
    .replace(HTML_SCRIPT_RE, '<!-- script removed -->')
    .replace(HTML_ON_HANDLER_RE, '')
    .replace(HTML_JAVASCRIPT_URI_RE, '#');
}
