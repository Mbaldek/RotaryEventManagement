// /AdminAdvanced — Paramètres avancés (développeur), master_admin only.
//
// Créée le 2026-05-29 (équipe A — drop "Outils avancés" + relocate).
//
// Pourquoi cette page existe :
//   Le tab 'advanced' du MasterCockpit groupait trois sections de natures
//   différentes :
//     1. Email Studio       — outil opérationnel utilisé fréquemment.
//     2. Extensions actives — placeholder dev (V3.1+) pour développeurs.
//     3. Marketplace        — placeholder dev (V3.1+) pour développeurs.
//   Mêler du dev "rare/infra" avec du flow opérationnel pollue le cockpit
//   principal. Email Studio est traité par l'équipe B. Extensions + Marketplace
//   atterrissent ici, derrière un item discret du UserMenu, visible seulement
//   pour master_admin.
//
// Auth gate :
//   * Non authentifié      → /Login
//   * Authentifié non-master → carte Forbidden (réutilise le pattern Admin.jsx)
//
// Layout :
//   * PageShell + nav + footer + SafeBackLink "← Retour à Master"
//   * Eyebrow "Administration plateforme" + EditorialTitle "Paramètres avancés"
//   * 2 sections role="region" hairline-only :
//       a) Extensions plateforme (ExtensionsList scope="master")
//       b) Marketplace (CTA externe vers /Marketplace + bandeau gold tinted)
//   * Tokens Élysée 100% (NAVY / GOLD / CREAM2 / INK / MUTED / SERIF).

import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Loader2, ArrowUpRight } from 'lucide-react';
import {
  PageShell,
  PlatformFooter,
  Eyebrow,
  EditorialTitle,
  SafeBackLink,
  GOLD,
  NAVY,
  INK,
  MUTED,
  CREAM2,
  SERIF,
  FOCUS_RING_CLASS,
} from '@/components/design';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';
import ExtensionSlot from '@/components/rsa/extensions/ExtensionSlot';
import ExtensionsList from '@/components/rsa/extensions/ExtensionsList';

// ── i18n local (trilingue FR/EN/DE) ─────────────────────────────────────────
// Strings spécifiques à la page : on ne réutilise pas ADVANCED de master/i18n.js
// pour ne pas créer de dépendance sortante depuis un dict qui pourrait disparaître.
const T = {
  eyebrow: {
    fr: 'Administration plateforme',
    en: 'Platform administration',
    de: 'Plattform-Administration',
  },
  titleLead: {
    fr: 'Paramètres',
    en: 'Advanced',
    de: 'Erweiterte',
  },
  titleItalic: {
    fr: 'avancés',
    en: 'settings',
    de: 'Einstellungen',
  },
  intro: {
    fr: 'Réglages d’infrastructure et leviers cross-clubs réservés au master_admin. Chaque module est autonome — entrez quand vous en avez besoin.',
    en: 'Infrastructure controls and cross-club levers reserved for the master_admin. Each module is self-contained — enter when needed.',
    de: 'Infrastruktur-Steuerung und cross-club Hebel, dem master_admin vorbehalten. Jedes Modul ist eigenständig — bei Bedarf öffnen.',
  },
  backToMaster: {
    fr: '← Retour à Master',
    en: '← Back to Master',
    de: '← Zurück zum Master',
  },
  // Section Extensions
  extEyebrow: {
    fr: 'Extensions',
    en: 'Extensions',
    de: 'Erweiterungen',
  },
  extTitle: {
    fr: 'Extensions plateforme',
    en: 'Platform extensions',
    de: 'Plattform-Erweiterungen',
  },
  extLede: {
    fr: 'Cockpit tabs, webhooks et templates email rendus au niveau plateforme. Toute extension scope=master est listée ici.',
    en: 'Cockpit tabs, webhooks and email templates rendered at the platform level. Every scope=master extension is listed here.',
    de: 'Cockpit-Tabs, Webhooks und E-Mail-Vorlagen auf Plattformebene. Sämtliche scope=master-Erweiterungen werden hier aufgeführt.',
  },
  extRegionAria: {
    fr: 'Extensions plateforme',
    en: 'Platform extensions',
    de: 'Plattform-Erweiterungen',
  },
  // Section Marketplace
  mpEyebrow: {
    fr: 'Marketplace',
    en: 'Marketplace',
    de: 'Marketplace',
  },
  mpTitle: {
    fr: 'Marketplace',
    en: 'Marketplace',
    de: 'Marketplace',
  },
  mpLede: {
    fr: 'Catalogue complet des modules publiés. À installer en mode cross-clubs depuis la route /Marketplace.',
    en: 'Full catalogue of published modules. Install cross-club from the /Marketplace route.',
    de: 'Vollständiger Katalog veröffentlichter Module. Cross-Club-Installation über /Marketplace.',
  },
  mpCta: {
    fr: 'Ouvrir le catalogue',
    en: 'Open catalogue',
    de: 'Katalog öffnen',
  },
  mpHint: {
    fr: 'Catalogue complet en lecture seule sur /Marketplace.',
    en: 'Full read-only catalogue at /Marketplace.',
    de: 'Vollständiger Read-only-Katalog unter /Marketplace.',
  },
  mpRegionAria: {
    fr: 'Marketplace',
    en: 'Marketplace',
    de: 'Marketplace',
  },
  // Forbidden / loading
  forbiddenEyebrow: {
    fr: 'Accès restreint',
    en: 'Restricted access',
    de: 'Eingeschränkter Zugriff',
  },
  forbiddenBody: {
    fr: 'Cette page est réservée au master_admin de la plateforme.',
    en: 'This page is reserved for the platform master_admin.',
    de: 'Diese Seite ist dem master_admin der Plattform vorbehalten.',
  },
};

