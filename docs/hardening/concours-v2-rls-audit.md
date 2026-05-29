# Audit RLS & Hardening — Page `/Concours` v2

**Date :** 2026-05-29
**Scope :** vitrine éditoriale `/Concours` (V2.5 → v2 enrichie) — dashboard
public en lecture seule du concours Rotary Startup Award (RSA), accessible à
tout utilisateur authentifié (rôles : `master_admin`, `competition_admin`,
`club_admin`, `comite`, `jury`, `candidat`).

**Sources analysées :**
- `supabase/migrations/20260531_rsa_v25_concours_dashboard.sql` (411 lignes)
- `src/pages/Concours.jsx` (246 lignes)
- `src/components/rsa/concours-dashboard/useConcours.js` (231 lignes)
- `docs/hardening/rls-audit-v3.md` (référentiel V3 plateforme)
- `docs/hardening/foundation-auth-rls-review.md` (revue foundation auth/RLS)

**Type de revue :** documentation + recommandations. Pas d'application de
correctif dans cette passe. Toute modification suggérée doit passer par une
migration explicite revue par le master_admin.

**TL;DR — verdict global :** la surface actuelle (V2.5 livrée le 2026-05-31)
est **saine pour authenticated** mais la **v2 enrichie** (couleurs thème,
podium, avatars jurés en overview, `final_ranking` rendu visible côté
candidat) **introduit un risque de fuite de `final_ranking` avant
publication**. Trois recommandations bloquantes (R1, R2, R5) avant d'élargir
l'expo en v2.

---

## 1. Surface d'exposition actuelle (V2.5 livrée)

### 1.1 Carte de la lecture

La page `/Concours` consomme la donnée par **trois chemins** distincts —
chacun avec sa propre frontière de sécurité :

| # | Chemin | Frontière | Cible RLS |
|---|--------|-----------|-----------|
| A | RPC `rsa_concours_edition_overview(p_edition_id)` | `SECURITY DEFINER` + `auth.uid() IS NOT NULL` + `GRANT EXECUTE TO authenticated` | bypass RLS, exposition contrôlée colonne-par-colonne |
| B | RPC `rsa_concours_session_detail(p_session_id)` | `SECURITY DEFINER` + `auth.uid() IS NOT NULL` + `GRANT EXECUTE TO authenticated` | bypass RLS, exposition contrôlée colonne-par-colonne |
| C | Fallback TanStack côté client (`useConcours.js`) | RLS standard sur `editions`, `sessions`, `session_config`, `startups`, `platform_jury_assignments`, `profiles`, `platform_jury_profiles`, `prizes` | la RLS s'applique normalement (pas de bypass) |

Le **chemin C est un fallback de dev** : il s'active uniquement si la RPC
renvoie `42883` (function not found) ou `PGRST202`. En production avec
migration appliquée, il n'est jamais emprunté. C'est important pour
l'analyse : on doit **vérifier que la RLS sous-jacente est cohérente avec
les RPC**, sinon on a deux modèles de sécurité différents selon le déploiement.

### 1.2 Auth gate côté front

`Concours.jsx:143` :

```jsx
if (!authLoading && !isAuthenticated) {
  return <Navigate to="/Login" replace />;
}
```

C'est un gate **client-only** — donc non-sécuritaire en soi (un curl avec
token anon bypasserait). La vraie barrière est dans les RPC :

```sql
IF auth.uid() IS NULL THEN
  RAISE EXCEPTION 'Authentication requise pour consulter le dashboard.'
    USING ERRCODE = '42501';
END IF;
```

Couplé à `REVOKE ALL ... FROM PUBLIC` + `GRANT EXECUTE TO authenticated`,
on a une frontière serveur bétonnée : `anon` ne peut pas appeler le RPC, et
même si la migration de GRANT régressait, le guard `auth.uid() IS NULL`
rejetterait l'appel. **Verdict : OK.**

### 1.3 Schéma de confiance par rôle

| Rôle | Peut accéder à `/Concours` ? | Données vues |
|------|------------------------------|--------------|
| `anon` | **NON** (gate front + REVOKE RPC) | aucune |
| `candidat` | OUI (post magic-link) | tout ce que le RPC renvoie — agrégats + nom finaliste |
| `jury` | OUI | idem |
| `comite` | OUI | idem |
| `club_admin` | OUI | idem |
| `competition_admin` | OUI | idem |
| `master_admin` | OUI | idem |

