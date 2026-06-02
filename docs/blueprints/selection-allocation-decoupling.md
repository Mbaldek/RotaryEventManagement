# Blueprint — Découplage Éligibilité / Allocation (Module 2 → Module 2.5)

> Statut : design validé (brainstorming 2026-06-02). Implémentation à planifier.
> Dépend de : `docs/blueprints/module2-selection.md` (espace Sélection existant),
> `docs/design/ui-patterns-catalog-generic.md` (pattern L-Numbered-Hairline, filet or).
> Réf. nav : `docs/blueprints/nav-flux-competition.md` (phase Organisation du cockpit).

## 1. Problème

Aujourd'hui, dans `DecisionPanel.jsx`, dès que le comité coche **« éligible »**, le
choix d'un **cluster** (= session qualificative) est **obligatoire** : le RPC
`rsa_apply_selection_review` projette `eligible → status='affecte'` et exige un
`assigned_session_id`.

Or les clusters ne peuvent être dimensionnés qu'**une fois le pool complet des
éligibles connu** (leur nombre/taille en dépend). Le UI force donc l'allocation
(étape 4 du process métier) au moment de la décision d'éligibilité (étape 1) →
œuf-et-poule.

Process métier réel :
1. Statuer l'éligibilité sur tout le pool.
2. Compter les éligibles.
3. Créer le bon nombre de clusters.
4. Allouer (avec possibilité de rejeter encore, faute de place — jugement humain).

## 2. Décision

**Découplage net.** La décision comité ne porte plus de cluster. L'allocation
devient une étape distincte, dans le cockpit (phase Organisation), réservée
admin/owner. Cela **rétablit le cycle de vie d'origine** déjà documenté dans
`20260527_rsa_platform_foundation.sql:65` :

```
brouillon → soumis → en_selection → eligible / rejete / liste_attente → affecte → en_session → …
```

`eligible` (retenu) et `affecte` (placé dans un cluster) redeviennent deux états
distincts — c'est le Module 2 qui les avait collés. Aucune contrainte CHECK sur
`startups.status` → pas de migration d'enum, juste un changement de comportement.

## 3. Modèle de statut

| Décision comité | Avant | Après |
|---|---|---|
| `a_examiner` | `en_selection` | `en_selection` *(inchangé)* |
| `eligible` | `affecte` + `session_id` **obligatoire** | **`eligible`**, `session_id = NULL` |
| `liste_attente` | `liste_attente` | `liste_attente` *(inchangé)* |
| `rejete` | `rejete` | `rejete` *(inchangé)* |

Transitions de l'écran d'allocation (admin) :
- `eligible → affecte` (+ `session_id`) = allouer.
- `affecte → affecte` (changer `session_id`) = déplacer.
- `eligible|affecte → rejete | liste_attente` = rejeter faute de place (jugement humain).

## 4. Espace Sélection (membre comité dédié, stand-alone)

