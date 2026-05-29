# Blueprint — Landing apex `rotary-startup.org` : 3 portes vers la plateforme

> **Statut** : à valider avant implémentation.
> **Projet cible** : `landing/` (Astro 5 statique, repo séparé Vercel).
> **Lien plateforme** : [[auth-routing-and-personas]] (les 3 portes pointent vers `app.rotary-startup.org/{Candidater,Login,DevenirJury}`).

## Contexte

La landing actuelle `landing/src/pages/index.astro` est une page **post-finale 2026** : palmarès KUZOG + remerciements + une section "Rendez-vous en 2027" purement émotionnelle (juste un email de contact). Elle remplace progressivement le site Elementor cloud (sécurité D, pas de CSP).

La refonte plateforme V2 a livré 3 nouveaux personas avec leurs pages dédiées sur `app.rotary-startup.org` :

- `/Candidater` — listing public des compétitions ouvertes (édition × club)
- `/DevenirJury` — formulaire d'inscription spontanée jury
- `/Login` — connexion magic link avec routage par rôle

**Problème** : la landing apex n'expose aucune de ces portes. Un visiteur qui découvre le concours (post-Elementor) ne sait pas où candidater 2027, ni comment devenir jury, ni où se connecter s'il a déjà un dossier.

**But** : intégrer **3 CTA** dans la landing apex, sans casser l'ADN éditorial actuel (palmarès 2026 reste central, c'est la preuve sociale qui crédibilise le concours).

## Architecture cible — 3 entrées

```
                  Landing apex rotary-startup.org
                  (Astro statique, Cormorant + Jost,
                   bleu #003F87 / gold #F7A800)
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
  [Header link]         [Section CTA          [topbar annonce ?]
   "Se connecter"        3 cards]
        │                     │
        ▼                     │
        │             ┌───────┼────────┐
        │             ▼       ▼        ▼
        │           Card1   Card2    Card3
        │         Candidater Jury   Plateforme
        │           │         │       │
        └───────────┴─────────┴───────┘
                         │
                         ▼
              app.rotary-startup.org
                  /Login | /Candidater | /DevenirJury
```

## Wireframe — Header (sticky)

**État actuel** :
```
┌─────────────────────────────────────────────────────────────────┐
│ [logo] │ Rotary Startup Award                                    │
│        │ Paris · Berlin · 2026                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Cible** : ajout d'un lien discret "Se connecter →" à droite (uppercase tracking-wide, navy ink, underline gold sur hover).

```
┌─────────────────────────────────────────────────────────────────┐
│ [logo] │ Rotary Startup Award          SE CONNECTER →           │
│        │ Paris · Berlin · 2026                                   │
└─────────────────────────────────────────────────────────────────┘
```

- Sur mobile (<900px) : le lien reste visible (le brand-name perd son subtitle, ça laisse de la place).
- Couleur du chevron `→` : gold `#F7A800`.

## Wireframe — Section CTA (remplace l'actuelle "Rendez-vous 2027")

**État actuel** :
```
┌──────────────────────┬──────────────────────────────────┐
│ Rendez-vous en 2027  │ Le RSA reviendra en 2027.        │
│ La prochaine édition │ Restez en contact !              │
│ arrive bientôt       │ contact@rotary-startup.org       │
│                      │ rotary-startup.org               │
└──────────────────────┴──────────────────────────────────┘
```

Une seule colonne droite avec un email. Aucun CTA actionnable.

**Cible** : titre éditorial + sous-titre + grille **3 cards** (Candidater = primaire/gold, Jury = secondaire, Plateforme = tertiaire). Email/contact descendent dans un footer-row sous les cards.

```
ÉDITION 2027 — CANDIDATURES OUVERTES

Préparer
la suite ensemble

Fondateurs, jurés, clubs partenaires : trois portes pour rejoindre
la prochaine édition du Rotary Startup Award.

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  🚀          │ │  ⚖️          │ │  🔑          │
│ POUR         │ │ POUR         │ │ DÉJÀ         │
│ FONDATEURS   │ │ EXPERTS      │ │ INSCRIT ?    │
│              │ │              │ │              │
│ Candidater   │ │ Devenir jury │ │ Accéder à la │
│ au concours  │ │              │ │ plateforme   │
│              │ │              │ │              │
│ Présentez    │ │ Entrepreneurs│ │ Suivez votre │
│ votre        │ │ investisseurs│ │ dossier,     │
│ startup à    │ │ experts —    │ │ session ou   │
│ l'édition    │ │ rejoignez le │ │ cockpit de   │
│ 2027. […]    │ │ jury. […]    │ │ club. […]    │
│              │ │              │ │              │
│ ─────────────│ │ ─────────────│ │ ─────────────│
│ DÉPOSER MON  │ │ POSTULER     │ │ SE CONNECTER │
│ DOSSIER →    │ │ COMME JURÉ → │ │ →            │
└──────────────┘ └──────────────┘ └──────────────┘
   (gold accent)    (white outline)  (white outline)

contact@rotary-startup.org · rotary-startup.org
```

