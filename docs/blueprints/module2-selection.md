# Module 2 — Sélection (« Espace Sélection »)

> Build-ready spec for the **comité** review workflow that turns submitted dossiers
> into a final selection of qualified candidates (cluster + status) — second module of
> the RSA platform rebuild. See memory `project_rsa_platform_rebuild`.

- **Stack** : React 18 + Vite, Tailwind + shadcn/ui, Supabase (DB + Realtime + private Storage), TanStack React Query. Imports via `@/`.
- **Data spine** : `selection_reviews` (the decision rows) hanging off `startups` (the dossier) — see `supabase/migrations/20260527_rsa_platform_foundation.sql` §5.
- **Auth/roles** : `src/lib/platform/auth.jsx` (`usePlatformAuth`). Roles `'comite'` and `'admin'` (jury is **read-only** on dossiers and **not used here**). Source of truth = locked `app_user_roles` (cf. roles-hardening migration).
- **Read-only inputs reused from Module 1** : the `startups` row (Art. 4 fields + Art. 2 inputs), the stored `eligibility` snapshot, the dossier documents via `signedDossierUrl(s)` (private `dossiers` bucket).
- **Design** : « Élysée » designbook ([`docs/design/elysee-designbook.md`](../design/elysee-designbook.md)) — NAVY/GOLD/CREAM, Playfair + Inter, hairline borders, **never a dashboard look**. Reuse `PageShell` / `TopNav` / `Field` / `Select` / `Textarea` / `RadioYesNo` / `TagSelect` / `StatusPill` / `Dropzone` from `@/components/design`. The screen is denser than the funnel but stays *editorial*: a queue rendered as a typographic list, no zebra stripes, gold rule under section headers, framer-motion fade-up.
- **Trilingual** : FR / EN / DE chrome (memory `project_rsa_pitch_language` — pitch content stays English; the **comité interface** is fully FR/EN/DE, since reviewers are bilingual). Co-locate dictionaries in `src/components/rsa/selection/i18n.js` mirroring the candidature pattern.

---

## 1. Scope & non-goals

**In scope (Module 2):**
- A single new route `Selection` (file `src/pages/Selection.jsx`, auto-registered via `pages.config.js`) gated to `has_platform_role('comite' OR 'admin')`.
- **Queue view** of submitted dossiers (default = current open edition, cross-edition toggle).
- **Dossier detail** drawer/panel: read-only candidate data + eligibility snapshot + signed document links + full review timeline.
- **Comité decision panel** : record a `selection_reviews` row (decision / cluster session / rationale) and atomically reflect it on `startups.status` + `startups.session_id`. Self-claim model (no admin pre-assignment).
- **Admin validation / override** : a second step (final lock) on every dossier the comité touched; mandatory control mechanism for `rejete` and `liste_attente`.
- Status lifecycle for the dossier moves between `soumis` → `en_selection` → `eligible | rejete | liste_attente` → `affecte` (after a comité accept with a cluster assigned).
- TanStack hooks + new `SelectionReview` entity.

**Out of scope (later modules / dependencies):**
- Jury scoring (`jury_scores`) — Module 3.
- Results / finale — Module 4.
- Candidate-facing notification email when a decision is finalised (TBC — open question §12.1).
- Admin edition CRUD (handled by a future admin-only `Admin` page; here `editions` / `sessions` are reference reads).
- Hard-locking `startups.status` to staff-only (residual H2 — see §5 & §12.6); recommended as a SECURITY DEFINER RPC follow-up.

---

## 2. Process model (the one-shot decision, with admin lock)

> **Product decision (recorded in memory `project_rsa_platform_rebuild`, 2026-05-27):**
> a dossier is decided by **a SINGLE comité reviewer** (verdict + cluster). An **admin**
> then **VALIDATES** or **REWRITES** that decision in a second step — that is the
> final validation, the platform's control mechanism (especially for `rejete` /
> `liste_attente`). No multi-reviewer scoring at this stage; that's the jury's job
> later.

```
   [ candidate submits ]               [ comité reviewer (self-claim) ]            [ admin ]
        status='soumis'                          inserts/edits a                     either:
                                                 selection_reviews row              VALIDATE  -> sets
        ──────────►   (optional)  ──────────►    (decision + cluster                 is_final=true on
                       status='en_selection'      + rationale)                       the existing row
                       (when first opened)        startups.status/                   (mirror startups.status)
                                                  session_id updated atomically       OR
                                                                                    OVERRIDE -> inserts
                                                                                    a new selection_reviews
                                                                                    with is_final=true,
                                                                                    overrides the previous,
                                                                                    rewrites startups.status/
                                                                                    session_id
```

**Effective decision** of a dossier =
1. the `selection_reviews` row with `is_final = true` (admin), if any ;
2. otherwise the **latest** comité review (the one with the most recent `reviewed_at`), pending validation.

`startups.status` is the **denormalised reflection** of the effective decision. The history is auditable in `selection_reviews` (timeline).

**Self-claim model.**
- Any comité member can open any dossier in `soumis` (or in `en_selection`) and submit a decision. No admin pre-assignment.
- A comité reviewer **can edit their own most recent decision** while it has **not yet been finalised** (`is_final = false`). Once an admin locks it (`is_final = true`), only admin can change it (override).
- **Optimistic locking** (recommended, not a hard MVP requirement): when two comité members open the same dossier, the second one sees a discreet "Marie a déjà rédigé une décision il y a 2 min — voir / remplacer". Implementation: a single comité review per dossier is enforced by **letting both inserts succeed and treating the latest as the active one** (the timeline keeps both). A hard lock (e.g. a `claimed_by` column with a 30-min TTL) is an open question §12.7.

---

## 3. Page route, auth gate & navigation

### 3.1 Route
- **File** : `src/pages/Selection.jsx` (one file = one route, auto-registered via `pages.config.js` — do not hand-edit that file).
- **Page key** : `Selection`. The page is already pre-listed in `Layout.jsx`'s `STANDALONE_PAGES` (it renders without the lunch-app chrome), no Layout change required.
- **Path** : reachable through `createPageUrl('Selection')`. A user-friendly alias `/selection` may be added at the router level if path-based routing is wired up (mirrors what Module 1 envisaged for `/espace-startup`).

### 3.2 Auth & role gate
- Wrap behind `PlatformAuthProvider` (already mounted at the app shell level per Module 1 deployment).
- Gate inside `Selection.jsx`:

```jsx
const { isAuthenticated, isComite, isAdmin, loading } = usePlatformAuth();
if (loading) return <ShellLoading />;
if (!isAuthenticated) return <MagicLinkGate redirectPath="/selection" />;
if (!(isComite || isAdmin)) return <NoAccessNotice />; // courteous 403
```

The role check is **UX only**; RLS on `selection_reviews` / `startups` is the real boundary (§8).

### 3.3 TopNav link
- Add a `Selection` link in `src/components/design/shell/TopNav.jsx`'s nav menu, **visible only when** `isComite || isAdmin`. (The TopNav already supports role-aware items via `NavMenu`; the change is one line + an entry in the trilingual nav dictionary.)
- Label: `{ fr: 'Sélection', en: 'Selection', de: 'Auswahl' }`.

---

## 4. Queue view (« File de sélection »)

The queue is the landing screen. Editorial list, not a data table.