**Aucune différenciation par rôle dans les RPC actuels.** Tout authentifié
voit la même chose. C'est intentionnel pour V2.5 (vitrine éditoriale
"transparente"). Pour la v2, voir §3.

---

## 2. Audit colonne-par-colonne de l'exposition actuelle

### 2.1 `editions` — via `rsa_concours_edition_overview`

```sql
SELECT to_jsonb(e) - 'eligibility_rules' INTO v_edition
  FROM public.editions e
 WHERE e.id = p_edition_id;
```

**Exposé :** `id`, `year`, `name`, `status`, `finalists_per_session`,
`finale_date`, etc. — tout `to_jsonb(e)` SAUF `eligibility_rules`.

| Colonne | Sensibilité | Exposée ? | Verdict |
|---------|-------------|-----------|---------|
| `id`, `year`, `name`, `status` | publique | oui | OK |
| `finalists_per_session` | publique | oui | OK |
| `finale_date` | publique | oui | OK |
| `eligibility_rules` | interne admin (seuils CA/levée internes) | **non** (`- 'eligibility_rules'`) | OK |

**Note :** `editions.eligibility_rules` est *déjà world-readable* via la
policy `editions_read` (cf. rls-audit-v3 §`editions`) — la vue admin de la
candidature les affiche d'ailleurs en preview. Le `- 'eligibility_rules'`
dans le RPC est donc **défensif et pas strictement nécessaire** : tant qu'on
ne le retire pas, on garde une marge.

**Verdict : OK.**

### 2.2 `clubs` + `edition_clubs` — via `rsa_concours_edition_overview`

```sql
jsonb_build_object(
  'id', c.id, 'name', c.name, 'country', c.country, 'language', c.language,
  'attachment', jsonb_build_object(
    'attached_at', ec.attached_at,
    'has_overrides', (ec.eligibility_rules <> '{}'::jsonb)
  )
)
```

**Exposé :** `id`, `name`, `country`, `language`, `attached_at`,
`has_overrides` (booléen calculé).

| Colonne | Sensibilité | Exposée ? | Verdict |
|---------|-------------|-----------|---------|
| `clubs.id/name/country/language` | publique (cf. policy `clubs_read`) | oui | OK |
| `edition_clubs.attached_at` | publique | oui | OK |
| `edition_clubs.eligibility_rules` (JSON brut) | interne admin | **non** (seul le booléen `has_overrides` est exposé) | OK |

**Verdict : OK.** Le booléen `has_overrides` est l'abstraction
appropriée — il signale "ce club a des règles dérogatoires" sans révéler
les seuils.

### 2.3 `sessions` + `session_config` — via `rsa_concours_edition_overview`

```sql
jsonb_build_object(
  'id', sess.id, 'edition_id', sess.edition_id, 'club_id', sess.club_id,
  'name', sess.name, 'theme', sess.theme, 'kind', sess.kind,
  'session_date', sess.session_date, 'position', sess.position,
  'config', jsonb_build_object(
    'status', cfg.status,
    'jury_pack_path', cfg.jury_pack_path
    -- final_ranking volontairement exclu
  )
)
```

**Exposé :** colonnes `sessions` standards + `session_config.status` +
`session_config.jury_pack_path`. **`final_ranking` exclu volontairement.**

| Colonne | Sensibilité | Exposée ? | Verdict |
|---------|-------------|-----------|---------|
| `sessions.*` | déjà publique via RLS `sessions_read` | oui | OK |
| `session_config.status` | publique (état de la session) | oui | OK |
| `session_config.jury_pack_path` | path bucket "uploads" — lien vers PDF pack jurés | oui | **ATTENTION** (cf. §5) |
| `session_config.final_ranking` (overview) | sensible avant publication | **non** | OK |
| `session_config.session_order` (overview) | metadata interne | non | OK |

**Verdict : OK** pour l'overview. Le path `jury_pack_path` est un chemin de
bucket "uploads" (public) — donc une fois leaké, accessible URL directe. Voir
§5 pour la mitigation.

### 2.4 `startups` — comptages dans overview, détail dans session_detail

**Overview (`rsa_concours_edition_overview`) :**
- `startups_by_club` : `{ "<club_id>": <int count> }`
- `startups_by_session` : `{ "<session_id>": <int count> }`
- `finalists_by_source_session` : `{ "<session_id>": { startup_name, status } }`
- `finalists` (liste plate) : `[ { startup_name, source_session_id, source_session_name } ]`
- `finalists_count` : `<int>`

