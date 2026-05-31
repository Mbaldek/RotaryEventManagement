// send-bulk — Edge function (Deno) — Module 9, Plateforme RSA (Email Studio).
//
// Responsibility
// ─────────────────────────────────────────────────────────────────────────────
// Send Élysée-branded bulk emails via the Resend HTTP API to an audience
// resolved by `rsa_resolve_audience` (single source of truth, see migration
// 20260530_rsa_v2_email_studio.sql). Used by the owner cockpit (master_admin
// + club_admins) for fast targeted communications: "rappel J-7 jury Berlin",
// "résultats publiés candidats Paris", etc.
//
// Distinct from `send-transactional` (per-message templated emails). Here the
// caller already provides subject + pre-rendered Élysée body_html (built by
// the React EmailComposer/EmailPreview), and the function only:
//   1. validates auth + role
//   2. resolves the audience via rsa_resolve_audience(p_type, p_filter)
//   3. (optionally) returns a dry-run preview without sending
//   4. throttles + sends to Resend (one POST per recipient — Resend supports
//      a /emails/batch endpoint but it requires a paid plan ; we go one-by-
//      one with throttling on the free tier)
//   5. inserts ONE audit row in email_sends via the service role
//
// Auth model
// ─────────────────────────────────────────────────────────────────────────────
//   - JWT required, propagated to a per-request supabase client.
//   - For single_email audience, any role with master_admin OR a club role can
//     send (the RPC itself permits authenticated to resolve single_email).
//   - For club-scoped audiences, the SQL RPC enforces master_admin OR
//     club_admin of the requested club_id ; we re-check here too for clarity.
//   - For master-only audiences (all_finalists_edition), same.
//
// Throttling
// ─────────────────────────────────────────────────────────────────────────────
// Resend free tier : 100 / day, 2 / second sustained. We pace at ~500ms between
// requests (2/s) ; bursts up to 10 fast then back off. If recipients > 100 we
// refuse unless `force=true` is set AND the caller is master_admin.
//
// Audit row
// ─────────────────────────────────────────────────────────────────────────────
// Always inserted (even on partial failure) with full recipients_emails[] and
// the array of Resend message IDs that succeeded.
//
// Payload
// ─────────────────────────────────────────────────────────────────────────────
//   {
//     club_id?: string | null,          // NULL/missing = master global
//     audience_type: string,            // see rsa_resolve_audience
//     audience_filter: Record<string, any>,
//     subject: string,                  // non-empty
//     body_html: string,                // pre-rendered bulletproof HTML
//     dry_run?: boolean,                // if true, returns { count, sample[] }
//     force?: boolean                   // master_admin only ; bypass count<=100 guard
//   }
// ─────────────────────────────────────────────────────────────────────────────

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────────────────────
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Constants ───────────────────────────────────────────────────────────────
const FROM = "Rotary Startup Award <contact@rotary-startup.org>";
const REPLY_TO = "contact@rotary-startup.org";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Free tier guard : refuse if >100 recipients unless force=true + master_admin.
const FREE_TIER_LIMIT = 100;
// Hard ceiling : even with force=true, never blast more than this in a single call.
const HARD_LIMIT = 1000;
// Throttle : sustained 2/s. Pause between requests (ms).
const THROTTLE_MS = 500;

// ─── Types ───────────────────────────────────────────────────────────────────
interface Payload {
  club_id?: string | null;
  audience_type: string;
  audience_filter?: Record<string, unknown>;
  subject: string;
  body_html: string;
  dry_run?: boolean;
  force?: boolean;
}