### 4.1 Default scope
- **Edition filter** : default to the current open `editions` row (resolved via `Edition.active()` — same helper Module 1 uses). A pill at the top lets staff toggle "**Toutes les éditions**" / "Édition active" / pick a specific edition.
- **Status filter** : default to *"À examiner"* = `status ∈ { 'soumis', 'en_selection' }`. Toggles: *Décidés* (`eligible | rejete | liste_attente | affecte`), *À valider par admin* (decided by comité but not yet `is_final`), *Tous*.

### 4.2 Filters (FiltersBar component)
A single horizontal bar above the list, all clear-affordances visible:

| Filter | Source | Notes |
|--------|--------|-------|
| Édition | `editions` rows visible to staff | default = active |
| Statut dossier | enum `startups.status` | multi-select chips |
| Verdict d'éligibilité | `startups.eligibility.verdict` ∈ `eligible / flagged / excluded` | uses `StatusPill kind="eligibility"` |
| Cluster (session) | `sessions` of the selected edition | applied as `startups.session_id` filter |
| Reviewer | distinct `reviewer_id` / `reviewer_name` from `selection_reviews` for visible dossiers | "Décidé par moi", "Décidé par autre", "Pas encore décidé" |
| Final validé | derived `effective_review.is_final` | "Final admin" / "En attente admin" / "Comité seul" |
| Recherche libre | `startups.name`, `contact_person`, `email` | client-side `ilike` (server-side `or(...)`) |

Filters persist to URL params (`?status=soumis,en_selection&edition=dev`) so a reviewer can share a deep link to her queue.

### 4.3 Columns (QueueList)
The list is rendered as **stacked editorial rows** (responsive), not a tabular grid. Each row carries:

| Slot | Content | Notes |
|------|---------|-------|
| 1 | **Startup name** (Playfair) + small meta line "Pays · Date de création · Secteurs (max 2 chips + +N)" | name links/opens the dossier drawer |
| 2 | Contact line — `contact_person` · `email` (truncated) | INK secondary text |
| 3 | `StatusPill kind="eligibility"` for `eligibility.verdict` | computed at submission, read from snapshot |
| 4 | `StatusPill kind="dossier"` for the dossier's **effective** status (`status`, mapped to the StatusPill `dossier` lifecycle — see §6) | + tiny "Final" gold dot when `is_final` |
| 5 | Last review meta — `Marie B. · 27 mai · refusé` (FR) or "—" | hidden on mobile |
| 6 | Right action — chevron / "Ouvrir" link | opens DossierDrawer (§5) |

**Status-pill mapping** between the Module 2 status vocabulary (FR business labels stored in `startups.status`) and the existing `StatusPill kind="dossier"` keys:

| `startups.status` | `StatusPill` dossier key | Trilingual label (selection-i18n) |
|-------------------|-------------------------|-----------------------------------|
| `soumis`           | `submitted`               | Soumis / Submitted / Eingereicht |
| `en_selection`     | `under_review`            | En sélection / Under review / In Auswahl |
| `eligible`         | `shortlisted`             | Éligible / Eligible / Förderfähig |
| `liste_attente`    | `under_review` (warm)     | Liste d'attente / Waitlist / Warteliste |
| `affecte`          | `shortlisted` (+ session chip) | Affecté à une session / Session-assigned / Session zugewiesen |
| `rejete`           | `rejected`                | Rejeté / Rejected / Abgelehnt |
| `finaliste`        | `finalist`                | Finaliste / Finalist / Finalist |
| `laureat`          | `winner`                  | Lauréat / Winner / Preisträger |

> The native `StatusPill dossier` kind doesn't include `waitlist` today; we add a
> trilingual selection-side label and **reuse the `under_review` tone** for it
> (warm pastel) rather than extending `StatusPill`. Open question §12.2 — adding
> `waitlist` to `STATUS_MAP.dossier` is a one-line addition if the design wants its
> own tone.

### 4.4 Sort & pagination
- **Default sort** : `startups.submitted_at DESC` for "à examiner", then `selection_reviews.reviewed_at DESC` for already-decided.
- **Pagination** : server-side, page size 25 (TanStack `useInfiniteQuery` with a cursor on `submitted_at` — `Startup` entity gets a new `pageForStaff` helper, §7.1).
- **Realtime** (nice-to-have) : `Startup.subscribe()` + `SelectionReview.subscribe()` to invalidate the queue when another comité member acts. Optional in v1, polling on focus is enough.

### 4.5 Empty/loading states
- Loading: 8 skeleton rows (hairline placeholders).
- Empty: editorial card "Aucun dossier à examiner pour le moment." with the eyebrow "Espace Sélection" and the active-edition name in INK.

---

## 5. Dossier detail (DossierDrawer / DossierDetail)

Opens from the queue (slide-in drawer on desktop ≥ lg, full page on mobile). Three sections, all read-only except the **DecisionPanel** (§6) and **AdminOverridePanel** (§7).

### 5.1 Header
- Startup name in Playfair, current `StatusPill` (effective), eligibility verdict pill, edition badge.
- Quick meta line: `country` · `creation_date` · `registration_number` · founders majority Y/N · partner institution · rotary club.
- "Final décidé" gold caption when `is_final = true`.

### 5.2 Dossier — Art. 4 + Art. 2 fields
A two-column hairline layout grouping the same fields the candidate submitted (Module 1 §2.1). Every field is **read-only render** (no input):

- **Contact** : `contact_person`, `email`, `phone`, `website` (clickable, `rel="noopener"`).
- **Société** : `country`, `creation_date`, `registration_number`, `founders_majority` (Oui/Non), `partner_institution`, `rotary_club`.
- **Projet (Art. 4)** : `value_proposition`, `business_model`, `roadmap`, `team`, `traction`, `esg_impact`, `sectors` (chips).
- **Finances** : `last_revenue`, `amount_raised` (formatted with `Intl.NumberFormat`, EUR).
- **Documents** : two signed links (see §5.4).
- **Video pitch URL** : if any, opens in a new tab.

> **Pitch content stays English** in the candidate's text (project convention). The
> reviewer's *chrome* (labels, helper text) is in FR/EN/DE.

### 5.3 Eligibility snapshot (detail)
A dedicated card listing the `eligibility` JSONB snapshot stored at submission:

- Verdict pill at the top (`eligible` / `flagged` / `excluded`).
- The **failed** array enumerated as a hairline list. Each row:
  - Rule label (trilingual — reuse `RULE_LABELS` defined in `src/components/rsa/candidature/i18n.js`; **import** it from there to keep one source of truth, do not duplicate).
  - `behavior` chip (`exclu` warm-red / `flag` gold).
  - `detail` string (already human-ish, FR — open localisation later).
- A muted footer "Calculée le {evaluated_at, formatted}" + a small note: *« Les critères sont indicatifs (Règlement Art. 2). Le comité reste souverain. »* (trilingual).

The snapshot is **read-only**; we never re-evaluate eligibility at this stage (the snapshot is what the candidate saw at submit time, by design).

