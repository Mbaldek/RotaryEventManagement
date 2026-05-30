// Module 2 — selection_reviews : décisions comité + validation admin.
//
// Mirror la convention Startup : createEntity + helpers métier. Les transitions
// status / session_id côté startups passent TOUJOURS par les RPC (rsa_apply_selection_review
// / rsa_finalize_review / rsa_admin_override) — la RLS startups est candidat-friendly,
// le trigger startups_guard_update lock les colonnes privilégiées, et les RPC posent le
// sentinel `rsa.allow_protected_update` pour bypass.

import { supabase } from '@/lib/supabase';
import { createEntity } from './_createEntity';

export const SelectionReview = {
  ...createEntity('selection_reviews'),

  // Timeline complète pour un dossier (la plus récente en tête).
  async forStartup(startupId) {
    const { data, error } = await supabase
      .from('selection_reviews')
      .select('*')
      .eq('startup_id', startupId)
      .order('reviewed_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Effective row : is_final=true s'il existe, sinon la plus récente.
  async effectiveForStartup(startupId) {
    const rows = await this.forStartup(startupId);
    if (!rows.length) return null;
    return rows.find((r) => r.is_final) || rows[0];
  },

  // Comité — INSERT d'une nouvelle review non-finale, puis projection via le RPC.
  // Le RLS reviews_insert exige reviewer_id = auth.uid() ET is_final = false.
  async createComiteReview({
    startupId,
    reviewerId,
    reviewerName,
    decision,
    assignedSessionId,
    rationale,
  }) {
    const { data: row, error: err1 } = await supabase
      .from('selection_reviews')
      .insert({
        startup_id: startupId,
        reviewer_id: reviewerId,
        reviewer_name: reviewerName,
        decision,
        assigned_session_id: assignedSessionId ?? null,
        rationale: rationale?.trim() ? rationale.trim() : null,
        is_final: false,
      })
      .select()
      .single();
    if (err1) throw err1;
    const { error: err2 } = await supabase.rpc('rsa_apply_selection_review', {
      p_review_id: row.id,
    });
    if (err2) throw err2;
    return row;
  },

  // Admin — VALIDATE : flip is_final sur la review existante + projection finalized_*.
  async finalizeExisting(reviewId) {
    const { error } = await supabase.rpc('rsa_finalize_review', { p_review_id: reviewId });
    if (error) throw error;
    // Pas de SELECT post-RPC ; les hooks invalident leurs queries.
    return { id: reviewId };
  },

  // Admin — OVERRIDE : nouvelle row is_final=true qui supersède la précédente.
  async adminOverride({
    startupId,
    decision,
    assignedSessionId = null,
    rationale = null,
    overridesReviewId = null,
  }) {
    const { data, error } = await supabase.rpc('rsa_admin_override', {
      p_startup_id: startupId,
      p_decision: decision,
      p_assigned_session_id: assignedSessionId,
      p_rationale: rationale,
      p_overrides_review_id: overridesReviewId,
    });
    if (error) throw error;
    // L'RPC renvoie le nouvel id. On le ré-hydrate pour le client.
    const newId = Array.isArray(data) ? data[0] : data;
    if (!newId) return null;
    const { data: row, error: err2 } = await supabase
      .from('selection_reviews')
      .select('*')
      .eq('id', newId)
      .maybeSingle();
    if (err2) throw err2;
    return row;
  },
};
