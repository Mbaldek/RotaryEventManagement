// Tests vanilla node:test pour postLoginRoute — pas de framework lourd.
// Lancer avec : node --test src/lib/platform/__tests__/postLoginRoute.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computeLandingRoute, parseLoginQuery, ALLOWED_NEXT } from '../postLoginRoute.js';

// — Rôles globaux —

test('master_admin landing -> /Admin', () => {
  assert.equal(computeLandingRoute({ roles: ['master_admin'] }), '/Admin');
});

test('club_admin only -> /Admin?scope=club:<id>', () => {
  const r = computeLandingRoute({
    roles: [],
    clubMemberships: [{ club_id: 'paris-etoile', role: 'club_admin' }],
  });
  assert.equal(r, '/Admin?scope=club:paris-etoile');
});

test('club_admin + master_admin -> master wins (/Admin)', () => {
  const r = computeLandingRoute({
    roles: ['master_admin'],
    clubMemberships: [{ club_id: 'paris-etoile', role: 'club_admin' }],
  });
  assert.equal(r, '/Admin');
});

test('jury (global) -> /Jury', () => {
  assert.equal(computeLandingRoute({ roles: ['jury'] }), '/Jury');
});

test('comite (global) -> /Selection', () => {
  assert.equal(computeLandingRoute({ roles: ['comite'] }), '/Selection');
});

test('admin legacy -> /Admin', () => {
  assert.equal(computeLandingRoute({ roles: ['admin'] }), '/Admin');
});

test('comite club-scoped (no global) -> /Selection', () => {
  const r = computeLandingRoute({
    roles: [],
    clubMemberships: [{ club_id: 'lyon', role: 'comite' }],
  });
  assert.equal(r, '/Selection');
});

test('jury club-scoped (no global) -> /Jury', () => {
  const r = computeLandingRoute({
    roles: [],
    clubMemberships: [{ club_id: 'lyon', role: 'jury' }],
  });
  assert.equal(r, '/Jury');
});

// — Candidat —

test('candidat avec dossier -> /MonDossier', () => {
  assert.equal(computeLandingRoute({ roles: [], hasDossier: true }), '/MonDossier');
});

test('candidat sans dossier ni rôle -> /MonDossier (fallback)', () => {
  assert.equal(computeLandingRoute({}), '/MonDossier');
});

// — nextParam whitelist —

test('nextParam whitelisté (/Admin) -> préservé', () => {
  assert.equal(
    computeLandingRoute({ roles: ['jury'], nextParam: '/Admin' }),
    '/Admin',
  );
});

test('nextParam whitelisté avec sous-route (/MonDossier/edit) -> préservé', () => {
  assert.equal(
    computeLandingRoute({ roles: [], nextParam: '/MonDossier/edit' }),
    '/MonDossier/edit',
  );
});

test('nextParam whitelisté avec querystring (/Welcome?role=jury) -> préservé', () => {
  assert.equal(
    computeLandingRoute({ roles: [], nextParam: '/Welcome?role=jury' }),
    '/Welcome?role=jury',
  );
});

test('nextParam HORS whitelist (https://evil.com) -> ignoré, fallback role', () => {
  const r = computeLandingRoute({ roles: ['jury'], nextParam: 'https://evil.com' });
  assert.equal(r, '/Jury');
});

test('nextParam HORS whitelist (/StealMyAuth) -> ignoré, fallback', () => {
  const r = computeLandingRoute({ roles: [], nextParam: '/StealMyAuth' });
  assert.equal(r, '/MonDossier');
});

test('nextParam protocol-relative (//evil.com) -> ignoré', () => {
  // //evil.com NE commence pas par /<whitelistedPath>, donc rejeté par ALLOWED_NEXT.
  const r = computeLandingRoute({ roles: ['master_admin'], nextParam: '//evil.com/Admin' });
  assert.equal(r, '/Admin'); // fallback master
});

// — Intent —

test('intent=candidate avec edition+club -> /MonDossier?edition=...&club=...', () => {
  const r = computeLandingRoute({
    roles: [],
    intent: 'candidate',
    editionId: '2027',
    clubId: 'paris-etoile',
  });
  assert.equal(r, '/MonDossier?edition=2027&club=paris-etoile');
});

