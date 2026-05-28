# Module 4 — Finale & Résultats (« Cockpit Admin + Palmarès public »)

> Build-ready spec for the **last big module** of the RSA platform: the
> admin-only operations cockpit (editions, sessions, jury provisioning, live
> grid, results, Grande Finale, RSVP, communications) plus the public-facing
> palmarès page that closes the candidate journey.
> Fourth and final module of the RSA platform rebuild — see memory
> `project_rsa_platform_rebuild`.

- **Stack** : React 18 + Vite, Tailwind + shadcn/ui, Supabase (DB + Realtime + private Storage + Edge functions + SMTP), TanStack React Query. Imports via `@/`.
- **Data spine** : the `startups` dossier (Modules 1+2+3) is still the column ; M4 adds **edition orchestration** (`editions`, `sessions`, `session_config`) and **post-event projection** (winners, palmarès snapshot, RSVPs, communications). All admin mutations go through SECURITY DEFINER RPCs (no direct table writes from the client for privileged columns).
- **Auth/roles** : `src/lib/platform/auth.jsx` (`usePlatformAuth`). The cockpit is gated to `'admin'`. `'comite'` keeps read-only visibility (existing RLS) and may optionally see the LIVE tab — open question §11.3. `'jury'` never enters the admin space. Roles still live in the locked `app_user_roles` (C1 hardening) ; M4 adds the **first admin write path** to that table via a SECURITY DEFINER RPC `rsa_assign_role` (admin-DEFINER bypass — §6.2).
- **Reused from Modules 1+2+3** :
  - `signedDossierUrl(s)` / `dossiers` bucket (private Storage with `is_dossier_staff()` policy).
  - `CRITERIA` / `weightedScore` / `JURY_STATUS` / `SESSIONS` / `SESSION_BY_ID` / `FINAL_SESSION_ID` / `getSessionLabel` / `getSessionDate` from `src/lib/rsa/constants.js`.
  - `buildRanking` from `src/lib/rsa/ranking.js` (already mirrored as a SQL twin in `rsa_publish_session`).
  - `Edition` / `RsaSession` / `Startup` / `SelectionReview` / `JuryProfile` / `JuryAssignment` / `JuryDraft` / `JuryScore` from `src/lib/rsa/entities.js`. M4 adds `PlatformFinaleRsvp` and `PlatformCommunication`.
  - **Élysée components** : `PageShell` (`width="wide"`), `TopNav`, `NavMenu`, `LanguageSwitcher`, `StatusPill` (kinds `dossier`/`jury`), `Eyebrow`, `EditorialTitle`, `HeroEventCard`, `ActionRow`, `UpcomingList`, `Field`/`TextInput`/`Textarea`/`Select`/`TagSelect`/`Dropzone`/`RadioYesNo`/`DateField`, `Button`, `MagicLinkLogin`.
- **Design** : « Élysée » designbook (`docs/design/elysee-designbook.md`) — NAVY/GOLD/CREAM, Playfair + Inter, hairline borders, **no dashboard look** even when the screen is data-heavy. The cockpit is the densest surface in the platform (a 12-juror × 8-startup matrix appears on LIVE) but stays editorial: tabular-nums, `MUTED` uppercase column headers, hairline `CREAM2` rows, faint-tint hover, **no zebra stripes** (the legacy `LiveTab` zebra is dropped — designbook §5.5). Pills always use the shared `StatusPill` — never the legacy `admin/StatusPill.jsx` (which is amber-based and off-palette).
- **Trilingual** : FR / EN / DE chrome (memory `project_rsa_pitch_language` — pitch content stays English; the cockpit is fully FR/EN/DE, with admin defaulting to FR; the **public palmarès** is fully FR/EN/DE with institutional/celebratory tone, mirroring the live `rotary-startup.org` landing palmarès already in the wild).
- **Session format** (memory `project_rsa_session_format`, never invent durations) : pitch 10–12 min + Q&A 8–10 min = slot 20 min ; session ~2h30 ; the finale runs **Mardi 26 mai 2026 16h–19h chez Cyrus Conseil** (memory `project_rsa_finale`). The cockpit is the operations brain for this choreography (cf. `docs/RSA_LIVE.md`).

---

## 1. Scope & roles

**In scope (Module 4) — the « Cockpit Admin » + the public palmarès:**

- **`/Admin`** — the admin cockpit page (`src/pages/Admin.jsx`, auto-registered via `pages.config.js`, pre-listed in `STANDALONE_PAGES` of `Layout.jsx` — already done in the working tree). Gated `isAdmin`. Sub-tabs (§2):
  - **SETUP** : edition CRUD (open/close, dates, prizes, eligibility rules JSON editor, `finalists_per_session`, `public_results_enabled`), session CRUD per edition (qualifying + finale, `position`, dates), `app_user_roles` provisioning UI for jury + comité, per-session `session_config` seeding (so `rsa_lock_session` / `rsa_publish_session` have a row to flip — current operational blocker, §2.1).
  - **LIVE** : the real-time scoring grid (per assigned juror × per session startup), session lifecycle controls (`Open scoring → Lock → Publish`), live progress stats. Realtime via `platform_jury_score_drafts` + `platform_jury_scores` subscriptions (§3).
  - **RESULTS** : per-session palmarès (post-Lock + Publish), finaliste picker (auto-projection from `rsa_publish_session` + admin override), per-edition cross-session view + the Grande Finale picker (§4).
  - **GRANDE FINALE** : finale session (`kind='finale'`) — admin builds the finalist roster, assigns finale jury, runs the finale through the same Live/Results pipe, then proclaims the lauréat (`rsa_proclaim_winner`). One new "membership" concept (§4.5) addresses the dossier-per-session constraint.
  - **RSVP** : refactored from legacy `rsa_finale_rsvp` to a new `platform_finale_rsvp` keyed by `edition_id` ; admin send-link UI + a public RSVP form route (§5).
  - **COMMUNICATIONS** : post-finale email blasts (winners, jury thanks, sponsors, candidates recap), branded Élysée HTML per `docs/design/email-templates/`, sent via a backend (Edge function preferred over RPC, §6.4). Ported from legacy `ResultsAnnounceSection` / `FinaleEmailsSection` / `CommunicationsSection`.

- **`/Resultats`** — the public palmarès (`src/pages/Resultats.jsx`, auto-registered, **add to `STANDALONE_PAGES`** so it renders without the lunch chrome). **No auth.** Editorial Élysée style, trilingual. Renders the published rankings for an edition: each session's top-N + the Grande Finale lauréat + podium. Gated by `editions.public_results_enabled = true` (so admin controls the publish moment).

**Module-status overview line** (visible to admin at the top of every tab) — one-line summary per Module the admin can see at a glance:

| Module | Surface | Status reads |
|--------|---------|--------------|
| M1 — Candidature | `/MonDossier` | `count(startups where status in ('brouillon','soumis')) for active edition` |
| M2 — Sélection   | `/Selection`   | `count(startups where status='soumis')` (à examiner) + `count(needs_validation)` + `count(affecte)` |
| M3 — Jury        | `/Jury`        | per-edition: `count(sessions where status='live')` + `count(sessions where status='published')` |
| M4 — Cockpit     | `/Admin`       | `editions.status` of active edition + next milestone date |

Rendered as a hairline strip under the page header (`<ModuleStatusStrip />`). Reads everything through the existing entity wrappers; no new endpoints needed.

**Out of scope (later iterations / dependencies):**
- A standalone admin space for **edition templating** (cloning 2026 → 2027 with all sessions/prizes) — can ship later as an "Cloner cette édition" button on SETUP ; baseline M4 lets admin create from scratch.
- A **Wordpress integration** for the palmarès on `rotary-startup.org/palmares` (open question §11.2). M4 ships `/Resultats` on the app subdomain ; the WP route is a follow-up.
- **Per-juror reminders / nudges** (an "X jurors haven't scored yet — send reminder" button) — M4 surfaces the data, not the email automation. Open question §11.7.
- **PDF certificates** for laureates ("Certificat de Lauréat"), and Wallpaper/social assets — separate creative work, post-M4.
- **Multi-edition global stats / KPIs** (count of candidates across years, sectoral heat-map). Editorial palmarès only in v1.

---

## 2. Admin cockpit — sub-tabs (port from RsaAdmin)

> The legacy `RsaAdmin.jsx` is a single page with localStorage-gated key (`VITE_RSA_ADMIN_KEY`) and 5 tabs (`setup` / `decks` / `live` / `results` / `rsvp`). M4 replaces the localStorage gate with the platform auth (`isAdmin` from `usePlatformAuth`), reframes the 5 tabs into 6 (Grande Finale split out, Decks merged into Setup), and pipes every mutation through SECURITY DEFINER RPCs.

### 2.1 SETUP — editions, sessions, roles, session_config seeding

The setup tab is the operations bootstrap: every other tab presupposes that the admin has created the edition, set the dates/prizes/rules, seeded the 6 sessions (5 qualifying + 1 finale) and one `session_config` row per session.

**A. Editions panel** — list of all editions with status badge (`draft|open|selection|sessions|finale|closed`). Actions:
- **Create edition** — modal with `Field`/`TextInput`/`DateField` for `id` (text), `name`, `year`, `application_open`, `application_close`, `selection_date`, `finale_date`, `awards_date`, `prize_main`, `prize_special`, `finalists_per_session` (default 1), `public_results_enabled` (default false), and a JSON editor for `eligibility_rules` seeded from the 2026 defaults (read from the latest closed edition).
- **Edit edition** — same modal pre-filled. All writes go through the existing `editions_admin` RLS policy (`has_platform_role('admin')`) — direct table writes are fine because the policy is already strict.
- **Open / Close** — convenience buttons that flip `status` between `'draft'` / `'open'` / `'selection'` / `'sessions'` / `'finale'` / `'closed'`. **No state machine enforcement** in v1; the field is free text per the foundation migration. (Open question §11.4 — should we add a SQL CHECK to constrain the values?)
- **Eligibility rules editor** — see §2.2.

