// confirm-deck — Edge function (Deno) — Session Admin Console (blueprint §12.1).
//
// Public (PAS de JWT) : l'authentification est le token opaque deck_confirm_token
// de la startup (une ligne = un token unique). Tourne en service_role pour
// appeler rsa_confirm_session_deck (qui n'est PAS exposée anon/authenticated) et
// pour générer une URL d'upload signée vers le bucket "uploads".
//
// Actions :
//   GET  ?token=...                              -> { ok, startup_name, session_id, confirmed }
//   POST { token, action:'keep' }                -> confirme le deck d'inscription
//   POST { token, action:'upload-url', filename } -> { ok, path, signed_token, signed_url }
//   POST { token, action:'confirm-upload', path } -> confirme le deck spécifique session

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function svc() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const supabase = svc();

    // ── GET : infos d'affichage pour le token ──
    if (req.method === "GET") {
      const token = new URL(req.url).searchParams.get("token") || "";
      if (!UUID_RE.test(token)) return json({ ok: false, error: "invalid_token" }, 400);
      const { data, error } = await supabase
        .from("startups")
        .select("id, name, contact_person, session_id, deck_confirmed_at, session_deck_path")
        .eq("deck_confirm_token", token)
        .maybeSingle();
      if (error || !data) return json({ ok: false, error: "invalid_token" }, 404);
      return json({
        ok: true,
        startup_name: data.name,
        contact_person: data.contact_person,
        session_id: data.session_id,
        confirmed: !!data.deck_confirmed_at,
        has_specific: !!data.session_deck_path,
      });
    }

    if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

    const body = await req.json().catch(() => ({}));
    const token = String(body?.token ?? "");
    const action = String(body?.action ?? "");
    if (!UUID_RE.test(token)) return json({ ok: false, error: "invalid_token" }, 400);

    // Résout la startup (id) pour les chemins d'upload.
    const { data: su, error: sErr } = await supabase
      .from("startups")
      .select("id")
      .eq("deck_confirm_token", token)
      .maybeSingle();
    if (sErr || !su) return json({ ok: false, error: "invalid_token" }, 404);

    if (action === "keep") {
      const { error } = await supabase.rpc("rsa_confirm_session_deck", {
        p_token: token, p_keep: true, p_deck_path: null,
      });
      if (error) return json({ ok: false, error: error.message }, 400);
      return json({ ok: true, confirmed: true, kept: true });
    }

    if (action === "upload-url") {
      const filename = String(body?.filename ?? "deck.pdf").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
      const path = `session-decks/${su.id}/${filename}`;
      const { data, error } = await supabase.storage.from("uploads").createSignedUploadUrl(path);
      if (error || !data) return json({ ok: false, error: error?.message || "signed_url_failed" }, 400);
      return json({ ok: true, path, signed_token: data.token, signed_url: data.signedUrl });
    }

    if (action === "confirm-upload") {
      const path = String(body?.path ?? "");
      if (!path) return json({ ok: false, error: "missing_path" }, 400);
      const { error } = await supabase.rpc("rsa_confirm_session_deck", {
        p_token: token, p_keep: false, p_deck_path: path,
      });
      if (error) return json({ ok: false, error: error.message }, 400);
      return json({ ok: true, confirmed: true, kept: false });
    }

    return json({ ok: false, error: "unknown_action" }, 400);
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
