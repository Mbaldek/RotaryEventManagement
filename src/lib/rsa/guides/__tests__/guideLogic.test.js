// Tests node:test pour guideLogic — logique de résolution d'héritage + pastille.
// Lancer : node --test src/lib/rsa/guides/__tests__/guideLogic.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveGuidesForScope, hasNewBadge } from '../guideLogic.js';

const g = (id, edition_id, sort_order = 0, updated_at = '2026-06-01T00:00:00Z') =>
  ({ id, edition_id, sort_order, updated_at, is_published: true });

// — resolveGuidesForScope : override par édition —

test('édition courante avec guides dédiés → on prend CEUX-LÀ, pas les globaux', () => {
  const rows = [g('glob', null, 0), g('e1', 'edA', 0)];
  const out = resolveGuidesForScope(rows, 'edA');
  assert.deepEqual(out.map((r) => r.id), ['e1']);
});

test('édition courante sans guide dédié → fallback sur les globaux (edition_id null)', () => {
  const rows = [g('glob', null, 0), g('e1', 'edA', 0)];
  const out = resolveGuidesForScope(rows, 'edB');
  assert.deepEqual(out.map((r) => r.id), ['glob']);
});

test('pas d\'édition courante (null) → guides globaux', () => {
  const rows = [g('glob', null, 0), g('e1', 'edA', 0)];
  const out = resolveGuidesForScope(rows, null);
  assert.deepEqual(out.map((r) => r.id), ['glob']);
});

test('tri par sort_order croissant', () => {
  const rows = [g('b', null, 2), g('a', null, 1), g('c', null, 3)];
  const out = resolveGuidesForScope(rows, null);
  assert.deepEqual(out.map((r) => r.id), ['a', 'b', 'c']);
});

test('liste vide → []', () => {
  assert.deepEqual(resolveGuidesForScope([], 'edA'), []);
  assert.deepEqual(resolveGuidesForScope(null, 'edA'), []);
});

// — hasNewBadge : pastille « nouveau » —

test('aucun ack → badge si au moins un guide', () => {
  const rows = [g('a', null, 0, '2026-06-01T00:00:00Z')];
  assert.equal(hasNewBadge(rows, null), true);
});

test('aucun guide → pas de badge même sans ack', () => {
  assert.equal(hasNewBadge([], null), false);
});

test('ack postérieur au dernier update → pas de badge', () => {
  const rows = [g('a', null, 0, '2026-06-01T00:00:00Z')];
  assert.equal(hasNewBadge(rows, '2026-06-02T00:00:00Z'), false);
});

test('guide mis à jour APRÈS l\'ack → badge', () => {
  const rows = [g('a', null, 0, '2026-06-03T00:00:00Z')];
  assert.equal(hasNewBadge(rows, '2026-06-02T00:00:00Z'), true);
});

test('updated_at absent/null → ignoré (pas de badge fantôme)', () => {
  const rows = [{ id: 'a', edition_id: null, sort_order: 0, updated_at: null, is_published: true }];
  assert.equal(hasNewBadge(rows, '2026-06-02T00:00:00Z'), false);
});