**Détail (`rsa_concours_session_detail`) :**
```sql
jsonb_build_object(
  'id', s.id,
  'name', s.name,
  'status', s.status,
  'pitch_deck_path', s.pitch_deck_path,
  'exec_summary_path', s.exec_summary_path,
  'sectors', s.sectors
)
```

| Colonne | Sensibilité | Exposée ? | Verdict |
|---------|-------------|-----------|---------|
| `startups.id`, `name`, `status` | publique côté concours | oui | OK |
| `startups.sectors` | publique (industrie/secteur) | oui (detail only) | OK |
| `startups.pitch_deck_path` | path bucket — fichier confidentiel | oui (detail only) | **ATTENTION** (cf. §5) |
| `startups.exec_summary_path` | path bucket — fichier confidentiel | oui (detail only) | **ATTENTION** (cf. §5) |
| `startups.owner_id` | identité fondateur | **non** | OK |
| `startups.email`, `telephone` | PII | **non** | OK |
| `startups.creation_date`, `revenue`, `funding_raised` | data eligibilité | **non** | OK |

**Verdict colonnes : OK.** Mais **les `*_path` sont des chemins bucket
publics** — c'est le pattern legacy V1, hérité du JuryHub. Voir §5 pour
le risque storage et la mitigation.

**Note v2 (anticipée) :** quand on enrichit la card session avec un visuel
"les 5 startups en lice", on est tenté d'exposer `startups[].name` dans
l'overview (pas seulement count). À ce moment-là, **réévaluer** : un candidat
verrait alors la liste des startups concurrentes dès la home `/Concours`,
sans cliquer. Côté RGPD/concours c'est défendable (les noms de startups sont
publics), mais à confirmer avec le métier RSA.

### 2.5 `platform_jury_assignments` + `profiles` + `platform_jury_profiles`

**Overview :**
- `jurors_by_session` : `{ "<session_id>": <int count distinct jury_user_id> }`

**Détail :**
```sql
jsonb_build_object(
  'user_id', pja.jury_user_id,
  'full_name', p.full_name,
  'qualite', pjp.qualite,
  'organisation', pjp.organisation,
  'photo_path', pjp.photo_path
)
```

| Colonne | Sensibilité | Exposée ? | Verdict |
|---------|-------------|-----------|---------|
| `platform_jury_assignments.jury_user_id` | identité juré | oui (detail only) | **ATTENTION** (cf. §2.5.1) |
| `profiles.full_name` | PII faible | oui (detail only) | OK (déjà visible via LiveTab co-jurys) |
| `platform_jury_profiles.qualite/organisation` | PII pro | oui (detail only) | OK |
| `platform_jury_profiles.photo_path` | path bucket — photo personnelle | oui (detail only) | **ATTENTION** (cf. §5) |
| `profiles.email` | PII forte | **non** | OK |
| `profiles.telephone`, autres | PII | **non** | OK |

#### 2.5.1 Risque `user_id` exposé

**Question soulevée dans le scope :** un `user_id` côté front peut-il être
joint à une autre table pour révéler l'email ?

**Analyse :**
- `profiles.id == auth.users.id`. Donc `user_id` côté front = `profiles.id`.
- Pour lire `profiles.email` depuis un `user_id`, il faudrait que la RLS de
  `profiles` permette à un authentifié de faire `SELECT email FROM profiles
  WHERE id = '<jury_user_id>'`.
- Or, **C1 du foundation-review reste à valider** : `profiles` n'a (au moment
  de la review du 2026-05-27) aucune migration qui *enable* RLS. Si la RLS
  par défaut PostgREST autorise les SELECT à tout authenticated, **alors oui,
  un candidat curieux pourrait `select * from profiles where id = '<juror_uid>'`
  et obtenir l'email du juré.**
- C'est un **risque hérité** de C1, pas introduit par les RPC concours. Mais
  **les RPC concours exposent un nouveau `user_id`** dans le payload front,
  ce qui élargit le vecteur d'attaque (avant V2.5, un candidat n'avait
  jamais de raison de connaître un `user_id` juré).

**Mitigations possibles :**

