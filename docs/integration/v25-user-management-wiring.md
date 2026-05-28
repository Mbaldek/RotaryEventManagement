# V2.5 — User Management Wiring

> **Statut :** composants livrés, edge functions livrées, câblage UI à faire par
> l'orchestrateur. Le présent document décrit point par point les modifications
> exactes attendues dans les fichiers cockpit existants (qui n'ont **pas** été
> touchés par l'agent qui a livré ce module — cf. contraintes du brief).

## 1. Inventaire des livrables

| Fichier | Rôle |
| --- | --- |
| `supabase/functions/invite-user/index.ts` | Edge function Deno — création/promotion user + magic-link brandé Élysée |
| `supabase/functions/delete-user/index.ts` | Edge function Deno — suppression complète (master_admin only, typed-confirm) |
| `src/lib/platform/userManagement.js` | Helpers client `inviteUser({...})` et `deleteUser({...})` |
| `src/components/rsa/invite/InviteUserModal.jsx` | Modale unique réutilisable (scope `'global'` | `'club'`) |
| `src/components/rsa/invite/DeleteUserModal.jsx` | Modale 3-step typed-confirm (master_admin only) |
| `src/components/rsa/invite/useInvite.js` | Hooks React Query `useInviteUser()` et `useDeleteUser()` |
| `src/components/rsa/invite/i18n.js` | Dictionnaires FR/EN/DE |
| `src/components/rsa/invite/index.js` | Barrel export |

## 2. Edge functions — déploiement (orchestrateur, via MCP)

Les deux edge functions doivent être déployées sur le projet Supabase
`uaoucznptxmvhhytapso` :

```
supabase functions deploy invite-user
supabase functions deploy delete-user
```

Variables d'environnement requises côté Supabase Functions (déjà présentes,
réutilisées par `send-transactional` et `send-bulk`) :

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — **indispensable** pour `auth.admin.createUser`,
  `auth.admin.generateLink`, `auth.admin.deleteUser`, et l'écriture dans
  `email_sends` (RLS INSERT denied côté JWT)
- `RESEND_API_KEY` — déjà configuré pour les autres fonctions Resend

## 3. Wiring — Master Cockpit

### 3.1 `src/components/rsa/admin/platform/master/tabs/GlobalRolesTab.jsx`

Ajouter en haut du composant (au-dessus du `<RolesManager />`) un bouton
"Inviter un administrateur" qui ouvre `InviteUserModal` en scope `'global'`,
**sans modifier `RolesManager.jsx`** (ce composant reste la source de vérité
pour la liste).

```jsx
import React, { useState } from 'react';
import { Plus, UserMinus } from 'lucide-react';
import { InviteUserModal, DeleteUserModal } from '@/components/rsa/invite';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
// … imports existants …

export default function GlobalRolesTab() {
  const { t } = useLang();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState(null); // string | null

  return (
    <section className="mb-6">
      <header className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(ROLES.sectionTitle)}
        </h3>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[4px] text-[13px] font-medium"
          style={{ background: NAVY, color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          {t({ fr: 'Inviter un administrateur', en: 'Invite an administrator', de: 'Administrator/in einladen' })}
        </button>
      </header>

      {/* … disclaimer existant + <RolesManager /> existant, inchangés … */}

      {/* AVANT le rendu de chaque <tr> ou <li> de RolesManager,
          l'orchestrateur peut wrapper RolesManager dans un nouveau
          composant pour ajouter une colonne "Supprimer le compte" — sinon
          ajouter un mini-tableau séparé "Comptes" qui réutilise les mêmes
          rows via le RPC rsa_list_app_user_roles. Voir §3.2. */}

      {inviteOpen && (
        <InviteUserModal
          scope="global"
          onClose={() => setInviteOpen(false)}
          onSuccess={(res) => {
            toast.success(t({
              fr: res.was_already_existing
                ? 'Rôle mis à jour, email envoyé.'
                : 'Invitation envoyée.',
              en: res.was_already_existing
                ? 'Role updated, email sent.'
                : 'Invitation sent.',
              de: res.was_already_existing
                ? 'Rolle aktualisiert, E-Mail versendet.'
                : 'Einladung versendet.',
            }));
          }}
        />
      )}

      {deleteEmail && (
        <DeleteUserModal
          email={deleteEmail}
          onClose={() => setDeleteEmail(null)}
          onSuccess={() => {
            toast.success(t({
              fr: 'Compte supprimé.',
              en: 'Account deleted.',
              de: 'Konto gelöscht.',
            }));
            setDeleteEmail(null);
          }}
        />
      )}
    </section>
  );
}
```

