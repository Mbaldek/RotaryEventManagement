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
import {
  PageShell,
  PlatformFooter,
  Eyebrow,
  EditorialTitle,
  GOLD,
  NAVY,
  INK,
  MUTED,
  CREAM2,
  FOCUS_RING_CLASS,
  SafeBackLink,
} from '@/components/design';
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
      <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
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
      <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
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
  if (hasMaster)        scopeOptions.push({ value: 'master', label: t(UI.scopeMaster) });
  if (hasClubAdmin)     adminClubs.forEach((c) => scopeOptions.push({ value: `club:${c}`, label: t(UI.scopeClub)(c) }));
  if (hasLegacyAdmin && !hasMaster && !hasClubAdmin) scopeOptions.push({ value: 'legacy', label: t(UI.scopeLegacy) });

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
    <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
      {/* ÉQUIPE C (history-nav) : lien "Retour" SAFE — navigate(-1) si history,
          sinon fallback "/" pour ne jamais sortir de l'onglet sur deep-link. */}
      <div className="mb-4">
        <SafeBackLink to="/" label="Retour" />
      </div>
      <header className="mb-8 md:mb-10">
        <Eyebrow>{t(UI.eyebrow)}</Eyebrow>
        <EditorialTitle lead={t(UI.pageTitle)} size="md" />
        <p className="mt-3 text-[14px] md:text-[15px] max-w-[60ch]" style={{ color: INK, lineHeight: 1.65 }}>
          {t(UI.pageSubtitle)}
        </p>
      </header>

      {scopeOptions.length > 1 && (
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <label
            htmlFor="admin-scope"
            className="text-[10.5px] uppercase tracking-[0.18em] font-medium"
            style={{ color: MUTED }}
          >
            {t(UI.viewLabel)}
          </label>
          <select
            id="admin-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className={`text-[13px] rounded-[4px] px-3 py-1.5 ${FOCUS_RING_CLASS}`}
            style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
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
