# Rotary Startup Award — Hardening Plan (RSA-spécifique)

> Audit sécurité de la VRAIE surface RSA. Projet Supabase `uaoucznptxmvhhytapso`.
> Stack : React 18 + Vite (SPA, host `app.rotary-startup.org`), Supabase (DB + RLS + Edge Functions + Storage privé), Vercel.
> Établi 2026-05-31 à partir des advisors Supabase (security+perf), d'un scan secrets repo, et des edge functions.
> **NB :** ce doc REMPLACE le `HARDENING-PLAN.md` à la racine — qui est en réalité le plan du projet **Torool/Safepin** (copie égarée, stack mobile/RevenueCat, projet `kolxetpeyubarnrbkecc`). Sans rapport avec RSA.

---

## 0 · Threat model RSA

| Acteur | Surface | Capacité | Risque résiduel |
|---|---|---|---|
| Candidat startup malveillant | Funnel public (`rsa_create_pending_application`, `rsa_submit_dossier`) | Spam dossiers, self-promote `status` | **Faible** (RLS + `startups_guard_update` trigger + RPC validés serveur) |
| Juré/candidat juré | `rsa_apply_jury` (anon), funnel jury | Spam candidatures, voir candidatures d'autres clubs | **Faible** (anti-doublon `(edition,email)`, `ja_select` scoping club, lock serveur sessions) |
| Visiteur anonyme | RPC `anon`-exécutables, pages publiques | Appeler des RPC admin sans droits, scrape | **Moyen** (70 fn definer exposées à anon — gardes internes OK mais défense-en-profondeur faible) |
| Admin/club_admin malveillant | RLS, RPC scoped | Lire/écrire hors de son club/édition | **Faible** (gardes `is_master_admin`/`is_club_member` partout) |
| Fuite de secret (repo, dashboard) | `SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET` | Full DB, faux emails | **Faible** (aucun secret en clair dans le repo — vérifié ; tous en env serveur) |
| Lecteur de données legacy/lunch | Tables RLS `USING(true)` | Lire PII jurés 2026 / invités lunch | **Moyen** (édition 2026 close + lunch extrait, mais RLS ouvertes) |

---

## 1 · État des lieux — ce qui est déjà bon (ne pas casser)

- ✅ **Aucun secret en clair dans le repo** (scan `service_role`/`sk_`/`Bearer` → uniquement doc + `process.env` serveur). `CONTRIBUTING.md` interdit explicitement les commits de secrets.
- ✅ **`SERVICE_ROLE_KEY` jamais exposé client** : pas de préfixe `VITE_`, utilisé seulement dans `api/cron/backup-rsa.js` + edge functions.
- ✅ **RLS + gardes internes partout** : RPC SECURITY DEFINER avec `is_master_admin()` / `is_club_member()` / `has_platform_role()`. `jury_applications` correctement scopé (INSERT public intentionnel, SELECT/UPDATE/DELETE gardés).
- ✅ **`startups_guard_update`** : trigger qui empêche un candidat d'auto-modifier des colonnes sensibles (status, club_id côté serveur).
- ✅ **Funnel jury durci** (chantier récent) : club obligatoire, anti-doublon `(edition,email)`, **lock serveur** dans `rsa_apply_jury`.
- ✅ **Edge `invite-user`** : JWT requis, matrice authz 5-tiers, rate-limit 1/h/email, magic-link via Resend, audit `email_sends`.
- ✅ **search_path pinné** sur les 8 fonctions flaggées (migration `harden_function_search_path`, 2026-05-31). **[FAIT]**
- ✅ Docs hardening existantes : `foundation-auth-rls-review.md`, `rls-audit-v3.md`, `observability-edge-functions.md`, `login-audit-v4.md`, `m4c-public-results-rls.md`, `concours-v2-rls-audit.md`.

---

## 2 · P0 — Défense en profondeur prioritaire

### P0.1 — Revoke `anon` EXECUTE sur les RPC admin/staff 🔥

**Problème.** 70 fonctions SECURITY DEFINER sont exécutables par `anon` (advisor `anon_security_definer_function_executable`). Les gardes internes (`is_master_admin()` → false pour anon) bloquent l'effet, MAIS exposer des RPC d'écriture admin à un appelant non authentifié est une faiblesse de défense-en-profondeur : toute régression future dans une garde devient exploitable sans compte.

