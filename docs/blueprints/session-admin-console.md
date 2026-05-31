# Feature blueprint — Session Admin Console

> **Status.** Brainstorm validé. **Couche DB livrée** (migration `20260531_rsa_session_admin_console.sql`, appliquée + vérifiée le 2026-05-31). UI en attente du mockup. Branche `feat/session-admin-console`.
> **Owner.** Plateforme RSA (`app.rotary-startup.org`).
> **Surfaces touchées.** `SessionsManager` (Club Cockpit), `SessionsTab`
> (Compétition/Master), `LiveTab`, `ResultsTab`, `EmailComposer` / `AudienceSelector`,
> `AdminShell` (deep-link), `editions` + `session_config` (schéma), surface RPC session.
> **Compagnons.**
> - Blueprint sœur : [`./sessions-finale-unification.md`](./sessions-finale-unification.md) — pose `sessions` comme primitive unique et anticipe `rsa_update_session`. **Ce blueprint-ci opérationnalise cette note** et ajoute la console complète par session.
> - Catalogue patterns : [`../design/ui-patterns-catalog-generic.md`](../design/ui-patterns-catalog-generic.md) — §3.2 Pill tabs, §3.3 URL state, §3.4 Back link, §3.5 Selector dropdowns, §4.1 Field contract, §5.5 Status pills, §5.9 Kind-aware session detail (`D-K`), §6.5 3-step typed-confirm, §7.1 Email templates, §8.3 Tab transitions.
> - Email Studio (réutilisé) : [`../../supabase/migrations/20260530_rsa_v2_email_studio.sql`](../../supabase/migrations/20260530_rsa_v2_email_studio.sql).

---

## 1. Postulat

Aujourd'hui, **il n'existe pas de surface unique « administrer CETTE session »**. Les
capacités d'un RSA Admin existent mais sont **éparpillées** et **incomplètes** :

