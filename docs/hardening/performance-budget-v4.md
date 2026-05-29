# Performance Budget V4 — RSA Platform

**Code** : `perf-lighthouse`
**Vague** : V3 Vague 4 (Performance optimization)
**Date** : 2026-05-29
**Owner** : équipe plateforme RSA

---

## TL;DR

On passe de **1 bundle monolithique de 2 764 KB / 763 KB gzip** à **70 chunks
lazy-loaded** dont le plus gros (`Admin.js`) pèse **417 KB / 104 KB gzip** et
n'est chargé que quand on visite `/Admin`. Le **bundle initial** (index.js +
react-vendor + supabase + motion + tanstack + icons) tombe à **~620 KB / ~180 KB
gzip**, soit **~75 % de réduction** sur le payload critique de la première
peinture.

Cible Lighthouse Performance > 90 désormais atteignable sur les routes
publiques (Index, Login, Welcome, JuryCandidate).

---

## 1. Baseline AVANT vs APRÈS

### Avant (V3 / Wave 5)

```
dist/assets/index-C-2uMjqp.js   2 764.71 KB │ gzip: 762.69 KB
dist/assets/index-D-bE9y8e.css    111.35 KB │ gzip:  18.19 KB
```

Tout le code applicatif + libs vendor dans **un seul** chunk. Le navigateur
devait télécharger, parser et compiler les ~2.7 MB AVANT de pouvoir rendre la
moindre page — y compris recharts (~5 MB source) qui n'est utilisé que sur
2 routes (RsaDashboard, RsaJuryHub).

### Après (V3 Vague 4)

```
Initial critical chunks (chargés sur TOUTES les routes) :
  react-vendor      165.55 KB │ gzip:  54.16 KB   (react/react-dom/router)
  supabase          176.35 KB │ gzip:  46.33 KB   (client SDK + realtime)
  motion            121.91 KB │ gzip:  40.57 KB   (framer-motion partout)
  index (app shell)  95.57 KB │ gzip:  30.35 KB   (App.jsx, Layout, providers)
  tanstack           42.54 KB │ gzip:  12.82 KB   (React Query)
  icons              37.20 KB │ gzip:   7.49 KB   (lucide-react tree-shaken)
  index.css         111.35 KB │ gzip:  18.19 KB   (tailwind purgé)
  TOTAL initial   ~ 750 KB / ~210 KB gzip

Route chunks (chargés à la demande sur visite de la route) :
  Admin             417.35 KB │ gzip: 104.45 KB   ← lazy /Admin
  charts (recharts) 381.22 KB │ gzip: 105.38 KB   ← lazy via RsaDashboard/Hub
  RsaAdmin          208.03 KB │ gzip:  59.83 KB   ← lazy /RsaAdmin
  RsaDashboard      105.59 KB │ gzip:  23.29 KB   ← lazy /RsaDashboard
  FloorPlan         102.85 KB │ gzip:  32.32 KB   ← lazy /FloorPlan
  TableView          82.32 KB │ gzip:  22.15 KB   ← lazy /TableView
  select             72.55 KB │ gzip:  25.42 KB   ← async via @radix-ui/select
  MonDossier         57.43 KB │ gzip:  16.11 KB   ← lazy /MonDossier
  Selection          51.31 KB │ gzip:  13.86 KB   ← lazy /Selection
  Jury               44.30 KB │ gzip:  12.33 KB   ← lazy /Jury
  ... + 50 chunks plus petits
```

