// Entités guides : Guide (CRUD admin + lecture publiée) + GuideAck (pastille).
// Le wrapper createEntity fournit list/create/update/delete/filter (cf. _createEntity).

import { supabase } from '@/lib/supabase';
import { createEntity } from './_createEntity';

export const Guide = {
  ...createEntity('guides'),

  // Lecteur : tous les guides PUBLIÉS d'un espace (globaux + toutes éditions).
  // La résolution global/édition se fait côté JS (resolveGuidesForScope).
  async listPublishedForSpace(space) {
    const { data, error } = await supabase
      .from('guides')
      .select('*')
      .eq('space', space)
      .eq('is_published', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // Admin : tous les guides d'un espace (brouillons inclus), pour une portée.
  //   editionId === null  → guides globaux (edition_id is null)
  //   editionId === 'xxx' → guides de cette édition
  async listAllForAdmin(space, editionId) {
    let q = supabase.from('guides').select('*').eq('space', space);
    q = editionId == null ? q.is('edition_id', null) : q.eq('edition_id', editionId);
    const { data, error } = await q.order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // Admin : enregistre l'ordre après drag (liste d'ids ordonnée).
  // NB : on ne touche PAS updated_at (un réordonnancement n'est pas un changement
  // de contenu — sinon la pastille « nouveau » se rallumerait pour tous les users).
  // Les builders PostgREST ne rejettent pas : on inspecte chaque .error et on throw.
  async reorder(ids) {
    const results = await Promise.all(
      ids.map((id, idx) =>
        supabase.from('guides').update({ sort_order: idx }).eq('id', id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed) throw failed.error;
  },
};

export const GuideAck = {
  // Dernier accusé de lecture du user courant pour un espace (ou null).
  async getForSpace(space) {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id;
    if (!uid) return null;
    const { data, error } = await supabase
      .from('guide_acks')
      .select('last_seen_at')
      .eq('user_id', uid)
      .eq('space', space)
      .maybeSingle();
    if (error) throw error;
    return data?.last_seen_at ?? null;
  },

  // Marque l'espace comme « vu » maintenant (upsert).
  async touch(space) {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id;
    if (!uid) return;
    const { error } = await supabase
      .from('guide_acks')
      .upsert({ user_id: uid, space, last_seen_at: new Date().toISOString() }, { onConflict: 'user_id,space' });
    if (error) throw error;
  },
};
