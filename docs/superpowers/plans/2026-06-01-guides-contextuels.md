# Guides contextuels par espace — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un système de guides d'aide éditables en base, affichés dans un drawer latéral à la demande dans chacun des 5 espaces (Admin, Selection, Jury, MonDossier, Concours), avec pastille « nouveau », support FR/EN/DE, scope global + override par compétition, et un module CRUD admin.

**Architecture :** Table `guides` (contenu `{fr,en,de}` en jsonb, scopée par `space` + `edition_id` nullable) + table `guide_acks` (accusé de lecture par user/espace). Un module de logique pure (`guideLogic.js`) résout l'héritage compétition et calcule la pastille — testé en `node:test`. Un hook React Query (`useGuides`) alimente un composant unique `<GuideSpaceHelp>` (trigger + drawer) monté dans les 5 espaces. Le CRUD admin vit sur une page dédiée `/GuidesAdmin` (pattern 1 fichier = 1 route), liée depuis `/Admin`.

**Tech Stack :** React 18 + Vite, Supabase (DB + RLS), TanStack React Query, framer-motion, `@radix-ui/react-accordion`, `react-markdown` (tous **déjà installés**), i18n maison (`@/lib/platform/i18n`), tests `node:test`. **Aucune nouvelle dépendance npm.**

**Conventions repo (à respecter) :**
- Imports toujours via alias `@/`.
- Entités Supabase via `@/lib/rsa/entities` (wrapper `createEntity`).
- i18n : dicos `{ fr, en, de }` résolus par `useLang().t(...)` / `pickLang(...)`.
- Migration appliquée via **MCP Supabase** (projet `uaoucznptxmvhhytapso`), pas par fichier seul — mais le fichier `.sql` est aussi committé dans `supabase/migrations/`.
- Tests unitaires : `node:test` vanilla (`node --test <fichier>`), pas de vitest.
- Commits fréquents, un par tâche.

---

## File Structure

**Créés :**
- `supabase/migrations/20260601_rsa_guides.sql` — tables `guides` + `guide_acks`, helper `rsa_can_edit_guides()`, RLS, index.
- `src/lib/rsa/guides/guideLogic.js` — logique pure (résolution héritage + pastille). Aucune dépendance React/Supabase.
- `src/lib/rsa/guides/__tests__/guideLogic.test.js` — tests `node:test`.
- `src/lib/rsa/entities/guides.js` — entités `Guide` + `GuideAck`.
- `src/components/rsa/guides/i18n.js` — chaînes UI du « chrome » des guides (labels trigger/drawer/empty), par espace.
- `src/components/rsa/guides/useGuides.js` — hooks React Query lecteur (`useGuides`) + admin (`useGuidesAdmin` + mutations).
- `src/components/rsa/guides/GuidePanel.jsx` — drawer lecteur (accordéon + markdown).
- `src/components/rsa/guides/GuideSpaceHelp.jsx` — wrapper monté dans les espaces (trigger + état + panel).
- `src/components/rsa/admin/guides/GuideEditor.jsx` — éditeur 3 langues + aperçu markdown.
- `src/components/rsa/admin/guides/GuidesManager.jsx` — liste + réordonnancement + pickers.
- `src/pages/GuidesAdmin.jsx` — page CRUD admin (route `/GuidesAdmin`).

**Modifiés :**
- `src/lib/rsa/entities/index.js` — re-export `Guide`, `GuideAck`.
- `src/pages.config.js` — enregistrer la page `GuidesAdmin`.
- `src/pages/Admin.jsx` — lien admin vers `/GuidesAdmin`.
- `src/pages/Selection.jsx`, `src/pages/Jury.jsx`, `src/pages/MonDossier.jsx`, `src/pages/Concours.jsx` (+ `ConcoursHero.jsx`) — monter `<GuideSpaceHelp>`.

---

## Task 1 : Migration DB (tables + RLS)

**Files:**
- Create: `supabase/migrations/20260601_rsa_guides.sql`

> ⚠️ `editions.id` est de type **TEXT** (PK text) — donc `guides.edition_id` est **text**, pas uuid.

- [ ] **Step 1 : Écrire la migration**

Créer `supabase/migrations/20260601_rsa_guides.sql` :

```sql
-- Guides contextuels par espace (drawer + CRUD admin). Multiclub-ready.
-- Cf. docs/superpowers/specs/2026-06-01-guides-contextuels-design.md
--
-- NB : editions.id est TEXT → guides.edition_id est TEXT.

-- 1. Tables -----------------------------------------------------------------
create table if not exists public.guides (
  id            uuid primary key default gen_random_uuid(),
  space         text not null check (space in ('admin','selection','jury','dossier','concours')),
  edition_id    text null references public.editions(id) on delete cascade,
  title         jsonb not null default '{}'::jsonb,   -- { fr, en, de }
  body_md       jsonb not null default '{}'::jsonb,   -- { fr, en, de }
  sort_order    int  not null default 0,
  is_published  boolean not null default false,
  updated_at    timestamptz not null default now(),
  updated_by    uuid null references auth.users(id) on delete set null
);
create index if not exists guides_space_edition_sort_idx
  on public.guides (space, edition_id, sort_order);

create table if not exists public.guide_acks (
  user_id      uuid not null references auth.users(id) on delete cascade,
  space        text not null,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, space)
);

-- 2. Helper : qui peut éditer les guides (tier admin / hiérarchie V3) --------
create or replace function public.rsa_can_edit_guides()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_platform_role('admin')
      or public.has_platform_role('master_admin')
      or public.has_platform_role('competition_admin')
      or public.has_platform_role('club_admin');
$$;
revoke all on function public.rsa_can_edit_guides() from public, anon;
grant execute on function public.rsa_can_edit_guides() to authenticated;

-- 3. RLS --------------------------------------------------------------------
alter table public.guides enable row level security;
alter table public.guide_acks enable row level security;

-- guides : lecture publiée pour tout authentifié ; brouillons + écriture = admins
drop policy if exists guides_read on public.guides;
create policy guides_read on public.guides
  for select to authenticated
  using (is_published = true or public.rsa_can_edit_guides());

drop policy if exists guides_write on public.guides;
create policy guides_write on public.guides
  for all to authenticated
  using (public.rsa_can_edit_guides())
  with check (public.rsa_can_edit_guides());

-- guide_acks : chacun ne voit/écrit que ses propres lignes
drop policy if exists guide_acks_own on public.guide_acks;
create policy guide_acks_own on public.guide_acks
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 4. Anti-anon (pattern hardening repo) -------------------------------------
revoke all on public.guides from anon;
revoke all on public.guide_acks from anon;
```

- [ ] **Step 2 : Appliquer via MCP Supabase**

Utiliser l'outil MCP `apply_migration` (projet `uaoucznptxmvhhytapso`), nom `20260601_rsa_guides`, avec le SQL ci-dessus.

