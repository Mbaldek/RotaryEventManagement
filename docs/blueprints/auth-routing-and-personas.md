# Blueprint — Auth routing & personas (Mai 2026)

> **Statut** : à implémenter (mode teams, 3 chantiers // + 1 chantier suite).
> **Plan détaillé** : `C:\Users\mathi\.claude\plans\quiet-swimming-wreath.md`
> **Mémoires liées** : [[project_rsa_platform_rebuild]], [[project_rsa_v25_user_management]], [[project_rsa_legacy_auth_gate]], [[project_rsa_v2_multiclub]]

## Problème

Aujourd'hui sur `app.rotary-startup.org`:

- **Magic link → tout le monde atterrit sur `/MonDossier`** (l'espace startup). Un master_admin, un jury, un comité y arrivent sur une page vide pour eux.
- **Funnel candidature générique** : assume *une* édition active + club implicite (`paris`). En V2 multiclub (2027+), candidat n'a aucune vue sur la compétition à laquelle il candidate avant de cliquer « Commencer ».
- **Aucune porte d'entrée publique pour devenir jury** — persona absent côté UX.
- **Aucun flow d'invitation contextualisé** — un master_admin doit éditer manuellement `app_user_roles` en SQL pour inviter un jury.

## Personas & portes d'entrée

La landing publique de la plateforme expose **3 CTA** :

```
┌─────────────────────────────────────────────────────────┐
│                  Landing rotary-startup                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   ┌───────────┐    ┌───────────┐    ┌───────────────┐  │
│   │ Candidater│    │ Se        │    │ Devenir jury  │  │
│   │ au        │    │ connecter │    │               │  │
│   │ concours  │    │           │    │               │  │
│   └─────┬─────┘    └─────┬─────┘    └───────┬───────┘  │
│         │                │                   │          │
└─────────┼────────────────┼───────────────────┼──────────┘
          │                │                   │
          ▼                ▼                   ▼
    /Candidater       /Login            /DevenirJury
    (public)          (magic link)      (form public)
          │                │                   │
   choix édition+club      │           submit → email
          │                │           → review master_admin
          ▼                ▼                   │
    /Login?intent=         │                   ▼
    candidate              │           magic link de bienvenue
    &edition&club          │                   │
          │                │                   ▼
          └─────► magic link ─────► computeLandingRoute()
                                    │
                ┌───────────────────┼────────────────────┐
                ▼          ▼        ▼         ▼          ▼
          /MonDossier  /Selection /Jury   /Admin    /Welcome
          (candidat)   (comité)   (jury)  (admin)   (post-invite)
```

## Logique de routage post-auth

Fonction pure `src/lib/platform/postLoginRoute.js` :

```
computeLandingRoute({ roles, clubMemberships, hasDossier, nextParam, intent, editionId, clubId })

1. nextParam ∈ whitelist                       → nextParam
2. intent === 'candidate'                      → /MonDossier?edition&club
3. intent === 'jury-onboard'                   → /Welcome?role=jury&edition
4. roles.includes('master_admin')              → /Admin
5. clubMemberships.some(role=='club_admin')    → /Admin?scope=club:<first>
6. roles.includes('admin')                     → /Admin
7. comite (global ou club)                     → /Selection
8. jury (global ou club)                       → /Jury
9. hasDossier                                  → /MonDossier
10. fallback (candidat sans dossier)           → /MonDossier (picker)
```

**Sécurité** : la frontière reste serveur (RLS + RPC SECURITY DEFINER). Le routage est UX. Whitelist stricte du `nextParam` pour éviter open-redirect.

## Chantiers (mode teams — agents //)

| # | Périmètre | Fichiers principaux | Agent |
|---|---|---|---|
| **1** | Magic link → routage par rôle | `postLoginRoute.js` (NEW), `Login.jsx`, `MagicLinkLogin.jsx` | **A** |
| **2** | Candidature contextualisée (édition + club exposés *avant* funnel) | `Candidater.jsx` (NEW), `OpenCompetitions.jsx` (NEW), `MonDossier.jsx`, `entities.js`, `useCandidature.js`, `CandidatureFunnel.jsx` (eyebrow) | **B** |
| **3** | Form inscription jury + review admin | `DevenirJury.jsx` (NEW), `JuryApplicationForm.jsx` (NEW), `JuryApplicationsPanel.jsx` (NEW), migration `jury_applications.sql`, `lib/rsa/jury-applications.js` (NEW — pas dans entities.js pour éviter conflit) | **C** |
| **4** | TopNav switcher multi-rôle + `/Welcome` + invites depuis Admin | `TopNav.jsx`, `Welcome.jsx` (NEW), `InviteMemberDrawer.jsx` (NEW), `transactional.js` | **Synthèse (moi)** post-A/B/C |

**Périmètres disjoints** : aucun fichier partagé entre A/B/C. `entities.js` est touché uniquement par B ; C utilise un fichier dédié `lib/rsa/jury-applications.js`.

## Schéma DB (nouveau — chantier 3)

```sql
create table jury_applications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  edition_id uuid references editions(id),
  club_id text references clubs(id),       -- préférence optionnelle
  expertise jsonb,                          -- ["fintech","saas","health",...]
  motivation text,
  availability text,
  status text not null default 'pending',   -- pending|approved|rejected
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz default now()
);

-- RLS : insert public (form ouvert), select/update master_admin only
alter table jury_applications enable row level security;
create policy ja_public_insert on jury_applications for insert to anon, authenticated with check (true);
create policy ja_master_select on jury_applications for select using (has_platform_role('master_admin'));
create policy ja_master_update on jury_applications for update using (has_platform_role('master_admin'));
```

## Vérification (6 scénarios)

1. **Master admin** : `/Login` → email → magic link → `/Admin` directement.
2. **Jury seul** : `/Login` → magic link → `/Jury`.
3. **Candidat avec contexte** : `/Candidater` → carte « RSA 2027 · Paris Étoile » → `/Login?intent=candidate&edition=2027&club=paris-etoile` → magic link → `/MonDossier?edition=2027&club=paris-etoile` → brouillon créé direct, sans picker.
4. **Candidat sans contexte** (fallback) : `/Login` direct → `/MonDossier` → picker édition + club → funnel.
5. **Inscription jury** : `/DevenirJury` → submit → master_admin approve depuis `/Admin` → email magic link → `/Welcome?role=jury` → `/Jury`.
6. **Invite directe** : master_admin `/Admin` → « Inviter jury » → user reçoit email → magic link → `/Welcome` → `/Jury`.

Tests automatisés : unit `postLoginRoute.test.js` (10 cas + open-redirect) + `npm run lint && npm run build`.

## Risques & garde-fous

- **Open-redirect** via `?next=` → whitelist stricte des paths autorisés.
- **Race au login** : `Login.jsx` doit attendre `loading=false` ET `roles` chargés avant `Navigate` (sinon flash sur mauvaise route). Watchdog 4s existant comme filet (`auth.jsx:73-80`).
- **`hasDossier` pas chargé au moment du routage** : état « Connexion en cours… » plutôt que router prématurément.
- **RLS `jury_applications`** : insert public mais select/update master_admin only. XSS dans `motivation` → render text-only.
- **Rate-limit invites** : edge function `send-transactional` doit throttle (un master_admin compromis ne doit pas pouvoir spammer).

## Ordre d'exécution

```
Phase 1 (// agents A+B+C)  →  Phase 2 (synthèse moi : TopNav + Welcome + Invites)  →  Phase 3 (polish landing 3 CTA + doc deepsolve)
```

## Hors-scope (différé)

- Auth providers OAuth (Google, LinkedIn) — magic link suffit.
- Auto-promotion candidat → jury — manuel via cockpit OK pour V2.
- Refonte éditoriale landing — reste séparée ([[project_redesign_elysee]]).
