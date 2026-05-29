# Torool — Hardening Plan

> Audit sécurité + plan de durcissement priorisé.
> Périmètre : `apps/mobile`, `apps/guest-web`, `supabase/` (DB + Edge Functions + RLS).
> Hypothèse : V1 en cours de submission stores, infra Supabase déjà live (`kolxetpeyubarnrbkecc`).

---

## 0 · Threat model résumé

| Acteur | Surface d'attaque | Capacité | Risque résiduel actuel |
|---|---|---|---|
| Invité malveillant | `event-access`, `event-rsvp`, `event-public-join`, `event-claim-seat` | Brute-force codes, spam guests, scrape data des autres invités | **Moyen** (rate-limit en place, mais pas de captcha sur create-guest) |
| Orga malveillant | RLS, IAP, dev-grant | Bypass paywall, lire events d'autres comptes | **Faible** (RLS + lock `is_premium` solides) |
| Bot scraper | Endpoints publics + slug enumeration | Aspirer liste d'events + invités | **Moyen-élevé** (slugs énumérables, pas de WAF) |
| Compromis d'un secret (leak Git, leak SHIP.md, dev laptop) | Service role key, RC webhook bearer, Sentry DSN | Lecture/écriture full DB, fake purchases | **Élevé — secret webhook RC déjà en clair dans `SHIP.md`** |
| Attaquant supply-chain | Dépendances npm/pnpm, deno modules pinned via URL | RCE Edge Function, exfiltration côté client | **Moyen** (lockfile présent, mais pas de SCA en CI) |
| Utilisateur sur appareil compromis | AsyncStorage, deep links | Vol session JWT | **Moyen** (storage non chiffré sur Android < secure store) |

---

## 1 · État des lieux (ce qui est déjà bon)

À préserver explicitement, ne pas casser pendant le hardening :

- ✅ **RLS partout** sur tables sensibles (`profiles`, `events`, `guests`, `tables`, `seats`).
- ✅ **`is_premium` verrouillé** via `revoke update` colonne + trigger `profiles_block_is_premium_change` — modification possible uniquement via `service_role`.
- ✅ **Cap free tier (3 events)** appliqué côté RLS, pas côté client.
- ✅ **Rate limiting** sur les 3 endpoints publics (`event-access:get` 60/min, `event-rsvp:post` 30/min, `event-public-join:post` 10/min) + fail-open propre.
- ✅ **CORS séparé** : `publicCors` (wildcard) pour endpoints invités, `strictCors` (`torool.com` allowlist) pour endpoints auth-gated.
- ✅ **Webhook RC** : auth via Bearer secret, fail-closed si secret non configuré, idempotent par event type.
- ✅ **Dev backdoor** (`dev-grant-premium`) : double gate `ALLOW_DEV_FLIP=true` + JWT obligatoire.
- ✅ **Location privacy gate** : `event-access` ne révèle l'adresse complète qu'aux invités ayant RSVP "yes".
- ✅ **`access_code` 6 chars** sur alphabet 32 caractères (chars ambigus exclus) → ~1B combinaisons.
- ✅ **Export RGPD + delete account** Edge Functions implémentées.

---

## 2 · P0 — À faire AVANT submission stores

> Tout ce qui peut causer une fuite de données, un bypass de paywall en prod, ou un rejet store.

### P0.1 — Rotation du bearer webhook RevenueCat 🔥

**Problème.** Le bearer `11d923e45308744ab1283d7da7fd4f307ef1b758dd80d7094ebf2d81d4eb16f3` apparaît **en clair dans `SHIP.md`** (committed dans Git). N'importe qui avec accès au repo peut forger des events RC et offrir le premium à n'importe quel `app_user_id`.

