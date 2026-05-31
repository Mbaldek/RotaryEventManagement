# Blueprint — Allocation par session des candidatures jury

- **Date** : 2026-05-31
- **Statut** : design validé (brainstorming), prêt pour plan d'implémentation
- **Scope** : plateforme `app.rotary-startup.org` — flux jury par compétition
- **Réfs** : `docs/blueprints/jury-application-funnel.md` (funnel amont), `docs/design/ui-patterns-catalog-generic.md` (patterns), `docs/design/mockups/jury-admin-views.html` (mockup matrice validé)

---

## 1. Contexte & problème

Le funnel jury ([JuryFunnel.jsx](../../src/components/rsa/jury-funnel/JuryFunnel.jsx), servi par `/DevenirJury` et `/JuryCandidate`) laisse un candidat postuler **scopé à une compétition**, en cochant les sessions où il est disponible → `jury_applications.availability_session_ids`.

Aujourd'hui le flux de décision est **binaire et déconnecté de la session** :

1. La file de revue ([JuryApplicationsTab.jsx](../../src/components/rsa/admin/platform/club/tabs/JuryApplicationsTab.jsx)) affiche les sessions demandées **en lecture seule** et n'offre qu'**Approuver / Refuser** (tout ou rien sur la personne).
2. `rsa_approve_jury_application` crée le compte + le rôle `jury` (club_memberships) + la fiche `platform_jury_profiles`, **mais aucune ligne `platform_jury_assignments`** : le juré validé est rattaché à **zéro session**.
3. L'affectation par session vit dans un écran séparé, la matrice [JuryAssignmentsAdmin.jsx](../../src/components/rsa/jury/JuryAssignmentsAdmin.jsx), qui **ignore ce que le candidat avait demandé** et liste **tout l'annuaire jury** (`useJurorsDirectory`), pas les candidats de la compétition.

**Besoin** : pouvoir dire « OK, mais seulement pour 1 des 2 sessions demandées ». Ce verbe n'a aujourd'hui aucun endroit où s'exprimer au moment de la décision.

---

## 2. Décisions produit (validées)

