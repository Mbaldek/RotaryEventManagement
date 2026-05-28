# Module 3 — Jury (« Espace Jury »)

> Build-ready spec for the **juror** scoring workflow that turns assigned-session
> dossiers into one final, weighted score per startup × per juror — third module
> of the RSA platform rebuild. See memory `project_rsa_platform_rebuild`.

- **Stack** : React 18 + Vite, Tailwind + shadcn/ui, Supabase (DB + Realtime + private Storage), TanStack React Query. Imports via `@/`.
- **Data spine** : the `startups` dossier (Modules 1+2) carries the candidate ; a new `platform_jury_scores` row hangs off it for each (startup × jury) couple ; assignments live in `platform_jury_assignments` (juror × session). The legacy `jury_scores` (composite PK `session_id + jury_name + startup_name`) stays as archive, untouched.
- **Auth/roles** : `src/lib/platform/auth.jsx` (`usePlatformAuth`). Roles `'jury'` (R/W on own scores), `'admin'` (orchestrate session lifecycle + override), `'comite'` (read-only on scores). A user can be `'jury' + 'comite'` simultaneously (multi-role per memory). Source of truth = locked `app_user_roles` (cf. C1 hardening). **No public self-registration**: jurors are admin-provisioned; the legacy `RsaJuryForm.jsx` route is gone.
- **Reused from Modules 1+2** :
  - `signedDossierUrl(s)` from `src/lib/rsa/storage.js` (private `dossiers` bucket, staff read via `is_dossier_staff()`).
  - `CRITERIA` / `SCORE_FIELDS` / `MAX_WEIGHTED` / `weightedScore` / `getCriterion` / `JURY_STATUS` / `SESSIONS` from `src/lib/rsa/constants.js`. The 6 weighted dimensions and FR/EN/DE labels are the same as 2026.
  - `buildRanking` from `src/lib/rsa/ranking.js` (lifted/ported to a SQL twin for `rsa_publish_session`, see §5.4).
  - The 2026 scoring UX vocabulary embodied in `src/components/rsa/CriterionRating.jsx` + `StartupScoreCard.jsx` — **logic ported, chrome restyled** to Élysée (no amber accents, gold focus ring, hairline borders).
- **Design** : « Élysée » designbook (`docs/design/elysee-designbook.md`) — NAVY/GOLD/CREAM, Playfair + Inter, hairline borders, no dashboard look. Reuse `PageShell` / `TopNav` / `Field` / `Select` / `Textarea` / `RadioYesNo` / `StatusPill` / `Button` from `@/components/design`. The jury screens are **denser than the comité queue** (a juror evaluates 5–8 startups in a row during a 2h30 session) but stay editorial : typographic queue + one expandable scoring panel per startup, never a spreadsheet.
- **Trilingual** : FR / EN / DE chrome (memory `project_rsa_pitch_language` — **pitch content stays English**; juror chrome is fully FR/EN/DE since the international jury reads in their preferred language). Co-locate dictionaries in `src/components/rsa/jury/i18n.js`; **import** the shared `RULE_LABELS` from `src/components/rsa/candidature/i18n.js` and resolve criteria labels via `getCriterion(c, lang)`.
- **Session format** (memory `project_rsa_session_format`, never invent durations) : pitch 10–12 min + Q&A 8–10 min = slot 20 min ; session ~2h30 ; the scoring grid is open during the live window.

---

## 1. Scope & non-goals

**In scope (Module 3) — the « Espace Jury »:**
- A single new route `Jury` (file `src/pages/Jury.jsx`, auto-registered via `pages.config.js`) gated to `has_platform_role('jury' OR 'admin')`.
- **Session list** for the connected juror: all `platform_jury_assignments` (qualifying sessions + finale, if assigned), with the per-session lifecycle `StatusPill` (`draft|live|locked|published`) and the dossier queue.
- **Pre-session pack**: per assigned session, a list of all startups in pitch order with signed download links (`pitch_deck` + `exec_summary`) and a one-click "Open pre-read pack" if the admin produced a consolidated PDF (see §6).
- **Live scoring grid**: during the session live window, the juror opens each startup, rates the 6 criteria 0-5, adds an optional comment, autosaves drafts, and submits a final score per startup (locks **only that juror × that startup**, not the session).
- **Results view**: once admin Lock + Publish, the juror sees the published ranking and their own submitted scores (read-only).
- TanStack hooks + new entities (`PlatformJuryScore`, `PlatformJuryScoreDraft`, `PlatformJuryAssignment`).
- New migration with:
  - 3 tables (`platform_jury_scores`, `platform_jury_score_drafts`, `platform_jury_assignments`).
  - Optional `platform_jury_profiles` extension (or `profiles` extension — §2).
  - 3 SECURITY DEFINER RPCs (`rsa_submit_jury_score`, `rsa_lock_session`, `rsa_publish_session`), all using the **bypass-sentinel** pattern from `20260527_rsa_module1_hardening.sql` for any `startups.status` projection.
  - RLS policies: juror writes own row only on assigned sessions ; comité/admin read all ; admin manages assignments + lifecycle.

**Out of scope (later modules / dependencies):**
- **Real-time admin grid** (LiveTab) — the per-session "12 jurors × 8 startups" matrix admin watches in real-time during scoring belongs in **Module 4 (Admin / Live)**. The juror does not see other jurors' scores, ever. Flag §7.
- **Pre-session pack generation** (Edge function `consolidate-jury-pack`) — already exists in `supabase/functions/consolidate-jury-pack/index.ts` for the 2026 schema. Re-targeting it to the `dossiers` bucket + new `startups` is a small follow-up; Module 3 ships a **client-side fallback** (signed-URL list) and reuses the Edge function once retargeted (see §6).
- **Admin session editor** (Setup pitch order, jury assignments UI, edition CRUD) — handled by a future admin-only page; here `sessions` / `editions` are reference reads and `platform_jury_assignments` writes go through a thin admin form embedded in Module 3 *as a stopgap* (see §2.4).
- **Finale results page** (public palmarès, emails) — Module 4.
- **Importing legacy 2026 `jury_scores`** — deliberately not migrated (string-keyed by juror name); the 2026 edition is `closed`. New editions start clean. Open question §12.7.

---

## 2. Jury provisioning — admin tools (briefly)

> **Decision context (from the user):** jurors are members of the Rotary network, **admin-provisioned**. The legacy 2026 self-service form (`RsaJuryForm.jsx`, `jury_profiles` row) is gone. The platform-side role grant is `app_user_roles[role='jury']` — only `service_role` (or admin via a SECURITY DEFINER RPC) can write that table per the C1 hardening.

### 2.1 The role grant
- `INSERT INTO public.app_user_roles (email, roles) VALUES (lower(email), ARRAY['jury'])` — done by service_role (Supabase Studio / admin CLI script) or by a small SECURITY DEFINER admin RPC `rsa_grant_role(p_email, p_role)` (a useful Module-4 utility; for Module 3 we accept service_role-only writes).
- The juror lands on the platform via the same magic-link flow as a candidate (`signInWithMagicLink`). The first auth call hydrates `roles = ['jury']` (or `['jury','comite']`) into `usePlatformAuth().roles`. **No public sign-up.**

### 2.2 Per-juror profile — schema decision
The 2026 `jury_profiles` table is string-keyed and carries Q-coded fields (`prenom`, `nom`, `qualite`, `organisation`, `email`, `assigned_sessions: text[]` of FR labels, `photo_base64`, `validated`, `grande_finale`). It stays as **archive only** — never read by the new app, never written by Module 3.

For the new platform we have two viable shapes; we recommend **(B)**.

| Option | Shape | Pros | Cons |
|--------|-------|------|------|
| **A. Extend `profiles`** | Add `jury_qualite text`, `jury_organisation text`, `jury_photo_url text` columns on the existing `public.profiles`. | One table for "who is this user". No new RLS surface. | `profiles` is keyed by `auth.uid()` already — fine. But `profiles` is the shared user-identity surface; bolting jury-specific columns mixes concerns and forces RLS sweeps on every profile edit. |
| **B. New `platform_jury_profiles` (recommended)** | A dedicated table keyed on `auth.users(id)` (NOT name, NOT email) carrying `qualite text`, `organisation text`, `photo_url text` (Storage path to a small avatar in a new public-by-bypass `avatars` bucket or as a signed URL on demand), `bio text`, `created_at`, `updated_at`. | Separation of concerns; admin can edit it without touching `profiles`; the table is **the new locus** for juror display data. Self-read for own row; comité/admin read all. | One additional table + one RLS sweep — cheap. |