**B. Sessions panel** (scoped to the selected edition) — list of `sessions` rows ordered by `position`. The 5 qualifying + 1 finale are the canonical template ; admin can edit `name`, `theme`, `kind` (`qualifying|finale`), `session_date`, `position`. Bulk action "Reset to RSA 2026 template" pre-fills 5 clusters + 1 finale with the canonical labels from `SESSIONS` in `constants.js` (so a new edition is one click away from a working setup).

> **Important — seed `session_config` rows on session create.** The current
> operational blocker (cited in the mission) is that `rsa_lock_session` and
> `rsa_publish_session` `UPDATE public.session_config WHERE session_id = …` —
> if no row exists for that `session_id`, the UPDATE is a silent no-op and the
> RPCs fail to flip the lifecycle. The session-create RPC `rsa_create_session`
> (§7.1) MUST `INSERT INTO public.session_config (session_id, status, …)
> VALUES (…, 'draft', …) ON CONFLICT DO NOTHING` so that every freshly-seeded
> session has a `session_config` row at the moment it appears in the cockpit.
> The same RPC seeds the `dev_*` rows for the dev edition.

**C. Roles panel** — admin-provisioning of jury + comité members. The `app_user_roles` table is `service_role`-only writable today (C1 hardening). M4 closes that gap with a single SECURITY DEFINER RPC `rsa_assign_role(p_email, p_roles)` (§6.2) checked against `has_platform_role('admin')`. UI shape:

- A **two-column form**: `email` (lowercased on input, `Field`/`TextInput`) + a multi-select `TagSelect` of `roles` (`startup`/`jury`/`comite`/`admin`).
- A **list** of all existing `app_user_roles` rows (admin can read all via a new admin-read policy or via a `SECURITY DEFINER` read RPC `rsa_list_app_user_roles()` since the table is `self_read` only by default).
- Per-row inline edit (replace the `roles` array) and delete (`rsa_revoke_role`).
- **Audit metadata** : we add a `granted_by uuid references auth.users(id)` and `granted_at timestamptz default now()` column on `app_user_roles` so we always know who provisioned whom (open question §11.5 — confirm).
- **Safety rail** : the admin RPC must refuse self-demotion as the only admin (count remaining admins; if `roles` excludes `'admin'` and the caller is the last admin, raise).

**D. Per-session `session_config` editor** (advanced, collapsed by default per session row). Shows: `status`, `session_order text[]`, `teams_link text`, `jury_pack_path text`, `final_ranking jsonb` (read-only — populated by `rsa_publish_session`). Admin can manually edit `session_order` (drag-and-drop sortable list of startup names — port from legacy `SetupTab.jsx`) and `teams_link`. Status transitions go through the lifecycle RPCs (LIVE tab), not this editor.

**E. Decks (merged into SETUP)** — the legacy `DecksTab` was a per-session per-startup file upload panel scoped to the 2026 `startup_confirmations` table. Module 1 already covers the candidate-side upload to `dossiers` bucket. SETUP shows, per session, the list of `startups` rows joined to their `pitch_deck_path` / `exec_summary_path` (signed URL on click). Admin can:
- **Upload on behalf** of a candidate (rare, used when admin receives a deck by email and uploads it for the candidate). Uses the same `dossiers_insert` policy (which allows comité/admin path-free).
- **Trigger the pre-session pack build** (§6.5) — calls the `consolidate-jury-pack` Edge function with `session_id` ; the function writes the consolidated PDF and updates `session_config.jury_pack_path`. M3 jury hub picks it up automatically.

### 2.2 Eligibility rules editor

A small JSON editor (left = source JSON `Textarea`, right = live preview rendered as a hairline list with the trilingual rule labels from `@/components/rsa/candidature/i18n.js` `RULE_LABELS`). On save, the JSON is validated client-side (every key must be one of the known rules; every entry must have a `behavior ∈ {'exclu','flag'}`). The write is a plain `editions.update({eligibility_rules: ...})` (admin RLS already allows it).

**Note:** this is a 2026/2027 stop-gap. A schema-driven editor (form per rule with typed inputs) is a follow-up. Open question §11.4.

### 2.3 LIVE — real-time scoring grid

The crown jewel of the cockpit on session day. Port from `LiveTab.jsx` (legacy) with these changes:

- **Data source** : `platform_jury_scores` + `platform_jury_score_drafts` (not the legacy `jury_scores`). Joined to `platform_jury_assignments` to know which jurors should appear as columns.
- **Realtime** : subscribe to both tables via `supabase.channel().on('postgres_changes', …)`. The legacy `LiveTab` already subscribes to `JuryScore` ; we add a second subscription on `platform_jury_score_drafts` so the admin sees jurors *in flight* (the cells show `—`, `N/6`, or `avg/5` per state). This is the gold value of LIVE vs the post-hoc Results view.
- **Cell shape** (`<ScoreCell>`) :
  - `—` (MUTED): no draft yet.
  - `n/6` (OCHRE_TINT/OCHRE): partial draft — n criteria filled. (Read from drafts table.)
  - `avg/5` in `tabular-nums` (NAVY): submitted final row (from `platform_jury_scores`, weighted score = `rsa_weighted_score`). Clicking opens a drawer with the 6-criterion breakdown + comment (port `LiveTab` `<DetailDrawer>`).
- **Row aggregates** : per startup, weighted avg across submitted final rows + `n/total_jurors`.
- **Lifecycle controls** (top right of grid): three buttons per state transition, each calling its RPC :
  - `Open scoring` → `rsa_set_session_live(p_session_id)` (new RPC, §7.3).
  - `Lock session` → `rsa_lock_session(p_session_id)` (existing from M3).
  - `Publish results` → opens the RESULTS tab (publish is from there, not from LIVE — separation of concerns).
- **Comité visibility** — open question §11.3 ; if accepted, comité-role users can land on LIVE in **read-only** (no transition buttons), via a `usePlatformAuth().isComite` branch.

### 2.4 RESULTS — palmarès, finalists picker, cross-session view

Two sub-views, toggled by a top tab:

**A. Per-session palmarès** (default when entering RESULTS from a single-session selector).
- Header : session card with `StatusPill kind="jury"` (locked / published), session date, finalists count chip (`N=1`).
- **Auto-projection** is what `rsa_publish_session` does (already shipped in M3): it ranks startups by avg weighted score, picks top-N, sets `startups.status = 'finaliste'` on the top-N (sentinel-bypass).
- **Admin override** (new) — the RESULTS view of a `LOCKED` session lets admin re-pick the top-N before publishing : a draggable list of all startups, the top-N highlighted (gold pill + `Finaliste` chip). On save → `rsa_set_session_finalists(p_session_id, p_startup_ids uuid[])` (new RPC, §7.4) writes the picks **without** flipping status (so admin can iterate). On publish → calls `rsa_publish_session` which now reads the manual overrides (see §7.5 for the RPC change).
- **Tie-break** : ties at the cutoff are surfaced explicitly — a discreet warning `« Égalité au seuil top-N : … »` invites the admin to use the override picker. Default tie-break (when admin does nothing) stays the SQL one (`startup_name ASC`).
- **Publish action** (`Publish results`) — opens a **typed confirmation** modal mirroring the legacy `ResultsTab.publish()` flow ("type PUBLISH to confirm") but with one extra check on the finale (acknowledging that the lauréat will be auto-set if `auto_proclaim_finale = true`, see §4.3).
- **CSV download** — port from legacy (rank, startup, avg, final_score, juror_count, override note).

**B. Per-edition cross-session view** (new, replaces the implicit "5 sessions side-by-side" view that admins were building manually).
- For each session in the edition, a small card with `StatusPill`, finalist name (if published), and a chevron to open its per-session view.
- A **stack overview** at the top: progress bar 0/6 → 6/6 sessions published. Once at 6/6, a celebratory hint "L'édition peut être verrouillée — passez le statut sur `closed` depuis SETUP".

### 2.5 GRANDE FINALE — see §4

### 2.6 RSVP — see §5

### 2.7 COMMUNICATIONS — see §6

---

## 3. Public palmarès — `/Resultats`

