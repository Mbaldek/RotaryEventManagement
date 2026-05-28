# RSA Platform — Foundation Security & Robustness Review

**Scope:** `supabase/migrations/20260527_rsa_platform_foundation.sql`, `src/lib/platform/auth.jsx`, `src/lib/rsa/eligibility.js`, and the Supabase Storage `uploads` bucket. RGPD/data-protection considerations included.

**Status:** Documentation only — no code or DB changes made. Recommended fixes below are *proposals* for the implementing agent.

**Reviewer date:** 2026-05-27

---

## TL;DR — top findings

| # | Severity | Finding |
|---|----------|---------|
| C1 | **Critical** | `public.profiles` has **no RLS** in any migration. Combined with email-based role linkage, the role-grant surface is wide and `has_platform_role` trusts a table that may be world-writable. |
| C2 | **Critical** | The `uploads` Storage bucket is **public**. Pitch decks, exec summaries and candidate PII documents are served via unauthenticated `getPublicUrl` / `/object/public/uploads/...`. No Storage RLS restricts access to the dossier owner + comité/jury/admin. RGPD Art. 5/32 + RSA Règlement Art. 10 violation. |
| C3 | **Critical** | `src/pages/StartupUpload.jsx` **hardcodes** the Supabase URL + anon key in source and uses the anon key as a bearer token to write to the `uploads` bucket and PATCH `startup_confirmations` keyed only by a guessable-scope token. |
| H1 | **High** | `has_platform_role` matches `profiles` by `lower(email) = lower(auth.jwt() ->> 'email')`. Identity is bound to a mutable email, not `auth.uid()`. If a profile row's email can be edited (no RLS — see C1) or an account re-uses a privileged email, a user grants themselves a role. |
| H2 | **High** | `startups` `INSERT` path: `owner_id` is **nullable** and the `WITH CHECK` is `owner_id = auth.uid() OR <role>`. A bare applicant cannot insert someone else's `owner_id`, but they also cannot insert a row with `owner_id = NULL`, and there is no enforcement that `owner_id` is *not null* — drafts created server-side / by import can end up orphaned and then world-editable by any comité member with no audit. Pin `owner_id = auth.uid()` and `NOT NULL` for the applicant path. |
| H3 | **High** | `editions`/`sessions` are world-readable (`using (true)`) including unpublished `draft` editions and full `eligibility_rules` (thresholds). Acceptable for sessions, but `eligibility_rules` thresholds and unannounced editions leak. |
| M1 | Medium | `loadProfile` uses `.ilike('email', email)` — `ilike` treats `%`/`_` in the address as wildcards. A crafted address can match a different profile row client-side. |
| M2 | Medium | Magic-link `emailRedirectTo` is built from `VITE_APP_URL || window.location.origin` with an attacker-influenceable `redirectPath` and no allow-list → open-redirect / token-leak vector if Supabase Redirect URLs are wildcarded. |
| M3 | Medium | `selection_reviews` exposes nothing to jury (read) though jury can read `startups`; and there is no policy letting a startup owner read decisions about their own dossier — confirm intended. RLS on the table with comité/admin-only `FOR ALL` is otherwise sound. |
| M4 | Medium | Eligibility edge cases: `created_after` parses `creation_date` with `new Date()` (timezone/format fragility), `country` is case/whitespace-sensitive exact match, numeric fields coerced with `Number()` without `NaN` guard. |
| L1 | Low | No retention/erasure mechanism for candidate PII; no `updated_at` trigger; `has_platform_role` is fine on `search_path` but relies on it being set (it is). |

---

## Critical

### C1 — `profiles` has no Row-Level Security; it is the root of trust for all roles

**Evidence.** No migration enables RLS on `public.profiles` or defines a policy for it (grep of `supabase/**/*.sql`). The foundation migration only does `alter table public.profiles add column ... platform_roles`. Meanwhile `has_platform_role()` (SECURITY DEFINER) and the whole authorization model resolve roles **out of this table**:

```sql
select 1 from public.profiles
where lower(email) = lower(auth.jwt() ->> 'email')
  and p_role = any(platform_roles)
```

