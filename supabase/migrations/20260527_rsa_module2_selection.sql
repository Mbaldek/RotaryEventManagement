-- Rotary Startup Award — Module 2 (« Espace Sélection ») : décisions comité + validation admin.
--
-- Dépend de :
--   20260527_rsa_platform_foundation.sql      (tables editions/sessions/startups/selection_reviews)
--   20260527_rsa_platform_roles_hardening.sql (app_user_roles + has_platform_role() verrouillés)
--   20260527_rsa_module1_prep.sql             (RLS startups_applicant_*, bucket dossiers)
--   20260527_rsa_module1_hardening.sql        (trigger startups_guard_update + sentinel
--                                              'rsa.allow_protected_update', staff bypass via
--                                              has_platform_role).
--
-- Couvre docs/blueprints/module2-selection.md (§7, §8, §9) :
--   - Étend selection_reviews : is_final boolean, overrides_review_id uuid, CHECK décision.
--   - Index UNIQUE partiel : ≤ 1 ligne is_final=true par startup_id.
--   - Étend startups : finalized_at, finalized_by (écrits par les RPC).
--   - Étend le trigger startups_guard_update existant pour aussi verrouiller finalized_at/by
--     côté candidat (additif : on garde le sentinel + bypass staff intacts).
--   - DROP de la policy `reviews_comite` foundation, SPLIT en
--       reviews_staff_read / reviews_insert / reviews_update / reviews_delete.
--   - RPC SECURITY DEFINER :
--       * rsa_apply_selection_review(p_review_id uuid) — applique l'effet d'une review
--         sur startups.status / session_id / finalized_*. Réservé comité|admin (corps).
--       * rsa_finalize_review(p_review_id uuid)        — admin valide une review existante
--         (passe is_final=true, écrit finalized_*).
--       * rsa_admin_override(p_startup_id, p_decision, p_assigned_session_id, p_rationale,
--                            p_overrides_review_id) — admin écrit une NOUVELLE review
--         is_final=true qui supersède la précédente.
--   - REVOKE all from public + GRANT EXECUTE to authenticated ; le corps enforce le rôle.
--
-- DESIGN — coexistence avec la migration foundation :
--   La policy foundation 'reviews_comite' utilisait FOR ALL. On la DROP puis on crée
--   quatre policies plus fines pour pouvoir distinguer INSERT (comité ne flippe pas is_final)
--   et UPDATE (comité limité à sa propre ligne non-finale).
--
-- DESIGN — partial unique index 'one final per startup' :
--   Le RPC admin_override doit insérer une NOUVELLE ligne is_final=true tout en flippant
--   la précédente is_final=false. L'index partial unique pourrait se déclencher en milieu
--   de transaction (deux is_final=true simultanément). On flip d'ABORD l'ancienne, ENSUITE
--   on insère la nouvelle, dans la même transaction — l'index voit l'état final cohérent.
--
-- Idempotence : create or replace, drop policy if exists, add column if not exists, etc.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. selection_reviews : nouvelles colonnes + contraintes
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.selection_reviews
  add column if not exists is_final boolean not null default false;

alter table public.selection_reviews
  add column if not exists overrides_review_id uuid references public.selection_reviews(id);

-- CHECK contraint sur les valeurs autorisées de decision (open question §12.3 -> YES).
-- On utilise les clés ASCII sans accent ; l'i18n côté UI rend les libellés français.
-- Idempotence : on drop avant si l'objet préexiste.
alter table public.selection_reviews
  drop constraint if exists selection_reviews_decision_check;
alter table public.selection_reviews
  add constraint selection_reviews_decision_check
  check (decision in ('a_examiner','eligible','rejete','liste_attente'));

-- Index partial unique : AU PLUS une ligne is_final par startup_id.
-- Cheap & exact ; la résolution "effective" reste un SELECT trivial côté app.
create unique index if not exists selection_reviews_one_final_per_startup
  on public.selection_reviews(startup_id)
  where is_final;

-- Index secondaire pour les lookups timeline filtrés sur is_final.
create index if not exists selection_reviews_final_idx
  on public.selection_reviews(startup_id, reviewed_at desc) where is_final;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. startups : audit colonnes finalized_at / finalized_by
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.startups
  add column if not exists finalized_at timestamptz;