### 5.4 Documents (signed downloads)
- Two links: **Pitch deck** (`pitch_deck_path`) and **Executive summary** (`exec_summary_path`).
- Pre-fetch the signed URLs lazily on drawer open with `signedDossierUrls([deck, exec], 300)` (5-minute TTL — wide enough to download without rotating, short enough to expire from the page DOM). Use `signedDossierUrl` / `signedDossierUrls` from `src/lib/rsa/storage.js`. **Staff** read is allowed by `dossiers_read` policy via `is_dossier_staff()` (`comite | jury | admin`).
- Display filename guess from the path tail; the URL itself never appears in the DOM longer than its TTL.
- If a path is `NULL` (e.g. exec summary missing on a soumis-but-incomplete dossier — shouldn't happen given §docs_required flag but possible), render a hairline "Document non fourni" notice rather than a broken link.

### 5.5 Review history timeline (ReviewHistoryTimeline)
A vertical, gold-rule timeline of every `selection_reviews` row for this dossier, **most recent at the top**:

| Slot | Content |
|------|---------|
| Date | `reviewed_at` formatted FR/EN/DE (Jeudi 28 mai · 14h32) |
| Reviewer | `reviewer_name || reviewer_id` (resolved to email/name when possible) |
| Role badge | "Comité" / "Admin" — derived from `is_final` (only admin sets it) or from a cached app_user_roles lookup |
| Decision | `StatusPill` matching the decision (`accepte → shortlisted`, `liste_attente → under_review`, `rejete → rejected`, `a_examiner → submitted`) |
| Assigned session | session label (trilingual) if `assigned_session_id` ≠ null |
| Rationale | quoted in Playfair italic small (editorial flourish for the most consequential field) |
| Lock badge | "Validé" gold pill when `is_final = true` |
| Override link | "→ Remplace #abcd" when `overrides_review_id` ≠ null |

The timeline is the authoritative audit trail. **No edit affordance** on past rows — comité only edits their **latest non-final** row via the DecisionPanel.

---

## 6. Decision panel (« Décision comité »)

The single form a comité member fills, embedded in the DossierDrawer below the dossier detail.

### 6.1 Fields

| Field | Input | Required | Notes |
|-------|-------|----------|-------|
| **Décision** | `RadioYesNo`-like 4-option radio (custom; reuse `RadioYesNo` styling) | **R** | Options: `eligible` / `liste_attente` / `rejete` / `a_examiner`. Default = `a_examiner` (no implicit verdict). |
| **Cluster (session)** | `Select` from §6.2 | R when decision = `eligible` | Sessions belonging to the dossier's `edition_id` with `kind = 'qualifying'`. Pre-fill from sectors hint (§6.3). |
| **Motif / rationale** | `Textarea` (multiline, ~600 char soft cap) | **R when decision ∈ { `rejete`, `liste_attente` }** | Otherwise optional but encouraged. Trilingual placeholder. |
| Reviewer name (display) | derived from `profiles.full_name` or `authUser.email` | auto | Persisted into `selection_reviews.reviewer_name` for stable audit even if the profile row is later edited. |

> **Decision vocabulary alignment.** The foundation migration's
> `selection_reviews.decision` allows free text but the seed comment lists
> `a_examiner | accepte | liste_attente | rejete`. We **rename `accepte` → `eligible`**
> in the UI vocabulary to align with the dossier-status word (and Module 1's
> verdict). On write, persist `decision = 'eligible'` (no CHECK constraint exists);
> the values list is documented in `src/components/rsa/selection/constants.js` and
> shared with the timeline. Open question §12.3 — add a CHECK constraint?

### 6.2 Cluster Select source
- Fetch sessions for the dossier's edition: `RsaSession.filter({ edition_id, kind: 'qualifying' })` → sorted by `position`.
- Render label = `name` (e.g. "Foodtech & économie circulaire") + small date `session_date` (formatted trilingually).
- An empty "—" option ("Aucun cluster — décision sans affectation") only available when decision ≠ `eligible`. For `eligible` the cluster is mandatory.
- The **finale** session (`kind='finale'`) is **excluded** here; it's used by Module 3/4.

### 6.3 Cluster pre-fill hint
The candidate already declared `startups.sectors` (text[]). We map declared sectors → cluster id with a small heuristic (single source of truth in `src/components/rsa/selection/constants.js`):

```js
// One sector keyword → one session-id suffix.
// We match on substring (lowercased) of the sector against keywords.
const SECTOR_TO_CLUSTER_KEYWORDS = {
  s1_foodtech:  ['foodtech', 'food', 'agritech', 'circular', 'circulaire'],
  s2_social:    ['edtech', 'social', 'impact social', 'éducation', 'education'],
  s3_tech:      ['ai', 'fintech', 'mobilité', 'mobility', 'saas', 'tech'],
  s4_health:    ['health', 'biotech', 'medtech', 'healthtech'],
  s5_greentech: ['greentech', 'environnement', 'environment', 'cleantech', 'energy'],
};
// then prepend the edition prefix to match this edition's session ids
//   (e.g. 'dev_' + 's1_foodtech' for edition 'dev', '' + 's1_foodtech' for edition '2026').
```

`suggestClusterForSectors(sectors, sessions)` returns the first matching `sessions.id` or `null`. **Pre-fill the Select with this id**, but show it as a soft suggestion (gold caption "Suggéré d'après les secteurs déclarés") that the reviewer can override at will.

### 6.4 Submit behaviour
On Submit (mutation `useUpsertReview`, §7.3):

1. **Insert** a new `selection_reviews` row with:
   - `startup_id` = current dossier;
   - `reviewer_id` = `auth.uid()`;
   - `reviewer_name` = profile full_name or email (stable label, see §6.1);
   - `decision` = chosen value;
   - `assigned_session_id` = chosen cluster or `null`;
   - `rationale` = textarea content (trimmed; empty → `null`);
   - `reviewed_at` = `now()` (DB default).
   - `is_final` = `false` (admin will flip later — §7).
   - `overrides_review_id` = `null` (comité never overrides; only admin does, §7.2).
2. **Update** the dossier row atomically with the new effective status & cluster:
   - `status` transitions per §6.5;
   - `session_id` = `assigned_session_id` when decision = `eligible`, else `null`.
   - This is wrapped in a single SECURITY DEFINER RPC `apply_selection_review(p_review_id uuid)` to (a) avoid two round-trips and (b) sidestep the H2 residual that lets the applicant currently self-update `status` (cf. §5 hardening review and §12.6). The RPC reads the row by id, checks `has_platform_role('comite' or 'admin')`, then performs the update **and** sets `is_final = false` defensively. Recommended; see migration sketch §11.
3. Invalidate queries: queue list + `useReviews(startupId)` + `useDossierDetail(startupId)`.

### 6.5 Status transitions (comité side)
Caused exclusively by the comité's review insertion:

| Comité decision | New `startups.status` | New `startups.session_id` |
|-----------------|-----------------------|---------------------------|
| `a_examiner` | `en_selection` | unchanged |
| `eligible` (cluster chosen) | `affecte` | `assigned_session_id` |
| `eligible` (no cluster — disallowed by validation) | n/a | n/a |
| `liste_attente` | `liste_attente` | `null` |
| `rejete` | `rejete` | `null` |

> Even before admin validation, `startups.status` reflects the **latest comité
> decision**. Admin override may later **rewrite** this status when they finalise.
> The audit history (selection_reviews timeline) preserves every step.

### 6.6 Edit-own-latest-non-final
- A comité member who is the author of the most recent `selection_reviews` for the dossier (and `is_final = false`) can re-open the DecisionPanel and **submit a new review**. We never UPDATE the past row — we always INSERT a new one (clean audit). The previous row is preserved in the timeline; the latest one is "active".
- UI affordance: when `isCurrentUserLatestReviewer && !effectiveReview.is_final`, the panel pre-fills with the previous values and the button reads "Modifier ma décision" instead of "Enregistrer la décision".

### 6.7 Cannot decide on a finalised dossier
- If `effectiveReview.is_final === true`, the DecisionPanel renders a **disabled** state with a courteous note: *« Décision verrouillée par l'admin. Demandez à l'admin pour rouvrir. »* (trilingual). Only an admin can change a finalised row (override).

---

## 7. Admin override & final validation (the central design task)

This is where the platform's control mechanism lives. Two distinct admin actions on a dossier:

- **VALIDATE** — accept the comité's latest decision **as-is** and lock it.
- **OVERRIDE** — write a **new** decision (and rationale) that supersedes the comité's. Locked as final.

### 7.1 Schema design — the chosen shape

**Choice (recommended): extend `selection_reviews` with two columns.**

```sql
alter table public.selection_reviews
  add column if not exists is_final boolean not null default false,
  add column if not exists overrides_review_id uuid references public.selection_reviews(id);

create index if not exists selection_reviews_final_idx
  on public.selection_reviews(startup_id)
  where is_final;  -- partial index: only the (at most one) final row per dossier
```

Plus, on `startups`, two tiny audit columns (optional but valuable, mirror the `submitted_at` precedent from the module1-prep migration):

```sql
alter table public.startups
  add column if not exists finalized_at timestamptz,
  add column if not exists finalized_by uuid references auth.users(id);
```

A **uniqueness invariant** ("at most one final row per dossier") is enforced by:

```sql
create unique index if not exists selection_reviews_one_final_per_startup
  on public.selection_reviews(startup_id)
  where is_final;
```

> This is a **partial unique index** — Postgres enforces it only over rows matching
> the WHERE clause. Cheap and exact. The application reads
> `select * from selection_reviews where startup_id = X and is_final order by reviewed_at desc limit 1`
> to get the effective row.

### 7.2 Schema design — alternatives & trade-offs

| Option | Pros | Cons |
|--------|------|------|
| **A. Extend `selection_reviews` with `is_final` + `overrides_review_id`** (chosen) | Single timeline source of truth. Audit is the full table. One partial unique index guarantees "≤ 1 final per dossier". No new join. RLS already on the table — just refine policies (§8). | Two semantic types of rows mixed in one table (comité review vs admin final). Mitigated by `is_final` flag + role check via author. |
| B. Separate `final_decisions` table (one row per dossier, FK to the picked `selection_reviews` or its own copy) | Strong separation of concerns. Easy "current state" join (`startups left join final_decisions`). | Doubles the write paths + RLS surface. Drift risk between `final_decisions.decision` and `selection_reviews`. Loses a unified timeline. |
| C. `startups.final_decision_id uuid` pointing to a `selection_reviews` row | Lightweight (no new table). | Doesn't model "I am overriding row X" cleanly (need to copy the field). Harder to query "all overridden by admin in May 2026". |
| D. Status-machine in `startups` only, no `is_final` | Simplest. | Loses audit / "validated when, by whom". Doesn't fit the requested control mechanism. |

We pick **(A)** because the timeline IS the product (a clear comité→admin sequence is what the user asked for) and because audit-as-table is the cheapest path. Documentation contract is below; if (B) is ever needed it remains a non-breaking migration.

### 7.3 Effective decision — derivation
A SQL view or client-side resolver:

```sql
-- effective_review = the one with is_final = true; else the latest comité row.
create or replace view public.startups_effective_review as
  select s.id as startup_id,
         coalesce(
           (select r.id from public.selection_reviews r
             where r.startup_id = s.id and r.is_final
             order by r.reviewed_at desc limit 1),
           (select r.id from public.selection_reviews r
             where r.startup_id = s.id
             order by r.reviewed_at desc limit 1)
         ) as effective_review_id
  from public.startups s;
```

The view is a thin convenience; the application can do the same in JS (`SelectionReview.effectiveForStartup(startupId)` helper). Both will be implemented; the view is optional for v1 but recommended (one SELECT per dossier detail vs two).

### 7.4 Admin UX — AdminOverridePanel
The panel renders **only for admins** below the DecisionPanel. Two cases:

**A. There is already a comité review (not final).**

```
┌────────────────────────────────────────────────────────────┐
│ Décision du comité                            [! À valider]│
│   Marie B. · 27 mai · liste d'attente                      │
│   Motif : « Bon dossier mais cluster déjà saturé. »        │
│                                                            │
│ [✓ Valider tel quel]   [✎ Remplacer la décision]           │
└────────────────────────────────────────────────────────────┘
```

- **Valider tel quel** = set `is_final = true` on the existing latest comité row (mutation `useFinalizeReview(reviewId)`). No new row inserted. `startups.finalized_at = now()`, `startups.finalized_by = auth.uid()`.
- **Remplacer la décision** = expand a sub-form **identical to DecisionPanel** (same field set), pre-filled with the comité's values. On submit, insert a **new** `selection_reviews` row with `is_final = true`, `overrides_review_id = <comite_row_id>`, `reviewer_id = auth.uid()`, etc. The status update follows §6.5 + admin can switch session.

**B. No comité review yet** (admin acting directly).
- The DecisionPanel itself becomes admin-finalising: a small toggle "Verrouiller comme décision finale" appears for admins; if ticked, the inserted row has `is_final = true`. Otherwise behaves like a normal comité review (admin acting in their dual role).

### 7.5 Needs-validation badge
- In the queue (§4.3) and on the drawer header: a small **gold pill "À valider"** when:
  - there is a latest comité review (`!is_final`),
  - AND its `decision ∈ { 'rejete', 'liste_attente' }`,
  - OR the admin filter "À valider" is active and any non-final exists.
- This surfaces the rejet / waitlist flow as the user requested ("**especially for rejete & liste_attente**"). For `eligible` decisions admin validation is still recommended but not blocking.

### 7.6 Admin override of an already-finalised row
- Edge case: an admin can override **their own** previous final (mistake correction). On submit, the previous `is_final` row stays in the timeline but its `is_final` flips to `false` and a new row with `is_final = true, overrides_review_id = <prev>` replaces it.
- Constraint: the partial unique index (§7.1) enforces that at any moment exactly one row has `is_final = true` per dossier.
- Reverting a final back to "comité-pending" (i.e. removing all final flags without writing a new decision) — see open question §12.4.

---

## 8. RLS & security

Recap of the **delta** vs the foundation + module1-prep:

### 8.1 `selection_reviews` policies (refine)
The foundation gave a **single** `reviews_comite` policy `FOR ALL` to comité+admin. We **split** it for clarity and to keep finalisation strictly admin:

```sql
drop policy if exists reviews_comite on public.selection_reviews;

-- READ : comité + admin (and optionally the dossier owner, see open question §12.5).
create policy reviews_staff_read on public.selection_reviews for select
  to authenticated
  using (public.has_platform_role('comite') or public.has_platform_role('admin'));

-- INSERT : comité or admin. The inserter must be the reviewer (audit).
--   - comité cannot insert with is_final = true (admin-only flag).
--   - admin can insert with any is_final.
create policy reviews_insert on public.selection_reviews for insert
  to authenticated
  with check (
    (public.has_platform_role('comite') and is_final = false and reviewer_id = auth.uid())
    or
    (public.has_platform_role('admin') and reviewer_id = auth.uid())
  );

-- UPDATE : 
--   - comité can update ONLY their own non-final rows (and cannot flip is_final).
--   - admin can update any row (e.g. flip is_final true/false during a revert).
create policy reviews_update on public.selection_reviews for update
  to authenticated
  using (
    (public.has_platform_role('comite') and reviewer_id = auth.uid() and is_final = false)
    or public.has_platform_role('admin')
  )
  with check (
    (public.has_platform_role('comite') and reviewer_id = auth.uid() and is_final = false)
    or public.has_platform_role('admin')
  );

-- DELETE : admin only (history is sacred; even an admin should prefer a new row).
create policy reviews_delete on public.selection_reviews for delete
  to authenticated
  using (public.has_platform_role('admin'));
```

### 8.2 `startups` policies — the H2 residual
The module1-prep migration documents a residual: the applicant currently can **self-update `status`** via the `startups_applicant_update` policy (no column-level WITH CHECK). We addressed it as a known limitation; Module 2 makes this actively dangerous, since `status` is now the projection of comité/admin work.

**Recommendation (build in this module):**
- Add a SECURITY DEFINER RPC `apply_selection_review(p_review_id uuid)` (called by `useUpsertReview` and `useFinalizeReview`) that performs the dossier `status` / `session_id` / `finalized_at` / `finalized_by` mutation. The RPC checks `has_platform_role('comite') or has_platform_role('admin')` itself.
- Replace `startups_applicant_update` with a **column-restricted** policy: tighten it via a `BEFORE UPDATE` trigger that **rejects** changes to `status`, `session_id`, `finalized_at`, `finalized_by` when the caller is not staff. (PostgREST + PostgreSQL don't support column-level RLS via policy `WITH CHECK`; the cleanest path is a trigger.)
  Sketch:

  ```sql
  create or replace function public.tg_startups_lock_staff_columns()
  returns trigger language plpgsql as $$
  begin
    if not (public.has_platform_role('comite') or public.has_platform_role('admin')) then
      if new.status        is distinct from old.status        then raise exception 'status is staff-only'; end if;
      if new.session_id    is distinct from old.session_id    then raise exception 'session_id is staff-only'; end if;
      if new.finalized_at  is distinct from old.finalized_at  then raise exception 'finalized_at is staff-only'; end if;
      if new.finalized_by  is distinct from old.finalized_by  then raise exception 'finalized_by is staff-only'; end if;
      if new.eligibility   is distinct from old.eligibility   then raise exception 'eligibility snapshot is staff-only after submit'; end if;
    end if;
    return new;
  end$$;

  drop trigger if exists startups_lock_staff_columns on public.startups;
  create trigger startups_lock_staff_columns
    before update on public.startups
    for each row execute function public.tg_startups_lock_staff_columns();
  ```

  This makes Module 2's status authority real: a candidate cannot edit their own status, eligibility snapshot, or session. Cited as a **dependency** on the hardening review's H2 finding.

### 8.3 Storage signed URLs
- Reuse `signedDossierUrl(s)` from `src/lib/rsa/storage.js`. The `dossiers_read` policy (`is_dossier_staff()`) already grants comité/jury/admin access — Module 2 needs no Storage migration. ✓
- TTL slightly extended to 300 s (5 min) for staff downloads (vs 60 s in Module 1) since reviewers may save the file locally.

### 8.4 What about H3 (eligibility rules exposure)?
H3 (rules exposed to candidates) is unrelated to Module 2; we touch the same `editions` table only for reads scoped to staff (which already see all editions per the prep migration). No change needed here.

---

## 9. Data layer

### 9.1 `SelectionReview` entity (extend `src/lib/rsa/entities.js`)

Mirror the `Startup` entity pattern (`createEntity` + business helpers):

```js
// src/lib/rsa/entities.js (addition)

export const SelectionReview = {
  ...createEntity('selection_reviews'),

  // All reviews for a dossier, most recent first (timeline source).
  async forStartup(startupId) {
    const { data, error } = await supabase
      .from('selection_reviews')
      .select('*')
      .eq('startup_id', startupId)
      .order('reviewed_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Effective row = is_final row else the latest comité row.
  async effectiveForStartup(startupId) {
    const rows = await this.forStartup(startupId);
    if (!rows.length) return null;
    return rows.find((r) => r.is_final) || rows[0];
  },

  // Comité INSERT — see §6.4. Server-side RPC does the dossier update.
  async createComiteReview({ startupId, reviewerId, reviewerName, decision, assignedSessionId, rationale }) {
    const { data: row, error: err1 } = await supabase
      .from('selection_reviews')
      .insert({
        startup_id: startupId,
        reviewer_id: reviewerId,
        reviewer_name: reviewerName,
        decision,
        assigned_session_id: assignedSessionId ?? null,
        rationale: rationale?.trim() || null,
        is_final: false,
      })
      .select()
      .single();
    if (err1) throw err1;
    // Apply the dossier-level side effects through the staff-only RPC.
    const { error: err2 } = await supabase.rpc('apply_selection_review', { p_review_id: row.id });
    if (err2) throw err2;
    return row;
  },

  // Admin VALIDATE — flips is_final on an existing review.
  async finalizeExisting(reviewId, { adminId }) {
    const { data, error } = await supabase
      .from('selection_reviews')
      .update({ is_final: true })
      .eq('id', reviewId)
      .select()
      .single();
    if (error) throw error;
    await supabase.rpc('apply_selection_review', { p_review_id: reviewId });
    // record finalized_at / finalized_by on startups via the same RPC (extended).
    return data;
  },

  // Admin OVERRIDE — new is_final row that supersedes a previous review.
  async adminOverride({ startupId, adminId, adminName, decision, assignedSessionId, rationale, overridesReviewId }) {
    // 1. Insert the new final row.
    const { data: row, error: err1 } = await supabase
      .from('selection_reviews')
      .insert({
        startup_id: startupId,
        reviewer_id: adminId,
        reviewer_name: adminName,
        decision,
        assigned_session_id: assignedSessionId ?? null,
        rationale: rationale?.trim() || null,
        is_final: true,
        overrides_review_id: overridesReviewId ?? null,
      })
      .select()
      .single();
    if (err1) throw err1;
    // 2. If we’re replacing a previous final, the partial-unique-index would fire —
    //    so the RPC `apply_selection_review` first flips the previous final's is_final=false
    //    inside a single transaction, then re-applies the new row's effects.
    await supabase.rpc('apply_selection_review', { p_review_id: row.id });
    return row;
  },
};
```

### 9.2 `Startup` entity additions

For the queue we need a paginated, staff-scoped query:

```js
// src/lib/rsa/entities.js (Startup additions)
Startup.pageForStaff = async function ({ filters, cursor, limit = 25 }) {
  let q = supabase
    .from('startups')
    .select('*, sessions(*), selection_reviews(id, reviewer_name, decision, reviewed_at, is_final, assigned_session_id, rationale, overrides_review_id)')
    .order('submitted_at', { ascending: false })
    .limit(limit);
  if (filters?.editionId)  q = q.eq('edition_id', filters.editionId);
  if (filters?.statusIn)   q = q.in('status', filters.statusIn);
  if (filters?.verdictIn)  q = q.in('eligibility->>verdict', filters.verdictIn); // jsonb path
  if (filters?.search)     q = q.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,contact_person.ilike.%${filters.search}%`);
  if (cursor)              q = q.lt('submitted_at', cursor);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
};
```

> The `selection_reviews` nested select piggy-backs the timeline so the queue can
> compute "last reviewer" / "needs validation" without a second round-trip. RLS on
> the related table still applies (staff-only — they're allowed here).

### 9.3 TanStack hooks (`src/components/rsa/selection/useSelection.js`)

Co-locate alongside the components (same pattern as Module 1's `useCandidature.js`):

```js
export const KEYS = {
  queue:     (filters) => ['rsa', 'selection', 'queue', filters],
  dossier:   (id) => ['rsa', 'selection', 'dossier', id],
  reviews:   (id) => ['rsa', 'selection', 'reviews', id],
};