**Recommended migration sketch:**

```sql
create table if not exists public.platform_jury_profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  qualite     text,                     -- "Investisseur", "Directrice Innovation", …
  organisation text,                    -- "Bpifrance", "Cyrus Conseil", …
  photo_path  text,                     -- chemin Storage (avatars bucket, optional)
  bio         text,                     -- 1-2 phrases EN, optional
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.platform_jury_profiles enable row level security;

-- Read: any jury/comité/admin can see all jury profiles (needed by the LiveTab + by
-- the public landing's "Le Jury 2026" page later). Owners always see their own.
create policy pjp_read on public.platform_jury_profiles for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.has_platform_role('jury')
    or public.has_platform_role('comite')
    or public.has_platform_role('admin')
  );

-- Write own row (display name, bio, photo) — but NOT the user_id key.
create policy pjp_self_update on public.platform_jury_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Insert: own row only (admin pre-seeds via service_role; jury can complete on first
-- visit if missing). Admin can insert for anyone.
create policy pjp_insert on public.platform_jury_profiles for insert
  to authenticated
  with check (user_id = auth.uid() or public.has_platform_role('admin'));

-- Delete: admin only.
create policy pjp_admin_delete on public.platform_jury_profiles for delete
  to authenticated
  using (public.has_platform_role('admin'));
```

> **Display name** comes from `profiles.full_name` (already a column on the existing
> `profiles` table); we do not duplicate it here. `platform_jury_profiles` only
> carries jury-specific *display chrome* (`qualite`, `organisation`, `photo_path`, `bio`).

### 2.3 Assignments — `platform_jury_assignments`
The **central table** of Module 3. Keyed (jury_user_id × session_id). Admin-managed.

```sql
create table if not exists public.platform_jury_assignments (
  jury_user_id uuid not null references auth.users(id) on delete cascade,
  session_id   text not null references public.sessions(id) on delete cascade,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id),
  primary key (jury_user_id, session_id)
);
create index if not exists pja_session_idx on public.platform_jury_assignments(session_id);
create index if not exists pja_jury_idx    on public.platform_jury_assignments(jury_user_id);
alter table public.platform_jury_assignments enable row level security;

-- Read: assigned juror (own assignments) + comité/admin (all). Jurors can see who else
-- is on their sessions (LiveTab + the small "co-jurors" pill) — same as 2026 RsaJuryView.
create policy pja_read on public.platform_jury_assignments for select
  to authenticated
  using (
    jury_user_id = auth.uid()
    or public.has_platform_role('comite')
    or public.has_platform_role('admin')
  );

-- Write: admin only (the user said: admin-assigned, no self-claim).
create policy pja_admin_write on public.platform_jury_assignments for all
  to authenticated
  using  (public.has_platform_role('admin'))
  with check (public.has_platform_role('admin'));
```

### 2.4 Admin UI footprint inside Module 3 (stopgap)
A small admin-only panel `<JuryAssignmentsAdmin>` is embedded in the Jury page **for admins**:
- Lists all jurors (`profiles` rows whose email appears in `app_user_roles` with `'jury'`).
- A grid juror × session (qualifying + finale) with checkboxes to add/remove `platform_jury_assignments` rows.
- Read-only "co-jurors per session" summary (count + names).

This is a stopgap so admins can bootstrap assignments without a full admin space; the canonical version lives in **Module 4 (Admin)**. Flag §12.4.

---

## 3. Page route, auth gate & navigation

### 3.1 Route
- **File** : `src/pages/Jury.jsx` (one file = one route, auto-registered via `pages.config.js` — do not hand-edit that file).
- **Page key** : `Jury`. Pre-list it in `Layout.jsx`'s `STANDALONE_PAGES` (it renders without the lunch-app chrome), exactly as `Selection` and `MonDossier` do.
- **Path** : reachable through `createPageUrl('Jury')`. A user-friendly alias `/jury` may be added at the router level (mirrors `/selection` and `/espace-startup`).

### 3.2 Auth & role gate
- Wrap behind `PlatformAuthProvider` (already mounted at the app shell level).
- Gate inside `Jury.jsx`:

```jsx
const { isAuthenticated, isJury, isAdmin, loading } = usePlatformAuth();
if (loading) return <ShellLoading />;
if (!isAuthenticated) return <Navigate to="/Login?redirect=/Jury" replace />;
if (!(isJury || isAdmin)) return <NoAccessNotice />;  // courteous 403, trilingual
```

- A `comite` user **without** the `jury` role lands on `NoAccessNotice` — comité members do not see jury scores by default (consistent with the "comité is read-only on scores via RLS, but the *page* is jury-first"). They access scoring data via the Module-2 dossier drawer or Module-4 admin views. Open question §12.6 — should comité see a read-only Jury page for transparency?
- The role check is **UX only**; RLS on `platform_jury_*` tables is the real boundary (§9).

### 3.3 TopNav link
- Add a `Jury` link in `src/components/design/shell/TopNav.jsx`'s nav menu, **visible only when** `isJury || isAdmin`. (The TopNav already supports role-aware items via `NavMenu`; one line + an entry in the trilingual nav dictionary.)
- Label: `{ fr: 'Jury', en: 'Jury', de: 'Jury' }`.
- Active state: GOLD underline per design book §5.2.

---

## 4. Espace Jury — overview (what a juror sees and does)

The Jury page is **session-first**, not startup-first. A juror's mental model is "I am juror for *these 3 sessions*; what do I need to do for each?". The page splits into two panes on desktop ≥ lg (collapses to stacked on mobile):

```
┌─────────────────────────────────────────────────────────────────┐
│  ESPACE JURY  ·  Édition « dev » (active)                FR EN DE│
├────────────────────┬────────────────────────────────────────────┤
│                    │                                            │
│  MES SESSIONS      │  SESSION 19 NOV · TECH, AI, FINTECH       │
│                    │                                            │
│  · Foodtech    ✓   │  [LIVE]  J-0   3 / 5 jurés actifs         │
│  · Edtech          │                                            │
│  · Tech AI   LIVE  │  Pré-lecture : 6 startups dans l'ordre    │
│  · Healthtech      │   [Télécharger le pack PDF]                │
│  · Greentech       │                                            │
│  · Finale     ?    │  Notation                                  │
│                    │   01  Helia BioPlastics      ● à noter     │
│                    │   02  Boréalis EdTech        ✓ envoyé      │
│  [Mon profil]      │   03  …                                    │
│                    │                                            │
└────────────────────┴────────────────────────────────────────────┘
```

A juror's lifecycle for one session:

```
draft (admin) ──► live (admin) ──► locked (admin) ──► published (admin)
   │                  │                   │                  │
   │ pre-read pack    │ scoring grid      │ read-only        │ read-only
   │ visible          │ open              │ "verrouillé"     │ + ranking
   │ (decks + exec)   │ + autosave drafts │ banner           │ revealed
   │ countdown        │ + submit per      │                  │
   │                  │ startup           │                  │
```

The juror can **resume** scoring across devices: drafts auto-save to `platform_jury_score_drafts` (server-side, keyed by jury + startup), surviving tab close. Submitting writes the final `platform_jury_scores` row and visually marks the startup as "envoyé" (the juror can still edit until session `locked`).

---

## 5. Data model — the critical refactor

The 2026 `jury_scores` table is keyed by `(session_id text, jury_name text, startup_name text)` — strings everywhere. The new schema is **id-keyed throughout** (uuid for jury, uuid for startup), survives a juror renaming themselves, and joins cleanly to `app_user_roles`/`profiles`/`startups`.

### 5.1 `platform_jury_scores` (the final, locked-when-session-locks score)

One row per (startup × jury). The 6 score columns mirror `SCORE_FIELDS` from `constants.js`. The composite PK enforces "one final row per juror per startup".

```sql
create table if not exists public.platform_jury_scores (
  startup_id     uuid not null references public.startups(id) on delete cascade,
  jury_user_id   uuid not null references auth.users(id) on delete cascade,
  -- Snapshot of the session this score belongs to (denormalised for fast queries
  -- and to enforce "the juror was assigned to that session at submit time").
  session_id     text not null references public.sessions(id),
  -- 6 criteria scores, 0..5, all required (NOT NULL — submit RPC validates).
  score_value_prop        int not null check (score_value_prop        between 0 and 5),
  score_market            int not null check (score_market            between 0 and 5),
  score_business_model    int not null check (score_business_model    between 0 and 5),
  score_team              int not null check (score_team              between 0 and 5),
  score_pitch_quality     int not null check (score_pitch_quality     between 0 and 5),
  score_societal_impact   int not null check (score_societal_impact   between 0 and 5),
  -- Optional comment (free-form, visible to staff only).
  comment        text,
  submitted_at   timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (startup_id, jury_user_id)
);
create index if not exists pjs_session_idx on public.platform_jury_scores(session_id);
create index if not exists pjs_jury_idx    on public.platform_jury_scores(jury_user_id);
alter table public.platform_jury_scores enable row level security;
```