**Hiérarchie visuelle** :
- Card 1 (Candidater) : background `rgba(247,168,0,.08)` + border `rgba(247,168,0,.35)` → accent gold pour signaler la priorité.
- Card 2 et 3 : background `rgba(255,255,255,.04)` + border `rgba(255,255,255,.12)` → outline minimaliste sur fond bleu.
- Hover : translateY(-3px) + border gold + intensification background.

**Liens** :
- Card 1 → `https://app.rotary-startup.org/Candidater`
- Card 2 → `https://app.rotary-startup.org/DevenirJury`
- Card 3 → `https://app.rotary-startup.org/Login`

## Wireframe — Topbar (décision ouverte)

**État actuel** :
```
🏆 KUZOG FRANCE, lauréate · Rotary Startup Award 2026 · Rotary Club de Paris & Berlin
```

**Option A** (recommandée) : laisser tel quel jusqu'à l'ouverture officielle des candidatures 2027. La preuve sociale 2026 est forte ; la remplacer trop tôt par "candidatures 2027 bientôt ouvertes" affaiblit le message.

**Option B** : remplacer par `📣 Candidatures 2027 ouvertes — Postulez avant le DD.MM.2027` dès que `Edition.openForApply()` retourne une édition 2027 active. Cohérent avec les cards.

→ **À trancher avec toi.**

## Copies trilingues

### Header — lien "Se connecter"
| Lang | Label |
|---|---|
| FR | `Se connecter →` |
| EN | `Sign in →` |
| DE | `Anmelden →` |

### Section CTA — titre + lede

| Slot | FR | EN | DE |
|---|---|---|---|
| Kicker | `ÉDITION 2027 — CANDIDATURES OUVERTES` | `2027 EDITION — APPLICATIONS OPEN` | `AUSGABE 2027 — BEWERBUNGEN OFFEN` |
| H2 part 1 | `Préparer` | `Preparing` | `Gemeinsam` |
| H2 part 2 (italic) | `la suite ensemble` | `what comes next` | `die nächste Runde` |
| Lede | `Fondateurs, jurés, clubs partenaires : trois portes pour rejoindre la prochaine édition du Rotary Startup Award.` | `Founders, jurors, partner clubs: three doors to join the next edition of the Rotary Startup Award.` | `Gründer, Juroren, Partnerclubs: drei Türen, um an der nächsten Ausgabe des Rotary Startup Award teilzunehmen.` |

### Card 1 — Candidater (gold accent)

| Slot | FR | EN | DE |
|---|---|---|---|
| Emoji | 🚀 | 🚀 | 🚀 |
| Tag | `Pour fondateurs` | `For founders` | `Für Gründer` |
| Titre | `Candidater au concours` | `Apply to the award` | `Am Wettbewerb teilnehmen` |
| Desc | `Présentez votre startup à l'édition 2027. Sélection par un comité Rotary, pitch devant un jury d'experts, prix à la clé.` | `Submit your startup to the 2027 edition. Pre-selection by a Rotary committee, pitch before an expert jury, prizes awarded.` | `Reichen Sie Ihr Startup zur Ausgabe 2027 ein. Vorauswahl durch ein Rotary-Komitee, Pitch vor einer Fachjury, Preise zu gewinnen.` |
| CTA | `Déposer mon dossier →` | `Submit my application →` | `Bewerbung einreichen →` |
| Lien | → `https://app.rotary-startup.org/Candidater` | | |

### Card 2 — Devenir jury

| Slot | FR | EN | DE |
|---|---|---|---|
| Emoji | ⚖️ | ⚖️ | ⚖️ |
| Tag | `Pour experts` | `For experts` | `Für Experten` |
| Titre | `Devenir jury` | `Join the jury` | `Jury werden` |
| Desc | `Entrepreneurs, investisseurs, experts sectoriels — rejoignez le jury 2027 et notez les pitchs des startups finalistes.` | `Entrepreneurs, investors, sector experts — join the 2027 jury and score finalist pitches.` | `Unternehmer, Investoren, Branchenexperten — werden Sie Teil der Jury 2027 und bewerten Sie die Pitches der Finalisten.` |
| CTA | `Postuler comme juré →` | `Apply as a juror →` | `Als Juror bewerben →` |
| Lien | → `https://app.rotary-startup.org/DevenirJury` | | |

### Card 3 — Accéder à la plateforme