If `profiles` is reachable by the `anon`/`authenticated` role for writes (default Supabase behaviour is RLS *disabled* unless explicitly enabled — and disabled RLS means PostgREST honours table GRANTs, which for the `authenticated` role on a `public.` table are commonly present), **any logged-in user could `update public.profiles set platform_roles = '{admin}' where email = '<their email>'`** and instantly become admin. Even if GRANTs happen to be locked down today, the security model must not depend on that being true — it must be enforced by RLS.

Note this is independent of the SECURITY DEFINER function: the function only *reads* roles; the attack is writing the roles row.

**Recommended fix.** Enable RLS on `profiles` and lock down role columns. Roles must be writable only by `service_role` (server/admin), never the end user:

```sql
alter table public.profiles enable row level security;

-- A user may read only their own profile row (matched by uid OR email).
create policy profiles_self_read on public.profiles
  for select using (
    id = auth.uid()
    or lower(email) = lower(auth.jwt() ->> 'email')
  );

-- A user may update only NON-privileged columns of their own row.
-- Block platform_roles / role from being self-edited.
revoke update (platform_roles, role) on public.profiles from anon, authenticated;

-- Admin / comité reads (for the back-office), writes stay service_role only.
create policy profiles_admin_read on public.profiles
  for select using (public.has_platform_role('admin') or public.has_platform_role('comite'));

-- No INSERT/UPDATE/DELETE policy for anon/authenticated on roles → only service_role (bypasses RLS) can grant roles.
```

Additionally add a trigger or column GRANT revoke so that even a future broad `profiles` update policy cannot touch `platform_roles` (mirrors the `is_premium` lock pattern already used elsewhere in this org).

---

### C2 — `uploads` Storage bucket is public; candidate documents and PII are world-readable

**Evidence.** Every code path treats `uploads` as a **public** bucket:

- `src/lib/db.js:207` → `supabase.storage.from('uploads').getPublicUrl(fileName)`
- `src/pages/StartupUpload.jsx:313` → `.../storage/v1/object/public/uploads/<application_deck_path>`
- `supabase/functions/consolidate-jury-pack/index.ts:96,183` → `getPublicUrl(...)`
- `scripts/build_briefings.py:56` comment: *“Download from storage bucket 'uploads' (public).”*
- `src/components/rsa/admin/DecksTab.jsx`, `FinaleEmailsSection.jsx`, `RsaJuryHub.jsx` — all `getPublicUrl`.

`getPublicUrl` only returns a working URL when the bucket is public. Filenames are predictable: `uploadFile` uses `` `${Date.now()}_${file.name}` `` (db.js:204) and `StartupUpload` uses `session_decks/<token12>/<Date.now()>_<name>`. The new `startups` table stores `pitch_deck_path` / `exec_summary_path` that will live in the same bucket, so **pitch decks and executive summaries (containing financials, founder identities, strategy) are downloadable by anyone who guesses or is handed the URL — no auth, no role check.**

This violates:
- **RGPD Art. 5(1)(f) & Art. 32** — integrity/confidentiality, appropriate access control.
- **RSA Règlement Général Art. 10** — data used solely for the award; confidentiality promised to candidates (the upload page itself states *“documents remain strictly confidential to the jury and organiser”* — currently false).

**FLAG:** Storage bucket policies are **not yet configured** to restrict document access to the dossier owner + comité/jury/admin. This must be done before any real candidate uploads.

**Recommended fix.**
1. Make the bucket **private** (`public = false`) and switch all read paths from `getPublicUrl` to **`createSignedUrl`** (short TTL) issued only after a server/RLS authorization check.
2. Add Storage RLS on `storage.objects`. Convention: store dossier files under a path prefix that contains the `owner_id` (e.g. `startups/<owner_id>/<startup_id>/<file>`), then:

