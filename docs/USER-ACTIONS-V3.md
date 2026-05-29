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

### B.2 🟠 Supabase Auth — Email template magic-link (branding)
**But :** Supabase envoie le magic-link via son template par défaut (texte plain "Sign in to your account"). Élysée-branding recommandé pour cohérence.

Dashboard → Authentication → Email Templates → "Magic Link" :
- Subject : "Connexion à votre dossier Rotary Startup Award"
- Body : remplacer le template par un HTML Élysée (NAVY background, GOLD accent, Playfair titre, bouton CTA)
- Token vars Supabase : `{{ .ConfirmationURL }}`

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
| B.1 | Supabase Auth redirect URLs `/Candidater?*` | ⏳ À FAIRE |
| B.2 | Email template magic-link branding | 🟢 Optionnel |
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

---

## Smoke test après USER ACTIONS critiques (A.1 + B.1 + C.1 + E.1)

1. `/Candidater` → soumettre dossier avec ton email → recevoir magic-link Resend → cliquer → atterrir sur `/Candidater?claim=1` puis `/MonDossier`
2. `/MonDossier` → remplir un dossier → soumettre
3. Master Cockpit → créer/configurer une session → assigner jurés
4. Jury → noter via `/Jury`
5. Comité → review
6. Club Cockpit > Live → "Conclure la session" → vérifier auto-promote en finale fédérée
7. Club Cockpit > Communications → "Annoncer aux sélectionnés" → dry-run → envoyer
8. `/Resultats` (anon, incognito) → palmarès visible avec photo champion opt-in

Si tout OK → V3 ready pour pilot multiclub. Sinon, créer issue GitHub avec étape + screenshot.
