import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionDeckHtml } from '../buildSessionDeckHtml.js';

const MODEL = {
  sessionName: 'Session 5 Greentech',
  theme: 'Greentech & Environment',
  dateLabel: 'Thursday May 21, 2026',
  timeLabel: '6 PM',
  specialPrize: 'Impact Prize',
  agenda: ['Welcome', 'Pitches', 'Deliberation'],
  criteria: [
    { name: 'Value Proposition', tagline: 'Clear problem, real need.' },
    { name: 'Market & Traction', tagline: 'Size and momentum.' },
  ],
  jury: ['Alice Martin', 'Bob <b>Dupont</b>'],
  startups: [
    { name: 'Maa Biodiversity', founder: 'Aristide' },
    { name: 'reLi Energy', founder: 'Laura' },
  ],
};

test('document HTML autonome', () => {
  const html = buildSessionDeckHtml(MODEL);
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<\/html>\s*$/);
});

test('séquence des slides dans l’ordre', () => {
  const html = buildSessionDeckHtml(MODEL);
  const ids = [...html.matchAll(/id="(s-[a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids.slice(0, 8), [
    's-wait', 's-splash', 's-special', 's-agenda',
    's-lineup', 's-jury', 's-scoring', 's-ready',
  ]);
  assert.ok(ids.includes('s-trans-1'));
  assert.ok(ids.includes('s-qa-1'));
  assert.ok(ids.includes('s-trans-2'));
  assert.ok(ids.includes('s-qa-2'));
  assert.equal(ids[ids.length - 1], 's-end');
});

test('N startups dynamiques : une paire trans/qa par startup', () => {
  const html = buildSessionDeckHtml(MODEL);
  assert.equal((html.match(/id="s-trans-\d+"/g) || []).length, 2);
  assert.equal((html.match(/id="s-qa-\d+"/g) || []).length, 2);
});

test('lineup ordonné avec fondateur', () => {
  const html = buildSessionDeckHtml(MODEL);
  const iMaa = html.indexOf('Maa Biodiversity');
  const iReli = html.indexOf('reLi Energy');
  assert.ok(iMaa > -1 && iReli > -1 && iMaa < iReli);
  assert.match(html, /Aristide/);
});

test('échappement HTML strict des données', () => {
  const html = buildSessionDeckHtml(MODEL);
  assert.match(html, /Bob &lt;b&gt;Dupont&lt;\/b&gt;/);
  assert.ok(!html.includes('Bob <b>Dupont</b>'));
});

test('N=1 startup : une seule paire', () => {
  const html = buildSessionDeckHtml({ ...MODEL, startups: [{ name: 'Solo', founder: 'X' }] });
  assert.equal((html.match(/id="s-trans-\d+"/g) || []).length, 1);
});

test('N=0 startup : pas de paire, document valide', () => {
  const html = buildSessionDeckHtml({ ...MODEL, startups: [] });
  assert.equal((html.match(/id="s-trans-\d+"/g) || []).length, 0);
  assert.match(html, /id="s-end"/);
});
