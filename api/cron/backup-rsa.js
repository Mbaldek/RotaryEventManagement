// Daily RSA backup. Invoked by Vercel Cron (see vercel.json).
// Reads all RSA-related tables with the service_role key and overwrites
// a single JSON file in the Supabase Storage `backups` bucket.
//
// Tables captured: jury_profiles, session_config, startup_confirmations,
// jury_scores, jury_scoring_sessions, dashboard_state, rsa_actions, profiles.
//
// Env vars (set in Vercel → Project Settings → Environment Variables):
//   SUPABASE_SERVICE_ROLE_KEY    — REQUIRED, server-only secret, full DB access
//                                   (Supabase → Settings → API → service_role key)
//   CRON_SECRET                  — REQUIRED, any long random string (validates Vercel Cron auth)
//   SUPABASE_URL                 — OPTIONAL, falls back to VITE_SUPABASE_URL which is
//                                   already set in this project

import { createClient } from "@supabase/supabase-js";

const RSA_TABLES = [
  "jury_profiles",
  "session_config",
  "startup_confirmations",
  "jury_scores",
  "jury_scoring_sessions",
  "dashboard_state",
  "rsa_actions",
  "profiles",
];

export default async function handler(req, res) {
  // 1. Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`
  const auth = req.headers.authorization || "";
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  // Fall back to the VITE_-prefixed URL that is already set in this project.
  // (VITE_ vars ARE exposed to the frontend, but they are also available
  // server-side at build + runtime on Vercel, and the URL is not secret.)
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return res.status(500).json({
      ok: false,
      error: "missing Supabase env",
      has_url: !!url,
      has_service_role_key: !!key,
    });
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const startedAt = new Date().toISOString();
  const tables = {};
  const errors = {};

  for (const t of RSA_TABLES) {
    try {
      const { data, error } = await supabase.from(t).select("*");
      if (error) throw error;
      tables[t] = data || [];
    } catch (err) {
      errors[t] = err?.message || String(err);
      tables[t] = [];
    }
  }

  const payload = {
    backup_utc: startedAt,
    source_project: url,
    row_counts: Object.fromEntries(
      Object.entries(tables).map(([k, v]) => [k, v.length])
    ),
    errors,
    tables,
  };

  const body = JSON.stringify(payload);

  // Upload (overwrite) the single archive file the user asked for.
  try {
    const { error: upErr } = await supabase.storage
      .from("backups")
      .upload("rsa/latest.json", new Blob([body], { type: "application/json" }), {
        upsert: true,
        contentType: "application/json",
      });
    if (upErr) throw upErr;

    // Also keep a 7-day rolling copy (best-effort, never fails the whole job).
    const today = startedAt.slice(0, 10); // YYYY-MM-DD
    await supabase.storage
      .from("backups")
      .upload(`rsa/daily/rsa-${today}.json`, new Blob([body], { type: "application/json" }), {
        upsert: true,
        contentType: "application/json",
      })
      .catch(() => {});

    // Prune daily copies older than 7 days (best-effort)
    try {
      const { data: list } = await supabase.storage
        .from("backups")
        .list("rsa/daily", { limit: 100 });
      if (list) {
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const toDelete = list
          .filter((f) => {
            const m = f.name.match(/^rsa-(\d{4}-\d{2}-\d{2})\.json$/);
            if (!m) return false;
            return new Date(m[1] + "T00:00:00Z").getTime() < cutoff;
          })
          .map((f) => `rsa/daily/${f.name}`);
        if (toDelete.length > 0) {
          await supabase.storage.from("backups").remove(toDelete);
        }
      }
    } catch {
      // non-fatal
    }
  } catch (err) {
    return res
      .status(500)
      .json({ ok: false, error: err?.message || String(err), row_counts: payload.row_counts });
  }

  return res.status(200).json({
    ok: true,
    backup_utc: startedAt,
    row_counts: payload.row_counts,
    errors_by_table: errors,
  });
}
