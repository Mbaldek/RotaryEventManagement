// Helpers auth — RSA Platform E2E.
//
// V3.0 = scaffolding. Le magic-link Supabase n'est pas directement E2E-friendly :
// on contourne en générant un JWT côté service_role (via admin.generateLink)
// puis en injectant le token dans le localStorage Supabase de la page Playwright.
//
// Référence pattern : https://supabase.com/docs/guides/auth/server-side/oauth-with-pkce-flow
//                    https://github.com/orgs/supabase/discussions/4400 (test E2E with JWT injection)

import { Page } from '@playwright/test';
import { getServiceClient } from '../fixtures/seed';
import { TEST_USERS, TestRole } from '../fixtures/users';

/**
 * "Sign in" un user pour les tests E2E.
 *
 * Stratégie V3.3+ :
 *   1. Service-role génère un lien magique via admin.generateLink (type=magiclink).
 *   2. On extrait l'access_token + refresh_token de l'URL retournée.
 *   3. On les injecte dans le localStorage de Playwright sous la clé
 *      `sb-<project>-auth-token` (format Supabase v2).
 *   4. On reload la page : PlatformAuthProvider trouve la session et hydrate
 *      authUser + roles.
 *
 * V3.0 = stub (lève si appelé). À implémenter quand le Supabase preview branch
 * est setup et qu'on a un projet ref stable.
 */
export async function signIn(page: Page, role: Exclude<TestRole, 'anon'>): Promise<void> {
  const user = TEST_USERS[role];
  if (!user?.email) throw new Error(`signIn: no test user for role ${role}`);

  // V3.3 implementation outline :
  //   const supabase = getServiceClient();
  //   const { data, error } = await supabase.auth.admin.generateLink({
  //     type: 'magiclink',
  //     email: user.email,
  //     options: { redirectTo: 'http://localhost:5173/Login' },
  //   });
  //   if (error) throw error;
  //   const url = new URL(data.properties.action_link);
  //   // L'URL contient access_token=... refresh_token=... dans le fragment.
  //   const hash = url.hash.replace(/^#/, '');
  //   const params = new URLSearchParams(hash);
  //   const access_token = params.get('access_token');
  //   const refresh_token = params.get('refresh_token');
  //   await page.addInitScript(({ access_token, refresh_token, projectRef }) => {
  //     const key = `sb-${projectRef}-auth-token`;
  //     localStorage.setItem(key, JSON.stringify({
  //       access_token, refresh_token, expires_at: Date.now() / 1000 + 3600,
  //       token_type: 'bearer', user: {},
  //     }));
  //   }, { access_token, refresh_token, projectRef: PROJECT_REF });
  //   await page.goto('/');

  // Évite erreur de compile sur l'import non utilisé du client.
  void getServiceClient;

  throw new Error(`signIn(${role}) not implemented in V3.0 — wait for V3.3 test infra.`);
}

/**
 * Clear la session côté browser (logout simulé).
 */
export async function signOut(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
      .forEach((k) => localStorage.removeItem(k));
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith('sb-'))
      .forEach((k) => sessionStorage.removeItem(k));
  });
}