A new page `src/pages/Resultats.jsx` (auto-registered, **must be added to `STANDALONE_PAGES`** in `Layout.jsx` so the lunch chrome doesn't wrap it). **No auth.** Editorial Élysée style, trilingual via `useLang()`.

### 3.1 Routing & gate

- Default behaviour: when accessed without query params, the page resolves the **most recent edition with `public_results_enabled = true`** (server-side query, RLS-friendly — see §3.4 below) and renders it.
- A trailing query param `?edition=<id>` lets admin / partners deep-link a specific edition.
- If no edition has `public_results_enabled = true`, render an editorial empty state ("Le palmarès sera publié prochainement.") — never expose unpublished data.

### 3.2 Page structure

The page lives in the narrow editorial container (`max-w-[680px]`). Sections:

1. **Hero** — Eyebrow "Palmarès" + EditorialTitle `Rotary Startup Award {year}` lead + italic accent `{edition.name}`. Below: a small meta line — finale date (formatted trilingually), venue from `SESSIONS[final_grande].venue`.
2. **Lauréat — Grande Finale** (`HeroEventCard` adapted) — gold-light tinted card, Playfair name in 32px, score `XX/5 — moyenne jury N`. Editorial flourish, no emoji/trophy decoration in chrome (the existing landing palmarès on the wild does use 🏆 — keep as **content** if user prefers, see §11.6).
3. **Podium** (top 3 of the Grande Finale) — three hairline cards with `#1 / #2 / #3` + name + score. Hidden if N=1 (no podium below the lauréat).
4. **Palmarès par session** — `UpcomingList`-style numbered editorial list of each session's top-N finalist(s) with: session name (Playfair italic for the cluster name), date, and the finalist name(s) + score. **No grand prize amount** in the public page (avoid prize-amount comparisons that age badly — open question §11.6).
5. **Méthodologie** — small editorial card (collapsible) explaining the 6 criteria with their weights (resolved via `getCriterion(c, lang)`) and the formula. Mirrors the live landing's "Critères d'évaluation" block.
6. **Footer hairline** — "Rotary Startup Award {year} · Commission Paris" + a single link "Voir l'édition {year+1} →" if a newer published edition exists.

### 3.3 Components used

All Élysée editorial components, none new : `PageShell` (narrow), `Eyebrow`, `EditorialTitle`, `HeroEventCard` (re-purposed for the lauréat — pass `event = { name: winner.startup, speaker: '...', ... }` shape), `ActionRow` (for the méthodologie collapse trigger), `UpcomingList` (for the per-session palmarès — the `events` shape maps naturally to `{ id: session.id, name: winner.startup, type: session.theme, date: ... }`).

> The existing live landing's palmarès page on `rotary-startup.org` is the
> brand source of truth for editorial tone (memory `project_redesign_elysee`).
> `/Resultats` mirrors that voice — institutional, celebratory, never loud.

### 3.4 Data — SAFE view for public reads

The Module-1 hardening migration left `editions_read` as `using (status <> 'draft' OR is_staff)` — that already restricts the read to non-draft editions, but it exposes `eligibility_rules` (acceptably so, per the documented trade-off). For the public palmarès we want a **column-restricted, gate-on-`public_results_enabled`** read.

Two viable shapes, we recommend **(B)**:

| Option | Pros | Cons |
|--------|------|------|
| **A. Refine `editions_read` policy** to add `AND public_results_enabled = true` to the anon branch. | Simplest — no new view. | Couples public read with all `editions` columns; the page also needs `sessions` + `startups` (only the finalist subset) + `session_config.final_ranking` (only published ones). Can't column-mask. |
| **B. SAFE view `public_palmares` (recommended)** | One read endpoint, exposes only the columns the public page needs (no `eligibility_rules`, no `email`, no `eligibility` JSON, no contact info). RLS / GRANT on the view. | One extra DB object + one view-refresh consideration. |

**Recommended view** :

```sql
create or replace view public.public_palmares as
  select
    e.id            as edition_id,
    e.name          as edition_name,
    e.year          as edition_year,
    e.finale_date,
    e.awards_date,
    e.finalists_per_session,
    s.id            as session_id,
    s.name          as session_name,
    s.theme         as session_theme,
    s.kind          as session_kind,
    s.session_date,
    s.position      as session_position,
    sc.final_ranking,           -- jsonb (snapshotted by rsa_publish_session)
    sc.status       as session_status,
    sc.published_at
  from public.editions e
  join public.sessions s on s.edition_id = e.id
  left join public.session_config sc on sc.session_id = s.id
  where e.public_results_enabled = true
    and sc.status = 'published';

-- Grant SELECT to anon + authenticated (the view is gated by its WHERE clause).
grant select on public.public_palmares to anon, authenticated;
```

The view **deliberately omits**: any candidate PII (email, phone, contact_person), any unpublished session, any draft edition, any `eligibility` snapshot, any `selection_reviews` row.

Startup names appear via the `final_ranking` jsonb (already a `[{startup_id, startup_name, avg, n_jurors, final_rank}, …]` shape per the M3 RPC). The view's `final_ranking` jsonb is the only place a startup name enters the public read — so it's controlled.

### 3.5 Resolving the lauréat for the hero

```js
// src/lib/rsa/palmares.js
import { supabase } from '@/lib/supabase';
import { FINAL_SESSION_ID } from '@/lib/rsa/constants';

export async function fetchPalmares(editionId) {
  let q = supabase.from('public_palmares').select('*');
  if (editionId) q = q.eq('edition_id', editionId);
  const { data, error } = await q;
  if (error) throw error;
  return data || []; // one row per published session of the edition
}

export function pickLaureat(rows) {
  const finaleRow = rows.find((r) => r.session_kind === 'finale');
  if (!finaleRow?.final_ranking?.length) return null;
  return finaleRow.final_ranking.find((r) => r.final_rank === 1) || null;
}
```

### 3.6 i18n & tone

Same `useLang()` hook + co-located dictionary `src/components/rsa/resultats/i18n.js`. Tone matches the live landing palmarès page: institutional + celebratory (« Le lauréat du Rotary Startup Award {year} », « Les finalistes par session »).

---

## 4. Grande Finale — model & flow

The **finale** is a session with `kind = 'finale'` and an admin-curated roster of finalists drawn from the 5 qualifying sessions' published lauréats. Two clean shapes are possible; we recommend **(B)**.

### 4.1 Two shapes & the chosen one

| Option | Shape | Pros | Cons |
|--------|-------|------|------|
| **A. Move dossier to the finale session** | On `Add to finale`, reassign `startups.session_id = 'final_grande'` (or `dev_final_grande`). The dossier hops sessions. Finale jury reads the same `startups` rows. | Single `session_id` per dossier — clean. The existing M3 RLS / assignments work without change. | Loses the dossier's "I qualified through Session X" trace ; breaks `platform_jury_scores.session_id` denormalisation for the qualifying-session scores (they'd point to a session the dossier no longer belongs to). |
| **B. Keep dossier on its qualifying session, add a `finale_membership` table (recommended)** | Dossier keeps its `session_id = 's3_tech'`. A new table `platform_finale_membership (edition_id, startup_id, source_session_id, pitch_order int, added_by uuid, added_at timestamptz)` says "this dossier is in the finale of edition X". The finale jury reads the finalists through this table joined to `startups`. | Preserves audit. Plays well with M3 (qualifying scores stay attached to their session ; finale scores attach to `final_grande` with their own `platform_jury_scores` rows). Allows runner-up swaps without rewriting history. | One new table + one new join surface in the LIVE/RESULTS queries for the finale. |

We pick **(B)** because the audit story (« cette startup a gagné session 3, puis a fini deuxième en finale ») is exactly what the platform must remember, and B keeps M3's denormalised `session_id` semantics intact.

### 4.2 `platform_finale_membership` migration

```sql
create table if not exists public.platform_finale_membership (
  edition_id        text not null references public.editions(id) on delete cascade,
  startup_id        uuid not null references public.startups(id) on delete cascade,
  source_session_id text not null references public.sessions(id),
  pitch_order       int  not null default 0,                     -- 1..N in the finale
  added_by          uuid references auth.users(id),
  added_at          timestamptz not null default now(),
  primary key (edition_id, startup_id)
);
create index if not exists pfm_edition_idx       on public.platform_finale_membership(edition_id);
create index if not exists pfm_source_session_idx on public.platform_finale_membership(source_session_id);
alter table public.platform_finale_membership enable row level security;

-- Read: any authenticated user can see who's a finalist (jury needs it for the
-- finale pack ; comité / admin always ; candidates discover this via the public
-- /Resultats page, so finale membership of a published edition is not secret).
create policy pfm_read on public.platform_finale_membership for select
  to authenticated using (true);

-- Write: admin only (provisioned via the picker UI + the dedicated RPC).
create policy pfm_admin_write on public.platform_finale_membership for all
  to authenticated
  using  (public.has_platform_role('admin'))
  with check (public.has_platform_role('admin'));
```

### 4.3 Workflow

1. **Auto-projection on qualifying-session publish.** When admin publishes a qualifying session via `rsa_publish_session`, the RPC (extended in M4 — see §7.5) auto-inserts the top-N (default 1) into `platform_finale_membership` with `source_session_id = <published session>` and `pitch_order = 0` (admin sets order later). **Idempotent** — `ON CONFLICT DO NOTHING`. (This replaces the legacy `ResultsTab.publish()` flow that auto-added the winner to `startup_confirmations(session_id = final_grande)` — same idea, cleaner table.)
2. **Manual finalist picker** (GRANDE FINALE tab) — admin sees the current finalist roster + the published runner-ups per session. Two actions per row:
   - **Swap with runner-up** — call `rsa_swap_finalist(p_edition_id, p_remove_startup, p_add_startup)` (single transaction: delete + insert).
   - **Remove from finale** — call `rsa_remove_finalist(p_edition_id, p_startup_id)`. Re-added on a later publish via auto-projection.
3. **Pitch order** — drag-and-drop reorders the finalists ; `rsa_set_finale_pitch_order(p_edition_id, p_ordered_startup_ids uuid[])` writes the `pitch_order` integers (1..N) in one transaction.
4. **Finale jury** — same UI as qualifying-session jury assignment but scoped to `session_id = final_grande` (or `dev_final_grande`). Reuses `platform_jury_assignments` directly — no schema change.
5. **Finale scoring** — uses M3's `platform_jury_scores` table; the RPC `rsa_submit_jury_score` already checks `rsa_can_score(session_id)`. But the legacy M3 flow expects the dossier to have `session_id = p_session_id`. **In option B the dossiers keep their qualifying `session_id`**, so the RPC check `v_sid_db <> p_session_id` would fail. Fix : the RPC is extended to **allow finale-session submissions** via a second branch — `OR EXISTS (SELECT 1 FROM platform_finale_membership WHERE edition_id = <of dossier> AND startup_id = p_startup_id AND <finale session is the canonical finale for that edition>)`. See §7.6 for the migration sketch.
6. **Lock & Publish finale** — same `rsa_lock_session` / `rsa_publish_session` RPCs, but `rsa_publish_session` is taught to **read from `platform_finale_membership`** instead of `startups.session_id` when the session kind is `finale` (the dossier never moved to the finale session). See §7.5.
7. **Proclaim lauréat** — once the finale is published, admin clicks `Proclaim lauréat` which calls `rsa_proclaim_winner(p_startup_id, p_prize text)` — sets `startups.status = 'laureat'`, stores the prize info on `startups.prize text` (new column, §4.4), and (optionally) flips `editions.public_results_enabled = true` so `/Resultats` goes live.

### 4.4 `startups.prize` column

Add a free-text `prize text` column on `startups` so the lauréat row carries the prize label ("Lauréat 5 000 €" / "Prix Spécial Greentech 1 500 €" / "Coup de Cœur du Jury"). Free text rather than a foreign key because prizes are editorial copy that changes per edition (default values for 2026 come from `editions.prize_main` / `editions.prize_special` — auto-suggested in the proclaim modal).

```sql
alter table public.startups
  add column if not exists prize text;
-- Locked from candidate self-update by the existing startups_guard_update trigger
-- (extended in M4 to include this column — §8.1).
```

### 4.5 Status lifecycle — clarification

The legacy lifecycle (foundation `:65`) ends at `'laureat'`. M4 makes the transitions explicit :

