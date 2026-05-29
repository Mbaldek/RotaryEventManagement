// Fixtures users — RSA Platform E2E.
//
// V3.0 = stubs. Les emails sont lus depuis env vars pour qu'on puisse pointer
// vers des comptes de test sur le Supabase preview branch. Pas de password
// (magic-link only) — on injecte le JWT directement via helpers/auth.ts.
//
// Convention email :
//   - mat+rsa-candidate@example.com   → rôle bare (candidat)
//   - mat+rsa-comite@example.com      → has_platform_role('comite')
//   - mat+rsa-jury@example.com        → has_platform_role('jury') + assigned session_X
//   - mat+rsa-admin@example.com       → has_platform_role('admin')
//   - mat+rsa-master@example.com      → has_platform_role('master_admin')
//
// En prod CI, mettre ces emails sur un domaine de test contrôlé. Ne JAMAIS
// utiliser de vrais emails dans le repo.

export type TestRole =
  | 'candidate'
  | 'comite'
  | 'jury'
  | 'admin'
  | 'master_admin'
  | 'anon';

const env = (k: string, fallback: string) => process.env[k] ?? fallback;

export const TEST_USERS: Record<Exclude<TestRole, 'anon'>, { email: string }> = {
  candidate:    { email: env('PLAYWRIGHT_TEST_EMAIL_CANDIDATE',    'rsa-e2e-candidate@example.com') },
  comite:       { email: env('PLAYWRIGHT_TEST_EMAIL_COMITE',       'rsa-e2e-comite@example.com') },
  jury:         { email: env('PLAYWRIGHT_TEST_EMAIL_JURY',         'rsa-e2e-jury@example.com') },
  admin:        { email: env('PLAYWRIGHT_TEST_EMAIL_ADMIN',        'rsa-e2e-admin@example.com') },
  master_admin: { email: env('PLAYWRIGHT_TEST_EMAIL_MASTER',       'rsa-e2e-master@example.com') },
};

// Édition + session de test (matchent ce qu'on aura seed côté DB).
export const TEST_EDITION_ID = env('PLAYWRIGHT_TEST_EDITION_ID', 'dev');
export const TEST_SESSION_ID = env('PLAYWRIGHT_TEST_SESSION_ID', 'dev_s3_tech');
export const TEST_CLUB_ID    = env('PLAYWRIGHT_TEST_CLUB_ID',    'paris');
