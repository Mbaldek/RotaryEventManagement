-- Relecture des scores/brouillons d'un juré donné (reprise multi-device).
-- Lecture seule, gardée slug+PIN (PAS live-gated : un juré peut relire ses notes
-- soumises même après verrouillage). Name-keyed.
-- Appliqué via MCP : version 20260601170307.
create or replace function public.rsa_public_my_scores(p_slug text, p_pin text, p_jury_name text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_session public.sessions;
begin
  select * into v_session from public.sessions where score_slug = p_slug;
  if not found or v_session.score_pin is null or p_pin is distinct from v_session.score_pin then
    raise exception 'access_denied' using errcode = '42501';
  end if;
  if p_jury_name is null or length(trim(p_jury_name)) = 0 then
    raise exception 'invalid' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'scores', coalesce((
      select jsonb_agg(to_jsonb(js)) from public.jury_scores js
      where js.session_id = v_session.id and js.jury_name = trim(p_jury_name)
    ), '[]'::jsonb),
    'drafts', coalesce((
      select jsonb_agg(to_jsonb(jd)) from public.jury_score_drafts jd
      where jd.session_id = v_session.id and jd.jury_name = trim(p_jury_name)
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.rsa_public_my_scores(text, text, text) from public;
grant execute on function public.rsa_public_my_scores(text, text, text) to anon, authenticated;
