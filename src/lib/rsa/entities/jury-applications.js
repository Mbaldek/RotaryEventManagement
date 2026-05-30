// ============================================================================
// V2 Module 7 — JuryApplication (funnel d'acquisition jury)
// ============================================================================
// Table jury_applications + RPC SECURITY DEFINER (cf.
// supabase/migrations/20260530_rsa_v2_jury_funnel.sql).
//
// Surface :
//   - apply()      : soumission publique (anon OK) via rsa_apply_jury
//   - listByClub() : queue de revue côté club_admin (rsa_list_jury_applications)
//   - reject()     : refus typé (rsa_reject_jury_application)
//   - approve()    : approbation ; renvoie { application, needsAuthCreation, userId }
//                    (rsa_approve_jury_application — la RPC peut signaler que la
//                     finalisation passe par l'edge function send-jury-welcome qui
//                     créera le compte auth.users + magic-link).
//
// Côté lecture pour le candidat lui-même : la RLS ja_select autorise la lecture par
// email matching auth.jwt -> on peut faire un .from('jury_applications').select()
// classique côté front si jamais on construit une page « ma candidature ».

import { supabase } from '@/lib/supabase';
import { createEntity } from './_createEntity';

export const JuryApplication = {
  ...createEntity('jury_applications'),

  // Soumission publique (RPC SECURITY DEFINER, GRANT anon+authenticated).
  // Retourne la ligne insérée. Lève une exception SQL en cas de doublon pending.
  async apply({
    clubId,
    editionId = null,
    email,
    fullName,
    qualite,
    organisation = null,
    bio = null,
    photoPath = null,
    preferredThemes = [],
    availabilitySessionIds = [],
  }) {
    const { data, error } = await supabase.rpc('rsa_apply_jury', {
      p_club_id: clubId,
      p_edition_id: editionId,
      p_email: email,
      p_full_name: fullName,
      p_qualite: qualite,
      p_organisation: organisation,
      p_bio: bio,
      p_photo_path: photoPath,
      p_preferred_themes: Array.isArray(preferredThemes) ? preferredThemes : [],
      p_availability_session_ids: Array.isArray(availabilitySessionIds) ? availabilitySessionIds : [],
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  },

  // Liste des candidatures d'un club. status = 'pending' | 'approved' | 'rejected'
  // | 'cancelled' | null (toutes). RLS + le filtre serveur garantissent que seuls
  // master_admin / club_admin du club voient quoi que ce soit.
  async listByClub(clubId, status = null) {
    if (!clubId) return [];
    const { data, error } = await supabase.rpc('rsa_list_jury_applications', {
      p_club_id: clubId,
      p_status: status,
    });
    if (error) throw error;
    return data || [];
  },

  // Refus (master_admin OR club_admin du club). note peut être null ou string.
  async reject(id, note = null) {
    const { data, error } = await supabase.rpc('rsa_reject_jury_application', {
      p_application_id: id,
      p_note: note,
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  },

  // Approbation. La RPC renvoie une row { application, needs_auth_creation, user_id }.
  // - Si needsAuthCreation = true : le candidat n'a pas encore de compte auth.users.
  //   Le club_admin doit lui envoyer un magic-link (via l'Email Studio M9 ou
  //   l'edge function send-jury-welcome, à venir). Une fois le candidat connecté
  //   au moins une fois, rappeler approve() finalise membership + profile.
  // - Sinon : le membership 'jury' et la fiche platform_jury_profiles sont créés
  //   et l'application porte approved_user_id.
  async approve(id) {
    const { data, error } = await supabase.rpc('rsa_approve_jury_application', {
      p_application_id: id,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { application: null, needsAuthCreation: false, userId: null };
    return {
      application: row.application,
      needsAuthCreation: !!row.needs_auth_creation,
      userId: row.user_id || null,
    };
  },
};