| Question | Décision |
|---|---|
| Où se fait l'allocation par session ? | Dans la **matrice enrichie**, pas dans une modale d'approbation. L'UX d'approbation ne change pas. |
| Périmètre de la matrice ? | **Candidats de cette compétition** (candidatures approuvées de l'édition) + leurs sessions demandées. Les jurés invités directement (sans candidature) restent visibles sous « Autres jurés » et sont affectables manuellement. |
| Pré-remplissage ? | **Pré-coché** : l'approbation auto-affecte les sessions demandées ; l'owner **décoche** ce qu'il refuse. |

**Assomptions confirmées :**

1. **Jurés ajoutés directement** (grandes personnalités invitées par l'owner, ou owner qui remplit le funnel à leur place) : **jamais masqués**. S'ils ont une candidature (owner a rempli le funnel) → ils sont des candidats avec wishes. Sinon → ils apparaissent sous « Autres jurés » et sont affectés aux sessions voulues à la main.
2. **Pas de rétro-affectation** : les candidatures approuvées **avant** cette feature gardent 0 affectation auto (l'owner coche à la main). Seules les **nouvelles** approbations sont auto-affectées.

---

## 3. Comportement cible

### 3.1 États d'une case (matrice & vue par session)

| État | Sens | Action au clic |
|---|---|---|
| `✓` (navy plein) | Affecté — ligne réelle dans `platform_jury_assignments` | retire l'affectation |
| `○` (pastille or « demandé ») | Le juré a **demandé** cette session mais elle n'est **pas** affectée (tu l'as retirée, ou pas encore confirmée) | (ré)affecte |
| `[ ]` (vide) | Ni demandé ni affecté | affecte (override owner) |

La pastille « demandé » est la **mémoire de la demande** : elle survit au décochage pour que l'owner sache toujours ce que le juré avait sollicité.

### 3.2 Flux « OK mais 1 sur 2 »

```
Candidat demande S1 + S2  →  Owner approuve (file de revue)
   │ RPC auto-affecte S1 + S2  (pré-coché)
   ▼
Matrice (scopée candidats)
   S1 [✓·demandé]   S2 [✓·demandé]
   │ owner décoche S2
   ▼
   S1 [✓·demandé]   S2 [○ demandé]     ← juré affecté à S1 seulement
```

---

## 4. Architecture & données

### 4.1 Auto-affectation à l'approbation — `rsa_approve_jury_application` (RPC, SECURITY DEFINER)

Patch **additif** dans la branche « l'utilisateur existe » (après le `UPDATE … approved_user_id`, cf. migration `20260530_rsa_v2_jury_funnel.sql:311`). Idempotent, atomique, ne touche rien d'autre :

```sql
-- Auto-affectation des sessions demandées (validées contre l'édition de la candidature).
-- Idempotent : ON CONFLICT sur le PK composite (jury_user_id, session_id).
INSERT INTO public.platform_jury_assignments (jury_user_id, session_id, created_by)
SELECT v_user_id, s.id, auth.uid()
  FROM public.sessions s
 WHERE s.id = ANY(v_app.availability_session_ids)
   AND (v_app.edition_id IS NULL OR s.edition_id = v_app.edition_id)
ON CONFLICT (jury_user_id, session_id) DO NOTHING;
```

- S'exécute sur le **passage finalisant** (quand `v_user_id` existe — soit direct, soit au 2e appel post `invite-user`).
- **Types confirmés via MCP** : `sessions.id` = `text`, `availability_session_ids` = `text[]`, `platform_jury_assignments.session_id` = `text`. → `s.id = ANY(...)` direct, **aucun cast**.
- Aucun nouveau GRANT (même signature). Migration `CREATE OR REPLACE FUNCTION`.
- **Fallback** si on veut éviter de toucher le RPC : boucle client `JuryAssignment.assign()` dans `JuryApplication.approve()` après obtention de `approved_user_id`. Moins atomique → on préfère le serveur.

### 4.2 Source des wishes pour la matrice — hook batché

Nouveau hook (dans [useJuryProfile.js](../../src/components/rsa/jury/useJuryProfile.js), on **n'édite pas** `useJury.js` — règle anti-collision documentée en tête du fichier) :

```
useEditionJuryApplications(editionId)
  → EditionClub.forEdition(editionId) → clubIds
  → Promise.all(clubIds.map(cid => JuryApplication.listByClub(cid, null)))
  → map : { byUserId: Map<user_id, { wishes:Set<sessionId>, status, email }>,
            byEmail:  Map<email,  { … }> }
```

Réutilise exactement le pattern déjà éprouvé par `useJurorWishes` (un seul juré aujourd'hui), généralisé à toute la liste. `wishes` = `availability_session_ids` de la candidature **approuvée** la plus récente.

### 4.3 Matrice — [JuryAssignmentsAdmin.jsx](../../src/components/rsa/jury/JuryAssignmentsAdmin.jsx)

- **Lignes** : ensemble = union de
  - candidats approuvés de l'édition (`useEditionJuryApplications`, résolus via `jurorByUserId`),
  - jurés déjà affectés à une session de l'édition (depuis `useAllAssignments`) même sans candidature → groupe « Autres jurés ».
- **Wishes** : chaque ligne porte `wishes: Set<sessionId>`. Index `requestedIndex` = `Set("user_id|session_id")` pour lookup O(1), en miroir de `assignedIndex`.
- **Rendu de case** : la case calcule `assigned` (existant) **et** `requested`. `○` = `requested && !assigned`. Pastille or discrète (token `GOLD`), pas d'emoji (cohérent `sessionMarker.js`).
- **Vue « Par session »** : le pool d'ajout se **scinde** en deux groupes — « Ont demandé cette session » (jurés dont `wishes.has(session.id)` && non affectés) puis « Autres candidats ». La bande Quorum (`QuorumStrip`) est inchangée.
- Toggle inchangé (`useAssignJuror` / `useUnassignJuror`), donc la mécanique d'écriture est déjà testée.

### 4.4 i18n — [jury/i18n.js](../../src/components/rsa/jury/i18n.js)

Nouveaux libellés trilingues (fr/en/de) : `requestedDot` (« demandé »), `poolRequested` (« Ont demandé cette session »), `poolOthers` (« Autres candidats »), `rowGroupCandidates` (« Candidats de cette compétition »), `rowGroupOthers` (« Autres jurés »), + légende des états de case.

---

## 5. Schéma touché

- **Aucune DDL de table.** `platform_jury_assignments` (PK composite `jury_user_id, session_id`) et `jury_applications` (`availability_session_ids text[]`, `edition_id`, `approved_user_id`) existent déjà.
- **1 migration** : `CREATE OR REPLACE FUNCTION public.rsa_approve_jury_application` avec le bloc d'auto-affectation. Appliquée via MCP Supabase (projet `uaoucznptxmvhhytapso`).

---

## 6. Patterns UI réutilisés (catalog)

- **§5.1 Tables / DataTable** + **§1.5 hairline gold rule** : structure matrice relookée (déjà en place).
- **§5.5 Status pills** + `sessionMarker.getSessionAccent` : pastille « demandé » or, pastilles session muted.
- **§5.6 Empty states / §5.8 error states** : « aucun candidat pour cette compétition ».
- **§8.1 press feedback / §8.2 hover lift** : boutons pool « + Nom ».
- Mockup de référence : `docs/design/mockups/jury-admin-views.html` (toggle Par session / Matrice, quorum strip, pas d'emoji).

---

## 7. Edge cases

| Cas | Traitement |
|---|---|
| Candidature approuvée mais compte pas encore créé (`needs_auth_creation`) | Pas d'`approved_user_id` → pas d'auto-affectation ; elle se fait au passage finalisant post `invite-user`. |
| Session demandée hors édition / id invalide | Le `WHERE s.edition_id = v_app.edition_id` la filtre silencieusement. |
| Re-run du RPC (idempotence) | `ON CONFLICT DO NOTHING` → pas de doublon. |
| Owner décoche puis recoche | toggle standard ; la pastille `○` demandé reste affichée tant que non affecté. |
| Juré invité direct sans candidature | 0 wish → toutes ses cases `[ ]` ; visible sous « Autres jurés » s'il est déjà affecté. |
| Auto-lock d'inscription | **Non concerné** : l'auto-lock (`autoLock.js`) ne ferme que l'auto-inscription via `rsa_apply_jury`. L'affectation admin est indépendante. |
| Candidatures pré-feature (0 affectation) | Pas de rétro-affectation ; coche manuelle. La pastille `○ demandé` les guide quand même (les wishes sont historisés). |

---

## 8. Fichiers

| Fichier | Nature |
|---|---|
| `supabase/migrations/<date>_jury_autoassign_on_approve.sql` | nouveau — RPC patché |
| `src/components/rsa/jury/useJuryProfile.js` | + `useEditionJuryApplications(editionId)` |
| `src/components/rsa/jury/JuryAssignmentsAdmin.jsx` | scope candidats, états de case `○`, pool scindé, groupes de lignes |
| `src/components/rsa/jury/i18n.js` | + libellés trilingues |

---

## 9. Plan de vérification

1. **Migration** : appliquer via MCP, re-jouer `rsa_approve_jury_application` sur une candidature test → vérifier `platform_jury_assignments` peuplé pour les sessions demandées (et pas les autres).
2. **Idempotence** : ré-approuver → pas de doublon.
3. **UI matrice** : candidat avec S1+S2 demandés → 2 cases `✓·demandé` ; décocher S2 → `○ demandé` ; total quorum décrémenté.
4. **Vue par session** : pool « Ont demandé cette session » vs « Autres ».
5. **Juré invité direct** : apparaît sous « Autres jurés », affectable, 0 pastille demandé.
6. **Build** : `npm run build` + `npm run lint` verts.

---

## 10. Hors scope (YAGNI)

- Statut d'acceptation/refus **par session** distinct (rejeté au profit du toggle simple).
- Email au candidat précisant les sessions confirmées (peut venir plus tard via Email Studio).
- Modale picker à l'approbation (rejetée — l'allocation vit dans la matrice).