- **Option A (recommandée) :** ne **pas** exposer `user_id` dans `session_detail`.
  Le front n'en a pas besoin pour rendre une card "avatar + nom + qualité +
  organisation". Si un jour il faut un join (ex: highlight du juré qui
  consulte sa propre card), faire le calcul **côté RPC** et renvoyer un flag
  `is_self` booléen.

  ```sql
  -- patch suggéré dans rsa_concours_session_detail
  jsonb_build_object(
    -- 'user_id', pja.jury_user_id,  -- ❌ supprimer
    'is_self', (pja.jury_user_id = auth.uid()),
    'full_name', p.full_name,
    'qualite', pjp.qualite,
    'organisation', pjp.organisation,
    'photo_path', pjp.photo_path
  )
  ```

- **Option B :** garder `user_id`, mais corriger C1 en amont (RLS sur
  `profiles` qui interdit aux candidats de lire les emails d'autres profiles).
  C'est la mitigation systémique. Tant qu'elle n'est pas livrée, Option A
  est obligatoire.

**Recommandation : R5 — supprimer `user_id` du payload `session_detail`** (cf. §6).

---

## 3. Audit v2 — nouvelles colonnes/données proposées

### 3.1 `session_config.theme_color text null` (override admin couleur)

**Proposition :** ajouter une colonne `theme_color` (hex `#RRGGBB`) à
`session_config` pour que le master_admin ou competition_admin puisse
forcer une couleur d'accent par session (override de la palette navy/gold
par défaut).

**Risque RLS :** **aucun**. Donnée purement visuelle, pas de PII. La policy
existante `session_config_*` couvre déjà le write admin-only.

**À ajouter dans les RPC :**

```sql
-- dans rsa_concours_edition_overview, branche sessions:
'config', jsonb_build_object(
  'status', cfg.status,
  'jury_pack_path', cfg.jury_pack_path,
  'theme_color', cfg.theme_color   -- nouveau
)

-- idem dans rsa_concours_session_detail.
```

**Validation requise :**
- CHECK constraint format hex : `CHECK (theme_color IS NULL OR
  theme_color ~* '^#[0-9a-f]{6}$')`.
- Pas de stockage de SVG/CSS arbitraire (XSS). Une couleur hex est inerte.

**Verdict v2 : OK avec CHECK regex.**

### 3.2 `final_ranking` rendu visible aux candidats sur `/Concours`

**Contexte actuel :** `final_ranking` est lu uniquement via
`rsa_concours_session_detail` (jamais dans overview). Le commentaire de la
migration dit :

> *"final_ranking volontairement exclu (poids lourd ; le drawer le lit
> séparément si besoin via rsa_concours_session_detail)."*

**Risque introduit par v2 :** la page enrichie veut afficher un podium 1-2-3
sur la card session quand elle est terminée. Donc le `final_ranking` va
remonter dans l'overview (ou être lu agressivement via session_detail).

**Problème :** `final_ranking` peut exister **avant** que les organisateurs
le publient officiellement (workflow : `draft` → `live` → `locked` →
`published`). Si on l'expose dès qu'il est `non null`, on leak le palmarès
en avant-première à tous les authentifiés (candidats inclus).

**Mitigation obligatoire — R2 :** gate `final_ranking` sur `status = 'published'`
**dans les deux RPC**.

```sql
-- dans rsa_concours_session_detail
SELECT jsonb_build_object(
  'status', cfg.status,
  'jury_pack_path', cfg.jury_pack_path,
  'session_order', cfg.session_order,
  -- final_ranking gated:
  'final_ranking', CASE
    WHEN cfg.status = 'published' THEN cfg.final_ranking
    ELSE NULL
  END
)
INTO v_config
FROM public.session_config cfg
WHERE cfg.session_id = p_session_id;
```

Et de même si on veut le pousser dans l'overview :

```sql
-- dans rsa_concours_edition_overview, branche sessions:
'config', jsonb_build_object(
  'status', cfg.status,
  'jury_pack_path', cfg.jury_pack_path,
  'theme_color', cfg.theme_color,
  'final_ranking', CASE
    WHEN cfg.status = 'published' THEN cfg.final_ranking
    ELSE NULL
  END
)
```

**Note legacy `/RsaScore` :** le scope mentionne que `final_ranking` est
"déjà accessible aux jurés via /RsaScore". C'est vrai, mais via une page
réservée aux jurés assignés (gate par `platform_jury_assignments`). Ici, on
parle d'une page accessible à **tous les authentifiés candidats inclus** —
gate beaucoup plus large. Le seul critère défendable côté concours est
`status = 'published'`.

**Verdict v2 : ISSUE bloquante si non gaté. R2 est obligatoire avant
exposition.**