**Why session_id is denormalised:** so that RLS can check "the juror was assigned to *this* session" without a 3-way join through `startups → sessions`. It is set by the submit RPC (never client-supplied), guaranteed equal to the dossier's `session_id` at submit-time. If the comité later reassigns the dossier to another cluster (extremely unlikely after `live`), the score stays attached to the original session — the dossier can have at most one set of jury scores in its lifetime per design (open question §12.3).

### 5.2 `platform_jury_score_drafts` (autosaved, upsert-friendly)

Same shape minus the NOT NULL on the criteria (drafts can be partial). Drops the score CHECK constraints (the submit RPC re-checks). Same composite PK so an upsert per (startup, jury) is a clean UPSERT.

```sql
create table if not exists public.platform_jury_score_drafts (
  startup_id     uuid not null references public.startups(id) on delete cascade,
  jury_user_id   uuid not null references auth.users(id) on delete cascade,
  session_id     text not null references public.sessions(id),
  score_value_prop        int check (score_value_prop        between 0 and 5),
  score_market            int check (score_market            between 0 and 5),
  score_business_model    int check (score_business_model    between 0 and 5),
  score_team              int check (score_team              between 0 and 5),
  score_pitch_quality     int check (score_pitch_quality     between 0 and 5),
  score_societal_impact   int check (score_societal_impact   between 0 and 5),
  comment        text,
  updated_at     timestamptz not null default now(),
  primary key (startup_id, jury_user_id)
);
create index if not exists pjsd_session_idx on public.platform_jury_score_drafts(session_id);
alter table public.platform_jury_score_drafts enable row level security;
```

### 5.3 RLS policies (the security spine)

The RLS contract is **strict and explicit**, mirroring the Module-2 split pattern:

```sql
-- ─── platform_jury_assignments — see §2.3 ────────────────────────────────────
-- (created above)

-- ─── platform_jury_score_drafts ──────────────────────────────────────────────
-- Read: own drafts only (drafts are private to the juror; staff never reads them).
create policy pjsd_self_read on public.platform_jury_score_drafts for select
  to authenticated
  using (jury_user_id = auth.uid());

-- Insert/Update: own drafts, AND only for startups whose session is in my assignments,
-- AND only while the session is 'live' (no draft writes on draft/locked/published).
create policy pjsd_self_write on public.platform_jury_score_drafts for all
  to authenticated
  using  (jury_user_id = auth.uid() and public.rsa_can_score(session_id))
  with check (jury_user_id = auth.uid() and public.rsa_can_score(session_id));

-- Delete: own drafts only (when juror clears a draft).
-- (covered by FOR ALL above)

-- ─── platform_jury_scores ────────────────────────────────────────────────────
-- Read: juror reads own; comité/admin read all; the dossier owner NEVER reads
-- (a candidate must not see individual juror scores; aggregate via the published
-- ranking only).
create policy pjs_jury_self_read on public.platform_jury_scores for select
  to authenticated
  using (
    jury_user_id = auth.uid()
    or public.has_platform_role('comite')
    or public.has_platform_role('admin')
  );

-- Insert: never via direct client (clients call the submit RPC). We REVOKE INSERT
-- from authenticated and only the SECURITY DEFINER rsa_submit_jury_score writes here.
-- The policy is intentionally restrictive — defense in depth.
create policy pjs_no_direct_write on public.platform_jury_scores for insert
  to authenticated
  with check (false);

-- Update: same — only the SECURITY DEFINER RPC may re-submit (overwrite own row
-- while session is 'live'). Direct UPDATE denied at the policy layer.
create policy pjs_no_direct_update on public.platform_jury_scores for update
  to authenticated
  using (false) with check (false);

-- Delete: admin only (the "I accidentally submitted for a wrong juror" recovery
-- path). Jurors never delete; they re-submit to overwrite.
create policy pjs_admin_delete on public.platform_jury_scores for delete
  to authenticated
  using (public.has_platform_role('admin'));
```

### 5.4 Helper SECURITY DEFINER functions

Two small helpers used by policies + RPCs:

```sql
-- Can the caller (juror) score this session right now?
-- = juror is assigned to that session AND the session status is 'live'.
-- SECURITY DEFINER so the policy can read sessions / platform_jury_assignments
-- without forcing the juror to have any read grant on those tables (they do, but
-- the function isolates the check + makes it cacheable in pg).
create or replace function public.rsa_can_score(p_session_id text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.platform_jury_assignments a
      join public.session_config sc on sc.session_id = a.session_id
     where a.session_id = p_session_id
       and a.jury_user_id = auth.uid()
       and sc.status = 'live'
  );
$$;
-- NB: 'session_config' is the legacy 2026 table that carries status (draft|live|
-- locked|published) keyed by session_id. We REUSE it for the new app rather than
-- introducing a parallel platform_session_state — it already has the right shape
-- and is admin-writable. (Open question §12.5 — confirm we keep the legacy
-- session_config table as the lifecycle source, or migrate to a new
-- platform_session_state.)

-- "I am assigned to this session" — used by the pre-read pack read & by the
-- session-list query.
create or replace function public.rsa_is_assigned(p_session_id text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.platform_jury_assignments
     where session_id = p_session_id and jury_user_id = auth.uid()
  );
$$;
```

> **Trade-off:** we *could* avoid SECURITY DEFINER helpers and inline an `EXISTS`
> subquery in each policy; we prefer the function because (a) it's reused across
> two policies + the submit RPC, (b) it documents the rule once, (c) `stable` +
> pinned `search_path` are the same safe pattern as `has_platform_role` and
> `owns_startup` already shipped.

### 5.5 RPC — `rsa_submit_jury_score`

Atomic: validate assignment + session is `live` + all 6 criteria present → upsert the final row → wipe the draft → return the row.

```sql
create or replace function public.rsa_submit_jury_score(
  p_startup_id uuid,
  p_session_id text,
  p_scores     jsonb,    -- { score_value_prop:int, score_market:int, ... 6 keys }
  p_comment    text default null
)
returns public.platform_jury_scores
language plpgsql security definer set search_path = public as $$
declare
  v_row    public.platform_jury_scores;
  v_jury   uuid := auth.uid();
  v_sid_db text;
begin
  -- 1. Caller must have jury role.
  if not public.has_platform_role('jury') and not public.has_platform_role('admin') then
    raise exception 'forbidden:not_jury' using errcode = '42501';
  end if;

  -- 2. The startup must be in the declared session.
  select session_id into v_sid_db from public.startups where id = p_startup_id;
  if not found then
    raise exception 'startup_not_found' using errcode = '22023';
  end if;
  if v_sid_db is null or v_sid_db <> p_session_id then
    raise exception 'startup_not_in_session' using errcode = '22023';
  end if;

  -- 3. Juror must be assigned to that session AND session.status = 'live'.
  if not public.rsa_can_score(p_session_id) then
    raise exception 'cannot_score:not_assigned_or_not_live' using errcode = '42501';
  end if;

  -- 4. Required scores present + in [0..5].
  if (p_scores->>'score_value_prop')::int      is null
     or (p_scores->>'score_market')::int          is null
     or (p_scores->>'score_business_model')::int  is null
     or (p_scores->>'score_team')::int            is null
     or (p_scores->>'score_pitch_quality')::int   is null
     or (p_scores->>'score_societal_impact')::int is null
  then
    raise exception 'missing_scores' using errcode = '22023';
  end if;

  -- 5. Upsert final row (PK = startup_id + jury_user_id).
  insert into public.platform_jury_scores
    (startup_id, jury_user_id, session_id,
     score_value_prop, score_market, score_business_model,
     score_team, score_pitch_quality, score_societal_impact,
     comment, submitted_at, updated_at)
  values
    (p_startup_id, v_jury, p_session_id,
     (p_scores->>'score_value_prop')::int,
     (p_scores->>'score_market')::int,
     (p_scores->>'score_business_model')::int,
     (p_scores->>'score_team')::int,
     (p_scores->>'score_pitch_quality')::int,
     (p_scores->>'score_societal_impact')::int,
     nullif(btrim(coalesce(p_comment, '')), ''),
     now(), now())
  on conflict (startup_id, jury_user_id) do update
    set score_value_prop      = excluded.score_value_prop,
        score_market          = excluded.score_market,
        score_business_model  = excluded.score_business_model,
        score_team            = excluded.score_team,
        score_pitch_quality   = excluded.score_pitch_quality,
        score_societal_impact = excluded.score_societal_impact,
        comment               = excluded.comment,
        updated_at            = now()
  returning * into v_row;

  -- 6. Clear the draft (no orphan after submit).
  delete from public.platform_jury_score_drafts
    where startup_id = p_startup_id and jury_user_id = v_jury;

  return v_row;
end$$;

revoke all on function public.rsa_submit_jury_score(uuid, text, jsonb, text) from public;
grant execute on function public.rsa_submit_jury_score(uuid, text, jsonb, text) to authenticated;
```

