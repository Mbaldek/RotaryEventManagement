"""Emit jury intro emails (FR/EN) per session."""
import json, os, textwrap

ROOT = r"C:\Users\mathi\Desktop\Active projects\RotaryEventManagement"
JSON = r"C:\tmp\rsa_accepted.json"
BRIEF = os.path.join(ROOT, "briefings")

SESSIONS = [
    {"slug":"s1_foodtech",  "group":"Foodtech & économie circulaire", "label":"FoodTech & Économie circulaire", "date_fr":"Jeudi 30 avril · 18h", "date_en":"Thursday 30 April · 6pm"},
    {"slug":"s2_social",    "group":"Impact social & Edtech",          "label":"Impact social & Edtech",           "date_fr":"Mercredi 6 mai · 18h", "date_en":"Wednesday 6 May · 6pm"},
    {"slug":"s3_tech",      "group":"Tech, AI, Fintech & Mobilité",    "label":"Tech, AI, Fintech & Mobilité",     "date_fr":"Mercredi 13 mai · 18h", "date_en":"Wednesday 13 May · 6pm"},
    {"slug":"s4_health",    "group":"Healthtech & Biotech",            "label":"Healthtech & Biotech",              "date_fr":"Mardi 19 mai · 18h", "date_en":"Tuesday 19 May · 6pm"},
    {"slug":"s5_greentech", "group":"Greentech & Environnement",       "label":"Greentech & Environnement",         "date_fr":"Jeudi 21 mai · 18h", "date_en":"Thursday 21 May · 6pm"},
]

# Jurors pulled from Supabase (validated=true), grouped by assigned_sessions label
JURORS = [
    {"prenom":"David","nom":"Cayet","email":"david@cayet.eu","lang":"fr","sessions":["FoodTech & Économie circulaire","Impact social & Edtech","Tech, AI, Fintech & Mobilité","Healthtech & Biotech","Greentech & Environnement"]},
    {"prenom":"Birte","nom":"Gall","email":"birte.gall@erblotse.de","lang":"fr","sessions":["Tech, AI, Fintech & Mobilité","FoodTech & Économie circulaire"]},
    {"prenom":"Nicolas","nom":"Koutros","email":"nicolas.koutros@outlook.com","lang":"fr","sessions":["Tech, AI, Fintech & Mobilité","Healthtech & Biotech"]},
    {"prenom":"Sophie","nom":"Parize","email":"sophparz@gmail.com","lang":"fr","sessions":["Impact social & Edtech","Tech, AI, Fintech & Mobilité"]},
    {"prenom":"Frank","nom":"Wild","email":"frank.wild@ymail.com","lang":"fr","sessions":["FoodTech & Économie circulaire","Greentech & Environnement"]},
    {"prenom":"Martin","nom":"Bornholdt","email":"martin.bornholdt@kelvin.green","lang":"en","sessions":["Greentech & Environnement"]},
]

# Note: these labels have inconsistent casing between datasets — map both ways
LABEL_ALIASES = {
    "FoodTech & Économie circulaire":  {"FoodTech & Économie circulaire", "Foodtech & économie circulaire"},
}

data = json.load(open(JSON, encoding="utf-8"))
records_by_group = {}
for r in data["records"]:
    f = r.get("fields", {})
    g = f.get("Session group") or ""
    records_by_group.setdefault(g, []).append(f)

# Pitch order from dashboard
ORDER = {
    "s1_foodtech":  ["DATUS","GREEN OFF GRID SAS","KIDIPOWER","KUZOG FRANCE","Kyol","Midow"],
    "s2_social":    ["Buddy","Clover","Hormur","Krewzer","SightKick"],
    "s3_tech":      ["Boonty","DealMatrix","EVIMO","ex9","FollowTech"],
    "s4_health":    ["Femnov","InFocus Therapeutics","IPCURE","PEGMATISS BIOTECH","VAir","Virtuosis Health SAS","wilo"],
    "s5_greentech": ["Maa Biodiversity","reLi Energy","SafyPower","Sycon","Vergora"],
}

def startup_one_liner(f):
    # Prefer first sentence of Traction, fallback Sector/Theme
    t = (f.get("Traction") or "").strip()
    if t:
        first = t.split("\n")[0].strip()
        # Keep up to 180 chars
        if len(first) > 180:
            first = first[:177].rsplit(" ", 1)[0] + "..."
        return first
    sec = f.get("Sector/Theme") or []
    return ", ".join(sec[:4]) if sec else ""

def jurors_for(label):
    variants = LABEL_ALIASES.get(label, set()) | {label}
    return [j for j in JURORS if any(s in variants for s in j["sessions"])]

out_path = os.path.join(ROOT, "briefings", "_emails.md")
lines = ["# Emails jury — Rotary Startup Award 2026\n\n"]
lines.append("> Un brouillon par session. Pour chaque session, envoie **un email par langue** avec le briefing PDF en pièce jointe.\n\n")

