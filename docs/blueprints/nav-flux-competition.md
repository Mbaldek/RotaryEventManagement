# Blueprint — Nav-flux compétition : Hub + 3 phases (Préparation / Organisation / Pilotage)

> Statut : **spec validée** · 2026-06-02
> Patterns réutilisés : voir `docs/design/ui-patterns-catalog-generic.md`
> (§3.2 Pill tabs / CockpitTabs, §3.3 URL state, §3.4 Breadcrumb, §3.5 Selector dropdowns,
> KPI rail, GoldRuleSection, StatusPill, L-Numbered-Hairline).
> Généralise `docs/blueprints/club-cockpit-modes-pilotage.md` (axe Préparation/Pilotage
> au niveau club) à l'échelle de la compétition entière, et **remplace** le persona-switcher
> d'`Admin.jsx` décrit dans `docs/blueprints/auth-routing-and-personas.md`.

## 1. Problème

La navigation admin empile **trois systèmes concurrents** pour une seule intention :

1. **TopNav** role-aware ([computePrimaryNav.js](../../src/lib/platform/computePrimaryNav.js)) — Administration · Sélection · Jury.
2. **Persona-switcher** ([Admin.jsx](../../src/pages/Admin.jsx)) — scope Master ▸ Compétition ▸ Club, piloté par `?scope=`.
3. **Onglets internes** — 11 onglets de [CompetitionEditView.jsx](../../src/components/rsa/admin/platform/master/CompetitionEditView.jsx), + ceux du Club Cockpit, + les pages éclatées `/Selection` `/Jury`.

Conséquence (verbatim Mathieu) : *« ça devient illisible avec les histoires de hiérarchie compétition mono/multi-club… c'est du supermarché, on avance à l'aveugle. »*

**Cause racine** : on navigue **par objet** (compétition → club → onglet). Le **club est un niveau de navigation**, d'où l'enfer mono/multi : en monoclub ce niveau est parasite, en multiclub il se mélange avec les onglets.

**Insight unificateur** : le RSA est un **funnel d'activités** linéaire. On doit naviguer **par activité**, pas par objet. Trois activités couvrent tout le cycle :

1. **Préparation** — paramétrer, setup, clubs, admins, sessions (squelette).
2. **Organisation** — candidatures, jury, dossiers startups, construction des sessions.
3. **Pilotage** — LIVE et résultats.

C'est l'exacte généralisation de l'axe **Préparation / Pilotage** déjà acté au niveau club (`club-cockpit-modes-pilotage.md`), avec le maillon manquant au milieu (**Organisation**) et étendu à toute la compétition.

## 2. Décisions verrouillées (brainstorming 2026-06-02)

1. **Nav par activité** : 3 phases Préparation / Organisation / Pilotage, pas de nav par objet.
2. **Club = lentille**, jamais un niveau. Filtre + regroupement visuel dans les listes ; **disparaît automatiquement en monoclub**. En Préparation, le club reste un objet de setup normal (on édite la liste des clubs comme les prix).
3. **Hub d'accueil** = liste/cartes des compétitions avec avancement → on entre dans une compétition → ses 3 phases. Retour au hub pour changer de compétition.
4. **Accès libre** aux 3 phases + indicateurs d'avancement. **Aucun verrou** (les phases se chevauchent dans le temps : candidatures ouvertes pendant qu'on construit des sessions). Pas de moteur « prochaine action conseillée » en v1.
5. **Chrome (Option A)** : une fois dans une compétition, **barre de phases horizontale** (langage visuel des `CockpitTabs` éditoriaux), pas de rail latéral.
6. **Comité / jury inchangés** : ils gardent `/Selection` et `/Jury` focalisés. La refonte vise **le cockpit admin** (master / competition / club admin).

## 3. Architecture

### 3.1 Vue d'ensemble

```
HUB (/Admin)                    COQUILLE COMPÉTITION              SOUS-ÉCRAN
┌───────────────────┐          ‹ Compétitions   PARIS BERLIN 2027
│ PARIS BERLIN 2027 │  ──clic─► ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Prépa ▰▰▰▰▱ 80%   │          ① PRÉPARATION  ② ORGANISATION • ③ PILOTAGE  [Tous clubs ▾]
│ Org · 12 dossiers │          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Pilotage · J-4    │          Candidatures  Sélection•  Jury  Sessions
└───────────────────┘          ─────────────────────────────────────────
                                (contenu réutilisé : file Sélection, etc.)
```