- [ ] **Step 3 : Vérifier l'application**

Via MCP `list_tables` → confirmer `guides` et `guide_acks` présentes avec RLS activée.
Via MCP `get_advisors` (type `security`) → confirmer aucun nouveau warning critique sur ces 2 tables (RLS enabled, pas de policy permissive anon).

Expected : 2 tables créées, RLS active, 0 advisor critique nouveau.

- [ ] **Step 4 : Commit**

```bash
git add supabase/migrations/20260601_rsa_guides.sql
git commit -m "feat(guides): migration tables guides + guide_acks + RLS"
```

---

## Task 2 : Logique pure (résolution héritage + pastille) — TDD

**Files:**
- Create: `src/lib/rsa/guides/guideLogic.js`
- Test: `src/lib/rsa/guides/__tests__/guideLogic.test.js`

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `src/lib/rsa/guides/__tests__/guideLogic.test.js` :

```js
// Tests node:test pour guideLogic — logique de résolution d'héritage + pastille.
// Lancer : node --test src/lib/rsa/guides/__tests__/guideLogic.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveGuidesForScope, hasNewBadge } from '../guideLogic.js';

const g = (id, edition_id, sort_order = 0, updated_at = '2026-06-01T00:00:00Z') =>
  ({ id, edition_id, sort_order, updated_at, is_published: true });

// — resolveGuidesForScope : override par édition —

test('édition courante avec guides dédiés → on prend CEUX-LÀ, pas les globaux', () => {
  const rows = [g('glob', null, 0), g('e1', 'edA', 0)];
  const out = resolveGuidesForScope(rows, 'edA');
  assert.deepEqual(out.map((r) => r.id), ['e1']);
});

test('édition courante sans guide dédié → fallback sur les globaux (edition_id null)', () => {
  const rows = [g('glob', null, 0), g('e1', 'edA', 0)];
  const out = resolveGuidesForScope(rows, 'edB');
  assert.deepEqual(out.map((r) => r.id), ['glob']);
});

test('pas d\'édition courante (null) → guides globaux', () => {
  const rows = [g('glob', null, 0), g('e1', 'edA', 0)];
  const out = resolveGuidesForScope(rows, null);
  assert.deepEqual(out.map((r) => r.id), ['glob']);
});

test('tri par sort_order croissant', () => {
  const rows = [g('b', null, 2), g('a', null, 1), g('c', null, 3)];
  const out = resolveGuidesForScope(rows, null);
  assert.deepEqual(out.map((r) => r.id), ['a', 'b', 'c']);
});

test('liste vide → []', () => {
  assert.deepEqual(resolveGuidesForScope([], 'edA'), []);
  assert.deepEqual(resolveGuidesForScope(null, 'edA'), []);
});

// — hasNewBadge : pastille « nouveau » —

test('aucun ack → badge si au moins un guide', () => {
  const rows = [g('a', null, 0, '2026-06-01T00:00:00Z')];
  assert.equal(hasNewBadge(rows, null), true);
});

test('aucun guide → pas de badge même sans ack', () => {
  assert.equal(hasNewBadge([], null), false);
});

test('ack postérieur au dernier update → pas de badge', () => {
  const rows = [g('a', null, 0, '2026-06-01T00:00:00Z')];
  assert.equal(hasNewBadge(rows, '2026-06-02T00:00:00Z'), false);
});

test('guide mis à jour APRÈS l\'ack → badge', () => {
  const rows = [g('a', null, 0, '2026-06-03T00:00:00Z')];
  assert.equal(hasNewBadge(rows, '2026-06-02T00:00:00Z'), true);
});
```

- [ ] **Step 2 : Lancer les tests → ils échouent**

Run : `node --test src/lib/rsa/guides/__tests__/guideLogic.test.js`
Expected : FAIL — `Cannot find module '../guideLogic.js'`.

- [ ] **Step 3 : Implémenter le module pur**

Créer `src/lib/rsa/guides/guideLogic.js` :

```js
// Logique pure des guides — sans React ni Supabase, testable en isolation.
//
// resolveGuidesForScope : override par compétition (édition). Si l'édition
// courante a des guides dédiés, on les prend ; sinon on retombe sur les guides
// globaux (edition_id null). Pas de merge ligne-à-ligne (cf. design §héritage).
//
// hasNewBadge : la pastille « nouveau » s'allume tant que le user n'a pas vu
// la dernière mise à jour publiée de l'espace.

export function resolveGuidesForScope(rows, editionId) {
  const list = Array.isArray(rows) ? rows : [];
  const scoped = editionId
    ? list.filter((r) => r.edition_id === editionId)
    : [];
  const chosen = scoped.length > 0
    ? scoped
    : list.filter((r) => r.edition_id == null);
  return [...chosen].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export function hasNewBadge(resolvedRows, lastSeenAt) {
  const list = Array.isArray(resolvedRows) ? resolvedRows : [];
  if (list.length === 0) return false;
  if (!lastSeenAt) return true;
  const seen = new Date(lastSeenAt).getTime();
  return list.some((r) => new Date(r.updated_at).getTime() > seen);
}
```

- [ ] **Step 4 : Relancer les tests → ils passent**

