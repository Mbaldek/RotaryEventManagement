// Parcours 2 — Comité décide éligible/rejeté/liste_attente (RSA Module 2).
//
// V3.0 = scaffolding. Logique fine à compléter en V3.3.
//
// Flow couvert :
//   1. Pré-requis : un dossier candidat est en status='soumis' (seedé via fixture).
//   2. Comité sign-in → /Selection
//   3. Voit le dossier dans la queue
//   4. Ouvre le drawer dossier
//   5. Sélectionne décision 'eligible' + assigned_session_id + rationale
//   6. Submit → RPC rsa_apply_selection_review (via insert review puis apply)
//   7. Assert : startups.status = 'affecte', startups.session_id = X
//
// Variante : 'rejete' avec rationale obligatoire.
// Variante : admin finalize (rsa_finalize_review) flips is_final=true.

import { test, expect } from '@playwright/test';
import { signIn } from '../helpers/auth';
import { TEST_SESSION_ID } from '../fixtures/users';

test.describe('Parcours comité — décision éligible', () => {
  test.skip(
    !process.env.PLAYWRIGHT_SERVICE_ROLE_KEY,
    'Requires Supabase test preview branch with seeded submitted dossier',
  );

  let startupId: string;

  test.beforeAll(async () => {
    // TODO V3.3 : seedSubmittedStartup() returns { id }
    // startupId = (await seedSubmittedStartup({ ... })).id;
    startupId = 'TODO-seed-id';
  });

  test('comité ouvre dossier, sélectionne éligible, statut bascule', async ({ page }) => {
    await signIn(page, 'comite');

    await page.goto('/Selection');
    await expect(page).toHaveURL(/\/Selection/);

    // 1. Voir le dossier dans la queue (filtre 'À examiner').
    await page.getByRole('tab', { name: /À examiner/i }).click();
    await expect(page.getByText(startupId.substring(0, 8))).toBeVisible({ timeout: 5_000 });

    // 2. Ouvrir le drawer dossier.
    await page.getByText(startupId.substring(0, 8)).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // 3. Sélection décision.
    await page.getByLabel(/Décision/i).selectOption('eligible');
    await page.getByLabel(/Session assignée/i).selectOption(TEST_SESSION_ID);
    await page.getByLabel(/Motif|Rationale/i).fill('Pertinent au cluster Tech, traction prometteuse.');

    // 4. Submit.
    await page.getByRole('button', { name: /Valider la décision/i }).click();

    // 5. Le drawer se ferme, le dossier passe à l'onglet 'Affecté'.
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
    await page.getByRole('tab', { name: /Affectés/i }).click();
    await expect(page.getByText(startupId.substring(0, 8))).toBeVisible();
  });

  test('admin finalize la décision comité (is_final=true)', async ({ page }) => {
    await signIn(page, 'admin');

    await page.goto('/Selection');
    // TODO V3.3 : ouvrir le dossier, cliquer "Valider tel quel" (rsa_finalize_review).
    void page;
  });
});
