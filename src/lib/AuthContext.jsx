import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({});

  useEffect(() => {
    checkAppState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.email);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    // F8 — Coordination cross-provider du signOut.
    // PlatformAuthProvider (plateforme RSA) dispatch `rsa-signout` quand un user
    // se déconnecte ; si l'AuthProvider hérité (déjeuners) est monté côté shell
    // (cas dev local sans isPlatformHost(), ou hôte hérité), on reset son state
    // tout de suite plutôt que d'attendre que onAuthStateChange fire (qui peut
    // arriver avec un délai après supabase.auth.signOut() en cas de réseau lent).
    const onPlatformSignout = () => {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(null);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('rsa-signout', onPlatformSignout);
    }

    return () => {
      subscription.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('rsa-signout', onPlatformSignout);
      }
    };
  }, []);

  const loadProfile = async (email) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();
      if (profile) {
        setUser(profile);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Profile load failed:', error);
    }
  };

  const checkAppState = async () => {
    try {
      setIsLoadingAuth(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadProfile(session.user.email);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// useAuthOrNull — variante "safe" pour les arbres où l'AuthProvider hérité (déjeuners)
// peut être ABSENT (cas du domaine plateforme app.rotary-startup.org où on bypass
// l'AuthProvider entièrement via AuthProviderGate, cf. App.jsx). Ne throw pas et
// retourne `null` au lieu, permettant au composant appelant de fallback proprement
// sur des valeurs par défaut.
export const useAuthOrNull = () => {
  return useContext(AuthContext) || null;
};
