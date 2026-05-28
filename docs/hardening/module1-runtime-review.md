# RSA Platform — Module 1 Runtime / Code-Level Security Review

**Scope:** the candidature funnel runtime as it stands after Module 1 landed —
`src/components/rsa/candidature/**`, `src/pages/MonDossier.jsx`, `src/lib/rsa/{entities,storage,eligibility}.js`,
`src/lib/platform/auth.jsx`, and migrations `20260527_rsa_platform_foundation.sql`,
`20260527_rsa_platform_roles_hardening.sql`, `20260527_rsa_module1_prep.sql`.

**Builds on** `docs/hardening/foundation-auth-rls-review.md` (C1/C2/C3/H1/H2/H3/M1–4/L1) — that
review closed at the schema layer; this one looks at the candidature *runtime*. References to
prior IDs are explicit; nothing here duplicates them.

**Status:** documentation only — no code or DB changes performed. Fixes are proposals.

**Reviewer date:** 2026-05-28

---

## TL;DR — top findings

| # | Severity | Finding | Closes / extends |
|---|----------|---------|------------------|
| R-C1 | **Critical** | Applicant can self-promote dossier status (`status = 'laureat'`/`finaliste`/`affecte` …) because no migration restricts which columns of `startups` an owner may UPDATE. Same RLS hole admits arbitrary writes to `session_id`, `eligibility`, `submitted_at`. | H2 residual (explicitly deferred in `20260527_rsa_module1_prep.sql` §2d) |
| R-C2 | **Critical** | The eligibility snapshot is computed **client-side** in `useSubmitDossier` (`useCandidature.js:74-82`) and written verbatim to `startups.eligibility` via the trusted update path. A forged client posts `verdict: 'eligible'` and the comité reads it as truth. | Builds on M4; not covered by foundation review (no submit path existed yet). |
| R-C3 | **Critical** | `Startup.submit()` is just an UPDATE — there is no server-side validation that required fields are filled, that the row is still `brouillon`, that the edition's `application_close` has not passed, nor that `submitted_at` is server-time. All four can be bypassed by a forged client. | Extends H2 residual. |
| R-H1 | **High** | The XHR upload path in `storage.js:108-123` does **`Bearer ${accessToken || apiKey}`** — if the user session expired between issuing the dropzone and firing the request, the upload silently falls back to the anon key as bearer, defeating `owns_startup()` (returns false → policy denies → confusing 401, but in a permissive future variant this is the exact pattern that re-opens C3 of the foundation review). | Echoes foundation C3 pattern. |
| R-H2 | **High** | Storage RLS does not constrain segment `[5]` to `DOC_KINDS.folder` values. An authenticated owner can upload under their own dossier with `kind='evil'` (path `…/startups/<sid>/evil/…`). Impact is bounded to the user's own folder but breaks the "documents fit a known taxonomy" invariant the staff UI relies on. | Extends C2 (foundation). |
| R-H3 | **High** | `removeDossierFile` is fire-and-forget (`removeDossierFile(previous).catch(() => {})` in `DocumentDropzone.jsx:64-66, 83`). On replace/remove failures the orphan stays in storage; on dossier delete no cleanup happens at all. RGPD retention + L1 residual. | Extends L1. |
| R-H4 | **High** | `country = '__other__'` marker (StepCompany.jsx:24, 67) persists to the DB as the literal string `'__other__'`. The comité back-office, jury export, future emails and the eligibility engine (`evaluateEligibility` will mark it `excluded` because it's not in `['FR','DE']`) see it as a country. Today it's masked in the recap (`null` rendering) but it is a real DB value, not a UI-only token. | New. |
| R-M1 | **Medium** | Race between debounced autosave and submit: `handleSubmit` in `MonDossier.jsx:85-95` calls `saveDraft.mutateAsync` then `submit.mutateAsync` sequentially, but the funnel's `pendingRef` is still in-flight via `queueAutosave` if a keystroke happened within 800 ms before pressing Submit, and the submit's optimistic snapshot can race the pending autosave's `onSettled`. Stale data may overwrite the submitted row. | New. |
| R-M2 | **Medium** | `Startup.saveDraft(id, patch)` does `update(id, { ...patch, updated_at: new Date().toISOString() })`. A forged client `patch` can include `owner_id`, `edition_id`, `status`, `submitted_at`, `eligibility`. RLS blocks `owner_id` changes (good) but not the others. Should be column-allowlisted server-side. | Extends R-C1. |
| R-M3 | **Medium** | Signed-URL TTL is 60 s for upload echo (`signedDossierUrl`) and 120 s for tracking (`CandidatureTracking.jsx:45`). 60 s breaks on slow connections; 120 s is fine, but the URL is rendered into the HTML and can be screenshot/forwarded. Acceptable risk; raise download TTL to 300 s and document. | New. |
| R-M4 | **Medium** | `loadIdentity` in `platform/auth.jsx:32-35` still uses `.ilike('email', email)` — same `%`/`_` wildcard exposure flagged in foundation M1 but for the *new* `app_user_roles` lookup as well. Re-flagged because the role decision now depends on it. | Foundation M1 residual. |
| R-M5 | **Medium** | Eligibility engine NaN/locale fragility (foundation M4) still unaddressed in code — only the funnel's TextInput shapes the value; submission goes through with whatever string the field holds. `Number('1,000,000') → NaN` flags as non-eligible silently. | Foundation M4 residual. |
| R-L1 | Low | DE `registration_number` placeholder detection: `isPlaceholderRegistration` strips non-digits, so `HRB 12345` becomes `12345` and passes; pure alpha placeholders (e.g. `XXX`) reduce to empty → flagged correctly. Make it country-aware. | Foundation M4 residual. |
| R-L2 | Low | `eligibility` snapshot stored at submit-time is never refreshed if comité updates `editions.eligibility_rules` post-submission. Decide & document whether the snapshot is canonical (recommended) or recomputable. | New. |
| R-L3 | Low | `useMyDossier` queries by `edition_id` and takes the most recent — relies on RLS scoping by `owner_id`. The migration's partial UNIQUE `(owner_id, edition_id) WHERE owner_id IS NOT NULL` already prevents duplicates for self-service; document the back-office import path that can create orphans (NULL `owner_id`) which the candidate would then never see — fine for now but confirm. | New. |
| R-L4 | Low | `MonDossier.jsx` redirects unauthenticated to `/Login` — UX gate only. Real boundary is RLS (no API succeeds without `owner_id = auth.uid()`), confirmed by reading `entities.js`/policies. PlatformAuthProvider mounts globally but only reads `profiles`/`app_user_roles` of the current user (no leak to lunch pages). | Confirmed clean. |

---

## Critical

### R-C1 — Status / privileged-column self-update (closes foundation H2 residual)

**Evidence.** `20260527_rsa_module1_prep.sql:54-66` keeps `startups_applicant_update`'s
USING/WITH CHECK at `owner_id = auth.uid()` only. The comment §2d explicitly says:

> RISQUE RÉSIDUEL (cf. revue H2) : un applicant peut toujours auto-modifier son `status`
> (ex. se déclarer 'laureat'). Le verrouillage des transitions de statut relève d'un
> trigger / WITH CHECK plus fin et est laissé à Module 2 (sélection).

PostgREST + `Startup.update` (`entities.js:54-58`) is a bare `update().eq('id', id)` — any column
provided in the patch makes it through. Today the funnel only sends "data" columns, but any
authenticated user with the dossier id can craft:

```
PATCH /rest/v1/startups?id=eq.<my-uuid>
{ "status": "laureat", "session_id": "final_grande",
  "eligibility": { "verdict": "eligible" }, "submitted_at": "2099-01-01" }
```

and the policy accepts it. The comité then sees a candidate self-promoted to laureate, with
their session assigned and their eligibility snapshot rewritten to clean.

**Recommended fix — single SECURITY DEFINER submit RPC + status guard trigger.**

The cleanest answer is one SECURITY DEFINER RPC for the *submit* transition (it must
recompute eligibility server-side anyway — see R-C2) **plus** a generic trigger that
enforces the status transition whitelist for any update. The trigger is the
defense-in-depth; the RPC is the canonical happy path.

```sql
-- A. Server-side submit (atomic: validate -> recompute eligibility -> set status).
create or replace function public.rsa_submit_dossier(p_id uuid)
returns public.startups
language plpgsql security definer set search_path = public as $$
declare
  v_row    public.startups;
  v_ed     public.editions;
  v_rules  jsonb;
  v_now    timestamptz := now();
  v_eval   jsonb;
begin
  -- ownership: the caller must own this row (or be staff).
  select * into v_row from public.startups
   where id = p_id
     and (owner_id = auth.uid()
          or public.has_platform_role('comite')
          or public.has_platform_role('admin'))
   for update;
  if not found then
    raise exception 'not_found_or_forbidden' using errcode = '42501';
  end if;

  if v_row.status <> 'brouillon' then
    raise exception 'invalid_transition: % -> soumis', v_row.status using errcode = '22023';
  end if;

  select * into v_ed from public.editions where id = v_row.edition_id;
  if v_ed.status not in ('open') then
    raise exception 'edition_closed' using errcode = '22023';
  end if;
  if v_ed.application_close is not null
     and v_now::date > v_ed.application_close then
    raise exception 'application_closed' using errcode = '22023';
  end if;

  -- required fields (mirror src/components/rsa/candidature/validation.js).
  if v_row.name is null or length(btrim(v_row.name)) = 0
     or v_row.contact_person is null or length(btrim(v_row.contact_person)) = 0
     or v_row.email is null or length(btrim(v_row.email)) = 0
     or v_row.country is null or v_row.country = '__other__'
     or v_row.creation_date is null
     or v_row.registration_number is null or length(btrim(v_row.registration_number)) = 0
     or v_row.founders_majority is null
     or v_row.value_proposition is null
     or v_row.business_model is null
     or v_row.roadmap is null
     or v_row.team is null
     or v_row.traction is null
     or coalesce(array_length(v_row.sectors, 1), 0) = 0
     or v_row.pitch_deck_path is null
     or v_row.exec_summary_path is null
  then
    raise exception 'missing_required_fields' using errcode = '22023';
  end if;

  -- canonical eligibility (use a SQL/plpgsql twin of eligibility.js; see R-C2).
  v_rules := coalesce(v_ed.eligibility_rules, '{}'::jsonb);
  v_eval  := public.rsa_evaluate_eligibility(v_row, v_rules);

  update public.startups
     set status       = 'soumis',
         submitted_at = v_now,
         updated_at   = v_now,
         eligibility  = v_eval
   where id = p_id
   returning * into v_row;

  return v_row;
end;
$$;
revoke all on function public.rsa_submit_dossier(uuid) from public;
grant execute on function public.rsa_submit_dossier(uuid) to authenticated;

-- B. Defense-in-depth: status transitions whitelist for any UPDATE that is not staff.
create or replace function public.startups_guard_update()
returns trigger language plpgsql as $$
begin
  -- Staff (comité/admin) bypass — Module 2 will tighten further.
  if public.has_platform_role('comite') or public.has_platform_role('admin') then
    return new;
  end if;
  -- Applicant updates: forbid editing privileged columns directly.
  if new.status        is distinct from old.status        then raise exception 'forbidden_field:status';        end if;
  if new.submitted_at  is distinct from old.submitted_at  then raise exception 'forbidden_field:submitted_at';  end if;
  if new.eligibility   is distinct from old.eligibility   then raise exception 'forbidden_field:eligibility';   end if;
  if new.session_id    is distinct from old.session_id    then raise exception 'forbidden_field:session_id';    end if;
  if new.owner_id      is distinct from old.owner_id      then raise exception 'forbidden_field:owner_id';      end if;
  if new.edition_id    is distinct from old.edition_id    then raise exception 'forbidden_field:edition_id';    end if;
  return new;
end;
$$;

create trigger startups_guard_update_trg
  before update on public.startups
  for each row execute function public.startups_guard_update();
```

Client side: `Startup.submit` switches from `update(…)` to `supabase.rpc('rsa_submit_dossier', { p_id: id })`.

> **Why both?** Column-level REVOKE is a viable alternative (REVOKE table-level UPDATE
> on startups from `authenticated`, then GRANT UPDATE on the exact whitelist of columns),
> but PostgREST + Supabase RLS interplay with column GRANTs is fiddly and the trigger
> is portable. The trigger is also expressive enough to allow the RPC's UPDATE because
> the RPC is SECURITY DEFINER (runs as owner) and we add a sentinel — or simpler:
> the trigger skips when the session role is the function owner. Or: have the RPC
> bypass the trigger via `set local session_replication_role = replica` if owned by
> a role that's allowed to. Pick one (the sentinel pattern is the safest IMO).

---

### R-C2 — Eligibility snapshot integrity (forged verdict)

**Evidence.** `useCandidature.js:71-88` computes the eligibility client-side and writes the
returned object through the standard `Startup.submit` UPDATE path:

```js
const evaluated = evaluateEligibility(draft || {}, rules);
const eligibility = { verdict: evaluated.verdict, failed: evaluated.failed, evaluated_at: new Date().toISOString() };
return Startup.submit(id, { eligibility });
```

`Startup.submit` (`entities.js:147-154`) then does
`update(id, { status:'soumis', eligibility, submitted_at, updated_at })`.

A trivially modified client can post `{ verdict: 'eligible', failed: [] }` for a startup
whose country is, say, `RU`, and the comité dashboard / consolidate-jury-pack will read it
as canonical. This is direct evidence-tampering, not just policy bypass.

**Recommended fix.** Move the calculation into the RPC (R-C1) and **drop** the
client-supplied `eligibility` payload. Provide a SQL twin of `evaluateEligibility`:

```sql
create or replace function public.rsa_evaluate_eligibility(p_row public.startups, p_rules jsonb)
returns jsonb language plpgsql immutable as $$
declare
  v_failed jsonb := '[]'::jsonb;
  v_excl   boolean := false;
  v_flag   boolean := false;
  v_now    timestamptz := now();
  v_country_allowed text[];
  v_after  date;
  v_rev    numeric;
  v_raised numeric;
  v_regn   text;
begin
  -- country (exclu)
  if p_rules ? 'country' and coalesce(p_rules->'country'->>'behavior','off') <> 'off' then
    select array(select jsonb_array_elements_text(p_rules->'country'->'allowed')) into v_country_allowed;
    if p_row.country is null or not (p_row.country = any(v_country_allowed)) then
      v_failed := v_failed || jsonb_build_object('rule','country','behavior',p_rules->'country'->>'behavior');
      v_excl   := v_excl or (p_rules->'country'->>'behavior') = 'exclu';
    end if;
  end if;
  -- created_after (exclu)
  if p_rules ? 'created_after' and coalesce(p_rules->'created_after'->>'behavior','off') <> 'off' then
    v_after := (p_rules->'created_after'->>'date')::date;
    if p_row.creation_date is null or p_row.creation_date < v_after then
      v_failed := v_failed || jsonb_build_object('rule','created_after','behavior',p_rules->'created_after'->>'behavior');
      v_excl   := v_excl or (p_rules->'created_after'->>'behavior') = 'exclu';
    end if;
  end if;
  -- revenue_max (flag)
  if p_rules ? 'revenue_max' and coalesce(p_rules->'revenue_max'->>'behavior','off') <> 'off' then
    v_rev := (p_rules->'revenue_max'->>'threshold')::numeric;
    if p_row.last_revenue is not null and p_row.last_revenue >= v_rev then
      v_failed := v_failed || jsonb_build_object('rule','revenue_max','behavior',p_rules->'revenue_max'->>'behavior');
      v_flag := v_flag or (p_rules->'revenue_max'->>'behavior') = 'flag';
    end if;
  end if;
  -- raised_max (flag)
  if p_rules ? 'raised_max' and coalesce(p_rules->'raised_max'->>'behavior','off') <> 'off' then
    v_raised := (p_rules->'raised_max'->>'threshold')::numeric;
    if p_row.amount_raised is not null and p_row.amount_raised >= v_raised then
      v_failed := v_failed || jsonb_build_object('rule','raised_max','behavior',p_rules->'raised_max'->>'behavior');
      v_flag := v_flag or (p_rules->'raised_max'->>'behavior') = 'flag';
    end if;
  end if;
  -- founders_majority (flag) / registration (flag) / docs_required (flag) … same shape.
  return jsonb_build_object(
    'verdict', case when v_excl then 'excluded' when jsonb_array_length(v_failed) > 0 then 'flagged' else 'eligible' end,
    'failed',  v_failed,
    'evaluated_at', v_now
  );
end;
$$;
```

Keep `eligibility.js` purely for the live UI preview (informational); the canonical truth is
the RPC-computed snapshot stored at submission.

---

### R-C3 — Submit-without-validation / submit-after-deadline / replay

**Evidence.** Same `Startup.submit` path. The funnel's `firstStepWithMissing` (`validation.js:99-102`)
runs only in `StepReview.handleSubmitClick` (`StepReview.jsx:127-134`) — purely UX. A
forged client calls `Startup.submit` directly and bypasses every required check; further,
nothing on the server rejects:

- submit on a `closed` edition (MonDossier computes `closed` from `application_close` for
  the UI, but does not enforce server-side — `useSubmitDossier` will happily submit),
- submit when the row is already `soumis` (replay → resets `submitted_at` and `eligibility`
  to a fresh — possibly forged — snapshot),
- `submitted_at` set to a client-chosen timestamp.

**Recommended fix.** All three are closed by R-C1's RPC: the RPC checks `status='brouillon'`,
`edition.status='open'` and `application_close >= now()::date`, computes server-time `submitted_at`,
and recomputes eligibility (R-C2). With the trigger from R-C1 in place the direct UPDATE path
is also denied.

---

## High

### R-H1 — XHR upload silently falls back to anon-key bearer

**Evidence.** `src/lib/rsa/storage.js:103-114`:

```js
const { data: { session } } = await supabase.auth.getSession();
const accessToken = session?.access_token;
…
xhr.setRequestHeader('Authorization', `Bearer ${accessToken || apiKey}`);
```

The fallback `accessToken || apiKey` is the same anti-pattern the foundation review flagged
in C3 of the legacy `StartupUpload.jsx`. If the session token has expired (Supabase JWTs are
~1h by default; user keeps the tab open) and `getSession()` does not auto-refresh in time,
the upload is sent with the anon JWT in the `Authorization` header. Storage RLS for
`dossiers_insert` requires `owns_startup(...)` which evaluates `auth.uid() = owner` — with
anon, `auth.uid()` is `NULL` → policy denies → user gets a confusing 401 they cannot recover
from without reload.

A future relaxation of the storage policies would turn this into a real C3-style hole.

**Recommended fix.**

```diff
-    xhr.setRequestHeader('Authorization', `Bearer ${accessToken || apiKey}`);
+    if (!accessToken) {
+      throw new Error('auth_required'); // surface a real "please re-login" to the user
+    }
+    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
```

Optionally call `supabase.auth.refreshSession()` before kicking off long uploads, or use
`createSignedUploadUrl` for the deck (long upload, slow connection) and skip auth on the PUT.

**Confirmed clean otherwise:** the path uses the user JWT (not service_role) when a session is
present — service_role is server-only and not exposed to the client at all.

---

### R-H2 — Storage RLS does not constrain segment `[5]` to known kinds

**Evidence.** Policies in `20260527_rsa_module1_prep.sql:160-241` only check segments
`[1]='editions'`, `[3]='startups'`, and `owns_startup([4])`. Segment `[5]` (the `kind`) is
unrestricted. `storage.js#buildDossierPath` constructs `…/{folder}/…` from `DOC_KINDS[kind].folder`
but the policy doesn't enforce it — a forged client can call the storage REST endpoint
directly with `…/startups/<mine>/evil/whatever.pdf` and the upload succeeds.

Impact: bounded to the user's own dossier folder (cannot escape to another applicant), but
the staff UI (`CandidatureTracking`, `consolidate-jury-pack`) reads from
`pitch_deck_path`/`exec_summary_path` columns set by the client — so the column is the
real authority. Still, the invariant should hold.

**Recommended fix.** Tighten the storage policies:

```sql
-- in each of dossiers_insert / dossiers_update WITH CHECK
and (storage.foldername(name))[5] in ('pitch_deck','exec_summary')
```

Or, even simpler, add a CHECK that segment [5] equals one of the folder names listed in
`DOC_KINDS`. Keep R-C1's trigger as the column-side guard (`pitch_deck_path` / `exec_summary_path`
can only point to a valid path the policy accepted).

