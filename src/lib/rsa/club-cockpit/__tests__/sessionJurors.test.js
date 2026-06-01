import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitSessionJurors } from '../sessionJurors.js';

const ROWS = [
  { id: 'a', full_name: 'Marie Durand', qualite: 'investisseur', status: 'approved' },
  { id: 'b', full_name: 'Paul Martin', qualite: 'expert', status: 'pending' },
  { id: 'c', full_name: 'Léa Bonnet', qualite: 'entrepreneur', status: 'pending' },
  { id: 'd', full_name: 'Anne Roy', qualite: 'corporate', status: 'approved' },
];

test('scinde approved / pending', () => {
  const { assigned, pending } = splitSessionJurors(ROWS);
  // After alphabetical sort: Anne Roy (d) < Marie Durand (a) ; Léa Bonnet (c) < Paul Martin (b)
  assert.deepEqual(assigned.map((r) => r.id), ['d', 'a']);
  assert.deepEqual(pending.map((r) => r.id), ['c', 'b']);
});

test('tri alphabétique par nom dans chaque groupe', () => {
  const { assigned } = splitSessionJurors(ROWS);
  assert.deepEqual(assigned.map((r) => r.full_name), ['Anne Roy', 'Marie Durand']);
});

test('entrée vide / nulle → groupes vides', () => {
  assert.deepEqual(splitSessionJurors(null), { assigned: [], pending: [] });
  assert.deepEqual(splitSessionJurors([]), { assigned: [], pending: [] });
});

test('ignore les statuts hors pending/approved', () => {
  const { assigned, pending } = splitSessionJurors([{ id: 'x', full_name: 'X', status: 'rejected' }]);
  assert.equal(assigned.length, 0);
  assert.equal(pending.length, 0);
});
