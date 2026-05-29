-- ============================================================================
-- V3 — KILL Extensions architecture (table + RPCs + marketplace install)
-- ============================================================================
-- Pivot architecture 2026-06-04 : on remplace l'usine à gaz "extensions" par
-- l'approche "custom fields per edition" (cf. migration jumelle
-- 20260604_rsa_v3_custom_fields_per_edition.sql).
--
-- Cette migration SUPPRIME :
--   - les 6 RPC du module extensions (create/update/delete/list/activate +
--     install marketplace)
--   - la table public.extensions (CASCADE pour drop policies, indexes, FKs,
--     triggers — la table est encore à 0 row en prod, pas de data loss)
--
-- Les policies extensions_read / extensions_write et le trigger
-- trg_extensions_updated_at tombent en CASCADE avec la table. Les fonctions
-- helpers (extensions_set_updated_at) sont droppées explicitement pour rester
-- propre côté pg_proc.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. DROP RPC extensions + marketplace install
-- ----------------------------------------------------------------------------
-- Signatures explicites pour matcher exactement les fonctions créées par
-- 20260601_rsa_v3_extensions.sql et 20260601_rsa_v3_marketplace_install.sql.
-- IF EXISTS pour rester idempotent si la migration tourne 2x.
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.rsa_create_extension(text, text, text, text, jsonb, text, text, integer);
DROP FUNCTION IF EXISTS public.rsa_update_extension(uuid, text, text, jsonb, integer, boolean);
DROP FUNCTION IF EXISTS public.rsa_delete_extension(uuid);
DROP FUNCTION IF EXISTS public.rsa_list_extensions(text, text, text, text);
DROP FUNCTION IF EXISTS public.rsa_activate_extension(uuid, boolean);
DROP FUNCTION IF EXISTS public.rsa_install_extension_to_club(uuid, text);

-- ----------------------------------------------------------------------------
-- 2. DROP table extensions CASCADE
-- ----------------------------------------------------------------------------
-- CASCADE supprime : policies (extensions_read, extensions_write), trigger
-- trg_extensions_updated_at, indexes (extensions_scope_kind_idx,
-- extensions_club_idx, extensions_edition_idx) et toutes FK référentes
-- (aucune en prod à ce jour).
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS public.extensions CASCADE;

-- ----------------------------------------------------------------------------
-- 3. DROP fonction helper devenue orpheline
-- ----------------------------------------------------------------------------
-- Le trigger trg_extensions_updated_at est tombé avec la table, mais la
-- fonction extensions_set_updated_at() restait dans pg_proc. On la drop pour
-- ne pas garder de code mort.
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.extensions_set_updated_at();

COMMIT;