```sql
-- Read: owner of the path, or comité/jury/admin.
create policy "uploads_read_owner_or_staff"
  on storage.objects for select
  using (
    bucket_id = 'uploads'
    and (
      (storage.foldername(name))[1] = 'startups'
      and (storage.foldername(name))[2] = auth.uid()::text
    )
    or public.has_platform_role('comite')
    or public.has_platform_role('jury')
    or public.has_platform_role('admin')
  );

-- Write/insert: only the owner into their own folder (or staff).
create policy "uploads_write_owner_or_staff"
  on storage.objects for insert
  with check (
    bucket_id = 'uploads'
    and (
      ((storage.foldername(name))[1] = 'startups'
       and (storage.foldername(name))[2] = auth.uid()::text)
      or public.has_platform_role('admin')
    )
  );
```
3. Migrate existing 2026 archive objects under the new prefix scheme (or accept they remain legacy-public and isolate new candidate docs in a fresh private bucket, e.g. `dossiers`).
4. Enforce server-side content-type/size validation (current 50 MB / ext check in `StartupUpload` is client-only and bypassable).

---

### C3 — Hardcoded anon key + token-only write path in `StartupUpload.jsx`

**Evidence.** `src/pages/StartupUpload.jsx:3-5` hardcodes the project URL and the full anon JWT in client source, then (line 236) `POST`s file bytes straight to `/storage/v1/object/uploads/<path>` and (line 192) `PATCH`es `startup_confirmations` filtered only by `deck_upload_token`. Authorization rests entirely on possession of the token and on the bucket/table being permissive.

**Why it matters.** With a public/permissive bucket (C2) and `startup_confirmations` using the “fully open” RLS pattern documented in `20260501_rsa_finale_rsvp.sql` (`using (true) with check (true)`), anyone who obtains *any* upload token (forwarded email, logs) can overwrite decks (`x-upsert: true`, line 240) and PATCH confirmation rows. The anon key in source is not itself a secret leak (anon keys are publishable), but it removes any per-user scoping — every write is the same anonymous identity.

**Recommended fix.**
- Move file writes behind an authenticated session or a signed, single-use, server-issued upload URL (Supabase `createSignedUploadUrl`) scoped to one object path; do not let the client choose arbitrary `uploads/<path>`.
- Apply RLS to `startup_confirmations` so a token can only PATCH its own row, and make the token high-entropy + single-purpose.
- Stop sending `x-upsert: true` from the public client (prevents overwrite of a previously confirmed deck).

---

## High

### H1 — Role identity bound to mutable email, not `auth.uid()`

**Evidence.** `has_platform_role` (migration L19-23) and both auth contexts (`AuthContext.jsx:33` `eq('email', email)`, `platform/auth.jsx:33` `ilike('email', email)`) resolve the profile by **email**, not by the immutable `auth.users.id`. The JWT email claim is set at sign-up/magic-link time and is verified by Supabase for magic-link (you must receive the email), so spoofing the *claim* directly is hard — but the binding is still fragile because:

- The link is `profiles.email ⇄ jwt.email`. If anyone can edit `profiles.email` (see C1, no RLS), they point an existing privileged `platform_roles` row at their own address.
- Case is normalised (`lower(...)` on both sides) — good, neutralises `Admin@x` vs `admin@x`. But Gmail dot/`+tag` aliases (`a.b@gmail.com` == `ab@gmail.com` at the provider) are **not** normalised, so seeded privileged emails should be canonicalised.
- `auth.jwt() ->> 'email'` is `NULL` for tokens without an email claim (e.g. some service/anon contexts). `lower(NULL) = lower(email)` is `NULL` → row excluded → `exists` is false → safe-by-default (good — confirmed no NULL bypass).

**Recommended fix.** Prefer binding roles to `auth.uid()`:
```sql
-- add profiles.user_id uuid references auth.users(id), backfill, then:
create or replace function public.has_platform_role(p_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and p_role = any(platform_roles)
  );
$$;
```
If the email binding must stay for the legacy déjeuners app, then C1 (lock `platform_roles`/`email` writes to `service_role`) is mandatory and sufficient to close the self-grant path. Also canonicalise seeded admin emails.

*SECURITY DEFINER assessment:* the function is `stable`, `set search_path = public` (prevents search-path hijack), and only performs a read — this is the correct, safe pattern. It does **not** itself let a user grant a role; the risk is entirely in the writability of the underlying table (C1).

### H2 — `startups` INSERT/owner_id pinning

