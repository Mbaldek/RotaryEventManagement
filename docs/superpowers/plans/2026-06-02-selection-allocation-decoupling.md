# Découplage Éligibilité / Allocation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **⚠️ Concurrence :** une autre session Claude partage ce working-tree (chantier *repimp*). Exécuter ce plan dans un `git worktree` dédié (skill `superpowers:using-git-worktrees`) pour éviter le mélange de commits constaté lors du commit du blueprint.

**Goal:** Découpler la décision d'éligibilité (espace Sélection, comité) de l'allocation aux clusters (nouvel écran cockpit, admin), en rétablissant le statut intermédiaire `eligible` ≠ `affecte`.

**Architecture:** (1) migration SQL qui change la projection `eligible → status='eligible'` (session NULL) et ajoute un RPC `rsa_allocate_startup` ; (2) retrait du `ClusterSelect` des panneaux de décision de l'espace Sélection ; (3) nouvelle page `/Allocation` lancée depuis la phase Organisation du cockpit, admin-only, avec pool d'éligibles + dropdown par ligne + création de clusters.

**Tech Stack:** React 18 + Vite, TanStack Query, Supabase (RPC SECURITY DEFINER + RLS), Tailwind, design tokens éditoriaux `@/components/design`. Tests purs via `node --test` (cf. `reference_test_runner_node_test` — PAS vitest).

**Réf.** Blueprint : `docs/blueprints/selection-allocation-decoupling.md`. Patterns UI : `docs/design/ui-patterns-catalog-generic.md` (L-Numbered-Hairline, filet or).

---

## Fichiers touchés

| Action | Fichier | Responsabilité |
|---|---|---|
| Create | `supabase/migrations/20260602_rsa_selection_allocation_decouple.sql` | Reprojection `eligible`, relax `eligible_requires_session`, RPC `rsa_allocate_startup` |
| Create | `src/lib/rsa/allocation.js` | Helpers PURS : résumé pool, groupement par cluster, slug id session |
| Create | `src/lib/rsa/__tests__/allocation.test.js` | Tests node:test des helpers purs |
| Modify | `src/lib/rsa/entities/startups.js` | `Startup.allocate(startupId, sessionId)` (appel RPC) |
| Modify | `src/components/rsa/selection/DecisionPanel.jsx` | Retire ClusterSelect + champ + validation cluster |
| Modify | `src/components/rsa/selection/AdminOverridePanel.jsx` | Retire ClusterSelect + validation cluster |
| Modify | `src/components/rsa/selection/i18n.js` | `pageSubtitle` sans « cluster » ; nouveaux libellés alloc |
| Create | `src/components/rsa/allocation/useAllocation.js` | Hook TanStack : pool, alloués, clusters, mutations |
| Create | `src/components/rsa/allocation/AllocationPool.jsx` | Liste « à placer » + dropdown cluster par ligne |
| Create | `src/components/rsa/allocation/ClusterColumn.jsx` | Section cluster (L-Numbered-Hairline) + startups allouées |
| Create | `src/components/rsa/allocation/CreateClusterInline.jsx` | Formulaire inline de création de cluster |
| Create | `src/components/rsa/allocation/i18n.js` | Libellés FR/EN/DE de l'écran |
| Create | `src/pages/Allocation.jsx` | Page orchestratrice + auth/role gate admin |
| Modify | `src/pages.config.js` | Enregistre la route `Allocation` |
| Modify | `src/components/rsa/admin/platform/shell/CompetitionShell.jsx` | Ajoute l'item « Allocation » à la phase Organisation |

---

## Task 1 : Migration — reprojection `eligible` + RPC `rsa_allocate_startup`

**Files:**
- Create: `supabase/migrations/20260602_rsa_selection_allocation_decouple.sql`

- [ ] **Step 1 : Écrire la migration**

