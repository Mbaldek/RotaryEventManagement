# DEEP SOLVE — Mode resolution profonde

> Activer ce mode quand un probleme revient, qu'un fix ne tient pas, ou qu'on tourne en rond.
> Commande : "deep solve [probleme]" ou "/deep-solve"

---

## Principe

**L'objectif n'est pas de faire marcher le code actuel. L'objectif est que l'app fonctionne.**

Un bug recurrent = signal que l'approche est mauvaise. Pas le code, l'approche.

---

## Protocole

### 1. STOP — Definir l'objectif reel
- Quel est le besoin utilisateur final ? (pas le ticket, pas le bug — le BESOIN)
- Quelle experience on veut ? (ex: "l'utilisateur declenche un SOS en < 2s, meme offline")
- Ecrire l'objectif en une phrase avant de toucher le code

### 2. DIAGNOSTIC — Pourquoi ca casse ?
Ne pas regarder que le fichier qui crash. Remonter la chaine :
- **Code** : le composant/hook qui fail — est-ce un symptome ou la cause ?
- **Architecture** : le pattern utilise est-il adapte ? (ex: polling vs realtime, REST vs RPC, store local vs server state)
- **API** : l'endpoint fait-il ce qu'on a besoin ? Faut-il un nouvel endpoint ? Une Edge Function ? Un RPC Supabase ?
- **Infra** : le probleme vient-il de la plateforme ? (limites Expo, contraintes RN, comportement OS specifique)
- **Data model** : la structure DB est-elle adaptee a ce use case ? Faut-il une nouvelle table, une vue, un index ?
- **Flux** : le flow utilisateur est-il le bon ? Peut-on eliminer le probleme en changeant le parcours ?

### 3. EXPLORER — Chercher hors du code
Avant de coder un fix :
- **Supabase** : verifier schema, RLS, RPCs existantes, Edge Functions. Peut-on resoudre cote serveur ?
- **Webapp** : comment le meme feature marche dans `../safepin` ? Pourquoi ca marche la-bas ?
- **Alternatives techniques** : existe-t-il un package, un pattern, une API native qui resout mieux le probleme ?
- **Simplification** : peut-on supprimer du code au lieu d'en ajouter ? Moins de code = moins de bugs
- **Autres apps** : comment les apps similaires (Noonlight, bSafe, Citizen) resolvent ce probleme ?

### 4. DECIDER — Choisir la bonne solution
Criteres de choix (dans cet ordre) :
1. **Fiabilite** — ca marche tout le temps, pas juste en demo
2. **Simplicite** — moins de couches, moins de state, moins de points de failure
3. **Maintenabilite** — un autre dev (ou CC dans 3 mois) comprend sans contexte
4. **Performance** — rapide sur un Android milieu de gamme

### 5. PROPOSER avant de coder
- Expliquer le changement d'approche a l'utilisateur
- Montrer ce qui change : archi, API, data model, flux
- Estimer l'impact : quels fichiers bougent, quels risques
- Attendre validation

### 6. IMPLEMENTER — Du fond vers la surface
Ordre d'implementation :
1. Data model / migration SQL si necessaire
2. API / RPC / Edge Function si necessaire
3. Store Zustand (adapter au nouveau flux)
4. Hook (logique metier)
5. Composant (UI)
6. Test sur device

---

## Signaux d'activation

Utiliser ce mode quand :
- Un meme bug revient apres 2+ tentatives de fix
- Un fix cree un nouveau bug ailleurs
- Le code devient un empilement de workarounds
- On ajoute un `setTimeout`, `retry`, ou `try/catch` generique pour "que ca marche"
- La complexite d'un fichier explose (> 400 lignes pour un composant)
- On copie-colle de la logique entre composants
- L'utilisateur dit "ca marche pas" apres un fix declare termine

## Anti-patterns a detecter

| Symptome | Vrai probleme probable |
|----------|----------------------|
| Token expire / 401 en boucle | Auth flow mal concu, pas juste un refresh manquant |
| State desynchronise | Mauvaise source de verite (dupliquer state au lieu de deriver) |
| Race condition | Architecture asynchrone inadaptee (manque de queue ou de lock) |
| UI freeze | Trop de re-renders, manque de memo/useCallback, ou logique lourde dans le render |
| "Ca marche sur mon tel mais pas l'autre" | Assumption plateforme, fallback manquant |
| Donnees fantomes / stale data | Cache invalide, subscription manquante, ou mauvais timing de fetch |
| Crash au mount/unmount | Cleanup manquant, ref null, listener orphelin |
| Offline broken | L'archi suppose la connexion — redesign avec offline-first |

