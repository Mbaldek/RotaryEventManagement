// src/lib/platform/__tests__/competitionShell.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PHASES,
  PHASE_IDS,
  deriveDefaultPhase,
  parseShellState,
  isClubLensVisible,
  filterHubCompetitions,
} from '../competitionShell.js';

test('PHASES expose les 3 phases dans l’ordre', () => {
  assert.deepEqual(PHASE_IDS, ['prep', 'orga', 'pilotage']);
  assert.equal(PHASES[0].label.fr, 'Préparation');
});

test('deriveDefaultPhase: open -> pilotage, sinon prep', () => {
  assert.equal(deriveDefaultPhase({ status: 'open' }), 'pilotage');
  assert.equal(deriveDefaultPhase({ status: 'draft' }), 'prep');
  assert.equal(deriveDefaultPhase(null), 'prep');
});

test('parseShellState lit les params et borne la phase', () => {
  const params = new URLSearchParams('competition=ed1&phase=orga&screen=selection&club=c2');
  const s = parseShellState(params, { status: 'draft' });
  assert.deepEqual(s, { competitionId: 'ed1', phase: 'orga', screen: 'selection', clubId: 'c2' });
});

test('parseShellState: phase invalide -> défaut dérivé de l’édition', () => {
  const params = new URLSearchParams('competition=ed1&phase=bogus');
  const s = parseShellState(params, { status: 'open' });
  assert.equal(s.phase, 'pilotage');
});

test('parseShellState: club par défaut = all, competition absente = null', () => {
  const s = parseShellState(new URLSearchParams(''), null);
  assert.equal(s.competitionId, null);
  assert.equal(s.clubId, 'all');
});

test('isClubLensVisible: multiclub avec >=2 clubs uniquement', () => {
  assert.equal(isClubLensVisible({ model: 'multiclub' }, 2), true);
  assert.equal(isClubLensVisible({ model: 'multiclub' }, 1), false);
  assert.equal(isClubLensVisible({ model: 'monoclub' }, 5), false);
  assert.equal(isClubLensVisible(null, 5), false);
});

test('filterHubCompetitions: master voit tout', () => {
  const comps = [{ id: 'a' }, { id: 'b' }];
  assert.deepEqual(
    filterHubCompetitions({ competitions: comps, isMasterAdmin: true }),
    comps,
  );
});

test('filterHubCompetitions: non-master voit ses éditions (comp_admin + club)', () => {
  const comps = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const out = filterHubCompetitions({
    competitions: comps,
    isMasterAdmin: false,
    competitionAdminEditions: ['b'],
    adminClubEditionIds: ['c'],
  });
  assert.deepEqual(out.map((x) => x.id), ['b', 'c']);
});

test('filterHubCompetitions: entrées non-array tolérées', () => {
  assert.deepEqual(filterHubCompetitions({ competitions: null, isMasterAdmin: true }), []);
});
