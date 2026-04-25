-- Grande Finale session — treated as a 6th entry in session_config so the
-- existing scoring stack (RsaScore, JuryScore, LiveTab, ResultsTab, SetupTab)
-- works unchanged. is_final flag distinguishes it from the 5 qualifiers.

alter table public.session_config
  add column if not exists is_final boolean not null default false;

-- At most one finale at a time.
create unique index if not exists session_config_only_one_final
  on public.session_config ((true)) where is_final;

-- Track which qualifying session each finalist startup came from
-- (used to render "Vainqueur de FoodTech" badges on finalist cards).
alter table public.startup_confirmations
  add column if not exists source_session_id text
  references public.session_config(session_id);

-- Seed the final session row.
insert into public.session_config (session_id, is_final, status)
values ('final_grande', true, 'draft')
on conflict (session_id) do update set is_final = true;
