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

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
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
  const [loading, setLoading] = useState(true);

  const loadIdentity = useCallback(async (email) => {
    if (!email) {
      setProfile(null);
      setRoles([]);
      setClubMemberships([]);
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
    // SELF-HEALING : timeout 4s sur chaque query (cf. observation prod 2026-05-29
    // où ces queries peuvent hang quand le client supabase est en état zombie).
    // Sur timeout, on retombe sur {data: null, error: timeout} → roles=[] et
    // l'utilisateur retourne sur /Login plutôt que de rester bloqué.
    const withTimeout = (promise, ms, label) =>
      Promise.race([
        promise,
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: `${label} timeout ${ms}ms` } }), ms),
        ),
      ]);
    const [profRes, rolesRes, cmRes] = await Promise.all([
      withTimeout(
        supabase.from('profiles').select('id, email, full_name, role').eq('email', norm).maybeSingle(),
        4000, 'profiles',
      ),
      withTimeout(supabase.rpc('rsa_my_roles'), 4000, 'rsa_my_roles'),
      withTimeout(supabase.rpc('my_club_memberships'), 4000, 'my_club_memberships'),
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
    });
    setProfile(profRes?.data ?? null);
    setRoles(Array.isArray(rolesRes?.data) ? rolesRes.data : []);
    setClubMemberships(Array.isArray(cmRes?.data) ? cmRes.data : []);
  }, []);

  useEffect(() => {
    let active = true;

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
    const initWatchdog = setTimeout(() => {
      if (active) {
        // eslint-disable-next-line no-console
        console.warn('[PlatformAuth] init watchdog fired (4s) — forcing loading=false + clean.');
        setLoading(false);
      }
    }, 4000);

    const getSessionWithTimeout = () => {
      const timeoutMs = 3000;
      return Promise.race([
        supabase.auth.getSession(),
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
          // eslint-disable-next-line no-console
          console.error('[PlatformAuth] getSession HUNG —', timeoutErr.message,
            '→ clearing corrupted session');
          await cleanCorruptedSession();
          session = null;
        }
        if (!active) return;
        setAuthUser(session?.user ?? null);
        await loadIdentity(session?.user?.email);
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
        // Fix défensif : si loadIdentity throw (ex. RPC rsa_my_roles hang), on
        // libère quand même le verrou de loading + on nettoie la session pour
        // que le user ne reste pas en zombie auth state.
        // eslint-disable-next-line no-console
        console.error('[PlatformAuth] init failed:', err);
        await cleanCorruptedSession();
        if (active) setAuthUser(null);
      } finally {
        if (active) {
          clearTimeout(initWatchdog);
          setLoading(false);
        }
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setAuthUser(session?.user ?? null);
        await loadIdentity(session?.user?.email);
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
    setClubMemberships([]);
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

  // Liste dédupliquée des club_id que le user peut administrer (club_admin direct OU master_admin = tous)
  // Note : pour les master_admins, "tous les clubs" ne peut être résolu qu'en chargeant Club.listAll()
  // côté consommateur. Ici on expose uniquement les club_admin directs.
  const myAdminClubs = clubMemberships.filter((m) => m.role === 'club_admin').map((m) => m.club_id);

  const value = {
    authUser,
    profile,
    roles,
    loading,
    isAuthenticated: !!authUser,
    isJury: roles.includes('jury'),
    isComite: roles.includes('comite'),
    isAdmin: roles.includes('admin'),
    // V2 multi-club
    isMasterAdmin: roles.includes('master_admin'),
    clubMemberships,                                   // [{club_id, role}, ...]
    myAdminClubs,                                      // string[] (club_admin direct)
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
