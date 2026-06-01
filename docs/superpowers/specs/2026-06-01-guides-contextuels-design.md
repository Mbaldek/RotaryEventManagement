# Guides contextuels par espace — Design

**Date** : 2026-06-01
**Statut** : validé (brainstorming) → à planifier
**Approche retenue** : A (système unifié, contenu éditable en base, scopé multiclub)

## Objectif

Ajouter un système de guides d'aide à la plateforme RSA (`app.rotary-startup.org`).
Un même dispositif couvre **trois besoins** :

1. **Aide contextuelle par rôle** — expliquer à chaque utilisateur comment faire sa
   tâche dans l'espace où il se trouve (candidat → déposer un dossier, juré → noter,
   admin → configurer une compétition).
2. **Onboarding 1re visite** — signaler la présence d'aide via une pastille « nouveau »
   tant que l'utilisateur n'a pas ouvert le guide d'un espace (pas d'auto-ouverture).
3. **Référence consultable** — le panneau liste tous les guides publiés de l'espace,
   réouvrable à tout moment.

Le contenu est **éditable en base** (Supabase) par les admins, sans toucher au code.

## Choix actés (brainstorming)

| Décision | Choix |
|---|---|
| Source du contenu | Base Supabase (table `guides`), éditable par admin |
| Forme côté lecteur | Drawer latéral droit, à la demande (réutilise `SessionDetailDrawer`) |
| Onboarding | Pastille « nouveau » uniquement, **pas** d'auto-ouverture |
| Scope | Par espace + override optionnel par compétition (`edition_id` nullable ; en base une « compétition » = la table `editions`) |
| Langues | FR / EN / DE, suit le `LanguageSwitcher` global via `useLang()` |
| Espaces couverts | Les 5 : Admin, Selection, Jury, MonDossier, Concours |
| Rendu | `react-markdown` (nouvelle dépendance) |

## Modèle de données

```sql
-- Un article de guide par ligne. Plusieurs articles par (space, competition_id).
-- NB : en base une « compétition » est une ligne de `editions` ; la FK est `edition_id`.
create table guides (
  id             uuid primary key default gen_random_uuid(),
  space          text not null,                 -- 'admin'|'selection'|'jury'|'dossier'|'concours'
  edition_id     uuid null references editions(id) on delete cascade,
                                                 -- null = guide global (défaut)
                                                 -- non-null = override pour CETTE compétition (édition)
  title          jsonb not null default '{}',   -- { fr, en, de }
  body_md        jsonb not null default '{}',   -- { fr, en, de } markdown par langue
  sort_order     int  not null default 0,
  is_published   boolean not null default false,
  updated_at     timestamptz not null default now(),
  updated_by     uuid null references auth.users(id)
);
create index on guides (space, edition_id, sort_order);

-- Accusé de lecture par user/espace → pilote la pastille « nouveau ».
create table guide_acks (
  user_id      uuid not null references auth.users(id) on delete cascade,
  space        text not null,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, space)
);
```

### Résolution d'héritage (lecture)

