// Entité Prize — module Prix CRUD multi-clubs (V2.5).
//
// Fichier autonome (ne dépend pas de @/lib/rsa/entities ni de @/lib/db) ; expose
// la même surface que les autres entités RSA (list / create / update / delete /
// award). Toutes les écritures passent par les RPC SECURITY DEFINER de la
// migration 20260531_rsa_v25_prizes.sql ; la RLS prizes_* (SELECT public ;
// INSERT/UPDATE/DELETE selon scope) reste la frontière de sécurité côté serveur.
//
// Sémantique scope :
//   - clubId === null/undefined  → prix au niveau compétition (master_admin)
//   - clubId === '<id>'          → prix de club (master_admin OR club_admin du club)
//
// Le tri par défaut (position ASC, created_at ASC) est appliqué par rsa_list_prizes.

import { supabase } from '@/lib/supabase';

function unwrap(data) {
  return Array.isArray(data) ? data[0] : data;
}

export const Prize = {
  // List filtré par édition + club + session. clubId/sessionId optionnels.
  //   { editionId, clubId?, sessionId? } → Prize[]
  // Aucun filtrage strict côté serveur : rsa_list_prizes lit en lecture publique
  // (RLS prizes_read autorise SELECT à tous), filtre par params.
  async list({ editionId, clubId = null, sessionId = null } = {}) {
    if (!editionId) return [];
    const { data, error } = await supabase.rpc('rsa_list_prizes', {
      p_edition_id: editionId,
      p_club_id:    clubId ?? null,
      p_session_id: sessionId ?? null,
    });
    if (error) throw error;
    return data || [];
  },

  // Création d'un prix. Côté serveur :
  //   - master_admin pour kind='general' OU clubId IS NULL
  //   - master_admin OR club_admin du club sinon
  // Validation centralisée côté RPC (nom non vide, amount >= 0, devises whitelist).
  async create({
    editionId,
    clubId = null,
    sessionId = null,
    kind = 'special',
    name,
    amount,
    currency = 'EUR',
    juryType = 'regular',
    description = null,
  }) {
    const { data, error } = await supabase.rpc('rsa_create_prize', {
      p_edition_id:  editionId,
      p_club_id:     clubId ?? null,
      p_session_id:  sessionId ?? null,
      p_kind:        kind,
      p_name:        name,
      p_amount:      amount,
      p_currency:    currency,
      p_jury_type:   juryType,
      p_description: description ?? null,
    });
    if (error) throw error;
    return unwrap(data);
  },

  // Update partiel. Chaque champ undefined / null = ne pas toucher.
  // Pour vider session_id, passer la chaîne vide ''.
  async update(id, {
    name,
    amount,
    currency,
    juryType,
    description,
    sessionId,
    position,
  } = {}) {
    if (!id) throw new Error('Prize.update: id requis');
    const { data, error } = await supabase.rpc('rsa_update_prize', {
      p_id:          id,
      p_name:        name ?? null,
      p_amount:      amount ?? null,
      p_currency:    currency ?? null,
      p_jury_type:   juryType ?? null,
      p_description: description ?? null,
      p_session_id:  sessionId ?? null,
      p_position:    position ?? null,
    });
    if (error) throw error;
    return unwrap(data);
  },

  // Delete. Refusé côté RPC si awarded_to non NULL.
  async delete(id) {
    if (!id) return;
    const { error } = await supabase.rpc('rsa_delete_prize', { p_id: id });
    if (error) throw error;
  },

  // Décerne un prix à une startup. SET awarded_to + awarded_at côté serveur.
  async award({ id, startupId }) {
    if (!id || !startupId) {
      throw new Error('Prize.award: id et startupId requis');
    }
    const { data, error } = await supabase.rpc('rsa_award_prize', {
      p_id:         id,
      p_startup_id: startupId,
    });
    if (error) throw error;
    return unwrap(data);
  },
};

export default Prize;