> **Why an RPC instead of direct INSERT?** Three reasons:
> (a) the **upsert-or-insert dance** with a strict "must be live" check is awkward
>     to write as a policy-only constraint and would require a `session_config`
>     read grant for every juror (we keep that table admin-only-writable);
> (b) we want the **draft-cleanup** to be atomic with the submit;
> (c) the policy layer (§5.3) denies direct writes — single happy path = the RPC.
>     Defense in depth.

### 5.6 RPC — `rsa_lock_session` (admin)

Sets `session_config.status = 'locked'`, freezes scores (no more submits / no more drafts), and **projects** the new status on every startup of that session: `startups.status = 'note'` (the lifecycle value already documented in `startups` foundation `:65`). Uses the bypass sentinel from `20260527_rsa_module1_hardening.sql` to write the projected `status`.

```sql
create or replace function public.rsa_lock_session(p_session_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_sid text := p_session_id;
begin
  if not public.has_platform_role('admin') then
    raise exception 'forbidden:not_admin' using errcode = '42501';
  end if;

  -- 1. Lock the session lifecycle (reuse legacy session_config).
  update public.session_config
     set status = 'locked', updated_at = now()
   where session_id = v_sid;

  -- 2. Project startups.status = 'note' for every dossier in this session.
  -- Bypass the startups_guard_update trigger via the sentinel (same pattern as
  -- rsa_submit_dossier / rsa_apply_selection_review).
  perform set_config('rsa.allow_protected_update', 't', true);
  update public.startups
     set status = 'note', updated_at = now()
   where session_id = v_sid and status in ('affecte','en_session');
  perform set_config('rsa.allow_protected_update', '', true);

  -- 3. Drafts after lock are no-op (RLS prevents writes anyway) — we don't delete
  -- them, the juror can still read what they had drafted.
end$$;

revoke all on function public.rsa_lock_session(text) from public;
grant execute on function public.rsa_lock_session(text) to authenticated;
```

### 5.7 RPC — `rsa_publish_session` (admin)

Sets `session_config.status = 'published'`, computes the **per-session ranking** via a SQL twin of `buildRanking` (`src/lib/rsa/ranking.js`), stores it on `session_config.final_ranking` (the legacy jsonb column already exists), then projects `startups.status = 'finaliste'` on the top-N startups of the session. N is **admin-configurable per edition** via a new `editions.finalists_per_session int default 1` column (open question §12.1).

```sql
-- Tiny SQL twin of weightedScore.
create or replace function public.rsa_weighted_score(p_row public.platform_jury_scores)
returns numeric language sql immutable as $$
  -- weights from constants.js : .2*4 + .1*2 = 1 (max weighted = 5).
  select (0.2 * p_row.score_value_prop
        + 0.2 * p_row.score_market
        + 0.2 * p_row.score_business_model
        + 0.2 * p_row.score_team
        + 0.1 * p_row.score_pitch_quality
        + 0.1 * p_row.score_societal_impact)::numeric;
$$;

create or replace function public.rsa_publish_session(p_session_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_n int;
  v_ranking jsonb;
begin
  if not public.has_platform_role('admin') then
    raise exception 'forbidden:not_admin' using errcode = '42501';
  end if;

  -- 1. Read N (finalists per session) from the edition.
  select coalesce(e.finalists_per_session, 1) into v_n
    from public.startups s
    join public.editions e on e.id = s.edition_id
   where s.session_id = p_session_id
   limit 1;

  -- 2. Compute per-startup avg weighted score, sort, return top rows + every
  -- ranked row for snapshotting in session_config.final_ranking.
  with per_score as (
    select s.id as startup_id, s.name as startup_name,
           public.rsa_weighted_score(js) as w
      from public.platform_jury_scores js
      join public.startups s on s.id = js.startup_id
     where js.session_id = p_session_id
  ),
  agg as (
    select startup_id, startup_name,
           avg(w)::numeric(4,2) as avg_w,
           count(*) as n_jurors
      from per_score
     group by startup_id, startup_name
  ),
  ranked as (
    select startup_id, startup_name, avg_w, n_jurors,
           row_number() over (order by avg_w desc, startup_name asc) as final_rank
      from agg
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'startup_id', startup_id,
    'startup', startup_name,
    'avg', avg_w,
    'n', n_jurors,
    'final_rank', final_rank
  ) order by final_rank), '[]'::jsonb)
    into v_ranking
    from ranked;

  -- 3. Snapshot the ranking on session_config + flip status.
  update public.session_config
     set status = 'published',
         final_ranking = v_ranking,
         updated_at = now()
   where session_id = p_session_id;

  -- 4. Project startups.status = 'finaliste' on the top-N (uses sentinel).
  perform set_config('rsa.allow_protected_update', 't', true);
  update public.startups st
     set status = 'finaliste', updated_at = now()
   where st.session_id = p_session_id
     and st.id in (
       select (e->>'startup_id')::uuid from jsonb_array_elements(v_ranking) e
       where (e->>'final_rank')::int <= v_n
     );
  perform set_config('rsa.allow_protected_update', '', true);

  -- 5. (Optional, follow-up) Mark all non-top-N startups as 'note' if not already
  -- — keeps the audit clean. Already set by rsa_lock_session for most.
end$$;

revoke all on function public.rsa_publish_session(text) from public;
grant execute on function public.rsa_publish_session(text) to authenticated;
```

> **Why SQL-side ranking instead of JS?** `buildRanking` works fine in JS but the
> projection of `startups.status='finaliste'` must be atomic with the snapshot
> write (no race). A SQL CTE + a single UPDATE wins. The JS helper stays in
> `ranking.js` for client-side previews (admin Module 4 can preview the ranking
> before pressing Publish).

### 5.8 Migration plan
A single new migration `20260528_rsa_module3_jury.sql`:
1. Create `platform_jury_profiles` + RLS (§2.2).
2. Create `platform_jury_assignments` + RLS (§2.3).
3. Create `platform_jury_score_drafts` + RLS (§5.3 / §5.4 helpers).
4. Create `platform_jury_scores` + RLS (§5.3).
5. Add `public.rsa_can_score`, `public.rsa_is_assigned`, `public.rsa_weighted_score` helper functions.
6. Add `public.rsa_submit_jury_score`, `public.rsa_lock_session`, `public.rsa_publish_session` RPCs (REVOKE public, GRANT authenticated; role check in body).
7. Add `editions.finalists_per_session int not null default 1` column.
8. **Do not touch** the trigger `startups_guard_update` (it already accepts the sentinel from §5.6 and §5.7 verbatim). Do not migrate `jury_scores` / `jury_profiles` / `jury_score_drafts` — archive untouched.

---

## 6. Pre-session jury pack

The 2026 Edge function `supabase/functions/consolidate-jury-pack/index.ts` already produces a single consolidated PDF (cover page + per-startup exec summary + footer) for one `session_id`, reading from the legacy `startup_confirmations` table and the public `uploads` bucket. We have two options for Module 3:

| Option | Pros | Cons |
|--------|------|------|
| **A. Retarget the Edge function** to read `startups` (filter by `session_id` for the new edition) and the private `dossiers` bucket (signed URLs internally via service_role). The function stays in `supabase/functions/`, the React app calls it via `supabase.functions.invoke('consolidate-jury-pack', { session_id })` and gets back the path of an output PDF stored in a new private `jury_packs/` prefix of `dossiers` (or a fresh `jury_packs` bucket). Admin triggers the build from the Module-4 admin panel; jury hub shows the pack link when available. | Single-source PDF the juror downloads on the train. Matches 2026 UX. Already battle-tested. | Edge function work (port to new schema). Slow to regenerate (~30-60 s for 8 startups). Pre-built by admin, not on-demand. |
| **B. Client-side pack download** — no consolidated PDF; instead a "Télécharger tous les exec summaries" button generates a small zip in-browser (or just lists each signed URL with a one-click "Open all" behaviour). | No server work. Always fresh. | Each juror downloads on the train through 8 separate signed URLs. No cover page. |

