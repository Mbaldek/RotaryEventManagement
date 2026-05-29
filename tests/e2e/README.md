# E2E Tests — RSA Platform (Playwright)

**Statut V3.0 :** scaffolding seul. La majorité des `test()` sont `skip` tant
qu'un Supabase preview branch dédié n'est pas branché. La structure et les
configs sont en place pour qu'on puisse activer rapidement en V3.3.

## Structure

```
tests/e2e/
├── playwright.config.js     Config Playwright (3 browsers, retries CI, etc.)
├── README.md                Ce fichier
├── fixtures/
│   ├── users.ts             Emails de test (rôles plateforme)
│   └── seed.ts              Helpers seedage/cleanup via service_role
├── helpers/
│   └── auth.ts              signIn(role) — injection JWT
├── parcours/                Parcours fonctionnels critiques
│   ├── candidat.spec.ts
│   ├── comite-finalize.spec.ts
│   └── jury-score.spec.ts
└── security/
    └── rls.spec.ts          Tests négatifs RLS (6 scénarios V3.0)
```

## Commandes

| Commande | Action |
|----------|--------|
| `npm run test:e2e:install` | Installe les browsers Playwright (chromium + firefox + webkit) |
| `npm run test:e2e`         | Run headless tous les specs |
| `npm run test:e2e:ui`      | Ouvre le UI mode Playwright (mode debug interactif) |
| `npx playwright show-report` | Ouvre le dernier rapport HTML |

## Pré-requis pour activer les tests

### 1. Supabase test instance ISOLÉE

NE JAMAIS pointer Playwright vers la prod (`app.rotary-startup.org`). Options :

- **Supabase preview branches** (recommandé) — créer un branch depuis le
  dashboard ; il a son propre URL + clés.
- **Projet dev dédié** (alternative) — créer un 2e projet Supabase, lui
  appliquer les mêmes migrations.

Le helper `fixtures/seed.ts::getServiceClient()` refuse de tourner si l'URL
contient `app.rotary-startup` ou `prod` / `production`.

### 2. Variables d'environnement

Créer `tests/e2e/.env.local` (gitignored) ou exporter en CI :

```bash
PLAYWRIGHT_BASE_URL=http://localhost:5173
PLAYWRIGHT_SUPABASE_URL=https://<project-ref>.supabase.co
PLAYWRIGHT_SUPABASE_ANON_KEY=eyJhbGciOiJI...   # anon key du projet test
PLAYWRIGHT_SERVICE_ROLE_KEY=eyJhbGciOiJI...    # service role (jamais en prod)

# Emails de test — comptes existants dans le projet Supabase test
PLAYWRIGHT_TEST_EMAIL_CANDIDATE=rsa-e2e-candidate@example.com
PLAYWRIGHT_TEST_EMAIL_COMITE=rsa-e2e-comite@example.com
PLAYWRIGHT_TEST_EMAIL_JURY=rsa-e2e-jury@example.com
PLAYWRIGHT_TEST_EMAIL_ADMIN=rsa-e2e-admin@example.com
PLAYWRIGHT_TEST_EMAIL_MASTER=rsa-e2e-master@example.com

# Édition + session de test (seedés au préalable, status='open' / 'live')
PLAYWRIGHT_TEST_EDITION_ID=dev
PLAYWRIGHT_TEST_SESSION_ID=dev_s3_tech
PLAYWRIGHT_TEST_CLUB_ID=paris
```

### 3. Setup users de test côté Supabase

Pour chaque email ci-dessus :

1. Créer un user via Supabase Dashboard → Auth → Users → "Add user" (skip email
   confirmation pour avoir le compte immédiatement utilisable).
2. INSERT dans `app_user_roles` (via SQL editor, en service_role) le rôle approprié :
   ```sql
   INSERT INTO public.app_user_roles (email, roles)
   VALUES ('rsa-e2e-comite@example.com', ARRAY['comite']);
   ```
3. Pour le juré, AUSSI :
   ```sql
   INSERT INTO public.platform_jury_assignments (jury_user_id, session_id)
   VALUES (
     (SELECT id FROM auth.users WHERE email = 'rsa-e2e-jury@example.com'),
     'dev_s3_tech'
   );
   ```

### 4. Workflow CI (V3.3+)

Le job e2e du `.github/workflows/ci.yml` est **désactivé** en V3.0. Pour
l'activer en V3.3 :

1. Ajouter `playwright install --with-deps` dans le step setup.
2. Variables Secrets GitHub : `PLAYWRIGHT_SUPABASE_URL` (= preview branch),
   `PLAYWRIGHT_SERVICE_ROLE_KEY`, `PLAYWRIGHT_SUPABASE_ANON_KEY`, etc.
3. Step :
   ```yaml
   - run: npm run test:e2e
     env:
       PLAYWRIGHT_BASE_URL: ${{ env.PREVIEW_URL }}
       PLAYWRIGHT_SUPABASE_URL: ${{ secrets.PLAYWRIGHT_SUPABASE_URL }}
       ...
   ```
4. Upload le rapport HTML en artifact :
   ```yaml
   - uses: actions/upload-artifact@v4
     if: always()
     with:
       name: playwright-report
       path: playwright-report/
       retention-days: 7
   ```

## Comment écrire un nouveau test

1. **Parcours fonctionnel** → `parcours/<feature>.spec.ts`.
2. **Test négatif RLS** → ajouter un bloc dans `security/rls.spec.ts`,
   numéroter le scénario en référence à `docs/hardening/rls-audit-v3.md`.
3. **Helpers communs** → enrichir `helpers/` plutôt que dupliquer.

Convention : un test doit nettoyer ce qu'il crée (cleanup dans `afterEach` ou
`afterAll` via service_role).

## TODO V3.3

- [ ] Implémenter `helpers/auth.ts::signIn` (JWT injection via admin.generateLink)
- [ ] Implémenter `fixtures/seed.ts::seedDraftStartup`, `seedRole`, etc.
- [ ] Activer firefox + webkit (V3.0 = chromium seul)
- [ ] Couvrir les 16 scénarios RLS restants
- [ ] Brancher GitHub Actions sur un Supabase preview branch (1 par PR)
- [ ] Ajouter parcours master_admin (create club, create competition)
- [ ] Ajouter parcours admin (lock + publish session)
- [ ] Visual regression sur les pages Élysée (Percy ou Playwright snapshot)
