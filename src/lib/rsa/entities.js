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

  // Chantier 2 — Liste les compétitions ouvertes à candidature (édition × club).
  //
  // Forme retournée : [{ edition, club, rules }] où rules = merge des règles
  // globales d'édition + override edition_clubs.eligibility_rules (le per-club
  // écrase les clés correspondantes).
  //
  // "Ouverte" = editions.status='open' AND (application_close >= today OR null).
  // - monoclub : 1 ligne par édition avec le club implicite via edition_clubs
  //   (backfill 'paris' pour les éditions historiques) ; si aucun lien n'existe,
  //   on tombe sur null pour le club (UX : on saute l'entrée plutôt que de mentir).
  // - multiclub : 1 ligne par (edition_id, club_id) attaché.
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
    if (!list.length) return [];
    const ids = list.map((e) => e.id);
    // JOIN sur edition_clubs (lecture publique, cf. ec_read policy) avec le club.
    const { data: links, error: e2 } = await supabase
      .from('edition_clubs')
      .select('edition_id, club_id, eligibility_rules, club:clubs(*)')
      .in('edition_id', ids);
    if (e2) throw e2;
    const linksByEdition = new Map();
    for (const row of links || []) {
      const arr = linksByEdition.get(row.edition_id) || [];
      arr.push(row);
      linksByEdition.set(row.edition_id, arr);
    }
    const out = [];
    for (const edition of list) {
      const baseRules =
        edition.eligibility_rules && typeof edition.eligibility_rules === 'object'
          ? edition.eligibility_rules
          : {};
      const rows = linksByEdition.get(edition.id) || [];
      for (const row of rows) {
        const override =
          row.eligibility_rules && typeof row.eligibility_rules === 'object'
            ? row.eligibility_rules
            : {};
        out.push({
          edition,
          club: row.club || { id: row.club_id, name: row.club_id },
          rules: { ...baseRules, ...override },
        });
      }
    }
    return out;
  },
};

