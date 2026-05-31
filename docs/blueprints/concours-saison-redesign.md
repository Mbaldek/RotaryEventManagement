# Blueprint — Refonte `/Concours` « La Saison » (v3 éditorial chronologique)

> **Statut** : validé (mockup approuvé 2026-05-31). Spec d'exécution.
> **Scope** : `src/pages/Concours.jsx` + `src/components/rsa/concours-dashboard/*`.
> **Hors scope** : RPC SQL (le modèle de données actuel suffit — aucune migration),
> pages admin, funnel candidature, RSA legacy.
> **Supersede** : [`concours-v2-redesign.md`](./concours-v2-redesign.md) (direction
> `H-Ambient` + couleur + emoji) — abandonnée. Voir §1.3.

---

## 1. Problème

### 1.1 Verdict utilisateur (2026-05-31)

La page livrée (direction `concours-v2-redesign.md`) est rejetée : faux logo
Rotary redessiné, selector de compétition, « cards partout », pas de séparateur
ni de repère de section, pas d'aide au déplacement, animations gadget. Trop
basique, smell IA.

### 1.2 Causes dans le code

| Reproche | Cause |
|---|---|
| Logo Rotary FAKE top-right | [`ConcoursHero.jsx:20-106`](../../src/components/rsa/concours-dashboard/ConcoursHero.jsx#L20) — roue Rotary redessinée à la main en SVG + halo « breathe ». Aucun logo officiel dans `public/`. Redondant avec le monogramme TopNav. |
| Selector de compétition | `<select>` [`ConcoursHero.jsx:157-178`](../../src/components/rsa/concours-dashboard/ConcoursHero.jsx#L157) + état `selectedEditionId`. Écarté produit. |
| Cards partout | Grille `SessionCard` ([`ClubSection.jsx:119`](../../src/components/rsa/concours-dashboard/ClubSection.jsx#L119)) — `L-Card-Grid`, *« the AI-generated reflex »* (catalog §16.3) + audit Smell #3. |
| Pas de séparateur / repère | Sections en `mb-12` sans filet gold ni opener (catalog §2.3 / §16.2). |
| Pas d'aide au déplacement | Aucune nav interne / scroll-spy. |
| Animations gadget | Halo « breathe », trophée shimmer, dot pulse — motion non signifiante. |

### 1.3 La tension assumée

Le design rejeté **est** ce que les docs prescrivaient (`design-upgrade-blueprint.md
§4.13` impose `H-Ambient`). « Reprendre de zéro » = **diverger volontairement**
(le catalogue l'autorise : *« off-catalog is welcome »*, §16.2) puis **mettre les
docs à jour**. Décisions produit validées :

1. **En-tête** : éditorial + une ligne de stats (texte). Pas de logo, pas de
   selector, pas de cards. La marque vient du monogramme TopNav.
2. **Couleur** : accent muted par thème conservé (filet/dot/label), **emojis
   supprimés**.
3. **Structure** : **calendrier chronologique** de la saison (le club devient une
   méta-info ; la frise = nav).

---

## 2. Direction « La Saison »

### 2.1 Mental model & benchmark

La RSA est un **programme de saison** (≈ programme d'opéra / Philharmonie), pas un
dashboard. Lecture : couverture (hero) → calendrier dans l'ordre (épine dorsale) →
final (climax). Références : programmes de saison (lineup chronologique numéroté),
Linear roadmap (frise sticky = mini-carte d'ancrage), Stripe (stats en ligne, pas
de cartes KPI), Vercel (empty states sobres).

### 2.2 Règle « ornement chargé », stricte

Couleur de session = **accent** qui identifie un domaine, jamais un aplat. Navy /
cream / gold ≥ 85 % de la surface. Gold **réservé** : finale, countdown, ornement.
Surfaces d'apparition de la couleur thème : filet gauche 2px de la ligne, dot de
frise, label thème, barre 2px du header drawer. **Jamais** : fond plein, bouton,
texte de corps, disque emoji.

### 2.3 Anatomie de page (desktop, `width="wide"`)

```
TopNav (inchangé)
────────────────────────────────────────────────────────────
EN-TÊTE éditorial
  eyebrow gold · titre serif lg · filet gold · intro 60ch
  ligne de stats : 3 CLUBS · 12 SESSIONS · 8 FINALISTES · J-4
FRISE DE LA SAISON  [sticky]                     ← signature + nav d'ancrage + scroll-spy
  rail hairline · 1 dot/session positionné par date · états encodés
hairline
JALON ▌ AVRIL (n)
  01  <nom session>            <club · date>     <statut/J-x>
  ·   <n startups · n jurés · lauréate?>          ▸
  hairline entre lignes
JALON ▌ MAI (n)
  03  <LIVE — emphase>                            ● LIVE
  04  <prochaine — countdown gold>                J-9
  …
séparateur fort
GRANDE FINALE (focal éditorial, pas de gradient)
  eyebrow gold · titre serif · lieu/horaire · ratio finalistes
  liste de noms (dot = session source) · CTA navy unique
Footer (inchangé)
```

---

## 3. Stack composants

**N** nouveau · **R** refonte · **K** inchangé · **❌** supprimé.

```
src/components/rsa/concours-dashboard/
├── ConcoursHero.jsx          [R]  éditorial + stat line ; retire logo/halo/selector
├── ConcoursTimeline.jsx      [R]  → frise borderless, sticky, ancrage + scroll-spy
├── SeasonProgram.jsx         [N]  liste chronologique + jalons mois (remplace ClubSection)
├── SessionRow.jsx            [N]  ligne éditoriale (remplace SessionCard)
├── ClubSection.jsx           [❌] supprimé
├── SessionCard.jsx           [❌] supprimé
├── FinaleSection.jsx         [R]  dé-gradient, focal éditorial
├── SessionDetailDrawer.jsx   [R]  header dé-cardé, retrait emoji
├── ConcoursStatusPill.jsx    [K]  (simplif. mineure possible)
├── sessionTheme.js           [K]  palette conservée ; getSessionEmoji non appelé
├── useConcours.js            [K]  données déjà suffisantes (flatten côté page)
└── i18n.js                   [R]  strings : titres saison, jalons mois, labels stats
```

### 3.1 `Concours.jsx` [R]

- ❌ Retire `selectedEditionId`, `effectiveEditionId` selector-driven, `onEditionChange`.
- Édition active = unique : `editions.find(e => e.status === 'open') ?? editions[0]`.
- Aplatit `overview.sessions_by_club` + attache `clubName` à chaque session, trie
  par `session_date` (même logique que la frise actuelle [`ConcoursTimeline.jsx:60-88`](../../src/components/rsa/concours-dashboard/ConcoursTimeline.jsx#L60)), passe la liste plate à `SeasonProgram`.
- Conserve : auth-gate magic-link, `kpis` (alimente la stat line), drawer state.

### 3.2 `ConcoursHero.jsx` [R]

`Eyebrow` + `EditorialTitle size="lg"` + filet gold + intro INK `max-w-[60ch]` +
ligne de stats (`uppercase tracking-[0.14em]`, valeurs `tabular-nums` NAVY, labels
MUTED, middots, **pas de cards**). Props : `edition`, `kpis`. Plus de
`editionsList`/`onEditionChange`.

### 3.3 `ConcoursTimeline.jsx` [R] — frise = nav

- Rail hairline CREAM2 **sans card** (retire `border` + `rounded-[10px]` du wrapper).
- Dots positionnés par date (échelle temporelle), couleur muted thème.
- États : publiée `✓` gold rempli · live anneau rouge pulsé · à venir contour · finale `◆` gold.
- **Sticky** sous le TopNav au scroll (barre repliée fine).
- Clic dot → `scrollIntoView({behavior:'smooth'})` vers `#session-<id>`.
- **Scroll-spy** (`IntersectionObserver`) → dot de la section visible reçoit anneau gold + `aria-current="true"`.
- Mobile : scroll-x.

### 3.4 `SeasonProgram.jsx` [N]

- Reçoit la liste plate triée + map club.
- **Chapitrage mois** : groupe par `mois(session_date)`, header jalon `▌ <MOIS> (n)`
  (barre gold 2px + mois serif/tracked NAVY + compte MUTED), cible d'ancrage.
- **Règle de repli** : si toutes les sessions tiennent sur ≤ 1 mois → pas de
  chapitrage, opener unique `S-Gold-Rule` « LA SAISON, DANS L'ORDRE ». Jamais de
  chapitre vide.
- Rend une `SessionRow` par session, hairline CREAM2 entre lignes.

### 3.5 `SessionRow.jsx` [N]

- `id="session-<id>"` (cible scroll). `role="button"` + clavier + focus ring gold.
- N° séquence serif tabular **gold**. Filet gauche 2px couleur muted thème.
- Label thème (couleur muted, uppercase) — **remplace l'emoji**.
- Nom serif NAVY + underline gold wipe au hover.
- Meta 1 : `club · date` (MUTED) + statut/countdown droite.
- Meta 2 : `N startups · N jurés` + publiée→`Lauréate · Nom` (gold) / live→`scoring en cours`.
- Chevron `▸` au hover. Clic → drawer.
- **Hiérarchie d'états** : LIVE (ligne haute, fond crème léger, barre épaissie, `● LIVE`
  rouge, `▸ Suivre le scoring`) · PROCHAINE (countdown `J-x` gold + tag) · publiée (`✓`
  gold + lauréate) · à venir/passée (compacte).

### 3.6 `FinaleSection.jsx` [R]

Séparateur fort au-dessus. ❌ gros gradient + trophée animé. Eyebrow gold + titre
serif + lieu/horaire italique + filet gold + ratio `n retenues · sur m attendues`
(`tabular-nums`) + liste de noms (dot = couleur session source) + CTA navy unique
`→ Confirmer ma présence` (gaté comme aujourd'hui).

### 3.7 `SessionDetailDrawer.jsx` [R]

Header dé-cardé : barre couleur 2px top + eyebrow thème (**sans emoji**) + titre
serif + date + statut. ❌ bandeau de fond teinté. Conserve : QR scoring (live),
bannière lauréate (filet gold sobre) + classement, startups (liste hairline +
download), jurés (grille avatars). Slide-in droite, overlay navy, Esc, focus-trap.

---

## 4. Données

Aucune migration. La RPC `rsa_concours_edition_overview` ([`useConcours.js:46`](../../src/components/rsa/concours-dashboard/useConcours.js#L46))
renvoie déjà `sessions_by_club`, `finale_sessions`, `clubs`, `startups_by_session`,
`jurors_by_session`, `finalists_by_source_session`, `finalists`, `finalists_count`.
Le flatten chronologique se fait côté page (§3.1). `theme_color` override conservé
via `getSessionPalette`.

---

## 5. Motion (`M-Editorial-Veil`)

Mount : voile CREAM `opacity 0.6→0` 600ms + sections `y 8→0` stagger 80ms. Hover
ligne : underline gold wipe 500ms. Live : pulse discret (loop autorisé). Frise
sticky + scroll-spy gold. **Tout gaté `prefers-reduced-motion`** (§8.6). ❌ halo
breathe, trophée shimmer.

---

## 6. Accessibilité / conformité

- 0 hex inline (tokens via `@/components/design`). Focus ring gold partout.
- Contraste AA ; MUTED décoratif uniquement. `tabular-nums` sur tous les chiffres.
- Frise : `aria-current="true"` sur le dot actif, dots = `<button aria-label>`.
- Lignes : `role="button"`, Enter/Space, `aria-label` (nom + statut).
- Touch targets ≥ 44px mobile. `<h1>` unique, `<h2>` jalons, `<h3>` sessions —
  pas de saut de niveau.

---

## 7. Responsive

375 / 768 / 1280. Hero stations verticales ; stat line wrap 2 lignes ; frise
scroll-x sticky ; lignes empilées (meta 2 sous meta 1) ; finale pleine largeur.

---

## 8. Critères d'acceptation

- [ ] 0 faux logo, 0 selector, 0 `SessionCard`/grille de cards dans le DOM.
- [ ] En-tête = eyebrow + titre serif + filet + intro + 1 ligne de stats texte.
- [ ] Sessions affichées **dans l'ordre chronologique**, club en méta.
- [ ] Jalons mois visibles (ou opener unique si repli). Hairline entre lignes.
- [ ] Frise sticky : clic dot → scroll vers session ; scroll-spy anneau gold.
- [ ] Couleur muted présente comme accent (filet/dot/label), **aucun emoji**.
- [ ] Session LIVE visuellement dominante ; prochaine = countdown gold.
- [ ] Finale = focal éditorial (pas de gradient), dot couleur source par finaliste.
- [ ] Drawer : contenu conservé, header dé-cardé, sans emoji.
- [ ] `M-Editorial-Veil` au mount, gaté reduced-motion. 0 hex inline. AA.
- [ ] Régression : édition vide → empty letter ; 1 session → frise 1 dot ; édition
  complète (25 sessions) → frise scrollable + perf fluide.

---

## 9. Phasing

| Phase | Périmètre | Dépend |
|---|---|---|
| 1. Page + données | `Concours.jsx` flatten + édition unique + i18n | — |
| 2. Hero | `ConcoursHero` éditorial + stat line | 1 |
| 3. Programme | `SeasonProgram` + `SessionRow` + jalons mois | 1 |
| 4. Frise nav | `ConcoursTimeline` borderless sticky + scroll-spy | 3 |
| 5. Finale | `FinaleSection` focal | 1 |
| 6. Drawer | `SessionDetailDrawer` dé-cardé | 3 |
| 7. Motion + a11y + responsive | veil, reduced-motion, 375/768/1280 | 2-6 |
| 8. Cleanup + build | suppr. `ClubSection`/`SessionCard`, `npm run build`, smoke 3 cas | 1-7 |

---

## 10. Risques

| Risque | Mitigation |
|---|---|
| Édition très resserrée (1 semaine) → chapitres mois déséquilibrés | Règle de repli §3.4 (opener unique). |
| Frise sticky + scroll-spy = coût IntersectionObserver sur 25 sessions | 1 seul observer, `rootMargin` ajusté ; acceptable < 50 sessions. |
| Collision couleur muted (2 sessions adjacentes même teinte) | Offset hash par index (existant `sessionTheme.js`). Accepté V3. |
| Suppression `SessionCard`/`ClubSection` casse un import ailleurs | Grep avant suppression ; ces composants ne sont consommés que par `/Concours`. |
```
