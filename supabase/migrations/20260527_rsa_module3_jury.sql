-- Rotary Startup Award — Module 3 (« Espace Jury ») : tables, RLS, RPC.
--
-- Dépend de :
--   20260527_rsa_platform_foundation.sql      (editions/sessions/startups/profiles + has_platform_role)
--   20260527_rsa_platform_roles_hardening.sql (app_user_roles verrouillé)
--   20260527_rsa_module1_prep.sql             (RLS startups_applicant_*, owns_startup, is_dossier_staff)
--   20260527_rsa_module1_hardening.sql        (trigger startups_guard_update + sentinel
--                                              'rsa.allow_protected_update', staff bypass)
--   20260527_rsa_module2_selection.sql        (étend le trigger : finalized_at/by ; partial unique
--                                              index ; CHECK decision ; RPC rsa_apply/finalize/override)
--   Legacy : public.session_config (table 2026 — colonne status [draft|live|locked|published] +
--            final_ranking jsonb + session_order text[]). REUSED comme source de vérité du
--            lifecycle, NON migrée (pre-decided default #5 du build : on garde session_config).
--
-- Couvre docs/blueprints/module3-jury.md (§5 / §9) :
--   - Nouvelle colonne editions.finalists_per_session (default 1).
--   - 4 nouvelles tables : platform_jury_profiles, platform_jury_assignments,
--     platform_jury_score_drafts, platform_jury_scores. Préfixe `platform_` pour ne pas
--     entrer en collision avec les tables legacy 2026 (jury_profiles, jury_scores, …).
--   - Helpers SECURITY DEFINER : rsa_can_score, rsa_is_assigned, rsa_weighted_score.
--   - RPC SECURITY DEFINER :
--       * rsa_submit_jury_score(p_startup_id, p_session_id, p_scores jsonb, p_comment) ;
--       * rsa_lock_session(p_session_id text)        — ADMIN ;
--       * rsa_publish_session(p_session_id text)     — ADMIN.
--   - RLS strict : jury voit/écrit ses propres drafts seulement quand assigné + live ;
--     final scores DENY direct INSERT/UPDATE (seul le RPC écrit via sentinel) ;
--     comité/jury/admin en SELECT sur platform_jury_scores ; candidats jamais.
--
-- DESIGN — weights de rsa_publish_session :
--   Twin SQL de src/lib/rsa/constants.js#weightedScore + src/lib/rsa/ranking.js#buildRanking :
--   value_prop:0.2 + market:0.2 + business_model:0.2 + team:0.2 +
--   pitch_quality:0.1 + societal_impact:0.1 = 1 (max weighted = 5). Tri DESC sur la moyenne
--   pondérée, tie-break par startup name ASC. Pas d'overrides admin côté Module 3 (le legacy
--   2026 supportait bonus/fixed_rank ; on n'importe PAS, base vierge — pre-decided default #7).
--
-- DESIGN — bypass-sentinel :
--   rsa_lock_session / rsa_publish_session écrivent startups.status (note / finaliste) :
--   le trigger startups_guard_update les rejetterait côté candidat. Les RPC posent
--   set_config('rsa.allow_protected_update','t', true) AVANT leur UPDATE et le réinitialisent
--   APRÈS (même patron que rsa_submit_dossier / rsa_apply_selection_review). Le 3e argument
--   true rend la GUC LOCAL à la transaction (auto-nettoyage en cas d'exception).
--
-- DESIGN — finalists_per_session :
--   Colonne sur editions (pas sur sessions) : un édition = une politique uniforme. Default 1
--   (parité 2026 : 1 finaliste par session qualifying, 5 finalistes total). L'admin peut
--   l'éditer via la policy editions_admin existante.
--
-- DESIGN — tables legacy intactes :
--   jury_profiles / jury_scores / jury_score_drafts / session_config restent en l'état.
--   session_config est REUSED (status + final_ranking + session_order) ; les autres ne sont
--   ni lues ni écrites par Module 3 (archive 2026, pre-decided default #7).
--
-- Idempotence : create or replace, drop policy if exists, add column if not exists.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. editions : finalists_per_session
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.editions
  add column if not exists finalists_per_session int not null default 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. platform_jury_profiles : fiche affichage juré (qualité, organisation, photo, bio)
-- ─────────────────────────────────────────────────────────────────────────────
-- Keyed sur auth.users(id). Le display name vit dans profiles.full_name (non dupliqué).

create table if not exists public.platform_jury_profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  qualite      text,
  organisation text,
  photo_path   text,
  bio          text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.platform_jury_profiles enable row level security;

-- READ : sa propre fiche OU jury/comité/admin (besoin LiveTab + popover co-jurés).
drop policy if exists pjp_read on public.platform_jury_profiles;
create policy pjp_read on public.platform_jury_profiles for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.has_platform_role('jury')
    or public.has_platform_role('comite')
    or public.has_platform_role('admin')
  );

-- INSERT : sa propre fiche (premier login) OU admin (provisioning).
drop policy if exists pjp_insert on public.platform_jury_profiles;
create policy pjp_insert on public.platform_jury_profiles for insert
  to authenticated
  with check (user_id = auth.uid() or public.has_platform_role('admin'));

-- UPDATE : sa propre fiche uniquement (le user_id n'est pas modifiable — PK).
drop policy if exists pjp_self_update on public.platform_jury_profiles;
create policy pjp_self_update on public.platform_jury_profiles for update
  to authenticated
  using (user_id = auth.uid() or public.has_platform_role('admin'))
  with check (user_id = auth.uid() or public.has_platform_role('admin'));

-- DELETE : admin only.
drop policy if exists pjp_admin_delete on public.platform_jury_profiles;
create policy pjp_admin_delete on public.platform_jury_profiles for delete
  to authenticated
  using (public.has_platform_role('admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. platform_jury_assignments : juré × session (assigné par admin)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.platform_jury_assignments (
  jury_user_id uuid not null references auth.users(id) on delete cascade,
  session_id   text not null references public.sessions(id) on delete cascade,
  assigned_at  timestamptz not null default now(),
  created_by   uuid references auth.users(id),
  primary key (jury_user_id, session_id)
);

create index if not exists pja_session_idx on public.platform_jury_assignments(session_id);
create index if not exists pja_jury_idx    on public.platform_jury_assignments(jury_user_id);

alter table public.platform_jury_assignments enable row level security;

-- READ : juré (ses propres assignments) + comité (LiveTab) + admin (orchestration).
drop policy if exists pja_read on public.platform_jury_assignments;
create policy pja_read on public.platform_jury_assignments for select
  to authenticated
  using (
    jury_user_id = auth.uid()
    or public.has_platform_role('comite')
    or public.has_platform_role('admin')
  );

-- WRITE (ALL = insert/update/delete) : admin only.
drop policy if exists pja_admin_write on public.platform_jury_assignments;
create policy pja_admin_write on public.platform_jury_assignments for all
  to authenticated
  using (public.has_platform_role('admin'))
  with check (public.has_platform_role('admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Helpers SECURITY DEFINER : rsa_can_score / rsa_is_assigned
-- ─────────────────────────────────────────────────────────────────────────────
-- rsa_can_score : true si l'appelant est assigné à la session ET session_config.status='live'.
-- DEFINER => le juré n'a pas besoin de grant explicite sur session_config (table legacy).

create or replace function public.rsa_can_score(p_session_id text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.platform_jury_assignments a
      join public.session_config sc on sc.session_id = a.session_id
     where a.session_id = p_session_id
       and a.jury_user_id = auth.uid()
       and sc.status = 'live'
  );
$$;

revoke all on function public.rsa_can_score(text) from public;
grant execute on function public.rsa_can_score(text) to authenticated;

create or replace function public.rsa_is_assigned(p_session_id text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.platform_jury_assignments
     where session_id = p_session_id
       and jury_user_id = auth.uid()
  );
$$;

revoke all on function public.rsa_is_assigned(text) from public;
grant execute on function public.rsa_is_assigned(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. platform_jury_score_drafts : drafts autosave (partiels, écrits client)
-- ─────────────────────────────────────────────────────────────────────────────
-- Même shape que platform_jury_scores moins le NOT NULL sur les critères. Composite PK
-- pour un UPSERT propre. session_id est dénormalisé (le RPC submit le re-vérifie).

create table if not exists public.platform_jury_score_drafts (
  startup_id            uuid not null references public.startups(id) on delete cascade,
  jury_user_id          uuid not null references auth.users(id) on delete cascade,
  session_id            text not null references public.sessions(id),
  score_value_prop      int check (score_value_prop      between 0 and 5),
  score_market          int check (score_market          between 0 and 5),
  score_business_model  int check (score_business_model  between 0 and 5),
  score_team            int check (score_team            between 0 and 5),
  score_pitch_quality   int check (score_pitch_quality   between 0 and 5),
  score_societal_impact int check (score_societal_impact between 0 and 5),
  comment               text,
  updated_at            timestamptz not null default now(),
  primary key (startup_id, jury_user_id)
);

create index if not exists pjsd_session_idx on public.platform_jury_score_drafts(session_id);

alter table public.platform_jury_score_drafts enable row level security;

-- READ : ses propres drafts uniquement (jamais visibles au staff — défense des notes en
-- gestation). Les drafts sont *privés* au juré ; le staff voit le final score, pas le brouillon.
drop policy if exists pjsd_self_read on public.platform_jury_score_drafts;
create policy pjsd_self_read on public.platform_jury_score_drafts for select
  to authenticated
  using (jury_user_id = auth.uid());

-- WRITE (ALL) : ses propres drafts ET seulement quand assigné + session live (rsa_can_score).
drop policy if exists pjsd_self_write on public.platform_jury_score_drafts;
create policy pjsd_self_write on public.platform_jury_score_drafts for all
  to authenticated
  using (jury_user_id = auth.uid() and public.rsa_can_score(session_id))
  with check (jury_user_id = auth.uid() and public.rsa_can_score(session_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. platform_jury_scores : note finale (un row par startup × juré)
-- ─────────────────────────────────────────────────────────────────────────────
-- Tous les scores 0..5 NOT NULL (le RPC valide à la soumission). DENY direct
-- INSERT/UPDATE : seul rsa_submit_jury_score écrit (via sentinel-bypass non nécessaire
-- car aucun trigger guard ici, mais l'approche centralisée garantit la validation).

create table if not exists public.platform_jury_scores (
  startup_id            uuid not null references public.startups(id) on delete cascade,
  jury_user_id          uuid not null references auth.users(id) on delete cascade,
  session_id            text not null references public.sessions(id),
  score_value_prop      int not null check (score_value_prop      between 0 and 5),
  score_market          int not null check (score_market          between 0 and 5),
  score_business_model  int not null check (score_business_model  between 0 and 5),
  score_team            int not null check (score_team            between 0 and 5),
  score_pitch_quality   int not null check (score_pitch_quality   between 0 and 5),
  score_societal_impact int not null check (score_societal_impact between 0 and 5),
  comment               text,
  submitted_at          timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  primary key (startup_id, jury_user_id)
);

create index if not exists pjs_session_idx on public.platform_jury_scores(session_id);
create index if not exists pjs_jury_idx    on public.platform_jury_scores(jury_user_id);

alter table public.platform_jury_scores enable row level security;

-- READ : juré (le sien) + comité/admin (tout). Le CANDIDAT n'est PAS dans la liste —
-- il ne voit jamais les scores individuels (seulement le status projeté sur sa ligne).
drop policy if exists pjs_jury_self_read on public.platform_jury_scores;
create policy pjs_jury_self_read on public.platform_jury_scores for select
  to authenticated
  using (
    jury_user_id = auth.uid()
    or public.has_platform_role('comite')
    or public.has_platform_role('admin')
  );

-- INSERT : DENY pour tout le monde (seul rsa_submit_jury_score écrit, SECURITY DEFINER).
drop policy if exists pjs_no_direct_insert on public.platform_jury_scores;
create policy pjs_no_direct_insert on public.platform_jury_scores for insert
  to authenticated
  with check (false);

-- UPDATE : DENY (le RPC submit fait un UPSERT pour re-soumettre).
drop policy if exists pjs_no_direct_update on public.platform_jury_scores;
create policy pjs_no_direct_update on public.platform_jury_scores for update
  to authenticated
  using (false) with check (false);

-- DELETE : admin only (récupération erreur "j'ai soumis pour le mauvais juré").
drop policy if exists pjs_admin_delete on public.platform_jury_scores;
create policy pjs_admin_delete on public.platform_jury_scores for delete
  to authenticated
  using (public.has_platform_role('admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Helper rsa_weighted_score : twin SQL de weightedScore(constants.js)
-- ─────────────────────────────────────────────────────────────────────────────
-- IMMUTABLE : pour un row donné, le score pondéré est déterministe.
-- Weights : value_prop:0.2 + market:0.2 + business_model:0.2 + team:0.2 +
--           pitch_quality:0.1 + societal_impact:0.1 = 1.0 (max weighted = 5).

create or replace function public.rsa_weighted_score(p_row public.platform_jury_scores)
returns numeric
language sql immutable as $$
  select (0.2 * p_row.score_value_prop
        + 0.2 * p_row.score_market
        + 0.2 * p_row.score_business_model
        + 0.2 * p_row.score_team
        + 0.1 * p_row.score_pitch_quality
        + 0.1 * p_row.score_societal_impact)::numeric;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. RPC rsa_submit_jury_score(p_startup_id, p_session_id, p_scores jsonb, p_comment)
-- ─────────────────────────────────────────────────────────────────────────────
-- Atomique : valide assignment + session 'live' + 6 scores présents 0..5 ->
-- UPSERT platform_jury_scores -> DELETE du draft -> renvoie la row.
--
-- SECURITY DEFINER : la fonction écrit sur platform_jury_scores qui a DENY INSERT/UPDATE.
-- REVOKE all + GRANT authenticated.

create or replace function public.rsa_submit_jury_score(
  p_startup_id uuid,
  p_session_id text,
  p_scores     jsonb,
  p_comment    text default null
)
returns public.platform_jury_scores
language plpgsql security definer set search_path = public as $$
declare
  v_row    public.platform_jury_scores;
  v_jury   uuid := auth.uid();
  v_sid_db text;
  v_vp     int;
  v_mk     int;
  v_bm     int;
  v_tm     int;
  v_pq     int;
  v_si     int;
begin
  -- 1. Caller must have jury role (admin tolerated for back-office corrections).
  if not (public.has_platform_role('jury') or public.has_platform_role('admin')) then
    raise exception 'forbidden:not_jury' using errcode = '42501';
  end if;

  -- 2. The startup must exist AND be in the declared session.
  select session_id into v_sid_db from public.startups where id = p_startup_id;
  if not found then
    raise exception 'startup_not_found' using errcode = '22023';
  end if;
  if v_sid_db is null or v_sid_db <> p_session_id then
    raise exception 'startup_not_in_session' using errcode = '22023';
  end if;

  -- 3. Juror must be assigned to that session AND session.status = 'live'.
  --    (Admin tolerated even hors-live pour corrections — la politique métier laisse passer.)
  if not (public.rsa_can_score(p_session_id) or public.has_platform_role('admin')) then
    raise exception 'cannot_score:not_assigned_or_not_live' using errcode = '42501';
  end if;

  -- 4. Required 6 scores present + in [0..5]. On déballe pour validation explicite.
  v_vp := nullif(p_scores->>'score_value_prop',      '')::int;
  v_mk := nullif(p_scores->>'score_market',          '')::int;
  v_bm := nullif(p_scores->>'score_business_model',  '')::int;
  v_tm := nullif(p_scores->>'score_team',            '')::int;
  v_pq := nullif(p_scores->>'score_pitch_quality',   '')::int;
  v_si := nullif(p_scores->>'score_societal_impact', '')::int;

  if v_vp is null or v_mk is null or v_bm is null
     or v_tm is null or v_pq is null or v_si is null then
    raise exception 'missing_scores' using errcode = '22023';
  end if;

  if v_vp not between 0 and 5
     or v_mk not between 0 and 5
     or v_bm not between 0 and 5
     or v_tm not between 0 and 5
     or v_pq not between 0 and 5
     or v_si not between 0 and 5 then
    raise exception 'score_out_of_range' using errcode = '22023';
  end if;

  -- 5. UPSERT final row (PK = startup_id + jury_user_id).
  insert into public.platform_jury_scores (
      startup_id, jury_user_id, session_id,
      score_value_prop, score_market, score_business_model,
      score_team, score_pitch_quality, score_societal_impact,
      comment, submitted_at, updated_at
  ) values (
      p_startup_id, v_jury, p_session_id,
      v_vp, v_mk, v_bm, v_tm, v_pq, v_si,
      nullif(btrim(coalesce(p_comment, '')), ''),
      now(), now()
  )
  on conflict (startup_id, jury_user_id) do update
    set score_value_prop      = excluded.score_value_prop,
        score_market          = excluded.score_market,
        score_business_model  = excluded.score_business_model,
        score_team            = excluded.score_team,
        score_pitch_quality   = excluded.score_pitch_quality,
        score_societal_impact = excluded.score_societal_impact,
        comment               = excluded.comment,
        session_id            = excluded.session_id,
        updated_at            = now()
  returning * into v_row;

  -- 6. Clear the draft (no orphan after submit).
  delete from public.platform_jury_score_drafts
   where startup_id = p_startup_id and jury_user_id = v_jury;

  return v_row;
end$$;

revoke all on function public.rsa_submit_jury_score(uuid, text, jsonb, text) from public;
grant execute on function public.rsa_submit_jury_score(uuid, text, jsonb, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. RPC rsa_lock_session(p_session_id text)  — ADMIN
-- ─────────────────────────────────────────────────────────────────────────────
-- Verrouille le lifecycle (session_config.status = 'locked') et projette
-- startups.status = 'note' sur tout dossier de la session encore en affecte / en_session.
--
-- session_config est legacy : on UPDATE par session_id, on ne crée pas la ligne si
-- absente (admin doit setup la session via l'UI legacy en amont — Module 4 réécrira).

create or replace function public.rsa_lock_session(p_session_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  if not public.has_platform_role('admin') then
    raise exception 'rsa_lock_session: admin only' using errcode = '42501';
  end if;

  -- 1. La session doit exister (sessions table, FK), et son lifecycle être 'live'.
  if not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'session_not_found: %', p_session_id using errcode = '22023';
  end if;

  -- 2. Verrouille le lifecycle (session_config legacy). On exige status='live' pour
  --    éviter un lock d'une session jamais ouverte (et on log si la ligne manque).
  update public.session_config
     set status = 'locked', updated_at = now()
   where session_id = p_session_id
     and status = 'live';
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'session_not_live_or_missing: %', p_session_id using errcode = '22023';
  end if;

  -- 3. Projette startups.status='note' pour les dossiers de cette session, en bypass
  --    du trigger startups_guard_update via le sentinel local-à-la-tx.
  perform set_config('rsa.allow_protected_update', 't', true);

  update public.startups
     set status = 'note', updated_at = now()
   where session_id = p_session_id
     and status in ('affecte','en_session');

  perform set_config('rsa.allow_protected_update', '', true);
end$$;

revoke all on function public.rsa_lock_session(text) from public;
grant execute on function public.rsa_lock_session(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. RPC rsa_publish_session(p_session_id text)  — ADMIN
-- ─────────────────────────────────────────────────────────────────────────────
-- Publie les résultats : exige session_config.status='locked', calcule le ranking
-- (moyenne pondérée par startup, tie-break par name ASC), snapshot dans
-- session_config.final_ranking, flip status='published', projette startups.status='finaliste'
-- sur les TOP-N (N = editions.finalists_per_session de l'édition active du dossier).

create or replace function public.rsa_publish_session(p_session_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_n        int;
  v_ranking  jsonb;
  v_count    int;
begin
  if not public.has_platform_role('admin') then
    raise exception 'rsa_publish_session: admin only' using errcode = '42501';
  end if;

  -- 1. La session doit exister et son lifecycle être 'locked'.
  if not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'session_not_found: %', p_session_id using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.session_config
     where session_id = p_session_id and status = 'locked'
  ) then
    raise exception 'session_not_locked: %', p_session_id using errcode = '22023';
  end if;

  -- 2. N = editions.finalists_per_session (depuis l'édition d'un dossier de la session).
  --    On lit via un startup quelconque de la session (tous partagent la même édition).
  --    Fallback : si aucune startup, on prend l'édition de la session (sessions.edition_id).
  select coalesce(e.finalists_per_session, 1) into v_n
    from public.startups s
    join public.editions e on e.id = s.edition_id
   where s.session_id = p_session_id
   limit 1;

  if v_n is null then
    select coalesce(e.finalists_per_session, 1) into v_n
      from public.sessions ss
      join public.editions e on e.id = ss.edition_id
     where ss.id = p_session_id
     limit 1;
  end if;
  v_n := coalesce(v_n, 1);

  -- 3. Ranking : moyenne pondérée par startup, tri DESC puis name ASC (tie-break).
  --    Snapshot complet (toutes les startups notées, pas seulement le top-N) pour
  --    l'audit + l'affichage juré-side du palmarès complet.
  with per_score as (
    select s.id as startup_id, s.name as startup_name,
           public.rsa_weighted_score(js) as w
      from public.platform_jury_scores js
      join public.startups s on s.id = js.startup_id
     where js.session_id = p_session_id
  ),
  agg as (
    select startup_id, startup_name,
           round(avg(w)::numeric, 2) as avg_w,
           count(*)::int as n_jurors
      from per_score
     group by startup_id, startup_name
  ),
  ranked as (
    select startup_id, startup_name, avg_w, n_jurors,
           row_number() over (order by avg_w desc, startup_name asc)::int as final_rank
      from agg
  )
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'startup_id', startup_id,
             'startup',    startup_name,
             'avg',        avg_w,
             'n',          n_jurors,
             'final_rank', final_rank
           )
           order by final_rank
         ), '[]'::jsonb)
    into v_ranking
    from ranked;

  -- 4. Snapshot dans session_config + flip status.
  update public.session_config
     set status = 'published',
         final_ranking = v_ranking,
         updated_at = now()
   where session_id = p_session_id;

  -- 5. Projection finaliste sur les TOP-N (bypass-sentinel pour le trigger).
  perform set_config('rsa.allow_protected_update', 't', true);

  update public.startups st
     set status = 'finaliste', updated_at = now()
   where st.session_id = p_session_id
     and st.id in (
       select (e->>'startup_id')::uuid
         from jsonb_array_elements(v_ranking) e
        where (e->>'final_rank')::int <= v_n
     );

  perform set_config('rsa.allow_protected_update', '', true);
end$$;

revoke all on function public.rsa_publish_session(text) from public;
grant execute on function public.rsa_publish_session(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTES / OPEN ITEMS (pour l'orchestrateur)
-- ─────────────────────────────────────────────────────────────────────────────
-- (a) session_config est legacy 2026 ; aucune CREATE TABLE ici. Si l'orchestrateur veut
--     basculer plus tard vers un public.platform_session_state dédié, les 2 RPC qui le
--     touchent (rsa_lock_session, rsa_publish_session) sont les seuls points à mettre à
--     jour ; l'app cliente passe par les RPC et ignore la table sous-jacente.
-- (b) Le palmarès snapshoté (session_config.final_ranking) inclut TOUTES les startups
--     évaluées de la session (pas que le top-N) — l'audit reste exhaustif et le UI
--     publié peut afficher le classement complet.
-- (c) Si AUCUNE platform_jury_scores n'existe pour la session au moment du Publish,
--     v_ranking = '[]'::jsonb : status passe à 'published', final_ranking = []. Aucun
--     finaliste projeté. L'admin recule alors via un override Module 2 si besoin
--     (les status finaliste/note projetés par Module 3 restent overridables par admin).
-- (d) Pas d'auto-lock 30min après session-end (pre-decided default #11). L'admin doit
--     cliquer Lock manuellement. Une réminder Module 4 (banner) peut être ajouté plus tard.
-- (e) DELETE platform_jury_scores reste admin-only (politique pjs_admin_delete). Pour
--     "réouvrir" un dossier après publish, l'admin doit DELETE + repasser session en
--     'live' via le UI legacy session_config (hors scope Module 3).
