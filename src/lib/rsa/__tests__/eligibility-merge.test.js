// Tests vanilla node:test pour mergeEligibilityRules (héritage compétition → club).
// Lancer avec : node --test src/lib/rsa/__tests__/eligibility-merge.test.js
//
// Contrat (cf. docs/blueprints/club-inheritance-rules-prizes.md §2) :
//   effective = competition ⊕ club_overrides, merge SHALLOW par clé (critère).
//   Symétrie SQL : `competition_jsonb || overrides_jsonb`.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  mergeEligibilityRules,
  evaluateEligibility,
  VERDICT,
} from '../eligibility.js';

const COMP = {
  country: { behavior: 'exclu', allowed: ['FR', 'DE'] },
  created_after: { behavior: 'exclu', date: '2020-01-01' },
  revenue_max: { behavior: 'flag', threshold: 500000 },
};

// — Merge mécanique —

test('override vide → règles compétition inchangées', () => {
  assert.deepEqual(mergeEligibilityRules(COMP, {}), COMP);
  assert.deepEqual(mergeEligibilityRules(COMP, null), COMP);
  assert.deepEqual(mergeEligibilityRules(COMP, undefined), COMP);
});

test('override d’un critère → remplace le bloc ENTIER (shallow, pas de merge profond)', () => {
  const out = mergeEligibilityRules(COMP, { created_after: { behavior: 'exclu', date: '2021-06-01' } });
  assert.deepEqual(out.created_after, { behavior: 'exclu', date: '2021-06-01' });
  // les autres critères restent hérités
  assert.deepEqual(out.country, COMP.country);
  assert.deepEqual(out.revenue_max, COMP.revenue_max);
});

test('override ajoute un critère absent de la compétition', () => {
  const out = mergeEligibilityRules(COMP, { raised_max: { behavior: 'flag', threshold: 800000 } });
  assert.deepEqual(out.raised_max, { behavior: 'flag', threshold: 800000 });
  assert.equal(Object.keys(out).length, 4);
});

test('clé manquante dans l’override → critère hérité (pas de merge profond intra-critère)', () => {
  // override ne porte QUE behavior pour revenue_max : shallow → on perd threshold (voulu).
  const out = mergeEligibilityRules(COMP, { revenue_max: { behavior: 'exclu' } });
  assert.deepEqual(out.revenue_max, { behavior: 'exclu' });
});

test('ne mute aucun argument', () => {
  const comp = { country: { behavior: 'exclu', allowed: ['FR'] } };
  const ov = { country: { behavior: 'off' } };
  const snapshotComp = JSON.stringify(comp);
  const snapshotOv = JSON.stringify(ov);
  mergeEligibilityRules(comp, ov);
  assert.equal(JSON.stringify(comp), snapshotComp);
  assert.equal(JSON.stringify(ov), snapshotOv);
});

test('entrées non-objet → traitées comme {} (compétition pure / défensif)', () => {
  assert.deepEqual(mergeEligibilityRules(null, null), {});
  assert.deepEqual(mergeEligibilityRules(COMP, ['x']), COMP);
  assert.deepEqual(mergeEligibilityRules('nope', { country: { behavior: 'off' } }), { country: { behavior: 'off' } });
});

// — Intégration avec evaluateEligibility (le merge a un effet réel) —

const US_STARTUP = {
  country: 'US',
  creation_date: '2022-01-01',
  last_revenue: 100000,
  amount_raised: 0,
  registration_number: '552 100 554',
  founders_majority: true,
  pitch_deck_path: 'x',
  exec_summary_path: 'y',
};

test('sans override : startup US exclue (country exclu)', () => {
  const { verdict } = evaluateEligibility(US_STARTUP, mergeEligibilityRules(COMP, {}));
  assert.equal(verdict, VERDICT.EXCLUDED);
});

test('club DÉSACTIVE le critère pays (behavior:off) → la startup US n’est plus exclue', () => {
  const effective = mergeEligibilityRules(COMP, { country: { behavior: 'off' } });
  const { verdict } = evaluateEligibility(US_STARTUP, effective);
  assert.equal(verdict, VERDICT.ELIGIBLE);
});

test('club ÉLARGIT la liste pays → US accepté', () => {
  const effective = mergeEligibilityRules(COMP, { country: { behavior: 'exclu', allowed: ['FR', 'DE', 'US'] } });
  const { verdict } = evaluateEligibility(US_STARTUP, effective);
  assert.equal(verdict, VERDICT.ELIGIBLE);
});

test('club DURCIT un seuil (revenue_max flag→exclu, seuil plus bas) → la startup flag/exclue', () => {
  const richStartup = { ...US_STARTUP, country: 'FR', last_revenue: 400000 };
  // compétition : 500K flag → 400K passe (eligible).
  assert.equal(evaluateEligibility(richStartup, mergeEligibilityRules(COMP, {})).verdict, VERDICT.ELIGIBLE);
  // club : seuil 300K exclu → 400K dépasse → exclu.
  const effective = mergeEligibilityRules(COMP, { revenue_max: { behavior: 'exclu', threshold: 300000 } });
  assert.equal(evaluateEligibility(richStartup, effective).verdict, VERDICT.EXCLUDED);
});
