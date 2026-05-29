# Blueprint — Refonte v2 de la page `/Concours`

> **Statut** : draft d'architecture (à valider avant exécution).
> **Auteur** : sprint design 2026-05-29 (Rotary Startup Award, V2.5+).
> **Scope** : `src/pages/Concours.jsx` et son arbre `src/components/rsa/concours-dashboard/*`, RPC `rsa_concours_edition_overview` / `rsa_concours_session_detail`.
> **Hors scope** : pages admin (RsaAdmin), funnel de candidature, jury hub legacy `RsaJuryHub.jsx` (qui reste tel quel jusqu'à V3).

---

## 1. Problème — current state & "smell IA"

### 1.1 Ce qui marche aujourd'hui

La page `/Concours` actuelle (commit `df94c57`) est fonctionnellement correcte :

- `src/pages/Concours.jsx:41` — orchestrateur React, auth-gate magic-link, query overview + drawer.
- `src/components/rsa/concours-dashboard/ConcoursHero.jsx:39` — hero éditorial Élysée (`Eyebrow` + `EditorialTitle` + intro + KPI bar 4 stats).
- `src/components/rsa/concours-dashboard/ClubSection.jsx:18` — section par club avec asymétrie "prochaine session featured" + grid responsive.
- `src/components/rsa/concours-dashboard/SessionCard.jsx:41` — card "santé d'une session en un regard" (status pill, countdown, KPI jurés/startups, pack jury, finaliste).
- `src/components/rsa/concours-dashboard/SessionDetailDrawer.jsx:126` — drawer latéral 560px (startups + jurés + decks).
- `src/components/rsa/concours-dashboard/FinaleSection.jsx:19` — bloc Grande Finale avec gradient cream/gold soft.
- `supabase/migrations/20260531_rsa_v25_concours_dashboard.sql:56` — RPC `rsa_concours_edition_overview` + `rsa_concours_session_detail` (SECURITY DEFINER, authenticated only).

C'est une refonte multi-club, multi-édition, conforme Élysée navy/gold/cream — fonctionnellement supérieure au legacy.

### 1.2 Ce qui ne marche pas — le "smell IA"

Le problème est **éditorial**, pas fonctionnel. Comparé aux pages legacy (`RsaDashboard.jsx`, `RsaJuryHub.jsx`, `RsaJuryView.jsx`) qui avaient un punch visuel évident, la v1 actuelle est **homogène au point d'être interchangeable** avec toutes les autres pages plateforme :

| Symptôme | Cause | Effet |
|---|---|---|
| Hero plat sans halo, sans logo respirant | `H-Editorial` au lieu de `H-Ambient` (cf. `design-upgrade-blueprint.md:104,172`) | La page ne **dit pas** "voici LE concours" — elle dit "voici une page admin de plus" |
| Toutes les SessionCards identiques (cream / cream2 / navy) | Pas de palette per-session | Un mur de 5–10 cards indiscernables ; pas d'ancrage thématique |
| Pas d'emoji content marker (🌾 🤝 💻 🏥 🌱) | Pas de mapping mots-clés `name → emoji` | Perte d'identification thématique en 50ms ; reading load × 3 |
| Pas de banner gold "Lauréat" gradient | `cardFinalistLabel` rendu dans une simple ligne | Le moment fort (le finaliste désigné) ne **célèbre rien** |
| Drawer = liste plate startups + chips jurés | Pas de hiérarchie visuelle | On dirait un rapport, pas une vitrine |
| Pas de timeline horizontale visible d'emblée | Lecture verticale stricte club par club | Sur 3+ clubs × 5 sessions = 15 cards, on perd le séquentiel temporel |

**Le smell IA** : la page coche toutes les cases du design system (`Eyebrow`, `EditorialTitle`, hairlines gold, palette stricte) mais sans **ornement chargé** sur les moments qui le méritent. C'est le syndrome "template homogène" : techniquement irréprochable, émotionnellement éteint.

### 1.3 Référence legacy à ressusciter

`src/pages/RsaDashboard.jsx:37` définit la SSOT historique :

```js
const SC = {
  "Foodtech & économie circulaire":   { color:"#5a7a1a", light:"#eef5e0", border:"#c0d890", emoji:"🌾", short:"FoodTech" },
  "Impact social & Edtech":           { color:"#8a2040", light:"#fbe8ee", border:"#e8a8bc", emoji:"🤝", short:"Social"   },
  "Tech, AI, Fintech & Mobilité":     { color:"#4a2a7a", light:"#f0eaf8", border:"#c8b0e8", emoji:"💻", short:"Tech"     },
  "Healthtech & Biotech":             { color:"#1a5fa8", light:"#e8f0fb", border:"#a8c8f0", emoji:"🏥", short:"Health"   },
  "Greentech & Environnement":        { color:"#1d6b4f", light:"#e8f5ee", border:"#b0d8c4", emoji:"🌱", short:"Greentech"},
  // + Grande Finale : color = GOLD ("#c9a84c"), emoji = 🏆
};
```

`src/pages/RsaJuryHub.jsx:720` montre la QR scoring + jury pack co-localisée. Ce sont ces deux blocs (palette per-session + QR/pack drawer) qu'on importe en V2 — mais **réécrits Élysée** (gold/navy strict pour les ornements, couleur thématique en accent secondaire).

---

## 2. Solution architecturale

### 2.1 Quatre piliers

```
┌─────────────────────────────────────────────────────────────┐
│ 1. H-Ambient hero                  (NEW — remplace H-Editorial) │
│    logo Rotary respirant + halo gold + pitch éditorial          │
├─────────────────────────────────────────────────────────────┤
│ 2. Timeline horizontale "Calendrier"   (NEW — refonte L-Mosaic) │
│    rail temporel sticky-on-scroll, points colorés par session   │
├─────────────────────────────────────────────────────────────┤
│ 3. SessionCard colorée par thème        (REFONTE de l'actuel)   │
│    couleur d'accent + emoji + lauréat banner gradient gold      │
├─────────────────────────────────────────────────────────────┤
│ 4. SessionDetailDrawer enrichi          (REFONTE de l'actuel)   │
│    header thématique coloré, QR scoring si live, jurés avatars  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Principe directeur "ornement chargé"

> *Élysée n'interdit pas la couleur — il interdit la couleur **gratuite**. Une couleur thématique sur une session est **chargée** (elle identifie un domaine entrepreneurial) et donc admissible.*

Le navy + gold + cream restent dominants (>=80% de la surface) ; la couleur de session intervient en :

1. **bordure gauche 3px** de la SessionCard (signature couleur, pas inondation).
2. **fond emoji disc** (16px diamètre, halo `color@15%`).
3. **dot Timeline** (8px, fond `color`, anneau `color@30%`).
4. **header drawer** (eyebrow `color`, hairline `color@40%`).

Jamais en gros aplat de fond. La règle : la couleur **annonce** la session, elle ne **submerge** pas l'écran.

### 2.3 Comparatif avant/après

| Élément | v1 actuelle | v2 proposée |
|---|---|---|
| Hero | `Eyebrow` + serif title + intro plat | Logo respirant 80×80 + halo gold pulsant + pitch + intro + KPI bar dessous |
| Identification session | Nom serif uniquement | Emoji 🌾🤝💻🏥🌱 16px + short label "FoodTech" + nom |
| Couleur session | Aucune | Bordure-left 3px + dot color + halo emoji color@15% |
| Lauréat | Ligne text dans card | Banner gradient gold + serif name + medal 🏆 |
| Timeline | Implicite (lecture club par club) | Rail horizontal explicite en tête de page (sous hero) |
| Drawer header | Title serif + date + status pill | Eyebrow color + emoji + title + date + status + (si live) QR scoring |
| Avatars jurés | Chip rond 28px + texte | Conservé mais regroupé en grid 2-col sur >= 4 jurés |

---

## 3. Stack composants

Chemins relatifs depuis racine repo. **N** = nouveau fichier, **R** = refonte du contenu (signature préservée), **K** = inchangé (garde le wiring actuel).

### 3.1 Arbre cible

```
src/components/rsa/concours-dashboard/
├── ConcoursHero.jsx                          [R]  H-Editorial → H-Ambient
├── ConcoursTimeline.jsx                      [N]  rail horizontal sticky
├── ConcoursStatusPill.jsx                    [K]  inchangé
├── ClubSection.jsx                           [R]  injecte sessionPalette aux SessionCards
├── SessionCard.jsx                           [R]  bordure couleur + emoji + lauréat banner
├── SessionCardLaureateBanner.jsx             [N]  bloc gradient gold extrait
├── SessionDetailDrawer.jsx                   [R]  header coloré + QR si live + jurés grid
├── SessionDetailHeader.jsx                   [N]  header thématique extrait du drawer
├── SessionDetailScoringBlock.jsx             [N]  QR + scoring URL + copie (extrait RsaJuryHub V1)
├── FinaleSection.jsx                         [K]  garde gradient cream/gold actuel
├── useConcours.js                            [R]  consomme theme_color + final_ranking enrichis
├── useSessionPalette.js                      [N]  hook palette (DB override + hash auto)
├── sessionPalette.js                         [N]  palette tournante 8 couleurs + emoji heuristique
└── i18n.js                                   [R]  ajoute strings emoji-mapping fallback + scoring
```

### 3.2 Justification des extractions

| Pourquoi extraire | Composant |
|---|---|
| Le banner gold "Lauréat" méritera des variantes (1er/2e/3e si V3 podium intra-session) | `SessionCardLaureateBanner.jsx` |
| Le header drawer est suffisamment dense pour être testé/maintenu indépendamment | `SessionDetailHeader.jsx` |
| Le bloc QR + scoring URL est réutilisable verbatim dans RsaJuryView V3 et RsaScore | `SessionDetailScoringBlock.jsx` |
| `useSessionPalette` doit pouvoir être consommé depuis n'importe quelle page (Calendrier, RsaRecap…) | hook autonome |

### 3.3 Composant inchangé : `ConcoursStatusPill`

`src/components/rsa/concours-dashboard/ConcoursStatusPill.jsx:30` reste tel quel (palette neutre intentionnelle : `draft/live/locked/published/finished`). On ne **mélange pas** la couleur de session avec la sémantique de statut, sinon le live d'une session "Greentech" ressemblerait à un published d'une autre.

---

## 4. Palette per-session — mix auto + override DB

### 4.1 SSOT — `sessionPalette.js`

```js
// src/components/rsa/concours-dashboard/sessionPalette.js
// Palette tournante 8 couleurs (legacy SC + 3 nouvelles pour clubs internationaux V2).
// Ordre : RsaDashboard.jsx SC + ajouts.
export const SESSION_PALETTE = [
  { key: 'foodtech',  color: '#5a7a1a', light: '#eef5e0', border: '#c0d890' }, // vert olive
  { key: 'social',    color: '#8a2040', light: '#fbe8ee', border: '#e8a8bc' }, // rose carmin
  { key: 'tech',      color: '#4a2a7a', light: '#f0eaf8', border: '#c8b0e8' }, // violet
  { key: 'health',    color: '#1a5fa8', light: '#e8f0fb', border: '#a8c8f0' }, // bleu
  { key: 'greentech', color: '#1d6b4f', light: '#e8f5ee', border: '#b0d8c4' }, // sage
  { key: 'industry',  color: '#7a4a1a', light: '#f5ede0', border: '#d8c0a0' }, // ambre (V2 new)
  { key: 'culture',   color: '#7a1a5a', light: '#f5e0ef', border: '#d8a0c8' }, // magenta (V2 new)
  { key: 'finale',    color: '#c9a84c', light: '#fdf6e8', border: '#e8d090' }, // GOLD (toujours finale)
];

// Hash déterministe d'une string → index 0..6 (la finale est réservée).
export function hashToPaletteIndex(input, modulo = 7) {
  if (!input) return 0;
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h % modulo;
}
```

### 4.2 Override DB — `session_config.theme_color`

Trois sources de vérité, par ordre de priorité :

```
1. session.config.theme_color    (override admin explicite, hex "#RRGGBB")
2. session.kind === 'finale'     → palette 'finale' (toujours gold)
3. hash(session.name)            → palette[hashToPaletteIndex(name)]
```

Si admin renseigne `#5a7a1a` mais que la couleur n'est pas dans la palette canonique, le hook **n'invente pas** un `light` / `border` — il les dérive par opacité (`color@12%` / `color@40%`).

### 4.3 Le hook — `useSessionPalette.js`

```js
// src/components/rsa/concours-dashboard/useSessionPalette.js
import { SESSION_PALETTE, hashToPaletteIndex } from './sessionPalette';

const PALETTE_BY_KEY = Object.fromEntries(SESSION_PALETTE.map((p) => [p.key, p]));

function hexToRgba(hex, a) {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Retourne { color, light, border, source } pour une session.
 *  - source: 'override' | 'finale' | 'auto'
 */
export function useSessionPalette(session) {
  if (!session) return PALETTE_BY_KEY.foodtech; // safe default

  // 1. Override DB
  const override = session?.config?.theme_color;
  if (override && /^#[0-9a-f]{6}$/i.test(override)) {
    return {
      color: override,
      light: hexToRgba(override, 0.12),
      border: hexToRgba(override, 0.4),
      source: 'override',
    };
  }

  // 2. Finale
  if (session.kind === 'finale') {
    return { ...PALETTE_BY_KEY.finale, source: 'finale' };
  }

  // 3. Hash auto
  const idx = hashToPaletteIndex(session.name || session.id);
  return { ...SESSION_PALETTE[idx], source: 'auto' };
}
```

**Propriété importante** : ce hook est **pur** (pas de state, pas de query), donc on peut l'appeler dans une map sans surcharge. Il est aussi **stable** : deux sessions de même nom recevront toujours la même couleur, donc rappeler la palette d'un club à l'autre est cohérent (FoodTech reste vert à chaque édition).

### 4.4 Migration DB additive

```sql
-- supabase/migrations/20260601_rsa_concours_v2_theme_color.sql
ALTER TABLE public.session_config
  ADD COLUMN IF NOT EXISTS theme_color text
    CHECK (theme_color IS NULL OR theme_color ~ '^#[0-9a-fA-F]{6}$');

COMMENT ON COLUMN public.session_config.theme_color IS
  'V2 concours dashboard : couleur thématique hex #RRGGBB override (sinon hash auto sur session.name).';
```

Pas de backfill nécessaire — le hook fait le job si NULL.

---

## 5. Emoji content markers — heuristique mots-clés

### 5.1 Mapping

```js
// src/components/rsa/concours-dashboard/sessionPalette.js (suite)
// Heuristique : on cherche dans session.name (lowercased, sans accents) un mot-clé
// du tableau ci-dessous. PREMIER match gagne. Fallback : null (la SessionCard
// rend sans emoji — pas de placeholder ❓ qui aurait l'air "manquant").
const EMOJI_RULES = [
  { rx: /\bfood|circulaire|circular|agro|food.?tech\b/i,                 emoji: '🌾', short: 'FoodTech'  },
  { rx: /\bsocial|edtech|education|inclusion|impact\b/i,                  emoji: '🤝', short: 'Social'    },
  { rx: /\btech|ai\b|fintech|mobilit|industr.?(4|x)\b|robot\b/i,          emoji: '💻', short: 'Tech'      },
  { rx: /\bhealth|biotech|medtech|sant[eé]|medic|pharma\b/i,              emoji: '🏥', short: 'Health'    },
  { rx: /\bgreen|environ|cleantech|climat|energ|renouvel|carbon\b/i,      emoji: '🌱', short: 'Greentech' },
  { rx: /\bculture|art|m[eé]dia|creative\b/i,                             emoji: '🎭', short: 'Culture'   },
  { rx: /\bspace|spatial|aerospace|d[eé]fense\b/i,                        emoji: '🛰️', short: 'Space'    },
  { rx: /\bfinale|grand|final\b/i,                                        emoji: '🏆', short: 'Finale'    },
];

export function resolveSessionMarker(session) {
  if (!session) return { emoji: null, short: null };
  // Finale a priorité sur les heuristiques (un nom "Finale FoodTech" ne doit pas
  // afficher 🌾 mais 🏆).
  if (session.kind === 'finale') return { emoji: '🏆', short: 'Finale' };
  const text = `${session.name || ''} ${session.theme || ''}`;
  for (const rule of EMOJI_RULES) {
    if (rule.rx.test(text)) return { emoji: rule.emoji, short: rule.short };
  }
  return { emoji: null, short: null };
}
```

### 5.2 Règles d'usage

| Règle | Justification |
|---|---|
| **Fallback null** (jamais `❓` ou `📄`) | Un emoji "vide" sur 1 card sur 10 fait plus tache qu'un design sans emoji du tout |
| **Premier match gagne** | Pas de cumul "🌾🏥" pour une "FoodTech & santé" — on prend l'ancrage primaire |
| **Finale a priorité absolue** | Sinon une "Grande Finale Greentech 2026" afficherait 🌱 |
| **Pas d'override DB pour l'emoji** (V2) | L'override couleur suffit ; pour l'emoji, on garde la simplicité. V3 si besoin |

### 5.3 Rendu dans `SessionCard`

```jsx
// SessionCard.jsx — extrait du header refondu
const palette = useSessionPalette(session);
const { emoji, short } = resolveSessionMarker(session);

<article
  className="bg-white rounded-[10px] p-5 ..."
  style={{
    border: `1px solid ${CREAM2}`,
    borderLeft: `3px solid ${palette.color}`,   // signature couleur
  }}
>
  <header className="flex items-start justify-between gap-3">
    <div className="flex items-start gap-3 min-w-0 flex-1">
      {emoji && (
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[18px] shrink-0"
          style={{ background: palette.light, border: `1px solid ${palette.border}` }}
          aria-hidden
        >
          {emoji}
        </div>
      )}
      <div className="min-w-0 flex-1">
        {short && (
          <div
            className="uppercase text-[9.5px] tracking-[0.16em] font-medium mb-0.5"
            style={{ color: palette.color }}
          >
            {short}
          </div>
        )}
        <h3 className="text-[17px] font-medium leading-tight truncate"
            style={{ fontFamily: SERIF, color: NAVY }}>
          {session.name || session.theme || session.id}
        </h3>
      </div>
    </div>
    <ConcoursStatusPill ... />
  </header>
  ...
</article>
```

---

## 6. RPC v2 — enrichissements `theme_color` + `final_ranking[winner]`

### 6.1 Changements `rsa_concours_edition_overview`

Référence actuelle : `supabase/migrations/20260531_rsa_v25_concours_dashboard.sql:140-146`.

```sql
-- AVANT (V2.5)
'config', jsonb_build_object(
  'status', cfg.status,
  'jury_pack_path', cfg.jury_pack_path
  -- final_ranking volontairement exclu (poids lourd)
)

-- APRÈS (V2)
'config', jsonb_build_object(
  'status', cfg.status,
  'jury_pack_path', cfg.jury_pack_path,
  'theme_color', cfg.theme_color,                                      -- NEW
  'winner_startup_name', (
    SELECT s.name FROM public.startups s
     WHERE s.session_id = sess.id
       AND s.status IN ('finaliste', 'laureat')
     ORDER BY (s.status = 'laureat') DESC, s.name
     LIMIT 1
  )                                                                     -- NEW
)
```

**Justification du subquery winner_startup_name** : la SessionCard a besoin du nom du finaliste pour afficher la banner lauréat dès l'overview, sans devoir ouvrir le drawer. Le coût est négligeable (1 startup max par session published, indexé sur `session_id`).

On **ne renvoie pas** `final_ranking` complet ici (peut peser plusieurs Ko si 6 startups × 5 jurés × 5 critères) — il reste dans `rsa_concours_session_detail` pour le drawer.

### 6.2 Changements `rsa_concours_session_detail`

Référence : `20260531_rsa_v25_concours_dashboard.sql:353-361`.

```sql
-- AVANT
SELECT jsonb_build_object(
  'status', cfg.status,
  'jury_pack_path', cfg.jury_pack_path,
  'session_order', cfg.session_order,
  'final_ranking', cfg.final_ranking
) INTO v_config ...

-- APRÈS
SELECT jsonb_build_object(
  'status', cfg.status,
  'jury_pack_path', cfg.jury_pack_path,
  'session_order', cfg.session_order,
  'theme_color', cfg.theme_color,                                       -- NEW
  'scoring_url', cfg.scoring_url,                                       -- NEW (si live)
  'final_ranking', cfg.final_ranking,
  'final_ranking_winner', (cfg.final_ranking->0->>'startup_name')       -- NEW (déballé pour le drawer)
) INTO v_config ...
```

`scoring_url` : déjà présent dans `session_config` (legacy V1). On l'exposait pas en V2.5 (la page était pensée "post-event") ; en v2 on l'expose **uniquement** quand `status = 'live'` côté client (le SQL le renvoie toujours, le drawer décide).

### 6.3 Compat ascendante

Les deux nouveaux champs (`theme_color`, `winner_startup_name`, `scoring_url`, `final_ranking_winner`) sont :

- **NULL-safe côté SQL** (`COALESCE` pas nécessaire — `jsonb_build_object` accepte NULL et le hook UI gère).
- **Optionnels côté front** — le fallback du hook `useEditionOverview` (`useConcours.js:71`) ne casse pas, il rendra simplement sans theme_color override (=> hash auto).

Pas besoin de migration versionnée de l'RPC signature (toujours `(text) → jsonb`), juste un `CREATE OR REPLACE`.

### 6.4 Migration

```sql
-- supabase/migrations/20260602_rsa_concours_v2_rpc_enrich.sql
BEGIN;
  -- session_config.theme_color (cf. §4.4) si pas déjà appliqué
  ALTER TABLE public.session_config
    ADD COLUMN IF NOT EXISTS theme_color text
      CHECK (theme_color IS NULL OR theme_color ~ '^#[0-9a-fA-F]{6}$');

  -- CREATE OR REPLACE des deux RPC (corps complet — pas de patch jsonb)
  -- ... cf. §6.1 / §6.2
COMMIT;
```

---

## 7. Wiring TanStack Query

### 7.1 `useConcours.js` — diff conceptuel

Référence : `src/components/rsa/concours-dashboard/useConcours.js:46`.

| Hook | v1 | v2 |
|---|---|---|
| `useEditionsAvailable` | inchangé | inchangé |
| `useEditionOverview(editionId)` | Renvoie `sessions_by_club[club][session].config = { status, jury_pack_path }` | + `theme_color`, + `winner_startup_name` dans `config` |
| `useSessionDetail(sessionId)` | Renvoie `config = { status, jury_pack_path, session_order, final_ranking }` | + `theme_color`, + `scoring_url`, + `final_ranking_winner` |

### 7.2 Fallback client-side

Le fallback (lignes 71–152 actuelles) doit recevoir le même upgrade — sinon dev local sans migration aurait des cards sans couleur thématique. Côté fallback, on lit `cfg.theme_color` depuis `session_config` directement et on construit l'objet `config` symétrique.

```js
// useConcours.js — extrait du fallback enrichi
const sessionsByClub = {};
for (const s of sessionsWithCfg || []) {
  // s.config est déjà composé par RsaSession.withConfigForEdition
  const winner = startupsRes.data?.find(
    (r) => r.session_id === s.id && (r.status === 'laureat' || r.status === 'finaliste'),
  );
  s.config = {
    ...s.config,
    theme_color: s.config?.theme_color || null,
    winner_startup_name: winner?.name || null,
  };
  if (s.kind === 'finale' && !s.club_id) { finaleSessions.push(s); continue; }
  const cid = s.club_id || '__none__';
  (sessionsByClub[cid] ||= []).push(s);
}
```

### 7.3 Cache invariants

| Clé | TTL | Invalidation |
|---|---|---|
| `['rsa','concours','editions']` | 5 min | Manuelle (création édition) |
| `['rsa','concours','overview', editionId]` | 30 s | `invalidate` au RSVP finale, à la publication d'une session |
| `['rsa','concours','session-detail', sessionId]` | 30 s | `invalidate` à la publication |

Pas de subscription temps réel — le bénéfice (re-render < 30s) ne justifie pas le coût réseau pour une page consultée 2-5 fois par session. Réévaluable V3.

### 7.4 Préfetch drawer

Petite optimisation : au survol d'une SessionCard >800ms, on peut préfetcher `useSessionDetail` pour que le drawer ouvre instantanément.

```js
// SessionCard.jsx
const queryClient = useQueryClient();
const prefetch = () => queryClient.prefetchQuery({
  queryKey: CONCOURS_KEYS.sessionDetail(session.id),
  queryFn: () => fetchSessionDetail(session.id),
  staleTime: 30 * 1000,
});

<article onMouseEnter={() => setTimeout(prefetch, 800)} ...>
```

**Non bloquant** pour la v2 — à shipper en P2 si timing permet.

---

## 8. Patrons réutilisables ailleurs dans l'app

### 8.1 `useSessionPalette` — extractible

Le hook + le module `sessionPalette.js` sont **agnostiques** de la page Concours. Candidats consommateurs identifiés :

| Page / composant | Bénéfice attendu |
|---|---|
| `src/pages/Calendrier.jsx` (legacy, V3 pivot) | Dot calendar couleur par session = identification instantanée |
| `src/components/rsa/admin/SessionsTab.jsx` | Liste admin : préview de la couleur thématique au survol |
| `src/pages/RsaRecap.jsx` | Tableau récap : color-strip à gauche de chaque ligne session |
| `src/components/comms/EmailStudio.jsx` | Sélecteur de couleur pour les templates par session |
| `src/pages/RsaFinaleResults.jsx` | Source-tag couleur "issu de Session 3 — Tech" |

### 8.2 `SessionDetailScoringBlock` — extractible

Le bloc QR + URL + copie (extrait verbatim de `RsaJuryHub.jsx:710`) est candidat à devenir un atome partagé sous `src/components/rsa/shared/ScoringQR.jsx`. Adoption V3 dans RsaJuryView.

### 8.3 Émoji heuristique — déjà utile partout

Le module `resolveSessionMarker` peut alimenter :
- Les notifications email ("La session 🌾 FoodTech démarre dans 2h").
- Les titres de tabs admin (icône thématique sur l'arborescence).
- Les channel names si on intègre Slack/Discord V3.

### 8.4 Convention partagée

Tout consommateur futur de `useSessionPalette` doit respecter :

```
Couleur de session = ACCENT, jamais FOND PRIMAIRE.
  ✓ borderLeft 3px, ring 1px, dot 8px, emoji halo @12%
  ✗ background plein, button, text body
```

---

## 9. Phasing

### 9.1 Plan d'exécution

| Phase | Périmètre | Effort | Dépendances |
|---|---|---|---|
| **0. Foundations** | `sessionPalette.js`, `useSessionPalette.js`, migration `theme_color` + RPC enrich | 2h | Migration appliquée |
| **1. Composants** | `ConcoursHero` H-Ambient, `SessionCard` refonte, `SessionCardLaureateBanner`, `SessionDetailHeader`, `SessionDetailScoringBlock`, `ConcoursTimeline` | 4-5h | Phase 0 |
| **2. Drawer** | Refonte `SessionDetailDrawer` avec header thématique + scoring block + jurés grid | 1.5h | Phase 1 |
| **3. Wiring** | Enrichissement `useConcours.js` (RPC champs + fallback) | 1h | Phase 0 |
| **4. Docs** | Mise à jour `ui-patterns-catalog-generic.md` (mention palette per-session pour `H-Ambient` Concours) + entry `design-upgrade-blueprint.md` §4.13 | 0.5h | Phase 2 |
| **5. Build verif** | `npm run build`, smoke-test 3 cas (édition open / closed / sans sessions), responsive 375/768/1280 | 1h | Tout |

**Total** : 10-11h, déployable en un sprint.

### 9.2 Ordre des PRs

Pour éviter les rebases croisés :

```
PR #1  feat(db): add session_config.theme_color + enrich rsa_concours RPC v2
PR #2  feat(concours): sessionPalette + useSessionPalette + emoji heuristic (no UI)
PR #3  feat(concours): SessionCard v2 (palette + emoji + laureate banner)
PR #4  feat(concours): H-Ambient hero + ConcoursTimeline
PR #5  feat(concours): SessionDetailDrawer v2 (themed header + scoring QR block)
PR #6  docs(design): catalog update — palette per-session pattern
```

Chaque PR est indépendamment révoquable (les composants v1 restent fonctionnels avec les nouveaux champs RPC NULL-safe).

### 9.3 Feature flag ? Non.

La refonte est en place de la v1 — pas de double maintenance. Le rollback est `git revert PR #3..#5` si problème en prod, l'RPC v2 reste compatible avec l'ancien front.

---

## 10. Critères d'acceptation visuels

### 10.1 Hero

- [ ] Logo Rotary 80×80 visible centré, rotation 48s respectée.
- [ ] Halo gold radial-gradient pulsant 3.2s, **désactivé** sous `prefers-reduced-motion`.
- [ ] Pitch éditorial `EditorialTitle` rendu **sous** le logo (pas à côté).
- [ ] KPI bar 4 stats : Clubs · Sessions · Finalistes · Prochaine — conservée mais resserrée sous le hero (pas dans le hero lui-même).
- [ ] Sélecteur édition : repositionné en TopNav-adjacent (ou conservé en haut à droite du hero, à arbitrer).

### 10.2 Timeline

- [ ] Rail horizontal scrollable mobile / contenu sur 1 ligne >=768px.
- [ ] Chaque point : dot 8px de couleur thématique + label session + date.
- [ ] Point actif (= `live` ou `next`) : ring 2px gold autour du dot.
- [ ] Sous chaque dot : tag emoji (🌾 🤝 …) en text-[14px] semi-opaque.
- [ ] Click point = scroll smooth jusqu'à la SessionCard correspondante.

### 10.3 SessionCard

- [ ] Bordure gauche 3px de la couleur thématique (visible au premier glance).
- [ ] Emoji disc 36×36 dans le header, halo `palette.light` + border `palette.border`.
- [ ] Eyebrow `short` ("FoodTech") en `palette.color`, uppercase, tracking 0.16em.
- [ ] Si `status === 'published'` ET `winner_startup_name` : banner gradient gold (cf. extrait RsaJuryHub legacy `lin-grad(135deg, #fdf6e8, #fbeec1)`) + 🏆 + nom serif italic.
- [ ] Si `null` emoji (fallback) : pas de disc, pas de placeholder — la card respire.
- [ ] Hover : `translateY(-2px)`, `shadow-sm`, bordure gauche s'épaissit à 4px.

### 10.4 Drawer

- [ ] Header drawer : eyebrow `palette.color` "DÉTAIL DE LA SESSION", titre serif, emoji aligné gauche.
- [ ] Si `status === 'live'` ET `scoring_url` : bloc QR (140px) + URL + bouton copie immédiatement sous le header.
- [ ] Liste startups : pas de changement majeur, ajout d'un dot 6px couleur thématique avant le nom.
- [ ] Jurés : si <=3 jurés, chips en flex ; si >=4 jurés, grid 2-col.
- [ ] Footer drawer (NEW V2) : si `final_ranking_winner`, mini "Lauréat retenu" gold ; sinon rien.

### 10.5 Finale

- [ ] Conservée telle quelle (`FinaleSection.jsx` déjà gradient cream/gold, c'est l'inspiration originale).
- [ ] Liste finalistes : ajouter dot couleur source par chip (pour rappeler de quelle session vient chaque finaliste).

### 10.6 Tests régression

| Cas | Attendu |
|---|---|
| Édition sans sessions | Empty state cream actuel inchangé |
| Édition avec 1 club / 1 session | Hero + Timeline (1 point) + 1 card + Finale empty |
| Édition complète (5 clubs × 5 sessions = 25 cards) | Timeline scrollable, perf fluide, palette consistante |
| Override `theme_color = '#ff0000'` rouge vif | Card bordure rouge, light dérivé `rgba(255,0,0,0.12)` |
| Session avec `name = "Industrie 4.0 et défense"` | Emoji 💻 (rx tech) + short "Tech" |
| Session avec `name = "Atelier Yoga"` (rien) | Emoji null, pas de placeholder |
| `prefers-reduced-motion` activé | Hero halo statique, pas de rotation logo |
| Session live | QR scoring visible dans le drawer, statut pill rouge pulsant |

---

## 11. Risques & arbitrages

| Risque | Mitigation |
|---|---|
| Palette tournante donne 2 sessions consécutives de même couleur (hash collision) | Acceptable V2 (2/64 chances sur 8 sessions). V3 : algo "round-robin" avec lookback sur la même édition. |
| Override admin avec couleur peu lisible sur cream (jaune fluo) | Le hook ne valide pas le contraste — à V3, ajouter un check WCAG AA dans `useSessionPalette`. Pour V2 : confiance admin, on ne policera pas. |
| H-Ambient avec logo respirant = animation hors brand Rotary | Le logo SVG est le wheel officiel Rotary (cf. commit `fb712e2`). Rotation 48s = imperceptible mais "vivant". OK marque. |
| `winner_startup_name` subquery dans l'overview = N+1 si 50 sessions | Acceptable jusqu'à 50 sessions (un index `(session_id, status)` existe déjà sur `startups`). À 100+ : passer à un CTE LATERAL. |
| Émoji rendering inconsistant cross-OS (Windows vs macOS) | Documenté limitation. Pas de fallback PNG : surcoût > gain. |

---

## 12. Annexe — palette legacy → palette v2 mapping

| Session legacy (RsaDashboard SC) | Hex | Émoji | Short | → Palette V2 key |
|---|---|---|---|---|
| Foodtech & économie circulaire | `#5a7a1a` | 🌾 | FoodTech | `foodtech` |
| Impact social & Edtech | `#8a2040` | 🤝 | Social | `social` |
| Tech, AI, Fintech & Mobilité | `#4a2a7a` | 💻 | Tech | `tech` |
| Healthtech & Biotech | `#1a5fa8` | 🏥 | Health | `health` |
| Greentech & Environnement | `#1d6b4f` | 🌱 | Greentech | `greentech` |
| Grande Finale | `#c9a84c` (GOLD) | 🏆 | Finale | `finale` |
| *(V2 new)* Industrie & deeptech | `#7a4a1a` | 🛰️ | Industry | `industry` |
| *(V2 new)* Culture & médias | `#7a1a5a` | 🎭 | Culture | `culture` |

---

## 13. Ouverture V3

Notes hors scope v2, à garder en tête :

- **Multi-édition timeline** : si V3 permet la consultation cross-édition, la Timeline devra grouper par année (`2026` → `2027`).
- **Sponsor strip** sous les SessionCards : si V3 introduit des sponsors par session, prévoir un slot footer card.
- **Live scoring embed** : aujourd'hui on rend juste le QR ; V3 pourra montrer un mini-leaderboard temps réel via Realtime sur `scores` (sous flag).
- **A11y deep** : ajouter `aria-current="true"` sur le dot Timeline actif, `aria-label` sur les emojis discs (`role="img"` + `aria-label="FoodTech"`).
- **i18n complète** : les `short` ("FoodTech", "Social") restent en EN par convention sectorielle — à confirmer DE/FR au moment de la livraison.

---

**Fin du blueprint.**
