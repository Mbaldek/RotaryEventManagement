# Club Cockpit — Modes Préparation/Pilotage + Bloc Dashboard Sessions (Lot 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire du *mode* (Préparation vs Pilotage) l'axe de premier niveau du Club Cockpit, ajouter un bloc dashboard de pilotage des sessions, et poser une coquille « ouvrir une session » qui prépare la session console (#3).

**Architecture:** La logique pure (résolution de mode, regroupement d'onglets, mapping des métriques par session) vit dans `src/lib/rsa/club-cockpit/` et est couverte par des tests vitest. Les composants React (`PilotageOverview`, `SessionShell`) et le câblage de `ClubCockpit` sont vérifiés par `lint` + `build` + un smoke test navigateur. Aucune migration SQL.

**Tech Stack:** React 18, Vite, react-router-dom (useSearchParams), TanStack Query, Supabase JS, framer-motion, tokens design Élysée (`@/components/design/tokens`), vitest (node env, glob `src/lib/rsa/**/*.test.js`).

**Spec source:** [docs/blueprints/club-cockpit-modes-pilotage.md](../../blueprints/club-cockpit-modes-pilotage.md)

---

## File Structure

| Fichier | Responsabilité | Action |
|---|---|---|
| `src/lib/rsa/club-cockpit/modes.js` | Constantes modes + arrays d'onglets + résolution mode/onglet (pur) | Create |
| `src/lib/rsa/club-cockpit/modes.test.js` | Tests du module modes | Create |
| `src/lib/rsa/club-cockpit/metrics.js` | `mapSessionMetrics` : rows bruts → métriques par session (pur) | Create |
| `src/lib/rsa/club-cockpit/metrics.test.js` | Tests du mapper | Create |
| `src/components/rsa/admin/platform/club/i18n.js` | Labels modes + onglet pilotage + coquille ; retire `TAB_IDS` plat ; renomme `setup`→« Sessions » | Modify |
| `src/components/rsa/admin/platform/club/useClub.js` | Hook `useClubSessionMetrics` + clé `sessionMetrics` | Modify |
| `src/components/rsa/admin/platform/club/tabs/PilotageOverview.jsx` | Header + KPI rail + timeline sessions | Create |
| `src/components/rsa/admin/platform/club/session/SessionShell.jsx` | Coquille session : header + 6 cartes | Create |
| `src/components/rsa/admin/platform/club/ClubCockpit.jsx` | État `?mode=`, mode switch, onglets par mode, montage Pilotage/Coquille | Modify |

---

## Task 1: Pure module `modes.js` (résolution mode + regroupement onglets)

**Files:**
- Create: `src/lib/rsa/club-cockpit/modes.js`
- Test: `src/lib/rsa/club-cockpit/modes.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/lib/rsa/club-cockpit/modes.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLUB_MODES, PREP_TABS, PILOTAGE_TABS,
  resolveClubMode, tabsForMode, modeForTab, firstTabOf, reconcileTab,
} from './modes.js';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/rsa/club-cockpit/modes.test.js`
Expected: FAIL — `Cannot find module './modes.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/rsa/club-cockpit/modes.js`:

```js
// Logique pure du Club Cockpit : axe de mode (Préparation/Pilotage) et
// regroupement des onglets par mode. Aucune dépendance React/Supabase — testable
// en isolation (vitest, node env). Les LABELS restent dans components/club/i18n.js
// (CLUB_TABS), keyés par les ids définis ici.

export const CLUB_MODES = { PREP: 'prep', PILOTAGE: 'pilotage' };

// Onglets de configuration (mode Préparation).
export const PREP_TABS = ['setup', 'team', 'rules', 'prizes', 'jury_applications'];

// Onglets de suivi/pilotage (mode Pilotage). 'pilotage' = landing dashboard.
export const PILOTAGE_TABS = ['pilotage', 'live', 'results', 'analytics', 'comms'];

export function isClubMode(m) {
  return m === CLUB_MODES.PREP || m === CLUB_MODES.PILOTAGE;
}

// urlMode (?mode=) prime s'il est valide ; sinon défaut intelligent : une édition
// 'open' (compétition live) atterrit en Pilotage, sinon en Préparation.
export function resolveClubMode(urlMode, edition) {
  if (isClubMode(urlMode)) return urlMode;
  return edition?.status === 'open' ? CLUB_MODES.PILOTAGE : CLUB_MODES.PREP;
}

export function tabsForMode(mode) {
  return mode === CLUB_MODES.PILOTAGE ? PILOTAGE_TABS : PREP_TABS;
}

export function modeForTab(tabId) {
  if (PILOTAGE_TABS.includes(tabId)) return CLUB_MODES.PILOTAGE;
  if (PREP_TABS.includes(tabId)) return CLUB_MODES.PREP;
  return null;
}

export function firstTabOf(mode) {
  return tabsForMode(mode)[0];
}

// Garde l'onglet courant s'il appartient au mode cible, sinon retombe sur le 1er
// onglet du mode (utilisé quand on bascule de mode).
export function reconcileTab(tabId, mode) {
  return modeForTab(tabId) === mode ? tabId : firstTabOf(mode);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/rsa/club-cockpit/modes.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rsa/club-cockpit/modes.js src/lib/rsa/club-cockpit/modes.test.js
git commit -m "feat(club-cockpit): logique pure modes Préparation/Pilotage + regroupement onglets"
```

---

## Task 2: Pure module `metrics.js` (métriques par session)

**Files:**
- Create: `src/lib/rsa/club-cockpit/metrics.js`
- Test: `src/lib/rsa/club-cockpit/metrics.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/lib/rsa/club-cockpit/metrics.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapSessionMetrics } from './metrics.js';

test('agrège startups par session_id', () => {
  const out = mapSessionMetrics({
    startupRows: [
      { id: 'a', session_id: 's1' },
      { id: 'b', session_id: 's1' },
      { id: 'c', session_id: 's2' },
    ],
    juryRows: [],
  });
  assert.equal(out.s1.startups, 2);
  assert.equal(out.s2.startups, 1);
});

test('compte les jurés UNIQUES par session (dédoublonne jury_user_id)', () => {
  const out = mapSessionMetrics({
    startupRows: [],
    juryRows: [
      { jury_user_id: 'u1', session_id: 's1' },
      { jury_user_id: 'u1', session_id: 's1' }, // doublon
      { jury_user_id: 'u2', session_id: 's1' },
      { jury_user_id: 'u3', session_id: 's2' },
    ],
  });
  assert.equal(out.s1.jurors, 2);
  assert.equal(out.s2.jurors, 1);
});

test('session sans données -> absente de la map (le composant lira via défaut)', () => {
  const out = mapSessionMetrics({ startupRows: [], juryRows: [] });
  assert.deepEqual(out, {});
});

test('ignore les lignes sans session_id', () => {
  const out = mapSessionMetrics({
    startupRows: [{ id: 'a', session_id: null }],
    juryRows: [{ jury_user_id: 'u1', session_id: null }],
  });
  assert.deepEqual(out, {});
});

test('entrées par défaut tolérantes : startups ET jurors initialisés', () => {
  const out = mapSessionMetrics({
    startupRows: [{ id: 'a', session_id: 's1' }],
    juryRows: [{ jury_user_id: 'u1', session_id: 's2' }],
  });
  assert.equal(out.s1.jurors, 0);
  assert.equal(out.s2.startups, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/rsa/club-cockpit/metrics.test.js`
Expected: FAIL — `Cannot find module './metrics.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/rsa/club-cockpit/metrics.js`:

```js
// Mapper pur : transforme des lignes brutes club-scoped en métriques par session.
// Lot 1 = startups/session (startups.session_id) + jurés uniques/session
// (platform_jury_assignments). Scoring/prep déférés au #3 (pas de source fiable).

export function mapSessionMetrics({ startupRows = [], juryRows = [] }) {
  const out = {};
  const ensure = (sid) => {
    if (!out[sid]) out[sid] = { startups: 0, jurors: 0 };
    return out[sid];
  };

  for (const r of startupRows) {
    if (!r.session_id) continue;
    ensure(r.session_id).startups += 1;
  }

  // Jurés uniques par session : un même jury_user_id sur la même session ne compte
  // qu'une fois.
  const seen = {};
  for (const r of juryRows) {
    if (!r.session_id) continue;
    ensure(r.session_id); // garantit l'entrée même si 0 startup
    if (!seen[r.session_id]) seen[r.session_id] = new Set();
    seen[r.session_id].add(r.jury_user_id);
  }
  for (const sid of Object.keys(seen)) {
    out[sid].jurors = seen[sid].size;
  }

  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/rsa/club-cockpit/metrics.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rsa/club-cockpit/metrics.js src/lib/rsa/club-cockpit/metrics.test.js
git commit -m "feat(club-cockpit): mapper pur métriques par session (startups + jurés)"
```

---

## Task 3: i18n — labels modes, onglet pilotage, coquille

**Files:**
- Modify: `src/components/rsa/admin/platform/club/i18n.js`

- [ ] **Step 1: Renommer le label `setup` (Préparation montre « Sessions »)**

Dans `CLUB_TABS`, remplacer la ligne `setup` :

```js
  setup:              { fr: 'Sessions',          en: 'Sessions',       de: 'Sessions' },
```

Et ajouter l'onglet pilotage juste après `setup` :

```js
  pilotage:           { fr: "Vue d'ensemble",    en: 'Overview',       de: 'Übersicht' },
```

- [ ] **Step 2: Ajouter les labels de mode dans `CLUB_UI`**

Ajouter dans l'objet `CLUB_UI` (après la clé `session`) :

```js
  modeLabel:     { fr: 'Mode',                 en: 'Mode',                  de: 'Modus' },
  modePrep:      { fr: 'Préparation',          en: 'Preparation',           de: 'Vorbereitung' },
  modePilotage:  { fr: 'Pilotage',             en: 'Pilotage',              de: 'Steuerung' },
```

- [ ] **Step 3: Retirer l'export `TAB_IDS` plat (remplacé par modes.js)**

Supprimer le bloc :

```js
// Note 2026-05-29 — équipe D "kill extensions" : retrait des onglets 'extensions'
// et 'marketplace' (archi droppée intégralement, plus de tab catalogue/install).
export const TAB_IDS = ['setup', 'live', 'results', 'team', 'jury_applications', 'rules', 'prizes', 'analytics', 'comms'];
```

(Le regroupement par mode vit désormais dans `src/lib/rsa/club-cockpit/modes.js`.)

- [ ] **Step 4: Ajouter les dictionnaires PilotageOverview + SessionShell**

Ajouter en fin de fichier :

```js
// ── Pilotage (mode suivi) ────────────────────────────────────────────────────
export const CLUB_PILOTAGE = {
  eyebrow:       { fr: 'Pilotage',                      en: 'Pilotage',             de: 'Steuerung' },
  title:         { fr: "Vue d'ensemble des sessions",   en: 'Sessions overview',    de: 'Sessions-Übersicht' },
  sessionsHead:  { fr: 'Sessions',                      en: 'Sessions',             de: 'Sessions' },
  empty:         { fr: 'Aucune session pour cette compétition.', en: 'No sessions for this competition.', de: 'Keine Sessions für diesen Wettbewerb.' },
  open:          { fr: 'Ouvrir',                        en: 'Open',                 de: 'Öffnen' },
  startupsUnit:  { fr: 'startups',                      en: 'startups',             de: 'Startups' },
  jurorsUnit:    { fr: 'jurés',                         en: 'jurors',               de: 'Juroren' },
  // KPI rail
  kpiSessions:   { fr: 'Sessions',                      en: 'Sessions',             de: 'Sessions' },
  kpiLive:       { fr: 'En direct',                     en: 'Live',                 de: 'Live' },
  kpiDraft:      { fr: 'Brouillon',                     en: 'Draft',                de: 'Entwurf' },
  kpiPublished:  { fr: 'Publiées',                      en: 'Published',            de: 'Veröffentlicht' },
  kpiStartups:   { fr: 'Startups',                      en: 'Startups',             de: 'Startups' },
  kpiJurors:     { fr: 'Jurés assignés',                en: 'Assigned jurors',      de: 'Zugewiesene Juroren' },
  kpiCandidates: { fr: 'Candidatures',                  en: 'Applications',         de: 'Bewerbungen' },
};

// ── Coquille session (socle de la session console #3) ────────────────────────
export const CLUB_SESSION_SHELL = {
  back:           { fr: 'Retour au pilotage',  en: 'Back to pilotage',  de: 'Zurück zur Steuerung' },
  soon:           { fr: 'Bientôt',             en: 'Soon',              de: 'Bald' },
  cardStartups:   { fr: 'Startups',            en: 'Startups',          de: 'Startups' },
  cardJury:       { fr: 'Jury',                en: 'Jury',              de: 'Jury' },
  cardScoring:    { fr: 'Scoring live',        en: 'Live scoring',      de: 'Live-Scoring' },
  cardPrep:       { fr: 'Préparation',         en: 'Preparation',       de: 'Vorbereitung' },
  cardPresentation:{ fr: 'Présentation',       en: 'Presentation',      de: 'Präsentation' },
  cardPreread:    { fr: 'Pré-read decks',      en: 'Pre-read decks',    de: 'Pre-Read-Decks' },
  jurorsAssigned: { fr: 'jurés assignés',      en: 'assigned jurors',   de: 'zugewiesene Juroren' },
  startupsInPlay: { fr: 'en lice',             en: 'in play',           de: 'im Rennen' },
  viewJury:       { fr: 'Voir équipe jury',    en: 'View jury team',    de: 'Jury-Team ansehen' },
  openLive:       { fr: 'Ouvrir En direct',    en: 'Open Live',         de: 'Live öffnen' },
  sessionResults: { fr: 'Résultats de la session', en: 'Session results', de: 'Session-Ergebnisse' },
  prepHint:       { fr: 'checklist de préparation', en: 'preparation checklist', de: 'Vorbereitungs-Checkliste' },
  presentationHint:{ fr: 'builder mode live',  en: 'live builder',      de: 'Live-Builder' },
  prereadHint:    { fr: 'pack consolidé jury', en: 'consolidated jury pack', de: 'konsolidiertes Jury-Paket' },
};
```

- [ ] **Step 5: Verify lint passes**

Run: `npm run lint`
Expected: PASS (no errors for i18n.js). Note : `TAB_IDS` n'est plus exporté — Task 6 met à jour son unique consommateur (`ClubCockpit.jsx`). Si le lint tourne avant Task 6, une erreur d'import non résolu peut apparaître dans ClubCockpit ; c'est attendu et corrigé en Task 6.

- [ ] **Step 6: Commit**

```bash
git add src/components/rsa/admin/platform/club/i18n.js
git commit -m "feat(club-cockpit): i18n modes + onglet pilotage + coquille session (FR/EN/DE)"
```

---

## Task 4: Hook `useClubSessionMetrics`

**Files:**
- Modify: `src/components/rsa/admin/platform/club/useClub.js`

- [ ] **Step 1: Ajouter la clé de cache**

Dans l'objet `CLUB_KEYS` (vers la ligne 28-35), ajouter :

```js
  sessionMetrics:     (eid, cid) => ['rsa', 'club', 'session-metrics', eid, cid],
```

- [ ] **Step 2: Importer le mapper pur**

En haut du fichier, après l'import des entités, ajouter :

```js
import { mapSessionMetrics } from '@/lib/rsa/club-cockpit/metrics';
```

- [ ] **Step 3: Ajouter le hook en fin de fichier**

```js
// ── Métriques par session (timeline du Pilotage) ───────────────────────────
// Deux requêtes club-scoped (startups affectées à une session + assignations
// jury), mappées par le helper pur mapSessionMetrics. sessionIds vient du parent
// (useClubSessions) pour scoper la requête jury.
export function useClubSessionMetrics(editionId, clubId, sessionIds) {
  return useQuery({
    queryKey: CLUB_KEYS.sessionMetrics(editionId, clubId),
    queryFn: async () => {
      if (!editionId || !clubId || !sessionIds?.length) return {};
      const [startupsRes, juryRes] = await Promise.all([
        supabase
          .from('startups')
          .select('id, session_id')
          .eq('edition_id', editionId)
          .eq('club_id', clubId)
          .not('session_id', 'is', null),
        supabase
          .from('platform_jury_assignments')
          .select('jury_user_id, session_id')
          .in('session_id', sessionIds),
      ]);
      if (startupsRes.error) throw startupsRes.error;
      if (juryRes.error) throw juryRes.error;
      return mapSessionMetrics({
        startupRows: startupsRes.data || [],
        juryRows: juryRes.data || [],
      });
    },
    enabled: !!editionId && !!clubId && !!sessionIds?.length,
    staleTime: 30 * 1000,
  });
}
```

- [ ] **Step 4: Verify build (résolution d'alias + import)**

Run: `npm run build`
Expected: PASS (le bundle compile ; l'import `@/lib/rsa/club-cockpit/metrics` résout).

- [ ] **Step 5: Commit**

```bash
git add src/components/rsa/admin/platform/club/useClub.js
git commit -m "feat(club-cockpit): hook useClubSessionMetrics (startups + jurés par session)"
```

---

## Task 5: Composant `PilotageOverview.jsx`

**Files:**
- Create: `src/components/rsa/admin/platform/club/tabs/PilotageOverview.jsx`

- [ ] **Step 1: Écrire le composant complet**

Create `src/components/rsa/admin/platform/club/tabs/PilotageOverview.jsx`:

```jsx
// PilotageOverview — landing du mode Pilotage du Club Cockpit (Lot 1).
//
// Header éditorial (barre or + eyebrow + titre Playfair) + KPI rail collant à
// droite + timeline des sessions (1 ligne/session, pattern L-Numbered-Hairline)
// avec compteurs startups/jurés et bouton « Ouvrir » → monte la coquille session.
//
// Métriques par session via useClubSessionMetrics ; compteur '—' si indisponible
// (jamais de fausse donnée). Scoring/prep déférés au #3.

import React, { useMemo } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { GOLD, NAVY, INK, MUTED, CREAM2, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { StatusPill } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { CLUB_PILOTAGE } from '../i18n';
import { useClubSessionMetrics, useClubStartupsSummary, useClubJuryAssignmentsCount } from '../useClub';

function KpiRow({ label, value, accent }) {
  return (
    <div
      className="flex items-baseline justify-between gap-3 py-2.5"
      style={{ borderTop: `1px solid ${CREAM2}` }}
    >
      <span className="uppercase tracking-[0.14em] text-[10.5px]" style={{ color: MUTED }}>
        {label}
      </span>
      <span
        className="text-[18px] tabular-nums"
        style={{ fontFamily: SERIF, color: accent || NAVY, fontWeight: 500 }}
      >
        {value}
      </span>
    </div>
  );
}

export default function PilotageOverview({ edition, clubId, sessions, isSessionsLoading, onSelectSession }) {
  const { t } = useLang();

  const ordered = useMemo(
    () => [...(sessions || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [sessions],
  );
  const sessionIds = useMemo(() => ordered.map((s) => s.id), [ordered]);

  const metricsQ = useClubSessionMetrics(edition?.id, clubId, sessionIds);
  const metrics = metricsQ.data || {};
  const startupsSum = useClubStartupsSummary(edition?.id, clubId);
  const jurySum = useClubJuryAssignmentsCount(edition?.id, clubId);

  const statusOf = (s) => s.config?.status || 'draft';
  const counts = {
    total: ordered.length,
    live: ordered.filter((s) => statusOf(s) === 'live').length,
    draft: ordered.filter((s) => statusOf(s) === 'draft').length,
    published: ordered.filter((s) => statusOf(s) === 'published').length,
  };
  const totalStartups = startupsSum.data?.__total__ || 0;
  const uniqueJurors = jurySum.data?.uniqueJurors || 0;

  const num = (v) => (typeof v === 'number' ? v : '—');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(220px,260px)] gap-6">
      {/* Colonne principale */}
      <div>
        {/* Header éditorial */}
        <div className="flex items-center gap-2.5 mb-2">
          <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
          <span className="uppercase text-[10px] tracking-[0.18em] font-medium" style={{ color: GOLD }}>
            {t(CLUB_PILOTAGE.eyebrow)}
          </span>
        </div>
        <h3 className="text-[22px] leading-tight mb-4" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(CLUB_PILOTAGE.title)}
        </h3>

        {/* Timeline sessions */}
        <div className="uppercase tracking-[0.14em] text-[10.5px] mb-2" style={{ color: MUTED }}>
          {t(CLUB_PILOTAGE.sessionsHead)}
        </div>

        {isSessionsLoading && (
          <div className="py-8 flex justify-center" role="status" aria-live="polite">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
          </div>
        )}

        {!isSessionsLoading && ordered.length === 0 && (
          <p className="text-[13px] py-3" style={{ color: MUTED }}>{t(CLUB_PILOTAGE.empty)}</p>
        )}

        {!isSessionsLoading && ordered.length > 0 && (
          <ul className="divide-y" style={{ borderColor: CREAM2 }}>
            {ordered.map((s) => {
              const m = metrics[s.id];
              const startups = m ? m.startups : (metricsQ.isLoading ? '…' : '—');
              const jurors = m ? m.jurors : (metricsQ.isLoading ? '…' : '—');
              return (
                <li key={s.id} className="py-3 flex items-start gap-3 flex-wrap">
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] tabular-nums shrink-0"
                    style={{ background: '#fdf6e8', color: NAVY, border: `1px solid ${CREAM2}` }}
                  >
                    {s.position ?? 0}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-medium" style={{ color: NAVY }}>{s.name}</span>
                      <StatusPill status={s.config?.status || 'draft'} kind="jury" />
                      <span className="text-[11.5px]" style={{ color: MUTED }}>· {s.kind}</span>
                    </div>
                    <p className="text-[11.5px] mt-0.5" style={{ color: MUTED }}>
                      {s.session_date && <span>{s.session_date} · </span>}
                      {startups} {t(CLUB_PILOTAGE.startupsUnit)} · {jurors} {t(CLUB_PILOTAGE.jurorsUnit)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectSession?.(s.id)}
                    className={`inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-[4px] shrink-0 ${FOCUS_RING_CLASS}`}
                    style={{ background: NAVY, color: 'white' }}
                  >
                    {t(CLUB_PILOTAGE.open)} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* KPI rail */}
      <aside className="lg:sticky lg:top-4 self-start">
        <div
          className="rounded-[4px] px-4 py-1"
          style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
        >
          <KpiRow label={t(CLUB_PILOTAGE.kpiSessions)} value={counts.total} />
          <KpiRow label={t(CLUB_PILOTAGE.kpiLive)} value={counts.live} accent={GOLD} />
          <KpiRow label={t(CLUB_PILOTAGE.kpiDraft)} value={counts.draft} />
          <KpiRow label={t(CLUB_PILOTAGE.kpiPublished)} value={counts.published} />
          <KpiRow label={t(CLUB_PILOTAGE.kpiStartups)} value={num(totalStartups)} />
          <KpiRow label={t(CLUB_PILOTAGE.kpiJurors)} value={num(uniqueJurors)} />
          <KpiRow label={t(CLUB_PILOTAGE.kpiCandidates)} value={num(totalStartups)} />
        </div>
      </aside>
    </div>
  );
}
```

> Note : `kpiCandidates` et `kpiStartups` partagent `totalStartups` (les candidatures du club = ses startups, comme dans `ClubStatusStrip`). C'est intentionnel — pas de doublon de requête.

- [ ] **Step 2: Verify lint + build**

Run: `npm run lint`
Expected: PASS pour `PilotageOverview.jsx`.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/rsa/admin/platform/club/tabs/PilotageOverview.jsx
git commit -m "feat(club-cockpit): PilotageOverview (KPI rail + timeline sessions)"
```

---

## Task 6: Composant `SessionShell.jsx` (coquille)

**Files:**
- Create: `src/components/rsa/admin/platform/club/session/SessionShell.jsx`

- [ ] **Step 1: Écrire le composant complet**

Create `src/components/rsa/admin/platform/club/session/SessionShell.jsx`:

```jsx
// SessionShell — coquille « ouvrir une session » (Lot 1, socle de la session
// console #3). Header session + grille de 6 cartes : 3 deep-linkent vers
// l'existant (Jury / En direct / Résultats), 3 sont des stubs « bientôt » (#3).
//
// Rendu par ClubCockpit quand mode=pilotage ET ?session= défini ; remplace
// PilotageOverview dans le panel (montage in-place, pas de route séparée).

import React from 'react';
import { ArrowLeft, ArrowRight, Users, Activity, FileText, ClipboardList, Presentation, Trophy } from 'lucide-react';
import { GOLD, NAVY, INK, MUTED, CREAM2, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { StatusPill } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { CLUB_SESSION_SHELL } from '../i18n';
import { useClubSessionMetrics } from '../useClub';

function Card({ icon: Icon, title, line, action, soon, soonLabel }) {
  return (
    <div
      className="rounded-[4px] p-4 flex flex-col gap-2"
      style={{ background: soon ? TINT_ADMIN : 'white', border: `1px solid ${CREAM2}` }}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: soon ? MUTED : GOLD }} aria-hidden />
        <span className="text-[13px] font-medium" style={{ color: NAVY }}>{title}</span>
        {soon && (
          <span
            className="ml-auto text-[10px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-[3px]"
            style={{ color: MUTED, border: `1px solid ${CREAM2}` }}
          >
            {soonLabel}
          </span>
        )}
      </div>
      {line && <p className="text-[12px]" style={{ color: INK }}>{line}</p>}
      {action}
    </div>
  );
}

export default function SessionShell({ session, edition, clubId, onBack, onDeepLink }) {
  const { t } = useLang();
  const metricsQ = useClubSessionMetrics(edition?.id, clubId, session ? [session.id] : []);
  const m = metricsQ.data?.[session?.id];
  const startups = m ? m.startups : '—';
  const jurors = m ? m.jurors : '—';

  if (!session) return null;
  const cfg = session.config || {};
  const timeRange = cfg.start_time && cfg.end_time ? `${cfg.start_time}–${cfg.end_time}` : null;

  const linkBtn = (label, tab) => (
    <button
      type="button"
      onClick={() => onDeepLink?.(tab)}
      className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-[4px] self-start ${FOCUS_RING_CLASS}`}
      style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}
    >
      {label} <ArrowRight className="w-3.5 h-3.5" />
    </button>
  );

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className={`inline-flex items-center gap-1.5 text-[12px] mb-4 rounded-[2px] ${FOCUS_RING_CLASS}`}
        style={{ color: MUTED }}
      >
        <ArrowLeft className="w-3.5 h-3.5" /> {t(CLUB_SESSION_SHELL.back)}
      </button>

      {/* Header session */}
      <div className="flex items-center gap-2.5 mb-2">
        <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
        <span className="uppercase text-[10px] tracking-[0.18em] font-medium" style={{ color: GOLD }}>
          {`${session.position ?? 0} · ${session.kind}`}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-wrap mb-1">
        <h3 className="text-[22px] leading-tight" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {session.name}
        </h3>
        <StatusPill status={cfg.status || 'draft'} kind="jury" />
      </div>
      <p className="text-[12.5px] mb-5" style={{ color: MUTED }}>
        {session.theme && <span>{session.theme} · </span>}
        {session.session_date && <span>{session.session_date}</span>}
        {timeRange && <span> · {timeRange}</span>}
      </p>

      {/* Grille 6 cartes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card
          icon={FileText}
          title={t(CLUB_SESSION_SHELL.cardStartups)}
          line={`${startups} ${t(CLUB_SESSION_SHELL.startupsInPlay)}`}
          soon soonLabel={t(CLUB_SESSION_SHELL.soon)}
        />
        <Card
          icon={Users}
          title={t(CLUB_SESSION_SHELL.cardJury)}
          line={`${jurors} ${t(CLUB_SESSION_SHELL.jurorsAssigned)}`}
          action={linkBtn(t(CLUB_SESSION_SHELL.viewJury), 'team')}
        />
        <Card
          icon={Activity}
          title={t(CLUB_SESSION_SHELL.cardScoring)}
          action={linkBtn(t(CLUB_SESSION_SHELL.openLive), 'live')}
        />
        <Card
          icon={ClipboardList}
          title={t(CLUB_SESSION_SHELL.cardPrep)}
          line={t(CLUB_SESSION_SHELL.prepHint)}
          soon soonLabel={t(CLUB_SESSION_SHELL.soon)}
        />
        <Card
          icon={Presentation}
          title={t(CLUB_SESSION_SHELL.cardPresentation)}
          line={t(CLUB_SESSION_SHELL.presentationHint)}
          soon soonLabel={t(CLUB_SESSION_SHELL.soon)}
        />
        <Card
          icon={FileText}
          title={t(CLUB_SESSION_SHELL.cardPreread)}
          line={t(CLUB_SESSION_SHELL.prereadHint)}
          soon soonLabel={t(CLUB_SESSION_SHELL.soon)}
        />
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => onDeepLink?.('results')}
          className={`inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-[4px] ${FOCUS_RING_CLASS}`}
          style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}
        >
          <Trophy className="w-3.5 h-3.5" /> {t(CLUB_SESSION_SHELL.sessionResults)} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint + build**

Run: `npm run lint`
Expected: PASS pour `SessionShell.jsx`.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/rsa/admin/platform/club/session/SessionShell.jsx
git commit -m "feat(club-cockpit): SessionShell (coquille session, 3 deep-links + 3 stubs #3)"
```

---

## Task 7: Câbler `ClubCockpit.jsx` (mode state + switch + onglets par mode + montage)

**Files:**
- Modify: `src/components/rsa/admin/platform/club/ClubCockpit.jsx`

- [ ] **Step 1: Mettre à jour les imports**

Remplacer l'import i18n :

```js
import { CLUB_TABS, CLUB_UI } from './i18n';
```

(retire `TAB_IDS`, qui n'existe plus). Puis ajouter sous les imports existants :

```js
import { CLUB_MODES, resolveClubMode, tabsForMode, modeForTab, firstTabOf, reconcileTab } from '@/lib/rsa/club-cockpit/modes';
import PilotageOverview from './tabs/PilotageOverview';
import SessionShell from './session/SessionShell';
```

- [ ] **Step 2: Dériver le mode depuis l'URL + l'édition**

Juste après la ligne `const sessionId = params.get('session') || null;` (≈ ligne 67), avant les hooks data, **rien à changer** (l'édition n'est pas encore résolue ici). Le mode sera dérivé **après** `edition` (Step 4). On ajoute d'abord les setters.

Remplacer le `setTab` existant et ajouter `setMode` :

```js
  const setTab = (next) => {
    const p = new URLSearchParams(params);
    p.set('tab', next);
    setParams(p, { replace: true });
  };
  const setMode = (nextMode) => {
    const p = new URLSearchParams(params);
    p.set('mode', nextMode);
    // bascule l'onglet vers le 1er onglet du nouveau mode
    p.set('tab', firstTabOf(nextMode));
    p.delete('session'); // on quitte toute coquille quand on change de mode
    setParams(p, { replace: true });
  };
```

- [ ] **Step 3: Calculer mode + onglets effectifs après résolution de l'édition**

Après le `const edition = useMemo(...)` (≈ ligne 118-121), ajouter :

```js
  // Mode (Préparation/Pilotage) : ?mode= prime, sinon défaut selon edition.status.
  const mode = resolveClubMode(params.get('mode'), edition);
  const modeTabs = tabsForMode(mode);
  // L'onglet courant doit appartenir au mode ; sinon on retombe sur le 1er du mode.
  const activeTab = reconcileTab(tab, mode);
```

> À partir d'ici, **remplacer tous les usages de `tab` par `activeTab`** dans le rendu des panels (Step 6) et dans le bootstrap session.

- [ ] **Step 4: Adapter le bootstrap session au mode**

Remplacer le `useEffect` de bootstrap session (≈ lignes 133-141) :

```js
  // Bootstrap session : sur LIVE/RESULTS sans session, prend la 1re.
  useEffect(() => {
    if (sessionId || !sessions.length) return;
    if (activeTab === 'live' || activeTab === 'results') {
      const p = new URLSearchParams(params);
      p.set('session', sessions[0].id);
      setParams(p, { replace: true });
    }
     
  }, [sessionId, sessions.length, activeTab]);
```

- [ ] **Step 5: Insérer le mode switch (sous ClubStatusStrip, au-dessus de la filter row)**

Juste après `<ClubStatusStrip ... />` (≈ ligne 200) et avant le bloc `{/* Filter row ... */}`, insérer :

```jsx
      {/* Mode switch — axe de premier niveau : Préparation (config) / Pilotage (suivi). */}
      <div
        className="inline-flex items-center gap-1 p-1 rounded-[6px] mb-4"
        role="tablist"
        aria-label={t(CLUB_UI.modeLabel)}
        style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
      >
        {[
          { id: CLUB_MODES.PREP, label: t(CLUB_UI.modePrep) },
          { id: CLUB_MODES.PILOTAGE, label: t(CLUB_UI.modePilotage) },
        ].map((mo) => {
          const on = mode === mo.id;
          return (
            <button
              key={mo.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setMode(mo.id)}
              className={`px-3.5 py-1.5 text-[12.5px] rounded-[4px] transition-colors ${FOCUS_RING_CLASS}`}
              style={{
                background: on ? 'white' : 'transparent',
                color: on ? NAVY : MUTED,
                fontWeight: on ? 600 : 400,
                borderBottom: on ? `2px solid ${GOLD}` : '2px solid transparent',
              }}
            >
              {mo.label}
            </button>
          );
        })}
      </div>
```

- [ ] **Step 6: Brancher les onglets sur `modeTabs` + corriger les `aria`/panel ids sur `activeTab`**

Remplacer le bloc `CockpitTabs` (≈ lignes 252-258) :

```jsx
        <CockpitTabs
          idPrefix="club"
          items={modeTabs.map((id) => ({ id, label: t(CLUB_TABS[id]) }))}
          active={activeTab}
          onChange={setTab}
          ariaLabel={t(CLUB_UI.eyebrow)}
        />
```

Remplacer les attributs du panel (≈ lignes 262-267) `id`/`aria-labelledby` pour utiliser `activeTab` :

```jsx
      <div
        id={`club-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`club-tab-${activeTab}`}
        className="rounded-[4px] p-4 md:p-6"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
```

Et la `key` du `motion.div` (≈ ligne 279) : `key={activeTab}`.

- [ ] **Step 7: Remplacer les conditions de rendu des panels par `activeTab` + ajouter pilotage/coquille**

Remplacer l'intégralité du bloc `{tab === 'setup' && (...)}` … `{tab === 'analytics' && (...)}` (≈ lignes 285-326) par :

```jsx
              {activeTab === 'setup' && (
                <ClubSetupTab
                  edition={edition}
                  clubId={clubId}
                  sessions={sessions}
                  isSessionsLoading={sessionsQ.isLoading}
                  onSelectSession={setSession}
                />
              )}
              {activeTab === 'pilotage' && !sessionId && (
                <PilotageOverview
                  edition={edition}
                  clubId={clubId}
                  sessions={sessions}
                  isSessionsLoading={sessionsQ.isLoading}
                  onSelectSession={setSession}
                />
              )}
              {activeTab === 'pilotage' && sessionId && (
                <SessionShell
                  session={selectedSession}
                  edition={edition}
                  clubId={clubId}
                  onBack={() => setSession(null)}
                  onDeepLink={(nextTab) => {
                    const p = new URLSearchParams(params);
                    p.set('tab', nextTab); // live/results (pilotage) ou team (prep)
                    // Le mode DOIT suivre l'onglet cible : sinon reconcileTab le
                    // ramène au 1er onglet du mode courant (bounce). live/results
                    // restent en pilotage + gardent la session ; team bascule en prep.
                    const nm = modeForTab(nextTab);
                    if (nm) p.set('mode', nm);
                    setParams(p, { replace: true });
                  }}
                />
              )}
              {activeTab === 'live' && (
                <ClubLiveTab edition={edition} clubId={clubId} session={selectedSession} />
              )}
              {activeTab === 'results' && (
                <ClubResultsTab
                  edition={edition}
                  clubId={clubId}
                  session={selectedSession}
                  sessions={sessions}
                  onSelectSession={setSession}
                />
              )}
              {activeTab === 'team' && (
                <ClubTeamTab clubId={clubId} />
              )}
              {activeTab === 'jury_applications' && (
                <JuryApplicationsTab clubId={clubId} />
              )}
              {activeTab === 'rules' && (
                <ClubRulesTab edition={edition} clubId={clubId} />
              )}
              {activeTab === 'prizes' && (
                <PrizesList editionId={editionId} clubId={clubId} scope="club" />
              )}
              {activeTab === 'comms' && (
                <>
                  <CommunicatePanel editionId={editionId} clubId={clubId} />
                  <EmailStudio clubId={clubId} edition={edition} />
                </>
              )}
              {activeTab === 'analytics' && (
                <AnalyticsPanel scope="club" editionId={editionId} clubId={clubId} />
              )}
```

> Note : les deep-links de la coquille — **Scoring → `live`** et **Résultats → `results`** restent en mode Pilotage et conservent `?session=` (l'écran existant rend la session courante). La carte **Jury → `team`** bascule en mode **Préparation** (l'onglet Équipe gère la composition jury ; il n'existe pas encore d'écran jury par-session en Pilotage — ça arrive avec le #3). Ce basculement de mode est assumé pour Lot 1.

- [ ] **Step 8: Adapter la filter row session picker à `activeTab`**

Dans le bloc filter row (≈ ligne 224), remplacer la condition `(tab === 'live' || tab === 'results')` par `(activeTab === 'live' || activeTab === 'results')`.

- [ ] **Step 9: Verify lint + build**

Run: `npm run lint`
Expected: PASS (plus aucun import non résolu ; `TAB_IDS` n'est plus référencé).

Run: `npm run build`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/components/rsa/admin/platform/club/ClubCockpit.jsx
git commit -m "feat(club-cockpit): axe de mode Préparation/Pilotage + montage PilotageOverview/SessionShell"
```

---

## Task 8: Vérification d'ensemble (tests + smoke navigateur)

**Files:** aucun (vérification).

- [ ] **Step 1: Lancer toute la suite de tests pure**

Run: `npm test`
Expected: PASS — inclut `modes.test.js` (7) + `metrics.test.js` (5) + les tests rsa existants.

- [ ] **Step 2: Lint complet**

Run: `npm run lint`
Expected: PASS, 0 erreur.

- [ ] **Step 3: Build prod**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Smoke test navigateur (dev server)**

Démarrer `npm run dev` (port 5173). Naviguer vers le Club Cockpit de la compétition de test (`/Admin` → scope club, ex. *Test Paris Berlin 2027*). Vérifier :
  1. Le **mode switch** « Préparation | Pilotage » s'affiche sous la status strip.
  2. Édition `open` → atterrit en **Pilotage** ; édition draft → **Préparation** (ajuster une édition pour tester, ou forcer `?mode=`).
  3. Mode **Préparation** : onglets `Sessions · Équipe · Règles · Prix · Candidatures jury` ; l'onglet **Sessions** affiche bien `SessionsManager` (création/reset draft).
  4. Mode **Pilotage** : onglets `Vue d'ensemble · En direct · Résultats · Analytics · Comms` ; **Vue d'ensemble** montre le KPI rail + la timeline ; compteurs startups/jurés réels (ou `—`).
  5. **Ouvrir** sur une session → la **coquille** s'affiche (header + 6 cartes) ; les cartes Jury/Scoring/Résultats deep-linkent (et restent en mode Pilotage) ; les 3 stubs portent le badge « Bientôt ».
  6. **Retour au pilotage** revient à la Vue d'ensemble.
  7. URL : `?mode=`, `?tab=`, `?session=` reflètent l'état (deep-link rechargeable).

Expected : tous les points OK. Noter tout écart pour correction avant clôture.

- [ ] **Step 5: Commit final éventuel (corrections du smoke test)**

Si des correctifs ont été nécessaires :

```bash
git add -A
git commit -m "fix(club-cockpit): correctifs smoke test Lot 1 modes/pilotage"
```

---

## Self-Review (couverture spec)

- **#1 reorder → mode** : Tasks 1, 7 (axe de mode, Configuration sort du mode Pilotage). ✓
- **#2 bloc pilotage (KPI + timeline)** : Tasks 2, 4, 5. ✓
- **Coquille session + deep-links** : Tasks 3, 6, 7. ✓
- **Regroupement onglets par mode** : Tasks 1, 3, 7 (les 9 onglets + pilotage couverts, `TAB_IDS` retiré). ✓
- **Contrat data + dégradation `—`** : Tasks 2, 4, 5 (startups/jurés réels ; scoring/prep déférés #3). ✓
- **i18n FR/EN/DE** : Task 3. ✓
- **a11y mode switch (`role=tablist`/`aria-selected`)** : Task 7 Step 5. ✓
- **Pas de migration / pas de transition de statut ajoutée** : respecté (aucune tâche SQL). ✓
- **#3 parké** : SessionShell n'expose que des stubs ; aucun panneau réel. ✓
