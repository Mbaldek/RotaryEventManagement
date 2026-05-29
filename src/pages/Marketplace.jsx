// /Marketplace — V3.0 Vague 4.
//
// Hero variant : H-Index-Numeral (banque §16.1) — giant tabular numeral du
// count d'extensions + label EXTENSIONS + intro. Opener S-Verb-Led "ÉTENDEZ".
// Cf. design-upgrade-blueprint §3.1 + §4.7.
//
// Catalogue public-ish des extensions scope='master' active=true. Les
// club_admin / master_admin peuvent les "installer" pour un de leurs clubs
// (clone vers extensions scope='club' via rsa_install_extension_to_club).
//
// Pattern : reproduit le shell éditorial Élysée (PageShell + TopNav + Footer)
// commun aux autres pages publiques (/Concours, /Welcome). Auth requise pour
// installer (un visiteur peut voir le catalogue mais le bouton "Activer" ouvre
// une modale qui demande le picker club ; sans rôle club_admin, redirect /Login).
//
// Filtre par kind via pills (réutilise le pattern ExtensionsList).
// Modale install : FunnelEditorModal avec un picker des clubs admin.

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate, Link } from 'react-router-dom';
import { Loader2, Plus, Check, AlertTriangle, ChevronRight } from 'lucide-react';
import {
  PageShell, TopNav, Footer, Field, Select,
  NAVY, INK, GOLD, CREAM2, MUTED, SERIF, EASE,
} from '@/components/design';
import { DANGER, TINT_DANGER } from '@/components/design/tokens.app';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';
import FunnelEditorModal from '@/components/rsa/admin/platform/funnel/FunnelEditorModal';
import { useExtensions, useInstallExtensionToClub } from '@/components/rsa/extensions/useExtensions';
import {
  EXT_KIND_LABELS, MARKETPLACE_UI,
} from '@/components/rsa/extensions/i18n';
import { EXTENSION_KINDS } from '@/lib/rsa/extensions';

