// incubators : partenaires incubateurs, base globale + opt-in/contact par club.
//
// Tables :
//   incubators      -> Incubator  (PK text, name, country, language, website) — base globale master.
//   club_incubators -> (edition_id, club_id, incubator_id, position, contact_name, contact_email)
//                      cf. supabase/migrations/20260608_rsa_club_incubators.sql
//
// L'opt-in ET le contact relais sont scopés (compétition, club) : chaque club gère
// SA liste depuis son cockpit (multi-club) ; en monoclub l'onglet compétition
// résout le club unique. Le funnel candidat lit l'UNION des opt-in de l'édition
// via Incubator.listForEdition() (décision blueprint §11.3 : option (b) union).
// edition_incubators (legacy per-édition) reste en DB mais n'est plus lue.

import { supabase } from '@/lib/supabase';
import { createEntity } from './_createEntity';

export const Incubator = {
  ...createEntity('incubators'),

  // Liste globale triée par nom (base master : nom/pays/langue/site).
  async listAll() {
    const { data, error } = await supabase
      .from('incubators')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // UNION des opt-in de tous les clubs de l'édition (alimente le select candidat).
  // Dédup par incubateur en gardant la plus petite position. Pas de contact ici.
  async listForEdition(editionId) {
    if (!editionId) return [];
    const { data, error } = await supabase
      .from('club_incubators')
      .select('position, incubators ( id, name, country, language, website )')
      .eq('edition_id', editionId)
      .order('position', { ascending: true });
    if (error) throw error;
    const byId = new Map();
    for (const r of data || []) {
      if (!r.incubators) continue;
      const prev = byId.get(r.incubators.id);
      if (!prev || r.position < prev.position) {
        byId.set(r.incubators.id, { ...r.incubators, position: r.position });
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.position - b.position);
  },

  // Tous les liens club×incubateur d'une édition (agrégat master multi-club).
  async listEditionClubLinks(editionId) {
    if (!editionId) return [];
    const { data, error } = await supabase
      .from('club_incubators')
      .select('club_id, incubator_id, contact_name, contact_email')
      .eq('edition_id', editionId);
    if (error) throw error;
    return data || [];
  },

  // Opt-in + contact d'UN club pour une édition, trié par position (admin / cockpit).
  async listForClub(editionId, clubId) {
    if (!editionId || !clubId) return [];
    const { data, error } = await supabase
      .from('club_incubators')
      .select('position, contact_name, contact_email, incubators ( id, name, country, language, website )')
      .eq('edition_id', editionId)
      .eq('club_id', clubId)
      .order('position', { ascending: true });
    if (error) throw error;
    return (data || [])
      .filter((r) => r.incubators)
      .map((r) => ({
        ...r.incubators,
        position: r.position,
        contact_name: r.contact_name,
        contact_email: r.contact_email,
      }));
  },
};

// Remplace l'opt-in + contact d'un club pour une édition (set complet).
// rows : tableau ordonné [{ incubator_id, contact_name, contact_email }] —
// l'index du tableau devient la position.
export async function setClubIncubators(editionId, clubId, rows) {
  const { error } = await supabase.rpc('rsa_set_club_incubators', {
    p_edition_id: editionId,
    p_club_id: clubId,
    p_rows: rows ?? [],
  });
  if (error) throw error;
}
