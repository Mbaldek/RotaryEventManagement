# Blueprint — Club Cockpit : modes Préparation / Pilotage + bloc dashboard sessions

> Statut : **spec validée (Lot 1)** · 2026-06-01 · branche `feat/session-admin-console`
> Patterns réutilisés : voir `docs/design/ui-patterns-catalog-generic.md`
> (KPI rail, GoldRuleSection, StatusPill, CockpitTabs, L-Numbered-Hairline).

## 1. Problème

Le Club Cockpit empile aujourd'hui **9 onglets plats** ([club/i18n.js `TAB_IDS`](../../src/components/rsa/admin/platform/club/i18n.js)) :
`Configuration · En direct · Résultats · Équipe · Candidatures jury · Règles · Prix · Analytics · Communications`.

Trois douleurs, un seul fond :

1. **Configuration est en tête** alors qu'une fois la compétition **live**, la config n'a plus d'intérêt — les sessions deviennent du **suivi / pilotage**, pas de la configuration.
2. **Le format onglet + liste plate n'est pas adapté au LIVE.** Il manque un bloc « dashboarding / pilotage » en haut, façon *Vue d'ensemble* du Master Cockpit ([master/OverviewPanel.jsx](../../src/components/rsa/admin/platform/master/OverviewPanel.jsx)).
3. **On ne peut pas « entrer » dans une session.** L'onglet Configuration ([SetupTab → SessionsManager](../../src/components/rsa/admin/platform/SessionsManager.jsx)) n'est qu'une liste : le bouton `LIVE →` bascule juste sur l'onglet Live. Aucune vue détail ne regroupe startups, prep, jury, scoring, présentation, pré-read.

**Insight unificateur (Mathieu) :** il y a **toujours deux modes — Configuration et Gestion — et là tout est mixé.** La correction n'est pas de réordonner un onglet : c'est de faire du **mode** l'axe de premier niveau du cockpit.

## 2. Périmètre