**Action.**
```bash
# 1. Générer un nouveau secret (32 bytes hex)
openssl rand -hex 32

# 2. Mettre à jour côté Supabase
supabase secrets set REVENUECAT_WEBHOOK_AUTH=<nouveau-secret> --project-ref kolxetpeyubarnrbkecc

# 3. Mettre à jour côté RevenueCat dashboard → Integrations → Webhooks
#    Authorization header: Bearer <nouveau-secret>

# 4. Test webhook depuis RC dashboard → doit renvoyer ok:true

# 5. Supprimer la valeur de SHIP.md + git filter-repo pour purger l'historique
git filter-repo --replace-text <(echo "11d923e45308744ab1283d7da7fd4f307ef1b758dd80d7094ebf2d81d4eb16f3==>REDACTED")
git push --force-with-lease
```

**Verif.** `git log -p -S "11d923e4" -- SHIP.md` doit retourner vide.

### P0.2 — Audit secrets dans le repo

**Action.** Scan complet pour autres leaks potentiels.
```bash
# Installer trufflehog
brew install trufflehog
trufflehog git file://. --since-commit HEAD~500 --only-verified

# OU gitleaks
gitleaks detect --source . --verbose
```

À vérifier en particulier :
- `apps/mobile/.env` (doit être gitignored — confirmer)
- `apps/guest-web/.env` (idem)
- Tout fichier `*.md` contenant `Bearer`, `sk_`, `secret`, `key`
- Anciens commits avec `.env` accidentellement committed

### P0.3 — Désactiver `ALLOW_DEV_FLIP` en prod

**Problème.** Si `ALLOW_DEV_FLIP=true` reste set sur le projet prod, n'importe quel user authentifié peut s'auto-flip `is_premium=true` en appelant `/functions/v1/dev-grant-premium`.

**Action.**
```bash
supabase secrets unset ALLOW_DEV_FLIP --project-ref kolxetpeyubarnrbkecc

# Vérifier
supabase secrets list --project-ref kolxetpeyubarnrbkecc | grep ALLOW_DEV_FLIP
# → doit être absent
```

**Bonus.** Ajouter en plus une garde au runtime qui refuse l'endpoint si le projet ref matche prod :
```ts
// dev-grant-premium/index.ts
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
if (PROJECT_REF === 'kolxetpeyubarnrbkecc' && Deno.env.get('ENVIRONMENT') === 'production') {
  return jsonResponse(req, { error: 'disabled_in_production' }, 403);
}
```

### P0.4 — Stockage sécurisé des tokens auth mobile

**Problème.** Par défaut Supabase JS utilise `AsyncStorage` (= non chiffré). Sur Android rooté ou backup ADB, le JWT user fuite.

**Action.** Remplacer par `expo-secure-store` (Keychain iOS / Keystore Android).
```ts
// apps/mobile/lib/supabase.ts
import * as SecureStore from 'expo-secure-store';

const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(URL, ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

**Limitation iOS.** SecureStore max 2048 bytes par clé. Si JWT > 2KB, fallback sur une lib custom qui split, ou utiliser `react-native-mmkv` + chiffrement.

### P0.5 — Validation stricte des inputs Edge Functions

**Problème.** `event-public-join` POST accepte `first_name`, `last_name`, `email`, `rsvp_responses` sans bornes. Un attaquant peut envoyer 100KB de JSON → fait grossir la DB → coût + DoS soft.

**Action.** Ajouter validation Zod-style en tête de chaque handler POST.
```ts
function validateJoinPayload(p: any): { ok: true; data: JoinPayload } | { ok: false; reason: string } {
  if (typeof p.first_name !== 'string' || p.first_name.length < 1 || p.first_name.length > 80) {
    return { ok: false, reason: 'first_name_invalid' };
  }
  if (p.last_name != null && (typeof p.last_name !== 'string' || p.last_name.length > 80)) {
    return { ok: false, reason: 'last_name_invalid' };
  }
  if (p.email != null && (typeof p.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email) || p.email.length > 254)) {
    return { ok: false, reason: 'email_invalid' };
  }
  if (p.phone != null && (typeof p.phone !== 'string' || p.phone.length > 32)) {
    return { ok: false, reason: 'phone_invalid' };
  }
  if (p.rsvp_responses != null) {
    const json = JSON.stringify(p.rsvp_responses);
    if (json.length > 4096) return { ok: false, reason: 'rsvp_responses_too_large' };
  }
  if (Array.isArray(p.companions) && p.companions.length > 20) {
    return { ok: false, reason: 'too_many_companions' };
  }
  return { ok: true, data: p as JoinPayload };
}
```

Endpoints à durcir : `event-public-join`, `event-rsvp`, `event-claim-seat`.

### P0.6 — Pin des dépendances Deno (Edge Functions)

**Problème.** Tous les imports Edge Functions pointent sur `https://esm.sh/@supabase/supabase-js@2` (tag mobile, pas SHA). Si esm.sh sert une version compromise → RCE serveur.

