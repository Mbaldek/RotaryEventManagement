# Blueprint — Selection Queue : passage liste éditoriale → tableau filtrable

## Contexte / problème
L'Espace Sélection (`/Selection`, Module 2) rendait la file des candidatures en **liste
éditoriale groupée par Compétition ▸ Club** (`GroupedQueue` pour les admins) ou liste plate
(`QueueList` pour les comités scoped). Ce groupement ne tient pas à l'échelle : avec ~10 000
startups sur ~200 clubs, l'arbre devient ingérable et le scan/tri impossible.

## Décision (validée 2026-06-02)
Remplacer **partout** (admins + comités) par un **tableau filtrable à colonnes**, avec :
- tri par en-tête cliquable,
- filtres : Édition, **Club** (nouveau), **Statut** (nouveau), **Secteur multi-select** (nouveau),
  Verdict, recherche, quick-tabs (À examiner / Décidés / À valider / Tous) conservés,
- une **colonne Secteur dédiée** = multi-tags colorés (chips), couleur muted stable par secteur,
- un bouton **Ouvrir** (`↗`) par ligne → `DossierDrawer` existant, rendu en **sheet overlay droite**
  (le tableau garde toute la largeur),
- des **actions rapides inline** (`⋯`) limitées à ce qui ne nécessite pas de saisie :
  **admin « Valider »** (finalise une review en attente, 1 clic). Les décisions exigeant
  cluster/justification (`éligible`, `rejeté`, `liste d'attente`) ouvrent le drawer.

## Contrainte clé (validation)
`DecisionPanel`/`AdminOverridePanel` :
- `éligible` exige un **cluster** (`assigned_session_id`),
- `rejeté`/`liste_attente` exigent une **justification**,
- seul l'admin **« Valider »** (`finalizeExisting(reviewId)`) ne demande aucune saisie.
→ Donc la seule action vraiment « inline » sûre est admin Valider. Le reste passe par le drawer.

## Données disponibles (par row `pageForStaff`)
`startups.*` + `selection_reviews(...)`. Champs utilisés en colonnes :
`name`, `club_id`, `status`, `eligibility.verdict`, `sectors[]`, review effective
(`decision`, `is_final`, `reviewer_name`, `reviewed_at`), `contact_person`, `email`,
`country`, `preferred_lang`, `submitted_at`.

## Taxonomie secteurs
`startups.sectors` est un `text[]` hétérogène : le funnel actuel n'écrit que 5 clusters
(`foodtech, social, tech, healthtech, greentech`) + `autre`, mais les données importées
d'Airtable portent une taxonomie plus riche (Healthtech, AI, Circular Economy, Wellness,
Mobility, IoT, Diagnostics, Food Security, Financial Inclusion, Social impact, …).

Choix robuste :
- **Colonne** : rend n'importe quelle valeur stockée en chip, couleur muted **stable par hash**
  (réutilise `SESSION_PALETTE` + djb2 de `sessionTheme.js`, golden rule Élysée = pas de saturé).
  Label prettifié pour les tokens connus (`SECTOR_LABELS`), sinon brut.
- **Filtre** : options **dérivées dynamiquement des valeurs distinctes présentes** en base
  (`Startup.distinctSectors`) → garantit l'alignement avec les données réelles (funnel + imports),
  multi-select via `TagSelect`. Filtrage **serveur** par overlap de tableau (`.overlaps('sectors', […])`).

## Composants

### Nouveau — `src/components/rsa/selection/sectors.js`
- `SECTOR_LABELS` : map token connu → `{fr,en,de}` (clusters funnel + tags Airtable canoniques).
- `sectorLabel(raw, lang)` : label prettifié (fallback titlecase du brut).
- `sectorChipColors(raw)` : `{ primary, light, border }` via hash stable sur le pool muted.

