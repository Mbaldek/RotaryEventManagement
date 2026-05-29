# Module 4c — Public palmarès (`/Resultats`) — RLS migration

> SQL à appliquer avant que la page publique `/Resultats` soit servie à des
> visiteurs anonymes. La page lit **uniquement** la vue `public.public_palmares`,
> qui agrège les colonnes safe d'`editions` + `sessions` + `session_config` (et
> embarque les noms de startups dans `final_ranking`, qui est snapshotté par
> `rsa_publish_session`). **Aucune lecture directe** des tables `startups`,
> `editions`, `sessions`, `session_config` n'est nécessaire côté anon — la vue
> est l'unique surface publique.
>
> Référence : `docs/blueprints/module4-finale-resultats.md` §3.4 (recommandation B).

## Constat actuel (RLS lue le 2026-05-28)

| Table | Policy SELECT | Problème pour `/Resultats` |
| ----- | ------------- | -------------------------- |
| `editions` | `status <> 'draft' OR has_platform_role('admin'|'comite')` | Lisible par anon, MAIS expose toutes les colonnes (dont `eligibility_rules`). Pas de gate sur `public_results_enabled`. |
| `sessions` | `true` | Anon peut tout lire — ok pour le palmarès, mais on ne veut pas exposer les sessions d'éditions non-publiées. |
| `session_config` | `using (true) with check (true)` — **policy fully open** | Anon peut lire `admin_overrides`, `notes`, `teams_link`, `airtable_link`, `jury_pack_path`, etc. **Over-exposure**. |
| `startups` | `owner_id = auth.uid() OR staff` | Anon ne peut RIEN lire — souhaité. Les noms des startups gagnantes transitent uniquement par le snapshot `session_config.final_ranking`. |

## Objectif

