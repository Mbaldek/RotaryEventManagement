-- Gate admin_clear_all_chats behind a shared-secret PIN verified server-side.
-- Secret's bcrypt hash lives in a locked config table (no anon/auth access).
-- Rotation (from Supabase SQL editor or MCP):
--   update app_config
--     set value = crypt('<new-plaintext>', gen_salt('bf', 10)),
--         updated_at = now()
--     where key = 'admin_secret_hash';

create extension if not exists pgcrypto;

create table if not exists app_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
alter table app_config enable row level security;
revoke all on app_config from public, anon, authenticated;

-- Initial secret was generated and hashed at migration apply time; the plaintext
-- was shared with the admins out-of-band and is NOT recorded in the repo. To
-- set or rotate, run the update snippet in the header comment above.

drop function if exists admin_clear_all_chats();

create or replace function admin_clear_all_chats(p_secret text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare stored_hash text;
begin
  if p_secret is null or length(p_secret) = 0 then
    raise exception 'forbidden';
  end if;
  select value into stored_hash from app_config where key = 'admin_secret_hash';
  if stored_hash is null or crypt(p_secret, stored_hash) <> stored_hash then
    raise exception 'forbidden';
  end if;
  delete from chat_messages;
end $$;
grant execute on function admin_clear_all_chats(text) to anon, authenticated;
