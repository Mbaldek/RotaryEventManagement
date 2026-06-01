# Module Incubateurs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Industrialiser le canal de sourcing par incubateurs : base globale d'incubateurs + opt-in par compétition, générateur de pack de communication FR/EN/DE téléchargeable en ZIP, et déclaration de l'incubateur d'origine dans le funnel candidat (+ vue d'attribution sourcing).

**Architecture:** Une migration additive ajoute `incubators` (globale), `edition_incubators` (opt-in), deux colonnes sourcing sur `startups`, et `editions.comm_pack_config` (jsonb). Le funnel candidat gagne un champ select+"Autre" alimenté par l'opt-in. Un onglet « Incubateurs » dans le `CompetitionFunnel` gère l'opt-in (boutons monter/descendre sur `position`), le CRUD global et le pack de com. Le pack est généré 100 % côté client (templates `{fr,en,de}` interpolés → texte/HTML, `@react-pdf/renderer` → one-pager PDF) et assemblé en ZIP via `JSZip` ; l'admin le diffuse manuellement. Logique pure testée par vitest ; UI/DB vérifiées par typecheck/lint/build + Playwright + browser-test.

**Tech Stack:** React 18, Vite, Supabase (Postgres + RLS + Storage), TanStack Query, Tailwind/Élysée design system, `@react-pdf/renderer` (nouveau), `jszip` (nouveau), `vitest` (nouveau, logique pure), Playwright (e2e existant).

