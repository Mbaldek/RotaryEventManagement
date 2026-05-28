-- Rotary Startup Award — Module 1 (« Espace Startup ») : préparation de la couche données.
--
-- Dépend de :
--   20260527_rsa_platform_foundation.sql      (tables editions/sessions/startups/selection_reviews)
--   20260527_rsa_platform_roles_hardening.sql (app_user_roles + has_platform_role() verrouillés)
--
-- Couvre les recommandations de docs/hardening/foundation-auth-rls-review.md :
--   H2 : épinglage de owner_id côté candidat (split de startups_write).
--   H3 : éditions draft + seuils d'éligibilité non exposés à l'anon/candidat.
--   C2 : bucket privé 'dossiers' + RLS storage.objects scopée au propriétaire / staff.
-- + besoins fonctionnels du blueprint module1-candidature.md (§6, §12) :
--   colonne submitted_at, contrainte un-dossier-par-candidat, édition 'open' de dev.
--
-- NB : has_platform_role(text) est SECURITY DEFINER et lit la table verrouillée
--      app_user_roles via l'email du JWT. On la réutilise telle quelle partout.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. startups : colonnes + contrainte d'unicité (blueprint §6 / open questions 1 & 2)
-- ─────────────────────────────────────────────────────────────────────────────

-- submitted_at : horodatage de la soumission (status 'brouillon' -> 'soumis').
-- Alimente la timeline de suivi et la logique "modifiable jusqu'à application_close".
alter table public.startups
  add column if not exists submitted_at timestamptz;

-- Un seul dossier par candidat par édition.
-- Index UNIQUE PARTIEL : ne s'applique que lorsque owner_id IS NOT NULL, afin de
-- ne pas bloquer d'éventuels imports back-office orphelins (owner_id NULL) créés
-- par le service_role. Côté candidat, owner_id est toujours épinglé (cf. §2),
-- donc cet index garantit l'unicité réelle pour tous les dossiers self-service.
create unique index if not exists startups_owner_edition_uniq
  on public.startups (owner_id, edition_id)
  where owner_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. H2 — Épinglage de owner_id : split de la policy d'écriture startups
-- ─────────────────────────────────────────────────────────────────────────────
-- La policy foundation `startups_write` (FOR ALL) mélangeait candidat et staff :
-- un candidat pouvait techniquement passer le WITH CHECK tant que owner_id = auth.uid(),
-- mais rien n'isolait clairement les deux chemins ni ne bloquait la création de
-- dossiers orphelins par le comité. On la remplace par des policies explicites.
--
-- IMPORTANT : la lecture (`startups_read`) reste INCHANGÉE (propriétaire OU comité/jury/admin).

drop policy if exists startups_write on public.startups;

-- 2a. CANDIDAT — INSERT : ne peut créer QUE son propre dossier, owner_id épinglé à auth.uid().
--     WITH CHECK owner_id = auth.uid() => impossible d'insérer pour autrui ni en orphelin
--     (NULL = auth.uid() => NULL => refus). Bloque l'IDOR à la création.
create policy startups_applicant_insert on public.startups for insert
  to authenticated
  with check (owner_id = auth.uid());

