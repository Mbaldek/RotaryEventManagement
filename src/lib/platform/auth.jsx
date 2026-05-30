// Authentification de la plateforme RSA — magic link (sans mot de passe) + rôles.
//
// Indépendant de l'AuthContext hérité (app déjeuners) : même client Supabase, mais
// expose une identité orientée plateforme. À retirer côté déjeuners quand cette app
// sera extraite (cf. mémoire project_rsa_platform_rebuild).
//
// Rôles : 'startup' | 'jury' | 'comite' | 'admin', stockés dans la table VERROUILLÉE
// `app_user_roles` (écriture service_role only — cf. correctif sécurité C1 ; profiles
// porte une RLS "Allow all" et ne doit donc PAS porter de droits). Un candidat connecté
// SANS rôle reste authentifié : il accède à SON dossier via startups.owner_id = auth.uid().
//
// Lookup email (R-M4) : on N'UTILISE PLUS `.ilike(...)` (wildcards `%`/`_` exploitables)
// mais `.eq('email', lower(input))` avec normalisation locale. Conséquence : les colonnes
// `profiles.email` et `app_user_roles.email` doivent être stockées en lowercase à
// l'insertion (convention service_role/import). has_platform_role(text) — côté SQL —
// continue de comparer via lower(...) sur la colonne et sur l'email du JWT, donc reste
// insensible à la casse, ce qui est cohérent avec la normalisation côté client.

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { isAuthError } from '@/lib/platform/authErrors';
import { withTimeout } from '@/lib/platform/promiseTimeout';
import { setSentryUser, clearSentryUser, captureException, Sentry } from '@/lib/observability/sentry';

const PlatformAuthContext = createContext(null);

// F5 — Pin VITE_APP_URL ou warning explicite. En prod (app.rotary-startup.org) la
// var DOIT être set : sinon les magic-links pointent vers `window.location.origin`,
// ce qui leak des liens vers une preview Vercel quand un user clique sur "envoyer
// le lien" depuis https://rotary-event-management-XXXX.vercel.app. Le clic mène
// alors à une URL preview qui n'a pas la session et qui échouera silencieusement.
// On émet un console.error + Sentry warning au boot, et on continue avec le fallback.
const RAW_APP_URL = import.meta.env.VITE_APP_URL;
const APP_URL = RAW_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');

if (typeof window !== 'undefined' && !RAW_APP_URL) {
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
  if (!isLocal) {
    // eslint-disable-next-line no-console
    console.error(
      '[PlatformAuth] VITE_APP_URL not set in non-localhost env — magic-links ' +
      'will use window.location.origin (' + window.location.origin + '), ' +
      'which may break on preview URLs.',
    );
    // Sentry breadcrumb même si Sentry pas encore init — le warning console reste
    // le diagnostic primaire (Sentry sera no-op en l'absence de DSN).
    try {
      Sentry?.captureMessage?.(
        'VITE_APP_URL not set in non-localhost env — magic-links will use window.location.origin, may break on preview URLs',
        {
          level: 'warning',
          extra: { origin: window.location.origin, host },
        },
      );
    } catch {
      /* Sentry indispo : on a déjà loggé via console.error */
    }
  }
}

// F7 — Hash léger d'un email pour les breadcrumbs Sentry (PII safety).
// On NE veut PAS envoyer l'email en clair dans les breadcrumbs : on garde
// les 3 premiers chars et le domain (suffisant pour reconnaître son propre
// dossier en debug, opaque pour un attaquant qui lirait les logs).
function emailFingerprint(email) {
  if (!email || typeof email !== 'string') return null;
  const [local, domain] = email.split('@');
  if (!local || !domain) return null;
  const head = local.slice(0, 3);
  return `${head}***@${domain}`;
}