### Lot 1 (cette spec)
- **#1** Séparation des modes **Préparation / Pilotage** (le reorder devient un regroupement par mode).
- **#2** Bloc **Pilotage** : header éditorial + KPI rail + **timeline des sessions** avec statut, compteurs et bouton **Ouvrir**.
- **Coquille Session** : une vue détail de session existe et sert de socle au Lot 2, mais reste une **coquille** (header + cartes-raccourcis vers l'existant). Pas de fausse promesse.

### Hors Lot 1 → spec suivante `docs/blueprints/session-console.md` (#3)
Les 6 panneaux de la session console : **startups**, **checklist de préparation**, **jury / sélection**, **scoring live**, **builder de présentation** (dépend d'un template design fourni par Mathieu), **pack pré-read decks consolidé** (lien jury). Chaque carte `·#3·` de la coquille est un stub « bientôt ».

## 3. Architecture

### 3.1 Axe de mode (premier niveau)

`ClubCockpit` gagne un état `mode ∈ { prep, pilotage }` persisté en URL (`?mode=`), à côté de `tab`, `edition`, `session`.

- **Défaut intelligent** : `edition?.status === 'open'` → `pilotage` ; sinon `prep`. Au mount, si `?mode=` absent, on dérive depuis le statut de l'édition active.
- Le **mode switch** (segmented control, 2 segments, soulignage or sur l'actif) se place **sous** le `ClubStatusStrip`, **au-dessus** de la filter row.
- Changer de mode **reset `tab`** vers le 1er onglet du mode (et conserve `edition`).

### 3.2 Regroupement des onglets par mode

Remplacer le `TAB_IDS` plat par deux listes dans [club/i18n.js](../../src/components/rsa/admin/platform/club/i18n.js) :

```
PREP_TABS     = ['setup', 'team', 'rules', 'prizes', 'jury_applications']
PILOTAGE_TABS = ['pilotage', 'live', 'results', 'analytics', 'comms']
```

- `setup` reste **SessionsManager** (création / reset des sessions en draft) — vit désormais sous l'onglet **Sessions** du mode Préparation. Label `setup` → renommé « Sessions » côté Préparation (au lieu de « Configuration »).
- `pilotage` est un **nouvel onglet** (landing par défaut du mode Pilotage).
- Les composants des autres onglets (`LiveTab`, `ResultsTab`, `TeamTab`, `RulesTab`, `PrizesList`, `AnalyticsPanel`, `EmailStudio`, `JuryApplicationsTab`) sont **inchangés** ; seul leur regroupement bouge.
- La **filter row session picker** (aujourd'hui visible pour `live`/`results`) reste, scoping inchangé.

### 3.3 Nouveau composant — `PilotageOverview.jsx`

Chemin : `src/components/rsa/admin/platform/club/tabs/PilotageOverview.jsx`.

Landing du mode Pilotage. Layout 2 colonnes (réutilise les patterns d'`OverviewPanel`) :

- **Header `GoldRuleSection`** : eyebrow « Pilotage » + titre Playfair « Vue d'ensemble des sessions » + phrase de pouls (« 1 session en direct · 2 à venir · N startups en lice »).
- **Colonne gauche — Timeline des sessions** : une ligne par session (ordonnée par `position`), pattern L-Numbered-Hairline :
  - pastille position · nom + `kind` · `StatusPill(status, kind='jury')`
  - `session_date` · `N startups` · `K jurés`
  - **indice de progression** : `scoring x/y` si `live` (best-effort, cf. §4), sinon rien
  - bouton **`Ouvrir →`** → `setSession(s.id)` (reste en mode Pilotage, monte la coquille).
- **Colonne droite — KPI rail collant** (`KpiRail`) : SESSIONS · EN DIRECT · BROUILLON · PUBLIÉES · STARTUPS · JURÉS ASSIGNÉS · CANDIDATURES.

### 3.4 Nouveau composant — `SessionShell.jsx`

Chemin : `src/components/rsa/admin/platform/club/session/SessionShell.jsx`.

Rendu par `ClubCockpit` quand `mode === 'pilotage'` **et** `?session=` est défini (la coquille **remplace** `PilotageOverview` dans le panel, pas de route séparée — cohérent avec le mount in-place existant).

- **Header** : `← Retour au pilotage` (clear `?session=`) · eyebrow `SESSION {position} · {kind}` · `StatusPill` · thème · date · plage horaire (`session_config.start_time/end_time`) · lien Teams.
- **Grille de 6 cartes** (3×2) :
  | Carte | Lot 1 | Action |
  |---|---|---|
  | Startups | `·#3·` stub « bientôt » + count | — |
  | Jury | **actif** | « Voir équipe jury » → deep-link |
  | Scoring live | **actif** | « Ouvrir En direct » → `tab=live&session=` |
  | Préparation | `·#3·` stub | — |
  | Présentation | `·#3·` stub (template à venir) | — |
  | Pré-read decks | `·#3·` stub | — |
  - Pied : `Résultats de la session →` → `tab=results&session=`.
- Les deep-links restent **dans le cockpit** (changent `tab`+`session`, sortent de la coquille vers l'écran existant).

## 4. Données (contrat + dégradation)

Aucune migration SQL. Tout est déjà requêtable :

| Donnée | Source | Dispo |
|---|---|---|
| Sessions + `config.status` | `useClubSessions` | ✓ |
| draft/live/published counts | dérivé client (cf. `ClubStatusStrip`) | ✓ |
| Startups total (club) | `useClubStartupsSummary` | ✓ |
| **Startups / session** | `startups` filtré `sessionIdIn` ([startups.js](../../src/lib/rsa/entities/startups.js)) | ✓ |
| Candidatures (club) | `useClubStartupsSummary.__total__` | ✓ |
| Jurés uniques (club) | `useClubJuryAssignmentsCount` | ✓ |
| **Jurés / session** | `platform_jury_assignments` filtré `session_id` | ✓ |
| **Scoring x/y / session** | `selection_reviews` (entité [selection.js](../../src/lib/rsa/entities/selection.js)) | best-effort |
| Prep x/y / session | *aucun modèle* | ✗ → **Lot 2 (#3)** |

**Règle de dégradation :** la timeline affiche ce qui est disponible. Un compteur indisponible s'affiche `—` (jamais de fausse donnée). `scoring x/y` n'apparaît que s'il est calculable au scope club ; sinon on ne montre que le `StatusPill`. `prep x/y` est **retiré** du Lot 1.

Nouveau hook agrégé `useClubSessionMetrics(editionId, clubId)` : une requête par dimension (`startups` group by `session_id`, `platform_jury_assignments` group by `session_id`), mappée en `{ [sessionId]: { startups, jurors, scoredX, scoredY } }`. Réutilise les `CLUB_KEYS` existants + une nouvelle clé `sessionMetrics(eid, cid)`.

## 5. Fichiers touchés

| Fichier | Changement |
|---|---|
| [ClubCockpit.jsx](../../src/components/rsa/admin/platform/club/ClubCockpit.jsx) | état `?mode=` + défaut selon `edition.status` ; mode switch ; rend `PREP_TABS`/`PILOTAGE_TABS` selon le mode ; monte `PilotageOverview` / `SessionShell` sur l'onglet `pilotage` |
| [club/i18n.js](../../src/components/rsa/admin/platform/club/i18n.js) | `PREP_TABS` / `PILOTAGE_TABS` (remplacent `TAB_IDS`) ; labels mode + onglet `pilotage` ; label Préparation « Sessions » ; libellés coquille (FR/EN/DE) |
| `PilotageOverview.jsx` *(nouveau)* | header + KPI rail + timeline sessions |
| `SessionShell.jsx` *(nouveau)* | coquille session : header + 6 cartes (3 actives, 3 stubs) |
| [useClub.js](../../src/components/rsa/admin/platform/club/useClub.js) | hook `useClubSessionMetrics` + clé `sessionMetrics` |
| [SessionsManager.jsx](../../src/components/rsa/admin/platform/SessionsManager.jsx) | **inchangé** (vit sous l'onglet Sessions du mode Préparation) |

## 6. UX flow

```
Cockpit Club
 ├─ header éditorial + ClubStatusStrip                    (inchangés)
 ├─ [ ⌗ Préparation | ◎ Pilotage ]   ← mode switch (URL ?mode=)
 ├─ filter row (Compétition ▾ · [Session ▾ si live/results])
 │
 ├─ mode = PRÉPARATION
 │    onglets: Sessions · Équipe · Règles · Prix · Candidatures jury
 │    (Sessions = SessionsManager : créer/reset draft)
 │
 └─ mode = PILOTAGE
      onglets: Vue d'ensemble · En direct · Résultats · Analytics · Comms
      ├─ Vue d'ensemble (défaut) = PilotageOverview
      │     KPI rail + timeline sessions → [Ouvrir →]
      └─ ?session= défini → SessionShell (coquille)
            ← Retour · header · 6 cartes (Jury/Scoring/Résultats deep-link ; 3 stubs #3)
```

## 7. Non-objectifs (Lot 1)

- Aucun panneau réel de la session console (#3) — uniquement des stubs.
- Aucune transition de statut draft→live→published ajoutée ici (le bouton « LIVE » reste géré côté RPC existant ; son activation UI relève de #3).
- Aucune migration SQL, aucun changement RLS.
- `SessionsManager` n'est pas refondu.

## 8. Risques / points de vigilance

- **Défaut de mode** : si plusieurs éditions, le défaut suit l'édition **active sélectionnée**, pas la plus récente. Vérifier l'ordre de bootstrap (`edition` est résolu avant `mode`).
- **Deep-links coquille** : sortir de la coquille vers `tab=live` doit conserver `mode=pilotage` (sinon retour visuel incohérent).
- **i18n** : tous les nouveaux libellés en FR/EN/DE (convention plateforme).
- **a11y** : le mode switch est un `role="tablist"` distinct des `CockpitTabs` ; soulignage or = état, pas la seule couleur (ajouter `aria-selected`).
