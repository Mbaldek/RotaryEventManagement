// Catalogue dur des 7 critères d'éligibilité exposés par l'éditeur UI (V2.5).
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

// Catalogue principal : décrit chaque critère.
// `param`     : 'tags' | 'date' | 'number' | 'docs' | 'none'
// `defaults`  : valeurs (hors `behavior`) appliquées à l'activation
// `behavior`  : 'exclu' ou 'flag' par défaut
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
    behavior: 'flag',
    defaults: { docs: ['pitch_deck', 'exec_summary'] },
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
 * Le JSON produit est strictement compatible avec le format historique
 * (voir DEFAULT_RULES_2026 dans src/lib/rsa/eligibility.js).
 */
export function stateToRules(state) {
  const out = {};
  for (const def of CRITERIA) {
    const node = state[def.key];
    if (!node?.enabled) continue;
    const behavior = BEHAVIORS.includes(node.behavior) ? node.behavior : def.behavior;
    const params = serializeParams(def, node.params);
    out[def.key] = { behavior, ...params };
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
      return {
        docs: Array.isArray(raw.docs) && raw.docs.length > 0
          ? raw.docs.filter((x) => typeof x === 'string')
          : [...(def.defaults.docs || [])],
      };
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
      return { docs: Array.isArray(params?.docs) ? params.docs : [] };
    case 'none':
    default:
      return {};
  }
}
