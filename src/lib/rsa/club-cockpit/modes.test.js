import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLUB_MODES, PREP_TABS, PILOTAGE_TABS,
  isClubMode, resolveClubMode, tabsForMode, modeForTab, firstTabOf, reconcileTab,
} from './modes.js';

test('isClubMode reconnaît les modes valides uniquement', () => {
  assert.ok(isClubMode(CLUB_MODES.PREP));
  assert.ok(isClubMode(CLUB_MODES.PILOTAGE));
  assert.ok(!isClubMode('garbage'));
  assert.ok(!isClubMode(null));
});

test('arrays couvrent les 9 onglets existants + pilotage, sans doublon', () => {
  const all = [...PREP_TABS, ...PILOTAGE_TABS];
  assert.equal(new Set(all).size, all.length); // pas de doublon
  for (const id of ['setup', 'team', 'rules', 'prizes', 'jury_applications',
                    'pilotage', 'live', 'results', 'analytics', 'comms']) {
    assert.ok(all.includes(id), `manque ${id}`);
  }
});

test('resolveClubMode : urlMode valide gagne', () => {
  assert.equal(resolveClubMode('prep', { status: 'open' }), CLUB_MODES.PREP);
  assert.equal(resolveClubMode('pilotage', { status: 'draft' }), CLUB_MODES.PILOTAGE);
});

test('resolveClubMode : sans urlMode, défaut selon edition.status', () => {
  assert.equal(resolveClubMode(null, { status: 'open' }), CLUB_MODES.PILOTAGE);
  assert.equal(resolveClubMode(null, { status: 'draft' }), CLUB_MODES.PREP);
  assert.equal(resolveClubMode('garbage', null), CLUB_MODES.PREP);
});

test('modeForTab mappe chaque onglet vers son mode', () => {
  assert.equal(modeForTab('setup'), CLUB_MODES.PREP);
  assert.equal(modeForTab('pilotage'), CLUB_MODES.PILOTAGE);
  assert.equal(modeForTab('inconnu'), null);
});

test('firstTabOf renvoie le 1er onglet du mode', () => {
  assert.equal(firstTabOf(CLUB_MODES.PREP), 'setup');
  assert.equal(firstTabOf(CLUB_MODES.PILOTAGE), 'pilotage');
});

test('reconcileTab garde l onglet si compatible, sinon retombe sur le 1er du mode', () => {
  assert.equal(reconcileTab('live', CLUB_MODES.PILOTAGE), 'live');
  assert.equal(reconcileTab('setup', CLUB_MODES.PILOTAGE), 'pilotage');
  assert.equal(reconcileTab('inconnu', CLUB_MODES.PREP), 'setup');
});

test('tabsForMode renvoie le bon array', () => {
  assert.deepEqual(tabsForMode(CLUB_MODES.PREP), PREP_TABS);
  assert.deepEqual(tabsForMode(CLUB_MODES.PILOTAGE), PILOTAGE_TABS);
});
