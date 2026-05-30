// Tests vanilla node:test pour withTimeout — pas de framework lourd.
// Lancer avec : node --test src/lib/platform/__tests__/promiseTimeout.test.js
//
// RÉGRESSION CRITIQUE : les builders PostgREST sont des thenables SANS .catch.
// withTimeout ne doit JAMAIS jeter « X.catch is not a function » (bug qui faisait
// throw loadIdentity → spinner /Login perpétuel, cf. deepsolve §11).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { withTimeout } from '../promiseTimeout.js';

// Thenable SANS .catch ni .finally — reproduit fidèlement un builder PostgREST
// (supabase.from(...).maybeSingle() / supabase.rpc(...)).
function catchlessThenable(value, delay = 0) {
  return {
    then(resolve) {
      setTimeout(() => resolve(value), delay);
    },
    // PAS de catch, PAS de finally — c'est tout le problème.
  };
}

test('thenable sans .catch ne fait PAS throw à l\'appel (régression Y.catch)', () => {
  // Le bug d'origine jetait SYNCHRONEMENT ici (builder.catch is not a function).
  assert.doesNotThrow(() => {
    withTimeout(catchlessThenable({ data: 1, error: null }), 1000, 'x');
  });
});

test('thenable sans .catch qui résout → on récupère sa valeur', async () => {
  const res = await withTimeout(catchlessThenable({ data: 42, error: null }, 0), 1000, 'roles');
  assert.deepEqual(res, { data: 42, error: null });
});

test('promesse lente → sentinelle timeout {data:null, error:{message}}', async () => {
  const res = await withTimeout(catchlessThenable({ data: 1 }, 1000), 20, 'slow');
  assert.equal(res.data, null);
  assert.equal(res.error.message, 'slow timeout 20ms');
});

test('vraie Promise (auth.getSession-like) fonctionne aussi', async () => {
  const res = await withTimeout(Promise.resolve({ data: { session: null }, error: null }), 1000, 'session');
  assert.deepEqual(res, { data: { session: null }, error: null });
});

test('late rejection d\'un thenable est swallowed (pas d\'unhandled)', async () => {
  // Thenable qui rejette après que le timeout a gagné — ne doit pas crasher le test.
  const rejectingLate = {
    then(resolve, reject) {
      setTimeout(() => reject(new Error('AbortError late')), 50);
    },
  };
  const res = await withTimeout(rejectingLate, 10, 'aborty');
  assert.equal(res.error.message, 'aborty timeout 10ms');
  // Laisse le temps à la rejection tardive de se produire — doit être swallowed.
  await new Promise((r) => setTimeout(r, 60));
});
