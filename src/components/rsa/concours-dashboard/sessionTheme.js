// sessionTheme — palette thématique + emoji content marker par session (V3).
//
// La page /Concours agrège plusieurs sessions thématiques. Sans distinction
// visuelle, l'œil ne peut pas naviguer rapidement entre elles (smell IA :
// "tous les blocs se ressemblent"). On réintroduit le pattern legacy
// (RsaJuryHub V1 / RsaDashboard) : chaque session a sa propre couleur muted
// + un emoji thématique optionnel.
//
// Règles (cf. docs/design/concours-v2-color-mapping.md) :
//   - Couleurs DÉSATURÉES, cohérentes avec la golden rule Élysée
//     (« if a color needs to be saturated, it shouldn't exist »).
//   - GOLD réservé exclusivement à la Finale.
//   - Sessions d'un même club évitent l'adjacence : on offset le hash par
//     l'index de session dans le club.
//   - Override admin via session_config.theme_color : si défini, on l'utilise
//     tel quel pour primary et on dérive light/border. Sinon → palette pool.
//   - Emojis : content markers (≠ chrome). Heuristique sur session.name /
//     session.theme. Si aucun match, on n'affiche aucun emoji (gracieux).

import { GOLD } from '@/components/design/tokens';

// ── Pool 8 couleurs muted, ordre fixe (priorité dans la rotation) ──────────
// Chaque entrée a primary (texte/border accent), light (background tint),
// border (border subtil). Valeurs validées contre le designbook Élysée §2.
export const SESSION_PALETTE = [
  { key: 'forest',     primary: '#5a7a1a', light: '#eef5e0', border: '#c0d890' },
  { key: 'rose',       primary: '#8a2040', light: '#fbe8ee', border: '#e8a8bc' },
  { key: 'violet',     primary: '#4a2a7a', light: '#f0eaf8', border: '#c8b0e8' },
  { key: 'blue',       primary: '#1a5fa8', light: '#e8f0fb', border: '#a8c8f0' },
  { key: 'sage',       primary: '#1d6b4f', light: '#e8f5ee', border: '#b0d8c4' },
  { key: 'ochre',      primary: '#9a6b1f', light: '#f6efe0', border: '#e8d090' },
  { key: 'plum',       primary: '#4a3a5a', light: '#efeaf3', border: '#c8b8d0' },
  { key: 'terracotta', primary: '#a23b2d', light: '#f4e7e4', border: '#e8a89c' },
];

// Réservé Finale (jamais utilisé pour qualifying sessions).
export const FINALE_PALETTE = {
  key: 'finale',
  primary: GOLD,
  light: '#fdf6e8',
  border: '#e8d090',
};

// Fallback neutre — utilisé quand on n'a aucune session (édition vide).
const NEUTRAL_PALETTE = {
  key: 'neutral',
  primary: '#3a3a52',
  light: '#f5f3ef',
  border: '#e8e3d9',
};

