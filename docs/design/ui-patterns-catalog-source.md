# UI Patterns Catalog (Generic)

> **But du fichier.** Une bibliothèque de référence de patterns UI web + mobile, pensée comme une **palette d'options** dans laquelle piocher pour proposer des designs **variés** plutôt que le réflexe par défaut. Chaque entrée donne : variantes, quand l'utiliser, l'implémentation (avec les libs réelles de référence), et des exemples d'apps/sites.
>
> **Portable.** Ce fichier est volontairement neutre (aucune couleur, marque ou contrainte de projet). Pour l'adapter : remplacer « accent/primary » par la couleur du projet, et garder/retirer les libs selon la stack.
>
> **Stacks couvertes.**
> - **Web** : React (Framer Motion, GSAP), Vue/Svelte, ou vanilla CSS/JS. Les libs nommées sont les références du moment, pas des obligations.
> - **Mobile** : React Native / Expo (Reanimated, Skia, gesture-handler) ; les principes valent aussi pour Flutter/SwiftUI/Compose.
>
> **Comment lire les tags.**
> 🟢 facile · 🟡 moyen · 🔴 ambitieux · 📱 mobile · 🌐 web · ⚠️ piège connu (voir §14)

---

## Sommaire

1. [Progress & Loading](#1-progress--loading)
2. [Boutons & CTAs](#2-boutons--ctas)
3. [Cards & Surfaces](#3-cards--surfaces)
4. [Navigation](#4-navigation)
5. [Formulaires & Inputs](#5-formulaires--inputs)
6. [Feedback, Statuts & Overlays](#6-feedback-statuts--overlays)
7. [Motion & Animation — principes & specs](#7-motion--animation--principes--specs)
8. [Couleur, Lumière & Thèmes](#8-couleur-lumière--thèmes)
9. [Typographie & texte cinétique](#9-typographie--texte-cinétique)
10. [Listes & Données](#10-listes--données)
11. [Layout & Composition](#11-layout--composition)
12. [Onboarding, Engagement & Célébration](#12-onboarding-engagement--célébration)
13. [Mobile-natif (gestes, haptique, surfaces)](#13-mobile-natif-gestes-haptique-surfaces)
14. [Anti-patterns & AI-slop à bannir](#14-anti-patterns--ai-slop-à-bannir)
15. [Mapping par type d'écran](#15-mapping-par-type-décran)
16. [Boîte à outils — libs, courbes, sources d'inspi](#16-boîte-à-outils--libs-courbes-sources-dinspi)
17. [Accessibilité & checklist transverse](#17-accessibilité--checklist-transverse)

---

## 1. Progress & Loading

> Règle d'or : **< 1 s → rien ou fondu** ; **1–4 s → indicateur déterminé si possible** ; **> 4 s → skeleton + message** ; **inconnu → indéterminé**. Toujours préférer l'**optimistic UI** quand l'action a 95 %+ de succès.

### 1.1 Barres de progression (linéaire)
- **Déterminée** — % connu (upload, multi-step). Remplissage gauche→droite, easing `linear` ou `ease-out` léger.
- **Indéterminée** — % inconnu, bande qui glisse en boucle (Material `indeterminate`).
- **Segmentée / steppée** — n segments discrets (wizard, stories Instagram). Chaque step = un segment qui se remplit.
- **Buffer / 2-couches** — couche « chargé » + couche « bufferisé » (lecteurs vidéo).
- **Striée animée** — diagonales qui défilent (Bootstrap `progress-bar-striped`). ⚠️ daté, éviter sauf rétro assumé.
- **Gradient qui pulse** — remplissage en gradient avec léger glow.
- 📱 Reanimated : `width`/`scaleX` animé via `useAnimatedStyle` + `withTiming`. 🌐 CSS `transform: scaleX()` (perf > `width`).
- **Exemples** : Material 3 LinearProgress · YouTube/Vimeo scrubber · Stories IG (segmenté).

### 1.2 Progress circulaire / radial
- **Anneau déterminé** — `stroke-dashoffset` sur un cercle SVG. Idéal pour un compteur « 24/40 ».
- **Anneau indéterminé** — rotation continue + arc qui s'étire/se rétracte (Material).
- **Multi-anneaux concentriques** — façon Apple Activity Rings (plusieurs métriques empilées).
- **Gauge / demi-cercle** — jauge 180°, bon pour un « taux de remplissage ».
- **Conic-gradient fill** 🌐 — `background: conic-gradient(...)` masqué, ultra léger, animable via `@property --angle`.
- 📱 SVG `<Circle>` + `strokeDashoffset` animé. 🌐 SVG ou `conic-gradient`.
- **Exemples** : Apple Fitness rings · Stripe Dashboard donut · `react-native-circular-progress`.

### 1.3 Spinners
- **Comète / arc sweep** — arc en gradient qui tourne, tête plus opaque que la queue (sobre, premium).
- **Dots pulsants** (3 points en stagger), **ring dual** (2 arcs contra-rotatifs), **bars equalizer**, **dot-grid morph**, **orbit** (satellites autour d'un centre).
- ⚠️ Ne jamais empiler spinner **et** skeleton ; choisir l'un.
- 📱 Reanimated `withRepeat(withTiming(360))`. 🌐 `@keyframes rotate`.
- **Exemples** : Loading.io (catalogue) · SpinKit · Material CircularProgress.

### 1.4 Liquid / wave progress
- **Vague qui monte** — un récipient se remplit, surface ondulée (2 sinus déphasés). « Fun », bon pour un objectif/jauge.
- **Blob / metaball** — gouttes qui fusionnent (filtre `feGaussianBlur` + `feColorMatrix` SVG = effet gooey).
- **Liquid fill text** — texte rempli par une vague (masque SVG).
- 📱 **react-native-skia** est l'outil idéal (shaders, `Path` ondulé animé). 🌐 SVG `<path>` + animation des points de contrôle, ou shader WebGL.
- **Exemples** : Liquid swipe (Cuberto) · « Water drop » dribbble · gooey menu (CSS-Tricks).

### 1.5 Skeleton screens
- **Skeleton statique** — formes grises de la mise en page à venir.
- **Shimmer** — gradient clair qui balaie le skeleton (le plus courant).
- **Pulse** — opacité qui respire (plus sobre que shimmer).
- **Content-aware** — skeleton qui matche **exactement** le layout réel (évite le saut de layout).
- 📱 `react-native-shimmer-placeholder` / `moti/skeleton` / Skia gradient. 🌐 CSS gradient animé ou `react-loading-skeleton`.
- ⚠️ Le skeleton doit avoir les **mêmes dimensions** que le contenu final, sinon reflow.
- **Exemples** : Facebook (origine du pattern) · LinkedIn · YouTube.

### 1.6 Reveal & transitions de chargement
- **Fade-in + slide-up léger** au montage (8–16 px, stagger 40–60 ms).
- **Progressive blur reveal** — image floue → nette (LQIP / blurhash / thumbhash).
- **Staggered list reveal** — items qui entrent en cascade.
- **Splash → contenu** — logo qui morph vers le header (shared element).
- 📱 `expo-image` gère blurhash/placeholder nativement. 🌐 `blurhash`/`thumbhash`.
- **Exemples** : Unsplash blur-up · Medium image loading.

### 1.7 Pull-to-refresh
- **Spinner natif** (iOS/Android) — défaut sûr.
- **Custom élastique** — élément qui s'étire/se déforme en tirant (Skia ou Reanimated `scrollY`).
- **Mascotte / micro-récompense** au refresh (à doser).
- 📱 `RefreshControl` ou gesture-handler custom. **Exemples** : Twitter/X · Lottie pull-to-refresh.

### 1.8 Compteurs & odomètres
- **Count-up** — nombre qui s'incrémente.
- **Odometer / rolling digits** — chiffres qui défilent verticalement.
- **Flip clock** — countdown façon volet qui bascule.
- 📱 Reanimated `withTiming` sur valeur + `Text` dérivé / Skia. 🌐 `react-countup`, `odometer.js`, ou Framer Motion `animate`.
- **Exemples** : Robinhood balance · Stripe revenue counter.

---

## 2. Boutons & CTAs

### 2.1 États (la base non-négociable)
`default → hover (🌐) → focus → active/pressed → loading → success → disabled → error`.
- ⚠️ **Toujours** un état `pressed` visible en mobile (opacité ou scale), un `focus-visible` net en web (a11y clavier).
- **Loading inline** : le label devient spinner **dans** le bouton, largeur figée (pas de saut).
- **Success morph** : spinner → checkmark dessiné → retour.

### 2.2 Formes
- **Pill** (radius full — casual/moderne), **rounded** (12–16 px), **square** (rare, brutalist), **FAB** (cercle flottant 📱).
- **Split button** (action + menu), **icon-only** (touch target ≥ 44 px), **icon+label**.

### 2.3 Micro-interactions de bouton
- **Press depth / squish** — `scale: 0.96` + ombre réduite au press. 🟢 universel.
- **Ripple** — onde au point de contact (Material). 📱 `Pressable android_ripple` ou custom Reanimated.
- **Shine sweep** — reflet diagonal qui balaie (CTA principal / premium).
- **Gradient border animé** — bordure en gradient qui tourne (`@property` 🌐 / Skia 📱).
- **Magnetic button** 🌐 — le bouton suit légèrement le curseur. 🔴 desktop only.
- **Glow pulse** — halo qui respire sur le CTA prioritaire.
- ⚠️ 📱 **RN + NativeWind** : `Pressable` avec un `style` fonction peut silencieusement ignorer layout/bg/overflow sur iOS → `Pressable` opacité-only, **View interne** pour le reste.

### 2.4 Patterns de confirmation
- **Slide-to-confirm** — glisser un curseur (paiement, action destructive). Très satisfaisant 📱.
- **Hold-to-confirm** — maintenir, anneau qui se remplit.
- **Double-tap** / **undo toast** (préférable au modal de confirmation pour les actions réversibles).
- **Exemples** : « Slide to pay » Cash App · iOS « slide to power off » · GitHub « type the repo name ».

### 2.5 FAB & actions flottantes
- **FAB simple**, **FAB extended** (icône + label qui se rétracte au scroll), **speed-dial** (FAB qui éclate en sous-actions).
- **Exemples** : Gmail compose · Material FAB · Telegram.

---

## 3. Cards & Surfaces

### 3.1 Élévation & profondeur
- **Échelle d'ombres** : définir 5 niveaux (0/1/2/3/4) et s'y tenir. Ombres **légèrement teintées** (vers l'accent, très désaturé) > gris pur pour un feel premium.
- **Layered shadow** — empiler 2-3 ombres (proche+nette / lointaine+diffuse) = profondeur réaliste.
- **Exemples** : Refactoring UI (ombres) · Smashing Mag « shadow scale ».

### 3.2 Styles de surface
- **Glassmorphism** — fond flou translucide (`backdrop-filter: blur` 🌐 / `expo-blur` `BlurView` 📱). ⚠️ coût perf mobile + lisibilité, à doser.
- **Neumorphism** — ombres in/out monochromes. ⚠️ a11y faible, daté — **éviter** sauf usage très ciblé.
- **Néon / glow card** — bordure lumineuse, fond sombre.
- **Gradient mesh card** — fond multicolore doux.
- **Outline / ghost** — bordure 1px, fond transparent (densité, listes).
- ⚠️ 📱 Pour cards à coins arrondis, préférer `backgroundColor` + overlays absolus à un SVG `width=100%` en absolute fill (le clip du borderRadius n'est pas toujours respecté).

### 3.3 Cards interactives
- **Tilt 3D / parallax** 🌐 — la card s'incline vers le curseur (`rotateX/Y` selon position). 🔴.
- **Spotlight hover** 🌐 — halo radial qui suit le curseur sur la card (`--mouse-x/y`).
- **Expandable / accordion card** — la card grandit pour révéler le détail (shared layout).
- **Flip card** — recto/verso (`rotateY` 180°).
- **Swipeable card** — Tinder-style (drag + rotate + throw). 📱 gesture-handler + Reanimated.
- **Stacked deck** — pile de cards avec léger offset/scale (carrousel).
- **Exemples** : Linear (spotlight) · Apple Card flip · Tinder.

### 3.4 Bento grid
- Grille de cards de **tailles inégales** composant un dashboard expressif.
- ⚠️ Doit rester **lisible** : hiérarchie claire, pas juste « des boîtes ». Voir §14.
- **Exemples** : Apple keynote bento · Vercel · `bento.me` · Linear changelog.

---

## 4. Navigation

### 4.1 Bottom tab bar 📱
- **Standard** (3-5 onglets), **floating pill** (flotte au-dessus du contenu), **avec FAB central**, **label au-tap** (icône seule → label sur l'actif).
- **Magic indicator** — pastille/soulignement qui glisse vers l'onglet actif (shared transition).
- **Exemples** : iOS tab bar · Material NavigationBar · Arc mobile.

### 4.2 Bottom sheets 📱
- **Modal sheet** (par-dessus, dim background), **persistent**, **expandable** (snap points : peek/half/full), **scrollable content**, **detached** (flotte avec marges).
- **Snap points** + **backdrop tap to dismiss** + **drag handle**.
- 📱 **`@gorhom/bottom-sheet`** = référence. 🌐 **Vaul** (Emil Kowalski) pour drawer mobile-web.
- **Exemples** : Apple Maps · Vaul.

### 4.3 Headers
- **Collapsing / parallax header** — grand titre + image qui se réduit en barre compacte au scroll.
- **Sticky header** avec blur au scroll (`BlurView` quand `scrollY > 0`).
- **Large title → inline title** (iOS).
- 📱 Reanimated `useAnimatedScrollHandler` + `interpolate`. **Exemples** : iOS large titles · Twitter profile header.

### 4.4 Segmented controls & tabs
- **Segmented control** (iOS) — sélecteur 2-4 options, pastille qui glisse.
- **Top tabs swipeables** 📱 — `react-native-pager-view` / `react-native-tab-view`.
- **Scroll-spy tabs** 🌐 — l'onglet actif suit la section visible.
- **Pill tabs** — onglets pilule, actif en accent plein.
- **Exemples** : iOS segmented · Material tabs.

### 4.5 Menus & overflow
- **⋯ overflow modal / popover centré**, **dropdown** (Floating UI / Radix), **context menu** (long-press 📱 → menu natif iOS), **command palette** (`cmdk`, ⌘K) 🌐, **pull-down menu** iOS 16+ (natif).
- **Exemples** : Raycast/Linear ⌘K · iOS context menu · Notion `/` menu.

### 4.6 Drawer / sidebar 🌐
- Push, overlay, ou **mini-rail** (icônes → expand au hover). **Exemples** : Gmail · Linear sidebar.

---

## 5. Formulaires & Inputs

### 5.1 Champs texte
- **Floating label** (label monte au focus), **outlined**, **filled**, **underline** (sobre).
- **Avec préfixe/suffixe** (€, @), **clear button**, **char counter**, **inline validation** (✓/✗ live).
- ⚠️ Validation : valider **au blur** (pas à chaque frappe), erreur **sous** le champ, jamais alert.
- **Exemples** : Material TextField · Stripe inputs · `react-hook-form` + `zod`.

### 5.2 Numérique
- **Champ texte éditable + steppers −/+** (idéalement raccourcis −5/+5/−10). ⚠️ éviter un stepper qui **force** des multiples sans saisie libre.
- Variantes : **slider + valeur**, **bottom-sheet number pad**, **wheel picker** 📱.

### 5.3 Toggles, switches, choix
- **Switch** (on/off binaire instantané), **checkbox** (multi, peut nécessiter submit), **radio / segmented** (exclusif), **chips multi-select**.
- **Custom switch animé** — pouce qui glisse + couleur qui transitionne + léger overshoot.
- **Exemples** : iOS switch · Material 3 switch (avec icône).

### 5.4 Sliders & ranges
- **Single**, **range (2 poignées)**, **stepped** (crans), **avec tooltip de valeur**, **gradient track**.
- 📱 gesture-handler + Reanimated, ou `@react-native-community/slider`. **Exemples** : prix Airbnb range.

### 5.5 Pickers
- **Date** (calendrier / wheel), **time**, **date-range**, **wheel picker** iOS, **inline calendar**.
- 📱 `react-native-date-picker`, natif via `@react-native-community/datetimepicker`. **Exemples** : Cron/Notion Calendar · Airbnb date range.

### 5.6 Inputs spécialisés
- **OTP / code** — n cases, auto-advance, paste-split, shake si erreur.
- **Tag / chip input** — entrées séparées par virgule/entrée + dedup.
- **Search + autocomplete** — debounce, highlight du match, sections, récents.
- **Places autocomplete** — adresses (Google Places / Mapbox).
- **File / image upload** — drop-zone, preview, progress, crop.
- **Mention `@`** / **slash `/`** commands.
- **Exemples** : Stripe OTP · Linear command · Google Places.

### 5.7 Multi-step / wizard
- **Stepper horizontal** (numéroté), **progress segmenté**, **un écran par question** (Typeform-style), **accordéon** (sections qui s'ouvrent).
- Bonne pratique : **sauvegarder l'état** entre les steps, permettre le retour, indiquer la progression.
- **Exemples** : Typeform · Stripe Checkout · onboarding Duolingo.

---

## 6. Feedback, Statuts & Overlays

### 6.1 Toasts / snackbars
- **Info / success / error / loading→done** (un toast qui mute son état).
- **Avec action** (« Supprimé · Annuler »), **stacking** (empilés, anciens qui reculent), **swipe-to-dismiss**, **promise toast** (pending→success/error auto).
- 🌐 **Sonner** (Emil Kowalski) = référence. 📱 custom Reanimated + safe-area.
- ⚠️ Préférer **toast + undo** au modal de confirmation pour les actions réversibles.
- **Exemples** : Sonner · Linear toasts · iOS « Copied ».

### 6.2 Modals & dialogs
- **Center modal**, **bottom sheet** (📱 préférer), **fullscreen** (formulaire long), **alert** (confirm/cancel), **side panel** 🌐.
- **Entrée** : scale 0.95→1 + fade + backdrop blur/dim. **Sortie** : symétrique, plus rapide.
- ⚠️ Trap focus, `Esc` ferme, scroll-lock body, restituer le focus à la fermeture.
- **Exemples** : Radix Dialog · Vaul · iOS sheets.

### 6.3 Banners & alerts
- **Inline banner** (info/warn/error/success en haut de section), **system banner** (offline, maj dispo), **countdown / urgence banner** (conditionnel).
- **Exemples** : GitHub banners.

### 6.4 Empty states
- **Illustration + titre + sous-titre + CTA**. Le moment idéal pour la personnalité (à doser).
- Cas typiques : 0 item, 0 résultat de recherche, première utilisation, erreur de chargement.
- ⚠️ Un empty state n'est pas une erreur : ton **encourageant**, action claire. Voir §14 (illustrations génériques à éviter).
- **Exemples** : Slack empty channels · Notion · Dropbox.

### 6.5 États d'erreur
- **Inline** (sous le champ), **page 404/500** (avec personnalité + retour), **retry/offline**, **error boundary** (fallback gracieux).
- **Exemples** : Linear 404 · GitHub Unicorn 500.

### 6.6 Success & célébration (voir aussi §12)
- **Checkmark dessiné** (`stroke-dashoffset` SVG), **confetti burst**, **scale+bounce**, **haptic success** 📱.
- **Exemples** : Stripe paiement ✓ · canvas-confetti · Apple Pay « Done ».

### 6.7 Badges, tags, indicateurs
- **Count badge** (notif), **status dot** (online/statut), **pill tag** (catégorie), **NEW/PRO badge**, **avatar stack** (« +5 »).
- **Exemples** : iOS badges · avatar stack Linear/Slack.

### 6.8 Tooltips & coachmarks
- **Tooltip hover/focus** 🌐 (Floating UI / Radix / Tippy), **press tooltip** 📱, **coachmark** (spotlight + bulle au premier usage).
- ⚠️ Jamais d'info **critique** uniquement en tooltip (inaccessible tactile/clavier).
- **Exemples** : `react-joyride` · `intro.js` · coachmarks Headspace.

---

## 7. Motion & Animation — principes & specs

### 7.1 Durées (barème de départ)
| Usage | Durée |
|---|---|
| Micro (hover, tap feedback, toggle) | 100–150 ms |
| Standard (fade, slide, expand) | 200–300 ms |
| Entrée d'écran / modal | 300–400 ms |
| Transition complexe / shared element | 400–600 ms |
| Ambiance / boucle (glow, gradient) | 2–8 s |
- **Sortie ≈ 0.7–0.8× l'entrée** (sortir vite, entrer plus posément).
- ⚠️ Au-delà de ~500 ms pour une UI réactive = perçu lent. Respecter `prefers-reduced-motion` 🌐 + « réduire les animations » 📱.

### 7.2 Courbes d'easing
- **`ease-out`** (`cubic-bezier(0,0,0.2,1)`) — défaut pour les **entrées**.
- **`ease-in`** — pour les **sorties**.
- **`ease-in-out`** (`0.4,0,0.2,1`, « standard » Material) — déplacements sur écran.
- **Emphasized / expressive** (Material 3) — overshoot expressif.
- **Spring** — le plus naturel pour le tactile (voir 7.3). Catalogues : **easings.net**, **cubic-bezier.com**.

### 7.3 Spring physics (préférer en mobile)
- Paramètres : `stiffness` (rigidité), `damping` (amorti), `mass`. Un léger **overshoot** = vivant.
- 📱 Reanimated `withSpring`. 🌐 Framer Motion `type:"spring"` / react-spring.
- **Exemples** : iOS (tout est spring) · « springs » sur emilkowal.ski.

### 7.4 Patterns de composition
- **Stagger** — enfants animés en cascade (40–80 ms d'écart).
- **Shared element transition** — un élément persiste entre 2 écrans (thumbnail → détail). 📱 Reanimated shared transitions ; 🌐 Framer Motion `layoutId`.
- **FLIP** — animer un changement de layout sans jank. Auto via Framer `layout` / FormKit AutoAnimate.
- **Parallax** — couches à vitesses différentes au scroll.
- **Scroll-linked** — progression liée au scroll. 🌐 ScrollTimeline / Framer `useScroll`. 📱 Reanimated scroll handler.
- **Gesture-driven** — l'animation **suit le doigt** (pas un play déclenché). Le plus premium 📱.
- **Loop ambiant** — gradient/glow en fond, lent, non-bloquant.

### 7.5 Effets « waouh » (à doser)
- **Magnetic / cursor-follow** 🌐, **text scramble/decode**, **particles** (tsParticles / Skia), **morphing SVG path**, **liquid/gooey**, **3D tilt**, **Lottie/Rive** (animations vectorielles riches), **scroll-telling**.
- **Lottie** = After Effects → JSON (mascotte, success, empty states). **Rive** = interactif/state-machine (réagit aux états). 📱 + 🌐.
- **Exemples** : Rauno (rauno.me), Emil Kowalski (animations on the web), Cuberto, Awwwards.

### 7.6 Règles de perf
- Animer **`transform` + `opacity`** uniquement (GPU). Éviter `width/height/top/left/box-shadow` animés.
- 📱 garder les animations sur l'**UI thread** (Reanimated worklets), jamais via setState par frame.
- 🌐 `will-change` avec parcimonie, `content-visibility` pour les longues pages.

---

## 8. Couleur, Lumière & Thèmes

### 8.1 Gradients
- **Linéaire**, **radial**, **conic** (`conic-gradient`), **mesh gradient** (multi-points doux), **gradient animé** (angle/positions qui bougent lentement), **noise gradient** (grain ajouté = anti-banding, plus « texturé »).
- 📱 `expo-linear-gradient`, mesh via Skia. 🌐 CSS + `@property --angle` pour animer.
- **Exemples** : Stripe mesh · Vercel gradients · `mesh.dev` · `meshgradient.in`.

### 8.2 Néon & glow
- **Glow** = `box-shadow`/`shadow` coloré large + flou. **Text glow**, **border glow animé**, **glow au focus/hover**.
- **Bloom** sur fond sombre, l'accent comme source lumineuse.
- ⚠️ Glow lourd = coût perf 📱 (privilégier Skia ou images pré-rendues pour les grosses surfaces).

### 8.3 Thèmes
- **Tokens sémantiques** (`--bg`, `--surface`, `--text`, `--accent`, `--accent-fg`) plutôt que couleurs en dur.
- **Dark mode** via inversion de tokens, pas par composant ; option « suivre le système ».
- **Theming par contexte** (accent par section/entité), accents **white-text-safe** stockés par ID.
- ⚠️ Si plusieurs sources de palette (serveur + client), les garder **en sync**.
- **Exemples** : Radix Colors (échelles 12 niveaux) · Material 3 dynamic color · Tailwind theme.

### 8.4 Particules & ambiance
- **Confetti** (burst célébration), **floating particles** (fond doux), **gradient orbs** flous animés, **grain/noise overlay**, **aurora** (dégradés mouvants).
- **Exemples** : canvas-confetti · tsParticles · Vanta.js.

---

## 9. Typographie & texte cinétique

- **Échelle typographique** — type scale modulaire (1.2–1.333), 5-7 tailles. Hiérarchie par **graisse + taille + couleur**, pas que taille.
- **Variable font** — animer le `font-weight`/`opsz` (hover, emphase) si la police le permet.
- **Gradient text** 🌐 — `background-clip: text` pour les gros titres.
- **Kinetic / reveal** : **text fade-up word-by-word**, **char stagger**, **scramble/decode**, **typewriter**, **marquee** (défilement horizontal), **split & rotate** (Splitting.js).
- **Number ticker / odometer** (voir 1.8).
- **Balance** — `text-wrap: balance` (titres) / `pretty` (paragraphes) 🌐.
- ⚠️ Limiter à **1-2 familles** typographiques ; varier par graisse/taille plutôt que par police.
- **Exemples** : Splitting.js · Framer Motion text · Rauno typography · Inter (rsms.me/inter).

---

## 10. Listes & Données

### 10.1 Rendu & perf
- **Virtualisation** : 📱 **FlashList** (Shopify) / Legend List ≫ FlatList pour longues listes. 🌐 `@tanstack/virtual`.
- **Infinite scroll** + **load-more** sentinel ; **pagination** classique en alternative.
- ⚠️ Toujours `key`/`keyExtractor` stable ; éviter les fonctions inline lourdes dans `renderItem`.

### 10.2 Interactions de liste
- **Swipe actions** (révéler archive/suppr — `react-native-gesture-handler` Swipeable).
- **Drag-to-reorder** (📱 `react-native-draggable-flatlist` ; 🌐 dnd-kit).
- **Pull-to-refresh** (§1.7), **section headers collants**, **grouped list** (réglages iOS), **expandable rows**.
- **Selection mode** (long-press → multi-sélection + barre d'actions).

### 10.3 Affichage de données
- **Stat cards**, **sparklines**, **donut/bar/line charts** (📱 `victory-native` / Skia ; 🌐 visx, Recharts, nivo), **heatmap**, **progress rows**, **leaderboard**.
- **Exemples** : Robinhood charts · Stripe dashboard · Linear cycles.

### 10.4 Tables 🌐
- Tri, filtre, colonnes redimensionnables/figées, sélection de lignes, row-expand, **TanStack Table** (headless).
- ⚠️ Sur mobile, une table → **cards empilées**, jamais de scroll horizontal d'un tableau dense.

---

## 11. Layout & Composition

- **Bento grid** (§3.4), **masonry** (Pinterest — hauteurs variables), **split-screen** (50/50), **z-pattern / f-pattern** (lecture), **hero** (au-dessus de la ligne de flottaison), **sticky scroll / scrollytelling**, **sticky sidebar**, **grid asymétrique**.
- **Responsive** : mobile-first, `clamp()` pour la fluidité, container queries 🌐, breakpoints cohérents.
- **Espacement** : échelle 4/8 px stricte. La cohérence d'espacement = 50 % du « ça a l'air pro ».
- **Safe areas** 📱 (`react-native-safe-area-context`), **edge-to-edge** Android.
- **Exemples** : Refactoring UI (spacing/hierarchy) · Every Layout (CSS) · Pitch/Linear landings.

---

## 12. Onboarding, Engagement & Célébration

- **Carousel d'intro** (3-4 slides + dots de progression + skip), **coachmarks/spotlight**, **tooltips contextuels au premier usage**, **progress checklist** (« 3/5 étapes »).
- **Célébration** : **confetti burst** (premier succès, objectif atteint), **checkmark animé**, **haptic success**, **micro-copy chaleureux**.
- **Gamification douce** : streaks, milestones, compteur qui « pop ».
- ⚠️ Copy : éviter l'élitisme artificiel (« tu fais partie des X choisi·es », VIP, accès exclusif). Ton = factuel + chaleureux.
- **Exemples** : Duolingo (célébration/streaks) · Headspace onboarding · Stripe checklist.

---

## 13. Mobile-natif (gestes, haptique, surfaces)

### 13.1 Gestes
- **Tap, long-press, double-tap, pan/drag, pinch/zoom, rotation, swipe (4 dir), fling/throw, pull-to-dismiss**.
- **Edge swipe back** (iOS), **swipe entre onglets**, **drag bottom-sheet**, **drag canvas**.
- 📱 **`react-native-gesture-handler`** + **Reanimated** (gestes pilotant des valeurs animées sur l'UI thread). `Gesture.Pan()`, `Gesture.Simultaneous()`, `Gesture.Race()`.
- **Exemples** : Apple HIG gestures · William Candillon (« Can it be done in React Native? »).

### 13.2 Haptique
- Mapper le feedback : **selection** (tick léger), **impact light/medium/heavy**, **notification success/warning/error**.
- 📱 **`expo-haptics`**. Déclencher sur : confirm, toggle, snap de sheet, drag-drop, envoi.
- ⚠️ Sobriété : haptique = ponctuation, pas un métronome.

### 13.3 Surfaces & système
- **Bottom sheet** (§4.2), **action sheet** natif iOS, **context menu** long-press, **share sheet** natif (`expo-sharing`), **notifications**, **live activities / widgets**, **app clips / instant**.
- **Blur** : `expo-blur` `BlurView` pour glass nav/headers.
- ⚠️ **Plugins natifs jamais conditionnels** : skip un plugin selon l'env = module natif non enregistré = crash au boot. Toujours inclure le plugin (placeholder si param manquant).

### 13.4 Canvas / dessin avancé 📱
- **react-native-skia** : shaders, paths, blurs, particules, liquid, glow performants.
- **react-native-svg** : suffisant pour QR, anneaux de progress, formes simples.

---

## 14. Anti-patterns & AI-slop à bannir

> Avant de proposer un design, le vérifier contre cette liste. Le but : éviter le « défaut IA » reconnaissable.

**Visuels AI-slop à éviter :**
- Gradient violet→bleu générique « tech startup » par défaut sur tout.
- Glassmorphism partout, sans raison, qui tue la lisibilité.
- Emojis en guise d'icônes dans une UI sérieuse / icônes 3D « blob » génériques.
- Illustrations « undraw »-style (personnages plats interchangeables).
- Cards toutes identiques en grille rigide 3×N sans hiérarchie (« le mur de boîtes »).
- Centrer tout le texte, partout.
- Hero « Big bold claim + gradient + 2 boutons » copié-collé.
- Drop-shadow gris uniforme `0 4px 6px rgba(0,0,0,.1)` sur tout.
- Bordures `1px #e5e7eb` + radius `8px` par défaut → look « composant non customisé ».
- Bento grid décoratif **sans contenu réel** / sans hiérarchie.

**Comportements à éviter :**
- Animations > 500 ms sur des actions fréquentes (perçu lent).
- Spinner **et** skeleton en même temps.
- Confirmation modale pour une action réversible (→ toast + undo).
- Info critique uniquement en tooltip/hover (inaccessible tactile/clavier).
- Stepper qui force des multiples sans saisie libre.
- Layout shift au chargement (skeleton mal dimensionné).
- Copy élitiste / VIP artificiel.

**Règle méthodo :** pour un produit multi-plateforme, livrer les mockups **web + mobile en parallèle**, jamais une seule surface.

---

## 15. Mapping par type d'écran

> Mapping « type d'écran → patterns à piocher ci-dessus ». À adapter au produit.

| Écran | Patterns recommandés |
|---|---|
| **Onboarding** | Carousel + dots (§12), coachmarks (§6.8), progress checklist (§12), célébration premier succès (§6.6). |
| **Home / feed** | Liste virtualisée (§10.1), pull-to-refresh (§1.7), section headers collants (§10.2), hero/stacked deck (§3.3), avatar/stat header. |
| **Dashboard** | Bento grid (§3.4), stat cards + sparklines (§10.3), anneaux/jauges (§1.2), count-up (§1.8), collapsing header (§4.3). |
| **Liste / table** | Swipe actions (§10.2), drag-reorder (§10.2), status dots (§6.7), recherche autocomplete (§5.6), empty state (§6.4). Mobile = cards, pas table dense. |
| **Détail (item)** | Collapsing/parallax header (§4.3), shared element depuis la liste (§7.4), ⋯ overflow menu (§4.5), expandable sections (§5.7). |
| **Formulaire / wizard** | Progress segmenté (§1.1), un écran/question (§5.7), inline validation (§5.1), inputs spécialisés (§5.6), bottom sheet « + Ajouter » (§4.2). |
| **Checkout / paiement** | Slide-to-confirm (§2.4), loading inline sur CTA (§2.1), success morph + confetti (§6.6), récap en cards. |
| **Recherche** | Search + autocomplete debounce (§5.6), highlight du match, récents/sections, empty/zero-result state (§6.4). |
| **Profil / réglages** | Grouped list iOS (§10.2), switches (§5.3), avatar header, sélecteur de thème (§8.3). |
| **Loading global** | Spinner sweep sans label (§1.3) OU skeletons content-aware (§1.5) — jamais les deux. |
| **Paywall / upsell** | CTA glow/shine (§2.3), comparaison plans en cards, célébration au unlock (§12). |
| **Vide / erreur** | Empty state encourageant + CTA (§6.4), 404/500 avec personnalité (§6.5), retry/offline banner (§6.3). |

---

## 16. Boîte à outils — libs, courbes, sources d'inspi

### 16.1 Libs animation
- **🌐 Web** : Framer Motion (motion.dev), GSAP (+ ScrollTrigger), Anime.js, Motion One, **Auto-Animate** (FormKit, zéro-config), React Spring, **Lenis** (smooth scroll), Theatre.js (timeline).
- **📱 Mobile** : **Reanimated** (cœur), **gesture-handler**, **Moti** (déclaratif sur Reanimated), **react-native-skia** (graphique/shaders), **react-native-redash** (helpers), `react-native-reanimated-carousel`.
- **Cross** : **Lottie** (After Effects → JSON), **Rive** (interactif, state machines).

### 16.2 Libs composants / interaction
- **🌐** : Radix UI / Radix Themes, Headless UI, React Aria (Adobe), **shadcn/ui**, Geist (Vercel), **Vaul** (drawer), **Sonner** (toasts), **cmdk** (command palette), **Floating UI** (tooltips/popovers), **Embla** / Swiper (carousels), **dnd-kit** (drag), **TanStack** (Table/Virtual/Query), **tsParticles**, **canvas-confetti**.
- **📱** : **@gorhom/bottom-sheet**, **FlashList** / Legend List, `react-native-pager-view`, `react-native-tab-view`, `react-native-draggable-flatlist`, `react-native-gesture-handler` Swipeable, `expo-haptics`, `expo-blur`, `expo-image`, `expo-linear-gradient`.

### 16.3 Couleur / gradient / type
- **Radix Colors**, **Tailwind palette**, **Material 3 dynamic color**, mesh : `mesh.dev` / `meshgradient.in`, contrast : WebAIM / `apca`, type scale : `typescale.com`, polices : Google Fonts, Fontshare, **Inter** (rsms.me/inter).

### 16.4 Courbes & motion
- **easings.net** (catalogue visuel), **cubic-bezier.com** (éditeur), Material 3 motion specs, **Emil Kowalski — « Animations on the Web »** (cours), **Josh Comeau** (CSS/animations).

### 16.5 Galeries d'inspiration (le « shopping » de patterns)
- **Apps mobiles** : **Mobbin** (le plus complet), Page Flows, UI Sources, Screenlane, Pttrns.
- **Web** : Awwwards, Godly (godly.website), **Cosmos** (cosmos.so), Land-book, Lapa Ninja, Httpster, SaaS Landing Page, Refero.
- **Composants/micro-interactions** : Dribbble (filtré), CodePen, Collect UI, UI Movement.
- **Comptes/people** : Rauno Freiberg (rauno.me), Emil Kowalski (emilkowal.ski), Cuberto, William Candillon (RN).

### 16.6 Design systems à étudier
- Material Design 3, Apple HIG, Fluent 2 (Microsoft), Carbon (IBM), Polaris (Shopify), Base Web (Uber), Primer (GitHub), Atlassian, Ant Design, Untitled UI.

---

## 17. Accessibilité & checklist transverse

> Un pattern « beau » mais inaccessible est un bug. À vérifier sur chaque écran.

- **Contraste** : texte ≥ 4.5:1 (corps), ≥ 3:1 (gros titre / éléments UI). Outils : WebAIM, APCA.
- **Touch targets** ≥ 44×44 px (iOS) / 48 dp (Android).
- **Focus clavier** 🌐 : `focus-visible` net, ordre logique, pas de piège, `Esc` ferme les overlays.
- **Lecteurs d'écran** : labels (`aria-label` / `accessibilityLabel`), rôles, états (`aria-expanded`, `accessibilityState`), annonces live (toasts) via `aria-live` / `AccessibilityInfo`.
- **Reduced motion** : `prefers-reduced-motion` 🌐 + réglage système 📱 → désactiver/atténuer les grosses animations.
- **Cibles d'état** : ne jamais coder une info **uniquement** par la couleur (ajouter icône/texte).
- **Dynamic type / zoom** : supporter l'agrandissement de police sans casser le layout.
- **Mode sombre & clair** : tester les deux ; vérifier glows/ombres dans les deux.
- **Offline / lenteur** : skeletons dimensionnés, retry, messages clairs, pas de spinner infini muet.
- **i18n** : prévoir l'expansion de texte (FR/DE ~+30 % vs EN), RTL si pertinent, pas de texte dans des images.
- **Perf perçue** : optimistic UI, transitions < 500 ms, pas de layout shift (CLS).

---

*Fichier vivant et portable — l'adapter au projet (couleur d'accent, libs de la stack), enrichir au fil de la veille.*