**Conventions clés (extraites du code) :**
- Entité : `export const X = { ...createEntity('table'), …méthodes }` + `export async function` pour les wrappers RPC ; **toujours `if (error) throw error;`**.
- i18n : `const { t } = useLang();` puis `t({fr,en,de})`. `pickLang(dict, lang)` pour les helpers non-React/tests.
- Champ funnel : `<Field>` (render-prop `{id, describedBy, invalid}`) + `<Select options=[{value,label}]>` / `<TextInput>` de `@/components/design` ; `onChange` du step = `(field, value)`, mais `Select/TextInput.onChange` reçoit un **event DOM**.
- Champs admin tab : `CheckboxRow/TextRow/TextareaRow/SelectRow/SectionNote` de `./fields` (signature plate, `onChange(value)`).
- Migration : `BEGIN; … COMMIT;`, idempotent (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`), helpers `public.is_master_admin()` / `public.is_competition_admin(edition_id)`, RPC mutateurs en `SECURITY DEFINER SET search_path = public` levant `42501`, bloc `-- Grants` final.
- **Appliquer les migrations via MCP Supabase** (projet `uaoucznptxmvhhytapso`), conformément au mode d'exécution autonome.

---

## File Structure

**Créés :**
- `supabase/migrations/20260607_rsa_incubators.sql` — schéma + RLS + RPC opt-in.
- `src/lib/rsa/entities/incubators.js` — entité `Incubator` + wrappers RPC.
- `src/lib/rsa/comm-pack/templates.js` — dicts `{fr,en,de}` des livrables texte.
- `src/lib/rsa/comm-pack/render.js` — interpolation des variables (pur, testé).
- `src/lib/rsa/comm-pack/render.test.js` — vitest.
- `src/lib/rsa/comm-pack/buildZip.js` — manifest + assemblage JSZip (manifest pur, testé).
- `src/lib/rsa/comm-pack/buildZip.test.js` — vitest.
- `src/components/rsa/comm-pack/OnePagerPdf.jsx` — one-pager `@react-pdf/renderer`.
- `src/components/rsa/admin/platform/master/competition-tabs/IncubatorsTab.jsx` — onglet (3 sections).
- `src/components/rsa/admin/platform/master/competition-tabs/IncubatorEditModal.jsx` — CRUD global léger.
- `src/components/rsa/hooks/useIncubators.js` — hooks TanStack.
- `vitest.config.js` — config test logique pure.

**Modifiés :**
- `package.json` — deps `@react-pdf/renderer`, `jszip` ; devDep `vitest` ; script `test`.
- `src/lib/rsa/storage.js` — bucket `comm-assets` + `uploadCommAsset`/`commAssetPublicUrl`/`removeCommAsset`.
- `src/lib/rsa/entities/startups.js` — `SAVE_DRAFT_FIELDS` += `incubator_id`, `incubator_other`.
- `src/components/rsa/candidature/steps/StepCompany.jsx` — champ incubateur select+Autre.
- `src/components/rsa/candidature/i18n.js` — `FIELDS.incubator` + `UI.incubatorOther*`.
- `src/components/rsa/candidature/validation.js` — `incubator_other` optionnel (case retournant `null`).
- `src/components/rsa/admin/platform/master/CompetitionFunnel.jsx` — enregistrer l'onglet `incubators`.
- `docs/blueprints/incubateurs.md` — cocher l'avancement (optionnel).

---

## Task 0: Outillage (deps + vitest)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`

- [ ] **Step 1: Installer les dépendances**

Run:
```bash
npm install @react-pdf/renderer jszip
npm install -D vitest
```
Expected: ajout dans `dependencies` (`@react-pdf/renderer`, `jszip`) et `devDependencies` (`vitest`), pas d'erreur de peer-deps.

- [ ] **Step 2: Ajouter le script `test`**

Dans `package.json`, sous `"scripts"`, ajouter après `"preview": "vite preview",` :
```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 3: Créer `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
```

- [ ] **Step 4: Vérifier que le runner démarre (aucun test encore)**

Run: `npm test`
Expected: vitest s'exécute et affiche "No test files found" (exit 0 ou 1 selon version) — l'important est qu'il se lance sans erreur de config/alias.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.js
git commit -m "chore(incubateurs): deps react-pdf + jszip + vitest pour logique pure"
```

---

## Task 1: Migration schéma + RLS + RPC opt-in

**Files:**
- Create: `supabase/migrations/20260607_rsa_incubators.sql`

> Hypothèses vérifiées : `editions(id text, name, year, application_open date, application_close date, finale_date date, awards_date date, prize_main numeric, prize_special, eligibility_rules jsonb)` ; `competition_admins(user_id uuid, edition_id text)` ; helpers `is_master_admin()`, `is_competition_admin(text)` existants.

- [ ] **Step 1: Écrire la migration**

```sql
-- 20260607_rsa_incubators.sql
-- Module Incubateurs : base globale, opt-in par compétition, déclaration candidat, config pack com.
begin;

-- 1. Base globale d'incubateurs (infos minimales, réutilisable entre éditions)
create table if not exists public.incubators (
  id          text primary key,
  name        text not null,
  country     text,
  language    text,
  website     text,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id)
);
comment on table public.incubators is 'Base globale des incubateurs/écoles relayeurs. Opt-in par édition via edition_incubators.';

-- 2. Opt-in : sous-ensemble proposé dans le form candidat de CETTE compétition
create table if not exists public.edition_incubators (
  edition_id    text not null references public.editions(id) on delete cascade,
  incubator_id  text not null references public.incubators(id) on delete cascade,
  position      int  not null default 0,
  primary key (edition_id, incubator_id)
);
create index if not exists edition_incubators_edition_idx on public.edition_incubators(edition_id);

-- 3. Déclaration côté startup (sourcing, SANS impact éligibilité)
alter table public.startups add column if not exists incubator_id    text references public.incubators(id);
alter table public.startups add column if not exists incubator_other text;

-- 4. Config éditoriale + assets du pack de com (niveau compétition)
alter table public.editions add column if not exists comm_pack_config jsonb not null default '{}'::jsonb;

-- ============ RLS ============
alter table public.incubators        enable row level security;
alter table public.edition_incubators enable row level security;

-- incubators : lecture publique (alimente le select candidat) ; écriture master ou tout competition_admin
drop policy if exists incubators_read  on public.incubators;
drop policy if exists incubators_write on public.incubators;
create policy incubators_read  on public.incubators for select using (true);
create policy incubators_write on public.incubators for all
  using  (public.is_master_admin() or exists (select 1 from public.competition_admins ca where ca.user_id = auth.uid()))
  with check (public.is_master_admin() or exists (select 1 from public.competition_admins ca where ca.user_id = auth.uid()));

-- edition_incubators : lecture publique ; écriture via RPC uniquement (defense-in-depth)
drop policy if exists edition_incubators_read         on public.edition_incubators;
drop policy if exists edition_incubators_write_denied on public.edition_incubators;
create policy edition_incubators_read on public.edition_incubators for select using (true);
create policy edition_incubators_write_denied on public.edition_incubators for all
  using  (public.is_master_admin())
  with check (public.is_master_admin());

-- ============ RPC : remplacer l'opt-in d'une édition (set + positions par ordre du tableau) ============
create or replace function public.rsa_set_edition_incubators(p_edition_id text, p_incubator_ids text[])
returns void
language plpgsql
security definer
set search_path = public as $$
begin
  if not (public.is_master_admin() or public.is_competition_admin(p_edition_id)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.edition_incubators
   where edition_id = p_edition_id
     and (p_incubator_ids is null or not (incubator_id = any(p_incubator_ids)));

  if p_incubator_ids is not null then
    insert into public.edition_incubators (edition_id, incubator_id, position)
    select p_edition_id, ids.id, ids.ord - 1
      from unnest(p_incubator_ids) with ordinality as ids(id, ord)
    on conflict (edition_id, incubator_id)
      do update set position = excluded.position;
  end if;
end;
$$;

-- ============ Grants ============
grant execute on function public.rsa_set_edition_incubators(text, text[]) to authenticated;
revoke all on function public.rsa_set_edition_incubators(text, text[]) from public;
grant execute on function public.rsa_set_edition_incubators(text, text[]) to authenticated;

commit;
```

- [ ] **Step 2: Appliquer la migration via MCP Supabase**

Appliquer le contenu du fichier via `mcp__claude_ai_Supabase__apply_migration` (name: `rsa_incubators`, project `uaoucznptxmvhhytapso`).
Expected: succès, aucun message d'erreur.

- [ ] **Step 3: Vérifier le schéma**

Via `mcp__claude_ai_Supabase__list_tables` (ou `execute_sql`) :
```sql
select column_name from information_schema.columns where table_name = 'startups' and column_name in ('incubator_id','incubator_other');
select column_name from information_schema.columns where table_name = 'editions' and column_name = 'comm_pack_config';
```
Expected: les 2 colonnes startups + `comm_pack_config` présentes ; tables `incubators` et `edition_incubators` listées.

- [ ] **Step 4: Vérifier le RPC + advisors**

Via `execute_sql` : `select public.rsa_set_edition_incubators('__nope__', array[]::text[]);` doit lever `forbidden` (42501) si exécuté sans droits, OU réussir (no-op) si exécuté en service-role. Puis lancer `mcp__claude_ai_Supabase__get_advisors` (type security) — aucun nouvel avertissement critique sur les nouvelles tables.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260607_rsa_incubators.sql
git commit -m "feat(incubateurs): migration base globale + opt-in + colonnes sourcing + comm_pack_config"
```

---

## Task 2: Entité Incubator + helper Storage

**Files:**
- Create: `src/lib/rsa/entities/incubators.js`
- Modify: `src/lib/rsa/storage.js`

- [ ] **Step 1: Créer l'entité `incubators.js`**

```js
import { supabase } from '@/lib/supabase';
import { createEntity } from './_createEntity';

export const Incubator = {
  ...createEntity('incubators'),

  // Liste globale triée par nom
  async listAll() {
    const { data, error } = await supabase
      .from('incubators')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // Liste opt-in d'une édition (alimente le select candidat), triée par position
  async listForEdition(editionId) {
    if (!editionId) return [];
    const { data, error } = await supabase
      .from('edition_incubators')
      .select('position, incubators ( id, name, country, language, website )')
      .eq('edition_id', editionId)
      .order('position', { ascending: true });
    if (error) throw error;
    return (data || [])
      .filter((r) => r.incubators)
      .map((r) => ({ ...r.incubators, position: r.position }));
  },
};

// Remplace l'opt-in d'une édition (ordre du tableau = position)
export async function setEditionIncubators(editionId, incubatorIds) {
  const { error } = await supabase.rpc('rsa_set_edition_incubators', {
    p_edition_id: editionId,
    p_incubator_ids: incubatorIds,
  });
  if (error) throw error;
}
```

- [ ] **Step 2: Ajouter le bucket + helpers comm-assets dans `storage.js`**

Après la constante `CHAMPIONS_BUCKET` (~ligne 23), ajouter :
```js
export const COMM_ASSETS_BUCKET = 'comm-assets'; // public : assets diffusés aux incubateurs
```
Puis, à la fin du fichier, ajouter (calqué sur l'idiome `uploadChampionPhoto`/`championPhotoPublicUrl`/remove) :
```js
export function buildCommAssetPath({ editionId, kind, fileName }) {
  return `editions/${editionId}/comm/${kind}/${Date.now()}_${safeFilename(fileName)}`;
}

export async function uploadCommAsset({ editionId, kind, file }) {
  const path = buildCommAssetPath({ editionId, kind, fileName: file.name });
  const { error } = await supabase.storage
    .from(COMM_ASSETS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' });
  if (error) throw error;
  return path;
}

export function commAssetPublicUrl(path) {
  if (!path) return null;
  const { data } = supabase.storage.from(COMM_ASSETS_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

export async function removeCommAsset(path) {
  if (!path) return;
  const { error } = await supabase.storage.from(COMM_ASSETS_BUCKET).remove([path]);
  if (error) throw error;
}
```

- [ ] **Step 3: Créer le bucket public `comm-assets` via MCP Supabase**

Via `execute_sql` :
```sql
insert into storage.buckets (id, name, public) values ('comm-assets', 'comm-assets', true)
on conflict (id) do nothing;
-- write réservé au staff, read public
drop policy if exists comm_assets_read on storage.objects;
drop policy if exists comm_assets_write on storage.objects;
create policy comm_assets_read on storage.objects for select
  using (bucket_id = 'comm-assets');
create policy comm_assets_write on storage.objects for all
  using (bucket_id = 'comm-assets' and (public.is_master_admin() or exists (select 1 from public.competition_admins ca where ca.user_id = auth.uid())))
  with check (bucket_id = 'comm-assets' and (public.is_master_admin() or exists (select 1 from public.competition_admins ca where ca.user_id = auth.uid())));
```
Expected: bucket créé, policies en place.

- [ ] **Step 4: Vérifier que ça compile**

Run: `npm run typecheck && npm run lint`
Expected: PASS (aucune erreur sur les nouveaux fichiers).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rsa/entities/incubators.js src/lib/rsa/storage.js
git commit -m "feat(incubateurs): entité Incubator + bucket/helpers comm-assets"
```

---

## Task 3: Volet C — déclaration incubateur dans le funnel candidat

**Files:**
- Modify: `src/lib/rsa/entities/startups.js` (SAVE_DRAFT_FIELDS)
- Modify: `src/components/rsa/candidature/i18n.js`
- Modify: `src/components/rsa/candidature/validation.js`
- Create: `src/components/rsa/hooks/useIncubators.js`
- Modify: `src/components/rsa/candidature/steps/StepCompany.jsx`

- [ ] **Step 1: Whitelister les colonnes draft**

Dans `src/lib/rsa/entities/startups.js`, dans le `Set` `SAVE_DRAFT_FIELDS` (~ligne 18-48), ajouter les entrées :
```js
  'incubator_id',
  'incubator_other',
```

- [ ] **Step 2: Labels i18n**

Dans `src/components/rsa/candidature/i18n.js`, dans `FIELDS`, ajouter :
```js
  incubator: {
    label: { fr: 'Incubateur / structure d’accompagnement', en: 'Incubator / support structure', de: 'Inkubator / Förderstruktur' },
    help: {
      fr: 'D’où vous vient l’information sur ce concours ? (facultatif)',
      en: 'Where did you hear about this competition? (optional)',
      de: 'Woher kennen Sie diesen Wettbewerb? (optional)',
    },
  },
```
Dans `UI`, ajouter :
```js
  incubatorPlaceholder: { fr: 'Sélectionnez…', en: 'Select…', de: 'Auswählen…' },
  incubatorOther: { fr: 'Autre / aucun', en: 'Other / none', de: 'Andere / keine' },
  incubatorOtherLabel: { fr: 'Précisez (facultatif)', en: 'Please specify (optional)', de: 'Bitte angeben (optional)' },
```

- [ ] **Step 3: Validation — champ optionnel**

Dans `src/components/rsa/candidature/validation.js`, dans le `switch` de `validateField`, ajouter un `case` explicite (le `default` renvoie déjà `null`, mais on le rend explicite pour la lisibilité) :
```js
    case 'incubator_id':
    case 'incubator_other':
      return null; // sourcing : toujours optionnel
```
Ne PAS l'ajouter à `REQUIRED_FIELDS_STATIC`.

- [ ] **Step 4: Hook de liste opt-in**

Créer `src/components/rsa/hooks/useIncubators.js` :
```js
import { useQuery } from '@tanstack/react-query';
import { Incubator } from '@/lib/rsa/entities/incubators';

export function useEditionIncubators(editionId) {
  return useQuery({
    queryKey: ['rsa', 'incubators', 'edition', editionId],
    queryFn: () => Incubator.listForEdition(editionId),
    enabled: !!editionId,
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 5: Champ incubateur dans StepCompany**

Dans `src/components/rsa/candidature/steps/StepCompany.jsx` :

a) imports — ajouter sous les imports existants :
```js
import { useEditionIncubators } from '@/components/rsa/hooks/useIncubators';
```
b) dans le corps du composant, après la ligne `const err = (field) => …`, ajouter :
```js
  const editionId = v?.edition_id;
  const { data: incubatorList = [] } = useEditionIncubators(editionId);
  const incubatorOptions = [
    ...incubatorList.map((inc) => ({ value: inc.id, label: inc.name })),
    { value: '__other__', label: t(UI.incubatorOther) },
  ];
  const incubatorSelectValue = v?.incubator_id ?? (v?.incubator_other != null ? '__other__' : '');
  const onIncubatorSelect = (e) => {
    const next = e.target.value;
    if (next === '__other__') {
      onChange?.('incubator_id', null);
      onChange?.('incubator_other', v?.incubator_other ?? '');
    } else {
      onChange?.('incubator_id', next || null);
      onChange?.('incubator_other', null);
    }
  };
```
c) dans le JSX, après le bloc « pays » (et son champ "autre"), ajouter :
```jsx
<Field label={t(FIELDS.incubator.label)} helper={t(FIELDS.incubator.help)}>
  {({ id, describedBy, invalid }) => (
    <Select
      id={id}
      aria-describedby={describedBy}
      invalid={invalid}
      disabled={disabled}
      value={incubatorSelectValue}
      onChange={onIncubatorSelect}
      placeholder={t(UI.incubatorPlaceholder)}
      options={incubatorOptions}
    />
  )}
</Field>

{incubatorSelectValue === '__other__' && (
  <Field label={t(UI.incubatorOtherLabel)}>
    {({ id, describedBy }) => (
      <TextInput
        id={id}
        aria-describedby={describedBy}
        disabled={disabled}
        value={v?.incubator_other ?? ''}
        onChange={(e) => {
          const next = e.target.value;
          onChange?.('incubator_other', next.trim() === '' ? '' : next);
        }}
        placeholder={t({ fr: 'Nom de la structure…', en: 'Structure name…', de: 'Name der Struktur…' })}
      />
    )}
  </Field>
)}
```

- [ ] **Step 6: Vérifier compilation + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 7: Browser-test manuel (chrome-devtools)**

Run: `npm run dev` puis ouvrir le funnel candidat sur une édition ayant ≥1 incubateur opt-in (à créer en Task 4 ; si aucune donnée encore, vérifier au moins que le select affiche « Autre / aucun » et que choisir « Autre » fait apparaître le champ texte). Vérifier que la valeur est persistée (rechargement → valeur conservée via saveDraft).
Expected: select peuplé + branche "Autre" fonctionnelle ; pas d'erreur console.

- [ ] **Step 8: Commit**

```bash
git add src/lib/rsa/entities/startups.js src/components/rsa/candidature/ src/components/rsa/hooks/useIncubators.js
git commit -m "feat(incubateurs): déclaration incubateur (select + Autre) dans le funnel candidat"
```

---

## Task 4: Volet A — CRUD global + opt-in (onglet admin, section 1)

**Files:**
- Modify: `src/components/rsa/hooks/useIncubators.js` (ajouts CRUD + opt-in)
- Create: `src/components/rsa/admin/platform/master/competition-tabs/IncubatorEditModal.jsx`
- Create: `src/components/rsa/admin/platform/master/competition-tabs/IncubatorsTab.jsx`
- Modify: `src/components/rsa/admin/platform/master/CompetitionFunnel.jsx`

- [ ] **Step 1: Hooks CRUD + opt-in**

Ajouter dans `src/components/rsa/hooks/useIncubators.js` :
```js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Incubator, setEditionIncubators } from '@/lib/rsa/entities/incubators';

export function useAllIncubators() {
  return useQuery({
    queryKey: ['rsa', 'incubators', 'all'],
    queryFn: () => Incubator.listAll(),
    staleTime: 60 * 1000,
  });
}

export function useSaveIncubator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch, isNew }) =>
      isNew ? Incubator.create({ id, ...patch }) : Incubator.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rsa', 'incubators'] }),
  });
}

