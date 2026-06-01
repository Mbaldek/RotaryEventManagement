-- rsa_unlock_session — rouvre une session verrouillée (locked → live).
--
-- Symétrique de rsa_lock_session (20260529_rsa_v2_extend_rpcs.sql §lock) : ferme
-- le trou opérationnel « une fois verrouillée, impossible de relancer le live ».
-- Reverte aussi startups.status note → en_session pour rendre le verrou TOTALEMENT
-- réversible. Les scores (platform_jury_scores) sont conservés ; les jurés peuvent
-- à nouveau éditer dès que la session repasse 'live'.
--
-- Refuse si la session n'est pas 'locked' (ne touche jamais une session 'published').
-- Accès : admin OR master_admin OR club_admin du club de la session (idem lock).

create or replace function public.rsa_unlock_session(p_session_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_count   int;
  v_club_id text;
begin
  select club_id into v_club_id from public.sessions where id = p_session_id;
  if v_club_id is null and not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'session_not_found: %', p_session_id using errcode = '22023';
  end if;

  -- club_id NULL = finale fédérée → réservée master_admin (et admin legacy)
  if not (
    public.has_platform_role('admin')
    or public.is_master_admin()
    or (v_club_id is not null and public.is_club_member(v_club_id, 'club_admin'))
  ) then
    raise exception 'rsa_unlock_session: admin only (club_id=%)', v_club_id using errcode = '42501';
  end if;

  -- 1. Vanne inverse du lock : locked → live.
  update public.session_config
     set status = 'live', session_active = true, updated_at = now()
   where session_id = p_session_id and status = 'locked';
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'session_not_locked: %', p_session_id using errcode = '22023';
  end if;

  -- 2. Reverte la projection du lock (note → en_session) en bypass du trigger
  --    startups_guard_update via le sentinel local-à-la-tx.
  perform set_config('rsa.allow_protected_update', 't', true);
  update public.startups
     set status = 'en_session', updated_at = now()
   where session_id = p_session_id and status = 'note';
  perform set_config('rsa.allow_protected_update', '', true);
end$$;

revoke all on function public.rsa_unlock_session(text) from public, anon;
grant execute on function public.rsa_unlock_session(text) to authenticated;