// Queue, infinite (cursor on submitted_at).
export function useSelectionQueue(filters) {
  return useInfiniteQuery({
    queryKey: KEYS.queue(filters),
    queryFn: ({ pageParam }) => Startup.pageForStaff({ filters, cursor: pageParam, limit: 25 }),
    getNextPageParam: (last) => (last.length === 25 ? last[last.length - 1].submitted_at : undefined),
    staleTime: 30_000,
  });
}

// Full dossier detail.
export function useDossierDetail(startupId) {
  return useQuery({
    queryKey: KEYS.dossier(startupId),
    queryFn: () => Startup.filter({ id: startupId }).then((rows) => rows[0] || null),
    enabled: !!startupId,
  });
}

// Review timeline.
export function useReviews(startupId) {
  return useQuery({
    queryKey: KEYS.reviews(startupId),
    queryFn: () => SelectionReview.forStartup(startupId),
    enabled: !!startupId,
  });
}

// Comité — create or replace own latest non-final review.
export function useUpsertReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => SelectionReview.createComiteReview(payload),
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: ['rsa', 'selection'] }); // queue + reviews + dossier
    },
  });
}

// Admin — validate (lock as-is).
export function useFinalizeReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, adminId }) => SelectionReview.finalizeExisting(reviewId, { adminId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rsa', 'selection'] }),
  });
}

