# Concours « La Saison » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la page `/Concours` (faux logo, selector, grille de cards) par une page éditoriale « programme de saison » : en-tête éditorial + ligne de stats, sessions dans l'ordre chronologique, frise sticky = nav d'ancrage + scroll-spy, couleur muted sans emoji, finale focal.

**Architecture:** Toute la logique de tri/groupement est isolée dans un module pur (`seasonModel.js`). La page orchestre ; `SeasonProgram` rend la liste chronologique chapitrée par mois ; `SessionRow` est une ligne éditoriale (pas une card) ; `ConcoursTimeline` devient une frise sans bordure, sticky, qui pilote le scroll-spy via `useScrollSpy`. Aucune migration SQL — la RPC `rsa_concours_edition_overview` renvoie déjà tout ; le flatten se fait côté client.

**Tech Stack:** React 18 + Vite, Tailwind + tokens Élysée (`@/components/design`), framer-motion, TanStack Query, `IntersectionObserver`.

**Spec:** [`docs/blueprints/concours-saison-redesign.md`](../../blueprints/concours-saison-redesign.md).

**Verification (pas de test-runner dans ce repo) :**
- `npm run build` → doit compiler sans erreur.
- `npm run lint` → 0 nouvelle erreur ESLint.
- Browser smoke (chrome-devtools MCP) à 375 / 768 / 1280 px sur 3 cas : édition vide · 1 session · édition complète.

**Branche recommandée :** `feat/concours-saison` (refactor multi-fichiers ; éviter un état mi-fait sur `main`). À défaut, `main` suit ton pattern habituel.

---

## File structure

```
src/components/rsa/concours-dashboard/
├── seasonModel.js            [N]  pur : flatten + tri date + group mois + nextId
├── useScrollSpy.js           [N]  hook IntersectionObserver → id de session active
├── SessionRow.jsx            [N]  ligne éditoriale (remplace SessionCard)
├── SeasonProgram.jsx         [N]  liste chronologique + jalons mois (remplace ClubSection)
├── ConcoursHero.jsx          [R]  éditorial + ligne de stats
├── ConcoursTimeline.jsx      [R]  frise borderless sticky + scroll-spy + ancrage
├── FinaleSection.jsx         [R]  focal éditorial (sans gradient/trophée)
├── SessionDetailDrawer.jsx   [R]  header dé-cardé, sans emoji
├── i18n.js                   [R]  strings saison/jalons/stats
├── ClubSection.jsx           [❌] supprimé (Task 11)
├── SessionCard.jsx           [❌] supprimé (Task 11)
├── ConcoursStatusPill.jsx    [K]
├── sessionTheme.js           [K]  palette gardée ; getSessionEmoji non appelé
└── useConcours.js            [K]
src/pages/Concours.jsx        [R]  édition unique + buildSeason + veil motion
```

---

## Task 0 : Baseline verte

**Files:** aucun (vérification).

- [ ] **Step 1 — branche**

```bash
git checkout -b feat/concours-saison
```

- [ ] **Step 2 — build + lint baseline**

Run: `npm run build` puis `npm run lint`
Expected: build OK ; noter les warnings lint préexistants (pour ne pas les imputer à la refonte).

---

## Task 1 : i18n strings

**Files:**
- Modify: `src/components/rsa/concours-dashboard/i18n.js`

- [ ] **Step 1 — ajouter/ajuster les clés** (garder les clés drawer/finale existantes ; ajouter celles-ci)

```js
// Hero éditorial
heroEyebrow:     { fr: 'Rotary Startup Award', en: 'Rotary Startup Award', de: 'Rotary Startup Award' },
heroTitleLead:   { fr: 'La saison des', en: 'The season of', de: 'Die Saison der' },
heroTitleItalic: { fr: 'entrepreneuses', en: 'founders', de: 'Gründerinnen' },
heroIntro: {
  fr: (clubs, sessions) => `${clubs} clubs, ${sessions} sessions, une grande finale.`,
  en: (clubs, sessions) => `${clubs} clubs, ${sessions} sessions, one grand finale.`,
  de: (clubs, sessions) => `${clubs} Clubs, ${sessions} Sitzungen, ein großes Finale.`,
},
// Ligne de stats (labels)
statClubs:      { fr: 'clubs', en: 'clubs', de: 'Clubs' },
statSessions:   { fr: 'sessions', en: 'sessions', de: 'Sitzungen' },
statFinalists:  { fr: 'finalistes', en: 'finalists', de: 'Finalistinnen' },
statNext:       { fr: 'prochaine', en: 'next', de: 'nächste' },
// Programme
programOpener:  { fr: 'La saison, dans l’ordre', en: 'The season, in order', de: 'Die Saison, der Reihe nach' },
monthSessions:  { fr: (n) => `${n} session${n > 1 ? 's' : ''}`, en: (n) => `${n} session${n > 1 ? 's' : ''}`, de: (n) => `${n} Sitzung${n === 1 ? '' : 'en'}` },
// SessionRow
rowFollowLive:  { fr: 'Suivre le scoring', en: 'Follow scoring', de: 'Bewertung verfolgen' },
rowOpen:        { fr: 'Détail', en: 'Details', de: 'Details' },
rowScoringLive: { fr: 'scoring en cours', en: 'scoring in progress', de: 'Bewertung läuft' },
rowLaureate:    { fr: 'Lauréate', en: 'Winner', de: 'Siegerin' },
```

> Réutiliser `UI.cardJurorsShort` / `cardStartupsShort` existants pour « jurés / startups ». Vérifier que `formatShortDate` / `formatSessionDate` existent déjà (oui).

