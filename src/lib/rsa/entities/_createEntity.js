// Wrapper interne au dossier entities/.
//
// On réutilise le wrapper createEntity de @/lib/db (même API que Base44 : list /
// create / bulkCreate / update / delete / filter / subscribe) sans modifier db.js.
// `createEntity` n'y est pas exporté ; on le reconstruit ici à l'identique, puis on
// l'étend avec des helpers métier comme le font SessionConfig / JuryScore dans db.js.

import { supabase } from '@/lib/supabase';

function parseSort(sortField) {
  if (!sortField) return null;
  const desc = sortField.startsWith('-');
  const column = desc ? sortField.slice(1) : sortField;
  return { column, ascending: !desc };
}

// Copie fidèle du wrapper de @/lib/db (db.js ne l'exporte pas). Garder synchronisé.
export function createEntity(tableName) {
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