**Recommendation: ship (B) in v1, retarget (A) in a follow-up.**
- v1 (Module 3): the SessionDetail page renders a `<PreSessionPack>` component that lists each startup in pitch order with two signed download links per row (`pitch_deck`, `exec_summary`, both via `signedDossierUrl(path, 300)` — 5-min TTL, regenerated on click). The juror clicks through.
- v1.1 (small follow-up, can ship same week): retarget the Edge function to the new schema (one PR, no React changes), then surface a "Pack PDF · télécharger" link in `<PreSessionPack>` when `session_config.jury_pack_path` is non-null. The legacy column on `session_config` already exists.

The pack is **read-gated**: a juror can only download decks/exec summaries of startups in a session they are **assigned to** — enforced by the `dossiers_read` Storage policy (`is_dossier_staff()` already includes `'jury'`). Note this is **broader** than ideal (any jury role can read any dossier) — see open question §12.8 for a tighter scope.

---

## 7. Session view — per-session detail

Selecting a session in the left pane opens the session detail in the right pane (or full screen on mobile). Sections, top to bottom:

### 7.1 Header
- Eyebrow `MES SESSIONS · Foodtech & économie circulaire` (Playfair italic accent on the cluster name).
- `StatusPill kind="jury"` for the session lifecycle (`draft|live|locked|published` — mapped to the design book §6.2 tokens).
- Countdown: `J-12` / `Aujourd'hui` / `Demain` / `Hier · session terminée` (reuse the `formatDays` pattern from `RsaJuryHub.jsx:483`). Trilingual.
- "Co-jurors on this session" line: `Vous + 11 jurés · voir la liste` opens a small popover listing display names + qualité (read from `profiles.full_name` + `platform_jury_profiles.qualite`).

### 7.2 Pre-session pack (always visible, including before `live`)
`<PreSessionPack>` (§6) — the juror reads decks ahead of time. Visible from `draft` onwards.

### 7.3 Startup queue (visible from `live`)
A vertical, numbered editorial list (mirrors `<StartupScoreCard>` 2026 UX, restyled Élysée):

```
01  Helia BioPlastics                   [● à noter]   ▾
02  Boréalis EdTech                     [✓ envoyé]    ▾
03  Atlas Robotics                      [0 / 6]       ▾
…
```

- **Order**: read from `session_config.session_order` (legacy column carrying the pitch order set by admin in SetupTab — we reuse it as-is). Fallback to alphabetical when the order is missing (same fallback as `RsaJuryHub.jsx:264-281`).
- Each row shows the startup name (Playfair 500), an inline progress chip `n/6 critères notés` or `✓ envoyé`, and a chevron to expand.
- Click expands the `<ScoringPanel>` (§8). Only one panel open at a time on mobile (saves scroll); multiple allowed on desktop.

### 7.4 "Open scoring" action
Per row, the expand affordance IS the action. We do not expose a separate "Open scoring" button — clicking the row opens the panel. (Mirrors `StartupScoreCard.jsx` 2026 pattern.)

### 7.5 Status-specific behaviours

| Session status | Pre-read pack | Scoring panel | Banner |
|----------------|---------------|---------------|--------|
| `draft` | Visible (decks readable) | **Hidden** (queue collapsed to a one-liner "Notation ouvrira en début de session") | "Session pas encore ouverte" (gold tint) |
| `live` | Visible | **Visible + writable** (drafts autosave, submits allowed) | Pulsing GREEN_TODAY dot + "EN DIRECT" eyebrow |
| `locked` | Visible | **Visible + read-only** (your submitted scores, no edit) | "Scoring fermé — vos notes ont été enregistrées" (TINT_BLUE) |
| `published` | Visible | **Visible + read-only** + per-startup avg w / 5 + "Finaliste" badge on the top-N | "Résultats publiés" (gold-light tint) + a ResultsView card with the full ranking |

---

## 8. Scoring UX — one startup

The `<ScoringPanel>` is the heart of Module 3. It is a **direct port of the 2026 `StartupScoreCard.jsx` interaction model**, restyled to Élysée and rewired to the new data layer.

### 8.1 Layout

```
─────────────────────────────────────────────────────────────────
01  Helia BioPlastics                              [● à noter]  ▴
─────────────────────────────────────────────────────────────────
   Documents : [pitch deck PDF]  [exec summary PDF]
   (signed URLs, 5-min TTL, re-issued on click)

   ┌─ Proposition de valeur · 20%  ──────────────────── ▾ ─┐
   │  Clarté du problème adressé, intensité du besoin…    │
   │  [0] [1] [2] [3] [4] [5]                              │
   │  ▾ Repères de notation (collapsé)                     │
   └───────────────────────────────────────────────────────┘
   ┌─ Marché & Scalabilité · 20% …                         ┐
   …  (6 criteria total, same shape)

   Commentaire (optionnel · staff uniquement)
   [textarea]

   2 critères restants                  [Envoyer les notes]
─────────────────────────────────────────────────────────────────
```

### 8.2 Component contract
`<CriterionRating>` — port from `src/components/rsa/CriterionRating.jsx` :
- Extract its **logic** (the segmented 0-5 buttons, the collapse anchors, the `getCriterion(c, lang)` resolution).
- Re-style with Élysée tokens: segmented buttons become NAVY-bordered hairlines (no amber-600), selected = NAVY fill / white text + GOLD focus ring; anchors panel uses CREAM2 hairline and INK text; weight chip uses `OCHRE_TINT` / `OCHRE`.
- The new file lives in `src/components/rsa/jury/CriterionRating.jsx` so the 2026 component stays intact for the archive admin.
- Same trilingual labels via `getCriterion(c, lang)`.

`<ScoringPanel>` — the parent (port of `StartupScoreCard.jsx`):
- Holds the local draft state (criteria + comment).
- On every criterion change → **autosave** via debounced (~600ms) mutation `useSaveJuryDraft({ startupId, sessionId, patch })`.
- Computes `weightedScore(draft)` live (reuse from `constants.js`).
- "Envoyer les notes" disabled until all 6 filled; on click → `useSubmitJuryScore` mutation calling `rsa_submit_jury_score(startupId, sessionId, scores, comment)` ; on success, panel collapses + the queue row chip flips to `✓ envoyé · cliquez pour modifier`.
- Re-opening after submit pre-fills from `platform_jury_scores` (not from the draft, which was wiped server-side). The juror can edit and re-submit until session `locked`.
- Once `locked`, the panel renders **read-only** (segmented buttons display the selected value, all disabled).

### 8.3 Offline / cross-device resilience
Drafts live in `platform_jury_score_drafts` (server-side, RLS-scoped to `auth.uid()`). Resuming on a phone after starting on a laptop loads the same draft. **No localStorage fallback in v1** (in 2026 the `LS_KEY` pattern was needed because there was no auth; we now have it). Open question §12.2 — should we additionally mirror to `localStorage` for the case of "session goes live mid-cellular-deadzone"? Recommendation: not in v1.

### 8.4 Comment field
- One free-form `<Textarea>` (Élysée-styled, ~600 char soft cap).
- Helper text: `Commentaire optionnel — visible uniquement par le staff (comité + admin).` (FR/EN/DE).
- **Not** shown to other jurors. Not shown to the candidate. Stored on `platform_jury_scores.comment`.

---

## 9. RLS recap — full policy set

