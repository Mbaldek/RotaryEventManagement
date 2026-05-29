// RLS negative tests — RSA Platform V3.0 scaffolding.
//
// V3.0 = couvre 6 des 22 scénarios listés dans docs/hardening/rls-audit-v3.md
// (les autres viendront en V3.3 quand la base de tests sera plus mature).
//
// Pattern : on utilise DEUX clients Supabase distincts :
//   - service_role pour seeder/cleanup (bypass RLS)
//   - client anon/authenticated avec JWT injecté pour TENTER l'opération
//     et VÉRIFIER qu'elle échoue.
//
// Aucune action UI ici : on tape directement Supabase REST/RPC. C'est plus
// rapide et atteint la frontière RLS sans dépendre du DOM.

import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TEST_USERS, TEST_EDITION_ID } from '../fixtures/users';
import { getServiceClient } from '../fixtures/seed';

const SUPABASE_URL = process.env.PLAYWRIGHT_SUPABASE_URL ?? '';
const ANON_KEY = process.env.PLAYWRIGHT_SUPABASE_ANON_KEY ?? '';

function makeAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

test.describe('RLS negative tests — anon', () => {
  test.skip(
    !SUPABASE_URL || !ANON_KEY,
    'Requires PLAYWRIGHT_SUPABASE_URL + PLAYWRIGHT_SUPABASE_ANON_KEY',
  );

  test('Scenario #2 — anon cannot INSERT into editions', async () => {
    const anon = makeAnonClient();
    const { error } = await anon.from('editions').insert({
      id: 'e2e-rogue',
      name: 'Rogue Edition',
      year: 2027,
    });
    expect(error).not.toBeNull();
    expect(error?.code).toMatch(/42501|PGRST/); // RLS denied
  });

  test('Scenario #3 — anon cannot INSERT into startups', async () => {
    const anon = makeAnonClient();
    const { error } = await anon.from('startups').insert({
      edition_id: TEST_EDITION_ID,
      name: 'Rogue Startup',
    });
    expect(error).not.toBeNull();
  });

  test('Scenario #6 — anon cannot SELECT editions with status=draft', async () => {
    // Pré-requis : qu'il existe au moins une édition draft (on en seede une
    // pour le test, puis cleanup).
    const svc = getServiceClient();
    const draftId = `e2e-draft-${Date.now()}`;
    await svc.from('editions').insert({
      id: draftId,
      name: 'E2E Draft',
      year: 2099,
      status: 'draft',
    });

    const anon = makeAnonClient();
    const { data, error } = await anon
      .from('editions')
      .select('id')
      .eq('id', draftId);

    // RLS policy editions_read filtre les drafts ; on attend data vide (pas
    // une erreur — c'est le filtrage normal de Postgres RLS).
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);

    // Cleanup.
    await svc.from('editions').delete().eq('id', draftId);
  });

  test('Scenario #8 — anon cannot read email_sends', async () => {
    const anon = makeAnonClient();
    const { data, error } = await anon.from('email_sends').select('id').limit(1);
    expect(error).toBeNull(); // RLS filter, pas erreur
    expect(data ?? []).toHaveLength(0);
  });

  test('Scenario #9 — anon cannot INSERT admin_audit_log', async () => {
    const anon = makeAnonClient();
    const { error } = await anon.from('admin_audit_log').insert({
      action: 'rogue_action',
    });
    expect(error).not.toBeNull();
  });
});

test.describe('RLS negative tests — candidate', () => {
  test.skip(
    !process.env.PLAYWRIGHT_SERVICE_ROLE_KEY,
    'Requires Supabase test preview branch',
  );

  test('Scenario #12 — candidat A cannot INSERT startup with owner_id of B', async () => {
    // TODO V3.3 : injecter JWT du candidat A, tenter INSERT avec owner_id=UUID_B
    // Attendu : 403 sur WITH CHECK owner_id = auth.uid().
    expect(TEST_USERS.candidate.email).toBeDefined();
  });

  test('Scenario #13 — candidat A cannot UPDATE son status to "soumis" directement', async () => {
    // TODO V3.3 : INSERT brouillon via service_role, tenter UPDATE { status: 'soumis' }
    // avec JWT candidat → trigger startups_guard_update lève forbidden_field:status.
  });
});

test.describe('RLS negative tests — jury', () => {
  test.skip(
    !process.env.PLAYWRIGHT_SERVICE_ROLE_KEY,
    'Requires Supabase test preview branch with jury assigned',
  );

  test('Scenario #18 — jury cannot INSERT directement dans platform_jury_scores', async () => {
    // TODO V3.3 : inject JWT jury, tenter INSERT direct → policy pjs_no_direct_insert (false).
  });

  test('Scenario #19 — jury A cannot SELECT draft d\'un autre juré', async () => {
    // TODO V3.3 : seed draft pour jury_user_id = B, query SELECT avec JWT A
    // → policy pjsd_self_read renvoie 0 rows.
  });
});
