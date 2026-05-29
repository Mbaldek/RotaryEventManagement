# RSA — Architecture technique

> Pour devs qui rejoignent l'équipe. Lire avant de toucher au schema, RLS ou RPC.

---

## Table of contents

- [Vue d'ensemble](#vue-densemble)
- [Schema Supabase](#schema-supabase)
- [Pattern RPC + RLS](#pattern-rpc--rls)
- [Realtime](#realtime)
- [Storage buckets](#storage-buckets)
- [Auth & rôles](#auth--rôles)
- [Edge Functions](#edge-functions)
- [Observabilité](#observabilité)
- [Frontend layering](#frontend-layering)

---

## Vue d'ensemble

```
React 18 SPA  ──(supabase-js)──►  Supabase
   │                                 │
   ├─ TanStack Query (cache)         ├─ Postgres + RLS
   ├─ Zustand minimal (UI state)     ├─ Auth (magic-link)
   ├─ Realtime channels              ├─ Realtime (logical replication)
   └─ Sentry (errors + replay)       ├─ Storage (dossiers privé)
                                     └─ Edge functions (Deno)
                                            │
                                            ├─ Resend (emails)
                                            └─ Stripe (paiements V4+)
```

Aucun backend Node propre. Toute la logique métier vit dans **Postgres** (RPC PL/pgSQL
SECURITY DEFINER) et **Edge Functions** (Deno TypeScript) pour les I/O externes (email,
PDF).

---

## Schema Supabase

### Tables principales

| Table | Rôle | RLS |
|-------|------|-----|
| `editions` | Une compétition annuelle (ex 2027). | read all auth, write master_admin |
| `clubs` | Clubs Rotary participant à une édition. | read all auth, write master_admin |
| `startups` | Dossiers de candidature (1 par startup × édition × club). | read: owner + comité/jury du club + admins ; write: owner avant submit + admins après |
| `reviews` | Notation comité (selection). | read/write comité du club + admins |
| `jury_sessions` | Sessions live de pitch + Q&A. | read: jurés assignés + admins ; write: club_admin + master_admin |
| `jury_assignments` | Liens jury × session. | read: assigned juror + admins |
| `jury_scores` | Scores individuels par critère, par juré, par startup. | read: scoring juror + admins ; write: scoring juror + finalize via RPC |
| `results` | Classement final + bonus/fix-rank admin overrides. | read all auth ; write via RPC `rsa_finalize_results` |
| `app_user_roles` | Mapping user × rôle × club (granularité multi-tenant). | read: self + admins ; write: master_admin only |
| `profiles` | Profil user (nom, photo opt-in). | self_read + staff_read |
| `jury_applications` | Candidatures jury publiques (form `/DevenirJury`). | insert public ; read/update master_admin |
| `admin_audit_log` | Log silencieux des actions sensibles (delete user, role change). | master_admin only |
| `editions_settings` | Config par édition (public_results_enabled, promote_top_n). | read all auth, write master_admin |

Détail complet : voir [docs/blueprints/](blueprints/) module par module.

### Relations clés

- `startups.edition_id → editions.id`
- `startups.club_id → clubs.id`
- `startups.owner_user_id → auth.users.id`
- `jury_scores.startup_id → startups.id`
- `jury_scores.juror_id → auth.users.id`
- `results.startup_id → startups.id` (one-to-one, classement final)

---

## Pattern RPC + RLS

**Règle d'or** : toute opération qui touche plus d'une table, ou qui nécessite des
droits élevés temporaires, passe par une RPC `SECURITY DEFINER` plutôt que par une
écriture directe `supabase.from(...)`.

### RPC critiques V3

| RPC | Rôle attendu | Effet |
|-----|--------------|-------|
| `rsa_claim_pending_draft(p_token)` | candidat connecté | bind un draft `/Candidater` au user qui clique magic-link |
| `rsa_submit_dossier(p_startup_id)` | owner startup | passe `status=submitted`, freeze edits |
| `rsa_apply_jury(p_session_id, p_startup_ids)` | club_admin / master_admin | assigne les jurés à une session |
| `rsa_upsert_review(p_review)` | comité du club | crée/update une review (avec validation des champs) |
| `rsa_finalize_review(p_review_id)` | comité du club | locke la review, déclenche notif |
| `rsa_save_score(p_score)` | juré assigné | upsert un score par critère |
| `rsa_finalize_session(p_session_id)` | club_admin | calcule moyennes pondérées, freeze scores |
| `rsa_promote_to_finale(p_session_id, p_top_n)` | club_admin | auto-promote N premiers en finale fédérée |
| `rsa_finalize_results(p_edition_id)` | master_admin | classement final + applique bonus/fix-rank |
| `has_platform_role(p_role)` | helper RLS | check booléen utilisé dans toutes les policies |
| `rsa_cleanup_expired_pending_drafts()` | pg_cron | TTL 7j drafts non confirmés |

Toutes les RPC ont `SET search_path = public, pg_temp` pour éviter les hijacks.

### RLS strategy

- **Pas de `Allow all`** sur les tables sensibles. Toute table porte au minimum une
  policy `_self_read` + une policy `_staff_read` (master_admin / club_admin du club concerné).
- Les écritures cross-tenant (ex un club_admin Paris qui voudrait voir Lyon) sont
  bloquées par join sur `app_user_roles` dans les policies.
- Audit régulier : [docs/hardening/rls-audit-v3.md](hardening/rls-audit-v3.md).

---

## Realtime

Utilisé en V3 pour la session live jury (`/Jury`) :

- Canal `jury_session:<session_id>` — broadcast quand un score est saved
- Canal `results:<edition_id>` — broadcast quand `rsa_finalize_results` finit

```js
// src/hooks/useJurySessionLive.js
const channel = supabase
  .channel(`jury_session:${sessionId}`)
  .on('postgres_changes',
      { event: '*', schema: 'public', table: 'jury_scores',
        filter: `session_id=eq.${sessionId}` },
      onScoreChange)
  .subscribe()
```

Pas de Realtime pour le funnel candidat (overkill, autosave suffit).

---

## Storage buckets

| Bucket | Public ? | Usage | Sécurité |
|--------|----------|-------|----------|
| `dossiers` | privé | Pitch decks V3+, exec summaries | Signed URLs (1h expiry) via RPC |
| `uploads` | **public** (legacy) | Photos jury, decks 2026 | 🟠 À locker en V2.1 (voir USER-ACTIONS § F.1) |
| `public-assets` | public | Logos clubs, hero images | OK public |

Convention path V3 : `editions/{edition_id}/startups/{startup_id}/{kind}/{filename}`.

---

## Auth & rôles

- **Magic-link only** (pas de password, pas d'OAuth en V3 — voir hors-scope blueprint).
- Sign-in : `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`.
- 3 entry points : `/Candidater` (intent=candidate), `/Login` (générique),
  `/DevenirJury` (form public → review master_admin → invite).
- Post-auth routing : `src/lib/platform/postLoginRoute.js` (fonction pure +
  10 cas testés unit). Whitelist stricte `nextParam` contre open-redirect.
- Granularité rôle × club via `app_user_roles` (user_id, role, club_id NULL pour
  global).

Détail : [docs/blueprints/auth-routing-and-personas.md](blueprints/auth-routing-and-personas.md).

---

## Edge Functions

Dans `supabase/functions/` :

| Function | Trigger | Rôle |
|----------|---------|------|
| `send-transactional` | RPC ou côté serveur | Email individuel via Resend (notif submit, claim, jury invite) |
| `send-bulk` | UI Communications | Envoi en masse (remercier non-sélectionnés, annoncer sélectionnés) avec dry-run + audit |
| `invite-user` | UI master_admin | Crée user dans auth + assigne rôle + envoie magic-link |
| `delete-user` | UI master_admin | Soft-delete user + anonymize + audit log |
| `consolidate-jury-pack` | UI club_admin | Génère PDF jury pack (dossiers + briefs) via jspdf côté serveur |

Toutes appellent Supabase avec `SERVICE_ROLE_KEY` côté serveur. Jamais exposé au client.

---

## Observabilité

- **Sentry React** : configuré dans `src/main.jsx`, DSN via `VITE_SENTRY_DSN`.
  Sample rate trace 10%, replay on error 100%, replay session OFF.
- **Supabase logs** : Postgres logs + Edge function logs accessibles via Dashboard
  ou MCP (`get_logs`).
- **Sentry breadcrumbs** : auth events, RPC calls, route changes auto-instrumentés.
- **Audit table** : `admin_audit_log` alimentée par les RPC sensibles (delete_user,
  role_change, finalize_results, manual_override).

---

## Frontend layering

```
src/
  pages/              # 1 fichier = 1 route, auto-registered via pages.config.js
  components/         # UI réutilisable, regroupé par module (rsa/, admin/, jury/...)
  hooks/              # Custom hooks (useCandidature, useJurySessionLive, ...)
  lib/
    supabase.js       # Client unique
    db.js             # Entity wrappers (legacy Base44 API)
    rsa/              # RPC wrappers typés (jury, selection, results)
    platform/         # postLoginRoute, isPlatformHost, transactional
    AuthContext.jsx   # Provider auth + roles + clubMemberships
  utils/              # Helpers purs (format, scoring math)
```

**Règle** : un composant ne fait jamais d'appel Supabase direct. Il consomme un hook
(qui wrap React Query + RPC). Ça facilite mocks tests + tracing Sentry.

---

Pour le détail module par module, lire les blueprints sous `docs/blueprints/`.