**Server-side MIME enforcement (acceptable risk):** Storage RLS cannot verify MIME — only the
client `validateDossierFile` checks ext/size. A motivated user can rename `malware.exe` to
`deck.pdf`. The signed-URL download flow means staff browsers won't auto-execute it
(content-disposition is `attachment` by default with Supabase signed URLs), and the bucket
size cap is enforced at the API level. Accept this risk for Module 1; an Edge function that
streams + sniffs (`file`/`libmagic`) before writing would close it in Module 4.

---

### R-H3 — Orphan storage objects on failure / dossier delete (extends L1)

**Evidence.** `DocumentDropzone.jsx:64-66`:

```js
if (previous && previous !== path) {
  removeDossierFile(previous).catch(() => {});
}
```

…and on remove (`:83`) similarly fire-and-forget. If the delete fails (network blip, RLS
transient) the orphan persists. Worse: there is no DB→storage cascade. If a draft row is
deleted (RLS `startups_applicant_delete` allows it), the objects under
`editions/<ed>/startups/<sid>/...` stay forever. This is the L1 retention residual made
concrete.

**Recommended fix.**

1. **Best-effort retry** in the client: queue failed removes into local storage and retry on
   next page load (low impact, easy).
2. **Server-side cascade** via a scheduled cleanup, or an `AFTER DELETE` trigger on
   `startups` that enqueues a cleanup task in a `storage_cleanup_queue` table, processed by
   a scheduled Edge function (Supabase cron). Sketch:

   ```sql
   create table if not exists public.storage_cleanup_queue (
     id uuid primary key default gen_random_uuid(),
     bucket_id text not null,
     prefix    text not null,
     created_at timestamptz not null default now(),
     processed_at timestamptz
   );
   create or replace function public.startups_enqueue_cleanup()
   returns trigger language plpgsql security definer as $$
   begin
     insert into public.storage_cleanup_queue (bucket_id, prefix)
     values ('dossiers',
             'editions/' || old.edition_id || '/startups/' || old.id::text || '/');
     return old;
   end$$;
   create trigger startups_after_delete_cleanup
     after delete on public.startups
     for each row execute function public.startups_enqueue_cleanup();
   ```

   Then a daily Edge function `process-storage-cleanup` lists+deletes objects under each
   prefix and stamps `processed_at`.
