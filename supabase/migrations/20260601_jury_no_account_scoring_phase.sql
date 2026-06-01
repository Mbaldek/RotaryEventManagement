-- Phase scoring sans compte (name-pick) — slug+PIN, poids configurables, RPC anon.
-- Modèle : jurés = jury_applications approved ; scores = jury_scores name-keyed
-- (jury_name = full_name, startup_name = startups.name). Accès public 100% via
-- RPC SECURITY DEFINER gardées slug+PIN (lecture ET écriture). Aucun accès anon
-- direct aux tables ajouté ici.
-- Appliqué via MCP : version 20260601170104.

-- ── Brique 0 : poids configurables par session ──────────────────────────────
alter table public.session_config
  add column if not exists score_weights jsonb;

comment on column public.session_config.score_weights is
  'Poids des 6 critères en pourcentages entiers {criterionId: pct}, somme=100. NULL = défaut 20/20/20/20/10/10.';

-- ── Brique 1 : accès public (slug + PIN) ────────────────────────────────────
alter table public.sessions
  add column if not exists score_slug text,
  add column if not exists score_pin  text;

create unique index if not exists sessions_score_slug_idx
  on public.sessions (score_slug) where score_slug is not null;

-- Génère/régénère le couple (slug, pin) d'accès scoring d'une session. Admin only.
create or replace function public.rsa_rotate_session_access(p_session_id text)
returns table (score_slug text, score_pin text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_club_id text;
  v_exists  boolean;
  v_slug    text;
  v_pin     text;
begin
  select s.club_id, true into v_club_id, v_exists from public.sessions s where s.id = p_session_id;
  if not v_exists then
    raise exception 'session introuvable: %', p_session_id using errcode = '23503';
  end if;
  if not (public.is_master_admin()
          or (v_club_id is not null and public.is_club_member(v_club_id, 'club_admin'))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- slug 12 chars hex (non-devinable), pin 4 chiffres
  loop
    v_slug := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    exit when not exists (select 1 from public.sessions where sessions.score_slug = v_slug);
  end loop;
  v_pin := lpad((floor(random() * 10000))::int::text, 4, '0');

  update public.sessions
     set score_slug = v_slug, score_pin = v_pin
   where id = p_session_id;

  return query select v_slug, v_pin;
end;
$$;

-- Définit les poids des critères d'une session (pourcentages entiers, somme=100). Admin only.
create or replace function public.rsa_set_session_weights(p_session_id text, p_weights jsonb)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_club_id text;
  v_exists  boolean;
  v_sum     int := 0;
  v_keys    text[] := array['score_value_prop','score_market','score_business_model',
                            'score_team','score_pitch_quality','score_societal_impact'];
  v_k       text;
  v_v       int;
begin
  select s.club_id, true into v_club_id, v_exists from public.sessions s where s.id = p_session_id;
  if not v_exists then
    raise exception 'session introuvable: %', p_session_id using errcode = '23503';
  end if;
  if not (public.is_master_admin()
          or (v_club_id is not null and public.is_club_member(v_club_id, 'club_admin'))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  foreach v_k in array v_keys loop
    if not (p_weights ? v_k) then
      raise exception 'poids manquant: %', v_k using errcode = '22023';
    end if;
    v_v := (p_weights ->> v_k)::int;
    if v_v < 0 or v_v > 100 then
      raise exception 'poids hors borne pour %: %', v_k, v_v using errcode = '22023';
    end if;
    v_sum := v_sum + v_v;
  end loop;
  if v_sum <> 100 then
    raise exception 'la somme des poids doit faire 100 (reçu %)', v_sum using errcode = '22023';
  end if;

  update public.session_config set score_weights = p_weights where session_id = p_session_id;
  if not found then
    insert into public.session_config (session_id, score_weights, is_final)
    values (p_session_id, p_weights, false);
  end if;
end;
$$;

-- ── RPC anon : contexte de scoring (lecture, garde slug+PIN) ─────────────────
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
begin
  if p_slug is null or length(p_slug) < 6 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  select * into v_session from public.sessions where score_slug = p_slug;
  if not found or v_session.score_pin is null or p_pin is distinct from v_session.score_pin then
    -- message constant : ne révèle pas si slug ou pin est en cause
    raise exception 'access_denied' using errcode = '42501';
  end if;

  select * into v_cfg from public.session_config where session_id = v_session.id;
  v_status := coalesce(v_cfg.status, 'draft');

  return jsonb_build_object(
    'session', jsonb_build_object(
      'id', v_session.id,
      'name', v_session.name,
      'theme', v_session.theme,
      'kind', v_session.kind,
      'session_date', v_session.session_date
    ),
    'status', v_status,
    'weights', v_cfg.score_weights,
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
               jsonb_build_object('id', st.id, 'name', st.name)
               order by st.pitch_order asc nulls last, lower(st.name))
      from public.startups st
      where st.session_id = v_session.id
    ), '[]'::jsonb)
  );
end;
$$;