for s in SESSIONS:
    slug, label, group, date_fr, date_en = s["slug"], s["label"], s["group"], s["date_fr"], s["date_en"]
    recs = records_by_group.get(group, [])
    # Sort by dashboard order
    order = ORDER.get(slug, [])
    def sk(f):
        n = (f.get("Startup name") or "").strip()
        try: return (0, order.index(n))
        except: return (1, n.lower())
    recs = sorted(recs, key=sk)

    juror_list = jurors_for(label)
    juror_fr = [j for j in juror_list if j["lang"] == "fr"]
    juror_en = [j for j in juror_list if j["lang"] == "en"]

    brief_path = os.path.join(BRIEF, f"Briefing_Jury_{slug}.pdf")
    brief_size = os.path.getsize(brief_path) / 1024 / 1024 if os.path.exists(brief_path) else 0

    lines.append(f"\n---\n\n## {label} — {date_fr}\n\n")
    lines.append(f"- **Pièce jointe** : `briefings/Briefing_Jury_{slug}.pdf` ({brief_size:.1f} MB, {len(recs)} startups)\n")
    lines.append(f"- **Jurés assignés** : {len(juror_list)} ({len(juror_fr)} FR, {len(juror_en)} EN)\n")
    if brief_size > 25:
        lines.append(f"- ⚠️ **Taille > 25 MB** : dépasse la limite Gmail. Envoyer via WeTransfer (ou équivalent), le juré cliquera sur « Télécharger » depuis l'email WeTransfer.\n")
    lines.append("\n")

    # FR email
    if juror_fr:
        lines.append(f"### 📧 Version FR — {len(juror_fr)} destinataire(s)\n\n")
        to_list = "; ".join(j["email"] for j in juror_fr)
        lines.append(f"**TO** : `{to_list}`\n\n")
        lines.append(f"**Objet** : Dossier jury — session « {label} » du {date_fr.split(' · ')[0].lower()}\n\n")
        lines.append("```\n")
        lines.append(f"Bonjour,\n\n")
        lines.append(f"Vous trouverez ci-joint le dossier de briefing pour la session « {label} » du {date_fr}, que vous allez juger.\n\n")
        lines.append(f"Le dossier contient, pour chacune des {len(recs)} startups retenues, une fiche de synthèse, le pitch deck et l'executive summary fournis par la startup. Il est navigable via les signets du PDF (panneau « Sommaire »).\n\n")
        lines.append(f"Les {len(recs)} startups qui pitcheront dans l'ordre :\n")
        for i, f in enumerate(recs, 1):
            name = (f.get("Startup name") or "?").strip()
            one = startup_one_liner(f)
            if one:
                lines.append(f"  {i}. {name} — {one}\n")
            else:
                lines.append(f"  {i}. {name}\n")
        lines.append("\n")
        lines.append(f"Le jour J, la visio démarre à 18h pour 2h environ. Lien Teams envoyé séparément quelques jours avant.\n\n")
        lines.append(f"Le scoring se fait en direct depuis la page dédiée : https://rotary-startup.org/RsaScore?s={slug}\n")
        lines.append(f"Chaque juré note chaque startup sur 6 critères (valeur, marché, business model, équipe, pitch, impact). Les barèmes détaillés sont rappelés dans la fiche.\n\n")
        lines.append(f"Merci d'avance pour votre temps et votre regard sur ces dossiers. Je reste à disposition pour toute question.\n\n")
        lines.append(f"Bien cordialement,\n")
        lines.append(f"Mathieu\n")
        lines.append("```\n\n")

    # EN email
    if juror_en:
        lines.append(f"### 📧 EN version — {len(juror_en)} recipient(s)\n\n")
        to_list = "; ".join(j["email"] for j in juror_en)
        lines.append(f"**TO** : `{to_list}`\n\n")
        lines.append(f"**Subject** : Jury briefing — « {label} » session on {date_en.split(' · ')[0].lower()}\n\n")
        lines.append("```\n")
        lines.append(f"Dear all,\n\n")
        lines.append(f"Please find attached the jury briefing for the « {label} » session on {date_en}, which you will be judging.\n\n")
        lines.append(f"The document contains, for each of the {len(recs)} selected startups, a one-page summary sheet, the pitch deck and the executive summary provided by the startup. Navigation via the PDF bookmarks (Outline panel).\n\n")
        lines.append(f"The {len(recs)} startups pitching in order:\n")
        for i, f in enumerate(recs, 1):
            name = (f.get("Startup name") or "?").strip()
            one = startup_one_liner(f)
            if one:
                lines.append(f"  {i}. {name} — {one}\n")
            else:
                lines.append(f"  {i}. {name}\n")
        lines.append("\n")
        lines.append(f"The Teams call starts at 6pm for about 2h. Link sent separately a few days before.\n\n")
        lines.append(f"Scoring happens live from the dedicated page: https://rotary-startup.org/RsaScore?s={slug}\n")
        lines.append(f"Each jury member rates each startup on 6 criteria (value, market, business model, team, pitch, impact). Scales detailed in the briefing.\n\n")
        lines.append(f"Thank you in advance for your time and judgment. I'm at your disposal for any questions.\n\n")
        lines.append(f"Best regards,\n")
        lines.append(f"Mathieu\n")
        lines.append("```\n\n")

with open(out_path, "w", encoding="utf-8") as f:
    f.writelines(lines)

print(f"Wrote {out_path}")
print(f"Size: {os.path.getsize(out_path)/1024:.1f} KB")
