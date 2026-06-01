# Blueprint — Jury sans compte + scoring de session (name-pick trust)

> Statut : spec validée (brainstorming 2026-06-01). Construit en **3 lots livrables**
> dans l'ordre A → B → C (chacun shippe). Remplace, pour le flux jury, le modèle
> auth-based (Module 3) par un modèle **sans compte**.
>
> Docs liées : `docs/blueprints/session-presentation-generator.md` (running order, réutilisé
> par le scoring), légère `src/lib/db/rsa-legacy.js` (modèle name-keyed historique),
> `src/components/rsa/jury/` (UI scoring déjà construite : ScoringPanel, CriterionRating).

## 0. Phase scoring — LIVRÉE (2026-06-01)

> Cette section reflète l'implémentation **réelle**. Elle **supersede** les sections
> « LOT B » et « LOT C » plus bas (page publique tokenisée + tables
> `session_jury_scores`/`_drafts`), définitivement **ANNULÉES**. Décisions Mathieu :
> **slug + PIN**, **nouvelle page dédiée** (RsaScore legacy intact), **hub intégré au
> ClubCockpit Pilotage**, et **poids des critères configurables par session**.

**Modèle retenu (FAIS SIMPLE)** : réutiliser le store legacy **name-keyed**
`jury_scores` / `jury_score_drafts` (clé `session_id, jury_name, startup_name`).
`jury_name` = `jury_applications.full_name` (juré approuvé) ; `startup_name` =
`startups.name`. **Aucune nouvelle table de scores.**

**5 briques livrées :**
- **Poids configurables = paramètre de COMPÉTITION** (révision 2026-06-01 : déplacé du
  niveau session → édition). Stockés dans `editions.scoring_weights jsonb` (pct entiers,
  somme=100 ; défaut 20/20/20/20/10/10). Édités dans **CompetitionEditView → onglet
  « Notation »** (`ScoringWeightsEditor`, autosave via `Edition.patch`). Lus depuis
  l'édition partout : contexte public (`rsa_public_score_context`), publish
  (`rsa_publish_session`), grille `LiveTab` et `ResultsTab` (`resolveSessionWeights(edition.scoring_weights)`).
  Les 6 critères + ancrages restent fixes (SSOT `src/lib/rsa/constants.js`). Helpers :
  `DEFAULT_WEIGHTS(_PCT)`, `weightsSumPct`, `isValidWeightsPct`, `resolveSessionWeights`,
  `weightedScore(row, weights?)`. `ScoringPanel`/`CriterionRating`/`ScoreCell` acceptent un
  poids dynamique. ⚠️ `session_config.score_weights` + `rsa_set_session_weights` DÉPRÉCIÉS
  (colonne laissée, RPC supprimé) — ne plus régler les poids au niveau session/live.
- **Accès slug + PIN** — `sessions.score_slug` (unique) + `sessions.score_pin`. RPC admin
  `rsa_rotate_session_access(session_id)` (génère/rotère). RPC admin
  `rsa_set_session_weights(session_id, weights)` (valide somme=100).
- **4 RPC anon gardées slug+PIN** (grant `anon` UNIQUEMENT sur celles-ci ; `search_path`
  figé ; helper interne `rsa_public_score_guard` non exposé) :
  `rsa_public_score_context(slug, pin)` (meta+statut+poids+roster approved+startups
  pitch_order), `rsa_public_my_scores(slug, pin, jury_name)` (reprise),
  `rsa_public_save_draft(...)` + `rsa_public_submit_score(...)` (revalident slug+PIN,
  gate `status='live'`, upsert name-keyed). `jury_score_drafts` ajoutée à
  `supabase_realtime`.
- **Page juré dédiée** `src/pages/Score.jsx` → route `/Score?s=<slug>` (publique, Layout
  passthrough, 100% via RPC anon) : écran PIN → name-pick → `ScoringPanel` Élysée
  (`hideDocuments`), bloc « Règles de notation » conservé, % = poids de session, FR/EN/DE.
