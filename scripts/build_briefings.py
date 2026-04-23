"""Build 1 briefing PDF per session: session cover + (startup cover + pitch + exec) * N, with bookmarks.

Pitch deck resolution (per startup):
  1. final_deck_path in startup_confirmations (Supabase Storage) — preferred
     - .pdf   -> include directly
     - .pptx  -> convert via PowerPoint COM (Windows only) before inclusion
  2. application_deck_path (fallback — deck soumis à la candidature)
  3. Warning logged if neither present or no explicit confirmation

Exec summary: still pulled from Airtable local cache (pitch_decks/{slug}/{startup}/exec*.pdf).
"""
import os, json, io, unicodedata, re, urllib.request, urllib.error, tempfile
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Paragraph
from pypdf import PdfWriter, PdfReader

ROOT = r"C:\Users\mathi\Desktop\Active projects\RotaryEventManagement"
PITCH_DIR = os.path.join(ROOT, "pitch_decks")  # still used for exec summaries
OUT_DIR = os.path.join(ROOT, "briefings")
DOWNLOAD_CACHE = os.path.join(ROOT, "briefings", "_deck_cache")
JSON = r"C:\tmp\rsa_accepted.json"
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(DOWNLOAD_CACHE, exist_ok=True)

SB_URL = "https://uaoucznptxmvhhytapso.supabase.co"
SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhb3Vjem5wdHhtdmhoeXRhcHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTU5NzAsImV4cCI6MjA4OTQ5MTk3MH0.evOgZctRuIxGSnZLocea5cAKqKR5nc-5x32QDqBUt0U"
SB_HEADERS = {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"}

SESSION_META = {
    "s1_foodtech":   {"label": "FoodTech & Economie circulaire",   "date": "Jeudi 30 avril 2026, 18h",  "color": "#5a7a1a", "group": "Foodtech & économie circulaire"},
    "s2_social":     {"label": "Impact social & Edtech",           "date": "Mercredi 6 mai 2026, 18h",  "color": "#8a2040", "group": "Impact social & Edtech"},
    "s3_tech":       {"label": "Tech, AI, Fintech & Mobilite",     "date": "Mercredi 13 mai 2026, 18h", "color": "#4a2a7a", "group": "Tech, AI, Fintech & Mobilité"},
    "s4_health":     {"label": "Healthtech & Biotech",             "date": "Mardi 19 mai 2026, 18h",    "color": "#1a5fa8", "group": "Healthtech & Biotech"},
    "s5_greentech":  {"label": "Greentech & Environnement",        "date": "Jeudi 21 mai 2026, 18h",    "color": "#1d6b4f", "group": "Greentech & Environnement"},
}

ORDER = {
    "s1_foodtech":  ["DATUS","GREEN OFF GRID SAS","KIDIPOWER","KUZOG FRANCE","Kyol","Midow"],
    "s2_social":    ["Buddy","Clover","Hormur","Krewzer","SightKick"],
    "s3_tech":      ["Boonty","DealMatrix","EVIMO","ex9","FollowTech"],
    "s4_health":    ["Femnov","InFocus Therapeutics","IPCURE","PEGMATISS BIOTECH","VAir","Virtuosis Health SAS","wilo"],
    "s5_greentech": ["Maa Biodiversity","reLi Energy","SafyPower","Sycon","Vergora"],
}

# ---------- Supabase helpers ----------
def sb_get_all_confirmations():
    url = f"{SB_URL}/rest/v1/startup_confirmations?select=id,startup_name,session_id,deck_confirmed_at,final_deck_path,final_deck_original_filename,application_deck_path,application_deck_filename"
    req = urllib.request.Request(url, headers=SB_HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def sb_download(path, dest):
    """Download from storage bucket 'uploads' (public)."""
    url = f"{SB_URL}/storage/v1/object/public/uploads/{path}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
        f.write(r.read())

# ---------- PPTX conversion (PowerPoint COM, Windows-only) ----------
def convert_pptx_to_pdf(src, dst):
    """Convert a .pptx file to .pdf using PowerPoint COM. Raises on failure."""
    import win32com.client as win32
    import pythoncom
    pythoncom.CoInitialize()
    ppt = win32.DispatchEx("PowerPoint.Application")
    try:
        try: ppt.Visible = 1
        except Exception: pass
        pres = ppt.Presentations.Open(src, WithWindow=False)
        pres.SaveAs(dst, 32)  # 32 = ppSaveAsPDF
        pres.Close()
    finally:
        ppt.Quit()

# ---------- Load Airtable data (for exec summaries + cover page metadata) ----------
data = json.load(open(JSON, encoding="utf-8"))
by_session = {k: [] for k in SESSION_META}
extras = []
for rec in data["records"]:
    f = rec.get("fields", {})
    group = f.get("Session group")
    slug = next((k for k,v in SESSION_META.items() if v["group"] == group), None)
    if slug:
        by_session[slug].append(f)
    else:
        extras.append(f)

def sort_key(slug, f):
    name = (f.get("Startup name") or "").strip()
    order = ORDER.get(slug, [])
    try:
        return (0, order.index(name))
    except ValueError:
        return (1, name.lower())

for slug in by_session:
    by_session[slug].sort(key=lambda f: sort_key(slug, f))

def slugify(s):
    s = (s or "").strip()
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^\w\s-]", "", s).strip()
    return re.sub(r"\s+", "_", s) or "unknown"

# ---------- Load confirmations + build deck resolution ----------
print("Fetching startup_confirmations from Supabase...")
all_confs = sb_get_all_confirmations()
conf_by_key = {(r["startup_name"], r["session_id"]): r for r in all_confs}
print(f"  {len(all_confs)} confirmations loaded")

def resolve_pitch_pdf(slug, startup_name):
    """Return a local PDF path for the pitch deck, downloading/converting as needed.
    Returns (path, source_label) where source_label is 'final|application|none'.
    """
    conf = conf_by_key.get((startup_name, slug))
    if not conf:
        return None, "none"

    # Prefer final deck if present
    if conf.get("final_deck_path"):
        remote = conf["final_deck_path"]
        orig_name = conf.get("final_deck_original_filename") or os.path.basename(remote)
        ext = (orig_name.split(".")[-1] or "").lower()
        local = os.path.join(DOWNLOAD_CACHE, f"{slug}_{slugify(startup_name)}_final.{ext}")
        try:
            sb_download(remote, local)
        except Exception as e:
            print(f"  ! download {remote}: {e}")
            return None, "none"

        if ext in ("pptx", "ppt"):
            pdf_path = local.rsplit(".", 1)[0] + ".pdf"
            try:
                convert_pptx_to_pdf(local, pdf_path)
            except Exception as e:
                print(f"  ! pptx->pdf {orig_name}: {e}")
                return None, "none"
            return pdf_path, "final"
        elif ext == "pdf":
            return local, "final"
        else:
            print(f"  ! unknown ext .{ext} for {startup_name}")
            return None, "none"

    # Fallback: application deck
    if conf.get("application_deck_path"):
        remote = conf["application_deck_path"]
        local = os.path.join(DOWNLOAD_CACHE, f"{slug}_{slugify(startup_name)}_application.pdf")
        try:
            sb_download(remote, local)
        except Exception as e:
            print(f"  ! download {remote}: {e}")
            return None, "none"
        source = "application" if conf.get("deck_confirmed_at") else "application_no_confirm"
        return local, source

    return None, "none"

def find_execs(slug_sess, startup_name):
    """Exec summaries still come from the Airtable local cache."""
    folder = os.path.join(PITCH_DIR, slug_sess, slugify(startup_name))
    if not os.path.isdir(folder):
        return []
    files = sorted(os.listdir(folder))
    return [os.path.join(folder, f) for f in files if f.lower().startswith("exec") and f.lower().endswith(".pdf")]

# ---------- Cover pages (reportlab) ----------
PAGE_W, PAGE_H = A4

def fmt_money(v):
    if v is None or v == "" or v == 0: return "-"
    try:
        n = float(v)
        if n >= 1e6: return f"{n/1e6:.1f} MEUR"
        if n >= 1e3: return f"{n/1e3:.0f} kEUR"
        return f"{n:.0f} EUR"
    except: return str(v)

def make_session_cover(slug, session_records, out_path):
    c = canvas.Canvas(out_path, pagesize=A4)
    meta = SESSION_META[slug]
    color = HexColor(meta["color"])
    c.setFillColor(color); c.rect(0, PAGE_H - 120, PAGE_W, 120, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, PAGE_H - 55, "ROTARY STARTUP AWARD 2026")
    c.setFont("Helvetica-Bold", 22)
    c.drawString(50, PAGE_H - 85, meta["label"])
    c.setFont("Helvetica", 12)
    c.drawString(50, PAGE_H - 105, meta["date"])

    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, PAGE_H - 170, f"Briefing jury ({len(session_records)} startups)")
    c.setFont("Helvetica", 10)
    c.setFillColor(HexColor("#555555"))
    c.drawString(50, PAGE_H - 188, "Ordre de passage indicatif. Navigation via les signets (bookmarks) du PDF.")

    y = PAGE_H - 230
    c.setFillColor(black); c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "Sommaire")
    y -= 20
    c.setFont("Helvetica", 10)
    for i, f in enumerate(session_records, 1):
        name = (f.get("Startup name") or "?").strip()
        contact = (f.get("Contact startup") or "").strip()
        sector = f.get("Sector/Theme") or []
        sec_str = ", ".join(sector[:3]) if isinstance(sector, list) else ""
        c.setFillColor(black); c.setFont("Helvetica-Bold", 10)
        c.drawString(50, y, f"{i}.  {name}")
        c.setFillColor(HexColor("#666666")); c.setFont("Helvetica", 9)
        if contact: c.drawString(70, y - 12, f"Contact: {contact}")
        if sec_str: c.drawString(70, y - 24, f"Secteurs: {sec_str}")
        y -= 38
        if y < 80:
            c.showPage(); y = PAGE_H - 50

    c.save()