// ── Hash stable string -> int positif ──────────────────────────────────────
// djb2 simplifié, suffisant pour distribuer ~10 sessions sur 8 couleurs sans
// collision systématique. On évite Math.random pour rester déterministe entre
// reloads (un juré ne voit pas la couleur "FoodTech" changer entre deux refresh).
function hashStr(str) {
  let h = 5381;
  const s = String(str || '');
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ── Validation hex #RRGGBB ──────────────────────────────────────────────────
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Dérive light + border à partir d'un primary hex via interpolation simple
// vers blanc (light = primary blendé 88% blanc, border = 60% blanc).
function deriveLightBorder(primaryHex) {
  if (!HEX_RE.test(primaryHex)) return null;
  const r = parseInt(primaryHex.slice(1, 3), 16);
  const g = parseInt(primaryHex.slice(3, 5), 16);
  const b = parseInt(primaryHex.slice(5, 7), 16);
  const blend = (cv, t) => Math.round(cv + (255 - cv) * t);
  const toHex = (v) => v.toString(16).padStart(2, '0');
  const light = `#${toHex(blend(r, 0.88))}${toHex(blend(g, 0.88))}${toHex(blend(b, 0.88))}`;
  const border = `#${toHex(blend(r, 0.60))}${toHex(blend(g, 0.60))}${toHex(blend(b, 0.60))}`;
  return { light, border };
}

// ── Public API : getSessionPalette ──────────────────────────────────────────
// Args :
//   session       : objet session (id, config.theme_color, kind, etc.)
//   indexInClub   : index de la session dans son club (offset anti-adjacence)
// Returns : { key, primary, light, border }
//
// Pour la finale (kind='finale'), retourne toujours FINALE_PALETTE.
// Pour un override theme_color : utilise tel quel + dérive light/border.
// Sinon : hash(session.id) + indexInClub modulo pool size.
export function getSessionPalette(session, indexInClub = 0) {
  if (!session) return NEUTRAL_PALETTE;

  if (session.kind === 'finale') return FINALE_PALETTE;

  const override = session?.config?.theme_color;
  if (override && HEX_RE.test(override)) {
    // Si l'override matche exactement un primary du pool, on lookup pour
    // garder les light/border calibrés à la main. Sinon on dérive.
    const exact = SESSION_PALETTE.find(
      (p) => p.primary.toLowerCase() === override.toLowerCase(),
    );
    if (exact) return exact;
    const derived = deriveLightBorder(override);
    if (derived) return { key: 'custom', primary: override, ...derived };
  }

  const baseIdx = hashStr(session.id || '') % SESSION_PALETTE.length;
  const finalIdx = (baseIdx + indexInClub) % SESSION_PALETTE.length;
  return SESSION_PALETTE[finalIdx];
}

// ── Emoji content marker (heuristique mots-clés) ────────────────────────────
// Cible : session.name + session.theme concaténés en lowercase.
// Match au premier mot-clé qui hit (ordre = priorité). Pas de match → null.
//
// On évite tout emoji "chrome" (cf. designbook §1.3) : ces emojis agissent
// comme content markers thématiques sur les cartes session — au même titre
// que 🏆 sur la page résultats publique.

const EMOJI_RULES = [
  // Greentech d'abord car "greentech" contient "tech" — sinon match prématuré.
  { emoji: '🌱', keys: ['green', 'environ', 'climat', 'climate', 'clean', 'energy', 'énergie', 'energie', 'durabl', 'sustain', 'ecolog'] },
  // Healthtech d'abord car peut contenir "tech" — sinon match prématuré.
  { emoji: '🏥', keys: ['health', 'santé', 'sante', 'biotech', 'medical', 'medic', 'pharma', 'medtech'] },
  // FoodTech / agriculture / économie circulaire.
  { emoji: '🌾', keys: ['food', 'aliment', 'agri', 'circular', 'circulaire', 'farm', 'agro'] },
  // Social impact / education / edtech.
  { emoji: '🤝', keys: ['social', 'edu', 'edtech', 'impact', 'inclus', 'solidar'] },
  // Tech générique (AI, fintech, mobilité) — vient en dernier car large filet.
  { emoji: '💻', keys: ['tech', ' ai', ' ia', 'intellig', 'fintech', 'mobil', 'data', 'cyber', 'digital', 'numéri', 'numeri'] },
];

export function getSessionEmoji(session) {
  if (!session) return null;
  if (session.kind === 'finale') return '🏆';
  const hay = `${session.name || ''} ${session.theme || ''}`.toLowerCase();
  if (!hay.trim()) return null;
  for (const rule of EMOJI_RULES) {
    if (rule.keys.some((k) => hay.includes(k))) return rule.emoji;
  }
  return null;
}

// ── Mini-helper : map all sessions in a club to their palette ──────────────
// Utile pour les composants qui itèrent (ClubSection, Timeline). Renvoie un
// objet { [session.id]: { palette, emoji, indexInClub } }.
export function buildSessionThemeMap(sessions) {
  const arr = Array.isArray(sessions) ? sessions : [];
  const out = {};
  arr.forEach((s, i) => {
    out[s.id] = {
      palette: getSessionPalette(s, i),
      emoji: getSessionEmoji(s),
      indexInClub: i,
    };
  });
  return out;
}