**Action.** `REVOKE EXECUTE ... FROM anon` sur les RPC clairement admin/staff (liste §5). **GARDER anon** sur : les RPC publiques (`rsa_apply_jury`, `rsa_create_pending_application`, `rsa_claim_pending_application`, `rsa_concours_edition_overview`, `rsa_concours_session_detail`), les prédicats RLS (`is_*`, `has_platform_role`, `my_*`, `owns_*`, `auth_current_email`, `rsa_can_score`, `rsa_is_assigned`) qui doivent rester appelables par le contexte d'évaluation des policies sur les tables lisibles en anon, et le chat lunch (`*_table_msg`, `*_dm`).

**Statut.** ✅ **FAIT** (migration `harden_revoke_anon_execute_admin_rpcs`, 2026-05-31). `REVOKE EXECUTE FROM PUBLIC, anon` sur les 43 RPC de §5 ; `authenticated` + `service_role` conservés (vérifié : edge functions + admins intacts). Call-sites publics vérifiés sans impact (`rsa_list_clubs` reste anon pour le picker funnel).

### P0.2 — Tighten les RLS `USING(true)` porteuses de PII

**Problème.** 17 tables ont une policy `always true`. Les actives sont OK (`jury_applications` INSERT public intentionnel). Les **legacy 2026** (`jury_profiles` = noms/emails/`photo_base64`, `jury_scores`, `jury_score_drafts`, `jury_scoring_sessions`, `dashboard_state`, `rsa_actions`, `startup_confirmations`, `rsa_finale_rsvp`) et **lunch** (`reservations`, `seats`, `restaurant_tables`, `global_settings`, `event_history`, `upcoming_events`) exposent des données en lecture large.

