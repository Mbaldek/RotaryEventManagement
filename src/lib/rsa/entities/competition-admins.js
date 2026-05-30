// ============================================================================
// V3 — CompetitionAdmin (tier 1, admin d'une compétition)
// ============================================================================
// Table competition_admins (cf. supabase/migrations/20260602_rsa_v3_competition_admin_role.sql).
// Toutes les écritures passent par les RPC SECURITY DEFINER :
//   - rsa_grant_competition_admin(user_id, edition_id)   — master_admin only
//   - rsa_revoke_competition_admin(user_id, edition_id)  — master_admin only
//   - rsa_list_competition_admins(edition_id)            — master_admin only
//
// Pour la lecture côté provider d'auth : my_competition_admin_editions()
// retourne text[] des éditions que le caller administre (lu en parallèle par
// PlatformAuthProvider, cf. auth.jsx).

import { supabase } from '@/lib/supabase';

export const CompetitionAdmin = {
  async grant(userId, editionId) {
    return supabase.rpc('rsa_grant_competition_admin', {
      p_user_id: userId,
      p_edition_id: editionId,
    });
  },

  async revoke(userId, editionId) {
    return supabase.rpc('rsa_revoke_competition_admin', {
      p_user_id: userId,
      p_edition_id: editionId,
    });
  },

  async listForEdition(editionId) {
    const { data, error } = await supabase.rpc('rsa_list_competition_admins', {
      p_edition_id: editionId,
    });
    if (error) throw error;
    return data || [];
  },
};
