import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapSessionMetrics } from './metrics.js';

test('agrège startups par session_id', () => {
  const out = mapSessionMetrics({
    startupRows: [
      { id: 'a', session_id: 's1' },
      { id: 'b', session_id: 's1' },
      { id: 'c', session_id: 's2' },
    ],
    juryRows: [],
  });
  assert.equal(out.s1.startups, 2);
  assert.equal(out.s2.startups, 1);
});

test('compte les jurés UNIQUES par session (dédoublonne jury_user_id)', () => {
  const out = mapSessionMetrics({
    startupRows: [],
    juryRows: [
      { jury_user_id: 'u1', session_id: 's1' },
      { jury_user_id: 'u1', session_id: 's1' }, // doublon
      { jury_user_id: 'u2', session_id: 's1' },
      { jury_user_id: 'u3', session_id: 's2' },
    ],
  });
  assert.equal(out.s1.jurors, 2);
  assert.equal(out.s2.jurors, 1);
});

test('session sans données -> absente de la map (le composant lira via défaut)', () => {
  const out = mapSessionMetrics({ startupRows: [], juryRows: [] });
  assert.deepEqual(out, {});
});

test('ignore les lignes sans session_id', () => {
  const out = mapSessionMetrics({
    startupRows: [{ id: 'a', session_id: null }],
    juryRows: [{ jury_user_id: 'u1', session_id: null }],
  });
  assert.deepEqual(out, {});
});

test('entrées par défaut tolérantes : startups ET jurors initialisés', () => {
  const out = mapSessionMetrics({
    startupRows: [{ id: 'a', session_id: 's1' }],
    juryRows: [{ jury_user_id: 'u1', session_id: 's2' }],
  });
  assert.equal(out.s1.jurors, 0);
  assert.equal(out.s2.startups, 0);
});
