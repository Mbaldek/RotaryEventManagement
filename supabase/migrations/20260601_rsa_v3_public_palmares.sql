-- V3.0 — Public palmarès (/Resultats) — view publique + opt-in photo champion
--
-- Objectif (cf. docs/hardening/m4c-public-results-rls.md) :
--   * Une seule surface de lecture publique : VIEW public.public_palmares
--     (SECURITY INVOKER) qui agrège editions + sessions + session_config,
--     gateée par editions.public_results_enabled = true ET
--     session_config.status = 'published'.
--   * AUCUNE PII : pas d'email, pas de contact_person, pas de deck_url, pas
--     d'admin_overrides, pas d'eligibility_rules. Les noms des lauréats
--     viennent du snapshot session_config.final_ranking (matérialisé par
--     rsa_publish_session). Seul ajout 2026-V3 : la photo du champion, si
--     et seulement si la startup a coché champion_photo_optin = true.
--
-- Décision C.2 : photo champion sur palmarès public OPT-IN.
--   * champion_photo_optin (boolean, default false) — coché par le champion
--     dans /MonDossier > « Diffusion palmarès ».
--   * champion_photo_path (text, nullable) — chemin storage dans bucket
--     PUBLIC dédié 'champions'. Bucket public (8 Mo max, jpeg/png/webp).
--
-- Stockage : on N'AJOUTE PAS de surcouche au bucket privé 'dossiers' (les
-- policies y restreignent storage.foldername()[5] aux types de docs internes
-- pitch_deck / exec_summary, pour minimiser la surface d'écriture). On
-- crée à la place un bucket PUBLIC dédié 'champions' (lecture libre,
-- écriture scopée owner/staff) — ce qui rend l'affichage anon trivial
-- (URL publique storage/v1/object/public/champions/...).
--
-- Référence :
--   * docs/hardening/m4c-public-results-rls.md
--   * docs/hardening/rls-audit-v3.md
--   * supabase/migrations/20260601_rsa_v3_session_config_lockdown.sql

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Schéma startups : opt-in photo champion
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.startups
  ADD COLUMN IF NOT EXISTS champion_photo_optin boolean NOT NULL DEFAULT false;

ALTER TABLE public.startups
  ADD COLUMN IF NOT EXISTS champion_photo_path text;

COMMENT ON COLUMN public.startups.champion_photo_optin IS
  'Décision C.2 V3 : le champion autorise la diffusion de sa photo sur le palmarès public /Resultats. Par défaut false (RGPD).';
COMMENT ON COLUMN public.startups.champion_photo_path IS
  'Chemin du fichier photo dans le bucket champions (public), format editions/{edition_id}/startups/{startup_id}/champion_photo/{ts}_{name}.{ext}. Exposé via la vue public_palmares uniquement si champion_photo_optin = true ET la startup est classée #1 d''une session publiée.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Bucket storage public dédié 'champions'
-- ─────────────────────────────────────────────────────────────────────────────
-- Bucket public = anyone peut lire via /storage/v1/object/public/champions/...
-- Cap 8 Mo, types images standards. Écriture côté owner/staff via policies
-- storage.objects ci-dessous.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'champions',
  'champions',
  true,
  8 * 1024 * 1024,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Storage policies : owner peut INSERT/UPDATE/DELETE sa photo champion
-- ─────────────────────────────────────────────────────────────────────────────
-- Lecture : publique (le bucket est public). On déclare quand même une policy
-- explicite pour la cohérence (anon + authenticated).
--
-- Chemin attendu : editions/{edition_id}/startups/{startup_id}/champion_photo/{ts}_{name}
-- → storage.foldername(name) = ['editions', '{edition_id}', 'startups', '{startup_id}', 'champion_photo']
-- (Mêmes indices que dossiers — cf. dossiers_insert policy.)

CREATE POLICY champions_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'champions'
  AND (storage.foldername(name))[1] = 'editions'
  AND (storage.foldername(name))[3] = 'startups'
  AND (storage.foldername(name))[5] = 'champion_photo'
  AND (
    public.owns_startup((storage.foldername(name))[4])
    OR public.has_platform_role('admin')
    OR public.has_platform_role('comite')
  )
);