### 3.2 Bouton "Supprimer le compte" par ligne

Deux options, au choix de l'orchestrateur :

**Option A (recommandée) — wrapper non-invasif autour de `RolesManager`** :
créer un nouveau composant `GlobalAccountsList.jsx` à côté de `RolesManager`,
qui consomme le même RPC `rsa_list_app_user_roles` + ajoute une colonne avec
un bouton "Supprimer le compte" qui ouvre `DeleteUserModal`. Insérer
`<GlobalAccountsList />` au-dessus ou en-dessous de `<RolesManager />` dans
`GlobalRolesTab.jsx`. Ne pas modifier `RolesManager.jsx`.

**Option B — extension de `RolesManager` via prop optionnelle** : refuser
cette option (cassure contrat brief V2.5 : `RolesManager` est sacré).

Le bouton "Supprimer le compte" doit n'apparaître que pour le master_admin
(visibilité gated par `usePlatformAuth().hasRole('master_admin')`). Le serveur
re-vérifie de toute façon (403 si non master_admin).

### 3.3 `src/components/rsa/admin/platform/master/ClubEditor.jsx` — section Membres

Ajouter un bouton "Inviter" dans la section Membres, qui ouvre
`InviteUserModal` en scope `'club'` avec le `clubId` du club en cours :

```jsx
import { InviteUserModal } from '@/components/rsa/invite';

// dans le composant ClubEditor :
const [inviteOpen, setInviteOpen] = useState(false);

// dans la section Membres (entête) :
<button
  type="button"
  onClick={() => setInviteOpen(true)}
  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium"
  style={{ background: NAVY, color: 'white' }}
>
  <Plus className="w-3.5 h-3.5" />
  {t({ fr: 'Inviter', en: 'Invite', de: 'Einladen' })}
</button>

{inviteOpen && (
  <InviteUserModal
    scope="club"
    clubId={club.id}
    onClose={() => setInviteOpen(false)}
    onSuccess={(res) => {
      toast.success(/* idem GlobalRolesTab */);
      // membersQ.refetch() — déjà invalidé par useInviteUser via les
      // queryKey 'rsa.club.members.*' (cf. useInvite.js).
    }}
  />
)}
```

`ClubEditor.jsx` ne doit **pas** être modifié dans sa logique de form —
juste ajouter le bouton et le mount conditionnel de la modale.

## 4. Wiring — Club Cockpit

### 4.1 `src/components/rsa/admin/platform/club/tabs/TeamTab.jsx`

Pattern identique au §3.3 : ajouter un bouton "Inviter" dans l'entête de la
section, qui ouvre `InviteUserModal` en scope `'club'` avec le `clubId` du
club courant. Ce bouton **complète** l'assignation `useAssignClubMember` qui
reste utile pour les users existants (la modale couvre la création + le
welcome email ; l'inline form rapide reste utilisable pour les users déjà
dans `auth.users`).

Important : ne **pas** retirer le form d'assignation existant (`onAssignNew`)
— il reste utile pour le cas où l'admin veut juste ajouter un rôle à un user
sans lui renvoyer un email. La modale est l'outil "onboarding" ; le form
est l'outil "promotion silencieuse".

```jsx
import { InviteUserModal } from '@/components/rsa/invite';

// dans TeamTab :
const [inviteOpen, setInviteOpen] = useState(false);

// dans <header> :
<button
  type="button"
  onClick={() => setInviteOpen(true)}
  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium"
  style={{ background: NAVY, color: 'white' }}
>
  <Plus className="w-3.5 h-3.5" />
  {t({ fr: 'Inviter un membre', en: 'Invite a member', de: 'Mitglied einladen' })}
</button>

{inviteOpen && (
  <InviteUserModal
    scope="club"
    clubId={clubId}
    onClose={() => setInviteOpen(false)}
    onSuccess={() => {
      toast.success(/* idem */);
      // useClubMembers re-fetch via invalidation auto (useInvite.js).
    }}
  />
)}
```

Club Cockpit **n'a pas** de bouton "Supprimer le compte" — la suppression
de compte est master_admin only.

## 5. Toasts

Les modales appellent `onSuccess` après envoi OK. L'orchestrateur doit déclencher
les toasts via `sonner` (déjà utilisé par le projet) :

- Succès invite (nouveau user) : « Invitation envoyée. »
- Succès invite (user existant) : « Rôle mis à jour, email envoyé. »
  → cas signalé par `result.was_already_existing === true`.
- Succès delete : « Compte supprimé. »

Les modales affichent **déjà** un état de succès interne (bloc vert) avant
fermeture — le toast est complémentaire, déclenché en fin de flux.