```sql
-- Découplage éligibilité / allocation (Module 2.5).
-- Réf : docs/blueprints/selection-allocation-decoupling.md
--
-- 1. rsa_apply_selection_review : 'eligible' projette désormais status='eligible'
--    (session NULL) au lieu de 'affecte'+session obligatoire. On RETIRE la garde
--    eligible_requires_session : l'allocation est une étape distincte (admin).
-- 2. rsa_admin_override : idem, on retire l'exigence de session pour 'eligible'.
-- 3. NOUVEAU rsa_allocate_startup(p_startup_id, p_session_id) : admin-only,
--    eligible|affecte -> affecte + session_id. Valide kind='qualifying' + édition.
--
-- Pas de contrainte CHECK sur startups.status -> aucune migration d'enum.
-- Idempotence : create or replace.

-- ── 1. Reprojection dans rsa_apply_selection_review ───────────────────────────
create or replace function public.rsa_apply_selection_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = public as $$
declare
  v_review     public.selection_reviews%rowtype;
  v_new_status text;
  v_new_session text;
begin
  if not (public.has_platform_role('comite') or public.has_platform_role('admin')) then
    raise exception 'rsa_apply_selection_review: forbidden' using errcode = '42501';
  end if;

  select * into v_review from public.selection_reviews where id = p_review_id;
  if not found then
    raise exception 'review_not_found: %', p_review_id using errcode = '22023';
  end if;

  if not v_review.is_final and exists (
    select 1 from public.selection_reviews
     where startup_id = v_review.startup_id
       and id <> v_review.id
       and (is_final = true or reviewed_at > v_review.reviewed_at)
  ) then
    raise exception 'cannot_apply_superseded_review' using errcode = '42501';
  end if;

  -- Décision -> statut projeté. 'eligible' ne porte PLUS de session (découplage).
  v_new_status := case v_review.decision
    when 'a_examiner'    then 'en_selection'
    when 'eligible'      then 'eligible'
    when 'liste_attente' then 'liste_attente'
    when 'rejete'        then 'rejete'
    else null
  end;
  if v_new_status is null then
    raise exception 'unknown_decision: %', v_review.decision using errcode = '22023';
  end if;

  -- Toutes les décisions de revue remettent session_id à NULL : l'allocation se
  -- fait exclusivement via rsa_allocate_startup, post-éligibilité.
  v_new_session := null;

  perform set_config('rsa.allow_protected_update', 't', true);

  update public.startups
     set status       = v_new_status,
         session_id   = v_new_session,
         finalized_at = case when v_review.is_final then now()      else finalized_at end,
         finalized_by = case when v_review.is_final then auth.uid() else finalized_by end,
         updated_at   = now()
   where id = v_review.startup_id;

  perform set_config('rsa.allow_protected_update', '', true);
end;
$$;

-- ── 2. rsa_admin_override : retrait de l'exigence session pour 'eligible' ─────
create or replace function public.rsa_admin_override(
  p_startup_id uuid,
  p_decision text,
  p_assigned_session_id text,
  p_rationale text,
  p_overrides_review_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public as $$
declare
  v_new_id uuid;
  v_admin_name text;
begin
  if not public.has_platform_role('admin') then
    raise exception 'rsa_admin_override: admin only' using errcode = '42501';
  end if;

  if p_decision not in ('a_examiner','eligible','rejete','liste_attente') then
    raise exception 'invalid_decision: %', p_decision using errcode = '22023';
  end if;
  -- (retiré : eligible_requires_session — l'allocation est désormais séparée)

  if p_overrides_review_id is not null then
    update public.selection_reviews
       set is_final = false
     where id = p_overrides_review_id
       and is_final = true;
  end if;

  select coalesce(p.full_name, auth.jwt() ->> 'email') into v_admin_name
    from public.profiles p
   where lower(p.email) = lower(auth.jwt() ->> 'email')
   limit 1;
  if v_admin_name is null then
    v_admin_name := auth.jwt() ->> 'email';
  end if;

  insert into public.selection_reviews(
    startup_id, reviewer_id, reviewer_name, decision, assigned_session_id,
    rationale, is_final, overrides_review_id
  ) values (
    p_startup_id, auth.uid(), v_admin_name, p_decision, p_assigned_session_id,
    nullif(btrim(coalesce(p_rationale, '')), ''), true, p_overrides_review_id
  )
  returning id into v_new_id;

  perform public.rsa_apply_selection_review(v_new_id);
  return v_new_id;
end;
$$;

-- ── 3. NOUVEAU : rsa_allocate_startup(p_startup_id, p_session_id) ──────────────
-- Admin-only. eligible|affecte -> affecte + session_id. N'écrit PAS de review
-- (l'allocation est orthogonale à la décision d'éligibilité). session_id reste
-- le SSOT consommé en aval (running order, jury).
create or replace function public.rsa_allocate_startup(
  p_startup_id uuid,
  p_session_id text
)
returns void
language plpgsql
security definer
set search_path = public as $$
declare
  v_startup public.startups%rowtype;
  v_session public.sessions%rowtype;
begin
  if not public.has_platform_role('admin') then
    raise exception 'rsa_allocate_startup: admin only' using errcode = '42501';
  end if;

  select * into v_startup from public.startups where id = p_startup_id;
  if not found then
    raise exception 'startup_not_found: %', p_startup_id using errcode = '22023';
  end if;
  if v_startup.status not in ('eligible','affecte') then
    raise exception 'startup_not_allocatable: %', v_startup.status using errcode = '42501';
  end if;

  select * into v_session from public.sessions where id = p_session_id;
  if not found then
    raise exception 'session_not_found: %', p_session_id using errcode = '22023';
  end if;
  if v_session.kind <> 'qualifying' then
    raise exception 'session_not_qualifying: %', v_session.kind using errcode = '42501';
  end if;
  if v_session.edition_id <> v_startup.edition_id then
    raise exception 'session_edition_mismatch' using errcode = '42501';
  end if;

  perform set_config('rsa.allow_protected_update', 't', true);
  update public.startups
     set status     = 'affecte',
         session_id = p_session_id,
         updated_at = now()
   where id = p_startup_id;
  perform set_config('rsa.allow_protected_update', '', true);
end;
$$;

revoke all on function public.rsa_allocate_startup(uuid, text) from public;
grant execute on function public.rsa_allocate_startup(uuid, text) to authenticated;
```

- [ ] **Step 2 : Appliquer la migration via MCP Supabase**

Project id : `uaoucznptxmvhhytapso` (cf. `reference_supabase_project`). Outil : `mcp__claude_ai_Supabase__apply_migration` avec `name: "20260602_rsa_selection_allocation_decouple"` et le SQL ci-dessus.
Expected : succès, pas d'erreur de syntaxe.

- [ ] **Step 3 : Vérifier le RPC en base**

Outil `mcp__claude_ai_Supabase__execute_sql` :
```sql
select proname from pg_proc where proname = 'rsa_allocate_startup';
```
Expected : 1 ligne `rsa_allocate_startup`.

- [ ] **Step 4 : Commit**

```bash
git add supabase/migrations/20260602_rsa_selection_allocation_decouple.sql
git commit -m "feat(selection): migration découplage éligibilité/allocation + RPC rsa_allocate_startup"
```

---

## Task 2 : Helpers purs d'allocation (TDD)

**Files:**
- Create: `src/lib/rsa/allocation.js`
- Test: `src/lib/rsa/__tests__/allocation.test.js`

- [ ] **Step 1 : Écrire le test (échoue)**

```js
// src/lib/rsa/__tests__/allocation.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAllocation, groupAllocatedByCluster, slugSessionId } from '../allocation.js';

test('summarizeAllocation compte pool / alloués / à examiner', () => {
  const r = summarizeAllocation({
    pool: [{ id: 'a' }, { id: 'b' }],
    allocated: [{ id: 'c' }],
    toReviewCount: 3,
  });
  assert.deepEqual(r, { toPlaceCount: 2, allocatedCount: 1, eligibleTotal: 3, toReviewCount: 3 });
});

test('groupAllocatedByCluster regroupe par session_id et préserve l’ordre des clusters', () => {
  const clusters = [{ id: 's_a', name: 'A' }, { id: 's_b', name: 'B' }];
  const allocated = [
    { id: '1', name: 'X', session_id: 's_b' },
    { id: '2', name: 'Y', session_id: 's_a' },
    { id: '3', name: 'Z', session_id: 's_a' },
  ];
  const groups = groupAllocatedByCluster(allocated, clusters);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].cluster.id, 's_a');
  assert.deepEqual(groups[0].startups.map((s) => s.id), ['2', '3']);
  assert.equal(groups[1].cluster.id, 's_b');
  assert.deepEqual(groups[1].startups.map((s) => s.id), ['1']);
});

test('slugSessionId génère un id text stable préfixé par l’édition', () => {
  assert.equal(slugSessionId('2026', 'Santé & IA'), '2026_sante_ia');
  assert.equal(slugSessionId('2026', '  Climat   Impact  '), '2026_climat_impact');
});
```