### 3.3 Photos jurés en aperçu dans l'overview

**Proposition :** afficher un row d'avatars jurés (sample 3-5) sur la card
session de l'overview, sans cliquer pour ouvrir le drawer.

**Option A — Exposer `photo_path` d'un sample dans overview :**

```sql
-- dans rsa_concours_edition_overview
SELECT coalesce(jsonb_object_agg(session_id, sample), '{}'::jsonb)
  INTO v_juror_avatars_sample
  FROM (
    SELECT pja.session_id,
           jsonb_agg(
             jsonb_build_object('photo_path', pjp.photo_path, 'full_name', p.full_name)
             ORDER BY p.full_name
           ) FILTER (WHERE pjp.photo_path IS NOT NULL) AS sample
      FROM public.platform_jury_assignments pja
      LEFT JOIN public.profiles p ON p.id = pja.jury_user_id
      LEFT JOIN public.platform_jury_profiles pjp ON pjp.user_id = pja.jury_user_id
      JOIN public.sessions sess ON sess.id = pja.session_id
     WHERE sess.edition_id = p_edition_id
     GROUP BY pja.session_id
     LIMIT 5
  ) g;
```

**Option B — Lazy-load via `session_detail` au click drawer :**

Aucune modif RPC overview. Le `session_detail` actuel renvoie déjà
`jurors[].photo_path` (cf. §2.5).

**Comparaison :**

| Critère | Option A (overview) | Option B (lazy) |
|---------|---------------------|-----------------|
| Latence perçue | Avatars instant on page load | 200-400ms au click |
| Charge serveur | +1 join sur edition_overview (×N sessions) | RPC par drawer ouvert |
| Surface d'exposition | **Élargie** : tous les photo_path remontent au chargement de page, même sans cliquer | Limitée à la session ouverte |
| Risque scrape/crawler | Plus élevé (1 call → tous les jurés de toutes les sessions) | Plus faible (1 call = 1 session) |
| Cache utilité | Bon (5 min staleTime éditions) | Bon (30s session_detail) |

**Recommandation : Option B (lazy).** Argument sécurité : moins de
photo_path exposés simultanément réduit la surface d'attaque pour un agent
malveillant qui scraperait l'API. La latence drawer-open de 200ms est
acceptable côté UX (le drawer a déjà un spinner).

Si la PM insiste sur l'Option A, contraintes obligatoires :
- `LIMIT 3` dur dans le RPC (pas 5).
- Pas de `user_id` dans le payload sample (cf. R5).
- Toujours filtrer sur sessions de l'edition demandée (déjà via le JOIN).

**Verdict v2 : Option B recommandée. Option A acceptable avec LIMIT 3 + R5.**

---

## 4. Gating recommandé — synthèse

### 4.1 Garde-fou auth (déjà en place — OK)

```sql
IF auth.uid() IS NULL THEN
  RAISE EXCEPTION 'Authentication requise...' USING ERRCODE = '42501';
END IF;
```

Présent dans les deux RPC. **Conserver tel quel.**

### 4.2 Statut session — nouveau gating obligatoire pour v2

| Donnée | Condition d'exposition |
|--------|------------------------|
| `session_config.status` | toujours (vitrine) |
| `session_config.jury_pack_path` | toujours (le pack est partagé jurés/comité — déjà public via bucket) |
| `session_config.theme_color` | toujours (visuel) |
| `session_config.session_order` | toujours (ordre de passage) |
| **`session_config.final_ranking`** | **`status = 'published'` uniquement** (R2) |

### 4.3 `platform_jury_assignments` — bornage edition

Dans l'overview actuel :

```sql
FROM public.platform_jury_assignments pja
JOIN public.sessions sess ON sess.id = pja.session_id
WHERE sess.edition_id = p_edition_id
```

Le JOIN sur `sessions` borne déjà l'expo aux sessions de l'edition
demandée. **Conserver.** Pas de leak cross-edition.

### 4.4 Bornage `auth.uid()` à un rôle ?

**Question :** faut-il restreindre `/Concours` à un sous-ensemble de rôles ?

**Réponse :** non, conformément au scope. La page est volontairement
**transversale** (vitrine ouverte à tout authentifié). Tant que les
données exposées sont publiques par nature (nom de startup, nom de juré,
chemins documents publics du bucket "uploads"), le gating par rôle ne
apporte rien. Si la R5 est appliquée et que R2 gate le palmarès, le risque
candidat-curieux est neutralisé.

