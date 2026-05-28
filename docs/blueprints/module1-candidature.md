# Module 1 — Candidature (« Espace Startup »)

> Build-ready spec for the in-app application funnel that **replaces the Airtable form**
> while **reusing its proven, well-liked multi-step funnel UX**.
> Part of the RSA platform rebuild — see memory `project_rsa_platform_rebuild`.

- **Stack** : React 18 + Vite, Tailwind + shadcn/ui, Supabase (DB + Auth magic-link + Storage), TanStack React Query. Imports via `@/`.
- **Data spine** : the `startups` table (the *dossier*) — see `supabase/migrations/20260527_rsa_platform_foundation.sql`.
- **Eligibility engine** : `src/lib/rsa/eligibility.js` (`evaluateEligibility`).
- **Auth** : `src/lib/platform/auth.jsx` (`usePlatformAuth`), magic link, no role required to own a dossier.
- **Design** : « Élysée » design system — `docs/design-system.md` (NAVY/GOLD/CREAM, Playfair + Inter, container `max-w-[680px]`, cards radius 4px, framer-motion fade-up). The reference upload screen `src/pages/StartupUpload.jsx` already embodies the funnel/card aesthetic to mirror.
- **Trilingual** : FR / EN / DE everywhere on UI/labels. **Pitch content stays English** (international jury — memory `project_rsa_pitch_language`); only the chrome is trilingual.

---

## 1. Scope & non-goals

**In scope (Module 1):**
- Authenticated multi-step funnel to create / edit a single `startups` dossier per applicant per edition.
- Save-as-draft (`brouillon`) and submit (`soumis`).
- Live, non-blocking eligibility preview (flags + exclu warnings).
- Document uploads (pitch deck + executive summary FR/DE) to Supabase Storage.
- Post-submission tracking view: status timeline + assigned session, editable until `application_close`.