// Admin — override (new is_final row).
export function useAdminOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => SelectionReview.adminOverride(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rsa', 'selection'] }),
  });
}
```

Optimistic updates are kept light (the queue line refresh through a single invalidation; no manual cache rewrite needed because the queue is paged).

---

## 10. UI structure (file tree)

```
src/pages/
  Selection.jsx                  # the Module-2 route (gated comité OR admin).
                                 # Hosts <SelectionShell> which composes the queue
                                 # and the drawer/detail.

src/components/rsa/selection/
  SelectionShell.jsx             # top header (eyebrow "Espace Sélection" + edition pill),
                                 # left column = QueueList + FiltersBar, right column = DossierDrawer.
  FiltersBar.jsx                 # filters (§4.2), URL-param-synced.
  QueueList.jsx                  # editorial list rows (§4.3), infinite scroll trigger.
  QueueRow.jsx                   # single row (name / meta / pills / chevron).
  DossierDrawer.jsx              # slide-in on lg, full-page on mobile. Hosts the three sections.
  DossierDetail.jsx              # read-only candidate data (§5.1 + §5.2).
  EligibilitySnapshot.jsx        # the verdict + failed list (§5.3) — reuses RULE_LABELS from candidature/i18n.js.
  DocumentLinks.jsx              # signed-URL links to deck + exec summary (§5.4).
  ReviewHistoryTimeline.jsx      # vertical timeline (§5.5).
  DecisionPanel.jsx              # the comité form (§6).
  AdminOverridePanel.jsx         # admin validate/override (§7).
  ClusterSelect.jsx              # `Select` of qualifying sessions of the dossier's edition
                                 # + suggestion caption from sectors heuristic (§6.3).
  StatusBadge.jsx                # thin wrapper over `StatusPill` that maps startups.status
                                 # → StatusPill kind="dossier" + applies the selection-side
                                 # trilingual label (§4.3 mapping table).
  i18n.js                        # selection dictionaries (see §11).
  constants.js                   # SECTOR_TO_CLUSTER_KEYWORDS + DECISION_OPTIONS + STATUS_MAP_TO_PILL.
  useSelection.js                # TanStack Query keys + queries + mutations (§9.3).