CREATE POLICY champions_update ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'champions'
  AND (
    public.owns_startup((storage.foldername(name))[4])
    OR public.has_platform_role('admin')
    OR public.has_platform_role('comite')
  )
) WITH CHECK (
  bucket_id = 'champions'
  AND (
    public.owns_startup((storage.foldername(name))[4])
    OR public.has_platform_role('admin')
    OR public.has_platform_role('comite')
  )
);

CREATE POLICY champions_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'champions'
  AND (
    public.owns_startup((storage.foldername(name))[4])
    OR public.has_platform_role('admin')
    OR public.has_platform_role('comite')
  )
);

-- Pas de policy SELECT sur storage.objects : le bucket est PUBLIC, les URLs
-- /storage/v1/object/public/champions/... fonctionnent sans policy. Ajouter
-- une policy SELECT large permettrait le LISTING du bucket entier (advisor
-- 0025 public_bucket_allows_listing), ce qu'on évite — les chemins sont
-- déjà secret (timestamp) et la lecture par URL directe suffit côté UI.

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) View public.public_palmares — surface unique anon/auth
-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY INVOKER (par défaut postgres). Gateée par
-- editions.public_results_enabled + session_config.status='published',
-- et on ne projette que des colonnes safe (jamais admin_overrides, jamais
-- eligibility_rules, jamais teams_link, jamais jury_pack_path).
--
-- La colonne champion_photo_path n'expose la photo que :
--   1. Pour la startup classée final_rank = 1 (le champion) ;
--   2. Si la startup a coché champion_photo_optin = true ;
--   3. Si le path existe.
-- Sinon NULL — pas de fuite de chemin de fichier.

DROP VIEW IF EXISTS public.public_palmares;

-- security_invoker=true (PG15+) : la vue ne porte PAS les privilèges du
-- propriétaire de la vue (postgres) mais ceux du caller. Indispensable pour
-- éviter que anon lise des colonnes via la vue alors que les policies des
-- tables sources le refuseraient. Sans cette option, l'advisor 0010
-- (security_definer_view) flag la vue comme bypass de RLS.
CREATE VIEW public.public_palmares
  WITH (security_invoker = true)
  AS
  SELECT
    e.id                                          AS edition_id,
    e.name                                        AS edition_name,
    e.year                                        AS edition_year,
    e.finale_date,
    e.awards_date,
    e.prize_main,
    e.prize_special,
    COALESCE(e.finalists_per_session, 1)          AS finalists_per_session,
    s.id                                          AS session_id,
    s.name                                        AS session_name,
    s.theme                                       AS session_theme,
    s.kind                                        AS session_kind,
    s.session_date,
    s.position                                    AS session_position,
    sc.final_ranking,
    sc.status                                     AS session_status,
    sc.published_at,
    sc.is_final,
    -- Photo du champion (rank=1) si opt-in. Sinon NULL.
    (
      SELECT st.champion_photo_path
      FROM public.startups st
      WHERE st.id = (
        SELECT (elem->>'startup_id')::uuid
        FROM jsonb_array_elements(COALESCE(sc.final_ranking, '[]'::jsonb)) elem
        WHERE (elem->>'final_rank')::int = 1
        LIMIT 1
      )
        AND st.champion_photo_optin = true
        AND st.champion_photo_path IS NOT NULL
    )                                              AS champion_photo_path,
    (
      SELECT elem->>'startup'
      FROM jsonb_array_elements(COALESCE(sc.final_ranking, '[]'::jsonb)) elem
      WHERE (elem->>'final_rank')::int = 1
      LIMIT 1
    )                                              AS champion_name
  FROM public.editions e
  JOIN public.sessions s ON s.edition_id = e.id
  JOIN public.session_config sc ON sc.session_id = s.id
  WHERE e.public_results_enabled = true
    AND sc.status = 'published';

COMMENT ON VIEW public.public_palmares IS
  'V3 — surface unique anon pour /Resultats. Agrège editions + sessions + session_config gatés par public_results_enabled + status=published. Aucune PII. Photo champion exposée uniquement si champion_photo_optin=true et rank=1.';

GRANT SELECT ON public.public_palmares TO anon, authenticated;

COMMIT;