Deux nouveaux composants de coquille + un contexte partagé ; **zéro réécriture des écrans de contenu**.

### 3.2 État URL (single source of truth)

Pattern §3.3 (`useSearchParams`). La coquille consomme :

- `?competition=<editionId>` — compétition active (absent = hub).
- `?phase=<prep|orga|pilotage>` — phase active (défaut `prep`, ou dérivé du statut : `edition.status === 'open'` → `pilotage`).
- `?screen=<id>` — sous-écran de la phase (défaut = 1er sous-écran).
- `?club=<clubId|all>` — **lentille club** (défaut `all` ; ignoré/masqué en monoclub).

Le legacy `?scope=` / `?subview=` / `?tab=` d'`Admin.jsx` est **retiré** (Lot 3) ; un shim de redirection le traduit pendant la transition.

### 3.3 Le Hub — `CompetitionHub.jsx`

Chemin : `src/components/rsa/admin/platform/hub/CompetitionHub.jsx`. Landing par défaut d'`/Admin` quand `?competition=` absent.

- Header éditorial (GoldRuleSection) : eyebrow « Compétitions » + titre Playfair.
- Grille de **cartes compétition** (réutilise l'esthétique d'[OpenCompetitions.jsx](../../src/components/rsa/candidature/OpenCompetitions.jsx)) : nom, année, **3 mini-jauges d'avancement** (une par phase), CTA « Ouvrir ».
- Filtrées par rôle (cf. §3.7).
- Clic carte → `setParams({ competition: id })`.

### 3.4 La coquille — `CompetitionShell.jsx`

Chemin : `src/components/rsa/admin/platform/shell/CompetitionShell.jsx`. Montée par `Admin.jsx` quand `?competition=` présent.

- **Back link** « ‹ Compétitions » (pattern §3.4) → retour hub.
- **Barre de phases** (Option A) : composant `PhaseBar` réutilisant [CockpitTabs](../../src/components/design/shell/CockpitTabs.jsx) (pattern §3.2), 3 segments, soulignage or sur l'actif, **badge d'avancement par phase** (% / compteurs).
- **Lentille club** : `ClubLensSelector` (pattern §3.5 selector dropdown) aligné à droite de la barre. Rendu **uniquement si `edition.model === 'multiclub'` ET ≥2 clubs attachés**.
- **Rangée de sous-écrans** sous la barre (pill tabs secondaires) propre à la phase active.
- **Body** : routeur qui monte le composant du sous-écran (cf. §3.6), enveloppé dans le `ClubLensProvider`.

### 3.5 Lentille club — `ClubLensContext`

Chemin : `src/components/rsa/admin/platform/shell/ClubLensContext.jsx`. Contexte React exposant `{ clubId, isAll, setClub, clubs }`. Les sous-écrans Organisation/Pilotage le consomment pour **filtrer + regrouper** (sections « Club X ») au lieu de recevoir un niveau de nav. Monoclub → `clubId` figé sur l'unique club, selector masqué.

### 3.6 Mapping des sous-écrans (réutilisation pure)

| Phase | Sous-écrans (`?screen=`) | Composant réutilisé |
|---|---|---|
| **① Préparation** | identite, calendrier, clubs, roles, regles, prix, formulaires, incubateurs, sessions | onglets de [CompetitionEditView](../../src/components/rsa/admin/platform/master/CompetitionEditView.jsx) (IdentityTab, CalendarTab, ClubsTab, RolesTab, RulesTab, PrizesTab, FormulairesTab, IncubatorsTab, SessionsTab) |
| **② Organisation** | candidatures, selection, jury, sessions-build | [Selection.jsx](../../src/pages/Selection.jsx) (file), workspace [Jury.jsx](../../src/pages/Jury.jsx) admin + [JuryFunnel](../../src/components/rsa/jury-funnel/JuryFunnel.jsx) approvals, console session ([SessionShell](../../src/components/rsa/admin/platform/club/session/SessionShell.jsx) / RunningOrderEditor / DeckGenerator) |
| **③ Pilotage** | live, resultats, finale | LiveTab, ResultsTab, section Finale (SessionsTab `kind='finale'`) |