src/lib/rsa/
  entities.js                    # + SelectionReview, + Startup.pageForStaff (edit existing).

supabase/migrations/
  20260528_rsa_module2_selection.sql  # is_final / overrides_review_id columns,
                                      # partial unique index, RLS refresh, RPC
                                      # apply_selection_review, optional view.
  20260528_rsa_module2_status_trigger.sql  # H2 residual lock (status/session staff-only).
```

**Design rules** (Élysée — `docs/design/elysee-designbook.md`):
- `PageShell` provides the cream background and max-w container; the queue uses a wider variant (e.g. `max-w-[1100px]`) since we are *list-heavy*.
- No shadows, hairline borders only (`CREAM2`).
- Verdict / decision pills always use `StatusPill` — never re-implement pill styling.
- Drawer = `@radix-ui/react-dialog` (already in deps via shadcn) styled per design book; slide-in from the right on lg, modal-full-screen on mobile.
- All copy via the i18n dictionaries (§11).

---

## 11. i18n FR / EN / DE — selection dictionaries

`src/components/rsa/selection/i18n.js`, same shape as `src/components/rsa/candidature/i18n.js`:

```js
import { useLang } from '@/lib/platform/i18n'; // existing hook from Module 1

// ── Statuts dossier (côté queue + drawer) ────────────────────────────────────
export const DOSSIER_STATUS_LABELS = {
  soumis:        { fr: 'Soumis',                 en: 'Submitted',          de: 'Eingereicht' },
  en_selection:  { fr: 'En sélection',           en: 'Under review',       de: 'In Auswahl' },
  eligible:      { fr: 'Éligible',               en: 'Eligible',           de: 'Förderfähig' },
  liste_attente: { fr: "Liste d'attente",        en: 'Waitlist',           de: 'Warteliste' },
  affecte:       { fr: 'Affecté à une session',  en: 'Session-assigned',   de: 'Session zugewiesen' },
  rejete:        { fr: 'Rejeté',                 en: 'Rejected',           de: 'Abgelehnt' },
  finaliste:     { fr: 'Finaliste',              en: 'Finalist',           de: 'Finalist' },
  laureat:       { fr: 'Lauréat',                en: 'Winner',             de: 'Preisträger' },
};

// ── Décisions comité (radio) ─────────────────────────────────────────────────
export const DECISION_LABELS = {
  a_examiner:    { fr: 'À examiner',             en: 'Pending review',     de: 'Zu prüfen' },
  eligible:      { fr: 'Éligible',               en: 'Eligible',           de: 'Förderfähig' },
  liste_attente: { fr: "Liste d'attente",        en: 'Waitlist',           de: 'Warteliste' },
  rejete:        { fr: 'Rejeté',                 en: 'Rejected',           de: 'Abgelehnt' },
};

