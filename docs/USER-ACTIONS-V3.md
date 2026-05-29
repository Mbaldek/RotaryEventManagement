# USER ACTIONS — RSA V3.0 deploy & ops checklist

> Actions à exécuter par Mathieu (manuellement) sur les services externes après chaque vague V3.
> Statut : **post-Vague 2 pushé** (`bfe2d81`). Vagues 3 & 4 en cours d'orchestration.

Légende :
- 🔴 BLOCKER : tant que pas fait, la feature ne marche pas en prod
- 🟠 ATTENTION : marche partiellement / dégradé
- 🟢 OPTIONNEL : améliore mais pas requis

---

## A. Observabilité

### A.1 🔴 Vercel — `VITE_SENTRY_DSN`
**But :** capter les erreurs front en prod (sinon Sentry no-op silencieux, l'app marche mais zéro visibilité).

1. Créer un projet Sentry React free tier (`https://sentry.io`)
2. Copier le DSN `https://xxx@oXXX.ingest.sentry.io/XXX`
3. Vercel → Project → Settings → Environment Variables :
   - Key : `VITE_SENTRY_DSN`
   - Value : le DSN
   - Environments : Production + Preview
4. Re-deploy (Vercel Dashboard → Deployments → Redeploy latest)

**Validation :** ouvrir `/Resultats?broken=1` (ou n'importe quel chemin invalide) → l'erreur doit apparaître dans Sentry dans la minute.

**Quotas free tier** : 5k erreurs + 10k traces/mois (config actuelle : `tracesSampleRate=0.1`, replay-on-error 100%, replay session off).

### A.3 🔴 Vercel — `VITE_APP_URL` pin (Production)
**But :** côté code (`src/lib/platform/auth.jsx:26`), `APP_URL` est résolu via
`import.meta.env.VITE_APP_URL || window.location.origin`. Sans pin, les preview
deploys Vercel (`https://rsa-git-feat-xxx.vercel.app`) renvoient leur propre
origin → si Mathieu test un dossier sur un preview, son magic-link arrive avec
un `emailRedirectTo` pointant sur l'URL preview. Risque :
- **Confusion** : le user clique, atterrit sur une URL hostname inconnue.
- **Leak d'URL preview** dans des emails Resend (auditable côté logs Resend).
- **Mismatch** allow-list Supabase Auth → erreur "Invalid redirect URL".

**Action :**
1. Vercel Dashboard → Project (`rsa-platform`) → Settings → Environment Variables
2. Add :
   - Key : `VITE_APP_URL`
   - Value : `https://app.rotary-startup.org`
   - Environments : ☑ **Production** uniquement
   - Preview/Development : laisser non-set → fallback `window.location.origin`
     pour qu'un preview deploy continue de fonctionner en isolation.
3. Redeploy Production (Vercel Dashboard → Deployments → "…" → Redeploy).

**Validation :** se connecter depuis un onglet incognito sur
`https://app.rotary-startup.org/Login` → ouvrir DevTools Network → soumettre
l'email → inspecter la payload `signInWithOtp` envoyée à Supabase →
`emailRedirectTo` doit être `https://app.rotary-startup.org/Login?...`,
JAMAIS l'URL preview.

**Lié à :** friction F4 (cf. `docs/hardening/login-audit-v4.md`).

---

## B. Auth / Magic-link

### B.1 🔴 Supabase Auth — Redirect URLs allow-list
**But :** sans ça, le magic-link cliqué redirige sur `/Login` au lieu de `/Candidater?claim=1` → le claim ne se fait jamais, le draft startup reste orphelin.

Supabase Dashboard → Authentication → URL Configuration → Redirect URLs → Ajouter :
- `https://app.rotary-startup.org/Candidater?*`
- `https://app.rotary-startup.org/Candidater`
- `http://localhost:5173/Candidater?*` (dev)
- `http://localhost:5173/Candidater`

**Validation :** soumettre un test sur `/Candidater` avec ton email → recevoir magic-link → cliquer → atterrir sur `/Candidater?claim=1` (puis redirect `/MonDossier`).

### B.1.5 🔴 Supabase Auth — SSO providers Google + Microsoft (V3.0)
**But :** sans SSO, les jurés CEO de grands groupes (DLP / throttling email entreprise fort) ne peuvent pas se connecter du tout — les magic-links Resend bouncent. Le SSO Google + Microsoft est la voie nominale pour la cible B2B V3.

Cf. **`docs/onboarding/sso-setup.md`** pour la procédure complète. Récap minimal :

1. **Google Cloud Console** → APIs & Services → Credentials → OAuth 2.0 Client ID (Web app)
   - Authorized redirect URI : `https://uaoucznptxmvhhytapso.supabase.co/auth/v1/callback`
   - Copier Client ID + Secret
2. **Azure portal** → App Registrations → New registration (multi-tenant + personal)
   - Redirect URI Web : `https://uaoucznptxmvhhytapso.supabase.co/auth/v1/callback`
   - Certificates & secrets → New client secret (24 mois, à renouveler)
   - Copier Application (client) ID + Secret Value
3. **Supabase Dashboard** → Authentication → Providers :
   - Google : Enable + Client ID/Secret de l'étape 1
   - Azure : Enable + Application ID/Secret de l'étape 2 + Tenant URL `https://login.microsoftonline.com/common`
4. **Supabase Dashboard** → Authentication → URL Configuration → Redirect URLs : ajouter `https://app.rotary-startup.org/Login`, `/Jury`, `/MonDossier`, etc.

**Validation :** ouvrir `/Login` en incognito → cliquer "Continuer avec Google" → consent screen → revient connecté. Idem Microsoft. Vérifier `auth.users` montre `provider=google` ou `provider=azure`.

**Renouvellement Azure** : le client secret expire à 24 mois. Mettre un rappel calendrier 30j avant échéance.

### B.2 🟠 Supabase Auth — Email template magic-link (branding)
**But :** Supabase envoie le magic-link via son template par défaut (texte plain "Sign in to your account"). Élysée-branding recommandé pour cohérence.

Dashboard → Authentication → Email Templates → "Magic Link" :
- Subject : "Connexion à votre dossier Rotary Startup Award"
- Body : remplacer le template par un HTML Élysée (NAVY background, GOLD accent, Playfair titre, bouton CTA)
- Token vars Supabase : `{{ .ConfirmationURL }}`

### B.3 🟠 Supabase Auth — Google OAuth provider (SSO B2B)
**But :** ouvrir une 2e porte d'entrée aux comités et jury membres des cabinets /
entreprises qui sont sur Google Workspace. Le magic-link Supabase est régulièrement
ralenti voire bloqué par les DLP corp (cf. friction F6 — médiane 47 s vs 3 s en
boîte perso). Avec Google SSO, le sign-in est immédiat dans le navigateur sans
attendre un email.

**Étapes Google Cloud Console :**
1. https://console.cloud.google.com → créer (ou réutiliser) un projet `rsa-platform`.
2. APIs & Services → OAuth consent screen :
   - User Type : **External**
   - App name : `Rotary Startup Award`
   - Support email : `mathieubal@gmail.com`
   - Logo : logo RSA (carré 120×120 PNG depuis `public/`)
   - Authorized domains : `rotary-startup.org`, `supabase.co`
   - Scopes : `openid`, `email`, `profile` (défaut)
   - Test users : ajouter ton email + 2 jury tests le temps de la validation
     (sinon Google Verification process bloque les nouvelles auth).
3. APIs & Services → Credentials → Create Credentials → **OAuth client ID** :
   - Application type : **Web application**
   - Name : `Supabase Auth — RSA Production`
   - Authorized JavaScript origins :
     - `https://app.rotary-startup.org`
     - `https://uaoucznptxmvhhytapso.supabase.co`
   - Authorized redirect URIs :
     - `https://uaoucznptxmvhhytapso.supabase.co/auth/v1/callback`
4. Copier `Client ID` + `Client Secret`.

**Étapes Supabase Dashboard :**
1. Authentication → Providers → **Google** → Enable.
2. Coller `Client ID` + `Client Secret`.
3. **Skip nonce check** : OFF (laisser le défaut).
4. Save.

**Étapes code (UI) :**
- `src/components/design/auth/MagicLinkLogin.jsx` : ajout du bouton secondaire
  "Continuer avec Google" → appel `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: ${APP_URL}${redirectPath} } })`.

**Validation :** se connecter incognito sur `/Login`, cliquer "Continuer avec
Google" → popup Google → consent → redirect vers `/Login` puis `/MonDossier` ou
`/Admin` selon le rôle. Vérifier en DB que `auth.users` contient une ligne avec
`raw_user_meta_data.provider = 'google'` pour cet email.

**Lié à :** friction F6 (cf. `docs/hardening/login-audit-v4.md`).

### B.4 🟠 Supabase Auth — Microsoft (Azure AD) OAuth provider (SSO B2B)
**But :** symétrique à B.3 pour les utilisateurs Outlook/Exchange/Azure AD.
L'ATP (Advanced Threat Protection) de Microsoft réécrit les magic-links via
ses "safe links" → 60 % des magic-links arrivés ne fonctionnent plus (token
consommé par le scan). SSO Microsoft contourne entièrement le problème.

**Étapes Azure Portal :**
1. https://portal.azure.com → Azure Active Directory → **App registrations** → New registration :
   - Name : `Rotary Startup Award`
   - Supported account types : **Accounts in any organizational directory and personal Microsoft accounts** (multi-tenant + perso).
   - Redirect URI :
     - Platform : **Web**
     - URI : `https://uaoucznptxmvhhytapso.supabase.co/auth/v1/callback`
2. Une fois créée, noter :
   - **Application (client) ID** → `Client ID`
   - **Directory (tenant) ID** → utilisé seulement pour single-tenant ; sinon mettre `common`.
3. Certificates & secrets → New client secret :
   - Description : `Supabase Auth Production`
   - Expires : 24 months (note la date dans un cal pour rotation)
   - Copier la **Value** (et NON le secret ID) → c'est le `Client Secret`.
4. API permissions → ajouter (par défaut déjà OK) :
   - Microsoft Graph → Delegated → `openid`, `email`, `profile`, `User.Read`
   - "Grant admin consent" si tu testes sur ton tenant.

**Étapes Supabase Dashboard :**
1. Authentication → Providers → **Azure (Microsoft)** → Enable.
2. Coller `Client ID` + `Client Secret`.
3. Azure Tenant URL :
   - Multi-tenant : `https://login.microsoftonline.com/common/v2.0`
   - Single-tenant (org spécifique) : `https://login.microsoftonline.com/<TENANT_ID>/v2.0`
4. Save.

**Étapes code (UI) :**
- `src/components/design/auth/MagicLinkLogin.jsx` : ajout du bouton secondaire
  "Continuer avec Microsoft" → `supabase.auth.signInWithOAuth({ provider: 'azure', options: { redirectTo: ${APP_URL}${redirectPath}, scopes: 'email openid profile' } })`.

**Validation :** se connecter incognito sur `/Login` depuis un PC entreprise
(typiquement déjà loggué sur Outlook desktop) → cliquer "Continuer avec
Microsoft" → consent screen Microsoft → redirect → arrivée immédiate sur
`/MonDossier` ou `/Admin`. Vérifier en DB que `auth.users.raw_user_meta_data.provider = 'azure'`.

**Lié à :** friction F7 (cf. `docs/hardening/login-audit-v4.md`).

---

## C. Email transactionnel

### C.1 🔴 Supabase Edge Function Secrets — `RESEND_API_KEY`
**But :** alimente `send-bulk` (CTA Communiquer) + `send-transactional` (notifications individuelles). Sans clé, tous les envois échouent silencieusement (audit log marque `failed`).

```bash
# Via Supabase CLI :
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxx --project-ref uaoucznptxmvhhytapso
```

Ou Dashboard → Project Settings → Edge Functions → Secrets → `RESEND_API_KEY`.

**Validation :** dans Club Cockpit > Communications > "Remercier non-sélectionnés" → dry-run → preview count → envoyer à 1 email test → recevoir dans Resend dashboard.

### C.2 🟢 Resend — Sender domain DKIM/SPF
**But :** deliverability (sinon les emails atterrissent en spam Gmail/Outlook).

Resend Dashboard → Domains → `rotary-startup.org` → DNS records → ajouter SPF + DKIM + DMARC dans la zone DNS du domaine.

**Validation :** envoyer test à 3 inboxes Gmail/Outlook/Proton → vérifier que ça arrive en Inbox, pas Spam.

---

## D. Scheduling

### D.1 🟠 pg_cron — cleanup drafts expirés TTL 7j
**But :** sans ça, les drafts `/Candidater` non confirmés restent en base éternellement (pas catastrophique mais sale).

**Option A — pg_cron** (nécessite extension activée) :
1. Dashboard → Database → Extensions → activer `pg_cron`
2. SQL Editor :
   ```sql
   SELECT cron.schedule(
     'rsa-cleanup-pending',
     '0 3 * * *',  -- chaque jour à 03:00 UTC
     $$SELECT public.rsa_cleanup_expired_pending_drafts()$$
   );
   ```

**Option B — Scheduled Edge Function** (si pg_cron pas disponible) :
- Créer une Edge Function qui appelle la RPC
- Dashboard → Edge Functions → Schedule → cron `0 3 * * *`

**Validation :** créer un draft `/Candidater` avec une date `pending_expires_at` artificielle dans le passé (via SQL) → run la RPC → ligne supprimée.

---

## E. Activation features

### E.1 🟠 Editions — `public_results_enabled` toggle
**But :** par défaut `/Resultats` n'affiche que les éditions où le master_admin a explicitement activé le palmarès public.

Master Cockpit → Compétitions → édition → Setup tab → toggle "Activer le palmarès public" ON.

Ou SQL direct :
```sql
UPDATE public.editions SET public_results_enabled = true WHERE id = '2026';
```

### E.2 🟢 Editions — `promote_top_n` config
**But :** "Conclure la session" auto-promote les N premiers en finale. Par défaut N=1.

Pour le configurer (par édition) :
```sql
UPDATE public.editions
   SET config = jsonb_set(coalesce(config,'{}'::jsonb), '{promote_top_n}', '3'::jsonb)
 WHERE id = '2027';
```

---

## F. Data migration différée

### F.1 🟠 V2.1 — uploads bucket lockdown (104 objets legacy 2026)
**But :** le bucket `uploads` est encore `public=true` (héritage). 104 objets dedans (pitch decks 2026, photos jury) servies sans auth via `getPublicUrl`. RGPD Art. 5/32 violation potentielle.

**Plan V2.1** (~2-3h, à planifier hors session) :
1. Script Python ou Supabase Dashboard : lister tous les objets `bucket=uploads`
2. Pour chaque objet 2026 :
   - Re-upload sous `editions/2026/startups/<id>/<kind>/<filename>` dans bucket `dossiers` (privé)
   - Update FK `startups.pitch_deck_path` / `exec_summary_path`
   - Delete original dans uploads
3. Une fois vidé : `UPDATE storage.buckets SET public = false WHERE id = 'uploads';`
4. Refactor `src/lib/db.js` + `src/pages/StartupUpload.jsx` + edge function `consolidate-jury-pack` : remplacer `getPublicUrl` par `createSignedUrl({expiresIn: 3600})`

**Statut actuel** : reste sur le backlog, pas bloquant pour V3 features.

---

## G. CI / déploiement

### G.1 🟢 GitHub Actions — activer le job e2e
**But :** Playwright E2E tests sont scaffolded (`tests/e2e/`) mais le job CI est commenté en attendant un Supabase preview branch dédié.

1. Créer un Supabase preview branch via `mcp__claude_ai_Supabase__create_branch`
2. Récupérer `PLAYWRIGHT_SUPABASE_URL` + `PLAYWRIGHT_SERVICE_ROLE_KEY` du branch
3. GitHub repo → Settings → Secrets and variables → Actions → ajouter ces 2 secrets
4. `.github/workflows/ci.yml` → décommenter le job `e2e` (bloc préparé)

### G.2 🟢 Vercel — domaine `app.rotary-startup.org`
**But :** si pas déjà fait, attacher le domaine custom.

Vercel → Project → Settings → Domains → ajouter `app.rotary-startup.org` → suivre les instructions DNS (CNAME ou A record selon ton registrar).

---

## H. Sécurité (déjà appliqué V1.5, à valider sur prod)

### H.1 ✅ profiles + session_config RLS lockdown
Déjà appliqué via MCP en Vague 1.5 :
- `profiles.Allow all` DROP → `profiles_self_read/staff_read/self_update`
- `session_config.public_all_session_config` DROP → `sc_read_staff` + DENY direct write

**Validation** : se connecter en anon (incognito) → tenter SELECT sur profiles dans la console DevTools → doit retourner vide ou erreur (pas une dump complète comme avant).

### H.2 🟢 V3 audit log UI (différé V3.1+)
Table `admin_audit_log` continue d'être alimentée silencieusement (commit V1.3 hardening). UI pour la consulter sera ajoutée V3.1.

---

## Récap statut actions

| Code | Action | Statut |
|------|--------|--------|
| A.1 | Vercel `VITE_SENTRY_DSN` | ⏳ À FAIRE |
| A.3 | Vercel `VITE_APP_URL` pin (Production) | 🆕 V4 — ⏳ À FAIRE |
| B.1 | Supabase Auth redirect URLs `/Candidater?*` | ⏳ À FAIRE |
| B.1.5 | SSO Google + Microsoft providers (V3.0) | 🔴 À FAIRE — cible jurés B2B |
| B.2 | Email template magic-link branding | 🟢 Optionnel |
| B.3 | Supabase Auth — Google OAuth provider | 🆕 V4 — ⏳ À FAIRE |
| B.4 | Supabase Auth — Microsoft OAuth provider | 🆕 V4 — ⏳ À FAIRE |
| C.1 | `RESEND_API_KEY` Supabase secrets | ⏳ À FAIRE (probablement déjà set) |
| C.2 | Resend DKIM/SPF DNS | ⏳ À FAIRE |
| D.1 | pg_cron cleanup TTL drafts | ⏳ À FAIRE |
| E.1 | `editions.public_results_enabled = true` | 🟢 Optionnel (par édition) |
| E.2 | `editions.config.promote_top_n` | 🟢 Optionnel (default 1) |
| F.1 | uploads bucket lockdown V2.1 | 📋 Backlog |
| G.1 | CI e2e job activation | 🟢 Optionnel |
| G.2 | Vercel domaine custom | 🟢 Optionnel |
| H.1 | profiles + session_config lockdown | ✅ FAIT |
| H.2 | Audit log UI | 📋 V3.1+ |

**Légende statut V4 :**
- 🆕 V4 = nouvelle action introduite par l'audit login V4 (cf. `docs/hardening/login-audit-v4.md`).
- Les 4 actions critiques pour fermer l'audit login : **A.3 + B.1 + B.3 + B.4**.

---

## Smoke test après USER ACTIONS critiques (A.1 + B.1 + C.1 + E.1)

1. `/Candidater` → soumettre dossier avec ton email → recevoir magic-link Resend → cliquer → atterrir sur `/Candidater?claim=1` puis `/MonDossier`
2. `/MonDossier` → remplir un dossier → soumettre
3. Master Cockpit → créer/configurer une session → assigner jurés
4. Jury → noter via `/Jury`
5. Comité → review
6. Club Cockpit > Live → "Conclure la session" → vérifier auto-promote en finale
7. Club Cockpit > Communications → "Annoncer aux sélectionnés" → dry-run → envoyer
8. `/Resultats` (anon, incognito) → palmarès visible avec photo champion opt-in

Si tout OK → V3 ready pour pilot multiclub. Sinon, créer issue GitHub avec étape + screenshot.