3. **Retention policy** (the L1 ask): keep candidate PII + storage for N years post-edition
   (set N from legal counsel; common pattern is 3 years for award/contest contexts). Add a
   scheduled job that flags then deletes after the window.

---

### R-H4 — `country = '__other__'` literal persists to the DB

**Evidence.** `StepCompany.jsx:24, 67`:

```js
if (next === 'autre') onChange?.('country', '__other__'); // marqueur transitoire
…
onChange?.('country', e.target.value || '__other__')
```

If the user selects "Autre" and never fills the text input, `startups.country` is literally
`'__other__'`. Side-effects observed today:

- `evaluateEligibility` will treat it as not-in-`['FR','DE']` → `excluded` (correct outcome,
  but for the wrong reason).
- `StepReview.jsx:125` masks it to `null` for the recap — UI-only patch.
- `CandidatureTracking`, `consolidate-jury-pack`, any future export/email, and the comité
  dashboard see the literal `__other__`.
- The submit-side R-C1 RPC adds an explicit `country = '__other__'` failure (already in the
  sketch above) — good, but the *draft* row is still polluted in autosave snapshots and any
  staff-side query.

**Recommended fix.**

1. Stop persisting the marker — store `country = null` instead and represent "Autre + empty
   text" as `null + "I selected other but didn't fill it"`. Easiest: when the user picks
   "Autre", do **not** call `onChange` until they type in the text input; render the text
   input bound to a local-only state until then.
