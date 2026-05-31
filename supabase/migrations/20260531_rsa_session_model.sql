-- ============================================================================
-- Compétition multi-club : modèle de sessions (conjoint vs par club)
-- Blueprint : docs/blueprints/session-admin-console.md §3 (identité compétition)
-- ============================================================================
-- session_model :
--   'per_club' (défaut, existant) — chaque club gère ses sessions qualificatives.
--   'joint'                       — un flux unique de sessions au niveau compétition
--                                   (sessions club_id NULL), co-organisé par les clubs.
--                                   Jury / startups / emails se gèrent alors aussi au
--                                   niveau compétition (sessions sans club).
-- ============================================================================

BEGIN;

ALTER TABLE public.editions
  ADD COLUMN IF NOT EXISTS session_model text NOT NULL DEFAULT 'per_club';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'editions_session_model_chk') THEN
    ALTER TABLE public.editions
      ADD CONSTRAINT editions_session_model_chk CHECK (session_model IN ('joint', 'per_club'));
  END IF;
END$$;

COMMENT ON COLUMN public.editions.session_model IS
  'Modèle de sessions qualificatives : per_club (chaque club les siennes) | joint (flux unique niveau compétition, sessions club_id NULL).';

CREATE OR REPLACE FUNCTION public.rsa_set_session_model(p_edition_id text, p_model text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
begin
  if not (public.has_platform_role('admin') or public.is_master_admin()) then
    raise exception 'forbidden:not_admin' using errcode = '42501';
  end if;
  if p_model not in ('joint', 'per_club') then
    raise exception 'invalid_model: %', p_model using errcode = '22023';
  end if;
  if not exists (select 1 from public.editions where id = p_edition_id) then
    raise exception 'edition_not_found: %', p_edition_id using errcode = '22023';
  end if;
  update public.editions set session_model = p_model where id = p_edition_id;
end; $function$;
REVOKE ALL ON FUNCTION public.rsa_set_session_model(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rsa_set_session_model(text, text) TO authenticated;

COMMIT;