- **Grille live réparée** `src/components/rsa/admin/platform/tabs/LiveTab.jsx` : nouveau
  hook `useNameKeyedLiveGrid` (jurés `jury_applications` approved via `rsa_session_jurors`,
  startups `pitch_order`, scores/drafts `jury_scores`/`jury_score_drafts` name-keyed,
  realtime), agrégats pondérés par les poids de session. L'ancien câblage lisait le modèle
  AUTH `platform_jury_*` (jamais alimenté par ce flux → grille vide).
- **Hub Pilotage** `…/club/session/SessionScoringAccess.jsx` (monté dans `SessionShell` +
  `LiveTab`) : bloc « Accès scoring » (lien `/Score?s=` + PIN + copier + régénérer +
  « Envoyer l'invitation aux jurés »). Le réglage des poids n'est PLUS ici (→ compétition).

- **Classement / publish name-keyed** — `rsa_publish_session` rebranché : le CTE de
  classement agrège `jury_scores` (name-keyed) avec les **poids de session**, `startup_id`
  résolu par join `startup_name → startups` (projection finaliste + finale_membership +
  audit inchangés). `ResultsTab` plateforme : preview via `buildRanking(scores, {}, weights)`
  + nouveau hook `useNameKeyedSessionResults`. `buildRanking` accepte un 3ᵉ arg `weights`.

**Tests** : `src/lib/rsa/__tests__/scoringWeights.test.js` + `rankingWeighted.test.js`
(`node --test`, 10/10).

**Validé E2E (2026-06-01)** : flux juré public (PIN → name-pick → scoring → submit) testé
en navigateur ; `rsa_public_score_*` + persistance `jury_scores` name-keyed OK ; PIN
auto-validé à 4 chiffres. Côté admin, `rsa_publish_session` exécuté comme master_admin →
`final_ranking` pondéré par les poids de session (Beta 2.65 > Gamma 2.10 > Alpha 1.40),
projection finaliste + `platform_finale_membership` OK. Seed de test nettoyé.

**Décisions produit** : PIN = **4 chiffres simple** (retenu, pas de rate-limit — barrière
réelle = le slug). Le **lien + PIN se communiquent dans l'email pré-read / invitation Teams**
des jurés (pas d'envoi séparé).

**Comms — LIVRÉE** : nouvel email transactionnel `jury_scoring_invite` (edge
`send-transactional` v6, FR/EN/DE) contenant le lien `/Score?s=<slug>` (construit
serveur avec APP_URL) + le PIN + le lien Teams (si `session_config.teams_link`).
Déclenché depuis `SessionScoringAccess` (bouton « Envoyer l'invitation aux jurés » +
confirmation) ; destinataires = `jury_applications` **approuvés avec email** (via
`rsa_session_jurors`), langue = `preferred_lang` de chaque juré. Autorisation : admin /
master_admin / club_admin du club de la session. `transactional.js` ALLOWED_TYPES étendu.

**Note** : `rsa_publish_session` agrège désormais `jury_scores` name-keyed — les sessions
historiques notées via le modèle auth `platform_jury_scores` ne seraient plus agrégées si
re-publiées (leur snapshot `final_ranking` existant reste intact).

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
| **B'** | **Embarquer la console legacy** `LiveTab`/`DecksTab`/`ResultsTab` dans le Pilotage ClubCockpit, rebranchée sur la session plateforme (startups en ordre de passage + roster de noms approuvés + `jury_scores` legacy name-keyed). Réutilisation, **pas de nouvelle table/token/compte**. | A (roster) |

> **PIVOT 2026-06-01 (décision Mathieu « FAIS SIMPLE ») :** les Lots **B et C tokenisés**
> (page publique slug+PIN, nouvelles tables `session_jury_scores`/`_drafts`) sont **ANNULÉS**.
> La console event existe déjà en legacy (`/RsaAdmin` : SetupTab/DecksTab/LiveTab/ResultsTab,
> gate par clé, scoring `jury_scores` clé par nom = sans compte). On la **réutilise** en
> l'embarquant dans le ClubCockpit Pilotage (Lot B' ci-dessus), alimentée par les données
> plateforme. Les sections « LOT B » et « LOT C » plus bas sont **obsolètes** (conservées
> pour trace, non implémentées).

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
