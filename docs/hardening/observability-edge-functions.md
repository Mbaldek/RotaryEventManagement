# Observabilité — Edge Functions Supabase (V3.0)

**Statut V3.0 :** Sentry n'est PAS intégré aux edge functions Deno. On s'appuie
sur Supabase Logs natifs + un format de log structuré pour pouvoir lire
rapidement les erreurs en prod. À ré-évaluer en V3.1 si volume d'erreurs justifie
les ~30 €/mois supplémentaires (Sentry seat + ingestion Deno).

## Pourquoi pas Sentry sur les edge functions en V3.0

Comparaison rapide :

| Critère                                | Supabase Logs (V3.0) | Sentry Deno (V3.1+) |
|----------------------------------------|----------------------|---------------------|
| Coût                                   | Inclus               | ~30 €/mois          |
| Stack trace propre                     | OK (avec format)     | OK natif            |
| Alerting (push/email)                  | Non                  | OK                  |
| Recherche full-text                    | OK (Supabase UI)     | OK                  |
| Lien avec session user                 | Non (besoin tag manuel) | OK natif         |
| Volume actuel (6 functions, faible trafic) | Largement suffisant | Surdimensionné      |

V3.0 a 6 functions :

- `consolidate-jury-pack` (génération PDF, 1x/session)
- `delete-user` (admin only, rare)
- `invite-user` (admin only)
- `send-bulk` (cockpit comms, ponctuel)
- `send-transactional` (mailing fonctionnel)
- `approve-jury-application` (M7, ponctuel)

À ce trafic, Supabase Logs suffisent — on bascule Sentry seulement si on dépasse
~50 invocations/jour ou si une erreur silencieuse coûte cher (= V3.1+).

## Pattern de log standardisé

**À utiliser dans chaque edge function** pour qu'on retrouve les erreurs avec
un simple `[fn-name]` ou `action_failed` dans Supabase Logs UI.

```ts
// HEAD du fichier — constante locale.
const FN_NAME = "send-bulk";  // ou "consolidate-jury-pack", etc.

// Pattern erreur :
function logError(action: string, err: unknown, ctx?: Record<string, unknown>) {
  console.error(
    `[${FN_NAME}] ${action}_failed:`,
    err instanceof Error ? { message: err.message, stack: err.stack } : err,
    ctx ?? {},
  );
}

// Usage dans le code :
try {
  await resend.send(...);
} catch (err) {
  logError("resend_send", err, { recipient_email: r.email, club_id });
  // ... handle (continue, push to failures, etc.)
}
```

**Format imposé :**
- Prefix `[fn-name]` : permet de filtrer par fonction.
- Suffixe `_failed` : convention search "action_failed" pour lister toutes les
  erreurs côté Supabase Logs.
- Contexte structuré dans le 3e argument : recipient_email, club_id,
  startup_id, etc. JAMAIS de PII brute (pas de body html complet, pas de mot
  de passe).

## Comment lire les logs côté Supabase

### Via le Dashboard

1. <https://supabase.com/dashboard/project/{PROJECT_REF}/functions>
2. Sélectionner la fonction (ex. `send-bulk`)
3. Onglet **Logs** : filtre par `level=error`
4. Recherche : `action_failed` ou `[send-bulk]` ou `recipient_email:...`

### Via la CLI

```bash
supabase functions logs send-bulk --project-ref <REF> --tail
```

### Filtres recommandés à sauvegarder dans le UI

- `action_failed` → toutes les erreurs métier nommées
- `level:error` → toutes les exceptions non-catchées
- `[fn-name]` → filtre par fonction
- `recipient_email:"user@x.com"` → suivi d'un envoi spécifique

## Triage manuel (en attendant V3.1 + Sentry)

**Fréquence cible :** revue hebdomadaire des logs error sur les 6 fonctions
(15 min, lundi matin).

**Critères d'escalation :**
- Plus de 5 occurrences du même `action_failed` en 24h → ouvrir une issue.
- N'importe quel `uncaught_exception` → ouvrir une issue immédiatement.
- Une erreur Resend sur `send-bulk` → vérifier le quota mensuel
  (100/jour free tier).

## TODO — V3.1 quand on bascule Sentry Deno

1. Installer `@sentry/deno` dans `supabase/functions/_shared/sentry.ts`.
2. Init au début de chaque function avec DSN `SENTRY_DSN_EDGE` (différent du
   front pour séparer les quotas/projets).
3. Wrap chaque handler avec `Sentry.withSentry(handler)`.
4. Attacher l'identité JWT (sub claim) à chaque event.
5. Garder le pattern `logError()` côté Supabase Logs pour redondance.
6. Configurer une route Slack pour les alertes sévérité high.

Coût estimé : ~30 €/mois (1 seat + ingestion). Trigger : volume d'erreurs > 50/jour
ou besoin d'alerting push (= V4.0 quand on accueille les nouveaux clubs Berlin).