- [ ] **Step 2 : Lancer le test (doit échouer)**

Run : `node --test src/lib/rsa/__tests__/allocation.test.js`
Expected : FAIL — `Cannot find module '../allocation.js'`.

- [ ] **Step 3 : Implémenter les helpers**

```js
// src/lib/rsa/allocation.js
// Helpers PURS de l'écran Allocation (aucune dépendance React/Supabase) —
// testables en node:test, à l'identique de competitionShell.js.

// Résumé chiffré du pool d'allocation.
// pool : startups status='eligible' (à placer) ; allocated : status='affecte'.
export function summarizeAllocation({ pool = [], allocated = [], toReviewCount = 0 } = {}) {
  const toPlaceCount = pool.length;
  const allocatedCount = allocated.length;
  return {
    toPlaceCount,
    allocatedCount,
    eligibleTotal: toPlaceCount + allocatedCount,
    toReviewCount,
  };
}

// Regroupe les startups allouées par cluster, dans l'ordre de la liste clusters.
// Renvoie [{ cluster, startups: [] }] (clusters vides inclus).
export function groupAllocatedByCluster(allocated = [], clusters = []) {
  const bySession = new Map();
  for (const s of allocated) {
    const k = s.session_id;
    if (!k) continue;
    const arr = bySession.get(k) || [];
    arr.push(s);
    bySession.set(k, arr);
  }
  return clusters.map((cluster) => ({
    cluster,
    startups: bySession.get(cluster.id) || [],
  }));
}

// Diacritics block produit par NFD (U+0300..U+036F).
const DIACRITICS_RE = /[̀-ͯ]/g;

// Génère un id text de session : `${editionId}_${slug}` (a-z0-9_), sans accents.
export function slugSessionId(editionId, name) {
  const slug = String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${editionId}_${slug}`;
}
```

- [ ] **Step 4 : Lancer le test (doit passer)**

Run : `node --test src/lib/rsa/__tests__/allocation.test.js`
Expected : PASS (3 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/lib/rsa/allocation.js src/lib/rsa/__tests__/allocation.test.js
git commit -m "feat(allocation): helpers purs summarize/group/slug + tests node:test"
```

---

## Task 3 : Entité — `Startup.allocate`