- **Retirer le `ClusterSelect`** du `DecisionPanel`. La décision devient :
  `à examiner / éligible / liste d'attente / rejeté` + motif (motif requis pour
  rejeté / liste d'attente, inchangé).
- Supprimer la validation `errEligibleNeedsCluster` et le champ cluster associé.
- L'heuristique `sectorToClusterHeuristic` déménage vers l'écran d'allocation
  (suggestion), elle disparaît du panneau de décision.
- L'espace Sélection reste **stand-alone** : accessible à un membre comité dédié
  (rôle `comite`), ni admin ni owner. Inchangé côté accès.

## 5. Écran « Allocation » — cockpit, phase Organisation (admin/owner)

Réservé admin (rôles hiérarchie). Affiche le pool des éligibles
(`status='eligible'`), permet de créer les clusters (= `RsaSession kind='qualifying'`)
et d'y répartir **librement** (pas de capacité dure enforcée).

### Gate : souple
L'écran est toujours accessible. Bandeau d'avertissement si des dossiers restent
`à examiner` (`status` ∈ {soumis, en_selection}) : « X dossiers encore à examiner ».
Aucun blocage dur — l'admin garde la main sur le timing.

### Interaction : dropdown par ligne (pas de drag-drop)
Chaque éligible « à placer » porte un menu « Choisir un cluster » (réutilise le
pattern `ClusterSelect` + suggestion secteur en or). Accessible clavier, cohérent
avec la ligne éditoriale.

### Mockup (L-Numbered-Hairline, zéro card)

```
┌────────────────────────────────────────────────────────────────────┐
│ ORGANISATION · Allocation des éligibles                              │
│                                                                      │
│ 14 éligibles · 9 alloués · 5 à placer        ⚠ 3 dossiers à examiner │
│ ──────────────────────────────────────────────────────────────────  │
│                                                                      │
│ À PLACER (5)                                          [+ Cluster]    │
│ ───────────────────────────────────────────────────────────────────│
│  01 │ Lumio          · HealthTech, AI   → [ Choisir un cluster ▾ ]   │
│  02 │ Verde          · GreenTech        → [ Choisir un cluster ▾ ]   │
│  03 │ Foncia Labs    · PropTech         → [ suggéré : Cluster B ]    │
│  …                                                                   │
│                                                                      │
│ CLUSTERS                                                             │
│ ───────────────────────────────────────────────────────────────────│
│  ▸ Cluster A — Santé & IA      ·  12 mars      · 4 startups   [ ✎ ]  │
│      Lumio · Medix · NeuroFlow · CareLoop                            │
│  ▸ Cluster B — Climat & Impact ·  19 mars      · 5 startups   [ ✎ ]  │
│      Verde · Solaris · …                                             │
│  ▸ Cluster C — non daté        ·  —            · 0 startups   [ ✎ ]  │
│                                                                      │
│  Action sur une startup allouée :  [ Déplacer ▾ ]  [ Rejeter ]      │
└────────────────────────────────────────────────────────────────────┘
```

- `[+ Cluster]` crée une `RsaSession kind='qualifying'` (nom, date optionnelle,
  thème). En monoclub V1, rattachée à l'unique club de l'édition.
- Suggestion secteur affichée en or, cliquable (one-tap assign).

## 6. Données / RPC

- **`rsa_apply_selection_review`** : changer la projection `eligible` →
  `status='eligible'`, `session_id = NULL`. **Supprimer** la garde
  `eligible_requires_session`. Les autres décisions inchangées.
- **Nouveau `rsa_allocate_startup(p_startup_id uuid, p_session_id text)`** :
  admin-only (corps), SECURITY DEFINER + sentinel `rsa.allow_protected_update`.
  Pré-condition : startup `status` ∈ {eligible, affecte}. Effet :
  `status='affecte'`, `session_id = p_session_id`. Valide que la session existe,
  est `kind='qualifying'` et appartient à l'édition de la startup.
- **Désallouer / rejeter faute de place** : réutilise `rsa_admin_override`
  (déjà en place) — nouvelle review `is_final=true` avec decision `rejete` /
  `liste_attente` (ou `eligible` pour renvoyer au pool, `session_id` repasse NULL).
- **`session_id` reste le SSOT** consommé en aval (running order `pitch_order`,
  affectation jury). Aucun changement de schéma downstream requis.

## 7. Hooks / entités (front)

- `useSelection.js` : la mutation comité (`useUpsertReview`) ne transmet plus
  `assignedSessionId` (toujours NULL pour le comité).
- Nouveau hook côté cockpit : `useAllocation(editionId)` —
  - query pool éligibles (`status='eligible'`) ;
  - query clusters (`RsaSession kind='qualifying'` de l'édition) + compteurs
    d'allocation (`startups.session_id`) ;
  - mutations : `allocate` (rsa_allocate_startup), `move` (idem),
    `reject` (rsa_admin_override), `createCluster` (RsaSession.create).
- Réutiliser `ClusterSelect` (déjà extrait) pour le dropdown par ligne.

## 8. Compatibilité

- Les sessions qualificatives restent visibles en lecture dans le Club Cockpit
  (`SessionsTab`). L'écran d'allocation devient le point d'entrée canonique pour
  les créer dans ce flux — **additif**, on ne casse pas le cockpit club.
- **Données existantes** : les startups déjà `affecte` avec `session_id` restent
  valides (l'allocation les montre comme déjà allouées). Aucune rétro-migration de
  données nécessaire ; les nouvelles décisions comité produiront `eligible`.
- **Forward-compat V2 multiclub** : `RsaSession.club_id` reste porté ; en monoclub
  V1 toutes les sessions pointent l'unique club de l'édition.

## 9. Tests

- **Purs (`node --test`, cf. `reference_test_runner_node_test`)** : si on extrait
  une fonction de projection statut (decision → status) côté `src/lib/rsa/**`,
  la tester (eligible → eligible, etc.).
- **RPC** : test SQL/MCP de `rsa_allocate_startup` (rôle, pré-condition statut,
  validation session édition/kind).
- **E2E** : étendre `tests/e2e/parcours/comite-finalize.spec.ts` — la décision
  éligible ne demande plus de cluster ; l'allocation se fait dans le cockpit.

## 10. Hors scope (YAGNI)

- Pas de capacité dure par cluster (décision : répartition libre).
- Pas de drag-drop (décision : dropdown par ligne).
- Pas de couche « cluster ≠ session » (décision : 1 cluster = 1 session).
- Pas d'auto-allocation en masse (la suggestion secteur one-tap suffit pour V1).
