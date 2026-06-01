-- Session running order (pitch_order) + préférence de langue par destinataire.
-- Cf. docs/blueprints/session-presentation-generator.md §2.

-- 1) Ordre de passage dans la session (scopé par startups.session_id).
alter table public.startups
  add column if not exists pitch_order int;

create index if not exists startups_session_pitch_order_idx
  on public.startups (session_id, pitch_order)
  where pitch_order is not null;

-- 2) Préférence de langue (utilisée par tous les emails transactionnels).
alter table public.startups
  add column if not exists preferred_lang text not null default 'fr'
  check (preferred_lang in ('fr','en','de'));

alter table public.jury_applications
  add column if not exists preferred_lang text not null default 'fr'
  check (preferred_lang in ('fr','en','de'));

-- 3) RPC d'écriture de l'ordre (transactionnelle, accès contrôlé serveur).
--    Réassigne pitch_order = index+1 pour la liste fournie. Valide l'appartenance
--    de chaque startup à la session, et le rôle de l'appelant.
--    startups.id est uuid ; sessions.id / sessions.club_id sont text.
create or replace function public.rsa_set_session_running_order(
  p_session_id text,
  p_ordered_ids uuid[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id text;
  v_count int;
  v_id uuid;
  v_pos int := 1;
begin
  -- Club de la session (pour la garde de rôle).
  select club_id into v_club_id from public.sessions where id = p_session_id;
  if not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'session introuvable: %', p_session_id using errcode = '22023';
  end if;

  -- Garde de rôle (calquée sur rsa_create_session) : admin global OU master_admin
  -- OU club_admin du club de la session.
  if not (
    public.has_platform_role('admin')
    or public.is_master_admin()
    or (v_club_id is not null and public.is_club_member(v_club_id, 'club_admin'))
  ) then
    raise exception 'rsa_set_session_running_order: forbidden (session=%)', p_session_id using errcode = '42501';
  end if;

  -- Toutes les startups fournies doivent appartenir à la session.
  select count(*) into v_count
  from public.startups
  where id = any(p_ordered_ids) and session_id = p_session_id;
  if v_count <> coalesce(array_length(p_ordered_ids, 1), 0) then
    raise exception 'des startups n''appartiennent pas à la session %', p_session_id using errcode = '22023';
  end if;

  -- Réassignation ordonnée.
  foreach v_id in array p_ordered_ids loop
    update public.startups set pitch_order = v_pos where id = v_id;
    v_pos := v_pos + 1;
  end loop;
end;
$$;

revoke all on function public.rsa_set_session_running_order(text, uuid[]) from public, anon;
grant execute on function public.rsa_set_session_running_order(text, uuid[]) to authenticated;
