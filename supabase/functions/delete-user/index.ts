// delete-user — Edge function (Deno) — V2.5 user-management, Plateforme RSA.
//
// Responsabilité
// ─────────────────────────────────────────────────────────────────────────────
// Supprime DÉFINITIVEMENT un utilisateur de la plateforme RSA. master_admin
// only. Workflow strict :
//
//   1. JWT auth, vérifie que le caller est master_admin (via rsa_my_roles).
//   2. Confirme via un typed-confirm `DELETE-{email}` (anti-drama, comme
//      pour rsa_delete_competition).
//   3. Lookup user_id dans auth.users.
//   4. Cascade applicative :
//        - DELETE club_memberships (user_id = victim)
//        - DELETE app_user_roles (email = victim)
//        - DELETE platform_jury_profiles (user_id = victim)  -- si la table existe
//      Note : les autres FK pointant vers auth.users (granted_by, created_by,
//      reviewed_by, sent_by, attached_by, approved_user_id) sont déjà
//      `ON DELETE SET NULL` ou similaires dans le schéma — on les NULLifie
//      explicitement par sécurité (idempotent : NULL = NULL).
//   5. supabaseAdmin.auth.admin.deleteUser(user_id) — étape finale destructrice.
//   6. Audit log dans admin_audit_log (action = 'user_deleted'), avec snapshot
//      du payload (email cible, rôles supprimés, count cascades).
//
// Auth model
// ─────────────────────────────────────────────────────────────────────────────
//   - JWT requis (Authorization: Bearer <jwt>)
//   - master_admin only (résolu via rsa_my_roles SECURITY DEFINER)
//   - Refus 403 sinon (même pour un club_admin — la suppression de compte est
//     une opération globale, jamais déléguée).
//
// Garde-fous
// ─────────────────────────────────────────────────────────────────────────────
//   - Refus si le caller tente de se supprimer lui-même (last-master-admin
//     protection partielle ; pour la full last-admin protection on s'appuie
//     sur les RPC rsa_revoke_club_role et rsa_assign_role qui en ont déjà,
//     mais ici on bloque l'auto-destruction du caller).
//   - Refus si typed_confirm != `DELETE-{email}` (case-sensitive sur DELETE,
//     case-insensitive sur l'email pour s'aligner sur la normalisation).
//
// Payload
// ─────────────────────────────────────────────────────────────────────────────
//   {
//     email:         string,
//     typed_confirm: string   // doit être exactement `DELETE-{email}`
//   }
//
// Réponse OK
// ─────────────────────────────────────────────────────────────────────────────
//   {
//     ok: true,
//     deleted_user_id: string,
//     cascades: {
//       club_memberships:        number,
//       app_user_roles_email:    boolean,
//       platform_jury_profiles:  number | 'skipped'
//     }
//   }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────────────────────
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  email: string;
  typed_confirm: string;
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function normalizeEmail(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const trimmed = s.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return jsonResponse(405, { ok: false, error: "method_not_allowed" });

  // ── env ──
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse(500, { ok: false, error: "missing_supabase_env" });
  }

  // ── auth header ──
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return jsonResponse(401, { ok: false, error: "missing_bearer_token" });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
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

  const email = normalizeEmail(payload.email);
  if (!email) {
    return jsonResponse(400, { ok: false, error: "invalid_email" });
  }

  const typedConfirm = typeof payload.typed_confirm === "string" ? payload.typed_confirm.trim() : "";
  const expectedConfirm = `DELETE-${email}`;
  // Comparaison case-sensitive sur "DELETE-" et case-insensitive sur l'email
  // (l'email est déjà normalisé lowercase ci-dessus).
  if (typedConfirm.toLowerCase() !== expectedConfirm.toLowerCase() || !typedConfirm.startsWith("DELETE-")) {
    return jsonResponse(400, {
      ok: false,
      error: "invalid_confirm",
      detail: `typed_confirm must be exactly "DELETE-${email}" (case-sensitive on DELETE-).`,
    });
  }

  // ── validate caller : master_admin only ──
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return jsonResponse(401, { ok: false, error: "invalid_jwt" });
  }
  const callerId = userData.user.id;
  const callerEmail = (userData.user.email || "").toLowerCase();

  const { data: rolesData, error: rolesErr } = await supabase.rpc("rsa_my_roles");
  if (rolesErr) {
    return jsonResponse(500, { ok: false, error: `roles_lookup_failed:${rolesErr.message}` });
  }
  const callerRoles = Array.isArray(rolesData) ? rolesData.map((r) => String(r).toLowerCase()) : [];
  if (!callerRoles.includes("master_admin")) {
    return jsonResponse(403, {
      ok: false,
      error: "forbidden",
      detail: "delete-user requires master_admin",
    });
  }

  // ── garde-fou : refuse l'auto-suppression ──
  if (callerEmail === email) {
    return jsonResponse(400, {
      ok: false,
      error: "self_delete_forbidden",
      detail: "A master_admin cannot delete their own account through this endpoint.",
    });
  }

  // ── lookup user_id ──
  const { data: target, error: targetErr } = await supabaseAdmin
    .schema("auth")
    .from("users")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();
  if (targetErr) {
    return jsonResponse(500, { ok: false, error: `user_lookup_failed:${targetErr.message}` });
  }
  if (!target?.id) {
    return jsonResponse(404, { ok: false, error: "user_not_found" });
  }
  const targetUserId: string = target.id;

  // ── snapshot rôles supprimés (pour l'audit log) ──
  const { data: clubMembershipRows } = await supabaseAdmin
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", targetUserId);
  const { data: appRolesRow } = await supabaseAdmin
    .from("app_user_roles")
    .select("email, roles")
    .ilike("email", email)
    .maybeSingle();

  const cascades: Record<string, unknown> = {
    club_memberships: 0,
    app_user_roles_email: false,
    platform_jury_profiles: "skipped",
  };

  // ── 1) club_memberships ──
  const { count: cmCount, error: cmDelErr } = await supabaseAdmin
    .from("club_memberships")
    .delete({ count: "exact" })
    .eq("user_id", targetUserId);
  if (cmDelErr) {
    return jsonResponse(500, { ok: false, error: `cascade_club_memberships_failed:${cmDelErr.message}` });
  }
  cascades.club_memberships = cmCount || 0;

  // ── 2) app_user_roles ──
  const { error: aurDelErr, count: aurCount } = await supabaseAdmin
    .from("app_user_roles")
    .delete({ count: "exact" })
    .ilike("email", email);
  if (aurDelErr) {
    return jsonResponse(500, { ok: false, error: `cascade_app_user_roles_failed:${aurDelErr.message}` });
  }
  cascades.app_user_roles_email = (aurCount || 0) > 0;

  // ── 3) platform_jury_profiles (table optionnelle — graceful) ──
  // Le brief mentionne cette table, mais elle peut ne pas exister dans le
  // schéma actuel (la V2 a `platform_jury_applications` / `platform_jury_assignments`
  // / `platform_jury_scores` mais pas forcément `platform_jury_profiles`).
  // On try/catch silencieux.
  try {
    const { error: jpDelErr, count: jpCount } = await supabaseAdmin
      .from("platform_jury_profiles")
      .delete({ count: "exact" })
      .eq("user_id", targetUserId);
    if (jpDelErr) {
      // 42P01 = relation does not exist — graceful skip.
      const code = (jpDelErr as { code?: string }).code || "";
      if (code !== "42P01") {
        // Autre erreur → on log et continue (l'objectif final reste la suppression du user).
        console.warn("[delete-user] platform_jury_profiles delete failed:", jpDelErr.message);
      }
      cascades.platform_jury_profiles = "skipped";
    } else {
      cascades.platform_jury_profiles = jpCount || 0;
    }
  } catch (err) {
    console.warn("[delete-user] platform_jury_profiles cascade error:", err);
    cascades.platform_jury_profiles = "skipped";
  }

  // ── 4) NULLify FK colonnes audit pointant vers le user supprimé ──
  // Toutes ces colonnes sont déjà `ON DELETE SET NULL` ou nullable + sans FK
  // explicite (cf. migration 20260527_rsa_module4a_admin.sql — granted_by est
  // nullable, granted_at conservé). On NULLifie explicitement pour préserver
  // les colonnes d'audit historiques sans casser auth.admin.deleteUser().
  //
  // Le bloc try/catch est silencieux par colonne : si la table/colonne
  // n'existe pas (42P01 / 42703), on continue.
  const nullifyTargets: Array<{ table: string; column: string }> = [
    { table: "clubs", column: "created_by" },
    { table: "club_memberships", column: "granted_by" },
    { table: "edition_clubs", column: "attached_by" },
    { table: "email_sends", column: "sent_by" },
    { table: "email_templates", column: "created_by" },
    { table: "platform_jury_applications", column: "reviewed_by" },
    { table: "platform_jury_applications", column: "approved_user_id" },
    { table: "app_user_roles", column: "granted_by" },
    { table: "admin_audit_log", column: "actor_id" },
  ];
  const nullifyResults: Array<{ table: string; column: string; status: string }> = [];
  for (const t of nullifyTargets) {
    try {
      const { error: nullErr } = await supabaseAdmin
        .from(t.table)
        .update({ [t.column]: null })
        .eq(t.column, targetUserId);
      const code = nullErr ? ((nullErr as { code?: string }).code || "") : "";
      if (nullErr && code !== "42P01" && code !== "42703") {
        nullifyResults.push({ ...t, status: `err:${nullErr.message}` });
      } else if (nullErr) {
        nullifyResults.push({ ...t, status: "skipped" });
      } else {
        nullifyResults.push({ ...t, status: "ok" });
      }
    } catch (e) {
      nullifyResults.push({ ...t, status: `exc:${e instanceof Error ? e.message : String(e)}` });
    }
  }

  // ── 5) DELETE auth.users (étape finale destructrice) ──
  const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
  if (deleteErr) {
    return jsonResponse(500, {
      ok: false,
      error: `auth_delete_failed:${deleteErr.message}`,
      detail: "Applicative cascade completed, but final auth.users delete failed. Manual cleanup required.",
      cascades,
    });
  }

  // ── 6) audit log ──
  // admin_audit_log : INSERT autorisé seulement service_role (RLS deny côté JWT).
  try {
    const { error: auditErr } = await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: callerId,
      actor_email: callerEmail,
      action: "user_deleted",
      target_kind: "user",
      target_id: targetUserId,
      payload: {
        target_email: email,
        had_global_roles: (appRolesRow?.roles as string[] | undefined) || [],
        had_club_memberships: clubMembershipRows || [],
        cascades,
        nullify_results: nullifyResults,
      },
    });
    if (auditErr) {
      console.warn("[delete-user] audit insert failed:", auditErr.message);
    }
  } catch (e) {
    console.warn("[delete-user] audit exception:", e);
  }

  return jsonResponse(200, {
    ok: true,
    deleted_user_id: targetUserId,
    cascades,
  });
});
