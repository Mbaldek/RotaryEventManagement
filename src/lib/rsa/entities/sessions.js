// sessions : clusters thématiques + finale. PK text.
//
// Nom 'RsaSession' pour éviter la collision avec les notions d'auth « session ».
//
// Tables (cf. supabase/migrations/20260527_rsa_platform_foundation.sql) :
//   sessions  -> RsaSession     (PK text)

import { supabase } from '@/lib/supabase';
import { createEntity } from './_createEntity';

export const RsaSession = {
  ...createEntity('sessions'),

  // Module 4a — Lecture des sessions d'une édition (ordonnées par position).
  async forEdition(editionId) {
    if (!editionId) return [];
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('edition_id', editionId)
      .order('position', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // Module 4a — Jointure sessions + session_config (admin SETUP/LIVE/RESULTS lit en une seule
  // requête car session_config est legacy mais sa policy session_config_read couvre).
  async withConfigForEdition(editionId) {
    if (!editionId) return [];
    const sessions = await this.forEdition(editionId);
    if (!sessions.length) return [];
    const ids = sessions.map((s) => s.id);
    const { data: cfg, error } = await supabase
      .from('session_config')
      .select('*')
      .in('session_id', ids);
    if (error) throw error;
    const byId = new Map((cfg || []).map((c) => [c.session_id, c]));
    return sessions.map((s) => ({ ...s, config: byId.get(s.id) || null }));
  },

  // Module 4a — Create (RPC SECURITY DEFINER) : insère sessions + seed session_config
  // dans la même transaction (résout le blocker §2.1.B du blueprint).
  // payload : { id, name, theme, kind, session_date, position, notes? }
  async createWithConfig({ editionId, payload }) {
    const { data, error } = await supabase.rpc('rsa_create_session', {
      p_edition_id: editionId,
      p_session: payload,
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  },

  // Module 4a — Lifecycle wrappers (RPC SECURITY DEFINER admin only).
  async setLive(sessionId) {
    const { error } = await supabase.rpc('rsa_set_session_live', { p_session_id: sessionId });
    if (error) throw error;
  },
  async setDraft(sessionId) {
    const { error } = await supabase.rpc('rsa_set_session_draft', { p_session_id: sessionId });
    if (error) throw error;
  },
  async resetTemplate(sessionId) {
    const { error } = await supabase.rpc('rsa_reset_session_template', { p_session_id: sessionId });
    if (error) throw error;
  },

  // Session Admin Console — édition draft-only (patch partiel) via RPC.
  // patch : { name?, theme?, session_date?, position?, kind?, club_id?,
  //           notes?, teams_link?, start_time?, end_time? }
  async updateWithConfig({ sessionId, patch }) {
    const { data, error } = await supabase.rpc('rsa_update_session', {
      p_session_id: sessionId,
      p_patch: patch || {},
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  },

  // Session Admin Console — suppression (draft + 0 juré + 0 startup) via RPC.
  async deleteSession(sessionId) {
    const { error } = await supabase.rpc('rsa_delete_session', { p_session_id: sessionId });
    if (error) throw error;
  },

  // Session Admin Console — topologie de finale d'une compétition (master/admin only).
  async setFinaleTopology({ editionId, topology }) {
    const { error } = await supabase.rpc('rsa_set_finale_topology', {
      p_edition_id: editionId,
      p_topology: topology,
    });
    if (error) throw error;
  },
};
