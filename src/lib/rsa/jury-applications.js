// Entité standalone — candidatures jury "spontanées" (form public /DevenirJury).
//
// On ne touche PAS à entities.js (chantier 3 → fichier isolé). La table
// public.jury_applications est partagée avec le funnel club (cf. migration
// 20260530_rsa_v2_jury_funnel.sql) : ici on n'utilise que la voie spontanée
// (club_id facultatif, expertise jsonb, motivation/availability libres).
//
// La sécurité est portée par la RLS + le trigger SQL :
//   - INSERT : policy ja_public_insert (anon|authenticated) ; le trigger
//     trg_jury_applications_normalize_email force email = lower(trim(email)).
//   - SELECT/UPDATE : policy ja_master_select / ja_master_update (master_admin).
//
// Le client ne sécurise rien lui-même.

import { supabase } from '@/lib/supabase';

export const JuryApplication = {
  // Soumission publique d'une candidature spontanée. Pas d'auth requise.
  // Renvoie la ligne créée ; throw sur erreur Supabase (le composant gère le toast).
  async create({ email, fullName, editionId, clubId, expertise, motivation, availability }) {
    const { data, error } = await supabase
      .from('jury_applications')
      .insert({
        email: String(email).trim().toLowerCase(),
        full_name: fullName,
        edition_id: editionId || null,
        club_id: clubId || null,
        expertise: expertise || [],
        motivation: motivation || null,
        availability: availability || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Queue master_admin : candidatures en attente, plus récentes en premier.
  async listPending() {
    const { data, error } = await supabase
      .from('jury_applications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Liste toutes candidatures (tous statuts) — limit pour ne pas exploser le wire.
  async listAll(limit = 100) {
    const { data, error } = await supabase
      .from('jury_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  // Approbation : flip status + trace du reviewer. La création du rôle jury
  // (RPC + email transactionnel) reste à la charge du chantier 4 — cf. TODO
  // dans JuryApplicationsPanel.
  async approve(id, reviewerId) {
    const { data, error } = await supabase
      .from('jury_applications')
      .update({
        status: 'approved',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Rejet : statue + raison (rendue côté email "Désolé, candidature non retenue").
  async reject(id, reviewerId, reason) {
    const { data, error } = await supabase
      .from('jury_applications')
      .update({
        status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason || null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
