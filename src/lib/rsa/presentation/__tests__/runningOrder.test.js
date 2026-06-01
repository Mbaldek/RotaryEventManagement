import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PITCH_SLOT_MINUTES, estimatedPitchTime, ordinal, slugify } from '../runningOrder.js';

test('PITCH_SLOT_MINUTES vaut 20 (format RSA)', () => {
  assert.equal(PITCH_SLOT_MINUTES, 20);
});

test('estimatedPitchTime : 1re startup = heure de début', () => {
  assert.equal(estimatedPitchTime('18:00', 1), '18:00');
});

test('estimatedPitchTime : 3e startup = +40 min', () => {
  assert.equal(estimatedPitchTime('18:00', 3), '18:40');
});

test('estimatedPitchTime : franchit l\'heure (rollover minutes)', () => {
  assert.equal(estimatedPitchTime('18:50', 2), '19:10');
});

test('estimatedPitchTime : slot custom', () => {
  assert.equal(estimatedPitchTime('09:00', 2, 30), '09:30');
});

test('estimatedPitchTime : start_time absent → null', () => {
  assert.equal(estimatedPitchTime(null, 2), null);
  assert.equal(estimatedPitchTime('', 2), null);
});

test('ordinal FR/EN/DE', () => {
  assert.equal(ordinal(1, 'fr'), '1er');
  assert.equal(ordinal(2, 'fr'), '2e');
  assert.equal(ordinal(1, 'en'), '1st');
  assert.equal(ordinal(2, 'en'), '2nd');
  assert.equal(ordinal(3, 'en'), '3rd');
  assert.equal(ordinal(4, 'en'), '4th');
  assert.equal(ordinal(2, 'de'), '2.');
});

test('slugify : minuscule, tirets, ascii', () => {
  assert.equal(slugify('Session 5 — Greentech & Co'), 'session-5-greentech-co');
});

test('estimatedPitchTime : order non-numérique → null', () => {
  assert.equal(estimatedPitchTime('18:00', undefined), null);
  assert.equal(estimatedPitchTime('18:00', NaN), null);
});

test('estimatedPitchTime : order <= 0 clampé à 1 (heure de début)', () => {
  assert.equal(estimatedPitchTime('18:00', 0), '18:00');
  assert.equal(estimatedPitchTime('18:00', -3), '18:00');
});

test('ordinal EN teens 11/12/13 → th', () => {
  assert.equal(ordinal(11, 'en'), '11th');
  assert.equal(ordinal(12, 'en'), '12th');
  assert.equal(ordinal(13, 'en'), '13th');
  assert.equal(ordinal(21, 'en'), '21st');
});

test('slugify : null / vide / tout-ponctuation → "session"', () => {
  assert.equal(slugify(null), 'session');
  assert.equal(slugify(''), 'session');
  assert.equal(slugify('---'), 'session');
});
