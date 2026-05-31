# Blueprint — Héritage compétition → club des règles d'éligibilité & des prix (multiclub)

> **Statut** : validé en brainstorming (2026-05-31). Spec d'exécution.
> **Scope** : compétitions `editions.model = 'multiclub'`. Cockpit Club (RulesTab, PrizesTab),
> éditeur d'éligibilité partagé, RPC d'évaluation, twin JS, funnel candidature (preview).
> **Hors scope** : compétitions monoclub (le club *est* la compétition, pas d'héritage) ;
> override des prix de la compétition (modèle **additif** retenu) ; approbation/workflow
> de validation des écarts (self-serve).
> **Réf. patterns** : [`ui-patterns-catalog-generic`](../design/ui-patterns-catalog-generic.md)
> (badges d'état, hairline rows, messages d'aide muted, filet gold).

---

## 1. Problème

En compétition **multiclub**, les règles d'éligibilité et les prix sont définis **au niveau
de la compétition**. Le besoin produit (validé) :

1. **Le club peut surcharger** (bypasser) ces règles/prix…
2. …mais on **affiche** systématiquement celles de la **compétition** (l'hérité), et on
   **communique** pour **limiter les variations** au niveau club (équité inter-clubs).

### 1.1 Constat dans le code (vérifié)

| Fait | Source |
|---|---|
| L'évaluation d'éligibilité utilise **uniquement** `editions.eligibility_rules`. | [`20260527_rsa_module1_hardening.sql:277`](../../supabase/migrations/20260527_rsa_module1_hardening.sql#L277) : `v_rules := coalesce(v_ed.eligibility_rules, '{}')` |
| `edition_clubs.eligibility_rules` existe mais **n'est jamais lu** à l'évaluation → **données inertes**. | [`20260529_rsa_v2_multiclub_schema.sql:55`](../../supabase/migrations/20260529_rsa_v2_multiclub_schema.sql#L55) |
| Le RulesTab club édite cet override en **full-replace** et **n'affiche pas** les règles compétition. | [`club/tabs/RulesTab.jsx`](../../src/components/rsa/admin/platform/club/tabs/RulesTab.jsx) |
| Le tab **Prix du club existe déjà** (`PrizesList scope="club"`), mais sans bloc compétition lecture seule. | [`club/ClubCockpit.jsx:315`](../../src/components/rsa/admin/platform/club/ClubCockpit.jsx#L315) |

**Conséquence** : *« le club peut bypasser »* est aujourd'hui **faux** (cosmétique). Le feature
doit (a) rendre l'override **réel**, (b) **afficher** l'hérité, (c) **communiquer**.

### 1.2 Décisions produit (brainstorming 2026-05-31)

- **Règles** : override **par critère** (hérite/surcharge), pas full-replace.
- **Sens** : le club peut **durcir OU assouplir** (aucun blocage technique), on **signale** la divergence.
- **Évaluation** : on **câble le merge réel** (sinon le bypass reste inerte).
- **Prix** : compétition en **lecture seule** chez le club + le club **ajoute** ses prix locaux (additif, pas d'override).
- **Autorisation** : `club_admin` **self-serve** ; chaque écart est **visible** (badge + compteur).

---

## 2. Modèle de données — merge par critère (override *sparse*)

Le catalogue d'éligibilité compte 7 critères, chacun = **un bloc top-level autonome**
`{ behavior, ...params }` ([`eligibility/catalog.js`](../../src/components/rsa/eligibility/catalog.js)).
On exploite cette structure : la clé top-level **est** l'unité d'héritage.

```
editions.eligibility_rules     (SSOT compétition, inchangé)
        { country:{FR,DE,exclu}, created_after:{2020,exclu}, revenue_max:{500K,flag} }

edition_clubs.eligibility_rules (override SPARSE — seulement les clés surchargées)
        { created_after:{2021,exclu}, revenue_max:{behavior:'off'} }

effective = competition ⊕ club_overrides   (merge SHALLOW par clé)
        { country:{FR,DE,exclu}, created_after:{2021,exclu}, revenue_max:{behavior:'off'} }
                                  ▲ surchargé          ▲ désactivé par le club (assoupli)
```

**Règles de merge :**

- **Clé absente** de l'override → critère **hérité** de la compétition.
- **Clé présente** → le critère **entier** est remplacé par la valeur club (pas de merge profond intra-critère : net, lisible, et aligné sur le format catalogue).
- **Désactiver un critère hérité** (assouplir) → override `{ key: { behavior: 'off' } }`
  (`evaluateEligibility` ignore déjà `behavior:'off'` via `isActive`).

**Implémentation du merge — symétrique SQL/JS :**

- **SQL** : `coalesce(v_ed.eligibility_rules,'{}') || coalesce(v_ec.eligibility_rules,'{}')`
  — l'opérateur `||` jsonb fait exactement le merge shallow (droite > gauche).
- **JS** : `{ ...competition, ...clubOverrides }` — même sémantique.
- **Helper partagé** : nouvelle fonction `mergeEligibilityRules(competition, overrides)` dans
  [`src/lib/rsa/eligibility.js`](../../src/lib/rsa/eligibility.js) (réutilisée par le funnel + tout preview front).

**Monoclub** : `editions.model='monoclub'` → pas d'héritage (le club *est* la compétition).
Le merge ne s'applique que si une ligne `edition_clubs` existe ; sinon `effective = competition`.

---

## 3. Migration SQL (évaluation réelle)

**Fichier** : `supabase/migrations/<date>_rsa_v25_club_rules_inheritance.sql`

1. **`rsa_submit_dossier`** — avant l'appel à `rsa_evaluate_eligibility` :
   ```sql
   -- résoudre l'override du club du dossier (sparse), puis merge shallow.
   select eligibility_rules into v_ec_rules
     from public.edition_clubs
    where edition_id = v_row.edition_id and club_id = v_row.club_id;
   v_rules := coalesce(v_ed.eligibility_rules,'{}'::jsonb) || coalesce(v_ec_rules,'{}'::jsonb);
   v_eval  := public.rsa_evaluate_eligibility(v_row, v_rules) || jsonb_build_object('evaluated_at', …);
   ```
   - Garde-fou : si `v_row.club_id is null` (legacy/monoclub) → `v_ec_rules` reste null → `effective = competition`.
2. **Audit** (optionnel, recommandé) : ajouter dans le snapshot `eligibility` un champ
   `rules_scope` = `'competition'` | `'club_override'` (selon que `v_ec_rules` est non-vide) pour traçabilité.
3. **Tout autre site de (ré)évaluation** : grep `rsa_evaluate_eligibility(` — appliquer le même merge partout (ex. une éventuelle RPC de re-éval admin). Aucune si non trouvé.
4. **Compat données** : `edition_clubs.eligibility_rules` était documenté *full-replace* (inerte).
   On bascule en *sparse-merge*. Comme c'est inerte et les données V2 quasi-vierges, risque faible.
   Migration de nettoyage : si une ligne contient un objet « complet » identique à la compétition,
   le réduire à `{}` (sinon il « gèle » tous les critères). À faire data-aware au déploiement.
5. **search_path + grants** : épingler `search_path=public`, conserver les `revoke from public` /
   `grant execute … to authenticated` du pattern existant (cf. memory hardening RSA).

---

## 4. Twin JS + funnel candidature (preview cohérent)

- [`src/lib/rsa/eligibility.js`](../../src/lib/rsa/eligibility.js) `evaluateEligibility(startup, rules)`
  prend **un seul** objet rules → le funnel doit lui passer **les règles effectives**.
- Ajouter `mergeEligibilityRules(competition, overrides)` (cf. §2) et l'appeler **avant** la preview.
- **Sites funnel** à câbler (à confirmer au planning) :
  - [`candidature/useCandidature.js`](../../src/components/rsa/candidature/useCandidature.js) — fetch des règles : ajouter le fetch `edition_clubs.eligibility_rules` du **club sélectionné** ([StepClub](../../src/components/rsa/candidature/steps/StepClub.jsx)) et merger.
  - [`candidature/EligibilityPreview.jsx`](../../src/components/rsa/candidature/EligibilityPreview.jsx) — consomme les règles effectives (rien à changer si on lui passe le merge).
- Le candidat **n'a pas de club avant StepClub** → tant qu'aucun club choisi, preview sur règles compétition ; après choix, re-preview sur effectives.

---

## 5. UI — RulesTab club, refonte « par critère »

```
ÉLIGIBILITÉ — CLUB PARIS                              hérite de · RSA 2027
┌ Les règles sont fixées au niveau de la compétition. Votre club en hérite.
│ Vous pouvez surcharger un critère, mais limitez les écarts : une compétition
│ multiclub reste plus juste si les clubs partagent les mêmes critères.        ┘  (message muted, filet gold)

  Pays               hérité · FR, DE — exclu                          ✎ Surcharger
  Créée après        ● SURCHARGÉ · ≥ 2021    (compét. : ≥ 2020)   ↺ Rétablir   [éditeur du critère]
  CA < seuil         hérité · 500 000 € — flag                        ✎ Surcharger
  Levée < seuil      ● DÉSACTIVÉ PAR LE CLUB  (compét. : 800 000 €) ↺ Rétablir
  Immatriculation    hérité · flag                                    ✎ Surcharger
  Fondateurs major.  hérité · flag                                    ✎ Surcharger
  Documents requis   hérité · pitch deck, exec summary — exclu        ✎ Surcharger

  ⚠ 2 critères divergent de la compétition          [Enregistrer]
```

- **Une ligne par critère** du catalogue. État par défaut = **hérité** (valeur compétition en muted) + bouton **Surcharger**.
- **Surchargé** : badge `● SURCHARGÉ`, rappel `(compét. : …)`, l'éditeur inline du critère, bouton **↺ Rétablir** (= supprime la clé de l'override → réhérite).
- **Désactivé par le club** (assoupli) : badge `● DÉSACTIVÉ PAR LE CLUB` (override `{behavior:'off'}`).
- **En-tête** : `hérite de · <compétition>` + **compteur de divergence** (`N critères divergent`).
- **Persistance** : on n'enregistre dans `edition_clubs.eligibility_rules` **que les clés surchargées** (objet sparse) via le hook existant [`useSaveClubEligibilityRules`](../../src/components/rsa/admin/platform/club/useClub.js#L131) (RPC `rsa_attach_club_to_edition`, upsert idempotent — inchangé).

### 5.1 Composant — étendre `EligibilityRulesEditor`

[`eligibility/EligibilityRulesEditor.jsx`](../../src/components/rsa/eligibility/EligibilityRulesEditor.jsx) gagne un **mode héritage** :

- Nouvelles props : `inheritedValue` (= règles compétition) et `mode='inheritance'`.
- `value` = override **sparse** (et non plus l'ensemble complet).
- Par critère : si la clé est absente de `value` → rendu **hérité** (lecture seule + bouton Surcharger) ; si présente → rendu **éditable** (sous-ligne existante) + Rétablir.
- Réutilise les sous-lignes de critère **existantes** (pas de duplication). Le mode legacy (master, monoclub) reste le comportement actuel (pas d'`inheritedValue` → édition pleine).
- Helpers catalogue (`rulesToState`/`stateToRules`) inchangés ; on ajoute juste la logique « clé présente/absente » au niveau de l'éditeur.

---

## 6. UI — PrizesTab club : bloc compétition lecture seule + additif

Le tab `prizes` existe déjà ([`ClubCockpit.jsx:315`](../../src/components/rsa/admin/platform/club/ClubCockpit.jsx#L315)).
On ajoute **au-dessus** du `PrizesList scope="club"` un bloc lecture seule :

```
PRIX DE LA COMPÉTITION · RSA 2027                              [lecture seule]
  • Grand Prix RSA — 50 000 € — décerné au niveau compétition
  • Prix Spécial Impact — 10 000 €
  ┄ Ces prix sont gérés par l'organisation de la compétition ; votre club n'a pas à les redéfinir.

PRIX DU CLUB PARIS                                            [+ Ajouter un prix]
  (PrizesList scope="club" — inchangé : add/edit/delete/award club-scoped)
```

- Bloc compétition : `useEditionPrizes(editionId)` filtre déjà `club_id IS NULL` → liste read-only (réutiliser les cartes prix en variante non-éditable, ou un rendu list simple).
- Aucune migration prix (modèle additif déjà en base). Pas d'override des prix compétition.

---

## 7. Communication / i18n (FR / EN / DE)

Strings co-localisées dans `club/i18n.js` (`CLUB_RULES`, + nouveau `CLUB_PRIZES`) :

- **En-tête règles** : « Les règles sont fixées au niveau de la compétition. Votre club en hérite. Vous pouvez surcharger un critère, mais limitez les écarts… »
- **Au moment de surcharger** (inline) : « Ce critère ne suivra plus les mises à jour de la compétition. »
- **Badge** : SURCHARGÉ / DÉSACTIVÉ PAR LE CLUB ; **compteur** : « N critère(s) divergent(s) ».
- **Prix** : « Les prix principaux sont décernés au niveau de la compétition. Votre club peut ajouter des prix locaux supplémentaires. »
- Toutes en `{ fr, en, de }` (cf. memory : règles internationales, chrome trilingue).

---

## 8. Autorisation

- `club_admin` (et master/competition admin en aperçu) surcharge en **self-serve** — pas d'approbation.
- La frontière réelle reste **serveur** : RLS `ec_write` ([`20260529…:251`](../../supabase/migrations/20260529_rsa_v2_multiclub_schema.sql#L251)) restreint l'écriture de `edition_clubs` au club_admin du club / master. Vérifier que la policy couvre l'upsert des `eligibility_rules`.
- (V2, hors scope) Récap des divergences inter-clubs côté master.

---

## 9. Critères d'acceptation

- [ ] Multiclub : un override club par critère **prend effet** à la soumission (snapshot `eligibility` reflète les règles effectives).
- [ ] `edition_clubs.eligibility_rules` est **sparse** (seules les clés surchargées y figurent) ; « Rétablir » supprime la clé.
- [ ] Désactiver un critère hérité = `{behavior:'off'}` → critère ignoré à l'éval.
- [ ] RulesTab club affiche **chaque critère** avec son état hérité/surchargé/désactivé + valeur compétition + compteur de divergence.
- [ ] Funnel : preview d'éligibilité utilise les **règles effectives** une fois le club choisi.
- [ ] PrizesTab club : bloc « Prix de la compétition » en lecture seule au-dessus des prix du club.
- [ ] Messages d'héritage présents (règles + prix), trilingues, design éditorial (muted + filet gold, **0 emoji**).
- [ ] Monoclub : aucun changement de comportement (pas d'héritage, RulesTab inchangé).
- [ ] `npm run build` + `npm run lint` verts.

---

## 10. Phasing

| Phase | Périmètre | Dépend |
|---|---|---|
| 1. Helper merge | `mergeEligibilityRules` (JS) + tests unitaires | — |
| 2. Migration éval | `rsa_submit_dossier` merge `||` + audit `rules_scope` + compat data | 1 |
| 3. Funnel preview | fetch override club + merge dans useCandidature / EligibilityPreview | 1 |
| 4. Éditeur héritage | `EligibilityRulesEditor` mode `inheritance` (inheritedValue, sparse) | 1 |
| 5. RulesTab club | refonte par critère (badges, rétablir, compteur, message) | 4 |
| 6. PrizesTab club | bloc compétition read-only + message | — |
| 7. i18n + comms | strings FR/EN/DE règles + prix | 5,6 |
| 8. QA | build, lint, smoke (override→submit→snapshot, rétablir, monoclub inchangé) | 2-7 |

---

## 11. Risques

| Risque | Mitigation |
|---|---|
| Lignes `edition_clubs` existantes en full-replace « gèlent » tous les critères après bascule merge | Migration de nettoyage data-aware (§3.4) ; vérifier le contenu réel avant déploiement. |
| Funnel : club non encore choisi → preview sur mauvaises règles | Preview compétition tant que pas de club ; re-preview après StepClub (§4). |
| `||` jsonb = merge shallow only → un override partiel d'un critère écrase le bloc entier | **Voulu** (unité = critère). Documenté ; l'UI surcharge toujours le critère complet. |
| Divergence silencieuse JS twin vs RPC SQL | Helper unique côté JS + merge identique (`||` ≡ spread) ; test croisé sur un cas. |
| RLS `ec_write` ne couvre pas l'upsert des règles par club_admin | Vérifier/ajuster la policy en phase 2. |
