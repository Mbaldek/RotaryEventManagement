// startups : LE dossier candidat. PK uuid, owner_id = auth.uid().
//
// Tables (cf. supabase/migrations/20260527_rsa_platform_foundation.sql) :
//   startups  -> Startup        (PK uuid, owner_id = auth.uid())
//
// La RLS est la vraie frontière : Startup.mine() filtre par owner_id pour l'UX, mais
// startups_read/startups_applicant_* (migration prep) garantissent qu'un candidat ne
// voit/écrit jamais que sa propre ligne. Le client ne sécurise rien lui-même.

import { supabase } from '@/lib/supabase';
import { createEntity } from './_createEntity';

// Colonnes éditables par le candidat depuis le tunnel. Toute autre colonne
// (status, submitted_at, eligibility, session_id, owner_id, edition_id, id,
//  created_at, updated_at) est filtrée côté client AVANT l'UPDATE — défense en
// profondeur derrière le trigger startups_guard_update (migration hardening §2)
// qui est la frontière dure. Référence : R-M2 de docs/hardening/module1-runtime-review.md.
const SAVE_DRAFT_FIELDS = new Set([
  'name',
  'contact_person',
  'email',
  'phone',
  'website',
  // Langue de communication (emails : convocations, résultats). CHECK in ('fr','en','de').
  'preferred_lang',
  'country',
  'creation_date',
  'registration_number',
  'founders_majority',
  'value_proposition',
  'business_model',
  'roadmap',
  'team',
  'traction',
  'esg_impact',
  'sectors',
  'last_revenue',
  'amount_raised',
  'pitch_deck_path',
  'exec_summary_path',
  'video_pitch_url',
  'partner_institution',
  'rotary_club',
  // Club organisateur affilié (choisi obligatoirement dans le funnel — StepClub).
  // Le serveur (rsa_submit_dossier / edition_clubs) valide l'appartenance à l'édition.
  'club_id',
  // V3 Vague 2 C — opt-in palmarès public.
  'champion_photo_optin',
  'champion_photo_path',
  // Incubateur d'origine (sourcing, optionnel).
  'incubator_id',
  'incubator_other',
]);

// Liste blanche des colonnes filtrables côté staff pour `pageForStaff`. Tout autre
// champ est ignoré pour éviter qu'un appelant inadvertant ne fasse de l'or-injection
// via .or() sur du contenu non sanitisé.
const STAFF_FILTER_KEYS = new Set([
  'editionId',
  'statusIn',
  'verdictIn',
  'sessionIdIn',
  'clubIdIn',
  'sectorIn',
  'search',
  'cursor',
]);

