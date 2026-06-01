# Session Presentation Generator & Running Order — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Au niveau d'une session de jury, persister l'ordre de passage des startups (SSOT unique), générer un deck HTML autonome plein écran, et envoyer un email par startup avec son ordre + horaire estimé.

**Architecture:** Approche B (3 points d'entrée séparés). `startups.pitch_order` est l'unique source de vérité, édité **uniquement** en Préparation. Le deck (carte Présentation) et les emails (Email Studio) le consomment en lecture. L'horaire estimé est calculé (`start_time + (ordre−1)×20 min`), jamais stocké. La préférence de langue par destinataire (`preferred_lang`) pilote la langue de tous les emails transactionnels.

**Tech Stack:** React 18 + Vite, Supabase (Postgres + RPC SECURITY DEFINER + Edge Functions Deno/Resend), TanStack Query, tests purs `node --test`. Blueprint : `docs/blueprints/session-presentation-generator.md`.

---

## File Structure

**Créés :**
- `supabase/migrations/20260601_session_running_order.sql` — colonnes + RPC.
- `src/lib/rsa/presentation/runningOrder.js` — helpers purs (horaire estimé, ordinal localisé, slug).
- `src/lib/rsa/presentation/buildSessionDeckHtml.js` — builder pur du deck HTML.
- `src/lib/rsa/presentation/__tests__/runningOrder.test.js`
- `src/lib/rsa/presentation/__tests__/buildSessionDeckHtml.test.js`
- `src/components/rsa/admin/platform/club/session/RunningOrderEditor.jsx` — éditeur d'ordre (Prep).
- `src/components/rsa/admin/platform/club/session/DeckGenerator.jsx` — form éditorial + export deck (Présentation).
- `src/components/rsa/admin/platform/club/session/sessionPanels.i18n.js` — i18n des 2 nouveaux panneaux.

**Modifiés :**
- `supabase/functions/send-transactional/index.ts` — nouveau type `session_running_order` + `preferred_lang` partout.
- `src/lib/rsa/entities/sessions.js` — `RsaSession.setRunningOrder()`.
- `src/components/rsa/admin/platform/club/useClub.js` — `useSessionStartups`, `useSetRunningOrder`.
- `src/components/rsa/admin/platform/club/session/SessionShell.jsx` — cartes prep/présentation cliquables (`onOpenPanel`).
- `src/components/rsa/admin/platform/club/ClubCockpit.jsx` — montage des panneaux `order`/`deck` via `?panel=`.
- `src/components/rsa/candidature/steps/StepContact.jsx` + `src/components/rsa/candidature/i18n.js` — sélecteur langue startup.
- `src/components/rsa/jury-funnel/JuryFunnel.jsx` + `src/components/rsa/jury-funnel/i18n.js` — sélecteur langue jury.
- `src/components/rsa/admin/platform/comms/EmailComposer.jsx` (ou le composant déclencheur identifié) — action « Emails ordre de passage ».

---

## LOT 1 — Migration (données : ordre + langue + RPC)

### Task 1: Migration SQL — colonnes & RPC running order

**Files:**
- Create: `supabase/migrations/20260601_session_running_order.sql`

- [ ] **Step 1: Écrire la migration**

```sql
-- Session running order (pitch_order) + préférence de langue par destinataire.
-- Cf. docs/blueprints/session-presentation-generator.md §2.

-- 1) Ordre de passage dans la session (scopé par startups.session_id).
alter table public.startups
  add column if not exists pitch_order int;

create index if not exists startups_session_pitch_order_idx
  on public.startups (session_id, pitch_order)
  where pitch_order is not null;

-- 2) Préférence de langue (utilisée par tous les emails transactionnels).
alter table public.startups
  add column if not exists preferred_lang text not null default 'fr'
  check (preferred_lang in ('fr','en','de'));

alter table public.jury_applications
  add column if not exists preferred_lang text not null default 'fr'
  check (preferred_lang in ('fr','en','de'));

-- 3) RPC d'écriture de l'ordre (transactionnelle, accès contrôlé serveur).
--    Réassigne pitch_order = index+1 pour la liste fournie. Valide l'appartenance
--    de chaque startup à la session, et le rôle de l'appelant.
create or replace function public.rsa_set_session_running_order(
  p_session_id text,
  p_ordered_ids uuid[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id text;
  v_count int;
  v_id uuid;
  v_pos int := 1;
begin
  -- Club de la session (pour la garde de rôle).
  select club_id into v_club_id from public.sessions where id = p_session_id;
  if v_club_id is null then
    raise exception 'session introuvable: %', p_session_id;
  end if;

  -- Garde : master_admin OU club_admin du club de la session.
  if not (
    public.rsa_has_role('master_admin')
    or public.rsa_is_club_admin(v_club_id)
  ) then
    raise exception 'forbidden';
  end if;

  -- Toutes les startups fournies doivent appartenir à la session.
  select count(*) into v_count
  from public.startups
  where id = any(p_ordered_ids) and session_id = p_session_id;
  if v_count <> coalesce(array_length(p_ordered_ids, 1), 0) then
    raise exception 'des startups n''appartiennent pas à la session %', p_session_id;
  end if;

  -- Réassignation ordonnée.
  foreach v_id in array p_ordered_ids loop
    update public.startups set pitch_order = v_pos where id = v_id;
    v_pos := v_pos + 1;
  end loop;
end;
$$;

revoke all on function public.rsa_set_session_running_order(text, uuid[]) from anon;
grant execute on function public.rsa_set_session_running_order(text, uuid[]) to authenticated;
```

> **Note d'implémentation :** vérifier les noms réels des helpers de rôle avant apply.
> Chercher dans `supabase/migrations/` les fonctions existantes (`rsa_has_role`,
> `rsa_is_club_admin`, ou équivalent `rsa_my_roles`). Si les noms diffèrent, adapter
> les deux appels dans la garde. La RPC `rsa_create_session` (sessions.js:46) est un
> bon modèle de garde club-admin déjà en place.

- [ ] **Step 2: Vérifier les noms de helpers de rôle**

Run: `grep -rnoE "create (or replace )?function public\.(rsa_has_role|rsa_is_club_admin|rsa_my_roles)[^(]*\(" supabase/migrations/`
Expected: au moins une définition par helper utilisé ; sinon adapter la garde du Step 1.

- [ ] **Step 3: Appliquer la migration via MCP Supabase**

Utiliser l'outil MCP `apply_migration` (projet `uaoucznptxmvhhytapso`) avec `name: "session_running_order"` et le SQL du Step 1. (Exécution autonome — cf. memory `feedback_autonomous_execution`.)
Expected: succès, pas d'erreur de contrainte.

- [ ] **Step 4: Vérifier advisors (sécu)**

Utiliser l'outil MCP `get_advisors` (type `security`).
Expected: pas de nouvel avis `search_path` mutable ni `anon execute` sur `rsa_set_session_running_order`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260601_session_running_order.sql
git commit -m "feat(db): pitch_order + preferred_lang + rsa_set_session_running_order RPC"
```

---

## LOT 2 — Helpers purs (horaire estimé, ordinal, slug) — TDD

### Task 2: `runningOrder.js` — horaire estimé & ordinal localisé

**Files:**
- Create: `src/lib/rsa/presentation/runningOrder.js`
- Test: `src/lib/rsa/presentation/__tests__/runningOrder.test.js`

- [ ] **Step 1: Écrire le test (échoue)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PITCH_SLOT_MINUTES, estimatedPitchTime, ordinal, slugify } from '../runningOrder.js';

test('PITCH_SLOT_MINUTES vaut 20 (format RSA)', () => {
  assert.equal(PITCH_SLOT_MINUTES, 20);
});

test('estimatedPitchTime : 1re startup = heure de début', () => {
  assert.equal(estimatedPitchTime('18:00', 1), '18:00');
});

test('estimatedPitchTime : 3e startup = +40 min', () => {
  assert.equal(estimatedPitchTime('18:00', 3), '18:40');
});

test('estimatedPitchTime : franchit l’heure (rollover minutes)', () => {
  assert.equal(estimatedPitchTime('18:50', 2), '19:10');
});

test('estimatedPitchTime : slot custom', () => {
  assert.equal(estimatedPitchTime('09:00', 2, 30), '09:30');
});

test('estimatedPitchTime : start_time absent → null', () => {
  assert.equal(estimatedPitchTime(null, 2), null);
  assert.equal(estimatedPitchTime('', 2), null);
});

test('ordinal FR/EN/DE', () => {
  assert.equal(ordinal(1, 'fr'), '1er');
  assert.equal(ordinal(2, 'fr'), '2e');
  assert.equal(ordinal(1, 'en'), '1st');
  assert.equal(ordinal(2, 'en'), '2nd');
  assert.equal(ordinal(3, 'en'), '3rd');
  assert.equal(ordinal(4, 'en'), '4th');
  assert.equal(ordinal(2, 'de'), '2.');
});

test('slugify : minuscule, tirets, ascii', () => {
  assert.equal(slugify('Session 5 — Greentech & Co'), 'session-5-greentech-co');
});
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `node --test src/lib/rsa/presentation/__tests__/runningOrder.test.js`
Expected: FAIL (`Cannot find module '../runningOrder.js'`).

- [ ] **Step 3: Écrire l'implémentation**

```js
// Helpers purs du running order de session. Aucun accès réseau/DB — testables
// en node --test. Cf. docs/blueprints/session-presentation-generator.md §2.1.

// Durée d'un slot de passage (pitch 10-12 min + Q&A 8-10 min). Format RSA figé.
export const PITCH_SLOT_MINUTES = 20;

// Horaire estimé d'une startup : start_time + (order-1) * slot. Retourne 'HH:MM'
// ou null si start_time manquant/invalide. order est 1-based.
export function estimatedPitchTime(startTime, order, slotMinutes = PITCH_SLOT_MINUTES) {
  if (!startTime || typeof startTime !== 'string') return null;
  const m = startTime.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const base = Number(m[1]) * 60 + Number(m[2]);
  const total = base + (Math.max(1, order) - 1) * slotMinutes;
  const hh = Math.floor((total % (24 * 60)) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// Ordinal localisé pour l'affichage du rang de passage dans les emails.
export function ordinal(n, lang = 'fr') {
  if (lang === 'fr') return n === 1 ? '1er' : `${n}e`;
  if (lang === 'de') return `${n}.`;
  // en
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Slug ascii pour le nom de fichier du deck exporté.
export function slugify(str) {
  return String(str || 'session')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'session';
}
```

- [ ] **Step 4: Lancer le test, vérifier le succès**

Run: `node --test src/lib/rsa/presentation/__tests__/runningOrder.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rsa/presentation/runningOrder.js src/lib/rsa/presentation/__tests__/runningOrder.test.js
git commit -m "feat(presentation): helpers purs running order (horaire estimé, ordinal, slug)"
```

---

### Task 3: `buildSessionDeckHtml.js` — builder pur du deck HTML

**Files:**
- Create: `src/lib/rsa/presentation/buildSessionDeckHtml.js`
- Test: `src/lib/rsa/presentation/__tests__/buildSessionDeckHtml.test.js`

Le builder produit un document HTML autonome (string). Il s'inspire de la grammaire de
`docs/presentation/session_5_greentech.html` mais **n'a pas besoin de la répliquer
pixel-perfect** : un squelette navy/gold autonome avec la séquence de slides correcte et
les données injectées suffit pour ce lot (le polish visuel est itérable ensuite, hors
chemin critique). Les tests portent sur le **contrat** (présence/ordre/échappement), pas
sur le CSS.

- [ ] **Step 1: Écrire le test (échoue)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionDeckHtml } from '../buildSessionDeckHtml.js';

const MODEL = {
  sessionName: 'Session 5 Greentech',
  theme: 'Greentech & Environment',
  dateLabel: 'Thursday May 21, 2026',
  timeLabel: '6 PM',
  specialPrize: 'Impact Prize',
  agenda: ['Welcome', 'Pitches', 'Deliberation'],
  criteria: [
    { name: 'Value Proposition', tagline: 'Clear problem, real need.' },
    { name: 'Market & Traction', tagline: 'Size and momentum.' },
  ],
  jury: ['Alice Martin', 'Bob <b>Dupont</b>'],
  startups: [
    { name: 'Maa Biodiversity', founder: 'Aristide' },
    { name: 'reLi Energy', founder: 'Laura' },
  ],
};

test('document HTML autonome', () => {
  const html = buildSessionDeckHtml(MODEL);
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<\/html>\s*$/);
});

test('séquence des slides dans l’ordre', () => {
  const html = buildSessionDeckHtml(MODEL);
  const ids = [...html.matchAll(/id="(s-[a-z0-9-]+)"/g)].map((m) => m[1]);
  // wait, splash, special, agenda, lineup, jury, scoring, ready, puis paires, end.
  assert.deepEqual(ids.slice(0, 8), [
    's-wait', 's-splash', 's-special', 's-agenda',
    's-lineup', 's-jury', 's-scoring', 's-ready',
  ]);
  assert.ok(ids.includes('s-trans-1'));
  assert.ok(ids.includes('s-qa-1'));
  assert.ok(ids.includes('s-trans-2'));
  assert.ok(ids.includes('s-qa-2'));
  assert.equal(ids[ids.length - 1], 's-end');
});

test('N startups dynamiques : une paire trans/qa par startup', () => {
  const html = buildSessionDeckHtml(MODEL);
  assert.equal((html.match(/id="s-trans-\d+"/g) || []).length, 2);
  assert.equal((html.match(/id="s-qa-\d+"/g) || []).length, 2);
});

test('lineup ordonné avec fondateur', () => {
  const html = buildSessionDeckHtml(MODEL);
  const iMaa = html.indexOf('Maa Biodiversity');
  const iReli = html.indexOf('reLi Energy');
  assert.ok(iMaa > -1 && iReli > -1 && iMaa < iReli);
  assert.match(html, /Aristide/);
});

test('échappement HTML strict des données', () => {
  const html = buildSessionDeckHtml(MODEL);
  assert.match(html, /Bob &lt;b&gt;Dupont&lt;\/b&gt;/);
  assert.ok(!html.includes('Bob <b>Dupont</b>'));
});

test('N=1 startup : une seule paire', () => {
  const html = buildSessionDeckHtml({ ...MODEL, startups: [{ name: 'Solo', founder: 'X' }] });
  assert.equal((html.match(/id="s-trans-\d+"/g) || []).length, 1);
});

test('N=0 startup : pas de paire, document valide', () => {
  const html = buildSessionDeckHtml({ ...MODEL, startups: [] });
  assert.equal((html.match(/id="s-trans-\d+"/g) || []).length, 0);
  assert.match(html, /id="s-end"/);
});
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `node --test src/lib/rsa/presentation/__tests__/buildSessionDeckHtml.test.js`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire l'implémentation**

```js
// Builder pur : modèle de deck -> document HTML autonome (string).
// Deck plein écran navy/gold, navigation clavier (flèches/espace), hors-ligne.
// Grammaire calquée sur docs/presentation/session_5_greentech.html.
// Aucune dépendance réseau/DB. Cf. blueprint §6.3.

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const stage = (id, inner) => `<section class="stage" id="${id}">${inner}</section>`;

function lineupRows(startups) {
  return startups.map((s, i) => `
    <div class="lineup-row">
      <span class="num">${i + 1}</span>
      <span class="who">${escapeHtml(s.name)}${s.founder ? ` · ${escapeHtml(s.founder)}` : ''}</span>
    </div>`).join('');
}

function criteriaRows(criteria) {
  return criteria.map((c, i) => `
    <div class="crit-row">
      <span class="num">${i + 1}</span>
      <span class="crit-name">${escapeHtml(c.name)}</span>
      <span class="crit-tag">${escapeHtml(c.tagline || '')}</span>
      <span class="crit-scale">0 — 5</span>
    </div>`).join('');
}

function pitchPairs(startups) {
  return startups.map((s, i) => {
    const n = i + 1;
    const trans = stage(`s-trans-${n}`, `
      <p class="eyebrow">PITCH ${n}</p>
      <h2 class="title">${escapeHtml(s.name)}</h2>
      <p class="sub">pitched by ${escapeHtml(s.founder || '')}</p>
      <p class="floor">The floor is yours.</p>`);
    const qa = stage(`s-qa-${n}`, `
      <p class="eyebrow">PITCH ${n} · COMPLETE</p>
      <h2 class="title">Q&amp;A.</h2>
      <p class="sub">${escapeHtml(s.name)} · pitched by ${escapeHtml(s.founder || '')}</p>
      <p class="floor">QUESTIONS FROM THE JURY</p>`);
    return trans + qa;
  }).join('');
}

const NAV_SCRIPT = `
<script>
(function(){
  var stages = Array.prototype.slice.call(document.querySelectorAll('.stage'));
  var i = 0;
  function show(n){ stages.forEach(function(s,k){ s.classList.toggle('active', k===n); });
    var c = document.getElementById('counter'); if(c) c.textContent = (n+1)+' / '+stages.length; }
  function go(d){ i = Math.max(0, Math.min(stages.length-1, i+d)); show(i); }
  document.addEventListener('keydown', function(e){
    if(['ArrowRight','ArrowDown',' ','PageDown','Enter'].indexOf(e.key)>-1){ e.preventDefault(); go(1); }
    else if(['ArrowLeft','ArrowUp','PageUp'].indexOf(e.key)>-1){ e.preventDefault(); go(-1); }
    else if(e.key==='Home'){ i=0; show(0); } else if(e.key==='End'){ i=stages.length-1; show(i); }
  });
  document.addEventListener('click', function(){ go(1); });
  show(0);
})();
</script>`;

const STYLE = `
<style>
  :root{ --blue:#245AA0; --blue-deep:#1B4480; --blue-night:#0A1F40; --gold:#C9A84C; --gold-light:#E0C880; --white:#fff; --ink-soft:#D8E2F0; }
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:100%;height:100vh;overflow:hidden;background:var(--blue-deep);font-family:'Inter',system-ui,sans-serif;color:var(--white)}
  .stage{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2rem;opacity:0;visibility:hidden;transition:opacity .6s ease,visibility .6s;padding:6vh 8vw;text-align:center;background:radial-gradient(ellipse 80% 60% at 50% 100%,var(--blue) 0%,var(--blue-deep) 50%,var(--blue-night) 100%)}
  .stage.active{opacity:1;visibility:visible}
  .eyebrow{font-size:.8rem;letter-spacing:.35em;color:var(--gold-light);text-transform:uppercase}
  .title{font-family:'Playfair Display',Georgia,serif;font-size:clamp(2rem,6vw,4.5rem);font-weight:700}
  .sub{font-size:1.2rem;color:var(--ink-soft)}
  .floor{font-style:italic;color:var(--gold-light)}
  .lineup-row,.crit-row{display:flex;align-items:center;gap:1rem;font-size:1.3rem}
  .num{font-family:'Playfair Display',serif;color:var(--gold);min-width:1.5em}
  .crit-name{font-weight:600}.crit-tag{color:var(--ink-soft);font-style:italic}.crit-scale{color:var(--gold);margin-left:auto}
  .agenda-item{font-size:1.3rem;color:var(--ink-soft)}
  #counter{position:fixed;bottom:2vh;left:2vw;font-family:'Playfair Display',serif;font-style:italic;color:var(--gold);opacity:.4;z-index:100}
  .logo-mark{position:fixed;top:4vh;left:4vw;font-size:11px;letter-spacing:.4em;color:var(--gold-light);z-index:100}
</style>`;

export function buildSessionDeckHtml(model) {
  const m = model || {};
  const startups = Array.isArray(m.startups) ? m.startups : [];
  const criteria = Array.isArray(m.criteria) ? m.criteria : [];
  const jury = Array.isArray(m.jury) ? m.jury : [];
  const agenda = Array.isArray(m.agenda) ? m.agenda : [];

  const slides = [
    stage('s-wait', `<p class="eyebrow">ROTARY STARTUP AWARD</p><h2 class="title">${escapeHtml(m.sessionName)}</h2><p class="sub">Please wait — the session is about to begin.</p>`),
    stage('s-splash', `<p class="eyebrow">${escapeHtml(m.theme || '')}</p><h2 class="title">${escapeHtml(m.sessionName)}</h2><p class="sub">${escapeHtml(m.dateLabel || '')}${m.timeLabel ? ` · ${escapeHtml(m.timeLabel)}` : ''}</p>`),
    stage('s-special', `<p class="eyebrow">SPECIAL PRIZE</p><h2 class="title">${escapeHtml(m.specialPrize || '')}</h2>`),
    stage('s-agenda', `<p class="eyebrow">AGENDA</p>${agenda.map((a) => `<p class="agenda-item">${escapeHtml(a)}</p>`).join('')}`),
    stage('s-lineup', `<p class="eyebrow">TONIGHT'S STARTUPS</p><h2 class="title">${startups.length} founders, ${startups.length} pitches.</h2><div>${lineupRows(startups)}</div>`),
    stage('s-jury', `<p class="eyebrow">THE JURY</p>${jury.map((j) => `<p class="agenda-item">${escapeHtml(j)}</p>`).join('')}`),
    stage('s-scoring', `<p class="eyebrow">JURY SCORING</p><h2 class="title">Six criteria, one ranked score.</h2><div>${criteriaRows(criteria)}</div>`),
    stage('s-ready', `<p class="eyebrow">READY</p><h2 class="title">Let's begin.</h2>`),
    pitchPairs(startups),
    stage('s-end', `<p class="eyebrow">THANK YOU</p><h2 class="title">${escapeHtml(m.sessionName)}</h2><p class="sub">Deliberation follows.</p>`),
  ].join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(m.sessionName)} — Rotary Startup Award</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;600&display=swap" rel="stylesheet" />
${STYLE}
</head>
<body>
<div class="logo-mark">ROTARY STARTUP AWARD</div>
<div id="counter"></div>
${slides}
${NAV_SCRIPT}
</body>
</html>`;
}
```

- [ ] **Step 4: Lancer le test, vérifier le succès**

Run: `node --test src/lib/rsa/presentation/__tests__/buildSessionDeckHtml.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rsa/presentation/buildSessionDeckHtml.js src/lib/rsa/presentation/__tests__/buildSessionDeckHtml.test.js
git commit -m "feat(presentation): builder pur du deck HTML autonome (N startups dynamiques)"
```

---

## LOT 3 — Éditeur de running order (Préparation)

### Task 4: Entity + hooks (lecture startups de session, écriture ordre)

**Files:**
- Modify: `src/lib/rsa/entities/sessions.js` (ajout méthode)
- Modify: `src/components/rsa/admin/platform/club/useClub.js` (ajout 2 hooks)

- [ ] **Step 1: Ajouter `setRunningOrder` à l'entité**

Dans `src/lib/rsa/entities/sessions.js`, à l'intérieur de l'objet `RsaSession` (après `resetTemplate`, avant la `}` finale ligne 66) :

```js
  // Écrit l'ordre de passage des startups de la session (RPC SECURITY DEFINER).
  // orderedIds : tableau d'uuid startups, dans l'ordre de passage voulu.
  async setRunningOrder(sessionId, orderedIds) {
    const { error } = await supabase.rpc('rsa_set_session_running_order', {
      p_session_id: sessionId,
      p_ordered_ids: orderedIds,
    });
    if (error) throw error;
  },
```

- [ ] **Step 2: Ajouter les hooks dans `useClub.js`**

À la fin de `src/components/rsa/admin/platform/club/useClub.js` (avant la dernière ligne du fichier), ajouter :

```js
// ── Startups d'une session, ordonnées par pitch_order (nulls en dernier) ─────
export function useSessionStartups(sessionId) {
  return useQuery({
    queryKey: ['rsa', 'club', 'session-startups', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('startups')
        .select('id, name, contact_person, email, preferred_lang, pitch_order, session_id')
        .eq('session_id', sessionId)
        .order('pitch_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId,
    staleTime: 15 * 1000,
  });
}

// ── Écriture de l'ordre de passage (RPC) + invalidation ─────────────────────
export function useSetRunningOrder(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds) => RsaSession.setRunningOrder(sessionId, orderedIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rsa', 'club', 'session-startups', sessionId] });
    },
  });
}
```

- [ ] **Step 3: Vérifier que le build n'est pas cassé (imports/lint)**

Run: `npm run lint`
Expected: pas d'erreur nouvelle sur `sessions.js` / `useClub.js`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/rsa/entities/sessions.js src/components/rsa/admin/platform/club/useClub.js
git commit -m "feat(club-cockpit): hooks lecture startups session + écriture running order"
```

### Task 5: i18n des panneaux session + `RunningOrderEditor`

**Files:**
- Create: `src/components/rsa/admin/platform/club/session/sessionPanels.i18n.js`
- Create: `src/components/rsa/admin/platform/club/session/RunningOrderEditor.jsx`

- [ ] **Step 1: Créer l'i18n**

```js
// i18n des panneaux session (running order + deck generator). FR/EN/DE.
export const SESSION_PANELS = {
  back: { fr: 'Retour à la session', en: 'Back to session', de: 'Zurück zur Sitzung' },

  // Running order
  orderTitle: { fr: 'Ordre de passage', en: 'Running order', de: 'Reihenfolge' },
  orderIntro: {
    fr: 'Définissez l’ordre de passage des startups. L’horaire estimé se calcule depuis l’heure de début.',
    en: 'Set the startups’ pitch order. Estimated times derive from the start time.',
    de: 'Legen Sie die Reihenfolge fest. Die geschätzten Zeiten ergeben sich aus der Startzeit.',
  },
  startTime: { fr: 'Heure de début', en: 'Start time', de: 'Startzeit' },
  slotMinutes: { fr: 'Durée par passage (min)', en: 'Minutes per slot', de: 'Minuten pro Slot' },
  moveUp: { fr: 'Monter', en: 'Move up', de: 'Nach oben' },
  moveDown: { fr: 'Descendre', en: 'Move down', de: 'Nach unten' },
  save: { fr: 'Enregistrer l’ordre', en: 'Save order', de: 'Reihenfolge speichern' },
  saved: { fr: 'Ordre enregistré.', en: 'Order saved.', de: 'Reihenfolge gespeichert.' },
  emptyStartups: {
    fr: 'Aucune startup affectée à cette session.',
    en: 'No startup assigned to this session.',
    de: 'Dieser Sitzung ist kein Startup zugewiesen.',
  },

  // Deck generator
  deckTitle: { fr: 'Générer la présentation', en: 'Generate the deck', de: 'Präsentation erzeugen' },
  deckIntro: {
    fr: 'Produit un fichier HTML autonome (plein écran, navigation clavier) pour la projection.',
    en: 'Produces a standalone HTML file (fullscreen, keyboard nav) for projection.',
    de: 'Erzeugt eine eigenständige HTML-Datei (Vollbild, Tastatur) für die Projektion.',
  },
  specialPrize: { fr: 'Prix spécial', en: 'Special prize', de: 'Sonderpreis' },
  agenda: { fr: 'Agenda (une ligne par étape)', en: 'Agenda (one line per item)', de: 'Agenda (eine Zeile pro Punkt)' },
  criteriaHint: { fr: 'Critères & accroches', en: 'Criteria & taglines', de: 'Kriterien & Slogans' },
  orderReadonly: {
    fr: 'L’ordre de passage se règle en Préparation.',
    en: 'The running order is set in Preparation.',
    de: 'Die Reihenfolge wird in der Vorbereitung festgelegt.',
  },
  download: { fr: 'Télécharger le deck', en: 'Download deck', de: 'Deck herunterladen' },
};
```

- [ ] **Step 2: Créer `RunningOrderEditor.jsx`**

```jsx
// RunningOrderEditor — édite l'ordre de passage des startups d'une session.
// SEUL endroit où pitch_order est écrit (deck + emails le lisent). Cf. blueprint §5.
// Réordonnancement par flèches ↑↓ (zéro dépendance, a11y simple).

import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUp, ArrowDown, Check } from 'lucide-react';
import { GOLD, NAVY, INK, MUTED, CREAM2, SERIF } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { estimatedPitchTime, PITCH_SLOT_MINUTES } from '@/lib/rsa/presentation/runningOrder';
import { useSessionStartups, useSetRunningOrder } from '../useClub';
import { SESSION_PANELS } from './sessionPanels.i18n';

export default function RunningOrderEditor({ session, onBack }) {
  const { t } = useLang();
  const startupsQ = useSessionStartups(session?.id);
  const saveMut = useSetRunningOrder(session?.id);

  const [order, setOrder] = useState([]);
  const [startTime, setStartTime] = useState(session?.config?.start_time || '18:00');
  const [slot, setSlot] = useState(PITCH_SLOT_MINUTES);
  const [savedFlag, setSavedFlag] = useState(false);

  useEffect(() => {
    if (startupsQ.data) setOrder(startupsQ.data);
  }, [startupsQ.data]);

  const move = (idx, dir) => {
    setSavedFlag(false);
    setOrder((prev) => {
      const next = prev.slice();
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const save = async () => {
    await saveMut.mutateAsync(order.map((s) => s.id));
    setSavedFlag(true);
  };

  return (
    <div>
      <button type="button" onClick={onBack}
        className={`inline-flex items-center gap-1.5 text-[12px] mb-4 rounded-[2px] ${FOCUS_RING_CLASS}`}
        style={{ color: MUTED }}>
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> {t(SESSION_PANELS.back)}
      </button>

      <h3 className="text-[20px] mb-1" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
        {t(SESSION_PANELS.orderTitle)}
      </h3>
      <p className="text-[12.5px] mb-4" style={{ color: INK }}>{t(SESSION_PANELS.orderIntro)}</p>

      <div className="flex flex-wrap gap-4 mb-4">
        <label className="text-[12px]" style={{ color: INK }}>
          {t(SESSION_PANELS.startTime)}{' '}
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
            className={`ml-1 rounded-[4px] px-2 py-1 ${FOCUS_RING_CLASS}`}
            style={{ border: `1px solid ${CREAM2}`, color: NAVY }} />
        </label>
        <label className="text-[12px]" style={{ color: INK }}>
          {t(SESSION_PANELS.slotMinutes)}{' '}
          <input type="number" min={1} value={slot} onChange={(e) => setSlot(Number(e.target.value) || PITCH_SLOT_MINUTES)}
            className={`ml-1 w-16 rounded-[4px] px-2 py-1 ${FOCUS_RING_CLASS}`}
            style={{ border: `1px solid ${CREAM2}`, color: NAVY }} />
        </label>
      </div>

      {order.length === 0 && (
        <p className="text-[12.5px] py-6 text-center" style={{ color: MUTED }}>
          {t(SESSION_PANELS.emptyStartups)}
        </p>
      )}

      <ol className="flex flex-col gap-2">
        {order.map((s, i) => (
          <li key={s.id} className="flex items-center gap-3 rounded-[4px] px-3 py-2"
            style={{ border: `1px solid ${CREAM2}`, background: 'white' }}>
            <span className="text-[13px] w-12" style={{ color: GOLD, fontFamily: SERIF }}>
              #{i + 1} · {estimatedPitchTime(startTime, i + 1, slot) || '—'}
            </span>
            <span className="flex-1 text-[13px]" style={{ color: NAVY }}>
              {s.name}{s.contact_person ? ` · ${s.contact_person}` : ''}
            </span>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
              aria-label={t(SESSION_PANELS.moveUp)}
              className={`p-1 rounded-[3px] disabled:opacity-30 ${FOCUS_RING_CLASS}`} style={{ color: MUTED }}>
              <ArrowUp className="w-4 h-4" aria-hidden />
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === order.length - 1}
              aria-label={t(SESSION_PANELS.moveDown)}
              className={`p-1 rounded-[3px] disabled:opacity-30 ${FOCUS_RING_CLASS}`} style={{ color: MUTED }}>
              <ArrowDown className="w-4 h-4" aria-hidden />
            </button>
          </li>
        ))}
      </ol>

      {order.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={save} disabled={saveMut.isPending}
            className={`inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] ${FOCUS_RING_CLASS}`}
            style={{ background: NAVY, color: 'white' }}>
            {t(SESSION_PANELS.save)}
          </button>
          {savedFlag && (
            <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: GOLD }}>
              <Check className="w-3.5 h-3.5" aria-hidden /> {t(SESSION_PANELS.saved)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: pas d'erreur nouvelle.

- [ ] **Step 4: Commit**

```bash
git add src/components/rsa/admin/platform/club/session/sessionPanels.i18n.js src/components/rsa/admin/platform/club/session/RunningOrderEditor.jsx
git commit -m "feat(club-cockpit): RunningOrderEditor (édition ordre de passage, Préparation)"
```

### Task 6: `DeckGenerator` (form éditorial + export)

**Files:**
- Create: `src/components/rsa/admin/platform/club/session/DeckGenerator.jsx`

- [ ] **Step 1: Créer `DeckGenerator.jsx`**

```jsx
// DeckGenerator — form éditorial + export du deck HTML autonome de la session.
// Lit l'ordre de passage en SEULE LECTURE (réglé en Préparation). Cf. blueprint §6.

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { NAVY, INK, MUTED, CREAM2, SERIF } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { buildSessionDeckHtml } from '@/lib/rsa/presentation/buildSessionDeckHtml';
import { slugify } from '@/lib/rsa/presentation/runningOrder';
import { useSessionStartups } from '../useClub';
import { SESSION_PANELS } from './sessionPanels.i18n';

// 6 critères canoniques RSA + accroches par défaut (éditables). Cf. template
// docs/presentation/session_5_greentech.html (slide s-scoring).
const DEFAULT_CRITERIA = [
  { name: 'Value Proposition', tagline: 'Clear problem, real need.' },
  { name: 'Market & Traction', tagline: 'Size and momentum.' },
  { name: 'Business Model', tagline: 'Path to revenue.' },
  { name: 'Team', tagline: 'Right people for the problem.' },
  { name: 'Pitch Quality', tagline: 'Clarity and conviction.' },
  { name: 'Societal Impact', tagline: 'Tangible contribution.' },
];

export default function DeckGenerator({ session, onBack }) {
  const { t } = useLang();
  const startupsQ = useSessionStartups(session?.id);
  const startups = startupsQ.data || [];

  const [specialPrize, setSpecialPrize] = useState('');
  const [agenda, setAgenda] = useState('Welcome\nPitches\nDeliberation\nResults');
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA);

  const cfg = session?.config || {};
  const model = useMemo(() => ({
    sessionName: session?.name || 'Session',
    theme: session?.theme || '',
    dateLabel: session?.session_date || '',
    timeLabel: cfg.start_time || '',
    specialPrize,
    agenda: agenda.split('\n').map((s) => s.trim()).filter(Boolean),
    criteria,
    jury: [], // jury affichage optionnel — non bloquant pour l'export.
    startups: startups
      .filter((s) => s.pitch_order != null)
      .map((s) => ({ name: s.name, founder: s.contact_person })),
  }), [session, cfg.start_time, specialPrize, agenda, criteria, startups]);

  const download = () => {
    const html = buildSessionDeckHtml(model);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${slugify(session?.name)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <button type="button" onClick={onBack}
        className={`inline-flex items-center gap-1.5 text-[12px] mb-4 rounded-[2px] ${FOCUS_RING_CLASS}`}
        style={{ color: MUTED }}>
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> {t(SESSION_PANELS.back)}
      </button>

      <h3 className="text-[20px] mb-1" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
        {t(SESSION_PANELS.deckTitle)}
      </h3>
      <p className="text-[12.5px] mb-4" style={{ color: INK }}>{t(SESSION_PANELS.deckIntro)}</p>

      <p className="text-[12px] mb-4" style={{ color: MUTED }}>
        {t(SESSION_PANELS.orderReadonly)} — {startups.filter((s) => s.pitch_order != null).length} startup(s).
      </p>

      <label className="block text-[12px] mb-3" style={{ color: INK }}>
        {t(SESSION_PANELS.specialPrize)}
        <input type="text" value={specialPrize} onChange={(e) => setSpecialPrize(e.target.value)}
          className={`mt-1 w-full rounded-[4px] px-2.5 py-1.5 ${FOCUS_RING_CLASS}`}
          style={{ border: `1px solid ${CREAM2}`, color: NAVY }} />
      </label>

      <label className="block text-[12px] mb-3" style={{ color: INK }}>
        {t(SESSION_PANELS.agenda)}
        <textarea rows={4} value={agenda} onChange={(e) => setAgenda(e.target.value)}
          className={`mt-1 w-full rounded-[4px] px-2.5 py-1.5 ${FOCUS_RING_CLASS}`}
          style={{ border: `1px solid ${CREAM2}`, color: NAVY }} />
      </label>

      <div className="text-[12px] mb-4" style={{ color: INK }}>
        {t(SESSION_PANELS.criteriaHint)}
        <div className="mt-2 flex flex-col gap-2">
          {criteria.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input type="text" value={c.name}
                onChange={(e) => setCriteria((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                className={`w-1/3 rounded-[4px] px-2 py-1 ${FOCUS_RING_CLASS}`}
                style={{ border: `1px solid ${CREAM2}`, color: NAVY }} />
              <input type="text" value={c.tagline}
                onChange={(e) => setCriteria((p) => p.map((x, j) => j === i ? { ...x, tagline: e.target.value } : x))}
                className={`flex-1 rounded-[4px] px-2 py-1 ${FOCUS_RING_CLASS}`}
                style={{ border: `1px solid ${CREAM2}`, color: NAVY }} />
            </div>
          ))}
        </div>
      </div>

      <button type="button" onClick={download}
        className={`inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] ${FOCUS_RING_CLASS}`}
        style={{ background: NAVY, color: 'white' }}>
        <Download className="w-3.5 h-3.5" aria-hidden /> {t(SESSION_PANELS.download)}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: pas d'erreur nouvelle.

- [ ] **Step 3: Commit**

```bash
git add src/components/rsa/admin/platform/club/session/DeckGenerator.jsx
git commit -m "feat(club-cockpit): DeckGenerator (form éditorial + export deck HTML)"
```

### Task 7: Câbler les cartes SessionShell + montage des panneaux

**Files:**
- Modify: `src/components/rsa/admin/platform/club/session/SessionShell.jsx`
- Modify: `src/components/rsa/admin/platform/club/ClubCockpit.jsx`

- [ ] **Step 1: SessionShell — rendre les cartes prep/présentation cliquables**

Dans `SessionShell.jsx` : ajouter `onOpenPanel` à la signature (ligne 41) :

```jsx
export default function SessionShell({ session, edition, clubId, onBack, onDeepLink, onOpenPanel }) {
```

Ajouter un helper bouton « ouvrir un panneau » après `linkBtn` (vers la ligne 61) :

```jsx
  const panelBtn = (label, panel) => (
    <button
      type="button"
      onClick={() => onOpenPanel?.(panel)}
      className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-[4px] self-start ${FOCUS_RING_CLASS}`}
      style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}
    >
      {label} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
    </button>
  );
```

Remplacer la carte « Préparation » (lignes ~113-118) : retirer `soon`/`soonLabel`, ajouter l'action :

```jsx
        <Card
          icon={ClipboardList}
          title={t(CLUB_SESSION_SHELL.cardPrep)}
          line={t(CLUB_SESSION_SHELL.prepHint)}
          action={panelBtn(t(CLUB_SESSION_SHELL.cardPrep), 'order')}
        />
```

Remplacer la carte « Présentation » (lignes ~119-124) de même :

```jsx
        <Card
          icon={Presentation}
          title={t(CLUB_SESSION_SHELL.cardPresentation)}
          line={t(CLUB_SESSION_SHELL.presentationHint)}
          action={panelBtn(t(CLUB_SESSION_SHELL.cardPresentation), 'deck')}
        />
```

(La carte Pré-read reste `soon` — hors périmètre.)

- [ ] **Step 2: ClubCockpit — lire `?panel=` et monter les éditeurs**

Dans `ClubCockpit.jsx`, ajouter les imports (vers ligne 30) :

```jsx
import RunningOrderEditor from './session/RunningOrderEditor';
import DeckGenerator from './session/DeckGenerator';
```

Ajouter la lecture du param (après la ligne 68, `const sessionId = ...`) :

```jsx
  const panel = params.get('panel') || null;
```

Ajouter un setter (après `setSession`, vers ligne 106) :

```jsx
  const setPanel = (next) => {
    const p = new URLSearchParams(params);
    if (next) p.set('panel', next); else p.delete('panel');
    setParams(p, { replace: true });
  };
```

Remplacer le bloc `activeTab === 'pilotage' && sessionId` (lignes 350-367) pour router selon `panel` :

```jsx
              {activeTab === 'pilotage' && sessionId && panel === 'order' && (
                <RunningOrderEditor session={selectedSession} onBack={() => setPanel(null)} />
              )}
              {activeTab === 'pilotage' && sessionId && panel === 'deck' && (
                <DeckGenerator session={selectedSession} onBack={() => setPanel(null)} />
              )}
              {activeTab === 'pilotage' && sessionId && !panel && (
                <SessionShell
                  session={selectedSession}
                  edition={edition}
                  clubId={clubId}
                  onBack={() => setSession(null)}
                  onOpenPanel={setPanel}
                  onDeepLink={(nextTab) => {
                    const p = new URLSearchParams(params);
                    p.set('tab', nextTab);
                    const nm = modeForTab(nextTab);
                    if (nm) p.set('mode', nm);
                    if (nm && nm !== CLUB_MODES.PILOTAGE) p.delete('session');
                    setParams(p, { replace: true });
                  }}
                />
              )}
```

- [ ] **Step 3: Vérifier visuellement (dev server)**

Run: `npm run dev` puis ouvrir le Club Cockpit → mode Pilotage → ouvrir une session → carte Préparation. Vérifier : l'éditeur d'ordre s'affiche, ↑↓ réordonnent, Enregistrer persiste (recharger la page garde l'ordre), l'horaire estimé se met à jour. Puis carte Présentation → Télécharger le deck → ouvrir le `.html` → flèches naviguent les slides.
Expected: ordre persisté + deck téléchargé fonctionnel.

- [ ] **Step 4: Commit**

```bash
git add src/components/rsa/admin/platform/club/session/SessionShell.jsx src/components/rsa/admin/platform/club/ClubCockpit.jsx
git commit -m "feat(club-cockpit): cartes Préparation/Présentation ouvrent l'éditeur d'ordre et le générateur de deck"
```

---

## LOT 4 — Préférence de langue dans les funnels

### Task 8: Sélecteur de langue — funnel startup (`StepContact`)

**Files:**
- Modify: `src/components/rsa/candidature/i18n.js` (FIELDS.preferred_lang)
- Modify: `src/components/rsa/candidature/steps/StepContact.jsx`

- [ ] **Step 1: Ajouter le label i18n**

Dans `src/components/rsa/candidature/i18n.js`, dans l'objet `FIELDS`, ajouter une entrée (suivre la forme des entrées existantes `email`/`phone`) :

```js
  preferred_lang: {
    label: { fr: 'Langue de communication', en: 'Communication language', de: 'Kommunikationssprache' },
    help: { fr: 'Langue de nos emails (convocations, résultats).', en: 'Language of our emails (invitations, results).', de: 'Sprache unserer E-Mails (Einladungen, Ergebnisse).' },
  },
```

- [ ] **Step 2: Ajouter le `<select>` dans `StepContact.jsx`**

Après le `Field` website (ligne 98, avant la fermeture `</StepShell>` ligne 99), insérer :

```jsx
      <Field label={t(FIELDS.preferred_lang.label)} helper={t(FIELDS.preferred_lang.help)} error={err('preferred_lang')}>
        {({ id, describedBy }) => (
          <select
            id={id}
            aria-describedby={describedBy}
            disabled={disabled}
            value={v.preferred_lang ?? 'fr'}
            onChange={set('preferred_lang')}
            className="w-full rounded-[4px] px-2.5 py-2 border"
            style={{ borderColor: '#e8e3d9', color: '#0f1f3d' }}
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        )}
      </Field>
```

> **Note :** confirmer le chemin de persistance — la valeur `preferred_lang` du form doit
> arriver dans l'insert/update `startups`. Tracer dans `CandidatureFunnel.jsx` comment les
> champs de `StepContact` sont sauvés (probablement un objet `values` à plat → `startups`).
> Si une whitelist de colonnes existe, y ajouter `preferred_lang`.

- [ ] **Step 3: Vérifier la persistance (dev)**

Run: `npm run dev` → ouvrir le funnel candidature → étape Contact → choisir « English » → avancer/soumettre. Vérifier en base (table `startups`, colonne `preferred_lang`) que la valeur est `en`.
Expected: `preferred_lang = 'en'`.

- [ ] **Step 4: Commit**

```bash
git add src/components/rsa/candidature/i18n.js src/components/rsa/candidature/steps/StepContact.jsx
git commit -m "feat(candidature): sélecteur langue de communication (preferred_lang startup)"
```

### Task 9: Sélecteur de langue — funnel jury (`JuryFunnel`)

**Files:**
- Modify: `src/components/rsa/jury-funnel/i18n.js`
- Modify: `src/components/rsa/jury-funnel/JuryFunnel.jsx`

- [ ] **Step 1: Ajouter le label i18n**

Dans `src/components/rsa/jury-funnel/i18n.js`, ajouter (suivre la forme du fichier) :

```js
  preferredLangLabel: { fr: 'Langue de communication', en: 'Communication language', de: 'Kommunikationssprache' },
```

- [ ] **Step 2: Ajouter le champ dans `JuryFunnel.jsx`**

Repérer le champ email/contact du formulaire jury, et ajouter à côté un `<select>` lié à l'état du form (suivre le pattern de state local du composant — `value`/`onChange` déjà en place pour les autres champs). Champ `preferred_lang`, défaut `'fr'`, options fr/en/de identiques à Task 8. La valeur doit être incluse dans le payload de soumission vers `jury_applications`.

> **Note :** `JuryFunnel.jsx` gère son propre state de form ; localiser l'objet de valeurs
> soumis (insert `jury_applications`) et y ajouter `preferred_lang`. Réutiliser
> `formatSessionDate`/`useLang` déjà importés.

- [ ] **Step 3: Vérifier la persistance (dev)**

Run: `npm run dev` → funnel jury → choisir « Deutsch » → soumettre. Vérifier `jury_applications.preferred_lang = 'de'`.
Expected: valeur persistée.

- [ ] **Step 4: Commit**

```bash
git add src/components/rsa/jury-funnel/i18n.js src/components/rsa/jury-funnel/JuryFunnel.jsx
git commit -m "feat(jury-funnel): sélecteur langue de communication (preferred_lang jury)"
```

---

## LOT 5 — Emails par startup (ordre de passage)

### Task 10: Edge function — type `session_running_order` + `preferred_lang`

**Files:**
- Modify: `supabase/functions/send-transactional/index.ts`

- [ ] **Step 1: Étendre les types et la garde de rôle**

Ligne 56-60, ajouter le type à l'union `EmailType` :

```ts
type EmailType =
  | "selection_decision"
  | "jury_assignment"
  | "session_published"
  | "results_published"
  | "session_running_order";
```

Ligne 71-76, ajouter la garde de rôle (admin OU club_admin — la convocation logistique est un acte admin club) :

```ts
const ROLE_REQUIREMENTS: Record<EmailType, string[]> = {
  selection_decision: ["admin", "comite"],
  jury_assignment: ["admin"],
  session_published: ["admin"],
  results_published: ["admin"],
  session_running_order: ["admin", "club_admin"],
};
```

Ligne 118-120, étendre `isEmailType` :

```ts
function isEmailType(v: unknown): v is EmailType {
  return (
    v === "selection_decision" ||
    v === "jury_assignment" ||
    v === "session_published" ||
    v === "results_published" ||
    v === "session_running_order"
  );
}
```

- [ ] **Step 2: Ajouter le rendu du corps (copy FR/EN/DE)**

Ajouter une fonction de copy (à côté des autres `copy*` du fichier — chercher `copySelectionDecision`). Tokens attendus dans `data` : `startup_name`, `running_order` (ordinal déjà formaté côté client), `estimated_time`, `session_name`, `session_date`.

```ts
function copyRunningOrder(lang: Lang, data: Record<string, unknown>) {
  const sn = esc(data.startup_name);
  const ro = esc(data.running_order);
  const et = esc(data.estimated_time);
  const sess = esc(data.session_name);
  const date = esc(data.session_date);
  const T = {
    fr: {
      subject: `Votre passage — ${sess}`,
      heading: `Ordre de passage`,
      intro: `Bonjour ${sn},`,
      body: `Pour la session <strong>${sess}</strong>${date ? ` du ${date}` : ""}, vous passez en <strong>${ro}</strong> position, à environ <strong>${et}</strong>.`,
      tail: `Merci d'arriver 15 minutes avant l'horaire estimé.`,
    },
    en: {
      subject: `Your pitch slot — ${sess}`,
      heading: `Running order`,
      intro: `Hello ${sn},`,
      body: `For session <strong>${sess}</strong>${date ? ` on ${date}` : ""}, you pitch <strong>${ro}</strong>, at approximately <strong>${et}</strong>.`,
      tail: `Please arrive 15 minutes before your estimated time.`,
    },
    de: {
      subject: `Ihr Pitch-Slot — ${sess}`,
      heading: `Reihenfolge`,
      intro: `Hallo ${sn},`,
      body: `Für die Sitzung <strong>${sess}</strong>${date ? ` am ${date}` : ""} pitchen Sie als <strong>${ro}</strong>, gegen <strong>${et}</strong>.`,
      tail: `Bitte erscheinen Sie 15 Minuten vor Ihrer geschätzten Zeit.`,
    },
  }[lang];
  return T;
}
```

Brancher cette copy dans le dispatch du handler (chercher le `switch (type)` ou la chaîne de `if (type === ...)` qui choisit subject/bodyHtml). Ajouter la branche `session_running_order` qui rend la coquille Élysée existante (réutiliser le helper de shell HTML déjà en place : `heading`, `intro`, `body`, `tail`).

> **Note :** suivre EXACTEMENT le pattern d'un type existant (ex. `results_published`)
> pour la construction `subject` + `bodyHtml` via le shell bulletproof. Ne pas réinventer
> le wrapper HTML.

- [ ] **Step 3: Déployer l'edge function via MCP Supabase**

Utiliser l'outil MCP `deploy_edge_function` (projet `uaoucznptxmvhhytapso`, function `send-transactional`) avec le contenu mis à jour.
Expected: déploiement OK.

- [ ] **Step 4: Test fumée (dry — un seul destinataire de test)**

Depuis l'app (ou un curl authentifié), appeler `send-transactional` avec `type: 'session_running_order'`, `recipient_email` = une adresse de test, `lang: 'fr'`, `data` complet. Vérifier réception + rendu (ordre + horaire visibles).
Expected: email reçu, tokens correctement substitués.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/send-transactional/index.ts
git commit -m "feat(emails): type session_running_order (ordre de passage + horaire estimé)"
```

### Task 11: Déclencheur Email Studio + bascule `preferred_lang`

**Files:**
- Modify: composant déclencheur de l'Email Studio (identifier : `EmailComposer.jsx` ou un panneau session). Voir Step 1.

- [ ] **Step 1: Localiser le bon point d'ancrage**

Run: `grep -rn "send-transactional\|invoke('send-transactional'\|functions.invoke" src/`
Identifier où `send-transactional` est appelé côté client (helper existant). Réutiliser ce helper pour la boucle ; sinon créer `src/lib/platform/transactional.js` avec `sendTransactional({ type, recipient_email, recipient_name, lang, data })` (wrapper `supabase.functions.invoke('send-transactional', { body })`).

- [ ] **Step 2: Ajouter l'action « Emails ordre de passage »**

Dans l'Email Studio (composant qui connaît la session courante — au besoin passer `session` en prop depuis `ClubCockpit` onglet `comms`, ou ajouter l'action dans `DeckGenerator`/un nouveau panneau session). Logique :

```jsx
// Boucle d'envoi des emails d'ordre de passage. Une requête par startup ordonnée,
// chacun dans SA langue (preferred_lang). Cf. blueprint §7.2.
import { ordinal, estimatedPitchTime } from '@/lib/rsa/presentation/runningOrder';

async function sendRunningOrderEmails(session, startups, sendTransactional) {
  const ordered = startups
    .filter((s) => s.pitch_order != null && s.email)
    .sort((a, b) => a.pitch_order - b.pitch_order);
  const startTime = session?.config?.start_time || null;
  const missing = startups.filter((s) => s.pitch_order == null);
  if (missing.length) {
    // Garde-fou : refuser tant que toutes les startups n'ont pas d'ordre.
    throw new Error('Certaines startups n’ont pas d’ordre de passage. Réglez-le en Préparation.');
  }
  for (const s of ordered) {
    const lang = s.preferred_lang || 'fr';
    await sendTransactional({
      type: 'session_running_order',
      recipient_email: s.email,
      recipient_name: s.contact_person,
      lang,
      data: {
        startup_name: s.name,
        running_order: ordinal(s.pitch_order, lang),
        estimated_time: estimatedPitchTime(startTime, s.pitch_order) || '—',
        session_name: session?.name,
        session_date: session?.session_date,
      },
    });
  }
}
```

Câbler un bouton « Emails ordre de passage » qui appelle cette fonction avec les startups de la session (`useSessionStartups`). Afficher le garde-fou en erreur (toast/alerte) si lancé sans ordre complet.

- [ ] **Step 3: Bascule `preferred_lang` sur les emails ciblés existants**

Run: `grep -rn "type: 'selection_decision'\|type: 'jury_assignment'\|type: 'results_published'\|lang:" src/`
Pour chaque appel `send-transactional` ciblant un destinataire identifiable (startup ou juré), remplacer la langue passée par `recipient.preferred_lang` (fallback `'fr'`). Ne PAS toucher aux emails non nominatifs (broadcast `send-bulk`).

- [ ] **Step 4: Test fumée (dev)**

Run: `npm run dev` → session avec ordre réglé → action « Emails ordre de passage » → vérifier l'envoi (1 email/startup, chacun dans sa langue) et le garde-fou si une startup n'a pas d'ordre.
Expected: N emails envoyés, langues respectées, garde-fou actif.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(emails): déclencheur ordre de passage + bascule preferred_lang sur emails nominatifs"
```

---

## Vérification finale

- [ ] **Tests purs**

Run: `node --test src/lib/rsa/presentation/__tests__/`
Expected: tous PASS (runningOrder + buildSessionDeckHtml).

- [ ] **Lint**

Run: `npm run lint`
Expected: pas d'erreur nouvelle.

- [ ] **Build**

Run: `npm run build`
Expected: build OK.

- [ ] **Advisors sécu post-déploiement**

MCP `get_advisors` (security). Expected: RAS sur la nouvelle RPC et l'edge.

---

## Couverture spec (auto-revue)

- Blueprint §2.1 (pitch_order, horaire calculé) → Task 1, Task 2.
- Blueprint §2.2 (preferred_lang ×2) → Task 1, Task 8, Task 9.
- Blueprint §2.3 (RPC) → Task 1, Task 4.
- Blueprint §5 (RunningOrderEditor, Prep only) → Task 5, Task 7.
- Blueprint §6 (DeckGenerator, lecture seule de l'ordre) → Task 3, Task 6, Task 7.
- Blueprint §7 (emails par startup + « partout ») → Task 10, Task 11.
- Blueprint §9 (tests purs) → Task 2, Task 3, Vérification finale.
