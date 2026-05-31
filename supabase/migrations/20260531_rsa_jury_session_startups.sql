-- ============================================================================
-- Session Admin Console — RPC lecture jury : startups d'une session (+ deck retenu)
-- Blueprint : docs/blueprints/session-admin-console.md §12.3 (page jury-facing)
-- ============================================================================
-- Renvoie le roster d'une session (deck retenu = session_deck_path sinon
-- pitch_deck_path) si l'appelant est :
--   * admin / master_admin, OU
--   * club_admin du club de la session, OU
--   * juré assigné à la session (platform_jury_assignments).
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.rsa_jury_session_startups(p_session_id text)
RETURNS TABLE(
  id uuid, name text, sectors text[], value_proposition text, team text,
  traction text, esg_impact text, deck_path text, deck_confirmed boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare v_club_id text;
begin
  if not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'session_not_found: %', p_session_id using errcode = '22023';
  end if;
  select club_id into v_club_id from public.sessions where id = p_session_id;

  if not (
    public.has_platform_role('admin')
    or public.is_master_admin()
    or (v_club_id is not null and public.is_club_member(v_club_id, 'club_admin'))
    or exists (
      select 1 from public.platform_jury_assignments a
      where a.session_id = p_session_id and a.jury_user_id = auth.uid()
    )
  ) then
    raise exception 'forbidden:not_jury (session=%)', p_session_id using errcode = '42501';
  end if;

  return query
    select s.id, s.name, s.sectors, s.value_proposition, s.team,
           s.traction, s.esg_impact,
           coalesce(s.session_deck_path, s.pitch_deck_path) as deck_path,
           (s.deck_confirmed_at is not null) as deck_confirmed
    from public.startups s
    where s.session_id = p_session_id
    order by s.name asc;
end; $function$;

REVOKE ALL ON FUNCTION public.rsa_jury_session_startups(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rsa_jury_session_startups(text) TO authenticated;

COMMIT;