**Evidence.** `startups.owner_id` is **nullable** (migration L63). Policy `startups_write` (L143-149) is `for all ... with check (owner_id = auth.uid() or comite or admin)`.

- A bare applicant **cannot** insert a row with someone else's `owner_id` (the check fails) — good, IDOR on insert is blocked.
- A bare applicant **cannot** insert `owner_id = NULL` either (`NULL = auth.uid()` is `NULL`, not true) — so the applicant self-service path effectively requires they set their own uid. Acceptable but implicit; make it explicit.
- A comité member, however, can insert/update rows with **any** `owner_id` including `NULL`, and there is no separate, stricter applicant-only policy. An orphaned (`owner_id IS NULL`) dossier is then editable by every comité member and invisible to no one specific — weak ownership/audit.

**Recommended fix.** Split policies so the applicant path is pinned and `owner_id` is enforced:
```sql
-- applicant: can only ever touch their own dossier, owner pinned
create policy startups_owner_rw on public.startups for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- staff: separate policy
create policy startups_staff_rw on public.startups for all
  using (public.has_platform_role('comite') or public.has_platform_role('admin'))
  with check (public.has_platform_role('comite') or public.has_platform_role('admin'));
```
Consider `owner_id uuid not null` for new applicant-created dossiers (allow NULL only for back-office imports created by `service_role`). Also guard `status` transitions (an applicant should not be able to self-set `status = 'laureat'`); enforce allowed values via a trigger or a stricter `WITH CHECK`.

### H3 — Reference tables fully world-readable, including drafts and thresholds

**Evidence.** `editions_read` / `sessions_read` are `using (true)` (L130-131). This exposes:
- Unpublished/`draft` editions (e.g. 2027 planning) to anyone via PostgREST.
- `eligibility_rules` JSON — the exact `revenue_max`/`raised_max` thresholds and exclusion dates — which candidates could use to game declared figures.

**Recommended fix.** Either gate reads to published editions, or hide rule internals from the public:
```sql
drop policy editions_read on public.editions;
create policy editions_read on public.editions for select
  using (status <> 'draft' or public.has_platform_role('admin') or public.has_platform_role('comite'));
```
Consider serving `eligibility_rules` only to staff (move thresholds out of the public projection, or expose a sanitised read view).

---

## Medium

### M1 — `ilike` wildcard injection in client profile lookup

**Evidence.** `platform/auth.jsx:33` `.ilike('email', email)`. If `email` contains `%` or `_` (valid in the local part of an address, e.g. `a_b@x.com`, or attacker-supplied), `ilike` interprets them as wildcards and may match a *different* profile row, returning someone else's `platform_roles` to the client UI.

**Why it matters.** This is a client-side display/role-derivation bug only (real authorization is server-side RLS), but it can mislead the UI into showing privileged controls and could combine with other weaknesses. Use exact, case-insensitive match instead:
```js
.eq('email', String(email).trim().toLowerCase())   // and store emails lowercased
// or: .filter('email', 'ilike', escapeLike(email))
```
Note the legacy `AuthContext.jsx:33` already uses `.eq('email', email)` which is safer — align both.

### M2 — Magic-link redirect / open-redirect surface

**Evidence.** `signInWithMagicLink(email, redirectPath)` builds `emailRedirectTo: ${APP_URL}${redirectPath}` (L60-67). `redirectPath` is caller-supplied and unvalidated; `APP_URL` falls back to `window.location.origin`. If the Supabase Auth **Redirect URLs** allow-list is broad (wildcards) — common during setup — a crafted `redirectPath` (e.g. `//evil.com`, `/..//evil.com`, or a path with an embedded URL) can send the post-auth redirect (carrying the token in the URL fragment) off-site.

**Recommended fix.**
- Keep the Supabase Redirect URL allow-list tight: only `https://app.rotary-startup.org/*` (and explicit local dev origins). Supabase will reject any `emailRedirectTo` not on the list — this is the real defense.
- Validate `redirectPath` client-side: must start with a single `/`, no `//`, no scheme, no `@`. Reject otherwise and fall back to `/`.
- Confirm `VITE_APP_URL` is set in prod so it does not fall back to `window.location.origin`.