export function PlatformAuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null); // session.user (auth.users)
  const [profile, setProfile] = useState(null); // ligne profiles (identité, peut être null)
  const [roles, setRoles] = useState([]); // app_user_roles.roles (globaux)
  const [clubMemberships, setClubMemberships] = useState([]); // V2 : [{club_id, role}, ...]
  const [competitionAdminEditions, setCompetitionAdminEditions] = useState([]); // V3 : text[]
  const [loading, setLoading] = useState(true);
  // V3 hardening — true après le PREMIER loadIdentity ayant abouti (au moins
  // 1 RPC sur les 3 sans erreur). Permet aux gates UI (Admin.jsx) de distinguer
  // "pas encore chargé" vs "chargé mais aucun rôle" et d'éviter le Forbidden
  // flash quand le watchdog 10s fire avant que loadIdentity ne complète sur
  // réseau froid. Cf. docs/deepsolve/auth-rights-stability.md.
  const [identityLoaded, setIdentityLoaded] = useState(false);
  // FIX 2026-05-30 — rolesLoaded = rsa_my_roles a *réellement* répondu (success
  // OU array vide confirmé). C'est le SEUL signal fiable pour autoriser le
  // routing post-Login : si rsa_my_roles n'a pas chargé, on ne peut PAS
  // décider qu'un user est candidat (roles=[]). identityLoaded est un OR de 4
  // RPC dont 3 peuvent être vides légitimement (profile, club, competition) —
  // mauvaise source de vérité pour décider du routing.
  // Cf. docs/deepsolve/sso-google-master-admin-misroute.md.
  const [rolesLoaded, setRolesLoaded] = useState(false);

  // FIX 2026-06-04 — Single-flight loadIdentity contre les concurrent calls
  // déclenchés par le double SIGNED_IN de React StrictMode + le re-emit
  // immédiat de onAuthStateChange à la subscribe. Symptôme observé en prod :
  // navigator.locks (sb-*-auth-token) sont stolen entre les 2 loadIdentity
  // concurrents → AbortError uncaught + 4 RPC failed → master_admin perd ses
  // rôles instantanément. Au lieu de paralléliser, on serialize : si une
  // loadIdentity est en flight, on enregistre l'email demandé en pending et
  // on relance UNE FOIS à la fin si l'email demandé a changé.
  const loadInFlightRef = useRef(false);
  const pendingEmailRef = useRef(null);

  const loadIdentityImpl = useCallback(async (email) => {
    if (!email) {
      setProfile(null);
      setRoles([]);
      setRolesLoaded(false); // pas d'utilisateur = pas de roles à charger — reset pour le prochain login
      setClubMemberships([]);
      setCompetitionAdminEditions([]);
      setIdentityLoaded(true); // pas authentifié = "settled" pour les gates
      return;
    }
    // R-M4 : eq + normalisation lowercase plutôt qu'ilike (wildcards %_ exploitables).
    // Lookup rôles : on passe par le RPC rsa_my_roles (SECURITY DEFINER) pour éviter
    // toute dépendance à la RLS sur app_user_roles — observation 2026-05-28 : la
    // policy basée sur `auth.jwt() ->> 'email'` (puis `auth_current_email()`) ne
    // matchait pas systématiquement la ligne du user, conduisant à un `/Admin`
    // bloqué en "Forbidden" malgré la présence du rôle 'admin' en base.
    //
    // V2 multi-club : on charge AUSSI les club_memberships via le RPC dédié
    // my_club_memberships (SECURITY DEFINER), pour exposer immédiatement à l'UI
    // les rôles par-club (club_admin/comite/jury de tel ou tel club). Si l'RPC
    // n'existe pas encore (build local sans migration V2 appliquée), on retombe
    // sur un tableau vide — la plateforme reste fonctionnelle en mode V1 global.
    const norm = String(email).trim().toLowerCase();
    // SELF-HEALING : timeout 8s sur chaque query (cf. observation prod 2026-06-05
    // où ces queries peuvent hang quand le client supabase est en état zombie ou
    // sur réseau froid mobile / cold-start Edge).
    // 2026-06-05 — bumped 4000 → 8000ms. Le 4s killait des roles VALIDES sur
    // réseau froid (cold-start mobile, refresh post-veille). Aligné avec
    // getSession timeout (8s) pour homogénéité.
    // Sur timeout, on retombe sur {data: null, error: timeout} → roles=[] —
    // mais grâce au skip loadIdentity sur TOKEN_REFRESHED (cf. onAuthStateChange
    // plus bas), ce cas ne survient qu'au boot initial.
    // FIX 2026-06-04 / 2026-05-30 — late rejections + thenable PostgREST :
    // withTimeout vit désormais dans @/lib/platform/promiseTimeout (pur, testé).
    // Il NORMALISE le builder PostgREST (thenable sans .catch) en vraie Promise
    // avant de swallow les late rejections (AbortError navigator.locks). Avant,
    // `promise.catch()` sur le builder jetait « catch is not a function » et
    // faisait throw loadIdentity AVANT tout appel réseau → spinner /Login
    // perpétuel. Cf. docs/deepsolve/sso-google-master-admin-misroute.md §11.
    // V3 — 4e appel parallèle : my_competition_admin_editions (RPC SECURITY
    // DEFINER, retourne text[] des éditions que le user administre). Si l'RPC
    // n'existe pas encore en local (migration V3 non appliquée), withTimeout
    // dégrade vers data=null et on retombe sur [] — la plateforme reste
    // fonctionnelle en mode V2.
    const [profRes, rolesRes, cmRes, caRes] = await Promise.all([
      withTimeout(
        supabase.from('profiles').select('id, email, full_name, role').eq('email', norm).maybeSingle(),
        8000, 'profiles',
      ),
      withTimeout(supabase.rpc('rsa_my_roles'), 8000, 'rsa_my_roles'),
      withTimeout(supabase.rpc('my_club_memberships'), 8000, 'my_club_memberships'),
      withTimeout(supabase.rpc('my_competition_admin_editions'), 8000, 'my_competition_admin_editions'),
    ]);
    // DIAGNOSTIC : on logge le résultat de chaque promise individuellement pour
    // identifier en prod quelle requête échoue silencieusement (cf. spinner
    // infini /MonDossier 2026-05-29 — sans log, impossible de distinguer un
    // rolesRes.error d'un rolesRes.data=[]). console.warn pour ne pas être filtré
    // par le niveau "Default" de la console Chrome qui masque info.
    // eslint-disable-next-line no-console
    console.warn('[PlatformAuth] loadIdentity result', {
      email_fp: emailFingerprint(email),
      profile: { data: !!profRes?.data, error: profRes?.error?.message ?? null },
      roles: { data: rolesRes?.data, error: rolesRes?.error?.message ?? null },
      clubMemberships: { data: cmRes?.data, error: cmRes?.error?.message ?? null },
      competitionAdminEditions: { data: caRes?.data, error: caRes?.error?.message ?? null },
    });
    // IDEMPOTENT : si la query échoue (timeout, network, RPC down), on PRÉSERVE
    // l'état précédent au lieu de reset à []. Cause root du kick-out : avant ce
    // fix, un timeout RPC sur loadIdentity (cold-start, réseau froid, refresh
    // post-veille) wipait les rôles → master_admin tombait en Forbidden instantané
    // malgré une session valide. Maintenant : success → écrase l'état ; failure →
    // log warning + garde l'état actuel. Le user reste logged + autorisé tant
    // qu'un succès n'a pas écrasé. Si le user n'a réellement plus de rôles, le
    // backend RLS le bloquera au query suivant — ceinture + bretelles serveur.
    if (profRes?.error) {
      // eslint-disable-next-line no-console
      console.warn('[PlatformAuth] profile load failed — preserving previous value');
    } else {
      setProfile(profRes?.data ?? null);
    }
    if (rolesRes?.error) {
      // eslint-disable-next-line no-console
      console.warn('[PlatformAuth] roles load failed — preserving previous roles');
    } else if (Array.isArray(rolesRes?.data)) {
      setRoles(rolesRes.data);
      // FIX 2026-05-30 — rolesLoaded passe à true UNIQUEMENT quand rsa_my_roles
      // a réellement répondu sans erreur (array, même vide = candidat sans rôle
      // = vrai signal positif). Sur erreur/timeout : on laisse rolesLoaded à
      // false pour que Login.jsx attende un retry plutôt que de router vers
      // /MonDossier par fallback.
      setRolesLoaded(true);
    }
    if (cmRes?.error) {
      // eslint-disable-next-line no-console
      console.warn('[PlatformAuth] club_memberships load failed — preserving previous value');
    } else if (Array.isArray(cmRes?.data)) {
      setClubMemberships(cmRes.data);
    }
    if (caRes?.error) {
      // eslint-disable-next-line no-console
      console.warn('[PlatformAuth] competition_admin_editions load failed — preserving previous value');
    } else if (Array.isArray(caRes?.data)) {
      setCompetitionAdminEditions(caRes.data.map((v) => String(v)));
    }
    // identityLoaded = true si AU MOINS l'une des sources d'identité a réussi.
    // Si toutes ont timeout (réseau down complet), on reste à false pour que
    // les gates UI affichent un état "loading access" plutôt que Forbidden.
    const anySuccess =
      !profRes?.error || !rolesRes?.error || !cmRes?.error || !caRes?.error;
    if (anySuccess) setIdentityLoaded(true);
    // Retourne deux drapeaux pour permettre au caller (init / onAuthStateChange)
    // de programmer un retry :
    //   * anySuccess=false → full outage (retry tout)
    //   * rolesErrored=true → partial outage sur rsa_my_roles (la RPC canonique
    //     pour le routing) — retry agressif même si anySuccess=true, sinon le
    //     user reste avec roles=[] jusqu'au prochain SIGNED_IN (qu'on ne reçoit
    //     plus une fois SIGNED_IN initial passé) → spinner /Login infini ou
    //     pire, routing fallback /MonDossier.
    //   * rolesAuthError=true → rsa_my_roles a renvoyé une 401/JWT-error
    //     DÉFINITIVE (pas un timeout). Combiné à anySuccess=false (toutes les
    //     RPC rejetées → JWT mort cohérent), c'est une session zombie : retry
    //     inutile, il faut LÂCHER la session locale pour retomber sur le form de
    //     login (sinon spinner safety-net infini, cf. deepsolve §254).
    return {
      anySuccess,
      rolesErrored: !!rolesRes?.error,
      rolesAuthError: isAuthError(rolesRes?.error),
    };
  }, []);

  // Wrapper single-flight autour de loadIdentityImpl : sérialise les appels
  // concurrents. Si un loadIdentity est en cours et qu'un autre est demandé
  // avec un email différent, on stocke l'email en "pending" et on rejoue
  // une fois à la fin. Si même email, on no-op pour éviter le double-load.
  const loadIdentity = useCallback(async (email) => {
    if (loadInFlightRef.current) {
      pendingEmailRef.current = email ?? null;
      return undefined;
    }
    loadInFlightRef.current = true;
    let result;
    try {
      result = await loadIdentityImpl(email);
    } finally {
      loadInFlightRef.current = false;
    }
    // Replay si une demande différente est arrivée pendant qu'on tournait.
    if (pendingEmailRef.current !== null && pendingEmailRef.current !== email) {
      const next = pendingEmailRef.current;
      pendingEmailRef.current = null;
      // récursion contrôlée — single-flight ré-acquiert le lock pour next.
      return loadIdentity(next);
    }
    pendingEmailRef.current = null;
    return result;
  }, [loadIdentityImpl]);

  useEffect(() => {
    let active = true;

    // FIX 2026-05-30 (boucle perpétuelle SSO) — pilotage centralisé de l'après
    // loadIdentity. Appelé par l'IIFE init ET par onAuthStateChange(SIGNED_IN).
    // POURQUOI centraliser : sur le flux SSO, getSession (IIFE) et l'événement
    // SIGNED_IN déclenchent deux loadIdentity concurrents. Le single-flight n'en
    // exécute qu'un ; l'autre caller reçoit `undefined`. Avant ce fix, seul
    // l'IIFE programmait les retries → si c'est le SIGNED_IN qui a gagné le lock
    // (et que rsa_my_roles a erreuré), AUCUN retry n'était programmé → spinner
    // safety-net infini. Désormais les deux callers passent leur résultat ici ;
    // celui qui a réellement exécuté l'impl (résultat non-undefined) pilote.
    const handleLoadResult = (result, email) => {
      if (!active || !result || !email) return;
      // Session zombie : JWT mort rejeté par le serveur ET aucune RPC réussie
      // (cohérent avec un token globalement invalide). Retry inutile — on lâche
      // la session locale : onAuthStateChange(SIGNED_OUT) videra authUser et le
      // user retombe sur le formulaire de login (SSO + magic-link + reset).
      // signOut scope:'local' n'appelle pas le serveur (race-safe si réseau lent).
      if (result.rolesAuthError && !result.anySuccess) {
        // eslint-disable-next-line no-console
        console.warn('[PlatformAuth] dead session (rsa_my_roles 401 + no RPC success) — clearing local session → login form');
        try {
          Sentry?.addBreadcrumb?.({
            category: 'auth.dead-session',
            level: 'warning',
            message: 'rsa_my_roles auth error with no RPC success — local signOut',
          });
        } catch { /* Sentry indispo */ }
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        return;
      }
      // Full outage (toutes RPC en échec, mais transitoire — pas un JWT mort) :
      // retry tout. 1 essai à 3s, 1 à 8s.
      if (!result.anySuccess) {
        // eslint-disable-next-line no-console
        console.warn('[PlatformAuth] loadIdentity full outage — scheduling retry');
        setTimeout(() => { if (active) loadIdentity(email); }, 3000);
        setTimeout(() => { if (active) loadIdentity(email); }, 8000);
        return;
      }
      // Partial outage sur rsa_my_roles (la RPC canonique pour le routing) :
      // retry ciblé même si les 3 autres RPC ont réussi.
      if (result.rolesErrored) {
        // eslint-disable-next-line no-console
        console.warn('[PlatformAuth] rsa_my_roles errored — scheduling targeted retry');
        setTimeout(() => { if (active) loadIdentity(email); }, 1500);
        setTimeout(() => { if (active) loadIdentity(email); }, 5000);
      }
    };

    // SELF-HEALING (2026-05-29) : observé en prod app.rotary-startup.org —
    // `supabase.auth.getSession()` HANG indéfiniment quand le refresh-token
    // localStorage est corrompu ou que le client supabase est dans un état
    // bloqué (souvent post-deploy de breaking changes côté auth). Symptômes :
    //   * watchdog 4s fire → loading=false mais authUser reste null
    //   * MAIS onAuthStateChange peut fire plus tard avec une session zombie
    //     → isAuthenticated devient true → Login redirect /MonDossier
    //   * /MonDossier appelle des queries qui hang aussi (le client supabase
    //     est globalement coincé)
    //
    // Stratégie : on race getSession() contre un timeout 3s. Si timeout :
    //   1. Clear localStorage du token d'auth supabase (clés sb-*-auth-token)
    //   2. supabase.auth.signOut({ scope: 'local' }) pour reset l'état client
    //      sans appeler le serveur (qui hang lui aussi probablement)
    //   3. Continue avec session=null → user voit /Login form propre
    //
    // L'utilisateur peut alors re-login proprement, sans avoir à clear le
    // site data manuellement dans DevTools.
    // 2026-05-29 — bumped 4000 → 10000ms pour rester cohérent avec le
    // getSession timeout (8s). Si le watchdog fire à 4s, /Admin voit
    // loading=false + authUser=null et redirige /Login AVANT que getSession
    // n'ait fini → même symptôme « éjecté au refresh » qu'on essaie de fixer.
    // 10s = 8s getSession + 2s marge loadIdentity.
    const initWatchdog = setTimeout(() => {
      if (active) {
        // eslint-disable-next-line no-console
        console.warn('[PlatformAuth] init watchdog fired (10s) — forcing loading=false.');
        setLoading(false);
      }
    }, 10000);

    // 2026-05-29 — bumped 3000 → 8000ms. Le 3s killait des sessions Google SSO
    // VALIDES : au refresh, getSession() déclenche en interne un refreshSession()
    // réseau (+ lock navigator.locks) qui peut dépasser 3s sur cold start ou
    // réseau froid, surtout pour les tokens OAuth dont l'access_token est proche
    // d'expiration. 8s laisse passer ces cas légitimes sans laisser un VRAI
    // zombie (hang indéfini) bloquer l'utilisateur.
    const getSessionWithTimeout = () => {
      const timeoutMs = 8000;
      // FIX 2026-06-04 — late rejection swallow : même pattern que withTimeout.
      // Si le timeout gagne la race et que supabase.auth.getSession() rejette
      // ensuite (steal du navigator.locks par le 2e StrictMode mount), pas de
      // "Uncaught (in promise) AbortError".
      const sessionPromise = supabase.auth.getSession();
      sessionPromise.catch(() => {});
      return Promise.race([
        sessionPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`getSession timeout ${timeoutMs}ms`)), timeoutMs),
        ),
      ]);
    };

    const cleanCorruptedSession = async () => {
      try {
        // 1. Clear toutes les clés localStorage du client supabase (auth token,
        //    refresh token, expiry). Pattern sb-{ref}-auth-token + variantes.
        if (typeof window !== 'undefined' && window.localStorage) {
          const toRemove = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.startsWith('supabase.auth.'))) {
              toRemove.push(key);
            }
          }
          toRemove.forEach((k) => window.localStorage.removeItem(k));
          // eslint-disable-next-line no-console
          console.warn('[PlatformAuth] cleanCorruptedSession cleared keys:', toRemove);
        }
        // 2. signOut local (n'appelle pas le serveur — race-safe si serveur hang)
        await Promise.race([
          supabase.auth.signOut({ scope: 'local' }),
          new Promise((resolve) => setTimeout(resolve, 1000)),
        ]).catch(() => {});
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[PlatformAuth] cleanCorruptedSession failed:', err);
      }
    };

    (async () => {
      // eslint-disable-next-line no-console
      console.warn('[PlatformAuth] init start');
      try {
        let session = null;
        try {
          const res = await getSessionWithTimeout();
          session = res?.data?.session ?? null;
          // eslint-disable-next-line no-console
          console.warn('[PlatformAuth] getSession resolved, session?', !!session);
        } catch (timeoutErr) {
          // 2026-05-29 — on NE wipe PLUS le localStorage ici. Le timeout (même 8s)
          // peut être un faux positif (réseau froid, refreshSession lent sur SSO
          // Google) plutôt qu'un vrai zombie. Wiper détruisait des sessions
          // valides → user éjecté vers /Login au refresh. On dégrade en mémoire
          // (session=null pour ce mount) MAIS on préserve les tokens : le
          // prochain refresh retente getSession avec le state intact. Le vrai
          // nettoyage destructif reste accessible via signOut() explicite.
          // eslint-disable-next-line no-console
          console.error('[PlatformAuth] getSession slow/hung —', timeoutErr.message,
            '→ degrading to anonymous (tokens preserved in storage)');
          session = null;
        }
        if (!active) return;
        setAuthUser(session?.user ?? null);
        const result = await loadIdentity(session?.user?.email);
        // Retry background (full/partial outage) ou recovery session zombie —
        // logique centralisée, partagée avec onAuthStateChange. Cf. handleLoadResult.
        if (session?.user) handleLoadResult(result, session.user.email);
        // Sentry : on attache l'identité dès qu'on a la session. {id, email}
        // seulement — pas de PII supplémentaire (cf. observability/sentry.js).
        if (session?.user) {
          setSentryUser({ id: session.user.id, email: session.user.email });
        } else {
          clearSentryUser();
        }
        // eslint-disable-next-line no-console
        console.warn('[PlatformAuth] loadIdentity done');
      } catch (err) {
        // 2026-05-29 — on NE wipe PLUS le localStorage ici non plus. Une exception
        // pendant loadIdentity (RPC transitoire, setSentryUser qui throw, etc.) ne
        // doit pas détruire la session : elle est probablement valide. On dégrade
        // juste en mémoire (authUser=null pour ce mount). Le wipe destructif était
        // observé en prod via les logs Supabase comme cause probable des kick-outs
        // récurrents (full SSO Google toutes les ~30min sans refresh_token entre).
        // eslint-disable-next-line no-console
        console.error('[PlatformAuth] init failed (tokens preserved):', err);
        if (active) setAuthUser(null);
      } finally {
        if (active) {
          clearTimeout(initWatchdog);
          setLoading(false);
        }
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // DIAGNOSTIC 2026-05-29 — on logge le type d'événement Supabase pour
      // identifier quel événement kick l'utilisateur en prod. Événements possibles :
      // INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED,
      // PASSWORD_RECOVERY. Un SIGNED_OUT inattendu = signOut() côté client OU
      // refresh failure côté SDK. Pas de PII : juste event + bool session.
      // eslint-disable-next-line no-console
      console.warn('[PlatformAuth] onAuthStateChange', { event: _event, hasSession: !!session?.user });
      try {
        setAuthUser(session?.user ?? null);
        // FIX 2026-06-05 — Cause root du kick-out master_admin observé en prod :
        // TOKEN_REFRESHED (auto-refresh Supabase toutes les ~30-50min) ré-déclenchait
        // loadIdentity → 4 RPC en parallèle dont rsa_my_roles. Si une timeout (4s
        // était court sur réseau froid), setRoles([]) → l'utilisateur perdait ses
        // rôles instantanément → /Admin tombait en "Forbidden" alors qu'il était
        // master_admin la seconde d'avant.
        //
        // Le token est juste rafraîchi (access_token mis à jour) ; l'identité
        // (email, rôles, club_memberships, competition_admin_editions) ne change
        // PAS. On skip loadIdentity pour ces événements :
        //   * TOKEN_REFRESHED : rien à recharger côté identité
        //   * INITIAL_SESSION : déjà chargé par l'IIFE init au mount (race évitée)
        //
        // On garde le rechargement pour SIGNED_IN (nouveau login), SIGNED_OUT (clear),
        // USER_UPDATED (email/profile peut avoir changé), PASSWORD_RECOVERY.
        const IDENTITY_NOOP_EVENTS = new Set(['TOKEN_REFRESHED', 'INITIAL_SESSION']);
        if (IDENTITY_NOOP_EVENTS.has(_event)) {
          // eslint-disable-next-line no-console
          console.warn('[PlatformAuth] onAuthStateChange skipping loadIdentity for', _event);
          if (session?.user) {
            setSentryUser({ id: session.user.id, email: session.user.email });
          }
          return;
        }
        const result = await loadIdentity(session?.user?.email);
        // FIX 2026-05-30 — sur SIGNED_IN (notamment retour SSO Google/Microsoft),
        // piloter retry/recovery comme l'IIFE. Avant, ce chemin ne programmait
        // AUCUN retry : si rsa_my_roles erreurait ici, le user restait coincé.
        if (session?.user) handleLoadResult(result, session.user.email);
        if (session?.user) {
          setSentryUser({ id: session.user.id, email: session.user.email });
        } else {
          clearSentryUser();
        }
      } catch (err) {
        // Même garde défensive que l'IIFE : une exception ici (ex. déconnexion réseau
        // pendant un TOKEN_REFRESHED → la requête /profiles plante) ne doit pas remonter
        // jusqu'à l'unhandledrejection global ni empêcher le `setLoading(false)` initial
        // déjà effectué. On dégrade gentiment vers un état role-less, le UI passera en
        // « non authentifié » ou « pas de rôle » selon le cas.
        // eslint-disable-next-line no-console
        console.error('[PlatformAuth] onAuthStateChange failed:', err);
      }
    });

    return () => {
      active = false;
      clearTimeout(initWatchdog);
      subscription.unsubscribe();
    };
  }, [loadIdentity]);

  // Envoie un lien de connexion par email. redirectPath = page de retour après clic.
  // F7 — On capture les erreurs Supabase (rate-limit, SMTP, redirect-URL non whitelistée…)
  // dans Sentry avec un breadcrumb PII-safe (fingerprint email + redirectPath).
  const signInWithMagicLink = useCallback(
    async (email, redirectPath = '/') => {
      const normalized = String(email).trim();
      const fingerprint = emailFingerprint(normalized.toLowerCase());
      // Breadcrumb d'intention — visible dans le breadcrumb-trail Sentry si une
      // erreur survient ensuite. Pas captureException ici (pas une erreur).
      try {
        Sentry?.addBreadcrumb?.({
          category: 'auth.magic-link',
          level: 'info',
          message: 'signInWithMagicLink attempt',
          data: { email_fp: fingerprint, redirectPath, app_url: APP_URL },
        });
      } catch {
        /* Sentry indispo */
      }
      const result = await supabase.auth.signInWithOtp({
        email: normalized,
        options: { emailRedirectTo: `${APP_URL}${redirectPath}` },
      });
      if (result?.error) {
        // Erreur retournée par Supabase — on remonte dans Sentry avec contexte PII-safe.
        captureException(result.error, {
          tag: 'auth.magic-link',
          email_fp: fingerprint,
          redirectPath,
          app_url: APP_URL,
        });
      }
      return result;
    },
    [],
  );

  // SSO V3.0 — Google + Microsoft (Azure AD) en parallèle du magic-link.
  // Cible : jurés CEO de grands groupes dont l'email DLP/throttling bloque souvent
  // les magic-links Resend. Sans SSO ils peuvent simplement pas se connecter.
  // Cf. docs/onboarding/sso-setup.md pour la config providers (Supabase Dashboard
  // → Authentication → Providers → Google + Azure activés).
  //
  // ⚠ MERGE NOTE (équipe C) : ces méthodes sont placées en BAS du fichier, juste
  // avant `signOut`, pour réduire le conflit avec les équipes A (useEffect / boot)
  // et B (signOut / cleanup). Si conflit néanmoins, garder les 3 signIn* + signOut.
  const signInWithGoogle = useCallback(
    (redirectPath = '/') =>
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${APP_URL}${redirectPath}` },
      }),
    [],
  );
  const signInWithMicrosoft = useCallback(
    (redirectPath = '/') =>
      supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: { redirectTo: `${APP_URL}${redirectPath}`, scopes: 'email' },
      }),
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setProfile(null);
    setRoles([]);
    setRolesLoaded(false);
    setClubMemberships([]);
    setCompetitionAdminEditions([]);
    // F8 — Coordination cross-provider : on signale aux autres AuthProviders
    // (AuthContext hérité déjeuners, éventuels providers V4 multi-club) que la
    // session a été détruite, sans attendre que onAuthStateChange fire (qui
    // peut prendre du temps en cas de réseau lent). Petit, simple, downstream.
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('rsa-signout'));
      } catch {
        /* CustomEvent peut throw dans certains environnements de test */
      }
    }
    // Sentry : on désattache l'identité immédiatement — toute exception
    // ultérieure restera "anonyme" jusqu'au prochain login.
    clearSentryUser();
  }, []);

  const hasRole = useCallback((r) => roles.includes(r), [roles]);

  // V2 — helpers club-scoped
  const hasClubRole = useCallback(
    (clubId, role) => clubMemberships.some((m) => m.club_id === clubId && m.role === role),
    [clubMemberships],
  );

  // V3 — helper competition_admin scoped à une édition donnée.
  const isCompetitionAdminOf = useCallback(
    (editionId) => competitionAdminEditions.includes(editionId),
    [competitionAdminEditions],
  );

  // Liste dédupliquée des club_id que le user peut administrer (club_admin direct OU master_admin = tous)
  // Note : pour les master_admins, "tous les clubs" ne peut être résolu qu'en chargeant Club.listAll()
  // côté consommateur. Ici on expose uniquement les club_admin directs.
  const myAdminClubs = clubMemberships.filter((m) => m.role === 'club_admin').map((m) => m.club_id);

  const value = {
    authUser,
    profile,
    roles,
    loading,
    identityLoaded,                                    // true après 1er loadIdentity réussi (1 RPC sur 4)
    rolesLoaded,                                       // true UNIQUEMENT après rsa_my_roles confirmée — source de vérité pour le routing post-Login
    isAuthenticated: !!authUser,
    isJury: roles.includes('jury'),
    isComite: roles.includes('comite'),
    isAdmin: roles.includes('admin'),
    // V2 multi-club
    isMasterAdmin: roles.includes('master_admin'),
    clubMemberships,                                   // [{club_id, role}, ...]
    myAdminClubs,                                      // string[] (club_admin direct)
    // V3 competition_admin tier
    competitionAdminEditions,                          // string[] (text[] des éditions administrées)
    isCompetitionAdmin: competitionAdminEditions.length > 0,
    isCompetitionAdminOf,
    hasRole,
    hasClubRole,
    signInWithMagicLink,
    signInWithGoogle,
    signInWithMicrosoft,
    signOut,
  };

  return <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>;
}

export function usePlatformAuth() {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) throw new Error('usePlatformAuth must be used within a PlatformAuthProvider');
  return ctx;
}