**Action.** Pinner sur version exacte + utiliser `deno.lock`.
```ts
// avant
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// après
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4?dts';
```
Puis :
```bash
cd supabase/functions
deno cache --lock=deno.lock --lock-write _shared/*.ts */index.ts
```
Commit `deno.lock`. Renvoyer le déploiement avec `--use-lock`.

### P0.7 — Headers de sécurité guest-web

**Problème.** `guest-web` sert du HTML user-generated (nom d'event, description orga). Sans CSP, une orga peut injecter du `<script>` dans le titre → XSS sur tous ses invités.

**Action.** Configurer headers Vercel via `apps/guest-web/vercel.json`.
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=()" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" }
      ]
    }
  ]
}
```

**Verif.** `curl -I https://torool.com` doit montrer tous les headers. Score A sur https://securityheaders.com.

### P0.8 — Sanitization sortie React (rappel)

**Verif.** Aucun `dangerouslySetInnerHTML` ni `innerHTML` sur du contenu user-provided. Grep :
```bash
grep -rn "dangerouslySetInnerHTML\|innerHTML" apps/guest-web/src apps/mobile/ --include="*.tsx" --include="*.ts"
```
Le seul cas légitime : contenu statique (privacy.html servi en static).

---

## 3 · P1 — Avant croissance (premiers 1k users)

### P1.1 — Captcha sur `event-public-join` POST

Le rate-limit 10/min/IP arrête les bots paresseux. Un attaquant distribué (botnet, résidentiels) crée 10/min × 10k IPs = 100k guests/min. Ajouter un challenge :

- **Option simple.** Cloudflare Turnstile (gratuit, invisible le plus souvent). Token vérifié côté Edge Function.
- **Option ultra-light.** Proof-of-work JS côté guest-web (5-10ms CPU) avant submit. Casse les scripts curl, ralentit les botnets.

```ts
// event-public-join/index.ts (option Turnstile)
const turnstileToken = req.headers.get('cf-turnstile-token');
if (!turnstileToken) return jsonResponse({ error: 'captcha_required' }, 400);
const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: `secret=${TURNSTILE_SECRET}&response=${turnstileToken}`,
});
const { success } = await verify.json();
if (!success) return jsonResponse({ error: 'captcha_failed' }, 400);
```

### P1.2 — Anti-énumération slugs

**Problème.** `event-public-join?slug=<slug>` GET renvoie 404 si pas trouvé, 200 si trouvé → un attaquant peut énumérer tous les events publics existants via wordlist (`anniversaire-jean`, `mariage-marie`, etc).

**Action.**
- Renvoyer `200 { exists: false }` au lieu de 404 pour les slugs non trouvés (réponse uniforme).
- OU rate-limit beaucoup plus strict sur les 404 (3/min/IP sur misses).
- OU exiger un slug ≥ 12 chars OU avec préfixe random (`mariage-jean-x7k2`).

**Recommandation.** Auto-append d'un suffixe court (`-${nanoid(4)}`) aux slugs côté création event. Casse l'énumération, garde l'URL lisible.

### P1.3 — Logs d'accès + alerting

**Problème.** Pas de log structuré actuellement. Si bruteforce ou exfil, on s'en rend compte sur la facture Supabase.