L'onglet **Pilotage actuel** (checklist [PilotageTab](../../src/components/rsa/admin/platform/master/competition-tabs/PilotageTab.jsx)) devient le **landing de la phase Préparation** (vue d'ensemble du setup). Le strip « Espaces opérationnels » (livré PR #19/#20) est **absorbé** par la barre de phases — on le retire une fois la coquille en place.

### 3.7 Avancement par phase

Source réutilisée quand elle existe, sinon agrégat léger :

- **Préparation** : `usePilotageStatus.completionPercent` ([usePilotageStatus.js](../../src/components/rsa/admin/platform/master/usePilotageStatus.js)) — existe déjà.
- **Organisation** : `Startup.summaryByStatus` (dossiers / à voir) + jurés assignés (cf. hook de [OperationalSpacesStrip](../../src/components/rsa/admin/platform/master/competition-tabs/OperationalSpacesStrip.jsx), à promouvoir en hook partagé).
- **Pilotage** : prochaine session (J-x) + sessions publiées (dérivé des sessions de l'édition).

Compteur `—` si indisponible (jamais de fausse donnée).

### 3.8 Rôles

| Rôle | Hub | Phases | Lentille club |
|---|---|---|---|
| **master_admin** | toutes les compétitions | 3 phases | tous clubs (défaut `all`) |
| **competition_admin** | sa/ses compétition(s) | 3 phases | tous clubs de sa compet |
| **club_admin** | compétitions où il a un club | 3 phases | **verrouillée sur son club** ; Préparation limitée à ses objets (ses sessions, ses jurés), reste en lecture |
| **comité / jury** | — (hors scope) | — | — (gardent `/Selection`, `/Jury`) |

## 4. Réutilisation vs construction

**Réutilisé (≈100 % du contenu)** : tous les onglets `CompetitionEditView`, la file Sélection, le workspace Jury, la console session, ResultsTab. Le chantier est une **réorganisation de coquille**.

**Construit** :
- `CompetitionHub.jsx` (cartes + avancement)
- `CompetitionShell.jsx` + `PhaseBar` + `ClubLensSelector`
- `ClubLensContext.jsx` (filtre/regroupement partagé)
- hooks d'avancement par phase (extraction/partage des hooks existants)
- refonte d'`Admin.jsx` : routeur hub ↔ coquille, **retrait du persona-switcher**

## 5. Phasage

- **Lot 1 — Coquille + hub (gain rapide)** : Hub + `CompetitionShell` + `PhaseBar`, les phases pointent vers les **écrans existants montés tels quels**. La nav devient lisible immédiatement. Persona-switcher conservé en parallèle (feature-flag) le temps de valider.
- **Lot 2 — Lentille club + intégration** : `ClubLensContext`, regroupement par club dans Organisation/Pilotage, absorption du strip ops, sous-écrans propres.
- **Lot 3 — Avancement + nettoyage** : badges d'avancement par phase, retrait du persona-switcher + shim `?scope=` → `?competition=&phase=`, suppression du code mort.

## 6. Hors scope

- L'expérience **comité / jury** (`/Selection`, `/Jury`) reste inchangée.
- Le **multi-compétition fédéré V2** (cf. mémoire vision V2 multiclub) : la coquille est compatible forward mais on ne traite pas la fédération de finales ici.
- Pas de command palette (§3.6 du catalogue, déféré).

## 7. Risques / points d'attention

- **Compat deep-links** : QR codes jurés, emails finale, liens admin existants utilisent `?scope=`/`?tab=`. → shim de redirection obligatoire en Lot 1, retiré en Lot 3.
- **club_admin lecture seule en Préparation** : la frontière dure reste serveur (RLS + RPC). La coquille ne fait que masquer/désactiver — pas de sécurité côté client.
- **Gate `/Selection` `/Jury`** déjà élargi master/competition admin (PR #20) — la coquille s'appuie dessus.
