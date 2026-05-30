// ============================================================================
// V2 MULTI-CLUB — Entités clubs / memberships / edition_clubs
// ============================================================================
// Toutes les écritures passent par les RPC SECURITY DEFINER de l'étape 2 (cf.
// supabase/migrations/20260529_rsa_v2_club_management_rpcs.sql). Les lectures
// passent par les RPC quand un filtrage par rôle est nécessaire (rsa_list_*),
// sinon directement via la table (clubs/edition_clubs ont SELECT public).

import { supabase } from '@/lib/supabase';
import { createEntity } from './_createEntity';

// Clubs : référence des clubs Rotary participants
export const Club = {
  ...createEntity('clubs'),

  // Liste publique des clubs (utilisée par le dropdown candidature multi-club).
  // Passe par le RPC pour cohérence (et possible filtrage futur).
  async listAll() {
    const { data, error } = await supabase.rpc('rsa_list_clubs');
    if (error) throw error;
    return data || [];
  },

  // Création V2.5 — réservée master_admin (vérifié côté serveur).
  //
  // V2.5 refonte 2026-05-31 : l'ID n'est plus fourni par le caller (généré
  // côté serveur depuis le nom). Signature étendue avec country/language +
  // représentant (first/last/email/phone) + président + coordonnées clubs.
  //
  // V2 hotfix conservé : watchdog 12s pour éviter le spinner perpétuel si le
  // RPC ne répond pas. Logs console.debug pour le diagnostic.
  async createClub({
    name,
    country,
    language = 'fr',
    contactFirstName,
    contactLastName,
    contactEmail,
    contactPhone,
    presidentFirstName,
    presidentLastName,
    presidentEmail,
    clubEmail,
    clubPhone,
    clubAddress,
  }) {
     
    console.debug('[Club.createClub] start', { name, country, language });
    const rpcPromise = supabase.rpc('rsa_create_club', {
      p_name: name,
      p_country: country,
      p_language: language ?? 'fr',
      p_contact_first_name: contactFirstName ?? null,
      p_contact_last_name: contactLastName ?? null,
      p_contact_email: contactEmail ?? null,
      p_contact_phone: contactPhone ?? null,
      p_president_first_name: presidentFirstName ?? null,
      p_president_last_name: presidentLastName ?? null,
      p_president_email: presidentEmail ?? null,
      p_club_email: clubEmail ?? null,
      p_club_phone: clubPhone ?? null,
      p_club_address: clubAddress ?? null,
    });
    const watchdog = new Promise((_resolve, reject) =>
      setTimeout(() => reject(new Error('createClub_timeout: pas de réponse après 12s — vérifier réseau, JWT ou Supabase status')), 12000),
    );
    const { data, error } = await Promise.race([rpcPromise, watchdog]).catch((timeoutErr) => {
       
      console.error('[Club.createClub] watchdog fired', timeoutErr);
      throw timeoutErr;
    });
     
    console.debug('[Club.createClub] response', { data, error });
    if (error) throw error;
    return data;
  },

  // Édition V2.5 — master_admin OR club_admin du club (vérifié côté serveur).
  //
  // Convention : un champ omis (undefined) OU passé à null = ne pas toucher.
  // Pour vider un champ, passer la chaîne vide '' (normalisée côté SQL).
  // L'id n'est jamais modifiable.
  async updateClub({
    id,
    name,
    country,
    language,
    contactFirstName,
    contactLastName,
    contactEmail,
    contactPhone,
    presidentFirstName,
    presidentLastName,
    presidentEmail,
    clubEmail,
    clubPhone,
    clubAddress,
  }) {
    if (!id) throw new Error('updateClub: id requis');
    const { data, error } = await supabase.rpc('rsa_update_club', {
      p_id: id,
      p_name: name ?? null,
      p_country: country ?? null,
      p_language: language ?? null,
      p_contact_first_name: contactFirstName ?? null,
      p_contact_last_name: contactLastName ?? null,
      p_contact_email: contactEmail ?? null,
      p_contact_phone: contactPhone ?? null,
      p_president_first_name: presidentFirstName ?? null,
      p_president_last_name: presidentLastName ?? null,
      p_president_email: presidentEmail ?? null,
      p_club_email: clubEmail ?? null,
      p_club_phone: clubPhone ?? null,
      p_club_address: clubAddress ?? null,
    });
    if (error) throw error;
    return data;
  },
};

