// AnalyticsPanel — orchestrateur de l'onglet Analytics (V3 Vague 3 · F).
//
// Header éditorial (Eyebrow + EditorialTitle "Analytics / temps réel"),
// puis :
//   - KPI rail 4 cellules (candidatures, éligibles, sélectionnées, finalistes)
//   - KPI rail secondaire 4 cellules (en instruction, évaluées, lauréates, refusées)
//   - section FunnelChart (toujours)
//   - section ClubsBreakdownChart (scope=master uniquement)
//   - section JuryActivityTable
//
// Props :
//   - scope     : 'club' | 'master'
//   - editionId : text — RSA edition (peut être null avant bootstrap)
//   - clubId    : text — requis si scope='club'
//
// Realtime : ouvre 3 channels (startups / jury_assignments / jury_scores)
// via useAnalyticsRealtimeInvalidator.

import React from 'react';
import {
  Eyebrow, EditorialTitle,
} from '@/components/design';
import { CREAM2, NAVY, GOLD, MUTED, INK, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { ANALYTICS_UI } from './i18n';
import {
  useAnalyticsFunnel,
  useAnalyticsConversion,
  useAnalyticsClubs,
  useAnalyticsJury,
  useAnalyticsRealtimeInvalidator,
} from './useAnalytics';
import KpiCard from './KpiCard';
import FunnelChart from './FunnelChart';
import ClubsBreakdownChart from './ClubsBreakdownChart';
import JuryActivityTable from './JuryActivityTable';

function SectionHeader({ title, hint }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} aria-hidden />
        <h3
          className="text-[16px]"
          style={{ color: NAVY, fontFamily: SERIF, fontWeight: 500 }}
        >
          {title}
        </h3>
      </div>
      {hint && <p className="text-[12px]" style={{ color: MUTED }}>{hint}</p>}
    </div>
  );
}

