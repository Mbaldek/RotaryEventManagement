-- rsa_public_score_guard est un helper PUREMENT INTERNE (appelé par les RPC anon,
-- qui s'exécutent en SECURITY DEFINER owner). Personne ne doit l'appeler en direct.
-- Appliqué via MCP : version 20260601171310.
revoke all on function public.rsa_public_score_guard(text, text) from public, anon, authenticated;
