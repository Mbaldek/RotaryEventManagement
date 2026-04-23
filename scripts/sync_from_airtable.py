"""Sync accepted startups from Airtable into Supabase.

For each Accepted startup:
- UPSERT startup_confirmations row (by startup_name + session_id)
- Populate startup_contact_prenom, startup_contact_email, startup_country
- Upload application deck PDF to Supabase Storage at application_decks/{slug}.pdf
- Set application_deck_path + application_deck_filename

Idempotent: safe to re-run.

Usage:
    python scripts/sync_from_airtable.py

Reads Airtable PAT from env AIRTABLE_PAT or falls back to cached JSON at C:\\tmp\\rsa_accepted.json.
"""
import json, os, sys, re, unicodedata, urllib.request, urllib.error

ROOT = r"C:\Users\mathi\Desktop\Active projects\RotaryEventManagement"
PITCH_DIR = os.path.join(ROOT, "pitch_decks")
JSON_CACHE = r"C:\tmp\rsa_accepted.json"

SB_URL = "https://uaoucznptxmvhhytapso.supabase.co"
SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhb3Vjem5wdHhtdmhoeXRhcHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTU5NzAsImV4cCI6MjA4OTQ5MTk3MH0.evOgZctRuIxGSnZLocea5cAKqKR5nc-5x32QDqBUt0U"
SB_BASE_HEADERS = {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"}

SESSION_SLUG = {
    "Foodtech & économie circulaire": "s1_foodtech",
    "Impact social & Edtech": "s2_social",
    "Tech, AI, Fintech & Mobilité": "s3_tech",
    "Healthtech & Biotech": "s4_health",
    "Greentech & Environnement": "s5_greentech",
}

def slugify(s):
    s = (s or "").strip()
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^\w\s-]", "", s).strip()
    return re.sub(r"\s+", "_", s) or "unknown"

def first_name(full):
    """Extract a likely first name from a free-form contact field."""
    if not full: return ""
    s = full.strip()
    # Drop anything after ' - ' or ' | ' (e.g., "Martin - CEO Hormur")
    for sep in [" - ", " – ", " | ", ","]:
        if sep in s:
            s = s.split(sep, 1)[0].strip()
    # Take first token as prenom (heuristic; ambiguous for compound names but good enough)
    parts = s.split()
    return parts[0] if parts else ""

def sb_request(method, path, data=None, headers=None):
    url = f"{SB_URL}{path}"
    h = dict(SB_BASE_HEADERS)
    if headers: h.update(headers)
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        h.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
            if not raw: return None
            ct = r.headers.get("Content-Type", "")
            if "application/json" in ct:
                return json.loads(raw)
            return raw
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", "replace")
        raise RuntimeError(f"{method} {path} -> {e.code}: {err}")

def find_application_pdf(session_slug, startup_name):
    folder = os.path.join(PITCH_DIR, session_slug, slugify(startup_name))
    if not os.path.isdir(folder): return None
    # Prefer single-file pitch.pdf; else first pitch*.pdf
    for cand in ("pitch.pdf", "pitch_1.pdf"):
        p = os.path.join(folder, cand)
        if os.path.exists(p): return p
    for fn in sorted(os.listdir(folder)):
        if fn.lower().startswith("pitch") and fn.lower().endswith(".pdf"):
            return os.path.join(folder, fn)
    return None

def storage_upload(path, file_path, mime="application/pdf"):
    """Upload a local file to Supabase Storage at uploads/{path}. Overwrites."""
    with open(file_path, "rb") as f:
        body = f.read()
    req = urllib.request.Request(
        f"{SB_URL}/storage/v1/object/uploads/{path}",
        data=body, method="POST",
        headers={**SB_BASE_HEADERS, "Content-Type": mime, "x-upsert": "true"}
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", "replace")
        raise RuntimeError(f"Storage upload failed {e.code}: {err}")

def main():
    if not os.path.exists(JSON_CACHE):
        print(f"ERROR: cache not found at {JSON_CACHE}")
        print("Re-run the earlier Airtable fetch to regenerate it.")
        sys.exit(1)

    data = json.load(open(JSON_CACHE, encoding="utf-8"))
    print(f"Loaded {len(data['records'])} accepted startups from cache.")

    # Fetch existing rows once (avoids N queries)
    existing = sb_request("GET", "/rest/v1/startup_confirmations?select=id,startup_name,session_id")
    ex_map = {(r["startup_name"], r["session_id"]): r["id"] for r in existing}
    print(f"Existing rows in DB: {len(existing)}")

    created, updated, skipped_no_pdf, errors = 0, 0, 0, 0

    for rec in data["records"]:
        f = rec.get("fields", {})
        name = (f.get("Startup name") or "").strip()
        if not name:
            continue
        session_group = f.get("Session group") or ""
        session_slug = SESSION_SLUG.get(session_group)
        if not session_slug:
            print(f"  SKIP {name}: unknown session group '{session_group}'")
            continue

        prenom = first_name(f.get("Contact startup") or "")
        email = (f.get("Your email") or "").strip()
        country = (f.get("Registered in which country") or "").strip()

        # Find local PDF
        pdf_path = find_application_pdf(session_slug, name)
        deck_path = None
        deck_filename = None
        if pdf_path:
            storage_path = f"application_decks/{session_slug}_{slugify(name)}.pdf"
            try:
                storage_upload(storage_path, pdf_path)
                deck_path = storage_path
                # Pull original Airtable filename if available
                airtable_decks = f.get("Pitch deck") or []
                if airtable_decks:
                    deck_filename = airtable_decks[0].get("filename") or os.path.basename(pdf_path)
                else:
                    deck_filename = os.path.basename(pdf_path)
            except Exception as e:
                print(f"  ERR upload {name}: {e}")
                errors += 1
        else:
            skipped_no_pdf += 1
            print(f"  WARN no local PDF for {name} [{session_slug}]")

        patch = {
            "startup_contact_prenom": prenom,
            "startup_contact_email": email,
            "startup_country": country,
        }
        if deck_path:
            patch["application_deck_path"] = deck_path
            patch["application_deck_filename"] = deck_filename

        key = (name, session_slug)
        if key in ex_map:
            # UPDATE
            row_id = ex_map[key]
            sb_request(
                "PATCH",
                f"/rest/v1/startup_confirmations?id=eq.{row_id}",
                data=patch,
                headers={"Prefer": "return=minimal"}
            )
            updated += 1
            print(f"  upd {name} [{session_slug}]")
        else:
            # INSERT
            insert = {"startup_name": name, "session_id": session_slug, "status": "pending", **patch}
            sb_request(
                "POST",
                "/rest/v1/startup_confirmations",
                data=insert,
                headers={"Prefer": "return=minimal"}
            )
            created += 1
            print(f"  new {name} [{session_slug}]")

    print(f"\nDone. created={created} updated={updated} skipped_no_pdf={skipped_no_pdf} errors={errors}")

if __name__ == "__main__":
    main()
