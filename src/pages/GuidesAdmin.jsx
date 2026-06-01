// /GuidesAdmin — CRUD des guides contextuels. Admin-only.
//
// Gate aligné sur Admin.jsx : usePlatformAuth() → spinner tant que l'auth charge
// (authLoading ou identité pas encore chargée), redirection /Login si non
// authentifié, puis prédicat admin identique (master_admin OU club_admin OU
// admin legacy). Charge les éditions pour le picker de portée du GuidesManager.

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import {
  PageShell,
  PlatformFooter,
  Eyebrow,
  EditorialTitle,
  SafeBackLink,
  GOLD,
  INK,
} from '@/components/design';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';
import { Edition } from '@/lib/rsa/entities';
import GuidesManager from '@/components/rsa/admin/guides/GuidesManager';

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

export default function GuidesAdmin() {
  const { t } = useLang();
  const {
    isAuthenticated,
    isAdmin,
    isMasterAdmin,
    myAdminClubs,
    loading: authLoading,
    identityLoaded,
  } = usePlatformAuth();

  // Prédicat admin identique à Admin.jsx : master_admin OU club_admin OU legacy admin.
  const hasMaster = isMasterAdmin;
  const hasClubAdmin = (myAdminClubs || []).length > 0;
  const hasLegacyAdmin = isAdmin;
  const isGuideAdmin = hasMaster || hasClubAdmin || hasLegacyAdmin;

  const editionsQ = useQuery({
    queryKey: ['rsa', 'guides', 'admin-editions'],
    queryFn: () => Edition.listAllForAdmin(),
    staleTime: 5 * 60 * 1000,
    enabled: isGuideAdmin,
  });

  // Tant que l'auth charge ou que l'identité n'a pas été résolue au moins une
  // fois, on ne tranche pas (sinon flash Forbidden / redirection erronée).
  if (authLoading || !identityLoaded) {
    return (
      <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
        <Centered>
          <Spinner />
        </Centered>
      </PageShell>
    );
  }
  if (!isAuthenticated) return <Navigate to="/Login" replace />;
  if (!isGuideAdmin) return <Navigate to="/Login" replace />;

  return (
    <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
      <div className="mb-4">
        <SafeBackLink to="/Admin" label="Retour" />
      </div>
      <header className="mb-8 md:mb-10">
        <Eyebrow>{t({ fr: 'Administration', en: 'Administration', de: 'Verwaltung' })}</Eyebrow>
        <EditorialTitle lead={t({ fr: 'Guides', en: 'Guides', de: 'Anleitungen' })} size="md" />
        <p className="mt-3 text-[14px] max-w-[60ch]" style={{ color: INK, lineHeight: 1.65 }}>
          {t({
            fr: 'Rédigez l’aide affichée dans le panneau « Guide » de chaque espace, en FR/EN/DE.',
            en: 'Write the help shown in each space’s “Guide” panel, in FR/EN/DE.',
            de: 'Verfassen Sie die Hilfe im „Anleitung“-Panel jedes Bereichs, in FR/EN/DE.',
          })}
        </p>
      </header>

      <GuidesManager editions={editionsQ.data || []} />
    </PageShell>
  );
}
