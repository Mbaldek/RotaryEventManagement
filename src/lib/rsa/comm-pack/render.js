import { pickLang, LANGS } from '@/lib/platform/i18n';
import { TEMPLATES, TEXT_DELIVERABLES } from './templates';

const REGISTRATION_URL = 'https://rotary-startup.org';

function fmtEUR(n) {
  if (n == null) return '';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export function buildVariables(edition, lang) {
  const cfg = edition?.comm_pack_config || {};
  const open = edition?.application_open || '';
  const close = edition?.application_close || '';
  return {
    competition_name: edition?.name || '',
    year: edition?.year || '',
    application_window: open && close ? `${open} → ${close}` : (close || open || ''),
    application_close: close,
    prize_main: edition?.prize_main != null ? fmtEUR(edition.prize_main) : '',
    prize_special: edition?.prize_special != null ? fmtEUR(edition.prize_special) : '',
    tagline: pickLang(cfg.tagline || {}, lang) || '',
    format_line: pickLang(cfg.format_line || {}, lang) || '',
    ceremony: pickLang(cfg.ceremony_venue || {}, lang) || '',
    eligibility_summary: pickLang(cfg.eligibility_summary || {}, lang) || '',
    registration_url: REGISTRATION_URL,
    contact_name: cfg.contact?.name || '',
    contact_phone: cfg.contact?.phone || '',
    contact_email: cfg.contact?.email || '',
  };
}

export function interpolate(template, vars) {
  return String(template || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
}

export function renderTextDeliverables(edition) {
  const out = {};
  for (const lang of LANGS) {
    const vars = buildVariables(edition, lang);
    out[lang] = {};
    for (const key of TEXT_DELIVERABLES) {
      out[lang][key] = interpolate(TEMPLATES[key][lang], vars);
    }
  }
  return out;
}
