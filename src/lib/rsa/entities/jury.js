// ─────────────────────────────────────────────────────────────────────────────
// Module 3 — Jury (« Espace Jury »)
// ─────────────────────────────────────────────────────────────────────────────
// Tables (cf. supabase/migrations/20260527_rsa_module3_jury.sql) :
//   platform_jury_profiles      -> JuryProfile      (PK user_id)
//   platform_jury_assignments   -> JuryAssignment   (composite PK jury_user_id + session_id)
//   platform_jury_score_drafts  -> JuryDraft        (composite PK startup_id + jury_user_id)
//   platform_jury_scores        -> JuryScore        (composite PK startup_id + jury_user_id)
//
// Conventions :
//   - Composite PK -> on n'utilise PAS update(id) / delete(id) de createEntity (qui
//     filtre sur la colonne 'id'). On expose des helpers explicites (upsert / clearDraft).
//   - JuryScore : DENY direct INSERT/UPDATE par RLS — TOUT passe par le RPC
//     rsa_submit_jury_score. Le helper JuryScore.submit centralise l'appel.
//   - Le préfixe JS (JuryProfile / JuryAssignment / ...) écrase volontairement les noms
//     legacy 2026 du db.js (JuryProfile, JuryScore, JuryScoreDraft). Module 3 et au-delà
//     importent depuis @/lib/rsa/entities ; les pages 2026 legacy continuent d'utiliser
//     @/lib/db. Co-existence sans conflit puisque les imports sont scoped.

import { supabase } from '@/lib/supabase';
import { createEntity } from './_createEntity';

export const JuryProfile = {
  ...createEntity('platform_jury_profiles'),

  async mine(userId) {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('platform_jury_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },

  async forIds(userIds) {
    const clean = (userIds || []).filter(Boolean);
    if (clean.length === 0) return [];
    const { data, error } = await supabase
      .from('platform_jury_profiles')
      .select('*')
      .in('user_id', clean);
    if (error) throw error;
    return data || [];
  },

  // Upsert sa propre fiche (premier login juré, édition de bio/qualité).
  // RLS pjp_self_update + pjp_insert : user_id épinglé à auth.uid().
  async upsertMine({ userId, qualite, organisation, photoPath, bio }) {
    const payload = {
      user_id: userId,
      qualite: qualite ?? null,
      organisation: organisation ?? null,
      photo_path: photoPath ?? null,
      bio: bio ?? null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('platform_jury_profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

export const JuryAssignment = {
  ...createEntity('platform_jury_assignments'),

  // Mes assignments (RLS pja_read self).
  async mine(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('platform_jury_assignments')
      .select('*')
      .eq('jury_user_id', userId);
    if (error) throw error;
    return data || [];
  },

  // Tous les jurés d'une session (RLS pja_read : own + comité/admin).
  async forSession(sessionId) {
    if (!sessionId) return [];
    const { data, error } = await supabase
      .from('platform_jury_assignments')
      .select('*')
      .eq('session_id', sessionId);
    if (error) throw error;
    return data || [];
  },

  // Toutes les assignments visibles (admin/comité voient tout, juré ne voit que les siennes).
  async listAll() {
    const { data, error } = await supabase
      .from('platform_jury_assignments')
      .select('*');
    if (error) throw error;
    return data || [];
  },

  // Assign — admin only (RLS pja_admin_write).
  async assign({ juryUserId, sessionId, createdBy }) {
    const { data, error } = await supabase
      .from('platform_jury_assignments')
      .insert({
        jury_user_id: juryUserId,
        session_id: sessionId,
        created_by: createdBy ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Unassign — admin only.
  async unassign({ juryUserId, sessionId }) {
    const { error } = await supabase
      .from('platform_jury_assignments')
      .delete()
      .eq('jury_user_id', juryUserId)
      .eq('session_id', sessionId);
    if (error) throw error;
  },
};

export const JuryDraft = {
  ...createEntity('platform_jury_score_drafts'),

  // Mon draft pour un startup donné (RLS pjsd_self_read).
  async forStartup(startupId, juryUserId) {
    if (!startupId || !juryUserId) return null;
    const { data, error } = await supabase
      .from('platform_jury_score_drafts')
      .select('*')
      .eq('startup_id', startupId)
      .eq('jury_user_id', juryUserId)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },

  // Tous mes drafts pour une session (UX : pré-remplir le queue).
  async forSession(sessionId, juryUserId) {
    if (!sessionId || !juryUserId) return [];
    const { data, error } = await supabase
      .from('platform_jury_score_drafts')
      .select('*')
      .eq('session_id', sessionId)
      .eq('jury_user_id', juryUserId);
    if (error) throw error;
    return data || [];
  },

  // Upsert (autosave). RLS pjsd_self_write : jury_user_id = auth.uid() AND rsa_can_score().
  // patch = sous-ensemble des 6 score_* + comment ; null tolérés (drafts partiels).
  async upsert({ startupId, sessionId, juryUserId, patch }) {
    const payload = {
      startup_id: startupId,
      jury_user_id: juryUserId,
      session_id: sessionId,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('platform_jury_score_drafts')
      .upsert(payload, { onConflict: 'startup_id,jury_user_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async clear({ startupId, juryUserId }) {
    const { error } = await supabase
      .from('platform_jury_score_drafts')
      .delete()
      .eq('startup_id', startupId)
      .eq('jury_user_id', juryUserId);
    if (error) throw error;
  },
};

export const JuryScore = {
  ...createEntity('platform_jury_scores'),

  // Mon score final pour un startup (RLS pjs_jury_self_read : own + comité/admin).
  async forStartup(startupId, juryUserId) {
    if (!startupId || !juryUserId) return null;
    const { data, error } = await supabase
      .from('platform_jury_scores')
      .select('*')
      .eq('startup_id', startupId)
      .eq('jury_user_id', juryUserId)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },

  // Tous les scores finaux d'une session (RLS : jury voit les siens + comité/admin voient tout).
  async forSession(sessionId) {
    if (!sessionId) return [];
    const { data, error } = await supabase
      .from('platform_jury_scores')
      .select('*')
      .eq('session_id', sessionId);
    if (error) throw error;
    return data || [];
  },

  // Mes scores pour une session (pré-remplit l'UI quand re-ouvrant une carte locked).
  async mineForSession(sessionId, juryUserId) {
    if (!sessionId || !juryUserId) return [];
    const { data, error } = await supabase
      .from('platform_jury_scores')
      .select('*')
      .eq('session_id', sessionId)
      .eq('jury_user_id', juryUserId);
    if (error) throw error;
    return data || [];
  },

  // Soumission — TOUJOURS via RPC SECURITY DEFINER (la RLS DENY le INSERT direct).
  // scores = { score_value_prop, score_market, score_business_model, score_team,
  //            score_pitch_quality, score_societal_impact } — tous 0..5 requis.
  async submit({ startupId, sessionId, scores, comment }) {
    const { data, error } = await supabase.rpc('rsa_submit_jury_score', {
      p_startup_id: startupId,
      p_session_id: sessionId,
      p_scores: scores,
      p_comment: comment ?? null,
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  },

  // Admin — lifecycle (Module 3 expose ici ; le UI admin Module 4 les ré-utilise).
  async lockSession(sessionId) {
    const { error } = await supabase.rpc('rsa_lock_session', { p_session_id: sessionId });
    if (error) throw error;
  },

  async publishSession(sessionId) {
    const { error } = await supabase.rpc('rsa_publish_session', { p_session_id: sessionId });
    if (error) throw error;
  },
};