- [ ] **Step 2 — build**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3 — commit**

```bash
git add src/components/rsa/concours-dashboard/i18n.js
git commit -m "feat(concours): i18n strings saison/stats/jalons"
```

---

## Task 2 : `seasonModel.js` (logique pure)

**Files:**
- Create: `src/components/rsa/concours-dashboard/seasonModel.js`

- [ ] **Step 1 — écrire le module complet**

```js
// seasonModel.js — modèle pur : aplatit l'overview RPC en une saison chronologique.
//
// Entrée (forme RPC rsa_concours_edition_overview) :
//   overview.sessions_by_club : { [clubId]: Session[] }   (qualifying)
//   overview.finale_sessions  : Session[]                 (kind='finale')
//   overview.clubs            : { id, name }[]
// Sortie : { flat, months, single, nextId }
//   flat   : sessions qualifying enrichies, triées par date croissante
//   months : [{ key, label, sessions }] (vide si single)
//   single : true si <= 1 mois distinct (pas de chapitrage)
//   nextId : session live, sinon prochaine non publiée (countdown), sinon null

import { getSessionPalette } from './sessionTheme';
import { computeCountdown } from '@/components/rsa/jury/constants';

const LOCALE = { fr: 'fr-FR', en: 'en-GB', de: 'de-DE' };

function enrich(session, clubName, indexInClub) {
  const status = session?.config?.status || 'draft';
  const cd = computeCountdown(session?.session_date);
  const ts = session?.session_date ? Date.parse(session.session_date) : null;
  return {
    ...session,
    clubName: clubName || null,
    palette: getSessionPalette(session, indexInClub),
    status,
    countdown: cd,
    ts: Number.isNaN(ts) ? null : ts,
  };
}

export function buildSeason(overview, lang = 'fr') {
  if (!overview) return { flat: [], months: [], single: true, nextId: null };

  const clubName = Object.fromEntries((overview.clubs || []).map((c) => [c.id, c.name]));

  const flat = [];
  Object.entries(overview.sessions_by_club || {}).forEach(([clubId, sessions]) => {
    (sessions || []).forEach((s, i) => flat.push(enrich(s, clubName[clubId], i)));
  });
  flat.sort((a, b) => (a.ts || 0) - (b.ts || 0));

  const live = flat.find((s) => s.status === 'live');
  const upcoming = flat
    .filter(
      (s) =>
        s.status !== 'published' &&
        s.countdown &&
        ['today', 'tomorrow', 'in'].includes(s.countdown.kind),
    )
    .sort((a, b) => (a.countdown.days ?? 0) - (b.countdown.days ?? 0));
  const nextId = live?.id || upcoming[0]?.id || null;

  const monthKey = (ts) => {
    if (!ts) return 'na';
    const d = new Date(ts);
    return `${d.getFullYear()}-${d.getMonth()}`;
  };
  const distinct = new Set(flat.map((s) => monthKey(s.ts)));
  const single = distinct.size <= 1;

  const months = [];
  if (!single) {
    const fmt = new Intl.DateTimeFormat(LOCALE[lang] || LOCALE.fr, { month: 'long' });
    const byKey = new Map();
    for (const s of flat) {
      const k = monthKey(s.ts);
      if (!byKey.has(k)) {
        const label = s.ts ? fmt.format(new Date(s.ts)) : '—';
        const group = { key: k, label, sessions: [] };
        byKey.set(k, group);
        months.push(group);
      }
      byKey.get(k).sessions.push(s);
    }
  }

  return { flat, months, single, nextId };
}
```

- [ ] **Step 2 — vérification par inspection** (pas de runner) : confirmer mentalement les 3 cas — `overview=null` → `{flat:[],months:[],single:true,nextId:null}` ; 1 mois → `single=true, months=[]` ; 3 mois → `months.length===3`, ordre chronologique.

- [ ] **Step 3 — build + commit**

```bash
npm run build
git add src/components/rsa/concours-dashboard/seasonModel.js
git commit -m "feat(concours): seasonModel pur (flatten chrono + group mois + nextId)"
```

---

## Task 3 : `useScrollSpy.js`

**Files:**
- Create: `src/components/rsa/concours-dashboard/useScrollSpy.js`

- [ ] **Step 1 — écrire le hook**

```js
// useScrollSpy — renvoie l'id de la session la plus visible (ancres #session-<id>).
import { useEffect, useState } from 'react';

export function useScrollSpy(ids) {
  const [activeId, setActiveId] = useState(null);
  const key = (ids || []).join(',');

  useEffect(() => {
    const list = (ids || [])
      .map((id) => document.getElementById(`session-${id}`))
      .filter(Boolean);
    if (list.length === 0) return undefined;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          setActiveId(visible[0].target.id.replace('session-', ''));
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.5, 1] },
    );
    list.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return activeId;
}

export function scrollToSession(id) {
  const el = document.getElementById(`session-${id}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
