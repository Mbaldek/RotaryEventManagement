import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts } from "npm:pdf-lib@1.17.1";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const A4: [number, number] = [595.28, 841.89];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body = await req.json().catch(() => ({}));
    const session_id: string | undefined = body?.session_id;
    if (!session_id) throw new Error("session_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase env");
    const admin = createClient(supabaseUrl, serviceKey);

    const [confsRes, cfgRes] = await Promise.all([
      admin.from("startup_confirmations").select("*").eq("session_id", session_id),
      admin.from("session_config").select("session_order").eq("session_id", session_id).maybeSingle(),
    ]);
    if (confsRes.error) throw confsRes.error;
    const confs = (confsRes.data ?? []) as Array<Record<string, unknown>>;
    if (!confs.length) throw new Error("No startups for this session");

    const orderRaw = (cfgRes.data as { session_order?: unknown } | null)?.session_order;
    const order: string[] = Array.isArray(orderRaw) ? (orderRaw as string[]) : [];
    const byName = new Map(confs.map((r) => [r.startup_name as string, r]));
    const ordered: Array<Record<string, unknown>> = [];
    for (const n of order) { const r = byName.get(n); if (r) ordered.push(r); }
    for (const r of confs) { if (!ordered.find((x) => x.id === r.id)) ordered.push(r); }

    const out = await PDFDocument.create();
    const helvBold = await out.embedFont(StandardFonts.HelveticaBold);
    const helv = await out.embedFont(StandardFonts.Helvetica);

    const cover = out.addPage(A4);
    cover.drawText("Rotary Startup Award 2026", { x: 50, y: 780, size: 22, font: helvBold });
    cover.drawText(`Jury pack — ${session_id}`, { x: 50, y: 750, size: 14, font: helv });
    cover.drawText(`${ordered.length} startups · generated ${new Date().toISOString().slice(0, 10)}`,
      { x: 50, y: 730, size: 10, font: helv });

    let y = 690;
    for (let i = 0; i < ordered.length; i++) {
      const s = ordered[i];
      const execsArr = Array.isArray(s.executive_summary_files) ? (s.executive_summary_files as unknown[]) : [];
      cover.drawText(`${i + 1}. ${s.startup_name} — deck + ${execsArr.length} pre-read`,
        { x: 60, y, size: 10, font: helv });
      y -= 16;
      if (y < 60) break;
    }

    const skipped: string[] = [];
    const included: Array<{ startup: string; deck: boolean; execs: number }> = [];

    async function appendPdf(path: string, title: string, subtitle: string): Promise<boolean> {
      if (!path.toLowerCase().endsWith(".pdf")) {
        skipped.push(`${title} — non-PDF skipped (${path})`);
        return false;
      }
      const { data, error } = await admin.storage.from("uploads").download(path);
      if (error) { skipped.push(`${title} — download failed (${path}): ${error.message}`); return false; }
      try {
        const src = await PDFDocument.load(await data!.arrayBuffer(), { ignoreEncryption: true });
        const sep = out.addPage(A4);
        sep.drawText(title, { x: 50, y: 420, size: 26, font: helvBold });
        sep.drawText(subtitle, { x: 50, y: 385, size: 13, font: helv });
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
        return true;
      } catch (e) {
        skipped.push(`${title} — parse failed (${path}): ${(e as Error).message}`);
        return false;
      }
    }

    for (const row of ordered) {
      const name = row.startup_name as string;
      const rec = { startup: name, deck: false, execs: 0 };
      const deckPath = (row.final_deck_path || row.application_deck_path) as string | null;
      if (deckPath) {
        rec.deck = await appendPdf(deckPath, name, "Deck");
      }
      const execs = Array.isArray(row.executive_summary_files) ? (row.executive_summary_files as Array<{ path: string; filename?: string }>) : [];
      for (let i = 0; i < execs.length; i++) {
        const ef = execs[i];
        if (!ef?.path) continue;
        const subtitle = `Pre-read${execs.length > 1 ? ` (${i + 1}/${execs.length})` : ""}${ef.filename ? ` — ${ef.filename}` : ""}`;
        const ok = await appendPdf(ef.path, name, subtitle);
        if (ok) rec.execs++;
      }
      included.push(rec);
    }

    const bytes = await out.save();
    const storagePath = `jury_packs/${session_id}_jury_pack.pdf`;
    const { error: upErr } = await admin.storage.from("uploads").upload(storagePath, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) throw upErr;

    await admin.from("session_config").upsert({
      session_id,
      jury_pack_path: storagePath,
      jury_pack_generated_at: new Date().toISOString(),
    }, { onConflict: "session_id" });

    const { data: pub } = admin.storage.from("uploads").getPublicUrl(storagePath);

    return new Response(JSON.stringify({
      ok: true,
      url: pub.publicUrl,
      path: storagePath,
      startup_count: ordered.length,
      included,
      skipped,
      size_bytes: bytes.length,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