// sessions : clusters thématiques + finale. PK text. Nom 'RsaSession' (cf. en-tête).
export const RsaSession = {
  ...createEntity('sessions'),

  // Module 4a — Lecture des sessions d'une édition (ordonnées par position).
  async forEdition(editionId) {
    if (!editionId) return [];
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('edition_id', editionId)
      .order('position', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // Module 4a — Jointure sessions + session_config (admin SETUP/LIVE/RESULTS lit en une seule
  // requête car session_config est legacy mais sa policy session_config_read couvre).
  async withConfigForEdition(editionId) {
    if (!editionId) return [];
    const sessions = await this.forEdition(editionId);
    if (!sessions.length) return [];
    const ids = sessions.map((s) => s.id);
    const { data: cfg, error } = await supabase
      .from('session_config')
      .select('*')
      .in('session_id', ids);
    if (error) throw error;
    const byId = new Map((cfg || []).map((c) => [c.session_id, c]));
    return sessions.map((s) => ({ ...s, config: byId.get(s.id) || null }));
  },

  // Module 4a — Create (RPC SECURITY DEFINER) : insère sessions + seed session_config
  // dans la même transaction (résout le blocker §2.1.B du blueprint).
  // payload : { id, name, theme, kind, session_date, position, notes? }
  async createWithConfig({ editionId, payload }) {
    const { data, error } = await supabase.rpc('rsa_create_session', {
      p_edition_id: editionId,
      p_session: payload,
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  },

  // Module 4a — Lifecycle wrappers (RPC SECURITY DEFINER admin only).
  async setLive(sessionId) {
    const { error } = await supabase.rpc('rsa_set_session_live', { p_session_id: sessionId });
    if (error) throw error;
  },
  async setDraft(sessionId) {
    const { error } = await supabase.rpc('rsa_set_session_draft', { p_session_id: sessionId });
    if (error) throw error;
  },
  async resetTemplate(sessionId) {
    const { error } = await supabase.rpc('rsa_reset_session_template', { p_session_id: sessionId });
    if (error) throw error;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Module 4a — AppUserRole (provisionning rôles plateforme, admin only)
// ─────────────────────────────────────────────────────────────────────────────
// La table app_user_roles est verrouillée côté écriture (service_role only) ; en
// lecture elle n'expose que la ligne du caller. M4a passe par deux RPC SECURITY DEFINER :
//   - rsa_list_app_user_roles() : lecture admin de TOUTE la table.
//   - rsa_assign_role(email, roles[]) : UPSERT avec last-admin protection.

export const AppUserRole = {
  // Liste admin de toutes les lignes app_user_roles (RPC SECURITY DEFINER admin-only).
  async list() {
    const { data, error } = await supabase.rpc('rsa_list_app_user_roles');
    if (error) throw error;
    return data || [];
  },

  // Lecture d'une ligne pour un email donné (utilise la même RPC + filtre client).
  // Plus simple et plus sûr que d'ouvrir un second endpoint.
  async forEmail(email) {
    if (!email) return null;
    const norm = String(email).trim().toLowerCase();
    const all = await this.list();
    return all.find((r) => String(r.email).toLowerCase() === norm) || null;
  },

  // Assignation/révocation : roles = liste finale (vide = révocation totale).
  // RPC valide les rôles ⊆ ('startup','jury','comite','admin') et applique la
  // last-admin protection. Renvoie la ligne mise à jour.
  async assign({ email, roles }) {
    const { data, error } = await supabase.rpc('rsa_assign_role', {
      p_email: email,
      p_roles: roles,
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  },

  // Révocation totale (sucre — délègue à assign avec roles=[]).
  async revoke(email) {
    return this.assign({ email, roles: [] });
  },
};

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
  // V3 Vague 2 C — opt-in palmarès public.
  'champion_photo_optin',
  'champion_photo_path',
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
  async createPendingApplication({ editionId, clubId = null, email }) {
    const { data, error } = await supabase.rpc('rsa_create_pending_application', {
      p_edition_id: editionId,
      p_club_id: clubId,
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

// ─────────────────────────────────────────────────────────────────────────────
// Module 3 — Jury (« Espace Jury »)
// ─────────────────────────────────────────────────────────────────────────────
// Tables (cf. supabase/migrations/20260527_rsa_module3_jury.sql) :
//   platform_jury_profiles      -> JuryProfile      (PK user_id)
//   platform_jury_assignments   -> JuryAssignment   (composite PK jury_user_id + session_id)
//   platform_jury_score_drafts  -> JuryDraft        (composite PK startup_id + jury_user_id)
//   platform_jury_scores        -> JuryScore        (composite PK startup_id + jury_user_id)
//
// Conventions :
//   - Composite PK -> on n'utilise PAS update(id) / delete(id) de createEntity (qui
//     filtre sur la colonne 'id'). On expose des helpers explicites (upsert / clearDraft).
//   - JuryScore : DENY direct INSERT/UPDATE par RLS — TOUT passe par le RPC
//     rsa_submit_jury_score. Le helper JuryScore.submit centralise l'appel.
//   - Le préfixe JS (JuryProfile / JuryAssignment / ...) écrase volontairement les noms
//     legacy 2026 du db.js (JuryProfile, JuryScore, JuryScoreDraft). Module 3 et au-delà
//     importent depuis @/lib/rsa/entities ; les pages 2026 legacy continuent d'utiliser
//     @/lib/db. Co-existence sans conflit puisque les imports sont scoped.

export const JuryProfile = {
  ...createEntity('platform_jury_profiles'),

  async mine(userId) {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('platform_jury_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },

  async forIds(userIds) {
    const clean = (userIds || []).filter(Boolean);
    if (clean.length === 0) return [];
    const { data, error } = await supabase
      .from('platform_jury_profiles')
      .select('*')
      .in('user_id', clean);
    if (error) throw error;
    return data || [];
  },

  // Upsert sa propre fiche (premier login juré, édition de bio/qualité).
  // RLS pjp_self_update + pjp_insert : user_id épinglé à auth.uid().
  async upsertMine({ userId, qualite, organisation, photoPath, bio }) {
    const payload = {
      user_id: userId,
      qualite: qualite ?? null,
      organisation: organisation ?? null,
      photo_path: photoPath ?? null,
      bio: bio ?? null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('platform_jury_profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

export const JuryAssignment = {
  ...createEntity('platform_jury_assignments'),

  // Mes assignments (RLS pja_read self).
  async mine(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('platform_jury_assignments')
      .select('*')
      .eq('jury_user_id', userId);
    if (error) throw error;
    return data || [];
  },

  // Tous les jurés d'une session (RLS pja_read : own + comité/admin).
  async forSession(sessionId) {
    if (!sessionId) return [];
    const { data, error } = await supabase
      .from('platform_jury_assignments')
      .select('*')
      .eq('session_id', sessionId);
    if (error) throw error;
    return data || [];
  },

  // Toutes les assignments visibles (admin/comité voient tout, juré ne voit que les siennes).
  async listAll() {
    const { data, error } = await supabase
      .from('platform_jury_assignments')
      .select('*');
    if (error) throw error;
    return data || [];
  },

  // Assign — admin only (RLS pja_admin_write).
  async assign({ juryUserId, sessionId, createdBy }) {
    const { data, error } = await supabase
      .from('platform_jury_assignments')
      .insert({
        jury_user_id: juryUserId,
        session_id: sessionId,
        created_by: createdBy ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Unassign — admin only.
  async unassign({ juryUserId, sessionId }) {
    const { error } = await supabase
      .from('platform_jury_assignments')
      .delete()
      .eq('jury_user_id', juryUserId)
      .eq('session_id', sessionId);
    if (error) throw error;
  },
};

export const JuryDraft = {
  ...createEntity('platform_jury_score_drafts'),

  // Mon draft pour un startup donné (RLS pjsd_self_read).
  async forStartup(startupId, juryUserId) {
    if (!startupId || !juryUserId) return null;
    const { data, error } = await supabase
      .from('platform_jury_score_drafts')
      .select('*')
      .eq('startup_id', startupId)
      .eq('jury_user_id', juryUserId)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },

  // Tous mes drafts pour une session (UX : pré-remplir le queue).
  async forSession(sessionId, juryUserId) {
    if (!sessionId || !juryUserId) return [];
    const { data, error } = await supabase
      .from('platform_jury_score_drafts')
      .select('*')
      .eq('session_id', sessionId)
      .eq('jury_user_id', juryUserId);
    if (error) throw error;
    return data || [];
  },

  // Upsert (autosave). RLS pjsd_self_write : jury_user_id = auth.uid() AND rsa_can_score().
  // patch = sous-ensemble des 6 score_* + comment ; null tolérés (drafts partiels).
  async upsert({ startupId, sessionId, juryUserId, patch }) {
    const payload = {
      startup_id: startupId,
      jury_user_id: juryUserId,
      session_id: sessionId,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('platform_jury_score_drafts')
      .upsert(payload, { onConflict: 'startup_id,jury_user_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async clear({ startupId, juryUserId }) {
    const { error } = await supabase
      .from('platform_jury_score_drafts')
      .delete()
      .eq('startup_id', startupId)
      .eq('jury_user_id', juryUserId);
    if (error) throw error;
  },
};

export const JuryScore = {
  ...createEntity('platform_jury_scores'),

  // Mon score final pour un startup (RLS pjs_jury_self_read : own + comité/admin).
  async forStartup(startupId, juryUserId) {
    if (!startupId || !juryUserId) return null;
    const { data, error } = await supabase
      .from('platform_jury_scores')
      .select('*')
      .eq('startup_id', startupId)
      .eq('jury_user_id', juryUserId)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },

  // Tous les scores finaux d'une session (RLS : jury voit les siens + comité/admin voient tout).
  async forSession(sessionId) {
    if (!sessionId) return [];
    const { data, error } = await supabase
      .from('platform_jury_scores')
      .select('*')
      .eq('session_id', sessionId);
    if (error) throw error;
    return data || [];
  },

  // Mes scores pour une session (pré-remplit l'UI quand re-ouvrant une carte locked).
  async mineForSession(sessionId, juryUserId) {
    if (!sessionId || !juryUserId) return [];
    const { data, error } = await supabase
      .from('platform_jury_scores')
      .select('*')
      .eq('session_id', sessionId)
      .eq('jury_user_id', juryUserId);
    if (error) throw error;
    return data || [];
  },

  // Soumission — TOUJOURS via RPC SECURITY DEFINER (la RLS DENY le INSERT direct).
  // scores = { score_value_prop, score_market, score_business_model, score_team,
  //            score_pitch_quality, score_societal_impact } — tous 0..5 requis.
  async submit({ startupId, sessionId, scores, comment }) {
    const { data, error } = await supabase.rpc('rsa_submit_jury_score', {
      p_startup_id: startupId,
      p_session_id: sessionId,
      p_scores: scores,
      p_comment: comment ?? null,
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  },

  // Admin — lifecycle (Module 3 expose ici ; le UI admin Module 4 les ré-utilise).
  async lockSession(sessionId) {
    const { error } = await supabase.rpc('rsa_lock_session', { p_session_id: sessionId });
    if (error) throw error;
  },

  async publishSession(sessionId) {
    const { error } = await supabase.rpc('rsa_publish_session', { p_session_id: sessionId });
    if (error) throw error;
  },
};

// ============================================================================
// V2 MULTI-CLUB — Entités clubs / memberships / edition_clubs
// ============================================================================
// Toutes les écritures passent par les RPC SECURITY DEFINER de l'étape 2 (cf.
// supabase/migrations/20260529_rsa_v2_club_management_rpcs.sql). Les lectures
// passent par les RPC quand un filtrage par rôle est nécessaire (rsa_list_*),
// sinon directement via la table (clubs/edition_clubs ont SELECT public).

// Clubs : référence des clubs Rotary participants
export const Club = {
  ...createEntity('clubs'),

  // Liste publique des clubs (utilisée par le dropdown candidature multi-club).
  // Passe par le RPC pour cohérence (et possible filtrage futur).
  async listAll() {
    const { data, error } = await supabase.rpc('rsa_list_clubs');
    if (error) throw error;
    return data || [];
  },

  // Création V2.5 — réservée master_admin (vérifié côté serveur).
  //
  // V2.5 refonte 2026-05-31 : l'ID n'est plus fourni par le caller (généré
  // côté serveur depuis le nom). Signature étendue avec country/language +
  // représentant (first/last/email/phone) + président + coordonnées clubs.
  //
  // V2 hotfix conservé : watchdog 12s pour éviter le spinner perpétuel si le
  // RPC ne répond pas. Logs console.debug pour le diagnostic.
  async createClub({
    name,
    country,
    language = 'fr',
    contactFirstName,
    contactLastName,
    contactEmail,
    contactPhone,
    presidentFirstName,
    presidentLastName,
    presidentEmail,
    clubEmail,
    clubPhone,
    clubAddress,
  }) {
    // eslint-disable-next-line no-console
    console.debug('[Club.createClub] start', { name, country, language });
    const rpcPromise = supabase.rpc('rsa_create_club', {
      p_name: name,
      p_country: country,
      p_language: language ?? 'fr',
      p_contact_first_name: contactFirstName ?? null,
      p_contact_last_name: contactLastName ?? null,
      p_contact_email: contactEmail ?? null,
      p_contact_phone: contactPhone ?? null,
      p_president_first_name: presidentFirstName ?? null,
      p_president_last_name: presidentLastName ?? null,
      p_president_email: presidentEmail ?? null,
      p_club_email: clubEmail ?? null,
      p_club_phone: clubPhone ?? null,
      p_club_address: clubAddress ?? null,
    });
    const watchdog = new Promise((_resolve, reject) =>
      setTimeout(() => reject(new Error('createClub_timeout: pas de réponse après 12s — vérifier réseau, JWT ou Supabase status')), 12000),
    );
    const { data, error } = await Promise.race([rpcPromise, watchdog]).catch((timeoutErr) => {
      // eslint-disable-next-line no-console
      console.error('[Club.createClub] watchdog fired', timeoutErr);
      throw timeoutErr;
    });
    // eslint-disable-next-line no-console
    console.debug('[Club.createClub] response', { data, error });
    if (error) throw error;
    return data;
  },

  // Édition V2.5 — master_admin OR club_admin du club (vérifié côté serveur).
  //
  // Convention : un champ omis (undefined) OU passé à null = ne pas toucher.
  // Pour vider un champ, passer la chaîne vide '' (normalisée côté SQL).
  // L'id n'est jamais modifiable.
  async updateClub({
    id,
    name,
    country,
    language,
    contactFirstName,
    contactLastName,
    contactEmail,
    contactPhone,
    presidentFirstName,
    presidentLastName,
    presidentEmail,
    clubEmail,
    clubPhone,
    clubAddress,
  }) {
    if (!id) throw new Error('updateClub: id requis');
    const { data, error } = await supabase.rpc('rsa_update_club', {
      p_id: id,
      p_name: name ?? null,
      p_country: country ?? null,
      p_language: language ?? null,
      p_contact_first_name: contactFirstName ?? null,
      p_contact_last_name: contactLastName ?? null,
      p_contact_email: contactEmail ?? null,
      p_contact_phone: contactPhone ?? null,
      p_president_first_name: presidentFirstName ?? null,
      p_president_last_name: presidentLastName ?? null,
      p_president_email: presidentEmail ?? null,
      p_club_email: clubEmail ?? null,
      p_club_phone: clubPhone ?? null,
      p_club_address: clubAddress ?? null,
    });
    if (error) throw error;
    return data;
  },
};

// ClubMembership : rôles par-club (parallèle à app_user_roles pour les globaux)
export const ClubMembership = {
  ...createEntity('club_memberships'),

  // Membres d'un club, joint avec auth.users + profiles (via RPC car JOIN auth).
  // Réservé master_admin ou club_admin du club (filtrage côté serveur).
  async listMembers(clubId) {
    if (!clubId) return [];
    const { data, error } = await supabase.rpc('rsa_list_club_members', { p_club_id: clubId });
    if (error) throw error;
    return data || [];
  },

  // Mes propres memberships (tous clubs, tous rôles) — lu par PlatformAuthProvider.
  async myMemberships() {
    const { data, error } = await supabase.rpc('my_club_memberships');
    if (error) {
      // Tolérance : si l'RPC n'existe pas (build local sans migration), on retombe
      // sur la table directe via la RLS self-read.
      const { data: rows } = await supabase.from('club_memberships').select('club_id, role');
      return rows || [];
    }
    return data || [];
  },

  // Assignation — master_admin ou club_admin du club.
  async assign({ email, clubId, role }) {
    const { data, error } = await supabase.rpc('rsa_assign_club_role', {
      p_email: email,
      p_club_id: clubId,
      p_role: role,
    });
    if (error) throw error;
    return data;
  },

  // Retrait — master_admin ou club_admin du club (garde-fou last-admin).
  async revoke({ email, clubId, role }) {
    const { error } = await supabase.rpc('rsa_revoke_club_role', {
      p_email: email,
      p_club_id: clubId,
      p_role: role,
    });
    if (error) throw error;
  },
};

// EditionClub : junction club × compétition (avec override eligibility_rules)
export const EditionClub = {
  ...createEntity('edition_clubs'),

  // Clubs participants à une compétition (publique pour le dropdown candidature).
  async forEdition(editionId) {
    if (!editionId) return [];
    const { data, error } = await supabase
      .from('edition_clubs')
      .select('*, club:clubs(*)')
      .eq('edition_id', editionId);
    if (error) throw error;
    return data || [];
  },

  // Attachement d'un club à une compétition (master_admin only).
  async attach({ editionId, clubId, eligibilityRules }) {
    const { data, error } = await supabase.rpc('rsa_attach_club_to_edition', {
      p_edition_id: editionId,
      p_club_id: clubId,
      p_eligibility_rules: eligibilityRules ?? {},
    });
    if (error) throw error;
    return data;
  },

  // Détachement (refusé si startups/sessions existent — intégrité).
  async detach({ editionId, clubId }) {
    const { error } = await supabase.rpc('rsa_detach_club_from_edition', {
      p_edition_id: editionId,
      p_club_id: clubId,
    });
    if (error) throw error;
  },

  // Refonte hiérarchie (Phase 1) — Renvoie l'edition_id le plus pertinent
  // pour un club donné, pour résoudre les liens legacy `?scope=club:{cid}` en
  // `?scope=club:{eid}/{cid}`. Priorité : édition active (status ∈ open|sessions|
  // finale), sinon la plus récente par year DESC. Renvoie null si le club n'est
  // attaché à aucune compétition.
  async forClub(clubId) {
    if (!clubId) return null;
    const { data, error } = await supabase
      .from('edition_clubs')
      .select('edition_id, edition:editions(id, status, year, application_open)')
      .eq('club_id', clubId);
    if (error) throw error;
    const rows = (data || []).filter((r) => r.edition);
    if (rows.length === 0) return null;
    const ACTIVE = new Set(['open', 'sessions', 'finale']);
    rows.sort((a, b) => {
      const ea = a.edition;
      const eb = b.edition;
      const aActive = ACTIVE.has(ea.status) ? 0 : 1;
      const bActive = ACTIVE.has(eb.status) ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      if ((eb.year || 0) !== (ea.year || 0)) return (eb.year || 0) - (ea.year || 0);
      const aDate = ea.application_open || '';
      const bDate = eb.application_open || '';
      return bDate.localeCompare(aDate);
    });
    return rows[0].edition_id;
  },

  // Chantier 2 — Renvoie l'objet eligibility_rules per-club (JSONB) pour
  // (editionId, clubId). Utilisé par useEditionClubRules pour fusionner avec
  // les règles globales d'édition. null si la junction n'existe pas, {} si
  // elle existe mais sans override.
  async rulesForClub(editionId, clubId) {
    if (!editionId || !clubId) return null;
    const { data, error } = await supabase
      .from('edition_clubs')
      .select('eligibility_rules')
      .eq('edition_id', editionId)
      .eq('club_id', clubId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return data.eligibility_rules && typeof data.eligibility_rules === 'object'
      ? data.eligibility_rules
      : {};
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

// ============================================================================
// V3 — CompetitionAdmin (tier 1, admin d'une compétition)
// ============================================================================
// Table competition_admins (cf. supabase/migrations/20260602_rsa_v3_competition_admin_role.sql).
// Toutes les écritures passent par les RPC SECURITY DEFINER :
//   - rsa_grant_competition_admin(user_id, edition_id)   — master_admin only
//   - rsa_revoke_competition_admin(user_id, edition_id)  — master_admin only
//   - rsa_list_competition_admins(edition_id)            — master_admin only
//
// Pour la lecture côté provider d'auth : my_competition_admin_editions()
// retourne text[] des éditions que le caller administre (lu en parallèle par
// PlatformAuthProvider, cf. auth.jsx).
export const CompetitionAdmin = {
  async grant(userId, editionId) {
    return supabase.rpc('rsa_grant_competition_admin', {
      p_user_id: userId,
      p_edition_id: editionId,
    });
  },

  async revoke(userId, editionId) {
    return supabase.rpc('rsa_revoke_competition_admin', {
      p_user_id: userId,
      p_edition_id: editionId,
    });
  },

  async listForEdition(editionId) {
    const { data, error } = await supabase.rpc('rsa_list_competition_admins', {
      p_edition_id: editionId,
    });
    if (error) throw error;
    return data || [];
  },
};

// ============================================================================
// V2 Module 7 — JuryApplication (funnel d'acquisition jury)
// ============================================================================
// Table jury_applications + RPC SECURITY DEFINER (cf.
// supabase/migrations/20260530_rsa_v2_jury_funnel.sql).
//
// Surface :
//   - apply()      : soumission publique (anon OK) via rsa_apply_jury
//   - listByClub() : queue de revue côté club_admin (rsa_list_jury_applications)
//   - reject()     : refus typé (rsa_reject_jury_application)
//   - approve()    : approbation ; renvoie { application, needsAuthCreation, userId }
//                    (rsa_approve_jury_application — la RPC peut signaler que la
//                     finalisation passe par l'edge function send-jury-welcome qui
//                     créera le compte auth.users + magic-link).
//
// Côté lecture pour le candidat lui-même : la RLS ja_select autorise la lecture par
// email matching auth.jwt -> on peut faire un .from('jury_applications').select()
// classique côté front si jamais on construit une page « ma candidature ».
export const JuryApplication = {
  ...createEntity('jury_applications'),

  // Soumission publique (RPC SECURITY DEFINER, GRANT anon+authenticated).
  // Retourne la ligne insérée. Lève une exception SQL en cas de doublon pending.
  async apply({
    clubId,
    editionId = null,
    email,
    fullName,
    qualite,
    organisation = null,
    bio = null,
    photoPath = null,
    preferredThemes = [],
    availabilitySessionIds = [],
  }) {
    const { data, error } = await supabase.rpc('rsa_apply_jury', {
      p_club_id: clubId,
      p_edition_id: editionId,
      p_email: email,
      p_full_name: fullName,
      p_qualite: qualite,
      p_organisation: organisation,
      p_bio: bio,
      p_photo_path: photoPath,
      p_preferred_themes: Array.isArray(preferredThemes) ? preferredThemes : [],
      p_availability_session_ids: Array.isArray(availabilitySessionIds) ? availabilitySessionIds : [],
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  },

  // Liste des candidatures d'un club. status = 'pending' | 'approved' | 'rejected'
  // | 'cancelled' | null (toutes). RLS + le filtre serveur garantissent que seuls
  // master_admin / club_admin du club voient quoi que ce soit.
  async listByClub(clubId, status = null) {
    if (!clubId) return [];
    const { data, error } = await supabase.rpc('rsa_list_jury_applications', {
      p_club_id: clubId,
      p_status: status,
    });
    if (error) throw error;
    return data || [];
  },

  // Refus (master_admin OR club_admin du club). note peut être null ou string.
  async reject(id, note = null) {
    const { data, error } = await supabase.rpc('rsa_reject_jury_application', {
      p_application_id: id,
      p_note: note,
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  },

  // Approbation. La RPC renvoie une row { application, needs_auth_creation, user_id }.
  // - Si needsAuthCreation = true : le candidat n'a pas encore de compte auth.users.
  //   Le club_admin doit lui envoyer un magic-link (via l'Email Studio M9 ou
  //   l'edge function send-jury-welcome, à venir). Une fois le candidat connecté
  //   au moins une fois, rappeler approve() finalise membership + profile.
  // - Sinon : le membership 'jury' et la fiche platform_jury_profiles sont créés
  //   et l'application porte approved_user_id.
  async approve(id) {
    const { data, error } = await supabase.rpc('rsa_approve_jury_application', {
      p_application_id: id,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { application: null, needsAuthCreation: false, userId: null };
    return {
      application: row.application,
      needsAuthCreation: !!row.needs_auth_creation,
      userId: row.user_id || null,
    };
  },
};
