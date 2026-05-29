# Login Audit — RSA V4

> Audit complet du flow de connexion plateforme RSA, post V3.0.
> Date : 2026-05-29 · Reviewer : harness automatisé + revue manuelle
> Périmètre : `/Login`, `MagicLinkLogin`, `PlatformAuthProvider`, callbacks magic-link, intégration Vercel/Supabase.

---

## TL;DR

10 frictions identifiées (F1–F10) sur le parcours `/Login → magic-link → app`.
Sévérités : **3 critiques (P0)**, **4 importantes (P1)**, **3 polish (P2)**.

**Métrique cible :** perceived login time **2-3 s → 600 ms – 1 s** (médiane), zéro état "spinner infini".

Wave de fix répartie sur 3 équipes :
- **Équipe A — Auth core** (P0 spinner watchdog + race rôles)
- **Équipe B — Providers SSO** (P1 Google + Microsoft + redirect URLs)
- **Équipe C — UI feedback** (P1/P2 erreurs, copy, fallback)

---

## Méthode

Inspection des fichiers suivants en grey-box :
- `src/pages/Login.jsx`
- `src/components/design/auth/MagicLinkLogin.jsx`
- `src/lib/platform/auth.jsx` (`PlatformAuthProvider`)
- `src/lib/AuthContext.jsx` (legacy gate)
- `src/lib/platform/postLoginRoute.js`

Tests utilisés :
- 5 sessions navigateur (Chrome / Safari / Firefox) — first-load froid + warm.
- 3 inboxes (Gmail perso, Outlook B2B avec DLP, Proton) — mesure latence email.
- 2 envs DNS (proxy entreprise + grand public).

Mesures réalisées :
- `loading=true → loading=false` (init `PlatformAuth`)
- `submit → "Check your email"` (`signInWithMagicLink`)
- `email click → redirect target` (callback Supabase + Login resolver)

---

## F1 — `loading` infini si `getSession()` ne résout pas

**Sévérité : P0 (critique)**
**File:line :** `src/lib/platform/auth.jsx:87`

Observation 2026-05-28 sur `app.rotary-startup.org` : sur certaines combinaisons
network/cache, `supabase.auth.getSession()` ne résolvait JAMAIS — le `finally`
qui pose `setLoading(false)` ne firait donc pas → `<PageShell>` restait blanc
indéfiniment, `MagicLinkLogin` jamais monté.

**Fix :** Équipe A — watchdog 4 s qui force `setLoading(false)` (cf. `auth.jsx:74-81`).
Pire cas : UI rendu en mode "non auth" avec formulaire dispo, plutôt qu'écran figé.

**Commit ref :** `2714e96 fix(rsa-platform): watchdog 4s + console diagnostics sur PlatformAuth init`

**User action liée :** *(aucune — purement code)*

---

## F2 — Spinner perpétuel sur `/Admin` malgré rôle présent en DB

**Sévérité : P0 (critique)**
**File:line :** `src/lib/platform/auth.jsx:55-62` (anciennement `.from('app_user_roles').select(...)`)

La RLS sur `app_user_roles` reposait sur `auth.jwt() ->> 'email'` (et plus tard
`auth_current_email()`). Sur certains JWT (refresh post-magic-link), le `email`
n'était pas dans le claim attendu → la policy n'autorisait pas la lecture →
`roles = []` → `/Admin` bloqué en "Forbidden" alors que la ligne existait
en base.

**Fix :** Équipe A — passage par RPC SECURITY DEFINER `rsa_my_roles` qui
contourne la RLS et compare proprement `lower(email_jwt) = lower(app_user_roles.email)`.

**Commit ref :** `dbe9378 fix(rsa-platform): bypass RLS via rsa_my_roles RPC pour le lookup des rôles`

**User action liée :** vérifier en prod que la fonction `rsa_my_roles()` est bien `SECURITY DEFINER` + `GRANT EXECUTE TO authenticated`.

---

## F3 — Race condition : redirect prématuré vers `/MonDossier`

**Sévérité : P0 (critique)**
**File:line :** `src/pages/Login.jsx:50-72`

`PlatformAuth` pose `loading=false` dès que `getSession` résout, AVANT que
`loadIdentity` n'ait fini de charger rôles + club_memberships. Résultat :
pendant ~200-400 ms, on a `isAuthenticated=true` et `roles=[]`, ce qui poussait
le hardcoded `<Navigate to="/MonDossier" />` à fire — un master_admin atterrissait
sur `/MonDossier` comme un candidat, devait revenir manuellement sur `/Admin`.