**Action.**
- Ajouter `console.log(JSON.stringify({ event: 'rsvp', ip, slug, status, ts }))` dans chaque endpoint public.
- Connecter Supabase Logs → Logflare → alertes Discord/email sur :
  - `rate_limited` > 100/min sur un endpoint
  - `event-access` returning 404 > 50/min même IP (bruteforce code)
  - `revenuecat-webhook` `forbidden` > 5/min (probable scan)

### P1.4 — Politique de mot de passe + email confirmation

**État actuel.** Password 6 chars min, email confirmation décochée sur Supabase Auth.

**Action.**
- Passer min à **10 chars** + check basique (pas que des chiffres).
- **Activer confirmation email** (Supabase dashboard → Authentication → Email Auth → "Confirm email" ON).
- Migration des comptes existants : campagne email "confirme ton email avant le 1er juillet".
- Ajouter rate-limit sur sign-up : Supabase n'en a pas par défaut sur `auth.signup` — créer une Edge Function wrapper si trafic suspect.

### P1.5 — RLS audit complet

**Action.** Exécuter `supabase test db` ou les `pgtap` tests manuels :
```sql
-- Test 1 : un user A ne peut PAS voir les events du user B
set role authenticated;
set request.jwt.claims = '{"sub":"<user-A-uuid>","role":"authenticated"}';
select count(*) from events where owner_id = '<user-B-uuid>';
-- → doit être 0

-- Test 2 : un user A ne peut PAS update is_premium sur son propre row
update profiles set is_premium = true where id = '<user-A-uuid>';
-- → doit raise exception
```

Tests à automatiser : 1 fichier `supabase/tests/rls.sql` exécuté en CI.

### P1.6 — Index pour anti-DoS DB

**Problème.** Si `guests.access_code` n'a pas d'index unique, brute-force = full scan.

**Verif.**
```sql
\d guests
-- chercher "access_code_key" ou similaire
```

Si manquant :
```sql
create unique index concurrently if not exists guests_access_code_key on public.guests (access_code);
```

Idem pour `events.slug`.

### P1.7 — Cron GC rate_limits + guests pending

```sql
-- supabase/migrations/<date>_rate_limits_gc.sql
create extension if not exists pg_cron;
select cron.schedule(
  'rate_limits_gc',
  '*/15 * * * *',
  $$delete from public.rate_limits where window_start < now() - interval '1 hour'$$
);
```

### P1.8 — Sentry : scrub PII

**Verif.** `Sentry.init({ sendDefaultPii: false })` et un `beforeSend` qui purge email/phone/name.

```ts
Sentry.init({
  dsn: SENTRY_DSN,
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      // garder seulement event.user.id
    }
    return event;
  },
});
```

### P1.9 — Backup DB + plan de restore

**Action.**
- Supabase Pro plan = PITR 7j auto. Confirmer plan actuel.
- Procédure documentée dans `RUNBOOK.md` : "comment restaurer en cas de wipe".
- Test de restore une fois par trimestre sur un projet staging.

### P1.10 — Mobile : detect rooted/jailbroken devices

**Optionnel mais utile pour future feature payment** : `react-native-jail-monkey` ou `expo-detect-root`. Logger l'info dans Sentry, **ne pas bloquer** l'app (Apple refuse les apps qui bloquent les devices jailbreakés).

---

## 4 · P2 — Maturité / scale

### P2.1 — Pentest externe
Une fois ~10k MAU, faire passer Cure53 ou HackerOne (~5-10k€). Focus : RLS edge cases, IDOR sur Edge Functions, abus du flow public-join.

### P2.2 — Bug bounty privé
Programme `security@torool.com` + 1 page `/.well-known/security.txt`. Récompenses en crédit premium offert au début.

### P2.3 — 2FA orga
TOTP optionnel pour les comptes orga. Critique si "Torool Pro" team-shared events arrivent au roadmap.

### P2.4 — Webhook signature verification renforcée
RevenueCat signe les webhooks via header HMAC depuis 2024. Migrer du Bearer simple vers vérification de signature (replay protection avec timestamp).

### P2.5 — SCA en CI
GitHub Dependabot + `pnpm audit` + Snyk free tier. Bloquer les merges PR avec vuln critical/high non patchée.

