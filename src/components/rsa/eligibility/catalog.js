// Catalogue dur des 7 critères d'éligibilité exposés par l'éditeur UI (V2.5+).
//
// Le format JSON consommé par la RPC `rsa_evaluate_eligibility` (et par
// `src/lib/rsa/eligibility.js` côté front) est figé : clé = nom du critère,
// valeur = { behavior, ...params }. Ce catalogue décrit, pour chaque clé :
//   - le type de paramètre (TagSelect, DateField, number, multicheckbox, none),
//   - le behavior par défaut quand l'admin l'active,
//   - les valeurs initiales du règlement RSA 2026 (utilisées si l'admin coche
//     la case sans rien renseigner),
//   - les helpers de (dé)sérialisation vers le JSON canonique.
//
// L'ORDRE de CRITERIA[] définit l'ordre d'affichage dans l'éditeur (les
// critères "dur" — pays + date — en haut, les "comité" — flags — en bas).
//
// V2.5+ — pivot `docs_required` : le critère n'est plus un toggle unique
// avec une liste interne, c'est un GROUPE qui rend une mini-liste où chaque
// document a son propre toggle + son propre behavior individuel. Schéma JSON :
//   "docs_required": {
//     "pitch_deck":   { "behavior": "exclu" },   // demandé, bloquant
//     "exec_summary": { "behavior": "flag" },    // demandé, warning comité
//     "financials":   { "behavior": "flag" }
//     // video_pitch absent ⇒ pas demandé
//   }

export const BEHAVIORS = ['exclu', 'flag'];

// Clés exposées dans l'UI (= clés JSON consommées par la RPC).
export const CRITERION_KEYS = [
  'country',
  'created_after',
  'revenue_max',
  'raised_max',
  'registration',
  'founders_majority',
  'docs_required',
];

// ── Documents demandés au candidat (catalogue par doc) ───────────────────────
// Source unique de vérité pour : (a) lignes affichées par EligibilityRulesEditor,
// (b) Dropzones affichées par StepDocuments. Une clé absente du JSON signifie
// "ce document n'est pas demandé du tout".
//
// `field`  : nom de la colonne `startups` qui porte le path (null si pas encore wired).
// `kind`   : kind storage pour DocumentDropzone (null si pas encore wired).
// Pour V2.5+, seuls pitch_deck / exec_summary sont wired en storage ; financials et
// video_pitch sont catalogués pour exposition admin (TODO storage à brancher).
export const DOC_CATALOG = [
  { key: 'pitch_deck',   defaultBehavior: 'exclu', field: 'pitch_deck_path',   kind: 'deck'         },
  { key: 'exec_summary', defaultBehavior: 'exclu', field: 'exec_summary_path', kind: 'exec_summary' },
  { key: 'financials',   defaultBehavior: 'flag',  field: null,                kind: null           },
  { key: 'video_pitch',  defaultBehavior: 'flag',  field: null,                kind: null           },
];

export const DOC_KEYS = DOC_CATALOG.map((d) => d.key);
export const DOC_BY_KEY = Object.fromEntries(DOC_CATALOG.map((d) => [d.key, d]));

// Documents demandés par défaut quand l'admin active la card (règlement RSA 2026
// = pitch_deck exclu + exec_summary exclu). On expose une fonction defaults() pour
// rester compatible avec le pattern `extractParams` / `serializeParams`.
function defaultDocsConfig() {
  return {
    pitch_deck:   { behavior: 'exclu' },
    exec_summary: { behavior: 'exclu' },
  };
}

// Catalogue principal : décrit chaque critère.
// `param`     : 'tags' | 'date' | 'number' | 'docs' | 'none'
// `defaults`  : valeurs (hors `behavior`) appliquées à l'activation
// `behavior`  : 'exclu' ou 'flag' par défaut (ignoré pour docs_required — chaque
//               doc porte son propre behavior individuel)
export const CRITERIA = [
  {
    key: 'country',
    param: 'tags',
    behavior: 'exclu',
    defaults: { allowed: ['FR', 'DE'] },
  },
  {
    key: 'created_after',
    param: 'date',
    behavior: 'exclu',
    defaults: { date: '2020-01-01' },
  },
  {
    key: 'revenue_max',
    param: 'number',
    behavior: 'flag',
    defaults: { threshold: 500000 },
  },
  {
    key: 'raised_max',
    param: 'number',
    behavior: 'flag',
    defaults: { threshold: 800000 },
  },
  {
    key: 'registration',
    param: 'none',
    behavior: 'flag',
    defaults: {},
  },
  {
    key: 'founders_majority',
    param: 'none',
    behavior: 'flag',
    defaults: {},
  },
  {
    key: 'docs_required',
    param: 'docs',
    behavior: 'flag', // legacy : sert encore de fallback pour le mode avancé / vieilles vues
    defaults: { docs: defaultDocsConfig() },
  },
];

// Index { key -> definition } pour accès rapide.
export const CRITERIA_BY_KEY = Object.fromEntries(CRITERIA.map((c) => [c.key, c]));

// ────────────────────────────────────────────────────────────────────────────
// (Dé)sérialisation JSON ↔ état interne
// ────────────────────────────────────────────────────────────────────────────

