-- Lock chat_messages and expose narrow RPCs for token-based DM and table chat.
-- Identity = seats.guest_token (no Supabase Auth). All direct table access is
-- revoked; the SECURITY DEFINER functions below are the only way in.

begin;

-- 1. Schema: add scope, relax to_seat_id, enforce scope-specific shape.
alter table chat_messages
  add column if not exists scope text not null default 'dm'
    check (scope in ('dm','table'));

alter table chat_messages alter column to_seat_id drop not null;

delete from chat_messages where scope = 'dm' and to_seat_id is null;

alter table chat_messages drop constraint if exists chat_scope_shape;
alter table chat_messages add constraint chat_scope_shape check (
  (scope = 'dm'    and to_seat_id is not null) or
  (scope = 'table' and to_seat_id is null and table_id is not null)
);

create index if not exists chat_messages_dm_idx
  on chat_messages (from_seat_id, to_seat_id, created_date desc)
  where scope = 'dm';

create index if not exists chat_messages_table_idx
  on chat_messages (table_id, created_date desc)
  where scope = 'table';

-- 2. Lock the table: RLS on, drop any permissive policy, revoke direct grants.
alter table chat_messages enable row level security;

do $$
declare r record;
begin
  for r in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'chat_messages' loop
    execute format('drop policy %I on public.chat_messages', r.policyname);
  end loop;
end $$;

revoke all on chat_messages from anon, authenticated;

-- 3. RPCs — all SECURITY DEFINER. Identity is proven by guest_token.

create or replace function _seat_for_token(p_token text)
returns seats
language plpgsql
security definer
set search_path = public
as $$
declare s seats;
begin
  if p_token is null or length(p_token) = 0 then
    raise exception 'invalid_token';
  end if;
  select * into s from seats where guest_token = p_token limit 1;
  if s.id is null then
    raise exception 'invalid_token';
  end if;
  return s;
end $$;
-- Helper bypasses RLS on seats; must never be callable from the API.
revoke all on function _seat_for_token(text) from public, anon, authenticated;

create or replace function send_dm(p_token text, p_to_seat_id uuid, p_content text)
returns chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  me      seats;
  peer    seats;
  clean   text;
  row_out chat_messages;
begin
  me := _seat_for_token(p_token);
  clean := btrim(coalesce(p_content, ''));
  if length(clean) = 0 or length(clean) > 2000 then
    raise exception 'invalid_content';
  end if;
  select * into peer from seats where id = p_to_seat_id;
  if peer.id is null then raise exception 'peer_not_found'; end if;

  insert into chat_messages
    (scope, from_seat_id, to_seat_id, from_name, to_name, content, table_id)
  values
    ('dm',
     me.id,
     peer.id,
     coalesce(nullif(btrim(coalesce(me.first_name,'')   || ' ' || coalesce(me.last_name,'')),   ''), 'Convive'),
     coalesce(nullif(btrim(coalesce(peer.first_name,'') || ' ' || coalesce(peer.last_name,'')), ''), 'Convive'),
     clean,
     peer.table_id)
  returning * into row_out;
  return row_out;
end $$;
grant execute on function send_dm(text, uuid, text) to anon, authenticated;

create or replace function list_dm(p_token text, p_peer_seat_id uuid, p_limit int default 200)
returns setof chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare me seats;
begin
  me := _seat_for_token(p_token);
  return query
    select * from chat_messages
    where scope = 'dm'
      and ((from_seat_id = me.id and to_seat_id = p_peer_seat_id)
        or (from_seat_id = p_peer_seat_id and to_seat_id = me.id))
    order by created_date asc
    limit greatest(1, least(coalesce(p_limit, 200), 500));
end $$;
grant execute on function list_dm(text, uuid, int) to anon, authenticated;

create or replace function send_table_msg(p_token text, p_content text)
returns chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  me      seats;
  clean   text;
  row_out chat_messages;
begin
  me := _seat_for_token(p_token);
  if me.table_id is null then raise exception 'no_table'; end if;
  clean := btrim(coalesce(p_content, ''));
  if length(clean) = 0 or length(clean) > 2000 then
    raise exception 'invalid_content';
  end if;

  insert into chat_messages
    (scope, from_seat_id, to_seat_id, from_name, to_name, content, table_id)
  values
    ('table',
     me.id,
     null,
     coalesce(nullif(btrim(coalesce(me.first_name,'') || ' ' || coalesce(me.last_name,'')), ''), 'Convive'),
     null,
     clean,
     me.table_id)
  returning * into row_out;
  return row_out;
end $$;
grant execute on function send_table_msg(text, text) to anon, authenticated;

create or replace function list_table_msgs(p_token text, p_limit int default 200)
returns setof chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare me seats;
begin
  me := _seat_for_token(p_token);
  if me.table_id is null then return; end if;
  return query
    select * from chat_messages
    where scope = 'table' and table_id = me.table_id
    order by created_date asc
    limit greatest(1, least(coalesce(p_limit, 200), 500));
end $$;
grant execute on function list_table_msgs(text, int) to anon, authenticated;

-- Poll-friendly: incoming messages for caller since a timestamp (for toast notifs).
create or replace function chat_recent_for(p_token text, p_since timestamptz)
returns table(
  id uuid,
  scope text,
  from_seat_id uuid,
  from_name text,
  content text,
  created_date timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare me seats;
begin
  me := _seat_for_token(p_token);
  return query
    select m.id, m.scope, m.from_seat_id, m.from_name, m.content, m.created_date
    from chat_messages m
    where m.created_date > p_since
      and m.from_seat_id <> me.id
      and (
        (m.scope = 'dm'    and m.to_seat_id = me.id) or
        (m.scope = 'table' and m.table_id   = me.table_id)
      )
    order by m.created_date asc
    limit 50;
end $$;
grant execute on function chat_recent_for(text, timestamptz) to anon, authenticated;

-- Admin wipe — this signature is superseded by `admin_clear_all_chats(text)`
-- in migration 20260424_chat_admin_secret.sql (secret-gated). Kept here for
-- historical reference; the zero-arg version is dropped by the follow-up.
create or replace function admin_clear_all_chats()
returns void
language sql
security definer
set search_path = public
as $$
  delete from chat_messages;
$$;
grant execute on function admin_clear_all_chats() to anon, authenticated;

commit;
