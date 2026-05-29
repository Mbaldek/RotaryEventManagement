// Parcours 3 — Jury note une session live (RSA Module 3).
//
// V3.0 = scaffolding. À étoffer en V3.3.
//
// Flow couvert :
//   1. Pré-requis : édition 'dev' open, session_X status='live', juré assigné
//      via platform_jury_assignments, 2 startups affectées à la session.
//   2. Jury sign-in → /Jury (dashboard)
//   3. Click sur la session live → vue scoring
//   4. Note la 1re startup : 6 sliders (value_prop, market, business_model,
//      team, pitch_quality, societal_impact) 0..5 + comment optionnel
//   5. Submit via rsa_submit_jury_score → la row apparaît dans platform_jury_scores
//   6. Assert : UI montre la startup comme "Notée", draft est cleared.
//
// Le test négatif "jury non assigné ne peut pas scorer" est dans
// tests/e2e/security/rls.spec.ts.

import { test, expect } from '@playwright/test';
import { signIn } from '../helpers/auth';
import { TEST_SESSION_ID } from '../fixtures/users';

test.describe('Parcours jury — scoring session live', () => {
  test.skip(
    !process.env.PLAYWRIGHT_SERVICE_ROLE_KEY,
    'Requires Supabase test preview branch with live session + assigned juror',
  );

  test('jury ouvre session live, note startup, submit OK', async ({ page }) => {
    await signIn(page, 'jury');

    await page.goto('/Jury');

    // 1. La session live doit être listée.
    await expect(page.getByText(new RegExp(TEST_SESSION_ID, 'i'))).toBeVisible();

    // 2. Click pour entrer dans la session.
    await page.getByText(new RegExp(TEST_SESSION_ID, 'i')).click();
    await expect(page).toHaveURL(/\/Jury\/.+/);

    // 3. Sélectionner la 1re startup à noter.
    const firstStartup = page.locator('[data-testid="startup-card"]').first();
    await firstStartup.click();

    // 4. Régler les 6 sliders à 4 (au-dessus du seuil par défaut 3).
    const criteria = [
      'value_prop', 'market', 'business_model',
      'team', 'pitch_quality', 'societal_impact',
    ];
    for (const c of criteria) {
      // Le slider Radix attend un focus + arrow keys ou un fill direct.
      await page.locator(`[data-criterion="${c}"] input[type="range"]`).fill('4');
    }

    // 5. Ajouter un commentaire.
    await page.getByLabel(/Commentaire/i).fill('Pitch clair, équipe solide, marché vaste.');

    // 6. Submit.
    await page.getByRole('button', { name: /Soumettre|Valider/i }).click();

    // 7. Toast / badge "Notée" apparaît.
    await expect(page.getByText(/Note enregistrée|Soumis/i)).toBeVisible({ timeout: 5_000 });
    await expect(firstStartup.getByText(/Notée/i)).toBeVisible();
  });
});