---

## 5. Storage bucket "uploads" — analyse de risque

### 5.1 Constat

Tous les `*_path` exposés (`pitch_deck_path`, `exec_summary_path`,
`jury_pack_path`, `photo_path`) sont des chemins relatifs **dans le bucket
`storage.uploads`**. Le front les résout via :

```js
supabase.storage.from('uploads').getPublicUrl(path)
```

→ URL de la forme `https://<project>.supabase.co/storage/v1/object/public/uploads/<path>`.

### 5.2 Le bucket est public

Cf. **C2 du foundation-review** :

> *"The `uploads` Storage bucket is **public**. Pitch decks, exec summaries
> and candidate PII documents are served via unauthenticated `getPublicUrl`
> / `/object/public/uploads/...`. No Storage RLS restricts access to the
> dossier owner + comité/jury/admin. RGPD Art. 5/32 + RSA Règlement Art. 10
> violation."*

**Conséquence pour `/Concours v2` :** chaque `*_path` exposé par les RPC
est **immédiatement utilisable** par n'importe qui qui devine ou intercepte
le path, **sans token**. Le bucket public est **la vraie frontière**, pas
les RPC.

### 5.3 Mitigation — R3

**Court terme (v2 ship) :**
1. Confirmer que les pitch decks de candidats sont actuellement bien
   considérés comme "diffusables aux jurés authentifiés" par le règlement
   RSA (Art. 10).
2. Si oui, accepter la dette (statu quo legacy V1).
3. Si non, **basculer le bucket en privé** avant la v2 et passer tous les
   appels en `createSignedUrl(path, { expiresIn: 3600 })`.

**Moyen terme :**
- Migrer vers un bucket privé `uploads-private/` (ou réorganiser les
  préfixes : `uploads/public/` pour les visuels OK public, `uploads/private/`
  pour les decks/PII).
- Ajouter des Storage RLS policies sur le bucket privé : path-scopées par
  startup_id (owner + comité + jury assigné).
- Côté RPC concours : renvoyer une **signed URL pré-générée** au lieu d'un
  path nu, avec TTL 1h.

```sql
-- esquisse de helper RPC pour signed URL (Supabase extension http requise)
-- ou alternative : faire l'expo via une edge function qui signe.
```

**Verdict : ISSUE héritée — bloquante avant ouverture v2 à un public élargi
(notamment candidats hors du club ayant déposé un dossier).**

### 5.4 `photo_path` jurés

Risque similaire mais moindre — les photos jurés sont déjà affichées
publiquement (page DevenirJury, marketing). On peut considérer
`photo_path` jurés comme intentionnellement public, séparé des
pitch_deck_path candidats. Reflèter ce statut dans la structure de bucket
(préfixe `uploads/jury-photos/` public, `uploads/dossiers/` privé).

---

## 6. Checklist pré-deploy v2

### 6.1 Migration

- [ ] **R1** — Migration v2 contient `REVOKE ALL FROM PUBLIC` + `GRANT
      EXECUTE TO authenticated` pour toute nouvelle RPC ; `anon` jamais
      mentionné.
- [ ] **R2** — `final_ranking` retourné uniquement si
      `session_config.status = 'published'`, dans `rsa_concours_session_detail`
      et `rsa_concours_edition_overview` si on l'y ajoute.
- [ ] Migration ajoute `session_config.theme_color text NULL` avec CHECK
      regex hex.
- [ ] Aucune nouvelle exposition de `eligibility_rules`, `owner_id`,
      `email`, `telephone`, `scores` individuels.

### 6.2 RPC

- [ ] **R5** — Retirer `user_id` du payload `jurors[]` dans
      `rsa_concours_session_detail`. Remplacer par `is_self` booléen calculé
      côté RPC.
- [ ] Vérifier que toute clause `WHERE` qui touche
      `platform_jury_assignments` est bornée par un JOIN sur `sessions` +
      filtre `edition_id` (ou `session_id` direct).
- [ ] Si Option A photos jurés en overview retenue : `LIMIT 3` dur dans le
      sous-select.

### 6.3 Storage

- [ ] **R3** — Décision documentée : bucket `uploads` reste public OU
      bascule en privé. Si privé, RPC retournent signed URLs (TTL 1h max).
- [ ] Policies Storage `storage.objects` revues pour le bucket `uploads`
      (cf. rls-audit-v3 §Storage).
