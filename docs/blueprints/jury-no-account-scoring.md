# Blueprint — Jury sans compte + scoring de session (name-pick trust)

> Statut : spec validée (brainstorming 2026-06-01). Construit en **3 lots livrables**
> dans l'ordre A → B → C (chacun shippe). Remplace, pour le flux jury, le modèle
> auth-based (Module 3) par un modèle **sans compte**.
>
> Docs liées : `docs/blueprints/session-presentation-generator.md` (running order, réutilisé
> par le scoring), légère `src/lib/db/rsa-legacy.js` (modèle name-keyed historique),
> `src/components/rsa/jury/` (UI scoring déjà construite : ScoringPanel, CriterionRating).

## 1. Intention & principe

Un **juré n'a PAS de compte** dans l'app — zéro valeur, friction UX. Un juré = **une ligne
`jury_applications`** (nom, qualité, email, sessions choisies via `availability_session_ids`,
`status`). Il accède à une **page de scoring publique sans login**, choisit **son nom** dans
la liste des jurés de la session, et score les startups. **Confiance assumée** (contexte
Rotary) : la sécu d'accès est un **slug d'URL non-devinable + un PIN** par session, pas un
compte.

On **réutilise l'UI de scoring déjà construite** (Module 3 : `ScoringPanel`, `CriterionRating`,
6 critères 0-5, autosave) en **rebranchant l'identité** : `jury_user_id` (auth) →
`jury_application_id` (nom choisi). On **abandonne pour ce flux** `platform_jury_assignments`,
l'edge `invite-user`, et tout email/compte automatique.

Délimitation : plateforme `app.rotary-startup.org`. Pitchs/Q&A en anglais ; **interface jury/admin
FR/EN/DE**. Le Module 3 auth existant (`platform_jury_scores`) reste en place mais n'est plus
le chemin utilisé.

## 2. Découpage en lots

| Lot | Contenu | Dépend de |
|-----|---------|-----------|
| **A** | Jury sans compte (approbation = statut), composition session depuis `jury_applications`, 4 fixes UX | — |
| **B** | Page scoring publique (slug+PIN, name-pick, sans login), tables scores name-keyed | A (liste des noms) |
| **C** | Vue live / résultats admin (agrégation + classement, temps réel) | B (les scores) |

Chaque lot = son propre plan d'implémentation (writing-plans), construit après le précédent.

---

## LOT A — Jury sans compte + composition + fixes UX

### A.1 Modèle d'approbation (découplage compte/email)
- `rsa_approve_jury_application` **simplifié** : flip `jury_applications.status` `pending`→`approved`
  (et un `rsa_unapprove` symétrique). **Plus aucune** création de compte auth, **plus aucun**
  appel `invite-user`, **plus aucun** email. La fonction ne crée plus `platform_jury_assignments`.
- `JuryApplication.approve()` (`src/lib/rsa/entities/jury-applications.js`) ne fait plus que
  l'RPC (supprimer les étapes 2/3 invite-user + re-approve). Robuste : l'affectation ne dépend
  plus de rien d'externe.
- **Validation globale** : `approved` ⇒ le juré est confirmé pour **toutes** ses
  `availability_session_ids`.

### A.2 Composition d'une session (source = `jury_applications`)
- `SessionJurorsList` + `useSessionJurors` (`src/components/rsa/admin/platform/club/jury/`)
  **rebranchés** : lire `jury_applications` où `:session_id = ANY(availability_session_ids)`
  (via une RPC `rsa_session_jurors(p_session_id)` SECURITY DEFINER club-scoped), scindé :
  - **Affectés** = `status='approved'`
  - **En attente** = `status='pending'`
- Actions par ligne : sur « En attente » → **Approuver** (rapide) / **voir** (drawer profil) ;
  sur « Affectés » → **retirer** (repasse `pending` ou un statut `rejected`, à préciser : on
  utilise `rejected`).
- **« Ajouter un juré » manuel** : crée une `jury_application` `approved` (nom + qualité +
  `availability_session_ids=[session]`) via une RPC `rsa_add_manual_juror`. Modèle uniforme.

### A.3 Fixes UX (maquette validée)
1. **ClubCockpit** : déplacer le toggle Préparation/Pilotage **sous** le sélecteur compétition
   (`src/components/rsa/admin/platform/club/ClubCockpit.jsx`, bloc ~227-258 → après ~303).
2. **SessionsManager** (`src/components/rsa/admin/platform/SessionsManager.jsx`) : liste en
   **cartes espacées** (bord + ombre légère + gap), fini le `divide-y` plat. **LIVE→ retiré**
   de Préparation (il appartient à Pilotage). **Reset** déplacé dans un dépliant
   « Configurer ▾ » par carte (discret, destructif).
3. **Composition** : groupe « En attente » par session (A.2).

### A.4 Tests Lot A
- Pur : résolution composition (split affectés/en attente depuis `availability_session_ids`).
- Migrations via MCP + advisors.

---

## LOT B — Page scoring publique (name-pick, sans login)

