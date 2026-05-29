# RLS Audit V3.0 — Plateforme RSA

**Date :** 2026-05-28
**Scope :** toutes les tables `public.*` + buckets `storage.*` impliqués par la
plateforme RSA (modules 1–4, V2 multi-club, V2.5 prix/concours/jury funnel).
Sources : `supabase/migrations/*.sql` (27 fichiers, 6761 lignes SQL).
**Méthode :** reconstruction de la map RLS depuis les migrations (single source
of truth).

## TL;DR — verdict par table

Legend : OK = policies cohérentes, surface fermée. ATTENTION = potentiellement
trop permissif mais accepté avec justification. ISSUE = faille ou manquant.

| Table / Bucket                          | RLS  | Status | Note |
|-----------------------------------------|------|--------|------|
| `editions`                              | ON   | OK | drafts gated, eligibility_rules exposed accepté |
| `sessions`                              | ON   | ATTENTION | `using (true)` — exposition publique large (clubs/dates) |
| `startups`                              | ON   | OK | applicant/staff splits, trigger guard `prize/status` |
| `selection_reviews`                     | ON   | OK | 4 policies fines, jury read autorisé pour contexte |
| `app_user_roles`                        | ON   | OK | écriture service_role/RPC-only, self_read |
| `profiles`                              | ?    | ISSUE | aucune migration n'enable RLS — héritage déjeuners |
| `clubs`                                 | ON   | OK | read public, write master_admin |
| `club_memberships`                      | ON   | OK | self/master/club_admin scoping correct |
| `edition_clubs`                         | ON   | OK | read public (nécessaire candidature) |
| `prizes`                                | ON   | OK | read public, write conditionnel kind/club |
| `jury_applications`                     | ON   | ATTENTION | INSERT anon avec `WITH CHECK true` — voir N1 |
| `email_templates`                       | ON   | OK | club-scoped policies bien construites |
| `email_sends`                           | ON   | OK | insert/update/delete DENY — service_role only |
| `admin_audit_log`                       | ON   | OK | DENY total côté JWT, RPC SECURITY DEFINER bypass |
| `platform_jury_profiles`                | ON   | OK | self_update + role-gated read |
| `platform_jury_assignments`             | ON   | OK | read multi-rôle, write admin only |
| `platform_jury_score_drafts`            | ON   | OK | strictement self + assignment + session_live |
| `platform_jury_scores`                  | ON   | OK | direct INSERT/UPDATE DENY, RPC seul |
| `session_config` (legacy reused)        | ON   | ISSUE | `using (true) with check (true)` — over-exposure |
| `rsa_finale_rsvp` (legacy 2026)         | ON   | ATTENTION | `public_all_rsvp` open total, admin secret côté client |
| `chat_messages` (legacy déjeuners)      | ON   | OK | full lock + RPC seat-token only |
| `app_config` (admin secret bcrypt)      | ON   | OK | revoke all + RPC bcrypt verify |
| Bucket `storage.dossiers`               | ON   | OK | path-scoped per startup, comité/admin write |
| Bucket `storage.jury-photos`            | ON   | ATTENTION | INSERT anon `bucket_id = 'jury-photos'` |
| Bucket `storage.uploads` (legacy public)| ON   | ISSUE | bucket `public=true` — PII candidat fuit |

**Compte agrégé :**
- OK (vert) : 16
- ATTENTION (jaune) : 4
- ISSUE (rouge) : 3

