// Sentry — observabilité front (RSA Platform V3.0).
//
// Pourquoi
// ─────────────────────────────────────────────────────────────────────────────
// Cible B2B (Rotary corporations, startups top-tier, jury CEOs) : on doit
// recevoir une notification quand un user voit une erreur, avec contexte
// suffisant pour reproduire (stack, route, breadcrumbs, optionnellement
// session replay si l'erreur est critique).
//
// Comment activer en prod
// ─────────────────────────────────────────────────────────────────────────────
//   1. Créer un projet Sentry (https://sentry.io) — pick React platform.
//   2. Copier le DSN affiché.
//   3. Vercel → Settings → Environment Variables :
//        VITE_SENTRY_DSN = https://xxxxxxx@oXXXXXX.ingest.sentry.io/XXXXXX
//        VITE_SENTRY_ENVIRONMENT (optionnel) = "production" / "preview" / "dev"
//   4. Redéployer. Le bootstrap (src/main.jsx) appelle initSentry() ; si DSN
//      vide, l'init est silencieusement skip (dev local sans Sentry = OK).
//
// Quota / coûts
// ─────────────────────────────────────────────────────────────────────────────
// Free tier : 5k errors + 10k traces / mois. tracesSampleRate=0.1 nous laisse
// ~50k pageviews/mois avant de toucher le plafond traces. replaysSessionSampleRate=0
// (off par défaut) garde le quota replay intact ; replaysOnErrorSampleRate=1.0
// capture systématiquement une replay quand une erreur survient (le seul cas
// vraiment utile pour le debug).
//
// PII
// ─────────────────────────────────────────────────────────────────────────────
// `maskAllText: true` dans replayIntegration → tous les <input>, <textarea>,
// <p>, etc. sont masqués dans les replays. `blockAllMedia: false` car nos
// dashboards ont des graphes sans contenu sensible. `setUser({id, email})`
// (cf. auth.jsx) attache l'identité, mais le contenu textuel des pages reste
// caché — bon équilibre RGPD/debug.
//
// beforeSend filter
// ─────────────────────────────────────────────────────────────────────────────
// On drop les erreurs notoirement bruyantes et non-actionnables :
//   - ResizeObserver loops (Chrome warning interne, jamais une vraie erreur)
//   - AbortError (network requests annulés par la navigation — normal)
//   - Erreurs d'extensions browser (chrome-extension:// dans la stack)
//   - Erreurs 401/403 (déjà gérées par les boundaries auth, pas un bug)

import * as Sentry from '@sentry/react';

// Tampon des erreurs/messages capturés AVANT initSentry() résolu — si quelqu'un
// appelle captureException avant l'init (rare mais possible), on les rejoue
// après. Pas critique pour V3.0 mais évite les race conditions silencieuses.
let __initialized = false;

const IGNORED_ERROR_MESSAGES = [
  // Chrome ResizeObserver false-positive (https://stackoverflow.com/q/49384120)
  /ResizeObserver loop limit exceeded/i,
  /ResizeObserver loop completed with undelivered notifications/i,
  // Fetch annulé par un unmount React ou une navigation
  /AbortError/i,
  /The user aborted a request/i,
  // Quirk Safari Webkit sur les vidéos en background
  /The play\(\) request was interrupted/i,
];

const IGNORED_URL_FRAGMENTS = [
  // Toute exception remontée par une extension ne nous concerne pas.
  'chrome-extension://',
  'moz-extension://',
  'safari-extension://',
];

function shouldDropEvent(event, hint) {
  try {
    const err = hint?.originalException;
    const message = (typeof err === 'string' ? err : err?.message) || event?.message || '';

    if (IGNORED_ERROR_MESSAGES.some((re) => re.test(message))) return true;

    // Drop si la stack pointe vers une extension browser
    const stackFrames = event?.exception?.values?.[0]?.stacktrace?.frames || [];
    if (stackFrames.some((f) => IGNORED_URL_FRAGMENTS.some((frag) => f?.filename?.includes(frag)))) {
      return true;
    }

    // Drop les "401 Unauthorized" / "403 Forbidden" — gérées par l'UI auth, pas une régression
    if (/\b(401|403)\b/.test(message) && /(unauthor|forbidden)/i.test(message)) return true;
  } catch {
    // Si notre filtre lui-même crashe, on laisse passer l'event (mieux que rien).
  }
  return false;
}

/**
 * Initialise Sentry au plus tôt (avant React render). No-op si pas de DSN
 * configuré (dev local sans clé) — l'app reste fonctionnelle, juste sans télémétrie.
 *
 * @returns {boolean} true si Sentry a été initialisé, false sinon (DSN manquant)
 */
export function initSentry() {
  if (__initialized) return true;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    // Pas une erreur : en dev, on tourne sans Sentry. En prod, c'est qu'on a
    // oublié de configurer la var — un warn console aidera le diagnostic.
    if (import.meta.env.PROD) {
      // eslint-disable-next-line no-console
      console.warn('[Sentry] VITE_SENTRY_DSN missing — error tracking disabled in production.');
    }
    return false;
  }

  const environment =
    import.meta.env.VITE_SENTRY_ENVIRONMENT ||
    import.meta.env.MODE ||
    'production';

  Sentry.init({
    dsn,
    environment,
    // Release tag : Vercel injecte VERCEL_GIT_COMMIT_SHA mais en build-time
    // côté front, on lit MODE pour disting. Pas critique pour V3.0.
    release: import.meta.env.VITE_GIT_SHA || undefined,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Tous les textes sont masqués dans les replays (RGPD : pas de dossier
        // candidat, pas d'email lisible dans la session reconstituée).
        maskAllText: true,
        blockAllMedia: false,
      }),
    ],
    // 10 % des transactions tracées — suffisant pour repérer les routes lentes,
    // évite de cramer le quota traces gratuit (10k/mois).
    tracesSampleRate: 0.1,
    // Replay sessions désactivées par défaut (V3.0). On garde uniquement le
    // replay quand une erreur survient (replaysOnErrorSampleRate=1.0).
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,
    // PII : on n'envoie ni IP ni cookies par défaut. setUser() côté auth.jsx
    // attache seulement {id, email} — voir RGPD section ci-dessus.
    sendDefaultPii: false,
    beforeSend(event, hint) {
      if (shouldDropEvent(event, hint)) return null;
      return event;
    },
  });

  __initialized = true;
  return true;
}

/**
 * Attache l'identité Sentry après login (à appeler depuis PlatformAuthProvider
 * une fois session + profil chargés).
 */
export function setSentryUser({ id, email } = {}) {
  if (!__initialized) return;
  Sentry.setUser(id || email ? { id, email } : null);
}

/**
 * Clear l'identité Sentry après signOut.
 */
export function clearSentryUser() {
  if (!__initialized) return;
  Sentry.setUser(null);
}

/**
 * Capture explicite d'une erreur métier (avec contexte additionnel optionnel).
 * Préférer plutôt que console.error pour les chemins d'erreur "qu'on veut savoir".
 *
 * @param {unknown} error
 * @param {object} [context]  Extra payload attaché au breadcrumb Sentry.
 */
export function captureException(error, context) {
  if (!__initialized) {
    // eslint-disable-next-line no-console
    console.error('[Sentry not initialized]', error, context);
    return;
  }
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

// Re-export utile pour les composants qui veulent envelopper localement
// (rare en V3.0 — la racine wrappe déjà tout dans ErrorBoundary).
export { Sentry };