def make_startup_cover(slug, f, out_path):
    meta = SESSION_META[slug]
    color = HexColor(meta["color"])
    c = canvas.Canvas(out_path, pagesize=A4)

    name = (f.get("Startup name") or "?").strip()
    contact = (f.get("Contact startup") or "").strip()
    email = (f.get("Your email") or "").strip()
    phone = (f.get("Your phone") or "").strip()
    site = (f.get("Your website") or "").strip()
    video = (f.get("Video pitch") or "").strip()
    country = (f.get("Registered in which country") or "").strip()
    year = (f.get("Creation year (after 1/1/2020)") or "").strip()
    rev = f.get("Last fiscal year revenue (0 if none)")
    raised = f.get("How much have you already raised?")
    club = (f.get("Club") or "").strip()
    instit = (f.get("Institution partenaire") or "").strip()
    sector = f.get("Sector/Theme") or []
    sec_str = ", ".join(sector) if isinstance(sector, list) else ""
    traction = (f.get("Traction") or "").strip()
    traction_so_far = (f.get("Traction so far") or "").strip()
    esg = (f.get("ESG/Impact summary") or "").strip()

    c.setFillColor(color); c.rect(0, PAGE_H - 90, PAGE_W, 90, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica", 9)
    c.drawString(50, PAGE_H - 30, f"ROTARY STARTUP AWARD 2026  |  {meta['label'].upper()}  |  {meta['date']}")
    c.setFont("Helvetica-Bold", 24)
    display_name = name if len(name) < 40 else name[:37] + "..."
    c.drawString(50, PAGE_H - 65, display_name)

    c.setFillColor(black)
    styles = getSampleStyleSheet()
    small = ParagraphStyle("small", parent=styles["Normal"], fontName="Helvetica", fontSize=9.5, leading=13, textColor=HexColor("#222222"))
    body = ParagraphStyle("body", parent=small, fontSize=9, leading=12, textColor=HexColor("#333333"))

    x_left = 50
    y = PAGE_H - 120

    c.setFillColor(color); c.setFont("Helvetica-Bold", 10)
    c.drawString(x_left, y, "CONTACT"); y -= 14
    c.setFillColor(black); c.setFont("Helvetica", 10)
    if contact: c.drawString(x_left, y, contact); y -= 13
    if email:   c.drawString(x_left, y, email); y -= 13
    if phone:   c.drawString(x_left, y, phone); y -= 13
    if site:    c.drawString(x_left, y, site); y -= 13
    if video:
        short_v = video if len(video) < 50 else video[:47] + "..."
        c.drawString(x_left, y, f"Video: {short_v}"); y -= 13

    y -= 6
    c.setFillColor(color); c.setFont("Helvetica-Bold", 10)
    c.drawString(x_left, y, "REPERES"); y -= 14
    c.setFillColor(black); c.setFont("Helvetica", 10)
    rows = [
        ("Pays", country),
        ("Creation", str(year)[:10] if year else ""),
        ("CA dernier exercice", fmt_money(rev)),
        ("Levee a ce jour", fmt_money(raised)),
        ("Club Rotary", club),
        ("Institution partenaire", instit),
    ]
    for k, v in rows:
        if not v or v == "-": continue
        c.setFont("Helvetica", 9); c.setFillColor(HexColor("#666666"))
        c.drawString(x_left, y, f"{k}:")
        c.setFont("Helvetica", 10); c.setFillColor(black)
        c.drawString(x_left + 110, y, str(v))
        y -= 13

    x_right = 310; col_w_right = PAGE_W - x_right - 50
    y_r = PAGE_H - 120

    def right_section(title, text):
        nonlocal y_r
        if not text: return
        c.setFillColor(color); c.setFont("Helvetica-Bold", 10)
        c.drawString(x_right, y_r, title.upper()); y_r -= 14
        c.setFillColor(black)
        p = Paragraph(text.replace("\n", "<br/>"), body)
        _, h = p.wrap(col_w_right, 1000)
        p.drawOn(c, x_right, y_r - h)
        y_r -= h + 10

    if sec_str: right_section("Secteurs", sec_str)
    desc = traction or ""
    if desc:
        right_section("Description / Traction", desc[:1100] + ("..." if len(desc) > 1100 else ""))
    if traction_so_far:
        right_section("Traction chiffree", traction_so_far[:800] + ("..." if len(traction_so_far) > 800 else ""))
    if esg:
        right_section("Impact ESG", esg[:700] + ("..." if len(esg) > 700 else ""))

    c.setFillColor(HexColor("#888888")); c.setFont("Helvetica-Oblique", 8)
    c.drawString(50, 30, "Fiche generee a partir du dossier Airtable. Les pages suivantes contiennent le pitch deck et l'executive summary fournis par la startup.")
    c.save()

# ---------- Build each session ----------
summary = []
warnings = []

for slug, meta in SESSION_META.items():
    records = by_session[slug]
    if not records:
        print(f"[{slug}] no startups"); continue

    print(f"\n[{slug}] building {len(records)} startups...")
    writer = PdfWriter()
    tmp_dir = os.path.join(OUT_DIR, f"_tmp_{slug}")
    os.makedirs(tmp_dir, exist_ok=True)

    # 1) Session cover
    sess_cover = os.path.join(tmp_dir, "00_session_cover.pdf")
    make_session_cover(slug, records, sess_cover)
    start_page = len(writer.pages)
    for pg in PdfReader(sess_cover).pages:
        writer.add_page(pg)
    root_bm = writer.add_outline_item(f"Session: {meta['label']}", start_page)

    # 2) Per startup
    for idx, f in enumerate(records, 1):
        name = (f.get("Startup name") or "?").strip()

        cov = os.path.join(tmp_dir, f"{idx:02d}_{slugify(name)}_cover.pdf")
        make_startup_cover(slug, f, cov)
        start_page = len(writer.pages)
        for pg in PdfReader(cov).pages:
            writer.add_page(pg)
        startup_bm = writer.add_outline_item(f"{idx}. {name}", start_page, parent=root_bm)

        # Resolve pitch deck from Supabase
        pitch_path, source = resolve_pitch_pdf(slug, name)
        if pitch_path:
            sp = len(writer.pages)
            try:
                for pg in PdfReader(pitch_path).pages:
                    writer.add_page(pg)
                label = {
                    "final": "Pitch deck (final)",
                    "application": "Pitch deck (candidature — conservé)",
                    "application_no_confirm": "Pitch deck (candidature — pas de réponse)",
                }.get(source, "Pitch deck")
                writer.add_outline_item(label, sp, parent=startup_bm)
                print(f"  {idx}. {name}: pitch = {source}")
                if source == "application_no_confirm":
                    warnings.append(f"{name} [{slug}]: aucune confirmation de la startup, fallback sur le deck de candidature")
            except Exception as e:
                print(f"  ! {name} pitch: {e}")
                warnings.append(f"{name} [{slug}]: pitch PDF error: {e}")
        else:
            print(f"  ! {name}: NO pitch deck resolvable")
            warnings.append(f"{name} [{slug}]: AUCUN deck disponible")

        # Exec summaries (local cache)
        execs = find_execs(slug, name)
        for ei, ep in enumerate(execs, 1):
            sp = len(writer.pages)
            try:
                for pg in PdfReader(ep).pages:
                    writer.add_page(pg)
                label = "Executive summary" if len(execs) == 1 else f"Executive summary {ei}"
                writer.add_outline_item(label, sp, parent=startup_bm)
            except Exception as e:
                print(f"  ! {name} exec {os.path.basename(ep)}: {e}")

    out = os.path.join(OUT_DIR, f"Briefing_Jury_{slug}.pdf")
    with open(out, "wb") as fp:
        writer.write(fp)
    sz_mb = os.path.getsize(out) / 1024 / 1024
    pages = len(writer.pages)
    summary.append((slug, meta["label"], len(records), pages, sz_mb, out))
    print(f"  -> {out}  ({pages} pages, {sz_mb:.1f} MB)")

    for f in os.listdir(tmp_dir):
        try: os.remove(os.path.join(tmp_dir, f))
        except: pass
    try: os.rmdir(tmp_dir)
    except: pass

print("\n=== DONE ===")
for s, lbl, n, p, mb, path in summary:
    print(f"  {s} ({lbl}): {n} startups, {p} pages, {mb:.1f} MB")
if warnings:
    print("\n=== WARNINGS ===")
    for w in warnings:
        print(f"  - {w}")
if extras:
    print("\nExtras (Accepted in Airtable but no matching session slug):")
    for f in extras:
        print(f"  - {(f.get('Startup name') or '?').strip()} [group={f.get('Session group')}]")