**Action.**
- **Legacy 2026** : édition close → soit restreindre la lecture à `is_master_admin()`/staff, soit confirmer "accepté" (données d'une édition close, faible sensibilité). `jury_profiles.photo_base64` reste le point le plus sensible.
- **Lunch** : l'app a été extraite (R1) mais les tables vivent encore dans ce projet. **Ne PAS toucher sans confirmer** que l'app lunch ne casse pas (son modèle RLS peut être volontairement ouvert). 

**Statut.** ✅ **DÉCIDÉ (2026-05-31) — RISQUE ACCEPTÉ, on laisse ouvert.**
- **Lunch** : NE PAS TOUCHER — l'app lunch extraite (`rotary-event-lunch/`) lit sa config via env et les tables lunch vivent dans ce projet → elle pointe très probablement encore ici ; tightening risquerait de casser les déjeuners en prod.
- **Legacy 2026** (`jury_profiles` PII, `jury_scores`…) : laissé ouvert sur décision de Mathieu — édition close, données 2026 jugées peu sensibles, et on garde les vues legacy (`RsaJuryView` « EN DIRECT »…) fonctionnelles en anon. Expo PII jurés 2026 = **risque accepté, documenté**.

---

## 3 · P1 — Avant croissance

- **P1.1 — RLS enabled sans policy** ✅ **AUDITÉ — intentionnel, aucun fix.** Les 3 (`app_config`, `chat_messages`, `pending_applications_log`) sont deny-all VOULU : tout accès passe par RPC SECURITY DEFINER (chat via wrapper `lib/db/lunch.js` → 6 RPC ; pending via `rsa_create_pending_application`), zéro lecture client directe (vérifié grep). Fait : `REVOKE ALL ON pending_applications_log FROM anon, authenticated` (hygiène, grants inertes retirés).
- **P1.2 — Validation inputs edge functions** :
  - ✅ **`save-jury-profile` NEUTRALISÉ** (le critique) : était `verify_jwt:false` + insert public NON borné dans la PII `jury_profiles`, orphelin (aucun appelant). Redéployé en **410 Gone + verify_jwt:true** (v3, 2026-05-31). Vecteur fermé.
  - `send-bulk` / `send-transactional` : auth solide + `esc()` HTML exemplaire (pas de XSS). Seul gap = pas de borne de longueur (DoS-soft par un **admin authentifié** → risque réel faible). **Backlog** : patches de bornage prêts (subject/body_html ≤300/100K ; data fields ≤2K) — à appliquer lors d'une fenêtre de redéploiement testée. Non fait (risque redéploiement live > gain).
- **P1.3 — Rate-limit funnels publics** ✅ **FAIT.** Disparité confirmée (candidat = 3/email/24h ; jury = aucun). Ajout d'un rate-limit `3 candidatures / email / 24h` à `rsa_apply_jury` (migration `harden_rsa_apply_jury_rate_limit`, compteur sur `jury_applications`, parité ERRCODE 22023).
- **P1.4 — Observabilité** : cf. `observability-edge-functions.md`. Logs structurés + alerting sur pics `forbidden`/`rate_limited`.
- **P1.5 — Backup/restore** : `api/cron/backup-rsa.js` existe (service_role). Confirmer le cron Vercel actif + `CRON_SECRET` + procédure de restore documentée.

---

## 4 · P2 — Maturité

- Headers de sécurité (CSP, X-Frame-Options, HSTS) sur Vercel pour `app.rotary-startup.org` (SPA — moins de surface XSS que du SSR user-generated, mais à poser via `vercel.json`).
- Pentest RLS automatisé (pgTAP) en CI (le workflow `ci.yml` a des placeholders Playwright + service_role).
- SCA dépendances (Dependabot/`npm audit` bloquant en CI).
- Scrub PII Sentry (`beforeSend`) — vérifier `lib/observability/sentry.js`.

---

## 5 · Liste de revoke `anon` proposée (P0.1) — à valider

**REVOKE anon** (admin/staff — aucun flux public légitime) :
```
rsa_create_competition, rsa_delete_competition, rsa_create_club, rsa_update_club,
rsa_attach_club_to_edition, rsa_detach_club_from_edition,
rsa_create_prize, rsa_update_prize, rsa_delete_prize, rsa_award_prize, rsa_reassign_prize,
rsa_grant_competition_admin, rsa_revoke_competition_admin, rsa_assign_club_role,
rsa_revoke_club_role, rsa_assign_role, rsa_assign_juror, rsa_remove_juror,
rsa_create_jury_profile, rsa_approve_jury_application, rsa_reject_jury_application,
rsa_lock_session, rsa_publish_session, rsa_create_session, rsa_remove_finalist,
rsa_admin_override, rsa_finalize_review, rsa_apply_selection_review,
rsa_list_audit_log, rsa_list_competition_admins, rsa_list_club_members,
rsa_list_clubs_for_edition_with_counts, rsa_list_email_templates, rsa_save_email_template,
rsa_delete_email_template, rsa_list_email_sends, rsa_communicate_audience, rsa_resolve_audience,
rsa_analytics_jury_activity, rsa_analytics_clubs_breakdown, rsa_count_competition_dependencies,
admin_clear_all_chats
```
**GARDER anon** : `rsa_apply_jury`, `rsa_create_pending_application`, `rsa_claim_pending_application`, `rsa_concours_edition_overview`, `rsa_concours_session_detail`, prédicats RLS (`is_*`, `has_platform_role`, `my_*`, `owns_*`, `auth_current_email`, `rsa_can_score`, `rsa_is_assigned`), validations (`*_validate_custom_data`), chat lunch (`send_dm`, `send_table_msg`, `list_dm`, `list_table_msgs`, `chat_recent_for`).
**À vérifier (call-site avant revoke)** : `rsa_submit_dossier` (candidat authed après magic-link → revoke probable), `rsa_list_clubs` / `rsa_list_prizes` (affichés en public ?).

---

## 6 · Checklist exécution

- [x] search_path pinné sur 8 fonctions (`harden_function_search_path`)
- [x] Revoke anon batch §5 — 43 RPC (`harden_revoke_anon_execute_admin_rpcs`)
- [~] RLS lunch : NE PAS TOUCHER (app lunch pointe probablement ce projet)
- [~] RLS legacy 2026 : risque accepté, laissé ouvert (décision Mathieu 2026-05-31)
- [x] P1.1 RLS no-policy : audité intentionnel + REVOKE hygiène pending_applications_log
- [x] P1.2 save-jury-profile neutralisé (410 + verify_jwt) ; send-bulk/transactional bornes = backlog
- [x] P1.3 rate-limit jury (`harden_rsa_apply_jury_rate_limit`)
- [ ] Confirmer rate-limit `rsa_apply_jury`
- [ ] Vérifier validation inputs `send-bulk`/`send-transactional`/`save-jury-profile`
- [ ] Headers Vercel (CSP/HSTS) sur app.rotary-startup.org
- [ ] Supprimer le `HARDENING-PLAN.md` Torool égaré du repo

---

_Dernière revue : 2026-05-31. Re-run `get_advisors(security)` après chaque batch DDL._
