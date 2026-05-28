// Login plateforme RSA — porte UNIQUE (magic link). Après connexion, on route par rôle.
// (Seul l'espace startup existe pour l'instant ; jury/comité/admin y atterrissent aussi
//  en attendant leurs espaces dédiés — cf. routage post-login à enrichir.)

import React from 'react';
import { Navigate } from 'react-router-dom';
import { PageShell, MagicLinkLogin } from '@/components/design';
import { usePlatformAuth } from '@/lib/platform/auth';

export default function Login() {
  const { isAuthenticated, loading } = usePlatformAuth();

  if (!loading && isAuthenticated) {
    return <Navigate to="/MonDossier" replace />;
  }

  return (
    <PageShell>
      <div className="min-h-[70vh] flex items-center justify-center">
        {!loading && <MagicLinkLogin redirectPath="/MonDossier" />}
      </div>
    </PageShell>
  );
}