**Out of scope (later modules):**
- Comité selection workflow (`selection_reviews`) — Module 2.
- Jury scoring — Module 3.
- Results / finale — Module 4.
- Admin edition configuration UI (we read `editions` / `sessions` as reference data here; their CRUD is admin's job).

---

## 2. Funnel structure

The Airtable funnel was a simple **linear, one-section-per-step** flow with a progress indicator and a final recap. We keep that exact mental model. Six ordered steps + recap:

| # | Step (FR / EN / DE) | `startups` fields grouped | Purpose |
|---|---------------------|---------------------------|---------|
| 1 | **Contact** / Contact / Kontakt | `name`, `contact_person`, `email`, `phone`, `website` | Who & how to reach |
| 2 | **Société** / Company / Unternehmen | `country`, `creation_date`, `registration_number`, `founders_majority`, `partner_institution`, `rotary_club` | Legal identity + eligibility inputs |
| 3 | **Projet** / Project / Projekt | `value_proposition`, `business_model`, `roadmap`, `team`, `traction`, `esg_impact`, `sectors` | **Art. 4 dossier core** |
| 4 | **Finances** / Financials / Finanzen | `last_revenue`, `amount_raised` | Eligibility inputs |
| 5 | **Documents** / Documents / Dokumente | `pitch_deck_path`, `exec_summary_path`, `video_pitch_url` | Uploads + optional video link |
| 6 | **Récapitulatif** / Review / Zusammenfassung | (read-only of all) + eligibility preview | Confirm & submit |

**Navigation rules**
- Steps are freely navigable via a top stepper (click any visited step) **and** Précédent / Suivant buttons. The Airtable funnel allowed back/forward; we keep it.
- **No hard gate between steps while in `brouillon`.** Required-field validation is enforced only at **Submit** time (and surfaced inline on the recap). This matches the règlement: criteria are *indicatifs*, and we never want to block a user mid-draft. A step shows a soft "incomplete" dot if required fields are empty, but you can still advance.
- Autosave-on-step-change (debounced) writes a `brouillon` so progress is never lost — see §6.
- Mobile: stepper collapses to "Étape 3 / 6 · Projet" + a thin progress bar; one section visible at a time (the Airtable mobile behaviour).

### 2.1 Field-by-field spec

Legend — **R** = required to submit, **O** = optional, **E** = eligibility input.

#### Step 1 — Contact
| Field | Column | Input | Req | Validation |
|-------|--------|-------|-----|------------|
| Nom de la startup | `name` | text | **R** | non-empty, ≤ 120 chars. `not null` in DB. |
| Personne de contact | `contact_person` | text | **R** | non-empty, ≤ 120 |
| Email | `email` | email | **R** | RFC email shape. Defaults to the magic-link account email (prefill, editable). |
| Téléphone | `phone` | tel | O | loose `^[+0-9 ().-]{6,20}$` |
| Site web | `website` | url | O | normalise: prepend `https://` if missing scheme; valid URL shape |

#### Step 2 — Société
| Field | Column | Input | Req | Validation / notes |
|-------|--------|-------|-----|--------------------|
| Pays | `country` | select (FR / DE / Autre) | **R · E** | stored as ISO-2 (`FR`,`DE`) or free `country` for "Autre". **Country ∉ {FR,DE} → EXCLU** (warning, still submittable). |
| Date de création | `creation_date` | date | **R · E** | `<= today`. **Before 2020-01-01 → EXCLU** (warning). |
| N° d'immatriculation (SIREN/SIRET, HRB…) | `registration_number` | text | **R · E** | non-empty; **placeholder values flagged** (`123 123 123`, all-zeros — see `isPlaceholderRegistration`). FLAG, non-blocking. |
| **Fondateurs majoritaires au capital ? (oui / non)** | `founders_majority` | radio (Oui / Non) → boolean | **R · E** | **NEW field, absent from Airtable.** `false`/unset → FLAG. Tooltip explains "détenez-vous ensemble > 50 % des parts ?". |
| Institution partenaire (incubateur…) | `partner_institution` | text | O | affiliation, ≤ 160 |
| Club Rotary parrain | `rotary_club` | text (or autocomplete later) | O | affiliation |

#### Step 3 — Projet (Art. 4)
All `text` → multiline `<Textarea>`. Helper text states **"En anglais de préférence (jury international)"** per pitch-language convention, but we do not block non-English input.

| Field | Column | Input | Req | Notes |
|-------|--------|-------|-----|-------|
| Proposition de valeur | `value_proposition` | textarea | **R** | Art. 4. Soft char counter (~600). |
| Modèle économique | `business_model` | textarea | **R** | **NEW vs Airtable** (Art. 4). |
| Roadmap | `roadmap` | textarea | **R** | **NEW vs Airtable** (Art. 4). |
| Équipe | `team` | textarea | **R** | **NEW vs Airtable** (Art. 4). Founders, roles, relevant background. |
| Traction | `traction` | textarea | O→**R** | Art. 4. Recommend required; keep optional if user truly pre-revenue, but surface as recommended. (Open question §12.) |
| Impact ESG | `esg_impact` | textarea | O | Art. 4 + Rotary values. Feeds the "Societal & Environmental Impact" scoring criterion later. |
| Secteurs | `sectors` (`text[]`) | multi-select chips | **R** | ≥ 1 selection. Options seed the 5 clusters' themes (Foodtech & économie circulaire, Impact social & Edtech, Tech/AI/Fintech/Mobilité, Healthtech & Biotech, Greentech & Environnement) + "Autre". Drives later session affectation by the comité. |

#### Step 4 — Finances
| Field | Column | Input | Req | Notes |
|-------|--------|-------|-----|-------|
| Dernier chiffre d'affaires annuel (€) | `last_revenue` | number (€) | O · **E** | `>= 0`. **> 500 000 € → FLAG.** Empty = treated as 0 / "non communiqué" (eligibility treats `null` as passing). Helper: "Laisser vide si pré-revenu." |
| Montant total levé (€) | `amount_raised` | number (€) | O · **E** | `>= 0`. **> 800 000 € → FLAG.** |

#### Step 5 — Documents
| Field | Column | Input | Req | Notes |
|-------|--------|-------|-----|-------|
| Pitch deck | `pitch_deck_path` | file upload | **R · E** | PDF/PPT(X). Missing → FLAG (docs_required). See §4. |
| Executive summary (FR & DE) | `exec_summary_path` | file upload | **R · E** | PDF. Single column but UI must make the **FR & DE bilingual requirement** explicit (one combined doc or a zip — see §4 open point). Missing → FLAG. |
| Lien vidéo de pitch | `video_pitch_url` | url | O | YouTube/Vimeo/Loom link; validate URL + host allowlist soft-check. Not stored in Storage. |

#### Step 6 — Récapitulatif
- Read-only render of all sections, each with an "Éditer" link jumping back to its step.
- **Eligibility preview** panel (see §5).
- Two terminal actions: **Enregistrer le brouillon** and **Soumettre ma candidature**.
- A confirmation modal on submit reiterating: *"Vous pourrez encore modifier jusqu'au {application_close}."*

---

## 3. i18n FR / EN / DE

Reuse the established pattern from `src/lib/rsa/constants.js` (object keyed by `id` with `i18n.{fr,de}` overrides and an English root) — but for the funnel a flat per-language dictionary like the one already in `StartupUpload.jsx` (`const T = { fr:{…}, en:{…} }`) is the closest match to the screen we are cloning. **Add `de`** to that shape.

Proposed home: `src/lib/rsa/candidature-i18n.js`

```js
// src/lib/rsa/candidature-i18n.js
export const STEPS = [
  { id: 'contact',   labels: { fr: 'Contact',         en: 'Contact',  de: 'Kontakt' } },
  { id: 'company',   labels: { fr: 'Société',         en: 'Company',  de: 'Unternehmen' } },
  { id: 'project',   labels: { fr: 'Projet',          en: 'Project',  de: 'Projekt' } },
  { id: 'finance',   labels: { fr: 'Finances',        en: 'Financials', de: 'Finanzen' } },
  { id: 'documents', labels: { fr: 'Documents',       en: 'Documents', de: 'Dokumente' } },
  { id: 'review',    labels: { fr: 'Récapitulatif',   en: 'Review',   de: 'Zusammenfassung' } },
];

export const FIELDS = {
  name: {
    label:  { fr: 'Nom de la startup', en: 'Startup name', de: 'Name des Startups' },
    help:   { fr: '', en: '', de: '' },
  },
  founders_majority: {
    label:  { fr: 'Les fondateurs sont-ils majoritaires au capital ?',
              en: 'Do the founders hold a majority of the equity?',
              de: 'Halten die Gründer die Kapitalmehrheit?' },
    help:   { fr: 'Détenez-vous ensemble plus de 50 % des parts ?',
              en: 'Do you together hold more than 50% of the shares?',
              de: 'Halten Sie zusammen mehr als 50 % der Anteile?' },
    yes:    { fr: 'Oui', en: 'Yes', de: 'Ja' },
    no:     { fr: 'Non', en: 'No',  de: 'Nein' },
  },
  // …one entry per field (label + optional help), same shape
};

export const UI = {
  saveDraft:   { fr: 'Enregistrer le brouillon', en: 'Save draft', de: 'Entwurf speichern' },
  submit:      { fr: 'Soumettre ma candidature', en: 'Submit application', de: 'Bewerbung absenden' },
  next:        { fr: 'Suivant', en: 'Next', de: 'Weiter' },
  prev:        { fr: 'Précédent', en: 'Back', de: 'Zurück' },
  preferEn:    { fr: 'En anglais de préférence (jury international).',
                 en: 'Preferably in English (international jury).',
                 de: 'Vorzugsweise auf Englisch (internationale Jury).' },
  // …
};

export const t = (entry, lang) => entry?.[lang] ?? entry?.fr ?? '';
```

- A small `useLang()` (default `fr`, switchable FR/EN/DE in the header, mirroring `StartupUpload.jsx`'s language pills, but extended to 3) — persist to `localStorage('rsa_lang')`.
- Eligibility-rule labels (the `rule` keys returned by `evaluateEligibility`) get their own trilingual map (see §5) so the preview is human-readable.
- **Sectors** labels reuse `SESSIONS[].label/labelEn/labelDe` from `constants.js`.

---

## 4. File uploads (Supabase Storage)

The legacy `uploads` bucket is **public** (`getPublicUrl` in `db.js`) — fine for decks that were emailed by token, but **dossier documents are confidential** (the StartupUpload legal note says "strictement confidentiels au jury et à l'organisateur"). So:

**Proposed bucket: `dossiers` (PRIVATE).** Do not reuse the public `uploads` bucket for application documents.

**Path convention** (edition-scoped, dossier-scoped):
```
editions/{edition_id}/startups/{startup_id}/pitch_deck/{timestamp}_{safeName}.{ext}
editions/{edition_id}/startups/{startup_id}/exec_summary/{timestamp}_{safeName}.{ext}
```
e.g. `editions/2026/startups/3f8c…/pitch_deck/1716800000000_deck.pdf`

- Store the **storage path** (not a public URL) in `pitch_deck_path` / `exec_summary_path` — matches the migration column semantics and the StartupUpload precedent (`*_path`).
- Generate a **signed URL on demand** (`storage.from('dossiers').createSignedUrl(path, 60)`) when the applicant (or later the jury/comité) needs to view/download. Never expose a public URL.

**Limits & types**
- Pitch deck: `.pdf, .ppt, .pptx`, **max 50 MB** (same ceiling as `StartupUpload.jsx`).
- Exec summary: `.pdf`, **max 20 MB**.
- Validate **extension + MIME + size client-side** (reuse the `extOf` / `isAllowed` / `safeFilename` helpers' approach from `StartupUpload.jsx`), and rely on bucket policy for the hard limit.
- Show inline upload progress (XHR `upload.onprogress`) exactly like the reference screen.

**Security note (RLS for Storage)**
- The funnel relies on the authenticated user's `startup_id` being **owned** (`startups.owner_id = auth.uid()`). The dossier row's RLS already guarantees a user only sees their own row.
- Storage objects need their own policies on `storage.objects` for bucket `dossiers`: allow `insert/select/update/delete` only when the object's path second/fourth segment resolves to a `startups` row the caller owns (or the caller has role `comite`/`jury`/`admin`). A robust pattern: a SECURITY DEFINER helper `public.owns_startup(p_startup_id uuid)` checking `owner_id = auth.uid()`, then a policy like
  `(storage.foldername(name))[2] = edition_id AND public.owns_startup( ((storage.foldername(name))[4])::uuid )`.
  *(This Storage policy migration is a small follow-up to the foundation migration — flagged as a dependency, not built in Module 1 code.)*
- **The exec summary's FR & DE requirement** (column is a single `exec_summary_path`): two viable shapes — (a) require one combined FR+DE PDF, or (b) accept a single file now and add `exec_summary_de_path` later. Recommend **(a)** for 2026 parity (Airtable had one slot) and note the column already says "FR & DE". Flag as open question §12.

---

## 5. Live eligibility preview (non-blocking)

Use `evaluateEligibility(startupDraft, rules)` from `src/lib/rsa/eligibility.js`. Rules come from the loaded `editions.eligibility_rules` (fallback to `DEFAULT_RULES_2026`).

- **Where:** a persistent, collapsible panel on the **recap step**, plus a compact inline hint on Steps 2/4/5 (the steps that own eligibility inputs) showing only the rules affected by the current step.
- **Recompute** live (memoised on the draft object) as the user edits — no network call needed; it's a pure function.
- **Verdict mapping → UI (informational tone, never an error/blocker):**

| `verdict` | Banner | Copy intent |
|-----------|--------|-------------|
| `eligible` | sage/green tint | "Votre dossier remplit les critères indicatifs." |
| `flagged` | gold tint | "Quelques points seront examinés par le comité — cela ne vous empêche pas de candidater." |
| `excluded` | warm red tint (warning, **not** disabled) | "Selon le règlement, ce critère est normalement exclusif. Vous pouvez tout de même soumettre ; le comité reste souverain." |

- **Per-failed-check rendering:** iterate `result.failed`. For each, show the trilingual rule label + the `detail` string (already human-ish, FR). Distinguish `behavior === 'exclu'` (warning chip) from `behavior === 'flag'` (info chip).
- **Trilingual rule labels** (new small map; `detail` stays as-is from the engine for 2026, can be localised later):

```js
const RULE_LABELS = {
  country:          { fr: 'Pays', en: 'Country', de: 'Land' },
  created_after:    { fr: 'Date de création', en: 'Founding date', de: 'Gründungsdatum' },
  revenue_max:      { fr: 'Chiffre d’affaires', en: 'Revenue', de: 'Umsatz' },
  raised_max:       { fr: 'Montant levé', en: 'Funds raised', de: 'Eingeworbenes Kapital' },
  founders_majority:{ fr: 'Fondateurs majoritaires', en: 'Founder majority', de: 'Gründermehrheit' },
  registration:     { fr: 'Immatriculation', en: 'Registration', de: 'Registrierung' },
  docs_required:    { fr: 'Documents requis', en: 'Required documents', de: 'Erforderliche Dokumente' },
};
```

- **Submission is ALWAYS allowed** regardless of verdict (règlement: critères indicatifs). The submit button is never disabled by eligibility — only by missing **required** form fields (§2). When `excluded`, the confirm modal adds an extra acknowledgement line.
- On submit, **snapshot** the evaluation into `startups.eligibility` jsonb (`{ verdict, failed: [...], evaluated_at }`) so the comité sees what the applicant saw at submit time.

---

## 6. Draft, submit & one-dossier-per-applicant

**Lifecycle relevant here:** `brouillon` → `soumis`. (Downstream `en_selection`, `eligible`/`rejete`/`liste_attente`, `affecte`, … are set by later modules; this view only reads them.)

- **One startup per applicant per edition** — enforced by `owner_id`:
  - On entering the Espace Startup, query `startups` filtered by `owner_id = auth.uid()` AND `edition_id = <activeEdition>`. RLS guarantees the user only ever sees their own rows.
  - If none → create flow (a `brouillon` is inserted on first autosave, with `owner_id = auth.uid()`, `edition_id`, `status = 'brouillon'`, `name` placeholder until step 1 filled).
  - If one exists → load it into the funnel (or the tracking view if already `soumis`+).
  - **DB guard (recommended follow-up):** add `unique (owner_id, edition_id)` partial/unique index so a double-insert race can't create two dossiers. Flag as dependency (foundation migration doesn't have it yet).
- **Autosave (draft):** debounce (~800 ms) field changes and on step change, `update` the existing `brouillon`. First write does the `create`. Always bumps `updated_at` (DB default handles created; add an explicit `updated_at: new Date().toISOString()` on update, like the `JuryScoreDraft` precedent in `db.js`).
- **Save draft button:** explicit immediate flush of the autosave.
- **Submit:**
  1. Validate all **required** fields (§2). If missing, jump to the first offending step and highlight.
  2. Compute eligibility snapshot, write to `eligibility`.
  3. `update` row → `status = 'soumis'`, set `submitted_at` *(open question: column not in foundation migration — either add `submitted_at timestamptz`, or infer from a `selection_reviews`/status-history; recommend adding the column — §12)*.
  4. Transition UI to the tracking view (§7).
- **Edit-after-submit:** allowed while `now() <= edition.application_close` AND status is still `soumis`/`en_selection` (i.e. not yet past selection). Editing keeps status `soumis` (does **not** revert to `brouillon`). After `application_close`, the funnel renders **read-only** with a notice.

---

## 7. Post-submission tracking view

Shown when the loaded dossier is `soumis` or further. Editorial card layout (Élysée), not a dashboard.

- **Header:** startup name (Playfair), current status chip (trilingual status label map), edition name.
- **Status timeline:** ordered milestones derived from the lifecycle, with the reached ones marked. Suggested grouping for the applicant (some internal statuses collapse):
  `Soumis → En sélection → Éligible/Liste d'attente → Affecté à une session → En session → Finaliste → Lauréat` (and a terminal `Rejeté` branch shown discreetly if reached).
  Trilingual status labels live in a `STATUS_LABELS` map (same shape as `RULE_LABELS`).
- **Assigned session:** once `session_id` is set (status `affecte`+), resolve via `SESSION_BY_ID` from `constants.js` and show the cluster label + date (`getSessionLabel`, `getSessionDate`, trilingual) — reuse the colored session card style from `StartupUpload.jsx`.
- **Eligibility recap:** the stored `eligibility` snapshot, read-only.
- **Edit affordance:** "Modifier mon dossier" button when still within `application_close` (see §6); otherwise a locked notice with the close date.
- **Documents:** list uploaded docs with signed-URL download links.

---

## 8. Auth gating & RLS reliance

- Wrap Module 1 pages in `PlatformAuthProvider` consumer (`usePlatformAuth`).
- **Not authenticated** → show a magic-link gate (email field → `signInWithMagicLink(email, '/espace-startup')`). Mirror the landing's "Candidater" / "Espace membre" entry points (memory: landing links to `app.rotary-startup.org`).
- **Authenticated, no dossier yet** → this is the **normal new-applicant path**. No platform role is required (auth.jsx explicitly: a candidate with no role still owns their dossier via `owner_id = auth.uid()`). Land directly on Step 1 of the funnel with a fresh draft (created lazily on first autosave).
- **Authenticated, has dossier** → load funnel (if `brouillon`) or tracking view (if `soumis`+).
- **RLS reliance:** all reads/writes go through the anon Supabase client; the user's JWT carries `auth.uid()`. The `startups_read` / `startups_write` policies already scope to `owner_id = auth.uid()` (plus privileged roles). **The client never filters by owner for security** — it filters for UX; RLS is the real boundary. Storage gets its own policies (§4).
- **Edge case — email mismatch:** `profiles` is linked by email (`has_platform_role` uses `auth.jwt() ->> 'email'`), but `startups.owner_id` is `auth.uid()`. A candidate needs no `profiles` row at all to own a dossier. No action needed, but note it so nobody "fixes" it by requiring a profile.

---

## 9. Data layer

### 9.1 `Startup` entity (extends `@/lib/db` wrapper style)

Add to `src/lib/db.js`, following the existing `createEntity` + override pattern (cf. `SessionConfig`, `JuryScore`):

```js
// src/lib/db.js (addition)
export const Startup = {
  ...createEntity('startups'),

  // The single dossier for the current applicant in an edition (RLS scopes to owner).
  async mine(editionId) {
    const { data, error } = await supabase
      .from('startups')
      .select('*')
      .eq('edition_id', editionId)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  },

  // Insert the first draft (owner_id set by DB default? No — set explicitly from session).
  async createDraft({ editionId, ownerId, patch = {} }) {
    return this.create({
      edition_id: editionId,
      owner_id: ownerId,
      status: 'brouillon',
      name: patch.name ?? 'Brouillon',
      ...patch,
    });
  },

  async saveDraft(id, patch) {
    return this.update(id, { ...patch, updated_at: new Date().toISOString() });
  },

  async submit(id, { eligibility }) {
    return this.update(id, {
      status: 'soumis',
      eligibility,
      submitted_at: new Date().toISOString(), // pending column (§12)
      updated_at: new Date().toISOString(),
    });
  },
};

export const Edition = createEntity('editions');
export const RsaSession = createEntity('sessions'); // 'Session' name avoided (collides with auth concepts)
```

### 9.2 File upload helper (private bucket)

Add a dedicated helper rather than reusing the public `uploadFile` in `db.js`:

```js
// src/lib/rsa/storage.js
import { supabase } from '@/lib/supabase';

const BUCKET = 'dossiers';

export async function uploadDossierFile({ editionId, startupId, kind, file, onProgress }) {
  const safe = file.name.replace(/[^\w.\-]+/g, '_').slice(-100);
  const path = `editions/${editionId}/startups/${startupId}/${kind}/${Date.now()}_${safe}`;
  // XHR upload for progress (see StartupUpload.jsx precedent) OR:
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  return path; // store in pitch_deck_path / exec_summary_path
}

export async function signedDossierUrl(path, expiresIn = 60) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
```

### 9.3 TanStack Query hooks

`src/hooks/rsa/useCandidature.js` — colocate query keys + mutations:

```js
const KEYS = {
  activeEdition: ['rsa', 'edition', 'active'],
  myDossier: (editionId) => ['rsa', 'startup', 'mine', editionId],
};

// useActiveEdition()  -> Edition.filter({status: 'open'}) | latest open edition
// useMyDossier(editionId) -> Startup.mine(editionId)
// useSaveDraft()      -> mutation -> Startup.saveDraft, optimistic, invalidate myDossier
// useSubmitDossier()  -> mutation -> Startup.submit, invalidate myDossier
// useUploadDoc()      -> mutation -> uploadDossierFile + saveDraft({ [pathcol]: path })
```

- Reuse the shared `queryClientInstance` from `src/lib/query-client.js`.
- Autosave mutation should be **debounced in the component/hook**, not fired per keystroke. Use optimistic update so the funnel stays snappy.
- No realtime subscription needed for the applicant's own dossier (single user editing); the tracking view can optionally `Startup.subscribe` to reflect comité-driven status changes live, but polling on focus is enough for v1.

---

## 10. Page & component structure

One page = one route, auto-registered via `pages.config.js` (do not hand-edit that file; it regenerates from files in `src/pages/`).

```
src/pages/
  EspaceStartup.jsx          # the single Module-1 route; routes internally
                             # between Gate → Funnel → Tracking based on auth + dossier state

src/components/rsa/candidature/
  CandidatureGate.jsx        # magic-link gate (uses usePlatformAuth + signInWithMagicLink)
  CandidatureFunnel.jsx      # stepper shell, nav, progress, autosave orchestration
  Stepper.jsx                # trilingual step indicator (desktop rail + mobile compact)
  steps/
    StepContact.jsx
    StepCompany.jsx          # includes the NEW founders_majority radio
    StepProject.jsx          # Art.4 fields incl. business_model/roadmap/team + sectors chips
    StepFinance.jsx
    StepDocuments.jsx        # upload dropzones (pitch deck + exec summary FR/DE)
    StepReview.jsx           # recap + submit
  EligibilityPreview.jsx     # wraps evaluateEligibility, trilingual verdict/flags panel
  DocumentDropzone.jsx       # reusable upload tile (progress, validation) — mirrors StartupUpload UX
  CandidatureTracking.jsx    # post-submission timeline + assigned session
  StatusTimeline.jsx
  fields/                    # small shadcn-wrapped, trilingual-labelled field components
    TextField.jsx LongTextField.jsx NumberField.jsx SelectField.jsx
    DateField.jsx YesNoField.jsx ChipsField.jsx UrlField.jsx

src/lib/rsa/
  candidature-i18n.js        # STEPS / FIELDS / UI / RULE_LABELS / STATUS_LABELS dictionaries
  storage.js                 # uploadDossierFile / signedDossierUrl (private 'dossiers' bucket)

src/hooks/rsa/
  useCandidature.js          # TanStack Query keys + queries + mutations
  useLang.js                 # FR/EN/DE selection + localStorage persistence

src/lib/db.js                # + Startup, Edition, RsaSession entities (edit existing file)
```

- **Route name:** `EspaceStartup` (file `src/pages/EspaceStartup.jsx`). Landing's "Candidater" button targets it. A friendly path alias `/espace-startup` can be added at the router level if the app uses path-based routing; otherwise it's reachable as the `EspaceStartup` page key.
- **Design:** every screen follows `docs/design-system.md`. Reuse the card/typography/animation vocabulary already proven in `StartupUpload.jsx` (which itself uses NAVY/GOLD/CREAM and Playfair). Prefer shadcn/ui primitives (Input, Textarea, Select, RadioGroup, Progress) styled with the Élysée tokens.

---

## 11. Build order (within Module 1)

1. `Startup`/`Edition`/`RsaSession` entities + `candidature-i18n.js` skeleton + `useLang`.
2. `EspaceStartup` page shell + `CandidatureGate` (auth) + `useMyDossier`/`useActiveEdition`.
3. `CandidatureFunnel` + `Stepper` + autosave (`saveDraft`) — get the draft loop working with Steps 1–2.
4. Remaining steps (Project Art.4, Finance) + field components.
5. `storage.js` + `DocumentDropzone` + Step Documents (depends on `dossiers` bucket + Storage RLS — coordinate with the migration owner).
6. `EligibilityPreview` wired to `evaluateEligibility`.
7. `StepReview` + submit + eligibility snapshot.
8. `CandidatureTracking` + `StatusTimeline`.
9. Read-only-after-deadline + edit-after-submit gating.

---

## 12. Open questions for the human

1. **`submitted_at` column** — not in the foundation migration. Add `submitted_at timestamptz` to `startups` (recommended), or infer submission time another way? The tracking timeline and "edit until close" logic want it.
2. **`unique (owner_id, edition_id)`** — add this constraint to truly enforce one-dossier-per-applicant at the DB level? (Client + RLS make duplicates unlikely but not impossible under a race.)
3. **Exec summary FR & DE** — single combined PDF (2026 parity, fits the one `exec_summary_path` column) vs. add a second `exec_summary_de_path` column for two files? Recommend single combined for now.
4. **`traction` required or optional?** Art. 4 lists it; pre-revenue startups may have little. Recommend "required but allow a 'pré-revenu' explanation". Confirm.
5. **Founding-date threshold** — règlement says created after **2020-01-01**; you once said orally "moins de 5 ans" (a sliding window). The engine + this spec use the fixed 2020-01-01 from `editions.eligibility_rules`. Confirm we keep the fixed date (already flagged in `reference_rsa_2026_reglement`).
6. **Storage bucket** — confirm creating a **new private `dossiers` bucket** (not reusing public `uploads`) and that a small Storage-RLS migration is acceptable as a dependency before Step 5 ships.
7. **`country = "Autre"`** — règlement excludes non-FR/DE (EXCLU warning). Do we still let "Autre" applicants submit (current spec: yes, with warning), or hide the option entirely? Recommend keep it visible with the warning, per "critères indicatifs".
8. **Active edition resolution** — Module 1 assumes one `editions` row with `status='open'`. The seeded 2026 edition is `closed`. Confirm a 2026/2027 `open` edition will exist before this ships, and the selection rule if several are open.
```