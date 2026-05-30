import { supabase } from '@/lib/supabase';
import { createEntity } from './_createEntity';

// RSA 2026 entities — legacy beta (URL-active : QR jurés, emails finale, deep links admin).
// Voir docs/audits/rsa-legacy-urls.md + docs/deepsolve/rsa-legacy-url-migration.md.

export const JuryProfile = createEntity('jury_profiles');
export const StartupConfirmation = createEntity('startup_confirmations');
export const JuryScoringSession = createEntity('jury_scoring_sessions');

// session_config: primary key is `session_id` (text), not `id`. Override update/delete.
export const SessionConfig = {
  ...createEntity('session_config'),
  async updateBySessionId(sessionId, record) {
    const { data, error } = await supabase
      .from('session_config')
      .update(record)
      .eq('session_id', sessionId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// jury_scores: upsert on the unique triple (session_id, jury_name, startup_name)
export const JuryScore = {
  ...createEntity('jury_scores'),
  async upsert(record) {
    const { data, error } = await supabase
      .from('jury_scores')
      .upsert(record, { onConflict: 'session_id,jury_name,startup_name' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// rsa_finale_rsvp: Grande Finale attendance confirmations (pitcher/visitor/jury).
export const FinaleRsvp = createEntity('rsa_finale_rsvp');

// jury_score_drafts: in-progress scores synced to server so jurors can resume on another device.
// Composite PK (session_id, jury_name, startup_name) with permissive RLS for anon inserts.
export const JuryScoreDraft = {
  ...createEntity('jury_score_drafts'),
  async upsert(record) {
    const { data, error } = await supabase
      .from('jury_score_drafts')
      .upsert({ ...record, updated_at: new Date().toISOString() }, { onConflict: 'session_id,jury_name,startup_name' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async deleteOne(session_id, jury_name, startup_name) {
    const { error } = await supabase
      .from('jury_score_drafts')
      .delete()
      .eq('session_id', session_id)
      .eq('jury_name', jury_name)
      .eq('startup_name', startup_name);
    if (error) throw error;
  },
};
