-- Track when the pre-session jury pack email was sent, per-session, for each juror.
-- Map shape: {s1_foodtech: "2026-04-28T12:34:56Z", s3_tech: null}.
alter table public.jury_profiles
  add column if not exists instructions_sent_at jsonb not null default '{}'::jsonb;

comment on column public.jury_profiles.instructions_sent_at is
  'Map {session_id: iso_timestamp} tracking when the pre-session jury pack email was sent for each session this juror is assigned to.';
