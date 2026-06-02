# Blueprint — Module Incubateurs (sourcing & kit de communication)

> Statut : spec validée (brainstorming) — 2026-06-01. Prêt pour `writing-plans`.
> Patterns UI à réutiliser : voir `docs/design/ui-patterns-catalog-generic.md`.

## 1. Contexte & objectif

Les organisateurs sourcent les candidats en faisant relayer le concours par des
**incubateurs / grandes écoles**, qui le diffusent aux startups de leur écosystème.
Sur la dernière édition (RSA 2026), **50+ incubateurs sur 150+ contactés** ont relayé —
c'est le canal d'acquisition n°1. Le kit réellement utilisé est archivé dans
`docs/Organisation 2026/Elements de communication/` (affiche, logos, présentation
short/full, FAQ, checklist, email à relayer, newsletter block, social media, messages
clés, règlement général — le tout en FR/EN/DE).

Le module industrialise ce canal en trois volets :

- **(A) Base d'incubateurs** globale + opt-in par compétition.
- **(B) Générateur de pack de communication** au niveau compétition → ZIP téléchargeable.
- **(C) Déclaration de l'incubateur d'origine** dans le funnel candidat + attribution sourcing.

### Décisions de cadrage (brainstorming)

| Axe | Décision |
|---|---|
| Niveau du pack | **Compétition uniquement** (partagé tel quel par tous les clubs). |
| Production des docs | **Génération auto** depuis les données compétition, **templates visuels** ; assets graphiques (affiche, logo) et règlement légal **uploadés** (pass-through). |
| Diffusion | **100 % manuelle** : la plateforme produit un **ZIP**, l'admin l'envoie lui-même (email CC). Pas de page publique, pas d'envoi automatisé. |
| Base incubateurs | **Globale** + **opt-in par compétition** (l'owner choisit le sous-ensemble montré dans le form candidat). Infos minimales. |
| Déclaration candidat | **Mono-sélection + « Autre »** (champ non fermé). Multi-incubateurs reporté V2. |
| Impact éligibilité | **Aucun** — donnée de sourcing pure. |
| Sourcing analytics | **Inclus** (vue lecture seule légère, gros ROI sur l'entonnoir 50/150). |

## 2. Architecture & points d'ancrage existants

Réutilise l'existant (cf. cartographie) — pas de réinvention :

- Funnel candidat : `src/components/rsa/candidature/` (`CandidatureFunnel.jsx`, `steps/StepCompany.jsx`, `i18n.js`, `useCandidature.js`, `validation.js`), soumission via RPC `rsa_submit_dossier`.
- Orga compétition : `src/components/rsa/admin/platform/master/CompetitionFunnel.jsx` + `competition-tabs/*` + `funnel/useAutosaveCompetition.js`.
- Entités : `src/lib/rsa/entities/{startups,editions}.js`, `src/lib/rsa/storage.js`.
- i18n : `src/lib/platform/i18n.jsx` (`useLang().t()` sur dicts `{fr,en,de}`).
- Storage : convention `editions/{id}/…`.

## 3. Modèle de données (migration `supabase/migrations/<date>_rsa_incubators.sql`)

```sql
-- Base globale, réutilisable entre éditions. Infos minimales.
create table incubators (
  id          text primary key,            -- slug ('station-f', 'techstars-berlin'…)
  name        text not null,
  country     text,                         -- 'FR' | 'DE' | 'CH' …
  language    text,                          -- langue de relais préférée
  website     text,
  created_at  timestamptz default now(),
  created_by  uuid references auth.users(id)
);

-- Opt-in : sous-ensemble proposé dans le form candidat de CETTE compétition.
create table edition_incubators (
  edition_id    text references editions(id) on delete cascade,
  incubator_id  text references incubators(id) on delete cascade,
  position      int default 0,               -- ordre dans le select
  primary key (edition_id, incubator_id)
);

-- Déclaration côté startup (sourcing, sans impact éligibilité).
alter table startups
  add column incubator_id    text references incubators(id),
  add column incubator_other text;            -- saisie libre si "Autre"

-- Données éditoriales + chemins d'assets du pack, niveau compétition.
alter table editions
  add column comm_pack_config jsonb default '{}'::jsonb;
```

`comm_pack_config` (extras éditoriaux + assets — le reste des variables dérive des
colonnes `editions` existantes : `name`, `year`, `application_open/close`,
`prize_main`, `prize_special`, `eligibility_rules`) :

```jsonc
{
  "tagline":        { "fr": "", "en": "", "de": "" },
  "format_line":    { "fr": "", "en": "", "de": "" },
  "ceremony_venue": { "fr": "", "en": "", "de": "" },
  "contact":        { "name": "", "phone": "", "email": "" },
  "faq":            [ { "fr": "", "en": "", "de": "" } ],
  "assets": {
    "logo_path":  "editions/{id}/comm/logo.svg",
    "poster":     { "fr": "…", "en": "…", "de": "…" },
    "reglement":  { "fr": "…", "en": "…", "de": "…" }
  }
}
```

### RLS

- `incubators` : lecture `authenticated` (et public read pour peupler le select candidat) ; écriture `master_admin` / `competition_admin`.
- `edition_incubators` : lecture publique (alimente le funnel) ; écriture rôles compétition.
- `startups.incubator_id/_other` : couverts par les policies `startups` existantes.
- Revoke `anon` sur toute RPC ajoutée + `search_path` fixé (cf. hardening RSA).

### Storage

Bucket **public** `comm-assets` (assets destinés à diffusion large), chemin
`editions/{edition_id}/comm/…`. Upload via `storage.js` (helper à étendre).

## 4. Volet A — Base incubateurs + opt-in

- Entité `src/lib/rsa/entities/incubators.js` : `list()`, `create()`, `update()`, `remove()`, `listForEdition(editionId)`, `setEditionOptIn(editionId, ids[])`, `reorder()`.
- CRUD global via **modal léger** (`FunnelEditorModal`, catalog §6.1) déclenché par « + Nouvel incubateur » — champs : nom, pays, langue, site. Pas de page dédiée (infos minimales). Suppression via confirm (catalog §6.5).

## 5. Volet B — Générateur de pack & ZIP

Variables de fusion (tirées de la compétition) :
`{{competition_name}}`, `{{year}}`, `{{application_window}}`, `{{format_line}}`,
`{{ceremony}}`, `{{prize_main}}`, `{{prize_special}}`, `{{eligibility_summary}}`,
`{{registration_url}}`, `{{contact_name|phone|email}}`, `{{faq[]}}`.

Calibrées sur le réel (`docs/Organisation 2026/.../Kit com messages clés.pdf`).

| Livrable | Source | Sortie | Mode |
|---|---|---|---|
| Messages clés / one-pager | template + variables | **PDF** `@react-pdf/renderer` (look Élysée) | généré |
| Email à relayer | template | **HTML** forward-ready + `.txt` | généré |
| Newsletter block | template | `.html` / `.md` | généré |
| Social media message | template | `.txt` | généré |
| FAQ (essentials + partenaires) | template | `.md` | généré |
| Checklist candidat | template | PDF | généré |
| Affiche, logo | upload admin | pass-through | uploadé |
| Règlement Général Officiel | upload admin (texte légal) | pass-through | uploadé |

- Tous les textes en **FR/EN/DE** (dicts `{fr,en,de}`). Email = `<table>` bulletproof Élysée (catalog §7.1).
- Templates : `src/lib/rsa/comm-pack/templates.js` (dicts), interpolation `src/lib/rsa/comm-pack/render.js`.
- One-pager PDF : `src/components/rsa/comm-pack/OnePagerPdf.jsx` (`@react-pdf/renderer`, polices custom pour le serif éditorial).
- Assemblage ZIP **client** (`JSZip`) : `src/lib/rsa/comm-pack/buildZip.js`. Structure miroir :

```
RSA-2026-kit-com.zip
├── FR/  one-pager.pdf · email.html · email.txt · newsletter.md · social.txt · faq.md · checklist.pdf
├── EN/  …
├── DE/  …
└── Assets/  logo.svg · affiche-FR.pdf · affiche-EN.pdf · affiche-DE.pdf · reglement-FR.pdf · …
```

- Bouton **« Générer le ZIP ⤓ »** → download. L'admin relaie ensuite manuellement (email CC). **Aucun envoi auto, aucune page publique.**
- Dépendances à ajouter : `@react-pdf/renderer`, `jszip`. Lazy-load (`React.lazy`) pour éviter d'alourdir le bundle principal (cf. chunks split V3).

## 6. Volet C — Déclaration candidat

- `src/components/rsa/candidature/steps/StepCompany.jsx` : champ **« Incubateur / structure d'accompagnement »** (catalog §4.1 `Field`, §3.5 select).
  - `Select` peuplé via `incubators.listForEdition(editionId)` (liste opt-in) + option **« Autre »**.
  - « Autre » sélectionné → `Input` texte libre (`incubator_other`).
  - **Optionnel**. Labels FR/EN/DE dans `candidature/i18n.js`.
- Persistance : `SAVE_DRAFT_FIELDS` (`useCandidature.js`) + `validation.js` (pas de règle bloquante).
- `rsa_submit_dossier` : persiste `incubator_id`/`incubator_other`, **zéro impact éligibilité**.

## 7. UX Admin — onglet « Incubateurs »

Nouvel onglet dans `CompetitionFunnel`/`CompetitionEditView` (pill tabs, catalog §3.2),
autosave (`useAutosaveCompetition`, indicateur catalog §4.5), 2 sections séparées par
hairline gold (catalog §1.5, §2.3) :

1. **Liste proposée au candidat** — table (catalog §5.1) des incubateurs globaux avec checkbox opt-in + drag-réorder (`position`) + « + Nouvel incubateur ».
2. **Pack de communication** — éditeurs FR·EN·DE (tagline, format, lieu, contact, FAQ), uploads (logo, affiche ×3, règlement ×3), aperçu live one-pager, bouton « Générer le ZIP ⤓ » (footer sticky, catalog §2.4).

## 8. Volet bonus — Attribution sourcing

Vue lecture seule admin : KPI cards (catalog §5.2) + table « candidats par incubateur »
(`GROUP BY incubator_id`, part « Autre » via `incubator_other`). Mesure l'entonnoir
50/150. Emplacement : section dans l'onglet Incubateurs ou dans le reporting existant.

## 9. Hors périmètre (YAGNI / V2)

- Multi-incubateurs par startup.
- Pack au niveau club (override hérité) — réévaluer en V2 multiclub.
- Envoi automatisé via Email Studio / page publique de diffusion.
- Génération auto de l'affiche et du règlement (graphique/légal → uploadés).

## 11. Évolution — Contact incubateur + propriété par club (multi-club)

> Statut : spec en validation — 2026-06-01. Lève le YAGNI §9 « Pack/gestion au niveau club ».

### 11.1 Besoin
1. Le **contact relais** de l'incubateur (personne + email — l'humain à qui l'on envoie le kit) doit être saisissable.
2. **Multi-club** : chaque club gère **sa propre liste d'incubateurs (opt-in) + son contact** depuis **son** cockpit. Le master ne gère plus que la **base globale** (nom/pays/langue/site).
3. **Monoclub** : inchangé fonctionnellement — tout reste au niveau compétition (onglet actuel), **plus** les champs contact.

### 11.2 Modèle de données
Le contact n'est **pas** global (il dépend de la relation club↔incubateur). On déplace l'opt-in **et** le contact sur une jonction scopée club :

```sql
-- Global inchangé : incubators (id, name, country, language, website) — master-only.

-- NOUVEAU : opt-in + contact, scopé (compétition, club).
create table club_incubators (
  edition_id    text references editions(id)   on delete cascade,
  club_id       text references clubs(id)       on delete cascade,
  incubator_id  text references incubators(id)  on delete cascade,
  position      int  not null default 0,
  contact_name  text,
  contact_email text,
  primary key (edition_id, club_id, incubator_id)
);

-- Migration de données : edition_incubators (per-edition) → club_incubators
-- pour le club unique attaché à chaque édition (resolve via edition_clubs).
-- edition_incubators conservée le temps de la bascule, dépréciée ensuite.
```

- **Monoclub** : l'onglet compétition `IncubatorsTab` résout le club unique (via `edition_clubs`) et écrit dans `club_incubators` pour ce club. UI quasi identique + 2 champs contact par ligne.
- **Multi-club** : nouvel onglet **« Incubateurs »** dans `ClubCockpit` (mode Préparation) → opt-in + contact du club courant. L'onglet compétition master passe en lecture : base globale + agrégat (qui a opté-in, combien de contacts renseignés).
- Écritures via RPC `security definer` (master OU club_admin du club), `search_path=public`, revoke anon (cf. hardening RSA). Lecture publique pour alimenter le funnel.

### 11.3 Funnel candidat (décision ouverte)
Le candidat choisit déjà un club (`StepClub`). Deux options pour la liste montrée dans `StepCompany` :
- **(a)** liste de **son club** (`listForClub(editionId, clubId)`) — cohérent avec la propriété par club. **Recommandé.**
- **(b)** **union** des opt-ins de l'édition (comme aujourd'hui) — moins de refonte funnel. **✅ RETENU (2026-06-01).**
→ `useEditionIncubators(editionId)` devient une requête **distinct** sur `club_incubators` (union de tous les clubs de l'édition). `StepCompany`/`StepReview` quasi inchangés (même hook, même forme `{id, name}`).

### 11.4 Surfaces touchées
`supabase/migrations/<date>_rsa_club_incubators.sql` · `entities/incubators.js` (+ `listForClub`, `setClubOptIn`, contact) · `hooks/useIncubators.js` · `competition-tabs/IncubatorsTab.jsx` (monoclub résout club + agrégat multi-club) · `competition-tabs/IncubatorEditModal.jsx` (global = nom/site ; contact déplacé sur la ligne d'opt-in) · **NOUVEAU** `club/tabs/IncubatorsTab.jsx` + entrée dans `ClubCockpit` + `club-cockpit/modes.js` · `candidature/steps/StepCompany.jsx` + `StepReview.jsx` (si option a) · `useIncubators` `useSourcingStats` (scope club).

## 10. Séquence de build (pour writing-plans)

1. Migration SQL (tables, colonnes, RLS, bucket) — appliquée via MCP Supabase.
2. Entité `incubators.js` + extension `storage.js`.
3. Volet C (déclaration funnel) — plus petit chemin de valeur, testable seul.
4. Volet A (CRUD global + opt-in) + onglet admin §1.
5. Volet B (templates → render → react-pdf → JSZip) + onglet admin §2.
6. Volet bonus sourcing §8.
7. Browser-test FR/EN/DE + génération ZIP réelle.
