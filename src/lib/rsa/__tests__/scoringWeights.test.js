import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CRITERIA,
  SCORE_FIELDS,
  DEFAULT_WEIGHTS,
  DEFAULT_WEIGHTS_PCT,
  MAX_WEIGHTED,
  weightsSumPct,
  isValidWeightsPct,
  resolveSessionWeights,
  weightedScore,
} from '../constants.js';

const FULL = {
  score_value_prop: 4,
  score_market: 4,
  score_business_model: 4,
  score_team: 4,
  score_pitch_quality: 4,
  score_societal_impact: 4,
};

test('SCORE_FIELDS = les 6 ids de critères', () => {
  assert.equal(SCORE_FIELDS.length, 6);
  assert.deepEqual(SCORE_FIELDS, CRITERIA.map((c) => c.id));
});

test('poids par défaut : fractions somment à 1, pct à 100', () => {
  const sumFrac = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sumFrac - 1) < 1e-9);
  assert.equal(weightsSumPct(DEFAULT_WEIGHTS_PCT), 100);
  assert.equal(MAX_WEIGHTED, 5);
});

test('weightedScore : défaut = moyenne pondérée standard', () => {
  // Tous à 4 → 4.0 quelle que soit la pondération (somme des poids = 1)
  assert.equal(weightedScore(FULL), 4);
});

test('weightedScore : incomplet → null', () => {
  assert.equal(weightedScore({ ...FULL, score_team: null }), null);
  assert.equal(weightedScore(null), null);
});

test('weightedScore : poids custom changent le résultat', () => {
  const row = { ...FULL, score_value_prop: 5, score_market: 0,
    score_business_model: 0, score_team: 0, score_pitch_quality: 0, score_societal_impact: 0 };
  // 100% sur value_prop → note = 5
  const allOnVP = {
    score_value_prop: 1, score_market: 0, score_business_model: 0,
    score_team: 0, score_pitch_quality: 0, score_societal_impact: 0,
  };
  assert.equal(weightedScore(row, allOnVP), 5);
  // poids par défaut → 5 * 0.2 = 1.0
  assert.equal(weightedScore(row, DEFAULT_WEIGHTS), 1);
});

test('isValidWeightsPct : 6 entiers 0..100 sommant à 100', () => {
  assert.equal(isValidWeightsPct(DEFAULT_WEIGHTS_PCT), true);
  assert.equal(isValidWeightsPct(null), false);
  // somme ≠ 100
  assert.equal(isValidWeightsPct({ ...DEFAULT_WEIGHTS_PCT, score_value_prop: 30 }), false);
  // valeur non entière
  assert.equal(isValidWeightsPct({ ...DEFAULT_WEIGHTS_PCT, score_value_prop: 19.5, score_market: 20.5 }), false);
  // clé manquante
  const { score_team, ...missing } = DEFAULT_WEIGHTS_PCT;
  assert.equal(isValidWeightsPct(missing), false);
});

test('resolveSessionWeights : pct valides → fractions ; invalide → défaut', () => {
  const custom = {
    score_value_prop: 50, score_market: 10, score_business_model: 10,
    score_team: 10, score_pitch_quality: 10, score_societal_impact: 10,
  };
  const frac = resolveSessionWeights(custom);
  assert.ok(Math.abs(frac.score_value_prop - 0.5) < 1e-9);
  assert.ok(Math.abs(Object.values(frac).reduce((a, b) => a + b, 0) - 1) < 1e-9);

  // accepte une ligne session_config { score_weights }
  const fromCfg = resolveSessionWeights({ score_weights: custom });
  assert.deepEqual(fromCfg, frac);

  // null / invalide → défaut
  assert.deepEqual(resolveSessionWeights(null), { ...DEFAULT_WEIGHTS });
  assert.deepEqual(resolveSessionWeights({ score_weights: null }), { ...DEFAULT_WEIGHTS });
});
