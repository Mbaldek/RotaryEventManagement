// Playwright config — RSA Platform E2E (V3.0 scaffolding).
//
// Comment lancer
// ─────────────────────────────────────────────────────────────────────────────
//   1. Pré-requis : un Supabase de test ISOLÉ (jamais la prod). Voir
//      tests/e2e/README.md pour le setup recommandé (Supabase preview branch
//      ou projet dev dédié).
//   2. Configurer les env vars (cf. tests/e2e/.env.example) :
//        PLAYWRIGHT_BASE_URL          (default http://localhost:5173)
//        PLAYWRIGHT_SUPABASE_URL      Supabase test instance
//        PLAYWRIGHT_SERVICE_ROLE_KEY  Pour seeder/cleanup
//        PLAYWRIGHT_TEST_EMAIL_*      Emails de test (cf. fixtures/users.ts)
//   3. Installer browsers : `npm run test:e2e:install`
//   4. Lancer dev server : `npm run dev`
//   5. Lancer tests : `npm run test:e2e` (headless) ou `npm run test:e2e:ui`
//
// V3.0 = scaffolding seul (3 parcours critiques + 1 RLS spec). La logique
// d'injection identité/data sera affinée en V3.3 (Vague 3) avec un Supabase
// preview dédié branché à GitHub Actions.

import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: '.',
  // V3.0 : tolère que la majorité des tests soient "skipped" (data manquante en
  // CI). On vise un signal vert sur build + lint, et que les specs compilent.
  forbidOnly: !!process.env.CI,
  // Retries pour absorber les flakes réseau côté Supabase / Resend.
  retries: process.env.CI ? 2 : 0,
  // Sequential en local pour limiter les conflits sur les rows seedées ;
  // en CI on monte à 2 workers une fois qu'on a un Supabase test isolé.
  workers: process.env.CI ? 2 : 1,
  // Reporter HTML local + GitHub annotations en CI.
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }], ['list']],
  use: {
    baseURL: BASE_URL,
    // Trace capture seulement à l'échec (sinon ~50Mo par run).
    trace: 'on-first-retry',
    // Screenshots à l'échec uniquement.
    screenshot: 'only-on-failure',
    // Video uniquement à l'échec.
    video: 'retain-on-failure',
    // Désactive les animations pour réduire flake (Élysée a beaucoup de fade-in).
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox + WebKit activés mais skipped en V3.0 (juste pour la config valide).
    // À ré-activer une fois qu'on a vérifié la compat cross-browser des composants
    // Radix/framer-motion sur Élysée.
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      // testIgnore: ['**/*'],  // V3.0 dev-only ; CI run = chromium uniquement
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      // testIgnore: ['**/*'],
    },
  ],
  // Dev server auto-start si pas déjà up (utile en local, on désactive en CI
  // où on attend que la job précédente serve le build).
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