### Nouveau — `src/components/rsa/selection/QueueTable.jsx`
Remplace l'usage de `GroupedQueue` **et** `QueueList`. Props :
`pages, clubsLookup, isLoading, isError, hasNextPage, isFetchingNextPage, onLoadMore,
onOpen, onQuickValidate, canValidate, selectedId, onRetry, sort, onSortChange, lang, t`.
- Colonnes : Startup (nom serif + `•` si final), Club, Statut, Verdict, **Secteur** (chips),
  Décision (effective + pastille « à valider »), Contact (perso+email), Pays/Langue, Soumis, Actions.
- En-têtes triables : `name, club, status, verdict, submitted` (tri **client** sur les pages chargées ;
  `submitted_at` reste le tri serveur natif).
- Rail couleur gauche par verdict → décision (repris de `QueueList`).
- Actions : `↗ Ouvrir` (toujours) + `⋯` menu : si `canValidate` && review en attente → « Valider la
  décision » (appelle `onQuickValidate(startup)`), + « Ouvrir le dossier ».
- États loading/vide/erreur/pagination repris de `QueueList`.
- **Responsive `< lg`** : repli en cartes denses (nom + club + 2 badges + Ouvrir), pas de scroll-x.

### Modifié — `FiltersBar.jsx`
+ selector **Club** (single, options résolues depuis `clubs`), + selector **Statut** (single,
mappe `DOSSIER_STATUS_LABELS`), + **Secteur** multi-select (`TagSelect`, options = `sectorOptions`).
Nouveaux props : `clubs, clubId, onClubChange, statusValue, onStatusChange, sectorOptions,
sectorIn, onSectorChange`. Reset étend aux nouveaux filtres.

### Modifié — `src/lib/rsa/entities/startups.js`
- `STAFF_FILTER_KEYS` += `clubIdIn`, `sectorIn`.
- `pageForStaff` : `if (clubIdIn) q = q.in('club_id', clubIdIn)` ;
  `if (sectorIn) q = q.overlaps('sectors', sectorIn)`.
- Nouveau `Startup.distinctSectors({ editionId })` : `select('sectors')` (+ eq edition si fourni),
  dédupe client-side, renvoie `string[]` trié.

### Modifié — `Selection.jsx`
- State filtres += `clubId`, `statusValue`, `sectorIn`, `sort` (`{ key, dir }`).
- `buildFilters` += `clubIdIn` (singleton si clubId), `sectorIn`. Le statusValue explicite prime
  sur le quickTab quand défini (sinon quickTab pilote `statusIn` comme avant).
- Charge `clubs` (via `Club.listAll()` — RPC public, tous rôles) → `clubsLookup` + options.
  Pour club_scoped, options limitées à ses clubs.
- Charge `sectorOptions` via `useQuery(Startup.distinctSectors)`.
- Layout : **table pleine largeur** ; le drawer devient un **sheet overlay** (fixed right ~560px +
  backdrop, AnimatePresence) ouvert sur `selectedId` ; plein écran `< lg`.
- `onQuickValidate(startup)` : `pickEffectiveReview` → si non-final & id → `finalize.mutate({reviewId, startupId})`.
- Le tri client est appliqué sur `filteredPages` aplaties avant passage à `QueueTable`.

## Déprécié
`GroupedQueue.jsx`, `QueueList.jsx`, `useSelectionQueueGrouped.js` ne sont plus montés par
`Selection.jsx` (laissés en place, retrait possible ultérieur).

## Hors scope
- Tri serveur multi-colonnes (le tri client sur pages chargées suffit au volume staff actuel ;
  à revisiter si la pagination devient un frein).
- Édition de la taxonomie secteurs (le funnel reste maître des valeurs écrites).

## Références patterns
`docs/design/ui-patterns-catalog-generic.md` (table éditoriale, chips, rail couleur),
`project_concours_v2_visual_pattern` (palette muted + rail), `sessionTheme.js` (hash + pool couleur).