alter table public.startups
  add column if not exists finalized_by uuid references auth.users(id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. R-C1+ — Extension du trigger startups_guard_update (additif)
-- ─────────────────────────────────────────────────────────────────────────────
-- Le trigger module1-hardening existant verrouille status/submitted_at/eligibility/
-- session_id/owner_id/edition_id côté candidat. On le RECRÉE (create or replace)
-- avec deux contrôles supplémentaires pour finalized_at/finalized_by, en GARDANT le
-- mécanisme de bypass-sentinel + bypass staff intact.

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

  -- 3a. Candidat sur INSERT : les colonnes privilégiées DOIVENT rester aux défauts.
  if TG_OP = 'INSERT' then
    if new.status        is not null and new.status <> 'brouillon'          then raise exception 'forbidden_field:status'       using errcode = '42501'; end if;
    if new.submitted_at  is not null                                         then raise exception 'forbidden_field:submitted_at' using errcode = '42501'; end if;
    if coalesce(new.eligibility, '{}'::jsonb) <> '{}'::jsonb                 then raise exception 'forbidden_field:eligibility'  using errcode = '42501'; end if;
    if new.session_id    is not null                                         then raise exception 'forbidden_field:session_id'   using errcode = '42501'; end if;
    -- Module 2 : finalized_* sont également staff-only.
    if new.finalized_at  is not null                                         then raise exception 'forbidden_field:finalized_at' using errcode = '42501'; end if;
    if new.finalized_by  is not null                                         then raise exception 'forbidden_field:finalized_by' using errcode = '42501'; end if;
    return new;
  end if;

  -- 3b. Candidat sur UPDATE : aucune modification autorisée sur les colonnes privilégiées.
  if new.status        is distinct from old.status        then raise exception 'forbidden_field:status'        using errcode = '42501'; end if;
  if new.submitted_at  is distinct from old.submitted_at  then raise exception 'forbidden_field:submitted_at'  using errcode = '42501'; end if;
  if new.eligibility   is distinct from old.eligibility   then raise exception 'forbidden_field:eligibility'   using errcode = '42501'; end if;
  if new.session_id    is distinct from old.session_id    then raise exception 'forbidden_field:session_id'    using errcode = '42501'; end if;
  if new.owner_id      is distinct from old.owner_id      then raise exception 'forbidden_field:owner_id'      using errcode = '42501'; end if;
  if new.edition_id    is distinct from old.edition_id    then raise exception 'forbidden_field:edition_id'    using errcode = '42501'; end if;
  -- Module 2 : finalized_at/finalized_by sont staff-only.
  if new.finalized_at  is distinct from old.finalized_at  then raise exception 'forbidden_field:finalized_at'  using errcode = '42501'; end if;
  if new.finalized_by  is distinct from old.finalized_by  then raise exception 'forbidden_field:finalized_by'  using errcode = '42501'; end if;

  return new;
end;
$$;

-- Le trigger lui-même est déjà attaché (module1-hardening §2). Pas besoin de DROP/CREATE
-- du trigger (il pointe vers la fonction par nom et reprendra la nouvelle définition).

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS — refonte des policies selection_reviews
-- ─────────────────────────────────────────────────────────────────────────────
-- Drop de la policy foundation (FOR ALL) et split en quatre policies fines.

drop policy if exists reviews_comite on public.selection_reviews;

-- READ : comité, jury et admin. On INCLUT jury (cf. blueprint : jury voit le dossier
-- complet en read-only, donc la timeline aussi pour le contexte) — le candidat reste exclu
-- (open question §12.5 -> NO ; il ne voit que le statut projeté sur sa propre ligne).
drop policy if exists reviews_staff_read on public.selection_reviews;
create policy reviews_staff_read on public.selection_reviews for select
  to authenticated
  using (
    public.has_platform_role('comite')
    or public.has_platform_role('jury')
    or public.has_platform_role('admin')
  );

-- INSERT : comité ou admin. L'inserter DOIT être le reviewer (audit). Le comité ne peut
-- PAS poser is_final=true (réservé admin / RPC). Admin peut insérer librement.
drop policy if exists reviews_insert on public.selection_reviews;
create policy reviews_insert on public.selection_reviews for insert
  to authenticated
  with check (
    (
      public.has_platform_role('comite')
      and reviewer_id = auth.uid()
      and is_final = false
    )
    or public.has_platform_role('admin')
  );

-- UPDATE : comité ne peut modifier QUE sa propre ligne tant qu'elle n'est pas verrouillée
-- (is_final=false). Admin peut modifier n'importe quelle ligne (ex. flip is_final lors d'un
-- override, corrections). Les deux côtés (USING + WITH CHECK) sont restreints pour
-- empêcher un comité de transférer la review à autrui ou d'auto-finaliser sa propre review.
drop policy if exists reviews_update on public.selection_reviews;
create policy reviews_update on public.selection_reviews for update
  to authenticated
  using (
    (
      public.has_platform_role('comite')
      and reviewer_id = auth.uid()
      and is_final = false
    )
    or public.has_platform_role('admin')
  )
  with check (
    (
      public.has_platform_role('comite')
      and reviewer_id = auth.uid()
      and is_final = false
    )
    or public.has_platform_role('admin')
  );