| Table | Policy | Verb | Rule |
|-------|--------|------|------|
| `platform_jury_profiles` | `pjp_read` | SELECT | own OR jury/comité/admin |
| `platform_jury_profiles` | `pjp_self_update` | UPDATE | `user_id = auth.uid()` (both USING + WITH CHECK) |
| `platform_jury_profiles` | `pjp_insert` | INSERT | `user_id = auth.uid()` OR admin |
| `platform_jury_profiles` | `pjp_admin_delete` | DELETE | admin |
| `platform_jury_assignments` | `pja_read` | SELECT | own OR comité OR admin |
| `platform_jury_assignments` | `pja_admin_write` | ALL | admin only |
| `platform_jury_score_drafts` | `pjsd_self_read` | SELECT | `jury_user_id = auth.uid()` |
| `platform_jury_score_drafts` | `pjsd_self_write` | ALL | `jury_user_id = auth.uid()` AND `rsa_can_score(session_id)` |
| `platform_jury_scores` | `pjs_jury_self_read` | SELECT | own OR comité OR admin |
| `platform_jury_scores` | `pjs_no_direct_write` | INSERT | `false` (only the RPC writes) |
| `platform_jury_scores` | `pjs_no_direct_update` | UPDATE | `false` (only the RPC writes) |
| `platform_jury_scores` | `pjs_admin_delete` | DELETE | admin |
| `startups` | (unchanged) | UPDATE | trigger `startups_guard_update` accepts the sentinel set by `rsa_lock_session` / `rsa_publish_session` (same as M1 + M2 RPCs) |
| `editions` | (unchanged from M1 hardening) | — | the new column `finalists_per_session` is admin-write via existing `editions_admin` policy |
| `session_config` | (legacy, kept as-is) | UPDATE | admin (the legacy app already locks this) — confirm in §12.5 |
| Storage `dossiers` | (unchanged from M1 prep) | SELECT | `is_dossier_staff()` includes jury ⇒ deck + exec summary readable; see §6 caveat §12.8 |

### 9.1 What candidates do NOT see
- Individual juror scores: **never**.
- Aggregated session ranking before publish: never.
- Jury identities / comments: never (the comment is staff-only by RLS).

A candidate only sees `startups.status` transitioning to `note` (after lock) then to `finaliste` (after publish, top-N) or staying at `note`. The Module-1 `<CandidatureTracking>` already renders these labels via `STATUS_LABELS`.

### 9.2 What comité sees
- Read all `platform_jury_scores` rows.
- Read all `platform_jury_assignments` rows.
- Read `platform_jury_profiles`.
- Cannot write any of the above.
- (Module 4 will surface this in an admin/comité-readable LiveTab.)

---

## 10. UI structure (file tree)

```
src/pages/
  Jury.jsx                            # the Module-3 route (gated jury OR admin).
                                      # Hosts <JuryShell> which routes between
                                      # SessionList → SessionDetail (no
                                      # internal router; controlled state).

src/components/rsa/jury/
  JuryShell.jsx                       # eyebrow "Espace Jury" + edition pill,
                                      # left column = SessionList, right column = SessionDetail.
  SessionList.jsx                     # editorial list of the juror's assigned sessions
                                      # (with StatusPill + countdown), clickable.
  SessionDetail.jsx                   # the right pane / full-page-on-mobile.
                                      # Composes Header + PreSessionPack + StartupQueue +
                                      # ResultsView (when published).
  PreSessionPack.jsx                  # signed-URL list of deck + exec summary per startup
                                      # in pitch order + (if available) the consolidated PDF link.
  StartupQueue.jsx                    # numbered editorial list of startups in pitch order
                                      # with per-row progress chip; expands to ScoringPanel.
  ScoringPanel.jsx                    # the port of StartupScoreCard.jsx (Élysée-styled).
  CriterionRating.jsx                 # the port of src/components/rsa/CriterionRating.jsx
                                      # (Élysée-styled; gold focus ring, hairline segments).
  ResultsView.jsx                     # published-state view: per-session ranking +
                                      # the juror's submitted scores read-only.
  CoJurorsPopover.jsx                 # "Vous + 11 jurés · voir la liste" → modal/popover
                                      # listing display names + qualité.
  NoAccessNotice.jsx                  # courteous 403 for authenticated non-jury non-admin.
  JuryAssignmentsAdmin.jsx            # ADMIN-ONLY embedded panel (§2.4 stopgap) to
                                      # toggle platform_jury_assignments cells.
  i18n.js                             # jury dictionaries (see §11).
  constants.js                        # SESSION_STATUS_LABELS, SCORE_LABELS overrides if
                                      # any (kept minimal — domain copy stays in constants.js).
  useJury.js                          # TanStack Query keys + queries + mutations (§10.2).

src/lib/rsa/
  entities.js                         # + PlatformJuryScore, PlatformJuryScoreDraft,
                                      # PlatformJuryAssignment, PlatformJuryProfile entities.

supabase/migrations/
  20260528_rsa_module3_jury.sql       # platform_jury_profiles + platform_jury_assignments +
                                      # platform_jury_score_drafts + platform_jury_scores +
                                      # helper functions rsa_can_score / rsa_is_assigned /
                                      # rsa_weighted_score + RPCs rsa_submit_jury_score /
                                      # rsa_lock_session / rsa_publish_session +
                                      # editions.finalists_per_session column.
```

### 10.1 Design rules (Élysée — `docs/design/elysee-designbook.md`)
- `PageShell width="wide"` (the Jury page is list-heavy with a 2-column desktop layout — max ~1100 px).
- No shadows, hairline borders only (`CREAM2`).
- Lifecycle pills always use `StatusPill kind="jury"` from `@/components/design` (the §6.2 map already exists).
- Drawer = native column split on desktop ≥ lg, full-screen on mobile (no Radix Dialog needed — the left list collapses to a tab control on mobile).
- All copy via the i18n dictionaries (§11). `RULE_LABELS` is **imported** from `src/components/rsa/candidature/i18n.js` (SSOT).
- Numeric scores use `tabular-nums`.
- Touch targets ≥ 44px on the segmented 0-5 buttons (already so in `CriterionRating.jsx:49` — keep).

### 10.2 TanStack hooks (`src/components/rsa/jury/useJury.js`)

```js
export const KEYS = {
  mySessions:    ['rsa', 'jury', 'sessions'],
  sessionDetail: (sid) => ['rsa', 'jury', 'session', sid],
  startups:      (sid) => ['rsa', 'jury', 'session', sid, 'startups'],
  draft:         (startupId) => ['rsa', 'jury', 'draft', startupId],
  myScore:       (startupId) => ['rsa', 'jury', 'score', startupId],
  ranking:       (sid) => ['rsa', 'jury', 'ranking', sid],
};

// List of sessions I'm assigned to (joined to session_config for the status + countdown).
export function useMySessions() { /* PlatformJuryAssignment.mine() + sessions join */ }

// One session: status, co-jurors, pitch order, startups (with deck/exec paths via RLS).
export function useSessionDetail(sessionId) { /* … */ }

// Drafts (read own).
export function useJuryDraft(startupId) {
  return useQuery({ queryKey: KEYS.draft(startupId),
                    queryFn: () => PlatformJuryScoreDraft.forStartup(startupId, authUid),
                    enabled: !!startupId, staleTime: 0 });
}

// Save draft (debounced upsert).
export function useSaveJuryDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => PlatformJuryScoreDraft.upsert(vars),
    onMutate: optimistic patch on KEYS.draft(startupId),
    onSettled: (_data, _err, vars) => qc.invalidateQueries({ queryKey: KEYS.draft(vars.startupId) }),
  });
}

// Submit final (RPC).
export function useSubmitJuryScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ startupId, sessionId, scores, comment }) =>
      supabase.rpc('rsa_submit_jury_score', { p_startup_id: startupId, p_session_id: sessionId, p_scores: scores, p_comment: comment ?? null }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.myScore(vars.startupId) });
      qc.invalidateQueries({ queryKey: KEYS.draft(vars.startupId) });   // wiped server-side
      qc.invalidateQueries({ queryKey: KEYS.sessionDetail(vars.sessionId) }); // progress chip
    },
  });
}

// Admin — lock / publish (Module 4 will own these; here we expose the hooks for the
// stopgap JuryAssignmentsAdmin to chain after).
export function useLockSession()    { /* rpc rsa_lock_session */ }
export function usePublishSession() { /* rpc rsa_publish_session */ }

// Admin — assignments CRUD.
export function useAssignJuror()    { /* upsert pja */ }
export function useUnassignJuror()  { /* delete pja */ }
```

Realtime: `PlatformJuryScore.subscribe()` is **not** wired in the juror view by default (no need — only the juror writes their own row, optimistic update is enough). The admin LiveTab in Module 4 will subscribe.

### 10.3 Entities (`src/lib/rsa/entities.js`)
Add four entities following the established `createEntity + helpers` pattern:

