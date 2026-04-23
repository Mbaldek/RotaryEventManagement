-- Add per-table custom seat capacity.
-- Falls back to is_presidential ? 12 : 8 when NULL (handled in app via getTableCapacity).
alter table public.restaurant_tables
  add column if not exists seat_count smallint;

comment on column public.restaurant_tables.seat_count is
  'Custom seat capacity. NULL = use default (12 if presidential, else 8).';
