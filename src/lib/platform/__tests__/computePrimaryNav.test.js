// Tests vanilla node:test pour computePrimaryNav — pas de framework lourd.
// Lancer avec : node --test src/lib/platform/__tests__/computePrimaryNav.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computePrimaryNav } from '../computePrimaryNav.js';

// — Helpers —

function tos(items) {
  return items.map((i) => i.to);
}

// — Admin variants — Administration + accès direct Sélection + Jury (admin
//   trumps tout : la nav ops s'ajoute aux 3 points d'entrée, peu importe le rôle) —

test('master_admin only -> Administration + Sélection + Jury', () => {
  const items = computePrimaryNav({ roles: ['master_admin'] });
  assert.deepEqual(tos(items), ['/Admin', '/Selection', '/Jury']);
  assert.equal(items[0].label.fr, 'Administration');
  assert.equal(items[1].label.fr, 'Sélection');
  assert.equal(items[2].label.fr, 'Jury');
});

test('admin legacy only -> Administration + Sélection + Jury', () => {
  const items = computePrimaryNav({ roles: ['admin'] });
  assert.deepEqual(tos(items), ['/Admin', '/Selection', '/Jury']);
});

test('competition_admin only -> 1 item Administration', () => {
  const items = computePrimaryNav({
    roles: [],
    competitionAdminEditions: ['edition-2027'],
  });
  assert.deepEqual(tos(items), ['/Admin', '/Selection', '/Jury']);
});

test('club_admin only -> 1 item Administration', () => {
  const items = computePrimaryNav({
    roles: [],
    clubMemberships: [{ club_id: 'paris-etoile', role: 'club_admin' }],
  });
  assert.deepEqual(tos(items), ['/Admin', '/Selection', '/Jury']);
});

test('master_admin + jury -> 1 item Administration (admin trumps)', () => {
  const items = computePrimaryNav({ roles: ['master_admin', 'jury'] });
  assert.deepEqual(tos(items), ['/Admin', '/Selection', '/Jury']);
});

test('competition_admin + comite -> 1 item Administration (admin trumps)', () => {
  const items = computePrimaryNav({
    roles: ['comite'],
    competitionAdminEditions: ['edition-2027'],
  });
  assert.deepEqual(tos(items), ['/Admin', '/Selection', '/Jury']);
});

test('club_admin + jury club-scoped -> 1 item Administration (admin trumps)', () => {
  const items = computePrimaryNav({
    roles: [],
    clubMemberships: [
      { club_id: 'paris-etoile', role: 'club_admin' },
      { club_id: 'lyon', role: 'jury' },
    ],
  });
  assert.deepEqual(tos(items), ['/Admin', '/Selection', '/Jury']);
});

// — Ops sans admin —

test('comite-only (global) -> 1 item Sélection', () => {
  const items = computePrimaryNav({ roles: ['comite'] });
  assert.deepEqual(tos(items), ['/Selection']);
  assert.equal(items[0].label.fr, 'Sélection');
  assert.equal(items[0].label.en, 'Selection');
  assert.equal(items[0].label.de, 'Auswahl');
});

test('jury-only (global) -> 1 item Jury', () => {
  const items = computePrimaryNav({ roles: ['jury'] });
  assert.deepEqual(tos(items), ['/Jury']);
});

test('comite + jury (global) -> 2 items Sélection + Jury', () => {
  const items = computePrimaryNav({ roles: ['comite', 'jury'] });
  assert.deepEqual(tos(items), ['/Selection', '/Jury']);
});

test('comite club-scoped (no global) -> 1 item Sélection', () => {
  const items = computePrimaryNav({
    roles: [],
    clubMemberships: [{ club_id: 'lyon', role: 'comite' }],
  });
  assert.deepEqual(tos(items), ['/Selection']);
});

test('jury club-scoped (no global) -> 1 item Jury', () => {
  const items = computePrimaryNav({
    roles: [],
    clubMemberships: [{ club_id: 'lyon', role: 'jury' }],
  });
  assert.deepEqual(tos(items), ['/Jury']);
});

test('comite club-scoped + jury global -> 2 items Sélection + Jury', () => {
  const items = computePrimaryNav({
    roles: ['jury'],
    clubMemberships: [{ club_id: 'lyon', role: 'comite' }],
  });
  assert.deepEqual(tos(items), ['/Selection', '/Jury']);
});

// — Fallback candidat —

test('no role -> 2 items Mon dossier + Concours', () => {
  const items = computePrimaryNav({ roles: [] });
  assert.deepEqual(tos(items), ['/MonDossier', '/Concours']);
  assert.equal(items[0].label.fr, 'Mon dossier');
  assert.equal(items[1].label.fr, 'Concours');
});

test('empty inputs -> fallback candidat', () => {
  const items = computePrimaryNav({
    roles: [],
    clubMemberships: [],
    competitionAdminEditions: [],
  });
  assert.deepEqual(tos(items), ['/MonDossier', '/Concours']);
});

test('no args -> fallback candidat (safe defaults)', () => {
  const items = computePrimaryNav();
  assert.deepEqual(tos(items), ['/MonDossier', '/Concours']);
});

test('null inputs -> fallback candidat (safe defaults)', () => {
  const items = computePrimaryNav({
    roles: null,
    clubMemberships: null,
    competitionAdminEditions: null,
  });
  assert.deepEqual(tos(items), ['/MonDossier', '/Concours']);
});

test('undefined inputs -> fallback candidat (safe defaults)', () => {
  const items = computePrimaryNav({
    roles: undefined,
    clubMemberships: undefined,
    competitionAdminEditions: undefined,
  });
  assert.deepEqual(tos(items), ['/MonDossier', '/Concours']);
});

test('malformed clubMemberships entries are tolerated', () => {
  const items = computePrimaryNav({
    roles: [],
    clubMemberships: [null, undefined, { foo: 'bar' }, { role: 'jury' }],
  });
  // L'entry { role: 'jury' } sans club_id reste valide pour la nav (on ne
  // filtre que sur le champ `role`), donc on attend /Jury.
  assert.deepEqual(tos(items), ['/Jury']);
});

test('roles is a string (not array) -> safe fallback', () => {
  const items = computePrimaryNav({ roles: 'master_admin' });
  // String n'est pas un array → safeRoles = [] → fallback candidat.
  assert.deepEqual(tos(items), ['/MonDossier', '/Concours']);
});
