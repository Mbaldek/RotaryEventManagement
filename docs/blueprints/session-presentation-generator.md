# Blueprint — Générateur de présentation & running order de session

> Statut : spec validée (brainstorming 2026-06-01). Approche **B** (3 points d'entrée
> séparés autour d'un ordre de passage persisté unique).
>
> Docs liées : `docs/design/ui-patterns-catalog-generic.md` (patterns cités inline),
> entités `src/lib/rsa/entities/sessions.js`, module emails
> `src/components/rsa/admin/platform/comms/`, edge `supabase/functions/send-transactional`.

## 1. Intention

Au niveau d'une **session** de jury, l'admin club doit pouvoir :

1. **Fixer l'ordre de passage** des startups (running order) — la colonne vertébrale.
2. **Générer un deck HTML autonome** (plein écran, navigation clavier, hors-ligne sur
   vidéoprojecteur) calqué sur les templates `docs/presentation/*.html`.
3. **Envoyer un email par startup** contenant son ordre de passage + horaire estimé.

L'**ordre de passage est l'unique source de vérité** : il est édité à **un seul endroit**
(Préparation), puis consommé en lecture par le deck et par les emails.

Délimitation : pages plateforme `app.rotary-startup.org` uniquement (cf.
`project_design_upgrade_trilogy`). Pitchs/Q&A en anglais (jury international,
cf. `project_rsa_pitch_language`) → le **deck est en anglais**. Les **emails** partent
dans la **langue de préférence de chaque destinataire** (cf. §3).

## 2. Modèle de données

### 2.1 Running order

- **`startups.pitch_order int NULL`** — position de passage dans la session. Scopé
  implicitement par `startups.session_id` (déjà présent). `NULL` = non ordonnée.
- Index partiel : `CREATE INDEX ON startups (session_id, pitch_order) WHERE pitch_order IS NOT NULL;`
- **Horaire estimé : jamais stocké, toujours calculé.**
  `estimated_time(s) = session_config.start_time + (s.pitch_order − 1) × PITCH_SLOT_MINUTES`
  où `PITCH_SLOT_MINUTES = 20` (format RSA : pitch 10-12 min + Q&A 8-10 min,
  cf. `project_rsa_session_format`). Constante exportée, overridable plus tard.

### 2.2 Préférence de langue (transverse)

- **`startups.preferred_lang text NOT NULL DEFAULT 'fr'`**, `CHECK (preferred_lang IN ('fr','en','de'))`.
- **`jury_applications.preferred_lang text NOT NULL DEFAULT 'fr'`**, même contrainte.
- Saisie par le candidat dans son funnel (§4). Utilisée **partout** où un email
  transactionnel cible un destinataire (§6).

### 2.3 Écriture de l'ordre — RPC `SECURITY DEFINER`

```sql
-- rsa_set_session_running_order(p_session_id text, p_ordered_ids uuid[])
-- Réassigne pitch_order = index+1 pour chaque startup de la liste, en une transaction.
-- Garde : appelant master_admin OU club_admin du club de la session. Revoke anon.
-- Valide que tous les ids appartiennent bien à p_session_id (sinon raise).
```

Migration : `supabase/migrations/<ts>_session_running_order.sql`. Appliquée via MCP
Supabase (projet `uaoucznptxmvhhytapso`, cf. `reference_supabase_project` +
`feedback_autonomous_execution`). `search_path` figé + revoke anon sur la RPC
(cf. `project_hardening_rsa`).

## 3. Architecture — vue d'ensemble (approche B)

```
                       ┌──────────────────────────────┐
   Préparation  ─────► │  startups.pitch_order (SSOT)  │ ◄──── édité ICI uniquement
   (Touchpoint 1)      └──────────────┬───────────────┘
                                      │ lecture seule
                        ┌─────────────┴─────────────┐
                        ▼                           ▼
              Deck HTML (Touchpoint 2)     Emails par startup (Touchpoint 3)
              carte Présentation           Email Studio existant
                        │                           │
                        ▼                           ▼
              buildSessionDeckHtml()       send-transactional (loop)
              → Blob → download            → lang = startup.preferred_lang
```

## 4. Touchpoint candidats — préférence de langue

### 4.1 Funnel startup — `StepContact.jsx`
Ajouter un sélecteur « Langue de communication » (FR/EN/DE) à côté de l'email/contact.
Réutiliser le contrôle Select existant (catalog §4.2 « re-use, don't reinvent »).
La valeur alimente `startups.preferred_lang` à la soumission (suivre le chemin de payload
existant du `CandidatureFunnel`).

### 4.2 Funnel jury — `JuryFunnel.jsx`
Même sélecteur, alimente `jury_applications.preferred_lang`. i18n via les fichiers
`jury-funnel/i18n.js`.

## 5. Touchpoint 1 — éditeur de running order (carte **Préparation**)

Remplace le stub `cardPrep` de `SessionShell.jsx`. Composant `RunningOrderEditor`.

- Liste des startups de la session (`startups` where `session_id`), réordonnables.
  **Réordonnancement** : flèches ↑↓ (zéro dépendance) ou drag si un pattern DnD existe
  déjà dans le repo — sinon flèches. A11y AA : boutons focusables, `aria-label` explicites.
- Chaque ligne affiche l'**horaire estimé calculé en live** (`#3 · ~18:40`).
- Champ heure de début → lit/écrit `session_config.start_time`. Champ durée de slot
  (défaut 20). Bouton « Enregistrer l'ordre » → `rsa_set_session_running_order`.
- État vide (catalog §5.6) si aucune startup affectée. Invalide le cache TanStack
  des métriques session après save.

## 6. Touchpoint 2 — générateur de deck (carte **Présentation**)

Remplace le stub `cardPresentation`. Composant `DeckGenerator` + builder pur.

### 6.1 Modèle de deck (prefill)
Construit depuis la session + l'ordre :
- **Splash** : nom de session, thème, date (`session_date`, `session_config.start_time`).
- **Lineup** : startups **ordonnées** par `pitch_order` + fondateur·rice (`contact_person`).
- **Critères** : les 6 critères de scoring de la compétition (config compétition).
- **Jury** : membres via `platform_jury_assignments` de la session.

### 6.2 Formulaire éditorial (ce qui n'est pas en base)
- Texte du prix spécial, taglines des 6 critères (défauts génériques fournis),
  titres d'agenda. **L'ordre est lu seul** ; lien « Régler l'ordre en Préparation ».

### 6.3 Générateur
- `buildSessionDeckHtml(model) → string` : **fonction pure**, template literal modelé sur
  `docs/presentation/session_5_greentech.html`. Base **navy/gold unique** (pas de thème
  couleur par session — YAGNI). **N startups dynamiques** : les paires
  `s-trans-k` / `s-qa-k` et les lignes de lineup sont générées en boucle.
- Échappement HTML strict de toute donnée injectée (`escapeHtml`).
- Sortie : `Blob([html], {type:'text/html'})` → download `session-<slug>.html`.
- Grammaire des slides conservée : `wait → splash → special → agenda → lineup → jury →
  scoring → ready → (trans-k + qa-k)×N → end`.

## 7. Touchpoint 3 — emails par startup (Email Studio existant)

### 7.1 Nouveau type transactionnel
`send-transactional` : ajouter `type: 'session_running_order'`. Rendu Élysée (serif navy/gold,
bulletproof table). Tokens : `{{startup_name}}`, `{{running_order}}` (ordinal localisé),
`{{estimated_time}}`, `{{session_name}}`, `{{session_date}}`. Copy FR/EN/DE.

### 7.2 Déclencheur
Dans l'Email Studio : audience `session_candidates` (existante) → action « Emails ordre de
passage ». **Boucle client-side** sur les startups ordonnées (pattern `selection_decision`),
un appel `send-transactional` par startup avec `lang = startup.preferred_lang` et la data
calculée (ordre + horaire estimé). Garde-fou : refuse/alerte si des startups de la session
n'ont pas de `pitch_order`.

### 7.3 « Partout »
Les autres appels `send-transactional` ciblant un destinataire identifiable passent désormais
`recipient.preferred_lang` au lieu d'une langue globale (selection_decision, jury_assignment,
results_published). Touche légère : le paramètre `lang` existe déjà côté edge.

## 8. Découpage en lots (pour le plan d'implémentation)

1. **Migration** : `pitch_order`, `preferred_lang` ×2, RPC `rsa_set_session_running_order`.
2. **Préférence langue** : `StepContact` + `JuryFunnel` + câblage payload.
3. **RunningOrderEditor** (Préparation) + hook d'écriture.
4. **buildSessionDeckHtml** (pur, testé) + `DeckGenerator` (form + download).
5. **Emails** : type `session_running_order` + déclencheur Email Studio + bascule
   `preferred_lang` sur les emails ciblés existants.

## 9. Tests

- Purs (`node --test`, cf. `reference_test_runner_node_test`) :
  - `buildSessionDeckHtml` — snapshots N=1 / 5 / 8 ; échappement HTML ; ordre respecté.
  - calcul de l'horaire estimé (start_time + (n−1)×slot, formats horaires).
- Migration validée via `get_advisors` après apply (search_path, RLS).

## 10. Hors périmètre (YAGNI)

- Thèmes couleur par session (base navy/gold seule).
- Édition WYSIWYG du deck dans l'app.
- Scoring live / pré-read (restent le `#3` parké, cf. `project_club_cockpit_modes_lot1`).
