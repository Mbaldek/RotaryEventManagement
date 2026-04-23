"""Download pitch decks + executive summaries from Airtable into session folders."""
import json, os, re, urllib.request, unicodedata

ROOT = r"C:\Users\mathi\Desktop\Active projects\RotaryEventManagement"
OUT = os.path.join(ROOT, "pitch_decks")
JSON = r"C:\tmp\rsa_accepted.json"

SESSION_SLUG = {
    "Foodtech & économie circulaire": "s1_foodtech",
    "Impact social & Edtech": "s2_social",
    "Tech, AI, Fintech & Mobilité": "s3_tech",
    "Healthtech & Biotech": "s4_health",
    "Greentech & Environnement": "s5_greentech",
}

def slug(s):
    s = (s or "").strip()
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^\w\s-]", "", s).strip()
    s = re.sub(r"\s+", "_", s)
    return s or "unknown"

def download(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return "skip"
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:
        f.write(r.read())
    return "ok"

data = json.load(open(JSON, encoding="utf-8"))
total, dl, skip, err = 0, 0, 0, 0
manifest = []

for rec in data["records"]:
    f = rec.get("fields", {})
    name = (f.get("Startup name") or "").strip()
    sess = f.get("Session group") or "_unknown"
    slug_sess = SESSION_SLUG.get(sess, slug(sess))
    slug_name = slug(name)
    base = os.path.join(OUT, slug_sess, slug_name)

    row = {"startup": name, "session": sess, "slug_session": slug_sess, "folder": base, "files": []}

    for field_key, prefix in [("Pitch deck", "pitch"), ("Executive Summary in French & German", "exec")]:
        atts = f.get(field_key, []) or []
        for i, att in enumerate(atts, 1):
            url = att.get("url")
            fn_orig = att.get("filename", f"{prefix}_{i}.pdf")
            ext = os.path.splitext(fn_orig)[1] or ".pdf"
            suffix = f"_{i}" if len(atts) > 1 else ""
            dest = os.path.join(base, f"{prefix}{suffix}{ext}")
            total += 1
            try:
                status = download(url, dest)
                if status == "ok": dl += 1
                else: skip += 1
                row["files"].append({"field": field_key, "path": dest, "status": status, "orig": fn_orig})
            except Exception as e:
                err += 1
                row["files"].append({"field": field_key, "path": dest, "status": f"err: {e}", "orig": fn_orig})
                print(f"  ERR {name} [{field_key}]: {e}")
    manifest.append(row)

with open(os.path.join(OUT, "_manifest.json"), "w", encoding="utf-8") as mf:
    json.dump(manifest, mf, ensure_ascii=False, indent=2)

print(f"\nDone. total={total} downloaded={dl} skipped={skip} errors={err}")
print(f"Manifest: {os.path.join(OUT, '_manifest.json')}")