### M3 — `selection_reviews` visibility

**Evidence.** `reviews_comite` (L152-154) gives comité+admin full access; **no read for jury**, and **no read for the startup owner**. Jury can read `startups` but not the comité's selection rationale (probably intended — keeps deliberations private). Startups cannot see decisions about themselves (also probably intended pre-announcement). RLS is enabled and there is at least one policy, so no lockout.

**Recommended fix.** Confirm intent. If a startup should eventually see its own decision, add a scoped read:
```sql
create policy reviews_owner_read on public.selection_reviews for select
  using (exists (select 1 from public.startups s
                 where s.id = selection_reviews.startup_id and s.owner_id = auth.uid()));
```
Otherwise document that decisions are surfaced only through a curated `startups.status`/email channel.

### M4 — Eligibility evaluation edge cases (`src/lib/rsa/eligibility.js`)

Observed behaviour and risks:

- **`country` (L55-58):** exact `allowed.includes(startup.country)`. Case/whitespace-sensitive — `"fr"`, `" FR"`, `"France"` all fail and would be auto-**excluded** (`behavior: 'exclu'`). Since this is a hard rejection, normalise input to ISO-2 uppercase at the funnel and validate against an enum before this runs.
- **`created_after` (L59-61):** `new Date(startup.creation_date)`. For a bare date string PostgreSQL returns `YYYY-MM-DD`; `new Date('YYYY-MM-DD')` parses as **UTC midnight**, while `new Date('2020-01-01')` (threshold) is also UTC — consistent, OK. But any non-ISO format (e.g. `01/02/2020`) is locale/engine-dependent → `Invalid Date` → comparison `>=` is `false` → silent auto-exclusion. Guard with an explicit parse + `isNaN(d.getTime())` and surface a validation error rather than a silent exclude.
- **`revenue_max` / `raised_max` (L63-69):** `startup.last_revenue == null || Number(...) < threshold`. `Number('1,000,000')` → `NaN`; `NaN < threshold` is `false` → counted as a (flag) failure. `Number('')` → `0` (passes). `null`/`undefined` explicitly pass (treated as “not yet declared”). Decide whether missing/garbage should pass-as-unknown or flag; add a `Number.isFinite` guard and treat `NaN` distinctly from `null`.
- **`founders_majority` (L71-73):** strict `=== true`; any non-boolean (`'true'`, `1`, `null`) flags. Fine, but ensure the funnel stores a real boolean.
- **`isPlaceholderRegistration` (L31-38):** good defensive defaults (null/empty/all-zeros/`123123…` → placeholder, i.e. flagged). Note it strips non-digits, so an alpha-only SIREN/Handelsregister like `HRB 12345` reduces to `12345` and passes; German registration numbers are alphanumeric — broaden detection or make the check country-aware.
- **`docs_required` (L79-83):** checks only that `*_path` is truthy, not that the object exists/owned. Pair with the Storage owner check (C2) so a path string cannot be forged.

**Recommended fix.** Add an input-validation layer at the funnel (before persistence and before `evaluateEligibility`): trim/normalise `country` to ISO-2, validate `creation_date` as ISO and not future, coerce numerics with `Number.isFinite` (reject non-numeric strings with a user error), and cast `founders_majority` to boolean. Treat `evaluateEligibility` as operating on already-validated, typed data; keep its current null-tolerance only for genuinely optional fields.

---

## Low

- **L1 — Retention / erasure (RGPD Art. 5(1)(e), Art. 17).** No retention window or deletion path for candidate PII (`startups` contact fields, uploaded docs) once an edition closes. Define a retention period, an erasure procedure (DB row + Storage objects), and a basis/notice. `startups` → `selection_reviews`/`storage.objects` cascade is partial: `selection_reviews` cascades on `startup` delete, but Storage objects are **not** linked and won’t be cleaned up — track and purge them explicitly.
- **L2 — Data minimization.** `eligibility` JSONB stores a snapshot that may duplicate sensitive fields; ensure it stores verdict/flags, not raw PII. Avoid logging document URLs (they are currently public — see C2).
- **L3 — `updated_at` not maintained.** `startups.updated_at` defaults to `now()` but has no `BEFORE UPDATE` trigger; it will go stale. Add a `moddatetime`/trigger if it’s used for audit.
- **L4 — `has_platform_role` is `stable` + `set search_path = public`.** Correct and safe; just keep it `SECURITY DEFINER` only as long as it solely *reads* — never extend it to write.
- **L5 — `reviewer_id`/`owner_id` reference `auth.users` but back-office identity is email-based.** Confirm these get populated (currently nullable); otherwise audit trails are empty.