// KpiRail — grille 4 colonnes de cellules KPI séparées par des filets verticaux
// fins. Un filet horizontal CREAM2 court sous toute la rangée.
function KpiRail({ children, label }) {
  return (
    <div className="mb-6">
      {label && (
        <div className="flex items-center gap-2.5 mb-1">
          <span className="h-[1px]" style={{ background: GOLD, width: 32 }} aria-hidden />
          <span className="uppercase text-[10px] tracking-[0.16em] font-medium" style={{ color: MUTED }}>
            {label}
          </span>
        </div>
      )}
      <div
        className="grid grid-cols-2 md:grid-cols-4"
        style={{ borderBottom: `1px solid ${CREAM2}` }}
      >
        {React.Children.map(children, (child, i) => (
          <div
            key={i}
            className={i > 0 ? 'pl-4 md:pl-5' : ''}
            style={i > 0 ? { borderLeft: `1px solid ${CREAM2}` } : {}}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPanel({ scope, editionId, clubId = null }) {
  const { t } = useLang();
  const isMaster = scope === 'master';
  const effectiveClubId = isMaster ? null : clubId;

  // Hooks — toujours appelés, mais enabled gated par editionId.
  const funnelQ     = useAnalyticsFunnel({ editionId, clubId: effectiveClubId });
  const conversionQ = useAnalyticsConversion({ editionId, clubId: effectiveClubId });
  const clubsQ      = useAnalyticsClubs({ editionId, enabled: isMaster });
  const juryQ       = useAnalyticsJury({ editionId, clubId: effectiveClubId });

  // Realtime — invalide les analytics scope quand les données mutent en base.
  useAnalyticsRealtimeInvalidator({ editionId });

  if (!editionId) {
    return (
      <section>
        <Eyebrow>{t(ANALYTICS_UI.eyebrow)}</Eyebrow>
        <div className="mb-6">
          <EditorialTitle
            lead={t(ANALYTICS_UI.titleLead)}
            italic={t(ANALYTICS_UI.titleItalic)}
            size="sm"
          />
        </div>
        <p className="py-10 text-[13px] italic" style={{ fontFamily: SERIF, color: MUTED }} role="status">
          {t(ANALYTICS_UI.noEdition)}
        </p>
      </section>
    );
  }

  const funnel = funnelQ.data || {};
  const subtitle = isMaster ? t(ANALYTICS_UI.subtitleMaster) : t(ANALYTICS_UI.subtitleClub);

  const rates = funnel.conversion_rate_per_stage || {};
  const fmtSubtitle = (count, pctKey) => {
    if (funnel.applied == null || funnel.applied === 0) return null;
    if (count == null || count === 0) return null;
    const pct = rates[pctKey];
    if (pct == null) return null;
    return `${pct}% ${t(ANALYTICS_UI.funnelStagePctOfApplied)}`;
  };

  return (
    <section>
      {/* Editorial header */}
      <Eyebrow>{t(ANALYTICS_UI.eyebrow)}</Eyebrow>
      <div className="mb-2">
        <EditorialTitle
          lead={t(ANALYTICS_UI.titleLead)}
          italic={t(ANALYTICS_UI.titleItalic)}
          size="sm"
        />
      </div>
      <p className="text-[13px] mb-6" style={{ color: INK }}>{subtitle}</p>

      {/* KPI rail principal */}
      <KpiRail>
        <KpiCard
          label={t(ANALYTICS_UI.kpiApplied)}
          value={funnel.applied ?? '—'}
          tooltip={t(ANALYTICS_UI.tooltipApplied)}
          dotActive
          loading={funnelQ.isLoading}
        />
        <KpiCard
          label={t(ANALYTICS_UI.kpiEligible)}
          value={funnel.eligible ?? '—'}
          subtitle={fmtSubtitle(funnel.eligible, 'eligible')}
          tooltip={t(ANALYTICS_UI.tooltipEligible)}
          loading={funnelQ.isLoading}
        />
        <KpiCard
          label={t(ANALYTICS_UI.kpiSelected)}
          value={funnel.selected ?? '—'}
          subtitle={fmtSubtitle(funnel.selected, 'selected')}
          tooltip={t(ANALYTICS_UI.tooltipSelected)}
          loading={funnelQ.isLoading}
        />
        <KpiCard
          label={t(ANALYTICS_UI.kpiFinaliste)}
          value={funnel.finaliste ?? '—'}
          subtitle={fmtSubtitle(funnel.finaliste, 'finaliste')}
          tooltip={t(ANALYTICS_UI.tooltipFinaliste)}
          loading={funnelQ.isLoading}
        />
      </KpiRail>

      {/* KPI rail secondaire */}
      <KpiRail>
        <KpiCard
          label={t(ANALYTICS_UI.kpiInReview)}
          value={funnel.in_review ?? '—'}
          subtitle={fmtSubtitle(funnel.in_review, 'in_review')}
          tooltip={t(ANALYTICS_UI.tooltipInReview)}
          loading={funnelQ.isLoading}
        />
        <KpiCard
          label={t(ANALYTICS_UI.kpiScored)}
          value={funnel.scored ?? '—'}
          subtitle={fmtSubtitle(funnel.scored, 'scored')}
          tooltip={t(ANALYTICS_UI.tooltipScored)}
          loading={funnelQ.isLoading}
        />
        <KpiCard
          label={t(ANALYTICS_UI.kpiLaureat)}
          value={funnel.laureat ?? '—'}
          subtitle={fmtSubtitle(funnel.laureat, 'laureat')}
          tooltip={t(ANALYTICS_UI.tooltipLaureat)}
          loading={funnelQ.isLoading}
        />
        <KpiCard
          label={t(ANALYTICS_UI.kpiRejected)}
          value={funnel.rejected ?? '—'}
          tooltip={t(ANALYTICS_UI.tooltipRejected)}
          loading={funnelQ.isLoading}
        />
      </KpiRail>

      {/* Funnel chart */}
      <div className="mb-8">
        <SectionHeader
          title={t(ANALYTICS_UI.funnelTitle)}
          hint={t(ANALYTICS_UI.funnelHint)}
        />
        <FunnelChart
          stages={conversionQ.data || []}
          loading={conversionQ.isLoading}
          error={conversionQ.isError}
        />
      </div>

      {/* Clubs breakdown (master only) */}
      {isMaster && (
        <div className="mb-8">
          <SectionHeader
            title={t(ANALYTICS_UI.clubsTitle)}
            hint={t(ANALYTICS_UI.clubsHint)}
          />
          <ClubsBreakdownChart
            rows={clubsQ.data || []}
            loading={clubsQ.isLoading}
            error={clubsQ.isError}
          />
        </div>
      )}

      {/* Jury activity */}
      <div className="mb-2">
        <SectionHeader
          title={t(ANALYTICS_UI.juryTitle)}
          hint={t(ANALYTICS_UI.juryHint)}
        />
        <JuryActivityTable
          rows={juryQ.data || []}
          loading={juryQ.isLoading}
          error={juryQ.isError}
        />
      </div>
    </section>
  );
}
