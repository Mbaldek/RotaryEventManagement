// Parcours 1 — Candidat soumet un dossier (RSA Module 1).
//
// V3.0 = scaffolding : on définit la séquence d'actions et les assertions
// minimales. La logique fine (sélection de fichiers, attente upload Supabase
// Storage, vérif éligibilité serveur) sera affinée en V3.3 quand on aura un
// Supabase preview avec édition 'dev' open + bucket dossiers vide.
//
// Flow couvert :
//   1. Candidat anon → /Candidater (landing du funnel)
//   2. Magic-link request OU JWT injection (V3.3) → atterit sur le funnel
//   3. Remplit les 5 étapes du funnel (cf. CandidatureFunnel.jsx)
//   4. Upload pitch deck (bucket dossiers) + exec summary
//   5. Submit final → RPC rsa_submit_dossier
//   6. Assert : status = 'soumis', UI montre la timeline avec étape "Soumis"
//
// Note : ce parcours teste la SÉCURITÉ implicite (RLS startups_applicant_insert
// + trigger startups_guard_update) en plus du parcours fonctionnel.

import { test, expect } from '@playwright/test';
import { signIn } from '../helpers/auth';
import { TEST_EDITION_ID, TEST_CLUB_ID } from '../fixtures/users';

test.describe('Parcours candidat — soumission dossier', () => {
  test.skip(
    !process.env.PLAYWRIGHT_SERVICE_ROLE_KEY,
    'Requires Supabase test preview branch (cf. tests/e2e/README.md)',
  );

  test('login → funnel → submit → status soumis', async ({ page }) => {
    // 1. Sign-in candidat (JWT injection via service_role).
    await signIn(page, 'candidate');

    // 2. Va sur la page d'accueil du funnel.
    await page.goto('/Candidater');
    await expect(page).toHaveURL(/\/Candidater/);

    // 3. Étape 1 — Identité société.
    // (Sélecteurs à valider sur le composant réel CandidatureFunnel.jsx.)
    await page.getByLabel(/Nom de la société/i).fill('Acme E2E Test');
    await page.getByLabel(/Personne de contact/i).fill('John Doe');
    await page.getByLabel(/Email/i).first().fill('e2e-candidate@example.com');
    await page.getByRole('button', { name: /Suivant/i }).click();

    // 4. Étape 2 — Société (country FR, creation_date, registration, founders_majority).
    await page.getByLabel(/Pays/i).selectOption('FR');
    await page.getByLabel(/Date de création/i).fill('2023-01-15');
    await page.getByLabel(/Numéro SIREN/i).fill('123456782');
    await page.getByLabel(/Fondateurs majoritaires/i).check();
    await page.getByRole('button', { name: /Suivant/i }).click();

    // 5. Étape 3 — Projet (value_prop, business_model, roadmap, team, traction, sectors).
    await page.getByLabel(/Proposition de valeur/i).fill('We solve X for Y.');
    await page.getByLabel(/Business model/i).fill('SaaS subscription €99/mo.');
    await page.getByLabel(/Roadmap/i).fill('Q1: MVP. Q2: paid pilots.');
    await page.getByLabel(/Équipe/i).fill('Founder + 2 engineers.');
    await page.getByLabel(/Traction/i).fill('10 paying pilots.');
    await page.getByLabel(/Tech/i).check(); // sector
    await page.getByRole('button', { name: /Suivant/i }).click();

    // 6. Étape 4 — Documents (upload pitch_deck + exec_summary).
    // TODO V3.3 : utiliser setInputFiles avec un fichier de fixture.
    //   await page.locator('input[type="file"][name="pitch_deck"]').setInputFiles('./tests/e2e/fixtures/sample.pdf');
    //   await expect(page.getByText(/uploadé|pitch_deck/i)).toBeVisible();

    // 7. Étape 5 — Récap + bouton Soumettre.
    await page.getByRole('button', { name: /Soumettre/i }).click();

    // 8. Assertion finale : redirige vers /MonDossier avec status "soumis".
    await expect(page).toHaveURL(/\/MonDossier/);
    await expect(page.getByText(/Soumis le/i)).toBeVisible({ timeout: 10_000 });

    // (Optionnel) verifier le badge éligibilité côté UI.
    // await expect(page.getByText(/Éligible|Flagged/i)).toBeVisible();

    // Cleanup : delete via service_role (cf. fixtures/seed.ts cleanupStartup).
    // TODO V3.3
    void TEST_EDITION_ID;
    void TEST_CLUB_ID;
  });
});