Run : `node --test src/lib/rsa/guides/__tests__/guideLogic.test.js`
Expected : PASS (9 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/lib/rsa/guides/guideLogic.js src/lib/rsa/guides/__tests__/guideLogic.test.js
git commit -m "feat(guides): logique pure résolution héritage + pastille (node:test)"
```

---

## Task 3 : Entités Guide + GuideAck

**Files:**
- Create: `src/lib/rsa/entities/guides.js`
- Modify: `src/lib/rsa/entities/index.js`

- [ ] **Step 1 : Écrire l'entité**

Créer `src/lib/rsa/entities/guides.js` :

```js
// Entités guides : Guide (CRUD admin + lecture publiée) + GuideAck (pastille).
// Le wrapper createEntity fournit list/create/update/delete/filter (cf. _createEntity).

import { supabase } from '@/lib/supabase';
import { createEntity } from './_createEntity';

export const Guide = {
  ...createEntity('guides'),

  // Lecteur : tous les guides PUBLIÉS d'un espace (globaux + toutes éditions).
  // La résolution global/édition se fait côté JS (resolveGuidesForScope).
  async listPublishedForSpace(space) {
    const { data, error } = await supabase
      .from('guides')
      .select('*')
      .eq('space', space)
      .eq('is_published', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // Admin : tous les guides d'un espace (brouillons inclus), pour une portée.
  //   editionId === null  → guides globaux (edition_id is null)
  //   editionId === 'xxx' → guides de cette édition
  async listAllForAdmin(space, editionId) {
    let q = supabase.from('guides').select('*').eq('space', space);
    q = editionId == null ? q.is('edition_id', null) : q.eq('edition_id', editionId);
    const { data, error } = await q.order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // Admin : enregistre l'ordre après drag (liste d'ids ordonnée).
  async reorder(ids) {
    await Promise.all(
      ids.map((id, idx) =>
        supabase.from('guides').update({ sort_order: idx, updated_at: new Date().toISOString() }).eq('id', id),
      ),
    );
  },
};

export const GuideAck = {
  // Dernier accusé de lecture du user courant pour un espace (ou null).
  async getForSpace(space) {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id;
    if (!uid) return null;
    const { data, error } = await supabase
      .from('guide_acks')
      .select('last_seen_at')
      .eq('user_id', uid)
      .eq('space', space)
      .maybeSingle();
    if (error) throw error;
    return data?.last_seen_at ?? null;
  },

  // Marque l'espace comme « vu » maintenant (upsert).
  async touch(space) {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id;
    if (!uid) return;
    const { error } = await supabase
      .from('guide_acks')
      .upsert({ user_id: uid, space, last_seen_at: new Date().toISOString() }, { onConflict: 'user_id,space' });
    if (error) throw error;
  },
};
```

- [ ] **Step 2 : Enregistrer dans le façade index**

Modifier `src/lib/rsa/entities/index.js` — ajouter après la ligne `export { JuryApplication } ...` :

```js
export { Guide, GuideAck } from './guides';
```

- [ ] **Step 3 : Vérifier le build (résolution d'import)**

Run : `npm run build`
Expected : build OK (pas d'erreur de résolution `@/lib/rsa/entities/guides`).

- [ ] **Step 4 : Commit**

```bash
git add src/lib/rsa/entities/guides.js src/lib/rsa/entities/index.js
git commit -m "feat(guides): entités Guide + GuideAck"
```

---

## Task 4 : i18n du chrome des guides

**Files:**
- Create: `src/components/rsa/guides/i18n.js`

- [ ] **Step 1 : Écrire les chaînes**

Créer `src/components/rsa/guides/i18n.js` :

```js
// Chaînes UI du « chrome » des guides (labels, titres de drawer par espace).
// Le CONTENU des guides vient de la base ; ici uniquement l'habillage.
// Dicos { fr, en, de } résolus via useLang().t(...).

export const GUIDE_UI = {
  trigger: { fr: 'Guide', en: 'Guide', de: 'Anleitung' },
  triggerAria: { fr: 'Ouvrir le guide', en: 'Open guide', de: 'Anleitung öffnen' },
  newBadgeAria: { fr: 'Nouveau contenu', en: 'New content', de: 'Neuer Inhalt' },
  close: { fr: 'Fermer', en: 'Close', de: 'Schließen' },
  loading: { fr: 'Chargement…', en: 'Loading…', de: 'Laden…' },
  loadError: { fr: 'Impossible de charger le guide.', en: 'Could not load the guide.', de: 'Anleitung konnte nicht geladen werden.' },
  empty: { fr: 'Aucun guide pour le moment.', en: 'No guide yet.', de: 'Noch keine Anleitung.' },
  updatedAt: { fr: 'Mis à jour le', en: 'Updated on', de: 'Aktualisiert am' },
};

// Titre du drawer par espace.
export const GUIDE_SPACE_TITLE = {
  admin: { fr: 'Guide — Administration', en: 'Guide — Administration', de: 'Anleitung — Verwaltung' },
  selection: { fr: 'Guide — Sélection', en: 'Guide — Selection', de: 'Anleitung — Auswahl' },
  jury: { fr: 'Guide — Jury', en: 'Guide — Jury', de: 'Anleitung — Jury' },
  dossier: { fr: 'Guide — Mon dossier', en: 'Guide — My application', de: 'Anleitung — Meine Bewerbung' },
  concours: { fr: 'Guide — Le concours', en: 'Guide — The competition', de: 'Anleitung — Der Wettbewerb' },
};

export const GUIDE_SPACES = ['admin', 'selection', 'jury', 'dossier', 'concours'];

// Libellé lisible d'un espace (picker admin).
export const GUIDE_SPACE_LABEL = {
  admin: { fr: 'Administration', en: 'Administration', de: 'Verwaltung' },
  selection: { fr: 'Sélection', en: 'Selection', de: 'Auswahl' },
  jury: { fr: 'Jury', en: 'Jury', de: 'Jury' },
  dossier: { fr: 'Mon dossier', en: 'My application', de: 'Meine Bewerbung' },
  concours: { fr: 'Le concours', en: 'The competition', de: 'Der Wettbewerb' },
};
```

- [ ] **Step 2 : Commit**

```bash
git add src/components/rsa/guides/i18n.js
git commit -m "feat(guides): i18n du chrome des guides (FR/EN/DE)"
```

---

## Task 5 : Hook lecteur useGuides

**Files:**
- Create: `src/components/rsa/guides/useGuides.js`

- [ ] **Step 1 : Écrire le hook**

Créer `src/components/rsa/guides/useGuides.js` :

```js
// Hooks React Query des guides.
//
// useGuides(space, editionId) — LECTEUR : récupère les guides publiés de
// l'espace, résout l'héritage (global/édition), calcule la pastille « nouveau »
// depuis l'ack du user, et expose markSeen() (upsert ack + invalide).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Guide, GuideAck } from '@/lib/rsa/entities';
import { resolveGuidesForScope, hasNewBadge } from '@/lib/rsa/guides/guideLogic';

export const GUIDE_KEYS = {
  published: (space) => ['rsa', 'guides', 'published', space],
  ack: (space) => ['rsa', 'guides', 'ack', space],
  admin: (space, editionId) => ['rsa', 'guides', 'admin', space, editionId ?? '__global__'],
};

export function useGuides(space, editionId) {
  const qc = useQueryClient();

  const publishedQ = useQuery({
    queryKey: GUIDE_KEYS.published(space),
    queryFn: () => Guide.listPublishedForSpace(space),
    staleTime: 5 * 60 * 1000,
    enabled: !!space,
  });

  const ackQ = useQuery({
    queryKey: GUIDE_KEYS.ack(space),
    queryFn: () => GuideAck.getForSpace(space),
    staleTime: 5 * 60 * 1000,
    enabled: !!space,
  });

  const markSeen = useMutation({
    mutationFn: () => GuideAck.touch(space),
    onSuccess: () => qc.invalidateQueries({ queryKey: GUIDE_KEYS.ack(space) }),
  });

  const guides = resolveGuidesForScope(publishedQ.data || [], editionId);
  const showBadge = hasNewBadge(guides, ackQ.data ?? null);

  return {
    guides,
    isLoading: publishedQ.isLoading,
    isError: publishedQ.isError,
    showBadge,
    hasGuides: guides.length > 0,
    markSeen: () => markSeen.mutate(),
  };
}
```

- [ ] **Step 2 : Vérifier le build**

Run : `npm run build`
Expected : build OK.

- [ ] **Step 3 : Commit**

```bash
git add src/components/rsa/guides/useGuides.js
git commit -m "feat(guides): hook lecteur useGuides (résolution + pastille + ack)"
```

---

## Task 6 : GuidePanel (drawer lecteur)

**Files:**
- Create: `src/components/rsa/guides/GuidePanel.jsx`

Réutilise le pattern `SessionDetailDrawer` (overlay navy 0.45, panneau droit, Escape, scroll lock). Accordéon via `@radix-ui/react-accordion`, contenu markdown via `react-markdown`. Texte résolu par langue via `pickLang` (fallback fr → en → 1re dispo).

- [ ] **Step 1 : Écrire le composant**

Créer `src/components/rsa/guides/GuidePanel.jsx` :

```jsx
// GuidePanel — drawer lecteur des guides d'un espace. Accordéon d'articles,
// contenu markdown rendu par langue courante (fallback via pickLang).
// Pattern visuel calqué sur SessionDetailDrawer (overlay, motion, Esc).

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as Accordion from '@radix-ui/react-accordion';
import ReactMarkdown from 'react-markdown';
import { X, ChevronDown } from 'lucide-react';
import { NAVY, GOLD, INK, MUTED, CREAM2, SERIF, EASE } from '@/components/design/tokens';
import { useLang, pickLang } from '@/lib/platform/i18n';
import { GUIDE_UI, GUIDE_SPACE_TITLE } from './i18n';

function formatDate(iso, lang) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(
      lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : 'en-GB',
      { day: 'numeric', month: 'long', year: 'numeric' },
    );
  } catch {
    return null;
  }
}

export default function GuidePanel({ open, space, guides, isLoading, isError, onClose }) {
  const { t, lang } = useLang();

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    if (open) {
      window.addEventListener('keydown', onKey);
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', onKey);
        document.body.style.overflow = prev;
      };
    }
    return undefined;
  }, [open, onClose]);

  const lastUpdated = guides.reduce(
    (max, g) => (g.updated_at > max ? g.updated_at : max),
    '',
  );

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-stretch md:items-center justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-drawer-title"
        >
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute inset-0"
            style={{ background: 'rgba(15,31,61,0.45)' }}
            onClick={onClose}
          />
          <motion.aside
            key="panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="relative w-full md:w-[480px] h-full overflow-y-auto"
            style={{ background: 'white', borderLeft: `1px solid ${CREAM2}` }}
          >
            <div aria-hidden className="h-[3px]" style={{ background: GOLD }} />
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-5 py-3"
              style={{ background: 'white', borderBottom: `1px solid ${CREAM2}` }}
            >
              <div
                id="guide-drawer-title"
                className="uppercase text-[10px] tracking-[0.18em] font-semibold"
                style={{ color: NAVY }}
              >
                {t(GUIDE_SPACE_TITLE[space])}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t(GUIDE_UI.close)}
                className="p-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] hover:bg-[#faf7f2]"
                style={{ color: NAVY }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-6">
              {isLoading && <div className="text-[13px]" style={{ color: MUTED }}>{t(GUIDE_UI.loading)}</div>}
              {isError && <div className="text-[13px]" style={{ color: '#b91c1c' }}>{t(GUIDE_UI.loadError)}</div>}
              {!isLoading && !isError && guides.length === 0 && (
                <div className="text-[13px] italic" style={{ color: MUTED }}>{t(GUIDE_UI.empty)}</div>
              )}

              {guides.length > 0 && (
                <Accordion.Root type="single" collapsible defaultValue={guides[0]?.id}>
                  {guides.map((g) => (
                    <Accordion.Item key={g.id} value={g.id} style={{ borderBottom: `1px solid ${CREAM2}` }}>
                      <Accordion.Header>
                        <Accordion.Trigger
                          className="group w-full flex items-center justify-between gap-3 py-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] rounded-[4px]"
                        >
                          <span className="text-[14px] font-medium" style={{ color: NAVY, fontFamily: SERIF }}>
                            {pickLang(g.title, lang) || '—'}
                          </span>
                          <ChevronDown
                            className="w-4 h-4 shrink-0 transition-transform group-data-[state=open]:rotate-180"
                            style={{ color: MUTED }}
                            aria-hidden
                          />
                        </Accordion.Trigger>
                      </Accordion.Header>
                      <Accordion.Content className="pb-4">
                        <div
                          className="guide-prose text-[13.5px] leading-relaxed"
                          style={{ color: INK }}
                        >
                          <ReactMarkdown>{pickLang(g.body_md, lang) || ''}</ReactMarkdown>
                        </div>
                      </Accordion.Content>
                    </Accordion.Item>
                  ))}
                </Accordion.Root>
              )}

              {lastUpdated && (
                <div className="mt-6 text-[11px]" style={{ color: MUTED }}>
                  {t(GUIDE_UI.updatedAt)} {formatDate(lastUpdated, lang)}
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2 : Style markdown minimal**

Vérifier qu'un style de base s'applique au markdown. Ajouter dans `src/index.css` (à la fin) :

```css
/* Lisibilité du markdown des guides (drawer). */
.guide-prose h2 { font-size: 15px; font-weight: 600; margin: 14px 0 6px; color: #0f1f3d; }
.guide-prose h3 { font-size: 13.5px; font-weight: 600; margin: 12px 0 4px; color: #0f1f3d; }
.guide-prose p { margin: 0 0 10px; }
.guide-prose ul, .guide-prose ol { margin: 0 0 10px; padding-left: 20px; }
.guide-prose li { margin: 2px 0; }
.guide-prose a { color: #9a6400; text-decoration: underline; }
.guide-prose strong { font-weight: 600; color: #0f1f3d; }
```

> Si `src/index.css` n'existe pas, repérer le CSS global importé dans `src/main.jsx` / `src/App.jsx` et y ajouter le bloc.

- [ ] **Step 3 : Vérifier le build**

Run : `npm run build`
Expected : build OK.

- [ ] **Step 4 : Commit**

```bash
git add src/components/rsa/guides/GuidePanel.jsx src/index.css
git commit -m "feat(guides): GuidePanel (drawer accordéon + markdown)"
```

---

## Task 7 : GuideSpaceHelp (trigger + état + panel)

**Files:**
- Create: `src/components/rsa/guides/GuideSpaceHelp.jsx`

Composant unique à monter dans chaque espace. Rend un bouton `?` avec pastille ; à zéro guide publié, **ne rend rien** (pas de coquille vide). À l'ouverture → `markSeen()`.

- [ ] **Step 1 : Écrire le composant**

Créer `src/components/rsa/guides/GuideSpaceHelp.jsx` :

```jsx
// GuideSpaceHelp — point de montage unique des guides dans un espace.
// <GuideSpaceHelp space="jury" editionId={editionId} />
//
// Rend le bouton trigger + pastille + le drawer. Si aucun guide publié pour
// l'espace/portée, ne rend rien (le bouton n'apparaît pas).

import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { NAVY, GOLD, CREAM2 } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { useGuides } from './useGuides';
import { GUIDE_UI } from './i18n';
import GuidePanel from './GuidePanel';

export default function GuideSpaceHelp({ space, editionId = null, className = '' }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const { guides, hasGuides, isLoading, isError, showBadge, markSeen } = useGuides(space, editionId);

  // Pas de guide publié → on n'affiche pas le bouton (mais on attend la fin du load
  // pour ne pas masquer un bouton qui va apparaître).
  if (!hasGuides) return null;

  function openPanel() {
    setOpen(true);
    markSeen();
  }

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        aria-label={t(GUIDE_UI.triggerAria)}
        className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-[12px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] hover:bg-[#faf7f2] transition-colors ${className}`}
        style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}
      >
        <HelpCircle className="w-3.5 h-3.5" aria-hidden />
        {t(GUIDE_UI.trigger)}
        {showBadge && (
          <span
            aria-label={t(GUIDE_UI.newBadgeAria)}
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
            style={{ background: GOLD, boxShadow: '0 0 0 2px white' }}
          />
        )}
      </button>

      <GuidePanel
        open={open}
        space={space}
        guides={guides}
        isLoading={isLoading}
        isError={isError}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
```

- [ ] **Step 2 : Vérifier le build**

Run : `npm run build`
Expected : build OK.

- [ ] **Step 3 : Commit**

```bash
git add src/components/rsa/guides/GuideSpaceHelp.jsx
git commit -m "feat(guides): GuideSpaceHelp (trigger + pastille + panel)"
```

---

## Task 8 : Monter GuideSpaceHelp dans les 5 espaces

> Import à ajouter en tête de chaque fichier :
> `import GuideSpaceHelp from '@/components/rsa/guides/GuideSpaceHelp';`
> Chaque espace passe son `space` et l'`editionId` disponible dans le scope (cf. variables ci-dessous).

**Files:**
- Modify: `src/pages/Admin.jsx` (header ~337–343, var `currentEditionId`)
- Modify: `src/pages/Selection.jsx` (header ~275–289, var `editionId`)
- Modify: `src/pages/Jury.jsx` (header `JuryWorkspace` ~199–267, var `adminEditionId`)
- Modify: `src/pages/MonDossier.jsx` (header funnel, var `editionId`)
- Modify: `src/components/rsa/concours-dashboard/ConcoursHero.jsx` (prop `edition`)

- [ ] **Step 1 : Admin** — envelopper le `<header>` (lignes ~337–343) dans un flex pour poser le trigger en haut à droite.

Remplacer le `<header className="mb-8 md:mb-10">…</header>` par :

```jsx
<header className="mb-8 md:mb-10 flex items-start justify-between gap-4">
  <div className="min-w-0">
    <Eyebrow>{t(UI.eyebrow)}</Eyebrow>
    <EditorialTitle lead={t(UI.pageTitle)} size="md" />
    <p className="mt-3 text-[14px] md:text-[15px] max-w-[60ch]" style={{ color: INK, lineHeight: 1.65 }}>
      {t(UI.pageSubtitle)}
    </p>
  </div>
  <GuideSpaceHelp space="admin" editionId={currentEditionId || null} className="shrink-0 mt-1" />
</header>
```

- [ ] **Step 2 : Selection** — même principe sur le `<header>` (~275–289) :

```jsx
<header className="mb-4 md:mb-6 flex items-start justify-between gap-4">
  <div className="min-w-0">
    {/* ...contenu existant (Eyebrow + h1 + p)... */}
  </div>
  <GuideSpaceHelp space="selection" editionId={editionId || null} className="shrink-0 mt-1" />
</header>
```

> Conserver tel quel le contenu interne existant (Eyebrow, h1, p) en le déplaçant dans le `<div className="min-w-0">`.

- [ ] **Step 3 : Jury** — le header (`JuryWorkspace` ~199–267) a déjà un slot droit (`<dl>` de KPIs). Ajouter le trigger juste avant le `<dl>`, dans le même flex. Après le `<div className="flex-1 min-w-0">…</div>` et avant `<dl …>`, insérer :

```jsx
<GuideSpaceHelp space="jury" editionId={adminEditionId || null} className="shrink-0 self-start" />
```

- [ ] **Step 4 : MonDossier** — placer le trigger dans le bandeau `Eyebrow` du funnel (`src/pages/MonDossier.jsx`, ~552–555). Remplacer :

```jsx
<div className="mb-5">
  <Eyebrow>{t(UI.eyebrow)}</Eyebrow>
</div>
```

par :

```jsx
<div className="mb-5 flex items-center justify-between gap-4">
  <Eyebrow>{t(UI.eyebrow)}</Eyebrow>
  <GuideSpaceHelp space="dossier" editionId={editionId || null} className="shrink-0" />
</div>
```

- [ ] **Step 5 : Concours** — monter dans `ConcoursHero.jsx`. Ajouter l'import en tête, puis dans le `<section className="mb-10 md:mb-12">`, envelopper l'en-tête pour poser le trigger en haut à droite. Insérer, juste après l'ouverture de la `<section>` :

```jsx
<div className="flex justify-end mb-2">
  <GuideSpaceHelp space="concours" editionId={edition?.id || null} />
</div>
```

> `edition` est déjà une prop de `ConcoursHero`. Import requis en tête du fichier.

- [ ] **Step 6 : Lint + build**

Run : `npm run lint`
Expected : 0 erreur (imports utilisés).
Run : `npm run build`
Expected : build OK.

- [ ] **Step 7 : Commit**

```bash
git add src/pages/Admin.jsx src/pages/Selection.jsx src/pages/Jury.jsx src/pages/MonDossier.jsx src/components/rsa/concours-dashboard/ConcoursHero.jsx
git commit -m "feat(guides): montage GuideSpaceHelp dans les 5 espaces"
```

---

## Task 9 : Hooks admin + mutations

**Files:**
- Modify: `src/components/rsa/guides/useGuides.js`

- [ ] **Step 1 : Ajouter les hooks admin**

Ajouter à la fin de `src/components/rsa/guides/useGuides.js` :

```js
// — ADMIN —

export function useGuidesAdmin(space, editionId) {
  return useQuery({
    queryKey: GUIDE_KEYS.admin(space, editionId),
    queryFn: () => Guide.listAllForAdmin(space, editionId),
    enabled: !!space,
    staleTime: 0,
  });
}

export function useGuideMutations(space, editionId) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: GUIDE_KEYS.admin(space, editionId) });
    qc.invalidateQueries({ queryKey: GUIDE_KEYS.published(space) });
  };

  const save = useMutation({
    // record : { id?, space, edition_id, title, body_md, is_published, sort_order }
    mutationFn: async (record) => {
      const payload = { ...record, updated_at: new Date().toISOString() };
      if (record.id) {
        const { id, ...rest } = payload;
        return Guide.update(id, rest);
      }
      return Guide.create(payload);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id) => Guide.delete(id),
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: (ids) => Guide.reorder(ids),
    onSuccess: invalidate,
  });

  return { save, remove, reorder };
}
```

- [ ] **Step 2 : Build**

Run : `npm run build`
Expected : build OK.

- [ ] **Step 3 : Commit**

```bash
git add src/components/rsa/guides/useGuides.js
git commit -m "feat(guides): hooks admin useGuidesAdmin + mutations"
```

---

## Task 10 : GuideEditor (éditeur 3 langues + aperçu)

**Files:**
- Create: `src/components/rsa/admin/guides/GuideEditor.jsx`

- [ ] **Step 1 : Écrire l'éditeur**

Créer `src/components/rsa/admin/guides/GuideEditor.jsx` :

```jsx
// GuideEditor — édite un article de guide en 3 langues (FR/EN/DE) avec aperçu
// markdown live. Contrôlé : reçoit `value` (l'article) + onChange + onSave + onCancel.

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { NAVY, GOLD, INK, MUTED, CREAM, CREAM2 } from '@/components/design/tokens';
import { useLang, LANGS } from '@/lib/platform/i18n';

