# V2.5 — Wiring du module Prix

> Comment câbler le module Prix (`src/components/rsa/prizes/`) dans les deux
> cockpits cibles. Les composants sont livrés **isolés** : aucun fichier existant
> n'est modifié dans ce livrable. L'orchestrateur doit poser les hooks ci-dessous
> dans `CompetitionEditor.jsx` (Master Cockpit) et `ClubCockpit.jsx` (Club Cockpit).

## TL;DR

| Cockpit | Fichier à modifier | Ajout | Sémantique |
|---|---|---|---|
| Master | `src/components/rsa/admin/platform/master/CompetitionEditor.jsx` | `<PrizesList editionId={competition.id} scope="competition" />` après la section "Clubs participants" | Prix au niveau compétition (`club_id IS NULL`). Master admin only. |
| Club | `src/components/rsa/admin/platform/club/ClubCockpit.jsx` | Nouvel onglet `'prizes'` entre `'rules'` et `'comms'`, panel `<PrizesList editionId={editionId} clubId={clubId} scope="club" />` | Prix offerts par le club. Master admin OR club_admin du club. |

## Livraison appliquée

- `supabase/migrations/20260531_rsa_v25_prizes.sql` — table `prizes`, RLS, 5 RPC, backfill `editions.prize_main` / `editions.prize_special`
- `src/lib/rsa/prizes.js` — entité `Prize` (autonome, n'amende pas `entities.js`)
- `src/components/rsa/prizes/` — composants isolés (PrizesList, PrizeForm, AwardPrizeModal, usePrizes, i18n)

## Migration SQL

À appliquer côté Supabase **avant** le déploiement front (sinon les RPC manquent
et les composants tombent en erreur). L'orchestrateur passe par le MCP
`mcp__claude_ai_Supabase__apply_migration` avec le contenu du fichier ci-dessus.

## 1. Master Cockpit — `CompetitionEditor.jsx`

### État cible

```jsx
import PrizesList from '@/components/rsa/prizes/PrizesList';

// …
export default function CompetitionEditor({ competition, onClose }) {
  // … inchangé jusqu'au return …
  return (
    <div className="rounded-[4px] p-4 mt-2" style={{ background: 'white', border: `1px solid ${GOLD}` }}>
      <header>…</header>
      <EditionEditor edition={competition} />
      <AttachedClubsPanel competition={competition} />

      {/* V2.5 — Prix de la compétition (master_admin only via RLS) */}
      <PrizesList editionId={competition.id} scope="competition" />
    </div>
  );
}
```

### Notes

- `PrizesList` s'auto-suffit : il fait ses propres queries (sessions, startups,
  prix) via `usePrizes` et `useQuery`. Pas besoin de prop callback.
- Pas de risque sur les compétitions monoclub : la RLS et le RPC `rsa_create_prize`
  refusent les actions sans `master_admin` ; le composant n'expose qu'un état UI
  cohérent (les boutons restent visibles, mais la mutation lèvera 42501 si l'user
  n'a pas le droit — le `error` est affiché inline dans le form).
- Si tu veux gater la visibilité par modèle (par exemple cacher la section pour
  les compétitions `model='monoclub'`), wrappe :
  ```jsx
  {competition.model === 'multiclub' && (
    <PrizesList editionId={competition.id} scope="competition" />
  )}
  ```
  V2.5 ne l'exige pas ; en pratique le master_admin peut vouloir un grand prix
  même sur une compétition monoclub.

## 2. Club Cockpit — `ClubCockpit.jsx`

### État cible

Ajout d'un onglet `'prizes'` dans `TAB_IDS` et `CLUB_TABS` (dans
`src/components/rsa/admin/platform/club/i18n.js`), entre `'rules'` et `'comms'`.

```js
// src/components/rsa/admin/platform/club/i18n.js
export const CLUB_TABS = {
  // …
  rules:  { fr: "Règles d'éligibilité", en: 'Eligibility rules', de: 'Eignungsregeln' },
  prizes: { fr: 'Prix',                 en: 'Prizes',            de: 'Preise' },
  comms:  { fr: 'Communications',       en: 'Communications',    de: 'Kommunikation' },
};
export const TAB_IDS = ['setup', 'live', 'results', 'team', 'jury_applications', 'rules', 'prizes', 'comms'];
```

Puis dans `ClubCockpit.jsx` :

