-- Consolidated jury PDF pack (decks + executive summaries) per session.
-- Populated by the consolidate-jury-pack Edge Function.
alter table public.session_config
  add column if not exists jury_pack_path text,
  add column if not exists jury_pack_generated_at timestamp with time zone;

comment on column public.session_config.jury_pack_path is
  'Supabase Storage path of the consolidated jury PDF pack (decks + pre-reads) for this session.';
comment on column public.session_config.jury_pack_generated_at is
  'Timestamp of the last successful consolidation run.';
