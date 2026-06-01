// ============================================================================
// V2 Module 7 — JuryApplication (funnel d'acquisition jury)
// ============================================================================
// Table jury_applications + RPC SECURITY DEFINER (cf.
// supabase/migrations/20260530_rsa_v2_jury_funnel.sql).
//
// Surface :
//   - apply()             : soumission publique (anon OK) via rsa_apply_jury
//   - listByClub()        : queue de revue côté club_admin (rsa_list_jury_applications)
//   - reject()            : refus typé (rsa_reject_jury_application)
//   - approve()           : flip status='approved' uniquement (rsa_approve_jury_application).
//                           Aucun compte / email / affectation session. Renvoie la ligne.
//   - addManualJuror()    : crée une candidature approved liée à une session (rsa_add_manual_juror)
//   - removeFromSession() : retire l'affectation à une session (rsa_remove_juror_from_session)
//   - listForSession()    : roster d'une session — pending + approved (rsa_session_jurors)
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
    roleTitle = null,
    bio = null,
    photoPath = null,
    preferredThemes = [],
    availabilitySessionIds = [],
    preferredLang = 'fr',
  }) {
    const { data, error } = await supabase.rpc('rsa_apply_jury', {
      p_club_id: clubId,
      p_edition_id: editionId,
      p_email: email,
      p_full_name: fullName,
      p_qualite: qualite,
      p_organisation: organisation,
      p_role_title: roleTitle,
      p_bio: bio,
      p_photo_path: photoPath,
      p_preferred_themes: Array.isArray(preferredThemes) ? preferredThemes : [],
      p_availability_session_ids: Array.isArray(availabilitySessionIds) ? availabilitySessionIds : [],
      p_preferred_lang: preferredLang || 'fr',
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

  // Approbation = flip de statut serveur (RPC). Aucun compte/email/affectation.
  async approve(id) {
    const { data, error } = await supabase.rpc('rsa_approve_jury_application', {
      p_application_id: id,
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data; // la ligne jury_applications
  },

  // Ajout manuel d'un juré (candidature approved attachée à la session).
  async addManualJuror({ sessionId, fullName, qualite = null, email = null }) {
    const { data, error } = await supabase.rpc('rsa_add_manual_juror', {
      p_session_id: sessionId,
      p_full_name: fullName,
      p_qualite: qualite,
      p_email: email,
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  },

  // Retire le juré d'UNE session (reste approved pour ses autres sessions).
  async removeFromSession({ applicationId, sessionId }) {
    const { error } = await supabase.rpc('rsa_remove_juror_from_session', {
      p_application_id: applicationId,
      p_session_id: sessionId,
    });
    if (error) throw error;
  },

  // Liste les candidatures (roster) d'une session : pending + approved.
  async listForSession(sessionId) {
    const { data, error } = await supabase.rpc('rsa_session_jurors', {
      p_session_id: sessionId,
    });
    if (error) throw error;
    return data || [];
  },
};
