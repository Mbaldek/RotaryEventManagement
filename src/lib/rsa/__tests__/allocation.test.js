// src/lib/rsa/__tests__/allocation.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAllocation, groupAllocatedByCluster, slugSessionId } from '../allocation.js';

test('summarizeAllocation compte pool / alloués / à examiner', () => {
  const r = summarizeAllocation({
    pool: [{ id: 'a' }, { id: 'b' }],
    allocated: [{ id: 'c' }],
    toReviewCount: 3,
  });
  assert.deepEqual(r, { toPlaceCount: 2, allocatedCount: 1, eligibleTotal: 3, toReviewCount: 3 });
});

test('groupAllocatedByCluster regroupe par session_id et préserve l’ordre des clusters', () => {
  const clusters = [{ id: 's_a', name: 'A' }, { id: 's_b', name: 'B' }];
  const allocated = [
    { id: '1', name: 'X', session_id: 's_b' },
    { id: '2', name: 'Y', session_id: 's_a' },
    { id: '3', name: 'Z', session_id: 's_a' },
  ];
  const groups = groupAllocatedByCluster(allocated, clusters);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].cluster.id, 's_a');
  assert.deepEqual(groups[0].startups.map((s) => s.id), ['2', '3']);
  assert.equal(groups[1].cluster.id, 's_b');
  assert.deepEqual(groups[1].startups.map((s) => s.id), ['1']);
});

test('slugSessionId génère un id text stable préfixé par l’édition', () => {
  assert.equal(slugSessionId('2026', 'Santé & IA'), '2026_sante_ia');
  assert.equal(slugSessionId('2026', '  Climat   Impact  '), '2026_climat_impact');
});