| Capacité | État | Où |
| --- | --- | --- |
| Créer une session | ✅ | `SessionsManager` (Club Cockpit) |
| Lister / agréger | ✅ | `SessionsTab` (Compétition, **read-only**) |
| **Éditer** les champs | ❌ **inexistant** | aucune RPC, aucun bouton — cf. [`SessionsManager.jsx:10-12`](../../src/components/rsa/admin/platform/SessionsManager.jsx#L10-L12) |
| Supprimer | ⚠️ draft-only | bouton « Réinitialiser » (`rsa_reset_session_template`) |
| Jury par session | ✅ | `SessionJurorsList` |
| Sélection startups | ✅ | flow sélection/affectation |
| Dashboard scoring live | ✅ | `LiveTab` / `useLiveGrid` — **mais dans le shell legacy `AdminShell`, pas par session dans la hiérarchie** |
| Emails (info/relance/rappel/deck/résultats) | ⚠️ | Email Studio existe, **pas scopé session** |
| Mini-résultats publics | ✅ | `Resultats.jsx`, `results-public/` |
| Publication finale | ✅ | `usePublishSession` |

Le besoin : **une console de session unique, montée au bon niveau hiérarchique**,
qui rassemble toutes ces opérations — « tout comme RSA Admin », mais par session
et multi-club. Plus combler les 2 vrais trous : **édition** et **emails scopés session**.

---

## 2. Décisions actées (brainstorm)

1. **Portée** — Console unifiée + combler les trous (édition/suppression RPC,
   emails scopés session). On **réutilise** les briques existantes (jury, startups,
   live, résultats publics, publication) sans les re-spécifier.
2. **Topologie de finale** — **configurable par compétition** (`editions.finale_topology`).
   Certaines ont une finale-club + finale fédérée, d'autres une seule finale fédérée.
3. **Politique d'édition** — **draft-only** : tous les champs éditables tant que la
   session est en `draft` ; **gelée** dès le passage `live`. (Conséquence assumée :
   une session live/notée n'est ni éditable ni supprimable via l'UI. Un chemin
   master_admin « forcer la suppression » est **hors-scope** v1 — cf. §11.)
4. **Approche** — **A : `<SessionConsole>` unique scope-aware**, ouverte en cliquant
   une session au niveau qui la possède. (Rejetées : B rétrofit `AdminShell` = double
   navigation + dette ; C onglets par capacité = garde l'éparpillement.)

---

## 3. Modèle data — migration `20260531_rsa_session_admin_console.sql` ✅ appliquée

### 3.1 Topologie de finale (sur `editions`)

```sql
alter table public.editions
  add column if not exists finale_topology text not null default 'federated_only'
  check (finale_topology in ('federated_only', 'club_then_federated'));
```

| Valeur | Sémantique | Finale-club au Club Cockpit ? |
| --- | --- | --- |
| `federated_only` (défaut) | Sessions qualif (globales/club) → **1 finale fédérée** (`club_id=NULL`) | non |
| `club_then_federated` | Chaque club tient sa **finale-club** (`kind='finale'`+`club_id=<club>`) → la **finale fédérée** réunit les champions | oui |

Aligné avec le tableau « Modèle cible » de [`sessions-finale-unification.md §2.1`](./sessions-finale-unification.md) : le `club_id` porte toute la sémantique locale/fédérée ; `finale_topology` ne fait qu'**autoriser** le cas finale-club.

### 3.2 Horaire de session (sur `session_config`)

`session_config` porte déjà `status` + `teams_link` (opérationnel, clé `session_id`).
On y ajoute l'heure début/fin ; `sessions.session_date` (le jour) existe déjà.

```sql
alter table public.session_config
  add column if not exists start_time time,
  add column if not exists end_time   time;
```

### 3.3 Aucune autre table

`sessions.club_id`, `sessions.kind`, jury (`platform_jury_assignments`), scores,
`email_templates`, `email_sends` existent déjà. Pas de nouvelle table.

---

## 4. Surface RPC

Toutes **SECURITY DEFINER**, `set search_path = public`, garde canonique réutilisée
de [`20260529_rsa_v2_extend_rpcs.sql`](../../supabase/migrations/20260529_rsa_v2_extend_rpcs.sql) :

> `has_platform_role('admin')` **OR** `is_club_member(v_club_id,'club_admin')`,
> avec **`club_id NULL` → master_admin only** (finale fédérée). `v_club_id` dérivé de
> `sessions.club_id`.

### 4.1 `rsa_update_session(p_session_id text, p_patch jsonb) returns void` — NOUVEAU

- **Draft-only** : `raise exception 'session_not_draft'` si `session_config.status <> 'draft'`.
- Champs patchables (clés présentes dans `p_patch` uniquement — patch partiel) :
  `name, theme, session_date, start_time, end_time, position, kind, teams_link, notes, club_id`.
  - `name/theme/session_date/position/kind/club_id` → `sessions`.
  - `start_time/end_time/teams_link` → `session_config`.
  - `notes` → selon colonne existante (`sessions.notes` si présente, sinon `session_config`).
- Non patchable : `id` (PK — renommer = supprimer+recréer), `edition_id`.
- Garde : si `p_patch` change `club_id`, re-vérifier le droit sur **les deux** clubs (ancien + nouveau).

### 4.2 `rsa_delete_session(p_session_id text) returns void` — NOUVEAU (généralise le reset)

- Logique **identique** à l'actuel [`rsa_reset_session_template`](../../supabase/migrations/20260527_rsa_module4a_admin.sql#L413) :
  refuse si `status <> 'draft'`, si jurés assignés, si startups affectées ; sinon
  `DELETE session_config` puis `DELETE sessions`.
- `rsa_reset_session_template` **reste en alias** (appelle la nouvelle) le temps de
  migrer les appels UI ; l'UI passe de « Réinitialiser » à **« Supprimer »** (c'est un DELETE).

### 4.3 `rsa_set_finale_topology(p_edition_id text, p_topology text) returns void` — NOUVEAU

- `master_admin` / `competition_admin` **only** (pas de club_admin — c'est une
  décision de compétition). Écrit `editions.finale_topology`. Valide l'enum.

### 4.4 `rsa_resolve_audience(p_type, p_filter)` — 1 seul type ajouté (pas de nouvelle RPC)

**Découverte à l'implémentation** : `session_candidates` et `session_jurys`
**existaient déjà** (M9 Email Studio). Seul **`session_all`** a été ajouté.
`p_filter = { "session_id": "<id>" }` :

| Type | État | Résout |
| --- | --- | --- |
| `session_candidates` | existant | `startups` où `session_id = X` (les pitcheurs) |
| `session_jurys` | existant | jurés assignés à `X` (`platform_jury_assignments`) |
| `session_all` | **ajouté** | union des deux |

Reste sous la garde de rôle existante de la RPC (vérifie le `club_id` de la session
pour l'appelant). Alimente l'`AudienceSelector` de la console.

---

## 5. Architecture composant

Nouveau dossier `src/components/rsa/admin/platform/session-console/`.

### 5.1 `<SessionConsole>` — shell

```
SessionConsole({ sessionId, scope, clubId, editionId })
  scope ∈ { 'club', 'competition' }
```

- **Routé + deep-linkable** (pattern §3.3 URL state) — réutilise le shape URL de
  `AdminShell` : `?scope=club:{eid}/{cid}&session={sid}&ctab=live`. Pas un drawer :
  le dashboard live a besoin de la pleine largeur. Back link vers la liste (§3.4).
- **Header** : nom session + `StatusPill` (§5.5) + horaire + lien Teams + breadcrumb
  `Master ▸ Compétition ▸ Club ▸ Session` (réutilise `HierarchyBreadcrumb`).
- **Sous-onglets** via `CockpitTabs` (Pill tabs §3.2) + transitions `AnimatePresence mode="wait"` (§8.3) :

| Onglet | Contenu | Réutilise |
| --- | --- | --- |
| **Vue / Édition** | Récap + form édition draft-only (`rsa_update_session`) ; bouton **Supprimer** (3-step typed-confirm §6.5 → `rsa_delete_session`) ; contrôles cycle de vie | `useSetSessionLive/Draft`, `useLockSession`, `usePublishSession` |
| **Jury** | Composition + **checklist par juré** (invité ? confirmé ? pack envoyé ?) avec action email par ligne — cf. §12 | `SessionJurorsList` + suivi `platform_jury_assignments` |
| **Startups** | Dossiers affectés + **checklist par startup** (instructions deck envoyées ? deck confirmé/chargé ?) avec action email par ligne — cf. §12 | `useLiveStartupsForSession` + suivi deck (§12) |
| **Live** | Dashboard scoring realtime | `LiveTab` / `useLiveGrid` *(refacto §5.2)* |
| **Résultats** | Publication + lien mini-résultats publics | `ResultsTab` / `usePublishSession` *(refacto §5.2)* |
| **Emails** | Composer pré-scopé session + **« copier tout »** (objet/corps/destinataires) + historique | `EmailComposer` + `AudienceSelector` (audiences `session_*`) + `SendHistory` |

L'onglet **Édition** suit le `Field` contract (§4.1) ; le form est **désactivé +
bandeau explicatif** (§7.2 banner) quand `status <> 'draft'` (gel).

### 5.2 Refacto d'embeddabilité (seul vrai coût de l'approche A)

`LiveTab` et `ResultsTab` reçoivent aujourd'hui l'objet `session` **depuis
`AdminShell`** et dépendent de ses pickers édition/session.

- Les rendre embeddables via une prop **`sessionId`** : résolution interne via
  `useSessionsAdmin(editionId)` / `useSessionConfig(sessionId)` (hooks existants),
  sans dépendre du shell.
- `AdminShell` continue de les monter (back-compat) en passant `session.id`.
- `AudienceSelector` : exposer les types `session_*` quand un `sessionId` de contexte
  est fourni (prop `sessionContext`).

---

## 6. Placement hiérarchique & routing (« au bon endroit »)

```
Master ▸ Compétition (CompetitionEditView)
  └─ onglet Sessions (SessionsTab)
       ├─ Finale fédérée (club_id=NULL)      → SessionConsole scope='competition'
       └─ sessions globales (club_id=NULL)    → SessionConsole scope='competition'
       └─ [par club, read-only] → lien « Ouvrir le cockpit » (inchangé)

Club Cockpit (scope=club:{eid}/{cid})
  └─ onglet Configuration (SetupTab → SessionsManager)
       ├─ sessions du club (club_id=<club>)   → SessionConsole scope='club'
       └─ finale-club (kind=finale,club_id=X) → SessionConsole scope='club'
            (affordance « créer finale-club » visible SSI finale_topology='club_then_federated')
```

- **Globale / finale fédérée** (`club_id=NULL`) → console au niveau **Compétition/Master** :
  `SessionsTab` (aujourd'hui read-only) → ligne cliquable. `FinaleManagement` reste le
  point d'entrée de création de la finale fédérée.
- **Session club / finale-club** (`club_id=<club>`) → console au **Club Cockpit** :
  `SessionsManager` → chaque ligne « Ouvrir la console » (remplace l'actuel « LIVE → »
  qui devient l'onglet Live de la console).
- Navigation SPA uniquement (`navigate`, jamais `window.location` — sinon le legacy
  gate kick l'auth, cf. [`SessionsTab.jsx:338-344`](../../src/components/rsa/admin/platform/master/competition-tabs/SessionsTab.jsx#L338-L344)).

---

## 7. Emails de session

**Infra réutilisée telle quelle** : `email_templates`/`email_sends`, RPC
`rsa_resolve_audience`/`rsa_save_email_template`, edge function `send-bulk`
(dry-run → confirm typé « ENVOYER » au-delà de 50 destinataires), rendu Élysée
bulletproof `<table>` (§7.1). **Aucune infra nouvelle.**

5 **templates seedés** (globaux `club_id=NULL`, clonables/éditables par club) — pas
de hardcode d'envoi :

| # | Template | Audience | Déclencheur typique |
| --- | --- | --- | --- |
| 1 | **Information** | `session_all` | annonce date/horaire/Teams |
| 2 | **Relance** | `session_candidates` | dossier incomplet / non confirmé |
| 3 | **Rappel** | `session_all` | J-x avant la session |
| 4 | **Confirmer le pitch deck** | `session_candidates` | upload/validation du deck |
| 5 | **Résultats** | `session_all` | après publication |

L'onglet Emails monte `EmailComposer` avec l'audience pré-sélectionnée selon le
template choisi ; l'admin ajuste, prévisualise (dry-run), envoie. Historique via
`email_sends` (déjà audité).

---

## 8. Permissions (par onglet, via `usePlatformAuth`)

| Action | Autorisé |
| --- | --- |
| Édition / suppression / cycle de vie / emails | `admin` **ou** `club_admin` du club de la session ; `club_id=NULL` → master_admin only |
| `set_finale_topology` | master_admin / competition_admin |
| Live / Résultats (lecture) | admin / comité / jury (comme aujourd'hui) |

Garde portée **côté RPC** (source d'autorité) **et** masquage UI (confort). Jamais
l'UI seule.

---

## 9. Séquence de build (→ writing-plans)

1. **DB** : migration (3.1 topology + 3.2 horaire) + RPC (4.1 update, 4.2 delete, 4.3 topology) + extension `resolve_audience` (4.4). Appliquée **via MCP Supabase**, `revoke … from public, anon` + `search_path` (hardening).
2. **Refacto** `LiveTab` / `ResultsTab` → embeddables par `sessionId` (§5.2) ; back-compat `AdminShell`.
3. **`SessionConsole` shell** + onglet **Vue/Édition** (update/delete/cycle) + routing/scope/deep-link.
4. **Branchement panneaux** Jury / Startups / Live / Résultats (montage des briques).
5. **Onglet Emails** : audiences `session_*` dans `AudienceSelector` + seed des 5 templates + composer.
6. **Points d'entrée** : `SessionsManager` (club) + `SessionsTab` (compétition) cliquables ; affordance finale-club gated par `finale_topology`.
7. **Hardening + browser-test** : advisors Supabase sur les nouvelles RPC, RLS inchangée (RPC = source d'autorité), parcours e2e (créer → éditer → live → scorer → publier → email résultats).

---

## 10. Patterns UI cités (du catalogue générique)

§3.2 Pill tabs · §3.3 URL state `useSearchParams` · §3.4 Back link · §3.5 Selector
dropdowns · §4.1 `Field` contract · §5.5 Status pills · §5.9 Kind-aware session
detail (`D-K`, base de l'onglet Vue) · §6.5 3-step typed-confirm (suppression) ·
§7.1 Email templates bulletproof · §7.2 Banners (gel draft) · §8.3 Tab transitions.

---

## 11. Hors-scope / risques

- **Forcer la suppression** d'une session live/notée (cascade jury+affectations,
  master_admin) — **hors-scope v1** ; à ajouter si le mur draft-only gêne en pratique.
- **Édition d'une session live** (corriger un horaire / lien Teams après ouverture) —
  **impossible par design** (draft-only). Si ça devient bloquant, exception ciblée
  « champs logistiques » (teams_link/horaire) à rouvrir comme évolution v2.
- **Réordonnancement drag-and-drop** des sessions — hors-scope (édition `position`
  au form suffit en v1).
- **Risque refacto** `LiveTab`/`ResultsTab` : vérifier qu'aucun autre call-site que
  `AdminShell` ne dépend de la signature `session`-object avant de basculer sur `sessionId`.
- **Tracking délivrabilité par destinataire** (ouvertures / rebonds via webhooks Resend)
  — **explicitement hors-scope** (décision produit : « c'est pas du marketing »). Le suivi
  reste au statut métier + à la main (cf. §12). Pas de webhook, pas de table par destinataire.

---

## 12. Addendum — parité RSA Admin par session (validé 2026-05-31)

Demande explicite : reproduire, **par session**, ce que l'OLD RSA Admin faisait. Tout
existait en legacy (`RsaJuryHub`, `DecksTab`, `RsvpTab`) mais sur des tables legacy
(`StartupConfirmation`, `jury_profiles`, `FinaleRsvp`) — **pas** sur le SSOT platform
`startups` / `platform_jury_assignments`. On **ne ressuscite pas** les tables legacy :
on étend le modèle platform.

### 12.1 Confirmation de deck par startup (le gros morceau)
- **Champs** (migration n°2, sur `startups`) : `session_deck_path text` (deck spécifique
  session ; NULL = réutilise `pitch_deck_path` d'inscription), `deck_confirmed_at timestamptz`,
  `deck_instructions_sent_at timestamptz`.
- **Form public à token** : la startup (non loggée) reçoit un lien `/{lang}/confirm-deck?token=…`
  → choix « je garde mon deck d'inscription » (1 clic) **ou** « je charge un deck spécifique
  session » (upload Storage). Edge function valide le token et écrit `deck_confirmed_at` /
  `session_deck_path`. Réutilise le pattern magic-link/token existant.
- Le deck retenu (spécifique sinon inscription) devient **visible par le jury** (§12.3).

### 12.2 Onglets Startups & Jury = checklists par personne (suivi minimal, à la main)
- **Startups** : une ligne par dossier affecté → statut deck (⏳ instructions non envoyées /
  ✉ envoyées / ✓ confirmé inscription / ✓ deck session chargé) + action **« Envoyer / relancer
  la confirmation deck »** par ligne (ou en masse). Statut dérivé des champs §12.1 + `email_sends`.
- **Jury** : une ligne par juré → `invited_at` / `confirmed_at` (colonnes ajoutées à
  `platform_jury_assignments`) + action **« Inviter / relancer »**. 
- **Tracking volontairement minimal** : pas d'ouverture/rebond. « Envoyé » = présent dans un
  `email_sends` de la session ; « retour » = statut métier (deck confirmé / présence). Le reste
  se coche/relance manuellement.

### 12.3 Page jury-facing par session (façon RsaJuryHub)
- Page **read-only** réservée aux jurés d'une session : roster des startups candidates +
  **deck retenu** (session sinon inscription) + executive summary + infos dossier.
- Alimentée par `startups` (session_id) + `platform_jury_assignments` (qui voit quoi).
  Lien depuis l'onglet Jury de la console (« prévisualiser la page jury »).

### 12.4 « Copier tout » dans l'onglet Emails
- Boutons **copier l'objet**, **copier le corps** (markdown), **copier les destinataires**
  (liste d'emails) → envoi manuel possible depuis Gmail/Outlook en repli. Calque le pattern
  de `CommunicationSplit` (compétition) qui n'existe pas encore côté session.

### 12.5 Impact build (s'ajoute à la séquence §9)
- **Migration n°2** : champs deck sur `startups` + `invited_at`/`confirmed_at` sur
  `platform_jury_assignments` + RPC `rsa_confirm_session_deck(token,…)` (ou edge function) +
  `rsa_mark_jury_invited` / `rsa_send_deck_instructions` (flags).
- **Form public** `/confirm-deck` + edge function + bucket Storage deck-session.
- **Checklists** Startups/Jury (UI) + **copier-tout** (UI) + **page jury-facing** (UI).
- Cette extension ≈ **double la part UI** du blueprint initial. Tracking délivrabilité reste
  hors-scope (§11).