// ClubMembership : rôles par-club (parallèle à app_user_roles pour les globaux)
export const ClubMembership = {
  ...createEntity('club_memberships'),

  // Membres d'un club, joint avec auth.users + profiles (via RPC car JOIN auth).
  // Réservé master_admin ou club_admin du club (filtrage côté serveur).
  async listMembers(clubId) {
    if (!clubId) return [];
    const { data, error } = await supabase.rpc('rsa_list_club_members', { p_club_id: clubId });
    if (error) throw error;
    return data || [];
  },

  // Mes propres memberships (tous clubs, tous rôles) — lu par PlatformAuthProvider.
  async myMemberships() {
    const { data, error } = await supabase.rpc('my_club_memberships');
    if (error) {
      // Tolérance : si l'RPC n'existe pas (build local sans migration), on retombe
      // sur la table directe via la RLS self-read.
      const { data: rows } = await supabase.from('club_memberships').select('club_id, role');
      return rows || [];
    }
    return data || [];
  },

  // Assignation — master_admin ou club_admin du club.
  async assign({ email, clubId, role }) {
    const { data, error } = await supabase.rpc('rsa_assign_club_role', {
      p_email: email,
      p_club_id: clubId,
      p_role: role,
    });
    if (error) throw error;
    return data;
  },

  // Retrait — master_admin ou club_admin du club (garde-fou last-admin).
  async revoke({ email, clubId, role }) {
    const { error } = await supabase.rpc('rsa_revoke_club_role', {
      p_email: email,
      p_club_id: clubId,
      p_role: role,
    });
    if (error) throw error;
  },
};

// EditionClub : junction club × compétition (avec override eligibility_rules)
export const EditionClub = {
  ...createEntity('edition_clubs'),

  // Clubs participants à une compétition (publique pour le dropdown candidature).
  async forEdition(editionId) {
    if (!editionId) return [];
    const { data, error } = await supabase
      .from('edition_clubs')
      .select('*, club:clubs(*)')
      .eq('edition_id', editionId);
    if (error) throw error;
    return data || [];
  },

  // Attachement d'un club à une compétition (master_admin only).
  async attach({ editionId, clubId, eligibilityRules }) {
    const { data, error } = await supabase.rpc('rsa_attach_club_to_edition', {
      p_edition_id: editionId,
      p_club_id: clubId,
      p_eligibility_rules: eligibilityRules ?? {},
    });
    if (error) throw error;
    return data;
  },

  // Détachement (refusé si startups/sessions existent — intégrité).
  async detach({ editionId, clubId }) {
    const { error } = await supabase.rpc('rsa_detach_club_from_edition', {
      p_edition_id: editionId,
      p_club_id: clubId,
    });
    if (error) throw error;
  },

  // Refonte hiérarchie (Phase 1) — Renvoie l'edition_id le plus pertinent
  // pour un club donné, pour résoudre les liens legacy `?scope=club:{cid}` en
  // `?scope=club:{eid}/{cid}`. Priorité : édition active (status ∈ open|sessions|
  // finale), sinon la plus récente par year DESC. Renvoie null si le club n'est
  // attaché à aucune compétition.
  async forClub(clubId) {
    if (!clubId) return null;
    const { data, error } = await supabase
      .from('edition_clubs')
      .select('edition_id, edition:editions(id, status, year, application_open)')
      .eq('club_id', clubId);
    if (error) throw error;
    const rows = (data || []).filter((r) => r.edition);
    if (rows.length === 0) return null;
    const ACTIVE = new Set(['open', 'sessions', 'finale']);
    rows.sort((a, b) => {
      const ea = a.edition;
      const eb = b.edition;
      const aActive = ACTIVE.has(ea.status) ? 0 : 1;
      const bActive = ACTIVE.has(eb.status) ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      if ((eb.year || 0) !== (ea.year || 0)) return (eb.year || 0) - (ea.year || 0);
      const aDate = ea.application_open || '';
      const bDate = eb.application_open || '';
      return bDate.localeCompare(aDate);
    });
    return rows[0].edition_id;
  },

  // Chantier 2 — Renvoie l'objet eligibility_rules per-club (JSONB) pour
  // (editionId, clubId). Utilisé par useEditionClubRules pour fusionner avec
  // les règles globales d'édition. null si la junction n'existe pas, {} si
  // elle existe mais sans override.
  async rulesForClub(editionId, clubId) {
    if (!editionId || !clubId) return null;
    const { data, error } = await supabase
      .from('edition_clubs')
      .select('eligibility_rules')
      .eq('edition_id', editionId)
      .eq('club_id', clubId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return data.eligibility_rules && typeof data.eligibility_rules === 'object'
      ? data.eligibility_rules
      : {};
  },
};