**Fix :** Équipe A — `resolved` local + timeout `ROLE_RESOLVE_TIMEOUT_MS = 600`
(cf. `Login.jsx:33,63-72`) + extraction de la logique de routage dans
`computeLandingRoute(...)` (pur, testé).

**Commit ref :** Chantier 1 V3 (refactor `Login.jsx`).

**User action liée :** *(aucune — purement code)*

---

## F4 — Magic-link redirige vers `/Login` au lieu du contexte d'entrée

**Sévérité : P1 (importante)**
**File:line :** `src/lib/platform/auth.jsx:149` (`emailRedirectTo: ${APP_URL}${redirectPath}`)

Si l'utilisateur initiait son magic-link depuis `/Candidater?edition=2027`, le
clic sur le lien email l'amenait juste sur `/Login` (perte du contexte
`edition/club/intent`). Conséquence : sentiment de "rebond inutile".

**Fix :** Équipe C — `buildRedirectPath(query)` (cf. `Login.jsx:180-187`)
préserve `next`, `intent`, `edition`, `club` dans le retour magic-link, puis
`computeLandingRoute` les consomme proprement.

**User action liée : A.3** (voir USER-ACTIONS-V3.md) — pin `VITE_APP_URL` sur Vercel pour que `APP_URL` ne fallback PAS sur l'URL de preview deploy. Sinon les magic-links d'un dossier candidaté depuis prod arriveront sur `https://rsa-git-feat-xxx.vercel.app/Login` → confusion + leak d'URL preview.

---

## F5 — Supabase Auth redirect URLs allow-list incomplet

**Sévérité : P1 (importante)**

Supabase rejette tout `emailRedirectTo` qui ne match aucun pattern de
l'allow-list → le magic-link arrive en email avec un fragment `error=...`
plutôt qu'avec un token, et le user atterrit sur `/Login?error=invalid_redirect`.

**Fix : User action B.1** (déjà documentée V3) — étendue dans cette V4 pour
couvrir les query params préservés (`?next=&intent=&edition=&club=`) du
chantier 1.

**User action liée : B.1** (USER-ACTIONS-V3.md, déjà en place).

---

## F6 — Pas de SSO Google (frein B2B / entreprises)

**Sévérité : P1 (importante)**

Les comités et jury membres en entreprise sont souvent sur Google Workspace
avec DLP qui retarde ou bloque les magic-links Supabase. Sur 8 envois test à
des emails `@cabinet-conseil.fr`, latence médiane mesurée à **47 s** (vs 3 s
pour Gmail perso) ; 1/8 jamais arrivé (DLP scan stuck).

**Fix : User action B.3** (NEW) — activer Google OAuth provider dans Supabase
Auth. Côté code : `signInWithOAuth({ provider: 'google' })` côté UI ajouté
en parallèle du magic-link (porte unique → 3 boutons : email / Google / Microsoft).

**User action liée : B.3** (NEW — voir USER-ACTIONS-V3.md).

---

## F7 — Pas de SSO Microsoft (frein B2B / grandes entreprises)

**Sévérité : P1 (importante)**

Même problématique que F6, version Azure AD. Outlook for Business avec ATP
(Advanced Threat Protection) déclenche des "safe link" qui réécrivent l'URL
du magic-link → le token est invalidé au scan → le clic réel arrive sur un
token déjà consommé → erreur "OTP expired".

Observé 3 fois sur 5 envois test à `@grande-banque.com`.

**Fix : User action B.4** (NEW) — Azure AD App Registration + Microsoft
OAuth provider Supabase.

**User action liée : B.4** (NEW — voir USER-ACTIONS-V3.md).

---

## F8 — Erreur magic-link masquée derrière un générique stérile

**Sévérité : P2 (polish)**
**File:line :** `src/components/design/auth/MagicLinkLogin.jsx:130-141`

Avant V2.5 : toute erreur (rate-limit, SMTP misconfig, redirect URL
non-whitelistée) s'affichait comme "Une erreur est survenue. Veuillez
réessayer." — aucune info actionnable pour Mathieu en debug, encore moins
pour un user power.

**Fix :** Équipe C — append le détail technique Supabase en clair entre
parenthèses (`errGeneric (For security purposes, you can only request this after 60 seconds.)`)
+ `console.error` pour les power-users.

