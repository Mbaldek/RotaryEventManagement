# SSO setup — Google + Microsoft (Azure AD)

> Configuration des providers OAuth Google + Microsoft pour la plateforme RSA.
> Livré en V3.0 (équipe C). Indispensable pour les jurés CEO de grands groupes
> dont l'email DLP/throttling bloque les magic-links Resend.

## Pourquoi du SSO ?

- **Magic-links bouncent côté entreprise** : Outlook 365 / Gmail entreprise avec
  DLP strict marquent souvent les emails Resend comme suspects (lien externe →
  quarantaine), ou les délais SMTP dépassent la fenêtre de validité du token
  (1h par défaut Supabase).
- **Sans SSO, les jurés CEO ne peuvent simplement pas se connecter.** Cible V3 :
  Roularta, Doctolib, Mistral, etc.
- **Avec SSO Google / Microsoft**, le user clique "Continuer avec Google" → flow
  OAuth standard via le navigateur (pas d'email), revient connecté en 5 secondes.

## Code livré (équipe C, automatique)

- `src/lib/platform/auth.jsx` expose `signInWithGoogle(redirectPath)` et
  `signInWithMicrosoft(redirectPath)`. Les deux appellent `supabase.auth.signInWithOAuth`
  avec `redirectTo: APP_URL + redirectPath`.
- `src/components/design/auth/MagicLinkLogin.jsx` affiche 2 boutons SSO
  (Google + Microsoft) AU-DESSUS du form magic-link, séparés par un divider
  "OU / OR / ODER". SVG officiels inline (G Google multi-color + 4-carrés MS).
  Le form magic-link reste accessible en-dessous.
- i18n FR / EN / DE complet.

## USER ACTIONS — config providers

### 1. Google Cloud Console — OAuth 2.0 Client ID

1. https://console.cloud.google.com/ → créer ou réutiliser un projet (`rsa-platform-prod`).
2. **APIs & Services** → **OAuth consent screen** :
   - User type : **External**
   - App name : "Rotary Startup Award"
   - User support email : `contact@rotary-startup.org`
   - Authorized domains : `rotary-startup.org`, `supabase.co`
   - Scopes : `email`, `profile`, `openid` (par défaut)
   - Publishing status : **In production** (sinon limite à 100 testers + warning)
3. **Credentials** → **Create credentials** → **OAuth 2.0 Client ID** :
   - Application type : **Web application**
   - Name : "RSA Platform — Supabase"
   - **Authorized JavaScript origins** :
     - `https://app.rotary-startup.org`
     - `http://localhost:5173` (dev)
   - **Authorized redirect URIs** :
     - `https://uaoucznptxmvhhytapso.supabase.co/auth/v1/callback`
4. Copier **Client ID** + **Client secret** → coller dans Supabase (étape 3).

### 2. Microsoft Azure AD — App Registration

1. https://portal.azure.com/ → **Azure Active Directory** (ou Microsoft Entra ID).
2. **App registrations** → **New registration** :
   - Name : "Rotary Startup Award — Supabase"
   - Supported account types : **Accounts in any organizational directory (multi-tenant) and personal Microsoft accounts** (sinon les CEOs d'autres tenants ne peuvent pas se connecter)
   - Redirect URI : **Web** → `https://uaoucznptxmvhhytapso.supabase.co/auth/v1/callback`
3. Une fois créé, noter **Application (client) ID**.
4. **Certificates & secrets** → **New client secret** :
   - Description : "Supabase prod"
   - Expires : **24 months** (à renouveler avant expiration sinon SSO down)
   - Copier la **Value** immédiatement (Azure ne la ré-affiche jamais).
5. **API permissions** → vérifier qu'il y a `Microsoft Graph` → `User.Read` + `email`
   + `openid` + `profile`. Si manquant, ajouter via "Add a permission".

### 3. Supabase Dashboard — activer les providers

1. https://supabase.com/dashboard → projet `uaoucznptxmvhhytapso` → **Authentication** → **Providers**.
2. **Google** :
   - Enable : ON
   - Client ID : (étape 1.4)
   - Client Secret : (étape 1.4)
   - Authorized Client IDs : laisser vide
   - Save
3. **Azure (Microsoft)** :
   - Enable : ON
   - Application (client) ID : (étape 2.3)
   - Secret Value : (étape 2.4)
   - Azure Tenant URL : `https://login.microsoftonline.com/common` (pour multi-tenant)
   - Save

### 4. Supabase Dashboard — Redirect URLs allow-list

Indispensable, sinon le callback OAuth est rejeté.

**Authentication** → **URL Configuration** → **Redirect URLs** → ajouter (en plus
des magic-links existants — cf. `docs/USER-ACTIONS-V3.md` §B.1) :

- `https://app.rotary-startup.org/`
- `https://app.rotary-startup.org/Login`
- `https://app.rotary-startup.org/Jury`
- `https://app.rotary-startup.org/MonDossier`
- `http://localhost:5173/` (dev)
- `http://localhost:5173/Login` (dev)

> Tous les redirectPath utilisés dans l'app comme cible post-SSO doivent être
> dans cette liste. Wildcard `*` autorisé en suffixe : `https://app.rotary-startup.org/*`
> évite de tout lister, mais Supabase recommande d'être explicite.

## Validation

Smoke test après config :

1. Ouvrir https://app.rotary-startup.org/Login en incognito.
2. Cliquer **"Continuer avec Google"** → redirect Google → "Sélectionner un compte" →
   accepter le consent screen → revient sur `/` connecté (avatar visible si role).
3. Logout (`/Profil` → Se déconnecter).
4. Cliquer **"Continuer avec Microsoft"** → redirect Microsoft → consent → revient connecté.
5. Vérifier dans Supabase Dashboard → Authentication → Users que les comptes
   ont `provider=google` ou `provider=azure` (et pas `email`).

## Identité unifiée — gestion des doublons

Supabase Auth crée 1 ligne `auth.users` par provider × email. Conséquence :
si un user a déjà magic-linké avec `cyrus@example.com` puis se reconnecte via
Google avec le même email, **Supabase rattache automatiquement** (par défaut
`enable_manual_linking=false`) si l'email est vérifié côté provider.

⚠ Edge case : si le user a 2 comptes Google + Microsoft avec emails différents,
ce seront 2 lignes `auth.users` distinctes → 2 lignes `profiles` → 2 sets de
rôles. **Pas de merge auto**. À surveiller en V3.1 si remonté terrain.

## Sécurité

- Les Client Secrets sont stockés UNIQUEMENT côté Supabase Dashboard (jamais
  dans le repo). Si l'un fuit (logs / commit accidentel), aller dans le portail
  provider et révoquer immédiatement.
- Le scope demandé est minimal (`email` pour les deux). Pas de `profile.read`
  étendu, pas d'accès calendar / drive / mail.
- Le redirect URI est codé en dur côté Google/Azure (callback Supabase only) →
  impossible pour un attaquant de rediriger vers une URL malveillante.

## Renouvellement Azure Secret

Le Client Secret Azure expire (24 mois max — Microsoft policy). **Mettre un
rappel** ~30j avant l'expiration :

1. Azure portal → App registration → Certificates & secrets → New secret.
2. Copier la Value.
3. Supabase Dashboard → Auth → Providers → Azure → remplacer la Value → Save.
4. Tester en incognito que le login Microsoft fonctionne encore.
5. Supprimer l'ancien secret (Azure) après 24h de coexistence (au cas où un
   token in-flight l'utilise encore).

Google Client Secret n'expire pas par défaut (sauf si l'admin Google le révoque).

## Compat magic-link

Le magic-link reste activé en parallèle. Les candidats startups (qui n'ont
généralement pas Google Workspace / Microsoft 365 sur leur email pro de boîte
de 3 personnes) continuent d'utiliser le magic-link comme avant. Le SSO cible
spécifiquement les jurés / comité corporate.