2. If the marker must stay (UI legacy), add a sanitizer at autosave time:

   ```js
   // useCandidature.js #useSaveDraft mutationFn
   const sanitized = { ...patch };
   if (sanitized.country === '__other__') sanitized.country = null;
   return Startup.saveDraft(id, sanitized);
   ```

   …and an equivalent server-side guard in the RPC.
3. The R-C1 RPC already rejects `country = '__other__'` on submit — keep that.

---

## Medium

### R-M1 — Autosave / submit race & partial-save handling

**Evidence.** `MonDossier.jsx:85-95`:

```js
const handleSubmit = useCallback(async (draft) => {
  if (!dossier?.id) return;
  const { id: _omitId, ...patch } = draft || {};
  await saveDraft.mutateAsync({ id: dossier.id, patch });
  await submit.mutateAsync({ id: dossier.id, draft });
  setEditingSubmitted(false);
}, …);
```

And `CandidatureFunnel.jsx:140-153`: `handleSubmit` calls `flushPending()` (sync flush of
the autosave timer) then `firstStepWithMissing(draft)` against local state, then
`onSubmit?.(draft)`. The `draft` here is the **funnel-local** state (correct), but in
parallel `pendingRef` might already have been flushed via `onFlush?.(patch)` which the
parent dispatches as a non-awaited `saveDraft.mutate` (`MonDossier.jsx:67-72` —
`handlePatch` is mutate, not mutateAsync). So:

