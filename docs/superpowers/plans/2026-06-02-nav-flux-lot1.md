# Nav-flux compétition — Lot 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le persona-switcher d'`Admin.jsx` par une nav-flux : un **Hub** de compétitions → une **coquille** avec barre de 3 phases (Préparation / Organisation / Pilotage), les phases pointant vers les écrans existants.

**Architecture:** Logique pure (état URL, phase par défaut, filtre hub par rôle) extraite dans `src/lib/platform/competitionShell.js` et testée en `node --test` (pattern `computePrimaryNav`). Composants React minces (`CompetitionHub`, `CompetitionShell`, `PhaseBar`) vérifiés par build. Préparation embarque le `CompetitionEditView` existant (c'est une `<section>`, pas une page) ; Organisation/Pilotage sont des lanceurs vers `/Selection` `/Jury` `/Resultats`. Le persona-switcher reste derrière un flag le temps du Lot 1.

**Tech Stack:** React 18 + Vite, react-router-dom (`useSearchParams`), TanStack Query, design tokens Élysée, `node --test`.

**Spec :** `docs/blueprints/nav-flux-competition.md` (§3 architecture, §5 Lot 1).

---

## File Structure

- **Create** `src/lib/platform/competitionShell.js` — helpers purs (PHASES, deriveDefaultPhase, parseShellState, isClubLensVisible, filterHubCompetitions).
- **Create** `src/lib/platform/__tests__/competitionShell.test.js` — tests node:test.
- **Create** `src/components/rsa/admin/platform/shell/PhaseBar.jsx` — barre 3 phases (réutilise CockpitTabs).
- **Create** `src/components/rsa/admin/platform/shell/CompetitionShell.jsx` — coquille (back link + PhaseBar + body par phase).
- **Create** `src/components/rsa/admin/platform/shell/PhaseLauncher.jsx` — panneau de cartes-lanceurs (Organisation/Pilotage Lot 1).
- **Create** `src/components/rsa/admin/platform/hub/CompetitionHub.jsx` — grille de cartes compétition.
- **Create** `src/components/rsa/admin/platform/hub/useHubCompetitions.js` — hook liste compétitions filtrée par rôle.
- **Modify** `src/pages/Admin.jsx` — routage hub ↔ coquille via `?competition=`, persona-switcher derrière flag.

---

## Task 1: Helpers purs de la coquille

**Files:**
- Create: `src/lib/platform/competitionShell.js`
- Test: `src/lib/platform/__tests__/competitionShell.test.js`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/platform/__tests__/competitionShell.test.js`
Expected: FAIL (`Cannot find module '../competitionShell.js'`).

- [ ] **Step 3: Write minimal implementation**

```js
// src/lib/platform/competitionShell.js
// Helpers PURS de la nav-flux compétition (état URL, phase par défaut, filtre
// hub par rôle). Aucune dépendance React/i18n — testables en node:test, à
// l'identique de computePrimaryNav.js. Les labels restent des dicos {fr,en,de}
// résolus par t() côté composant.

export const PHASES = [
  { id: 'prep',     label: { fr: 'Préparation',  en: 'Preparation', de: 'Vorbereitung' } },
  { id: 'orga',     label: { fr: 'Organisation', en: 'Organisation', de: 'Organisation' } },
  { id: 'pilotage', label: { fr: 'Pilotage',     en: 'Pilotage',     de: 'Steuerung' } },
];

export const PHASE_IDS = PHASES.map((p) => p.id);

// open -> pilotage (compétition en cours = on la pilote) ; sinon prep (setup).
export function deriveDefaultPhase(edition) {
  if (edition && edition.status === 'open') return 'pilotage';
  return 'prep';
}

// params : URLSearchParams (ou objet avec .get). edition : pour dériver la phase
// par défaut quand ?phase= est absent/invalide.
export function parseShellState(params, edition) {
  const get = typeof params?.get === 'function'
    ? (k) => params.get(k)
    : (k) => (params && params[k] != null ? params[k] : null);

  const competitionId = get('competition') || null;
  let phase = get('phase');
  if (!PHASE_IDS.includes(phase)) phase = deriveDefaultPhase(edition);
  const screen = get('screen') || null;
  const clubId = get('club') || 'all';
  return { competitionId, phase, screen, clubId };
}

// La lentille club n'apparaît qu'en multiclub avec au moins 2 clubs attachés.
export function isClubLensVisible(edition, clubsCount) {
  return !!edition && edition.model === 'multiclub' && (clubsCount || 0) >= 2;
}

// Filtre la liste du hub selon le rôle. master_admin voit tout ; sinon on
// expose les éditions où l'user est competition_admin OU a un club (les ids
// d'éditions sont précalculés côté hook).
export function filterHubCompetitions({
  competitions,
  isMasterAdmin,
  competitionAdminEditions,
  adminClubEditionIds,
} = {}) {
  const all = Array.isArray(competitions) ? competitions : [];
  if (isMasterAdmin) return all;
  const allowed = new Set([
    ...(Array.isArray(competitionAdminEditions) ? competitionAdminEditions : []),
    ...(Array.isArray(adminClubEditionIds) ? adminClubEditionIds : []),
  ]);
  return all.filter((c) => c && allowed.has(c.id));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/lib/platform/__tests__/competitionShell.test.js`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/platform/competitionShell.js src/lib/platform/__tests__/competitionShell.test.js
git commit -F - <<'EOF'
feat(nav-flux): helpers purs de la coquille compétition (Lot 1)

PHASES + deriveDefaultPhase + parseShellState + isClubLensVisible +
filterHubCompetitions, testés node:test (9/9).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Task 2: PhaseBar (barre des 3 phases)

**Files:**
- Create: `src/components/rsa/admin/platform/shell/PhaseBar.jsx`

Réutilise [CockpitTabs](../../src/components/design/shell/CockpitTabs.jsx) (pattern §3.2). Pas de test unitaire React (le harnais composant n'est pas en place ; vérif par build). Logique déjà couverte en Task 1.

- [ ] **Step 1: Write the component**

```jsx
// src/components/rsa/admin/platform/shell/PhaseBar.jsx
// Barre horizontale des 3 phases (Option A). Mince wrapper autour de CockpitTabs
// pour parler le même langage visuel que les onglets éditoriaux existants.
// L'état (phase active) est piloté par l'URL via le parent (CompetitionShell).

import React from 'react';
import CockpitTabs from '@/components/design/shell/CockpitTabs';
import { useLang } from '@/lib/platform/i18n';
import { PHASES } from '@/lib/platform/competitionShell';

export default function PhaseBar({ activePhase, onChange }) {
  const { t } = useLang();
  return (
    <CockpitTabs
      idPrefix="competition-phase"
      items={PHASES.map((p) => ({ id: p.id, label: t(p.label) }))}
      active={activePhase}
      onChange={onChange}
      ariaLabel="Phases de la compétition"
    />
  );
}
```

- [ ] **Step 2: Lint**

Run: `npx eslint src/components/rsa/admin/platform/shell/PhaseBar.jsx`
Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add src/components/rsa/admin/platform/shell/PhaseBar.jsx
git commit -m "feat(nav-flux): PhaseBar — barre des 3 phases (Lot 1)"
```

---

## Task 3: PhaseLauncher (cartes-lanceurs Organisation/Pilotage)

**Files:**
- Create: `src/components/rsa/admin/platform/shell/PhaseLauncher.jsx`

Pour le Lot 1, Organisation et Pilotage n'embarquent pas les pages plein-écran (`/Selection`, `/Jury` ont leur propre `PageShell`) : on affiche des **cartes-lanceurs** qui naviguent vers ces routes, déjà filtrées par `?edition=`.

- [ ] **Step 1: Write the component**

```jsx
// src/components/rsa/admin/platform/shell/PhaseLauncher.jsx
// Panneau de cartes-lanceurs vers les écrans existants d'une phase (Lot 1).
// Chaque carte = un Link react-router vers une route plein-écran déjà scopée
// sur l'édition. Style éditorial (carte blanche, hairline gold, ArrowRight).

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CREAM2, NAVY, INK, MUTED, GOLD, SERIF } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';

// items : [{ key, title, hint, to }]
export default function PhaseLauncher({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((it) => (
        <Link
          key={it.key}
          to={it.to}
          className={`group rounded-[4px] p-5 bg-white flex items-start justify-between gap-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm ${FOCUS_RING_CLASS}`}
          style={{ border: `1px solid ${CREAM2}` }}
        >
          <span className="min-w-0">
            <span className="flex items-center gap-2 mb-1.5">
              <span className="h-[1.5px] w-5" style={{ background: GOLD }} aria-hidden />
            </span>
            <span
              className="block text-[16px] leading-tight"
              style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
            >
              {it.title}
            </span>
            <span className="block text-[12.5px] mt-1" style={{ color: MUTED }}>
              {it.hint}
            </span>
          </span>
          <ArrowRight
            className="w-4 h-4 mt-1 shrink-0 transition-transform group-hover:translate-x-0.5"
            style={{ color: NAVY }}
            aria-hidden
          />
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `npx eslint src/components/rsa/admin/platform/shell/PhaseLauncher.jsx`
Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add src/components/rsa/admin/platform/shell/PhaseLauncher.jsx
git commit -m "feat(nav-flux): PhaseLauncher — cartes-lanceurs vers écrans existants (Lot 1)"
```

---

## Task 4: CompetitionShell (coquille)

**Files:**
- Create: `src/components/rsa/admin/platform/shell/CompetitionShell.jsx`

Monte la barre de phases + le body selon la phase active. Préparation = `CompetitionEditView` embarqué (c'est une `<section>`). Organisation/Pilotage = `PhaseLauncher`. État via `useSearchParams` + `parseShellState`.

- [ ] **Step 1: Write the component**

```jsx
// src/components/rsa/admin/platform/shell/CompetitionShell.jsx
// Coquille d'une compétition : back link vers le hub + PhaseBar + body par phase.
// Lot 1 : Préparation embarque le CompetitionEditView existant ; Organisation et
// Pilotage sont des lanceurs vers les routes plein-écran. L'état (phase) vit dans
// l'URL (?phase=), source unique de vérité.

import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SafeBackLink, GOLD, NAVY, MUTED, CREAM2, SERIF, TINT_ADMIN } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { useAllCompetitions } from '@/components/rsa/admin/platform/master/useMaster';
import { parseShellState } from '@/lib/platform/competitionShell';
import CompetitionEditView from '@/components/rsa/admin/platform/master/CompetitionEditView';
import PhaseBar from './PhaseBar';
import PhaseLauncher from './PhaseLauncher';

export default function CompetitionShell({ editionId }) {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const competitionsQ = useAllCompetitions();
  const edition = useMemo(
    () => (competitionsQ.data || []).find((c) => c.id === editionId) || null,
    [competitionsQ.data, editionId],
  );

  const { phase } = parseShellState(params, edition);

  const setPhase = (next) => {
    const p = new URLSearchParams(params);
    p.set('phase', next);
    p.delete('screen');
    setParams(p, { replace: false });
  };

  const goHub = () => {
    const p = new URLSearchParams(params);
    p.delete('competition');
    p.delete('phase');
    p.delete('screen');
    p.delete('club');
    setParams(p, { replace: false });
  };

  const orgaItems = [
    { key: 'candidatures', to: `/Selection?edition=${encodeURIComponent(editionId)}`,
      title: t({ fr: 'Candidatures & sélection', en: 'Applications & selection', de: 'Bewerbungen & Auswahl' }),
      hint: t({ fr: 'Dossiers reçus, éligibilité, allocation de session', en: 'Dossiers, eligibility, session allocation', de: 'Dossiers, Eignung, Session-Zuteilung' }) },
    { key: 'jury', to: `/Jury?edition=${encodeURIComponent(editionId)}`,
      title: t({ fr: 'Jury & notation', en: 'Jury & scoring', de: 'Jury & Bewertung' }),
      hint: t({ fr: 'Jurés assignés, pré-lecture, grilles', en: 'Assigned jurors, pre-read, grids', de: 'Juroren, Vorabprüfung, Raster' }) },
  ];

  const pilotageItems = [
    { key: 'resultats', to: `/Resultats?edition=${encodeURIComponent(editionId)}`,
      title: t({ fr: 'Résultats & palmarès', en: 'Results & winners', de: 'Ergebnisse & Sieger' }),
      hint: t({ fr: 'Publication, palmarès public', en: 'Publishing, public results', de: 'Veröffentlichung, Palmarès' }) },
  ];

  return (
    <section>
      <div className="mb-4">
        <SafeBackLink to="/Admin" label={t({ fr: '‹ Compétitions', en: '‹ Competitions', de: '‹ Wettbewerbe' })} onClick={goHub} />
      </div>

      <header className="mb-4">
        <p className="uppercase tracking-[0.18em] text-[10.5px] font-medium" style={{ color: GOLD }}>
          {t({ fr: 'Compétition', en: 'Competition', de: 'Wettbewerb' })}
        </p>
        <h2 className="text-[24px] md:text-[28px] leading-tight" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {edition?.name || editionId}
        </h2>
      </header>

      <div className="rounded-[4px] px-3 md:px-4 pt-2 mb-5" style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}>
        <PhaseBar activePhase={phase} onChange={setPhase} />
      </div>

      {phase === 'prep' && <CompetitionEditView editionId={editionId} onClose={goHub} />}
      {phase === 'orga' && <PhaseLauncher items={orgaItems} />}
      {phase === 'pilotage' && <PhaseLauncher items={pilotageItems} />}
    </section>
  );
}
```

- [ ] **Step 2: Verify SafeBackLink accepts onClick**

Run: `npx eslint src/components/rsa/admin/platform/shell/CompetitionShell.jsx`
Expected: no output. If `SafeBackLink` rejette `onClick`, remplacer par un `<button>` éditorial appelant `goHub` (vérifier la signature dans `src/components/design/` avant build).

- [ ] **Step 3: Commit**

```bash
git add src/components/rsa/admin/platform/shell/CompetitionShell.jsx
git commit -m "feat(nav-flux): CompetitionShell — coquille phases (Lot 1)"
```

---

## Task 5: Hook liste hub + CompetitionHub

**Files:**
- Create: `src/components/rsa/admin/platform/hub/useHubCompetitions.js`
- Create: `src/components/rsa/admin/platform/hub/CompetitionHub.jsx`

- [ ] **Step 1: Write the hook**

```js
// src/components/rsa/admin/platform/hub/useHubCompetitions.js
// Liste des compétitions visibles dans le hub, filtrée par rôle via le helper
// pur filterHubCompetitions. master_admin voit tout ; sinon competition_admin +
// clubs (ids d'éditions dérivés des clubMemberships via edition_clubs).

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useAllCompetitions } from '@/components/rsa/admin/platform/master/useMaster';
import { filterHubCompetitions } from '@/lib/platform/competitionShell';

export function useHubCompetitions() {
  const { isMasterAdmin, competitionAdminEditions, clubMemberships } = usePlatformAuth();
  const competitionsQ = useAllCompetitions();

  const clubIds = useMemo(
    () => (clubMemberships || []).map((m) => m && m.club_id).filter(Boolean),
    [clubMemberships],
  );

  // Éditions où l'user a un club (junction edition_clubs). Inutile pour master.
  const clubEditionsQ = useQuery({
    queryKey: ['rsa', 'hub', 'club-editions', clubIds.slice().sort().join(',')],
    enabled: !isMasterAdmin && clubIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edition_clubs')
        .select('edition_id')
        .in('club_id', clubIds);
      if (error) throw error;
      return [...new Set((data || []).map((r) => r.edition_id))];
    },
  });

  const competitions = useMemo(
    () => filterHubCompetitions({
      competitions: competitionsQ.data || [],
      isMasterAdmin,
      competitionAdminEditions,
      adminClubEditionIds: clubEditionsQ.data || [],
    }),
    [competitionsQ.data, isMasterAdmin, competitionAdminEditions, clubEditionsQ.data],
  );

  return { competitions, isLoading: competitionsQ.isLoading, isError: competitionsQ.isError };
}
```

- [ ] **Step 2: Write the hub component**

```jsx
// src/components/rsa/admin/platform/hub/CompetitionHub.jsx
// Hub d'accueil admin : grille de cartes compétition (filtrée par rôle). Clic →
// ?competition=<id> (la coquille prend le relais). Avancement par phase déféré
// au Lot 3 — Lot 1 affiche nom + année + statut.

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, ArrowRight } from 'lucide-react';
import { CREAM2, NAVY, INK, MUTED, GOLD, SERIF } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { useHubCompetitions } from './useHubCompetitions';

export default function CompetitionHub() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const { competitions, isLoading } = useHubCompetitions();

  const open = (id) => {
    const p = new URLSearchParams(params);
    p.set('competition', id);
    setParams(p, { replace: false });
  };

  if (isLoading) {
    return (
      <div className="py-12 flex items-center justify-center gap-2 text-[14px]" style={{ color: MUTED }}>
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: GOLD }} aria-hidden />
        {t({ fr: 'Chargement des compétitions…', en: 'Loading competitions…', de: 'Wettbewerbe werden geladen…' })}
      </div>
    );
  }

  if (!competitions.length) {
    return (
      <div className="py-10 px-6 text-center rounded-[4px]" style={{ background: 'white', border: `1px dashed ${CREAM2}` }} role="status">
        <p className="text-[14px]" style={{ color: INK }}>
          {t({ fr: 'Aucune compétition.', en: 'No competition.', de: 'Kein Wettbewerb.' })}
        </p>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-5">
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
          <span className="uppercase text-[10px] tracking-[0.18em] font-medium" style={{ color: GOLD }}>
            {t({ fr: 'Compétitions', en: 'Competitions', de: 'Wettbewerbe' })}
          </span>
        </div>
      </header>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-5 list-none m-0 p-0">
        {competitions.map((c) => (
          <li key={c.id} className="flex">
            <button
              type="button"
              onClick={() => open(c.id)}
              className={`group flex-1 text-left rounded-[4px] p-5 bg-white flex items-start justify-between gap-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm ${FOCUS_RING_CLASS}`}
              style={{ border: `1px solid ${CREAM2}` }}
            >
              <span className="min-w-0">
                <span className="uppercase text-[10px] tracking-[0.18em] font-medium" style={{ color: GOLD }}>
                  {c.year || c.status}
                </span>
                <span className="block text-[20px] leading-tight mt-1" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
                  {c.name}
                </span>
              </span>
              <ArrowRight className="w-4 h-4 mt-1 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: NAVY }} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Lint**

Run: `npx eslint src/components/rsa/admin/platform/hub/useHubCompetitions.js src/components/rsa/admin/platform/hub/CompetitionHub.jsx`
Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
git add src/components/rsa/admin/platform/hub/useHubCompetitions.js src/components/rsa/admin/platform/hub/CompetitionHub.jsx
git commit -m "feat(nav-flux): CompetitionHub + hook liste filtrée par rôle (Lot 1)"
```

---

## Task 6: Brancher Admin.jsx (hub ↔ coquille, flag persona)

**Files:**
- Modify: `src/pages/Admin.jsx`

Pour le Lot 1, le **master_admin** en scope master voit la nouvelle nav-flux par défaut ; l'ancien persona-switcher reste accessible via `?legacyNav=1` (flag de repli le temps de valider). Les autres scopes (club:, competition:) restent inchangés ce Lot.

- [ ] **Step 1: Add the flag + flux branch (master scope)**

Dans [Admin.jsx](../../src/pages/Admin.jsx), repérer le bloc `if (effectiveScope === 'master') { body = <MasterCockpit />; }` (≈ ligne 306) et le remplacer par :

```jsx
  // Lot 1 nav-flux : en scope master, on sert le Hub / la coquille compétition
  // pilotés par ?competition=. Repli sur l'ancien MasterCockpit via ?legacyNav=1.
  if (effectiveScope === 'master') {
    const legacyNav = params.get('legacyNav') === '1';
    const competitionParam = params.get('competition');
    if (legacyNav) {
      body = <MasterCockpit />;
    } else if (competitionParam) {
      body = <CompetitionShell editionId={competitionParam} />;
    } else {
      body = <CompetitionHub />;
    }
  } else if (effectiveScope.startsWith('competition:')) {
```

(le `else if` enchaîne sur le bloc `competition:` existant — supprimer le `if` désormais redondant juste avant.)

- [ ] **Step 2: Add the lazy imports**

Près des autres `lazy(...)` en tête d'[Admin.jsx](../../src/pages/Admin.jsx) (≈ lignes 51-54), ajouter :

```jsx
const CompetitionHub = lazy(() => import('@/components/rsa/admin/platform/hub/CompetitionHub'));
const CompetitionShell = lazy(() => import('@/components/rsa/admin/platform/shell/CompetitionShell'));
```

- [ ] **Step 3: Lint**

Run: `npx eslint src/pages/Admin.jsx`
Expected: no output (clean).

- [ ] **Step 4: Build (résolution + chunks)**

Run: `npm run build`
Expected: `✓ built` sans nouvelle erreur (seul le warning chunk `buildZip` préexistant).

- [ ] **Step 5: Commit**

```bash
git add src/pages/Admin.jsx
git commit -m "feat(nav-flux): brancher Hub + coquille dans Admin (scope master, flag legacyNav) (Lot 1)"
```

---

## Task 7: Vérification manuelle + run complet

**Files:** aucun (vérification).

- [ ] **Step 1: Tests purs**

Run: `node --test src/lib/platform/__tests__/competitionShell.test.js src/lib/platform/__tests__/computePrimaryNav.test.js`
Expected: tous PASS.

- [ ] **Step 2: Build final**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 3: Checklist visuelle (dev server)**

Run: `npm run dev`, se connecter en master_admin, aller sur `/Admin`. Vérifier :
- `/Admin` (sans param) → **Hub** : grille de cartes compétition.
- Clic « Paris Berlin 2027 » → URL `?competition=<id>` → **coquille** : back link + barre **Préparation / Organisation / Pilotage**.
- Onglet **Préparation** → les onglets du CompetitionEditView (Identité, Calendrier…).
- Onglet **Organisation** → 2 cartes → clic « Candidatures & sélection » ouvre `/Selection?edition=<id>`.
- Onglet **Pilotage** → carte « Résultats ».
- Back link « ‹ Compétitions » → retour Hub.
- `/Admin?legacyNav=1` → l'ancien MasterCockpit (repli OK).

- [ ] **Step 4: Commit (si ajustements visuels)**

```bash
git add -A
git commit -m "fix(nav-flux): ajustements visuels Lot 1 post-vérification"
```

---

## Self-Review

**Spec coverage (blueprint §5 Lot 1) :**
- Hub → Task 5 ✓
- CompetitionShell + PhaseBar → Tasks 2, 4 ✓
- Phases pointent vers écrans existants → Task 3 (lanceurs) + Task 4 (Préparation embarque CompetitionEditView) ✓
- Persona-switcher gardé en parallèle (flag) → Task 6 (`?legacyNav=1`) ✓
- État URL `?competition=&phase=` → Tasks 1, 4, 6 ✓
- Filtre rôle → Tasks 1, 5 ✓
- Lentille club → **différée Lot 2** (blueprint §5) — pas dans ce plan, volontaire.

**Placeholder scan :** aucun TBD/TODO ; tout le code est fourni. Seule réserve explicite : la signature `onClick` de `SafeBackLink` (Task 4 Step 2) — vérifier avant build, fallback `<button>` indiqué.

**Type consistency :** `parseShellState` renvoie `{competitionId, phase, screen, clubId}` (Tasks 1, 4) ; `filterHubCompetitions` signature identique Tasks 1↔5 ; `PHASES`/`PHASE_IDS` exportés Task 1, consommés Tasks 2, 4. Cohérent.
