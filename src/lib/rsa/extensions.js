// Entité Extension — V3.0 architecture Plugins / Extensions (Vague 1).
//
// Fichier autonome (ne dépend pas de @/lib/rsa/entities ni de @/lib/db) — sur le
// même patron que @/lib/rsa/prizes.js. Toutes les écritures passent par les RPC
// SECURITY DEFINER de la migration 20260601_rsa_v3_extensions.sql ; la RLS
// extensions_* reste la frontière de sécurité côté serveur.
//
// Sémantique scope :
//   - scope='master'  → extension globale plateforme (master_admin uniquement)
//   - scope='club'    → extension d'un club (master_admin OR club_admin du club)
//   - scope='edition' → extension d'une compétition (idem ; edition_id requis)
//
// Sémantique kind :
//   - 'funnel_step'    → step custom dans CandidatureFunnel (rendu V4)
//   - 'cockpit_tab'    → onglet custom dans Club/Master Cockpit (rendu V4)
//   - 'email_template' → template custom dans Email Studio (rendu V4)
//   - 'webhook'        → endpoint POST déclenché sur événements (V4)
//
// Le rendu réel JSON-schema arrive en V4 ; V3.0 expose juste le CRUD + le
// placeholder UI (ExtensionSlot rend "Extension: {name}" pour vérifier le pipe).

import { supabase } from '@/lib/supabase';

function unwrap(data) {
  return Array.isArray(data) ? data[0] : data;
}

export const EXTENSION_KINDS = ['funnel_step', 'cockpit_tab', 'email_template', 'webhook'];
export const EXTENSION_SCOPES = ['master', 'club', 'edition'];

export const Extension = {
  // List filtré. Tous les paramètres optionnels.
  //   { scope?, kind?, clubId?, editionId? } → Extension[]
  // RLS extensions_read s'applique : extensions actives master visibles
  // publiquement ; sinon master_admin OU membres du club concerné.
  async list({ scope = null, kind = null, clubId = null, editionId = null } = {}) {
    const { data, error } = await supabase.rpc('rsa_list_extensions', {
      p_scope:      scope,
      p_kind:       kind,
      p_club_id:    clubId,
      p_edition_id: editionId,
    });
    if (error) throw error;
    return data || [];
  },

  // Création. Validation centralisée côté RPC :
  //   - scope/kind dans whitelist
  //   - cohérence scope × club_id / edition_id
  //   - permission selon scope (master_admin OR club_admin)
  async create({
    scope,
    kind,
    name,
    description = null,
    config = {},
    clubId = null,
    editionId = null,
    position = 0,
  }) {
    const { data, error } = await supabase.rpc('rsa_create_extension', {
      p_scope:       scope,
      p_kind:        kind,
      p_name:        name,
      p_description: description ?? null,
      p_config:      config ?? {},
      p_club_id:     clubId ?? null,
      p_edition_id:  editionId ?? null,
      p_position:    position ?? 0,
    });
    if (error) throw error;
    return unwrap(data);
  },

  // Update partiel — chaque champ undefined / null = ne pas toucher.
  // Scope / club_id / edition_id sont IMMUABLES après création (sécurité serveur).
  async update(id, {
    name,
    description,
    config,
    position,
    active,
  } = {}) {
    if (!id) throw new Error('Extension.update: id requis');
    const { data, error } = await supabase.rpc('rsa_update_extension', {
      p_id:          id,
      p_name:        name        ?? null,
      p_description: description ?? null,
      p_config:      config      ?? null,
      p_position:    position    ?? null,
      p_active:      active      ?? null,
    });
    if (error) throw error;
    return unwrap(data);
  },

  // Delete idempotent (silencieux si absente).
  async delete(id) {
    if (!id) return;
    const { error } = await supabase.rpc('rsa_delete_extension', { p_id: id });
    if (error) throw error;
  },

  // Toggle on/off rapide. p_active obligatoire (RPC RAISE si NULL).
  async activate(id, active) {
    if (!id) throw new Error('Extension.activate: id requis');
    const { data, error } = await supabase.rpc('rsa_activate_extension', {
      p_id:     id,
      p_active: !!active,
    });
    if (error) throw error;
    return unwrap(data);
  },
};

export default Extension;
