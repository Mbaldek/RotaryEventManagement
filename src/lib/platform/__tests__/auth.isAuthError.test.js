// Tests vanilla node:test pour isAuthError — pas de framework lourd.
// Lancer avec : node --test src/lib/platform/__tests__/auth.isAuthError.test.js
//
// Garde-fou critique : isAuthError décide si on LÂCHE la session locale d'un
// utilisateur (signOut). Un faux positif éjecte un user valide vers le login ;
// un faux négatif laisse un user coincé sur un spinner infini (le bug d'origine,
// cf. docs/deepsolve/sso-google-master-admin-misroute.md).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isAuthError } from '../authErrors.js';

// — DOIT être traité comme token mort (recovery → login form) —

test('HTTP 401 → auth error', () => {
  assert.equal(isAuthError({ status: 401, message: 'Unauthorized' }), true);
});

test('HTTP 403 → auth error', () => {
  assert.equal(isAuthError({ status: 403 }), true);
});

test('PostgREST PGRST301 (JWT expired) → auth error', () => {
  assert.equal(isAuthError({ code: 'PGRST301', message: 'JWT expired' }), true);
});

test('message "JWT expired" sans code → auth error', () => {
  assert.equal(isAuthError({ message: 'JWT expired' }), true);
});

test('invalid refresh token → auth error', () => {
  assert.equal(isAuthError({ message: 'Invalid Refresh Token: Already Used' }), true);
});

// — NE DOIT PAS être traité comme token mort (transitoire → retry) —

test('sentinelle timeout withTimeout → PAS auth error', () => {
  assert.equal(isAuthError({ message: 'rsa_my_roles timeout 8000ms' }), false);
});

test('timeout l\'emporte même si un mot ambigu est présent', () => {
  // Defensive : "timeout" court-circuite avant toute autre heuristique.
  assert.equal(isAuthError({ message: 'request timeout' }), false);
});

test('erreur réseau générique → PAS auth error', () => {
  assert.equal(isAuthError({ message: 'Failed to fetch' }), false);
});

test('erreur SQL métier (PGRST116 no rows) → PAS auth error', () => {
  assert.equal(isAuthError({ code: 'PGRST116', message: 'No rows found' }), false);
});

test('null / undefined → PAS auth error', () => {
  assert.equal(isAuthError(null), false);
  assert.equal(isAuthError(undefined), false);
});

test('objet erreur vide → PAS auth error', () => {
  assert.equal(isAuthError({}), false);
});