| Slot | FR | EN | DE |
|---|---|---|---|
| Emoji | 🔑 | 🔑 | 🔑 |
| Tag | `Déjà inscrit ?` | `Already registered?` | `Schon registriert?` |
| Titre | `Accéder à la plateforme` | `Open the platform` | `Zur Plattform` |
| Desc | `Suivez votre dossier, consultez vos sessions ou pilotez votre cockpit de club. Connexion par lien magique, sans mot de passe.` | `Track your application, review your sessions, or run your club cockpit. Sign in by magic link, no password.` | `Verfolgen Sie Ihre Bewerbung, prüfen Sie Ihre Sessions oder steuern Sie Ihr Club-Cockpit. Anmeldung per Magic Link, ohne Passwort.` |
| CTA | `Se connecter →` | `Sign in →` | `Anmelden →` |
| Lien | → `https://app.rotary-startup.org/Login` | | |

### Note i18n
La landing actuelle a un toggle FR/EN/DE **cosmétique** (les boutons existent mais ne switchent rien). Le scope de ce blueprint = ajouter la **copie FR** au DOM par défaut, **prévoir** les copies EN/DE en commentaire JSON dans le script (ou data attributes) pour qu'une future passe d'i18n switching les active.

## Mobile (<900px)

- Header : `Se connecter →` reste visible à droite du brand (le brand-subtitle "Paris · Berlin · 2026" disparaît déjà sous 900px, ça laisse l'espace).
- Section CTA : grid 3 colonnes → 1 colonne empilée. Hover désactivé (touch). Padding réduit.
- Topbar : OK tel quel (déjà responsive).

## Implémentation prévue

**Fichiers touchés (2)** :
- `landing/src/pages/index.astro` — header (ajout `<div class="rsa-nav-right">`) + remplacement complet de `<section class="rsa-cta-sec">` par la nouvelle structure 3 cards.
- `landing/src/styles/global.css` — ajout `.rsa-nav-right` / `.rsa-nav-link` + refonte complète du bloc `/* ─── CTA SECTION ─── */` pour les cards (grid responsive, hover transitions, gold accent variante).

**Pas de fichiers neufs.** Pas de JS framework, pas de dépendance ajoutée. Astro statique pur, cohérent avec le bootstrap actuel.

**Vérification** :
1. `npm run build` dans `landing/` → exit 0, dist générée.
2. Inspection visuelle locale via `npm run preview` :
   - Desktop : 3 cards en ligne, Card 1 visiblement plus chaude (gold), hover bien.
   - Mobile : 3 cards empilées, "Se connecter" visible dans header.
3. Cliquer chaque CTA → ouvre bien `app.rotary-startup.org/...` (avec target navigation propre, pas `target="_blank"` pour rester dans le même contexte).
4. Lighthouse smoke (idéal) : pas de régression perf / accessibility.

## Risques & garde-fous

1. **CSP stricte** dans `vercel.json` — l'ajout des cards n'introduit aucun script externe ni inline. Pas d'impact CSP.
2. **Lien `app.rotary-startup.org` vs `https://app.rotary-startup.org`** : utiliser l'URL absolue avec `https://` (la landing apex et la plateforme sont des hôtes séparés Vercel).
3. **Pas de `target="_blank"`** : les CTA naviguent dans le même onglet (le visiteur a explicitement cliqué pour aller vers l'app, c'est ce qu'il veut). Évite de polluer les analytics avec des onglets orphelins.
4. **Émojis** : 🚀 ⚖️ 🔑 — supportés natif sur toutes plateformes modernes. Si tu préfères des icônes SVG (cohérent avec le logo Rotary), à dire ; je remplace.
5. **Topbar 2026** : décision laissée ouverte (Option A garder / Option B mettre à jour 2027). Cf. section "Wireframe — Topbar".

## Hors-scope (différé)

- I18n switching réel sur la landing (les copies trilingues sont fournies mais le switch FR/EN/DE actuel est cosmétique).
- Refonte du Hero (palmarès 2026) — reste tel quel, c'est la preuve sociale.
- Page `/Candidater` côté landing — non, la page publique vit côté plateforme (`app.rotary-startup.org/Candidater`), la landing n'a qu'un CTA.
- Resign Elementor — geste séparé (DNS cutover apex → Vercel quand prêt).

## Questions ouvertes pour toi

1. **Topbar 2026 ou 2027 ?** Option A (garder lauréat KUZOG) ou Option B (annoncer candidatures 2027) ?
2. **Émojis 🚀 ⚖️ 🔑** ok ou tu veux des icônes SVG sobres (style éditorial pur, pas d'emoji) ?
3. **Copy EN/DE** : ok telles que rédigées, ou à raffiner ?
4. **Topbar — bandeau supplémentaire ?** Tu veux qu'on ajoute *au-dessus* du palmarès un mini-bandeau "Candidatures 2027 ouvertes →" qui scroll vers la section CTA, ou les 3 cards en fin de page suffisent ?
