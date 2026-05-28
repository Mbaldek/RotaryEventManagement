// Cockpit Admin — orchestrateur du Module 4a (SETUP / LIVE / RESULTS).
//
// Flux : auth-gate (-> /Login) -> role-gate (isAdmin) -> AdminShell + URL state.
// La frontière de sécurité reste serveur (RLS + RPC SECURITY DEFINER) ; le gate ici
// est purement UX (un comité-only sans rôle 'admin' tombe sur la carte Forbidden).
//
// Le shell consomme `?tab=`, `?edition=`, `?session=` (mirror legacy RsaAdmin).

import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PageShell, GOLD, NAVY, INK, SERIF } from '@/components/design';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';
import AdminShell from '@/components/rsa/admin/platform/AdminShell';
import { UI } from '@/components/rsa/admin/platform/i18n';

function Centered({ children, minHeight = '40vh' }) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight }}>
      {children}
    </div>
  );
}

function Spinner() {
  return <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} aria-hidden />;
}

export default function Admin() {
  const { isAuthenticated, isAdmin, loading: authLoading } = usePlatformAuth();
  const { t } = useLang();

  if (authLoading) {
    return (
      <PageShell nav width="wide">
        <Centered>
          <Spinner />
        </Centered>
      </PageShell>
    );
  }
  if (!isAuthenticated) return <Navigate to="/Login" replace />;

  if (!isAdmin) {
    return (
      <PageShell nav width="wide">
        <Centered minHeight="50vh">
          <div className="text-center max-w-md">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
              <span
                className="uppercase text-[10px] tracking-[0.18em] font-medium"
                style={{ color: GOLD }}
              >
                {t(UI.eyebrow)}
              </span>
              <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
            </div>
            <p className="text-[15px]" style={{ color: INK }}>
              {t(UI.noAccess)}
            </p>
          </div>
        </Centered>
      </PageShell>
    );
  }

  return (
    <PageShell nav width="wide">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
        <span
          className="uppercase text-[10px] tracking-[0.18em] font-medium"
          style={{ color: GOLD }}
        >
          {t(UI.eyebrow)}
        </span>
      </div>
      <h1
        className="text-[32px] leading-tight mb-2"
        style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
      >
        {t(UI.pageTitle)}
      </h1>
      <p className="text-[14px] mb-6" style={{ color: INK }}>
        {t(UI.pageSubtitle)}
      </p>

      <AdminShell />
    </PageShell>
  );
}
