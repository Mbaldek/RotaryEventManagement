// Tests purs (node --test, ESM) de l'orchestration des emails d'ordre de passage.
// Couvre : (a) garde-fou running_order_incomplete ; (b) un payload par startup
// avec email, trié par pitch_order, langue + ordinal + club_id + estimated_time ;
// (c) startups sans email ignorées.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRunningOrderSends } from '../runningOrderEmails.js';

const SESSION = {
  name: 'Session 5 — GreenTech',
  session_date: '2026-05-12',
  club_id: 'club-paris',
  config: { start_time: '18:30' },
};

test('throws running_order_incomplete with missingCount when any startup lacks pitch_order', () => {
  const startups = [
    { id: 'a', name: 'Alpha', email: 'a@x.io', preferred_lang: 'fr', pitch_order: 1 },
    { id: 'b', name: 'Beta', email: 'b@x.io', preferred_lang: 'en', pitch_order: null },
    { id: 'c', name: 'Gamma', email: 'c@x.io', preferred_lang: 'de' /* no pitch_order */ },
  ];
  assert.throws(
    () => buildRunningOrderSends(SESSION, startups),
    (err) => {
      assert.equal(err.message, 'running_order_incomplete');
      assert.equal(err.missingCount, 2);
      return true;
    },
  );
});

test('builds one payload per startup with email, sorted by pitch_order, with right lang/ordinal/club_id/time', () => {
  const startups = [
    { id: 'c', name: 'Gamma', contact_person: 'Carla', email: 'c@x.io', preferred_lang: 'de', pitch_order: 3 },
    { id: 'a', name: 'Alpha', contact_person: 'Anna', email: 'a@x.io', preferred_lang: 'fr', pitch_order: 1 },
    { id: 'b', name: 'Beta', contact_person: 'Bob', email: 'b@x.io', preferred_lang: 'en', pitch_order: 2 },
  ];
  const sends = buildRunningOrderSends(SESSION, startups);
  assert.equal(sends.length, 3);

  // Trié par pitch_order croissant.
  assert.deepEqual(sends.map((s) => s.recipientEmail), ['a@x.io', 'b@x.io', 'c@x.io']);

  // 1ère : fr, ordinal '1er', 18:30.
  assert.equal(sends[0].lang, 'fr');
  assert.equal(sends[0].recipientName, 'Anna');
  assert.equal(sends[0].data.running_order, '1er');
  assert.equal(sends[0].data.estimated_time, '18:30');
  assert.equal(sends[0].data.club_id, 'club-paris');
  assert.equal(sends[0].data.session_name, 'Session 5 — GreenTech');
  assert.equal(sends[0].data.session_date, '2026-05-12');

  // 2ème : en, ordinal '2nd', 18:50 (start + 1*20).
  assert.equal(sends[1].lang, 'en');
  assert.equal(sends[1].data.running_order, '2nd');
  assert.equal(sends[1].data.estimated_time, '18:50');

  // 3ème : de, ordinal '3.', 19:10 (start + 2*20).
  assert.equal(sends[2].lang, 'de');
  assert.equal(sends[2].data.running_order, '3.');
  assert.equal(sends[2].data.estimated_time, '19:10');
  assert.equal(sends[2].data.club_id, 'club-paris');
});

test('skips startups without an email', () => {
  const startups = [
    { id: 'a', name: 'Alpha', email: 'a@x.io', preferred_lang: 'fr', pitch_order: 1 },
    { id: 'b', name: 'Beta', email: '', preferred_lang: 'en', pitch_order: 2 },
    { id: 'c', name: 'Gamma', email: null, preferred_lang: 'de', pitch_order: 3 },
  ];
  const sends = buildRunningOrderSends(SESSION, startups);
  assert.equal(sends.length, 1);
  assert.equal(sends[0].recipientEmail, 'a@x.io');
});

test('falls back lang to fr and recipientName to name when missing', () => {
  const startups = [
    { id: 'a', name: 'Alpha', email: 'a@x.io', pitch_order: 1 },
  ];
  const sends = buildRunningOrderSends(SESSION, startups);
  assert.equal(sends[0].lang, 'fr');
  assert.equal(sends[0].recipientName, 'Alpha');
});

test('estimated_time falls back to em dash when start_time missing', () => {
  const session = { ...SESSION, config: {} };
  const startups = [{ id: 'a', name: 'Alpha', email: 'a@x.io', preferred_lang: 'fr', pitch_order: 1 }];
  const sends = buildRunningOrderSends(session, startups);
  assert.equal(sends[0].data.estimated_time, '—');
});