Les 3 ISSUE rouges sont des **dettes de migration legacy 2026** (héritées de
l'app déjeuners) qui n'ont pas été touchées par la refonte V1→V2.5. Aucune
nouveauté V2.5 n'introduit de faille — la plateforme moderne est saine.
Voir section "Recommandations" pour le plan de remédiation.

---

## Détail par table

### `editions` ✅ OK

**RLS :** ON (foundation §6).

**Policies :**

| Nom | Action | USING / WITH CHECK | Lit |
|-----|--------|--------------------|-----|
| `editions_read` (module1_prep) | SELECT | `status <> 'draft' OR has_platform_role('admin'\|'comite')` | anon + auth |
| `editions_admin` (foundation) | ALL | `has_platform_role('admin')` | auth admin |

**Qui peut faire quoi :**
- **anon / candidat** : lit toutes les éditions non-draft, y compris
  `eligibility_rules` JSONB (seuils CA/levée). Trade-off documenté dans la
  migration (le funnel candidature affiche déjà ces seuils en preview).
- **comité / admin** : lit les drafts en plus.
- **admin** : seule écriture autorisée.

**Notes :**
- `editions_admin` n'inclut PAS master_admin/club_admin en V2 multi-club —
  l'écriture d'éditions reste master_admin via la RPC `rsa_create_competition`
  (qui bypass la RLS via SECURITY DEFINER). Correct.
- La CHECK constraint `editions_status_check` (m4a) garantit aussi qu'on ne
  peut pas écrire un status hors enum.

---

### `sessions` ⚠️ ATTENTION

**RLS :** ON (foundation §6).

**Policies :**

| Nom | Action | USING / WITH CHECK |
|-----|--------|--------------------|
| `sessions_read` (foundation) | SELECT | `true` |
| `sessions_admin` (foundation) | ALL | `has_platform_role('admin')` |

**Qui peut faire quoi :**
- **Anyone (anon inclus)** : SELECT total — id, edition_id, club_id, name, theme,
  kind, session_date, position. Pas de PII candidat ; mais expose
  l'organisation interne (sessions de clubs en préparation pour 2027/2028).
- **admin** : ALL.

**Pourquoi ATTENTION (pas ISSUE) :**
- Le commentaire de migration justifie : "sessions = données de référence non
  sensibles, volontairement publiques pour la landing".
- Mais en V2 multi-club, `club_id` est exposé → un attaquant connaît la map
  complète "tel club organise telle session", ce qui n'a pas de risque mais
  est un manque de discrétion B2B.

**Recommandation V3.x (basse priorité) :** gate `sessions_read` à `editions.status
NOT IN ('draft', 'closed')` via une jointure, OU exposer une vue
`sessions_public` qui filtre sur status. Hors scope V3.0 hardening (pas une
faille, juste de l'over-share).

---

### `startups` ✅ OK

**RLS :** ON (foundation §6).

**Policies :**

| Nom | Action | USING / WITH CHECK |
|-----|--------|--------------------|
| `startups_read` (v2_multiclub) | SELECT | owner OR master_admin OR admin OR comite OR jury OR club_admin/comite/jury du club |
| `startups_applicant_insert` (module1_prep) | INSERT | `owner_id = auth.uid()` |
| `startups_applicant_update` (module1_prep) | UPDATE | `owner_id = auth.uid()` (deux côtés) |
| `startups_applicant_delete` (module1_prep) | DELETE | `owner_id = auth.uid()` |
| `startups_staff_write` (v2_multiclub) | ALL | master_admin OR admin OR comite OR club_admin/comite du club |

**Plus le TRIGGER `startups_guard_update`** (étendu m1→m2→m4a) qui verrouille
côté candidat :
- INSERT : interdit non-défaut sur status/submitted_at/eligibility/session_id/
  finalized_at/finalized_by/prize.
- UPDATE : interdit toute distinction old/new sur ces colonnes +
  owner_id/edition_id.
- Bypass via sentinel `rsa.allow_protected_update` (posé par les RPC
  SECURITY DEFINER seulement).

**Qui peut faire quoi :**
- **candidat (`owner_id = auth.uid()`)** : INSERT son brouillon avec seulement
  des colonnes data ; UPDATE même chose ; DELETE son brouillon. Aucune
  promotion possible via colonnes privilégiées.
- **comité/admin/club staff** : tout sur les dossiers de leur scope.
- **jury** : SELECT only (lecture des dossiers de la session qu'il évalue —
  pas une faille car son scope est déjà filtré par la session).

**Verrous additionnels :**
- `pinned owner_id = auth.uid()` côté INSERT (pas de forge IDOR).
- Index UNIQUE partiel `startups_owner_edition_uniq` : 1 dossier max par
  (owner_id, edition_id) côté candidat.

**Verdict :** modèle excellent. Le seul point d'amélioration possible serait
d'ajouter un check `WITH CHECK` sur les transitions de statut côté staff
(éviter qu'un comité fasse `status='laureat'` directement). Mais c'est le
boulot des RPC `rsa_apply_selection_review` / `rsa_publish_session`, et les
staff ont déjà accès complet pour back-office — accepté.

---

### `selection_reviews` ✅ OK

**RLS :** ON (foundation §6).

**Policies (module2_selection §4) :**

| Nom | Action | USING / WITH CHECK |
|-----|--------|--------------------|
| `reviews_staff_read` (v2_multiclub override) | SELECT | comite/jury/admin global OR master_admin OR club_admin/comite/jury du club |
| `reviews_insert` (module2) | INSERT | `(comite AND reviewer_id = auth.uid() AND is_final = false) OR admin` |
| `reviews_update` (module2) | UPDATE | même règle, deux côtés (USING + WITH CHECK) |
| `reviews_delete` (module2) | DELETE | `admin` only |

**Qui peut faire quoi :**
- **comité** : peut INSERT une review pour n'importe quel dossier visible,
  mais avec son propre `reviewer_id` et `is_final=false`. UPDATE limité à sa
  propre review tant que non-finalisée.
- **jury** : SELECT only (contexte).
- **admin** : tout. DELETE seul lui appartient.

**Verdict :** correct. La séparation `is_final` empêche un comité de
court-circuiter la validation admin.

---

### `app_user_roles` ✅ OK (racine de confiance)

**RLS :** ON (roles_hardening).

**Policies :**

| Nom | Action | USING / WITH CHECK |
|-----|--------|--------------------|
| `app_user_roles_self_read` | SELECT | `lower(email) = lower(auth.jwt() ->> 'email')` |
| **AUCUNE policy INSERT/UPDATE/DELETE** | – | Écriture impossible depuis JWT — service_role / RPC SECURITY DEFINER only |

**Qui peut faire quoi :**
- **n'importe quel user authentifié** : lit SA ligne (donc connaît ses propres rôles).
- **service_role** : écrit (bootstrap admin, scripts).
- **admins via `rsa_assign_role`** : UPSERT avec validations (roles ⊆ {startup,
  jury, comite, admin}, last-admin protection, audit `granted_by`).

**Verdict :** modèle solide. L'app C1 du audit original a été correctement
corrigée par cette migration `roles_hardening`. Le pattern "racine de
confiance read-only depuis JWT" est exact.

**Risque résiduel mineur :** `app_user_roles` est lookup-é par `email` (pas
par `user_id`), donc si Supabase Auth permet à un user de changer son email
sans MFA et qu'un admin avait été provisionné avec cet email, il y aurait
un risque théorique. Solution V3.x : ajouter un `user_id uuid REFERENCES
auth.users(id)` à `app_user_roles` (migration H1 du audit original — pas
encore appliquée).

---

### `profiles` ❌ ISSUE (legacy, héritage déjeuners)

**RLS :** non explicitement enable dans les migrations RSA, sans qu'aucune
migration ne touche aux GRANTs hérités du legacy. Le commentaire dans
`platform/auth.jsx` confirme : *"profiles porte une RLS 'Allow all' et ne
doit donc PAS porter de droits"*.

**Policies probables (legacy) :** "Allow all" — write public.

**Qui peut faire quoi :**
- **n'importe qui** : potentiellement read/write profiles.
- **MITIGATION :** `platform_roles` a été DROP de profiles (cf.
  `roles_hardening §30`) → écrire dans profiles ne donne PLUS aucun droit
  plateforme.

**Pourquoi ISSUE :**
- Profil contient `full_name`, `email`. Si write-able publiquement, n'importe
  qui peut éditer le `full_name` d'un autre user (display name vandalism).
- L'`email` est utilisé par `rsa_admin_override` pour résoudre
  `reviewer_name`, donc une modif malveillante pourrait fausser l'audit
  reviewer_name.

**Recommandation V3.0 PRIORITÉ HAUTE :** appliquer une migration
`profiles_lockdown.sql` :

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_all ON public.profiles; -- la legacy "Allow all"

CREATE POLICY profiles_self_read ON public.profiles FOR SELECT
  USING (id = auth.uid() OR lower(email) = lower(auth.jwt() ->> 'email'));

CREATE POLICY profiles_staff_read ON public.profiles FOR SELECT
  USING (public.is_master_admin() OR public.has_platform_role('admin')
         OR public.has_platform_role('comite'));

CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR lower(email) = lower(auth.jwt() ->> 'email'))
  WITH CHECK (id = auth.uid() OR lower(email) = lower(auth.jwt() ->> 'email'));

-- INSERT/DELETE : service_role only (pas de policy = DENY).
-- Privilèges colonnes : email reste un check ON UPDATE qu'il ne soit pas modifié
-- arbitrairement (idéalement via trigger).
```

À valider avant apply : que les RPC qui lisent `profiles` (ex.
`rsa_admin_override`, `rsa_list_club_members`) tournent toutes en
SECURITY DEFINER ou aient un GRANT explicite — sinon elles casseraient.

---

### `clubs` ✅ OK

**RLS :** ON (v2_multiclub §6).

**Policies :**

| Nom | Action | USING / WITH CHECK |
|-----|--------|--------------------|
| `clubs_read` | SELECT | `true` (besoin dropdown candidature) |
| `clubs_write` | ALL | `is_master_admin()` |

**Verdict :** correct. La RPC `rsa_create_club` / `rsa_update_club` bypass via
SECURITY DEFINER pour la création/édition.

---

### `club_memberships` ✅ OK

**RLS :** ON.

**Policies :**

| Nom | Action | USING / WITH CHECK |
|-----|--------|--------------------|
| `cm_read` | SELECT | `user_id = auth.uid() OR is_master_admin() OR is_club_member(club_id, 'club_admin')` |
| `cm_write` | ALL | `is_master_admin() OR is_club_member(club_id, 'club_admin')` |

**Qui peut faire quoi :**
- **user** : voit ses propres memberships.
- **club_admin d'un club** : voit + gère les membres de son club.
- **master_admin** : tout.

**Verdict :** correct. Les RPC `rsa_assign_club_role` / `rsa_revoke_club_role`
ajoutent en plus la protection "dernier club_admin".

---

### `edition_clubs` ✅ OK

**RLS :** ON.

**Policies :**

| Nom | Action | USING / WITH CHECK |
|-----|--------|--------------------|
| `ec_read` | SELECT | `true` (besoin candidat pour choisir son club) |
| `ec_write` | ALL | `is_master_admin()` |

**Verdict :** correct.

---

### `prizes` ✅ OK

**RLS :** ON (v25_prizes §2).

**Policies (toutes avec branch kind/club_id) :**

| Nom | Action | USING / WITH CHECK |
|-----|--------|--------------------|
| `prizes_read` | SELECT | `true` (palmarès public) |
| `prizes_insert` | INSERT | `kind='general' OR club_id IS NULL ⇒ master_admin only ; sinon master_admin OR club_admin du club` |
| `prizes_update` | UPDATE | idem |
| `prizes_delete` | DELETE | idem |

**Qui peut faire quoi :**
- **anyone** : lit le palmarès.
- **master_admin** : gère les prix génériques.
- **club_admin** : gère uniquement les prix spéciaux de son club.

**Verdict :** correct.

---

### `jury_applications` ⚠️ ATTENTION

**RLS :** ON.

**Policies (v2_jury_funnel + jury_applications) :**

| Nom | Action | USING / WITH CHECK |
|-----|--------|--------------------|
| `ja_insert_public` | INSERT (anon+auth) | `true` |
| `ja_public_insert` (chantier3) | INSERT (anon+auth) | `true` |
| `ja_select` (v2_jury_funnel) | SELECT | master/admin OR club_admin/comite du club OR `lower(email) = JWT email` |
| `ja_master_select` (chantier3) | SELECT | `has_platform_role('master_admin')` |
| `ja_update` (v2_jury_funnel) | UPDATE | master/club_admin |
| `ja_master_update` (chantier3) | UPDATE | `has_platform_role('master_admin')` |
| `ja_delete` (v2_jury_funnel) | DELETE | master/club_admin |

**Pourquoi ATTENTION :**
- `INSERT WITH CHECK (true)` côté anon = surface DoS / spam (n'importe qui
  peut créer des candidatures fictives). Le RPC `rsa_apply_jury` valide
  l'email regex + qualité enum, mais accepter l'INSERT direct (sans RPC)
  expose à du bourrage de table.
- Atténué par : l'index unique `jury_apps_one_pending_per_email_per_club`
  empêche le doublon par couple ; rate-limit Supabase global protège un peu.

**Recommandation V3.1 :** retirer le WITH CHECK (true) sur INSERT et forcer
le passage par le RPC `rsa_apply_jury` (ajouter une `DENY` policy INSERT,
le RPC SECURITY DEFINER bypass la RLS). Côté front, c'est déjà ce qui se
passe — la policy ouverte est défensive.

---

### `email_templates` ✅ OK

**RLS :** ON (email_studio §2).

**Policies :** 4 policies fines (et_select / et_insert / et_update / et_delete)
gérant master_admin global + club_admin par club. `created_by = auth.uid()`
forcé à l'INSERT côté WITH CHECK. Verdict : correct.

---

### `email_sends` ✅ OK

**RLS :** ON.

**Policies :**

| Nom | Action | USING / WITH CHECK |
|-----|--------|--------------------|
| `es_select` | SELECT | master OR club_admin |
| `es_insert_denied` | INSERT | `false` |
| `es_update_denied` | UPDATE | `false` |
| `es_delete_denied` | DELETE | `false` |

**Verdict :** parfait — table audit immuable côté JWT. L'edge function
`send-bulk` écrit via service_role (bypass RLS).

---

### `admin_audit_log` ✅ OK

**RLS :** ON.

**Policies :**

| Nom | Action | USING / WITH CHECK |
|-----|--------|--------------------|
| `aal_select` | SELECT | master OR admin |
| `aal_insert_denied` | INSERT | `false` |
| `aal_update_denied` | UPDATE | `false` |
| `aal_delete_denied` | DELETE | `false` |

**Verdict :** parfait. Les RPC SECURITY DEFINER `rsa_delete_competition`
écrivent l'audit (bypass RLS intentionnel).

---

### `platform_jury_profiles` ✅ OK

**Policies (module3 §2) :** pjp_read (self/jury/comite/admin), pjp_insert
(self/admin), pjp_self_update (self/admin), pjp_admin_delete (admin).
Verdict : correct.

---

### `platform_jury_assignments` ✅ OK

**Policies (module3 §3) :**

| Nom | Action | USING |
|-----|--------|-------|
| `pja_read` (v2_multiclub override) | SELECT | self OR master OR admin OR comite OR club_admin/comite du club de la session |
| `pja_admin_write` | ALL | `has_platform_role('admin')` |

**Note :** `pja_admin_write` ne supporte pas master_admin / club_admin —
écriture via RPC SECURITY DEFINER (`rsa_assign_jury_to_session` etc.) ou
admin global only. À ré-évaluer si on étend l'autonomie club admin V3.x.

---

### `platform_jury_score_drafts` ✅ OK

**Policies (module3 §5) :** pjsd_self_read (`jury_user_id = auth.uid()`),
pjsd_self_write (`jury_user_id = auth.uid() AND rsa_can_score(session_id)`).
Verdict : excellent — un draft est strictement privé à son juré.

---

### `platform_jury_scores` ✅ OK

**Policies (module3 §6) :**

| Nom | Action | USING / WITH CHECK |
|-----|--------|--------------------|
| `pjs_jury_self_read` (v2 override) | SELECT | self OR master/admin/comite OR club_admin/comite du club de la session |
| `pjs_no_direct_insert` | INSERT | `false` |
| `pjs_no_direct_update` | UPDATE | `false` |
| `pjs_admin_delete` | DELETE | `has_platform_role('admin')` |

**Verdict :** excellent. INSERT/UPDATE DENY total → seul le RPC
`rsa_submit_jury_score` (SECURITY DEFINER) peut écrire, ce qui garantit la
validation des 6 scores + assignment check.

---

### `session_config` (legacy 2026 reused) ❌ ISSUE

**RLS :** ON.

**Policies (héritées 2026, jamais modifiées par RSA) :** Politique fully open
type `using (true) with check (true)` (cf. `m4c-public-results-rls.md`).

**Qui peut faire quoi :**
- **anyone (anon inclus)** : SELECT/INSERT/UPDATE/DELETE sur toutes les
  colonnes — notamment `admin_overrides`, `notes`, `teams_link`,
  `airtable_link`, `jury_pack_path`, `final_ranking`.

**Pourquoi ISSUE :**
- Le `teams_link` et `airtable_link` sont des secrets opérationnels
  (Microsoft Teams meeting URL avec token, Airtable share).
- `final_ranking` snapshot contient les noms des startups gagnantes — fuite
  AVANT que le UI les publie.
- N'importe quel anon pourrait UPDATE `session_config.status='published'` et
  forcer l'affichage public d'une session non encore notée → désastre RP.

**Mitigation actuelle :**
- Les RPC plateforme V1+ (lock/publish/set_live) sont SECURITY DEFINER et
  appliquent les bons checks ; mais ils ne sont PAS la SEULE voie d'écriture
  car la RLS est ouverte.
- Pas d'exemple connu d'exploitation, mais le risque est réel.

**Recommandation V3.0 PRIORITÉ HAUTE :** appliquer une migration
`session_config_lockdown.sql` qui DROP la policy `using (true) with check
(true)` et la remplace par :

```sql
DROP POLICY IF EXISTS "Allow all" ON public.session_config; -- nom exact à confirmer

CREATE POLICY sc_read_staff ON public.session_config FOR SELECT USING (
  public.is_master_admin()
  OR public.has_platform_role('admin')
  OR public.has_platform_role('comite')
  OR public.has_platform_role('jury')
  OR EXISTS (
    SELECT 1 FROM public.sessions sess
     WHERE sess.id = session_config.session_id
       AND sess.club_id IS NOT NULL
       AND (public.is_club_member(sess.club_id, 'club_admin')
         OR public.is_club_member(sess.club_id, 'comite')
         OR public.is_club_member(sess.club_id, 'jury'))
  )
);

-- Écriture : DENY direct ; seuls les RPC SECURITY DEFINER (rsa_lock_session,
-- rsa_publish_session, rsa_create_session, rsa_set_session_live/draft,
-- rsa_reset_session_template) modifient cette table.
CREATE POLICY sc_insert_denied ON public.session_config FOR INSERT WITH CHECK (false);
CREATE POLICY sc_update_denied ON public.session_config FOR UPDATE USING (false);
CREATE POLICY sc_delete_denied ON public.session_config FOR DELETE USING (false);
```

À valider : la page publique `/Resultats` (M4c) lit `session_config` via la
vue `public_palmares` — la vue est SECURITY INVOKER donc heritera de la
nouvelle policy. Il faudra peut-être ajouter une exception SELECT pour les
rows `status='published'` côté anon, mais la doc m4c suggère justement de
NE PAS toucher la RLS et faire passer tout par la vue. Plan détaillé à
écrire avant apply.

---

### `rsa_finale_rsvp` (legacy 2026) ⚠️ ATTENTION

**RLS :** ON. Policy unique `public_all_rsvp` = fully open
(`using (true) with check (true)`).

**Pourquoi ATTENTION (et pas ISSUE) :**
- C'est une table 2026 archivée — la grande finale a déjà eu lieu (mardi
  26 mai 2026, cf. mémoire).
- Le commentaire de migration justifie : "RLS pattern matches existing RSA
  tables (jury_profiles, startup_confirmations): fully open, admin gating
  happens client-side via VITE_RSA_ADMIN_KEY".
- Tous les RSVP 2026 sont déjà collectés ; aucune nouvelle écriture
  attendue.

**Recommandation V3.x basse priorité :** flip à read-only pour archive (DROP
INSERT/UPDATE/DELETE policies).

---

### `chat_messages` (legacy déjeuners) ✅ OK

**RLS :** ON (chat_rls_rpcs §2).

**Policies :** AUCUNE policy active. `REVOKE all from anon, authenticated`
côté GRANT. Seules les RPC SECURITY DEFINER (`send_dm`, `send_table_msg`,
`load_dm`, `load_table_history`, `admin_clear_all_chats`) peuvent
lire/écrire — identité par `seats.guest_token`.

**Verdict :** excellent. Le pattern "verrouille la table, expose par RPC
seul" est le gold standard.

---

### `app_config` ✅ OK

**RLS :** ON, `REVOKE all from public, anon, authenticated`. Pas de policy
(donc DENY total). Lecture du secret bcrypt via `admin_clear_all_chats(p_secret)`
(SECURITY DEFINER, vérif `crypt(p_secret, stored_hash) = stored_hash`).
Verdict : excellent.

---

## Buckets storage

### `storage.dossiers` ✅ OK

Bucket privé (`public=false`). 4 policies (module1_prep §4 + module1_hardening §4) :

| Nom | Action | USING / WITH CHECK |
|-----|--------|--------------------|
| `dossiers_read` | SELECT | `owns_startup(seg[4])` OR `is_dossier_staff()` |
| `dossiers_insert` | INSERT | propriétaire avec `seg[1]='editions' AND seg[3]='startups' AND seg[5] IN ('pitch_deck','exec_summary')` OR comite/admin |
| `dossiers_update` | UPDATE | idem |
| `dossiers_delete` | DELETE | propriétaire OR comite/admin |

**Convention de chemin :** `editions/{edition_id}/startups/{startup_id}/{kind}/{ts}_{name}.{ext}`.
Le segment [5] est contraint à `pitch_deck|exec_summary` (R-H2 hardening
module1).

**Verdict :** excellent. Le helper `owns_startup` (SECURITY DEFINER) gère
proprement les chemins malformés.

---

### `storage.jury-photos` ⚠️ ATTENTION

Bucket privé. Policies (v2_jury_funnel §7) :

| Nom | Action | USING / WITH CHECK |
|-----|--------|--------------------|
| `jp_insert` | INSERT | `bucket_id = 'jury-photos'` (anon+auth) |
| `jp_read` | SELECT | master OR admin OR club_admin/comite du club OR le candidat lui-même (matché par email JWT) |

**Pourquoi ATTENTION :**
- INSERT anon avec seulement check `bucket_id` = n'importe qui peut uploader
  n'importe quel fichier sous n'importe quel chemin du bucket. Risque :
  remplir le bucket (storage cost), uploader du contenu malveillant, ou
  écraser une photo de juré si conflit de path.
- Mitigation : pas de SELECT pour anon (les photos restent invisibles à un
  attaquant sans rôle).

**Recommandation V3.1 :** scoping de chemin similaire à `dossiers` —
convention `applications/{application_id}/...` avec policy qui vérifie
l'existence de la candidature. Hors scope V3.0.

---

### `storage.uploads` (legacy public bucket) ❌ ISSUE

**Statut :** `public=true` (créé legacy 2026, jamais flippé).

**Conséquences (confirmées par le audit foundation C2) :**
- Tous les fichiers du bucket sont servis sans auth via `getPublicUrl`.
- Pitch decks 2026, exec summaries, photos jury 2026 = downloadable par
  n'importe qui qui devine ou intercepte une URL.
- RGPD Art. 5/32 + Règlement Art. 10 = violations.

**Pourquoi pas adressé en V2.5 :**
- Migration vers `dossiers` (bucket privé) faite uniquement pour les
  nouveaux uploads V2 (`module1_prep §4`).
- Les objets 2026 sont restés dans `uploads` public — décision documentée
  ("on isole les nouveaux dossiers dans un fresh bucket").

**Recommandation V3.0 PRIORITÉ MOYENNE :**
1. Inventaire : lister tous les objets restants dans `uploads` (script Python
   ou Supabase Dashboard).
2. Pour chaque objet 2026 :
    a. Re-uploader sous le nouveau chemin `editions/2026/startups/<id>/<kind>/...`
       dans `dossiers` (privé).
    b. Mettre à jour les FK (`startups.pitch_deck_path`, `exec_summary_path`).
    c. Supprimer l'objet legacy.
3. Une fois vidé, flip `uploads.public = false` ou drop le bucket.
4. Refactor `src/lib/db.js` ligne 207 + `src/pages/StartupUpload.jsx` + edge
   functions consolidate-jury-pack pour utiliser `createSignedUrl` au lieu
   de `getPublicUrl`.

---

## RPCs SECURITY DEFINER — checks d'autorisation

Pour chaque RPC, on vérifie : (a) check de rôle en début de corps, (b) GRANT
EXECUTE limité, (c) usage sentinel si bypass trigger.

| RPC | Auth check | GRANT EXECUTE | Sentinel ? |
|-----|------------|---------------|-----------|
| `has_platform_role(text)` | – (helper read-only) | public (héritage) | non |
| `is_master_admin()` | – (helper) | authenticated, anon | non |
| `is_club_member(text, text)` | – | authenticated | non |
| `is_in_club(text)` | – | authenticated | non |
| `my_admin_clubs()` | – | authenticated | non |
| `my_club_memberships()` | – | authenticated | non |
| `owns_startup(text)` | – (helper) | – | non |
| `is_dossier_staff()` | – (helper) | – | non |
| `rsa_can_score(text)` | – (helper) | authenticated | non |
| `rsa_is_assigned(text)` | – (helper) | authenticated | non |
| `rsa_weighted_score(...)` | – (helper IMMUTABLE) | – | non |
| `rsa_evaluate_eligibility(...)` | – (helper IMMUTABLE) | authenticated | non |
| `rsa_my_roles()` | – (lit ses propres rôles) | authenticated | non |
| `rsa_submit_dossier(uuid)` | `owner_id = auth.uid() OR staff` | authenticated | **oui** |
| `rsa_apply_selection_review(uuid)` | comite/admin OR master OR club_admin/comite du club | authenticated | **oui** |
| `rsa_finalize_review(uuid)` | admin OR master OR club_admin du club | authenticated | **oui** |
| `rsa_admin_override(...)` | admin OR master OR club_admin du club | authenticated | **oui** |
| `rsa_submit_jury_score(...)` | jury OR admin + `rsa_can_score` | authenticated | non (pas de trigger) |
| `rsa_lock_session(text)` | admin OR master OR club_admin du club | authenticated | **oui** |
| `rsa_publish_session(text)` | admin OR master OR club_admin du club | authenticated | **oui** |
| `rsa_create_session(text, jsonb)` | admin OR master OR club_admin du club | authenticated | non |
| `rsa_assign_role(text, text[])` | admin only | authenticated | non |
| `rsa_list_app_user_roles()` | admin (via `has_platform_role` dans WHERE) | authenticated | non |
| `rsa_set_session_live(text)` | admin OR master OR club_admin | authenticated | non |
| `rsa_set_session_draft(text)` | admin OR master OR club_admin | authenticated | non |
| `rsa_reset_session_template(text)` | admin OR master OR club_admin | authenticated | non |
| `rsa_create_competition(...)` | master_admin only | authenticated | non |
| `rsa_create_club(...)` | master_admin only | authenticated | non |
| `rsa_update_club(...)` | master OR club_admin du club | authenticated | non |
| `rsa_attach_club_to_edition(...)` | master_admin only | authenticated | non |
| `rsa_detach_club_from_edition(...)` | master_admin only | authenticated | non |
| `rsa_assign_club_role(...)` | master OR club_admin | authenticated | non |
| `rsa_revoke_club_role(...)` | master OR club_admin (+ last-club-admin protection) | authenticated | non |
| `rsa_list_clubs()` | – (public) | authenticated, anon | non |
| `rsa_list_club_members(text)` | filter dans WHERE (master OR club_admin du club) | authenticated | non |
| `rsa_list_email_templates(text)` | master OR club_admin | authenticated | non |
| `rsa_save_email_template(...)` | master OR club_admin | authenticated | non |
| `rsa_delete_email_template(uuid)` | master OR créateur + club_admin | authenticated | non |
| `rsa_list_email_sends(...)` | master OR club_admin | authenticated | non |
| `rsa_resolve_audience(...)` | master OR club_admin (selon type) | authenticated | non |
| `rsa_apply_jury(...)` | – (form public) | authenticated, anon | non |
| `rsa_reject_jury_application(uuid, text)` | master OR club_admin | authenticated | non |
| `rsa_approve_jury_application(uuid)` | master OR club_admin | authenticated | non |
| `rsa_list_jury_applications(text, text)` | filter dans WHERE | authenticated | non |
| `rsa_create_prize(...)` | master OR (club_admin si kind=special+club) | authenticated | non |
| `rsa_update_prize(...)` | idem | authenticated | non |
| `rsa_delete_prize(uuid)` | idem + check awarded_to NULL | authenticated | non |
| `rsa_award_prize(uuid, uuid)` | idem | authenticated | non |
| `rsa_list_prizes(...)` | – (public) | authenticated, anon | non |
| `rsa_count_competition_dependencies(text)` | master OR admin | authenticated | non |
| `rsa_delete_competition(text, text)` | master_admin only + typed-confirm | authenticated | non |
| `rsa_list_audit_log(int, text)` | filter dans WHERE (master OR admin) | authenticated | non |
| `rsa_concours_edition_overview(text)` | `auth.uid() IS NOT NULL` (authenticated only) | authenticated | non |
| `rsa_concours_session_detail(text)` | `auth.uid() IS NOT NULL` | authenticated | non |
| `admin_clear_all_chats(text)` | bcrypt secret verify | anon, authenticated | non |
| Chat RPCs (send_dm, etc.) | seat token verify | anon, authenticated | non |
| `_seat_for_token(text)` | – (helper) | – (REVOKE from all) | non |

**Verdict global RPCs :** très propre. Toutes les RPC d'écriture ont un check
de rôle en début, le pattern sentinel est cohérent partout, et `_seat_for_token`
est correctement caché (REVOKE all).

---

## Tests négatifs requis (E2E Playwright)

Liste de 20 scénarios qui DOIVENT échouer pour prouver la RLS. À implémenter
dans `tests/e2e/security/rls.spec.ts` — 5-8 couverts en V3.0 (scaffolding),
le reste en V3.3+ (couverture complète).

### Niveau anon (sans aucune session)

1. **anon read `app_user_roles`** → 0 rows (jwt email NULL).
2. **anon insert `editions`** → 403 (admin only).
3. **anon insert `startups`** → 403 (authenticated only via policy).
4. **anon insert `selection_reviews`** → 403.
5. **anon insert `platform_jury_scores`** directement (sans RPC) → 403.
6. **anon SELECT `editions` status='draft'** → 0 rows.
7. **anon download d'un objet `storage.dossiers/editions/.../pitch_deck/...`** → 403.
8. **anon read `email_sends`** → 0 rows.
9. **anon insert `admin_audit_log`** → 403.

### Niveau candidat (authenticated, sans rôle plateforme)

10. **candidat A SELECT startup de candidat B** → 0 rows.
11. **candidat A UPDATE startup de candidat B** (avec id forgé) → 0 rows (RLS filter) / 403 (trigger).
12. **candidat A INSERT startup avec `owner_id = uuid(B)`** → 403 (WITH CHECK).
13. **candidat A UPDATE son propre dossier avec `status = 'soumis'`** → 403 (trigger forbidden_field).
14. **candidat A UPDATE son propre dossier avec `eligibility = {verdict:eligible}`** → 403 (trigger).
15. **candidat A upload sous `editions/X/startups/UUID_DE_B/pitch_deck/...`** → 403 (owns_startup false).

### Niveau jury (rôle 'jury' assigné à session_X)

16. **jury A UPDATE startup de la session_X** → 403 (jury n'a pas startups_staff_write).
17. **jury A INSERT score pour une startup d'une AUTRE session** → 22023 (startup_not_in_session).
18. **jury A INSERT score directement dans `platform_jury_scores`** (sans RPC) → 403 (pjs_no_direct_insert).
19. **jury A SELECT draft d'un AUTRE juré** → 0 rows (pjsd_self_read).

### Niveau comité

20. **comité club Paris INSERT review avec `is_final=true`** → 403 (reviews_insert with check).

### Niveau cross-club (V2 multi-club)

21. **club_admin Paris UPDATE startup club Berlin** → 0 rows / 403 (club scoping).
22. **club_admin Paris call `rsa_lock_session(session_berlin)`** → 42501 forbidden.

---

## Recommandations priorisées

### V3.0 (ce hardening — à appliquer SQL avant fin juin 2026)

1. **[ISSUE] `profiles_lockdown.sql`** — enable RLS, drop "Allow all", policies
   self_read/staff_read/self_update. Estimation : 1h, 0 régression attendue.
2. **[ISSUE] `session_config_lockdown.sql`** — drop policy fully open, ajouter
   sc_read_staff + DENY writes. Vérif préalable : tous les RPC qui écrivent
   ont bien le sentinel ou la SECURITY DEFINER ? OUI. Estimation : 2h
   (test path /Resultats public via vue).
3. **Migrer `storage.uploads` legacy** — script de re-upload vers `dossiers`,
   flip bucket à privé, refactor 7 sites front. Estimation : 1 jour.

### V3.1 (immédiatement après V3.0, ~1 semaine)

4. **`jury_applications` INSERT lockdown** — DENY direct, forcer RPC.
5. **`storage.jury-photos` path scoping** — convention application_id.
6. **Vue `sessions_public`** — exposer uniquement les status≠draft/closed.

### V3.x (backlog hardening)

7. **`app_user_roles.user_id` (H1)** — bind par uid au lieu d'email.
8. **`rsa_finale_rsvp`** — read-only archive.
9. **Trigger `profiles.updated_at`** — moddatetime trigger.
10. **PII retention/erasure (L1)** — process documenté + script de purge
    (DB rows + Storage objects orphelins).

---

## Appendix — méthodologie

### Sources lues

- 27 migrations sous `supabase/migrations/` (6761 lignes SQL)
- `docs/hardening/foundation-auth-rls-review.md` (audit initial Module 1)
- `docs/hardening/module1-runtime-review.md`
- `docs/hardening/m4c-public-results-rls.md` (preview Module 4c)
- `src/lib/platform/auth.jsx`

### Hors scope (V3.0)

- Tables 2026 legacy déjeuners hors plateforme RSA (restaurant_tables, seats,
  reservations, global_settings, event_history, upcoming_events) — concernent
  l'app déjeuners à extraire (cf. mémoire). Pas un risque B2B sur le domaine
  app.rotary-startup.org.
- Tables RSA 2026 archive (`jury_profiles`, `jury_scores`, `startup_confirmations`,
  `session_config` ancien usage). Read-only, non-modifiées depuis 2026-05-26
  (date finale).
- Tests d'intégration RPC SQL (`supabase/tests/rls.sql`) — recommandés mais
  écrits en V3.1+ via Playwright (tests E2E suffisent pour les 20 scénarios
  négatifs ci-dessus).