-- DELETE : admin seulement (history is sacred ; un admin préférera un override).
drop policy if exists reviews_delete on public.selection_reviews;
create policy reviews_delete on public.selection_reviews for delete
  to authenticated
  using (public.has_platform_role('admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RPC : rsa_apply_selection_review(p_review_id uuid)
-- ─────────────────────────────────────────────────────────────────────────────
-- Applique l'effet d'une selection_reviews row sur startups.status / session_id /
-- finalized_at / finalized_by. Réservé comité|admin (corps), SECURITY DEFINER pour
-- contourner la RLS startups + le trigger guard via le sentinel.
--
-- Projection statut <- décision :
--   'a_examiner'    -> status = 'en_selection'                     (cluster inchangé / NULL)
--   'eligible'      -> status = 'affecte'                          (assigned_session_id requis ; on
--                                                                  copie aussi vers startups.session_id)
--   'liste_attente' -> status = 'liste_attente'                    (session_id <- NULL)
--   'rejete'        -> status = 'rejete'                           (session_id <- NULL)
--
-- finalized_at / finalized_by ne sont écrits QUE si la review en cours est is_final=true.

create or replace function public.rsa_apply_selection_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = public as $$
declare
  v_review    public.selection_reviews%rowtype;
  v_new_status text;
  v_new_session text;
begin
  -- Garde de rôle (UX is enforced upstream ; le corps est la vraie frontière).
  if not (public.has_platform_role('comite') or public.has_platform_role('admin')) then
    raise exception 'rsa_apply_selection_review: forbidden' using errcode = '42501';
  end if;

  select * into v_review from public.selection_reviews where id = p_review_id;
  if not found then
    raise exception 'review_not_found: %', p_review_id using errcode = '22023';
  end if;

  -- Garde anti-supersession : pour une review non-finale, refuser de projeter si une autre
  -- review existe pour le MÊME dossier qui est soit is_final=true (décision admin souveraine)
  -- soit plus récente (la dernière comité fait foi). Empêche le replay d'une vieille review
  -- pour annuler un override admin ou pour rejouer une décision passée.
  -- Une review is_final passe toujours (la partial-unique garantit qu'elle est seule).
  if not v_review.is_final and exists (
    select 1 from public.selection_reviews
     where startup_id = v_review.startup_id
       and id <> v_review.id
       and (is_final = true or reviewed_at > v_review.reviewed_at)
  ) then
    raise exception 'cannot_apply_superseded_review' using errcode = '42501';
  end if;

  -- Décision -> statut projeté.
  v_new_status := case v_review.decision
    when 'a_examiner'    then 'en_selection'
    when 'eligible'      then 'affecte'
    when 'liste_attente' then 'liste_attente'
    when 'rejete'        then 'rejete'
    else null
  end;
  if v_new_status is null then
    raise exception 'unknown_decision: %', v_review.decision using errcode = '22023';
  end if;

  -- Si 'eligible' : on requiert un assigned_session_id (le UI le force ; double check serveur).
  if v_review.decision = 'eligible' then
    if v_review.assigned_session_id is null then
      raise exception 'eligible_requires_session' using errcode = '22023';
    end if;
    v_new_session := v_review.assigned_session_id;
  else
    v_new_session := null;
  end if;

  -- Pose le sentinel pour bypass le trigger startups_guard_update (local à la transaction).
  perform set_config('rsa.allow_protected_update', 't', true);

  update public.startups
     set status       = v_new_status,
         session_id   = v_new_session,
         finalized_at = case when v_review.is_final then now()      else finalized_at end,
         finalized_by = case when v_review.is_final then auth.uid() else finalized_by end,
         updated_at   = now()
   where id = v_review.startup_id;

  -- Reset défensif (la GUC est de toute façon LOCAL à la tx).
  perform set_config('rsa.allow_protected_update', '', true);
end;
$$;

revoke all on function public.rsa_apply_selection_review(uuid) from public;
grant execute on function public.rsa_apply_selection_review(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RPC : rsa_finalize_review(p_review_id uuid)
-- ─────────────────────────────────────────────────────────────────────────────
-- Admin valide une review existante (le « Valider tel quel ») : flip is_final=true,
-- puis ré-applique l'effet via rsa_apply_selection_review (qui écrira finalized_*).
-- ADMIN-ONLY (corps).

create or replace function public.rsa_finalize_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = public as $$
declare
  v_review public.selection_reviews%rowtype;
begin
  if not public.has_platform_role('admin') then
    raise exception 'rsa_finalize_review: admin only' using errcode = '42501';
  end if;

  select * into v_review from public.selection_reviews where id = p_review_id;
  if not found then
    raise exception 'review_not_found: %', p_review_id using errcode = '22023';
  end if;

  if v_review.is_final then
    -- Déjà finalisée — no-op idempotent (l'admin peut cliquer plusieurs fois).
    return;
  end if;

  -- Le partial-unique index empêcherait un 2e is_final=true sur le même startup_id ;
  -- ce cas (un autre row déjà is_final) doit passer par admin_override, pas par finalize.
  -- On laisse l'index lever l'erreur si l'invariant est violé : c'est volontaire.
  update public.selection_reviews
     set is_final = true
   where id = p_review_id;

  -- Applique sur startups (status / session / finalized_*).
  perform public.rsa_apply_selection_review(p_review_id);
end;
$$;

revoke all on function public.rsa_finalize_review(uuid) from public;
grant execute on function public.rsa_finalize_review(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RPC : rsa_admin_override(...)
-- ─────────────────────────────────────────────────────────────────────────────
-- Admin écrit une NOUVELLE review is_final=true qui supersède la précédente.
-- p_overrides_review_id : id de la review historique remplacée (peut être NULL si
-- l'admin agit directement en l'absence de comité).
-- ADMIN-ONLY (corps).
--
-- Ordre des opérations pour ne pas déclencher l'index partial unique :
--   (a) si overrides_review_id est lui-même is_final=true : on le bascule à false ;
--   (b) on insère la nouvelle row is_final=true ;
--   (c) on appelle apply_selection_review pour projeter sur startups.

create or replace function public.rsa_admin_override(
  p_startup_id uuid,
  p_decision text,
  p_assigned_session_id text,
  p_rationale text,
  p_overrides_review_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public as $$
declare
  v_new_id uuid;
  v_admin_name text;
begin
  if not public.has_platform_role('admin') then
    raise exception 'rsa_admin_override: admin only' using errcode = '42501';
  end if;

  if p_decision not in ('a_examiner','eligible','rejete','liste_attente') then
    raise exception 'invalid_decision: %', p_decision using errcode = '22023';
  end if;
  if p_decision = 'eligible' and p_assigned_session_id is null then
    raise exception 'eligible_requires_session' using errcode = '22023';
  end if;

  -- Bascule l'ancienne final (si fournie ET déjà finale) pour préserver l'invariant
  -- d'unicité du partial-unique index AU SEIN de la même transaction.
  if p_overrides_review_id is not null then
    update public.selection_reviews
       set is_final = false
     where id = p_overrides_review_id
       and is_final = true;
  end if;

  -- Résout un nom stable pour l'audit : profiles.full_name si présent, sinon email JWT.
  select coalesce(p.full_name, auth.jwt() ->> 'email') into v_admin_name
    from public.profiles p
   where lower(p.email) = lower(auth.jwt() ->> 'email')
   limit 1;
  if v_admin_name is null then
    v_admin_name := auth.jwt() ->> 'email';
  end if;

  insert into public.selection_reviews(
    startup_id, reviewer_id, reviewer_name, decision, assigned_session_id,
    rationale, is_final, overrides_review_id
  ) values (
    p_startup_id, auth.uid(), v_admin_name, p_decision, p_assigned_session_id,
    nullif(btrim(coalesce(p_rationale, '')), ''), true, p_overrides_review_id
  )
  returning id into v_new_id;

  -- Projette sur la ligne dossier (status / session / finalized_*).
  perform public.rsa_apply_selection_review(v_new_id);

  return v_new_id;
end;
$$;

revoke all on function public.rsa_admin_override(uuid, text, text, text, uuid) from public;
grant execute on function public.rsa_admin_override(uuid, text, text, text, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTES / OPEN ITEMS (pour l'orchestrateur)
-- ─────────────────────────────────────────────────────────────────────────────
-- (a) Aucune view startups_effective_review n'est créée ici : la résolution est faite
--     côté JS (SelectionReview.effectiveForStartup). Simpler ; une view reste possible
--     en non-breaking si la performance le justifie plus tard.
-- (b) La projection 'a_examiner' -> 'en_selection' avance le statut UNE FOIS qu'un
--     reviewer touche le dossier ; un dossier 'soumis' jamais vu reste 'soumis' jusqu'à
--     la 1re décision (même 'a_examiner'). C'est le comportement spec (§6.5).
-- (c) Quand un comité re-soumet une décision (§6.6), on INSÈRE une NOUVELLE row plutôt
--     que d'UPDATE l'ancienne — l'audit est ainsi complet. L'apply écrase la projection
--     dossier avec la dernière décision (cohérent avec "latest comité = effective").
-- (d) Le trigger startups_guard_update est partagé entre Module 1 et Module 2 ; toute
--     future colonne staff-only devra l'étendre ici aussi.
