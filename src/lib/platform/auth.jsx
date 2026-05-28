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

const PlatformAuthContext = createContext(null);

// Base URL pour le retour des magic links. En prod : https://app.rotary-startup.org
const APP_URL = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');

export function PlatformAuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null); // session.user (auth.users)
  const [profile, setProfile] = useState(null); // ligne profiles (identité, peut être null)
  const [roles, setRoles] = useState([]); // app_user_roles.roles
  const [loading, setLoading] = useState(true);

  const loadIdentity = useCallback(async (email) => {
    if (!email) {
      setProfile(null);
      setRoles([]);
      return;
    }
    // R-M4 : eq + normalisation lowercase plutôt qu'ilike, pour éviter les wildcards
    // `%`/`_` qui faisaient matcher des emails proches (a_b@x.com ≅ a-b@x.com).
    const norm = String(email).trim().toLowerCase();
    const [{ data: prof }, { data: roleRow }] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, role').eq('email', norm).maybeSingle(),
      supabase.from('app_user_roles').select('roles').eq('email', norm).maybeSingle(),
    ]);
    setProfile(prof ?? null);
    setRoles(roleRow?.roles ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        setAuthUser(session?.user ?? null);
        await loadIdentity(session?.user?.email);
      } catch (err) {
        // Fix défensif : si getSession ou loadIdentity throw, on libère quand même
        // le verrou de loading (sinon le spinner reste à l'infini sans message d'erreur).
        // L'erreur reste console.error pour diagnostic, la page passera en "non auth"
        // (-> /Login) ou rendra son état role-less plutôt que de bloquer le UI.
        // eslint-disable-next-line no-console
        console.error('[PlatformAuth] init failed:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setAuthUser(session?.user ?? null);
        await loadIdentity(session?.user?.email);
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
  }, []);

  const hasRole = useCallback((r) => roles.includes(r), [roles]);

  const value = {
    authUser,
    profile,
    roles,
    loading,
    isAuthenticated: !!authUser,
    isJury: roles.includes('jury'),
    isComite: roles.includes('comite'),
    isAdmin: roles.includes('admin'),
    hasRole,
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
