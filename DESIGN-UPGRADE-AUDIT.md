# Design Upgrade — audit + direction

## TL;DR

- **Broken** : l'existant est un HTML monolithe cohérent mais daté 2022 — modales plein-drawer, pas de motion, pas de dark mode, KPIs plats, tables banales, aucune densité assumée. On est au niveau "outil interne décent", pas "référence premium".
- **Direction** : **Editorial Atelier** — on pousse à fond l'ADN Maison Félicien (pâtisserie artisanale parisienne, livre de recettes rare) + emprunts ciblés à Linear (command palette, keyboard-first, tables denses, focus rings) et Stripe (chiffres en monospace, hiérarchie). Dark mode first-class. Motion spring partout.
- **Impact attendu** : l'outil passe de « backoffice custom propre » à « référence absolue dans le segment ». Valeur commerciale réelle : impressionne les prospects distributeurs quand on leur montre l'écran derrière le catalogue.

---

## 1 · Audit (diagnostic)

### Inventaire écrans

| Route | Rôle | Composants clés |
|---|---|---|
| `/outils/catalogue-builder` | CRUD produits + publication | topbar, sidebar cat+chips+stats, grid cards horiz, modal 5 tabs, bulk bar, dialog custom |
| `/outils/prospection` | Création kits + liste distrib | topbar nav, 2 tabs, forms stacked, table liens |
| `/outils/dashboard` | Pilotage commercial | topbar, 5 KPIs row, 6 cards 2 cols, bar chart, audit log |
| `/outils/cockpit` | Chasse B2B | topbar, 6 stats, tabs type, table + kanban 13 col, modal fiche |
| `/outils/guide` | Documentation | topbar, sidebar sticky nav, long form content |
| `/c/:token` | Catalogue public | cover rose, cards produit, lang switcher |

### Grille de diagnostic (1-5, 5 = excellent)

| Écran | Clarity | Density | Consistency | Modernity | Emotion | A11y | Priorité | Notes |
|---|---|---|---|---|---|---|---|---|
| catalogue-builder | 3 | 3 | 4 | 2 | 3 | 3 | **P0** | Modale slide-right casse le contexte, chips basiques, pas de motion |
| dashboard | 4 | 2 | 3 | 2 | 2 | 3 | **P0** | 5 KPIs tous identiques = hiérarchie morte, bar chart bricolé, pas de "what to do today" |
| prospection | 3 | 3 | 4 | 2 | 2 | 3 | **P0** | Forms lourds, liste produits en checkboxes plates, preview lien absente |
| cockpit | 4 | 4 | 4 | 3 | 3 | 3 | P1 | Kanban correct, fiche dense bien faite, mais esthétique un peu datée |
| guide | 4 | 4 | 4 | 4 | 4 | 4 | P2 | Récemment fait, tient bien — juste à aligner sur nouveaux tokens |
| /c/:token | 3 | 3 | 4 | 3 | 3 | 4 | P1 | Cover rose plein = OK mais générique, cards produit sobres |

### Red flags présents

- Cards cookie-cutter avec drop shadow léger sur TOUT (shadow-soup light)
- Topbar marron identique partout → signal d'app, pas de signal de page (usage correct mais pourrait porter plus d'info contextuelle)
- KPIs dashboard tous pareils, aucune hiérarchie P1 vs P3
- Bar chart "fait maison" avec 8 div → pas de courbe, pas de sparkline temporelle
- Pas une seule animation spring
- Focus rings absents ou natifs basiques
- `prefers-color-scheme: dark` ignoré
- `confirm()` remplacé par `<dialog>` custom : ✅ OK, mais plat
- Pas de skeleton loader → tables vides + texte "Chargement…"
- Tables avec `tr:hover background` mais aucun mouvement

### Red flags **absents** (ce qui tient déjà)

- Pas de purple gradient
- Pas d'icon mix — on a volontairement 0 icon lib, symboles texte (◆ ✦ ⌕) cohérents
- Radii cohérents (4px/5px/6px selon contexte, assumé)
- Palette assumée (rose + vert olive + poudré, pas "gris et bleu")
- Type scale limité (Cormorant italic + Questrial), pas de soupe

---

## 2 · Intent decode (JTBD par écran)

### Catalogue builder
- **Job** : « je veux saisir / enrichir / publier un produit en <5 min, en confiance qu'il est prêt pour distributeur »
- **Primaire** : modifier un produit existant (85 % du temps)
- **Secondaire** : créer, dupliquer, publier
- **Noise** : la zone "Actions" sidebar avec Reset / Seed qui prennent de la place pour des actions <1/mois
- **État émotionnel** : focus intense, minutie, besoin de feedback instantané (complétion, marge, photo)

### Dashboard
- **Job** : « je veux savoir en 10 secondes ce que je dois faire aujourd'hui »
- **Primaire** : identifier la décision du jour (relance urgente, produit à recompléter, marge à corriger)
- **Secondaire** : tendances historiques
- **Noise** : les 5 KPIs identiques traités à égalité alors qu'ils n'ont pas le même poids
- **État émotionnel** : survol matinal, pressé, peu de tolérance à la complexité

