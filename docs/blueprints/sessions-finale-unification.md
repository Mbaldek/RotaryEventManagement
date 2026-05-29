# Feature blueprint — Sessions/Finale unification (admin cockpit)

> **Status.** Architectural decision recorded — not yet implemented.
> **Owner.** Plateforme RSA (`app.rotary-startup.org`).
> **Surfaces touchées.** `CompetitionEditView` (master/competition admin),
> `ClubCockpit` (club admin), `PilotageTab`.
> **Compagnons.**
> - Audit : [`../design/design-upgrade-audit.md §3.7`](../design/design-upgrade-audit.md#37-schisme-architectural-finalesessions-cockpit-admin)
> - Blueprint design : [`../design/design-upgrade-blueprint.md §4.17`](../design/design-upgrade-blueprint.md#417-cockpit-admin--finale-fold-into-sessionstab)
> - Catalogue patterns : [`../design/ui-patterns-catalog-generic.md §5.9`](../design/ui-patterns-catalog-generic.md#59-kind-aware-session-detail-drawer)

---

## 1. Postulat

Une **finale est une session**. Pas un objet à part. Aujourd'hui le cockpit
admin traite les deux comme des entités distinctes :

- Onglet **Sessions** → `kind='qualifying'` (CRUD via `SessionsManager` →
  `rsa_create_session` RPC).
- Onglet **Finale** → `kind='finale'` (CRUD via un chemin parallèle :
  `FinaleSessionRow` + `useCreateFinale` + flag éditorial `editions.has_finale`
  + jsonb `editions.finale_config` + table `platform_finale_membership`).

Les deux finissent par insérer dans la même table `sessions`. Le schisme est
purement UX, et il a deux conséquences :

1. **Crash silencieux** quand l'admin coche `has_finale` (cf. ticket origine —
   `FinaleManagement` se monte avec des hooks qui peuvent échouer sur une
   édition fraîche sans pool/champions/session finale, et le state local
   `values.has_finale` n'est même pas hydraté depuis `competition`).
2. **Modèle mental incohérent** : un club peut faire *aussi* sa finale interne
   en plus de ses sessions qualificatives. Aujourd'hui ce cas n'est pas
   adressable proprement — l'onglet « Finale » suppose une **unique** session
   `kind='finale' AND club_id IS NULL` (la grande finale fédérée), pas une
   finale locale de club.

---

## 2. Modèle cible

### 2.1 Une seule primitive : `sessions`

| Cas | `kind` | `club_id` | Géré dans |
| --- | ------ | --------- | --------- |
| Session qualificative de club | `qualifying` | `<club>` | Club cockpit > Setup |
| Finale interne d'un club (V2.5+) | `finale` | `<club>` | Club cockpit > Setup |
| Grande finale fédérée multi-club | `finale` | `NULL` | Compétition admin > Sessions |
| Finale monoclub (1 club, 1 finale) | `finale` | `<club>` | Club cockpit > Setup |

Le **club_id** porte toute la sémantique (locale vs fédérée). Plus de drapeau
`has_finale` séparé sur `editions`.

### 2.2 Source d'autorité

- **Création/édition** d'une session → toujours via `rsa_create_session` /
  `rsa_update_session` RPCs (l'update RPC reste à écrire si elle n'existe pas,
  cf. note dans [`SessionsManager.jsx:11`](../../src/components/rsa/admin/platform/SessionsManager.jsx#L11)).
- **Champs éditoriaux de la finale** (nom long, lieu, format pitch/QA, top-N
  par session source, jury_pool_size) → migrent de `editions.finale_config`
  jsonb → `sessions.session_config` jsonb sur la **ligne finale**. Cohérent
  avec les sessions qualificatives qui stockent déjà leur config dans
  `session_config`.
- **Pool des promus** (`platform_finale_membership`) → inchangé côté DB, mais
  exposé comme **sous-bloc du drawer de la session finale**, pas comme onglet
  séparé.

### 2.3 Dérivation, pas drapeau

`editions.has_finale` devient **dérivé** :
```sql
EXISTS (SELECT 1 FROM sessions WHERE edition_id = e.id AND kind = 'finale')
```

→ on peut soit le calculer côté client (`useCountsForEdition` connaît déjà la
liste), soit garder la colonne pour les performances mais la maintenir via un
trigger DB. **Préférence** : drop la colonne, calcul client (1 boolean dérivé
d'une liste déjà chargée, zéro overhead).

`editions.finale_config` → **drop**. Migration : merger les valeurs existantes
dans `sessions.session_config` de la session finale correspondante (s'il y en
a une), puis drop la colonne.

---

## 3. Impact UX

### 3.1 Onglets du cockpit compétition

**Avant** (10 onglets) :
```
Pilotage · Identité · Calendrier · Clubs · Règles · Prix · Formulaires
· Sessions · Finale · Communication · Rôles
```

**Après** (9 onglets) :
```
Pilotage · Identité · Calendrier · Clubs · Règles · Prix · Formulaires
· Sessions · Communication · Rôles
```

L'onglet Finale **disparaît**. Sessions absorbe.

### 3.2 SessionsTab unifié

[`SessionsTab.jsx`](../../src/components/rsa/admin/platform/master/competition-tabs/SessionsTab.jsx)
agrège déjà toutes les sessions par club en lecture seule. Évolutions :

- **Bandeau "Grande Finale"** en tête de la liste (avant les clubs), affiché
  si une session `kind='finale' AND club_id IS NULL` existe.
  - Si elle n'existe pas → bouton **« Créer la grande finale »** ouvre le form
    inline de `SessionsManager` pré-rempli (`kind='finale'`, `club_id=null`,
    `position=999`).
  - Si elle existe → carte cliquable qui ouvre le **drawer kind-aware** (§3.3).
- **Section "Finales locales"** (V2.5+) : si un club a une session
  `kind='finale' AND club_id=<club>`, elle apparaît dans son groupe avec un
  pill discret « Finale interne ».

La création des sessions qualificatives **reste dans le Club Cockpit** (modèle
existant). La grande finale fédérée se crée **dans Sessions** (puisqu'aucun
club ne la possède).

### 3.3 Drawer kind-aware (pattern `D-K`)

Cf. [`ui-patterns-catalog-generic.md §5.9`](../design/ui-patterns-catalog-generic.md#59-kind-aware-session-detail-drawer).

Tout drawer/édition de session affiche **les blocs communs** + des **blocs
bonus selon `kind`** :

| Bloc | `qualifying` | `finale` (club) | `finale` (fédérée) |
| ---- | :----------: | :-------------: | :----------------: |
| Identité (nom, date, lieu, format pitch/QA) | ✓ | ✓ | ✓ |
| Lien Teams / streaming | ✓ | ✓ | ✓ |
| Jury assigné | ✓ | ✓ | ✓ |
| Startups affectées | ✓ | ✓ | — |
| **Top-N à promouvoir** (`session_config.promote_top_n`) | ✓ | — | — |
| **Pool des finalistes promus** (lecture `platform_finale_membership`) | — | ✓ | ✓ |
| **Source des qualifiés** (sessions qualif → ce finale) | — | ✓ | ✓ |
| **Champions par club** | — | — | ✓ |

Les blocs bonus s'ouvrent en accordéon dans le même drawer — pas de second
onglet. Préserve la cohérence : « j'édite UNE session, peu importe son kind ».

### 3.4 Pilotage

[`PilotageTab`](../../src/components/rsa/admin/platform/master/competition-tabs/PilotageTab.jsx)
doit remplacer la ligne « Finale configurée ? » (lit `has_finale`) par
« Grande finale planifiée ? » (lit `sessions.some(s => s.kind==='finale' && !s.club_id)`).
CTA pointe vers l'onglet Sessions + scroll vers le bandeau.

---

## 4. Migration

### 4.1 SQL

```sql
-- 1. Garantir un session_config par session finale (idempotent).
INSERT INTO session_config (session_id, ...)
SELECT s.id, ...
FROM sessions s
LEFT JOIN session_config sc ON sc.session_id = s.id
WHERE s.kind = 'finale' AND sc.session_id IS NULL;

-- 2. Merger editions.finale_config dans session_config de la session finale.
UPDATE session_config sc
SET payload = sc.payload || e.finale_config
FROM sessions s
JOIN editions e ON e.id = s.edition_id
WHERE sc.session_id = s.id
  AND s.kind = 'finale'
  AND s.club_id IS NULL
  AND e.finale_config <> '{}'::jsonb;

-- 3. Drop des colonnes éditoriales devenues redondantes.
ALTER TABLE editions DROP COLUMN finale_config;
ALTER TABLE editions DROP COLUMN has_finale;
```

**Note** : `session_config` schema doit être vérifié — si les clés
`name`/`location`/`format`/`promote_top_n` n'existent pas encore, ajouter une
sous-clé `finale` namespace pour éviter les collisions.

### 4.2 Code

| Fichier | Action |
| ------- | ------ |
| [`CompetitionEditView.jsx`](../../src/components/rsa/admin/platform/master/CompetitionEditView.jsx) | Drop l'entrée `finale` du tableau `tabs`. Drop les imports `FinaleSection` + `FinaleManagement`. Drop `has_finale`/`finale_config` de `initialValues`. |
| [`FinaleSection.jsx`](../../src/components/rsa/admin/platform/master/competition-tabs/FinaleSection.jsx) | **Delete**. Sa logique de config migre dans le drawer kind-aware. |
| [`FinaleTab.jsx`](../../src/components/rsa/admin/platform/master/tabs/FinaleTab.jsx) | **Delete** (export legacy déjà déprécié 2026-05-29). Garder `FinalePoolSection` + `ChampionsByClub` comme blocs réutilisés par le drawer. |
| [`SessionsTab.jsx`](../../src/components/rsa/admin/platform/master/competition-tabs/SessionsTab.jsx) | Ajouter le bandeau Grande Finale (§3.2). Réutiliser `SessionsManager` pour la création de la finale fédérée. |
| [`PilotageTab.jsx`](../../src/components/rsa/admin/platform/master/competition-tabs/PilotageTab.jsx) | Remplacer le check `has_finale` par dérivation depuis la liste sessions. |
| [`usePilotageStatus.js`](../../src/components/rsa/admin/platform/master/usePilotageStatus.js) | Idem. |
| [`useMaster.js`](../../src/components/rsa/admin/platform/master/useMaster.js) | Garder `useFinale`, `useFinalePool`, `useFinalistsForEdition` — ils alimentent le drawer kind-aware. Drop `useCreateFinale` (remplacé par `useCreateSession` avec `kind='finale'`). |

### 4.3 Ordre d'exécution

1. **Code first, schema second.** Faire pointer les composants vers
   `sessions.session_config` (avec fallback `editions.finale_config` tant que
   la colonne existe).
2. Ship, observer, vérifier qu'aucune lecture résiduelle de `has_finale` /
   `finale_config` ne survit.
3. Migration SQL (steps 1-3 de §4.1).
4. Cleanup : retirer les fallbacks.

Évite la fenêtre où le code lit une colonne déjà droppée.

---

## 5. Critères d'acceptation

- [ ] Le cockpit compétition n'a plus d'onglet « Finale ».
- [ ] Créer la grande finale fédérée se fait depuis `Sessions` via le même
      formulaire que les sessions qualificatives (juste `kind='finale'` +
      `club_id=null` pré-sélectionnés).
- [ ] Le drawer d'une session `kind='finale'` affiche pool + champions +
      sources, sans nouvel onglet.
- [ ] Un club peut créer une session `kind='finale'` dans son cockpit sans
      casser l'admin compétition.
- [ ] `editions.has_finale` et `editions.finale_config` ne sont plus lus ni
      écrits par aucun fichier `src/**`.
- [ ] Migration SQL passée sans perte : tous les `finale_config` existants
      retrouvés dans `session_config` de la session finale correspondante.
- [ ] Pilotage affiche correctement « grande finale planifiée » sans lire
      `has_finale`.

---

## 6. Risques

| Risque | Mitigation |
| ------ | ---------- |
| Sessions de kind `finale` créées par accident dans des clubs (boutons trop accessibles) | Le kind reste un select explicite, pas un default. Pill discret « Finale » dans la liste. |
| `editions.finale_config` contient des champs custom inattendus | Audit avant migration ; le merge est non-destructif (`||`). |
| Le pool `platform_finale_membership` reste reliquat si la session finale est supprimée | RPC `rsa_delete_session` doit cascader ou refuser si pool non vide. À vérifier. |
| Régression sur l'URL `/Admin?tab=live&edition=X&session=Y` (deeplink utilisé dans `FinaleSessionRow`) | Le deeplink reste valide — la session existe toujours, juste accédée via un autre chemin. |
| V2 multi-club : la grande finale fédérée doit savoir agréger les top-N de chaque session qualificative cross-club | Déjà couvert par `rsa_publish_session` qui projette via `finalists_per_session` + override `promote_top_n` ; pas d'impact archi sur cette refonte. |

---

## 7. Estimation

- Code (composants + tests) : **~4h**
- Migration SQL + vérification : **~1h**
- Cleanup fallbacks après ship : **~30 min**

Total : **~5h30**. À planifier après stabilisation V2.

---

## 8. Décisions ouvertes

1. **`editions.has_finale` : drop ou trigger ?** Recommandation : drop (calcul
   client trivial). Trade-off : 1 ligne de code en moins côté DB, 1 ligne en
   plus côté hook.
2. **Drawer kind-aware : composant unique ou switch par kind ?** Recommandation :
   composant unique avec sections conditionnelles (les blocs sont des
   sous-composants déjà extraits — pas de divergence visuelle utile).
3. **Le club peut-il créer sa propre finale interne *aujourd'hui* ?** Non —
   le UI club cockpit ne propose que `qualifying` pour l'instant. La fusion
   débloque ce cas mais ne le livre pas. Backlog V2.5.