1. T0: keystroke in textarea fires `queueAutosave` (800 ms timer).
2. T+200ms: user clicks Submit. `flushPending` clears the timer and fires
   `onFlush?.(patch)` → parent `handleFlush` returns the mutateAsync **promise**, but the
   funnel doesn't await it (`flushPending` is sync; the `Promise.resolve()` is dropped).
3. The funnel then calls `onSubmit?.(draft)` → parent `handleSubmit` awaits
   `saveDraft.mutateAsync({...patch})` (with `draft` minus id) → then submit.

There are two saveDraft calls in flight (the flush's, and the explicit one in `handleSubmit`),
both `update startups set …`. They have the same `id` so they serialize on the DB, but their
optimistic updates can interleave in TanStack Query's cache. If the flush's response arrives
**after** the submit's success, `onSettled(row)` overwrites the submitted row with the
draft-era row → status flips back to `brouillon` in the UI until the next refetch.

**Recommended fix.**

- In `CandidatureFunnel#handleSubmit`, **await** the flush:
  ```js
  await Promise.resolve(flushPending()); // make flushPending return the parent's promise
  ```
  And have `flushPending` actually return `onFlush?.(patch)` so callers can await it.
- In `MonDossier#handleSubmit`, drop the redundant `await saveDraft.mutateAsync(...)`
  — the flush already covered it. (Or keep it but await the in-flight flush first.)
- Once R-C1's RPC is in place, the submit RPC reads the latest committed row from the DB,
  so the cache race shrinks to a UI-only ordering issue solved by invalidating the
  myDossier key on submit success (`qc.invalidateQueries(KEYS.myDossier(editionId))`).

**Partial saves / retry.** `useSaveDraft.onError` rolls back the optimistic cache — good. But
there is no retry on transient network failures and no surface to the user other than the
"Enregistré" indicator going stale. Add:

- `retry: 2` with exponential backoff on the mutation.
- A "last saved Xs ago" relative-time pill (already present visually) that turns red on
  error and exposes a "Réessayer" CTA.

### R-M2 — `saveDraft` patch column allowlist

**Evidence.** `Startup.saveDraft(id, patch)` is `update(id, { ...patch, updated_at })`.
Nothing in the entity layer constrains which columns end up in `patch`. The funnel only
sends data columns, but a forged client could send `{ status:'laureat', session_id:'…' }`
through the same endpoint.

**Recommended fix.** The R-C1 trigger closes the privileged columns at the DB layer.
*Belt-and-braces*: in `entities.js#saveDraft`, intersect `patch` with a hardcoded allowlist
matching the funnel's editable fields:

```js
const SAVE_DRAFT_FIELDS = new Set([
  'name','contact_person','email','phone','website',
  'country','creation_date','registration_number','founders_majority',
  'value_proposition','business_model','roadmap','team','traction','esg_impact','sectors',
  'last_revenue','amount_raised',
  'pitch_deck_path','exec_summary_path','video_pitch_url',
  'partner_institution','rotary_club',
]);
async saveDraft(id, patch) {
  const safe = Object.fromEntries(Object.entries(patch).filter(([k]) => SAVE_DRAFT_FIELDS.has(k)));
  return this.update(id, { ...safe, updated_at: new Date().toISOString() });
}
```

Client allowlist is not security, but it prevents accidental upstream regressions.

### R-M3 — Signed URL TTLs

**Evidence.** `signedDossierUrl(path, 60)` default (`storage.js:131`). `CandidatureTracking`
overrides to 120 s (`CandidatureTracking.jsx:45`). 60 s is too tight for a 50 MB pitch deck
on a 3G connection: the link can expire mid-download and Supabase returns 400.

**Recommended fix.**

- Bump the default TTL to **300 s** in `signedDossierUrl(path, 300)`.
- For staff browsing flows (jury hub, consolidate pack) — when implemented — issue
  long-lived signed URLs (15 min) per request and don't cache them in the DB.
- Document: links *can* be forwarded; this is acceptable because they expire and because
  staff are vetted, but never embed signed URLs in emails (re-generate at click-through).

### R-M4 — `ilike` wildcard still in `loadIdentity` (foundation M1 residual)

**Evidence.** `src/lib/platform/auth.jsx:32-35`:

```js
supabase.from('profiles').select(...).ilike('email', email).maybeSingle(),
supabase.from('app_user_roles').select('roles').ilike('email', email).maybeSingle(),
```

The roles lookup now feeds `isAdmin`/`isComite`/`isJury` derivations and gates UI/back-office
features. A user with `email = 'a_b@x.com'` could match `app_user_roles.email = 'a-b@x.com'`
client-side, see staff UI affordances, and click into pages they can't actually read (RLS
blocks the real reads — confirmed clean). The risk is purely UX/confusion, *unless* a future
hook trusts `roles` for client-only gating.

