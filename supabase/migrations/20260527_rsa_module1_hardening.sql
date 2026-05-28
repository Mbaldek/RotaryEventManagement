-- Rotary Startup Award — Module 1 (« Espace Startup ») : hardening runtime.
--
-- Dépend de :
--   20260527_rsa_platform_foundation.sql      (tables editions/sessions/startups)
--   20260527_rsa_platform_roles_hardening.sql (app_user_roles + has_platform_role() verrouillés)
--   20260527_rsa_module1_prep.sql             (RLS startups_applicant_*, bucket dossiers, owns_startup, is_dossier_staff)
--
-- Couvre la revue runtime docs/hardening/module1-runtime-review.md (items #1-#9) :
--   R-C1 : trigger startups_guard_update (BEFORE INSERT OR UPDATE — verrouille
--           status/submitted_at/eligibility/session_id/owner_id/edition_id côté candidat ;
--           sur INSERT : impose les défauts pour empêcher le forge-on-insert).
--   R-C2 : fonction SQL pure rsa_evaluate_eligibility(startup, rules) — twin de src/lib/rsa/eligibility.js.
--   R-C3 : RPC SECURITY DEFINER rsa_submit_dossier(uuid) — valide, recalcule l'éligibilité, écrit status='soumis'.
--   R-H2 : tighten dossiers_insert / dossiers_update — segment [5] doit valoir pitch_deck | exec_summary.
--
-- DESIGN — bypass du trigger par le RPC :
--   Le trigger startups_guard_update interdit aux candidats de toucher aux colonnes
--   privilégiées. Le RPC rsa_submit_dossier (SECURITY DEFINER) DOIT pouvoir y écrire :
--   il pose un « sentinel » de transaction via set_config('rsa.allow_protected_update','t', true)
--   AVANT son UPDATE final, et le trigger vérifie current_setting(..., true) :
--   - true  ⇒ RPC ⇒ skip
--   - NULL/'' ⇒ chemin candidat normal ⇒ enforce
--   Le 3e argument 'true' de set_config rend le sentinel local à la transaction (ne fuit
--   pas hors-transaction) ; current_setting(..., true) renvoie NULL si la GUC n'existe pas
--   (au lieu de lever) — d'où l'isolation propre. Aucune dépendance au rôle owner.
--
-- Idempotence : create or replace, drop policy if exists, drop trigger if exists.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. R-C2 — rsa_evaluate_eligibility : twin SQL pur de evaluateEligibility (JS)
-- ─────────────────────────────────────────────────────────────────────────────
-- IMMUTABLE : pour un (row, rules) donné, le verdict est déterministe (modulo
-- 'evaluated_at' qui est une valeur d'horodatage capturée AU SITE D'APPEL, jamais
-- réutilisable par le planner). On garde le horodatage côté appelant (rsa_submit_dossier)
-- pour ne pas casser l'immutability ; ici on renvoie uniquement { verdict, failed }.

create or replace function public.rsa_evaluate_eligibility(p_row public.startups, p_rules jsonb)
returns jsonb
language plpgsql immutable as $$
declare
  v_failed jsonb := '[]'::jsonb;
  v_excl   boolean := false;
  v_country_allowed text[];
  v_after  date;
  v_rev    numeric;
  v_raised numeric;
  v_regn   text;
  v_digits text;
  v_docs   text[];
  v_missing text[] := array[]::text[];
begin
  -- country (par défaut 'exclu')
  if p_rules ? 'country' and coalesce(p_rules->'country'->>'behavior','off') <> 'off' then
    select array(select jsonb_array_elements_text(p_rules->'country'->'allowed')) into v_country_allowed;
    if p_row.country is null
       or p_row.country = '__other__'
       or not (p_row.country = any(v_country_allowed)) then
      v_failed := v_failed || jsonb_build_object('rule','country','behavior',p_rules->'country'->>'behavior');
      v_excl   := v_excl or (p_rules->'country'->>'behavior') = 'exclu';
    end if;
  end if;

  -- created_after (par défaut 'exclu')
  if p_rules ? 'created_after' and coalesce(p_rules->'created_after'->>'behavior','off') <> 'off' then
    v_after := (p_rules->'created_after'->>'date')::date;
    if p_row.creation_date is null or p_row.creation_date < v_after then
      v_failed := v_failed || jsonb_build_object('rule','created_after','behavior',p_rules->'created_after'->>'behavior');
      v_excl   := v_excl or (p_rules->'created_after'->>'behavior') = 'exclu';
    end if;
  end if;

  -- revenue_max (flag) — null = passe (comme la fonction JS)
  if p_rules ? 'revenue_max' and coalesce(p_rules->'revenue_max'->>'behavior','off') <> 'off' then
    v_rev := (p_rules->'revenue_max'->>'threshold')::numeric;
    if p_row.last_revenue is not null and p_row.last_revenue >= v_rev then
      v_failed := v_failed || jsonb_build_object('rule','revenue_max','behavior',p_rules->'revenue_max'->>'behavior');
      v_excl   := v_excl or (p_rules->'revenue_max'->>'behavior') = 'exclu';
    end if;
  end if;

  -- raised_max (flag) — null = passe
  if p_rules ? 'raised_max' and coalesce(p_rules->'raised_max'->>'behavior','off') <> 'off' then
    v_raised := (p_rules->'raised_max'->>'threshold')::numeric;
    if p_row.amount_raised is not null and p_row.amount_raised >= v_raised then
      v_failed := v_failed || jsonb_build_object('rule','raised_max','behavior',p_rules->'raised_max'->>'behavior');
      v_excl   := v_excl or (p_rules->'raised_max'->>'behavior') = 'exclu';
    end if;
  end if;

  -- founders_majority (flag) — ok ssi true ; null/false ⇒ failed
  if p_rules ? 'founders_majority' and coalesce(p_rules->'founders_majority'->>'behavior','off') <> 'off' then
    if p_row.founders_majority is distinct from true then
      v_failed := v_failed || jsonb_build_object('rule','founders_majority','behavior',p_rules->'founders_majority'->>'behavior');
      v_excl   := v_excl or (p_rules->'founders_majority'->>'behavior') = 'exclu';
    end if;
  end if;

  -- registration (flag) — placeholder si vide / que des 0 / 123123… (twin du JS)
  if p_rules ? 'registration' and coalesce(p_rules->'registration'->>'behavior','off') <> 'off' then
    v_regn  := coalesce(p_row.registration_number, '');
    v_digits := regexp_replace(v_regn, '\D', '', 'g');
    if v_regn = ''
       or length(v_digits) = 0
       or v_digits ~ '^0+$'
       or v_digits ~ '^(?:123){2,}$'
    then
      v_failed := v_failed || jsonb_build_object('rule','registration','behavior',p_rules->'registration'->>'behavior');
      v_excl   := v_excl or (p_rules->'registration'->>'behavior') = 'exclu';
    end if;
  end if;

  -- docs_required (flag) — manque l'un des chemins listés
  if p_rules ? 'docs_required' and coalesce(p_rules->'docs_required'->>'behavior','off') <> 'off' then
    select array(select jsonb_array_elements_text(p_rules->'docs_required'->'docs')) into v_docs;
    if v_docs is not null then
      if 'pitch_deck' = any(v_docs) and (p_row.pitch_deck_path is null or length(btrim(p_row.pitch_deck_path)) = 0) then
        v_missing := v_missing || 'pitch_deck';
      end if;
      if 'exec_summary' = any(v_docs) and (p_row.exec_summary_path is null or length(btrim(p_row.exec_summary_path)) = 0) then
        v_missing := v_missing || 'exec_summary';
      end if;
    end if;
    if array_length(v_missing, 1) is not null then
      v_failed := v_failed || jsonb_build_object('rule','docs_required','behavior',p_rules->'docs_required'->>'behavior','missing', to_jsonb(v_missing));
      v_excl   := v_excl or (p_rules->'docs_required'->>'behavior') = 'exclu';
    end if;
  end if;

  return jsonb_build_object(
    'verdict',
      case
        when v_excl then 'excluded'
        when jsonb_array_length(v_failed) > 0 then 'flagged'
        else 'eligible'
      end,
    'failed', v_failed
  );
end;
$$;

revoke all on function public.rsa_evaluate_eligibility(public.startups, jsonb) from public;
grant execute on function public.rsa_evaluate_eligibility(public.startups, jsonb) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. R-C1 — Trigger startups_guard_update : verrou des colonnes privilégiées
-- ─────────────────────────────────────────────────────────────────────────────
-- Tout UPDATE candidat sur startups passe par ici. Si l'appelant n'est pas staff
-- (comité/admin) ET que le RPC n'a pas posé le sentinel de bypass, on rejette les
-- changements sur status / submitted_at / eligibility / session_id / owner_id / edition_id.
--
-- Le RPC rsa_submit_dossier pose le sentinel via set_config('rsa.allow_protected_update','t', true)
-- juste avant son UPDATE final ; current_setting(..., true) renvoie NULL si la GUC n'existe pas
-- (et non une exception). Le 3e argument true rend la GUC LOCAL à la transaction.

create or replace function public.startups_guard_update()
returns trigger
language plpgsql as $$
declare
  v_bypass text := coalesce(current_setting('rsa.allow_protected_update', true), '');
begin
  -- 1. Bypass explicite (posé par les SECURITY DEFINER RPC autorisés en début de tx).
  if v_bypass = 't' then
    return new;
  end if;

  -- 2. Bypass staff (comité/admin).
  if public.has_platform_role('comite') or public.has_platform_role('admin') then
    return new;
  end if;

  -- 3a. Candidat sur INSERT : les colonnes privilégiées DOIVENT rester aux défauts
  --     (sinon « forge-on-insert » : un client forgé poserait status='soumis' +
  --      eligibility={verdict:'eligible'} en bypassant le RPC rsa_submit_dossier).
  if TG_OP = 'INSERT' then
    if new.status        is not null and new.status <> 'brouillon'          then raise exception 'forbidden_field:status'       using errcode = '42501'; end if;
    if new.submitted_at  is not null                                         then raise exception 'forbidden_field:submitted_at' using errcode = '42501'; end if;
    if coalesce(new.eligibility, '{}'::jsonb) <> '{}'::jsonb                 then raise exception 'forbidden_field:eligibility'  using errcode = '42501'; end if;
    if new.session_id    is not null                                         then raise exception 'forbidden_field:session_id'   using errcode = '42501'; end if;
    -- owner_id est déjà épinglé à auth.uid() par la RLS startups_applicant_insert ;
    -- edition_id est requis (NOT NULL) et non-privilégié à l'insertion. Pas de check ici.
    return new;
  end if;

  -- 3b. Candidat sur UPDATE : aucune modification autorisée sur les colonnes privilégiées.
  if new.status        is distinct from old.status        then raise exception 'forbidden_field:status'        using errcode = '42501'; end if;
  if new.submitted_at  is distinct from old.submitted_at  then raise exception 'forbidden_field:submitted_at'  using errcode = '42501'; end if;
  if new.eligibility   is distinct from old.eligibility   then raise exception 'forbidden_field:eligibility'   using errcode = '42501'; end if;
  if new.session_id    is distinct from old.session_id    then raise exception 'forbidden_field:session_id'    using errcode = '42501'; end if;
  if new.owner_id      is distinct from old.owner_id      then raise exception 'forbidden_field:owner_id'      using errcode = '42501'; end if;
  if new.edition_id    is distinct from old.edition_id    then raise exception 'forbidden_field:edition_id'    using errcode = '42501'; end if;

  return new;
end;
$$;

drop trigger if exists startups_guard_update_trg on public.startups;
create trigger startups_guard_update_trg
  before insert or update on public.startups
  for each row execute function public.startups_guard_update();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. R-C1/R-C3 — rsa_submit_dossier(p_id uuid) : la seule voie de soumission
-- ─────────────────────────────────────────────────────────────────────────────
-- Atomique : verrouille la ligne FOR UPDATE -> vérifie propriétaire / status /
-- édition ouverte / deadline / champs requis -> recalcule l'éligibilité (RPC SQL) ->
-- UPDATE final avec le sentinel de bypass du trigger -> renvoie la ligne mise à jour.
--
-- SECURITY DEFINER : la fonction tourne comme son owner (=> elle bypass RLS et peut
-- écrire le status/submitted_at/eligibility). On épingle search_path = public pour
-- contrer les attaques de shadowing.
--
-- REVOKE public + GRANT authenticated : aucun anon ; un utilisateur connecté ne peut
-- soumettre QUE son propre dossier (vérifié dans le corps via owner_id = auth.uid()).

create or replace function public.rsa_submit_dossier(p_id uuid)
returns public.startups
language plpgsql
security definer
set search_path = public as $$
declare
  v_row    public.startups;
  v_ed     public.editions;
  v_rules  jsonb;
  v_eval   jsonb;
  v_now    timestamptz := now();
begin
  -- 1. Verrouille la ligne et vérifie l'autorisation (propriétaire OU staff).
  select * into v_row from public.startups
   where id = p_id
     and (owner_id = auth.uid()
          or public.has_platform_role('comite')
          or public.has_platform_role('admin'))
   for update;
  if not found then
    raise exception 'not_found_or_forbidden' using errcode = '42501';
  end if;

  -- 2. Status doit être brouillon (pas de replay / pas de submit-après-submit).
  if v_row.status <> 'brouillon' then
    raise exception 'invalid_transition: % -> soumis', v_row.status using errcode = '22023';
  end if;

  -- 3. Édition ouverte ET deadline non dépassée.
  select * into v_ed from public.editions where id = v_row.edition_id;
  if not found then
    raise exception 'edition_not_found' using errcode = '22023';
  end if;
  if v_ed.status <> 'open' then
    raise exception 'edition_closed' using errcode = '22023';
  end if;
  if v_ed.application_close is not null
     and v_now::date > v_ed.application_close then
    raise exception 'application_closed' using errcode = '22023';
  end if;

  -- 4. Champs requis (miroir de src/components/rsa/candidature/validation.js#REQUIRED_FIELDS).
  if v_row.name is null or length(btrim(v_row.name)) = 0
     or v_row.contact_person is null or length(btrim(v_row.contact_person)) = 0
     or v_row.email is null or length(btrim(v_row.email)) = 0
     or v_row.country is null or v_row.country = '__other__' or length(btrim(v_row.country)) = 0
     or v_row.creation_date is null
     or v_row.registration_number is null or length(btrim(v_row.registration_number)) = 0
     or v_row.founders_majority is null
     or v_row.value_proposition is null or length(btrim(v_row.value_proposition)) = 0
     or v_row.business_model is null or length(btrim(v_row.business_model)) = 0
     or v_row.roadmap is null or length(btrim(v_row.roadmap)) = 0
     or v_row.team is null or length(btrim(v_row.team)) = 0
     or v_row.traction is null or length(btrim(v_row.traction)) = 0
     or coalesce(array_length(v_row.sectors, 1), 0) = 0
     or v_row.pitch_deck_path is null or length(btrim(v_row.pitch_deck_path)) = 0
     or v_row.exec_summary_path is null or length(btrim(v_row.exec_summary_path)) = 0
  then
    raise exception 'missing_required_fields' using errcode = '22023';
  end if;

  -- 5. Snapshot canonique de l'éligibilité (souverain serveur).
  v_rules := coalesce(v_ed.eligibility_rules, '{}'::jsonb);
  v_eval  := public.rsa_evaluate_eligibility(v_row, v_rules)
             || jsonb_build_object('evaluated_at', to_jsonb(v_now));

  -- 6. Sentinel pour bypass du trigger startups_guard_update. Local à la transaction.
  perform set_config('rsa.allow_protected_update', 't', true);

  -- 7. Transition atomique.
  update public.startups
     set status       = 'soumis',
         submitted_at = v_now,
         updated_at   = v_now,
         eligibility  = v_eval
   where id = p_id
   returning * into v_row;

  -- 8. Réinitialise le sentinel par précaution (la GUC est de toute façon locale à la tx).
  perform set_config('rsa.allow_protected_update', '', true);

  return v_row;
end;
$$;

revoke all on function public.rsa_submit_dossier(uuid) from public;
grant execute on function public.rsa_submit_dossier(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. R-H2 — Storage : contraindre le segment [5] aux folders connus du module 1.
-- ─────────────────────────────────────────────────────────────────────────────
-- Les policies prep (20260527_rsa_module1_prep.sql) validaient déjà segments [1]/[3]/[4]
-- mais laissaient [5] (kind) libre. Un client forgé pouvait uploader sous .../<sid>/evil/…
-- DOC_KINDS de src/lib/rsa/storage.js liste exactement deux folders : pitch_deck, exec_summary.
-- On drop puis recrée les deux policies WRITE (insert + update) en ajoutant la contrainte.

drop policy if exists dossiers_insert on storage.objects;
create policy dossiers_insert on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'dossiers'
    and (
      (
        (storage.foldername(name))[1] = 'editions'
        and (storage.foldername(name))[3] = 'startups'
        and (storage.foldername(name))[5] in ('pitch_deck','exec_summary')
        and public.owns_startup((storage.foldername(name))[4])
      )
      or public.has_platform_role('comite')
      or public.has_platform_role('admin')
    )
  );

drop policy if exists dossiers_update on storage.objects;
create policy dossiers_update on storage.objects for update
  to authenticated
  using (
    bucket_id = 'dossiers'
    and (
      (
        (storage.foldername(name))[1] = 'editions'
        and (storage.foldername(name))[3] = 'startups'
        and (storage.foldername(name))[5] in ('pitch_deck','exec_summary')
        and public.owns_startup((storage.foldername(name))[4])
      )
      or public.has_platform_role('comite')
      or public.has_platform_role('admin')
    )
  )
  with check (
    bucket_id = 'dossiers'
    and (
      (
        (storage.foldername(name))[1] = 'editions'
        and (storage.foldername(name))[3] = 'startups'
        and (storage.foldername(name))[5] in ('pitch_deck','exec_summary')
        and public.owns_startup((storage.foldername(name))[4])
      )
      or public.has_platform_role('comite')
      or public.has_platform_role('admin')
    )
  );

-- NOTE : dossiers_read et dossiers_delete restent INCHANGÉES (lecture/suppression
-- d'objets déjà postés ; la borne est sur l'écriture). Les policies prep restent
-- en place pour ces deux verbes.
