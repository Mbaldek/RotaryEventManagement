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

  // Approbation — pipeline unifié accès + email.
  // 1. rsa_approve_jury_application : flip status='approved' ; si le compte
  //    auth.users existe déjà → crée le membership 'jury' + la fiche
  //    platform_jury_profiles + approved_user_id, et renvoie needs_auth_creation=false.
  // 2. Si needsAuthCreation=true (candidat sans compte) → l'edge `invite-user`
  //    crée le compte auth, applique le membership 'jury' du club, génère un
  //    magic-link et envoie l'email d'accès Élysée (Resend).
  // 3. On rappelle l'RPC : le compte existant désormais, la fiche
  //    platform_jury_profiles (qualite/orga/bio/photo) est peuplée.
  // Retourne { application, needsAuthCreation, userId, accountInvited, inviteError? }.
  async approve(id, { lang = 'fr' } = {}) {
    const first = await this._rpcApprove(id);
    if (!first.needsAuthCreation) {
      return { ...first, accountInvited: false };
    }
    const app = first.application;
    if (!app?.email || !app?.club_id) {
      return { ...first, accountInvited: false, inviteError: 'missing_email_or_club' };
    }
    const { error: inviteErr } = await supabase.functions.invoke('invite-user', {
      body: { email: app.email, role: 'jury', club_id: app.club_id, lang },
    });
    if (inviteErr) {
      // L'approbation tient (status déjà 'approved') mais l'accès/email a échoué.
      return { ...first, accountInvited: false, inviteError: inviteErr.message || String(inviteErr) };
    }
    // Compte désormais créé → re-approve peuple platform_jury_profiles + approved_user_id.
    const second = await this._rpcApprove(id);
    return { ...second, accountInvited: true };
  },

  async _rpcApprove(id) {
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