**Recommended fix.**

```js
const norm = String(email || '').trim().toLowerCase();
const [{ data: prof }, { data: roleRow }] = await Promise.all([
  supabase.from('profiles').select('id, email, full_name, role').eq('email', norm).maybeSingle(),
  supabase.from('app_user_roles').select('roles').eq('email', norm).maybeSingle(),
]);
```

…and ensure both `profiles.email` and `app_user_roles.email` are lowercased at insert (a DB
constraint or a generated column would lock it down; for now a service-role import
convention is OK).

### R-M5 — Eligibility NaN/locale fragility (foundation M4 residual)

**Evidence.** `eligibility.js:64` `Number(startup.last_revenue) < threshold`. The funnel
input is a `<TextInput type="text">` (Finance step) — users will paste `"1,000,000"` or
`"1.000.000 €"`. `Number('1,000,000')` is `NaN`; `NaN < threshold` is `false` → counted as
*passing* (since the rule's "ok" is `null OR < threshold` and `<` is false). Wait — re-read:

```js
const ok = startup.last_revenue == null || Number(startup.last_revenue) < rules.revenue_max.threshold;
```

`startup.last_revenue == null` → false (it's a non-empty string), then `Number(...) < threshold`
→ `NaN < x` → false → `ok = false` → **failure** (flag). So the verdict ends up "flagged"
when the user typed a perfectly valid number with a thousands separator. Bad UX, not a
security hole, but surface for confusion.

Once R-C1's RPC + R-C2's SQL `rsa_evaluate_eligibility` lands, the server uses the *numeric
column* (`last_revenue numeric`) directly — PostgreSQL coerces the input to numeric at
insert time, so this concern goes away **only if the funnel itself coerces before saving**.
StepFinance must do `Number(stripped)` and persist a real number; today it stores raw strings.

**Recommended fix.**

- Add a `parseEurInput(str): number|null` in `validation.js` that strips spaces,
  thousands separators (`,` and `.` heuristics by locale), `€`, then returns
  `Number.isFinite(n) ? n : null`. Apply in StepFinance before `onChange`.
- Same parse in `evaluateEligibility` as a defensive step (live preview).
- Date parsing already tightened (`isFutureDate` uses `isNaN(getTime())`) — keep that pattern.

---

## Low

### R-L1 — DE registration numbers (foundation M4 residual)

`isPlaceholderRegistration` strips non-digits before checking patterns. German
`Handelsregister` numbers are alphanumeric (`HRB 12345`, `HRA 9876B`). The strip + 5-digit
result currently passes (good), but `HRB 000000` reduces to `000000` and flags — possibly
incorrect for legitimate-but-low HRB numbers. Acceptable as long as the rule is `flag` not
`exclu`.

**Recommended fix.** Country-aware detection:

```js
function isPlaceholderRegistration(value, country) {
  if (!value) return true;
  const raw = String(value).trim();
  if (raw === '') return true;
  if (country === 'DE') {
    // accept anything with a German prefix (HRB/HRA/PR/VR) + at least 3 digits
    if (!/^(HRB|HRA|PR|VR)\s?\d{3,}/i.test(raw) && !/^\d{6,}$/.test(raw.replace(/\D/g,''))) return true;
    return /^0+$/.test(raw.replace(/\D/g,''));
  }
  // FR: SIREN 9 digits, SIRET 14 digits; reject placeholders
  const digits = raw.replace(/\D/g,'');
  if (digits.length === 0) return true;
  if (/^0+$/.test(digits)) return true;
  if (/^(?:123){2,}$/.test(digits)) return true;
  if (digits.length !== 9 && digits.length !== 14 && country === 'FR') return true;
  return false;
}
```

### R-L2 — Eligibility snapshot freshness

`startups.eligibility` is written once at submit time. If the comité later edits
`editions.eligibility_rules`, snapshots in flight are stale. Two valid choices:

- **Canonical (recommended):** the snapshot is the source of truth for the candidate's
  bid as of the submission moment. Document this in the comité UI.
- **Recomputable:** add `editions.eligibility_rules_version` + a button "Recompute" in
  the comité view that re-runs the RPC for selected dossiers.

Pick one and document. Default to canonical.

### R-L3 — `useMyDossier` reliance on RLS scoping

`Startup.mine(editionId)` filters only by `edition_id` and trusts RLS to filter by
`owner_id`. Confirmed safe (`startups_read` requires `owner_id = auth.uid()` OR staff
role). The partial UNIQUE index `(owner_id, edition_id) WHERE owner_id IS NOT NULL`
ensures at most one row per applicant per edition. For a candidate who is *also* staff,
`startups_read` returns every row in the edition → `Startup.mine` would pick the
most-recent row by `updated_at` — possibly not theirs. Add a defensive client-side filter:

```js
.eq('edition_id', editionId)
// belt-and-braces in case the caller has a staff role
.eq('owner_id', authUser?.id)
```

…or accept it (a staff member is not a candidate; back-office uses different views).

### R-L4 — Auth gate consistency / global auth provider

Confirmed clean. `MonDossier` redirect → `/Login` is UX-only; RLS is the real boundary.
`PlatformAuthProvider` mounts globally (App.jsx) but reads only the *current user's*
`profiles` + `app_user_roles` rows — no leak to déjeuners pages, which don't render
RSA-keyed data. No-op finding, kept for the record.

### R-L5 — PII in error messages / data minimization

- `MonDossier.jsx:189` renders the authUser email in plain text in the intro screen —
  RGPD fine, the user is looking at their own account.
- The exec summary FR & DE are stored as **one** file; comité review sees a mixed-language
  doc. Document this in the comité UI (no privacy impact, but a quality flag).
- The `eligibility.failed[*].detail` strings include numeric values (`"CA 250000 €"`) —
  fine for the candidate's own dossier, but should not be logged or emailed.

---

## What the orchestrator should apply next (ordered)

1. **R-C1 / R-C2 / R-C3 together** — write a new migration that:
   - adds `public.rsa_evaluate_eligibility(p_row, p_rules) returns jsonb`,
   - adds `public.rsa_submit_dossier(p_id uuid) returns startups` (SECURITY DEFINER),
   - adds the `startups_guard_update` BEFORE UPDATE trigger,
   - revokes execute on the RPC from `public`, grants to `authenticated`.
   Then switch `Startup.submit` (entities.js) to `supabase.rpc('rsa_submit_dossier', ...)` and
   **drop** the client-side eligibility computation from `useSubmitDossier`. Add
   `qc.invalidateQueries(KEYS.myDossier(editionId))` after submit.

2. **R-M2 column allowlist** in `Startup.saveDraft` (defense-in-depth alongside the trigger).

3. **R-H4** — sanitize `country` so `'__other__'` never persists (preferred: don't write
   until the user fills the text input; fallback: sanitize at `saveDraft`).

4. **R-H1** — remove the `accessToken || apiKey` fallback in `storage.js`; throw a
   recognizable `auth_required` error and surface "please reconnect" in the dropzone.

5. **R-H2** — add `(storage.foldername(name))[5] in ('pitch_deck','exec_summary')` to
   `dossiers_insert` and `dossiers_update` WITH CHECK.

6. **R-M1** — make `CandidatureFunnel#flushPending` actually return the parent's
   promise; await it in both `handleSubmit` and on unmount. Drop the redundant
   `saveDraft.mutateAsync` from `MonDossier#handleSubmit` (the flush covers it).

7. **R-M3** — bump default signed-URL TTL in `signedDossierUrl` from 60 s to 300 s.

8. **R-M4** — replace `.ilike('email', …)` with `.eq('email', lower(email))` in
   `loadIdentity` (`platform/auth.jsx`).

9. **R-M5 + R-L1** — add an `parseEurInput` helper, apply in StepFinance and in
   `evaluateEligibility`; broaden `isPlaceholderRegistration` to be country-aware.

10. **R-H3 + L1 retention** — schedule a follow-up issue for an `AFTER DELETE` trigger on
    `startups` that enqueues a storage-prefix cleanup, processed by a daily Edge function.
    Define a retention window (proposed: 3 years post-edition close) and add an erasure
    procedure. Out of Module 1 scope but tracked.

11. **R-L2** — document the snapshot policy (canonical vs recomputable) in the comité UI
    spec; default to canonical.

12. **Regression tests** — add `supabase/tests/rls.sql` cases (extends foundation point 13):
    - applicant cannot UPDATE `status`/`session_id`/`eligibility`/`submitted_at` on own row;
    - applicant cannot UPDATE another applicant's row;
    - `rsa_submit_dossier` rejects when status≠brouillon, edition closed, required missing;
    - `rsa_submit_dossier` writes a server-computed snapshot regardless of any client value;
    - storage insert with `kind='evil'` fails;
    - autosave with `{status:'laureat'}` is rejected by the trigger.

---

## Appendix — verified facts used in this review

- `Startup.submit` is a plain UPDATE (`src/lib/rsa/entities.js:146-154`) — no server-side
  validation, no recomputation. Confirmed.
- `useSubmitDossier` computes eligibility client-side and passes it through
  (`src/components/rsa/candidature/useCandidature.js:71-88`). Confirmed.
- `startups_applicant_update` USING/WITH CHECK is `owner_id = auth.uid()` only — no column
  restriction (`supabase/migrations/20260527_rsa_module1_prep.sql:54-66`). The migration
  itself acknowledges this as residual (§2d comment).
- Storage XHR path includes `Bearer ${accessToken || apiKey}` fallback
  (`src/lib/rsa/storage.js:113`). Confirmed.
- Storage policies validate `[1]`,`[3]`,`[4]` but not `[5]`
  (`20260527_rsa_module1_prep.sql:169-241`). Confirmed.
- `__other__` literal is persisted to `startups.country` when the user picks "Autre"
  without filling the text input (`StepCompany.jsx:24, 66-67`). Confirmed.
- `loadIdentity` still uses `.ilike` for both profiles and `app_user_roles`
  (`src/lib/platform/auth.jsx:32-35`). Confirmed.
- `removeDossierFile` is `.catch(() => {})` in both replace and remove paths
  (`DocumentDropzone.jsx:64-66, 83`). Confirmed.
- Service-role key is **not** used in the client — the XHR path uses the user JWT (with
  the documented fallback to anon, R-H1). Confirmed clean for the service-role concern.
