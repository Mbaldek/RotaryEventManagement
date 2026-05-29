-- ============================================================================
-- V3 Vague 2 — Feature E : /Candidater self-signup public (deferred magic-link)
-- ============================================================================
-- Permet à un visiteur anonyme de démarrer un dossier candidature sur la page
-- publique /Candidater, sans compte Supabase Auth préalable. Le dossier reste
-- en draft pendant 7 jours (pending_expires_at). Quand le candidat clique sur
-- le magic-link reçu par email, son auth.users.id est rattaché au dossier
-- (owner_id) via le RPC rsa_claim_pending_application.
--
-- Surface :
--   1. startups.pending_email + pending_expires_at (+ index partiel)
--   2. pending_applications_log : journal pour rate-limiting (3 drafts / 24h / email)
--   3. RPC rsa_create_pending_application(p_edition_id, p_club_id, p_email)
--   4. RPC rsa_claim_pending_application() — appelée au callback post-magic-link
--   5. RLS supplémentaire : SELECT/UPDATE par pending_email matching JWT email
--      (pour qu'un candidat connecté via magic-link voie ET puisse sauver son
--      dossier en attendant le claim définitif)
--   6. Cleanup function rsa_cleanup_expired_pending_drafts() — à appeler
--      périodiquement (pg_cron n'est pas activé en prod ; manuel ou via edge
--      function planifiée côté Supabase Scheduled Functions)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Colonnes pending_email + pending_expires_at sur startups
-- ----------------------------------------------------------------------------
ALTER TABLE public.startups
  ADD COLUMN IF NOT EXISTS pending_email      text,
  ADD COLUMN IF NOT EXISTS pending_expires_at timestamptz;

-- Normalise pending_email en lowercase à l'écriture (défense en profondeur).
CREATE OR REPLACE FUNCTION public.startups_normalize_pending_email()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.pending_email IS NOT NULL THEN
    NEW.pending_email := lower(trim(NEW.pending_email));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS startups_normalize_pending_email ON public.startups;
CREATE TRIGGER startups_normalize_pending_email
  BEFORE INSERT OR UPDATE OF pending_email
  ON public.startups
  FOR EACH ROW
  EXECUTE FUNCTION public.startups_normalize_pending_email();

-- Index partiel sur pending_expires_at (cleanup + lookup par email)
CREATE INDEX IF NOT EXISTS startups_pending_expires_idx
  ON public.startups(pending_expires_at)
  WHERE pending_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS startups_pending_email_idx
  ON public.startups(pending_email)
  WHERE pending_email IS NOT NULL AND owner_id IS NULL;

