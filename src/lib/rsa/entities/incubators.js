// incubators : partenaires incubateurs opt-in par édition.
//
// Tables (cf. supabase/migrations/20260607_rsa_incubators.sql) :
//   incubators        -> Incubator     (PK text, name, country, language, website)
//   edition_incubators -> (edition_id, incubator_id, position)
//
// Incubator.listForEdition() alimente le select candidat (funnel StepIncubateur).
// setEditionIncubators() remplace l'opt-in complet d'une édition (admin).

import { supabase } from '@/lib/supabase';
import { createEntity } from './_createEntity';

export const Incubator = {
  ...createEntity('incubators'),

  // Liste globale triée par nom
  async listAll() {
    const { data, error } = await supabase
      .from('incubators')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // Liste opt-in d'une édition (alimente le select candidat), triée par position
  async listForEdition(editionId) {
    if (!editionId) return [];
    const { data, error } = await supabase
      .from('edition_incubators')
      .select('position, incubators ( id, name, country, language, website )')
      .eq('edition_id', editionId)
      .order('position', { ascending: true });
    if (error) throw error;
    return (data || [])
      .filter((r) => r.incubators)
      .map((r) => ({ ...r.incubators, position: r.position }));
  },
};

// Remplace l'opt-in d'une édition (ordre du tableau = position)
export async function setEditionIncubators(editionId, incubatorIds) {
  const { error } = await supabase.rpc('rsa_set_edition_incubators', {
    p_edition_id: editionId,
    p_incubator_ids: incubatorIds,
  });
  if (error) throw error;
}