**Files:**
- Modify: `src/lib/rsa/entities/startups.js` (ajout dans l'objet `Startup`, après `pageForAdmin`)

- [ ] **Step 1 : Ajouter le helper RPC**

Insérer dans l'objet `Startup` (juste après la méthode `pageForAdmin`, avant `summaryByStatus`) :

```js
  // Module 2.5 — Allocation : eligible|affecte -> affecte + session_id, via RPC
  // SECURITY DEFINER admin-only (rsa_allocate_startup). N'écrit pas de review.
  async allocate(startupId, sessionId) {
    const { error } = await supabase.rpc('rsa_allocate_startup', {
      p_startup_id: startupId,
      p_session_id: sessionId,
    });
    if (error) throw error;
  },
```

- [ ] **Step 2 : Vérifier le build (lint)**

Run : `npm run lint`
Expected : pas d'erreur sur `startups.js`.

- [ ] **Step 3 : Commit**

```bash
git add src/lib/rsa/entities/startups.js
git commit -m "feat(allocation): Startup.allocate (RPC rsa_allocate_startup)"
```

---

## Task 4 : Retirer le cluster de `DecisionPanel`

**Files:**
- Modify: `src/components/rsa/selection/DecisionPanel.jsx`

- [ ] **Step 1 : Retirer l'import ClusterSelect**

Supprimer la ligne :
```js
import ClusterSelect from './ClusterSelect';
```

- [ ] **Step 2 : Retirer l'état clusterId**

Supprimer le bloc :
```js
  const [clusterId, setClusterId] = useState(
    latestMine?.assigned_session_id || effectiveReview?.assigned_session_id || null,
  );
```
Et dans le `useEffect([startup?.id])`, supprimer :
```js
    setClusterId(
      latestMine?.assigned_session_id || effectiveReview?.assigned_session_id || null,
    );
```

- [ ] **Step 3 : Retirer la validation + le champ cluster**

Dans `handleSubmit`, supprimer :
```js
    if (decision === 'eligible' && !clusterId) {
      next.cluster = t(UI.errEligibleNeedsCluster);
    }
```
Dans le payload `onSubmit`, remplacer la ligne `assignedSessionId` par :
```js
      assignedSessionId: null,
```
Supprimer tout le `<Field label={t(UI.clusterField)} …> … </Field>` (le bloc ClusterSelect).

- [ ] **Step 4 : Retirer la prop `sessions` inutilisée**

Retirer `sessions = [],` de la signature du composant (elle n'est plus lue). La prop reste passée par `DossierDrawer` mais ignorée — laisser le call site tel quel (cf. Task 6).

- [ ] **Step 5 : Vérifier le lint**

Run : `npm run lint`
Expected : pas d'erreur ; pas de variable `clusterId`/`ClusterSelect` orpheline.

- [ ] **Step 6 : Commit**

```bash
git add src/components/rsa/selection/DecisionPanel.jsx
git commit -m "feat(selection): retire le cluster de la décision comité (découplage)"
```

---

## Task 5 : Retirer le cluster de `AdminOverridePanel`

**Files:**
- Modify: `src/components/rsa/selection/AdminOverridePanel.jsx`

- [ ] **Step 1 : Retirer l'import + l'état clusterId**

Supprimer `import ClusterSelect from './ClusterSelect';`.
Supprimer `const [clusterId, setClusterId] = useState(effectiveReview?.assigned_session_id || null);`
et la ligne `setClusterId(...)` dans le `useEffect`.

- [ ] **Step 2 : Retirer la validation + le champ cluster dans `handleOverride`**

Supprimer :
```js
    if (decision === 'eligible' && !clusterId) next.cluster = t(UI.errEligibleNeedsCluster);
```
Dans le payload `onOverride`, remplacer `assignedSessionId` par :
```js
      assignedSessionId: null,
```
Supprimer le bloc `<Field label={t(UI.clusterField)} …>` (ClusterSelect).

- [ ] **Step 3 : Retirer la prop `sessions` inutilisée de la signature**

Retirer `sessions = [],` de la signature (le call site DossierDrawer peut continuer à la passer ; elle sera ignorée).

- [ ] **Step 4 : Vérifier le lint**

Run : `npm run lint`
Expected : pas d'erreur.

- [ ] **Step 5 : Commit**

```bash
git add src/components/rsa/selection/AdminOverridePanel.jsx
git commit -m "feat(selection): retire le cluster de l'override admin (découplage)"
```

---

## Task 6 : i18n Sélection — sous-titre sans « cluster »

**Files:**
- Modify: `src/components/rsa/selection/i18n.js`

- [ ] **Step 1 : Mettre à jour `pageSubtitle`**

Remplacer le bloc `pageSubtitle` (≈ lignes 46-48) par :
```js
  pageSubtitle:   { fr: 'Décidez de l’éligibilité des dossiers, validez en équipe. L’allocation aux clusters se fait ensuite dans le cockpit.',
                    en: 'Decide dossier eligibility, validate as a team. Cluster allocation happens afterwards in the cockpit.',
                    de: 'Entscheiden Sie über die Eignung der Dossiers, validieren Sie im Team. Die Cluster-Zuteilung erfolgt anschließend im Cockpit.' },
```

- [ ] **Step 2 : (Ne PAS supprimer les clés cluster*)**

`clusterField`, `clusterNone`, `clusterPlaceholder`, `clusterSuggested`, `errEligibleNeedsCluster` restent référencées par `ClusterSelect.jsx` (réutilisé par l'écran Allocation, Task 9). Ne rien supprimer.

- [ ] **Step 3 : Commit**

```bash
git add src/components/rsa/selection/i18n.js
git commit -m "feat(selection): sous-titre éligibilité sans mention cluster"
```

---

## Task 7 : i18n de l'écran Allocation

**Files:**
- Create: `src/components/rsa/allocation/i18n.js`

- [ ] **Step 1 : Créer le dictionnaire**

```js
// src/components/rsa/allocation/i18n.js
// Libellés FR/EN/DE de l'écran Allocation (cockpit, phase Organisation).
export const UI = {
  eyebrow:      { fr: 'Organisation', en: 'Organisation', de: 'Organisation' },
  pageTitle:    { fr: 'Allocation des éligibles', en: 'Allocate eligible startups', de: 'Zuteilung der geeigneten Startups' },
  pageSubtitle: { fr: 'Construisez les clusters et répartissez les startups éligibles. Une startup peut encore être écartée, faute de place.',
                  en: 'Build the clusters and distribute eligible startups. A startup can still be set aside for lack of room.',
                  de: 'Erstellen Sie die Cluster und verteilen Sie die geeigneten Startups. Ein Startup kann noch zurückgestellt werden.' },
  summary:      { fr: '{total} éligibles · {alloc} alloués · {toPlace} à placer',
                  en: '{total} eligible · {alloc} allocated · {toPlace} to place',
                  de: '{total} geeignet · {alloc} zugeteilt · {toPlace} zu platzieren' },
  reviewWarning:{ fr: '{n} dossiers encore à examiner — le pool n’est pas figé.',
                  en: '{n} dossiers still to review — the pool isn’t final.',
                  de: '{n} Dossiers noch zu prüfen — der Pool ist nicht final.' },
  toPlace:      { fr: 'À placer', en: 'To place', de: 'Zu platzieren' },
  clusters:     { fr: 'Clusters', en: 'Clusters', de: 'Cluster' },
  pickCluster:  { fr: 'Choisir un cluster…', en: 'Pick a cluster…', de: 'Cluster wählen…' },
  suggested:    { fr: 'suggéré : {name}', en: 'suggested: {name}', de: 'Vorschlag: {name}' },
  addCluster:   { fr: '+ Cluster', en: '+ Cluster', de: '+ Cluster' },
  clusterName:  { fr: 'Nom du cluster', en: 'Cluster name', de: 'Cluster-Name' },
  clusterTheme: { fr: 'Thème (optionnel)', en: 'Theme (optional)', de: 'Thema (optional)' },
  clusterDate:  { fr: 'Date (optionnel)', en: 'Date (optional)', de: 'Datum (optional)' },
  create:       { fr: 'Créer', en: 'Create', de: 'Erstellen' },
  cancel:       { fr: 'Annuler', en: 'Cancel', de: 'Abbrechen' },
  move:         { fr: 'Déplacer', en: 'Move', de: 'Verschieben' },
  sendBack:     { fr: 'Renvoyer au pool', en: 'Send back to pool', de: 'Zurück in den Pool' },
  reject:       { fr: 'Écarter', en: 'Set aside', de: 'Zurückstellen' },
  emptyPool:    { fr: 'Aucune startup à placer. Tous les éligibles sont alloués.',
                  en: 'No startup to place. All eligible startups are allocated.',
                  de: 'Keine Startups zu platzieren. Alle geeigneten sind zugeteilt.' },
  noEligible:   { fr: 'Aucune startup éligible pour le moment. Statuez d’abord l’éligibilité dans l’espace Sélection.',
                  en: 'No eligible startup yet. Decide eligibility first in the Selection space.',
                  de: 'Noch keine geeigneten Startups. Entscheiden Sie zuerst im Auswahl-Bereich.' },
  noCluster:    { fr: 'Aucun cluster. Créez-en un pour commencer à allouer.',
                  en: 'No cluster yet. Create one to start allocating.',
                  de: 'Noch kein Cluster. Erstellen Sie eines, um zuzuteilen.' },
  startupsCount:{ fr: '{n} startups', en: '{n} startups', de: '{n} Startups' },
  noAccess:     { fr: 'Accès réservé aux administrateurs.', en: 'Admins only.', de: 'Nur für Administratoren.' },
  authLoading:  { fr: 'Chargement…', en: 'Loading…', de: 'Wird geladen…' },
  loadError:    { fr: 'Chargement impossible. Réessayez.', en: 'Could not load. Retry.', de: 'Laden fehlgeschlagen. Erneut versuchen.' },
  actionError:  { fr: 'L’action a échoué. Réessayez.', en: 'Action failed. Retry.', de: 'Aktion fehlgeschlagen. Erneut versuchen.' },
};
```

- [ ] **Step 2 : Commit**

```bash
git add src/components/rsa/allocation/i18n.js
git commit -m "feat(allocation): i18n FR/EN/DE de l'écran"
```

---

## Task 8 : Hook `useAllocation`

**Files:**
- Create: `src/components/rsa/allocation/useAllocation.js`

- [ ] **Step 1 : Créer le hook**

```js
// src/components/rsa/allocation/useAllocation.js
// Hooks TanStack de l'écran Allocation : pool d'éligibles (status='eligible'),
// allouées (status='affecte'), clusters (sessions kind='qualifying'), compteur
// "à examiner", + mutations allocate / reject / sendBack / createCluster.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Startup, RsaSession, SelectionReview } from '@/lib/rsa/entities';
import { slugSessionId } from '@/lib/rsa/allocation';

export const ALLOC_KEYS = {
  pool:     (editionId) => ['rsa', 'allocation', 'pool', editionId],
  allocated:(editionId) => ['rsa', 'allocation', 'allocated', editionId],
  clusters: (editionId) => ['rsa', 'allocation', 'clusters', editionId],
  summary:  (editionId) => ['rsa', 'allocation', 'summary', editionId],
};

export function useAllocationPool(editionId) {
  return useQuery({
    queryKey: ALLOC_KEYS.pool(editionId),
    queryFn: () => Startup.pageForAdmin({ editionId, statusIn: ['eligible'] }),
    enabled: !!editionId,
    staleTime: 15 * 1000,
  });
}

export function useAllocated(editionId) {
  return useQuery({
    queryKey: ALLOC_KEYS.allocated(editionId),
    queryFn: () => Startup.pageForAdmin({ editionId, statusIn: ['affecte'] }),
    enabled: !!editionId,
    staleTime: 15 * 1000,
  });
}

export function useClusters(editionId) {
  return useQuery({
    queryKey: ALLOC_KEYS.clusters(editionId),
    queryFn: async () => {
      const all = await RsaSession.forEdition(editionId);
      return (all || []).filter((s) => s.kind === 'qualifying');
    },
    enabled: !!editionId,
    staleTime: 30 * 1000,
  });
}

// Compteur "à examiner" pour le bandeau de gate souple.
export function useToReviewCount(editionId) {
  return useQuery({
    queryKey: ALLOC_KEYS.summary(editionId),
    queryFn: async () => {
      const byStatus = await Startup.summaryByStatus(editionId);
      return (byStatus.soumis || 0) + (byStatus.en_selection || 0);
    },
    enabled: !!editionId,
    staleTime: 30 * 1000,
  });
}

function invalidateAlloc(qc, editionId) {
  qc.invalidateQueries({ queryKey: ['rsa', 'allocation'], exact: false });
  qc.invalidateQueries({ queryKey: ['rsa', 'selection'], exact: false });
  if (editionId) {
    qc.invalidateQueries({ queryKey: ALLOC_KEYS.pool(editionId), exact: false });
    qc.invalidateQueries({ queryKey: ALLOC_KEYS.allocated(editionId), exact: false });
  }
}

// Allouer / déplacer : eligible|affecte -> affecte + session_id.
export function useAllocate(editionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ startupId, sessionId }) => Startup.allocate(startupId, sessionId),
    onSuccess: () => invalidateAlloc(qc, editionId),
  });
}

// Renvoyer au pool (affecte -> eligible) ou écarter (-> rejete) : admin override.
export function useReassign(editionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ startupId, decision, rationale = null }) =>
      SelectionReview.adminOverride({
        startupId,
        decision, // 'eligible' (retour pool) | 'rejete' | 'liste_attente'
        assignedSessionId: null,
        rationale,
        overridesReviewId: null,
      }),
    onSuccess: () => invalidateAlloc(qc, editionId),
  });
}

// Créer un cluster (= RsaSession kind='qualifying'). clubId requis (monoclub : le
// club unique de l'édition). position : index suivant.
export function useCreateCluster(editionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, theme, sessionDate, clubId, position }) =>
      RsaSession.createWithConfig({
        editionId,
        payload: {
          id: slugSessionId(editionId, name),
          name,
          theme: theme || null,
          kind: 'qualifying',
          session_date: sessionDate || null,
          position: position ?? 0,
          club_id: clubId ?? null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ALLOC_KEYS.clusters(editionId), exact: false });
    },
  });
}
```

- [ ] **Step 2 : Vérifier le lint**

Run : `npm run lint`
Expected : pas d'erreur (imports résolus via `@/`).

- [ ] **Step 3 : Commit**

```bash
git add src/components/rsa/allocation/useAllocation.js
git commit -m "feat(allocation): hook TanStack pool/clusters + mutations"
```

---

## Task 9 : Composants UI — Pool, ClusterColumn, CreateClusterInline

**Files:**
- Create: `src/components/rsa/allocation/AllocationPool.jsx`
- Create: `src/components/rsa/allocation/ClusterColumn.jsx`
- Create: `src/components/rsa/allocation/CreateClusterInline.jsx`

- [ ] **Step 1 : `AllocationPool.jsx` (liste à placer + dropdown par ligne)**

```jsx
// src/components/rsa/allocation/AllocationPool.jsx
// Liste éditoriale des éligibles à placer (L-Numbered-Hairline) : rail numéroté
// + nom + secteurs + dropdown cluster (réutilise le pattern ClusterSelect).
import React from 'react';
import { CREAM2, NAVY, INK, MUTED, GOLD, SERIF } from '@/components/design/tokens';
import { Select } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { sectorToClusterHeuristic } from '@/components/rsa/selection/constants';
import { UI } from './i18n';

export default function AllocationPool({ pool = [], clusters = [], onAllocate }) {
  const { t } = useLang();
  if (!pool.length) {
    return <p className="text-[13px] py-4" style={{ color: MUTED }}>{t(UI.emptyPool)}</p>;
  }
  const options = clusters.map((c) => ({ value: c.id, label: c.name }));
  return (
    <ol className="list-none m-0 p-0" style={{ borderTop: `1px solid ${CREAM2}` }}>
      {pool.map((s, i) => {
        const suggestion = sectorToClusterHeuristic(s.sectors, clusters);
        const suggestedName = clusters.find((c) => c.id === suggestion)?.name;
        return (
          <li key={s.id} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 py-3"
              style={{ borderBottom: `1px solid ${CREAM2}` }}>
            <span className="text-[12px] tabular-nums text-center" style={{ color: MUTED, fontFamily: SERIF }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] leading-tight" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
                {s.name}
              </span>
              {Array.isArray(s.sectors) && s.sectors.length > 0 && (
                <span className="block text-[12px] mt-0.5" style={{ color: MUTED }}>
                  {s.sectors.join(', ')}
                  {suggestedName && (
                    <button type="button" onClick={() => onAllocate(s.id, suggestion)}
                            className="ml-2 outline-none focus-visible:underline" style={{ color: GOLD }}>
                      {t(UI.suggested).replace('{name}', suggestedName)}
                    </button>
                  )}
                </span>
              )}
            </span>
            <span className="w-[200px]">
              <Select
                value=""
                onChange={(e) => e.target.value && onAllocate(s.id, e.target.value)}
                options={options}
                placeholder={t(UI.pickCluster)}
                disabled={!clusters.length}
              />
            </span>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 2 : `ClusterColumn.jsx` (section cluster + startups allouées)**

```jsx
// src/components/rsa/allocation/ClusterColumn.jsx
// Une section cluster (L-Numbered-Hairline) : titre Playfair + date + compteur,
// liste des startups allouées avec action Déplacer / Renvoyer / Écarter.
import React from 'react';
import { CREAM2, NAVY, INK, MUTED, GOLD, SERIF } from '@/components/design/tokens';
import { Select } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { formatShortDate } from '@/components/rsa/selection/constants';
import { UI } from './i18n';

export default function ClusterColumn({ group, clusters = [], onMove, onSendBack, onReject }) {
  const { t, lang } = useLang();
  const { cluster, startups } = group;
  const moveOptions = clusters
    .filter((c) => c.id !== cluster.id)
    .map((c) => ({ value: c.id, label: c.name }));
  return (
    <section className="mb-4" style={{ borderTop: `2px solid ${GOLD}`, paddingTop: 10 }}>
      <header className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
        <h4 className="text-[16px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {cluster.name}
          {cluster.session_date && (
            <span className="text-[12px] ml-2" style={{ color: MUTED }}>
              · {formatShortDate(cluster.session_date, lang)}
            </span>
          )}
        </h4>
        <span className="text-[12px]" style={{ color: MUTED }}>
          {t(UI.startupsCount).replace('{n}', String(startups.length))}
        </span>
      </header>
      <ul className="list-none m-0 p-0">
        {startups.map((s) => (
          <li key={s.id} className="grid grid-cols-[1fr_auto] items-center gap-3 py-2"
              style={{ borderBottom: `1px solid ${CREAM2}` }}>
            <span className="text-[14px]" style={{ color: INK }}>{s.name}</span>
            <span className="flex items-center gap-2">
              <span className="w-[150px]">
                <Select
                  value=""
                  onChange={(e) => e.target.value && onMove(s.id, e.target.value)}
                  options={moveOptions}
                  placeholder={t(UI.move)}
                  disabled={!moveOptions.length}
                />
              </span>
              <button type="button" onClick={() => onSendBack(s.id)}
                      className="text-[12px] outline-none focus-visible:underline" style={{ color: MUTED }}>
                {t(UI.sendBack)}
              </button>
              <button type="button" onClick={() => onReject(s.id)}
                      className="text-[12px] outline-none focus-visible:underline" style={{ color: '#a23b3b' }}>
                {t(UI.reject)}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3 : `CreateClusterInline.jsx` (formulaire création)**

```jsx
// src/components/rsa/allocation/CreateClusterInline.jsx
// Formulaire inline de création d'un cluster (= session qualifying).
import React, { useState } from 'react';
import { CREAM2, NAVY, INK, GOLD } from '@/components/design/tokens';
import { Field, Input } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { UI } from './i18n';

export default function CreateClusterInline({ onCreate, onCancel, isPending }) {
  const { t } = useLang();
  const [name, setName] = useState('');
  const [theme, setTheme] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), theme: theme.trim(), sessionDate: sessionDate || null });
  };
  return (
    <form onSubmit={submit} className="rounded-[4px] p-4 mb-4 flex flex-col gap-3"
          style={{ background: 'white', border: `1px solid ${CREAM2}` }}>
      <Field label={t(UI.clusterName)} required>
        {({ id }) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} disabled={isPending} />}
      </Field>
      <Field label={t(UI.clusterTheme)}>
        {({ id }) => <Input id={id} value={theme} onChange={(e) => setTheme(e.target.value)} disabled={isPending} />}
      </Field>
      <Field label={t(UI.clusterDate)}>
        {({ id }) => <Input id={id} type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} disabled={isPending} />}
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={isPending}
                className="text-[13px] font-medium px-4 py-2 rounded-[4px]" style={{ color: INK, border: `1px solid ${CREAM2}` }}>
          {t(UI.cancel)}
        </button>
        <button type="submit" disabled={isPending || !name.trim()}
                className="text-[13px] font-medium px-4 py-2 rounded-[4px] text-white" style={{ background: NAVY }}>
          {t(UI.create)}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4 : Vérifier les exports design**

Vérifier que `Select`, `Field`, `Input` sont bien exportés par `@/components/design` :
Run : `node -e "const fs=require('fs');const s=fs.readFileSync('src/components/design/index.js','utf8');console.log(['Select','Field','Input'].map(n=>n+':'+s.includes(n)).join(' '))"`
Expected : `Select:true Field:true Input:true`. Si `Input` n'existe pas sous ce nom, adapter au nom réel (ex. `TextInput`) — grep `export` dans `src/components/design/index.js`.

- [ ] **Step 5 : Lint + commit**

Run : `npm run lint`
```bash
git add src/components/rsa/allocation/AllocationPool.jsx src/components/rsa/allocation/ClusterColumn.jsx src/components/rsa/allocation/CreateClusterInline.jsx
git commit -m "feat(allocation): composants Pool / ClusterColumn / CreateClusterInline"
```

---

## Task 10 : Page `/Allocation` + route + lien cockpit

**Files:**
- Create: `src/pages/Allocation.jsx`
- Modify: `src/pages.config.js`
- Modify: `src/components/rsa/admin/platform/shell/CompetitionShell.jsx`

- [ ] **Step 1 : Créer `src/pages/Allocation.jsx`**

```jsx
// src/pages/Allocation.jsx
// Écran Allocation (cockpit, phase Organisation) — ADMIN ONLY. Pool d'éligibles
// + clusters + dropdown par ligne. Gate souple (bandeau "à examiner").
import React, { useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import { PageShell, PlatformFooter, Eyebrow, GOLD, NAVY, INK, MUTED, CREAM2, SERIF } from '@/components/design';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';
import { useQuery } from '@tanstack/react-query';
import { Edition } from '@/lib/rsa/entities';
import { useClubsForEdition } from '@/components/rsa/admin/platform/master/useMaster';
import { summarizeAllocation, groupAllocatedByCluster } from '@/lib/rsa/allocation';
import {
  useAllocationPool, useAllocated, useClusters, useToReviewCount,
  useAllocate, useReassign, useCreateCluster,
} from '@/components/rsa/allocation/useAllocation';
import AllocationPool from '@/components/rsa/allocation/AllocationPool';
import ClusterColumn from '@/components/rsa/allocation/ClusterColumn';
import CreateClusterInline from '@/components/rsa/allocation/CreateClusterInline';
import { UI } from '@/components/rsa/allocation/i18n';

export default function Allocation() {
  const { t } = useLang();
  const { isAuthenticated, isAdmin, isMasterAdmin, isCompetitionAdmin, loading } = usePlatformAuth();
  const [params] = useSearchParams();
  const editionParam = params.get('edition');

  const isAdminAny = isAdmin || isMasterAdmin || isCompetitionAdmin;

  const { data: activeEdition } = useQuery({
    queryKey: ['rsa', 'allocation', 'active-edition'],
    queryFn: () => Edition.active(),
    enabled: isAuthenticated && isAdminAny && !editionParam,
    staleTime: 5 * 60 * 1000,
  });
  const editionId = editionParam || activeEdition?.id || null;

  const poolQ = useAllocationPool(editionId);
  const allocQ = useAllocated(editionId);
  const clustersQ = useClusters(editionId);
  const toReviewQ = useToReviewCount(editionId);
  const clubsQ = useClubsForEdition(editionId);

  const allocate = useAllocate(editionId);
  const reassign = useReassign(editionId);
  const createCluster = useCreateCluster(editionId);

  const [showCreate, setShowCreate] = useState(false);

  const pool = poolQ.data || [];
  const allocated = allocQ.data || [];
  const clusters = clustersQ.data || [];
  const summary = useMemo(
    () => summarizeAllocation({ pool, allocated, toReviewCount: toReviewQ.data || 0 }),
    [pool, allocated, toReviewQ.data],
  );
  const groups = useMemo(() => groupAllocatedByCluster(allocated, clusters), [allocated, clusters]);

  // monoclub V1 : club unique de l'édition pour rattacher les sessions créées.
  const clubId = useMemo(() => {
    const rows = clubsQ.data || [];
    const first = rows[0];
    return first?.club?.id || first?.club_id || null;
  }, [clubsQ.data]);

  if (loading) {
    return (
      <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
        <div className="flex items-center justify-center" style={{ minHeight: '40vh' }}>
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} aria-label={t(UI.authLoading)} />
        </div>
      </PageShell>
    );
  }
  if (!isAuthenticated) return <Navigate to="/Login" replace />;
  if (!isAdminAny) {
    return (
      <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
        <div className="text-center py-20" role="status">
          <p className="text-[15px]" style={{ color: INK }}>{t(UI.noAccess)}</p>
        </div>
      </PageShell>
    );
  }

  const onAllocate = (startupId, sessionId) => allocate.mutate({ startupId, sessionId });
  const onMove = (startupId, sessionId) => allocate.mutate({ startupId, sessionId });
  const onSendBack = (startupId) => reassign.mutate({ startupId, decision: 'eligible' });
  const onReject = (startupId) => reassign.mutate({ startupId, decision: 'rejete', rationale: 'Faute de place (allocation).' });
  const onCreate = (payload) => {
    createCluster.mutate(
      { ...payload, clubId, position: clusters.length },
      { onSuccess: () => setShowCreate(false) },
    );
  };

  const isLoadingAny = poolQ.isLoading || allocQ.isLoading || clustersQ.isLoading;

  return (
    <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
      <header className="mb-5">
        <Eyebrow>{t(UI.eyebrow)}</Eyebrow>
        <h1 className="text-[28px] md:text-[32px] leading-tight mt-2 mb-2"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(UI.pageTitle)}
        </h1>
        <p className="text-[14px] max-w-[60ch]" style={{ color: INK, lineHeight: 1.6 }}>
          {t(UI.pageSubtitle)}
        </p>
      </header>

      {/* Résumé + gate souple */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4 pb-3"
           style={{ borderBottom: `1px solid ${CREAM2}` }}>
        <span className="text-[13px]" style={{ color: NAVY }}>
          {t(UI.summary)
            .replace('{total}', String(summary.eligibleTotal))
            .replace('{alloc}', String(summary.allocatedCount))
            .replace('{toPlace}', String(summary.toPlaceCount))}
        </span>
        {summary.toReviewCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: '#8a6d1f' }}>
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden style={{ color: GOLD }} />
            {t(UI.reviewWarning).replace('{n}', String(summary.toReviewCount))}
          </span>
        )}
      </div>

      {isLoadingAny ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      ) : summary.eligibleTotal === 0 ? (
        <p className="text-[14px] py-6" style={{ color: MUTED }}>{t(UI.noEligible)}</p>
      ) : (
        <>
          {/* À placer */}
          <h2 className="text-[12px] uppercase tracking-[0.14em] font-medium mb-2" style={{ color: MUTED }}>
            {t(UI.toPlace)} ({summary.toPlaceCount})
          </h2>
          <AllocationPool pool={pool} clusters={clusters} onAllocate={onAllocate} />

          {/* Clusters */}
          <div className="flex items-center justify-between mt-8 mb-3">
            <h2 className="text-[12px] uppercase tracking-[0.14em] font-medium" style={{ color: MUTED }}>
              {t(UI.clusters)}
            </h2>
            {!showCreate && (
              <button type="button" onClick={() => setShowCreate(true)}
                      className="text-[12px] font-medium px-3 py-1.5 rounded-[4px]"
                      style={{ color: NAVY, border: `1px solid ${GOLD}` }}>
                {t(UI.addCluster)}
              </button>
            )}
          </div>
          {showCreate && (
            <CreateClusterInline onCreate={onCreate} onCancel={() => setShowCreate(false)} isPending={createCluster.isPending} />
          )}
          {clusters.length === 0 && !showCreate ? (
            <p className="text-[13px] py-3" style={{ color: MUTED }}>{t(UI.noCluster)}</p>
          ) : (
            groups.map((g) => (
              <ClusterColumn key={g.cluster.id} group={g} clusters={clusters}
                             onMove={onMove} onSendBack={onSendBack} onReject={onReject} />
            ))
          )}
        </>
      )}
    </PageShell>
  );
}
```

- [ ] **Step 2 : Enregistrer la route dans `src/pages.config.js`**

Ajouter la déclaration lazy (ordre alphabétique, après `const Admin = …`) :
```js
const Allocation = lazy(() => import('./pages/Allocation'));
```
Et dans l'objet `export const PAGES = { … }`, ajouter :
```js
    "Allocation": Allocation,
```

- [ ] **Step 3 : Lien depuis la phase Organisation du cockpit**

Dans `src/components/rsa/admin/platform/shell/CompetitionShell.jsx`, dans `orgaItems`, insérer un item APRÈS `candidatures` et AVANT `jury` :
```js
    {
      key: 'allocation',
      to: `/Allocation?edition=${encodeURIComponent(editionId)}`,
      title: t({ fr: 'Allocation des éligibles', en: 'Allocate eligible startups', de: 'Zuteilung der Geeigneten' }),
      hint: t({ fr: 'Construire les clusters, répartir les éligibles', en: 'Build clusters, distribute eligible startups', de: 'Cluster bauen, Geeignete verteilen' }),
    },
```

- [ ] **Step 4 : Build complet**

Run : `npm run build`
Expected : build OK, un chunk `Allocation-*.js` généré, pas d'erreur d'import.

- [ ] **Step 5 : Commit**

```bash
git add src/pages/Allocation.jsx src/pages.config.js src/components/rsa/admin/platform/shell/CompetitionShell.jsx
git commit -m "feat(allocation): page /Allocation + route + lien cockpit Organisation"
```

---

## Task 11 : Vérification end-to-end (browser)

**Files:** aucun (vérification manuelle/MCP).

- [ ] **Step 1 : Lancer le dev server**

Run : `npm run dev` (port 5173).

- [ ] **Step 2 : Vérifier le flux Sélection (cluster retiré)**

Via chrome-devtools MCP : se connecter admin, ouvrir `/Selection`, ouvrir un dossier, cocher « éligible ». Expected : AUCUN champ cluster ; soumission OK ; le statut du dossier passe `eligible` (pas `affecte`).

- [ ] **Step 3 : Vérifier l'écran Allocation**

Ouvrir `/Allocation?edition=<id>`. Expected : la startup éligible apparaît dans « À placer ». Créer un cluster, l'allouer via le dropdown → elle descend dans la section cluster, statut `affecte`. Tester Déplacer / Renvoyer au pool / Écarter.

- [ ] **Step 4 : Vérifier le bandeau gate souple**

S'il reste des dossiers `soumis`/`en_selection`, le bandeau « X dossiers encore à examiner » s'affiche. Sinon il disparaît.

- [ ] **Step 5 : Commit (si ajustements)**

```bash
git add -A && git commit -m "fix(allocation): ajustements post-vérification browser"
```

---

## Self-Review (rempli)

- **Couverture spec** : §3 statut → Task 1 ; §4 Sélection → Tasks 4-6 ; §5 écran alloc (gate souple + dropdown) → Tasks 7-10 ; §6 RPC → Tasks 1, 3, 8 ; §8 compat (sessions Club Cockpit intactes, données affecte existantes) → projection ne touche que les nouvelles décisions ; §9 tests → Task 2 (purs) + Task 11 (E2E). ✔
- **Placeholders** : aucun TODO/TBD ; code complet dans chaque step.
- **Cohérence des types** : `Startup.allocate(startupId, sessionId)` (Task 3) ↔ `useAllocate` mutationFn `{ startupId, sessionId }` (Task 8) ↔ `onAllocate(startupId, sessionId)` (Tasks 9-10). `summarizeAllocation`/`groupAllocatedByCluster`/`slugSessionId` (Task 2) ↔ usages (Tasks 8, 10). `rsa_allocate_startup(p_startup_id, p_session_id)` (Task 1) ↔ RPC call (Task 3). ✔
- **Edge case noté** : une re-décision comité « éligible » d'une startup déjà allouée la renvoie au pool (session_id NULL via `rsa_apply_selection_review`). Comportement voulu (re-statuer reset l'allocation).
