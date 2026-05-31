# Blueprint — Funnel de candidature juré (par compétition)

> Spec build-ready pour **re-ouvrir l'inscription juré publique**, scopée par compétition,
> sur le modèle du `RsaJuryForm` beta — et les vues admin que ce modèle de données alimente.
> Feature distincte du **scoring** (cf. `module3-jury.md`) et de la **live admin** (cf. `module4-finale-resultats.md`).
> Réf. patterns UI : `docs/design/ui-patterns-catalog-generic.md`. Design : Élysée (NAVY/GOLD/CREAM).

## 0. Renversement de décision (à acter)

`module3-jury.md` §2/§9 actait : *« jurors are admin-provisioned ; the legacy RsaJuryForm.jsx route is gone, no public sign-up »*.
**Cette décision est renversée** par Mathieu (2026-05-30) : un juré doit pouvoir **s'inscrire publiquement à une compétition donnée**, en choisissant **club + sessions + finale** (multi-sélection), exactement comme le `RsaJuryForm` beta. → Action : mettre à jour la note §2/§9 de `module3-jury.md` pour pointer vers ce blueprint (le scoring reste inchangé ; seul l'onboarding redevient public).

## 1. Problème actuel (état des lieux vérifié)

Il existe **deux portes** vers `jury_applications`, incohérentes :

| Porte | Route / form | Soumission | État réel |
|---|---|---|---|
| **Club** (riche) | `/JuryCandidate` | `JuryApplication.apply()` (`entities/jury-applications.js`) → RPC **`rsa_apply_jury`** | ✅ marche, colle à la DB live, gère club + `availability_session_ids[]` + `preferred_themes[]` |
| **Spontanée** (pauvre) | `/DevenirJury` (`JuryApplicationForm.jsx`) | `JuryApplication.create()` (`lib/rsa/jury-applications.js`) → **insert direct** | ❌ **cassée** : insère `expertise`/`motivation`/`availability` (colonnes **inexistantes** en live) + viole `club_id NOT NULL`/`qualite NOT NULL` |

Cause racine : la migration `20260601120000_jury_applications.sql` (qui ajoutait expertise/motivation/availability/rejection_reason/created_at + drop des NOT NULL + policies `club_id IS NULL`) **n'a jamais été appliquée** en base live. La base diverge des fichiers de migration.

**Bug #2 (approbation fantôme)** : `lib/rsa/jury-applications.js#approve()` ne fait qu'`UPDATE status='approved'` — n'octroie ni rôle/membership, ni compte, ni email. Seul le RPC `rsa_approve_jury_application` (porte club) fait le vrai travail (membership `role='jury'` + `platform_jury_profiles` + flag `needs_auth_creation`).

## 2. Décisions verrouillées (Mathieu, 2026-05-30)

