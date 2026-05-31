-- ─────────────────────────────────────────────────────────────────────────────
-- Héritage compétition → club des règles d'éligibilité (multiclub).
-- Cf. docs/blueprints/club-inheritance-rules-prizes.md §3.
-- ─────────────────────────────────────────────────────────────────────────────
-- AVANT : rsa_submit_dossier évaluait l'éligibilité contre editions.eligibility_rules
-- UNIQUEMENT (cf. 20260527_rsa_module1_hardening.sql:277). La colonne
-- edition_clubs.eligibility_rules (override club) n'était JAMAIS lue → données inertes.
--
-- APRÈS : règles effectives = règles compétition ⊕ override club, merge SHALLOW
-- PAR CRITÈRE via l'opérateur jsonb `||` (droite > gauche). C'est l'exact symétrique
-- du helper JS mergeEligibilityRules() (src/lib/rsa/eligibility.js).
--   * edition_clubs.eligibility_rules est SPARSE : seules les clés (= critères)
--     surchargées par le club y figurent ; une clé absente est héritée.
--   * une clé { "behavior": "off" } DÉSACTIVE un critère hérité (le club assouplit).
--   * startups.club_id NULL (legacy / monoclub sans rattachement) → compétition pure.
--
-- On ajoute aussi un champ d'audit eligibility.rules_scope = 'competition' |
-- 'club_override' dans le snapshot, pour traçabilité.
--
-- Seul le step 5 change ; le reste de la fonction est reproduit à l'identique
-- (CREATE OR REPLACE remplace la version du module1-hardening). SECURITY DEFINER,
-- search_path épinglé, revoke public / grant authenticated conservés.

create or replace function public.rsa_submit_dossier(p_id uuid)
returns public.startups
language plpgsql
security definer
set search_path = public as $$
declare
  v_row      public.startups;
  v_ed       public.editions;
  v_rules    jsonb;
  v_ec_rules jsonb;
  v_eval     jsonb;
  v_now      timestamptz := now();
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
  --    Règles EFFECTIVES = compétition ⊕ override club (merge shallow par critère).
  --    edition_clubs.eligibility_rules est SPARSE ; symétrique du helper JS.
  v_ec_rules := null;
  if v_row.club_id is not null then
    select eligibility_rules into v_ec_rules
      from public.edition_clubs
     where edition_id = v_row.edition_id
       and club_id    = v_row.club_id;
  end if;
  v_rules := coalesce(v_ed.eligibility_rules, '{}'::jsonb)
             || coalesce(v_ec_rules, '{}'::jsonb);
  v_eval  := public.rsa_evaluate_eligibility(v_row, v_rules)
             || jsonb_build_object(
                  'evaluated_at', to_jsonb(v_now),
                  'rules_scope',
                  case
                    when v_ec_rules is not null and v_ec_rules <> '{}'::jsonb
                      then 'club_override'
                    else 'competition'
                  end
                );

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

comment on function public.rsa_submit_dossier(uuid) is
  'Soumission souveraine d''un dossier. V2.5 multiclub : éligibilité évaluée contre '
  'les règles EFFECTIVES = editions.eligibility_rules || edition_clubs.eligibility_rules '
  '(merge shallow par critère). Snapshot eligibility.rules_scope = competition|club_override.';
