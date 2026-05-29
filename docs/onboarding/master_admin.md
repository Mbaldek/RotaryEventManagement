# Onboarding — Master admin

> Guide pour l'admin fédération (toi, Mathieu, et tes successeurs).
> Pouvoir total cross-clubs. À garder sous clé.
> Captures : `docs/onboarding/screenshots/master-*.png` (placeholders).

---

## Table of contents

- [Ce que tu fais](#ce-que-tu-fais)
- [Workflow annuel](#workflow-annuel)
- [Cockpit master](#cockpit-master)
- [Grande Finale](#grande-finale)
- [Extensions marketplace](#extensions-marketplace)
- [Hardening checklist](#hardening-checklist)

---

## Ce que tu fais

Tu opères la **plateforme fédération** :
- Créer les éditions annuelles et inviter les clubs participants.
- Designer un club_admin par club.
- Reviewer les candidatures jury publiques (form `/DevenirJury`).
- Organiser la **Grande Finale** (Cyrus Conseil, mai chaque année).
- Gérer les extensions marketplace (V4+) et leur facturation Stripe.
- Surveiller la sécurité (RLS audits, logs, advisors Supabase).

---

## Workflow annuel

```
Sept   Création édition N+1 + ouverture clubs
Oct    Invite club_admins → ils configurent leurs sessions
Nov-Jan  /Candidater ouvert
Fév    Sessions club (sélection comité + pitch jury) → promote_to_finale
Mar-Avr  Préparation Grande Finale (jury fédéré, RSVPs)
Mai    Grande Finale chez Cyrus Conseil
Juin   Publish résultats fédération + archive
```

---

## Cockpit master

Accès : login → `/Admin` (sans `?scope=club:*`).

Onglets :

| Onglet | Action |
|--------|--------|
| **Compétitions** | CRUD éditions (`editions`). Setup tab pour toggles `public_results_enabled`, `promote_top_n`, critères scoring. |
| **Clubs** | CRUD clubs Rotary. Assigner club_admins. |
| **Users** | Liste tous les users + rôles. Inviter (`invite-user` edge fn) ou supprimer (`delete-user` edge fn → soft-delete + audit). |
| **Candidatures jury** | Review form `/DevenirJury` : approve → trigger magic-link + role `jury`. Reject → email motivé. |
| **Extensions** | Marketplace V4+ : activer/désactiver modules payants par club. |
| **Analytics** | Funnel candidatures, taux participation jury, scores moyens par édition (Recharts). |
| **Settings** | Config plateforme globale (templates emails, branding fallback). |
| **Audit log** | UI V3.1+ (table `admin_audit_log` déjà alimentée). |

*Capture : `screenshots/master-01-cockpit.png`*

---

## Grande Finale

- **Date** : mardi de mai (2026 = 26 mai 16h-19h chez Cyrus Conseil, 50 bd Haussmann Paris 9). Voir [memory file finale](../../C:/Users/mathi/.claude/projects/c--Users-mathi-Desktop-Active-projects-RotaryEventManagement/memory/project_rsa_finale.md).
- **Process** :
  1. Récupérer les top promus auto par club (`rsa_promote_to_finale` a fait le boulot).
  2. Constituer le **jury fédéré** (10-12 personnes, mix corporates + investisseurs).
  3. Sessions consécutives 20 min × N startups (typiquement 6-8).
  4. À la fin, **délibération** + saisie scores → `rsa_finalize_results` →
     classement final + bonus/fix-rank si décision jury.
  5. Annonce live + page `/Resultats` published.
- **Runbook jour J** : [docs/RSA_LIVE.md](../RSA_LIVE.md).
- **Backup** : exporter CSV scores avant clôture session, conserver hors plateforme
  pendant 24h en cas de bug.

---

## Extensions marketplace

V4+. Modules payants activables par club :
- **Premium analytics** (cohortes, benchmarks anonymisés)
- **Branding custom** (logo, couleurs, domaine custom)
- **Multi-langues** (DE V4.1, IT V4.2)
- **Auto-jury matching** (ML basé expertise jurés × secteurs startups)

Facturation via Stripe (extension `@stripe/react-stripe-js` déjà bundlée). Subscription
par club, billing master_admin.

Détail : blueprint à écrire en V4 (`docs/blueprints/module5-extensions.md`).

---

## Hardening checklist

À tourner **chaque trimestre** :

- [ ] [docs/hardening/rls-audit-v3.md](../hardening/rls-audit-v3.md) — re-run du
      script de check (toutes les tables sensibles ont RLS + policies).
- [ ] Supabase MCP `get_advisors type=security` — zéro warning critique.
- [ ] Rotation `RESEND_API_KEY` annuelle.
- [ ] Vérif `admin_audit_log` — pas d'anomalie (user delete inhabituel, role change
      hors workflow).
- [ ] Bucket `uploads` lockdown — voir
      [USER-ACTIONS § F.1](../USER-ACTIONS-V3.md#f1--v21--uploads-bucket-lockdown-104-objets-legacy-2026).
- [ ] Backup Postgres test restore (Dashboard → Database → Backups).

Toutes les actions manuelles infra : [docs/USER-ACTIONS-V3.md](../USER-ACTIONS-V3.md).
Architecture détaillée : [docs/ARCHITECTURE.md](../ARCHITECTURE.md).