test('intent=candidate sans edition ni club -> /MonDossier (querystring vide)', () => {
  const r = computeLandingRoute({ roles: [], intent: 'candidate' });
  assert.equal(r, '/MonDossier');
});

test('intent=candidate avec edition seul -> /MonDossier?edition=...', () => {
  const r = computeLandingRoute({ roles: [], intent: 'candidate', editionId: '2027' });
  assert.equal(r, '/MonDossier?edition=2027');
});

test('intent=jury-onboard avec edition -> /Welcome?role=jury&edition=...', () => {
  const r = computeLandingRoute({ roles: [], intent: 'jury-onboard', editionId: '2027' });
  assert.equal(r, '/Welcome?role=jury&edition=2027');
});

test('intent=jury-onboard sans edition -> /Welcome?role=jury', () => {
  const r = computeLandingRoute({ roles: [], intent: 'jury-onboard' });
  assert.equal(r, '/Welcome?role=jury');
});

test('intent gagne contre rôle existant (candidat avec rôle jury va sur candidature)', () => {
  // Un jury qui clique sur un lien d'invitation candidat doit être routé vers
  // la candidature — c'est le contexte du clic qui prime.
  const r = computeLandingRoute({
    roles: ['jury'],
    intent: 'candidate',
    editionId: '2027',
  });
  assert.equal(r, '/MonDossier?edition=2027');
});

test('nextParam gagne contre intent (deep-link explicite > contexte)', () => {
  const r = computeLandingRoute({
    roles: [],
    intent: 'candidate',
    editionId: '2027',
    nextParam: '/Jury',
  });
  assert.equal(r, '/Jury');
});

// — parseLoginQuery —

test('parseLoginQuery: full query', () => {
  const r = parseLoginQuery('?next=/Admin&intent=candidate&edition=2027&club=paris-etoile');
  assert.deepEqual(r, {
    next: '/Admin',
    intent: 'candidate',
    edition: '2027',
    club: 'paris-etoile',
  });
});

test('parseLoginQuery: vide -> tous null', () => {
  assert.deepEqual(parseLoginQuery(''), { next: null, intent: null, edition: null, club: null });
  assert.deepEqual(parseLoginQuery('?'), { next: null, intent: null, edition: null, club: null });
  assert.deepEqual(parseLoginQuery(null), { next: null, intent: null, edition: null, club: null });
  assert.deepEqual(parseLoginQuery(undefined), { next: null, intent: null, edition: null, club: null });
});

test('parseLoginQuery: sans préfixe ? ', () => {
  const r = parseLoginQuery('intent=candidate&edition=2028');
  assert.equal(r.intent, 'candidate');
  assert.equal(r.edition, '2028');
  assert.equal(r.next, null);
  assert.equal(r.club, null);
});

test('parseLoginQuery: valeurs encodées (URI decode)', () => {
  const r = parseLoginQuery('?next=%2FMonDossier&club=paris%20etoile');
  assert.equal(r.next, '/MonDossier');
  assert.equal(r.club, 'paris etoile');
});

test('parseLoginQuery: clés inconnues ignorées', () => {
  const r = parseLoginQuery('?foo=bar&intent=candidate&xss=<script>');
  assert.equal(r.intent, 'candidate');
  assert.equal(r.next, null);
});

test('parseLoginQuery: valeurs vides -> null', () => {
  const r = parseLoginQuery('?next=&intent=candidate');
  assert.equal(r.next, null);
  assert.equal(r.intent, 'candidate');
});

// — ALLOWED_NEXT — sanity checks de l'expression

test('ALLOWED_NEXT accepts core spaces', () => {
  for (const p of ['/MonDossier', '/Selection', '/Jury', '/Admin', '/Welcome', '/Candidater', '/DevenirJury']) {
    assert.ok(ALLOWED_NEXT.test(p), `expected ${p} accepted`);
  }
});

test('ALLOWED_NEXT rejects external / weird', () => {
  for (const p of ['https://evil.com', '//evil.com/Admin', '/Login', '/x/y', 'Admin', '']) {
    assert.ok(!ALLOWED_NEXT.test(p), `expected ${p} rejected`);
  }
});