| From | To | Trigger |
|------|-----|--------|
| `note` | `finaliste` | `rsa_publish_session` on the qualifying session (top-N) OR manual `rsa_set_session_finalists` |
| `finaliste` | `laureat` | `rsa_proclaim_winner` (admin manual) |
| `affecte` | `note` | `rsa_lock_session` |
| any | `laureat` | `rsa_proclaim_winner` (admin can flip directly if needed) |

**Recommendation:** the lauréat transition is **always admin-triggered** via `rsa_proclaim_winner` — never an automatic projection from `rsa_publish_session` on the finale. This preserves the editorial moment of the announcement (admin presses one button after the finale on stage, the public palmarès flips live).

---

## 5. RSVP — refactor `rsa_finale_rsvp` → `platform_finale_rsvp`

### 5.1 Why a refactor

The legacy `rsa_finale_rsvp` (`supabase/migrations/20260501_rsa_finale_rsvp.sql`) is **fully open** (`using (true) with check (true)`) — anon writes are possible from anywhere. That worked for the one-off 2026 event but doesn't scale to multi-edition. The new shape:

- Keys on `edition_id` (so multi-edition is native).
- RLS: **anon insert allowed** (so the public RSVP form works without auth), but staff-only read + admin-only update/delete.
- Adds `attending boolean` (already there), `party_size`, `source_session_id`, `message`, plus a `created_at` index for the admin queue. Drops the free-text `role check` and uses a `text not null` `role` (still `pitcher|visitor|jury` as a soft enum).
- The legacy table **stays untouched** as 2026 archive (read-only via legacy `RsvpTab` reading from `FinaleRsvp` entity — kept for backward compat).

### 5.2 Migration

```sql
create table if not exists public.platform_finale_rsvp (
  id                uuid primary key default gen_random_uuid(),
  edition_id        text not null references public.editions(id) on delete cascade,
  role              text not null check (role in ('pitcher','visitor','jury')),
  prenom            text not null,
  nom               text not null,
  organisation      text,
  email             text not null,
  telephone         text,
  startup_name      text,
  source_session_id text references public.sessions(id),
  attending         boolean not null,
  party_size        int not null default 1 check (party_size between 1 and 20),
  message           text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists pfr_edition_idx on public.platform_finale_rsvp (edition_id);
create index if not exists pfr_role_idx    on public.platform_finale_rsvp (role);
create index if not exists pfr_email_idx   on public.platform_finale_rsvp (email);
create index if not exists pfr_created_idx on public.platform_finale_rsvp (created_at desc);

alter table public.platform_finale_rsvp enable row level security;

-- Public INSERT — the form is open (no auth). We rely on:
--   * a Cloudflare Turnstile / hCaptcha challenge at the form layer (open Q §11.10) ;
--   * a backend rate-limit at the Edge function `rsvp_submit` layer (recommended ; see §6.5).
-- The simpler v1 is direct table INSERT from the anon client (mirrors legacy) ; v1.1 adds
-- the Edge function wrapper for rate-limiting.
create policy pfr_public_insert on public.platform_finale_rsvp for insert
  to anon, authenticated
  with check (true);  -- the form gates fields; no privilege gate at RLS level for INSERT

-- Read: staff (comité + admin). Jury does NOT read all RSVPs (privacy).
create policy pfr_staff_read on public.platform_finale_rsvp for select
  to authenticated
  using (public.has_platform_role('comite') or public.has_platform_role('admin'));

-- Update/Delete: admin only.
create policy pfr_admin_write on public.platform_finale_rsvp for update
  to authenticated
  using (public.has_platform_role('admin')) with check (public.has_platform_role('admin'));
create policy pfr_admin_delete on public.platform_finale_rsvp for delete
  to authenticated using (public.has_platform_role('admin'));

-- Realtime for the admin RSVP tab.
alter publication supabase_realtime add table public.platform_finale_rsvp;
```

### 5.3 Public RSVP form route

A new public page `src/pages/RsvpFinale.jsx` (no auth, **add to `STANDALONE_PAGES`**). Two access modes:

- **Direct link** : `/RsvpFinale?edition=2026` — resolves the edition + finale session by `kind='finale'` and renders the form. The form picks `role` (`pitcher|visitor|jury`), then the identity/contact fields. Submit posts directly to `platform_finale_rsvp` (or via the Edge function — §6.5).
- **Token-protected link** (optional, for emailed invites): `/RsvpFinale?edition=2026&t=<token>` — the token is opaque, validated by an Edge function `rsa_validate_rsvp_token` that pre-fills `prenom/nom/email/role` and persists `source_session_id` if the recipient is a known finalist or juror. (Token signed with the service-role key, includes a TTL. Open question §11.10.)

The form is a polished port of the legacy `RsaFinaleRsvp.jsx`, restyled to Élysée (no off-palette role pills — reuse `RadioYesNo` for attending, `ActionRow` tints for role selection; the legacy tile-styling can be preserved as content shells).

### 5.4 Admin RSVP tab

Port of legacy `RsvpTab.jsx` :
- Top stats row : Total / Yes / No / Pending / Headcount (sum of `party_size`).
- Filters : role / attending status / search.
- List : editorial rows (the legacy zebra/table is dropped — use `ListRow`/hairline rows per design book §5.5).
- Actions : Copy emails (filtered), Download CSV, Delete row.
- **Synthetic "expected jurors" rows** (legacy feature) : same idea but reads from `platform_jury_assignments` joined to `auth.users(email)` and `platform_finale_membership` (so the admin sees every expected attendee — pitchers + jurors + actual respondents). Jurors who haven't RSVP'd appear as "attendu, pas de réponse".
- **Send invite** : per row, a button "Renvoyer le lien RSVP" calling the Communications path (§6).

---

## 6. Communications — post-event email blasts

### 6.1 Scope

