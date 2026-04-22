import { supabase } from './supabase';

function parseSort(sortField) {
  if (!sortField) return null;
  const desc = sortField.startsWith('-');
  const column = desc ? sortField.slice(1) : sortField;
  return { column, ascending: !desc };
}

function createEntity(tableName) {
  return {
    async list(sortField, limit) {
      let query = supabase.from(tableName).select('*');
      if (sortField) {
        const sort = parseSort(sortField);
        query = query.order(sort.column, { ascending: sort.ascending });
      }
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async create(record) {
      const { data, error } = await supabase.from(tableName).insert(record).select().single();
      if (error) throw error;
      return data;
    },

    async bulkCreate(records) {
      const { data, error } = await supabase.from(tableName).insert(records).select();
      if (error) throw error;
      return data;
    },

    async update(id, record) {
      const { data, error } = await supabase.from(tableName).update(record).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
    },

    async filter(filters) {
      let query = supabase.from(tableName).select('*');
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    subscribe(callback) {
      const channel = supabase
        .channel(`${tableName}_changes_${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
          const type = payload.eventType === 'INSERT' ? 'create' : payload.eventType === 'UPDATE' ? 'update' : 'delete';
          callback({ type, data: payload.new });
        })
        .subscribe();
      return () => supabase.removeChannel(channel);
    },
  };
}

export const Seat = createEntity('seats');
export const RestaurantTable = createEntity('restaurant_tables');
export const Reservation = createEntity('reservations');
export const ChatMessage = createEntity('chat_messages');
export const GlobalSettings = createEntity('global_settings');
export const EventHistory = createEntity('event_history');
export const UpcomingEvent = createEntity('upcoming_events');
export const User = createEntity('profiles');

// --- RSA 2026 entities ---
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

// Auth helpers
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', user.email)
    .single();
  return profile;
}

// File upload helper
export async function uploadFile(file) {
  const fileName = `${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from('uploads').upload(fileName, file);
  if (error) throw error;
  const { data } = supabase.storage.from('uploads').getPublicUrl(fileName);
  return { file_url: data.publicUrl };
}
