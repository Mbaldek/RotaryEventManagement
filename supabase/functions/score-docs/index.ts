// score-docs — Edge function (Deno) — pré-read documents pour la page juré PUBLIQUE.
//
// La page /Score est anonyme : un juré sans compte ne peut pas générer de signed
// URL sur le bucket privé `dossiers` (RLS owner/staff). Cette fonction, gardée par
// slug + PIN (PAS de JWT — verify_jwt=false, comme confirm-deck), valide l'accès
// puis signe (service role) les documents (pitch deck + exec summary) des startups
// de LA session correspondant au slug. Aucun chemin arbitraire n'est signé : on ne
// signe que les chemins lus côté serveur pour cette session.
//
// Body  : { slug: string, pin: string }
// Return: { ok: true, urls: { [path]: signedUrl } }  (TTL 600 s)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DOSSIERS_BUCKET = "dossiers";
const TTL = 600; // 5–10 min, cohérent avec signedDossierUrl côté app

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json(500, { ok: false, error: "missing_env" });

  let body: { slug?: unknown; pin?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "invalid_json" });
  }
  const slug = typeof body?.slug === "string" ? body.slug : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";
  if (slug.length < 6 || !pin) return json(400, { ok: false, error: "invalid_input" });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Garde slug + PIN (revalidée côté serveur, jamais une simple barrière client).
  const { data: session, error: sErr } = await admin
    .from("sessions")
    .select("id, score_pin")
    .eq("score_slug", slug)
    .maybeSingle();
  if (sErr) return json(500, { ok: false, error: "lookup_failed" });
  if (!session || !session.score_pin || session.score_pin !== pin) {
    return json(403, { ok: false, error: "access_denied" });
  }

  // Chemins docs des startups de CETTE session uniquement (pas d'injection de chemin).
  const { data: startups, error: stErr } = await admin
    .from("startups")
    .select("pitch_deck_path, exec_summary_path")
    .eq("session_id", session.id);
  if (stErr) return json(500, { ok: false, error: "startups_failed" });

  const paths: string[] = [];
  for (const s of startups || []) {
    if (s.pitch_deck_path) paths.push(s.pitch_deck_path as string);
    if (s.exec_summary_path) paths.push(s.exec_summary_path as string);
  }
  if (paths.length === 0) return json(200, { ok: true, urls: {} });

  const { data: signed, error: sgErr } = await admin.storage
    .from(DOSSIERS_BUCKET)
    .createSignedUrls(paths, TTL);
  if (sgErr) return json(500, { ok: false, error: "sign_failed" });

  const urls: Record<string, string> = {};
  for (const item of signed || []) {
    if (item?.path && item?.signedUrl) urls[item.path] = item.signedUrl;
  }
  return json(200, { ok: true, urls });
});
