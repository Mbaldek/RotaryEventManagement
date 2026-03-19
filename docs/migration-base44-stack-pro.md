# Migration Base44 → Stack Pro
> GitHub + Supabase + Vercel + Claude Code (local)

---

## Vue d'ensemble

```
Base44 zip → audit → GitHub → Supabase → Vercel → CC local
```

---

## Étape 1 — Extraire & auditer le zip

```bash
unzip base44-export.zip -d mon-app
cd mon-app
ls -la
cat package.json
```

**Ce qu'on cherche :**
- Framework détecté (Vite / CRA / Next.js ?)
- Dépendances à garder / remplacer
- Présence d'un schéma DB ou fichiers de migration
- Variables d'environnement utilisées

---

## Étape 2 — Initialiser le repo GitHub

```bash
git init

# .gitignore propre
cat > .gitignore << EOF
node_modules
.env
.env.local
dist
.DS_Store
.vercel
EOF

# Documenter les env vars sans les vraies valeurs
cp .env .env.example
# → vider les valeurs dans .env.example, garder les clés

git add .
git commit -m "feat: initial import from Base44"
```

Sur GitHub.com : créer le repo (sans README, sans .gitignore).

```bash
git remote add origin https://github.com/TON_USER/NOM_APP.git
git branch -M main
git push -u origin main
```

**Stratégie de branches :**
| Branche | Rôle |
|---|---|
| `main` | Production — deploy auto Vercel |
| `dev` | Staging — preview Vercel |
| `feat/*` | Features — PR → dev |

---

## Étape 3 — Setup Supabase

```bash
# Installer la CLI
npm install -g supabase

# Init + lien au projet
supabase init
supabase login
supabase link --project-ref TON_PROJECT_REF
```

Fichier `.env.local` (jamais commité) :

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Checklist Supabase :**
- [ ] Row Level Security (RLS) activé sur toutes les tables
- [ ] Politiques RLS définies (auth.uid() = user_id)
- [ ] Migrations versionnées dans `supabase/migrations/`
- [ ] Seed data pour le dev local (`supabase/seed.sql`)

---

## Étape 4 — Connecter Vercel

```bash
npm install -g vercel
vercel login
vercel   # suivre les prompts → lier au repo GitHub

# Ajouter les env vars
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

**Résultat :**
- `git push main` → deploy prod automatique
- Chaque PR → preview URL unique
- Rollback en 1 clic depuis le dashboard Vercel

---

## Étape 5 — CLAUDE.md pour Claude Code

Créer `/CLAUDE.md` à la racine du projet :

```markdown
# Projet : [NOM APP]

## Ce que fait l'app
[Description courte — 2 phrases max]

## Stack
- React + TypeScript + Vite
- Tailwind CSS + Lucide React
- Supabase (auth + DB + storage)
- Vercel (deploy)

## Structure
src/
  components/   → UI atoms/molecules (réutilisables)
  pages/        → routes (1 fichier = 1 route)
  lib/          → supabase client, helpers, constants
  hooks/        → custom hooks (useXxx)
  types/        → TypeScript types globaux

## Conventions
- Composants : PascalCase
- Hooks : useCamelCase
- Fichiers : kebab-case
- Props : toujours typées avec interface (jamais type inline)
- Pas de `any`. Jamais.
- Imports Supabase : toujours depuis `@/lib/supabase`

## Commandes
npm run dev          → dev local (http://localhost:5173)
npm run build        → build prod
npm run lint         → ESLint
supabase db push     → appliquer les migrations
supabase db reset    → reset DB + seed (dev only)

## Patterns à respecter
- Auth : via Supabase Auth, hook useUser() centralisé
- Data fetching : custom hooks (ex: useProjects, useUser)
- Error handling : toast notifications via [lib choisie]
- Loading states : skeleton loaders, pas de spinner global
```

---

## Étape 6 — Lancer en local

```bash
npm install
npm run dev
# → http://localhost:5173
```

---

## Scripts npm recommandés

Ajouter dans `package.json` :

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx",
    "db:push": "supabase db push",
    "db:reset": "supabase db reset",
    "db:types": "supabase gen types typescript --local > src/types/supabase.ts"
  }
}
```

---

## Checklist de migration complète

### Repo
- [ ] `.gitignore` propre (pas de secrets commités)
- [ ] `.env.example` documenté
- [ ] `CLAUDE.md` à la racine
- [ ] Branche `dev` créée

### Supabase
- [ ] Schéma migré depuis Base44
- [ ] RLS activé sur toutes les tables
- [ ] Types TypeScript générés (`npm run db:types`)
- [ ] Seed data pour développement local

### Vercel
- [ ] Repo GitHub connecté
- [ ] Variables d'environnement configurées (prod + preview)
- [ ] Deploy prod fonctionnel
- [ ] Preview deployments actifs sur les PRs

### Code
- [ ] Artefacts Base44 nettoyés (wrappers propriétaires, imports inutiles)
- [ ] Client Supabase centralisé dans `src/lib/supabase.ts`
- [ ] Auth flow fonctionnel
- [ ] Build prod sans erreur (`npm run build`)

---

## Workflow quotidien (post-migration)

```bash
# 1. Nouvelle feature
git checkout dev
git pull
git checkout -b feat/nom-de-la-feature

# 2. Dev local
npm run dev

# 3. Commit & push
git add .
git commit -m "feat: description"
git push origin feat/nom-de-la-feature

# 4. PR vers dev → review → merge → preview Vercel auto
# 5. PR dev → main → deploy prod auto
```
