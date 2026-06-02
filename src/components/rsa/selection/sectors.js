// Taxonomie + couleurs des secteurs/industries pour le tableau de sélection.
//
// startups.sectors est un text[] HÉTÉROGÈNE : le funnel actuel n'écrit que les
// 5 clusters (foodtech/social/tech/healthtech/greentech) + 'autre', mais les
// données importées d'Airtable portent une taxonomie plus riche (Healthtech,
// AI, Circular Economy, Wellness, Mobility, IoT, Diagnostics, Food Security,
// Financial Inclusion, Social impact…). On rend donc N'IMPORTE QUELLE valeur
// stockée en chip coloré, sans config obligatoire.
//
// Couleur : on RÉUTILISE le pool muted + le hash djb2 de sessionTheme.js
// (golden rule Élysée — « pas de couleur saturée »). Chaque secteur garde une
// couleur stable entre reloads (déterministe, pas de Math.random).

import { SESSION_PALETTE } from '@/components/rsa/concours-dashboard/sessionTheme';

// ── Labels prettifiés des tokens connus (clusters funnel + tags Airtable) ───
// Clé = valeur normalisée (lowercase). Tout le reste retombe sur un titlecase
// du brut. On ne force PAS la liste : c'est purement cosmétique.
export const SECTOR_LABELS = {
  // Clusters funnel (ids ASCII écrits par la candidature)
  foodtech:   { fr: 'FoodTech',          en: 'FoodTech',          de: 'FoodTech' },
  social:     { fr: 'Impact social',     en: 'Social impact',     de: 'Soziale Wirkung' },
  tech:       { fr: 'Tech',              en: 'Tech',              de: 'Tech' },
  healthtech: { fr: 'Healthtech',        en: 'Healthtech',        de: 'Healthtech' },
  greentech:  { fr: 'Greentech',         en: 'Greentech',         de: 'Greentech' },
  autre:      { fr: 'Autre',             en: 'Other',             de: 'Andere' },
  // Tags Airtable canoniques
  'social impact':       { fr: 'Impact social',        en: 'Social impact',       de: 'Soziale Wirkung' },
  'social inclusion':    { fr: 'Inclusion sociale',    en: 'Social Inclusion',    de: 'Soziale Inklusion' },
  'circular economy':    { fr: 'Économie circulaire',  en: 'Circular Economy',    de: 'Kreislaufwirtschaft' },
  'food security':       { fr: 'Sécurité alimentaire', en: 'Food Security',       de: 'Ernährungssicherheit' },
  'financial inclusion': { fr: 'Inclusion financière', en: 'Financial Inclusion', de: 'Finanzielle Inklusion' },
  sustainability:        { fr: 'Durabilité',           en: 'Sustainability',      de: 'Nachhaltigkeit' },
  wellness:              { fr: 'Bien-être',            en: 'Wellness',            de: 'Wohlbefinden' },
  diagnostics:           { fr: 'Diagnostic',           en: 'Diagnostics',         de: 'Diagnostik' },
  fintech:               { fr: 'Fintech',              en: 'Fintech',             de: 'Fintech' },
  mobility:              { fr: 'Mobilité',             en: 'Mobility',            de: 'Mobilität' },
  ai:                    { fr: 'IA',                   en: 'AI',                  de: 'KI' },
  iot:                   { fr: 'IoT',                  en: 'IoT',                 de: 'IoT' },
  other:                 { fr: 'Autre',                en: 'Other',               de: 'Andere' },
};

function titleCase(s) {
  return String(s || '')
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// Label affichable d'un secteur brut. `lang` ∈ {fr,en,de}.
export function sectorLabel(raw, lang = 'fr') {
  const key = String(raw || '').trim().toLowerCase();
  const dict = SECTOR_LABELS[key];
  if (dict) return dict[lang] || dict.fr || raw;
  return titleCase(raw);
}

// ── Hash stable string -> int positif (djb2, identique à sessionTheme) ──────
function hashStr(str) {
  let h = 5381;
  const s = String(str || '').trim().toLowerCase();
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Couleurs d'un chip secteur : { primary, light, border }. Stable par valeur.
export function sectorChipColors(raw) {
  const idx = hashStr(raw) % SESSION_PALETTE.length;
  const p = SESSION_PALETTE[idx];
  return { primary: p.primary, light: p.light, border: p.border };
}

// Construit les options d'un selecteur (TagSelect) à partir de valeurs brutes
// distinctes. Renvoie [{ value, label }] trié par label localisé.
export function buildSectorOptions(rawValues = [], lang = 'fr') {
  const seen = new Set();
  const out = [];
  for (const v of rawValues) {
    const key = String(v || '').trim();
    if (!key || seen.has(key.toLowerCase())) continue;
    seen.add(key.toLowerCase());
    out.push({ value: key, label: sectorLabel(key, lang) });
  }
  out.sort((a, b) => a.label.localeCompare(b.label, lang === 'de' ? 'de' : lang === 'en' ? 'en' : 'fr'));
  return out;
}
