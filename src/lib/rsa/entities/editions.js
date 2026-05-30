// editions : données de référence. RLS prep masque les éditions 'draft' à l'anon.
//
// Tables (cf. supabase/migrations/20260527_rsa_platform_foundation.sql) :
//   editions  -> Edition       (PK text)

import { supabase } from '@/lib/supabase';
import { createEntity } from './_createEntity';

export const Edition = {
  ...createEntity('editions'),

  // L'édition active pour la candidature : la plus récente en statut 'open'.
  // (Le blueprint §12.8 suppose une seule édition 'open' ; en cas de pluralité on
  //  retient la plus récente par année puis date d'ouverture.)
  // DIAGNOSTIC 2026-05-29 : timeout 6s force throw pour éviter spinner infini si
  // la requête Supabase hang (cf. /MonDossier stuck). Au moins on a une erreur
  // claire dans la console + le user voit le watchdog avec retry.
  async active() {
    const query = supabase
      .from('editions')
      .select('*')
      .eq('status', 'open')
      .order('year', { ascending: false })
      .order('application_open', { ascending: false })
      .limit(1);
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('[Edition.active] timeout 6s — Supabase request never resolved')), 6000),
    );
    // eslint-disable-next-line no-console
    console.warn('[Edition.active] start request');
    const { data, error } = await Promise.race([query, timeout]);
    // eslint-disable-next-line no-console
    console.warn('[Edition.active] result', { data, error: error?.message ?? null });
    if (error) throw error;
    return data?.[0] ?? null;
  },

  // Module 4a — Toutes les éditions (admin). RLS editions_admin couvre déjà l'écriture
  // mais la lecture est publique (status<>'draft' OR is_staff). On lit tout pour l'admin.
  async listAllForAdmin() {
    const { data, error } = await supabase
      .from('editions')
      .select('*')
      .order('year', { ascending: false })
      .order('application_open', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Module 4a — patch admin direct (la policy editions_admin couvre).
  async patch(id, patch) {
    return this.update(id, { ...patch });
  },

  // Lecture d'une édition par ID (Chantier 2 : candidature contextualisée).
  // SELECT * — la RLS publique filtre les éditions 'draft' à l'anon.
  async get(id) {
    if (!id) return null;
    const { data, error } = await supabase
      .from('editions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },

  // Liste les compétitions ouvertes à candidature — 1 ligne par édition.
  //
  // Forme retournée : [{ edition, rules }] où rules = règles globales d'édition
  // uniquement (plus de merge per-club côté candidat : le candidat ne distingue
  // pas les clubs, c'est l'admin qui route post-soumission).
  //
  // "Ouverte" = editions.status='open' AND (application_close >= today OR null).
  async openForApply() {
    const today = new Date().toISOString().slice(0, 10);
    const { data: editions, error: e1 } = await supabase
      .from('editions')
      .select('*')
      .eq('status', 'open')
      .or(`application_close.is.null,application_close.gte.${today}`)
      .order('year', { ascending: false })
      .order('application_open', { ascending: false });
    if (e1) throw e1;
    const list = editions || [];
    return list.map((edition) => ({
      edition,
      rules:
        edition.eligibility_rules && typeof edition.eligibility_rules === 'object'
          ? edition.eligibility_rules
          : {},
    }));
  },
};

// Création de compétition (master_admin only) — wrapper sur le RPC.
export async function createCompetition({ id, name, year, model = 'monoclub' }) {
  const { data, error } = await supabase.rpc('rsa_create_competition', {
    p_id: id,
    p_name: name,
    p_year: year,
    p_model: model,
  });
  if (error) throw error;
  return data;
}