```jsx
import PrizesList from '@/components/rsa/prizes/PrizesList';

// … (à l'intérieur du panel body, après le tab 'rules' et avant 'comms')
{!editionsQ.isLoading && tab === 'prizes' && (
  <PrizesList editionId={editionId} clubId={clubId} scope="club" />
)}
```

### Notes

- `scope="club"` force `kind='special'` (un club ne peut pas créer un grand prix).
- `PrizesList` filtre côté serveur par `clubId` (via `useClubPrizes` →
  `rsa_list_prizes(p_edition_id, p_club_id, NULL)`), donc le club ne voit que ses
  propres prix.
- Si l'édition courante n'a pas attaché le club (`edition_clubs` vide pour ce
  couple), le RPC `rsa_create_prize` refusera : c'est OK, c'est cohérent avec
  la RLS multi-tenant.
- L'onglet est toujours visible : la RLS porte la garde. Si on veut le cacher
  côté UI pour un membre non-club_admin, gater côté `roles.includes('club_admin')`
  via `usePlatformAuth()`.

## 3. Toggle `editions.allow_club_prizes` (V2.5+)

Le mémo V2.5 mentionne un futur toggle `editions.allow_club_prizes` (boolean,
DEFAULT true). Il n'est **pas livré** dans cette tranche pour rester focalisé sur
le CRUD. Quand il arrivera :

- Ajouter la colonne via une nouvelle migration (`ALTER TABLE editions ADD …`).
- Étendre le RPC `rsa_create_prize` avec un check `IF p_club_id IS NOT NULL AND
  NOT editions.allow_club_prizes THEN RAISE 42501`.
- Côté UI : récupérer la valeur via `edition.allow_club_prizes` et rendre
  `<PrizesList … />` read-only (prop à ajouter) avec un disclaimer Élysée.

Cette extension n'est PAS bloquante : sans le toggle, le comportement V2.5 reste
"les clubs peuvent toujours créer des prix spéciaux", ce qui est l'intent
par défaut.

## 4. Données héritées (`prize_main` / `prize_special`)

La migration `20260531_rsa_v25_prizes.sql` :

- Backfille `editions.prize_main > 0` en une ligne `prizes(kind='general',
  name='Grand Prix RSA', club_id=NULL)`.
- Backfille `editions.prize_special > 0` en une ligne `prizes(kind='special',
  name='Prix Spécial', club_id=NULL)`.
- Marque les deux colonnes comme `DEPRECATED` via `COMMENT ON COLUMN`. **Pas de
  DROP** (lecture backward-compat).

`src/components/rsa/results-public/useResults.js` continue à lire
`edition.prize_main` / `edition.prize_special` — comportement inchangé. Quand
on migrera l'affichage palmarès public sur `prizes`, retirer ces lectures
deviendra trivial.

`src/components/rsa/admin/platform/EditionEditor.jsx` continue d'éditer
`prize_main` / `prize_special`. À retirer dans une étape de polish V2.5 (les
deux inputs sont devenus redondants avec le module Prix).

## 5. Smoke test après wiring

1. **Master Cockpit** → ouvrir une compétition (2027 par exemple) → vérifier
   que la section "Prix de la compétition" apparaît sous "Clubs participants".
   - Backfill : la ligne "Grand Prix RSA" doit apparaître si `prize_main > 0`.
   - Cliquer "Nouveau prix" → form Élysée → créer "Prix Foodtech" 3000 EUR.
2. **Club Cockpit** → onglet "Prix" → vérifier la liste vide → créer un prix
   de club "Coup de Cœur Paris" 1500 EUR.
3. Tester "Décerner" : sélectionner une startup → la ligne passe en pill
   "Décerné à {startup}".
4. Tester "Supprimer" sur un prix non-décerné : confirm typé `SUPPRIMER` →
   suppression. Sur un prix décerné : message d'erreur explicite.

## 6. TODO restants (post-V2.5 livraison)

- Câbler le palmarès public (`/Resultats`) sur `prizes` au lieu de
  `edition.prize_main/special`.
- Ajouter `editions.allow_club_prizes` (toggle Master) + check dans le RPC.
- Lier `rsa_proclaim_winner` (M4b) à `rsa_award_prize` pour auto-award du
  Grand Prix lors de la Grande Finale.
- Retirer les inputs `prize_main` / `prize_special` de `EditionEditor.jsx`
  (devenus redondants).
- Email `results_published` : injecter `prizes.name + amount + currency` dans le
  template Élysée (à la place du libellé générique actuel).
