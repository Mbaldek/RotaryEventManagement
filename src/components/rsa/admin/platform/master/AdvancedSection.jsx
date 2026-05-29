/**
 * @deprecated 2026-05-29 — Équipe A "drop Outils avancés".
 *
 * Ce composant n'est plus monté dans MasterCockpit (le tab 'advanced' a été
 * retiré). Il est conservé temporairement pour faciliter une éventuelle
 * extraction d'EmailStudio par l'équipe B et garder un fallback de transition.
 *
 * Remplacements :
 *   * Extensions + Marketplace → /AdminAdvanced (pages.config) accessible via
 *     UserMenu > "Paramètres avancés (développeur)" pour master_admin.
 *   * Email Studio (opérationnel)   → flow dédié géré par l'équipe B.
 *
 * Layout d'origine : trois lignes empilées hairline-only (PAS de card grid),
 * avec opener S-Quiet (eyebrow + Playfair sans gold rule).
 *
 * À supprimer dès que :
 *   1. EmailStudio a été ré-extrait par l'équipe B (ou jugé inutile ici).
 *   2. /AdminAdvanced est validé en prod.
 */
// AdvancedSection — Master Cockpit, tab 'advanced' (deprecated 2026-05-29).

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import {
  Eyebrow, EditorialTitle, CREAM2, NAVY, INK, MUTED, GOLD, FOCUS_RING_CLASS,
  SERIF,
} from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { ADVANCED } from './i18n';
import ExtensionSlot from '@/components/rsa/extensions/ExtensionSlot';
import ExtensionsList from '@/components/rsa/extensions/ExtensionsList';
import EmailStudio from '@/components/rsa/admin/platform/comms/EmailStudio';

// SectionBlock — opener "S-Quiet" : eyebrow seul (sans gold rule) + lead
// Playfair + lede + zone enfant. Anti-redondance avec OverviewPanel qui
// utilise déjà S-Gold-Rule.
function SectionBlock({ eyebrow, title, lede, action, children, headingId }) {
  return (
    <section
      className="py-8"
      style={{ borderTop: `1px solid ${CREAM2}` }}
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

export default function AdvancedSection() {
  const { t } = useLang();
  return (
    <section className="mb-6">
      {/* Hero éditorial — palette discrète, pas de KPI rail (différencie de OverviewPanel) */}
      <header className="mb-4">
        <Eyebrow>{t(ADVANCED.eyebrow)}</Eyebrow>
        <div className="mb-2">
          <EditorialTitle
            lead={t(ADVANCED.titleLead)}
            italic={t(ADVANCED.titleItalic)}
            size="md"
          />
        </div>
        <p className="text-[14px] max-w-2xl leading-relaxed" style={{ color: INK }}>
          {t(ADVANCED.intro)}
        </p>
      </header>

      {/* ── Extensions actives (scope=master) ── */}
      <SectionBlock
        headingId="advanced-extensions-heading"
        eyebrow={t(ADVANCED.eyebrow)}
        title={t(ADVANCED.extensionsTitle)}
        lede={t(ADVANCED.extensionsLede)}
      >
        {/* Slots V4 — rend les tabs/webhooks scope=master fournis par les extensions
            installées ; ExtensionsList affiche le CRUD complet en-dessous. */}
        <ExtensionSlot kind="cockpit_tab" scope="master" />
        <ExtensionSlot kind="webhook" scope="master" />
        <ExtensionsList scope="master" />
      </SectionBlock>

      {/* ── Marketplace (lien externe) ── */}
      <SectionBlock
        headingId="advanced-marketplace-heading"
        eyebrow={t(ADVANCED.eyebrow)}
        title={t(ADVANCED.marketplaceTitle)}
        lede={t(ADVANCED.marketplaceLede)}
        action={(
          <Link
            to="/Marketplace"
            className={`inline-flex items-center gap-1.5 text-[12.5px] px-3 py-2 rounded-[4px] font-medium ${FOCUS_RING_CLASS}`}
            style={{ background: NAVY, color: 'white' }}
          >
            {t(ADVANCED.marketplaceCta)}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}
      >
        {/* Pas de rendu inline pour ne pas doubler le catalogue. Tag décoratif
            pour confirmer visuellement le lien sortant. */}
        <div
          className="rounded-[4px] px-4 py-3 inline-flex items-center gap-2.5"
          style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} aria-hidden />
          <span className="text-[12px]" style={{ color: NAVY }}>
            {t({
              fr: 'Catalogue complet en lecture seule sur /Marketplace.',
              en: 'Full read-only catalogue at /Marketplace.',
              de: 'Vollständiger Read-only-Katalog unter /Marketplace.',
            })}
          </span>
        </div>
      </SectionBlock>

      {/* ── Email Studio global ── */}
      <SectionBlock
        headingId="advanced-email-studio-heading"
        eyebrow={t(ADVANCED.eyebrow)}
        title={t(ADVANCED.emailStudioTitle)}
        lede={t(ADVANCED.emailStudioLede)}
      >
        {/* clubId undefined = master global broadcast. EmailStudio est autonome. */}
        <EmailStudio />
      </SectionBlock>
    </section>
  );
}