```js
export const PlatformJuryAssignment = {
  ...createEntity('platform_jury_assignments'),
  async mine() { /* select * where jury_user_id = auth.uid() */ },
  async forSession(sessionId) { /* … */ },
};

export const PlatformJuryProfile = {
  ...createEntity('platform_jury_profiles'),
  async mine() { /* by user_id = auth.uid() */ },
  async forIds(userIds) { /* select * where user_id in (…) */ },
};

export const PlatformJuryScoreDraft = {
  ...createEntity('platform_jury_score_drafts'),
  async forStartup(startupId, juryUserId) { /* maybeSingle */ },
  async upsert({ startupId, sessionId, juryUserId, patch }) { /* PostgREST upsert */ },
};

export const PlatformJuryScore = {
  ...createEntity('platform_jury_scores'),
  async forStartup(startupId, juryUserId) { /* maybeSingle */ },
  async forSession(sessionId) { /* select * (staff only by RLS) */ },
  // Direct write is denied by RLS; client always goes through rsa_submit_jury_score.
  async submit({ startupId, sessionId, scores, comment }) {
    const { data, error } = await supabase.rpc('rsa_submit_jury_score', {
      p_startup_id: startupId, p_session_id: sessionId, p_scores: scores, p_comment: comment ?? null,
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  },
};
```

---

## 11. i18n FR / EN / DE — jury dictionaries

`src/components/rsa/jury/i18n.js`, same shape as `selection/i18n.js`:

```js
import { useLang } from '@/lib/platform/i18n';
// Single source of truth — import, do NOT duplicate.
export { RULE_LABELS } from '@/components/rsa/candidature/i18n.js';

// ── Session lifecycle pills (jury kind from StatusPill §6.2) ─────────────────
export const JURY_STATUS_LABELS = {
  draft:     { fr: 'Pas encore ouverte', en: 'Not yet open',   de: 'Noch nicht offen' },
  live:      { fr: 'En direct',          en: 'Live',           de: 'Live' },
  locked:    { fr: 'Verrouillée',        en: 'Locked',         de: 'Gesperrt' },
  published: { fr: 'Publiée',            en: 'Published',      de: 'Veröffentlicht' },
};

// ── Per-startup queue chip ─────────────────────────────────────────────────
export const SCORE_PROGRESS = {
  toRate:     { fr: 'À noter',            en: 'To rate',           de: 'Zu bewerten' },
  partial:    (n) => ({ fr: `${n}/6 critères notés`,
                        en: `${n}/6 criteria rated`,
                        de: `${n}/6 Kriterien bewertet` }),
  submitted:  { fr: 'Envoyé · cliquez pour modifier',
                en: 'Submitted · click to edit',
                de: 'Eingereicht · zum Bearbeiten klicken' },
  locked:     { fr: 'Verrouillé',         en: 'Locked',            de: 'Gesperrt' },
};

// ── Copy UI ─────────────────────────────────────────────────────────────────
export const UI = {
  eyebrow:        { fr: 'Espace Jury',           en: 'Jury desk',          de: 'Jury-Bereich' },
  pageTitle:      { fr: 'Mes sessions',          en: 'My sessions',        de: 'Meine Sessions' },
  emptySessions:  { fr: "Aucune session assignée pour cette édition.",
                    en: 'No session assigned for this edition.',
                    de: 'Keine Session für diese Ausgabe zugewiesen.' },
  noAccess:       { fr: "Cette section est réservée au jury et à l'administration.",
                    en: 'This area is restricted to the jury and administrators.',
                    de: 'Dieser Bereich ist der Jury und der Administration vorbehalten.' },

  // Session detail
  preReadTitle:   { fr: 'Pré-lecture',           en: 'Pre-read',           de: 'Vorab-Lektüre' },
  preReadPack:    { fr: 'Pack PDF · télécharger',en: 'Pack PDF · download',de: 'Paket PDF · herunterladen' },
  preReadPending: { fr: 'Pack PDF en préparation',
                    en: 'Pack PDF being prepared',
                    de: 'Paket-PDF in Vorbereitung' },
  scoringTitle:   { fr: 'Notation',              en: 'Scoring',            de: 'Bewertung' },
  bannerDraft:    { fr: 'Le scoring ouvrira au début de la session. Vous pouvez préparer vos pré-lectures.',
                    en: 'Scoring will open when the session starts. You can prepare your pre-reads now.',
                    de: 'Die Bewertung öffnet zum Start der Session. Sie können sich vorab vorbereiten.' },
  bannerLocked:   { fr: 'Scoring fermé — vos notes ont été enregistrées.',
                    en: 'Scoring closed — your scores have been saved.',
                    de: 'Bewertung geschlossen — Ihre Bewertungen wurden gespeichert.' },
  bannerPublished:{ fr: 'Résultats publiés.',    en: 'Results published.', de: 'Ergebnisse veröffentlicht.' },
  coJurors:       (n) => ({ fr: `Vous + ${n} jurés sur cette session`,
                            en: `You + ${n} jurors on this session`,
                            de: `Sie + ${n} Juroren in dieser Session` }),

  // Scoring panel
  anchors:        { fr: 'Repères de notation',   en: 'Score anchors',      de: 'Bewertungsanker' },
  commentLabel:   { fr: 'Commentaire',           en: 'Comment',            de: 'Kommentar' },
  commentHelp:    { fr: 'Optionnel — visible uniquement par le staff.',
                    en: 'Optional — visible to staff only.',
                    de: 'Optional — nur für das Staff sichtbar.' },
  remaining:      (n) => ({ fr: `${n} critères restants`,
                            en: `${n} criteria remaining`,
                            de: `${n} Kriterien verbleibend` }),
  weightedTotal:  { fr: 'Total pondéré :',       en: 'Weighted total:',    de: 'Gewichtete Gesamtpunktzahl:' },
  submit:         { fr: 'Envoyer les notes',     en: 'Submit scores',      de: 'Bewertungen einreichen' },
  update:         { fr: 'Modifier l\'envoi',     en: 'Update submission',  de: 'Einreichung aktualisieren' },
  autosaved:      { fr: 'Enregistrement auto — reprenez sur n\'importe quel appareil.',
                    en: 'Auto-saved — resume on any device.',
                    de: 'Auto-gespeichert — auf jedem Gerät fortsetzen.' },
  cannotSubmit:   { fr: 'Veuillez noter les 6 critères avant d\'envoyer.',
                    en: 'Please rate all 6 criteria before submitting.',
                    de: 'Bitte bewerten Sie alle 6 Kriterien vor dem Einreichen.' },

  // Results
  rankingTitle:   { fr: 'Classement de la session',
                    en: 'Session ranking',
                    de: 'Session-Ranking' },
  finalistBadge:  { fr: 'Finaliste',             en: 'Finalist',           de: 'Finalist' },
  myScore:        { fr: 'Mes notes',             en: 'My scores',          de: 'Meine Bewertungen' },
};
```

