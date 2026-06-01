# Jury sans compte — Lot A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire d'un juré une simple ligne `jury_applications` (zéro compte/email), lire la composition d'une session depuis `jury_applications` (affectés vs en attente), et corriger 3 fixes UX (toggle, cartes sessions, LIVE/Reset).

**Architecture:** Approbation = flip de `status` global (plus de compte auth, plus d'`invite-user`, plus de `platform_jury_assignments`). La composition d'une session se résout depuis `jury_applications` où `session ∈ availability_session_ids`, scindée approved/pending. Tout l'accès serveur via RPC SECURITY DEFINER club-scoped existantes (`has_platform_role`, `is_master_admin`, `is_club_member`).

**Tech Stack:** React 18 + Vite, Supabase (RPC SECURITY DEFINER), TanStack Query, tests purs `node --test`. Blueprint : `docs/blueprints/jury-no-account-scoring.md` (Lot A).

---

## File Structure

**Créés :**
- `supabase/migrations/20260601160000_jury_no_account_lotA.sql` — simplifie `rsa_approve_jury_application` (status-only) + 3 RPC : `rsa_session_jurors`, `rsa_add_manual_juror`, `rsa_remove_juror_from_session`.
- `src/lib/rsa/club-cockpit/sessionJurors.js` — résolveur pur `splitSessionJurors(rows)`.
- `src/lib/rsa/club-cockpit/__tests__/sessionJurors.test.js`.

**Modifiés :**
- `src/lib/rsa/entities/jury-applications.js` — `approve()` status-only ; `addManualJuror()` ; `removeFromSession()`.
- `src/components/rsa/admin/platform/club/jury/useJury.js` — `useSessionJurorRoster`, `useApproveJuror`, `useAddManualJuror`, `useRemoveJurorFromSession`.
- `src/components/rsa/admin/platform/club/jury/SessionJurorsList.jsx` — 2 groupes (Affectés/En attente) + actions.
- `src/components/rsa/admin/platform/club/jury/AddJurorModal.jsx` — formulaire d'ajout manuel simple (nom + qualité + email optionnel).
- `src/components/rsa/admin/platform/club/tabs/JuryApplicationsTab.jsx` — approbation simple (retire invite/needs-auth).
- `src/components/rsa/admin/platform/club/ClubCockpit.jsx` — toggle sous le sélecteur.
- `src/components/rsa/admin/platform/SessionsManager.jsx` — cartes espacées, LIVE→ retiré, Reset discret.
- `src/components/rsa/admin/platform/master/i18n/session-jury.js` — libellés groupes + ajout manuel.

---

## Task 1: Migration — approbation status-only + 3 RPC

**Files:**
- Create: `supabase/migrations/20260601160000_jury_no_account_lotA.sql`

- [ ] **Step 1: Écrire la migration**

```sql
-- Lot A — Jury sans compte. L'approbation ne crée plus de compte/assignation ;
-- la composition d'une session se lit depuis jury_applications.
-- Cf. docs/blueprints/jury-no-account-scoring.md (Lot A).
BEGIN;

-- 1) Approbation = flip de statut SEULEMENT. Plus de compte auth, plus de
--    platform_jury_assignments, plus de membership/profile. Garde le même nom
--    (l'entité JS l'appelle), simplifie le retour à la ligne jury_applications.
DROP FUNCTION IF EXISTS public.rsa_approve_jury_application(uuid);
CREATE OR REPLACE FUNCTION public.rsa_approve_jury_application(p_application_id uuid)
RETURNS public.jury_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_app public.jury_applications;
BEGIN
  SELECT * INTO v_app FROM public.jury_applications WHERE id = p_application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidature % introuvable.', p_application_id USING ERRCODE = '23503';
  END IF;
  IF NOT (public.is_master_admin() OR public.is_club_member(v_app.club_id, 'club_admin')) THEN
    RAISE EXCEPTION 'Seul un master_admin ou club_admin de % peut approuver.', v_app.club_id
      USING ERRCODE = '42501';
  END IF;
  IF v_app.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Cette candidature est %, impossible d''approuver.', v_app.status
      USING ERRCODE = '22023';
  END IF;
  IF v_app.status = 'pending' THEN
    UPDATE public.jury_applications
       SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
     WHERE id = p_application_id
    RETURNING * INTO v_app;
  END IF;
  RETURN v_app;
END;
$$;
REVOKE ALL ON FUNCTION public.rsa_approve_jury_application(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rsa_approve_jury_application(uuid) TO authenticated;

-- 2) Roster d'une session : candidatures dont availability_session_ids contient
--    la session, statut pending|approved. Lecture admin/club_admin de la session.
CREATE OR REPLACE FUNCTION public.rsa_session_jurors(p_session_id text)
RETURNS SETOF public.jury_applications
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_club_id text;
BEGIN
  SELECT club_id INTO v_club_id FROM public.sessions WHERE id = p_session_id;
  IF NOT (public.is_master_admin() OR (v_club_id IS NOT NULL AND public.is_club_member(v_club_id, 'club_admin'))) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT * FROM public.jury_applications ja
     WHERE p_session_id = ANY(ja.availability_session_ids)
       AND ja.status IN ('pending', 'approved')
     ORDER BY ja.status DESC, lower(ja.full_name) ASC;  -- pending avant approved ? non : approved>pending
END;
$$;
REVOKE ALL ON FUNCTION public.rsa_session_jurors(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rsa_session_jurors(text) TO authenticated;

-- 3) Ajout manuel d'un juré : crée une candidature approved attachée à la session.
CREATE OR REPLACE FUNCTION public.rsa_add_manual_juror(
  p_session_id text,
  p_full_name  text,
  p_qualite    text DEFAULT NULL,
  p_email      text DEFAULT NULL
)
RETURNS public.jury_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_club_id text;
  v_edition_id text;
  v_row public.jury_applications;
BEGIN
  SELECT club_id, edition_id INTO v_club_id, v_edition_id FROM public.sessions WHERE id = p_session_id;
  IF v_club_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.sessions WHERE id = p_session_id) THEN
    RAISE EXCEPTION 'session introuvable: %', p_session_id USING ERRCODE = '23503';
  END IF;
  IF NOT (public.is_master_admin() OR (v_club_id IS NOT NULL AND public.is_club_member(v_club_id, 'club_admin'))) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_full_name IS NULL OR length(trim(p_full_name)) < 2 THEN
    RAISE EXCEPTION 'Nom requis.' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.jury_applications (
    club_id, edition_id, email, full_name, qualite,
    availability_session_ids, status, reviewed_by, reviewed_at
  ) VALUES (
    v_club_id, v_edition_id, NULLIF(lower(trim(coalesce(p_email,''))),''), trim(p_full_name),
    p_qualite, ARRAY[p_session_id]::text[], 'approved', auth.uid(), now()
  ) RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.rsa_add_manual_juror(text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rsa_add_manual_juror(text, text, text, text) TO authenticated;

-- 4) Retirer un juré d'UNE session (modèle global : il reste approved pour ses
--    autres sessions). array_remove sur availability_session_ids.
CREATE OR REPLACE FUNCTION public.rsa_remove_juror_from_session(
  p_application_id uuid,
  p_session_id     text
)
RETURNS public.jury_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_club_id text;
  v_row public.jury_applications;
BEGIN
  SELECT club_id INTO v_club_id FROM public.sessions WHERE id = p_session_id;
  IF NOT (public.is_master_admin() OR (v_club_id IS NOT NULL AND public.is_club_member(v_club_id, 'club_admin'))) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.jury_applications
     SET availability_session_ids = array_remove(availability_session_ids, p_session_id)
   WHERE id = p_application_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidature % introuvable.', p_application_id USING ERRCODE = '23503';
  END IF;
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.rsa_remove_juror_from_session(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rsa_remove_juror_from_session(uuid, text) TO authenticated;

COMMIT;
```

> **Note :** confirme les noms de helpers de rôle (`is_master_admin`, `is_club_member`,
> `has_platform_role`) inchangés en grepant `supabase/migrations/` — ils sont utilisés à
> l'identique dans l'ancien `rsa_approve_jury_application`. Le tri du roster met `approved`
> avant `pending` (status DESC : 'pending' < 'approved' alphabétiquement → DESC = approved
> d'abord) ; le split réel se fait côté JS (Task 2), l'ordre SQL est cosmétique.

- [ ] **Step 2: Vérifier les helpers de rôle**

Run: `grep -rEo "function public\.(is_master_admin|is_club_member|has_platform_role)\(" supabase/migrations/ | sort -u`
Expected: les trois existent. Sinon adapter la garde.

- [ ] **Step 3: Appliquer via MCP**

MCP `apply_migration` (projet `uaoucznptxmvhhytapso`, name `jury_no_account_lotA`, le SQL du Step 1).
Expected: succès.

- [ ] **Step 4: Advisors**

MCP `get_advisors` (security). Expected: pas de `search_path` mutable ni anon-execute sur les 4 fonctions.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260601160000_jury_no_account_lotA.sql
git commit -m "feat(db): jury sans compte — approbation status-only + RPC roster/add/remove session"
```

---

## Task 2: Résolveur pur `splitSessionJurors` (TDD)

**Files:**
- Create: `src/lib/rsa/club-cockpit/sessionJurors.js`
- Test: `src/lib/rsa/club-cockpit/__tests__/sessionJurors.test.js`

- [ ] **Step 1: Test (échoue)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitSessionJurors } from '../sessionJurors.js';

const ROWS = [
  { id: 'a', full_name: 'Marie Durand', qualite: 'investisseur', status: 'approved' },
  { id: 'b', full_name: 'Paul Martin', qualite: 'expert', status: 'pending' },
  { id: 'c', full_name: 'Léa Bonnet', qualite: 'entrepreneur', status: 'pending' },
  { id: 'd', full_name: 'Anne Roy', qualite: 'corporate', status: 'approved' },
];

test('scinde approved / pending', () => {
  const { assigned, pending } = splitSessionJurors(ROWS);
  assert.deepEqual(assigned.map((r) => r.id), ['a', 'd']);
  assert.deepEqual(pending.map((r) => r.id), ['b', 'c']);
});

test('tri alphabétique par nom dans chaque groupe', () => {
  const { assigned } = splitSessionJurors(ROWS);
  assert.deepEqual(assigned.map((r) => r.full_name), ['Anne Roy', 'Marie Durand']);
});

test('entrée vide / nulle → groupes vides', () => {
  assert.deepEqual(splitSessionJurors(null), { assigned: [], pending: [] });
  assert.deepEqual(splitSessionJurors([]), { assigned: [], pending: [] });
});

test('ignore les statuts hors pending/approved', () => {
  const { assigned, pending } = splitSessionJurors([{ id: 'x', full_name: 'X', status: 'rejected' }]);
  assert.equal(assigned.length, 0);
  assert.equal(pending.length, 0);
});
```

- [ ] **Step 2: Run → FAIL**

Run: `node --test src/lib/rsa/club-cockpit/__tests__/sessionJurors.test.js`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémentation**

```js
// Résolveur pur : lignes jury_applications d'une session -> { assigned, pending }.
// Affectés = approved, En attente = pending. Tri alpha par nom dans chaque groupe.
// Aucune dépendance réseau/DB. Cf. blueprint Lot A §A.2.

function byName(a, b) {
  return String(a.full_name || '').localeCompare(String(b.full_name || ''));
}

export function splitSessionJurors(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const assigned = list.filter((r) => r.status === 'approved').slice().sort(byName);
  const pending = list.filter((r) => r.status === 'pending').slice().sort(byName);
  return { assigned, pending };
}
```

- [ ] **Step 4: Run → PASS**

Run: `node --test src/lib/rsa/club-cockpit/__tests__/sessionJurors.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rsa/club-cockpit/sessionJurors.js src/lib/rsa/club-cockpit/__tests__/sessionJurors.test.js
git commit -m "feat(club-cockpit): résolveur pur split affectés/en attente"
```

---

## Task 3: Entité `jury-applications.js`

**Files:**
- Modify: `src/lib/rsa/entities/jury-applications.js`

- [ ] **Step 1: Lire le fichier**, repérer `approve()` (lignes ~93-112) et `_rpcApprove` (~114-126).

- [ ] **Step 2: Remplacer `approve()` et `_rpcApprove` par une version status-only**

Remplacer les deux méthodes (`approve` + `_rpcApprove`) par :

```js
  // Approbation = flip de statut serveur (RPC). Aucun compte/email/affectation.
  async approve(id) {
    const { data, error } = await supabase.rpc('rsa_approve_jury_application', {
      p_application_id: id,
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data; // la ligne jury_applications
  },

  // Ajout manuel d'un juré (candidature approved attachée à la session).
  async addManualJuror({ sessionId, fullName, qualite = null, email = null }) {
    const { data, error } = await supabase.rpc('rsa_add_manual_juror', {
      p_session_id: sessionId,
      p_full_name: fullName,
      p_qualite: qualite,
      p_email: email,
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  },

  // Retire le juré d'UNE session (reste approved pour ses autres sessions).
  async removeFromSession({ applicationId, sessionId }) {
    const { error } = await supabase.rpc('rsa_remove_juror_from_session', {
      p_application_id: applicationId,
      p_session_id: sessionId,
    });
    if (error) throw error;
  },

  // Liste les candidatures (roster) d'une session : pending + approved.
  async listForSession(sessionId) {
    const { data, error } = await supabase.rpc('rsa_session_jurors', {
      p_session_id: sessionId,
    });
    if (error) throw error;
    return data || [];
  },
```

> Garde les autres méthodes (`reject`, `listByClub`, `create`, etc.) intactes. Si l'ancien
> `approve` était appelé avec `(id, { lang })`, le nouvel appelant (Task 7) passera juste `(id)`.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: pas d'erreur nouvelle sur le fichier.

- [ ] **Step 4: Commit**

```bash
git add src/lib/rsa/entities/jury-applications.js
git commit -m "feat(jury): entité approve status-only + addManualJuror/removeFromSession/listForSession"
```

---

## Task 4: Hooks `useJury.js`

**Files:**
- Modify: `src/components/rsa/admin/platform/club/jury/useJury.js`

- [ ] **Step 1: Ajouter les imports d'entité en tête** (le fichier importe déjà `supabase`) :

```js
import { JuryApplication } from '@/lib/rsa/entities';
import { splitSessionJurors } from '@/lib/rsa/club-cockpit/sessionJurors';
```

- [ ] **Step 2: Ajouter 4 hooks à la fin du fichier**

```js
// ── Roster d'une session depuis jury_applications (Lot A, sans compte) ────────
export function useSessionJurorRoster(sessionId) {
  return useQuery({
    queryKey: ['rsa', 'session-jury', 'roster', sessionId],
    queryFn: async () => {
      if (!sessionId) return { assigned: [], pending: [] };
      const rows = await JuryApplication.listForSession(sessionId);
      return splitSessionJurors(rows);
    },
    enabled: !!sessionId,
    staleTime: 15 * 1000,
  });
}

const rosterKey = (sessionId) => ['rsa', 'session-jury', 'roster', sessionId];

export function useApproveJuror(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (applicationId) => JuryApplication.approve(applicationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: rosterKey(sessionId) }),
  });
}

export function useAddManualJuror(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fullName, qualite, email }) =>
      JuryApplication.addManualJuror({ sessionId, fullName, qualite, email }),
    onSuccess: () => qc.invalidateQueries({ queryKey: rosterKey(sessionId) }),
  });
}

export function useRemoveJurorFromSession(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (applicationId) =>
      JuryApplication.removeFromSession({ applicationId, sessionId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: rosterKey(sessionId) }),
  });
}
```

> Laisse les anciens hooks (`useSessionJurors`, `useAssignJuror`, etc.) en place pour ne pas
> casser d'autres imports ; ils ne seront plus utilisés par `SessionJurorsList` après Task 5.

- [ ] **Step 3: Lint** → `npm run lint` (pas d'erreur nouvelle).

- [ ] **Step 4: Commit**

```bash
git add src/components/rsa/admin/platform/club/jury/useJury.js
git commit -m "feat(club-cockpit): hooks roster/approve/add/remove jury depuis jury_applications"
```

---

## Task 5: `SessionJurorsList` — 2 groupes + actions

**Files:**
- Modify: `src/components/rsa/admin/platform/club/jury/SessionJurorsList.jsx`

- [ ] **Step 1: Lire le fichier** (202 lignes). Tu vas remplacer le corps qui lit `useSessionJurors`/`useRemoveJuror` par `useSessionJurorRoster` + les nouvelles mutations, et rendre DEUX groupes.

- [ ] **Step 2: Réécrire le composant** (garde l'enveloppe `<section>`/header/`AddJurorModal`, change la source et le rendu) :

```jsx
import React, { useState } from 'react';
import { Plus, Loader2, Check, X } from 'lucide-react';
import { NAVY, INK, GOLD, MUTED, CREAM2 } from '@/components/design/tokens';
import { DANGER, FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { SESSION_JURY } from '@/components/rsa/admin/platform/master/i18n';
import { useSessionJurorRoster, useApproveJuror, useRemoveJurorFromSession } from './useJury';
import AddJurorModal from './AddJurorModal';

function JurorLine({ row, right }) {
  const sub = [row.qualite, row.organisation].filter(Boolean).join(' · ');
  return (
    <li className="flex items-center gap-3 py-1.5">
      <span className="flex-1 text-[12.5px]" style={{ color: NAVY }}>
        {row.full_name}{sub && <span style={{ color: MUTED }}> — {sub}</span>}
      </span>
      {right}
    </li>
  );
}

export default function SessionJurorsList({ sessionId, clubId }) {
  const { t } = useLang();
  const rosterQ = useSessionJurorRoster(sessionId);
  const approve = useApproveJuror(sessionId);
  const removeFromSession = useRemoveJurorFromSession(sessionId);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const assigned = rosterQ.data?.assigned || [];
  const pending = rosterQ.data?.pending || [];

  const run = async (id, fn) => {
    setBusyId(id);
    try { await fn(); } finally { setBusyId(null); }
  };

  return (
    <section className="rounded-[4px] p-3 mt-2" style={{ border: `1px solid ${CREAM2}` }} aria-label={t(SESSION_JURY.sectionTitle)}>
      <header className="flex items-center gap-2 mb-2">
        <h5 className="uppercase text-[10.5px] tracking-[0.14em] font-medium" style={{ color: MUTED }}>
          {t(SESSION_JURY.sectionTitle)}
        </h5>
        <span className="text-[11px]" style={{ color: MUTED }}>· {assigned.length} {t(SESSION_JURY.assignedShort)} · {pending.length} {t(SESSION_JURY.pendingShort)}</span>
        <button type="button" onClick={() => setModalOpen(true)}
          className={`ml-auto inline-flex items-center gap-1 text-[11.5px] px-2 py-1 rounded-[4px] ${FOCUS_RING_CLASS}`}
          style={{ background: NAVY, color: 'white' }}>
          <Plus className="w-3.5 h-3.5" aria-hidden /> {t(SESSION_JURY.addJuror)}
        </button>
      </header>

      {rosterQ.isLoading && <Loader2 className="w-4 h-4 animate-spin" style={{ color: GOLD }} aria-hidden />}

      {!rosterQ.isLoading && assigned.length === 0 && pending.length === 0 && (
        <p className="text-[12px]" style={{ color: MUTED }}>{t(SESSION_JURY.empty)}</p>
      )}

      {assigned.length > 0 && (
        <>
          <p className="uppercase text-[10px] tracking-[0.12em] mt-1 mb-0.5" style={{ color: GOLD }}>{t(SESSION_JURY.groupAssigned)}</p>
          <ul>
            {assigned.map((r) => (
              <JurorLine key={r.id} row={r} right={
                <button type="button" disabled={busyId === r.id}
                  onClick={() => run(r.id, () => removeFromSession.mutateAsync(r.id))}
                  className={`text-[11.5px] inline-flex items-center gap-1 ${FOCUS_RING_CLASS}`} style={{ color: DANGER }}>
                  <X className="w-3.5 h-3.5" aria-hidden /> {t(SESSION_JURY.remove)}
                </button>
              } />
            ))}
          </ul>
        </>
      )}

      {pending.length > 0 && (
        <>
          <p className="uppercase text-[10px] tracking-[0.12em] mt-2 mb-0.5" style={{ color: MUTED }}>{t(SESSION_JURY.groupPending)}</p>
          <ul>
            {pending.map((r) => (
              <JurorLine key={r.id} row={r} right={
                <button type="button" disabled={busyId === r.id}
                  onClick={() => run(r.id, () => approve.mutateAsync(r.id))}
                  className={`text-[11.5px] inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] ${FOCUS_RING_CLASS}`}
                  style={{ border: `1px solid ${CREAM2}`, color: NAVY }}>
                  <Check className="w-3.5 h-3.5" aria-hidden /> {t(SESSION_JURY.approve)}
                </button>
              } />
            ))}
          </ul>
        </>
      )}

      {modalOpen && <AddJurorModal sessionId={sessionId} clubId={clubId} onClose={() => setModalOpen(false)} />}
    </section>
  );
}
```

- [ ] **Step 3: Lint** → `npm run lint` (les nouveaux i18n keys `assignedShort/pendingShort/groupAssigned/groupPending/approve` sont ajoutés en Task 10 ; si lint tourne avant, ils existeront après Task 10 — l'ordre d'exécution garde Task 10 avant le build final, mais ajoute-les maintenant si lint échoue sur un import manquant — ils sont dans SESSION_JURY).

- [ ] **Step 4: Commit**

```bash
git add src/components/rsa/admin/platform/club/jury/SessionJurorsList.jsx
git commit -m "feat(club-cockpit): composition session en 2 groupes (affectés/en attente) + actions"
```

---

## Task 6: `AddJurorModal` — ajout manuel simple

**Files:**
- Modify: `src/components/rsa/admin/platform/club/jury/AddJurorModal.jsx`

- [ ] **Step 1: Lire le fichier** (551 lignes, 3 modes auth). On le remplace par un formulaire unique d'ajout manuel (nom + qualité + email optionnel) → `useAddManualJuror`.

- [ ] **Step 2: Réécrire le composant** intégralement :

```jsx
// AddJurorModal — ajout manuel d'un juré (sans compte). Crée une candidature
// approved attachée à la session. Cf. blueprint Lot A §A.2.
import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { NAVY, INK, MUTED, CREAM2, SERIF } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { SESSION_JURY } from '@/components/rsa/admin/platform/master/i18n';
import { useAddManualJuror } from './useJury';

const QUALITES = ['investisseur', 'entrepreneur', 'expert', 'corporate', 'autre'];

export default function AddJurorModal({ sessionId, onClose }) {
  const { t } = useLang();
  const add = useAddManualJuror(sessionId);
  const [fullName, setFullName] = useState('');
  const [qualite, setQualite] = useState('expert');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (fullName.trim().length < 2) { setError(t(SESSION_JURY.errNameRequired)); return; }
    setError(null);
    try {
      await add.mutateAsync({ fullName: fullName.trim(), qualite, email: email.trim() || null });
      onClose();
    } catch (err) {
      setError(err?.message || 'Error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,31,61,0.45)' }} role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-md rounded-[6px] p-5" style={{ background: 'white' }}>
        <div className="flex items-center mb-3">
          <h4 className="text-[16px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>{t(SESSION_JURY.addJuror)}</h4>
          <button type="button" onClick={onClose} className={`ml-auto p-1 rounded-[3px] ${FOCUS_RING_CLASS}`} style={{ color: MUTED }} aria-label={t(SESSION_JURY.modalCancel)}>
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        <label className="block text-[12px] mb-2" style={{ color: INK }}>
          {t(SESSION_JURY.formFullName)}
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus maxLength={120}
            className={`mt-1 w-full rounded-[4px] px-2.5 py-1.5 ${FOCUS_RING_CLASS}`} style={{ border: `1px solid ${CREAM2}`, color: NAVY }} />
        </label>

        <label className="block text-[12px] mb-2" style={{ color: INK }}>
          {t(SESSION_JURY.formQualite)}
          <select value={qualite} onChange={(e) => setQualite(e.target.value)}
            className={`mt-1 w-full rounded-[4px] px-2.5 py-2 ${FOCUS_RING_CLASS}`} style={{ border: `1px solid ${CREAM2}`, color: NAVY }}>
            {QUALITES.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
        </label>

        <label className="block text-[12px] mb-3" style={{ color: INK }}>
          {t(SESSION_JURY.formEmail)} <span style={{ color: MUTED }}>({t(SESSION_JURY.optional)})</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className={`mt-1 w-full rounded-[4px] px-2.5 py-1.5 ${FOCUS_RING_CLASS}`} style={{ border: `1px solid ${CREAM2}`, color: NAVY }} />
        </label>

        {error && <p className="text-[12px] mb-2" role="alert" style={{ color: '#b00020' }}>{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={`text-[12.5px] px-3 py-1.5 rounded-[4px] ${FOCUS_RING_CLASS}`} style={{ color: MUTED }}>{t(SESSION_JURY.modalCancel)}</button>
          <button type="submit" disabled={add.isPending} className={`inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] ${FOCUS_RING_CLASS}`} style={{ background: NAVY, color: 'white' }}>
            {add.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />} {t(SESSION_JURY.modalSubmit)}
          </button>
        </div>
      </form>
    </div>
  );
}
```

> `clubId` n'est plus nécessaire (le club vient de la session côté RPC) ; on garde la prop dans
> la signature de SessionJurorsList mais AddJurorModal ne l'exige plus.

- [ ] **Step 3: Lint** → `npm run lint`.

- [ ] **Step 4: Commit**

```bash
git add src/components/rsa/admin/platform/club/jury/AddJurorModal.jsx
git commit -m "feat(club-cockpit): AddJurorModal = ajout manuel simple (sans compte)"
```

---

## Task 7: `JuryApplicationsTab` — approbation simple

**Files:**
- Modify: `src/components/rsa/admin/platform/club/tabs/JuryApplicationsTab.jsx`

- [ ] **Step 1: Lire** les lignes ~455-510 (approve mutation + handlers) et la carte ~340-378 (needsAuthBanner + boutons).

- [ ] **Step 2: Simplifier la mutation `approve`** (lignes ~455-479) :

```jsx
  const approve = useMutation({
    mutationFn: (id) => JuryApplication.approve(id),
    onSuccess: () => {
      setBusyId(null);
      qc.invalidateQueries({ queryKey: ['rsa', 'jury-applications', clubId] });
      setToast({ kind: 'ok', msg: t(JURY_TAB_UI.approveSuccess) });
    },
    onError: (err) => { setBusyId(null); setToast({ kind: 'err', msg: err?.message || 'Error' }); },
  });
```

- [ ] **Step 3: Retirer l'état et l'UI `needsAuthBanner`** : supprimer la déclaration `const [needsAuthBanner, setNeedsAuthBanner] = useState(...)`, toute référence `setNeedsAuthBanner`, la prop `needsAuthBanner={...}` passée à `ApplicationCard` (~610-624), et le bloc de bannière gold dans la carte (~340-353, qui rend `approveNeedsAuthTitle/Body` + bouton Copy-email). Garde le reste (boutons Approve/Reject, RejectModal) inchangé.

> Les clés i18n `approveInvited`, `approveInviteError`, `approveNeedsAuthTitle/Body` deviennent
> inutilisées — les laisser dans le dict est sans risque (ne pas les supprimer pour éviter de
> casser d'autres usages éventuels).

- [ ] **Step 4: Lint + build partiel** → `npm run lint` (pas d'erreur ; aucune référence orpheline à `needsAuthBanner`).

- [ ] **Step 5: Commit**

```bash
git add src/components/rsa/admin/platform/club/tabs/JuryApplicationsTab.jsx
git commit -m "feat(jury): approbation simple sans compte/email (retire needs-auth/invite)"
```

---

## Task 8: `ClubCockpit` — toggle sous le sélecteur

**Files:**
- Modify: `src/components/rsa/admin/platform/club/ClubCockpit.jsx`

- [ ] **Step 1: Lire** la région ~225-307 (ClubStatusStrip → mode switch → filter row → tabs box).

- [ ] **Step 2: Déplacer le bloc `{/* Mode switch ... */}`** (le `<div role="tablist" ...>` complet, juste après `<ClubStatusStrip .../>`) pour qu'il soit rendu **après** le bloc `{/* Filter row ... */}` (le `<div className="flex flex-wrap items-center gap-3 mb-3">…</div>`) et **avant** `{/* Tabs box */}`. Ne change pas le contenu du bloc, seulement sa position. Ajuste les marges si besoin (le mode switch garde `mb-4`).

Ordre cible : `ClubStatusStrip` → Filter row (sélecteur compétition/session) → **Mode switch** → Tabs box → Panel.

- [ ] **Step 3: Vérifier** → `npm run build` (le shell compile, aucun JSX cassé).

- [ ] **Step 4: Commit**

```bash
git add src/components/rsa/admin/platform/club/ClubCockpit.jsx
git commit -m "fix(club-cockpit): toggle Préparation/Pilotage sous le sélecteur compétition"
```

---

## Task 9: `SessionsManager` — cartes + retrait LIVE + Reset discret

**Files:**
- Modify: `src/components/rsa/admin/platform/SessionsManager.jsx`

- [ ] **Step 1: Lire** les lignes 392-461 (liste `<ul divide-y>` + `<li>` + LIVE→/Reset + mount SessionJurorsList).

- [ ] **Step 2: Remplacer le `<ul className="divide-y">` … `</ul>`** par une liste de **cartes espacées** : retirer `divide-y`, transformer chaque `<li className="py-3">` en carte. **Retirer le bouton `LIVE →`**. Garder `<ResetButton>` mais le déplacer en **pied de carte, discret** (aligné à droite, sous le contenu). Bloc cible :

```jsx
{!isLoading && visibleSessions.length > 0 && (
  <ul className="flex flex-col gap-3">
    {visibleSessions.map((s) => {
      const status = s.config?.status || 'draft';
      return (
        <li key={s.id} className="rounded-[6px] p-3.5" style={{ background: 'white', border: `1px solid ${CREAM2}`, boxShadow: '0 1px 2px rgba(15,31,61,0.04)' }}>
          <div className="flex items-start gap-3 flex-wrap">
            <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px]"
              style={{ background: '#fdf6e8', color: NAVY, fontFamily: SERIF }}>{s.position ?? 0}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13.5px] font-medium" style={{ color: NAVY }}>{s.name}</span>
                <StatusPill status={status} kind="jury" />
                <span className="text-[12px]" style={{ color: MUTED }}>· {s.kind}</span>
                {s.session_date && <span className="text-[12px]" style={{ color: MUTED }}>· {s.session_date}</span>}
              </div>
              {s.theme && <p className="text-[12px] mt-0.5" style={{ color: INK }}>{s.theme}</p>}
              <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>{s.id}{s.club_id && <span> · {s.club_id}</span>}</p>
              {s.config?.teams_link && (
                <a href={s.config.teams_link} target="_blank" rel="noreferrer" className="text-[11.5px] underline" style={{ color: NAVY }}>{t(SETUP.teamsLinkOpen)}</a>
              )}
            </div>
          </div>

          {clubId && <SessionJurorsList sessionId={s.id} clubId={clubId} />}

          {status === 'draft' && (
            <div className="mt-2 flex justify-end">
              <ResetButton sessionId={s.id} sessionName={s.name} onReset={(sid) => resetSession.mutateAsync(sid)} />
            </div>
          )}
        </li>
      );
    })}
  </ul>
)}
```

> `onSelectSession` n'est plus utilisé ici (LIVE→ retiré). Garde la prop dans la signature
> (d'autres parents peuvent la passer) mais elle devient inutilisée dans ce rendu — pas d'erreur
> lint (prop non destructurée si déjà optionnelle). Si lint signale un import désormais inutile,
> retire-le.

- [ ] **Step 3: Vérifier** → `npm run build`.

- [ ] **Step 4: Commit**

```bash
git add src/components/rsa/admin/platform/SessionsManager.jsx
git commit -m "fix(club-cockpit): sessions en cartes espacées, LIVE→ retiré, Reset discret"
```

---

## Task 10: i18n des nouveaux libellés

**Files:**
- Modify: `src/components/rsa/admin/platform/master/i18n/session-jury.js`

- [ ] **Step 1: Ajouter** dans l'objet `SESSION_JURY` (suivre la forme `{fr,en,de}`) :

```js
  groupAssigned: { fr: 'Affectés', en: 'Assigned', de: 'Zugewiesen' },
  groupPending:  { fr: 'En attente', en: 'Pending', de: 'Ausstehend' },
  assignedShort: { fr: 'affecté(s)', en: 'assigned', de: 'zugewiesen' },
  pendingShort:  { fr: 'en attente', en: 'pending', de: 'ausstehend' },
  approve:       { fr: 'Approuver', en: 'Approve', de: 'Genehmigen' },
  formFullName:  { fr: 'Nom complet', en: 'Full name', de: 'Vollständiger Name' },
  errNameRequired: { fr: 'Nom requis (2 caractères min).', en: 'Name required (2 chars min).', de: 'Name erforderlich (min. 2 Zeichen).' },
  optional:      { fr: 'optionnel', en: 'optional', de: 'optional' },
```

> `formQualite`, `formEmail`, `modalCancel`, `modalSubmit`, `addJuror`, `remove`, `empty`,
> `sectionTitle` existent déjà (cf. fichier). Ne pas les dupliquer.

- [ ] **Step 2: Vérifier** → `npm run lint` puis `npm run build`.

- [ ] **Step 3: Commit**

```bash
git add src/components/rsa/admin/platform/master/i18n/session-jury.js
git commit -m "feat(i18n): libellés groupes jury + ajout manuel (FR/EN/DE)"
```

---

## Vérification finale Lot A

- [ ] `node --test src/lib/rsa/club-cockpit/__tests__/sessionJurors.test.js` → PASS.
- [ ] `npm run lint` → propre sur les fichiers touchés.
- [ ] `npm run build` → OK.
- [ ] MCP `get_advisors` (security) → RAS sur les 4 nouvelles RPC.
- [ ] Browser (manuel) : approuver une candidature jury → apparaît en « Affectés » de ses sessions sans email/compte ; « En attente » visible avant validation ; ajout manuel d'un juré ; toggle sous le sélecteur ; sessions en cartes sans LIVE→.

---

## Couverture spec (auto-revue)

- Blueprint §A.1 (approbation status-only, sans compte/email) → Task 1, Task 3, Task 7.
- Blueprint §A.2 (composition depuis jury_applications, affectés/en attente, add manuel, retrait session) → Task 1, Task 2, Task 4, Task 5, Task 6.
- Blueprint §A.3 (toggle, cartes, LIVE/Reset) → Task 8, Task 9.
- i18n → Task 10.