## 6. Refetch

`useInviteUser` et `useDeleteUser` invalident automatiquement les query keys
suivantes après succès :

- `['rsa', 'club', 'members']` (préfixe) → `useClubMembers` re-fetch
- `['rsa', 'admin', 'roles']` (préfixe) → `useRolesAdmin` re-fetch
- `['rsa', 'admin', 'users']` (préfixe, réservé Phase 2)

L'orchestrateur n'a donc **pas** besoin de pousser de `qc.invalidateQueries`
supplémentaire — les hooks le font déjà.

## 7. Note critique sur SUPABASE_SERVICE_ROLE_KEY

Les deux edge functions utilisent `supabaseAdmin.auth.admin.createUser`,
`supabaseAdmin.auth.admin.generateLink` et `supabaseAdmin.auth.admin.deleteUser`.
Ces appels exigent `SUPABASE_SERVICE_ROLE_KEY`, qui est **déjà** disponible en
environnement Supabase Functions (utilisé par `send-bulk`). Aucune action
DNS ou config supplémentaire requise.

Si l'orchestrateur déploie sur un projet où la clé n'est pas définie, les
fonctions renvoient `500 missing_supabase_env` au premier appel — facile à
diagnostiquer.

## 8. Rate-limit

`invite-user` consulte `email_sends` et refuse (429 `rate_limited`) si une ligne
`audience_type='user_invitation'` avec le même recipient_email existe dans la
dernière heure. Côté UI, le message est mappé via `i18n.errorRateLimited`.

C'est un garde-fou basique ; pour un vrai rate-limit DB-level on pourrait
ajouter une migration `CREATE INDEX ... WHERE audience_type='user_invitation'`
pour optimiser la query. Pas nécessaire en V2.5 (< 100 invites/jour prévues).

## 9. Audit log

`delete-user` insère une ligne dans `admin_audit_log` (table déjà existante,
créée par `20260531_rsa_v25_competition_delete_audit.sql`) avec :

- `action = 'user_deleted'`
- `target_kind = 'user'`
- `target_id = <uuid>`
- `payload = { target_email, had_global_roles, had_club_memberships, cascades, nullify_results }`

`invite-user` **n'écrit pas** dans `admin_audit_log` (juste dans `email_sends`
pour le rate-limit). Si on veut auditer aussi les invites, ajouter une seconde
insert dans le handler (1 ligne — non bloquant si échoue).

## 10. TODO restants (V2.6+)

- [ ] Tests E2E : Playwright ou Cypress pour le flow complet
      master_admin → InviteUserModal → email reçu → magic-link cliqué →
      session active.
- [ ] Refetch granulaire : actuellement on invalide tout
      `['rsa', 'club', 'members']` — on pourrait cibler le clubId précis,
      mais le coût est négligeable (~50 membres max par club).
- [ ] Bouton "Renvoyer l'invitation" : actuellement le rate-limit bloque ;
      ajouter un override master_admin pour forcer un renvoi.
- [ ] Section "Comptes globaux" séparée dans GlobalRolesTab :
      `GlobalAccountsList.jsx` à créer pour la colonne "Supprimer le compte"
      (cf. §3.2 option A).
- [ ] i18n DE : relire avec un natif allemand — les chaînes ont été écrites
      en suivant le pattern des autres modules mais sans QA linguistique.
- [ ] Monitoring : ajouter un `console.info` dans les edge functions avec
      `user_id`, `was_already_existing`, latence Resend, pour faciliter
      le debug ultérieur via `supabase functions logs invite-user`.

## 11. Vérification rapide

Une fois wired, le flow nominal master_admin → onboarding d'un nouveau
club_admin doit prendre **< 60 secondes** :

1. Master Cockpit → Clubs → ouvrir un club → section Membres → "Inviter".
2. Saisir email, rôle (club_admin), message court (facultatif).
3. Cliquer "Inviter".
4. Toast vert "Invitation envoyée" ; la modale se ferme.
5. L'invité reçoit un email Élysée brandé (NAVY header, gold rule, message
   custom en italique, CTA NAVY) avec un magic-link Supabase.
6. Clic sur le CTA → atterrit sur `/Login` avec une session active → tous
   ses droits club_admin du club ciblé sont déjà appliqués.

Si une étape échoue, vérifier :

- `RESEND_API_KEY` configurée côté Supabase Functions
- `SUPABASE_SERVICE_ROLE_KEY` configurée côté Supabase Functions
- Domaine `rotary-startup.org` vérifié dans Resend (cf.
  `docs/deepsolve/email-smtp-resend-setup.md`)
- Logs : `supabase functions logs invite-user --tail`
