-- Étend rsa_public_score_context : renvoie pitch_deck_path + exec_summary_path par
-- startup (pré-read sur la page juré publique /Score). Les chemins ne sont PAS des
-- URLs (bucket `dossiers` privé) : la signature passe par l'edge score-docs gardée
-- slug+PIN (service role). Appliqué via MCP : version 20260601_public_score_context_doc_paths.
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
