-- La grille live affiche les brouillons partiels (n/6) en temps réel : il faut que
-- jury_score_drafts émette via postgres_changes (cf. project_realtime_publication_gap).
-- Appliqué via MCP : version 20260601170900.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'jury_score_drafts'
  ) then
    execute 'alter publication supabase_realtime add table public.jury_score_drafts';
  end if;
end $$;
