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
import { setSentryUser, clearSentryUser } from '@/lib/observability/sentry';

const PlatformAuthContext = createContext(null);

// Base URL pour le retour des magic links. En prod : https://app.rotary-startup.org
const APP_URL = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');

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
    const [{ data: prof }, rolesRes, cmRes] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, role').eq('email', norm).maybeSingle(),
      supabase.rpc('rsa_my_roles'),
      supabase.rpc('my_club_memberships'),
    ]);
    setProfile(prof ?? null);
    setRoles(Array.isArray(rolesRes?.data) ? rolesRes.data : []);
    setClubMemberships(Array.isArray(cmRes?.data) ? cmRes.data : []);
  }, []);

  useEffect(() => {
    let active = true;

    // Garde-fou ABSOLU : si pour une raison quelconque la chaîne init ne fire pas son
    // `finally` (ex. supabase.auth.getSession() ne résout JAMAIS — observé 2026-05-28
    // sur app.rotary-startup.org où le `loading` restait true → MagicLinkLogin jamais
    // monté, donc utilisateur bloqué sur PageShell vide), on force loading=false après
    // 4s. Pire cas : on rend l'UI "non auth" avec le formulaire dispo, plutôt qu'un
    // écran figé. Le diagnostic reste visible en console (cf. logs ci-dessous).
    const initWatchdog = setTimeout(() => {
      if (active) {
        // eslint-disable-next-line no-console
        console.warn('[PlatformAuth] init watchdog fired (4s) — forcing loading=false. ' +
          'Probable cause: supabase.auth.getSession() did not resolve.');
        setLoading(false);
      }
    }, 4000);

    (async () => {
      // eslint-disable-next-line no-console
      console.debug('[PlatformAuth] init start');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        // eslint-disable-next-line no-console
        console.debug('[PlatformAuth] getSession resolved, session?', !!session);
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
        console.debug('[PlatformAuth] loadIdentity done');
      } catch (err) {
        // Fix défensif : si getSession ou loadIdentity throw, on libère quand même
        // le verrou de loading (sinon le spinner reste à l'infini sans message d'erreur).
        // L'erreur reste console.error pour diagnostic, la page passera en "non auth"
        // (-> /Login) ou rendra son état role-less plutôt que de bloquer le UI.
        // eslint-disable-next-line no-console
        console.error('[PlatformAuth] init failed:', err);
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
  const signInWithMagicLink = useCallback(
    (email, redirectPath = '/') =>
      supabase.auth.signInWithOtp({
        email: String(email).trim(),
        options: { emailRedirectTo: `${APP_URL}${redirectPath}` },
      }),
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setProfile(null);
    setRoles([]);
    setClubMemberships([]);
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
    signOut,
  };

  return <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>;
}

export function usePlatformAuth() {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) throw new Error('usePlatformAuth must be used within a PlatformAuthProvider');
  return ctx;
}