interface ResolvedRecipient {
  email: string;
  full_name: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isValidEmail(s: unknown): s is string {
  return (
    typeof s === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
  );
}

// ─── Resend call ─────────────────────────────────────────────────────────────

async function sendOne({
  apiKey,
  to,
  subject,
  html,
}: {
  apiKey: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: true; id: string } | { ok: false; status: number; error: string }> {
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      reply_to: REPLY_TO,
      to: [to],
      subject,
      html,
    }),
  });

  const text = await res.text();
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const message = parsed && typeof parsed.message === "string"
      ? parsed.message
      : text || `Resend returned status ${res.status}`;
    return { ok: false, status: res.status, error: message };
  }
  const id = parsed && typeof parsed.id === "string" ? parsed.id : "";
  return { ok: true, id };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "method_not_allowed" });
  }

  // ── env ──
  const supabaseUrl  = Deno.env.get("SUPABASE_URL");
  const anonKey      = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey    = Deno.env.get("RESEND_API_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse(500, { ok: false, error: "missing_supabase_env" });
  }
  if (!resendKey) {
    return jsonResponse(500, { ok: false, error: "missing_resend_api_key" });
  }

  // ── auth header ──
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return jsonResponse(401, { ok: false, error: "missing_bearer_token" });
  }

  // Per-request client (caller's JWT) — propagates auth.uid() into the RPC.
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Service-role client : used ONLY to insert the audit row in email_sends
  // (which has a DENY INSERT policy for all JWTs by design).
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  // ── parse payload ──
  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return jsonResponse(400, { ok: false, error: "invalid_json" });
  }
  if (!payload || typeof payload !== "object") {
    return jsonResponse(400, { ok: false, error: "invalid_payload" });
  }

  const club_id = payload.club_id ?? null;
  const audience_type = payload.audience_type;
  const audience_filter = (payload.audience_filter && typeof payload.audience_filter === "object")
    ? payload.audience_filter as Record<string, unknown>
    : {};
  const subject = (payload.subject || "").trim();
  const body_html = (payload.body_html || "").trim();
  const dry_run = !!payload.dry_run;
  const force = !!payload.force;

  if (!audience_type || typeof audience_type !== "string") {
    return jsonResponse(400, { ok: false, error: "missing_audience_type" });
  }
  if (!subject) {
    return jsonResponse(400, { ok: false, error: "missing_subject" });
  }
  if (!body_html) {
    return jsonResponse(400, { ok: false, error: "missing_body_html" });
  }
  // Bornes de longueur (anti-DoS soft / bloat email_sends). body_html n'est PAS
  // échappé — composer HTML admin volontaire ; seul le bornage est requis.
  if (subject.length > 300) {
    return jsonResponse(400, { ok: false, error: "subject_too_long" });
  }
  if (body_html.length > 100_000) {
    return jsonResponse(400, { ok: false, error: "body_html_too_long" });
  }
  if (JSON.stringify(audience_filter).length > 8_000) {
    return jsonResponse(400, { ok: false, error: "audience_filter_too_large" });
  }

  // ── validate caller ──
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return jsonResponse(401, { ok: false, error: "invalid_jwt" });
  }
  const caller_id = userData.user.id;

  // Resolve caller roles (same single source of truth as send-transactional).
  const { data: rolesData, error: rolesErr } = await supabase.rpc("rsa_my_roles");
  if (rolesErr) {
    return jsonResponse(500, { ok: false, error: `roles_lookup_failed:${rolesErr.message}` });
  }
  const roles = Array.isArray(rolesData) ? rolesData.map((r) => String(r).toLowerCase()) : [];
  const isMasterAdmin = roles.includes("master_admin");

  // For club-scoped sends, require the caller to be master_admin OR club_admin
  // of the target club. The RPC also checks this — but failing early gives a
  // cleaner 403 + we want a guard before the (possibly large) resolve query.
  if (club_id && !isMasterAdmin) {
    const { data: cmRows, error: cmErr } = await supabase.rpc("my_club_memberships");
    if (cmErr) {
      return jsonResponse(500, { ok: false, error: `memberships_lookup_failed:${cmErr.message}` });
    }
    const isClubAdmin = Array.isArray(cmRows)
      && cmRows.some((m: { club_id: string; role: string }) =>
        m.club_id === club_id && m.role === "club_admin");
    if (!isClubAdmin) {
      return jsonResponse(403, {
        ok: false,
        error: "forbidden",
        detail: `requires master_admin OR club_admin of ${club_id}`,
      });
    }
  }
  if (!club_id && !isMasterAdmin) {
    // Master-global send requested without master_admin role.
    return jsonResponse(403, {
      ok: false,
      error: "forbidden",
      detail: "global send requires master_admin",
    });
  }

  // ── resolve audience ──
  const { data: audience, error: audErr } = await supabase.rpc("rsa_resolve_audience", {
    p_audience_type: audience_type,
    p_audience_filter: audience_filter,
  });
  if (audErr) {
    return jsonResponse(400, { ok: false, error: `resolve_failed:${audErr.message}` });
  }

  // Deduplicate by email (the RPC already does DISTINCT but defense in depth).
  const seen = new Set<string>();
  const recipients: ResolvedRecipient[] = [];
  for (const row of (audience as ResolvedRecipient[] | null) || []) {
    const e = String(row?.email || "").trim().toLowerCase();
    if (!e || seen.has(e) || !isValidEmail(e)) continue;
    seen.add(e);
    recipients.push({ email: e, full_name: row?.full_name ?? null });
  }

  const count = recipients.length;

  // ── dry-run : preview ──
  if (dry_run) {
    return jsonResponse(200, {
      ok: true,
      dry_run: true,
      count,
      sample: recipients.slice(0, 3).map((r) => r.email),
    });
  }

  if (count === 0) {
    return jsonResponse(400, { ok: false, error: "empty_audience" });
  }

  // ── recipient count guard ──
  if (count > HARD_LIMIT) {
    return jsonResponse(400, {
      ok: false,
      error: "too_many_recipients",
      detail: `${count} > hard cap ${HARD_LIMIT}`,
    });
  }
  if (count > FREE_TIER_LIMIT && !(force && isMasterAdmin)) {
    return jsonResponse(400, {
      ok: false,
      error: "free_tier_exceeded",
      detail: `${count} > ${FREE_TIER_LIMIT} — set force=true (master_admin only)`,
    });
  }

  // ── send loop (throttled) ──
  const messageIds: string[] = [];
  const failed: { email: string; error: string }[] = [];
  let errorMessage: string | null = null;

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    try {
      const result = await sendOne({
        apiKey: resendKey,
        to: r.email,
        subject,
        html: body_html,
      });
      if (result.ok) {
        if (result.id) messageIds.push(result.id);
      } else {
        failed.push({ email: r.email, error: result.error });
        if (!errorMessage) errorMessage = `${result.status}:${result.error}`;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failed.push({ email: r.email, error: msg });
      if (!errorMessage) errorMessage = msg;
    }
    if (i < recipients.length - 1) {
      await sleep(THROTTLE_MS);
    }
  }

  const sent = recipients.length - failed.length;
  const status: "sent" | "failed" | "partial" =
    failed.length === 0 ? "sent"
    : sent === 0 ? "failed"
    : "partial";

  // ── audit row (service_role bypasses email_sends DENY INSERT) ──
  const { error: auditErr } = await supabaseAdmin.from("email_sends").insert({
    sent_by:            caller_id,
    club_id:            club_id,
    audience_type,
    audience_filter,
    subject,
    body_html,
    recipients_count:   count,
    recipients_emails:  recipients.map((r) => r.email),
    resend_message_ids: messageIds,
    status,
    error_message:      errorMessage,
  });

  if (auditErr) {
    // Don't fail the response — emails were sent. Log the audit failure.
    console.error("[send-bulk] audit insert failed:", auditErr.message);
  }

  return jsonResponse(status === "failed" ? 502 : 200, {
    ok: status !== "failed",
    sent,
    failed: failed.length,
    total: count,
    status,
    message_ids: messageIds,
    errors: failed.slice(0, 5), // first 5 errors only for response payload size
  });
});
