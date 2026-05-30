// ─────────────────────────────────────────────────────────────────────────────
// Module 4a — AppUserRole (provisionning rôles plateforme, admin only)
// ─────────────────────────────────────────────────────────────────────────────
// La table app_user_roles est verrouillée côté écriture (service_role only) ; en
// lecture elle n'expose que la ligne du caller. M4a passe par deux RPC SECURITY DEFINER :
//   - rsa_list_app_user_roles() : lecture admin de TOUTE la table.
//   - rsa_assign_role(email, roles[]) : UPSERT avec last-admin protection.

import { supabase } from '@/lib/supabase';

export const AppUserRole = {
  // Liste admin de toutes les lignes app_user_roles (RPC SECURITY DEFINER admin-only).
  async list() {
    const { data, error } = await supabase.rpc('rsa_list_app_user_roles');
    if (error) throw error;
    return data || [];
  },

  // Lecture d'une ligne pour un email donné (utilise la même RPC + filtre client).
  // Plus simple et plus sûr que d'ouvrir un second endpoint.
  async forEmail(email) {
    if (!email) return null;
    const norm = String(email).trim().toLowerCase();
    const all = await this.list();
    return all.find((r) => String(r.email).toLowerCase() === norm) || null;
  },

  // Assignation/révocation : roles = liste finale (vide = révocation totale).
  // RPC valide les rôles ⊆ ('startup','jury','comite','admin') et applique la
  // last-admin protection. Renvoie la ligne mise à jour.
  async assign({ email, roles }) {
    const { data, error } = await supabase.rpc('rsa_assign_role', {
      p_email: email,
      p_roles: roles,
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  },

  // Révocation totale (sucre — délègue à assign avec roles=[]).
  async revoke(email) {
    return this.assign({ email, roles: [] });
  },
};