### P2.6 — SBOM
Générer SBOM (CycloneDX) à chaque release EAS. Permet de répondre vite à une nouvelle CVE upstream.

### P2.7 — Chaos / load test
Test de charge sur les endpoints publics avec k6 ou Artillery. Cible : 1000 RSVP/min sustained sans dégradation.

### P2.8 — Data Loss Prevention RGPD
- Cron de purge auto : guests d'events terminés depuis > 12 mois → anonymisation (`first_name='Anonyme'`, email=null).
- Vérifier que delete-account purge bien aussi `rate_limits` historiques liés à l'user (par IP — pas possible directement, mais log d'audit OK).

### P2.9 — Account takeover detection
- Si nouveau device + IP + timezone vs historique → email "nouvelle connexion détectée".
- Si delete-account déclenché < 24h après changement password → flag pour review humain (signal de pre-takeover).

### P2.10 — Subresource Integrity (SRI) guest-web
Si jamais des assets sont chargés depuis CDN externe, ajouter `integrity="sha384-..."`.

---

## 5 · Roadmap suggérée

| Sprint | Items | Effort | Risque adressé |
|---|---|---|---|
| **Sprint 0 (cette semaine, blocant submission)** | P0.1, P0.2, P0.3, P0.7, P0.8 | 1 jour | Leak secret prod, XSS guest-web |
| **Sprint 1 (avant submission stores)** | P0.4, P0.5, P0.6 | 2 jours | Vol token mobile, validation inputs, supply chain |
| **Sprint 2 (post-launch, semaine +1)** | P1.1, P1.3, P1.5, P1.6 | 3 jours | Bot abuse, observabilité, audit RLS |
| **Sprint 3 (mois +1)** | P1.2, P1.4, P1.7, P1.8, P1.9 | 3 jours | Énumération, password policy, backups |
| **Q3 2026** | P1.10, P2.1, P2.2, P2.5 | continu | Pentest, bug bounty, SCA |
| **Q4 2026** | P2.3, P2.4, P2.7, P2.8 | continu | 2FA, scale, RGPD long-terme |

---

## 6 · Checklist pré-submission stores

À cocher manuellement avant `eas submit` :

- [ ] Bearer webhook RC rotaté (P0.1)
- [ ] `git log` purge effectuée + force push
- [ ] `trufflehog` clean sur tout l'historique
- [ ] `ALLOW_DEV_FLIP` unset sur projet prod
- [ ] `dev-grant-premium` retourne 403 en prod (test manuel : `curl -X POST https://kolxetpeyubarnrbkecc.supabase.co/functions/v1/dev-grant-premium -H "Authorization: Bearer <vrai-jwt>"` → 403)
- [ ] `expo-secure-store` adapté pour le supabase client mobile
- [ ] Validation Zod sur les 3 endpoints publics POST
- [ ] `deno.lock` committed + `--use-lock` au déploiement
- [ ] CSP + headers sécurité actifs sur `torool.com` (verif `curl -I`)
- [ ] Score A sur https://securityheaders.com
- [ ] Sentry `beforeSend` scrub PII testé
- [ ] Test RLS manuel : user A ne lit pas events de user B
- [ ] Test paywall réel : impossible d'appeler `dev-grant-premium` avec succès en prod

---

## 7 · Documents liés

- `MEMORY.md` — décisions architecturales
- `SHIP.md` — checklist pre-launch (à nettoyer du bearer leak après P0.1)
- `DEEP_SOLVE.md` — protocole résolution
- `supabase/migrations/20260509180000_lock_is_premium.sql` — pattern à répliquer pour autres colonnes sensibles
- `supabase/migrations/20260510180000_rate_limits.sql` — pattern rate-limit
- `supabase/functions/_shared/cors.ts` — séparation public/strict CORS

---

_Dernière revue : 2026-05-12._
_Owner : sécurité = co-responsabilité orga + tech lead._
_Re-audit recommandé : tous les 6 mois OU à chaque ajout d'Edge Function publique._