1. **Porte unique PAR COMPÉTITION.** On garde le form riche, on tue le doublon cassé. Le form est **scopé à une édition** : 10 compétitions simultanées = 10 entrées de form distinctes, chacune exposant **ses** clubs / **ses** sessions / **sa** finale. Jamais « global ».
2. **Finale = session `kind='finale'`** (SSOT déjà en base ; pas de colonne `is_finale` à créer). Rendue comme une carte spéciale (or, lock plus long).
3. **Auto-lock configurable par compétition** (défauts 3j qualif / 10j finale). L'inscription à une session se verrouille N jours avant `session_date`.
4. **Club obligatoire** côté startup ET côté juré quand l'édition expose des clubs (cf. §5).
5. **Pipeline unifié** apply→approve→**accès + email** pour tous (résout #2 par construction).

## 3. Modèle de données — état + migrations nécessaires

### Existe déjà (live, vérifié via MCP)
- `sessions(id, edition_id, club_id?, name, theme, session_date, position, kind)` — `kind ∈ {qualifying, finale}`.
- `editions(... has_finale, finale_config jsonb, model, status, finale_date ...)`.
- `jury_applications(id, club_id NOT NULL, edition_id?, email, full_name, qualite NOT NULL CHECK, organisation, role_title, bio, photo_path, preferred_themes[], availability_session_ids[], status, applied_at, reviewed_by/at, reviewer_note, approved_user_id, approval_email_sent_at, custom_data)`.
- `platform_jury_profiles(user_id PK, qualite, organisation, role_title, photo_path, bio, auth_linked_at, ...)`.
- RPCs : `rsa_apply_jury(...)`, `rsa_approve_jury_application(id)`, `rsa_reject_jury_application(id, note)`, `rsa_list_jury_applications(club_id, status)`.

### Migrations à appliquer (via MCP Supabase, projet `uaoucznptxmvhhytapso`)
- **M-A. Auto-lock config** : ajouter `editions.jury_lock_days int DEFAULT 3` et `editions.finale_lock_days int DEFAULT 10` (colonnes simples ; alternative = clés dans `finale_config` jsonb, mais colonnes = plus lisibles pour le cockpit). Échéance dérivée côté RPC/front : `session_date - lock_days`.
- **M-B. Anti-doublon par édition** : aujourd'hui l'unicité `rsa_apply_jury` est `ON CONFLICT (club_id, email)`. Cible = **`(edition_id, email)`** (un juré = une candidature par compétition, quel que soit le club). Adapter la contrainte + le RPC.
- **M-C. Lock serveur** : `rsa_apply_jury` doit **rejeter** une session dont l'inscription est fermée (date passée le seuil) — défense serveur en plus du grisé client.
- **M-D. Finale dans le form** : `rsa_apply_jury` accepte déjà `availability_session_ids[]` ; la finale étant une `session kind='finale'`, **aucune colonne séparée** — son id entre dans le même tableau. Le front la rend juste comme une carte distincte.
- **M-E. Pipeline d'approbation** : livrer l'edge function `send-jury-welcome` (création compte auth si `needs_auth_creation` + magic-link + email transactionnel Élysée) appelée après `rsa_approve_jury_application`. Router **toute** approbation par ce chemin.
- **M-F. Nettoyage dette** : supprimer `lib/rsa/jury-applications.js` (porte cassée) + `JuryApplicationForm.jsx` après bascule. Ne PAS appliquer la migration `20260601120000` (colonnes expertise/motivation/availability) — abandonnée au profit du modèle themes/sessions.

## 4. Architecture front — le form unifié

- **Route scopée** : `/DevenirJury?competition=<editionId>` (conserve l'URL publique connue) **ou** route propre `/c/<editionId>/devenir-jury`. `editionId` **toujours** résolu et passé ; si absent → écran de sélection de compétition (liste des éditions `status ∈ {open, sessions}`).
- **Form** (réutilise la structure 4-steps de `JuryCandidate.jsx`, restylée Élysée) :
  1. **Identité** : `full_name`, `email`, `qualite` (select enum), `organisation`.
  2. **Présentation** : `bio` (≤1000), `photo` (upload Storage privé `jury-photos`).
  3. **Club** : sélection **obligatoire** parmi les clubs de l'édition, avec **recommandation** du club pays/proche (cf. §5).
  4. **Disponibilités** : multi-sélection des **cartes session** de l'édition (emoji/thème/couleur/date, cf. pattern visuel Concours v2), **+ carte Grande Finale** (`kind='finale'`). Chaque carte **grisée + 🔒** si l'inscription est lockée (`session_date - lock_days ≤ now`). Validation : ≥ 1 session ou finale.
- **Soumission** : `JuryApplication.apply()` → `rsa_apply_jury` (avec `edition_id` + `availability_session_ids` incluant éventuellement l'id finale).
- **Confirmation** : écran récap (sessions choisies en pastilles + finale), trilingue.
- **i18n** : dictionnaire dans `entities`/composant funnel ; pas de string FR hardcodée.

## 5. Club obligatoire + recommandation (côté startup ET juré)

- **Startup** (`CandidatureFunnel` / `Step1Picker`) : le choix du club devient **bloquant** (un club de la liste, obligatoire) — fini les dossiers `club_id NULL` (ce qui rend le scoping sélection #8 correct de fait). 
- **Recommandation pays/proche** (décision verrouillée : **hint seul, pas de matching**) : afficher un hint « choisissez le club de votre pays ou le plus proche » sous le sélecteur. **Pas** de champ pays candidat, **pas** de tri auto en V1. Choix libre mais **obligatoire**.
- Même hint réutilisé dans le step Club du form juré.

## 6. Vues admin (phase 2) — portées du RsaDashboard beta

> Logique métier conservée, chrome refait en Élysée (tokens `tokens.app.js` : DANGER/WARNING/SUCCESS/GOLD_TEXT ; composants `PageShell`/`StatusPill`/`Eyebrow`/`Field`/`Dropzone`). On **jette** : `fetch` REST direct + clé anon en clair, `alert()`/`confirm()`, inline-styles, dicos `SC/SK/T` dupliqués (→ `constants.js` + i18n centralisé), `photo_base64` en colonne (→ Storage).

- **Workflow 3 temps** : Pool entrant (`status='pending'`) → Validé (`approved`) → **Allocation** (qui juge quoi).
- **Double vue allocation** (toggle) :
  - *Par session* : une carte par session (+ finale), liste des jurés affectés (avatar photo/initiales, nom, qualité·orga, email), bouton **copier-emails**, bloc « ajouter depuis le pool », badge **⚠ min. 3 jurés/session** (règle métier forte).
  - *Par juré* : matrice juré × session, cases cochables inline + ligne de totaux (rouge si <3).
- **Distinction souhaitées vs affectées** : `availability_session_ids` (vœu du juré) vs affectation admin — surfacer l'écart. (Décision §9.2 : ré-utiliser `availability_session_ids` comme vœu + une table/colonne d'affectation, ou `platform_jury_assignments` de module3.)
- **Fiche profil juré** : panneau/drawer Élysée éditable (photo, qualité, orga, email, sessions assignées, statut) + envoyer-email. Pas de page-route dédiée (drawer comme le legacy modal), deep-link optionnel.
- **Liaison module3/module4** : l'affectation alimente `platform_jury_assignments` (module3) et la live admin grid (module4). Ce blueprint **possède** l'application + l'allocation + la fiche profil ; il **réutilise** les tables d'assignation de module3.

## 7. Dummy data (décision #1)

Les anciennes candidatures = data de test. **Purger** `jury_applications` + dossiers startups dummy obsolètes, puis **recréer un jeu propre** : N startups réalistes affiliées à un club (avec `club_id` renseigné, pour valider le nouveau scoping), quelques candidatures juré `pending`/`approved` réparties sur les sessions, pour tester les vues admin. Via MCP Supabase (autonome, cf. memory `feedback_autonomous_execution`).

## 8. Découpage / lots (mode teams)

**Phase 1 — Form + données + pipeline + startup club obligatoire + dummy**
- L1 (DB) : migrations M-A→M-E (lock_days, anti-doublon edition, lock serveur, edge `send-jury-welcome`).
- L2 (form juré) : route scopée édition + form 4-steps Élysée + cartes session/finale + auto-lock client + bascule sur `rsa_apply_jury` ; redirect/kill `/DevenirJury` cassé.
- L3 (startup) : club obligatoire + recommandation pays dans `CandidatureFunnel`.
- L4 (dette) : suppression `lib/rsa/jury-applications.js` + `JuryApplicationForm.jsx` ; reconcile module3 §2/§9.
- L5 (dummy) : purge + reseed via MCP.

**Phase 2 — Vues admin** (après stabilisation phase 1)
- Vue allocation (par session / matrice juré) + fiche profil drawer, branchées sur `platform_jury_assignments`.

## 9. Décisions (verrouillées 2026-05-30)

1. **Recommandation club** : ✅ **hint seul** (« votre pays / le plus proche »), pas de champ pays ni matching auto. Choix obligatoire.
2. **Affectation jury** : ✅ réutiliser `platform_jury_assignments` (module3) comme SSOT des sessions affectées ; `availability_session_ids` = vœu d'inscription.
3. **Approbation** : ✅ edge `send-jury-welcome` crée le compte auth + envoie l'email d'accès Élysée (magic-link).
4. **Lock_days** : ✅ colonnes `editions.jury_lock_days` / `editions.finale_lock_days`.
5. **Phasing** : ✅ Phase 1 **et** 2 livrées dans la même vague.

## 10. Risques

- **Divergence DB↔migrations** : appliquer les migrations sur live avec prudence (vérifier l'état réel avant chaque ALTER ; la migration `20260601120000` est un piège, ne pas l'exécuter).
- **Anti-doublon** : changer `(club_id,email)` → `(edition_id,email)` peut entrer en conflit avec des lignes existantes → purge dummy (§7) d'abord.
- **Renversement module3** : bien re-câbler le grant de rôle `jury` à l'approbation (le scoring module3 lit `app_user_roles[role='jury']`).

## 11. Addendum 2026-05-31 — Métier réel + reframe « jury de la compétition »

Retour Mathieu sur la page `/DevenirJury` (3 points). Tous livrés ; migration `20260531_rsa_jury_role_title.sql` appliquée via MCP (projet `uaoucznptxmvhhytapso`).

1. **Le métier réel devient l'info prioritaire.** Nouvelle colonne **`role_title`** (Fonction/Titre, ex. « Directrice des investissements ») sur `jury_applications` **et** `platform_jury_profiles` (nullable ; obligation côté funnel). Étape Identité réordonnée : `full_name`, `email`, **groupe « Votre métier » → `role_title` (requis) + `organisation` (désormais requise)**, puis `qualite` (conservée mais reléguée en classificateur secondaire, toujours requise — décision Mathieu « garder, secondaire, requis »).
   - RPC : `rsa_apply_jury` **+`p_role_title`** (DROP+CREATE, l'arité passe 10→11 ; rate-limit + lock serveur préservés). `rsa_approve_jury_application` reporte `role_title` dans `platform_jury_profiles`. `rsa_create_jury_profile` **+`p_role_title`** (DROP+CREATE 5→6) pour la saisie admin directe.
2. **Présentation = présentation, pas justification.** Le ton de l'étape bio est reformulé : le juré **se présente pour partage aux startups** qu'il évaluera — ce n'est **pas** un dossier de sélection à destination des organisateurs. Copie FR/EN/DE mise à jour (`step2Subtitle`, `bio` → « Présentation », `bioHelp`, `photoHelp`). Bio reste facultative.
3. **Jury de la COMPÉTITION, pas du club.** Le juré rejoint le jury de l'édition (déjà scopé ainsi en base : `edition_clubs` + `sessions(club_id, edition_id)` + finale unique → 2 clubs peuvent co-organiser une compétition avec sessions+jury communs). Il **déclare simplement son club de rattachement** (champ `club_id` inchangé, toujours requis). Copie reformulée (`step3Subtitle`, `club` → « Votre club Rotary », `clubHint`, `errClubRequired`). **Jurés externes (non-Rotariens) = exception** saisie directement par l'admin (`AddJurorModal` / `rsa_create_jury_profile`), hors funnel — d'où club requis sans échappatoire.

**Propagation affichage** (le métier réel surface partout) : `JuryProfileDrawer` (subline `role_title · organisation`, qualité en tag secondaire), `JuryApplicationsTab` (carte de revue : métier en tête, qualité en secondaire), `AddJurorModal` (champ Fonction/Titre en modes create+invite, label pool picker), `useClubJuryPool` (select +`role_title`). i18n : `jury-funnel/i18n.js`, `master/i18n/session-jury.js` (`formRoleTitle`).