export default function GuideEditor({ value, onChange, onSave, onCancel, saving }) {
  const { t } = useLang();
  const [editLang, setEditLang] = useState('fr');

  const title = value.title || {};
  const body = value.body_md || {};

  const setField = (field, lang, v) =>
    onChange({ ...value, [field]: { ...(value[field] || {}), [lang]: v } });

  return (
    <div className="rounded-[6px] p-4" style={{ background: 'white', border: `1px solid ${CREAM2}` }}>
      {/* Onglets langue */}
      <div className="flex items-center gap-1.5 mb-4">
        {LANGS.map((l) => {
          const on = editLang === l;
          const filled = !!(title[l] || body[l]);
          return (
            <button
              key={l}
              type="button"
              onClick={() => setEditLang(l)}
              className="px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.08em] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] inline-flex items-center gap-1.5"
              style={{
                background: on ? GOLD : 'transparent',
                color: on ? NAVY : MUTED,
                border: `1px solid ${on ? GOLD : CREAM2}`,
              }}
            >
              {l}
              {filled && <span className="w-1.5 h-1.5 rounded-full" style={{ background: on ? NAVY : GOLD }} aria-hidden />}
            </button>
          );
        })}
      </div>

      {/* Titre */}
      <input
        type="text"
        value={title[editLang] || ''}
        onChange={(e) => setField('title', editLang, e.target.value)}
        placeholder={`Titre (${editLang})`}
        className="w-full mb-3 px-3 py-2 rounded-[4px] text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
        style={{ border: `1px solid ${CREAM2}`, color: NAVY }}
      />

      {/* Corps + aperçu */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <textarea
          value={body[editLang] || ''}
          onChange={(e) => setField('body_md', editLang, e.target.value)}
          placeholder={`Corps markdown (${editLang})`}
          rows={12}
          className="w-full px-3 py-2 rounded-[4px] text-[13px] font-mono outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
          style={{ border: `1px solid ${CREAM2}`, color: INK, resize: 'vertical' }}
        />
        <div
          className="guide-prose px-3 py-2 rounded-[4px] text-[13px] overflow-auto"
          style={{ border: `1px solid ${CREAM2}`, background: CREAM, color: INK, minHeight: 120 }}
        >
          <ReactMarkdown>{body[editLang] || '_Aperçu_'}</ReactMarkdown>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-4">
        <label className="inline-flex items-center gap-2 text-[13px]" style={{ color: NAVY }}>
          <input
            type="checkbox"
            checked={!!value.is_published}
            onChange={(e) => onChange({ ...value, is_published: e.target.checked })}
          />
          {t({ fr: 'Publié', en: 'Published', de: 'Veröffentlicht' })}
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-[4px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
            style={{ border: `1px solid ${CREAM2}`, color: MUTED, background: 'white' }}
          >
            {t({ fr: 'Annuler', en: 'Cancel', de: 'Abbrechen' })}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-4 py-1.5 rounded-[4px] text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] disabled:opacity-50"
            style={{ background: NAVY, color: 'white' }}
          >
            {t({ fr: 'Enregistrer', en: 'Save', de: 'Speichern' })}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Build**

Run : `npm run build`
Expected : build OK.

- [ ] **Step 3 : Commit**

```bash
git add src/components/rsa/admin/guides/GuideEditor.jsx
git commit -m "feat(guides): GuideEditor (3 langues + aperçu markdown)"
```

---

## Task 11 : GuidesManager (liste + réordonnancement + pickers)

**Files:**
- Create: `src/components/rsa/admin/guides/GuidesManager.jsx`

Liste les articles d'un `(space, portée)`, permet drag-reorder (`@hello-pangea/dnd`), création, édition (via GuideEditor), publication, suppression. La portée = Global ou une édition choisie.

- [ ] **Step 1 : Écrire le manager**

Créer `src/components/rsa/admin/guides/GuidesManager.jsx` :

```jsx
// GuidesManager — CRUD des guides pour un espace + une portée (global/édition).
// Drag-reorder via @hello-pangea/dnd. Édition inline via GuideEditor.

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Pencil, Trash2, Plus } from 'lucide-react';
import { NAVY, GOLD, MUTED, CREAM, CREAM2 } from '@/components/design/tokens';
import { useLang, pickLang } from '@/lib/platform/i18n';
import { GUIDE_SPACES, GUIDE_SPACE_LABEL } from '@/components/rsa/guides/i18n';
import { useGuidesAdmin, useGuideMutations } from '@/components/rsa/guides/useGuides';
import GuideEditor from './GuideEditor';

const emptyArticle = (space, editionId) => ({
  space,
  edition_id: editionId,
  title: {},
  body_md: {},
  is_published: false,
  sort_order: 0,
});

export default function GuidesManager({ editions = [] }) {
  const { t, lang } = useLang();
  const [space, setSpace] = useState('admin');
  const [editionId, setEditionId] = useState(null); // null = global
  const [editing, setEditing] = useState(null); // article en cours d'édition (ou null)

  const listQ = useGuidesAdmin(space, editionId);
  const { save, remove, reorder } = useGuideMutations(space, editionId);
  const rows = listQ.data || [];

  function onDragEnd(result) {
    if (!result.destination) return;
    const next = [...rows];
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    reorder.mutate(next.map((r) => r.id));
  }

  async function handleSave() {
    await save.mutateAsync({ ...editing, space, edition_id: editionId });
    setEditing(null);
  }

  return (
    <div>
      {/* Pickers espace + portée */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select
          value={space}
          onChange={(e) => { setSpace(e.target.value); setEditing(null); }}
          className="text-[13px] rounded-[4px] px-3 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
          style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
        >
          {GUIDE_SPACES.map((s) => (
            <option key={s} value={s}>{t(GUIDE_SPACE_LABEL[s])}</option>
          ))}
        </select>

        <select
          value={editionId ?? '__global__'}
          onChange={(e) => { const v = e.target.value; setEditionId(v === '__global__' ? null : v); setEditing(null); }}
          className="text-[13px] rounded-[4px] px-3 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
          style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
        >
          <option value="__global__">{t({ fr: 'Portée : Global', en: 'Scope: Global', de: 'Geltung: Global' })}</option>
          {editions.map((ed) => (
            <option key={ed.id} value={ed.id}>{ed.name || ed.id}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setEditing(emptyArticle(space, editionId))}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
          style={{ background: NAVY, color: 'white' }}
        >
          <Plus className="w-3.5 h-3.5" />
          {t({ fr: 'Nouvel article', en: 'New article', de: 'Neuer Artikel' })}
        </button>
      </div>

      {/* Éditeur (création ou édition) */}
      {editing && (
        <div className="mb-5">
          <GuideEditor
            value={editing}
            onChange={setEditing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
            saving={save.isPending}
          />
        </div>
      )}

      {/* Liste réordonnable */}
      {listQ.isLoading ? (
        <div className="text-[13px]" style={{ color: MUTED }}>{t({ fr: 'Chargement…', en: 'Loading…', de: 'Laden…' })}</div>
      ) : rows.length === 0 ? (
        <div className="text-[13px] italic" style={{ color: MUTED }}>
          {t({ fr: 'Aucun article pour cette portée.', en: 'No article for this scope.', de: 'Kein Artikel für diese Geltung.' })}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="guides-list">
            {(provided) => (
              <ul className="m-0 p-0 list-none" ref={provided.innerRef} {...provided.droppableProps}>
                {rows.map((r, idx) => (
                  <Draggable key={r.id} draggableId={r.id} index={idx}>
                    {(prov) => (
                      <li
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        className="flex items-center gap-3 py-2.5 px-3 mb-1.5 rounded-[4px]"
                        style={{ background: CREAM, border: `1px solid ${CREAM2}`, ...prov.draggableProps.style }}
                      >
                        <span {...prov.dragHandleProps} className="cursor-grab" aria-label="Réordonner">
                          <GripVertical className="w-4 h-4" style={{ color: MUTED }} />
                        </span>
                        <span className="flex-1 min-w-0 truncate text-[13.5px]" style={{ color: NAVY }}>
                          {pickLang(r.title, lang) || '—'}
                        </span>
                        <span
                          className="text-[10px] uppercase tracking-[0.1em] px-2 py-0.5 rounded-full"
                          style={{
                            background: r.is_published ? 'rgba(201,168,76,0.15)' : '#f1f1f4',
                            color: r.is_published ? '#9a6400' : MUTED,
                          }}
                        >
                          {r.is_published
                            ? t({ fr: 'Publié', en: 'Published', de: 'Veröffentlicht' })
                            : t({ fr: 'Brouillon', en: 'Draft', de: 'Entwurf' })}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditing(r)}
                          className="p-1.5 rounded-[4px] hover:bg-white outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
                          aria-label={t({ fr: 'Éditer', en: 'Edit', de: 'Bearbeiten' })}
                          style={{ color: NAVY }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { if (window.confirm(t({ fr: 'Supprimer cet article ?', en: 'Delete this article?', de: 'Diesen Artikel löschen?' }))) remove.mutate(r.id); }}
                          className="p-1.5 rounded-[4px] hover:bg-white outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
                          aria-label={t({ fr: 'Supprimer', en: 'Delete', de: 'Löschen' })}
                          style={{ color: '#b91c1c' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Build**

Run : `npm run build`
Expected : build OK.

- [ ] **Step 3 : Commit**

```bash
git add src/components/rsa/admin/guides/GuidesManager.jsx
git commit -m "feat(guides): GuidesManager (liste + reorder + pickers portée)"
```

---

## Task 12 : Page GuidesAdmin + route + lien depuis Admin

**Files:**
- Create: `src/pages/GuidesAdmin.jsx`
- Modify: `src/pages.config.js`
- Modify: `src/pages/Admin.jsx`

- [ ] **Step 1 : Écrire la page**

Créer `src/pages/GuidesAdmin.jsx`. Réutilise le shell (`PageShell` + `nav`) comme Admin.jsx, charge les éditions pour le picker de portée, et gate l'accès aux admins.

> Pour le **gate admin**, réutiliser exactement la même détection que `Admin.jsx` (la variable qui détermine `hasMaster`/admin — typiquement issue de `usePlatformAuth()` / des rôles). Inspecter le haut de `src/pages/Admin.jsx` et reproduire le même garde (redirection `/Login` ou écran « accès refusé » si non-admin). Ci-dessous le squelette ; remplacer `useIsAdmin()` par le helper de rôle réellement utilisé dans Admin.jsx.

```jsx
// /GuidesAdmin — CRUD des guides contextuels. Admin-only.
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/design/shell/PageShell';
import PlatformFooter from '@/components/design/shell/PlatformFooter';
import { Eyebrow, EditorialTitle } from '@/components/design';
import SafeBackLink from '@/components/design/shell/SafeBackLink'; // si le chemin diffère, aligner sur l'import d'Admin.jsx
import { INK } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { Edition } from '@/lib/rsa/entities';
import { usePlatformAuth } from '@/lib/platform/auth';
import GuidesManager from '@/components/rsa/admin/guides/GuidesManager';

export default function GuidesAdmin() {
  const { t } = useLang();
  const auth = usePlatformAuth();
  // Reproduire le prédicat admin d'Admin.jsx (rôles master_admin/admin/competition_admin/club_admin).
  const isAdmin = !!auth?.roles?.some?.((r) =>
    ['admin', 'master_admin', 'competition_admin', 'club_admin'].includes(r),
  );

  const editionsQ = useQuery({
    queryKey: ['rsa', 'guides', 'admin-editions'],
    queryFn: () => Edition.listAllForAdmin(),
    staleTime: 5 * 60 * 1000,
    enabled: isAdmin,
  });

  if (auth?.isLoading) return null;
  if (!isAdmin) return <Navigate to="/Login" replace />;

  return (
    <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
      <div className="mb-4">
        <SafeBackLink to="/Admin" label="Retour" />
      </div>
      <header className="mb-8 md:mb-10">
        <Eyebrow>{t({ fr: 'Administration', en: 'Administration', de: 'Verwaltung' })}</Eyebrow>
        <EditorialTitle lead={t({ fr: 'Guides', en: 'Guides', de: 'Anleitungen' })} size="md" />
        <p className="mt-3 text-[14px] max-w-[60ch]" style={{ color: INK, lineHeight: 1.65 }}>
          {t({
            fr: 'Rédigez l’aide affichée dans le panneau « Guide » de chaque espace, en FR/EN/DE.',
            en: 'Write the help shown in each space’s “Guide” panel, in FR/EN/DE.',
            de: 'Verfassen Sie die Hilfe im „Anleitung“-Panel jedes Bereichs, in FR/EN/DE.',
          })}
        </p>
      </header>

      <GuidesManager editions={editionsQ.data || []} />
    </PageShell>
  );
}
```

> ⚠️ Avant d'écrire, vérifier les imports réels d'`Admin.jsx` (chemins de `PageShell`, `PlatformFooter`, `Eyebrow`, `EditorialTitle`, `SafeBackLink`, et la façon dont les rôles admin sont lus). Aligner cette page sur ces imports exacts — ne pas inventer de chemins.

- [ ] **Step 2 : Enregistrer la route**

Modifier `src/pages.config.js` :

Ajouter le lazy import (zone des imports RSA, vers ligne 26) :
```js
const GuidesAdmin = lazy(() => import('./pages/GuidesAdmin'));
```
Ajouter dans `PAGES` (ordre alpha, après `"DevenirJury"`) :
```js
    "GuidesAdmin": GuidesAdmin,
```

- [ ] **Step 3 : Lien depuis Admin.jsx**

Dans `src/pages/Admin.jsx`, sous le `<header>` (après le bloc header modifié en Task 8, avant le persona banner ~ligne 345), ajouter un lien admin discret :

```jsx
<div className="mb-6">
  <a
    href="/GuidesAdmin"
    className="inline-flex items-center gap-1.5 text-[12.5px] font-medium underline outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] rounded-[3px]"
    style={{ color: NAVY }}
  >
    {t({ fr: 'Gérer les guides d’aide →', en: 'Manage help guides →', de: 'Hilfe-Anleitungen verwalten →' })}
  </a>
</div>
```

> `NAVY` est déjà importé dans Admin.jsx (utilisé par le header). Sinon, l'ajouter à l'import de tokens existant.

- [ ] **Step 4 : Lint + build**

Run : `npm run lint`
Expected : 0 erreur.
Run : `npm run build`
Expected : build OK, nouveau chunk `GuidesAdmin`.

- [ ] **Step 5 : Commit**

```bash
git add src/pages/GuidesAdmin.jsx src/pages.config.js src/pages/Admin.jsx
git commit -m "feat(guides): page /GuidesAdmin (CRUD) + route + lien depuis Admin"
```

---

## Task 13 : Vérification end-to-end + seed

**Files:** (aucun nouveau)

- [ ] **Step 1 : Tests unitaires + lint + build complets**

Run : `node --test src/lib/rsa/guides/__tests__/guideLogic.test.js`
Expected : PASS (9 tests).
Run : `npm run lint`
Expected : 0 erreur.
Run : `npm run build`
Expected : build OK.

- [ ] **Step 2 : Seed d'un guide de test (via MCP Supabase `execute_sql`)**

Insérer un article global publié pour l'espace `jury` afin de vérifier l'affichage :

```sql
insert into public.guides (space, edition_id, title, body_md, sort_order, is_published)
values (
  'jury', null,
  '{"fr":"Comment noter un dossier","en":"How to score","de":"Wie bewerten"}'::jsonb,
  '{"fr":"## Étapes\n1. Ouvrez le dossier\n2. Notez **chaque critère**\n3. Validez","en":"## Steps\n1. Open the file\n2. Score **each criterion**\n3. Submit","de":"## Schritte\n1. Öffnen\n2. **Bewerten**\n3. Absenden"}'::jsonb,
  0, true
);
```

- [ ] **Step 3 : Smoke test navigateur**

Run : `npm run dev` (http://localhost:5173)

Vérifier manuellement (connecté en admin/juré) :
1. Sur **/Jury** : le bouton « ? Guide » apparaît en haut à droite, avec une **pastille gold**.
2. Clic → le drawer s'ouvre à droite, affiche « Comment noter un dossier » en accordéon, markdown rendu (titre, liste, gras). Esc / clic-dehors ferme.
3. Après ouverture + reload : la **pastille a disparu** (ack enregistré).
4. Bascule du `LanguageSwitcher` EN/DE → le contenu du guide change de langue.
5. Sur un espace **sans guide publié** (ex : /Selection si non seedé) : **aucun bouton** « Guide ».
6. Sur **/GuidesAdmin** (lien depuis /Admin) : créer un article, basculer FR/EN/DE, voir l'aperçu markdown, publier, réordonner par drag, supprimer. L'article publié apparaît dans le drawer de l'espace correspondant.

> Si une étape échoue, déboguer via la skill `superpowers:systematic-debugging` avant de continuer.

- [ ] **Step 4 : Nettoyer le seed (optionnel)**

Si le guide de test ne doit pas rester : via MCP `execute_sql` →
```sql
delete from public.guides where space = 'jury' and title->>'fr' = 'Comment noter un dossier' and edition_id is null;
```
(Le garder est aussi acceptable comme premier contenu réel.)

- [ ] **Step 5 : Commit final (si changements résiduels) + récap**

```bash
git add -A
git commit -m "chore(guides): vérification e2e + seed initial"
```

---

## Self-Review (couverture spec → plan)

- **Table `guides` + `guide_acks`** → Task 1. ✅ (`edition_id` text, contenu `{fr,en,de}`, RLS, anti-anon.)
- **Résolution héritage global/édition** → Task 2 (`resolveGuidesForScope`, testé). ✅
- **Pastille « nouveau » DB-backed** → Task 2 (`hasNewBadge`) + Task 5 (ack) + Task 7 (rendu). ✅
- **RLS lecture publiée / écriture admin / acks perso** → Task 1. ✅
- **Drawer lecteur (réutilise SessionDetailDrawer, Esc, accordéon, markdown)** → Task 6. ✅
- **Trigger + « pas de bouton si vide »** → Task 7. ✅
- **Suit le LanguageSwitcher (fallback langue)** → Task 6 (`pickLang`) + Task 5. ✅
- **5 espaces** → Task 8. ✅
- **Module CRUD admin (liste, reorder, éditeur 3 langues + aperçu, publish, portée)** → Tasks 9–12. ✅
- **Pas de nouvelle dépendance** → react-markdown/accordion/dnd déjà présents. ✅
- **Hors périmètre** (page /Aide centralisée séparée, auto-ouverture, merge ligne-à-ligne, temps réel, versionning, recherche) → non implémentés, conformes au spec. ✅

**Point de vigilance laissé à l'exécutant (signalé, non masqué) :** le gate admin de `GuidesAdmin.jsx` (Task 12) et le prédicat de rôle doivent être alignés sur l'implémentation réelle d'`Admin.jsx` (`usePlatformAuth` / lecture des rôles) — vérifier avant d'écrire, ne pas inventer le helper.