```

- [ ] **Step 2 — build + commit**

```bash
npm run build
git add src/components/rsa/concours-dashboard/useScrollSpy.js
git commit -m "feat(concours): useScrollSpy (IntersectionObserver) + scrollToSession"
```

---

## Task 4 : `SessionRow.jsx` (remplace SessionCard)

**Files:**
- Create: `src/components/rsa/concours-dashboard/SessionRow.jsx`

**Interface:** `<SessionRow session={enriched} isNext={bool} t={t} lang={lang} onOpen={fn} />`
où `enriched` = élément de `flat` (a `palette`, `status`, `countdown`, `clubName`, `ts`).

**Anatomie (cf. spec §3.5) :** ancre `id="session-<id>"` · `role="button"` + Enter/Space + focus ring gold · n° de séquence n'est PAS dans la row (il est injecté par `SeasonProgram` via prop `index`) → **ajouter prop `index`**. Filet gauche 2px `palette.primary`. Label thème uppercase `palette.primary`. Nom serif NAVY + underline gold au hover. Meta1 `clubName · date` + statut/countdown. Meta2 `N jurés · N startups` (+ lauréate/scoring). Hiérarchie LIVE / PROCHAINE / publiée / à venir.

- [ ] **Step 1 — écrire le composant**

```jsx
// SessionRow — ligne éditoriale d'une session (remplace la card). Pas de surface :
// hairline en bas, filet couleur gauche, underline gold au hover. Cliquable -> drawer.
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { NAVY, GOLD, INK, MUTED, CREAM, CREAM2, SERIF, GREEN_TODAY } from '@/components/design/tokens';
import ConcoursStatusPill from './ConcoursStatusPill';
import { UI, formatSessionDate } from './i18n';

const LIVE_RED = '#b91c1c';

function countdownLabel(cd, t) {
  if (!cd) return null;
  if (cd.kind === 'today') return t(UI.today);
  if (cd.kind === 'tomorrow') return t(UI.tomorrow);
  if (cd.kind === 'in') return t(UI.inDays)(cd.days);
  return t(UI.ago);
}

export default function SessionRow({ session, index, isNext, t, lang, onOpen }) {
  const { palette, status, countdown: cd } = session;
  const days = cd ? (cd.kind === 'past' || cd.kind === 'yesterday' ? -cd.days : cd.days) : null;
  const isLive = status === 'live';
  const isPublished = status === 'published';
  const dateLabel = formatSessionDate(session?.session_date, lang);
  const winner = session?.config?.winner || null;
  const cdLabel = countdownLabel(cd, t);

  const open = () => onOpen?.(session);

  return (
    <article
      id={`session-${session.id}`}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      }}
      aria-label={`${session.name || session.theme || ''} — ${dateLabel || ''}`}
      className="group relative grid grid-cols-[auto_1fr_auto] gap-x-4 md:gap-x-6 items-start cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] rounded-[4px]"
      style={{
        paddingLeft: 18,
        paddingTop: isLive ? 18 : 14,
        paddingBottom: isLive ? 18 : 14,
        paddingRight: 8,
        borderBottom: `1px solid ${CREAM2}`,
        background: isLive ? CREAM : 'transparent',
      }}
    >
      {/* Filet gauche couleur thème (épaissi si live) */}
      <span aria-hidden className="absolute left-0 top-0 bottom-0"
        style={{ width: isLive ? 4 : 2, background: palette.primary }} />

      {/* Col 1 — n° de séquence serif gold */}
      <span className="tabular-nums text-[15px] pt-0.5" style={{ fontFamily: SERIF, color: GOLD }}>
        {String(index).padStart(2, '0')}
      </span>

      {/* Col 2 — thème + nom + meta */}
      <div className="min-w-0">
        {session.theme && (
          <div className="uppercase text-[10px] tracking-[0.16em] font-semibold mb-1"
            style={{ color: palette.primary }}>
            {session.theme}
            {isNext && !isLive && (
              <span style={{ color: GOLD }}> · {t({ fr: 'PROCHAINE', en: 'NEXT', de: 'NÄCHSTE' })}</span>
            )}
          </div>
        )}
        <h3 className="text-[17px] md:text-[18px] font-medium leading-snug inline-block relative"
          style={{ fontFamily: SERIF, color: NAVY }}>
          {session.name || session.theme || session.id}
          <span aria-hidden
            className="absolute left-0 -bottom-0.5 h-px w-full origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
            style={{ background: GOLD }} />
        </h3>
        <div className="mt-1.5 text-[12px] flex flex-wrap items-center gap-x-3 gap-y-1" style={{ color: MUTED }}>
          {session.clubName && <span>{session.clubName}</span>}
          {dateLabel && <><span aria-hidden style={{ color: CREAM2 }}>·</span><span>{dateLabel}</span></>}
        </div>
        <div className="mt-1 text-[12px] flex flex-wrap items-center gap-x-3 gap-y-1" style={{ color: INK }}>
          <span className="tabular-nums">{session.jurorsCount || 0} {t(UI.cardJurorsShort)}</span>
          <span aria-hidden style={{ color: CREAM2 }}>·</span>
          <span className="tabular-nums">{session.startupsCount || 0} {t(UI.cardStartupsShort)}</span>
          {isLive && (
            <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: LIVE_RED }}>
              <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: LIVE_RED,
                animation: 'concoursStatusPulse 1.5s ease-in-out infinite' }} />
              {t(UI.rowScoringLive)}
            </span>
          )}
          {isPublished && winner?.startup_name && (
            <span style={{ color: GOLD }}>
              {t(UI.rowLaureate)} · <span style={{ color: NAVY, fontFamily: SERIF }}>{winner.startup_name}</span>
            </span>
          )}
        </div>
      </div>

      {/* Col 3 — statut/countdown + chevron */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] font-semibold"
            style={{ color: LIVE_RED }}>● LIVE</span>
        ) : isPublished ? (
          <ConcoursStatusPill status={status} days={days} T={UI} t={t}
            tintBg={palette.light} tintBorder={palette.border} tintFg={palette.primary} />
        ) : (
          <span className="text-[12px] tabular-nums font-medium" style={{ color: isNext ? GOLD : MUTED }}>
            {cdLabel || (dateLabel ? '' : '')}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: palette.primary }}>
          {isLive ? t(UI.rowFollowLive) : t(UI.rowOpen)}
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>

      <style>{`@keyframes concoursStatusPulse { 0%,100%{opacity:1} 50%{opacity:.35} }`}</style>
    </article>
  );
}
```

> **Note données :** `session.jurorsCount` / `session.startupsCount` ne sont pas dans la session — ils viennent de `overview.jurors_by_session` / `startups_by_session`. → Les injecter dans `enrich()` (Task 2) **ou** les passer depuis `SeasonProgram`. **Décision :** les passer en props depuis `SeasonProgram` (Task 5) qui a accès à l'overview. Retirer `session.jurorsCount`/`startupsCount` ici et lire `jurorsCount`/`startupsCount` props.

- [ ] **Step 2 — corriger l'accès counts** : remplacer `session.jurorsCount` → prop `jurorsCount`, `session.startupsCount` → prop `startupsCount`. Signature finale : `({ session, index, isNext, jurorsCount, startupsCount, t, lang, onOpen })`.

- [ ] **Step 3 — build + lint**

Run: `npm run build && npm run lint`
Expected: OK.

- [ ] **Step 4 — commit**

```bash
git add src/components/rsa/concours-dashboard/SessionRow.jsx
git commit -m "feat(concours): SessionRow editoriale (remplace SessionCard, sans emoji)"
```

---

## Task 5 : `SeasonProgram.jsx` (remplace ClubSection)

**Files:**
- Create: `src/components/rsa/concours-dashboard/SeasonProgram.jsx`

**Interface:** `<SeasonProgram season={buildSeasonResult} overview={overview} onOpenSession={fn} />`

- [ ] **Step 1 — écrire le composant**

```jsx
// SeasonProgram — liste chronologique de la saison, chapitrée par mois (repli si <=1 mois).
import React from 'react';
import { Eyebrow } from '@/components/design';
import { NAVY, GOLD, MUTED, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import SessionRow from './SessionRow';
import { UI } from './i18n';

function MonthJalon({ label, count, t }) {
  return (
    <header className="flex items-baseline gap-3 mt-12 mb-5 first:mt-0 pl-[18px] relative">
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: GOLD }} />
      <h2 className="text-[20px] md:text-[22px] uppercase tracking-[0.04em]"
        style={{ fontFamily: SERIF, color: NAVY, fontWeight: 400 }}>
        {label}
      </h2>
      <span className="text-[12px]" style={{ color: MUTED }}>{t(UI.monthSessions)(count)}</span>
    </header>
  );
}

