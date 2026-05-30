# DEEPSOLVE — Migration des URLs RSA legacy vers les routes V3 plateforme

**Auteur :** agent DEEPSOLVE
**Date :** 2026-05-30
**Statut :** propositions — aucune action n'a été exécutée (lecture seule)
**Décide :** Mathieu

---

## 0. TL;DR

- **Le statu quo court-terme est déjà tranché** : µ5 = (a) ranger les 11 pages RSA legacy dans `src/pages/legacy/` (cosmétique, zéro risque). Aucune URL ne bouge à ce stade. Ce doc traite la **suite** : faut-il migrer plus tard, quand et comment.
- **Les 11 URLs legacy ne sont pas équivalentes** : 4 sont des endpoints publics actifs (QR jurés, emails finale, RSVP, palmarès), 4 sont des outils d'admin internes (cockpit live + impressions + upload tokens), 3 sont des dashboards candidat / jury qui ont déjà un remplaçant V3 (`/Concours`, `/Jury`, `/MonDossier`). Le mapping n'est pas un 1-pour-1.
- **L'urgence est faible mais le coût d'attente est borné** : tant que des QR codes restent en circulation (slides session, emails J-3) ou que les emails finale envoient encore des liens `/RsaRecap` / `/RsaJuryHub`, on ne peut pas casser ces routes. Côté cycle métier, le déclencheur naturel est **fin du cycle 2026** (post-Grande Finale 26 mai 2026) — après quoi plus aucun QR ni email ne sort pendant ~6 mois.
- **Recommandation : Hybride D**, mais en deux temps. Phase 1 (immédiate, après µ5 isolation) : **réécrire les callers V3** (`DecksTab`, `LiveTab`, `SetupTab`, `JurorLinkQR`, `FinaleEmailsSection`, `CommunicationsSection`, `ResultsTab`, `RsvpTab`, `SessionDetailDrawer`) pour qu'ils émettent les **nouvelles URLs V3** par défaut tout en conservant la possibilité de générer l'URL legacy via un flag. Phase 2 (post-cycle 2026, fenêtre août-octobre 2026) : **ajouter les redirects 301** dans React Router pour les URLs encore en circulation (QR imprimés, emails archivés). Pas de big-bang.
- **Coût « jamais migrer »** : ~2 100 LOC legacy (RsaDashboard 1 934 + RsaJuryHub 1 053 + RsaRecap 1 016 + RsaScore 800 + RsaFinaleRsvp 824 = ~5 600 LOC + 6 pages mineures) bloquées dans le bundle. Ce n'est plus dans le bundle initial (lazy chunks V3 Vague 4), donc **l'impact perf est minime**. Le coût réel = dette mentale (« quel `/Rsa…` fait quoi ? »), surface RLS à maintenir, et un risque de bug si quelqu'un touche `db.js` côté lunch/RSA legacy.

---

## 1. État actuel — faits

### 1.1 Inventaire des 11 routes legacy

Routes enregistrées dans `src/pages.config.js:67-101` et montées telles quelles dans `src/App.jsx:180-198` :

| Route | Fichier | LOC | Type | Statut actuel |
|---|---|---:|---|---|
| `/RsaScore?s=…` | `src/pages/RsaScore.jsx` | 800 | Endpoint public juré | **URL active (QR + emails J-3)** |
| `/RsaRecap?s=…` | `src/pages/RsaRecap.jsx` | 1 016 | Endpoint public juré (récap) | **URL active (emails post-session)** |
| `/RsaJuryHub` | `src/pages/RsaJuryHub.jsx` | 1 053 | Espace concours public | **URL active (emails finale)** |
| `/RsaDashboard` | `src/pages/RsaDashboard.jsx` | 1 934 | Dashboard candidat legacy | Quasi-mort (1 lien depuis `RsaAdmin.jsx:197`) |
| `/RsaFinaleResults` | `src/pages/RsaFinaleResults.jsx` | ~600 | Palmarès finale public | **URL active (CTA admin ResultsTab:354)** |
| `/RsaFinaleRsvp` | `src/pages/RsaFinaleRsvp.jsx` | 824 | RSVP finale | **URL active (emails 3 variantes + CTA Concours)** |
| `/RsaJuryForm` | `src/pages/RsaJuryForm.jsx` | ~500 | Inscription jury | URL active (lien `RsaDashboard:884,1172`) — mais déjà doublé par `/DevenirJury` V3 |
| `/RsaJuryView?s=…` | `src/pages/RsaJuryView.jsx` | ~500 | Vue détail jury candidat | Faible usage (pas trouvé de caller V3 externe) |
| `/RsaPrintSheets?s=…` | `src/pages/RsaPrintSheets.jsx` | ~400 | Feuilles imprimables | **URL active (CTA admin SetupTab:219)** |
| `/StartupUpload?t=…` | `src/pages/StartupUpload.jsx` | ~600 | Upload deck token-gated | **URL active (emails DecksTab:1028)** |
| `/RsaAdmin` | `src/pages/RsaAdmin.jsx` | ~800 | Cockpit admin legacy | Quasi-mort (3 liens internes dans `RsaDashboard`, 1 lien `RsaRecap:353`) |

### 1.2 Routes V3 candidates au remplacement

Identifiées via `src/pages.config.js` + lecture des fichiers `src/pages/{Jury,Concours,Selection,Resultats,MonDossier,Admin,Candidater,Welcome,Login,DevenirJury}.jsx` :

| Route V3 | Fichier | Rôle | Search params actuels |
|---|---|---|---|
| `/Jury` | `src/pages/Jury.jsx` | Master/detail jury (sessions assignées + scoring) | aucun (sélection in-page) |
| `/Concours` | `src/pages/Concours.jsx` | Vitrine éditoriale concours | aucun (édition par défaut = `open`) |
| `/Selection` | `src/pages/Selection.jsx` | File de review comité | aucun |
| `/Resultats` | `src/pages/Resultats.jsx` | Palmarès public anonyme | `?edition=` (cf. `useSearchParams`) |
| `/MonDossier` | `src/pages/MonDossier.jsx` | Dossier candidat | `?edition=` |
| `/Admin` | `src/pages/Admin.jsx` → `AdminShell` | Cockpit admin V3 | `?tab=&edition=&session=&scope=` (mirror legacy RsaAdmin, cf. `AdminShell.jsx:38`) |
| `/Candidater` | `src/pages/Candidater.jsx` | Funnel public self-signup | `?edition=&claim=1` |
| `/DevenirJury` | `src/pages/DevenirJury.jsx` | Form inscription jury | aucun |
| `/JuryCandidate` | `src/pages/JuryCandidate.jsx` | Vue jury candidat (drill-down) | (à confirmer) |
| `/Welcome` | `src/pages/Welcome.jsx` | Onboarding rôle | aucun |