## Exemple concret

**Bug** : "le SOS se declenche mais le chat ne recoit pas les messages"

**Approche classique (mauvaise)** : debugger le composant SOSChatSheet, ajouter un retry, verifier le token.

**Approche deep solve** :
1. Objectif : l'utilisateur en danger doit pouvoir communiquer avec ses contacts en temps reel
2. Diagnostic : le chat passe par une API REST avec polling → latence, perte de messages si offline
3. Explorer : Supabase Realtime existe, on l'utilise deja pour les notifications. Pourquoi pas pour le SOS chat ?
4. Decision : migrer le SOS chat de REST polling vers Supabase Realtime channel
5. Proposer : "je veux changer l'archi du SOS chat — passer de polling API a Realtime Supabase. Ca supprime le bug ET ameliore la latence. Ca touche useSOSStore, SOSChatSheet, et l'API route. OK ?"
6. Implementer : channel Realtime → store → hook → composant → test device

---

## REGLE ANTI-ITERATION — Diagnostiquer AVANT de toucher le code

> Chaque cycle "modifier → tester → ca marche pas → re-modifier" coute des tokens et du temps.
> Objectif : resoudre en 1-2 passes max, pas en 10.

### Avant de modifier quoi que ce soit :

**1. Instrumenter d'abord**
- Ajouter des `console.log` temporaires (wrappés `__DEV__`) aux points critiques AVANT de changer la logique
- Logger : les valeurs d'entree, les valeurs de sortie, les conditions de branchement
- Pattern :
```typescript
if (__DEV__) console.log('[SOS:trigger]', { userId, phase, token: token?.slice(0,8) });
```

**2. Lire les logs existants**
- Regarder la console Metro AVANT de coder un fix
- Chercher le vrai message d'erreur, pas deviner
- Si pas de log utile → en ajouter d'abord, reproduire le bug, PUIS fixer

**3. Verifier les hypotheses**
Avant de modifier du code, verifier que l'hypothese est vraie :
- "Le token est expire" → logger le token, verifier `exp` vs `Date.now()`
- "L'API renvoie une erreur" → logger la reponse complete (status, body, headers)
- "Le state n'est pas mis a jour" → logger avant/apres le `set()` du store
- "Le composant ne re-render pas" → ajouter un `useEffect(() => console.log('render', deps), [deps])`

**4. Reproduire de maniere fiable**
- Decrire les etapes exactes pour reproduire (pas "ca marche pas")
- Si le bug est intermittent → chercher la race condition, pas retry en boucle
- Tester sur le meme device/emulateur que l'utilisateur

### Pattern de debug structure

```typescript
// TEMPORAIRE — debug [TICKET/ISSUE]
if (__DEV__) {
  console.log('[MODULE:action] input', { ...relevantState });
  console.log('[MODULE:action] conditions', { isOnline, hasToken, phase });
}
```

Nommage des logs : `[Module:action]` pour pouvoir filtrer dans Metro.

### Quand proposer un fix :

- Expliquer POURQUOI ca va marcher (pas juste "j'ai change X")
- Montrer la preuve : quel log/valeur confirme l'hypothese
- Si pas de preuve → c'est une supposition, le dire explicitement
- Preferer UN changement cible et verifie plutot que 5 changements "au cas ou"

### Interdictions

- NE PAS modifier 3+ fichiers "pour voir si ca fixe"
- NE PAS ajouter de `try/catch` generique qui avale les erreurs
- NE PAS ajouter de `setTimeout` comme fix (c'est un masque, pas une solution)
- NE PAS declarer "fixed" sans avoir reproduit le bug et verifie la correction
- NE PAS enchainer les tentatives sans relire les logs entre chaque

---

## Rappel

> Le but de Juliapp est la securite des utilisateurs.
> Chaque feature doit etre fiable dans les pires conditions : stress, nuit, batterie faible, reseau instable.
> Un hack qui marche en dev mais fail en conditions reelles = echec.
> Mieux vaut une feature simple qui marche toujours qu'une feature riche qui crash parfois.