- [ ] Path conventions documentées : `uploads/dossiers/<startup_id>/...`
      vs `uploads/jury-photos/...` vs `uploads/packs/...`.

### 6.4 Tests fonctionnels

- [ ] **Test 1 — Candidat isolé :** se logger comme candidat ayant déposé
      sur l'edition `rsa-2026`. Naviguer `/Concours`. Vérifier que :
  - les counts startups par session sont visibles ;
  - **aucun nom de startup tierce** ne fuite (sauf `finalists[]` après
    publication, statut `finaliste`/`laureat`) ;
  - `pitch_deck_path` d'autres candidats n'est jamais exposé via
    l'overview ;
  - l'ouverture du drawer d'une session affiche les noms de startups
    (acceptable : c'est le scope vitrine).
- [ ] **Test 2 — Juré curieux :** se logger comme `jury` assigné à
      session A. Ouvrir drawer session B (où il n'est pas juré). Vérifier
      qu'on voit `jurors[].full_name` + `qualite` + `organisation` + photo
      MAIS PAS `user_id` (R5) ni `email`.
- [ ] **Test 3 — Anti-pré-leak palmarès :** session `status = 'live'`,
      `final_ranking` rempli en DB. Ouvrir le drawer côté candidat ; vérifier
      que `final_ranking` revient `NULL`. Passer `status = 'published'`,
      reload ; vérifier que `final_ranking` est servi.
- [ ] **Test 4 — Anon kick-out :** curl `POST /rest/v1/rpc/rsa_concours_edition_overview`
      sans JWT → `42501` ou `401`. Avec JWT anon → idem.
- [ ] **Test 5 — Edition draft :** edition `status = 'draft'` non listée
      par `useEditionsAvailable` (filtre client OK pour la vitrine ; staff
      verrait mais c'est désactivé côté Concours.jsx).
- [ ] **Test 6 — Fallback client :** désactiver les RPC temporairement
      (renommer côté DB) ; vérifier que le fallback `useConcours.js` ne
      remonte PAS de colonnes sensibles (`startups.email`,
      `profiles.email`) qui passeraient via la RLS standard si elle est
      trop permissive. **Si R5 et C1 ne sont pas patchés, le fallback est
      moins sécurisé que la RPC** → considérer désactiver le fallback en
      prod (`if (import.meta.env.PROD) throw error`).

### 6.5 Observabilité

- [ ] Logs Supabase : monitorer le taux d'erreur `42501` sur les deux
      RPC (signal de tentatives anon).
- [ ] Logs `42883` / `PGRST202` → indique fallback client emprunté →
      enquêter (migration manquante en prod).

---

## 7. Synthèse des recommandations

| ID | Sévérité | Description | Bloquant v2 ? |
|----|----------|-------------|---------------|
| **R1** | Critical | `REVOKE/GRANT` cohérents, `anon` exclu de toute nouvelle RPC v2. | Oui |
| **R2** | **High** | Gate `final_ranking` sur `session_config.status = 'published'` dans toutes les expositions. | **Oui** |
| R3 | High | Décision bucket `uploads` public vs privé documentée et appliquée. Dette héritée C2. | Oui (décision écrite) |
| R4 | Medium | `session_config.theme_color` ajouté avec CHECK regex hex `^#[0-9a-f]{6}$`. | Non (mais à appliquer si la colonne arrive) |
| **R5** | High | Retirer `user_id` du payload `jurors[]` (`rsa_concours_session_detail`). Remplacer par `is_self`. | **Oui** |
| R6 | Medium | Option B (lazy-load photos jurés via drawer) plutôt qu'Option A. | Non (préférence design + sécu) |
| R7 | Low | Désactiver le fallback client TanStack en production (`import.meta.env.PROD`). | Non |
| R8 | Low | Monitoring logs `42501` / `42883` / `PGRST202` mis en place. | Non |

**Bloquants v2 (3) :** R1, R2, R5. **R3 doit être tranché par le master_admin
+ DPO** avant ouverture v2 à un public élargi.

---

## 8. Annexe — diff SQL proposé pour la migration v2

```sql
BEGIN;

-- ── R4 : nouvelle colonne theme_color avec validation ────────────────────
ALTER TABLE public.session_config
  ADD COLUMN IF NOT EXISTS theme_color text NULL
    CHECK (theme_color IS NULL OR theme_color ~* '^#[0-9a-f]{6}$');

COMMENT ON COLUMN public.session_config.theme_color IS
  'V2.5 vitrine : override couleur d''accent par session (hex #RRGGBB). Override visuel uniquement, pas de PII.';

-- ── R2 + R5 : refonte rsa_concours_session_detail ────────────────────────
CREATE OR REPLACE FUNCTION public.rsa_concours_session_detail(p_session_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_session jsonb;
  v_config jsonb;
  v_startups jsonb;
  v_jurors jsonb;
  v_status text;
BEGIN
  IF p_session_id IS NULL OR length(trim(p_session_id)) = 0 THEN
    RAISE EXCEPTION 'p_session_id ne peut pas être vide.' USING ERRCODE = '22023';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication requise.' USING ERRCODE = '42501';
  END IF;

  SELECT to_jsonb(sess) INTO v_session
    FROM public.sessions sess
   WHERE sess.id = p_session_id;

  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Session % introuvable.', p_session_id USING ERRCODE = '23503';
  END IF;

  SELECT cfg.status INTO v_status FROM public.session_config cfg
   WHERE cfg.session_id = p_session_id;

  -- R2 : final_ranking gaté sur status='published'
  -- R4 : theme_color ajouté
  SELECT jsonb_build_object(
           'status', cfg.status,
           'jury_pack_path', cfg.jury_pack_path,
           'session_order', cfg.session_order,
           'theme_color', cfg.theme_color,
           'final_ranking', CASE
             WHEN cfg.status = 'published' THEN cfg.final_ranking
             ELSE NULL
           END
         )
    INTO v_config
    FROM public.session_config cfg
   WHERE cfg.session_id = p_session_id;

  SELECT coalesce(jsonb_agg(
           jsonb_build_object(
             'id', s.id,
             'name', s.name,
             'status', s.status,
             'pitch_deck_path', s.pitch_deck_path,
             'exec_summary_path', s.exec_summary_path,
             'sectors', s.sectors
           )
           ORDER BY s.name
         ), '[]'::jsonb)
    INTO v_startups
    FROM public.startups s
   WHERE s.session_id = p_session_id;

  -- R5 : pas de user_id exposé, is_self à la place
  SELECT coalesce(jsonb_agg(
           jsonb_build_object(
             'is_self', (pja.jury_user_id = auth.uid()),
             'full_name', p.full_name,
             'qualite', pjp.qualite,
             'organisation', pjp.organisation,
             'photo_path', pjp.photo_path
           )
           ORDER BY coalesce(p.full_name, '')
         ), '[]'::jsonb)
    INTO v_jurors
    FROM public.platform_jury_assignments pja
    LEFT JOIN public.profiles p ON p.id = pja.jury_user_id
    LEFT JOIN public.platform_jury_profiles pjp ON pjp.user_id = pja.jury_user_id
   WHERE pja.session_id = p_session_id;

  RETURN jsonb_build_object(
    'session', v_session,
    'config', coalesce(v_config, '{}'::jsonb),
    'startups', v_startups,
    'jurors', v_jurors
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rsa_concours_session_detail(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rsa_concours_session_detail(text) TO authenticated;

-- (Optionnel) répliquer R2 dans rsa_concours_edition_overview si on y ajoute final_ranking.
-- (Optionnel) ajouter theme_color dans le bloc config du overview.

COMMIT;
```

---

## 9. Notes et liens

- **Foundation review** (C1 `profiles` sans RLS, C2 bucket `uploads`
  public) : `docs/hardening/foundation-auth-rls-review.md`. Tant que C1
  n'est pas patché, R5 est obligatoire pour ne pas élargir la surface.
- **RLS audit V3** (vue d'ensemble plateforme) :
  `docs/hardening/rls-audit-v3.md`. La page `/Concours` v2 hérite du verdict
  global "16 OK / 4 ATTENTION / 3 ISSUE" — les 3 ISSUE rouges restent
  applicables (legacy déjeuners + `session_config` over-exposure + bucket
  `uploads` public).
- **Mémoire projet** : V2.5 backlog (`project_rsa_v25_user_management.md`)
  prévoit le module Prix CRUD et l'UI règles éligibilité — à ne pas confondre
  avec l'audit ici qui couvre la vitrine `/Concours` uniquement.

---

*Audit produit le 2026-05-29. À re-revoir avant chaque évolution majeure du
schéma `sessions`/`session_config`/`startups`/`platform_jury_*` ou avant
toute extension du périmètre de rôles autorisés sur `/Concours`.*