---

## Remediation checklist (ordered)

1. **[C1] Enable RLS on `public.profiles`** and `revoke update (platform_roles, role)` from `anon, authenticated`. Add self-read + admin/comité-read policies. Roles writable by `service_role` only. *(Highest priority — closes self-grant-to-admin.)*
2. **[C2] Make `uploads` private** (or create a private `dossiers` bucket for candidate docs), add `storage.objects` RLS (owner-folder + comité/jury/admin), and switch all reads from `getPublicUrl` to short-TTL `createSignedUrl`. Migrate/relocate existing objects.
3. **[C3] Remove client-trusted writes in `StartupUpload.jsx`**: server-issued signed upload URLs scoped to one path, RLS on `startup_confirmations` keyed to the token row, drop `x-upsert` from the public client, high-entropy single-use tokens.
4. **[H1] Bind roles to `auth.uid()`** (add `profiles.user_id`, backfill, rewrite `has_platform_role`). If email binding must remain, ensure step 1 fully locks role/email writes; canonicalise seeded admin emails (Gmail dots/+tags).
5. **[H2] Split `startups` policies**: applicant policy pins `owner_id = auth.uid()` (USING + WITH CHECK), make `owner_id NOT NULL` for applicant inserts, separate staff policy, and guard `status` transitions.
6. **[H3] Restrict `editions` reads** to non-draft (or staff), and hide `eligibility_rules` thresholds from the public projection.
7. **[M1] Replace `ilike` with exact lowercased `eq`** in `platform/auth.jsx` profile lookup; store emails lowercased; align with `AuthContext.jsx`.
8. **[M2] Tighten Supabase Auth Redirect URL allow-list** to prod + dev origins only; validate `redirectPath` (leading single `/`, no `//`/scheme/`@`); ensure `VITE_APP_URL` set in prod.
9. **[M4] Add a funnel input-validation layer** (country ISO-2, date ISO + not-future, `Number.isFinite` numerics, boolean cast) before persistence and before `evaluateEligibility`; broaden `isPlaceholderRegistration` for DE alphanumeric numbers.
10. **[M3] Decide & document `selection_reviews` visibility**; add owner-read policy if startups should see their own decision.
11. **[L1/L2] Define PII retention + erasure** (DB rows + Storage objects), confirm `eligibility` JSONB stores no raw PII, stop relying on public document URLs.
12. **[L3] Add `updated_at` trigger** on `startups` (and any audited table).
13. **Add `supabase/tests/rls.sql`** regression tests: (a) applicant A cannot read/update startup of applicant B; (b) authenticated non-staff cannot update its own `platform_roles`; (c) anon cannot read a private `uploads` object; (d) editions `draft` hidden from public. Run in CI.

---

### Appendix — verified facts used in this review
- `uploads` bucket is **public**: confirmed by exclusive use of `getPublicUrl`/`/object/public/uploads/` across `db.js`, `StartupUpload.jsx`, `consolidate-jury-pack/index.ts`, `DecksTab.jsx`, `FinaleEmailsSection.jsx`, `RsaJuryHub.jsx`, and the `build_briefings.py` comment.
- `profiles` RLS: **not enabled** in any file under `supabase/migrations/` (only the additive `platform_roles` column is added).
- No `storage.objects` / `storage.buckets` policy exists in any migration.
- `has_platform_role` NULL-jwt behaviour: returns false (safe) — `lower(NULL)` yields NULL, row excluded.
- `HARDENING-PLAN.md` at repo root pertains to a different (mobile/IAP) project and is **not** about the RSA platform; not used as a source of truth here.