// ── Copy UI ──────────────────────────────────────────────────────────────────
export const UI = {
  eyebrow:      { fr: 'Espace Sélection',        en: 'Selection desk',     de: 'Auswahl-Bereich' },
  pageTitle:    { fr: 'File des candidatures',   en: 'Candidate queue',    de: 'Bewerbungsliste' },
  filtersAll:   { fr: 'Toutes',                  en: 'All',                de: 'Alle' },
  filterToReview: { fr: 'À examiner',            en: 'To review',          de: 'Zu prüfen' },
  filterDecided:  { fr: 'Décidés',               en: 'Decided',            de: 'Entschieden' },
  filterToValidate: { fr: 'À valider',           en: 'To validate',        de: 'Zu validieren' },
  searchPlaceholder: { fr: 'Rechercher (nom, contact, email)…', en: 'Search (name, contact, email)…', de: 'Suchen (Name, Kontakt, E-Mail)…' },

  // Dossier drawer
  sectionDossier:     { fr: 'Dossier',          en: 'Dossier',            de: 'Bewerbungsunterlagen' },
  sectionEligibility: { fr: 'Éligibilité',       en: 'Eligibility',        de: 'Förderfähigkeit' },
  sectionDocuments:   { fr: 'Documents',         en: 'Documents',          de: 'Dokumente' },
  sectionTimeline:    { fr: 'Historique des décisions', en: 'Decision history', de: 'Entscheidungsverlauf' },

  // Decision panel
  decisionTitle:   { fr: 'Décision du comité',   en: 'Committee decision', de: 'Komitee-Entscheidung' },
  clusterLabel:    { fr: 'Cluster (session)',    en: 'Cluster (session)',  de: 'Cluster (Session)' },
  clusterSuggested: { fr: 'Suggéré d\'après les secteurs déclarés.', en: 'Suggested from declared sectors.', de: 'Vorschlag aus den genannten Sektoren.' },
  rationaleLabel:  { fr: 'Motif',                en: 'Rationale',          de: 'Begründung' },
  rationaleRequired: { fr: 'Requis pour un rejet ou une mise en liste d\'attente.',
                       en: 'Required when rejecting or waitlisting.',
                       de: 'Pflicht bei Ablehnung oder Warteliste.' },
  saveDecision:    { fr: 'Enregistrer la décision', en: 'Save decision',   de: 'Entscheidung speichern' },
  updateDecision:  { fr: 'Modifier ma décision', en: 'Update my decision', de: 'Meine Entscheidung ändern' },

  // Admin
  adminTitle:      { fr: 'Validation administrateur', en: 'Admin validation', de: 'Administrator-Validierung' },
  adminValidate:   { fr: 'Valider tel quel',     en: 'Validate as-is',     de: 'So bestätigen' },
  adminOverride:   { fr: 'Remplacer la décision', en: 'Override decision', de: 'Entscheidung ersetzen' },
  finalLocked:     { fr: 'Décision verrouillée par l\'admin.',
                     en: 'Decision locked by admin.',
                     de: 'Vom Admin gesperrte Entscheidung.' },
  needsValidation: { fr: 'À valider',            en: 'Needs validation',   de: 'Validierung erforderlich' },

  // Misc
  noAccess:        { fr: 'Cette section est réservée au comité et à l\'administration.',
                     en: 'This area is restricted to the committee and administrators.',
                     de: 'Dieser Bereich ist dem Komitee und der Administration vorbehalten.' },
  rulesNote:       { fr: 'Les critères d\'éligibilité sont indicatifs (Règlement Art. 2). Le comité reste souverain.',
                     en: 'Eligibility criteria are indicative (Rules Art. 2). The committee remains sovereign.',
                     de: 'Förderkriterien sind orientierend (Reglement Art. 2). Das Komitee entscheidet souverän.' },
};
```

`RULE_LABELS` is **imported** from `@/components/rsa/candidature/i18n.js` rather than duplicated (single source for the rule names — the eligibility engine is shared between funnel and selection).

Resolution helper: `useLang().t(entry)` — already exposed by Module 1's `useLang.js`. Selection reuses the same hook (and the same `localStorage('rsa_lang')` key).

---

## 12. Open questions for the human

1. **Candidate-facing notification email on decision.** Should `eligible` / `rejete` / `liste_attente` (once admin-finalised) auto-send an email to the candidate (via an Edge Function or Supabase Auth template)? Current spec: **no**, the candidate sees the new status in their tracking view; emails are a Module 4 concern. Confirm.
2. **`StatusPill` extension for `waitlist`.** The existing `StatusPill kind="dossier"` lacks a `waitlist` key; Module 2 reuses `under_review` tone for it. Acceptable for v1, or should we add `waitlist` to `STATUS_MAP.dossier` with its own warm-but-cooler tone?
3. **CHECK constraint on `selection_reviews.decision`.** The column is free text today. We propose adding `check (decision in ('a_examiner','eligible','liste_attente','rejete'))` plus a `text` migration rename if `accepte` rows exist anywhere (none exist; safe to constrain). Confirm.
4. **Revert a final back to comité-pending.** Should an admin be able to clear `is_final` without writing a new decision (i.e. send it back to comité)? Current spec: **no** (always override with a new row). Confirm.
5. **Owner-read of `selection_reviews`.** The hardening review (M3) flags that startups cannot see their own decision row. We **deliberately keep them invisible** in Module 2 (the candidate sees only the projected `startups.status` + assigned session). Confirm that decisions/rationales remain comité-internal.
6. **`status` lock via trigger (H2 residual).** §8.2 recommends a `BEFORE UPDATE` trigger on `startups` to prevent the candidate from self-updating `status` / `session_id` / `eligibility`. This is *strongly recommended* alongside Module 2 — confirm we include it in the same migration batch.
7. **Soft claim / lock when first opened.** Two comité members could open the same dossier at the same time. We do **not** propose a hard lock (a `claimed_by` + TTL would be a heavier moderation feature). Instead the queue/drawer surface "Marie has a pending decision (2 min ago) — see / replace". Is that enough, or do you want a hard claim?
8. **Cluster default from sectors.** §6.3 maps declared sectors → cluster id with a small keyword heuristic. Confirm the keyword list — especially the "Tech, AI, Fintech & Mobilité" cluster which is the catch-all. (Sectors not matching any cluster → no pre-fill, the reviewer picks manually.)
9. **Cross-edition queue toggle.** Default = current open edition. Should the comité see prior editions at all in this UI (read-only audit), or are prior editions reachable only via a dedicated archive page?
10. **Jury verdicts in the queue.** Module 3 will eventually attach jury scores to the same dossier. Should the queue show a small "Score jury 4.2/5 (12 votes)" pill on already-judged dossiers? Suggested **yes** when Module 3 ships — a low-cost addition since `jury_scores` will read via the same staff RLS. Confirm we keep the column slot reserved.
11. **`reviewer_name` source.** We persist `profiles.full_name` (when present) or the email local-part otherwise. Acceptable label for the audit, or do you want a dedicated `comite_members` table with a stable display name?
12. **Decision shortcut for "obvious" excluded dossiers.** When `eligibility.verdict === 'excluded'`, should the DecisionPanel pre-select `rejete` and pre-fill the rationale with "Critère exclusif : {rule}"? Faster moderation, but risks rubber-stamping; recommended **no** by default.

---

## 13. Build order (within Module 2)

1. **Migration** — `20260528_rsa_module2_selection.sql` : `is_final`, `overrides_review_id`, `finalized_at/by`, partial unique index, refined RLS policies (§8.1), `apply_selection_review` RPC, `startups_effective_review` view.
2. **Migration (parallel)** — `20260528_rsa_module2_status_trigger.sql` : `BEFORE UPDATE` trigger on `startups` that prevents non-staff from changing `status`/`session_id`/`eligibility`/`finalized_*` (H2 closure).
3. **Data layer** — `SelectionReview` entity in `src/lib/rsa/entities.js`, `Startup.pageForStaff` addition.
4. **`useSelection.js`** hooks + URL-param-synced filter state.
5. **`Selection.jsx`** route + auth/role gate + TopNav link (role-aware).
6. **`SelectionShell` + FiltersBar + QueueList/QueueRow** (the queue first, decisions stubbed).
7. **`DossierDrawer` + DossierDetail + EligibilitySnapshot + DocumentLinks** (read-only experience for staff is already enough to be useful).
8. **`ReviewHistoryTimeline`** + **DecisionPanel** (comité writes; status side-effects through the RPC).
9. **`AdminOverridePanel`** + needs-validation badge + reverts.
10. **i18n** sweep + visual polish per Élysée designbook + framer-motion fades.

---

## Appendix A — Migration sketch (for the implementing agent)

> Not built here — kept as a contract.

```sql
-- 20260528_rsa_module2_selection.sql
alter table public.selection_reviews
  add column if not exists is_final boolean not null default false,
  add column if not exists overrides_review_id uuid references public.selection_reviews(id);