-- 2b. CANDIDAT — UPDATE : ne peut modifier QUE sa propre ligne, et ne peut pas
--     déplacer la propriété. USING (ligne actuelle m'appartient) +
--     WITH CHECK (ligne après modif m'appartient toujours) => owner_id ne peut
--     être réaffecté à un autre uid (les deux clauses doivent valoir auth.uid()).
create policy startups_applicant_update on public.startups for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- 2c. CANDIDAT — DELETE : ne peut supprimer QUE sa propre ligne.
create policy startups_applicant_delete on public.startups for delete
  to authenticated
  using (owner_id = auth.uid());

-- 2d. STAFF — comité/admin : écriture complète sur tous les dossiers (FOR ALL).
--     (Le jury reste en lecture seule via startups_read ; il ne figure pas ici.)
--     RISQUE RÉSIDUEL (cf. revue H2) : un applicant peut toujours auto-modifier son
--     `status` (ex. se déclarer 'laureat'). Le verrouillage des transitions de statut
--     relève d'un trigger / WITH CHECK plus fin et est laissé à Module 2 (sélection).
create policy startups_staff_write on public.startups for all
  using (public.has_platform_role('comite') or public.has_platform_role('admin'))
  with check (public.has_platform_role('comite') or public.has_platform_role('admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. H3 — Restreindre la lecture des éditions (drafts + seuils d'éligibilité)
-- ─────────────────────────────────────────────────────────────────────────────
-- Avant : editions_read = using (true) => éditions 'draft' (2027 en préparation) et
--         eligibility_rules (seuils CA/levée, dates d'exclusion) lisibles par n'importe qui.
-- On masque les éditions draft à l'anon/candidat ; le staff voit tout.

drop policy if exists editions_read on public.editions;
create policy editions_read on public.editions for select
  using (
    status <> 'draft'
    or public.has_platform_role('admin')
    or public.has_platform_role('comite')
  );

-- TRADE-OFF DOCUMENTÉ (seuils eligibility_rules) :
--   RLS opère ligne par ligne et ne peut pas masquer une COLONNE. eligibility_rules
--   reste donc lisible sur les éditions non-draft (open/selection/…) par le candidat.
--   C'est ACCEPTÉ car :
--     (a) le funnel affiche déjà une prévisualisation d'éligibilité en direct
--         (evaluateEligibility côté client) -> les seuils sont de fait semi-publics ;
--     (b) la véritable décision reste souveraine au comité (critères « indicatifs »).
--   Si un masquage strict des seuils devenait nécessaire, l'approche propre serait
--   une VUE `editions_public` (sans eligibility_rules) + GRANT sélectif, et réserver
--   la colonne brute à une lecture staff. Hors périmètre Module 1.

-- sessions_read (foundation) reste using(true) : données de référence non sensibles
-- (clusters thématiques + dates), volontairement publiques pour la landing. Inchangé.

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. C2 — Bucket privé 'dossiers' + RLS sur storage.objects
-- ─────────────────────────────────────────────────────────────────────────────
-- Les documents de dossier (pitch deck, exec summary) sont confidentiels
-- (RGPD Art. 5/32 + Règlement Art. 10). On crée un bucket PRIVÉ dédié — on ne
-- réutilise PAS le bucket public legacy 'uploads'.
--
-- Convention de chemin (edition-scoped, dossier-scoped) :
--   editions/{edition_id}/startups/{startup_id}/{kind}/{timestamp}_{safeName}.{ext}
-- Segments via storage.foldername(name) (1-indexé) :
--   [1] = 'editions'  [2] = edition_id  [3] = 'startups'  [4] = startup_id  [5] = kind
-- Le segment [4] (startup_id) est la clé d'autorisation : on vérifie que le dossier
-- correspondant appartient à l'appelant.

insert into storage.buckets (id, name, public)
values ('dossiers', 'dossiers', false)
on conflict (id) do nothing;

-- Helper SECURITY DEFINER : l'appelant est-il propriétaire du dossier p_startup_id ?
-- DEFINER => contourne la RLS de startups en lecture pour répondre par oui/non sans
-- divulguer la ligne. STABLE + search_path verrouillé (même patron que has_platform_role).
-- Le cast ::uuid d'un segment de chemin invalide lèverait une erreur ; on l'isole donc
-- via une fonction text -> bool tolérante.
create or replace function public.owns_startup(p_startup_id text)
returns boolean
language plpgsql stable security definer set search_path = public, storage as $$
declare
  v_uuid uuid;
begin
  -- chemin malformé (segment non-uuid) => non autorisé, pas d'exception remontée
  begin
    v_uuid := p_startup_id::uuid;
  exception when others then
    return false;
  end;
  return exists (
    select 1 from public.startups s
    where s.id = v_uuid
      and s.owner_id = auth.uid()
  );
end;
$$;

-- Helper de confort : l'appelant est-il staff lecture-tous (comité/jury/admin) ?
create or replace function public.is_dossier_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_platform_role('comite')
      or public.has_platform_role('jury')
      or public.has_platform_role('admin');
$$;

-- RLS storage.objects (RLS est déjà activée par défaut sur cette table par Supabase).
-- On scope chaque policy au bucket 'dossiers'. On valide aussi la forme du chemin
-- ([1]='editions' [3]='startups') pour éviter qu'un objet hors-convention échappe au contrôle.

-- 4a. SELECT (lecture / téléchargement via signed URL) : propriétaire du dossier OU staff.
drop policy if exists dossiers_read on storage.objects;
create policy dossiers_read on storage.objects for select
  to authenticated
  using (
    bucket_id = 'dossiers'
    and (
      (
        (storage.foldername(name))[1] = 'editions'
        and (storage.foldername(name))[3] = 'startups'
        and public.owns_startup((storage.foldername(name))[4])
      )
      or public.is_dossier_staff()
    )
  );

-- 4b. INSERT (upload) : uniquement le propriétaire dans le chemin de SON dossier
--     (ou staff comité/admin pour back-office). Le jury n'écrit pas.
drop policy if exists dossiers_insert on storage.objects;
create policy dossiers_insert on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'dossiers'
    and (
      (
        (storage.foldername(name))[1] = 'editions'
        and (storage.foldername(name))[3] = 'startups'
        and public.owns_startup((storage.foldername(name))[4])
      )
      or public.has_platform_role('comite')
      or public.has_platform_role('admin')
    )
  );

-- 4c. UPDATE (remplacement / upsert d'un objet existant) : même périmètre que l'insert.
--     USING (objet courant) + WITH CHECK (objet après) verrouillent les deux côtés.
drop policy if exists dossiers_update on storage.objects;
create policy dossiers_update on storage.objects for update
  to authenticated
  using (
    bucket_id = 'dossiers'
    and (
      (
        (storage.foldername(name))[1] = 'editions'
        and (storage.foldername(name))[3] = 'startups'
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
        and public.owns_startup((storage.foldername(name))[4])
      )
      or public.has_platform_role('comite')
      or public.has_platform_role('admin')
    )
  );

-- 4d. DELETE : propriétaire (peut retirer son propre doc avant deadline) ou staff comité/admin.
drop policy if exists dossiers_delete on storage.objects;
create policy dossiers_delete on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'dossiers'
    and (
      (
        (storage.foldername(name))[1] = 'editions'
        and (storage.foldername(name))[3] = 'startups'
        and public.owns_startup((storage.foldername(name))[4])
      )
      or public.has_platform_role('comite')
      or public.has_platform_role('admin')
    )
  );

-- RISQUE / SUBTILITÉ RLS (storage) :
--   * Au PREMIER upload, le startup_id doit déjà exister (ligne brouillon créée par le
--     funnel avant l'étape Documents) — sinon owns_startup() renvoie false et l'insert
--     est refusé. Le blueprint crée bien le brouillon dès le 1er autosave : OK.
--   * Les limites de taille (50 Mo deck / 20 Mo exec summary) ne sont PAS imposables
--     finement par policy ici : la validation taille/type est client-side (storage.js)
--     + le plafond global du bucket. Un plafond dur par type relèverait d'un trigger
--     storage ou d'une Edge Function de réception — hors périmètre Module 1.
--   * Les objets legacy du bucket public 'uploads' ne sont PAS touchés ; ce bucket
--     privé isole les nouveaux dossiers candidats (cf. revue C2, option « bucket frais »).

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Seed : édition de DÉVELOPPEMENT 'dev' (status 'open')
-- ─────────────────────────────────────────────────────────────────────────────
-- 2026 reste 'closed' (archive). Pour tester Module 1 il faut une édition réellement
-- ouverte. On clone les seuils d'éligibilité de 2026 (cohérence règlement) avec des
-- dates de candidature englobant la date du jour (2026-05-27 au moment de l'écriture).
insert into public.editions
  (id, name, year, status, application_open, application_close, selection_date, finale_date, awards_date, eligibility_rules, prize_main, prize_special)
values
  ('dev', 'RSA — Édition de développement', 2026, 'open',
   '2026-01-01', '2026-12-31', '2026-12-15', '2026-12-20', '2026-12-22',
   '{
      "country":           {"behavior": "exclu", "allowed": ["FR","DE"]},
      "created_after":      {"behavior": "exclu", "date": "2020-01-01"},
      "revenue_max":        {"behavior": "flag",  "threshold": 500000},
      "raised_max":         {"behavior": "flag",  "threshold": 800000},
      "founders_majority":  {"behavior": "flag"},
      "registration":       {"behavior": "flag"},
      "docs_required":      {"behavior": "flag",  "docs": ["pitch_deck","exec_summary"]}
    }'::jsonb,
   5000, 1500)
on conflict (id) do nothing;

-- Sessions de dev (clusters + finale) rattachées à l'édition 'dev', pour permettre
-- l'affectation côté Module 2 et la résolution session_id côté suivi de candidature.
insert into public.sessions (id, edition_id, name, theme, kind, session_date, position) values
  ('dev_s1_foodtech',  'dev', 'Foodtech & économie circulaire', 'Foodtech & économie circulaire', 'qualifying', '2026-11-05', 1),
  ('dev_s2_social',    'dev', 'Impact social & Edtech',         'Impact social & Edtech',         'qualifying', '2026-11-12', 2),
  ('dev_s3_tech',      'dev', 'Tech, AI, Fintech & Mobilité',   'Tech, AI, Fintech & Mobilité',   'qualifying', '2026-11-19', 3),
  ('dev_s4_health',    'dev', 'Healthtech & Biotech',           'Healthtech & Biotech',           'qualifying', '2026-11-26', 4),
  ('dev_s5_greentech', 'dev', 'Greentech & Environnement',      'Greentech & Environnement',      'qualifying', '2026-12-03', 5),
  ('dev_final_grande', 'dev', 'Grande Finale',                  'Grande Finale',                  'finale',     '2026-12-20', 6)
on conflict (id) do nothing;