### 1.3 Cartographie complète des callers (production)

Grep exhaustif sur `src/` (hors `pages/Rsa*` et `pages/StartupUpload.jsx` eux-mêmes) :

```
URL legacy émise           │ Caller (file:line)                                             │ Contexte d'émission
───────────────────────────┼─────────────────────────────────────────────────────────────────┼──────────────────────────────
/RsaScore?s={sessionId}    │ src/components/rsa/admin/JurorLinkQR.jsx:27                     │ QR code session (modal admin)
                           │ src/components/rsa/admin/LiveTab.jsx:152                        │ "copy juror link" button
                           │ src/components/rsa/admin/LiveTab.jsx:190                        │ "preview" anchor target=_blank
                           │ src/components/rsa/admin/SetupTab.jsx:177                       │ "copy juror link" button
                           │ src/components/rsa/admin/DecksTab.jsx:1096,1175                 │ email template variable {SCORING_URL}
                           │ src/components/rsa/admin/FinaleEmailsSection.jsx:361             │ email template {SCORING_URL} (finale)
                           │ src/components/rsa/concours-dashboard/SessionDetailDrawer.jsx:269│ JuryScoringBlock (QR + copy)
───────────────────────────┼─────────────────────────────────────────────────────────────────┼──────────────────────────────
/RsaRecap?s={sessionId}    │ src/components/rsa/admin/ResultsTab.jsx:367,378                 │ CTA "Récap startups" / "Récap jury"
                           │ src/components/rsa/admin/CommunicationsSection.jsx:539,565,591   │ email template post-session (FR/EN/DE)
───────────────────────────┼─────────────────────────────────────────────────────────────────┼──────────────────────────────
/RsaJuryHub                │ src/components/rsa/admin/CommunicationsSection.jsx:543,569,595   │ email "Espace concours" (FR/EN/DE)
                           │ src/components/rsa/admin/FinaleEmailsSection.jsx:362             │ email template {JURYHUB_URL}
───────────────────────────┼─────────────────────────────────────────────────────────────────┼──────────────────────────────
/RsaDashboard              │ src/pages/RsaAdmin.jsx:197                                       │ lien admin legacy (interne legacy)
───────────────────────────┼─────────────────────────────────────────────────────────────────┼──────────────────────────────
/RsaFinaleResults          │ src/components/rsa/admin/ResultsTab.jsx:354                     │ CTA "Palmarès public" (admin)
───────────────────────────┼─────────────────────────────────────────────────────────────────┼──────────────────────────────
/RsaFinaleRsvp             │ src/components/rsa/admin/CommunicationsSection.jsx:446           │ email "?role=jury"
                           │ src/components/rsa/admin/CommunicationsSection.jsx:609           │ email "?role=visitor"
                           │ src/components/rsa/admin/CommunicationsSection.jsx:713           │ email "?role=pitcher" (gagnant)
                           │ src/components/rsa/admin/RsvpTab.jsx:207                         │ "copy share link" admin
                           │ src/components/rsa/concours-dashboard/FinaleSection.jsx:187      │ <Link to={createPageUrl('RsaFinaleRsvp')}> public
───────────────────────────┼─────────────────────────────────────────────────────────────────┼──────────────────────────────
/RsaJuryForm               │ (aucun caller V3 — uniquement les pages legacy le linkent)
───────────────────────────┼─────────────────────────────────────────────────────────────────┼──────────────────────────────
/RsaJuryView               │ (aucun caller V3 trouvé)
───────────────────────────┼─────────────────────────────────────────────────────────────────┼──────────────────────────────
/RsaPrintSheets?s={…}      │ src/components/rsa/admin/SetupTab.jsx:219                       │ CTA "Feuilles papier"
───────────────────────────┼─────────────────────────────────────────────────────────────────┼──────────────────────────────
/StartupUpload?t={token}   │ src/components/rsa/admin/DecksTab.jsx:1028                       │ email candidat {UPLOAD_URL}
───────────────────────────┼─────────────────────────────────────────────────────────────────┼──────────────────────────────
/RsaAdmin                  │ (uniquement des liens internes legacy — pas de caller V3)
```

**Synthèse callers V3 production** :
- **8 composants V3 admin** émettent des URLs legacy : `DecksTab`, `LiveTab`, `SetupTab`, `JurorLinkQR`, `FinaleEmailsSection`, `CommunicationsSection`, `ResultsTab`, `RsvpTab`.
- **1 composant public V3** : `SessionDetailDrawer` (Concours) + `FinaleSection` (Concours).
- **0 edge function** (`supabase/functions/send-bulk|send-transactional|consolidate-jury-pack` — vérifié par grep, elles reçoivent les URLs déjà construites en payload).
- **0 référence dans `api/` Vercel** (cron).
- **0 référence dans `vercel.json`**.
- **2 migrations Supabase** mentionnent les noms en commentaire seulement (`20260603_rsa_v3_concours_v2_visual.sql:22`, `20260531_rsa_v25_concours_dashboard.sql:23`) — aucune contrainte SQL ne nomme une URL.

### 1.4 Surface en circulation (audit physique)

Au-delà du code, les URLs legacy vivent dans des artefacts hors repo :

| Vecteur | Estimation | Récupération |
|---|---|---|
| **QR codes imprimés / slides session** | 5 sessions qualif × 1 deck d'ouverture = ≤ 5 instances, déjà passées (sessions 2026-04-30 → 2026-05-21) | impossibles à modifier rétroactivement |
| **QR codes Grande Finale 26 mai 2026** | 1 deck imprimable | déjà préparé probablement |
| **Emails sortants déjà envoyés** (Outlook/Gmail historique) | post-session × 5 + finale invite × 1 + losers × 5 sessions | impossibles à réécrire |
| **Bookmarks rotariens** | `/RsaJuryHub`, `/RsaDashboard` (peu probable mais possible) | non quantifiable |
| **Emails sortants futurs (cycle 2026 restant)** | finale 26 mai + losers/winner finale = ~10 emails | maîtrisable côté caller |
| **Indexation Google** | aucune (host-gate Option A appliqué + pages probablement noindex sur le host plateforme) | non bloquant |