// ── Helpers de layout ───────────────────────────────────────────────────────
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

// SectionBlock — opener "S-Quiet" : eyebrow + Playfair sans gold rule, lede
// puis enfant. Hairline top CREAM2. Mirror de AdvancedSection (legacy) pour la
// cohérence visuelle, mais autonome (pas d'import).
function SectionBlock({ eyebrow, title, lede, action, children, headingId, regionAria }) {
  return (
    <section
      className="py-8"
      style={{ borderTop: `1px solid ${CREAM2}` }}
      role="region"
      aria-label={regionAria}
      aria-labelledby={headingId}
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start mb-5">
        <div>
          <span
            className="uppercase text-[10px] tracking-[0.18em] font-medium block mb-2"
            style={{ color: MUTED }}
          >
            {eyebrow}
          </span>
          <h3
            id={headingId}
            className="text-[22px] mb-1.5"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {title}
          </h3>
          {lede && (
            <p className="text-[13px] max-w-2xl leading-relaxed" style={{ color: INK }}>
              {lede}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function AdminAdvanced() {
  const { isAuthenticated, isMasterAdmin, loading: authLoading } = usePlatformAuth();
  const { t } = useLang();

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

  // Gate strict master_admin (les autres profils ne doivent jamais arriver ici).
  if (!isMasterAdmin) {
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
                {t(T.forbiddenEyebrow)}
              </span>
              <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
            </div>
            <p className="text-[15px]" style={{ color: INK }}>
              {t(T.forbiddenBody)}
            </p>
          </div>
        </Centered>
      </PageShell>
    );
  }

  return (
    <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
      {/* Breadcrumb — retour Master (history-safe). */}
      <div className="mb-4">
        <SafeBackLink to="/Admin" label={t(T.backToMaster)} />
      </div>

      <header className="mb-8 md:mb-10">
        <Eyebrow>{t(T.eyebrow)}</Eyebrow>
        <EditorialTitle
          lead={t(T.titleLead)}
          italic={t(T.titleItalic)}
          size="md"
        />
        <p
          className="mt-3 text-[14px] md:text-[15px] max-w-[60ch]"
          style={{ color: INK, lineHeight: 1.65 }}
        >
          {t(T.intro)}
        </p>
      </header>

      {/* ── Section a) Extensions plateforme ── */}
      <SectionBlock
        headingId="admin-advanced-extensions-heading"
        regionAria={t(T.extRegionAria)}
        eyebrow={t(T.extEyebrow)}
        title={t(T.extTitle)}
        lede={t(T.extLede)}
      >
        {/* Slots V4 — rend les tabs/webhooks scope=master fournis par les
            extensions installées ; ExtensionsList affiche le CRUD complet. */}
        <ExtensionSlot kind="cockpit_tab" scope="master" />
        <ExtensionSlot kind="webhook" scope="master" />
        <ExtensionsList scope="master" />
      </SectionBlock>

      {/* ── Section b) Marketplace ── */}
      <SectionBlock
        headingId="admin-advanced-marketplace-heading"
        regionAria={t(T.mpRegionAria)}
        eyebrow={t(T.mpEyebrow)}
        title={t(T.mpTitle)}
        lede={t(T.mpLede)}
        action={(
          <Link
            to="/Marketplace"
            className={`inline-flex items-center gap-1.5 text-[12.5px] px-3 py-2 rounded-[4px] font-medium ${FOCUS_RING_CLASS}`}
            style={{ background: NAVY, color: 'white' }}
          >
            {t(T.mpCta)}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}
      >
        {/* Tag décoratif gold-tinted pour confirmer visuellement le lien sortant. */}
        <div
          className="rounded-[4px] px-4 py-3 inline-flex items-center gap-2.5"
          style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: GOLD }}
            aria-hidden
          />
          <span className="text-[12px]" style={{ color: NAVY }}>
            {t(T.mpHint)}
          </span>
        </div>
      </SectionBlock>
    </PageShell>
  );
}
