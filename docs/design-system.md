# Rotary Event Management — Design System "Elysée"

> Le design book de référence pour toutes les pages du site. Chaque nouvelle page ou
> refonte doit respecter ces tokens, patterns et animations.
> Inspiration : site [rotary-startup.org](https://rotary-startup.org) (autre projet du même repo).

Implémentation de référence : [`src/pages/Index.jsx`](../src/pages/Index.jsx).

---

## 1. Design tokens

```js
// À dupliquer en haut de chaque page (ou importer depuis un futur src/design/tokens.js)
const NAVY   = "#0f1f3d";   // Texte principal, titres, accents foncés
const GOLD   = "#c9a84c";   // Accents (traits, icônes, surlignages, hover)
const CREAM  = "#faf7f2";   // Fond principal — warm ivory paper (Elysée)
const CREAM2 = "#e8e3d9";   // Filets, séparateurs, bordures de card (warm beige)
const INK    = "#3a3a52";   // Texte secondaire (corps, sous-titres)
const MUTED  = "#9090a8";   // Texte tertiaire (meta, eyebrows, J-X)
```

Accents colorés autorisés pour tints pastel (très doux, jamais saturés) :
- Sage (succès / vue d'ensemble) : `#ecf1e5`
- Beige chaud (action principale) : `#f5ede0`
- Bleu-gris (info / demande) : `#eff1f6`
- Crème admin : `#f3ede5`
- Vert statut "aujourd'hui" : `#1d6b4f`

**Règle d'or** : si une couleur a besoin d'être saturée, c'est probablement qu'elle
ne devrait pas exister. Préférer plus de blanc, plus de fin.

## 2. Typographie

Deux familles, chargées via Google Fonts dans le composant de page :

```jsx
<style>{`
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
`}</style>
```

- **Playfair Display** (serif) — titres, noms propres, intervenants, accents italique.
  Poids 400/500, italic 400/500.
- **Inter** (sans) — corps, meta, boutons, chiffres. Déjà défini globalement dans `Layout.jsx`.

### Échelles de titres

| Usage          | Taille mobile | Taille desktop | Leading   |
| -------------- | ------------- | -------------- | --------- |
| Hero `lg`      | `40px`        | `56px`         | `1.02`    |
| Section `md`   | `28px`        | `36px`         | `1.05`    |
| Subsection `sm`| `22px`        | `26px`         | `1.1`     |
| Card title     | `24px`        | `32px`         | `tight`   |
| Event name     | `17px`        | `19px`         | `snug`    |

### Tailles fines

- Eyebrow : `text-[10px] uppercase tracking-[0.18em] font-medium`
- Meta : `text-xs` (11-12px)
- Mini-labels : `text-[9px] uppercase tracking-[0.15em]`

## 3. Layout

```jsx
<div className="min-h-screen relative overflow-hidden"
     style={{ background: CREAM, color: NAVY }}>
  <div className="relative max-w-[680px] mx-auto px-5 md:px-8 pt-10 md:pt-16 pb-20">
    {/* contenu */}
  </div>
</div>
```

- Container éditorial étroit : `max-w-[680px]` (livre ouvert, pas dashboard)
- Padding horizontal : `px-5 md:px-8`
- Espacement vertical entre sections : `mb-12 md:mb-14` ou `mb-14 md:mb-16`
- Séparateurs : `border: 1px solid ${CREAM2}` — jamais plus fort

## 4. Composants réutilisables

Tous définis dans `Index.jsx` — à extraire vers `src/components/design/` au fur et à
mesure de la refonte des autres pages. Pour l'instant, les dupliquer est acceptable.

### `<Eyebrow>` — étiquette de section

```jsx
<Eyebrow>Accès rapide</Eyebrow>
<Eyebrow color="#1d6b4f">Aujourd'hui · en direct</Eyebrow>
```

Un petit trait doré (28px, 1.5px) + label uppercase tracking-wide. Animé au scroll
(scaleX 0→1 + fade).

### `<EditorialTitle lead italic size>`

```jsx
<EditorialTitle lead="Votre déjeuner"
                italic="statutaire hebdomadaire"
                size="lg" />
```

Titre en deux lignes : la 2e en italique (accent éditorial à la rotary-startup.org).

### `<HeroEventCard event>` / cartes similaires

- Fond blanc, `border: 1px solid ${CREAM2}`, `border-radius: 4px`
- **Barre dorée verticale à gauche** + flou doré derrière (breathe 3.2s)
- Eyebrow → titre serif → méta → filet → détails
- Séparateurs internes : filets `CREAM2`

### `<ActionRow>` — tile cliquable pastel

- Numéro `01 · 02` à gauche (tabular-nums, MUTED)
- Rond blanc bordé avec icône lucide (NAVY) — scale + rotate au hover
- Titre serif 500, sous-titre Inter 12px INK
- Flèche `ArrowUpRight` qui part en haut-droite au hover
- Barre dorée qui monte à gauche + sheen blanc + underline dorée au hover
- Fond = pastel tint de la sémantique (sage / beige / bleu-gris)

### `<UpcomingList>` — liste numérotée éditoriale

- Numérotation `01 · 02 · 03` (tabular-nums, MUTED)
- Filets horizontaux `CREAM2` entre items
- Badge type en GOLD uppercase, J-X à droite
- Titre serif + date capitalize INK

## 5. Règles visuelles

1. **Border-radius** : `4px` max sur les cards, `9999px` (pill) uniquement pour les badges et boutons ronds.
   **Jamais** `rounded-2xl`, `rounded-3xl` — ce n'est pas éditorial.
2. **Ombres** : `drop-shadow` léger sur le logo uniquement (`0 12px 30px rgba(15,31,61,0.22)`).
   Les cards n'ont pas d'ombre, juste une bordure fine.
3. **Gradients** : uniquement en halo/ambient (logo, accents hover). Pas sur les fonds d'éléments d'interface, pas sur les boutons.
4. **Icônes** : `lucide-react`, taille `w-4 h-4` dans les actions, `w-3 h-3` dans la meta.
5. **Alignement** : texte généralement aligné à gauche ; centrage réservé à hero / logo.
6. **Espaces** : l'air est le principal outil de design. Préférer + d'espace à + de décoration.

## 6. Animations (framer-motion)

### Ease éditorial standard

```js
ease: [0.22, 1, 0.36, 1]   // "ease-out-quart" — doux, toujours
```

### Mount staggered (au-dessus du fold)

```jsx
<motion.div
  initial={{ opacity: 0, y: 14 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, delay: 0.15 + index * 0.06 }}
/>
```

### Scroll reveal (en-dessous du fold)

```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-15% 0px" }}
  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
/>
```

### Hover micro-interactions

- Icône : `group-hover:scale-110 group-hover:rotate-[6deg]`
- Flèche : `whileHover={{ x: 3, y: -3 }}` sur `ArrowUpRight`
- Underline : `scale-x-0 group-hover:scale-x-100 origin-left duration-500`

### Ambient (loop)

- Logo rotation : `rotate: 360, duration: 48s, ease: linear` — lent, à peine perceptible
- Halo doré : `scale [1, 1.15, 1], opacity [0.65, 1, 0.65], 5s easeInOut`
- Barre dorée : `opacity [0.3, 0.9, 0.3], 3.2s easeInOut`

### À éviter

- Blobs animés en fond, particules, 3D tilt sur cards, bordures coniques qui tournent
- Gradients mesh saturés
- Durées < 300ms ou > 900ms pour des transitions UI (hors loops ambiants)

## 7. Mobile-first

Toutes les pages doivent être lisibles et utilisables en mobile d'abord :

- Largeur cible : container reste à `max-w-[680px]` mais le padding descend à `px-5`
- Titres : variantes `text-[Npx] md:text-[Npx]` pour chaque échelle
- Pas de tableaux horizontaux sans scroll explicite (`.scrollbar-hide` utility)
- Hover effects OK (pas de repli obligatoire), mais jamais requis pour comprendre l'action
- Tester avec le DevTools mobile 375px et 320px

## 8. Checklist refonte d'une page

- [ ] Fond `CREAM` (`#ffffff`), typo Inter + Playfair Display
- [ ] Container `max-w-[680px]` avec paddings éditoriaux
- [ ] Eyebrow + EditorialTitle pour chaque section majeure
- [ ] Cards en border-radius 4px + bordure `CREAM2`, jamais d'ombre portée
- [ ] Boutons / actions : pattern `ActionRow` avec tint pastel
- [ ] Accents GOLD uniquement (traits, icônes actives, surlignages)
- [ ] Animations framer-motion : fade-up au mount, whileInView scroll reveal
- [ ] Vérifier en mobile 375px (golden path + un edge case)
- [ ] Aucun `rounded-2xl`/`rounded-3xl`, aucun gradient saturé, aucun emoji non demandé

## 9. Roadmap de refonte

Pages à reprendre dans cet ordre (les plus visibles d'abord) :

1. [ ] `Index.jsx` — ✅ **fait** (référence)
2. [ ] `Dashboard.jsx` — vue d'ensemble
3. [ ] `TableView.jsx` — sélection de siège (attention interactions complexes)
4. [ ] `Reservations.jsx` — liste / formulaire
5. [ ] `ReservationRequest.jsx` — demande invité
6. [ ] `EventPlanning.jsx` — planning admin
7. [ ] `Archives.jsx` — historique
8. [ ] `FloorPlan.jsx` — plan de salle
9. [ ] `AdminControl.jsx` — panneau admin
10. [ ] `UserManagement.jsx` — gestion users
11. [ ] `Features.jsx` — doc

Le `Layout.jsx` (top nav) devra aussi être revu pour s'aligner — actuellement
`bg-stone-50`, à passer sur `CREAM` et typo Playfair sur le nom du club.
