// Entités RSA Module 1 (« Espace Startup »).
//
// On réutilise le wrapper createEntity de @/lib/db (même API que Base44 : list /
// create / bulkCreate / update / delete / filter / subscribe) sans modifier db.js.
// `createEntity` n'y est pas exporté ; on le reconstruit ici à l'identique, puis on
// l'étend avec des helpers métier comme le font SessionConfig / JuryScore dans db.js.
//
// Tables (cf. supabase/migrations/20260527_rsa_platform_foundation.sql) :
//   editions  -> Edition       (PK text)
//   sessions  -> RsaSession     (PK text ; nom 'RsaSession' pour éviter la collision
//                                avec les notions d'auth « session »)
//   startups  -> Startup        (LE dossier ; PK uuid, owner_id = auth.uid())
//
// La RLS est la vraie frontière : Startup.mine() filtre par owner_id pour l'UX, mais
// startups_read/startups_applicant_* (migration prep) garantissent qu'un candidat ne
// voit/écrit jamais que sa propre ligne. Le client ne sécurise rien lui-même.

import { supabase } from '@/lib/supabase';

function parseSort(sortField) {
  if (!sortField) return null;
  const desc = sortField.startsWith('-');
  const column = desc ? sortField.slice(1) : sortField;
  return { column, ascending: !desc };
}

// Copie fidèle du wrapper de @/lib/db (db.js ne l'exporte pas). Garder synchronisé.
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

// editions : données de référence. RLS prep masque les éditions 'draft' à l'anon.
export const Edition = {
  ...createEntity('editions'),

  // L'édition active pour la candidature : la plus récente en statut 'open'.
  // (Le blueprint §12.8 suppose une seule édition 'open' ; en cas de pluralité on
  //  retient la plus récente par année puis date d'ouverture.)
  async active() {
    const { data, error } = await supabase
      .from('editions')
      .select('*')
      .eq('status', 'open')
      .order('year', { ascending: false })
      .order('application_open', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  },
};

// sessions : clusters thématiques + finale. PK text. Nom 'RsaSession' (cf. en-tête).
export const RsaSession = createEntity('sessions');

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
]);

// Liste blanche des colonnes filtrables côté staff pour `pageForStaff`. Tout autre
// champ est ignoré pour éviter qu'un appelant inadvertant ne fasse de l'or-injection
// via .or() sur du contenu non sanitisé.
const STAFF_FILTER_KEYS = new Set([
  'editionId',
  'statusIn',
  'verdictIn',
  'sessionIdIn',
  'search',
  'cursor',
]);

// startups : LE dossier candidat. PK uuid, owner_id = auth.uid().
export const Startup = {
  ...createEntity('startups'),

  // Le dossier unique du candidat courant pour une édition (RLS scope à owner_id).
  // On ne filtre PAS par owner_id côté client (la RLS s'en charge) — uniquement par
  // edition_id, puis on prend le plus récent. Renvoie null si aucun dossier.
  async mine(editionId) {
    const { data, error } = await supabase
      .from('startups')
      .select('*')
      .eq('edition_id', editionId)
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
};

// Module 2 — selection_reviews : décisions comité + validation admin.
//
// Mirror la convention Startup : createEntity + helpers métier. Les transitions
// status / session_id côté startups passent TOUJOURS par les RPC (rsa_apply_selection_review
// / rsa_finalize_review / rsa_admin_override) — la RLS startups est candidat-friendly,
// le trigger startups_guard_update lock les colonnes privilégiées, et les RPC posent le
// sentinel `rsa.allow_protected_update` pour bypass.
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