### Prospection
- **Job** : « je veux générer un lien de catalogue personnalisé pour un prospect en <30 sec »
- **Primaire** : créer un kit (sélection + canal + distributeur)
- **Secondaire** : suivre les liens existants (vues)
- **Noise** : la gestion CRUD distributeurs dans le même écran → à déplacer au Cockpit
- **État émotionnel** : transactionnel, itératif (je vais créer 10 kits à la suite)

---

## 3 · Research brief (patterns de référence 2026)

| Référence | Pattern stealable | Pourquoi pour nous |
|---|---|---|
| **Linear** | Command palette ⌘K omniprésente, density toggle, focus rings animés, status pills avec dot | Outil interne, opérateurs, keyboard-first = gain de temps massif |
| **Attio** | Tables data-forward très denses, hover entières de ligne, inline edit | Dashboard et cockpit sont data-heavy, densité = info/cm² |
| **Stripe Dashboard** | Chiffres en monospace tabular, graphs propres, KPIs hiérarchisés avec 1 hero + n secondaires | Dashboard a besoin d'un hero KPI |
| **Cron / Notion Calendar** | Typo éditoriale sobre, blocks respirants, motion subtile | Aligne avec l'ADN Cormorant italic |
| **Campsite** | Sidebar pliable, zones d'ombre douces en dark mode, toasts spring | Plié/replié = densité à la demande |
| **Framer site** | Dark surfaces warm (pas #000), accents vifs en dark | Validate notre rose #C9606A en dark |
| **Vercel Dashboard** | Motion hover précise (translate-y 1-2px + shadow), skeletons shimmer | Feedback visuel qui signe la qualité |
| **Raycast** | ⌘K universel, actions contextuelles, sub-commands | Pour notre admin operators |

---

## 4 · Direction retenue — **Editorial Atelier**

### Philosophie

Un outil interne pour une **maison de pâtisserie artisanale parisienne premium**. Il ne doit pas ressembler à un SaaS. Il doit ressembler à un **livre de travail relié cuir**, précis, feutré, avec des chiffres qui respirent et des italiques qui signent. Inspiration directe : le carnet de commandes d'un Pierre Hermé, la clarté Linear, la sobriété Cron.

**Ce qu'on emprunte à Linear** : command palette, focus rings animés, density tables, keyboard shortcuts, hover rows entières.
**Ce qu'on emprunte à Stripe** : chiffres monospace tabular, KPI hiérarchisé (1 hero + n secondaires), semantic colors calibrées.
**Ce qu'on emprunte à Cron** : motion spring douce, surfaces warm, typo éditoriale, zéro bruit.

### Tokens

**Typography**
- Display : Cormorant Garamond Italic 48px / 56px / 72px
- H1/H2 : Cormorant Garamond Italic 500, 32px / 24px
- H3/label serif : Cormorant Garamond Italic 500, 18px
- Body : Questrial 15px / 14px / 13px, line-height 1.55
- Micro label : Questrial 11px, letter-spacing 0.12em, uppercase, color var(--mf-muted-2)
- Numeric : `font-variant-numeric: tabular-nums` partout sauf display

**Colors · light**
```
--mf-rose:       #8B3A43   /* primary action, accents */
--mf-rose-soft:  #BF646D   /* hover, alerts */
--mf-poudre:     #E5B7B3   /* borders, muted accents */
--mf-vert:       #968A42   /* success, labels */
--mf-ink:        #2A2024   /* text primary (plus profond que marron pour dark-compat) */
--mf-muted:      #5A4A50   /* text secondary */
--mf-muted-2:    #8A7B82   /* text tertiary / labels */
--mf-paper:      #FAFAF7   /* bg principal */
--mf-paper-soft: #F4F1EB   /* bg sunken (cards empilés, sidebar) */
--mf-paper-pure: #FFFFFF   /* bg elevated (modales) */
--mf-hairline:   rgba(42,32,36,0.08)   /* borders subtiles */
```

**Colors · dark** (dark n'est pas inverted — on passe à un vrai mode "nuit pâtisserie")
```
--mf-rose:       #D4707A   /* rose rehaussé pour dark */
--mf-rose-soft:  #E08F97
--mf-poudre:     #8B5A5E   /* poudre foncée */
--mf-vert:       #C2B46A
--mf-ink:        #F0E8DC   /* text sur fond sombre, warm */
--mf-muted:      #B5A89F
--mf-muted-2:    #7A6F6A
--mf-paper:      #1A1316   /* bg principal, brun noir chaud */
--mf-paper-soft: #241A1E   /* sidebar, sunken */
--mf-paper-pure: #2E2226   /* modales elevated */
--mf-hairline:   rgba(240,232,220,0.1)
```

**Spacing** : 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96

**Radius** : `--r-sm 4px` / `--r-md 8px` / `--r-lg 14px` / `--r-full 999px`

**Shadow** : 3 niveaux seulement, **assumés**
- `--shadow-0` : aucun (default)
- `--shadow-1` : `0 1px 2px rgba(42,32,36,0.04), 0 2px 6px rgba(42,32,36,0.04)` (hover card)
- `--shadow-2` : `0 20px 40px -10px rgba(42,32,36,0.18)` (modale, dialog)

En dark : remplacer shadow par `border: 1px solid var(--mf-hairline)` + `background: var(--mf-paper-pure)` (elevation via bg lift, pas shadow).

**Motion**
- `--ease-out` : `cubic-bezier(0.16, 1, 0.3, 1)` (spring-like)
- `--ease-in-out` : `cubic-bezier(0.65, 0, 0.35, 1)`
- `--dur-fast` : 120ms (focus, hover)
- `--dur` : 220ms (modale, tab switch)
- `--dur-slow` : 400ms (page transition, hero)
- **Button press** : scale(0.97) 80ms
- **Hover card** : translate-y(-2px) + shadow-1 en 180ms ease-out
- **Modal/Dialog** : opacity + scale(0.96 → 1) 220ms ease-out
- **Row enter** : stagger 30ms, opacity + translate-y(4px)

**Iconography** : on reste sur **symboles typographiques** cohérents (◆ ✦ ⌕ × ↑ → ↓) — tout Lucide coûterait un pack JS pour 10 icônes. Par contre, on formalise un système.

---

## 5 · Spatial plan

### Catalogue
- Layout : **topbar** + sidebar (280px, collapsible ⌘B) + main grid
- Modal produit : on garde le drawer right, mais on l'épaissit à **760px**, scroll-linked avec table des matières sticky à gauche du drawer
- Command palette ⌘K : search produit, actions (new, bulk, export, pricing, category settings)

### Dashboard
- Layout : **topbar** + wrap 1320px single-column avec **hero KPI unique** (1 chiffre qui résume la journée) + 3 cards secondaires inline, puis 2 cols denses
- Nouveau widget "Ce que je fais aujourd'hui" : 3 tâches priorisées (1 produit à compléter, 1 lien à partager, 1 distributeur à relancer)

### Prospection
- Layout : **topbar** + wrap 1200px, colonne centrale form + preview temps réel à droite (split-pane 60/40)
- Suppression des tabs Distributeurs → redirection vers Cockpit
- Preview live du lien de catalogue en mini-iframe à droite

---

## 6 · Motion notes

- Button press : `transform: scale(0.97)` durée 80ms
- Card hover : translate-y(-2px) + shadow-1, 180ms `--ease-out`
- Row list : stagger 30ms à l'apparition (modal open, filter change)
- Dialog : fade + scale(0.96 → 1), 220ms
- Toast : slide-y(30px → 0) + opacity, spring damping 28
- Tab switch : indicator qui glisse (absolute bottom-border qui translate), 220ms
- Page transition : opacity + translate-y(8px) à l'entrée, 320ms
- Skeleton : shimmer gradient qui traverse left-to-right en 1200ms

---

## 7 · Implementation

### P0 (ce sprint)
1. Créer `public/outils/_tokens.css` : tokens partagés + base utilities (scale, colors, motion, dark mode via `[data-theme=dark]`)
2. **Dashboard** : refonte complète (hero KPI + "Today" widget + cards secondaires hiérarchisées + motion)
3. **Prospection** : split-pane form + preview + suppression tab Distrib
4. **Catalogue-builder** : tokens appliqués + command palette ⌘K + topbar contextualisée + dark mode toggle + motion rows/cards
5. **Dark mode toggle** dans topbar de toutes les pages (persistance localStorage)

### P1 (prochain sprint)
- Cockpit : aligner sur tokens + motion kanban
- Page publique /c/:token : refonte cover + typo éditoriale
- Guide : passage aux nouveaux tokens

### P2
- Skeleton loaders partout
- Optimistic UI sur save/delete
- Empty states illustrés (pas juste texte)

---

## 8 · Anti-patterns à kill définitivement

- ✂ 5 KPIs identiques traités à égalité → 1 hero + 3 secondaires
- ✂ Drop shadow sur chaque card → shadow réservée aux éléments **flottants** (modal, toast, dropdown)
- ✂ `transition: all 0.3s ease` générique → durations + easing variables, jamais `all`
- ✂ Tables avec `th` bleu foncé sur blanc → labels micro-uppercase `--mf-muted-2`
- ✂ `confirm()` natif → déjà fait mais à re-styler avec motion
- ✂ Empty states "Aucun…" → micro-typography + CTA
- ✂ Focus rings natifs → focus-ring custom animé (`outline-offset: 3px` + `outline-color: --mf-rose`)

---

## 9 · Ce qui NE change PAS

- La palette couleur Maison Félicien (rose/poudre/vert/marron) — on rehausse en dark mais fondations conservées
- Le duo typo Cormorant Garamond Italic + Questrial — c'est la signature
- Les symboles typographiques (◆ ✦ ⌕) — bien
- Les patterns UI de V3 (workflow, FIC, séquences, kanban) — le contenu est bon, on upgrade la couche visuelle
- La stack : HTML monolithe + Supabase + Vercel — pas de Next.js