Pour un `space` + une compétition courante (si l'espace en a une) :

- s'il existe des guides publiés avec `edition_id = <courante>` → afficher **ceux-là** ;
- sinon → afficher les guides globaux (`edition_id IS NULL`).

C'est un **override par compétition** (on prend l'un OU l'autre jeu), pas un merge
ligne à ligne. Plus simple que `mergeEligibilityRules` et suffisant pour ce besoin.
Espaces sans notion de compétition courante (ex : un Admin avant sélection d'édition) →
guides globaux.

### Pastille « nouveau »

Un espace a du « nouveau » pour l'utilisateur courant si :

```
max(guides.updated_at  WHERE space = X  AND is_published)  >  guide_acks.last_seen_at
```

ou s'il n'existe aucun ack pour `(user, space)`. À l'**ouverture** du drawer → upsert
de `guide_acks` à `now()` → la pastille disparaît. Stocké en base → cross-device.

### Sélection de la langue

Le lecteur lit `title[lang]` / `body_md[lang]` avec `lang = useLang()`
(`@/lib/platform/i18n`). **Fallback** si la traduction manque : `fr`, puis première
langue non vide → jamais de contenu vide. Changer la langue via le `LanguageSwitcher`
global re-rend le guide.

## RLS

- **`guides`**
  - lecture des lignes `is_published = true` : tout utilisateur authentifié ;
  - lecture des brouillons + insert/update/delete : admins uniquement
    (`master_admin` / `competition_admin` / `club_admin`), via les helpers de rôle
    existants utilisés par les autres tables RSA.
- **`guide_acks`** : chaque utilisateur ne lit/écrit que ses propres lignes
  (`user_id = auth.uid()`).

Migration appliquée via MCP Supabase (projet `uaoucznptxmvhhytapso`), avec `search_path`
fixé sur toute fonction créée et `revoke ... from anon` selon le pattern hardening du repo.
Ajouter `guides` et `guide_acks` à la publication `supabase_realtime` n'est **pas**
nécessaire (pas de temps réel requis ; React Query suffit).

## Côté lecteur — drawer

Bouton `GuideTrigger` (icône `?` + libellé « Guide ») dans le header de chaque espace.
Clic → `GuidePanel` : panneau latéral droit (~480px, full-screen mobile) réutilisant le
pattern `SessionDetailDrawer.jsx` (framer-motion `AnimatePresence` + `motion.aside`,
overlay, fermeture Escape / clic-dehors, barre titre à la palette de l'espace).

```
Header espace (ex: Jury)
┌──────────────────────────────────────────────────────────┐
│  Jury · Session #3                         [ ? Guide •]   │  • = pastille gold « nouveau »
└──────────────────────────────────────────────────────────┘

Drawer ouvert :
                          ┌───────────────────────────────────┐
                          │ ▌ Guide — Espace Jury        [✕]  │
                          ├───────────────────────────────────┤
                          │  ▸ Comment noter un dossier       │  articles publiés
                          │  ▾ Le déroulé d'une session       │  (accordéon, sort_order)
                          │     [markdown rendu]              │
                          │  ▸ Questions fréquentes           │
                          ├───────────────────────────────────┤
                          │  Dernière mise à jour : 28 mai    │
                          └───────────────────────────────────┘
```

- Contenu = tous les articles publiés de l'espace (résolus global/compétition), en
  accordéon trié par `sort_order`, un panneau ouvert à la fois.
- **Zéro guide publié pour l'espace → pas de bouton** (pas de coquille vide).
- À l'ouverture → ack upserté.

## Côté admin — module « Guides »

Nouvelle entrée dans l'espace Admin, suit le pattern `AdminShell` + `CockpitTabs`.
Filtres : `space` + portée (Global / Compétition courante).

```
Admin › Guides
┌─────────────────────────────────────────────────────────────┐
│ Espace: [Jury ▾]   Portée: [● Global  ○ Compétition: RSA26]  │
│                                              [ + Nouvel art. ]│
├─────────────────────────────────────────────────────────────┤
│  ⠿  Comment noter un dossier          [Publié]    ✎  🗑      │  ⠿ = drag réordonner
│  ⠿  Le déroulé d'une session          [Publié]    ✎  🗑      │
│  ⠿  Questions fréquentes              [Brouillon] ✎  🗑      │
└─────────────────────────────────────────────────────────────┘

Éditeur :
┌─────────────────────────────────────────────────────────────┐
│ Langue:  [ FR ]  EN   DE         ← onglets ; • = langue remplie│
│ Titre  [______________________________________]             │
│ Corps (markdown)              │  Aperçu                      │
│ ┌───────────────────────────┐ │ ┌──────────────────────────┐ │
│ │ ## Étapes …               │ │ │ Étapes …                 │ │
│ └───────────────────────────┘ │ └──────────────────────────┘ │
│ [ ] Publié                              [ Annuler ] [ Enreg. ]│
└─────────────────────────────────────────────────────────────┘
```

- 3 onglets FR/EN/DE éditent `title[lang]` / `body_md[lang]`. Pastille `•` = langue
  remplie. Aucune langue obligatoire (le fallback lecteur gère les trous).
- Réordonnancement par drag → met à jour `sort_order`.
- Bascule Publié/Brouillon par article.

## Découpage en composants

| Unité | Rôle | Dépend de |
|---|---|---|
| Entité `Guide` + `GuideAck` (`@/lib/db`) | accès données via wrapper db.js existant | supabase |
| `useGuides(space, editionId)` | fetch + résolution héritage + flag « nouveau » + ack | React Query, db |
| `GuideTrigger` | bouton `?` + pastille dans le header | useGuides |
| `GuidePanel` | drawer lecteur (accordéon + markdown + fallback langue) | framer-motion, react-markdown, useGuides |
| `admin/guides/GuidesManager` | liste + réordonnancement + filtres portée/espace | AdminShell, CockpitTabs |
| `admin/guides/GuideEditor` | éditeur markdown 3 langues + aperçu | react-markdown |

**Points d'ancrage** : `GuideTrigger` + `GuidePanel` insérés dans les headers des 5
espaces (Admin, Selection, Jury, MonDossier, Concours), chacun passant son `space` et,
si pertinent, l'`edition_id` courante.

Chaque unité a un périmètre unique et testable : `useGuides` encapsule toute la logique
de résolution (héritage compétition, fallback langue, calcul de la pastille), les
composants restent présentation.

## Hors périmètre (YAGNI)

- Page `/Aide` centralisée séparée (le drawer par espace couvre le besoin de référence).
- Auto-ouverture du drawer / visite guidée pas-à-pas.
- Merge ligne-à-ligne des guides hérités (override simple suffit).
- Temps réel (React Query refetch suffit).
- Versionning / historique des articles.
- Recherche plein-texte dans les guides.

## Critères de succès

- Un admin crée/édite/publie/réordonne un article par espace en FR/EN/DE sans toucher
  au code, et le voit apparaître dans le drawer de l'espace.
- Le drawer s'affiche dans la langue du `LanguageSwitcher`, avec fallback propre.
- La pastille « nouveau » apparaît tant que l'utilisateur n'a pas ouvert le guide de
  l'espace (ou si un article a été mis à jour depuis), et persiste cross-device.
- Un override de compétition masque les guides globaux pour cette compétition.
- Aucun bouton affiché si l'espace n'a aucun article publié.
- RLS : un non-admin ne voit jamais les brouillons et ne peut pas écrire.
```