Five canonical email kinds, all branded Élysée per `docs/design/email-templates/README.md` conventions, all trilingual (FR/EN/DE picked per recipient when known, defaulted from the recipient's edition-side metadata otherwise) :

| Kind | Recipients | Trigger |
|------|------------|---------|
| `winners_announce` | All candidates of the edition + jury + comité + sponsors | After `rsa_proclaim_winner` on the finale |
| `jury_thanks` | All finale jurors + qualifying jurors of the edition | Admin click after finale |
| `sponsors_thanks` | Partner institutions / sponsors list (free email list) | Admin click after finale |
| `candidates_recap` | All candidates of the edition (winners + losers) — per-edition retrospective with the published palmarès link | Admin click after finale |
| `custom` | Free recipient list | Ad-hoc, admin authors |

### 6.2 Data — `platform_communications` table

```sql
create table if not exists public.platform_communications (
  id                  uuid primary key default gen_random_uuid(),
  edition_id          text not null references public.editions(id) on delete cascade,
  kind                text not null check (kind in ('winners_announce','jury_thanks','sponsors_thanks','candidates_recap','custom')),
  subject_html        text not null,                -- subject line (HTML-safe, may include · / —)
  body_html           text not null,                -- full HTML body (Élysée template)
  recipient_segment   text not null,                -- jsonb-ish text describing the segment (audit only)
  scheduled_at        timestamptz,                  -- optional admin-scheduled send
  sent_at             timestamptz,
  sent_count          int not null default 0,
  failed_count        int not null default 0,
  last_error          text,
  created_by          uuid references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists pc_edition_idx on public.platform_communications (edition_id);
create index if not exists pc_sent_idx    on public.platform_communications (sent_at desc);
alter table public.platform_communications enable row level security;

-- Read: comité + admin (audit visibility).
create policy pc_staff_read on public.platform_communications for select
  to authenticated
  using (public.has_platform_role('comite') or public.has_platform_role('admin'));

-- Write: admin only. We do NOT REVOKE writes here because the send goes through an
-- Edge function (§6.4) anyway ; admin can create/draft directly.
create policy pc_admin_write on public.platform_communications for all
  to authenticated
  using (public.has_platform_role('admin')) with check (public.has_platform_role('admin'));
```

The body is stored **rendered HTML** (not a template + variables) — the admin sees in the editor exactly what's sent. Idempotency is enforced by `sent_at IS NOT NULL` (the Edge function refuses to re-send a row that already has `sent_at`).

### 6.3 Editor UX

- Per kind, a **template loader** prefills `subject_html` + `body_html` from a static catalog `src/components/rsa/admin/communications/templates/<kind>.{fr|en|de}.js` (port the legacy `CommunicationsSection.jsx` builders, restyled to Élysée tokens — see §6.6).
- Side-by-side **preview** (rendered iframe with the Élysée email shell).
- **Recipient segment** : a small panel listing the resolved emails per language (FR/EN/DE buckets), with manual exclusion checkboxes per row. Email picker shape is the same as the legacy `CommunicationsSection` (juryByLang / winnerEmail / losersByLang).
- **Send** : button "Envoyer maintenant" calls `rsa_send_communication(p_communication_id)` Edge function (§6.4). Admin sees a live progress bar and final report (sent N / failed M / first error line). Confirmed twice (typed `ENVOYER`).

### 6.4 Send path — Edge function preferred over RPC

| Option | Pros | Cons |
|--------|------|------|
| **A. RPC** `rsa_send_communication(uuid)` | Same SECURITY DEFINER pattern as the rest of M3/M4. | RPCs can't make outbound HTTP from Supabase by default (no `pg_net` reliance here ; works but adds an extension dependency). Slow loops over 200+ recipients block a transaction. |
| **B. Edge function** `rsa_send_communication` (recommended) | Outbound HTTP / SMTP natively. Can stream progress back. Authenticated via the user's JWT — the function checks `has_platform_role('admin')` server-side before sending. | One more deploy target. |

We pick **(B)**. The Edge function (Supabase Functions runtime, Deno) :
1. Validates JWT carries an admin role (via `supabase.auth.getUser()` + a `select roles from app_user_roles where email = …`).
2. Reads the `platform_communications` row by `id`.
3. Refuses if `sent_at is not null` (idempotency).
4. Resolves recipients via the row's `recipient_segment` (a small JSON like `{"kind":"jury_thanks","edition_id":"2026","exclude":[]}` parsed server-side — single source of truth for the segment definitions).
5. For each recipient, POSTs to the configured SMTP provider (Resend in production — see `docs/deepsolve/email-smtp-resend-setup.md`). Tracks success/failure per email.
6. Writes `sent_at = now()`, `sent_count = N`, `failed_count = M`, `last_error = …` back to the row.

In dev / test, the function can pipe to Supabase Auth's built-in SMTP (low daily quota — fine for staging) — see open question §11.1.

### 6.5 RSVP Edge function (rate-limit wrapper, optional v1.1)

`rsa_rsvp_submit` — a thin wrapper around the `platform_finale_rsvp` insert:
- Validates Turnstile / hCaptcha token if provided.
- Rate-limits by IP (token-bucket in a tiny Redis or in-table — for the scale of one finale, an in-table `rsvp_rate_limits` is enough).
- Validates the magic-link token (§5.3) when present, pre-fills metadata.
- Inserts the row server-side, returns the row.

Not blocking for M4a/b — ship in M4c alongside `rsa_send_communication`.

### 6.6 Élysée HTML email templates

Port the legacy `CommunicationsSection.jsx`'s text builders into proper HTML templates that follow the conventions in `docs/design/email-templates/README.md`:
- `<table>` + inline styles only.
- `@import` Playfair + Inter with serif/sans fallbacks.
- Hex palette inlined from `tokens.js`.
- Bulletproof CTA button (NAVY fill, white text).
- Footer hairline with contact + trilingual "if you didn't request this, ignore" disclaimer.
- A single new template per kind (5 templates × 3 languages = 15 HTML strings). Stored as `.html` strings in `src/components/rsa/admin/communications/templates/`, one file per `kind` exporting `{ subjectFr, subjectEn, subjectDe, bodyFr, bodyEn, bodyDe }`.

The legacy plain-text bodies (FR / EN / DE) inside `CommunicationsSection.jsx` (e.g. `buildJuryTemplate`, `buildWinnerTemplate`, `buildLoserTemplate`) are the editorial source — copy across, wrap in the Élysée HTML shell.

### 6.7 Consolidate-jury-pack Edge function retarget (M3 deferred)

The legacy `supabase/functions/consolidate-jury-pack/index.ts` reads from the 2026 schema (`startup_confirmations` + public `uploads` bucket). M4 retargets it:
- **Input** : `session_id` (same — the function signature stays stable).
- **Reads** : `startups` joined to `session_id` for the qualifying sessions, OR joined to `platform_finale_membership` when `kind='finale'`. Reads `pitch_deck_path` / `exec_summary_path` from the **private `dossiers` bucket** via service-role download.
- **Output** : writes the consolidated PDF to `dossiers/jury_packs/{edition_id}/{session_id}-{ts}.pdf` (new prefix in the private bucket — Storage RLS already covers it via `is_dossier_staff`), updates `session_config.jury_pack_path`.
- **Trigger** : admin button in SETUP tab (M4) or auto on session-create RPC (open Q §11.7 — recommend manual admin trigger).

---

## 7. New RPCs & data layer

All RPCs are SECURITY DEFINER, REVOKE from `public, anon`, GRANT to `authenticated`, role-check in body.

### 7.1 `rsa_create_session(p_edition_id text, p_session jsonb)`

Inserts a session row (`id`, `name`, `theme`, `kind`, `session_date`, `position`) AND seeds the `session_config` row in the same transaction:

```sql
create or replace function public.rsa_create_session(p_edition_id text, p_session jsonb)
returns public.sessions
language plpgsql security definer set search_path = public as $$
declare v_row public.sessions;
begin
  if not public.has_platform_role('admin') then
    raise exception 'forbidden:not_admin' using errcode = '42501';
  end if;
  insert into public.sessions (id, edition_id, name, theme, kind, session_date, position)
    values (
      p_session->>'id', p_edition_id, p_session->>'name', p_session->>'theme',
      coalesce(p_session->>'kind', 'qualifying'),
      (p_session->>'session_date')::date,
      coalesce((p_session->>'position')::int, 0)
    ) returning * into v_row;
  insert into public.session_config (session_id, status)
    values (v_row.id, 'draft')
    on conflict (session_id) do nothing;
  return v_row;
end$$;
revoke all on function public.rsa_create_session(text, jsonb) from public, anon;
grant execute on function public.rsa_create_session(text, jsonb) to authenticated;
```

### 7.2 `rsa_assign_role(p_email text, p_roles text[])` & `rsa_revoke_role`

```sql
create or replace function public.rsa_assign_role(p_email text, p_roles text[])
returns public.app_user_roles
language plpgsql security definer set search_path = public as $$
declare v_row public.app_user_roles;
begin
  if not public.has_platform_role('admin') then
    raise exception 'forbidden:not_admin' using errcode = '42501';
  end if;
  -- Safety rail: if removing 'admin' from someone, ensure at least one admin remains.
  if not ('admin' = any(p_roles)) then
    if (select count(*) from public.app_user_roles
         where 'admin' = any(roles) and lower(email) <> lower(p_email)) = 0 then
      raise exception 'last_admin_protection' using errcode = 'P0001';
    end if;
  end if;
  insert into public.app_user_roles (email, roles, granted_by, updated_at)
    values (lower(p_email), p_roles, auth.uid(), now())
    on conflict (email) do update
      set roles = excluded.roles,
          granted_by = excluded.granted_by,
          updated_at = now()
    returning * into v_row;
  return v_row;
end$$;
revoke all on function public.rsa_assign_role(text, text[]) from public, anon;
grant execute on function public.rsa_assign_role(text, text[]) to authenticated;
```

Plus a read RPC for the admin list (since `app_user_roles` has only a self-read policy):

```sql
create or replace function public.rsa_list_app_user_roles()
returns setof public.app_user_roles
language sql security definer set search_path = public as $$
  select * from public.app_user_roles
   where public.has_platform_role('admin')
   order by updated_at desc;
$$;
revoke all on function public.rsa_list_app_user_roles() from public, anon;
grant execute on function public.rsa_list_app_user_roles() to authenticated;
```

> **Design note — admin-DEFINER bypass acceptable?** The C1 hardening pinned
> `app_user_roles` writes to `service_role` because the table is the root of
> trust. Adding an admin-only DEFINER RPC is **acceptable** because (a) the
> caller is checked against `has_platform_role('admin')`, which itself reads
> the locked table — circular but safe (the first admin must be bootstrapped
> via service_role / Supabase Studio, exactly as today) ; (b) the
> last-admin-protection rail prevents self-lockout ; (c) the RPC writes a
> small audit trail (`granted_by`, `updated_at`).
> **Flag for human review**: confirm this is the desired pattern. Alternative
> is to keep the table service-role-only and have admins use Supabase Studio
> for role grants (operationally painful — the user said the cockpit should
> "manage `app_user_roles` via SECURITY DEFINER RPC since the table is
> service_role-only writable").

### 7.3 `rsa_set_session_live(p_session_id text)`

Flips `session_config.status = 'live'`, sets `activated_at = now()`. Admin only. Mirrors `rsa_lock_session` / `rsa_publish_session` patterns.

### 7.4 `rsa_set_session_finalists(p_session_id text, p_startup_ids uuid[])`

Admin override of the top-N finalist picks for a session. Validates the startups belong to the session, stores the picks in a new `session_config.manual_finalists uuid[]` column (cheap migration), so `rsa_publish_session` reads them when present.

```sql
alter table public.session_config
  add column if not exists manual_finalists uuid[];
```

### 7.5 `rsa_publish_session` — extended

The M3 RPC ranks startups by avg weighted score and sets `status = 'finaliste'` on the top-N. M4 extends it :
- **Read finalists override** : if `session_config.manual_finalists` is non-null, use it instead of the top-N projection.
- **Finale branch** : if `sessions.kind = 'finale'`, read participating startups from `platform_finale_membership` (not from `startups.session_id`).
- **Auto-add winner to finale roster** : if `kind = 'qualifying'`, insert top-N into `platform_finale_membership` (`ON CONFLICT DO NOTHING`).
- **No status change on the finale** — `rsa_publish_session` for the finale snapshots the ranking but does **not** flip `startups.status = 'laureat'`. The lauréat transition is admin-triggered via `rsa_proclaim_winner` (§7.7).

### 7.6 `rsa_submit_jury_score` — extended for the finale

The current M3 RPC checks `v_sid_db = p_session_id` (the dossier's `session_id` equals the declared session). For finale scoring, the dossier keeps its qualifying `session_id` (option B in §4.1), so we add an OR branch :

```sql
-- in rsa_submit_jury_score, replace the check
if v_sid_db is null or v_sid_db <> p_session_id then
  -- accept finale submissions for dossiers listed in platform_finale_membership
  if not exists (
    select 1 from public.platform_finale_membership pfm
    join public.sessions s on s.id = p_session_id and s.kind = 'finale'
    where pfm.startup_id = p_startup_id
      and pfm.edition_id = (select edition_id from public.startups where id = p_startup_id)
  ) then
    raise exception 'startup_not_in_session' using errcode = '22023';
  end if;
end if;
```

### 7.7 `rsa_proclaim_winner(p_startup_id uuid, p_prize text)`

Admin-only. Flips `startups.status = 'laureat'` (sentinel bypass — same pattern as `rsa_lock_session`) and writes `prize = p_prize`. Optionally flips `editions.public_results_enabled = true` if the caller passes a separate flag (or that's a separate `rsa_publish_palmares(p_edition_id)` RPC — recommend the latter for clarity).

```sql
create or replace function public.rsa_proclaim_winner(p_startup_id uuid, p_prize text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_platform_role('admin') then
    raise exception 'forbidden:not_admin' using errcode = '42501';
  end if;
  perform set_config('rsa.allow_protected_update', 't', true);
  update public.startups
     set status     = 'laureat',
         prize      = nullif(btrim(coalesce(p_prize, '')), ''),
         updated_at = now()
   where id = p_startup_id;
  perform set_config('rsa.allow_protected_update', '', true);
end$$;
revoke all on function public.rsa_proclaim_winner(uuid, text) from public, anon;
grant execute on function public.rsa_proclaim_winner(uuid, text) to authenticated;
```

### 7.8 `rsa_publish_palmares(p_edition_id text)`

Flips `editions.public_results_enabled = true`. Admin only. Idempotent.

### 7.9 Entities (`src/lib/rsa/entities.js` additions)

```js
export const PlatformFinaleMembership = {
  ...createEntity('platform_finale_membership'),
  async forEdition(editionId) { /* select * where edition_id */ },
  async addOrReplace({ editionId, startupId, sourceSessionId, pitchOrder, addedBy }) { /* upsert */ },
  // admin-only, but exposed for the picker UX; RLS enforces.
};

export const PlatformFinaleRsvp = {
  ...createEntity('platform_finale_rsvp'),
  async forEdition(editionId) { /* admin-read via RLS */ },
  // submit via either direct insert (v1) or supabase.functions.invoke('rsa_rsvp_submit') (v1.1).
  async submit(payload) { /* … */ },
};

export const PlatformCommunication = {
  ...createEntity('platform_communications'),
  async forEdition(editionId) { /* select * order by created_at desc */ },
  async send(id) {
    const { data, error } = await supabase.functions.invoke('rsa_send_communication', { body: { id } });
    if (error) throw error;
    return data;
  },
};

// admin role provisioning
export const AppUserRoles = {
  async listAll() {
    const { data, error } = await supabase.rpc('rsa_list_app_user_roles');
    if (error) throw error;
    return data || [];
  },
  async assign({ email, roles }) {
    const { data, error } = await supabase.rpc('rsa_assign_role', { p_email: email, p_roles: roles });
    if (error) throw error;
    return data;
  },
  async revoke({ email }) {
    const { error } = await supabase.rpc('rsa_assign_role', { p_email: email, p_roles: [] });
    if (error) throw error;
  },
};
```

### 7.10 TanStack hooks (`src/components/rsa/admin/useAdmin.js`)

```js
export const KEYS = {
  editions:        ['rsa','admin','editions'],
  sessions:        (editionId) => ['rsa','admin','sessions', editionId],
  liveGrid:        (sessionId) => ['rsa','admin','live', sessionId],
  finalists:       (editionId) => ['rsa','admin','finalists', editionId],
  rsvp:            (editionId) => ['rsa','admin','rsvp', editionId],
  comms:           (editionId) => ['rsa','admin','comms', editionId],
  roles:           ['rsa','admin','roles'],
};

// useEditions / useEditionSessions / useLiveGrid (with realtime sub) / useFinalists /
// useRsvp / useCommunications / useRoles
// + mutations: useCreateEdition, useUpdateEdition, useCreateSession, useUpdateSession,
//   useAssignRole, useRevokeRole, useSetSessionLive, useLockSession, usePublishSession,
//   useSetFinalists, useSwapFinalist, useSetPitchOrder, useProclaimWinner,
//   usePublishPalmares, useSendCommunication.
```

---

## 8. RLS / security recap

### 8.1 `startups_guard_update` trigger — extend

Already locks `status` / `session_id` / `eligibility` / `finalized_*` against candidate self-update. Add `prize` to the locked set (M4 new column).

```sql
-- extend the existing trigger function (already shipped in M1+M2 hardening)
if not public.has_platform_role('comite') and not public.has_platform_role('admin') then
  if new.prize is distinct from old.prize then raise exception 'prize is staff-only'; end if;
end if;
-- (the sentinel `rsa.allow_protected_update` bypass continues to work)
```

### 8.2 Public read surface — recap

The public palmarès is the **only** anon read path in M4. Two endpoints :
- `public.public_palmares` view (§3.4) — gated by `public_results_enabled = true` AND `session_config.status = 'published'`.
- `public.editions` (existing, gated by `status <> 'draft'`) — used for the edition picker on `/Resultats`.

No other M4 table is anon-readable. `platform_finale_membership` is auth-only (it leaks "who is in the finale" — by the time the page renders, that's published anyway, but we keep it strict).

### 8.3 Admin RPC matrix

| RPC | Caller check | Sentinel bypass needed? |
|-----|--------------|-------------------------|
| `rsa_create_session` | admin | no |
| `rsa_assign_role` / `rsa_revoke_role` | admin (+ last-admin rail) | no |
| `rsa_list_app_user_roles` | admin | no |
| `rsa_set_session_live` / `rsa_lock_session` / `rsa_publish_session` | admin | yes (writes `startups.status`) |
| `rsa_set_session_finalists` | admin | no (writes `session_config.manual_finalists` only) |
| `rsa_swap_finalist` / `rsa_remove_finalist` / `rsa_set_finale_pitch_order` | admin | no |
| `rsa_proclaim_winner` | admin | yes (writes `startups.status` + `prize`) |
| `rsa_publish_palmares` | admin | no |
| Edge `rsa_send_communication` | admin (server-side JWT validation) | no |
| Edge `rsa_rsvp_submit` | anon (rate-limited) | no |

### 8.4 Communications privacy

- `platform_communications.body_html` may contain rendered candidate names + email subjects. Read scope is comité+admin (no candidate self-read of their own delivery). Acceptable.
- The Edge `rsa_send_communication` logs first-error only (`last_error text`) — never logs full recipient lists in plain text in case of partial failure (rebuilt from the segment definition).

---

## 9. UI structure (file tree)

```
src/pages/
  Admin.jsx                         # the Module-4 cockpit route (gated admin).
                                    # Hosts <AdminShell> with sub-tab routing
                                    # (controlled state, deep-linkable via ?tab=).
  Resultats.jsx                     # public palmarès route (no auth, STANDALONE_PAGES).
  RsvpFinale.jsx                    # public RSVP form route (no auth, STANDALONE_PAGES,
                                    # token-protected variant + open variant).

src/components/rsa/admin/
  AdminShell.jsx                    # cockpit shell: ModuleStatusStrip + EditionPicker +
                                    # SessionPicker + sub-tab nav (Élysée TopNav).
  ModuleStatusStrip.jsx             # one-line summary of M1/M2/M3 status + M4 milestone.
  EditionPicker.jsx                 # cross-edition select (default = active edition).
  SessionPicker.jsx                 # in-edition session select (5 qualifying + 1 finale).

  tabs/
    SetupTab.jsx                    # editions + sessions + roles + decks panels.
    LiveTab.jsx                     # the real-time scoring grid (port from legacy + restyle).
    ResultsTab.jsx                  # per-session palmarès + finalists picker.
    GrandeFinaleTab.jsx             # finalist roster + pitch order + finale jury panel.
    RsvpTab.jsx                     # platform_finale_rsvp queue + stats + send-link UI.
    CommunicationsTab.jsx           # editor + segment picker + send.

  setup/
    EditionEditor.jsx               # create/edit edition modal.
    EligibilityRulesEditor.jsx      # JSON + live preview.
    SessionEditor.jsx               # create/edit session, with order DnD.
    RolesPanel.jsx                  # app_user_roles management UI.
    SessionConfigEditor.jsx         # advanced per-session config (collapsed).
    DecksPanel.jsx                  # per-session deck/exec list with signed URLs.

  live/
    ScoreCell.jsx                   # the cell — `—` / `n/6` / `avg/5` (port + restyle).
    ScoreDrawer.jsx                 # 6-criterion breakdown + comment (port + restyle).
    JurorColumnHeader.jsx           # name + qualité tooltip.
    SessionLifecycleControls.jsx    # Open / Lock / Publish (calls RPCs).

  results/
    PalmaresTable.jsx               # ranked table (rank, startup, avg, final, override, note).
    FinalistsPicker.jsx             # top-N override (drag-and-drop, gold-highlight top-N).
    CrossSessionView.jsx            # 5 session cards + progress bar.

  finale/
    FinalistsRoster.jsx             # list of platform_finale_membership rows with swap/remove.
    PitchOrderEditor.jsx            # DnD reorder finalists (writes pitch_order).
    FinaleJuryPanel.jsx             # assignments for session_id=final_grande.
    ProclaimWinnerModal.jsx         # confirm + prize text + publish palmares toggle.

  rsvp/
    RsvpStats.jsx                   # totals / yes / no / pending / headcount.
    RsvpList.jsx                    # editorial rows + filters.
    SendLinkButton.jsx              # per-row "send RSVP link" action.

  communications/
    CommEditor.jsx                  # subject + HTML body + iframe preview.
    SegmentPicker.jsx               # FR/EN/DE recipient buckets + exclusions.
    SendButton.jsx                  # typed-confirm + progress bar.
    templates/                      # 5 kinds × 3 langs HTML templates (Élysée shell).
      winners_announce.fr.html
      winners_announce.en.html
      winners_announce.de.html
      jury_thanks.{fr,en,de}.html
      sponsors_thanks.{fr,en,de}.html
      candidates_recap.{fr,en,de}.html
      custom.{fr,en,de}.html        # blank-with-header starter.

  i18n.js                           # admin cockpit dictionaries (see §10).
  useAdmin.js                       # TanStack hooks (§7.10).
  constants.js                      # ROLE_OPTIONS, COMM_KIND_LABELS, etc.

src/components/rsa/resultats/
  ResultatsShell.jsx                # public palmarès page composer.
  LaureatHero.jsx                   # gold-light card with the winner.
  Podium.jsx                        # top 3 cards.
  SessionPalmaresList.jsx           # per-session finalist list (UpcomingList shape).
  MethodologieCard.jsx              # 6 criteria + weights, collapsible.
  i18n.js                           # public palmarès dictionaries.

src/lib/rsa/
  entities.js                       # + PlatformFinaleMembership, PlatformFinaleRsvp,
                                    # PlatformCommunication, AppUserRoles (§7.9).
  palmares.js                       # fetchPalmares / pickLaureat helpers (§3.5).

supabase/migrations/
  20260528_rsa_module4_admin.sql    # platform_finale_membership + platform_finale_rsvp +
                                    # platform_communications + editions.public_results_enabled +
                                    # startups.prize + session_config.manual_finalists +
                                    # app_user_roles.granted_by / granted_at + helper RPCs.
  20260528_rsa_module4_rpcs.sql     # rsa_create_session, rsa_assign_role, rsa_revoke_role,
                                    # rsa_list_app_user_roles, rsa_set_session_live,
                                    # rsa_set_session_finalists, rsa_swap_finalist,
                                    # rsa_remove_finalist, rsa_set_finale_pitch_order,
                                    # rsa_proclaim_winner, rsa_publish_palmares,
                                    # rsa_publish_session (replace with finale branch +
                                    # manual_finalists support),
                                    # rsa_submit_jury_score (replace with finale branch).
  20260528_rsa_module4_palmares.sql # public.public_palmares view + GRANT to anon.
  20260528_rsa_module4_guard.sql    # extend startups_guard_update trigger to lock `prize`.

supabase/functions/
  rsa_send_communication/index.ts   # SMTP send Edge function (Resend in prod).
  rsa_rsvp_submit/index.ts          # rate-limited public RSVP wrapper (v1.1).
  consolidate-jury-pack/index.ts    # RETARGET to new schema (read startups, write to
                                    # private dossiers/jury_packs/).

api/cron/
  backup-rsa.js                     # EXTEND the table list to cover all platform_* tables +
                                    # editions / sessions / session_config / startups /
                                    # selection_reviews / app_user_roles.
```

### 9.1 Design rules (Élysée — `docs/design/elysee-designbook.md`)

- `PageShell width="wide"` (`max-w-[1100px]`) for the admin cockpit — list/data heavy.
- `PageShell` (default narrow `max-w-[680px]`) for `/Resultats` and `/RsvpFinale` — editorial.
- No shadows, hairline `CREAM2` borders only. No zebra rows.
- All lifecycle pills via the shared `StatusPill kind="jury"` (§6.2 of designbook). The legacy `admin/StatusPill.jsx` (amber-based) is DEPRECATED and NOT imported anywhere in M4.
- Numeric scores use `tabular-nums`.
- Buttons via `Button` (Élysée variant `primary|secondary|ghost|danger`) — no off-palette `bg-emerald-600` etc. The legacy `LiveTab` transition buttons are restyled to NAVY primary + `OCHRE`/`BRICK` warning tints where appropriate.
- Editorial easing for transitions ; framer-motion fade-up on tab content mount.
- Touch targets ≥ 44px on mobile (RSVP form, palmarès page).

---

## 10. i18n FR / EN / DE — cockpit + public dictionaries

`src/components/rsa/admin/i18n.js` (cockpit) :

```js
export const TABS = {
  setup: { fr:'Configuration', en:'Setup', de:'Konfiguration' },
  live:  { fr:'En direct',     en:'Live',  de:'Live' },
  results:{ fr:'Résultats',    en:'Results', de:'Ergebnisse' },
  finale:{ fr:'Grande Finale', en:'Grand Final', de:'Großes Finale' },
  rsvp:  { fr:'RSVP',          en:'RSVP',  de:'RSVP' },
  comms: { fr:'Communications',en:'Communications',de:'Kommunikation' },
};

export const UI = {
  eyebrow:        { fr:'Cockpit', en:'Cockpit', de:'Cockpit' },
  pageTitle:      { fr:'Administration RSA', en:'RSA Administration', de:'RSA-Verwaltung' },
  noAccess:       { fr:'Cette section est réservée à l\'administration.',
                    en:'This area is restricted to administrators.',
                    de:'Dieser Bereich ist der Administration vorbehalten.' },
  saveSuccess:    { fr:'Enregistré', en:'Saved', de:'Gespeichert' },
  sendInvite:     { fr:'Envoyer le lien', en:'Send link', de:'Link senden' },
  proclaimWinner: { fr:'Proclamer le lauréat', en:'Proclaim the laureate', de:'Den Preisträger ausrufen' },
  publishPalmares:{ fr:'Publier le palmarès', en:'Publish the palmares', de:'Ergebnisliste veröffentlichen' },
  // …
};

export const COMM_KIND_LABELS = {
  winners_announce: { fr:'Annonce des lauréats', en:'Winners announcement', de:'Bekanntgabe der Preisträger' },
  jury_thanks:      { fr:'Remerciements au jury', en:'Jury thank-you', de:'Dank an die Jury' },
  sponsors_thanks:  { fr:'Remerciements partenaires', en:'Sponsors thank-you', de:'Dank an die Partner' },
  candidates_recap: { fr:'Récapitulatif candidats', en:'Candidates recap', de:'Bewerber-Rückblick' },
  custom:           { fr:'Personnalisé', en:'Custom', de:'Individuell' },
};
```

`src/components/rsa/resultats/i18n.js` (public palmarès) — institutional/celebratory voice, mirrors the live landing palmarès page :

```js
export const UI = {
  eyebrow:        { fr:'Palmarès',          en:'Palmares',         de:'Ergebnisliste' },
  titleLead:      { fr:'Rotary Startup Award',
                    en:'Rotary Startup Award',
                    de:'Rotary Startup Award' },
  laureateLabel:  { fr:'Lauréat',           en:'Laureate',         de:'Preisträger' },
  podium:         { fr:'Le podium',         en:'The podium',       de:'Das Podium' },
  perSession:     { fr:'Par session',       en:'Per session',      de:'Pro Session' },
  methodologyTitle:{fr:'Méthodologie',      en:'Methodology',      de:'Methodik' },
  awaitingTitle:  { fr:'Palmarès à venir',  en:'Palmares to come', de:'Ergebnisliste folgt' },
  awaitingBody:   { fr:'Le palmarès sera publié à l\'issue de la Grande Finale.',
                    en:'The palmares will be published after the Grand Final.',
                    de:'Die Ergebnisliste wird nach dem Großen Finale veröffentlicht.' },
  publishedOn:    { fr:'Publié le',         en:'Published on',     de:'Veröffentlicht am' },
  // …
};
```

Resolution via `useLang().t(entry)`. Domain copy (criteria labels, session names + dates) via `getCriterion(c, lang)` / `getSessionLabel(s, lang)` / `getSessionDate(s, lang)`. `RULE_LABELS` imported from `@/components/rsa/candidature/i18n.js` (SSOT).

---

## 11. Open questions for the human

1. **SMTP provider at M4c time — Resend (recommended) or Supabase built-in?** The Resend setup is documented in `docs/deepsolve/email-smtp-resend-setup.md` and is the production target (volume + deliverability). Supabase built-in SMTP has a low daily quota — fine for dev/staging tests but cannot ship the candidates_recap blast (200+ recipients). **Recommendation:** ship M4c with Resend wired directly ; the Edge function reads `RESEND_API_KEY` from the function secrets ; fallback to Supabase only in dev.
2. **Public palmarès URL — `app.rotary-startup.org/Resultats` or WordPress apex `rotary-startup.org/palmares`?** The wild landing already has a palmarès block on apex (memory `project_redesign_elysee`). Two paths : (a) keep `/Resultats` on the app subdomain and the landing block remains hand-curated ; (b) build a WP integration so the apex page reads from `public.public_palmares` via a small WP plugin. **Recommendation:** ship (a) first (M4c), keep (b) as a follow-up — the apex page can iframe or link to `/Resultats` in the meantime.
3. **Should comité see the LIVE tab?** Strict interpretation = no (admin-only operations brain). Looser interpretation = yes in read-only (comité members are stakeholders and may want to watch scoring in real-time). **Recommendation:** ship admin-only in M4a, add comité read-only with a single `isComite` branch in M4b if requested.
4. **Lauréat prize amount — auto from `editions.prize_main` / `editions.prize_special` OR admin-entered per startup?** The `startups.prize` column is free text precisely so admin can write whatever ("Lauréat 5 000 € — Prix principal RSA 2026", "Coup de Cœur du Jury", etc.). The proclaim modal **suggests** the value from `editions.prize_main` but lets admin overwrite. Acceptable, or should we lock it to the edition's preset amounts? **Recommendation:** keep free text (more flexibility for sponsor-named prizes).
5. **`app_user_roles.granted_by` / `granted_at` columns** — recommended for audit. Adds 2 columns to the table. Confirm acceptable in the M4 migration batch.
6. **Public palmarès — keep the 🏆/🥇 emoji as *content* on the lauréat / podium?** The designbook §1.3 forbids emoji in chrome, but allows them as content on results pages (the live landing already uses 🏆). **Recommendation:** allow as content on `/Resultats` only (lauréat hero, podium), never on the cockpit. Confirm.
7. **Pre-session pack — admin-triggered vs auto on session-create?** Same open question as M3 §12.9. **Recommendation:** admin-triggered ("Construire le pack jury" button in SETUP/Decks), so admin can re-trigger after a late deck upload.
8. **`editions.status` machine** — free text today. Add a SQL CHECK or a state-machine table? **Recommendation:** add a CHECK constraint `(status in ('draft','open','selection','sessions','finale','closed'))` in the M4 migration (cheap, prevents typos in the SETUP UI).
9. **Reset-to-template button on SETUP/Sessions** — re-seeds the 5 clusters + 1 finale from the `SESSIONS` canonical list (overwriting names/themes). Useful for new editions, dangerous mid-edition. **Recommendation:** present it as a one-click action with a typed-confirm modal, and refuse if any session of the edition already has `session_config.status <> 'draft'`.
10. **RSVP — Turnstile/hCaptcha on the public form?** v1 ships without (the legacy form didn't have it and 2026 went fine). v1.1 adds the Edge function wrapper with Turnstile if abuse is observed. **Recommendation:** ship without in M4b, monitor, add in M4c if needed.
11. **CSV / iCal exports on the cockpit** — port the legacy CSV download (RSVP, Results) and add an iCal download for the finale event (`.ics` file generated client-side, useful for jurors). **Recommendation:** ship CSV in M4a (port legacy), iCal as a small bonus in M4b.
12. **Sentinel-bypass proliferation** — same concern as M3 §12.12. Three more RPCs in M4 (`rsa_set_session_live`, `rsa_proclaim_winner`, the extended `rsa_publish_session`) use the sentinel. Acceptable to inline-repeat ; a helper `rsa_with_protected_update_bypass(fn jsonb)` is a follow-up if the pattern reaches 6+ RPCs.
13. **Admin cockpit deep-link & URL state** — `?tab=results&session=s3_tech` for deep-linkable views. Mirror the legacy `RsaAdmin` deep-link behaviour (it already supports `?tab=` and `?session=`). Confirm we keep the same URL shape.

---

## 12. Build order — split into shippable chunks

We recommend three chunks, each independently shippable + visibly useful :

### M4a — Setup + Live + Results (the operational brain)

Closes the operational blocker mentioned in the mission (no admin UI to seed `session_config` rows + no `rsa_lock_session` / `rsa_publish_session` orchestration UI). Lets the team run a qualifying session end-to-end through the new platform.

1. Migration `20260528_rsa_module4_admin.sql` :
   - `editions.public_results_enabled bool default false`.
   - `editions.status` CHECK constraint (open Q §11.8).
   - `startups.prize text`.
   - `session_config.manual_finalists uuid[]`.
   - `app_user_roles.granted_by / granted_at` (open Q §11.5).
   - Extend `startups_guard_update` trigger to lock `prize` (§8.1).
2. Migration `20260528_rsa_module4_rpcs.sql` :
   - `rsa_create_session`, `rsa_assign_role`, `rsa_revoke_role`, `rsa_list_app_user_roles`.
   - `rsa_set_session_live`, `rsa_set_session_finalists`.
   - Replace `rsa_publish_session` with the M4 extended version (read `manual_finalists`).
3. Entities — `AppUserRoles`, `PlatformFinaleMembership` (lookup only at this stage).
4. `Admin.jsx` page + `AdminShell` + auth gate + TopNav link (admin-only).
5. `SetupTab` with EditionEditor + SessionEditor + RolesPanel + (collapsed) SessionConfigEditor + DecksPanel.
6. `LiveTab` ported from legacy, restyled to Élysée, wired to platform tables, realtime sub on drafts + scores.
7. `ResultsTab` — per-session palmarès + FinalistsPicker + CSV download + typed-confirm publish.
8. `ModuleStatusStrip` (one-line summary of M1/M2/M3 status).

Ship M4a → admin can run one qualifying session end-to-end through the platform.

### M4b — Grande Finale + RSVP (the event-day surface)

9. Migration `20260528_rsa_module4_finale.sql` :
   - `platform_finale_membership` table + RLS.
   - `platform_finale_rsvp` table + RLS.
   - RPCs : `rsa_swap_finalist`, `rsa_remove_finalist`, `rsa_set_finale_pitch_order`, `rsa_proclaim_winner`, `rsa_publish_palmares`.
   - Extend `rsa_submit_jury_score` with the finale branch (§7.6).
   - Extend `rsa_publish_session` with the finale branch (§7.5).
10. Entities — `PlatformFinaleMembership` (full CRUD), `PlatformFinaleRsvp`.
11. `GrandeFinaleTab` — FinalistsRoster + PitchOrderEditor + FinaleJuryPanel + ProclaimWinnerModal.
12. `RsvpTab` (admin) — port legacy stats + filters + list + send-link.
13. `RsvpFinale.jsx` (public form) — port legacy form, Élysée restyle, direct insert to `platform_finale_rsvp` (no Edge wrapper yet).

Ship M4b → admin can curate finalists, run the finale, proclaim the lauréat ; public can RSVP.

### M4c — Communications + public Resultats page (the post-event reveal)

14. Migration `20260528_rsa_module4_palmares.sql` :
   - `public.public_palmares` view + GRANT to anon.
15. Migration `20260528_rsa_module4_comms.sql` :
   - `platform_communications` table + RLS.
16. Edge function `rsa_send_communication` (Deno, Resend SMTP).
17. (Optional v1.1) Edge function `rsa_rsvp_submit` (rate-limited wrapper).
18. `CommunicationsTab` — CommEditor + SegmentPicker + SendButton + 5 kinds × 3 langs templates.
19. `Resultats.jsx` page + components (`LaureatHero`, `Podium`, `SessionPalmaresList`, `MethodologieCard`).
20. Retarget `consolidate-jury-pack` Edge function to the new schema (M3 deferred — §6.7).
21. Extend `api/cron/backup-rsa.js` to include all new `platform_*` tables + `editions` / `sessions` / `session_config` / `startups` / `selection_reviews` / `app_user_roles`.

Ship M4c → full post-event communications + public palmarès live ; the candidate journey loops shut.

---

## Appendix A — Migration sketch (for the implementing agent)

> Not built here — kept as a contract. The full set of helpers + RPCs lives in §6/§7/§8 above; this appendix gathers them in build order.

```sql
-- 20260528_rsa_module4_admin.sql ─────────────────────────────────────────────
alter table public.editions
  add column if not exists public_results_enabled boolean not null default false,
  add constraint editions_status_check
    check (status in ('draft','open','selection','sessions','finale','closed'));

alter table public.startups
  add column if not exists prize text;

alter table public.session_config
  add column if not exists manual_finalists uuid[];

alter table public.app_user_roles
  add column if not exists granted_by uuid references auth.users(id),
  add column if not exists granted_at timestamptz;
-- Backfill granted_at from updated_at to keep history consistent.
update public.app_user_roles set granted_at = updated_at where granted_at is null;

-- Extend the guard trigger (the M1 hardening function tg_startups_guard_update):
-- add `prize` to the locked-from-candidate set. The existing sentinel bypass is reused.
-- (cf. supabase/migrations/20260527_rsa_module1_hardening.sql for the original trigger)

-- 20260528_rsa_module4_rpcs.sql ──────────────────────────────────────────────
-- rsa_create_session(text, jsonb) — §7.1
-- rsa_assign_role(text, text[])    — §7.2
-- rsa_revoke_role(text)            — wraps rsa_assign_role(p_email, '{}')
-- rsa_list_app_user_roles()        — §7.2
-- rsa_set_session_live(text)       — §7.3
-- rsa_set_session_finalists(text, uuid[]) — §7.4
-- Replace rsa_publish_session(text) — read session_config.manual_finalists, finale branch — §7.5
-- (M4b will also replace rsa_submit_jury_score with the finale branch — §7.6)

-- 20260528_rsa_module4_finale.sql (M4b) ──────────────────────────────────────
-- platform_finale_membership + RLS — §4.2
-- platform_finale_rsvp           + RLS — §5.2
-- rsa_swap_finalist / rsa_remove_finalist / rsa_set_finale_pitch_order
-- rsa_proclaim_winner(uuid, text)   — §7.7
-- rsa_publish_palmares(text)        — §7.8
-- Replace rsa_submit_jury_score    — §7.6

-- 20260528_rsa_module4_comms.sql (M4c) ───────────────────────────────────────
-- platform_communications + RLS — §6.2

-- 20260528_rsa_module4_palmares.sql (M4c) ────────────────────────────────────
-- create or replace view public.public_palmares — §3.4
-- grant select on public.public_palmares to anon, authenticated;
```

---

## Appendix B — Cockpit UI mock (textual)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COCKPIT  ·  Édition « dev » (active)                              FR EN DE │
│  ◯ Candidatures 12 · ⬤ Sélection 4 à examiner · ◯ Jury 1/6 live · J-12      │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Configuration] [En direct] [Résultats] [Grande Finale] [RSVP] [Communications] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EN DIRECT  ·  Session 3 — Tech, AI, Fintech & Mobilité           ● LIVE   │
│  Mercredi 19 novembre · 18h                            [Lock session] [↩]  │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  STARTUP                  Marie  Jean   Léa   Hans   Anya   Lucas | Avg n  │
│  ────────────────────────────────────────────────────────────────────────  │
│  01  Helia BioPlastics    4.20  4.00  3.80  3/6   —    —     | 4.00 3/6   │
│  02  Boréalis EdTech      3.60  4/6   3.40  4.00  —    —     | 3.67 3/6   │
│  03  Atlas Robotics       —     —     —     —     —    —     | —    0/6   │
│  04  …                                                                      │
│                                                                             │
│  ┌─ Stats ────────────────────────────────────────────────────────────┐    │
│  │  Startups : 6 (3 started)   Jurés : 6 (4 scoring)   Total : 12/36 │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘

(GRANDE FINALE tab, post qualifying-session publish:)

┌─ GRANDE FINALE  ·  Édition « dev »                          ● 5 finalistes ─┐
│  Mardi 26 mai 2026 · 16h–19h · Cyrus Conseil                                │
│  ────────────────────────────────────────────────────────────────────────── │
│  Roster (drag to reorder pitch order)                                       │
│   01  Helia BioPlastics        Foodtech         · 4.00/5     [swap] [✕]    │
│   02  Boréalis EdTech          Social & Edtech  · 3.67/5     [swap] [✕]    │
│   03  Atlas Robotics           Tech & AI        · 3.80/5     [swap] [✕]    │
│   04  …                                                                     │
│  ────────────────────────────────────────────────────────────────────────── │
│  Finale jury (6 jurés assignés)                          [ Gérer les jurés ]│
│  ────────────────────────────────────────────────────────────────────────── │
│  Lifecycle                                                                  │
│   Status : DRAFT                       [Open scoring] [Lock] [Publish]      │
│  ────────────────────────────────────────────────────────────────────────── │
│  Lauréat (après publication)                                                │
│   [Proclaim winner & publish palmares]                                      │
└─────────────────────────────────────────────────────────────────────────────┘

(Public /Resultats page:)

┌─ PALMARÈS · Rotary Startup Award 2026 ─────────────────────────────── FR EN DE ─┐
│                                                                                 │
│                              ─── PALMARÈS ───                                   │
│                                                                                 │
│                       Rotary Startup Award 2026                                 │
│                          la Grande Finale                                       │
│              Mardi 26 mai 2026 · Cyrus Conseil — Paris 9                        │
│                                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐    │
│  │                          LAURÉAT — GRANDE FINALE                        │    │
│  │                                                                         │    │
│  │                          Helia BioPlastics                              │    │
│  │                                                                         │    │
│  │              Score final 4.45 / 5  ·  12 jurés indépendants            │    │
│  └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
│  Le podium                                                                      │
│   #1 Helia BioPlastics      4.45                                                │
│   #2 Atlas Robotics         4.10                                                │
│   #3 Boréalis EdTech        3.95                                                │
│                                                                                 │
│  Par session                                                                    │
│   Foodtech & économie circulaire — Helia BioPlastics                            │
│   Impact social & Edtech         — Boréalis EdTech                              │
│   Tech, AI, Fintech & Mobilité   — Atlas Robotics                               │
│   Healthtech & Biotech           — …                                            │
│   Greentech & Environnement      — …                                            │
│                                                                                 │
│  ▾ Méthodologie d'évaluation                                                    │
│                                                                                 │
│  Rotary Startup Award 2026 · Commission Paris                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```
