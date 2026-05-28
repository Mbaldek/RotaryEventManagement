// Cockpit Admin — orchestrateur du Module 4a (SETUP / LIVE / RESULTS).
//
// Flux : auth-gate (-> /Login) -> role-gate (isAdmin) -> AdminShell + URL state.
// La frontière de sécurité reste serveur (RLS + RPC SECURITY DEFINER) ; le gate ici
// est purement UX (un comité-only sans rôle 'admin' tombe sur la carte Forbidden).
//
// Le shell consomme `?tab=`, `?edition=`, `?session=` (mirror legacy RsaAdmin).

import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PageShell, GOLD, NAVY, INK, MUTED, SERIF } from '@/components/design';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';
import AdminShell from '@/components/rsa/admin/platform/AdminShell';
import MasterCockpit from '@/components/rsa/admin/platform/master/MasterCockpit';
import ClubCockpit from '@/components/rsa/admin/platform/club/ClubCockpit';
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
  const {
    isAuthenticated,
    isAdmin,
    isMasterAdmin,
    myAdminClubs,
    loading: authLoading,
  } = usePlatformAuth();
  const { t } = useLang();

  // V2 multi-club : sélecteur de scope (Master / Club X / AdminShell legacy)
  // - master_admin par défaut → Master Cockpit (vue plateforme globale)
  // - club_admin d'un ou plusieurs clubs → Club Cockpit (avec selector si N>1)
  // - admin legacy (sans master_admin ni club_admin) → AdminShell V1 (backward-compat)
  const hasMaster = isMasterAdmin;
  const adminClubs = myAdminClubs || [];
  const hasClubAdmin = adminClubs.length > 0;
  const hasLegacyAdmin = isAdmin;

  const initialScope = hasMaster
    ? 'master'
    : hasClubAdmin
      ? `club:${adminClubs[0]}`
      : hasLegacyAdmin
        ? 'legacy'
        : 'none';
  const [scope, setScope] = useState(initialScope);

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

  // Aucun rôle admin (master, club_admin ni legacy admin) → Forbidden
  if (!hasMaster && !hasClubAdmin && !hasLegacyAdmin) {
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

  // Construit les options du sélecteur de scope (visible si > 1 option)
  const scopeOptions = [];
  if (hasMaster)        scopeOptions.push({ value: 'master', label: 'Master Cockpit (plateforme)' });
  if (hasClubAdmin)     adminClubs.forEach((c) => scopeOptions.push({ value: `club:${c}`, label: `Club Cockpit · ${c}` }));
  if (hasLegacyAdmin && !hasMaster && !hasClubAdmin) scopeOptions.push({ value: 'legacy', label: 'Cockpit Admin (V1)' });

  // Rendu du contenu selon le scope
  let body;
  if (scope === 'master') {
    body = <MasterCockpit />;
  } else if (scope.startsWith('club:')) {
    body = <ClubCockpit clubId={scope.slice('club:'.length)} />;
  } else {
    body = <AdminShell />;
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
      <p className="text-[14px] mb-4" style={{ color: INK }}>
        {t(UI.pageSubtitle)}
      </p>

      {scopeOptions.length > 1 && (
        <div className="mb-5 flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>
            Vue :
          </span>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="text-[13px] rounded-[4px] px-3 py-1.5 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c9a84c]"
            style={{ background: 'white', border: '1px solid #e8e3d9', color: NAVY }}
          >
            {scopeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      {body}
    </PageShell>
  );
}