export const Startup = {
  ...createEntity('startups'),

  // Le dossier unique du candidat courant pour une édition.
  //
  // BUG FIX 2026-05-29 (hardening R-L3) : on filtre EXPLICITEMENT par
  // owner_id = auth.uid(). Avant : on faisait confiance à la RLS pour scoper,
  // mais staff/admin (master_admin notamment) ont une policy de read élargie
  // (staff_read sur toutes les startups). Conséquence : un master_admin
  // arrivant sur /MonDossier voyait la startup d'UN AUTRE candidat (la plus
  // récemment mise à jour de l'édition), pas la sienne. Plus de surprise.
  // Renvoie null si aucun dossier pour CE user dans cette édition.
  async mine(editionId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return null;
    const { data, error } = await supabase
      .from('startups')
      .select('*')
      .eq('edition_id', editionId)
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  },

  // Premier brouillon. owner_id DOIT être fourni (épinglé à auth.uid() par la RLS
  // startups_applicant_insert : un WITH CHECK owner_id = auth.uid() rejette tout le reste).
  async createDraft({ editionId, ownerId, patch = {} }) {
    return this.create({
      edition_id: editionId,
      owner_id: ownerId,
      status: 'brouillon',
      name: patch.name ?? 'Brouillon',
      ...patch,
    });
  },

  // Autosave : met à jour le brouillon existant et bump updated_at (cf. JuryScoreDraft).
  // On retire toute colonne privilégiée du patch (R-M2) : le trigger SQL rejetterait
  // ces colonnes côté serveur, mais on évite l'aller-retour et les régressions amont.
  async saveDraft(id, patch) {
    const safe = Object.fromEntries(
      Object.entries(patch || {}).filter(([key]) => SAVE_DRAFT_FIELDS.has(key)),
    );
    return this.update(id, { ...safe, updated_at: new Date().toISOString() });
  },

  // V3 — Self-signup : créer un draft « pending » (sans owner_id) depuis la
  // page publique /Candidater, AVANT auth. Le serveur applique :
  //  - email regex + lowercase
  //  - edition existe et status='open' + application_close >= today
  //  - club_id (si fourni) attaché à l'édition via edition_clubs
  //  - rate-limit 3 drafts / 24h / email
  //  - idempotence : si un draft pending existe déjà pour (email, edition),
  //    on rafraîchit la TTL et renvoie son id (on ne crée pas un nouveau).
  // Renvoie l'id du startup ; le claim définitif (rattacher owner_id) se fait
  // au callback post-magic-link via rsa_claim_pending_application().
  async createPendingApplication({ editionId, email }) {
    // p_club_id reste dans la signature SQL mais on passe systématiquement NULL :
    // la startup candidate au concours en général, l'admin route ensuite vers
    // un club organisateur post-soumission.
    const { data, error } = await supabase.rpc('rsa_create_pending_application', {
      p_edition_id: editionId,
      p_club_id: null,
      p_email: email,
    });
    if (error) throw error;
    return data; // uuid
  },

  // V3 — Claim post-magic-link : rattache tous les drafts pending matching
  // l'email du JWT au auth.uid() courant. Idempotent (0 si rien à rattacher).
  async claimPending() {
    const { data, error } = await supabase.rpc('rsa_claim_pending_application');
    if (error) throw error;
    return Number(data) || 0;
  },

  // V3 — Lecture du draft pending pour l'email courant (post-magic-link, avant
  // que le claim soit propagé partout). Renvoie le draft pending matching le
  // JWT.email, ou null. Filtre par edition_id pour scoper.
  async findPendingForEmail({ editionId }) {
    if (!editionId) return null;
    const { data, error } = await supabase
      .from('startups')
      .select('*')
      .eq('edition_id', editionId)
      .is('owner_id', null)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  },

  // Soumission : appel du RPC SECURITY DEFINER rsa_submit_dossier. Le serveur
  // verrouille la ligne, vérifie ownership/status/édition/deadline/champs requis,
  // recalcule l'éligibilité (twin SQL rsa_evaluate_eligibility) et passe status='soumis'.
  // Le client ne fournit AUCUN snapshot (l'éligibilité côté JS reste purement UI preview).
  async submit(id) {
    const { data, error } = await supabase.rpc('rsa_submit_dossier', { p_id: id });
    if (error) throw error;
    // rsa_submit_dossier returns SETOF / single row depending on the call shape ; PostgREST
    // wraps RETURNS table-row in an object — both shapes are normalized to a single row.
    if (Array.isArray(data)) return data[0] ?? null;
    return data ?? null;
  },

  // Module 2 — Lecture paginée côté staff (« File de sélection »).
  //
  // Trade-off : on reste sur un .from('startups') simple plutôt qu'une vue SQL. On
  // joint selection_reviews en sous-select (RLS reviews_staff_read s'applique : staff
  // only). La résolution « effective_review » est ensuite faite côté JS (cherche un
  // is_final=true, sinon la plus récente par reviewed_at). Avantages : pas de
  // migration de vue, et le partial-unique-index garantit l'invariant côté DB.
  // Si la queue dépasse ~1000 dossiers/édition, on basculera vers une vue dédiée.
  //
  // Pagination : cursor sur submitted_at DESC (cf. blueprint §4.4).
  async pageForStaff({ filters = {}, cursor = null, limit = 25 } = {}) {
    // Sanitize : on ne propage que les clés connues (défense en profondeur autour
    // des .or()/.in() qui prennent des chaînes interpolées).
    const safe = Object.fromEntries(
      Object.entries(filters).filter(([k]) => STAFF_FILTER_KEYS.has(k)),
    );

    let q = supabase
      .from('startups')
      .select(
        '*, selection_reviews(id, reviewer_id, reviewer_name, decision, assigned_session_id, rationale, reviewed_at, is_final, overrides_review_id)',
      )
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (safe.editionId) q = q.eq('edition_id', safe.editionId);
    if (Array.isArray(safe.statusIn) && safe.statusIn.length) q = q.in('status', safe.statusIn);
    if (Array.isArray(safe.verdictIn) && safe.verdictIn.length) {
      // jsonb path : startups.eligibility ->> 'verdict' ∈ liste.
      q = q.in('eligibility->>verdict', safe.verdictIn);
    }
    if (Array.isArray(safe.sessionIdIn) && safe.sessionIdIn.length) {
      q = q.in('session_id', safe.sessionIdIn);
    }
    if (Array.isArray(safe.clubIdIn) && safe.clubIdIn.length) {
      q = q.in('club_id', safe.clubIdIn);
    }
    if (Array.isArray(safe.sectorIn) && safe.sectorIn.length) {
      // sectors est un text[] : overlap = la startup a AU MOINS un des secteurs filtrés.
      q = q.overlaps('sectors', safe.sectorIn);
    }
    if (safe.search && typeof safe.search === 'string' && safe.search.trim().length > 0) {
      // .or() prend une chaîne PostgREST ; on encode pour éviter les , et ) parasites.
      const s = safe.search.trim().replace(/[,()]/g, ' ');
      const like = `%${s}%`;
      q = q.or(`name.ilike.${like},email.ilike.${like},contact_person.ilike.${like}`);
    }
    if (cursor) q = q.lt('submitted_at', cursor);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  // Valeurs de secteurs distinctes présentes en base (pour peupler le filtre
  // Secteur du tableau de sélection). On lit la seule colonne `sectors` (text[])
  // puis on dédupe côté client — robuste aux données hétérogènes (clusters funnel
  // + tags importés d'Airtable). editionId optionnel restreint le périmètre.
  async distinctSectors({ editionId } = {}) {
    let q = supabase.from('startups').select('sectors').limit(5000);
    if (editionId) q = q.eq('edition_id', editionId);
    const { data, error } = await q;
    if (error) throw error;
    const set = new Set();
    for (const row of data || []) {
      const arr = Array.isArray(row?.sectors) ? row.sectors : [];
      for (const s of arr) {
        const v = String(s || '').trim();
        if (v) set.add(v);
      }
    }
    return Array.from(set);
  },

  // Module 4a — Listing admin transverse (toute édition + tout statut). Pas de paginé
  // dédié : l'admin coque opérationnelle reste petite (1 édition active * ~60 dossiers).
  // filters : { editionId?, statusIn?: string[], sessionId? }
  async pageForAdmin({ editionId, statusIn, sessionId } = {}) {
    let q = supabase.from('startups').select('*');
    if (editionId) q = q.eq('edition_id', editionId);
    if (Array.isArray(statusIn) && statusIn.length) q = q.in('status', statusIn);
    if (sessionId) q = q.eq('session_id', sessionId);
    q = q.order('updated_at', { ascending: false }).limit(500);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  // Module 4a — Synthèse {status: count} pour la ModuleStatusStrip.
  // Une seule requête : on lit (id, status) puis on agrège côté client.
  async summaryByStatus(editionId) {
    if (!editionId) return {};
    const { data, error } = await supabase
      .from('startups')
      .select('id, status')
      .eq('edition_id', editionId);
    if (error) throw error;
    const out = {};
    for (const r of data || []) {
      out[r.status] = (out[r.status] || 0) + 1;
    }
    return out;
  },
};