create unique index if not exists selection_reviews_one_final_per_startup
  on public.selection_reviews(startup_id)
  where is_final;

create index if not exists selection_reviews_final_idx
  on public.selection_reviews(startup_id, reviewed_at desc) where is_final;

alter table public.startups
  add column if not exists finalized_at timestamptz,
  add column if not exists finalized_by uuid references auth.users(id);

-- (refined RLS — see §8.1)

-- Optional CHECK constraint (open question §12.3).
-- alter table public.selection_reviews
--   add constraint selection_reviews_decision_check
--     check (decision in ('a_examiner','eligible','liste_attente','rejete'));

-- Effective-review view.
create or replace view public.startups_effective_review as
  select s.id as startup_id,
         coalesce(
           (select r.id from public.selection_reviews r
             where r.startup_id = s.id and r.is_final
             order by r.reviewed_at desc limit 1),
           (select r.id from public.selection_reviews r
             where r.startup_id = s.id
             order by r.reviewed_at desc limit 1)
         ) as effective_review_id
  from public.startups s;

-- Staff-only RPC : applies a review's effects on startups (status / session / finalized_*).
create or replace function public.apply_selection_review(p_review_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_review public.selection_reviews%rowtype;
  v_new_status text;
begin
  if not (public.has_platform_role('comite') or public.has_platform_role('admin')) then
    raise exception 'apply_selection_review requires comite or admin role';
  end if;

  select * into v_review from public.selection_reviews where id = p_review_id;
  if not found then raise exception 'review not found: %', p_review_id; end if;

  -- Compute the new status from the decision.
  v_new_status := case v_review.decision
    when 'a_examiner'    then 'en_selection'
    when 'eligible'      then 'affecte'      -- requires assigned_session_id (UI ensures)
    when 'liste_attente' then 'liste_attente'
    when 'rejete'        then 'rejete'
    else null
  end;

  -- If admin row is final and overrides another final: clear the previous final flag.
  if v_review.is_final and v_review.overrides_review_id is not null then
    update public.selection_reviews
      set is_final = false
      where id = v_review.overrides_review_id;
  end if;

  update public.startups
    set status       = coalesce(v_new_status, status),
        session_id   = case when v_review.decision = 'eligible' then v_review.assigned_session_id else null end,
        finalized_at = case when v_review.is_final then now()             else finalized_at end,
        finalized_by = case when v_review.is_final then auth.uid()        else finalized_by end,
        updated_at   = now()
    where id = v_review.startup_id;
end$$;

revoke all on function public.apply_selection_review(uuid) from public, anon;
grant execute on function public.apply_selection_review(uuid) to authenticated;
```

```sql
-- 20260528_rsa_module2_status_trigger.sql  (H2 residual closure)
create or replace function public.tg_startups_lock_staff_columns()
returns trigger language plpgsql as $$
begin
  if not (public.has_platform_role('comite') or public.has_platform_role('admin')) then
    if new.status        is distinct from old.status        then raise exception 'status is staff-only'; end if;
    if new.session_id    is distinct from old.session_id    then raise exception 'session_id is staff-only'; end if;
    if new.finalized_at  is distinct from old.finalized_at  then raise exception 'finalized_at is staff-only'; end if;
    if new.finalized_by  is distinct from old.finalized_by  then raise exception 'finalized_by is staff-only'; end if;
    -- Eligibility snapshot is written exactly once (at submit). Lock it afterwards.
    if old.eligibility is not null and old.eligibility <> '{}'::jsonb
       and new.eligibility is distinct from old.eligibility then
      raise exception 'eligibility snapshot is locked after submit';
    end if;
  end if;
  return new;
end$$;

drop trigger if exists startups_lock_staff_columns on public.startups;
create trigger startups_lock_staff_columns
  before update on public.startups
  for each row execute function public.tg_startups_lock_staff_columns();
```

---

## Appendix B — UI mock (textual)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ESPACE SÉLECTION  ·  Édition « dev » (active)                       FR EN DE│
├──────────────────────────────────────────────────────────────────────────────┤
│  [À examiner] [Décidés] [À valider] [Tous]    Statut ▾  Verdict ▾  Cluster ▾ │
│                                                Rechercher : […………………………]    │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  Helia BioPlastics                                          ⌄ Ouvrir         │
│    DE · 2023-04-10 · [Greentech] [Cleantech]                                 │
│    Léna Schultz · lena@helia.bio                                             │
│    Éligibilité : • Éligible      Statut : • Soumis                           │
│                                                                              │
│  Boréalis EdTech                                            ⌄ Ouvrir         │
│    FR · 2022-09-01 · [Edtech] [Impact social]                                │
│    Camille A. · camille@borealis.fr                                          │
│    Éligibilité : • Flagged (CA > seuil) Statut : • En sélection              │
│    Décidé par Marie B. · 27 mai · liste d'attente             [! À valider]  │
│                                                                              │
│  …                                                                           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

(open drawer = right pane on desktop)

┌─ Boréalis EdTech ──────────────────────────────────────────────────────┐
│  • Liste d'attente   [! À valider]   Edition : dev                     │
│  FR · créée 2022-09-01 · SIREN 901 234 567 · fondateurs majoritaires    │
│  ───────────────────────────────────────────────────────────────────── │
│  Dossier (Art. 4) …  [editorial fields]                                │
│  Éligibilité (snapshot) …  ▼  Flagged · CA 620 000 € > 500 000 €       │
│  Documents      Pitch deck (PDF)   ·   Executive summary (PDF FR & DE) │
│  Historique     27 mai 14h32 · Marie B. (Comité) · Liste d'attente     │
│                  « Bon dossier mais cluster saturé. »                  │
│                                                                        │
│  Décision du comité                                                    │
│   ( ) À examiner   ( ) Éligible   (•) Liste d'attente   ( ) Rejeté      │
│   Cluster : —                                                          │
│   Motif :  [textarea, requis]                                          │
│   [Modifier ma décision]                                               │
│                                                                        │
│  Validation administrateur                                             │
│   [ ✓ Valider tel quel ]    [ ✎ Remplacer la décision ]                │
└────────────────────────────────────────────────────────────────────────┘
```
