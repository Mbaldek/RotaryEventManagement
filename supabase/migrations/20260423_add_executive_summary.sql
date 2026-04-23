-- Track executive summary files (FR & German reference doc for jury pre-read).
-- 0..N files per startup; synced from Airtable field "Executive Summary in French & German".
alter table public.startup_confirmations
  add column if not exists executive_summary_files jsonb not null default '[]'::jsonb;

comment on column public.startup_confirmations.executive_summary_files is
  'Array of {path, filename} items for jury pre-read exec summary files (FR/DE).';