// ── KindFilter (mirror ExtensionsList — pas DRY mais simple à lire) ─────────
function KindFilter({ value, onChange }) {
  const { t } = useLang();
  const pills = [
    { id: 'all', label: t(MARKETPLACE_UI.filterAll) },
    ...EXTENSION_KINDS.map((k) => ({ id: k, label: t(EXT_KIND_LABELS[k]) })),
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="tablist">
      {pills.map((p) => {
        const active = value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(p.id)}
            className="px-3 py-1 rounded-full text-[11.5px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] transition-colors"
            style={{
              background: active ? NAVY : 'white',
              color: active ? 'white' : INK,
              border: `1px solid ${active ? NAVY : CREAM2}`,
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Card d'une extension ────────────────────────────────────────────────────
function ExtensionCard({ extension, onActivate, isInstalled, installable, t, className = '' }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.22, ease: EASE }}
      className={`rounded-[4px] p-5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm hover:border-[#c9a84c]/60 ${className}`}
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      <div className="flex items-start gap-2 mb-2 flex-wrap">
        <span
          className="inline-flex items-center text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-0.5 rounded-full"
          style={{ background: '#fdf6e8', color: NAVY, border: `1px solid ${CREAM2}` }}
        >
          {t(EXT_KIND_LABELS[extension.kind] || { fr: extension.kind, en: extension.kind, de: extension.kind })}
        </span>
        <span
          className="inline-flex items-center text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'white', color: MUTED, border: `1px solid ${CREAM2}` }}
        >
          {t(MARKETPLACE_UI.badgeMaster)}
        </span>
      </div>

      <h3
        className="text-[18px] leading-tight"
        style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
      >
        {extension.name}
      </h3>
      {extension.description && (
        <p className="text-[12.5px] mt-2 leading-relaxed" style={{ color: INK }}>
          {extension.description}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[11px]" style={{ color: MUTED }}>
          {/* eslint-disable-next-line no-extra-parens */}
          {extension.created_at?.slice(0, 10)}
        </span>
        <button
          type="button"
          onClick={() => onActivate(extension)}
          disabled={!installable || isInstalled}
          className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] disabled:opacity-50"
          style={{
            background: isInstalled ? 'white' : NAVY,
            color: isInstalled ? NAVY : 'white',
            border: `1px solid ${NAVY}`,
          }}
          aria-label={isInstalled ? t(MARKETPLACE_UI.installed) : t(MARKETPLACE_UI.install)}
        >
          {isInstalled ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {isInstalled ? t(MARKETPLACE_UI.installed) : t(MARKETPLACE_UI.install)}
        </button>
      </div>
    </motion.li>
  );
}

// ── Modale install (FunnelEditorModal réutilisé) ────────────────────────────
function InstallModal({ open, onClose, extension, adminClubs, onInstall, status, error, t }) {
  const [pickedClubId, setPickedClubId] = useState(adminClubs[0] || '');

  // Reset quand on rouvre avec une autre extension
  React.useEffect(() => {
    if (open) setPickedClubId(adminClubs[0] || '');
  }, [open, extension?.id, adminClubs]);

  if (!extension) return null;

  const clubOptions = adminClubs.map((cid) => ({ value: cid, label: cid }));

  const tabs = [
    {
      id: 'pick',
      label: t(MARKETPLACE_UI.pickClub),
      render: () => (
        <div className="flex flex-col gap-5">
          <div
            className="rounded-[4px] p-3"
            style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
          >
            <p className="uppercase tracking-[0.14em] text-[10.5px] mb-1" style={{ color: MUTED }}>
              {t(EXT_KIND_LABELS[extension.kind])}
            </p>
            <h4
              className="text-[16px] leading-tight"
              style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
            >
              {extension.name}
            </h4>
            {extension.description && (
              <p className="text-[12px] mt-1" style={{ color: INK }}>{extension.description}</p>
            )}
          </div>

          <Field
            label={t(MARKETPLACE_UI.pickClub)}
            required
          >
            {({ id, describedBy }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                options={clubOptions}
                value={pickedClubId}
                onChange={(e) => setPickedClubId(e.target.value)}
                disabled={status === 'saving'}
              />
            )}
          </Field>

          {status === 'saved' && (
            <p
              className="text-[12px] rounded-[4px] p-2.5"
              style={{ background: '#ecf1e5', color: NAVY, border: `1px solid ${CREAM2}` }}
              role="status"
            >
              {t(MARKETPLACE_UI.installSuccess)}
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <FunnelEditorModal
      open={open}
      onClose={onClose}
      title={t(MARKETPLACE_UI.install)}
      eyebrow={t(MARKETPLACE_UI.eyebrow)}
      tabs={tabs}
      activeTab="pick"
      onTabChange={() => {}}
      status={status}
      statusMessage={
        status === 'saving'
          ? t(MARKETPLACE_UI.installing)
          : status === 'saved'
            ? t(MARKETPLACE_UI.installed)
            : undefined
      }
      destructiveSlot={
        <div className="flex items-center gap-2 flex-wrap">
          {error && (
            <span className="text-[12px]" style={{ color: DANGER }} role="alert">{error}</span>
          )}
          <button
            type="button"
            onClick={() => onInstall(pickedClubId)}
            disabled={!pickedClubId || status === 'saving'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ background: NAVY, color: 'white' }}
          >
            {status === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {status === 'saving' ? t(MARKETPLACE_UI.installing) : t(MARKETPLACE_UI.install)}
            {status !== 'saving' && <ChevronRight className="w-3 h-3" />}
          </button>
        </div>
      }
    />
  );
}

// ── Page principale ─────────────────────────────────────────────────────────
export default function Marketplace() {
  const { t } = useLang();
  const {
    isAuthenticated,
    isMasterAdmin,
    myAdminClubs,
    loading: authLoading,
  } = usePlatformAuth();

  // Catalogue : extensions scope=master (le RPC les filtre serveur ; RLS
  // permet la lecture publique pour active=true, donc même anon voit).
  const masterExtsQ = useExtensions({ scope: 'master' });

  // Toutes les extensions club de l'utilisateur (pour savoir si déjà installées).
  // En pratique on n'a qu'un appel par club admin ; on aggrege.
  const adminClubs = myAdminClubs || [];
  const firstClubExtsQ = useExtensions(
    adminClubs.length > 0 ? { scope: 'club', clubId: adminClubs[0] } : {},
  );
  // Note : pour V4 on n'affiche le badge "installé" que pour le premier club
  // d'admin (l'utilisateur peut quand même choisir un autre club via la modale).
  // Une vraie vue multi-club arriverait en V4.1 (cf. roadmap).

  const installMut = useInstallExtensionToClub();

  const [kindFilter, setKindFilter] = useState('all');
  const [modalExt, setModalExt] = useState(null);
  const [installStatus, setInstallStatus] = useState('idle'); // idle|saving|saved|error
  const [installError, setInstallError] = useState(null);

  const extensions = useMemo(
    () => (masterExtsQ.data || []).filter((e) => e.active),
    [masterExtsQ.data],
  );
  const filtered = useMemo(
    () => (kindFilter === 'all' ? extensions : extensions.filter((e) => e.kind === kindFilter)),
    [extensions, kindFilter],
  );

  // Map kind+name → installed
  const installedSet = useMemo(() => {
    const out = new Set();
    for (const e of firstClubExtsQ.data || []) {
      out.add(`${e.kind}::${e.name}`);
    }
    return out;
  }, [firstClubExtsQ.data]);

  const canInstall = isAuthenticated && (isMasterAdmin || adminClubs.length > 0);

  function handleActivate(ext) {
    setInstallError(null);
    setInstallStatus('idle');
    if (!canInstall) {
      // L'auth-gate sera respecté dans la modale via le message ; on ouvre
      // quand même pour expliciter pourquoi
      setModalExt(ext);
      return;
    }
    setModalExt(ext);
  }

  async function handleInstallConfirm(clubId) {
    if (!modalExt || !clubId) return;
    setInstallStatus('saving');
    setInstallError(null);
    try {
      await installMut.mutateAsync({ masterExtensionId: modalExt.id, clubId });
      setInstallStatus('saved');
      // Laisser l'utilisateur voir le succès, puis fermer
      setTimeout(() => {
        setModalExt(null);
        setInstallStatus('idle');
      }, 1500);
    } catch (err) {
      setInstallStatus('error');
      setInstallError(err?.message || String(err));
    }
  }

  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/Login?next=%2FMarketplace" replace />;
  }

  return (
    <PageShell
      width="wide"
      nav={<TopNav wordmark={t(MARKETPLACE_UI.navTitle)} subtitle={t(MARKETPLACE_UI.navSubtitle)} />}
      footer={
        <Footer
          width="wide"
          left={
            <span>
              {t({
                fr: 'Plateforme · Marketplace',
                en: 'Platform · Marketplace',
                de: 'Plattform · Marktplatz',
              })}
            </span>
          }
          right={
            <Link
              to="/Admin"
              className="underline decoration-1 underline-offset-2"
              style={{ color: NAVY }}
            >
              {t({ fr: 'Retour au cockpit', en: 'Back to cockpit', de: 'Zurück zum Cockpit' })}
            </Link>
          }
        />
      }
    >
      {/* Hero H-Index-Numeral — giant tabular numeral du count + label + intro. */}
      <section className="mb-10 md:mb-14 flex items-start gap-6 md:gap-10">
        <span
          className="tabular-nums shrink-0"
          style={{
            fontFamily: SERIF,
            color: NAVY,
            fontSize: 'clamp(80px, 12vw, 140px)',
            lineHeight: 0.9,
            fontWeight: 400,
            letterSpacing: '-0.02em',
          }}
          aria-hidden
        >
          {extensions.length}
        </span>
        <div className="pt-2 md:pt-5 min-w-0 flex-1">
          <span
            className="uppercase text-[10.5px] tracking-[0.18em] font-medium block"
            style={{ color: GOLD }}
          >
            {t(MARKETPLACE_UI.eyebrow)}
          </span>
          <h1
            className="mt-2 text-[28px] md:text-[34px] leading-tight"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {t(MARKETPLACE_UI.pageTitle)}
          </h1>
          <p className="mt-3 text-[14px] max-w-[58ch]" style={{ color: INK, lineHeight: 1.65 }}>
            {t(MARKETPLACE_UI.pageSubtitle)}
          </p>
        </div>
      </section>

      {/* Opener S-Verb-Led — verbe à l'impératif. */}
      <section className="mb-4">
        <div className="mb-3">
          <span
            className="block uppercase tracking-[0.22em] text-[11px] font-medium"
            style={{ color: NAVY }}
          >
            {t({ fr: 'Étendez', en: 'Extend', de: 'Erweitern' })}
          </span>
          <span
            className="block italic text-[13px] mt-1"
            style={{ color: MUTED, fontFamily: SERIF }}
          >
            {t({
              fr: 'Filtrez par usage pour trouver le bon module.',
              en: 'Filter by purpose to find the right module.',
              de: 'Nach Zweck filtern, um das passende Modul zu finden.',
            })}
          </span>
        </div>
        <KindFilter value={kindFilter} onChange={setKindFilter} />
      </section>

      {!canInstall && isAuthenticated && (
        <div
          className="rounded-[4px] p-3 mb-4 text-[12.5px]"
          style={{ color: INK, background: TINT_DANGER, borderLeft: `2px solid ${DANGER}` }}
          role="status"
        >
          <AlertTriangle className="inline w-3.5 h-3.5 mr-1.5" style={{ color: DANGER }} />
          {t(MARKETPLACE_UI.noClubRole)}
        </div>
      )}

      {(masterExtsQ.isLoading || authLoading) && (
        <div className="py-10 flex justify-center" role="status" aria-busy="true">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {!masterExtsQ.isLoading && filtered.length === 0 && (
        <div
          className="rounded-[4px] p-8 text-center"
          style={{ background: 'white', border: `1px dashed ${CREAM2}` }}
        >
          <h3
            className="text-[16px] mb-1"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {t(MARKETPLACE_UI.emptyTitle)}
          </h3>
          <p className="text-[12.5px]" style={{ color: MUTED }}>
            {t(MARKETPLACE_UI.emptyBody)}
          </p>
        </div>
      )}

      {/* Layout featured + grid : la plus récente extension en carte 2/3 large,
          le reste en grid 2/3 colonnes dans le même <ul>. */}
      {!masterExtsQ.isLoading && filtered.length > 0 && (() => {
        const sorted = [...filtered].sort((a, b) =>
          (b.created_at || '').localeCompare(a.created_at || '')
        );
        return (
          <>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
              <span className="uppercase text-[10px] tracking-[0.18em] font-medium" style={{ color: GOLD }}>
                {t({
                  fr: 'Nouveauté en tête',
                  en: 'Featured release',
                  de: 'Empfohlene Neuheit',
                })}
              </span>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <AnimatePresence mode="popLayout">
                {sorted.map((ext, i) => (
                  <ExtensionCard
                    key={ext.id}
                    extension={ext}
                    onActivate={handleActivate}
                    isInstalled={installedSet.has(`${ext.kind}::${ext.name}`)}
                    installable={canInstall}
                    t={t}
                    className={i === 0 ? 'md:col-span-2' : ''}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </>
        );
      })()}

      <InstallModal
        open={!!modalExt}
        onClose={() => {
          setModalExt(null);
          setInstallStatus('idle');
          setInstallError(null);
        }}
        extension={modalExt}
        adminClubs={adminClubs}
        onInstall={handleInstallConfirm}
        status={installStatus}
        error={installError}
        t={t}
      />
    </PageShell>
  );
}
