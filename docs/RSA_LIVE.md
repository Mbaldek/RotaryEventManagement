# Rotary Startup Award 2026 — Live session runbook

## What was built

- **`/RsaScore?s=<session_id>`** — public juror scoring page (shared link). No login. Pick your name, score 6 startups on 6 criteria (0-5), submit per-startup, edit until session is locked.
- **`/RsaAdmin`** — admin console (gated by `profiles.role = 'admin'`). Three tabs:
  - **Setup**: validate jurors, assign them to sessions, order startups, set metadata.
  - **Live**: session selector, status pill (DRAFT → LIVE → LOCKED → PUBLISHED), real-time grid of `startup × juror` cells, live weighted averages per startup.
  - **Results**: ranked table with bonus / fix-rank / admin-note overrides, Publish button, CSV download.
- **Daily backup** — `/api/cron/backup-rsa` runs at 03:00 Paris via Vercel Cron, writes `rsa/latest.json` to the Supabase Storage `backups` bucket (plus a 7-day rolling copy).

## Session IDs

| session_id | Label | Date |
|---|---|---|
| `s1_foodtech` | FoodTech & Économie circulaire | Thu 30 Apr 18h |
| `s2_social` | Impact social & Edtech | Wed 6 May 18h |
| `s3_tech` | Tech, AI, Fintech & Mobilité | Wed 13 May 18h |
| `s4_health` | Healthtech & Biotech | Tue 19 May 18h |
| `s5_greentech` | Greentech & Environnement | Thu 21 May 18h |

## Scoring model

Six criteria, each 0-5, weighted:
- 20% Value Proposition
- 20% Market & Scalability
- 20% Business Model
- 20% Team
- 10% Pitch Quality
- 10% Societal & Environmental Impact

Weighted total per juror per startup: 0–5. Startup aggregate = mean of submitted weighted totals. Admin can add **bonus points** (or subtract) and **fix a final rank** to break ties.

## Vercel environment variables

Set these in **Vercel → Project Settings → Environment Variables** (all environments):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://uaoucznptxmvhhytapso.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | (Supabase → Settings → API → anon public key) |
| `SUPABASE_URL` | same as above (server side, no VITE_ prefix) |
| `SUPABASE_SERVICE_ROLE_KEY` | (Supabase → Settings → API → service_role secret) |
| `CRON_SECRET` | any long random string — Vercel uses it as bearer token |

After setting env vars, redeploy for changes to take effect.

## Pre-flight checklist (before 30 April)

1. **Deploy** to Vercel.
2. **Trigger backup manually**: Vercel → Project → Settings → Cron Jobs → Run now. Verify `rsa/latest.json` appears in Supabase Storage bucket `backups`.
3. **Open `/RsaAdmin`** as admin, go to **Setup** tab for `s1_foodtech`:
   - Confirm the 6 startups are ordered: DATUS, GREEN OFF GRID SAS, KIDIPOWER, KUZOG FRANCE, Kyol, Midow.
   - Confirm ≥ 3 validated jurors assigned (currently: David Cayet, Birte Gall, Frank Wild).
   - Copy juror link → email to the assigned jurors.
4. **Dry run** with test session_id:
   - In Supabase SQL: `INSERT INTO session_config (session_id, status) VALUES ('test_dry', 'live') ON CONFLICT DO UPDATE SET status='live';`
   - Insert a test juror + test startup, visit `/RsaScore?s=test_dry` as a juror, submit, verify admin sees it update live in the grid.

## Session-day runbook

### T-30 min
1. Open `/RsaAdmin` → **Setup** → double-check juror & startup lists for FoodTech.
2. Switch to **Live** tab → click **Open scoring**. Status pill shows `● LIVE`.
3. The shared link `<app>/RsaScore?s=s1_foodtech` is already live for jurors.

### During the session
- Jurors pick their name and score as startups pitch.
- Admin grid shows progress in real time. Each cell:
  - `—` = not started
  - `2/6` = in progress
  - weighted number (e.g. `3.8`) = submitted
- Row avg updates as jurors submit.

### After last pitch
1. **Live** tab → **Lock session**. Jurors see "Scoring closed". Scores are frozen.
2. Switch to **Results** tab:
   - Review weighted averages.
   - Set a **Fix rank** on a startup to force a specific position (tie-break).
   - Add a **Bonus** (e.g. `+0.2`) to add/subtract weight to the aggregate.
   - Write an **Admin note** to document the rationale.
   - Click **Save overrides**.
3. Click **Publish**. Snapshot written to `session_config.final_ranking`. CSV download appears.

## Daily backup

- Runs at 03:00 UTC (05:00 Paris CEST).
- Files:
  - `backups/rsa/latest.json` — always the most recent (overwritten daily).
  - `backups/rsa/daily/rsa-YYYY-MM-DD.json` — kept 7 days.
- Tables covered: `jury_profiles`, `session_config`, `startup_confirmations`, `jury_scores`, `jury_scoring_sessions`, `dashboard_state`, `rsa_actions`, `profiles`.
- To restore a table manually, pull the JSON and `INSERT` the `tables.<name>` array back.

## Things to know

- **RLS is wide-open** on RSA tables (matches existing pattern). Scoring availability is enforced in the UI: the submit button is disabled when session status ≠ `live`. Supabase Realtime pushes the status change so all open juror tabs instantly lock.
- **No login for jurors.** `Pick-your-name` dropdown from validated jurors. Anyone with the link can pick any juror — acceptable per decision, but don't share the link publicly. If stricter identity becomes needed later, add a 4-digit PIN per session or tokenize the URL per juror.
- **Admin role** is read from `profiles.role = 'admin'`.
- **Realtime** is enabled on `jury_scores`, `session_config`, `jury_profiles`, `startup_confirmations` (added via migration `rsa_realtime_publication_20260421`).