### B.1 Accès : slug + PIN par session
- Deux nouvelles colonnes sur `sessions` : `score_slug text unique` (aléatoire non-devinable,
  ex. 10 chars base62) et `score_pin text` (4-6 chars). Générés à la demande (RPC
  `rsa_rotate_session_access(p_session_id)`, admin), rotables.
- **Affichés dans la vue Pilotage** de la session (bloc « Accès scoring » avec copier le lien +
  le PIN). Communiqués aux jurés **par email manuel** (via l'Email Studio / comms — **pas
  d'auto-envoi**).
- **Route publique** `/s/:slug` **hors gate auth** (bypass à la manière de `isPlatformHost`,
  cf. `project_rsa_legacy_auth_gate` — à confirmer au build : allowlist de routes publiques).
- Flux page : `/s/:slug` → écran PIN → **choisir son nom** (jurés `approved` de la session) →
  liste des **startups dans l'ordre de passage** (`pitch_order`) → `ScoringPanel` par startup.

### B.2 Données scores (name-keyed, confiance)
- Nouvelles tables :
  - `session_jury_scores` : clé `(session_id, jury_application_id, startup_id)`, 6 colonnes
    `score_* int 0..5` (calque `platform_jury_scores`), `comment text`, `submitted_at`,
    `updated_at`.
  - `session_jury_score_drafts` : même clé, autosave reprise multi-device.
- **Accès 100 % via RPC SECURITY DEFINER gardées par slug (+ PIN en écriture)** — PAS de RLS
  permissive anon, PAS d'accès direct anon aux tables :
  - `rsa_score_context(p_slug, p_pin)` → roster jurés `approved` + startups ordonnés de la
    session (lecture, après check slug+pin).
  - `rsa_score_submit(p_slug, p_pin, p_jury_application_id, p_startup_id, scores…)` et
    `rsa_score_draft(...)` → **revalident slug+PIN côté serveur** avant upsert. Le PIN n'est
    donc jamais une simple barrière client.
  - Tables : RLS = aucun accès anon direct (lecture/écriture only via les RPC ci-dessus) ;
    lecture admin/comité directe pour le Lot C. Tradeoff confiance = quiconque a slug+PIN peut
    choisir n'importe quel nom (pas d'isolation entre jurés) — assumé.

### B.3 Réutilisation UI
- `ScoringPanel`, `CriterionRating`, `CRITERIA`/`SCORE_FIELDS`/`weightedScore`/`MAX_WEIGHTED`
  (`src/lib/rsa/constants.js`) réutilisés ; identité = `jury_application_id` au lieu de
  `jury_user_id`. Nouveau shell de page publique (pick-name + liste startups + panneau).

### B.4 Tests Lot B
- Pur : forme du payload de score, validation 6 critères 0..5, mapping startups ordonnés.
- Browser : flux complet slug→PIN→nom→score sur un environnement de test.

---

## LOT C — Vue live / résultats admin

### C.1 Agrégation
- Par startup d'une session : moyenne pondérée (`weightedScore`), nb de jurés ayant soumis,
  classement. RPC `rsa_session_results(p_session_id)` (lecture admin/comité) agrégeant
  `session_jury_scores`.
- **Temps réel** : Realtime sur `session_jury_scores` (ajouter la table à la publication
  `supabase_realtime` — cf. `project_realtime_publication_gap`). Rafraîchit le classement
  pendant la session.

### C.2 Surface
- Affichée dans la session (Pilotage), à côté du running order / deck (réutilise le pattern
  `ResultsView` de `src/components/rsa/jury/`). Vue admin uniquement (les jurés ne voient pas
  les scores des autres).

### C.3 Tests Lot C
- Pur : agrégation (moyennes pondérées, classement, gestion des scores partiels).

---

## 3. Modèle de données (récap)

- **Réutilisé** : `jury_applications` (`status` = SSOT validation ; `availability_session_ids`
  = lien session), `sessions`/`session_config`, `startups.pitch_order` (running order, Lot B).
- **Nouveau** : `session_jury_scores`, `session_jury_score_drafts`, colonnes
  `sessions.score_slug` + `sessions.score_pin`.
- **Déprécié pour ce flux** (laissé en place, données intactes, risque nul) :
  `platform_jury_assignments`, edge `invite-user` (compte/email), `platform_jury_scores`
  (Module 3 auth).

## 4. Sécurité
- Pas de compte = pas d'auth pour le scoring. Barrière = **slug non-devinable + PIN**, revalidé
  côté serveur dans **chaque** RPC de scoring (lecture ET écriture). Tables scores : aucun accès
  anon direct (RLS deny), tout passe par les RPC SECURITY DEFINER (§B.2). Migrations :
  `search_path` figé ; `grant execute` à `anon` **uniquement** sur les RPC de scoring
  (scopées slug+PIN), revoke anon partout ailleurs.

## 5. Hors périmètre (YAGNI)
- Tokens cryptographiques par juré / isolation des scores entre jurés.
- Refonte du Module 3 auth (laissé tel quel).
- Pré-read documents sur la page jury (peut venir après).
- Anonymisation / double-aveugle du scoring.
