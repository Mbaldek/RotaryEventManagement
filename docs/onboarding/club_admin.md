# Onboarding — Club admin

> Guide pour les admins de club Rotary qui pilotent leur édition locale du RSA.
> Captures : `docs/onboarding/screenshots/club-admin-*.png` (placeholders).

---

## Table of contents

- [Ce que tu fais](#ce-que-tu-fais)
- [Workflow en 6 étapes](#workflow-en-6-étapes)
- [Communications](#communications)
- [Liens utiles](#liens-utiles)

---

## Ce que tu fais

Tu pilotes la compétition pour **ton club** :
- Configurer ta session (date, lieu, slots).
- Inviter et coordonner ton **comité** de sélection + ton **jury**.
- Suivre les candidatures.
- Clôturer la session live et auto-promouvoir tes finalistes vers la fédération.
- Communiquer (remerciements, annonces) en masse depuis le cockpit.

Tu n'as **pas** accès aux clubs des autres — RLS verrouille strictement ton scope.

---

## Workflow en 6 étapes

**1. Accéder à ton cockpit.** Après login, tu atterris sur
**/Admin?scope=club:<ton-club-id>**. La nav latérale liste :
*Setup · Candidatures · Comité · Jury · Live · Communications · Résultats*.
*Capture : `screenshots/club-admin-01-cockpit.png`*

**2. Configurer la compétition.** Onglet **Setup** :
- Date et lieu de la session pitch.
- Slots (1 slot = 20 min = 1 startup). Par défaut 6 slots.
- Critères de scoring (héritage master_admin, override possible).
- Toggle *public_results_enabled* si tu veux que le palmarès soit visible publiquement.

**3. Inviter ton équipe.** Onglet **Comité** : bouton *"Inviter membre comité"* → email
→ rôle `comite` × `club_id`. Idem onglet **Jury** : *"Inviter juré"* (rôle `jury`).
L'invité reçoit un magic-link et atterrit sur **/Welcome** puis **/Selection** (comité)
ou **/Jury** (jury).
*Capture : `screenshots/club-admin-02-invite.png`*

**4. Suivre les candidatures.** Onglet **Candidatures** : tableau live des dossiers
*draft / submitted / under_review / selected / rejected*. Filtre par statut, export CSV,
ouvrir le `DossierDrawer` pour consultation.
*Capture : `screenshots/club-admin-03-dossiers.png`*

**5. Conclure la session live.** Onglet **Live** (jour J) :
- Vue grid en temps réel des scores qui rentrent (via Supabase Realtime).
- Quand tous les jurés ont saved, bouton **"Conclure la session"** apparaît →
  appelle `rsa_finalize_session` (lock scores + averages) puis
  `rsa_promote_to_finale(top_n)` (auto-promote des N premiers en finale).
- N par défaut = 1. Pour le configurer voir
  [USER-ACTIONS § E.2](../USER-ACTIONS-V3.md#e2--editions--promote_top_n-config).

**6. Publier les résultats.** Onglet **Résultats** : valider les rangs (drag pour
ré-ordonner si bonus manuel), publier. Le palmarès devient visible sur **/Resultats**
si toggle public_results activé.

---

## Communications

Onglet **Communications** : 3 templates pré-configurés (FR/EN switch).

- **Remercier les non-sélectionnés** — après clôture comité, avant session jury.
- **Annoncer aux sélectionnés** — convocation pitch jury.
- **Annoncer les résultats** — post-finale.

Workflow : choisir template → editer → **dry-run** (preview du compte + 3 exemples) →
**envoyer**. Tout est loggé dans `admin_audit_log` (qui, quand, combien d'emails).

Prérequis : `RESEND_API_KEY` configuré côté Supabase (voir
[USER-ACTIONS § C.1](../USER-ACTIONS-V3.md#c1--supabase-edge-function-secrets--resend_api_key)).

---

## Liens utiles

- Runbook session live (jour J, checklist) : [docs/RSA_LIVE.md](../RSA_LIVE.md)
- Actions manuelles infra : [docs/USER-ACTIONS-V3.md](../USER-ACTIONS-V3.md)
- Blueprint module 2 (sélection comité) : [docs/blueprints/module2-selection.md](../blueprints/module2-selection.md)
- Blueprint module 3 (jury) : [docs/blueprints/module3-jury.md](../blueprints/module3-jury.md)

Si bloqué : escalade au master_admin (mathieubal@gmail.com pour la fédération Paris).
