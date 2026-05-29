// Fixtures seed — RSA Platform E2E.
//
// V3.0 = scaffolding. Helpers pour seeder/cleanup des rows de test via le
// Supabase service_role key. À étendre quand on aura un Supabase preview
// branch dédié au CI.
//
// IMPORTANT : NE JAMAIS pointer ces helpers vers la prod. Le check ci-dessous
// refuse de tourner si l'URL Supabase contient une string production-like.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PLAYWRIGHT_SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.PLAYWRIGHT_SERVICE_ROLE_KEY ?? '';

const PROD_GUARD = /\b(app\.rotary-startup|prod|production)\b/i;

let _client: SupabaseClient | null = null;

/**
 * Service-role client pour seeder/cleanup. Lève si pas configuré OU si URL
 * ressemble à de la prod (garde-fou).
 */
export function getServiceClient(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      '[seed] PLAYWRIGHT_SUPABASE_URL + PLAYWRIGHT_SERVICE_ROLE_KEY required. ' +
        'Set them to a non-production Supabase project.',
    );
  }
  if (PROD_GUARD.test(SUPABASE_URL)) {
    throw new Error(
      `[seed] Refusing to use Supabase URL that looks production-like: ${SUPABASE_URL}. ` +
        'Use a Supabase preview branch or dev project.',
    );
  }
  if (!_client) {
    _client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _client;
}

/**
 * Crée un dossier startup "brouillon" pour un email candidat donné. Renvoie
 * l'id ; sera supprimé via cleanupStartup().
 *
 * V3.0 stub — l'impl complète viendra avec le Supabase test branch (Vague 3).
 */
export async function seedDraftStartup(_opts: {
  ownerEmail: string;
  editionId: string;
  clubId: string;
  name?: string;
}): Promise<{ id: string }> {
  // TODO V3.3 : utiliser admin.createUser + insert startup avec owner_id.
  throw new Error('seedDraftStartup not implemented in V3.0 — wait for V3.3 test infra.');
}

export async function cleanupStartup(_id: string): Promise<void> {
  // TODO V3.3
}

/**
 * Provisionne un rôle plateforme via UPSERT app_user_roles (service_role bypass RLS).
 */
export async function seedRole(_email: string, _roles: string[]): Promise<void> {
  // TODO V3.3
}