Resolution via `useLang().t(entry)` — already shipped (Module 1's `useLang` is reused).

Domain copy (criteria labels/desc/anchors, session names + dates) resolves through `getCriterion(c, lang)` and `getSessionLabel(s, lang)` / `getSessionDate(s, lang)` from `src/lib/rsa/constants.js`. **Do not duplicate** in `jury/i18n.js`.

---

## 12. Open questions for the human

1. **Finalists per session — `editions.finalists_per_session` (default 1).** 2026 picked one finalist per qualifying session (5 finalists total for the Grande Finale). Confirm we add a column on `editions` (admin-editable; default 1) rather than hard-coding `N=1`. Top-N semantics: ties at the cutoff (e.g. positions 1, 2, 2, 4 with N=1 → only one wins by `startup_name asc` tie-break). Acceptable or should ties be hand-resolved by admin?
2. **localStorage mirror for drafts.** The 2026 grid mirrored drafts to `localStorage` because there was no auth. The new platform auth-gates everything and stores drafts server-side. Should we *additionally* mirror to `localStorage` for "session live but cellular deadzone for 90 s"? Recommendation: **no** in v1 — the server-side draft is the source of truth, and tabs preserve in-memory state. Confirm.
3. **Reassignment after submit.** If the comité reassigns a dossier to a different `session_id` after some jurors already submitted (extreme edge case), what happens? Current spec: `platform_jury_scores.session_id` is denormalised at submit-time, so the score stays tied to the **original** session. The new session has zero scores from those jurors (they're not assigned to the new session). Spec choice: **freeze the snapshot, do not migrate.** Confirm.
4. **JuryAssignmentsAdmin stopgap inside Module 3.** We embed a small admin panel in the Jury page to bootstrap assignments. The canonical admin UX is Module 4. Acceptable as a stopgap, or do we wait for Module 4 to also ship admin-side assignment UI?
5. **`session_config` legacy table.** The 2026 lifecycle (`draft|live|locked|published`) lives in `session_config` (legacy). We propose **reusing it** for the new app rather than introducing a parallel `platform_session_state` — the columns already exist and the admin LiveTab UX is built on it. Confirm we keep `session_config` as the lifecycle source of truth (and we'll touch it from the new RPCs).
6. **Comité view of the Jury page.** A comité-only user (no jury role) currently lands on `NoAccessNotice`. Should comité members be able to view a **read-only** Jury page (e.g. for transparency during scoring)? Module 4's admin LiveTab will already give them the per-session matrix; we recommend **no** to keep the Jury page strictly juror-first. Confirm.
7. **Importing legacy 2026 `jury_scores` for reference.** The 2026 edition is `closed` and string-keyed (name-keyed) jury scores cannot cleanly map to `auth.uid()`-keyed `platform_jury_scores`. Should we expose a read-only "Archive 2026" view in the platform (sourced from legacy tables, identified by string keys), or leave the 2026 archive entirely to the legacy app/pages (`RsaScore.jsx`, `RsaRecap.jsx`)? Recommendation: **leave to legacy pages** (no platform import), revisit if needed.
8. **Storage RLS scope for jury reads.** `dossiers_read` currently grants any `'jury'` role read access to **any** dossier in the bucket (`is_dossier_staff()` is not session-scoped). A juror on cluster Foodtech can read decks of Healthtech startups. Tighter: a `is_dossier_jury_for_session()` helper that joins `platform_jury_assignments`. Recommendation: **tighten in a small follow-up migration** (one helper + one policy refresh), but acceptable for v1 since jurors are vetted Rotary members under NDA. Flag for §13 build order.
9. **Pre-session pack — when does admin trigger the build?** The Edge function takes 30-60 s to assemble. Option A: admin clicks "Build pack" in the Module-4 admin panel before the session opens. Option B: auto-trigger when session flips to `draft`-ready (e.g. all decks uploaded). Recommendation: A (explicit admin action), shipped in Module 4.
10. **Co-jurors visibility — display names.** We show `profiles.full_name` + `platform_jury_profiles.qualite`. Should the popover also expose the email (for jurors to reach each other) or stay anonymous? Recommendation: **show qualité + organisation, no email** (privacy by default).
11. **Score editing window after live ends.** Today: a juror can edit/re-submit until the admin clicks Lock. If the admin forgets and the session is over, jurors can keep editing. Should we add a "scoring closes at session-end + 30 min" auto-lock? Recommendation: **no** (admin discipline + an admin-side reminder in Module 4 is enough).
12. **Bypass-sentinel proliferation.** Each Module 3 admin RPC that mutates `startups.status` (`rsa_lock_session`, `rsa_publish_session`) needs the sentinel dance. We propose a small helper `rsa_with_bypass(stmt text)` or factor the pattern via a tiny helper function. Acceptable to inline-repeat for now (3 RPCs)?

---

## 13. Build order (within Module 3)

1. **Migration** — `20260528_rsa_module3_jury.sql` :
   - Tables: `platform_jury_profiles`, `platform_jury_assignments`, `platform_jury_score_drafts`, `platform_jury_scores`.
   - Helpers: `rsa_can_score`, `rsa_is_assigned`, `rsa_weighted_score`.
   - RPCs: `rsa_submit_jury_score`, `rsa_lock_session`, `rsa_publish_session`.
   - Column: `editions.finalists_per_session int not null default 1`.
   - Full RLS sweep (§5.3 / §9).
2. **Data layer** — new entities in `src/lib/rsa/entities.js` (§10.3).
3. **`useJury.js`** hooks (§10.2).
4. **`Jury.jsx`** route + auth/role gate + TopNav link (role-aware).
5. **`JuryShell` + `SessionList`** — minimum viable: list assigned sessions with `StatusPill` + countdown.
6. **`SessionDetail` + `PreSessionPack`** — read-only pre-read pack with signed URLs (no scoring yet).
7. **`StartupQueue` + `ScoringPanel` + `CriterionRating`** — port from `StartupScoreCard.jsx` / `CriterionRating.jsx`, Élysée restyle, wire to `useSaveJuryDraft` + `useSubmitJuryScore`.
8. **`ResultsView`** (published state) — show ranking + the juror's submitted scores.
9. **`JuryAssignmentsAdmin`** stopgap (admin-only embedded panel — §2.4).
10. **`CoJurorsPopover`** + visual polish per Élysée designbook + framer-motion fades.
11. **(Follow-up, parallel to Module 4)** Retarget the `consolidate-jury-pack` Edge function to the new schema; surface the link in `<PreSessionPack>`.
12. **(Follow-up)** Tighten Storage RLS to session-scoped jury reads (§12.8).
13. **(Module 4)** Real-time admin LiveTab (12 jurors × 8 startups matrix, subscribed). Belongs to Module 4 — not built here.

---

## Appendix A — Migration sketch (for the implementing agent)

> Not built here — kept as a contract. The full set of helpers + RPCs lives in §5 above; this appendix gathers them in build order.

```sql
-- 20260528_rsa_module3_jury.sql

-- 1. platform_jury_profiles + RLS — see §2.2.
-- 2. platform_jury_assignments + RLS — see §2.3.
-- 3. platform_jury_score_drafts + RLS — see §5.2 / §5.3.
-- 4. platform_jury_scores       + RLS — see §5.1 / §5.3.
-- 5. helpers rsa_can_score, rsa_is_assigned, rsa_weighted_score — see §5.4 / §5.7.
-- 6. RPC rsa_submit_jury_score — see §5.5.
-- 7. RPC rsa_lock_session      — see §5.6.
-- 8. RPC rsa_publish_session   — see §5.7.

alter table public.editions
  add column if not exists finalists_per_session int not null default 1;
```

---

## Appendix B — UI mock (textual)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ESPACE JURY  ·  Édition « dev » (active)                            FR EN DE│
├──────────────────────────────────────────────────────────────────────────────┤
│  MES SESSIONS                  │  TECH, AI, FINTECH & MOBILITÉ              │
│  ─────────────────────         │  Mercredi 19 novembre · 18h                │
│  · Foodtech     ✓ noté          │                                            │
│  · Edtech                       │   ● EN DIRECT      J-0                     │
│  · Tech AI    ● LIVE            │   Vous + 11 jurés sur cette session [voir] │
│  · Healthtech                   │  ────────────────────────────────────────  │
│  · Greentech                    │  PRÉ-LECTURE                               │
│  · Finale         ?             │   01  Helia BioPlastics    [deck] [exec]   │
│                                 │   02  Boréalis EdTech      [deck] [exec]   │
│  [Mon profil]                   │   …                                        │
│                                 │   ▾ [Pack PDF · télécharger]               │
│                                 │  ────────────────────────────────────────  │
│                                 │  NOTATION                                  │
│                                 │   01  Helia BioPlastics    [● à noter]  ▾  │
│                                 │   02  Boréalis EdTech      [✓ envoyé]   ▾  │
│                                 │   03  Atlas Robotics       [3/6]        ▾  │
│                                 │   …                                        │
└─────────────────────────────────┴────────────────────────────────────────────┘

(panel expanded for "03 Atlas Robotics" :)

┌─ 03  Atlas Robotics ───────────────────────────────────────────[3 / 6]─ ▴ ─┐
│  Documents : [pitch deck PDF]   [executive summary PDF]                    │
│                                                                            │
│  ┌─ Proposition de valeur · 20% ─────────────────────────────── ▾ ──────┐  │
│  │  Clarté du problème adressé, intensité du besoin client, …            │  │
│  │  [0] [1] [2] [3] [4] [5] ← sélectionné : 4                            │  │
│  └────────────────────────────────────────────────────────────────────── ┘  │
│  ┌─ Marché & Scalabilité · 20% ─────────────────────────────── ▾ ───────┐  │
│  │  …                                                                    │  │
│  │  [0] [1] [2] [3] [4] [5]                                              │  │
│  └────────────────────────────────────────────────────────────────────── ┘  │
│   (4 autres critères : Business Model · Équipe · Pitch · Impact sociétal)   │
│                                                                            │
│  Commentaire (optionnel · staff uniquement)                                │
│  [textarea]                                                                │
│                                                                            │
│  3 critères restants                              [Envoyer les notes] disabled │
│  Enregistrement auto — reprenez sur n'importe quel appareil.                │
└────────────────────────────────────────────────────────────────────────────┘
```
