import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRanking } from '../ranking.js';
import { resolveSessionWeights } from '../constants.js';

// 2 startups, 1 juré chacune, name-keyed (startup_name).
const SCORES = [
  {
    startup_name: 'Alpha',
    score_value_prop: 5, score_market: 0, score_business_model: 0,
    score_team: 0, score_pitch_quality: 0, score_societal_impact: 0,
  },
  {
    startup_name: 'Beta',
    score_value_prop: 0, score_market: 0, score_business_model: 0,
    score_team: 0, score_pitch_quality: 5, score_societal_impact: 5,
  },
];

test('buildRanking : poids par défaut → Alpha (20% VP) devant Beta (10%+10%)', () => {
  const r = buildRanking(SCORES, {});
  // Alpha = 5*0.2 = 1.0 ; Beta = 5*0.1 + 5*0.1 = 1.0 → égalité, tri stable
  assert.equal(r.length, 2);
  // les deux à 1.0 par défaut
  assert.ok(Math.abs(r.find((x) => x.startup === 'Alpha').avg - 1) < 1e-9);
  assert.ok(Math.abs(r.find((x) => x.startup === 'Beta').avg - 1) < 1e-9);
});

test('buildRanking : poids custom (VP=60%) → Alpha gagne nettement', () => {
  const weights = resolveSessionWeights({
    score_value_prop: 60, score_market: 10, score_business_model: 10,
    score_team: 10, score_pitch_quality: 5, score_societal_impact: 5,
  });
  const r = buildRanking(SCORES, {}, weights);
  const alpha = r.find((x) => x.startup === 'Alpha');
  const beta = r.find((x) => x.startup === 'Beta');
  assert.ok(Math.abs(alpha.avg - 3) < 1e-9);   // 5 * 0.60
  assert.ok(Math.abs(beta.avg - 0.5) < 1e-9);  // 5*0.05 + 5*0.05
  assert.equal(alpha.final_rank, 1);
  assert.equal(beta.final_rank, 2);
});

test('buildRanking : ligne incomplète exclue', () => {
  const partial = [{ startup_name: 'Gamma', score_value_prop: 5 }];
  assert.deepEqual(buildRanking(partial, {}), []);
});