export function useDeleteIncubator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => Incubator.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rsa', 'incubators'] }),
  });
}

export function useSetEditionIncubators(editionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (incubatorIds) => setEditionIncubators(editionId, incubatorIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rsa', 'incubators', 'edition', editionId] }),
  });
}
```
> Note slug : `Incubator.create({ id, ...patch })` exige un `id` (PK text). Le modal (Step 2) génère un slug depuis le nom : `name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')`.

- [ ] **Step 2: Modal CRUD global léger**

Créer `IncubatorEditModal.jsx` (réutilise les primitives `fields.jsx` + un overlay simple ; pas de dnd) :
```jsx
import React, { useState, useEffect } from 'react';
import { useLang } from '@/lib/platform/i18n';
import { TextRow, SelectRow } from './fields';
import { useSaveIncubator } from '@/components/rsa/hooks/useIncubators';

const slugify = (s) => (s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function IncubatorEditModal({ open, onClose, incubator }) {
  const { t } = useLang();
  const isNew = !incubator?.id;
  const save = useSaveIncubator();
  const [form, setForm] = useState({ name: '', country: '', language: '', website: '' });

  useEffect(() => {
    setForm({
      name: incubator?.name ?? '',
      country: incubator?.country ?? '',
      language: incubator?.language ?? '',
      website: incubator?.website ?? '',
    });
  }, [incubator, open]);

  if (!open) return null;

  const onSubmit = async () => {
    const patch = { name: form.name.trim(), country: form.country || null, language: form.language || null, website: form.website?.trim() || null };
    if (!patch.name) return;
    const id = isNew ? slugify(patch.name) : incubator.id;
    await save.mutateAsync({ id, patch, isNew });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold">
          {isNew ? t({ fr: 'Nouvel incubateur', en: 'New incubator', de: 'Neuer Inkubator' }) : t({ fr: 'Modifier l’incubateur', en: 'Edit incubator', de: 'Inkubator bearbeiten' })}
        </h3>
        <div className="space-y-3">
          <TextRow id="inc-name" label={t({ fr: 'Nom', en: 'Name', de: 'Name' })} value={form.name} onChange={(val) => setForm((f) => ({ ...f, name: val }))} />
          <SelectRow id="inc-country" label={t({ fr: 'Pays', en: 'Country', de: 'Land' })} value={form.country} onChange={(val) => setForm((f) => ({ ...f, country: val }))}
            options={[{ value: '', label: '—' }, { value: 'FR', label: 'France' }, { value: 'DE', label: 'Deutschland' }, { value: 'CH', label: 'Suisse' }]} />
          <SelectRow id="inc-lang" label={t({ fr: 'Langue de relais', en: 'Relay language', de: 'Sprache' })} value={form.language} onChange={(val) => setForm((f) => ({ ...f, language: val }))}
            options={[{ value: '', label: '—' }, { value: 'fr', label: 'FR' }, { value: 'en', label: 'EN' }, { value: 'de', label: 'DE' }]} />
          <TextRow id="inc-web" label={t({ fr: 'Site web', en: 'Website', de: 'Website' })} value={form.website} onChange={(val) => setForm((f) => ({ ...f, website: val }))} placeholder="https://" />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="px-4 py-2 text-sm" onClick={onClose}>{t({ fr: 'Annuler', en: 'Cancel', de: 'Abbrechen' })}</button>
          <button type="button" className="rounded-lg bg-[#0a1f44] px-4 py-2 text-sm text-white disabled:opacity-50" disabled={!form.name.trim() || save.isPending} onClick={onSubmit}>
            {t({ fr: 'Enregistrer', en: 'Save', de: 'Speichern' })}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Onglet IncubatorsTab — section 1 (liste opt-in + CRUD)**

Créer `IncubatorsTab.jsx`. Cette première version contient seulement la section opt-in ; la section pack (Task 5) sera ajoutée ensuite. Reorder via boutons monter/descendre (pas de dnd).
```jsx
import React, { useMemo, useState } from 'react';
import { useLang } from '@/lib/platform/i18n';
import { SectionNote } from './fields';
import IncubatorEditModal from './IncubatorEditModal';
import { useAllIncubators, useEditionIncubators, useSetEditionIncubators, useDeleteIncubator } from '@/components/rsa/hooks/useIncubators';

