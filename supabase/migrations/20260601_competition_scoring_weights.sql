-- Les poids des critères sont un paramètre de COMPÉTITION (pas session/live).
-- Stockés au niveau édition (editions.scoring_weights) et lus depuis l'édition
-- partout (contexte public + publish). session_config.score_weights devient obsolète
-- (laissé en place, non lu). rsa_set_session_weights supprimé.
-- Appliqué via MCP : version 20260601_competition_scoring_weights.

alter table public.editions
  add column if not exists scoring_weights jsonb not null
  default '{"score_value_prop":20,"score_market":20,"score_business_model":20,"score_team":20,"score_pitch_quality":10,"score_societal_impact":10}'::jsonb;

comment on column public.editions.scoring_weights is
  'Poids des 6 critères de notation (pourcentages entiers {criterionId: pct}, somme=100) pour TOUTE la compétition. Défaut 20/20/20/20/10/10.';

drop function if exists public.rsa_set_session_weights(text, jsonb);

-- Contexte public : poids lus depuis l'édition de la session.
create or replace function public.rsa_public_score_context(p_slug text, p_pin text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_session public.sessions;
  v_cfg     public.session_config;
  v_status  text;
  v_weights jsonb;
begin
  if p_slug is null or length(p_slug) < 6 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  select * into v_session from public.sessions where score_slug = p_slug;
  if not found or v_session.score_pin is null or p_pin is distinct from v_session.score_pin then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  select * into v_cfg from public.session_config where session_id = v_session.id;
  v_status := coalesce(v_cfg.status, 'draft');
  select e.scoring_weights into v_weights from public.editions e where e.id = v_session.edition_id;

  return jsonb_build_object(
    'session', jsonb_build_object(
      'id', v_session.id, 'name', v_session.name, 'theme', v_session.theme,
      'kind', v_session.kind, 'session_date', v_session.session_date
    ),
    'status', v_status,
    'weights', v_weights,
    'jurors', coalesce((
      select jsonb_agg(
               jsonb_build_object('id', ja.id, 'full_name', ja.full_name,
                                  'qualite', ja.qualite, 'organisation', ja.organisation)
               order by lower(ja.full_name))
      from public.jury_applications ja
      where v_session.id = any(ja.availability_session_ids) and ja.status = 'approved'
    ), '[]'::jsonb),
    'startups', coalesce((
      select jsonb_agg(
               jsonb_build_object('id', st.id, 'name', st.name,
                                  'pitch_deck_path', st.pitch_deck_path,
                                  'exec_summary_path', st.exec_summary_path)
               order by st.pitch_order asc nulls last, lower(st.name))
      from public.startups st
      where st.session_id = v_session.id
    ), '[]'::jsonb)
  );
end;
$$;

-- Publish : classement pondéré par les poids de l'ÉDITION.
create or replace function public.rsa_publish_session(p_session_id text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_n            int;
  v_ranking      jsonb;
  v_promoted     jsonb;
  v_club_id      text;
  v_edition_id   text;
  v_kind         text;
  v_actor        uuid;
  v_actor_email  text;
  v_inserted     int;
begin
  select club_id, edition_id, kind into v_club_id, v_edition_id, v_kind
    from public.sessions where id = p_session_id;
  if v_edition_id is null and not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'session_not_found: %', p_session_id using errcode = '22023';
  end if;

  if not (
    public.has_platform_role('admin') or public.is_master_admin()
    or (v_club_id is not null and public.is_club_member(v_club_id, 'club_admin'))
  ) then
    raise exception 'rsa_publish_session: admin only (club_id=%)', v_club_id using errcode = '42501';
  end if;

  if not exists (select 1 from public.session_config where session_id = p_session_id and status = 'locked') then
    raise exception 'session_not_locked: %', p_session_id using errcode = '22023';
  end if;

  select coalesce(e.finalists_per_session, 1) into v_n
    from public.startups s join public.editions e on e.id = s.edition_id
    where s.session_id = p_session_id limit 1;
  if v_n is null then
    select coalesce(e.finalists_per_session, 1) into v_n
      from public.sessions ss join public.editions e on e.id = ss.edition_id
      where ss.id = p_session_id limit 1;
  end if;
  v_n := coalesce(v_n, 1);

  -- Poids = editions.scoring_weights (pct, défaut 20/20/20/20/10/10).
  with wts as (
    select
      coalesce((e.scoring_weights ->> 'score_value_prop')::numeric, 20)     as w_vp,
      coalesce((e.scoring_weights ->> 'score_market')::numeric, 20)         as w_mk,
      coalesce((e.scoring_weights ->> 'score_business_model')::numeric, 20) as w_bm,
      coalesce((e.scoring_weights ->> 'score_team')::numeric, 20)           as w_tm,
      coalesce((e.scoring_weights ->> 'score_pitch_quality')::numeric, 10)  as w_pq,
      coalesce((e.scoring_weights ->> 'score_societal_impact')::numeric, 10) as w_si
      from public.sessions s join public.editions e on e.id = s.edition_id
      where s.id = p_session_id
  ),
  per_score as (
    select st.id as startup_id, st.name as startup_name,
           ( js.score_value_prop * w.w_vp + js.score_market * w.w_mk
           + js.score_business_model * w.w_bm + js.score_team * w.w_tm
           + js.score_pitch_quality * w.w_pq + js.score_societal_impact * w.w_si ) / 100.0 as w
      from public.jury_scores js
      join public.startups st on st.name = js.startup_name and st.session_id = p_session_id
      cross join wts w
     where js.session_id = p_session_id
       and js.score_value_prop is not null and js.score_market is not null
       and js.score_business_model is not null and js.score_team is not null
       and js.score_pitch_quality is not null and js.score_societal_impact is not null
  ),
  agg as (
    select startup_id, startup_name, round(avg(w)::numeric, 2) as avg_w, count(*)::int as n_jurors
      from per_score group by startup_id, startup_name
  ),
  ranked as (
    select startup_id, startup_name, avg_w, n_jurors,
           row_number() over (order by avg_w desc, startup_name asc)::int as final_rank
      from agg
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'startup_id', startup_id, 'startup', startup_name,
    'avg', avg_w, 'n', n_jurors, 'final_rank', final_rank
  ) order by final_rank), '[]'::jsonb) into v_ranking from ranked;

  update public.session_config
     set status = 'published', final_ranking = v_ranking, updated_at = now()
   where session_id = p_session_id;

  perform set_config('rsa.allow_protected_update', 't', true);
  update public.startups st set status = 'finaliste', updated_at = now()
   where st.session_id = p_session_id
     and st.id in (select (e->>'startup_id')::uuid from jsonb_array_elements(v_ranking) e
                    where (e->>'final_rank')::int <= v_n);
  perform set_config('rsa.allow_protected_update', '', true);

  v_actor := auth.uid();
  v_inserted := 0;
  v_promoted := '[]'::jsonb;

  if coalesce(v_kind, 'qualifying') <> 'finale' then
    with top_n as (
      select (e->>'startup_id')::uuid as startup_id, e->>'startup' as startup_name,
             (e->>'final_rank')::int as final_rank
        from jsonb_array_elements(v_ranking) e where (e->>'final_rank')::int <= v_n
    ),
    ins as (
      insert into public.platform_finale_membership (edition_id, startup_id, source_session_id, promoted_at, promoted_by)
      select v_edition_id, startup_id, p_session_id, now(), v_actor from top_n
      on conflict (edition_id, startup_id) do nothing
      returning startup_id
    )
    select coalesce(jsonb_agg(jsonb_build_object('startup_id', t.startup_id, 'startup', t.startup_name,
              'final_rank', t.final_rank) order by t.final_rank), '[]'::jsonb),
           (select count(*)::int from ins)
      into v_promoted, v_inserted from top_n t;
  end if;

  select email into v_actor_email from auth.users where id = v_actor;
  insert into public.admin_audit_log (actor_id, actor_email, action, target_kind, target_id, payload)
  values (v_actor, v_actor_email, 'session_concluded', 'session', p_session_id,
    jsonb_build_object('edition_id', v_edition_id, 'club_id', v_club_id,
      'kind', coalesce(v_kind, 'qualifying'), 'top_n', v_n, 'ranking', v_ranking,
      'promoted', v_promoted, 'promoted_rows', v_inserted, 'source', 'name_keyed_edition_weights'));
end;
$function$;