- Un seul endpoint anon : `public.public_palmares` (vue SECURITY INVOKER par défaut).
- Gate : édition `public_results_enabled = true` ET session `session_config.status = 'published'`.
- Aucune colonne sensible exposée (pas d'`admin_overrides`, pas de `eligibility_rules`, pas de PII candidat).
- Les autres tables restent inchangées côté policies : on **ne touche pas** `editions_read` / `sessions_read` (les tables internes continuent de servir les rôles auth). La vue suffit comme surface publique.

## SQL à appliquer

```sql
-- Module 4c — vue publique pour /Resultats (anon).
--
-- Une seule lecture pour la page publique : agrège editions + sessions + session_config
-- avec gates `editions.public_results_enabled = true` ET `session_config.status =
-- 'published'`. Embarque le snapshot `final_ranking` jsonb (déjà materialisé par
-- rsa_publish_session : tableau de {startup_id, startup, avg, n, final_rank}).
--
-- Conception : SECURITY INVOKER (défaut postgres). La vue ne contourne PAS la RLS des
-- tables sources — mais comme `editions_read` et `sessions_read` autorisent l'anon en
-- lecture sur status<>'draft' / true, et qu'on ajoute ci-dessous une policy spécifique
-- `session_config_published_public` qui n'expose que les rows session_config publiées,
-- l'anon peut lire la vue intégralement sans accès aux colonnes sensibles.

create or replace view public.public_palmares as
  select
    e.id            as edition_id,
    e.name          as edition_name,
    e.year          as edition_year,
    e.finale_date,
    e.awards_date,
    e.prize_main,
    e.prize_special,
    coalesce(e.finalists_per_session, 1) as finalists_per_session,
    s.id            as session_id,
    s.name          as session_name,
    s.theme         as session_theme,
    s.kind          as session_kind,
    s.session_date,
    s.position      as session_position,
    sc.final_ranking,
    sc.status       as session_status,
    sc.published_at,
    sc.is_final
  from public.editions e
  join public.sessions s on s.edition_id = e.id
  join public.session_config sc on sc.session_id = s.id
  where e.public_results_enabled = true
    and sc.status = 'published';

-- GRANT lecture anon + auth (la vue est gatée par son WHERE).
grant select on public.public_palmares to anon, authenticated;

-- Sécurise session_config : on remplace la policy fully-open par une lecture
-- limitée aux lignes publiées, doublée d'une lecture staff complète.
-- (La policy actuelle `public_all_session_config using (true) with check (true)`
--  laisse n'importe qui INSERT/UPDATE/DELETE — héritage legacy 2026, à corriger.)
alter table public.session_config enable row level security;

drop policy if exists public_all_session_config on public.session_config;

-- Lecture publique : uniquement les rows publiées dont l'édition est publique.
-- Aucune colonne n'est masquée par la policy (PostgreSQL ne fait pas de
-- column-level RLS) ; c'est la VUE public_palmares qui restreint les colonnes
-- exposées à l'anon. Pour limiter le risque de fuite si quelqu'un cible
-- directement session_config en anon, on REVOKE l'accès direct ci-dessous.
create policy session_config_published_public
  on public.session_config for select
  to anon
  using (
    status = 'published'
    and exists (
      select 1 from public.editions e
      join public.sessions s on s.edition_id = e.id
      where s.id = session_config.session_id
        and e.public_results_enabled = true
    )
  );

-- Lecture staff : tout, comme avant.
create policy session_config_staff_read
  on public.session_config for select
  to authenticated
  using (
    public.has_platform_role('admin')
    or public.has_platform_role('comite')
    or public.has_platform_role('jury')
  );

-- Écriture staff (admin/comité) : tout, comme la migration M3 le suppose.
-- Les RPC SECURITY DEFINER (rsa_lock_session / rsa_publish_session /
-- rsa_set_session_live / rsa_set_session_draft) restent l'unique chemin
-- légitime — cette policy couvre les cas où l'admin édite session_order /
-- teams_link / notes directement via le UI SETUP (cf. blueprint §2.1.D).
create policy session_config_staff_write
  on public.session_config for all
  to authenticated
  using (public.has_platform_role('admin') or public.has_platform_role('comite'))
  with check (public.has_platform_role('admin') or public.has_platform_role('comite'));

-- Défense en profondeur : REVOKE l'accès direct anon à session_config (la
-- vue public_palmares passe par les owner privileges de la vue, donc anon
-- n'a PAS besoin d'un GRANT direct sur la table). Idem pour anon sur
-- l'INSERT/UPDATE/DELETE — la table doit être inaccessible directement.
revoke all on public.session_config from anon;

-- editions : on ajoute une policy explicite anon-only qui ne révèle QUE les
-- éditions publiées. L'ancienne policy `editions_read` (status<>'draft' OR
-- staff) reste utilisable côté auth pour l'admin/comité ; on la conserve.
-- (On NE supprime PAS editions_read : l'admin et le comité continuent de
-- lire toutes les éditions non-draft.)
create policy editions_anon_public_only
  on public.editions for select
  to anon
  using (public_results_enabled = true);

-- Remplace la policy `editions_read` pour qu'elle ne s'applique plus à anon
-- (sinon anon hériterait toujours de `status<>'draft'` et lirait les éditions
-- futures avec eligibility_rules exposés). On la restreint à `authenticated`.
drop policy if exists editions_read on public.editions;
create policy editions_read_auth
  on public.editions for select
  to authenticated
  using (
    status <> 'draft'
    or public.has_platform_role('admin')
    or public.has_platform_role('comite')
  );

-- sessions : même logique. Anon ne voit QUE les sessions d'une édition publiée.
drop policy if exists sessions_read on public.sessions;
create policy sessions_anon_public_only
  on public.sessions for select
  to anon
  using (
    exists (
      select 1 from public.editions e
      where e.id = sessions.edition_id
        and e.public_results_enabled = true
    )
  );
create policy sessions_read_auth
  on public.sessions for select
  to authenticated
  using (true);

-- NOTE : `startups` n'a PAS de policy anon. La page publique n'a PAS besoin
-- d'accès direct — les noms des lauréats viennent du snapshot final_ranking
-- (jsonb materialisé par rsa_publish_session). C'est intentionnel : on ne
-- veut JAMAIS exposer contact_email, contact_person, deck_url, etc. à l'anon.
```

## Vérification post-application

```sql
-- En tant qu'anon : on doit voir SEULEMENT les éditions publiées.
set role anon;
select count(*) from public.public_palmares;       -- > 0 si une édition est public_results_enabled
select count(*) from public.editions;              -- = nombre d'éditions public_results_enabled
select count(*) from public.sessions;              -- = sessions de ces éditions uniquement
select count(*) from public.startups;              -- DOIT échouer ou retourner 0
select count(*) from public.session_config;        -- DOIT échouer (REVOKE all)
reset role;
```

## Décisions / trade-offs

1. **Vue plutôt que policy column-mask**. PostgreSQL ne supporte pas la RLS par colonne ; la vue `public_palmares` est la seule façon de cacher `eligibility_rules`, `admin_overrides`, etc. à l'anon. Coût : un objet DB supplémentaire ; bénéfice : surface publique extrêmement réduite (la vue ne SELECT que ~16 colonnes safe).
2. **Le snapshot `final_ranking` est l'unique vecteur de fuite startup-side**. C'est `rsa_publish_session` qui le materialise ; les colonnes embarquées (`startup_id`, `startup` name, `avg`, `n`, `final_rank`) sont volontairement minimales. **Ne pas étendre** ce jsonb sans repasser par cette revue RLS.
3. **`startups` reste sans policy anon**. Toute lecture publique du nom d'une startup passe par `final_ranking` (donc par une session publiée). Aucun risque d'exposer des contacts.
4. **Politique session_config legacy**. La policy `public_all_session_config using (true) with check (true)` est un vestige 2026 qui aurait dû être fermée — cette migration le fait au passage. Aucune régression côté admin/comité (les nouvelles policies `session_config_staff_*` couvrent leurs accès).
5. **Pas de RPC dédiée**. On reste sur la vue (lecture simple via `supabase.from('public_palmares').select('*')`). Une RPC n'apporterait rien et casserait la simplicité.

## Side-effects à valider après application

- L'admin (auth + role admin) doit toujours lire/écrire `session_config` librement (policies `session_config_staff_*` couvrent).
- Le comité doit toujours pouvoir lire `session_config` (jury_pack_path / status — utilisé par M3 sous `is_jury`-equivalent). À tester sur la page `/Jury`.
- Les RPC SECURITY DEFINER (`rsa_lock_session`, `rsa_publish_session`, `rsa_set_session_live`, `rsa_set_session_draft`, `rsa_reset_session_template`) tournent en `security definer` — pas impactées par les changements de policy.
