-- ============================================================================
-- Session Admin Console — suivi deck (startups) + suivi jury (assignments)
-- Blueprint : docs/blueprints/session-admin-console.md §12
-- ============================================================================
-- 1. startups : deck spécifique session + statuts de confirmation + token form public
-- 2. platform_jury_assignments : invited_at / confirmed_at
-- 3. RPC admin : rsa_mark_deck_instructions_sent / rsa_mark_jury_invited /
--    rsa_set_jury_confirmed  (garde canonique club)
-- 4. RPC service_role : rsa_confirm_session_deck (appelé par l'edge function
--    confirm-deck ; PAS exposé anon/authenticated)
-- ============================================================================

BEGIN;

-- 1. startups : suivi deck ----------------------------------------------------
ALTER TABLE public.startups
  ADD COLUMN IF NOT EXISTS session_deck_path        text,
  ADD COLUMN IF NOT EXISTS deck_confirmed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS deck_instructions_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS deck_confirm_token       uuid DEFAULT gen_random_uuid();

UPDATE public.startups SET deck_confirm_token = gen_random_uuid() WHERE deck_confirm_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS startups_deck_confirm_token_idx
  ON public.startups(deck_confirm_token);

COMMENT ON COLUMN public.startups.session_deck_path IS
  'Deck spécifique session (NULL = réutilise pitch_deck_path d''inscription).';
COMMENT ON COLUMN public.startups.deck_confirmed_at IS
  'Quand la startup a confirmé son deck (inscription gardé OU spécifique chargé).';
COMMENT ON COLUMN public.startups.deck_confirm_token IS
  'Token du form public de confirmation deck (/confirm-deck?token=...).';

-- 2. platform_jury_assignments : suivi invitation/confirmation ----------------
ALTER TABLE public.platform_jury_assignments
  ADD COLUMN IF NOT EXISTS invited_at   timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- 3. RPC admin (garde canonique club de la session) ---------------------------
CREATE OR REPLACE FUNCTION public.rsa_mark_deck_instructions_sent(p_session_id text, p_startup_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare v_club_id text;
begin
  select club_id into v_club_id from public.sessions where id = p_session_id;
  if not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'session_not_found: %', p_session_id using errcode = '22023';
  end if;
  if not (public.has_platform_role('admin') or public.is_master_admin()
          or (v_club_id is not null and public.is_club_member(v_club_id, 'club_admin'))) then
    raise exception 'forbidden:not_admin (club_id=%)', v_club_id using errcode = '42501';
  end if;
  update public.startups set deck_instructions_sent_at = now()
   where session_id = p_session_id and id = any(p_startup_ids);
end; $function$;
REVOKE ALL ON FUNCTION public.rsa_mark_deck_instructions_sent(text, uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rsa_mark_deck_instructions_sent(text, uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.rsa_mark_jury_invited(p_session_id text, p_jury_user_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare v_club_id text;
begin
  select club_id into v_club_id from public.sessions where id = p_session_id;
  if not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'session_not_found: %', p_session_id using errcode = '22023';
  end if;
  if not (public.has_platform_role('admin') or public.is_master_admin()
          or (v_club_id is not null and public.is_club_member(v_club_id, 'club_admin'))) then
    raise exception 'forbidden:not_admin (club_id=%)', v_club_id using errcode = '42501';
  end if;
  update public.platform_jury_assignments set invited_at = now()
   where session_id = p_session_id and jury_user_id = any(p_jury_user_ids);
end; $function$;
REVOKE ALL ON FUNCTION public.rsa_mark_jury_invited(text, uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rsa_mark_jury_invited(text, uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.rsa_set_jury_confirmed(p_session_id text, p_jury_user_id uuid, p_confirmed boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare v_club_id text;
begin
  select club_id into v_club_id from public.sessions where id = p_session_id;
  if not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'session_not_found: %', p_session_id using errcode = '22023';
  end if;
  if not (public.has_platform_role('admin') or public.is_master_admin()
          or (v_club_id is not null and public.is_club_member(v_club_id, 'club_admin'))) then
    raise exception 'forbidden:not_admin (club_id=%)', v_club_id using errcode = '42501';
  end if;
  update public.platform_jury_assignments
     set confirmed_at = case when p_confirmed then now() else null end
   where session_id = p_session_id and jury_user_id = p_jury_user_id;
end; $function$;
REVOKE ALL ON FUNCTION public.rsa_set_jury_confirmed(text, uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rsa_set_jury_confirmed(text, uuid, boolean) TO authenticated;

-- 4. RPC service_role : confirmation publique via token (edge function confirm-deck)
CREATE OR REPLACE FUNCTION public.rsa_confirm_session_deck(p_token uuid, p_keep boolean, p_deck_path text)
RETURNS TABLE(startup_id uuid, session_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare v_id uuid; v_sid text;
begin
  select id, session_id into v_id, v_sid from public.startups where deck_confirm_token = p_token;
  if v_id is null then
    raise exception 'invalid_token' using errcode = '22023';
  end if;
  update public.startups
     set deck_confirmed_at = now(),
         session_deck_path = case when p_keep then null
                                  else coalesce(nullif(btrim(coalesce(p_deck_path,'')), ''), session_deck_path) end
   where id = v_id;
  return query select v_id, v_sid;
end; $function$;
REVOKE ALL ON FUNCTION public.rsa_confirm_session_deck(uuid, boolean, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rsa_confirm_session_deck(uuid, boolean, text) TO service_role;

COMMIT;