export default function IncubatorsTab({ competition, mode = 'edit' }) {
  const { t } = useLang();
  const editionId = competition?.id;

  if (mode === 'create' || !editionId) {
    return <SectionNote>{t({ fr: 'Disponible après la création de la compétition.', en: 'Available after the competition is created.', de: 'Nach Erstellung des Wettbewerbs verfügbar.' })}</SectionNote>;
  }

  const { data: all = [] } = useAllIncubators();
  const { data: optedRaw = [] } = useEditionIncubators(editionId);
  const setOptIn = useSetEditionIncubators(editionId);
  const del = useDeleteIncubator();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // ordre courant = opt-in trié par position ; complété par les non-cochés
  const ordered = useMemo(() => {
    const optedIds = optedRaw.map((o) => o.id);
    const optedSet = new Set(optedIds);
    const rest = all.filter((i) => !optedSet.has(i.id));
    return { optedIds, optedSet, rest };
  }, [all, optedRaw]);

  const persist = (ids) => setOptIn.mutate(ids);

  const toggle = (id, checked) => {
    const ids = ordered.optedIds.slice();
    if (checked && !ids.includes(id)) ids.push(id);
    if (!checked) { const i = ids.indexOf(id); if (i >= 0) ids.splice(i, 1); }
    persist(ids);
  };
  const move = (id, dir) => {
    const ids = ordered.optedIds.slice();
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    persist(ids);
  };

  const allById = useMemo(() => Object.fromEntries(all.map((i) => [i.id, i])), [all]);

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#0a1f44]">
            {t({ fr: 'Liste proposée au candidat', en: 'List shown to applicants', de: 'Den Bewerbern angezeigte Liste' })}
          </h3>
          <button type="button" className="rounded-lg border border-[#0a1f44] px-3 py-1.5 text-sm text-[#0a1f44]"
            onClick={() => { setEditing(null); setModalOpen(true); }}>
            + {t({ fr: 'Nouvel incubateur', en: 'New incubator', de: 'Neuer Inkubator' })}
          </button>
        </div>

        {all.length === 0 ? (
          <SectionNote>{t({ fr: 'Aucun incubateur dans la base. Créez-en un.', en: 'No incubators yet. Create one.', de: 'Noch keine Inkubatoren. Erstellen Sie einen.' })}</SectionNote>
        ) : (
          <ul className="space-y-2">
            {/* opt-in d'abord, dans l'ordre */}
            {ordered.optedIds.map((id, idx) => {
              const inc = allById[id];
              if (!inc) return null;
              return (
                <li key={id} className="flex items-center gap-3 rounded-xl border border-[#e7e1d6] bg-white px-3 py-2">
                  <input type="checkbox" checked readOnly onChange={() => toggle(id, false)} aria-label={`opt-out ${inc.name}`} />
                  <span className="flex-1 text-sm">{inc.name} {inc.country ? <em className="text-xs text-[#7a7367]">· {inc.country}</em> : null}</span>
                  <button type="button" className="px-1 text-[#7a7367] disabled:opacity-30" disabled={idx === 0} onClick={() => move(id, -1)} aria-label="up">↑</button>
                  <button type="button" className="px-1 text-[#7a7367] disabled:opacity-30" disabled={idx === ordered.optedIds.length - 1} onClick={() => move(id, 1)} aria-label="down">↓</button>
                  <button type="button" className="px-1 text-xs text-[#7a7367]" onClick={() => { setEditing(inc); setModalOpen(true); }}>✎</button>
                </li>
              );
            })}
            {/* non cochés */}
            {ordered.rest.map((inc) => (
              <li key={inc.id} className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 opacity-70">
                <input type="checkbox" checked={false} onChange={() => toggle(inc.id, true)} aria-label={`opt-in ${inc.name}`} />
                <span className="flex-1 text-sm">{inc.name} {inc.country ? <em className="text-xs text-[#7a7367]">· {inc.country}</em> : null}</span>
                <button type="button" className="px-1 text-xs text-[#7a7367]" onClick={() => { setEditing(inc); setModalOpen(true); }}>✎</button>
                <button type="button" className="px-1 text-xs text-red-700" onClick={() => { if (confirm(t({ fr: 'Supprimer cet incubateur de la base globale ?', en: 'Delete this incubator from the global base?', de: 'Diesen Inkubator löschen?' }))) del.mutate(inc.id); }}>🗑</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <IncubatorEditModal open={modalOpen} onClose={() => setModalOpen(false)} incubator={editing} />
    </div>
  );
}
```

- [ ] **Step 4: Enregistrer l'onglet dans CompetitionFunnel**

Dans `src/components/rsa/admin/platform/master/CompetitionFunnel.jsx` :

a) import en tête :
```js
import IncubatorsTab from './competition-tabs/IncubatorsTab';
```
b) ajouter `'incubators'` à `TAB_ORDER` (après `'comm'`) :
```js
const TAB_ORDER = ['identity', 'calendar', 'clubs', 'rules', 'prizes', 'comm', 'incubators'];
```
c) dans le `useMemo` des `tabs`, ajouter l'entrée (mirroir de l'entrée `prizes`, motif `(competition, mode)`) :
```js
  {
    id: 'incubators',
    label: t({ fr: 'Incubateurs', en: 'Incubators', de: 'Inkubatoren' }),
    disabled: !isCreated,
    render: () => <IncubatorsTab competition={competitionRef} mode={isCreated ? 'edit' : 'create'} />,
  },
```
> `competitionRef` et `isCreated` existent déjà dans ce composant (utilisés par `PrizesTab`). Vérifier le nom exact de la variable d'édition créée dans ce fichier et l'employer tel quel.

- [ ] **Step 5: typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 6: Browser-test (chrome-devtools)**

`npm run dev` → ouvrir une compétition existante → onglet « Incubateurs ». Créer 2 incubateurs, en cocher 1, le monter/descendre, vérifier la persistance après reload. Revenir au funnel candidat de cette édition (Task 3) et confirmer que l'incubateur coché apparaît dans le select.
Expected: opt-in + ordre persistés ; select candidat alimenté.

- [ ] **Step 7: Commit**

```bash
git add src/components/rsa/hooks/useIncubators.js src/components/rsa/admin/platform/master/competition-tabs/IncubatorEditModal.jsx src/components/rsa/admin/platform/master/competition-tabs/IncubatorsTab.jsx src/components/rsa/admin/platform/master/CompetitionFunnel.jsx
git commit -m "feat(incubateurs): onglet admin — CRUD global + opt-in par compétition"
```

---

## Task 5: Volet B — générateur de pack + ZIP

**Files:**
- Create: `src/lib/rsa/comm-pack/templates.js`
- Create: `src/lib/rsa/comm-pack/render.js` + `render.test.js`
- Create: `src/lib/rsa/comm-pack/buildZip.js` + `buildZip.test.js`
- Create: `src/components/rsa/comm-pack/OnePagerPdf.jsx`
- Modify: `IncubatorsTab.jsx` (section 2 : config éditoriale + assets + bouton ZIP)

### 5a. Interpolation (TDD pur)

- [ ] **Step 1: Écrire le test d'interpolation (échoue)**

`src/lib/rsa/comm-pack/render.test.js` :
```js
import { describe, it, expect } from 'vitest';
import { buildVariables, interpolate, renderTextDeliverables } from './render';

const edition = {
  id: 'rsa-2026', name: 'Rotary Startup Award', year: 2026,
  application_open: '2026-02-01', application_close: '2026-03-31',
  finale_date: '2026-05-26', awards_date: '2026-06-02',
  prize_main: 5000, prize_special: 1500,
  comm_pack_config: {
    tagline: { fr: 'Concours de pitch Paris–Berlin', en: 'Paris–Berlin pitch competition', de: 'Paris–Berlin Pitch-Wettbewerb' },
    contact: { name: 'Mathieu', phone: '07 66 42 21 02', email: 'prixstartuprotary@proton.me' },
  },
};

describe('buildVariables', () => {
  it('derives variables from edition columns and config per lang', () => {
    const vars = buildVariables(edition, 'fr');
    expect(vars.competition_name).toBe('Rotary Startup Award');
    expect(vars.year).toBe(2026);
    expect(vars.prize_main).toContain('5');
    expect(vars.tagline).toBe('Concours de pitch Paris–Berlin');
    expect(vars.contact_email).toBe('prixstartuprotary@proton.me');
  });
});

describe('interpolate', () => {
  it('replaces {{tokens}} and leaves unknown tokens blank', () => {
    expect(interpolate('Hi {{competition_name}} {{year}}', { competition_name: 'X', year: 2026 })).toBe('Hi X 2026');
    expect(interpolate('a {{nope}} b', {})).toBe('a  b');
  });
});

describe('renderTextDeliverables', () => {
  it('produces fr/en/de bodies for each text deliverable', () => {
    const out = renderTextDeliverables(edition);
    expect(out.fr.email).toContain('Rotary Startup Award');
    expect(out.de.social.length).toBeGreaterThan(0);
    expect(Object.keys(out)).toEqual(['fr', 'en', 'de']);
  });
});
```

- [ ] **Step 2: Lancer le test (échoue)**

Run: `npm test -- render`
Expected: FAIL ("Cannot find module './render'" ou exports manquants).

- [ ] **Step 3: Écrire les templates**

`src/lib/rsa/comm-pack/templates.js` — dicts `{fr,en,de}` avec tokens `{{…}}`. Calibré sur `docs/Organisation 2026/.../Kit com messages clés.pdf`.
```js
// Chaque livrable texte = dict {fr,en,de} contenant des tokens {{var}}.
export const TEMPLATES = {
  email: {
    fr: `Bonjour,

Nous relayons le {{competition_name}} {{year}}.
{{tagline}}.
Candidatures : {{application_window}}.
Dotations : {{prize_main}} + {{prize_special}}.
{{eligibility_summary}}
Infos & candidature : {{registration_url}}
Contact : {{contact_name}} – {{contact_phone}} – {{contact_email}}`,
    en: `Hello,

We are relaying the {{competition_name}} {{year}}.
{{tagline}}.
Applications: {{application_window}}.
Awards: {{prize_main}} + {{prize_special}}.
{{eligibility_summary}}
Info & apply: {{registration_url}}
Contact: {{contact_name}} – {{contact_phone}} – {{contact_email}}`,
    de: `Hallo,

wir leiten den {{competition_name}} {{year}} weiter.
{{tagline}}.
Bewerbungen: {{application_window}}.
Preise: {{prize_main}} + {{prize_special}}.
{{eligibility_summary}}
Infos & Bewerbung: {{registration_url}}
Kontakt: {{contact_name}} – {{contact_phone}} – {{contact_email}}`,
  },
  newsletter: {
    fr: `**{{competition_name}} {{year}}** — {{tagline}}. Candidatures {{application_window}}. {{registration_url}}`,
    en: `**{{competition_name}} {{year}}** — {{tagline}}. Applications {{application_window}}. {{registration_url}}`,
    de: `**{{competition_name}} {{year}}** — {{tagline}}. Bewerbungen {{application_window}}. {{registration_url}}`,
  },
  social: {
    fr: `🚀 {{competition_name}} {{year}} — {{tagline}}. Candidatez avant le {{application_close}} : {{registration_url}}`,
    en: `🚀 {{competition_name}} {{year}} — {{tagline}}. Apply before {{application_close}}: {{registration_url}}`,
    de: `🚀 {{competition_name}} {{year}} — {{tagline}}. Bewerben bis {{application_close}}: {{registration_url}}`,
  },
  keymsg: {
    fr: `{{tagline}}.\nCandidatures : {{application_window}}.\nDotations : {{prize_main}} + {{prize_special}}.\n{{eligibility_summary}}\nInfos : {{registration_url}}\nContact : {{contact_name}} – {{contact_phone}} – {{contact_email}}`,
    en: `{{tagline}}.\nApplications: {{application_window}}.\nAwards: {{prize_main}} + {{prize_special}}.\n{{eligibility_summary}}\nInfo: {{registration_url}}\nContact: {{contact_name}} – {{contact_phone}} – {{contact_email}}`,
    de: `{{tagline}}.\nBewerbungen: {{application_window}}.\nPreise: {{prize_main}} + {{prize_special}}.\n{{eligibility_summary}}\nInfos: {{registration_url}}\nKontakt: {{contact_name}} – {{contact_phone}} – {{contact_email}}`,
  },
  faq: {
    fr: `# FAQ\n- Concours gratuit.\n- Critères d'éligibilité indicatifs, non exclusifs.\n- Jury indépendant (membres Rotary + experts).`,
    en: `# FAQ\n- Free to enter.\n- Eligibility criteria are indicative, non-exclusive.\n- Independent jury (Rotary members + experts).`,
    de: `# FAQ\n- Kostenlose Teilnahme.\n- Zulassungskriterien sind indikativ, nicht ausschließend.\n- Unabhängige Jury (Rotary-Mitglieder + Experten).`,
  },
};

export const TEXT_DELIVERABLES = Object.keys(TEMPLATES); // ['email','newsletter','social','keymsg','faq']
```

- [ ] **Step 4: Écrire render.js**

```js
import { pickLang, LANGS } from '@/lib/platform/i18n';
import { TEMPLATES, TEXT_DELIVERABLES } from './templates';

const REGISTRATION_URL = 'https://rotary-startup.org';

function fmtEUR(n) {
  if (n == null) return '';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export function buildVariables(edition, lang) {
  const cfg = edition?.comm_pack_config || {};
  const open = edition?.application_open || '';
  const close = edition?.application_close || '';
  return {
    competition_name: edition?.name || '',
    year: edition?.year || '',
    application_window: open && close ? `${open} → ${close}` : (close || open || ''),
    application_close: close,
    prize_main: edition?.prize_main != null ? fmtEUR(edition.prize_main) : '',
    prize_special: edition?.prize_special != null ? fmtEUR(edition.prize_special) : '',
    tagline: pickLang(cfg.tagline, lang) || '',
    format_line: pickLang(cfg.format_line, lang) || '',
    ceremony: pickLang(cfg.ceremony_venue, lang) || '',
    eligibility_summary: pickLang(cfg.eligibility_summary, lang) || '',
    registration_url: REGISTRATION_URL,
    contact_name: cfg.contact?.name || '',
    contact_phone: cfg.contact?.phone || '',
    contact_email: cfg.contact?.email || '',
  };
}

export function interpolate(template, vars) {
  return String(template || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
}

export function renderTextDeliverables(edition) {
  const out = {};
  for (const lang of LANGS) {
    const vars = buildVariables(edition, lang);
    out[lang] = {};
    for (const key of TEXT_DELIVERABLES) {
      out[lang][key] = interpolate(TEMPLATES[key][lang], vars);
    }
  }
  return out;
}
```

- [ ] **Step 5: Test passe**

Run: `npm test -- render`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/rsa/comm-pack/templates.js src/lib/rsa/comm-pack/render.js src/lib/rsa/comm-pack/render.test.js
git commit -m "feat(incubateurs): templates pack com FR/EN/DE + interpolation (testé)"
```

### 5b. One-pager PDF

- [ ] **Step 7: Composant OnePagerPdf**

`src/components/rsa/comm-pack/OnePagerPdf.jsx` — `@react-pdf/renderer`. Reçoit `vars` (sortie de `buildVariables`) et `lang`, rend un PDF vectoriel (look Élysée : navy + serif).
```jsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const NAVY = '#0a1f44';
const GOLD = '#b08d57';

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, color: '#1a1a1a', fontFamily: 'Helvetica' },
  eyebrow: { fontSize: 9, letterSpacing: 2, color: GOLD, textTransform: 'uppercase', marginBottom: 6 },
  title: { fontSize: 24, color: NAVY, fontFamily: 'Times-Roman', marginBottom: 4 },
  rule: { height: 2, width: 64, backgroundColor: GOLD, marginVertical: 12 },
  tagline: { fontSize: 13, color: NAVY, marginBottom: 16 },
  row: { marginBottom: 6 },
  label: { color: GOLD, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 },
  value: { fontSize: 12 },
  footer: { position: 'absolute', bottom: 36, left: 48, right: 48, fontSize: 9, color: '#7a7367' },
});

const Line = ({ label, value }) =>
  value ? (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  ) : null;

export default function OnePagerPdf({ vars, labels }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>{labels.eyebrow}</Text>
        <Text style={styles.title}>{vars.competition_name} {vars.year}</Text>
        <View style={styles.rule} />
        {vars.tagline ? <Text style={styles.tagline}>{vars.tagline}</Text> : null}
        <Line label={labels.applications} value={vars.application_window} />
        <Line label={labels.awards} value={[vars.prize_main, vars.prize_special].filter(Boolean).join(' + ')} />
        <Line label={labels.eligibility} value={vars.eligibility_summary} />
        <Line label={labels.format} value={vars.format_line} />
        <Line label={labels.ceremony} value={vars.ceremony} />
        <Line label={labels.info} value={vars.registration_url} />
        <Text style={styles.footer}>{[vars.contact_name, vars.contact_phone, vars.contact_email].filter(Boolean).join(' · ')}</Text>
      </Page>
    </Document>
  );
}
```
> `labels` est un objet de chaînes déjà résolues dans la langue courante (eyebrow, applications, awards, eligibility, format, ceremony, info) — fourni par l'appelant (buildZip) pour éviter d'importer `useLang` hors React.

### 5c. Assemblage ZIP (TDD manifest)

- [ ] **Step 8: Test du manifest (échoue)**

`src/lib/rsa/comm-pack/buildZip.test.js` :
```js
import { describe, it, expect } from 'vitest';
import { buildZipManifest } from './buildZip';

const edition = {
  id: 'rsa-2026', name: 'RSA', year: 2026, application_close: '2026-03-31',
  comm_pack_config: { assets: { logo_path: 'editions/rsa-2026/comm/logo/x.svg', reglement: { fr: 'editions/rsa-2026/comm/reglement/fr.pdf' } } },
};

describe('buildZipManifest', () => {
  it('lists per-lang text files + assets with mirror folder structure', () => {
    const m = buildZipManifest(edition);
    const paths = m.map((e) => e.path);
    expect(paths).toContain('FR/email.txt');
    expect(paths).toContain('EN/social.txt');
    expect(paths).toContain('DE/faq.md');
    expect(paths.some((p) => p.startsWith('FR/one-pager'))).toBe(true);
    // assets référencés
    expect(m.find((e) => e.assetPath === 'editions/rsa-2026/comm/logo/x.svg')).toBeTruthy();
    expect(m.find((e) => e.path === 'Assets/reglement-FR.pdf')).toBeTruthy();
  });
});
```

- [ ] **Step 9: Lancer (échoue)**

Run: `npm test -- buildZip`
Expected: FAIL (module/exports manquants).

- [ ] **Step 10: Écrire buildZip.js**

```js
import JSZip from 'jszip';
import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { LANGS } from '@/lib/platform/i18n';
import { renderTextDeliverables, buildVariables } from './render';
import OnePagerPdf from '@/components/rsa/comm-pack/OnePagerPdf';

const LANG_FOLDER = { fr: 'FR', en: 'EN', de: 'DE' };

const ONEPAGER_LABELS = {
  fr: { eyebrow: 'Kit incubateur', applications: 'Candidatures', awards: 'Dotations', eligibility: 'Éligibilité', format: 'Format', ceremony: 'Cérémonie', info: 'Infos & candidature' },
  en: { eyebrow: 'Incubator kit', applications: 'Applications', awards: 'Awards', eligibility: 'Eligibility', format: 'Format', ceremony: 'Ceremony', info: 'Info & apply' },
  de: { eyebrow: 'Inkubator-Kit', applications: 'Bewerbungen', awards: 'Preise', eligibility: 'Zulassung', format: 'Format', ceremony: 'Zeremonie', info: 'Infos & Bewerbung' },
};

const EXT = { email: 'txt', newsletter: 'md', social: 'txt', keymsg: 'txt', faq: 'md' };

// Manifest pur (testable sans navigateur) : décrit ce que le ZIP contiendra.
export function buildZipManifest(edition) {
  const entries = [];
  const texts = renderTextDeliverables(edition);
  for (const lang of LANGS) {
    const folder = LANG_FOLDER[lang];
    for (const [key, body] of Object.entries(texts[lang])) {
      entries.push({ path: `${folder}/${key}.${EXT[key] || 'txt'}`, content: body });
    }
    // email HTML en plus
    entries.push({ path: `${folder}/email.html`, content: `<pre>${texts[lang].email}</pre>` });
    // one-pager (généré au build réel ; ici on déclare juste le chemin)
    entries.push({ path: `${folder}/one-pager.pdf`, onePagerLang: lang });
  }
  // assets uploadés
  const assets = edition?.comm_pack_config?.assets || {};
  if (assets.logo_path) entries.push({ path: `Assets/logo${extOf(assets.logo_path)}`, assetPath: assets.logo_path });
  for (const lang of LANGS) {
    const poster = assets.poster?.[lang];
    if (poster) entries.push({ path: `Assets/affiche-${LANG_FOLDER[lang]}${extOf(poster)}`, assetPath: poster });
    const regl = assets.reglement?.[lang];
    if (regl) entries.push({ path: `Assets/reglement-${LANG_FOLDER[lang]}.pdf`, assetPath: regl });
  }
  return entries;
}

function extOf(path) {
  const m = /\.([a-z0-9]+)$/i.exec(path || '');
  return m ? `.${m[1]}` : '';
}

// Build réel (navigateur) : génère les PDF + fetch les assets + zippe.
export async function buildCommPackZip(edition, { fetchAsset }) {
  const zip = new JSZip();
  const manifest = buildZipManifest(edition);
  for (const entry of manifest) {
    if (entry.content != null) {
      zip.file(entry.path, entry.content);
    } else if (entry.onePagerLang) {
      const vars = buildVariables(edition, entry.onePagerLang);
      const blob = await pdf(React.createElement(OnePagerPdf, { vars, labels: ONEPAGER_LABELS[entry.onePagerLang] })).toBlob();
      zip.file(entry.path, blob);
    } else if (entry.assetPath && typeof fetchAsset === 'function') {
      const blob = await fetchAsset(entry.assetPath);
      if (blob) zip.file(entry.path, blob);
    }
  }
  return zip.generateAsync({ type: 'blob' });
}
```

- [ ] **Step 11: Test passe**

Run: `npm test -- buildZip`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add src/components/rsa/comm-pack/OnePagerPdf.jsx src/lib/rsa/comm-pack/buildZip.js src/lib/rsa/comm-pack/buildZip.test.js
git commit -m "feat(incubateurs): one-pager PDF react-pdf + assemblage ZIP (manifest testé)"
```

### 5d. Section pack dans l'onglet admin

- [ ] **Step 13: Ajouter la section 2 dans IncubatorsTab**

Dans `IncubatorsTab.jsx`, ajouter les imports :
```js
import { Edition } from '@/lib/rsa/entities/editions';
import { commAssetPublicUrl, uploadCommAsset } from '@/lib/rsa/storage';
// NB : buildCommPackZip est importé en DYNAMIQUE dans onGenerate (Step 14), pas ici.
```
> La config pack est persistée via `Edition.update(editionId, { comm_pack_config })` (entité existante), pas via l'autosave du funnel — plus simple et découplé du flux de création.

Ajouter, après la `</section>` de la section opt-in, une nouvelle section :
```jsx
<section className="border-t border-[#e7e1d6] pt-6">
  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#0a1f44]">
    {t({ fr: 'Pack de communication', en: 'Communication pack', de: 'Kommunikationspaket' })}
  </h3>

  {/* éditoriaux par langue — exemple FR ; répéter EN/DE ou itérer sur ['fr','en','de'] */}
  {['fr', 'en', 'de'].map((lng) => (
    <div key={lng} className="mb-4">
      <p className="mb-1 text-xs font-semibold text-[#7a7367]">{lng.toUpperCase()}</p>
      <TextRow id={`tagline-${lng}`} label={t({ fr: 'Accroche', en: 'Tagline', de: 'Slogan' })}
        value={config.tagline?.[lng] ?? ''}
        onChange={(val) => patchConfig({ tagline: { ...(config.tagline || {}), [lng]: val } })} />
      <TextRow id={`venue-${lng}`} label={t({ fr: 'Lieu cérémonie', en: 'Ceremony venue', de: 'Veranstaltungsort' })}
        value={config.ceremony_venue?.[lng] ?? ''}
        onChange={(val) => patchConfig({ ceremony_venue: { ...(config.ceremony_venue || {}), [lng]: val } })} />
    </div>
  ))}

  <TextRow id="contact-name" label={t({ fr: 'Contact — nom', en: 'Contact — name', de: 'Kontakt — Name' })}
    value={config.contact?.name ?? ''} onChange={(val) => patchConfig({ contact: { ...(config.contact || {}), name: val } })} />
  <TextRow id="contact-phone" label={t({ fr: 'Contact — téléphone', en: 'Contact — phone', de: 'Kontakt — Telefon' })}
    value={config.contact?.phone ?? ''} onChange={(val) => patchConfig({ contact: { ...(config.contact || {}), phone: val } })} />
  <TextRow id="contact-email" label={t({ fr: 'Contact — email', en: 'Contact — email', de: 'Kontakt — E-Mail' })}
    value={config.contact?.email ?? ''} onChange={(val) => patchConfig({ contact: { ...(config.contact || {}), email: val } })} />

  {/* assets uploadés */}
  <div className="mt-4 space-y-2">
    <AssetUpload label={t({ fr: 'Logo', en: 'Logo', de: 'Logo' })} kind="logo" current={config.assets?.logo_path}
      onUploaded={(path) => patchConfig({ assets: { ...(config.assets || {}), logo_path: path } })} editionId={editionId} />
    {['fr', 'en', 'de'].map((lng) => (
      <AssetUpload key={`reg-${lng}`} label={`Règlement ${lng.toUpperCase()}`} kind={`reglement-${lng}`}
        current={config.assets?.reglement?.[lng]}
        onUploaded={(path) => patchConfig({ assets: { ...(config.assets || {}), reglement: { ...(config.assets?.reglement || {}), [lng]: path } } })}
        editionId={editionId} />
    ))}
    {['fr', 'en', 'de'].map((lng) => (
      <AssetUpload key={`pos-${lng}`} label={`Affiche ${lng.toUpperCase()}`} kind={`affiche-${lng}`}
        current={config.assets?.poster?.[lng]}
        onUploaded={(path) => patchConfig({ assets: { ...(config.assets || {}), poster: { ...(config.assets?.poster || {}), [lng]: path } } })}
        editionId={editionId} />
    ))}
  </div>

  <div className="mt-6 flex items-center gap-3">
    <button type="button" className="rounded-lg bg-[#0a1f44] px-4 py-2 text-sm text-white disabled:opacity-50"
      disabled={generating} onClick={onGenerate}>
      {generating ? t({ fr: 'Génération…', en: 'Generating…', de: 'Erzeugen…' }) : t({ fr: 'Générer le ZIP ⤓', en: 'Generate ZIP ⤓', de: 'ZIP erzeugen ⤓' })}
    </button>
  </div>
</section>
```
Ajouter dans le composant, le state + helpers (avec `editionFull` = l'objet édition complet, chargé via `Edition.get(editionId)` ou reçu en prop) :
```js
import { Edition } from '@/lib/rsa/entities/editions';
// …
const [editionFull, setEditionFull] = useState(competition || {});
useEffect(() => { if (editionId) Edition.get(editionId).then((e) => e && setEditionFull(e)); }, [editionId]);
const config = editionFull.comm_pack_config || {};
const patchConfig = async (partial) => {
  const next = { ...config, ...partial };
  const updated = await Edition.update(editionId, { comm_pack_config: next });
  setEditionFull((prev) => ({ ...prev, comm_pack_config: updated?.comm_pack_config ?? next }));
};
const [generating, setGenerating] = useState(false);
const onGenerate = async () => {
  setGenerating(true);
  try {
    const fetchAsset = async (path) => {
      const url = commAssetPublicUrl(path);
      if (!url) return null;
      const res = await fetch(url);
      return res.ok ? res.blob() : null;
    };
    const blob = await buildCommPackZip(editionFull, { fetchAsset });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(editionFull.name || 'kit').replace(/\s+/g, '-')}-${editionFull.year || ''}-kit-com.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  } finally { setGenerating(false); }
};
```
Et un petit composant `AssetUpload` (en bas du même fichier) :
```jsx
function AssetUpload({ label, kind, current, onUploaded, editionId }) {
  const [busy, setBusy] = useState(false);
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { const path = await uploadCommAsset({ editionId, kind, file }); onUploaded(path); }
    finally { setBusy(false); }
  };
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-28 text-[#7a7367]">{label}</span>
      <input type="file" onChange={onFile} disabled={busy} />
      {current ? <a className="text-xs text-[#0a1f44] underline" href={commAssetPublicUrl(current)} target="_blank" rel="noreferrer">✓</a> : null}
    </div>
  );
}
```

- [ ] **Step 14: Lazy-load react-pdf/jszip (bundle)**

Pour éviter d'alourdir le bundle principal, le bouton « Générer » importe `buildCommPackZip` en dynamique. Remplacer l'import statique de `buildCommPackZip` par un import dynamique dans `onGenerate` :
```js
const { buildCommPackZip } = await import('@/lib/rsa/comm-pack/buildZip');
```
(et retirer l'import statique correspondant).

- [ ] **Step 15: typecheck + lint + build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: build OK ; vérifier qu'un chunk séparé contient react-pdf/jszip (code-split).

- [ ] **Step 16: Browser-test génération réelle**

`npm run dev` → onglet Incubateurs → remplir accroche/contact FR, uploader un logo + un règlement FR → « Générer le ZIP ». Ouvrir le ZIP : vérifier `FR/EN/DE` (email/social/faq/one-pager.pdf) + `Assets/` (logo, reglement-FR.pdf). Ouvrir `one-pager.pdf` → texte vectoriel sélectionnable, variables remplies.
Expected: ZIP conforme à la structure miroir.

- [ ] **Step 17: Commit**

```bash
git add src/components/rsa/admin/platform/master/competition-tabs/IncubatorsTab.jsx
git commit -m "feat(incubateurs): section pack com (éditoriaux + assets + génération ZIP) dans l'onglet"
```

---

## Task 6: Volet bonus — attribution sourcing

**Files:**
- Modify: `IncubatorsTab.jsx` (3e section, lecture seule)
- Modify: `src/components/rsa/hooks/useIncubators.js` (hook de comptage)

- [ ] **Step 1: Hook de comptage**

Ajouter dans `useIncubators.js` :
```js
import { supabase } from '@/lib/supabase';

export function useSourcingStats(editionId) {
  return useQuery({
    queryKey: ['rsa', 'incubators', 'sourcing', editionId],
    enabled: !!editionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('startups')
        .select('incubator_id, incubator_other')
        .eq('edition_id', editionId)
        .neq('status', 'brouillon');
      if (error) throw error;
      const counts = {};
      let other = 0;
      let none = 0;
      for (const row of data || []) {
        if (row.incubator_id) counts[row.incubator_id] = (counts[row.incubator_id] || 0) + 1;
        else if (row.incubator_other) other += 1;
        else none += 1;
      }
      return { counts, other, none, total: (data || []).length };
    },
  });
}
```

- [ ] **Step 2: Section sourcing (lecture seule)**

Dans `IncubatorsTab.jsx`, importer `useSourcingStats` et `useAllIncubators` (déjà importé), puis ajouter en bas :
```jsx
<section className="border-t border-[#e7e1d6] pt-6">
  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#0a1f44]">
    {t({ fr: 'Provenance des candidats', en: 'Applicant sourcing', de: 'Herkunft der Bewerber' })}
  </h3>
  <SourcingTable editionId={editionId} allById={allById} t={t} />
</section>
```
Et le composant (bas de fichier) :
```jsx
function SourcingTable({ editionId, allById, t }) {
  const { data } = useSourcingStats(editionId);
  if (!data || data.total === 0) {
    return <SectionNote>{t({ fr: 'Aucune candidature soumise pour le moment.', en: 'No submitted applications yet.', de: 'Noch keine eingereichten Bewerbungen.' })}</SectionNote>;
  }
  const rows = Object.entries(data.counts).sort((a, b) => b[1] - a[1]);
  return (
    <ul className="space-y-1 text-sm">
      {rows.map(([id, n]) => (
        <li key={id} className="flex justify-between"><span>{allById[id]?.name || id}</span><span className="font-semibold">{n}</span></li>
      ))}
      <li className="flex justify-between text-[#7a7367]"><span>{t({ fr: 'Autre', en: 'Other', de: 'Andere' })}</span><span>{data.other}</span></li>
      <li className="flex justify-between text-[#7a7367]"><span>{t({ fr: 'Non renseigné', en: 'Not specified', de: 'Nicht angegeben' })}</span><span>{data.none}</span></li>
    </ul>
  );
}
```

- [ ] **Step 3: typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Browser-test**

Soumettre 1-2 candidatures de test avec incubateur renseigné → la section affiche les comptes.
Expected: comptage correct par incubateur + Autre + Non renseigné.

- [ ] **Step 5: Commit**

```bash
git add src/components/rsa/hooks/useIncubators.js src/components/rsa/admin/platform/master/competition-tabs/IncubatorsTab.jsx
git commit -m "feat(incubateurs): vue attribution sourcing (candidats par incubateur)"
```

---

## Task 7: Vérification de bout en bout

**Files:**
- Create (optionnel): `tests/e2e/incubateurs.spec.js`

- [ ] **Step 1: Vérifs globales**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: tout PASS.

- [ ] **Step 2: e2e Playwright (optionnel mais recommandé)**

Écrire un test minimal qui : ouvre le funnel candidat d'une édition de test avec ≥1 incubateur opt-in, vérifie que le select contient l'incubateur + « Autre / aucun », sélectionne « Autre », saisit un texte, et confirme l'absence d'erreur. (Suivre la config existante `tests/e2e/playwright.config.js`.)
Run: `npm run test:e2e -- incubateurs`
Expected: PASS.

- [ ] **Step 3: Parcours manuel complet (chrome-devtools)**

1. Admin → compétition → onglet Incubateurs : créer incubateurs, opt-in, ordre.
2. Remplir pack (FR/EN/DE) + uploads → Générer ZIP → contrôler structure + one-pager.
3. Funnel candidat : déclarer incubateur, soumettre.
4. Retour onglet Incubateurs → section sourcing reflète la soumission.
Expected: flux complet sans erreur, en FR/EN/DE.

- [ ] **Step 4: Commit final + push**

```bash
git add -A
git commit -m "test(incubateurs): e2e funnel + vérification bout en bout"
git push -u origin feat/incubateurs
```

---

## Self-Review (couverture spec)

- Volet A (base globale + opt-in) → Tasks 1, 2, 4. ✓
- Volet B (générateur pack visuel FR/EN/DE → ZIP, diffusion manuelle) → Task 5 (templates, render testé, one-pager react-pdf, JSZip, assets uploadés, bouton ZIP). ✓
- Volet C (déclaration incubateur select+Autre, sans impact éligibilité) → Task 3. ✓
- Bonus sourcing → Task 6. ✓
- Schéma + RLS + RPC + bucket → Tasks 1, 2. ✓
- i18n FR/EN/DE → templates dicts + labels funnel + libellés UI. ✓
- Décisions de cadrage respectées : pack niveau compétition (pas club), diffusion manuelle (pas d'envoi/page publique), opt-in global, mono-incubateur, règlement/affiche uploadés. ✓

**Divergences assumées vs blueprint (à valider) :**
1. **dnd → boutons monter/descendre** (le repo n'utilise `@hello-pangea/dnd` nulle part ; éviter d'introduire un nouveau pattern pour un simple reorder). 
2. **Pas de `DataTable`** (inexistant) → liste `<ul>` de cards, idiome `CompetitionsTab`.
3. **vitest ajouté** pour la logique pure (interpolation + manifest ZIP) — le reste vérifié par typecheck/lint/build + Playwright + browser-test (culture du repo).
4. **Config pack via `Edition.update`** (pas via l'autosave funnel) si le hook autosave n'expose pas de mutateur réutilisable — à confirmer à la lecture de `useAutosaveCompetition`.