-- ── Helper interne : valide slug+PIN, exige status='live', renvoie le session_id ─
create or replace function public.rsa_public_score_guard(p_slug text, p_pin text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_session public.sessions;
  v_status  text;
begin
  select * into v_session from public.sessions where score_slug = p_slug;
  if not found or v_session.score_pin is null or p_pin is distinct from v_session.score_pin then
    raise exception 'access_denied' using errcode = '42501';
  end if;
  select coalesce(status, 'draft') into v_status from public.session_config where session_id = v_session.id;
  if coalesce(v_status, 'draft') <> 'live' then
    raise exception 'not_live' using errcode = '22023';
  end if;
  return v_session.id;
end;
$$;

-- ── RPC anon : autosave d'un brouillon (garde slug+PIN + status live) ────────
create or replace function public.rsa_public_save_draft(
  p_slug text, p_pin text,
  p_jury_name text, p_startup_name text,
  p_scores jsonb, p_comment text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id text;
begin
  v_session_id := public.rsa_public_score_guard(p_slug, p_pin);
  if p_jury_name is null or length(trim(p_jury_name)) = 0 or p_startup_name is null then
    raise exception 'invalid' using errcode = '22023';
  end if;

  insert into public.jury_score_drafts (
    session_id, jury_name, startup_name,
    score_value_prop, score_market, score_business_model,
    score_team, score_pitch_quality, score_societal_impact,
    comment, updated_at
  ) values (
    v_session_id, trim(p_jury_name), p_startup_name,
    nullif(p_scores ->> 'score_value_prop', '')::int,
    nullif(p_scores ->> 'score_market', '')::int,
    nullif(p_scores ->> 'score_business_model', '')::int,
    nullif(p_scores ->> 'score_team', '')::int,
    nullif(p_scores ->> 'score_pitch_quality', '')::int,
    nullif(p_scores ->> 'score_societal_impact', '')::int,
    p_comment, now()
  )
  on conflict (session_id, jury_name, startup_name) do update set
    score_value_prop     = excluded.score_value_prop,
    score_market         = excluded.score_market,
    score_business_model = excluded.score_business_model,
    score_team           = excluded.score_team,
    score_pitch_quality  = excluded.score_pitch_quality,
    score_societal_impact= excluded.score_societal_impact,
    comment              = excluded.comment,
    updated_at           = now();
end;
$$;

-- ── RPC anon : soumission finale (6 critères requis, garde slug+PIN + live) ──
create or replace function public.rsa_public_submit_score(
  p_slug text, p_pin text,
  p_jury_name text, p_startup_name text,
  p_scores jsonb, p_comment text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id text;
  v_keys text[] := array['score_value_prop','score_market','score_business_model',
                         'score_team','score_pitch_quality','score_societal_impact'];
  v_k text;
  v_v int;
begin
  v_session_id := public.rsa_public_score_guard(p_slug, p_pin);
  if p_jury_name is null or length(trim(p_jury_name)) = 0 or p_startup_name is null then
    raise exception 'invalid' using errcode = '22023';
  end if;

  -- Les 6 critères sont requis et bornés 0..5.
  foreach v_k in array v_keys loop
    if not (p_scores ? v_k) or (p_scores ->> v_k) is null or (p_scores ->> v_k) = '' then
      raise exception 'critère manquant: %', v_k using errcode = '22023';
    end if;
    v_v := (p_scores ->> v_k)::int;
    if v_v < 0 or v_v > 5 then
      raise exception 'note hors borne pour %: %', v_k, v_v using errcode = '22023';
    end if;
  end loop;

  insert into public.jury_scores (
    session_id, jury_name, startup_name,
    score_value_prop, score_market, score_business_model,
    score_team, score_pitch_quality, score_societal_impact,
    comment, submitted_at
  ) values (
    v_session_id, trim(p_jury_name), p_startup_name,
    (p_scores ->> 'score_value_prop')::int,
    (p_scores ->> 'score_market')::int,
    (p_scores ->> 'score_business_model')::int,
    (p_scores ->> 'score_team')::int,
    (p_scores ->> 'score_pitch_quality')::int,
    (p_scores ->> 'score_societal_impact')::int,
    p_comment, now()
  )
  on conflict (session_id, jury_name, startup_name) do update set
    score_value_prop     = excluded.score_value_prop,
    score_market         = excluded.score_market,
    score_business_model = excluded.score_business_model,
    score_team           = excluded.score_team,
    score_pitch_quality  = excluded.score_pitch_quality,
    score_societal_impact= excluded.score_societal_impact,
    comment              = excluded.comment,
    submitted_at         = now();

  -- Le brouillon est désormais soumis : on le purge.
  delete from public.jury_score_drafts
   where session_id = v_session_id and jury_name = trim(p_jury_name) and startup_name = p_startup_name;
end;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────
-- Admin RPC : authenticated only.
revoke all on function public.rsa_rotate_session_access(text) from public, anon;
revoke all on function public.rsa_set_session_weights(text, jsonb) from public, anon;
grant execute on function public.rsa_rotate_session_access(text) to authenticated;
grant execute on function public.rsa_set_session_weights(text, jsonb) to authenticated;

-- RPC anon de scoring : anon UNIQUEMENT sur ces 3 (scopées slug+PIN). Le guard
-- interne n'est pas exposé à anon.
revoke all on function public.rsa_public_score_guard(text, text) from public, anon;
revoke all on function public.rsa_public_score_context(text, text) from public;
revoke all on function public.rsa_public_save_draft(text, text, text, text, jsonb, text) from public;
revoke all on function public.rsa_public_submit_score(text, text, text, text, jsonb, text) from public;
grant execute on function public.rsa_public_score_context(text, text) to anon, authenticated;
grant execute on function public.rsa_public_save_draft(text, text, text, text, jsonb, text) to anon, authenticated;
grant execute on function public.rsa_public_submit_score(text, text, text, text, jsonb, text) to anon, authenticated;
