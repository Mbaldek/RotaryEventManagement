-- ============================================================================
-- V2 MULTI-CLUB — Module 9 : Email Studio (owner comms hyper rapide)
-- ============================================================================
-- Permet au master_admin et aux club_admins d'envoyer des emails brandés
-- Élysée à des audiences ciblées en quelques secondes (composer + segmentation
-- pré-construite + templates + historique), sans passer par un outil externe.
--
-- Architecture :
--   - email_templates : modèles réutilisables (NULL.club_id = templates globaux
--                       master, sinon scoping par club).
--   - email_sends     : historique audit des envois groupés. Écrit UNIQUEMENT
--                       par l'edge function send-bulk (service_role).
--   - RPC :
--       rsa_list_email_templates(p_club_id)         : lecture (perso + globaux)
--       rsa_save_email_template(...)                : UPSERT (own row only)
--       rsa_delete_email_template(p_id)             : DELETE (own row only)
--       rsa_list_email_sends(p_club_id, p_limit)    : historique paginé
--       rsa_resolve_audience(p_type, p_filter)      : SETOF (email, name) —
--                                                     utilisé par l'edge function
--                                                     ET par le preview UI
--
-- Sécurité :
--   - email_templates : RLS master_admin OR club_admin du club_id (NULL = master
--                       global ; seul master_admin écrit ceux-là).
--   - email_sends     : RLS lecture master_admin OR club_admin ; écriture DENY
--                       totale (service_role bypass via l'edge function).
--   - rsa_resolve_audience : SECURITY DEFINER, autorisé pour authenticated et
--                           service_role ; vérifie le rôle de l'appelant pour le
--                           club_id demandé.
--
-- Référence : plan ~/.claude/plans/elegant-giggling-pie.md §Module 9
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.email_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id       text REFERENCES public.clubs(id) ON DELETE CASCADE,  -- NULL = global master
  name          text NOT NULL,
  subject       text NOT NULL,
  body_html     text NOT NULL,
  audience_type text NOT NULL,
  lang          text NOT NULL DEFAULT 'fr' CHECK (lang IN ('fr','en','de')),
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_templates_club_idx ON public.email_templates(club_id);
CREATE INDEX IF NOT EXISTS email_templates_created_by_idx ON public.email_templates(created_by);

COMMENT ON TABLE public.email_templates IS
  'M9 : templates emails réutilisables. club_id NULL = template global (master_admin only).';


CREATE TABLE IF NOT EXISTS public.email_sends (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by             uuid REFERENCES auth.users(id),
  club_id             text REFERENCES public.clubs(id) ON DELETE SET NULL,  -- NULL = master global send
  sent_at             timestamptz NOT NULL DEFAULT now(),
  audience_type       text NOT NULL,
  audience_filter     jsonb NOT NULL DEFAULT '{}'::jsonb,
  subject             text NOT NULL,
  body_html           text NOT NULL,
  recipients_count    integer NOT NULL DEFAULT 0,
  recipients_emails   text[] NOT NULL DEFAULT ARRAY[]::text[],
  resend_message_ids  text[] NOT NULL DEFAULT ARRAY[]::text[],
  status              text NOT NULL DEFAULT 'sent'
                        CHECK (status IN ('sent','failed','partial')),
  error_message       text
);

CREATE INDEX IF NOT EXISTS email_sends_club_sent_at_idx ON public.email_sends(club_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS email_sends_sent_by_idx ON public.email_sends(sent_by);

COMMENT ON TABLE public.email_sends IS
  'M9 : historique audit des envois bulk. Insert restreint au service_role (edge function send-bulk).';


-- ----------------------------------------------------------------------------
-- 2. RLS
-- ----------------------------------------------------------------------------

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sends     ENABLE ROW LEVEL SECURITY;

-- email_templates : SELECT master_admin OR club_admin du club_id ; ou NULL.club_id
-- visible par master_admin uniquement.
DROP POLICY IF EXISTS et_select ON public.email_templates;
CREATE POLICY et_select ON public.email_templates FOR SELECT USING (
  public.is_master_admin()
  OR (club_id IS NOT NULL AND public.is_club_member(club_id, 'club_admin'))
);

-- INSERT : master_admin (n'importe quel club_id ou NULL) ; club_admin uniquement
-- pour son propre club. Le created_by est forcé à auth.uid() par contrainte WITH CHECK.
DROP POLICY IF EXISTS et_insert ON public.email_templates;
CREATE POLICY et_insert ON public.email_templates FOR INSERT WITH CHECK (
  (
    public.is_master_admin()
    OR (club_id IS NOT NULL AND public.is_club_member(club_id, 'club_admin'))
  )
  AND created_by = auth.uid()
);

-- UPDATE : master_admin OR créateur de la ligne (qui doit être club_admin du
-- club ou master_admin pour l'avoir créée en premier lieu via la policy INSERT).
DROP POLICY IF EXISTS et_update ON public.email_templates;
CREATE POLICY et_update ON public.email_templates FOR UPDATE
  USING (
    public.is_master_admin()
    OR (
      created_by = auth.uid()
      AND (
        (club_id IS NULL AND public.is_master_admin())
        OR (club_id IS NOT NULL AND public.is_club_member(club_id, 'club_admin'))
      )
    )
  )
  WITH CHECK (
    public.is_master_admin()
    OR (
      created_by = auth.uid()
      AND (
        (club_id IS NULL AND public.is_master_admin())
        OR (club_id IS NOT NULL AND public.is_club_member(club_id, 'club_admin'))
      )
    )
  );

-- DELETE : idem
DROP POLICY IF EXISTS et_delete ON public.email_templates;
CREATE POLICY et_delete ON public.email_templates FOR DELETE USING (
  public.is_master_admin()
  OR (
    created_by = auth.uid()
    AND club_id IS NOT NULL AND public.is_club_member(club_id, 'club_admin')
  )
);


-- email_sends : SELECT master_admin OR club_admin du club_id ; SELECT autorisé
-- aussi sur les NULL.club_id pour master_admin uniquement (sends globaux).
DROP POLICY IF EXISTS es_select ON public.email_sends;
CREATE POLICY es_select ON public.email_sends FOR SELECT USING (
  public.is_master_admin()
  OR (club_id IS NOT NULL AND public.is_club_member(club_id, 'club_admin'))
);

-- INSERT : DENY pour tout JWT (service_role bypass déjà l'RLS). On veut
-- garantir que seul l'edge function send-bulk écrit cette table — pas un
-- client malicieux qui aurait découvert les colonnes.
DROP POLICY IF EXISTS es_insert_denied ON public.email_sends;
CREATE POLICY es_insert_denied ON public.email_sends FOR INSERT WITH CHECK (false);

-- UPDATE/DELETE : DENY total (audit immuable).
DROP POLICY IF EXISTS es_update_denied ON public.email_sends;
CREATE POLICY es_update_denied ON public.email_sends FOR UPDATE USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS es_delete_denied ON public.email_sends;
CREATE POLICY es_delete_denied ON public.email_sends FOR DELETE USING (false);


-- ----------------------------------------------------------------------------
-- 3. Trigger updated_at sur email_templates
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.email_templates_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS email_templates_set_updated_at ON public.email_templates;
CREATE TRIGGER email_templates_set_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.email_templates_set_updated_at();


-- ----------------------------------------------------------------------------
-- 4. RPC rsa_list_email_templates(p_club_id)
-- ----------------------------------------------------------------------------
-- Retourne les templates accessibles par l'appelant :
--   - tous les templates globaux (club_id IS NULL) si master_admin
--   - les templates du club p_club_id si club_admin de ce club
-- Si p_club_id est NULL, retourne UNIQUEMENT les templates globaux (master vue).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_list_email_templates(p_club_id text DEFAULT NULL)
RETURNS SETOF public.email_templates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF p_club_id IS NULL THEN
    -- Vue master : globaux uniquement
    IF NOT public.is_master_admin() THEN
      RAISE EXCEPTION 'Seul un master_admin peut lire les templates globaux.'
        USING ERRCODE = '42501';
    END IF;
    RETURN QUERY
      SELECT * FROM public.email_templates
      WHERE club_id IS NULL
      ORDER BY updated_at DESC;
  ELSE
    -- Vue club : templates globaux (master vue ad-hoc) + templates du club
    IF NOT (public.is_master_admin() OR public.is_club_member(p_club_id, 'club_admin')) THEN
      RAISE EXCEPTION 'Accès refusé pour le club %.', p_club_id USING ERRCODE = '42501';
    END IF;
    RETURN QUERY
      SELECT * FROM public.email_templates
      WHERE club_id IS NULL OR club_id = p_club_id
      ORDER BY updated_at DESC;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rsa_list_email_templates(text) TO authenticated;


-- ----------------------------------------------------------------------------
-- 5. RPC rsa_save_email_template(...)
-- ----------------------------------------------------------------------------
-- UPSERT : si p_id existe, UPDATE ; sinon INSERT. created_by est posé à auth.uid()
-- côté INSERT, immuable côté UPDATE.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_save_email_template(
  p_id            uuid,
  p_club_id       text,
  p_name          text,
  p_subject       text,
  p_body_html     text,
  p_audience_type text,
  p_lang          text DEFAULT 'fr'
)
RETURNS public.email_templates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row    public.email_templates;
  v_uid    uuid := auth.uid();
BEGIN
  -- Autorisation
  IF p_club_id IS NULL THEN
    IF NOT public.is_master_admin() THEN
      RAISE EXCEPTION 'Seul un master_admin peut créer/éditer un template global.'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT (public.is_master_admin() OR public.is_club_member(p_club_id, 'club_admin')) THEN
      RAISE EXCEPTION 'Accès refusé pour le club %.', p_club_id USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Validation
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'p_name ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;
  IF p_subject IS NULL OR length(trim(p_subject)) = 0 THEN
    RAISE EXCEPTION 'p_subject ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;
  IF p_body_html IS NULL OR length(trim(p_body_html)) = 0 THEN
    RAISE EXCEPTION 'p_body_html ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;
  IF p_audience_type IS NULL OR length(trim(p_audience_type)) = 0 THEN
    RAISE EXCEPTION 'p_audience_type ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;
  IF p_lang NOT IN ('fr','en','de') THEN
    RAISE EXCEPTION 'p_lang invalide : %.', p_lang USING ERRCODE = '22023';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.email_templates (
      club_id, name, subject, body_html, audience_type, lang, created_by
    ) VALUES (
      p_club_id, trim(p_name), trim(p_subject), p_body_html,
      trim(p_audience_type), p_lang, v_uid
    )
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.email_templates
       SET name          = trim(p_name),
           subject       = trim(p_subject),
           body_html     = p_body_html,
           audience_type = trim(p_audience_type),
           lang          = p_lang
     WHERE id = p_id
       AND (
         public.is_master_admin()
         OR (created_by = v_uid AND club_id = p_club_id)
       )
    RETURNING * INTO v_row;

    IF v_row.id IS NULL THEN
      RAISE EXCEPTION 'Template % introuvable ou non autorisé.', p_id USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rsa_save_email_template(uuid, text, text, text, text, text, text) TO authenticated;


-- ----------------------------------------------------------------------------
-- 6. RPC rsa_delete_email_template(p_id)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_delete_email_template(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row public.email_templates;
BEGIN
  SELECT * INTO v_row FROM public.email_templates WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template % introuvable.', p_id USING ERRCODE = '23503';
  END IF;

  IF NOT (
    public.is_master_admin()
    OR (
      v_row.created_by = auth.uid()
      AND v_row.club_id IS NOT NULL
      AND public.is_club_member(v_row.club_id, 'club_admin')
    )
  ) THEN
    RAISE EXCEPTION 'Accès refusé.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.email_templates WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rsa_delete_email_template(uuid) TO authenticated;


-- ----------------------------------------------------------------------------
-- 7. RPC rsa_list_email_sends(p_club_id, p_limit)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_list_email_sends(
  p_club_id text DEFAULT NULL,
  p_limit   integer DEFAULT 50
)
RETURNS SETOF public.email_sends
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF p_club_id IS NULL THEN
    IF NOT public.is_master_admin() THEN
      RAISE EXCEPTION 'Seul un master_admin peut lire l''historique global.'
        USING ERRCODE = '42501';
    END IF;
    RETURN QUERY
      SELECT * FROM public.email_sends
      WHERE club_id IS NULL
      ORDER BY sent_at DESC
      LIMIT COALESCE(p_limit, 50);
  ELSE
    IF NOT (public.is_master_admin() OR public.is_club_member(p_club_id, 'club_admin')) THEN
      RAISE EXCEPTION 'Accès refusé pour le club %.', p_club_id USING ERRCODE = '42501';
    END IF;
    RETURN QUERY
      SELECT * FROM public.email_sends
      WHERE club_id = p_club_id
      ORDER BY sent_at DESC
      LIMIT COALESCE(p_limit, 50);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rsa_list_email_sends(text, integer) TO authenticated;


-- ----------------------------------------------------------------------------
-- 8. RPC rsa_resolve_audience(p_type, p_filter)
-- ----------------------------------------------------------------------------
-- Résout une segmentation en SETOF (email, full_name). Utilisée par :
--   - l'edge function send-bulk (résolution serveur de la liste d'envoi)
--   - le UI EmailComposer (preview du count + 3 exemples)
--
-- Types supportés :
--   'single_email'             → { email }
--   'club_candidates'          → toutes les startups du club (status optionnel)
--                                   filter: { club_id, edition_id?, statuses?[] }
--   'club_finalists'           → startups status='finaliste' du club (edition)
--   'club_jurys'               → club_memberships role='jury' du club
--   'club_comite'              → club_memberships role='comite' du club
--   'club_admins'              → club_memberships role='club_admin' du club
--   'session_jurys'            → platform_jury_assignments d'une session
--                                   filter: { session_id }
--   'session_candidates'       → startups dont session_id = filter.session_id
--   'all_finalists_edition'    → master_admin only : tous les finalistes d'une
--                                   compétition (peu importe le club)
--                                   filter: { edition_id }
--
-- L'autorisation est vérifiée côté SQL :
--   - Si le type est club-scoped, l'appelant doit être master_admin OU
--     club_admin du club_id donné dans filter.
--   - Si le type est session-scoped, l'appelant doit être master_admin OU
--     club_admin du club de la session.
--   - 'all_finalists_edition' : master_admin uniquement.
--   - 'single_email' : tout authenticated peut envoyer à 1 email.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rsa_resolve_audience(
  p_audience_type text,
  p_audience_filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(email text, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_club_id    text;
  v_session_id text;
  v_edition_id text;
  v_statuses   text[];
  v_email      text;
  v_session_club text;
BEGIN
  IF p_audience_type IS NULL OR length(trim(p_audience_type)) = 0 THEN
    RAISE EXCEPTION 'p_audience_type ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;
  IF p_audience_filter IS NULL THEN
    p_audience_filter := '{}'::jsonb;
  END IF;

  v_club_id     := NULLIF(trim(coalesce(p_audience_filter ->> 'club_id', '')), '');
  v_session_id  := NULLIF(trim(coalesce(p_audience_filter ->> 'session_id', '')), '');
  v_edition_id  := NULLIF(trim(coalesce(p_audience_filter ->> 'edition_id', '')), '');

  -- statuses : array JSON
  IF p_audience_filter ? 'statuses' AND jsonb_typeof(p_audience_filter -> 'statuses') = 'array' THEN
    SELECT array_agg(value::text)
      INTO v_statuses
      FROM jsonb_array_elements_text(p_audience_filter -> 'statuses');
  END IF;

  -- ── single_email ──
  IF p_audience_type = 'single_email' THEN
    v_email := lower(trim(coalesce(p_audience_filter ->> 'email', '')));
    IF v_email = '' OR v_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' THEN
      RAISE EXCEPTION 'Email invalide.' USING ERRCODE = '22023';
    END IF;
    RETURN QUERY SELECT v_email, NULL::text;
    RETURN;
  END IF;

  -- ── club-scoped types ──
  IF p_audience_type IN ('club_candidates','club_finalists','club_jurys','club_comite','club_admins') THEN
    IF v_club_id IS NULL THEN
      RAISE EXCEPTION 'club_id requis pour %.', p_audience_type USING ERRCODE = '22023';
    END IF;
    IF NOT (public.is_master_admin() OR public.is_club_member(v_club_id, 'club_admin')) THEN
      RAISE EXCEPTION 'Accès refusé pour le club %.', v_club_id USING ERRCODE = '42501';
    END IF;
  END IF;

  -- ── session-scoped types ──
  IF p_audience_type IN ('session_jurys','session_candidates') THEN
    IF v_session_id IS NULL THEN
      RAISE EXCEPTION 'session_id requis pour %.', p_audience_type USING ERRCODE = '22023';
    END IF;
    SELECT club_id INTO v_session_club FROM public.sessions WHERE id = v_session_id;
    IF v_session_club IS NULL AND NOT public.is_master_admin() THEN
      -- session finale fédérée (club_id NULL) : master_admin seul
      RAISE EXCEPTION 'Accès refusé pour la session %.', v_session_id USING ERRCODE = '42501';
    END IF;
    IF v_session_club IS NOT NULL
       AND NOT (public.is_master_admin() OR public.is_club_member(v_session_club, 'club_admin')) THEN
      RAISE EXCEPTION 'Accès refusé pour la session %.', v_session_id USING ERRCODE = '42501';
    END IF;
  END IF;

  -- ── master-only types ──
  IF p_audience_type = 'all_finalists_edition' THEN
    IF NOT public.is_master_admin() THEN
      RAISE EXCEPTION 'Seul un master_admin peut résoudre %.', p_audience_type USING ERRCODE = '42501';
    END IF;
    IF v_edition_id IS NULL THEN
      RAISE EXCEPTION 'edition_id requis pour %.', p_audience_type USING ERRCODE = '22023';
    END IF;
  END IF;

  -- ── résolution effective ──
  IF p_audience_type = 'club_candidates' THEN
    RETURN QUERY
      SELECT DISTINCT lower(s.email) AS email,
             coalesce(s.contact_person, s.name) AS full_name
      FROM public.startups s
      WHERE s.club_id = v_club_id
        AND s.email IS NOT NULL
        AND (v_edition_id IS NULL OR s.edition_id = v_edition_id)
        AND (v_statuses IS NULL OR s.status = ANY(v_statuses));

  ELSIF p_audience_type = 'club_finalists' THEN
    RETURN QUERY
      SELECT DISTINCT lower(s.email) AS email,
             coalesce(s.contact_person, s.name) AS full_name
      FROM public.startups s
      WHERE s.club_id = v_club_id
        AND s.status = 'finaliste'
        AND s.email IS NOT NULL
        AND (v_edition_id IS NULL OR s.edition_id = v_edition_id);

  ELSIF p_audience_type IN ('club_jurys','club_comite','club_admins') THEN
    RETURN QUERY
      SELECT DISTINCT lower(u.email) AS email,
             coalesce(p.full_name, u.email) AS full_name
      FROM public.club_memberships m
      JOIN auth.users u  ON u.id = m.user_id
      LEFT JOIN public.profiles p ON p.id = m.user_id
      WHERE m.club_id = v_club_id
        AND m.role = CASE p_audience_type
                       WHEN 'club_jurys'   THEN 'jury'
                       WHEN 'club_comite'  THEN 'comite'
                       WHEN 'club_admins'  THEN 'club_admin'
                     END
        AND u.email IS NOT NULL;

  ELSIF p_audience_type = 'session_jurys' THEN
    RETURN QUERY
      SELECT DISTINCT lower(u.email) AS email,
             coalesce(p.full_name, u.email) AS full_name
      FROM public.platform_jury_assignments a
      JOIN auth.users u  ON u.id = a.jury_user_id
      LEFT JOIN public.profiles p ON p.id = a.jury_user_id
      WHERE a.session_id = v_session_id
        AND u.email IS NOT NULL;

  ELSIF p_audience_type = 'session_candidates' THEN
    RETURN QUERY
      SELECT DISTINCT lower(s.email) AS email,
             coalesce(s.contact_person, s.name) AS full_name
      FROM public.startups s
      WHERE s.session_id = v_session_id
        AND s.email IS NOT NULL;

  ELSIF p_audience_type = 'all_finalists_edition' THEN
    RETURN QUERY
      SELECT DISTINCT lower(s.email) AS email,
             coalesce(s.contact_person, s.name) AS full_name
      FROM public.startups s
      WHERE s.edition_id = v_edition_id
        AND s.status = 'finaliste'
        AND s.email IS NOT NULL;

  ELSE
    RAISE EXCEPTION 'Type d''audience inconnu : %.', p_audience_type USING ERRCODE = '22023';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.rsa_resolve_audience(text, jsonb) IS
  'M9 : résout une segmentation en SETOF (email, full_name). Source de vérité pour send-bulk + preview UI.';

GRANT EXECUTE ON FUNCTION public.rsa_resolve_audience(text, jsonb) TO authenticated;
-- service_role n'a pas besoin de GRANT (bypass RLS et SECURITY DEFINER l'autorisent).

COMMIT;