export default function SeasonProgram({ season, overview, onOpenSession }) {
  const { t, lang } = useLang();
  const { flat, months, single, nextId } = season;

  const counts = (s) => ({
    jurorsCount: overview?.jurors_by_session?.[s.id] || 0,
    startupsCount: overview?.startups_by_session?.[s.id] || 0,
  });

  const rowProps = (s, index) => ({
    key: s.id, session: s, index, isNext: s.id === nextId,
    ...counts(s), t, lang, onOpen: onOpenSession,
  });

  if (single) {
    return (
      <section className="mb-14">
        <div className="flex items-center gap-2 mb-6">
          <span aria-hidden className="h-[1.5px] w-7" style={{ background: GOLD }} />
          <span className="uppercase tracking-[0.18em] text-[10.5px] font-medium" style={{ color: GOLD }}>
            {t(UI.programOpener)}
          </span>
        </div>
        <div>{flat.map((s, i) => <SessionRow {...rowProps(s, i + 1)} />)}</div>
      </section>
    );
  }

  let n = 0;
  return (
    <section className="mb-14">
      {months.map((m) => (
        <div key={m.key}>
          <MonthJalon label={m.label} count={m.sessions.length} t={t} />
          {m.sessions.map((s) => { n += 1; return <SessionRow {...rowProps(s, n)} />; })}
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 2 — build + lint + commit**

```bash
npm run build && npm run lint
git add src/components/rsa/concours-dashboard/SeasonProgram.jsx
git commit -m "feat(concours): SeasonProgram chronologique + jalons mois"
```

---

## Task 6 : `ConcoursHero.jsx` (refonte)

**Files:**
- Modify (réécriture): `src/components/rsa/concours-dashboard/ConcoursHero.jsx`

- [ ] **Step 1 — réécrire le fichier**

```jsx
// ConcoursHero — en-tête éditorial + ligne de stats (refonte « La Saison »).
// Plus de logo, plus de halo, plus de selector, plus de KPI cards.
import React from 'react';
import { Eyebrow, EditorialTitle } from '@/components/design';
import { NAVY, GOLD, INK, MUTED } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { UI } from './i18n';

function Stat({ value, label, accent }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="tabular-nums text-[14px] font-semibold" style={{ color: accent ? GOLD : NAVY }}>
        {value}
      </span>
      <span className="uppercase text-[10px] tracking-[0.14em]" style={{ color: MUTED }}>{label}</span>
    </span>
  );
}

export default function ConcoursHero({ edition, kpis }) {
  const { t } = useLang();
  const clubs = kpis?.clubsCount ?? 0;
  const sessions = kpis?.sessionsTotal ?? 0;

  return (
    <section className="mb-10 md:mb-12">
      <Eyebrow>
        {t(UI.heroEyebrow)}{edition?.year ? ` · ${t({ fr: 'Édition', en: 'Edition', de: 'Ausgabe' })} ${edition.year}` : ''}
      </Eyebrow>
      <EditorialTitle lead={t(UI.heroTitleLead)} italic={t(UI.heroTitleItalic)} size="lg" />
      <span aria-hidden className="block h-[1.5px] w-7 mt-5" style={{ background: GOLD }} />
      <p className="mt-5 text-[15px] md:text-[16px] max-w-[60ch]" style={{ color: INK, lineHeight: 1.65 }}>
        {t(UI.heroIntro)(clubs, sessions)}
      </p>

      {/* Ligne de stats — texte, middots, pas de cards */}
      <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <Stat value={clubs} label={t(UI.statClubs)} />
        <span aria-hidden style={{ color: MUTED }}>·</span>
        <Stat value={`${kpis?.sessionsDone || 0}/${sessions}`} label={t(UI.statSessions)} />
        <span aria-hidden style={{ color: MUTED }}>·</span>
        <Stat value={kpis?.finalistsCount ?? 0} label={t(UI.statFinalists)} accent={kpis?.finalistsCount > 0} />
        {kpis?.nextLabel && (
          <>
            <span aria-hidden style={{ color: MUTED }}>·</span>
            <span className="text-[12px]" style={{ color: NAVY }}>
              <span className="uppercase text-[10px] tracking-[0.14em]" style={{ color: MUTED }}>{t(UI.statNext)} </span>
              {kpis.nextLabel}
            </span>
          </>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2 — build + lint + commit**

```bash
npm run build && npm run lint
git add src/components/rsa/concours-dashboard/ConcoursHero.jsx
git commit -m "feat(concours): hero editorial + ligne de stats (retire faux logo + selector)"
```

---

## Task 7 : `ConcoursTimeline.jsx` (frise borderless sticky + scroll-spy)

**Files:**
- Modify (réécriture): `src/components/rsa/concours-dashboard/ConcoursTimeline.jsx`

**Interface:** `<ConcoursTimeline season={season} finaleSessions={[]} activeId={activeId} onJump={scrollToSession} t lang />`

- [ ] **Step 1 — réécrire** (points clés ci-dessous ; conserver le rendu des dots/labels existant mais : retirer `border`+`rounded` du wrapper → rail hairline ; ajouter sticky ; `activeId` → anneau gold ; clic → `onJump`)

```jsx
// ConcoursTimeline — frise de la saison : signature visuelle + nav d'ancrage + scroll-spy.
// Sans card (rail hairline), sticky sous le TopNav, dots positionnés par date.
import React, { useMemo } from 'react';
import { Eyebrow } from '@/components/design';
import { NAVY, GOLD, MUTED, CREAM, CREAM2, SERIF } from '@/components/design/tokens';
import { formatShortDate, UI } from './i18n';

const LIVE_RED = '#b91c1c';

export default function ConcoursTimeline({ season, finaleSessions = [], activeId, onJump, t, lang }) {
  const items = useMemo(() => {
    const out = (season?.flat || []).map((s) => ({ session: s, palette: s.palette }));
    (finaleSessions || []).forEach((s) =>
      out.push({ session: { ...s, status: s?.config?.status || 'draft' }, palette: { primary: GOLD, light: '#fdf6e8', border: '#e8d090' }, finale: true }));
    return out;
  }, [season, finaleSessions]);

  if (items.length === 0) return null;

  return (
    <section
      className="mb-10 md:mb-12 sticky top-14 z-30 -mx-4 md:-mx-6 px-4 md:px-6 py-3"
      style={{ background: `${CREAM}f2`, backdropFilter: 'blur(6px)', borderBottom: `1px solid ${CREAM2}` }}
    >
      <div className="overflow-x-auto">
        <div className="relative flex items-start" style={{ minWidth: Math.max(items.length * 96, 480) }}>
          <div aria-hidden className="absolute left-0 right-0" style={{ top: 22, height: 2, background: CREAM2 }} />
          {items.map(({ session: s, palette, finale }) => {
            const isActive = s.id === activeId;
            const isLive = s.status === 'live';
            const isDone = s.status === 'published';
            const dotBg = finale || isDone ? GOLD : isLive ? LIVE_RED : palette.primary;
            return (
              <button key={s.id} type="button" onClick={() => onJump?.(s.id)}
                aria-current={isActive ? 'true' : undefined}
                aria-label={s.name || s.theme || s.id}
                className="flex-1 min-w-[88px] flex flex-col items-center text-center outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] rounded-[4px] px-1">
                <span className="text-[9.5px] uppercase tracking-[0.1em] mb-1.5" style={{ color: MUTED }}>
                  {formatShortDate(s?.session_date, lang) || ''}
                </span>
                <span className="relative" style={{ height: 16, display: 'flex', alignItems: 'center' }}>
                  <span aria-hidden style={{
                    width: 14, height: 14, borderRadius: '50%', background: finale || isDone || isLive ? dotBg : 'white',
                    border: `2px solid ${dotBg}`,
                    boxShadow: isActive ? `0 0 0 4px ${GOLD}66` : isLive ? `0 0 0 3px ${LIVE_RED}33` : 'none',
                    animation: isLive ? 'concoursTimelinePulse 1.5s ease-in-out infinite' : undefined,
                  }} />
                </span>
                <span className="mt-2 text-[10.5px] leading-tight truncate max-w-[88px]"
                  style={{ color: isActive ? NAVY : MUTED, fontFamily: SERIF }}>
                  {s.name || s.theme || ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes concoursTimelinePulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
        @media (prefers-reduced-motion: reduce){ [style*="concoursTimelinePulse"]{animation:none!important} }`}</style>
    </section>
  );
}
```

- [ ] **Step 2 — build + lint + commit**

```bash
npm run build && npm run lint
git add src/components/rsa/concours-dashboard/ConcoursTimeline.jsx
git commit -m "feat(concours): frise borderless sticky + scroll-spy + ancrage"
```

---

## Task 8 : `Concours.jsx` (orchestration + veil)

**Files:**
- Modify (réécriture): `src/pages/Concours.jsx`

- [ ] **Step 1 — réécrire l'orchestration** (retirer `selectedEditionId`/selector ; édition active unique ; `buildSeason` ; `useScrollSpy` ; rendu Hero + Timeline + SeasonProgram + Finale ; veil M-Editorial-Veil)

```jsx
// /Concours — programme éditorial de la saison (refonte « La Saison »).
// Édition active unique (open || plus récente). Sessions chronologiques.
// Frise sticky = nav. Veil au mount. Lecture seule, auth-gate magic-link.
import React, { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { PageShell, TopNav, Footer } from '@/components/design';
import { NAVY, CREAM, INK, MUTED, EASE } from '@/components/design/tokens';
import { DANGER, TINT_DANGER } from '@/components/design/tokens.app';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';
import ConcoursHero from '@/components/rsa/concours-dashboard/ConcoursHero';
import ConcoursTimeline from '@/components/rsa/concours-dashboard/ConcoursTimeline';
import SeasonProgram from '@/components/rsa/concours-dashboard/SeasonProgram';
import FinaleSection from '@/components/rsa/concours-dashboard/FinaleSection';
import SessionDetailDrawer from '@/components/rsa/concours-dashboard/SessionDetailDrawer';
import { useEditionsAvailable, useEditionOverview } from '@/components/rsa/concours-dashboard/useConcours';
import { buildSeason } from '@/components/rsa/concours-dashboard/seasonModel';
import { useScrollSpy, scrollToSession } from '@/components/rsa/concours-dashboard/useScrollSpy';
import { UI } from '@/components/rsa/concours-dashboard/i18n';
import { computeCountdown } from '@/components/rsa/jury/constants';

function CenterSpinner({ label }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center gap-2.5" style={{ color: MUTED }}>
      <Loader2 className="w-4 h-4 animate-spin" /><span className="text-[13px]">{label}</span>
    </div>
  );
}

export default function Concours() {
  const { isAuthenticated, loading: authLoading } = usePlatformAuth();
  const { t, lang } = useLang();
  const reduce = useReducedMotion();

  const editionsQ = useEditionsAvailable();
  const editions = editionsQ.data || [];

  // Édition active unique — pas de selector.
  const edition = useMemo(() => {
    if (editions.length === 0) return null;
    return editions.find((e) => e.status === 'open') || editions[0];
  }, [editions]);

  const overviewQ = useEditionOverview(edition?.id);
  const overview = overviewQ.data;
  const [openSessionId, setOpenSessionId] = useState(null);

  const season = useMemo(() => buildSeason(overview, lang), [overview, lang]);
  const ids = useMemo(() => season.flat.map((s) => s.id), [season]);
  const activeId = useScrollSpy(ids);

  // KPIs (repris de l'ancienne logique, condensés).
  const kpis = useMemo(() => {
    if (!overview) return null;
    const flat = season.flat;
    const done = flat.filter((s) => s.status === 'published').length;
    const next = flat.find((s) => s.id === season.nextId);
    let nextLabel = null;
    if (next) {
      const cd = computeCountdown(next.session_date);
      const nm = next.name || next.theme || next.id;
      if (cd?.kind === 'today') nextLabel = `${nm} · ${t(UI.today)}`;
      else if (cd?.kind === 'tomorrow') nextLabel = `${nm} · ${t(UI.tomorrow)}`;
      else if (cd?.kind === 'in') nextLabel = `${nm} · ${t(UI.inDays)(cd.days)}`;
    }
    return {
      clubsCount: (overview.clubs || []).length,
      sessionsTotal: flat.length,
      sessionsDone: done,
      finalistsCount: overview.finalists_count || 0,
      nextLabel,
    };
  }, [overview, season, t]);

  const finaleSession = (overview?.finale_sessions || [])[0] || null;
  const finaleFinalists = Array.isArray(overview?.finalists) ? overview.finalists : [];
  const totalFinalistsExpected = useMemo(() => {
    if (!overview) return 0;
    const per = edition?.finalists_per_session ?? 1;
    return per * season.flat.length;
  }, [overview, edition, season]);

  if (!authLoading && !isAuthenticated) return <Navigate to="/Login" replace />;

  const veil = !reduce && (
    <motion.div aria-hidden initial={{ opacity: 0.6 }} animate={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: EASE }} className="fixed inset-0 z-[60] pointer-events-none"
      style={{ background: CREAM }} />
  );

  return (
    <PageShell width="wide"
      nav={<TopNav wordmark={t(UI.navTitle)} subtitle={t(UI.navSubtitle)} />}
      footer={<Footer width="wide" left={t(UI.footerLine)} right={
        <span>{t(UI.footerContact)} <a href="mailto:contact@rotary-startup.org" style={{ color: NAVY, textDecoration: 'underline' }}>contact@rotary-startup.org</a></span>
      } />}
    >
      {veil}
      {authLoading || editionsQ.isLoading ? (
        <CenterSpinner label={t(UI.loading)} />
      ) : editions.length === 0 ? (
        <div className="py-16 max-w-[44ch] mx-auto text-center">
          <p className="italic text-[18px]" style={{ fontFamily: 'Playfair Display, serif', color: NAVY }}>{t(UI.noEdition)}</p>
        </div>
      ) : (
        <>
          <ConcoursHero edition={edition} kpis={kpis} />
          {overviewQ.isLoading && <CenterSpinner label={t(UI.loading)} />}
          {overviewQ.isError && (
            <div role="alert" className="text-[13px] px-4 py-4 rounded-[4px]"
              style={{ color: INK, background: TINT_DANGER, borderLeft: `2px solid ${DANGER}` }}>
              {t(UI.loadError)}
            </div>
          )}
          {overview && (
            <>
              <ConcoursTimeline season={season} finaleSessions={overview.finale_sessions || []}
                activeId={activeId} onJump={scrollToSession} t={t} lang={lang} />
              {season.flat.length === 0 ? (
                <div className="py-12 max-w-[44ch] mx-auto text-center">
                  <p className="italic text-[18px]" style={{ fontFamily: 'Playfair Display, serif', color: NAVY }}>{t(UI.noClubs)}</p>
                </div>
              ) : (
                <SeasonProgram season={season} overview={overview} onOpenSession={(s) => setOpenSessionId(s.id)} />
              )}
              <FinaleSection edition={edition} finaleSession={finaleSession}
                finalists={finaleFinalists} totalFinalistsExpected={totalFinalistsExpected} />
            </>
          )}
        </>
      )}
      <SessionDetailDrawer sessionId={openSessionId} onClose={() => setOpenSessionId(null)} />
    </PageShell>
  );
}
```

> Vérifier les imports SERIF pour les empty states (utiliser le token `SERIF` plutôt que la string inline `'Playfair Display, serif'`). **Corriger** : importer `SERIF` et l'utiliser.

- [ ] **Step 2 — corriger** les 2 empty states pour `fontFamily: SERIF` (import depuis tokens). 0 hex/string de police inline.

- [ ] **Step 3 — build + lint + commit**

```bash
npm run build && npm run lint
git add src/pages/Concours.jsx
git commit -m "feat(concours): orchestration edition unique + buildSeason + veil + scroll-spy"
```

---

## Task 9 : `FinaleSection.jsx` (focal éditorial)

**Files:**
- Modify (réécriture): `src/components/rsa/concours-dashboard/FinaleSection.jsx`

- [ ] **Step 1 — réécrire** : séparateur fort (double filet), eyebrow gold, titre serif, lieu/horaire italique, ratio `tabular-nums`, liste de noms avec dot couleur source (réutiliser la dérivation `getSessionPalette` de `FinalistChip`), CTA navy unique. **Retirer** : `linear-gradient` de fond, halo radial, `concoursTrophyShimmer`, l'icône `Trophy` animée.

```jsx
// FinaleSection — la climax : focal éditorial sobre (sans gradient ni trophée animé).
import React from 'react';
import { Link } from 'react-router-dom';
import { Eyebrow } from '@/components/design';
import { NAVY, INK, MUTED, GOLD, CREAM2, SERIF } from '@/components/design/tokens';
import { ArrowRight } from 'lucide-react';
import { useLang } from '@/lib/platform/i18n';
import { UI, formatSessionDate } from './i18n';
import { createPageUrl } from '@/utils';
import { getSessionPalette } from './sessionTheme';

function FinalistName({ finalist }) {
  const p = finalist?.source_session_theme_color
    ? getSessionPalette({ id: finalist.source_session_id, config: { theme_color: finalist.source_session_theme_color } }, 0)
    : { primary: MUTED };
  return (
    <span className="inline-flex items-center gap-2 text-[14px]" style={{ color: NAVY }}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: p.primary }} />
      <span style={{ fontFamily: SERIF }}>{finalist.startup_name || finalist.name}</span>
    </span>
  );
}

export default function FinaleSection({ edition, finaleSession, finalists, totalFinalistsExpected }) {
  const { t, lang } = useLang();
  const finalistsList = Array.isArray(finalists) ? finalists : [];
  const dateLabel = formatSessionDate(finaleSession?.session_date, lang);
  const showRsvp = edition?.finale_rsvp_enabled || edition?.status === 'finale' || edition?.status === 'sessions';

  return (
    <section className="mt-16 pt-12" style={{ borderTop: `2px solid ${CREAM2}` }}>
      <Eyebrow>{t(UI.finaleEyebrow)}{edition?.year ? ` · ${edition.year}` : ''}</Eyebrow>
      <h2 className="text-[28px] md:text-[36px] font-normal leading-tight" style={{ fontFamily: SERIF, color: NAVY }}>
        {t(UI.finaleTitle)}
      </h2>
      {(dateLabel || finaleSession?.notes) && (
        <p className="mt-2 italic text-[15px]" style={{ fontFamily: SERIF, color: INK }}>
          {[finaleSession?.notes, dateLabel].filter(Boolean).join(' · ')}
        </p>
      )}
      <span aria-hidden className="block h-[1.5px] w-7 mt-5" style={{ background: GOLD }} />

      {!finaleSession ? (
        <p className="mt-5 italic text-[14px]" style={{ color: MUTED }}>{t(UI.finaleNoData)}</p>
      ) : (
        <>
          <div className="mt-6 uppercase text-[10.5px] tracking-[0.16em] font-semibold" style={{ color: NAVY }}>
            {t(UI.finaleFinalistsLabel)(finalistsList.length, totalFinalistsExpected || 0)}
          </div>
          {finalistsList.length === 0 ? (
            <p className="mt-3 italic text-[13px]" style={{ color: MUTED }}>{t(UI.finaleNoFinalists)}</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {finalistsList.map((f) => <FinalistName key={f.id || f.startup_name || f.name} finalist={f} />)}
            </div>
          )}
          {showRsvp && (
            <Link to={createPageUrl('RsaFinaleRsvp')}
              className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-[4px] text-[13.5px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
              style={{ background: NAVY, color: 'white' }}>
              {t(UI.finaleRsvpCta)} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 2 — build + lint + commit**

```bash
npm run build && npm run lint
git add src/components/rsa/concours-dashboard/FinaleSection.jsx
git commit -m "feat(concours): finale focal editorial (retire gradient + trophee anime)"
```

---

## Task 10 : `SessionDetailDrawer.jsx` (dé-card header + sans emoji)

**Files:**
- Modify: `src/components/rsa/concours-dashboard/SessionDetailDrawer.jsx`

- [ ] **Step 1 — retirer l'import + usages emoji**
  - Ligne 26 : `import { getSessionPalette, getSessionEmoji }` → `import { getSessionPalette }`.
  - Ligne ~381 : supprimer `const emoji = session ? getSessionEmoji(session) : null;`.
  - Header sticky (~432-437) et bloc thème (~465-472) : retirer les `{emoji && <span…>}`.

- [ ] **Step 2 — dé-carder le header** : remplacer le `<div sticky … style={{ background: ${palette.light}f0, borderBottom: 1px solid palette.border }}>` par un header blanc neutre + barre couleur 2px déjà présente en haut :

```jsx
<div
  className="sticky top-0 z-10 flex items-center justify-between px-5 py-3"
  style={{ background: 'white', borderBottom: `1px solid ${CREAM2}` }}
>
  <div className="uppercase text-[10px] tracking-[0.18em] font-semibold" style={{ color: palette.primary }}>
    {t(UI.drawerSection)}
  </div>
  <button type="button" onClick={onClose} aria-label={t(UI.drawerClose)}
    className="p-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] hover:bg-[#faf7f2]"
    style={{ color: NAVY }}>
    <X className="w-4 h-4" />
  </button>
</div>
```

> La barre couleur 2px en haut (ligne ~419-423, `style={{ background: palette.primary }}`) reste — c'est l'accent thème conservé.

- [ ] **Step 3 — build + lint + commit**

```bash
npm run build && npm run lint
git add src/components/rsa/concours-dashboard/SessionDetailDrawer.jsx
git commit -m "feat(concours): drawer header de-carde + retrait emoji"
```

---

## Task 11 : Cleanup (suppression des composants morts)

**Files:**
- Delete: `src/components/rsa/concours-dashboard/ClubSection.jsx`
- Delete: `src/components/rsa/concours-dashboard/SessionCard.jsx`

- [ ] **Step 1 — vérifier qu'aucun autre fichier ne les importe**

Run (Grep): `ClubSection|SessionCard` sur `src/`
Expected: aucune référence hors des 2 fichiers eux-mêmes (Concours.jsx ne les importe plus depuis Task 8).

- [ ] **Step 2 — vérifier `getSessionEmoji` plus appelé**

Run (Grep): `getSessionEmoji` sur `src/`
Expected: défini dans `sessionTheme.js`, plus aucun import. (Laisser la fonction en place — `[K]` — pour ne pas casser d'éventuels imports futurs ; ou la supprimer si 0 hit.)

- [ ] **Step 3 — supprimer + build + lint**

```bash
git rm src/components/rsa/concours-dashboard/ClubSection.jsx src/components/rsa/concours-dashboard/SessionCard.jsx
npm run build && npm run lint
```
Expected: build OK (aucun import cassé).

- [ ] **Step 4 — commit**

```bash
git commit -m "chore(concours): suppr. ClubSection + SessionCard (remplaces par SeasonProgram/SessionRow)"
```

---

## Task 12 : Vérification finale (browser smoke + acceptance)

**Files:** aucun (vérification).

- [ ] **Step 1 — lancer le dev server**

Run: `npm run dev` (port 5173).

- [ ] **Step 2 — smoke chrome-devtools MCP** sur `/Concours`, aux 3 breakpoints (375 / 768 / 1280) :
  - Édition complète : frise sticky cliquable, scroll-spy met l'anneau gold sur la section visible, sessions dans l'ordre chronologique, jalons mois présents, session LIVE dominante, finale focal sans gradient.
  - 1 session : frise 1 dot, opener unique (repli mois), pas de chapitre vide.
  - Édition vide : empty letter éditoriale.
  - Drawer : ouvre au clic d'une ligne, header dé-cardé sans emoji, QR si live, lauréate si publiée.

- [ ] **Step 3 — valider l'acceptance §8 de la spec** (checklist) : 0 faux logo, 0 selector, 0 grille de cards, 0 hex inline (grep `#[0-9a-f]{6}` hors tokens), 0 emoji, focus rings gold, `prefers-reduced-motion` (veil + pulse off).

- [ ] **Step 4 — commit final éventuel + push**

```bash
git push -u origin feat/concours-saison
```
(ou merge sur `main` selon ton choix).

---

## Self-review (couverture spec)

- §3.1 page → Task 8 ✓ · §3.2 hero → Task 6 ✓ · §3.3 frise → Task 7 ✓ · §3.4 SeasonProgram → Task 5 ✓ · §3.5 SessionRow → Task 4 ✓ · §3.6 finale → Task 9 ✓ · §3.7 drawer → Task 10 ✓ · §5 motion → Task 8 (veil) + Task 4/7 (hover/pulse) ✓ · §6 a11y → intégré (focus ring, aria-current, role=button) + Task 12 ✓ · §9 phasing → Tasks 1-12 ✓.
- Types cohérents : `buildSeason` → `{flat,months,single,nextId}` consommé identiquement par Concours/SeasonProgram/Timeline ; `scrollToSession(id)` ↔ ancres `id="session-<id>"` de SessionRow ↔ `useScrollSpy` qui lit `#session-<id>`.
- Point ouvert résolu : counts jurés/startups passés en props par SeasonProgram (Task 4 step 2 + Task 5).
```