**Total dist/assets/*.js** : 2 716.62 KB en 70 fichiers (vs 2 764.71 KB en 1).
La somme est légèrement plus petite grâce au tree-shaking inter-chunk de Rollup.

---

## 2. Stratégie appliquée

### 2.1 `vite.config.js` — `manualChunks`

Sept vendor chunks isolés pour maximiser le cache cross-deploy :

| Chunk          | Contenu                                          | Pourquoi isolé                                             |
| -------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| `react-vendor` | react, react-dom, react-router-dom               | Cœur — change rarement                                     |
| `tanstack`     | @tanstack/react-query                            | Utilisé partout                                            |
| `charts`       | recharts                                         | **Uniquement sur RsaDashboard/Hub/Admin** — gros gain      |
| `motion`       | framer-motion                                    | Animations partout (AnimatePresence, PageTransition)       |
| `sentry`       | @sentry/react                                    | Init optionnelle (no-op sans DSN)                          |
| `supabase`     | @supabase/supabase-js                            | Auth + Realtime — toutes routes auth                       |
| `icons`        | lucide-react                                     | Tree-shake déjà OK ; isolé pour cache long-terme           |

### 2.2 `src/pages.config.js` — route-level lazy loading

Les 36 pages ont été converties de `import Page from './pages/Page'` en
`const Page = lazy(() => import('./pages/Page'))`. Conséquences :

- Chaque page = un chunk Rollup nommé (Admin.js, Selection.js, JuryCandidate.js…)
- Le chunk est fetché **uniquement** quand React Router monte la route
- Le composant Suspense dans `App.jsx` affiche un loader doré (`GOLD`, 8x8px,
  spin) pendant le download

### 2.3 `src/App.jsx` — wrapper `<Suspense>` avec loader Élysée

```jsx
const RouteFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center"
       role="status" aria-label="Chargement de la page">
    <Loader2 className="h-8 w-8 animate-spin" style={{ color: GOLD }} />
  </div>
);

<Suspense fallback={<RouteFallback />}>
  <Routes>...</Routes>
</Suspense>
```

Placement : **à l'intérieur** d'`AnimatedRoutes` mais **à l'extérieur** de
`Routes` — l'ancienne page reste affichée pendant le fade out + spinner gold
quand la nouvelle se charge.

---

## 3. Largest chunks identifiés (après split)

Les chunks > 100 KB par ordre de poids :

| Chunk          | Taille (gzip) | Trigger                              | Action V4.1+ ? |
| -------------- | ------------- | ------------------------------------ | -------------- |
| `Admin`        | 104.45 KB     | Visite `/Admin` (admin RSA)          | Acceptable — page admin lourde mais derrière auth |
| `charts`       | 105.38 KB     | Lazy chargé via RsaDashboard/Hub     | Borderline — voir 5.1 ci-dessous |
| `RsaAdmin`     | 59.83 KB      | Visite `/RsaAdmin`                   | Acceptable |
| `react-vendor` | 54.16 KB      | Toutes routes                        | Acceptable — cache 1y |
| `supabase`     | 46.33 KB      | Toutes routes auth                   | Acceptable |
| `motion`       | 40.57 KB      | Toutes routes                        | Voir 5.2 |
| `FloorPlan`    | 32.32 KB      | Visite `/FloorPlan`                  | Acceptable |
| `index`        | 30.35 KB      | Bootstrap critique                   | Acceptable |
| `RsaDashboard` | 23.29 KB      | Visite `/RsaDashboard` (sans recharts) | Acceptable |
| `TableView`    | 22.15 KB      | Visite `/TableView`                  | Acceptable |

---

## 4. Cibles Lighthouse par route

Mesures à faire post-déploiement Vercel sur app.rotary-startup.org avec
Chrome DevTools (mode incognito, throttling 4G fast).

| Route                       | Performance | Accessibility | Best Practices | SEO  | Priorité |
| --------------------------- | :---------: | :-----------: | :------------: | :--: | :------: |
| `/` (Index plateforme)      | > 90        | > 90          | > 95           | > 95 | P0       |
| `/Login`                    | > 90        | > 90          | > 95           | > 95 | P0       |
| `/Welcome`                  | > 90        | > 90          | > 95           | > 95 | P0       |
| `/JuryCandidate` (funnel)   | > 90        | > 90          | > 95           | > 90 | P0       |
| `/Candidater`               | > 90        | > 90          | > 95           | > 90 | P0       |
| `/MonDossier`               | > 85        | > 90          | > 95           | n/a  | P1 — derrière auth |
| `/Selection`                | > 85        | > 90          | > 95           | n/a  | P1 — derrière auth |
| `/Jury`                     | > 85        | > 90          | > 95           | n/a  | P1 — derrière auth |
| `/RsaDashboard`             | > 80        | > 90          | > 95           | n/a  | P2 — charts lourds |
| `/RsaJuryHub`               | > 80        | > 90          | > 95           | n/a  | P2 — live grid |
| `/Admin`                    | > 75        | > 90          | > 95           | n/a  | P2 — page admin |
| `/Resultats` (public)       | > 90        | > 90          | > 95           | > 90 | P0 — partage social |

**Note SEO** : routes derrière auth n'ont pas besoin d'indexation → "n/a".

---

## 5. Plan V4.1+ — Aller plus loin

### 5.1 Réduire `charts` (recharts ~105 KB gzip)

Recharts charge tous ses composants même quand on n'utilise que 2-3 charts.
Options :

- **Migrer vers Visx/Nivo** : modulaire, on n'importe que ce qu'on utilise.
  Coût : 1-2j refonte des charts dans RsaDashboard/Hub.
- **Importer recharts par composant** : `import { LineChart } from 'recharts/es6/chart/LineChart'`
  → tree-shaking manuel, gain ~30%. Coût : 30min.
- **Lazy-load les sous-composants charts dans RsaDashboard** : split en
  `<Suspense>` interne pour ne charger les charts qu'au scroll. Coût : 1h.

**Recommandation V4.1** : option 2 (tree-shaking manuel) — fast win, faible risque.

### 5.2 Animations sous `prefers-reduced-motion`

`PageTransition` honore déjà `useReducedMotion()` (cf. App.jsx), mais
plusieurs modales (DossierDrawer, EventDetailsModal) animent encore sans
ce respect. Audit M1/Mi3 cf. `DESIGN-UPGRADE-AUDIT.md`.

### 5.3 Preload des routes critiques

Vite supporte `<link rel="modulepreload">` automatique via `build.modulePreload`.
Activer pour les routes les plus probables après Index/Login (Welcome,
JuryCandidate, MonDossier). Coût : 15min config, gain ~150ms TTI.

### 5.4 Image optimization

Plusieurs images (hero, logos partenaires) sont chargées en PNG/JPG full-res.
Migrer vers WebP avec `vite-plugin-imagemin` ou Cloudinary. Gain ~40% sur
le transfert image. Coût : 2h.

### 5.5 Compression Brotli sur Vercel

Vercel sert déjà Brotli automatiquement pour les assets statiques — vérifier
via `curl -I -H "Accept-Encoding: br"` que les .js renvoient bien
`content-encoding: br`. Si non, ajouter config `vercel.json`. Gain potentiel
vs gzip : ~15-20%.

### 5.6 Drop deps inutilisées

Identifié dans le survey mais non appliqué (lockfile collision avec workflows
parallèles) :

- `three` (27 MB) — aucun import dans `src/` (vérifié `grep -r "from 'three'"`)
- `html2canvas` (1.2 MB) — aucun import (vérifié)
- `jspdf` (1.0 MB) — aucun import (vérifié)
- `@stripe/react-stripe-js` + `@stripe/stripe-js` (~2 MB) — uniquement
  référencés dans un commentaire `OnePageDossier.jsx`

À supprimer dans un commit dédié quand les workflows parallèles ne sont
plus actifs (sinon on a un conflit `package-lock.json`).

**Gain installé : 0** (déjà non bundlés). **Gain CI** : npm install plus rapide
de ~30s. **Gain disque dev** : ~30 MB.

### 5.7 Compression GZIP en preview locale

Vérifier que `vite preview` sert bien les assets avec
`content-encoding: gzip` — Vite 6 le fait par défaut depuis 6.1.

---

## 6. Vérification post-build

Checklist à chaque release :

- [ ] `npm run build` → terminé sans warning « chunks > 800 KB »
- [ ] `dist/assets/index-*.js` < 100 KB gzip (bundle initial app shell)
- [ ] `dist/assets/charts-*.js` n'apparaît **PAS** dans `index.html` (lazy OK)
- [ ] `dist/assets/Admin-*.js` n'apparaît **PAS** dans `index.html` (lazy OK)
- [ ] Lighthouse `/` mobile > 90 Performance
- [ ] Lighthouse `/JuryCandidate` mobile > 90 Performance
- [ ] Smoke test : visiter `/Admin`, `/RsaDashboard`, `/Selection` — le
      loader doré apparaît brièvement puis la page rend correctement (proof
      du lazy loading)

---

## 7. Références

- Vite build options : <https://vitejs.dev/config/build-options.html>
- React.lazy + Suspense : <https://react.dev/reference/react/lazy>
- Lighthouse scoring : <https://developer.chrome.com/docs/lighthouse/performance/performance-scoring>
- Survey perf V3 Vague 4 : voir `HARDENING-PLAN.md` section « perf-lighthouse »
