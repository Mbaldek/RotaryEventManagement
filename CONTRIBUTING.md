# Contribuer à RSA

> Guide pour les devs qui contribuent à `app.rotary-startup.org`.
> Lire avant la première PR.

---

## Table of contents

- [Setup local](#setup-local)
- [Workflow Git](#workflow-git)
- [Convention de commit](#convention-de-commit)
- [Avant chaque PR](#avant-chaque-pr)
- [Migrations Supabase](#migrations-supabase)
- [Tests E2E Playwright](#tests-e2e-playwright)
- [Conventions code](#conventions-code)
- [Sécurité](#sécurité)

---

## Setup local

```bash
git clone <repo> rsa && cd rsa
npm install
cp .env.example .env.local      # remplir VITE_SUPABASE_URL + ANON_KEY
npm run dev                     # http://localhost:5173
```

Stack Supabase local optionnelle (Postgres + Auth) : `supabase start` (voir
[Supabase CLI docs](https://supabase.com/docs/guides/local-development)). En pratique,
la plupart des devs pointent leur `.env.local` vers le projet **dev cloud** Supabase
pour éviter de maintenir un stack local.

---

## Workflow Git

- Branche principale : **`main`** (déployée auto sur Vercel prod).
- Feature branches : `feat/<scope>-<short-desc>`, `fix/<scope>-<short-desc>`,
  `chore/<short-desc>`.
- Une PR = un changement cohérent. Pas de PR fourre-tout.
- Tag les commits Vague V3 avec leur code wave (`v3-wave-4`, `v3-wave-5`, etc.).

---

## Convention de commit

Format inspiré de [Conventional Commits](https://www.conventionalcommits.org), tolérant
sur la casse et le français.

```
<type>(<scope>): <description courte>

<body optionnel — pourquoi, pas quoi>

<footer optionnel — refs issues, breaking changes>
```

**Types courants** : `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`,
`security`.

**Scopes courants** : `rsa-v3` (wave courante), `rsa-platform`, `auth`, `jury`,
`selection`, `module4`, `design`, `hardening`.

Exemples (tirés de l'historique) :

```
feat(rsa-v25+): refonte Funnel modal + page édition autosave + docs_required par-doc
fix(rsa-v26): polish audit findings — Mi1 backdrop fallback Safari + M1 isUnmountedRef
fix(rsa-platform): expose vrai message Supabase au lieu d'un générique stérile
```

---

## Avant chaque PR

**Obligatoire** :

```bash
npm run lint        # ESLint, zéro warning
npm run build       # build Vite doit passer
```

**Recommandé** :

```bash
npm run typecheck   # tsc lent mais cible les imports cassés
npm run test:e2e    # Playwright (requiert Supabase preview branch)
```

Si tu touches à :

- **RLS / RPC** → ajouter une note dans [docs/hardening/](docs/hardening/)
- **Schema DB** → migration SQL versionnée (cf section ci-dessous)
- **UX persona** → mettre à jour le doc onboarding correspondant
- **Actions manuelles infra** → ajouter une entrée dans
  [docs/USER-ACTIONS-V3.md](docs/USER-ACTIONS-V3.md)

---

## Migrations Supabase

Toutes les migrations vivent dans `supabase/migrations/` et sont versionnées par
timestamp `YYYYMMDDHHMMSS_<slug>.sql`.

```bash
# Créer une migration
supabase migration new add_jury_applications_table

# Appliquer en local
supabase db reset

# Appliquer en preview branch (recommandé pour PR sensibles)
# via MCP Supabase ou Dashboard → Branches
```

**Règles** :

- Pas de `DROP TABLE` sans backup + plan rollback documenté.
- Toutes les nouvelles tables → `ENABLE ROW LEVEL SECURITY` + policies dès la migration.
- Les RPC critiques (signature, écriture cross-table) → `SECURITY DEFINER` +
  `SET search_path = public, pg_temp`.
- Tester en preview branch avant merge `main` si la migration touche des données prod.

Pour appliquer en prod, utiliser le MCP Supabase (`apply_migration`) ou Dashboard SQL
Editor. Documenter dans la PR la commande exacte exécutée.

---

## Tests E2E Playwright

Scaffolded dans `tests/e2e/`. Config : `tests/e2e/playwright.config.js`.

```bash
npm run test:e2e:install     # install browsers (1ère fois)
npm run test:e2e             # headless
npm run test:e2e:ui          # mode UI debug
```

Les tests pointent vers une instance Supabase preview branch dédiée (voir
[USER-ACTIONS-V3.md § G.1](docs/USER-ACTIONS-V3.md#g-ci--déploiement)). Le job CI
GitHub Actions est scaffolded mais commenté en attendant les secrets.

---

## Conventions code

- **Composants React** : PascalCase (`AdminCockpit.jsx`).
- **Fichiers utils** : kebab-case (`format-currency.js`).
- **Pas de TypeScript strict** (jsconfig.json) — mais JSDoc bienvenu.
- **Imports** : toujours via alias `@/` (résolu vers `src/`).
- **Supabase access** : toujours via les entités de `@/lib/db.js` ou RPC dédiées
  (`@/lib/rsa/*.js`). Jamais d'appel direct à `supabase.from(...)` dans un composant.
- **Auth** : via `@/lib/AuthContext.jsx` + helpers `@/lib/platform/*.js`.
- **i18n** : FR par défaut. EN priorité pour les pages jury (`/Jury`, `/DevenirJury`).
  DE différé V4.1.

---

## Sécurité

- Ne **jamais** commit de secret (`.env.local`, service_role keys, Resend API keys).
  `.gitignore` couvre `.env.*` sauf `.env.example`.
- Toute nouvelle entrée user-generated (form, query param, upload) doit être
  validée côté client (Zod) **et** côté serveur (RLS policy ou check RPC).
- Pour les fichiers uploadés : préférer le bucket `dossiers` (privé + signed URLs).
  Le bucket `uploads` legacy est en cours de lockdown (cf USER-ACTIONS § F.1).
- Reporter toute faille via email privé à mathieubal@gmail.com avant ouvrir une issue
  publique.

---

Merci de contribuer.