-- ----------------------------------------------------------------------------
-- 2. Journal des drafts pour rate-limiting (3 drafts max par email / 24h)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pending_applications_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  edition_id  text REFERENCES public.editions(id) ON DELETE SET NULL,
  club_id     text REFERENCES public.clubs(id) ON DELETE SET NULL,
  startup_id  uuid REFERENCES public.startups(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pending_applications_log_email_idx
  ON public.pending_applications_log(lower(email), created_at DESC);

ALTER TABLE public.pending_applications_log ENABLE ROW LEVEL SECURITY;

-- DENY total côté JWT — table service_role / RPC SECURITY DEFINER only.
-- (Pas de policy = DENY by default.)

-- ----------------------------------------------------------------------------
-- 3. RPC rsa_create_pending_application
-- ----------------------------------------------------------------------------
-- Crée un draft startup avec pending_email = lower(email), pending_expires_at
-- = now() + 7 jours, owner_id = NULL. Applique le rate-limit (3 drafts / 24h
-- par email, tous edition_id confondus). Renvoie l'id du startup créé.
--
-- Garde-fous serveur :
--   - email valide (regex)
--   - edition_id existe et status='open'
--   - club_id, si fourni, attaché à l'edition via edition_clubs
--   - rate-limit basé sur pending_applications_log (24h glissantes)
--   - si un draft pending non-réclamé existe déjà pour ce (email, edition_id),
--     on retourne son id (idempotent — le candidat peut renvoyer le lien)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_create_pending_application(
  p_edition_id text,
  p_club_id    text,
  p_email      text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email      text;
  v_edition    public.editions%ROWTYPE;
  v_attached   boolean;
  v_count_24h  integer;
  v_existing   uuid;
  v_new_id     uuid;
  v_ttl_days   constant integer := 7;
  v_rate_limit constant integer := 3;
BEGIN
  -- 1. Normalisation email
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE = '22023';
  END IF;
  v_email := lower(trim(p_email));
  IF v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE = '22023';
  END IF;

  -- 2. Edition existe et est ouverte
  SELECT * INTO v_edition FROM public.editions WHERE id = p_edition_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'edition_not_found' USING ERRCODE = '22023';
  END IF;
  IF v_edition.status <> 'open' THEN
    RAISE EXCEPTION 'edition_not_open' USING ERRCODE = '22023';
  END IF;
  IF v_edition.application_close IS NOT NULL AND v_edition.application_close < CURRENT_DATE THEN
    RAISE EXCEPTION 'edition_closed' USING ERRCODE = '22023';
  END IF;

  -- 3. Club attaché à l'édition (si fourni)
  IF p_club_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.edition_clubs
      WHERE edition_id = p_edition_id AND club_id = p_club_id
    ) INTO v_attached;
    IF NOT v_attached THEN
      RAISE EXCEPTION 'club_not_attached' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- 4. Idempotence : un draft pending non-réclamé existe déjà ?
  SELECT id INTO v_existing
  FROM public.startups
  WHERE pending_email = v_email
    AND edition_id = p_edition_id
    AND owner_id IS NULL
    AND status = 'brouillon'
    AND pending_expires_at > now()
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    -- On rafraîchit la TTL (rétention 7j depuis le dernier envoi) sans bumper le log.
    UPDATE public.startups
       SET pending_expires_at = now() + (v_ttl_days || ' days')::interval,
           club_id            = COALESCE(p_club_id, club_id),
           updated_at         = now()
     WHERE id = v_existing;
    RETURN v_existing;
  END IF;

  -- 5. Rate-limit : max 3 drafts par email / 24h
  SELECT count(*) INTO v_count_24h
  FROM public.pending_applications_log
  WHERE lower(email) = v_email
    AND created_at > now() - interval '24 hours';

  IF v_count_24h >= v_rate_limit THEN
    RAISE EXCEPTION 'rate_limit_exceeded' USING ERRCODE = '22023';
  END IF;

  -- 6. INSERT du draft startup (owner_id reste NULL jusqu'au claim)
  INSERT INTO public.startups (
    edition_id, club_id, owner_id, status, name,
    pending_email, pending_expires_at, email
  )
  VALUES (
    p_edition_id, p_club_id, NULL, 'brouillon', 'Brouillon',
    v_email, now() + (v_ttl_days || ' days')::interval, v_email
  )
  RETURNING id INTO v_new_id;

  -- 7. Journal pour rate-limit
  INSERT INTO public.pending_applications_log (email, edition_id, club_id, startup_id)
  VALUES (v_email, p_edition_id, p_club_id, v_new_id);

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rsa_create_pending_application(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rsa_create_pending_application(text, text, text) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. RPC rsa_claim_pending_application
-- ----------------------------------------------------------------------------
-- Appelée par le candidat après clic sur magic-link : il est désormais
-- authentifié (auth.uid() disponible) et son JWT contient l'email. On rattache
-- tous les drafts pending matching son email à son auth.users.id.
-- Renvoie le nombre de dossiers rattachés.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_claim_pending_application()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid;
  v_email   text;
  v_claimed integer;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF v_email = '' THEN
    RAISE EXCEPTION 'no_email_in_jwt' USING ERRCODE = '42501';
  END IF;

  UPDATE public.startups
     SET owner_id          = v_uid,
         pending_email     = NULL,
         pending_expires_at = NULL,
         updated_at        = now()
   WHERE pending_email     = v_email
     AND owner_id          IS NULL
     AND status            = 'brouillon'
     AND pending_expires_at > now();

  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  RETURN v_claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.rsa_claim_pending_application() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rsa_claim_pending_application() TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. RLS supplémentaire : permettre au candidat authentifié de voir + éditer
--    le draft pending matching son email (avant claim).
-- ----------------------------------------------------------------------------
-- Pourquoi : si le user clique sur le magic-link mais que le claim échoue
-- (rare, racing), il doit quand même voir son dossier. La policy
-- startups_read existante ne couvre pas ce cas car owner_id est NULL.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS startups_pending_self_read ON public.startups;
CREATE POLICY startups_pending_self_read ON public.startups
  FOR SELECT
  USING (
    pending_email IS NOT NULL
    AND owner_id IS NULL
    AND pending_email = lower(coalesce(auth.jwt() ->> 'email', ''))
    AND pending_expires_at > now()
  );

DROP POLICY IF EXISTS startups_pending_self_update ON public.startups;
CREATE POLICY startups_pending_self_update ON public.startups
  FOR UPDATE
  USING (
    pending_email IS NOT NULL
    AND owner_id IS NULL
    AND pending_email = lower(coalesce(auth.jwt() ->> 'email', ''))
    AND pending_expires_at > now()
  )
  WITH CHECK (
    pending_email IS NOT NULL
    AND owner_id IS NULL
    AND pending_email = lower(coalesce(auth.jwt() ->> 'email', ''))
    AND pending_expires_at > now()
  );

-- ----------------------------------------------------------------------------
-- 6. Cleanup function : DELETE drafts pending expirés non-réclamés
-- ----------------------------------------------------------------------------
-- À appeler périodiquement (manuel via psql, ou via Supabase Scheduled
-- Functions). pg_cron n'étant PAS activé sur ce projet, on ne crée pas de
-- job ici — la fonction reste invocable et idempotente.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_cleanup_expired_pending_drafts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_drafts integer;
  v_deleted_logs   integer;
BEGIN
  -- 1. Drafts expirés non-réclamés
  DELETE FROM public.startups
   WHERE pending_email     IS NOT NULL
     AND owner_id          IS NULL
     AND pending_expires_at < now();
  GET DIAGNOSTICS v_deleted_drafts = ROW_COUNT;

  -- 2. Journal : rétention 30 jours (assez pour audit)
  DELETE FROM public.pending_applications_log
   WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS v_deleted_logs = ROW_COUNT;

  RETURN v_deleted_drafts;
END;
$$;

REVOKE ALL ON FUNCTION public.rsa_cleanup_expired_pending_drafts() FROM PUBLIC;
-- Pas de GRANT — réservé au service_role / scheduled function.

COMMIT;