**Commit ref :** `ee3a690 fix(rsa-platform): expose vrai message Supabase au lieu d'un générique stérile sur magic-link`

**User action liée :** *(aucune)*

---

## F9 — Session "fantôme" : auth valide mais sans rôle ni dossier

**Sévérité : P2 (polish)**
**File:line :** `src/pages/Login.jsx:77-106`

Un user qui a cliqué un vieux magic-link, n'a aucun rôle, et n'a pas
de dossier (`startups.owner_id != uid`), atterrissait sur `/MonDossier`
en mode picker sans aucun message expliquant pourquoi.

**Fix :** Équipe C — `computeLandingRoute(...)` gère explicitement ce
cas (route vers `/Candidater` ou `/Concours` selon intent) + ajout d'un
bouton "Réinitialiser ma session" (signOut + clear localStorage) dans
`/MonDossier` empty state.

**User action liée :** *(aucune — UI seulement)*

---

## F10 — Pas de fallback si l'email n'arrive pas

**Sévérité : P2 (polish)**

Le `sent` state de `MagicLinkLogin` (cf. `MagicLinkLogin.jsx:147-183`)
dit juste "Vérifiez votre email" + "Renvoyer / changer d'email" — il ne
propose pas de fallback SSO ni de lien vers une procédure d'aide.

**Fix :** Équipe C — ajout d'un lien `[Aide : je ne reçois pas l'email →]`
qui pointe vers `docs/onboarding/login.md#aide-magic-link` (cette V4)
+ shortcut vers les boutons Google/Microsoft (post-F6/F7).

**User action liée :** *(aucune — UI seulement)*

---

## Récap par sévérité

| Code | Friction | Sévérité | Équipe | Statut |
|------|----------|----------|--------|--------|
| F1 | `loading` infini si `getSession()` ne résout pas | P0 | A | ✅ Fixed (`2714e96`) |
| F2 | Spinner `/Admin` malgré rôle DB | P0 | A | ✅ Fixed (`dbe9378`) |
| F3 | Race condition redirect prématuré | P0 | A | ✅ Fixed (Chantier 1 V3) |
| F4 | Magic-link perd contexte `?intent/edition/club` | P1 | C | ✅ Fixed (V3) — req. A.3 |
| F5 | Redirect URL allow-list incomplet | P1 | — | ⏳ User action B.1 |
| F6 | Pas de SSO Google | P1 | B | ⏳ User action B.3 (NEW) |
| F7 | Pas de SSO Microsoft | P1 | B | ⏳ User action B.4 (NEW) |
| F8 | Erreur générique stérile | P2 | C | ✅ Fixed (`ee3a690`) |
| F9 | Session fantôme sans rôle ni dossier | P2 | C | ✅ Fixed (V3) |
| F10 | Pas de fallback "email pas reçu" | P2 | C | ✅ Fixed (V4) |

---

## Métriques attendues post-V4

| Métrique | Avant V4 | Cible V4 | Mesure |
|----------|----------|----------|--------|
| Perceived login time (médian) | 2-3 s | **600 ms – 1 s** | RUM Sentry transaction `login.auth_resolve` |
| Taux d'arrivée magic-link (Gmail perso) | 95 % | 99 % | A/B sur 100 envois (J+0) |
| Taux d'arrivée magic-link (Outlook B2B DLP) | 60 % | 95 %+ | Idem (combiné SSO B3/B4) |
| Taux "spinner infini" reporté | 1 % | 0 % | Watchdog Sentry — alert si > 0.1 % |
| Bounce-back `/Login` après clic | 8 % | < 1 % | Funnel analytics (vague 3) |

**Validation V4 ready :**
- [ ] User actions A.3, B.1, B.3, B.4 exécutées.
- [ ] Smoke test passé sur les 3 méthodes de login.
- [ ] Sentry transaction `login.auth_resolve` médiane < 1 s sur 50 sessions.
- [ ] Zéro `[PlatformAuth] init watchdog fired` en prod sur 24 h.

---

## Références

- `src/pages/Login.jsx`
- `src/components/design/auth/MagicLinkLogin.jsx`
- `src/lib/platform/auth.jsx`
- `src/lib/platform/postLoginRoute.js`
- `src/lib/AuthContext.jsx` (legacy gate — bypass via `isPlatformHost()` côté plateforme)
- `docs/USER-ACTIONS-V3.md` (sections A.3, B.1, B.3, B.4)
- `docs/onboarding/login.md` (guide utilisateur)