**Conclusion section 1.4** : la circulation passée est figée. Le levier réel = **les emails post-finale** (mai-juin 2026) et **les QR codes du prochain cycle 2027** (qui n'existent pas encore). Tout report au-delà de juin 2026 dilue le bénéfice.

### 1.5 Schéma logique du couplage

```
                       ┌──────────────────────────────────────────┐
                       │  V3 admin tabs (8 composants) + Concours │
                       │  hardcode `${origin}/RsaXxx?s=...`       │
                       └──────────────┬───────────────────────────┘
                                      │ emet URL string
                ┌─────────────────────┴───────────────────────┐
                │                                             │
                ▼                                             ▼
   ┌────────────────────────┐                  ┌──────────────────────────────┐
   │  Email body (FR/EN/DE) │ ← presse-papier  │  QR codes + copy buttons +   │
   │  copy-richtext         │   utilisateur    │  <a href> target=_blank      │
   └──────────┬─────────────┘                  └──────────────────────────────┘
              │ envoi via Outlook/Gmail
              ▼
   ┌────────────────────────┐
   │  Inbox juré / candidat │
   │  clic → app.rotary-startup.org/RsaScore?s=… │
   └──────────┬─────────────┘
              ▼
   ┌──────────────────────────────────┐
   │ React Router → src/pages/RsaScore.jsx (lazy chunk)
   │ rend la page legacy V1 telle quelle
   └──────────────────────────────────┘
```

**Clé** : chaque URL est **construite par concaténation de strings** côté composant V3. Il n'y a **pas de helper centralisé** (genre `legacyUrl(name, params)`) — la migration doit toucher ces 8+1 fichiers.

---

## 2. Les questions / problèmes indépendants

### 2.a — Quel mapping legacy → V3 fait sens fonctionnellement ?

| URL legacy | Remplaçant V3 naturel | Faisabilité |
|---|---|---|
| `/RsaScore?s={sessionId}` | `/Jury?session={id}` (sélection auto in-page) | **Moyen** — `/Jury` ne lit pas encore `?session=` ; il faudrait câbler `useSearchParams` dans `Jury.jsx` et faire pointer la sélection initiale sur cet ID. Auth-gate plus strict (`/Jury` exige login + rôle jury, alors que `/RsaScore` était open). **Risque UX** : un juré externe sans compte ne peut plus scorer. |
| `/RsaRecap?s={sessionId}` | `/Concours?session={id}` (drawer ouvert) ou `/Resultats?edition={…}` | **Faible-moyen** — `/Concours` peut ouvrir un drawer session via deep link (le `SessionDetailDrawer` existe déjà). `/Resultats` est édition-level pas session-level. À vérifier que le drawer Concours rend le détail jury (view=jury legacy). |
| `/RsaJuryHub` | `/Concours` (édition par défaut = open) | **Faible** — c'est le même rôle (vitrine concours). Mapping direct, juste différence éditoriale. |
| `/RsaDashboard` | `/MonDossier` (côté candidat) ou `/Admin` (côté admin) | **Mixte** — `RsaDashboard` est un god-component qui mélange dashboard candidat + cockpit admin (cf. `RsaDashboard:599,885` qui linkent `/RsaAdmin?k=…`). Pas un mapping 1-1. |
| `/RsaFinaleResults` | `/Resultats?edition=2026` | **Faible** — `/Resultats` est public anonyme, rôle équivalent. |
| `/RsaFinaleRsvp` | (pas d'équivalent V3 — page à conserver ou migrer indépendamment) | **Élevé** — `/RsaFinaleRsvp` accepte `?role=pitcher|jury|visitor&startup=&from=`. Pas de remplaçant V3 prêt. À garder. |
| `/RsaJuryForm` | `/DevenirJury` | **Faible** — même rôle, V3 déjà éditoriale. |
| `/RsaJuryView?s={id}` | `/JuryCandidate?…` (à vérifier) | **Inconnu** — peu de callers, faible enjeu. |
| `/RsaPrintSheets?s={id}` | (utilitaire admin, garder en l'état ou intégrer dans `/Admin?tab=setup&action=print`) | **Faible enjeu** — outil admin, pas de URL en circulation publique. |
| `/StartupUpload?t={token}` | (token-gated public, pas d'équivalent V3) | **Élevé** — `/StartupUpload` est un endpoint **public no-auth** sécurisé par token. Pas de remplaçant V3. **À garder.** |
| `/RsaAdmin` | `/Admin` (déjà mirror legacy via `?tab=&edition=&session=`) | **Faible** — `AdminShell.jsx:7-8,38` documente explicitement que `/Admin` mirror `?tab=&session=&edition=` du legacy `RsaAdmin`. Migration directe. |

**Conclusion 2.a** : sur 11 routes, **3 doivent rester** (RsaFinaleRsvp, RsaPrintSheets, StartupUpload) car aucune V3 équivalente n'existe. **4 ont un remplacement direct propre** (RsaJuryHub→Concours, RsaJuryForm→DevenirJury, RsaFinaleResults→Resultats, RsaAdmin→Admin). **4 demandent un câblage UI** (RsaScore→Jury+session_param, RsaRecap→Concours+drawer, RsaDashboard→MonDossier|Admin selon contexte, RsaJuryView→JuryCandidate).

### 2.b — Quels callers doivent être modifiés ?

Récapitulé en §1.3. **9 fichiers** (8 composants V3 admin + 1 composant public V3) émettent les URLs. **Aucune edge function ni cron Vercel à modifier.**

### 2.c — Comment gérer les QR codes / emails déjà en circulation ?

| Vecteur | Levier disponible | Coût |
|---|---|---|
| QR codes des 5 sessions qualif 2026 (déjà passées) | Redirect 301 `/RsaScore` → `/Jury?session=…` | 1 ligne de code Router, mais **rupture UX** (jurés externes sans compte ne peuvent plus scorer après redirect) — voir 2.a. |
| QR Grande Finale 26 mai 2026 (à 4 jours) | **Ne rien faire** — laisser `/RsaScore` actif jusqu'au lendemain de la finale. | 0 |
| Emails archivés (Gmail/Outlook utilisateurs jurés/candidats) | Redirect 301 préserve les liens | requis si on supprime un jour la page legacy |
| Bookmarks rotariens | Redirect 301 | idem |

**Verdict** : un redirect 301 React Router est **mécaniquement triviale** (`<Route path="/RsaScore" element={<Navigate to="/Jury" replace />}>`), mais **n'a de sens qu'après** avoir validé que la cible V3 sert le même cas d'usage (notamment auth-gate pour `/RsaScore`).

### 2.d — Sortie possible

Quatre options structurelles (analysées en §3) :

- **A. Status quo legacy** — décision µ5 déjà prise (court terme). Pas de migration URL, juste rangement.
- **B. Migration React Router avec redirects 301** — chaque `/RsaXxx` devient `<Navigate to="/Yyy" replace>`.
- **C. Réécriture inline des callers** — replacer `${origin}/RsaScore?s=…` par `${origin}/Jury?session=…` dans les 8+1 fichiers.
- **D. Hybride** — C en phase 1 (couper l'émission de nouvelles URLs legacy), B en phase 2 (intercepter les URLs résiduelles).

### 2.e — Risques

- **Casser les QR codes en circulation** : faible si on attend post-finale ; non négligeable si on push pendant le cycle actif.
- **Casser les emails in-flight** : nul tant qu'on touche au caller (les emails futurs sortent OK), élevé si on supprime la page legacy sans redirect.
- **Perdre les bookmarks rotariens** : faible (le concept est récent, peu de monde a bookmarké).
- **Régression UX si la cible V3 demande login alors que la legacy ne le demandait pas** (cas RsaScore → Jury). Risque sous-estimé. À vérifier sur chaque mapping.
- **Charge mentale persistante si on ne fait rien** : le diff `/Concours` vs `/RsaJuryHub` reste flou, chaque nouveau dev (ou Claude) doit relire pour savoir. Coût récurrent.

---

## 3. Options analysées

### Option A — Status quo legacy (décision µ5 déjà actée)

**Idée :** ranger les 11 fichiers dans `src/pages/legacy/`, garder les URLs `/RsaXxx` actives, ne modifier aucun caller. Le déplacement de dossier est cosmétique.

- **Pros** :
  - Zéro risque casseur (les URLs restent inchangées).
  - Zéro modification de QR / email en circulation.
  - Effort minimal (~30 min : `git mv` + ajuster imports `pages.config.js`).
  - Rangement visuel : le dossier `src/pages/` ne mélange plus V3 et legacy.
  - Décision déjà alignée avec le projet (cf. `refactor-sprint.md` µ6).
- **Cons** :
  - **Dette mentale non purgée** : 11 routes existent toujours dans le routeur, 8 composants V3 émettent encore les URLs legacy.
  - Le bundle final contient les chunks (mais lazy → pas pénalisant initial).
  - Surface RLS / sécurité à maintenir : tant que `RsaJuryHub` rend, ses queries Supabase doivent rester compatibles.
  - Risque de "fossilisation" : plus on tarde, plus c'est dur de migrer (les jurés/admins s'habituent aux URLs).
- **Effort** : **S** (30 min — rangement seul).
- **Risque** : **0** (refactor pur de chemin de fichier).
- **Rollback** : `git revert <sha>`.
- **Responsabilités utilisateur** : aucune.

### Option B — Migration React Router avec redirects 301

**Idée :** garder les pages legacy en place mais ajouter, dans `App.jsx` Routes, des `<Route path="/RsaScore" element={<Navigate to={…} replace />}>` qui interceptent l'URL et renvoient sur la cible V3. Le mapping `?s=…` → `?session=…` doit être fait dans un wrapper qui lit `useSearchParams` et reconstruit la nouvelle URL.

Implémentation type :

```jsx
// Wrapper helper qui mappe ?s=… → ?session=… en préservant les autres params
function LegacyRedirect({ to, paramMap = {} }) {
  const [params] = useSearchParams();
  const next = new URLSearchParams();
  for (const [k, v] of params) next.set(paramMap[k] || k, v);
  return <Navigate to={`${to}?${next.toString()}`} replace />;
}

// Dans App.jsx Routes :
<Route path="/RsaScore"        element={<LegacyRedirect to="/Jury"      paramMap={{ s: 'session' }} />} />
<Route path="/RsaRecap"        element={<LegacyRedirect to="/Concours"  paramMap={{ s: 'session' }} />} />
<Route path="/RsaJuryHub"      element={<Navigate to="/Concours" replace />} />
<Route path="/RsaJuryForm"     element={<Navigate to="/DevenirJury" replace />} />
<Route path="/RsaFinaleResults" element={<Navigate to="/Resultats" replace />} />
<Route path="/RsaAdmin"        element={<LegacyRedirect to="/Admin"     paramMap={{}} />} />
// Pages sans équivalent V3 — on garde le rendu legacy :
<Route path="/RsaFinaleRsvp"   element={<RsaFinaleRsvp />} />
<Route path="/StartupUpload"   element={<StartupUpload />} />
<Route path="/RsaPrintSheets"  element={<RsaPrintSheets />} />
<Route path="/RsaJuryView"     element={<RsaJuryView />} />
<Route path="/RsaDashboard"    element={<RsaDashboard />} />
```

- **Pros** :
  - **Compatibilité totale avec les QR codes et emails en circulation** : le clic atterrit sur la bonne URL V3.
  - **Permet de supprimer les pages legacy ciblées** une fois la redirection en place (gros gain LOC potentiel : ~3 600 LOC sur les 4 routes qui ont un mapping direct).
  - **Aucun changement de caller requis** dans un premier temps : on peut laisser `DecksTab` / `LiveTab` émettre `/RsaScore?s=…` et le router rebondit.
  - Réversible (revert routes).
- **Cons** :
  - **Risque UX bloquant** : `/RsaScore` était auth-libre (juré externe scorait sans compte) ; `/Jury` exige magic-link login → un juré non rotarien qui scanne le QR depuis son téléphone en intro de session se retrouve sur `/Login` au lieu de `/RsaScore`. **Showstopper pour le cycle 2026.**
  - Le mapping de search params est non-trivial pour 2 cas (`/RsaRecap?view=jury` n'a pas d'équivalent V3 prêt).
  - On laisse les callers V3 produire des URLs **mortes en cours** (`/RsaScore` ne rend plus rien, c'est un trampoline) — incohérence à debug si quelqu'un cherche pourquoi son URL "ne marche pas comme avant".
  - Si la cible V3 régresse (bug, downtime), tous les anciens vecteurs cassent en même temps.
- **Effort** : **M** (2-3h — wrapper + 7 routes + tests manuels + auth-gate à dégrader pour certaines cibles).
- **Risque** : **moyen-élevé** sur les routes auth-gated (`/RsaScore` notamment). Faible sur les autres.
- **Rollback** : revert du bloc Routes.
- **Responsabilités utilisateur** : valider chaque mapping (notamment cas `/RsaScore` → `/Jury` avec auth obligatoire — décision : on dégrade ou on garde la legacy ?).

### Option C — Réécriture inline des callers

**Idée :** modifier les 8 composants V3 admin + `SessionDetailDrawer` + `FinaleSection` pour qu'ils émettent les **nouvelles URLs V3** directement (`/Jury?session=…`, `/Concours`, `/Resultats`, etc.). Les pages legacy restent inchangées et accessibles directement, mais plus aucun nouveau lien V3 ne renvoie vers elles.

Pseudo-diff :

```diff
- // src/components/rsa/admin/JurorLinkQR.jsx:27
- const url = `${window.location.origin}/RsaScore?s=${sessionId}`;
+ const url = `${window.location.origin}/Jury?session=${sessionId}`;

- // src/components/rsa/admin/CommunicationsSection.jsx:539,565,591
- ${baseUrl}/RsaRecap?s=${session.id}
+ ${baseUrl}/Concours?session=${session.id}

- // src/components/rsa/admin/CommunicationsSection.jsx:543,569,595
- ${baseUrl}/RsaJuryHub
+ ${baseUrl}/Concours

- // src/components/rsa/admin/ResultsTab.jsx:354
- href="/RsaFinaleResults"
+ href="/Resultats"

- // src/components/rsa/concours-dashboard/FinaleSection.jsx:187
- to={createPageUrl('RsaFinaleRsvp')}
+ // pas de remplaçant V3 → on garde
```

Centraliser dans un helper :

```js
// src/lib/platform/urls.js (nouveau)
export const platformUrl = {
  juryScoring: (sessionId) => `/Jury?session=${encodeURIComponent(sessionId)}`,
  sessionRecap: (sessionId) => `/Concours?session=${encodeURIComponent(sessionId)}`,
  competition:  () => `/Concours`,
  results:      (editionId) => editionId ? `/Resultats?edition=${editionId}` : `/Resultats`,
  juryApply:    () => `/DevenirJury`,
  adminCockpit: (editionId, sessionId, tab='setup') => …,
  // legacy-only (no V3 equivalent) :
  finaleRsvp:   (role, params={}) => `/RsaFinaleRsvp?role=${role}&…`,
  startupUpload:(token) => `/StartupUpload?t=${token}`,
};
```

- **Pros** :
  - **Propre** : la sortie du code V3 ne pollue plus la base avec des URLs legacy.
  - **Pas de showstopper auth** : on choisit case-par-case quelle URL émettre (un juré externe → on continue à émettre `/RsaScore?s=…` jusqu'à ce que `/Jury` accepte les guest jurors, par exemple).
  - **Helper centralisé** = source unique de vérité, facile à muter ensuite.
  - Pas de surface routing modifiée (les pages legacy restent telles quelles).
  - Permet de **kill un sous-ensemble** des pages legacy plus tard (celles qui ne sont plus émises) sans toucher au router.
- **Cons** :
  - **Ne résout pas les vecteurs en circulation** (QR imprimés, emails déjà envoyés) — les anciens liens continuent de fonctionner mais ne sont plus mis à jour.
  - Réécriture des templates email FR/EN/DE = volume (3× pour `CommunicationsSection`).
  - **Risque sécurité** : si la nouvelle URL V3 expose des choses différentes (RLS plus lâche/strict), les vecteurs in-flight sont OK mais les nouveaux le sont sur une route différente — il faut hardening review parallèle.
- **Effort** : **M-L** (4-6h — toucher 9 fichiers, écrire helper, valider mapping, traduire 3 langues × 3 templates).
- **Risque** : **faible-moyen**. Mécanique simple, mais beaucoup de surface (emails, QR, deep links).
- **Rollback** : revert des 9 fichiers (chaque caller commit séparé idéalement).
- **Responsabilités utilisateur** : valider que chaque cible V3 sert bien le cas d'usage (un comité-admin qui clique sur un email recap test ressemble à quoi sur `/Concours?session=…` vs `/RsaRecap?s=…`).

### Option D — Hybride C-puis-B (progressif, opportuniste)

**Idée :** combiner C (réécrire les callers V3 pour arrêter d'émettre des URLs legacy) avec B (ajouter des redirects 301 plus tard, quand on veut supprimer les pages legacy).

**Phase 1 (immédiat, post-µ5)** :
- Réécrire les 9 callers via le helper `platformUrl` (Option C).
- Laisser les pages legacy en place dans `src/pages/legacy/` (Option A).
- Les anciens vecteurs (QR codes, emails) continuent de fonctionner — pas de rupture.
- Les nouveaux QR / emails pointent sur les URLs V3.

**Phase 2 (après le cycle 2026, fenêtre août-octobre 2026)** :
- Ajouter les redirects 301 dans `App.jsx` Routes (Option B), un par un, en validant la cible.
- Supprimer les pages legacy une fois les redirects en place (gain LOC ~3 600 sur les 4 routes simples).
- Garder `RsaFinaleRsvp`, `StartupUpload`, `RsaPrintSheets`, `RsaJuryView` (pas d'équivalent V3 — décider si V3 prend en charge plus tard).

**Phase 3 (cycle 2027)** :
- Une nouvelle saison commence avec uniquement les URLs V3 sortantes.
- Les redirects 301 peuvent rester indéfiniment (coût de maintenance = 1 ligne par redirect, ~6 lignes total).

- **Pros** :
  - **Aucune rupture pour les vecteurs en circulation** (QR session 2026 + emails déjà envoyés continuent de fonctionner).
  - **Coupe la dette à la source** : à partir de la phase 1, aucune nouvelle URL legacy n'est émise.
  - **Découplage temporel** : phase 1 = changement caller (faible risque, valide en local), phase 2 = changement routes (validation post-cycle, fenêtre quiète).
  - **Optionnellement réversible** par phase.
  - Couple bien avec la décision µ5 (legacy dans `src/pages/legacy/` + helper qui pointe ailleurs).
- **Cons** :
  - **Phase 1 + Phase 2 = deux sprints distincts** dans le calendrier (~2 mois entre les deux).
  - Pendant la phase 1, les pages legacy continuent d'exister et de servir : si un bug critique apparaît dans `RsaJuryHub`, on doit le patcher même si on prévoit de le tuer en phase 2.
  - Helper `platformUrl` à maintenir (mais c'est sa fonction — souhaitable).
- **Effort** : **M+L cumulé** (Phase 1 = M ~4h ; Phase 2 = M ~2h ; Phase 3 = trivial).
- **Risque** : **faible** par phase, **nul** pour les vecteurs en circulation.
- **Rollback** : per-phase, per-fichier.
- **Responsabilités utilisateur** :
  - Phase 1 : valider que les URLs V3 émises sont correctes (test des emails recap, test du QR copy depuis admin).
  - Phase 2 : valider chaque redirect (notamment auth-gate régression `/RsaScore` → `/Jury`).
  - Phase 3 : nettoyage tail (supprimer pages legacy non redirigées si elles sont vraiment mortes).

---

## 4. Recommandation

**Option D (Hybride), avec un déclencheur métier explicite.**

### Pourquoi D plutôt que les autres

| Critère | A (status quo) | B (redirects only) | C (callers only) | **D (hybride)** |
|---|---|---|---|---|
| Compat vecteurs en circulation | OK | OK (au prix d'auth-gate régression) | **Régression** (emails archivés ne sont plus mis à jour) | **OK** |
| Coupe dette à la source | ✗ | ✗ | OK | **OK** |
| Supprime LOC | ✗ | OK (~3 600 si suppression post-redirect) | ✗ | **OK (en phase 2)** |
| Casse auth juré externe | ✗ | **Risque élevé** | ✗ | **✗ (phase 1) → arbitré en phase 2** |
| Effort total | S | M | M-L | M+L |
| Réversible par étapes | trivial | bloc | par fichier | **par phase + par fichier** |

### Quand déclencher

**Phase 1 (callers V3) → après le µ5 (rangement legacy)**, idéalement dans le sprint qui suit. Aucun signal métier ne le justifie d'urgence, mais le coût d'attendre est borné : chaque mois supplémentaire = 0-2 emails sortants émis sur les anciennes URLs. Si on attend 3 mois, on a 0-6 emails de plus à archiver — non bloquant mais qu'on aurait pu éviter.

**Phase 2 (redirects 301) → fenêtre août-octobre 2026** (post-Grande Finale 26 mai 2026 + ~3 mois de recul). Signal métier :
- Aucun nouveau QR code émis (cycle 2026 fini, cycle 2027 pas commencé).
- Plus aucun email post-session sortant (les recap sont émis dans la semaine post-session, donc fini après 5 juin 2026).
- Période quiète sur la plateforme (vacances été, pause pré-V3.5).
- Si on attend la rentrée 2026 (septembre), Cycle 2027 démarre en novembre 2026 — fenêtre de 2-3 mois pour faire la phase 2 sans pression.

**Phase 3 (kill pages legacy redondantes) → janvier 2027**, juste avant le démarrage du cycle 2027, en validant qu'aucun rotarien n'a rapporté de broken link depuis la phase 2.

### Pour Option A pure (jamais migrer) : qu'est-ce que ça coûte ?

Si décision = jamais migrer (Option A indéfiniment) :

- **LOC bloqué** : ~5 600 LOC sur les 5 god-components legacy + ~2 000 LOC sur les 6 autres = **~7 600 LOC immobilisées**.
- **Bundle perf** : nul (lazy chunks V3 Vague 4 isolent).
- **Surface RLS à auditer** : chaque page legacy fait ses propres queries Supabase → la table `jury_profiles`, `jury_scores`, `session_config` doit garder une RLS compatible legacy + V3 (les deux schémas coexistent dans `lib/db.js` + `lib/rsa/entities/`).
- **Dette mentale** : pour chaque nouvelle feature touchant une session/jury, le dev doit comprendre les deux univers (legacy `JuryScore` vs V3 `selection_reviews`). Coût estimé : +20% temps sur tout ce qui touche jury/scoring.
- **Risque de divergence** : un bug fixé côté V3 peut rester côté legacy si le caller V3 émet encore `/RsaScore?s=…`. On peut se retrouver avec deux comportements différents pour la "même" page.
- **Surface a11y/i18n** : les pages legacy ne sont pas aux standards a11y/i18n V3 (cf. trilogie design upgrade). Si un audit a11y AA est rendu obligatoire, il faut tout reprendre.

**Verdict A indéfini** : viable, mais coût récurrent ~+5h/mois de "rappels mentaux" et risque ~+10h/an de bugs liés à la divergence. Sur 12 mois = ~70h cumulés. C'est le coût d'opportunité de ne pas faire D phase 1 (qui coûte ~4h).

---

## 5. Playbook step-by-step — Option D (si validé)

### 5.1 Préparation (10 min)

1. Créer `src/lib/platform/urls.js` avec le helper `platformUrl` (cf. exemple §3 Option C).
2. Inventorier les mappings : pour chaque URL legacy émise par V3, écrire la cible V3 dans le helper. Inclure les paramètres translation (`s` → `session`).
3. Lister explicitement les 3 URLs sans équivalent V3 (`/RsaFinaleRsvp`, `/StartupUpload`, `/RsaPrintSheets`) dans le helper avec un commentaire "legacy-only".

### 5.2 Phase 1 — Réécriture callers (4h, micro-vagues)

Ordonné du moins risqué au plus risqué :

| Sous-vague | Fichiers | Effort | Risque |
|---|---|---|---|
| µ-call-1 | `JurorLinkQR.jsx`, `LiveTab.jsx`, `SetupTab.jsx` (3× `/RsaScore` → `/Jury?session=…`) | 30 min | Faible (UI admin seul) |
| µ-call-2 | `SessionDetailDrawer.jsx`, `FinaleSection.jsx` (Concours public) | 20 min | Faible |
| µ-call-3 | `ResultsTab.jsx` (3 CTA admin) | 20 min | Faible |
| µ-call-4 | `DecksTab.jsx` (2 occurences `/RsaScore`) | 30 min | Faible |
| µ-call-5 | `FinaleEmailsSection.jsx` (template variables `{SCORING_URL}`, `{JURYHUB_URL}`) | 45 min | **Moyen** (les templates email sont copiés en local storage `rsa_fin_email_…` — un user qui a déjà personnalisé son template **conservera l'ancienne URL en cache**. À documenter dans le report.) |
| µ-call-6 | `CommunicationsSection.jsx` (3 templates FR/EN/DE × 3 URLs = 9 strings) | 60 min | Moyen (idem template cache) |
| µ-call-7 | `RsvpTab.jsx` (1 copyShareLink — peut rester `/RsaFinaleRsvp` car pas d'équivalent V3) | 5 min | 0 |

Total : ~3h-4h. Chaque sous-vague = 1 commit, 1 build verify.

### 5.3 Phase 2 — Redirects React Router (2h, déclenchée septembre 2026)

1. Ajouter dans `App.jsx` (juste avant le `.map(Pages)`) un bloc Routes explicit pour les 4 URLs avec mapping direct :

```jsx
<Route path="/RsaJuryHub"       element={<Navigate to="/Concours" replace />} />
<Route path="/RsaJuryForm"      element={<Navigate to="/DevenirJury" replace />} />
<Route path="/RsaFinaleResults" element={<Navigate to="/Resultats" replace />} />
<Route path="/RsaAdmin"         element={<LegacyRedirect to="/Admin" />} />
```

2. Pour les URLs avec params (`/RsaScore?s=…`, `/RsaRecap?s=…`), utiliser le wrapper `LegacyRedirect` (cf. §3 Option B). **Décider du fallback auth** :
   - Si `/Jury` reste auth-only → ajouter `?as=guest` ou un mode invité sur `/Jury` (feature séparée).
   - Sinon : garder `/RsaScore` en passe-plat (pas de redirect) jusqu'à ce que `/Jury` accepte les guest jurors.

3. Retirer du `pages.config.js` les pages dont la cible V3 est validée et qui n'ont plus aucun caller V3 (`RsaJuryHub`, `RsaJuryForm`, `RsaFinaleResults`, éventuellement `RsaAdmin`).

4. Supprimer les fichiers correspondants de `src/pages/legacy/` (gain ~3 600 LOC).

### 5.4 Verifications post-phase

- **Phase 1** :
  - Tester chaque caller V3 (cliquer copy-link, vérifier URL résultante).
  - Test cross-browser un email recap copié-collé dans Gmail (les `<a href="/Concours?session=…">` doivent être valides).
  - Test QR : `JurorLinkQR` doit afficher un QR pointant sur `/Jury?session=…`.
- **Phase 2** :
  - Tester `app.rotary-startup.org/RsaJuryHub` → atterrir sur `/Concours`.
  - Tester `app.rotary-startup.org/RsaScore?s=s3_tech` → atterrir sur `/Jury?session=s3_tech` (ou rester sur la page legacy si décidé).
  - Test 404 sur les pages supprimées → assurer que `PageNotFound` affiche un message clair (cf. `src/lib/PageNotFound.jsx`).

### 5.5 Rollback

- Phase 1 : revert per-fichier (chaque sous-vague est commit isolé). Helper `platformUrl` reste intact (export inutilisé temporairement).
- Phase 2 : revert du bloc redirect → routes legacy reprennent leur comportement précédent.
- Phase 3 : restaurer le fichier supprimé depuis l'historique git.

---

## 6. Invariants à préserver

Toute phase doit valider ces points avant merge :

1. **QR codes en circulation cycle 2026** — vérif : tant qu'un QR `/RsaScore?s=…` existe physiquement (slide, email), la route doit servir une page utile (legacy ou redirect propre). Réf : §1.4.
2. **Auth-gate `/Jury`** — vérif : si phase 2 redirige `/RsaScore` vers `/Jury`, mesurer impact sur les jurés sans compte. Réf : `Jury.jsx:62-95` (gate `isJury || isAdmin`).
3. **Templates email localStorage** — vérif : un admin qui a déjà personnalisé un template dans `FinaleEmailsSection` (key `rsa_fin_email_*`) ou `CommunicationsSection` doit recevoir un toast / message indiquant que ses URLs intégrées sont obsolètes. Réf : `FinaleEmailsSection.jsx:422-423`.
4. **`/StartupUpload?t=…`** — vérif : ce endpoint **doit rester intact** (token-gated public, aucune V3 alternative). Réf : `DecksTab.jsx:1028`, `StartupUpload.jsx:1-50`.
5. **`/RsaFinaleRsvp`** — vérif : 3 rôles (pitcher/jury/visitor) doivent rester accessibles. Réf : `CommunicationsSection.jsx:446,609,713`.
6. **Liens depuis pages legacy entre elles** — vérif : `RsaAdmin → RsaDashboard`, `RsaRecap → RsaAdmin`, `RsaDashboard → RsaJuryHub/RsaJuryForm/RsaAdmin/RsaScore` doivent continuer de fonctionner tant que les pages source ne sont pas tuées. Réf : §1.3 dernières lignes.
7. **Single-flight loadIdentity** — vérif : pas de double `loadIdentity` introduit par un changement d'auth-gate sur `/Jury`. Réf : `auth.jsx`, mémoire `project_auth_lock_storm_fix`.
8. **Helper centralisé** — vérif : `src/lib/platform/urls.js` reste la source unique de vérité après phase 1. Pas de concaténation inline `/Rsa…` réintroduite (lint check optionnel).

---

## 7. Annexe — known unknowns à confirmer avec Mathieu

1. **Auth-gate `/Jury` accepte-t-il les jurés externes sans compte ?**
   Si NON (comportement actuel) → la phase 2 ne peut PAS rediriger `/RsaScore` vers `/Jury` sans rupture UX pour les jurés walk-in. À résoudre soit en gardant `/RsaScore` indéfiniment, soit en ajoutant un mode invité à `/Jury` (feature à scoper séparément).

2. **`/RsaJuryView` est-il utilisé en pratique ?**
   Aucun caller V3 trouvé. Aucun caller legacy non plus dans le grep initial. Si zéro usage → candidat à kill direct, sans redirect. À confirmer par audit logs Vercel.

3. **`/RsaPrintSheets` doit-il devenir une route V3 (e.g. `/Admin?tab=setup&action=print`) ou rester un outil isolé ?**
   Pas de caller externe, c'est un endpoint admin utilitaire (impression A4). Migration faible enjeu. Décision : conserver tel quel, déplacer plus tard si refonte admin.

4. **Politique sur les `localStorage` templates personnalisés (`rsa_fin_email_*`)**
   Un admin qui a édité un template avant phase 1 conservera l'ancienne URL `/RsaScore?s=final_grande` en cache. Faut-il :
   (a) bumper une version de schema (`rsa_fin_email_v2_*`) pour forcer reload des defaults ? — recommandé
   (b) afficher un toast "vos templates contiennent peut-être des liens obsolètes" ?
   (c) laisser tel quel (l'admin verra à la prochaine édition) ?

5. **`/Concours?session=…` accepte-t-il le deep link ?**
   `Concours.jsx:62` n'utilise pas `useSearchParams` à ce jour. Pour la phase 1 µ-call-2 et la phase 2, il faut **câbler le deep link** dans `Concours.jsx` (ouvrir le drawer sur la session ciblée). Effort estimé : 30 min, à ajouter au scope phase 1.

6. **Liens `RsaDashboard:599,885,1278` `/RsaAdmin?k={VITE_RSA_ADMIN_KEY}`**
   `RsaDashboard` fait des liens admin qui injectent une env var de clé. Si on tue `RsaDashboard` un jour, est-ce qu'il y a un consommateur de cette clé hors composants V3 ? Si oui, conserver le mécanisme côté `/Admin` V3.

7. **i18n des emails recap**
   `CommunicationsSection.jsx` rend les templates en FR/EN/DE avec URLs hardcodées. Si on bascule sur `/Concours?session=…`, le `?session=` reste universel. OK. Si on garde `/RsaJuryHub`, idem. Pas de blocker i18n.

8. **SEO / indexation**
   Les pages legacy sont-elles indexées sur `app.rotary-startup.org` ? Si oui, un redirect 301 préserve le SEO. Si elles sont noindex (probable cf. host-gate Option A) → pas d'enjeu. À confirmer via `robots.txt` + `<meta name="robots">` côté pages legacy.

9. **Volume réel de QR codes émis cycle 2026**
   §1.4 estime ≤ 6 instances (5 qualif + finale). Confirmer auprès de Mathieu : nombre de slides ouvertes en session, et si certains QR ont été imprimés sur des supports physiques (flyers, kakemonos).

10. **Cycle 2027 — décision de plateforme cible**
    En 2027, les nouvelles sessions seront-elles servies par `/Jury` + `/Concours` exclusivement, ou faudra-t-il garder `/RsaScore` pour des jurés externes ? Cette décision impacte le timing de phase 2.

---

## 8. Résumé exécutif — 6 décisions à prendre

1. **Choix d'option** : valider Option D (hybride), ou rester sur Option A indéfiniment ?
   → Recommandation : **D**. Coût d'opportunité estimé : ~70h cumulés sur 12 mois si A indéfini, vs ~6h cumulés sur D phase 1+2.

2. **Déclencheur phase 1** : démarrer après µ5 (rangement legacy) ou attendre plus tard ?
   → Recommandation : **enchaîner après µ5** dans le sprint courant. Pas de signal métier qui bloque.

3. **Déclencheur phase 2 (redirects)** : septembre 2026 (post-cycle, pré-rentrée) ou décembre 2026 (juste avant cycle 2027) ?
   → Recommandation : **septembre 2026**. Fenêtre quiète, 3 mois de recul post-finale, marge avant cycle 2027.

4. **Cas `/RsaScore` → `/Jury`** : ajouter un mode invité à `/Jury` (pour jurés externes sans compte) ou garder `/RsaScore` indéfiniment ?
   → Recommandation : **garder `/RsaScore` indéfiniment** tant que la décision sur le mode invité n'est pas prise. Phase 2 n'inclut PAS de redirect `/RsaScore` par défaut.

5. **Politique localStorage templates personnalisés** : bumper schema (v2), afficher toast, ou laisser tel quel ?
   → Recommandation : **bumper schema** (`rsa_fin_email_v2_*`) en phase 1, avec migration auto qui re-fetch les defaults si v1 contient `/RsaScore` ou `/RsaRecap`.

6. **Suppression des pages legacy redondantes en phase 3** : oui, mais lesquelles ?
   → Recommandation : kill `/RsaJuryHub`, `/RsaJuryForm`, `/RsaFinaleResults` (4 ~ 1 700 LOC) ; **conserver** `/RsaScore`, `/RsaRecap`, `/RsaDashboard`, `/RsaAdmin`, `/RsaFinaleRsvp`, `/StartupUpload`, `/RsaPrintSheets`, `/RsaJuryView` tant que les critères ne sont pas tous remplis (auth invité, deep link Concours, etc.).

**Fichiers de référence cités :**
- `src/App.jsx:180-198` (mounting routes)
- `src/pages.config.js:67-101` (PAGES dict)
- `src/Layout.jsx:9` (STANDALONE_PAGES Set)
- `src/components/rsa/admin/JurorLinkQR.jsx:27` (QR scoring URL)
- `src/components/rsa/admin/LiveTab.jsx:152,190` (copy juror link + preview)
- `src/components/rsa/admin/SetupTab.jsx:177,219` (copy juror + print sheets)
- `src/components/rsa/admin/DecksTab.jsx:1028,1096,1175` (upload URL + scoring URL)
- `src/components/rsa/admin/FinaleEmailsSection.jsx:361-365` (template variables finale)
- `src/components/rsa/admin/CommunicationsSection.jsx:446,539-543,565-569,591-595,609,713` (emails post-session + finale jury invite)
- `src/components/rsa/admin/ResultsTab.jsx:354,367,378` (CTA palmarès + recap)
- `src/components/rsa/admin/RsvpTab.jsx:207` (copy share link)
- `src/components/rsa/concours-dashboard/SessionDetailDrawer.jsx:269` (scoring URL in drawer)
- `src/components/rsa/concours-dashboard/FinaleSection.jsx:187` (CTA RSVP)
- `src/components/rsa/admin/platform/AdminShell.jsx:7-8,38` (mirror legacy RsaAdmin)
- `src/pages/RsaDashboard.jsx:275-276,587-588,599,883-885,960,1171-1172,1253,1256,1278` (liens internes legacy)
- `src/pages/RsaAdmin.jsx:197` (→ RsaDashboard)
- `src/pages/RsaRecap.jsx:353` (→ RsaAdmin)
- `src/pages/RsaJuryHub.jsx:546,562,633,941` (→ RsaJuryForm, RsaRecap, RsaFinaleRsvp)
- Docs : `docs/deepsolve/refactor-sprint.md` §1.2-1.3 (cartographie sous-systèmes), `docs/REFACTOR-MAIN.md` annexe (état µ5 + URLs runtime à migrer), `docs/deepsolve/deploy-and-lunch-app-isolation.md` (format de référence).
- Mémoire : `project_rsa_v3_b2b_pivot`, `project_design_upgrade_trilogy`, `project_concours_v2_visual_pattern`, `project_rsa_v3_role_hierarchy`.
