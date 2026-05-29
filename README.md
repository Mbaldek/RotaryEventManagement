# Rotary Startup Award (RSA) — Plateforme

> B2B SaaS pour la gestion de concours startup multi-clubs Rotary.
> Hébergée sur `app.rotary-startup.org`. Build V3 — mai 2026.

---

## Table of contents

- [Ce que c'est](#ce-que-cest)
- [Stack technique](#stack-technique)
- [Quick start (dev local)](#quick-start-dev-local)
- [Architecture](#architecture)
- [Personas](#personas)
- [Documentation](#documentation)
- [Déploiement & ops](#déploiement--ops)
- [License](#license)

---

## Ce que c'est

RSA est la plateforme officielle qui orchestre les Rotary Startup Awards : un concours
multi-club entre clubs Rotary, structuré en quatre modules — **Candidature**, **Sélection**,
**Jury**, **Finale & résultats**. La plateforme adresse 4 rôles distincts (candidat,
juré, club_admin, master_admin) et expose une API REST + RPC Supabase sécurisée par RLS.

Cible : pilote 2027 avec le club Paris, puis fédération multi-club >=2028 (voir
[blueprint V2 multi-club](docs/blueprints/auth-routing-and-personas.md)).

---

## Stack technique

| Couche | Tech |
|--------|------|
| Frontend | React 18, Vite 6, Tailwind CSS 3, shadcn/ui (Radix), Recharts, Framer Motion |
| State / data | TanStack Query 5, React Hook Form 7, Zod 3 |
| Backend | Supabase (Postgres 15, Auth magic-link, Realtime, Storage, Edge Functions Deno) |
| Email | Resend (via edge functions `send-transactional` + `send-bulk`) |
| Paiement | Stripe (extension marketplace V4+) |
| Observabilité | Sentry React (front), Supabase logs (backend) |
| Tests | Playwright E2E (`tests/e2e/`) |
| Deploy | Vercel (front), Supabase managed (back) |

---

## Quick start (dev local)

```bash
# 1. Cloner & installer
git clone <repo-url> rsa && cd rsa
npm install

# 2. Configurer l'environnement
cp .env.example .env.local
# Puis éditer .env.local avec tes clés Supabase de dev

# 3. Lancer le dev server
npm run dev     # http://localhost:5173

# 4. Lint + build avant PR
npm run lint
npm run build
```

`.env.example` (à créer si absent) :

```
VITE_SUPABASE_URL=https://uaoucznptxmvhhytapso.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable_anon_key>
VITE_SENTRY_DSN=
VITE_STRIPE_PUBLISHABLE_KEY=
```

Pour un stack Supabase 100% local (Postgres + Auth + Storage), suivre
[la doc Supabase CLI](https://supabase.com/docs/guides/local-development) (non requis pour
le dev frontend si tu pointes le client vers le projet dev cloud).

---

## Architecture

**Multi-tenant clubs, multi-rôles, mono-instance.**

```
                  ┌─────────────────────────────────┐
                  │  Vercel (Vite SSG + SPA React)  │
                  │  app.rotary-startup.org         │
                  └────────────────┬────────────────┘
                                   │
                  ┌────────────────┴────────────────┐
                  │     Supabase (FR/EU region)     │
                  │  ┌───────────────────────────┐  │
                  │  │ Postgres 15               │  │
                  │  │  - editions, clubs        │  │
                  │  │  - startups (candidats)   │  │
                  │  │  - reviews (comité)       │  │
                  │  │  - jury_scores            │  │
                  │  │  - results, bonuses       │  │
                  │  │  - app_user_roles         │  │
                  │  │ RLS par table + rôle      │  │
                  │  └───────────────────────────┘  │
                  │  ┌───────────────────────────┐  │
                  │  │ Auth magic-link           │  │
                  │  └───────────────────────────┘  │
                  │  ┌───────────────────────────┐  │
                  │  │ Storage (dossiers privé,  │  │
                  │  │  uploads legacy public)   │  │
                  │  └───────────────────────────┘  │
                  │  ┌───────────────────────────┐  │
                  │  │ Edge functions Deno       │  │
                  │  │  - send-transactional     │  │
                  │  │  - send-bulk              │  │
                  │  │  - invite-user            │  │
                  │  │  - delete-user            │  │
                  │  │  - consolidate-jury-pack  │  │
                  │  └───────────────────────────┘  │
                  └─────────────────────────────────┘
```

- **Rôles** : `master_admin` (fédération entière), `club_admin` (1+ clubs), `comite`
  (sélection), `jury` (notation), `startup` (candidat). Granularité par club via
  `app_user_roles.club_id`.
- **RLS** : chaque table a une policy par rôle. Le détail est dans
  [docs/hardening/rls-audit-v3.md](docs/hardening/rls-audit-v3.md).
- **RPC SECURITY DEFINER** : opérations sensibles (apply_jury, finalize_review,
  promote_to_finale) via fonctions PL/pgSQL signées.
- **Realtime** : canaux Supabase Realtime pour la session live jury (scores qui
  remontent au fil de l'eau).
- **Storage buckets** : `dossiers` (privé, signed URLs) pour les pitch decks V3+ ;
  `uploads` (legacy public, à locker en V2.1 — voir USER-ACTIONS).

---

## Personas

| Persona | Entrée | Onboarding |
|---------|--------|-----------|
| **Candidat** (startup) | `/Candidater` | [docs/onboarding/candidat.md](docs/onboarding/candidat.md) |
| **Juré** (jury) | `/DevenirJury` ou invite | [docs/onboarding/jure.md](docs/onboarding/jure.md) |
| **Club admin** | invite master_admin | [docs/onboarding/club_admin.md](docs/onboarding/club_admin.md) |
| **Master admin** | invite manuelle SQL | [docs/onboarding/master_admin.md](docs/onboarding/master_admin.md) |

Le **comité** (sélection) hérite de l'UX juré + page `/Selection` documentée dans le
blueprint module 2.

---

## Documentation

- **Architecture technique** : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Contribuer** : [CONTRIBUTING.md](CONTRIBUTING.md)
- **Blueprints modules** : [docs/blueprints/](docs/blueprints/)
- **Hardening & RLS** : [docs/hardening/](docs/hardening/)
- **Design system Élysée** : [docs/design/elysee-designbook.md](docs/design/elysee-designbook.md)
- **Runbook session live** : [docs/RSA_LIVE.md](docs/RSA_LIVE.md)

---

## Déploiement & ops

Toutes les actions manuelles requises (clés API, redirect URLs Supabase Auth, secrets
Edge Functions, pg_cron, DNS Resend) sont listées dans
[**docs/USER-ACTIONS-V3.md**](docs/USER-ACTIONS-V3.md). À garder à jour à chaque vague.

---

## License

Propriétaire — Rotary International / Mathieu Bal. Tous droits réservés.
Pour un usage externe (autre district Rotary, autre fédération), contacter
mathieubal@gmail.com.