/**
 * Décompose le JSON eligibility_rules en état UI :
 *   pour chaque critère du catalogue → { enabled, behavior, params }
 * - clé présente dans le JSON => enabled=true, behavior + params chargés
 * - clé absente => enabled=false, valeurs par défaut prêtes pour activation
 *
 * Robuste aux JSON partiels / valeurs manquantes : on retombe systématiquement
 * sur les defaults du catalogue pour éviter qu'un toggle "on" produise un JSON
 * cassé (ex. revenue_max sans threshold).
 *
 * docs_required (V2.5+) : on supporte les DEUX formats en LECTURE pour rester
 * tolérant aux éditions encore stockées au vieux format avant la migration SQL.
 *   - Nouveau format : { pitch_deck: {behavior}, exec_summary: {behavior}, ... }
 *   - Ancien format  : { behavior: 'flag', docs: ['pitch_deck','exec_summary'] }
 *     ⇒ converti à la volée : chaque doc reçoit le behavior global.
 */
export function rulesToState(value) {
  const json = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const state = {};
  for (const def of CRITERIA) {
    const raw = json[def.key];
    if (raw && typeof raw === 'object') {
      state[def.key] = {
        enabled: true,
        behavior: BEHAVIORS.includes(raw.behavior) ? raw.behavior : def.behavior,
        params: extractParams(def, raw),
      };
    } else {
      state[def.key] = {
        enabled: false,
        behavior: def.behavior,
        params: { ...def.defaults },
      };
    }
  }
  return state;
}

/**
 * Recompose le JSON canonique à partir de l'état UI.
 * - critères enabled=true → écrits avec leur behavior + params nettoyés
 * - critères enabled=false → omis
 *
 * Pour docs_required : pas de behavior racine — chaque clé de doc porte le sien.
 */
export function stateToRules(state) {
  const out = {};
  for (const def of CRITERIA) {
    const node = state[def.key];
    if (!node?.enabled) continue;
    if (def.key === 'docs_required') {
      // Format V2.5+ : { pitch_deck: {behavior}, ... } — pas de behavior racine.
      out.docs_required = serializeDocsParam(node.params);
    } else {
      const behavior = BEHAVIORS.includes(node.behavior) ? node.behavior : def.behavior;
      const params = serializeParams(def, node.params);
      out[def.key] = { behavior, ...params };
    }
  }
  return out;
}

// ── Helpers param ──────────────────────────────────────────────────────────

function extractParams(def, raw) {
  switch (def.param) {
    case 'tags':
      return {
        allowed: Array.isArray(raw.allowed) && raw.allowed.length > 0
          ? raw.allowed.filter((x) => typeof x === 'string')
          : [...(def.defaults.allowed || [])],
      };
    case 'date':
      return { date: typeof raw.date === 'string' && raw.date ? raw.date : def.defaults.date };
    case 'number':
      return {
        threshold: typeof raw.threshold === 'number' && Number.isFinite(raw.threshold)
          ? raw.threshold
          : def.defaults.threshold,
      };
    case 'docs':
      return { docs: extractDocsParam(raw) };
    case 'none':
    default:
      return {};
  }
}

function serializeParams(def, params) {
  switch (def.param) {
    case 'tags':
      return { allowed: Array.isArray(params?.allowed) ? params.allowed : [] };
    case 'date':
      return { date: typeof params?.date === 'string' ? params.date : '' };
    case 'number': {
      const n = Number(params?.threshold);
      return { threshold: Number.isFinite(n) ? n : 0 };
    }
    case 'docs':
      // not used directly — docs_required est sérialisé via serializeDocsParam.
      return { docs: serializeDocsParam(params?.docs) };
    case 'none':
    default:
      return {};
  }
}

// ── docs_required V2.5+ : helpers spécialisés ──────────────────────────────
// Lecture tolérante :
//   - nouveau format  : raw = { pitch_deck: {behavior:'exclu'}, exec_summary: {behavior:'flag'} }
//   - ancien format   : raw = { behavior:'flag', docs:['pitch_deck','exec_summary'] }
// Renvoie un objet UI homogène : { [doc_key]: { behavior } } où chaque doc
// présent est demandé. Une clé absente ⇒ doc pas demandé.
function extractDocsParam(raw) {
  if (!raw || typeof raw !== 'object') return defaultDocsConfig();

  // 1. Ancien format détecté → conversion.
  if (Array.isArray(raw.docs)) {
    const behavior = BEHAVIORS.includes(raw.behavior) ? raw.behavior : 'flag';
    const out = {};
    for (const k of raw.docs) {
      if (typeof k === 'string' && DOC_BY_KEY[k]) {
        out[k] = { behavior };
      }
    }
    return out;
  }

  // 2. Nouveau format : raw lui-même est { key: { behavior } }.
  //    On filtre sur les clés connues du catalogue et on valide le behavior.
  const out = {};
  for (const def of DOC_CATALOG) {
    const entry = raw[def.key];
    if (entry && typeof entry === 'object') {
      const beh = BEHAVIORS.includes(entry.behavior) ? entry.behavior : def.defaultBehavior;
      out[def.key] = { behavior: beh };
    }
  }
  return out;
}

// Sérialise l'objet UI vers le format canonique V2.5+ ({ key: { behavior } }),
// en ne gardant que les docs activés et avec un behavior valide.
function serializeDocsParam(docs) {
  const src = docs && typeof docs === 'object' && !Array.isArray(docs) ? docs : {};
  const out = {};
  for (const def of DOC_CATALOG) {
    const entry = src[def.key];
    if (!entry || typeof entry !== 'object') continue;
    const beh = BEHAVIORS.includes(entry.behavior) ? entry.behavior : def.defaultBehavior;
    out[def.key] = { behavior: beh };
  }
  return out;
}

// Helpers d'agrégation pour l'éditeur UI (DocRequirementRow).
// Le critère docs_required est "actif" SSI au moins un doc est demandé.
export function docsAnyEnabled(docsParams) {
  return docsParams && typeof docsParams === 'object' && Object.keys(docsParams).length > 0;
}
