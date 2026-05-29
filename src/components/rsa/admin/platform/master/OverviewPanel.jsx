// OverviewPanel — landing du Master Cockpit (équipe A · overview rework v2).
//
// HISTORIQUE — pourquoi cette refonte
//   Le retour utilisateur sur la v1 :
//     « cockpit master ne sert à rien, on s'en fou des metrics. kick off
//       a cycle n'est pas une activité sur une main dashboard, c'est un
//       bouton dans un menu. live dashboard doit être placé au top.
//       master platform activity ensuite OK même si vide. »
//   → 3 changements structurels :
//     (a) Drop l'eyebrow « Plateforme master » + lead « Cockpit master » —
//         remplacé par « Administration / Vue d'ensemble » (sobre, pas
//         de mise en scène pretentieuse du rôle).
//     (b) Drop le bloc « Quick actions / Lancer un cycle » — pas sa place
//         sur un main dashboard (les 3 funnels sont accessibles depuis
//         les tabs Competitions/Clubs/Roles). Composant sauvé dans
//         MasterQuickActions.jsx pour réutilisation future.
//     (c) Reorder : le Live dashboard (KPI + 3 charts) passe AU TOP juste
//         après le hero — c'est le block le plus actionnable. L'activity
//         feed Master Platform descend en dessous (peut être vide, OK).
//
// LAYOUT FINAL — 3 sections, ordre du plus actionnable au plus contextuel
//   1) Hero éditorial GAUCHE + KPI rail vertical DROIT sticky.
//      « Administration / Vue d'ensemble » + pulse phrase + KPI rail.
//   2) Live dashboard (S-Gold-Rule + 3 charts compacts grid 2-col).
//      Funnel + Clubs breakdown (lg:grid-cols-2) puis JuryActivity
//      full-width en dessous. Empty-state si pas de compétition active.
//   3) Master Platform Activity (L-Numbered-Hairline ou empty-state texte).
//      Plus de spinner perpétuel : si data === [], on affiche un message
//      court (« Aucune activité encore »).
//
// Source de vérité : useAllCompetitions + useAllClubs + useCountsForEdition
// (compétition active) + useActivityFeed (admin_audit_log via RPC) + hooks
// analytics existants (réutilisation sans dupliquer FunnelChart etc.).

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Trophy, Megaphone, ShieldCheck, UserPlus, Users, Sparkles, Activity } from 'lucide-react';
import {
  Eyebrow, EditorialTitle, CREAM2, NAVY, INK, MUTED, GOLD, GOLD_TEXT,
  GREEN_TODAY, SERIF, EASE, TINT_ADMIN,
} from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { OVERVIEW, ROLES } from './i18n';
import {
  useAllCompetitions,
  useAllClubs,
  useCountsForEdition,
  useActivityFeed,
} from './useMaster';
import {
  useAnalyticsFunnel,
  useAnalyticsConversion,
  useAnalyticsClubs,
  useAnalyticsJury,
  useAnalyticsRealtimeInvalidator,
} from '@/components/rsa/analytics/useAnalytics';
import FunnelChart from '@/components/rsa/analytics/FunnelChart';
import ClubsBreakdownChart from '@/components/rsa/analytics/ClubsBreakdownChart';
import JuryActivityTable from '@/components/rsa/analytics/JuryActivityTable';
// Refonte hiérarchie : l'annuaire des clubs n'est plus un tab racine du
// MasterCockpit (un club n'est pas au même niveau qu'une compétition). On le
// rend ici comme section de fin de l'overview pour conserver l'accès cross-
// compétition (création/édition globale) sans casser la hiérarchie nav.
import ClubsTab from './tabs/ClubsTab';

// ── Helpers ─────────────────────────────────────────────────────────────────

// "il y a 5 min" / "5 min ago" / "vor 5 Min." — résolution localisée des
// distances temporelles. < 60s → feedTime, < 60min → feedMinutesAgo, < 24h →
// feedHoursAgo, sinon feedDaysAgo.
function formatRelative(t, iso) {
  if (!iso) return t(OVERVIEW.feedTime);
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return t(OVERVIEW.feedTime);
  const deltaSec = Math.max(0, Math.round((now - then) / 1000));
  if (deltaSec < 60) return t(OVERVIEW.feedTime);
  const min = Math.round(deltaSec / 60);
  if (min < 60) return t(OVERVIEW.feedMinutesAgo).replace('{n}', min);
  const h = Math.round(min / 60);
  if (h < 24) return t(OVERVIEW.feedHoursAgo).replace('{n}', h);
  const d = Math.round(h / 24);
  return t(OVERVIEW.feedDaysAgo).replace('{n}', d);
}

// Map de actions auditables → libellé i18n + icône lucide.
function labelForAction(action, t) {
  switch (action) {
    case 'competition_deleted':
      return { text: t(OVERVIEW.actionCompetitionDeleted), Icon: Trash2 };
    case 'finalist_promoted':
      return { text: t(OVERVIEW.actionFinalistPromoted), Icon: Trophy };
    case 'finalist_removed':
      return { text: t(OVERVIEW.actionFinalistRemoved), Icon: Trash2 };
    case 'session_published':
      return { text: t(OVERVIEW.actionSessionPublished), Icon: Megaphone };
    case 'session_concluded':
      return { text: t(OVERVIEW.actionSessionConcluded), Icon: ShieldCheck };
    case 'club_role_assigned':
      return { text: t(OVERVIEW.actionClubRoleAssigned), Icon: UserPlus };
    case 'club_role_revoked':
      return { text: t(OVERVIEW.actionClubRoleRevoked), Icon: Users };
    case 'club_created':
      return { text: t(OVERVIEW.actionClubCreated), Icon: Sparkles };
    default:
      return { text: t(OVERVIEW.actionGeneric), Icon: Activity };
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────

// Section opener variante S-Gold-Rule — barre gold horizontale + eyebrow
// uppercase + Playfair lead. Utilisée pour Live dashboard et activité.
function GoldRuleSection({ eyebrow, title, hint, titleId }) {
  return (
    <header className="mb-4">
      <div className="flex items-center gap-3 mb-2">
        <motion.span
          className="h-[1.5px] origin-left"
          style={{ background: GOLD, width: 64 }}
          aria-hidden
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 0.55, ease: EASE }}
        />
        <span
          className="uppercase text-[10px] tracking-[0.18em] font-medium"
          style={{ color: GOLD_TEXT }}
        >
          {eyebrow}
        </span>
      </div>
      <h3
        id={titleId}
        className="text-[20px]"
        style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
      >
        {title}
      </h3>
      {hint && (
        <p className="text-[12.5px] mt-1 max-w-2xl" style={{ color: INK }}>
          {hint}
        </p>
      )}
    </header>
  );
}

// KPI rail VERTICAL (anti L-Card-Grid). Stack de 4 valeurs séparées par
// hairlines, libellés petits/uppercase tracked à gauche, valeur en
// Playfair NAVY à droite. Sticky pour rester visible en scroll.
function KpiRail({
  totalCompetitions, totalClubs, applied, sessions, sessionsLive,
}) {
  const { t } = useLang();
  const rows = [
    { value: totalCompetitions ?? 0, label: t(OVERVIEW.kpiCompetitions) },
    { value: totalClubs ?? 0,        label: t(OVERVIEW.kpiClubs) },
    { value: applied ?? 0,           label: t(OVERVIEW.kpiApplications) },
    {
      value: sessions ?? 0,
      label: t(OVERVIEW.kpiSessions),
      suffix: (sessionsLive ?? 0) > 0
        ? `${sessionsLive} ${t(OVERVIEW.kpiLiveSessions)}`
        : null,
    },
  ];
  return (
    <aside
      className="rounded-[4px] sticky top-4 self-start"
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
      aria-label={t(OVERVIEW.kpiRailEyebrow)}
    >
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-[1.5px] w-6" style={{ background: GOLD }} aria-hidden />
          <span
            className="uppercase text-[10px] tracking-[0.18em] font-medium"
            style={{ color: GOLD_TEXT }}
          >
            {t(OVERVIEW.kpiRailEyebrow)}
          </span>
        </div>
      </div>
      <ul>
        {rows.map((r, idx) => (
          <li
            key={r.label}
            className="px-4 py-3 flex items-baseline justify-between gap-4"
            style={{
              borderTop: idx === 0 ? `1px solid ${CREAM2}` : 'none',
              borderBottom: idx < rows.length - 1 ? `1px solid ${CREAM2}` : 'none',
            }}
          >
            <span
              className="text-[10.5px] uppercase tracking-[0.14em]"
              style={{ color: MUTED }}
            >
              {r.label}
            </span>
            <span className="text-right">
              <span
                className="block text-[24px] leading-none tabular-nums"
                style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
              >
                {r.value}
              </span>
              {r.suffix && (
                <span className="text-[10.5px]" style={{ color: GREEN_TODAY }}>
                  {r.suffix}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

// Activity feed — variante L-Numbered-Hairline. Chaque évènement = ligne
// avec index gauche (J-X style), icône action, libellé, target, timestamp
// relatif. Hairline séparateurs sans card per item.
//
// User feedback v2 : « master platform activity ensuite OK même si vide. »
// → Pas de spinner perpétuel : si data === null OU data === [], on affiche
//   directement l'empty-state texte. Le spinner n'apparaît que sur l'état
//   isLoading INITIAL (cache vide), pas sur les refetch en arrière-plan.
function ActivityFeedSection({ feedQ }) {
  const { t } = useLang();
  const items = feedQ.data || [];
  // Empty-state immédiat dès que data est résolue (même si vide) — évite
  // tout spinner si la query revient avec un tableau vide.
  if (!feedQ.isLoading && items.length === 0) {
    return (
      <div
        className="rounded-[4px] p-6 text-center"
        style={{ background: TINT_ADMIN, border: `1px dashed ${CREAM2}` }}
      >
        <Activity
          className="w-5 h-5 mx-auto mb-2"
          style={{ color: GOLD }}
          aria-hidden
        />
        <p className="text-[12.5px]" style={{ color: INK }}>
          {t(OVERVIEW.feedEmptyShort)}
        </p>
      </div>
    );
  }
  if (feedQ.isLoading && items.length === 0) {
    // 3 skeletons hairline plutôt qu'un spinner — plus calme visuellement.
    return (
      <ol aria-busy="true" aria-live="polite">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="grid grid-cols-[28px_20px_1fr_auto] items-start gap-3 py-2.5"
            style={{ borderTop: i === 0 ? 'none' : `1px solid ${CREAM2}` }}
          >
            <span className="block h-3 rounded-[2px]" style={{ background: CREAM2 }} />
            <span className="block h-3 rounded-[2px]" style={{ background: CREAM2 }} />
            <span className="block h-3 rounded-[2px] w-2/3" style={{ background: CREAM2 }} />
            <span className="block h-3 rounded-[2px] w-12" style={{ background: CREAM2 }} />
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ol>
      {items.map((row, idx) => {
        const { text, Icon } = labelForAction(row.action, t);
        const target = row.target_kind && row.target_id
          ? `${row.target_kind} · ${row.target_id}`
          : row.target_kind || row.target_id || null;
        const actor = row.actor_email || row.actor_id || null;
        return (
          <li
            key={row.id}
            className="grid grid-cols-[28px_20px_1fr_auto] items-start gap-3 py-2.5"
            style={{
              borderTop: idx === 0 ? 'none' : `1px solid ${CREAM2}`,
            }}
          >
            <span
              className="text-[10px] uppercase tracking-[0.14em] tabular-nums"
              style={{ color: MUTED, fontFamily: SERIF }}
            >
              {String(idx + 1).padStart(2, '0')}
            </span>
            <Icon className="w-4 h-4 mt-0.5" style={{ color: GOLD }} aria-hidden />
            <div className="min-w-0">
              <p className="text-[13px] truncate" style={{ color: NAVY }}>
                {text}
                {target && (
                  <span
                    className="ml-1.5 font-mono text-[11.5px]"
                    style={{ color: MUTED }}
                  >
                    · {target}
                  </span>
                )}
              </p>
              {actor && (
                <p
                  className="text-[11.5px] truncate"
                  style={{ color: MUTED }}
                >
                  {actor}
                </p>
              )}
            </div>
            <span
              className="text-[11px] tabular-nums whitespace-nowrap"
              style={{ color: MUTED }}
            >
              {formatRelative(t, row.created_at)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ── OverviewPanel principal ────────────────────────────────────────────────

export default function OverviewPanel() {
  const { t } = useLang();

  // Compétition active (1re en open/sessions/finale, sinon la + récente).
  const competitionsQ = useAllCompetitions();
  const clubsQ = useAllClubs();

  const active = useMemo(() => {
    const list = competitionsQ.data || [];
    if (list.length === 0) return null;
    const open = list.find((c) => ['open', 'sessions', 'finale'].includes(c.status));
    return open || list[0];
  }, [competitionsQ.data]);

  const countsQ = useCountsForEdition(active?.id || null);
  const counts = countsQ.data || {};

  // Realtime — quand on est sur l'overview, on rafraîchit aussi les analytics
  // car les charts ci-dessous (funnel/clubs/jury) en dépendent.
  useAnalyticsRealtimeInvalidator({ editionId: active?.id || null });

  // Analytics hooks (réutilisation directe — pas de wrapper).
  const funnelQ      = useAnalyticsFunnel({ editionId: active?.id || null });
  const conversionQ  = useAnalyticsConversion({ editionId: active?.id || null });
  const clubsAnalQ   = useAnalyticsClubs({ editionId: active?.id || null });
  const juryQ        = useAnalyticsJury({ editionId: active?.id || null });

  // Activity feed (admin_audit_log).
  const feedQ = useActivityFeed({ limit: 10 });

  // Pulse phrase (résolue avec compteurs ou fallback noActive).
  const pulse = useMemo(() => {
    if (!active) return t(OVERVIEW.pulseNoActive);
    return t(OVERVIEW.pulseTemplate)
      .replace('{name}', active.name)
      .replace('{applied}', String(counts.startupsCount ?? 0))
      .replace('{sessions}', String(counts.sessionsCount ?? 0))
      .replace('{clubs}', String(counts.clubsCount ?? 0));
  }, [active, counts.startupsCount, counts.sessionsCount, counts.clubsCount, t]);

  const italic = t(OVERVIEW.titleItalic);

  return (
    <section className="mb-6">
      {/* ── 1. Hero split éditorial + KPI rail vertical (H-Cockpit-Split) ──
          Eyebrow sobre « Administration », titre « Vue d'ensemble ».
          Plus de « Cockpit master » — voir doc d'historique en tête de fichier. */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 mb-10">
        <div>
          <Eyebrow>{t(OVERVIEW.eyebrow)}</Eyebrow>
          <div className="mb-3">
            <EditorialTitle
              lead={t(OVERVIEW.titleLead)}
              italic={italic || undefined}
              size="md"
            />
          </div>
          <p
            className="text-[14px] max-w-2xl leading-relaxed"
            style={{ color: INK }}
          >
            {pulse}
          </p>
        </div>
        <KpiRail
          totalCompetitions={(competitionsQ.data || []).length}
          totalClubs={(clubsQ.data || []).length}
          applied={counts.startupsCount}
          sessions={counts.sessionsCount}
          sessionsLive={counts.sessionsLive}
        />
      </div>

      {/* ── 2. Live dashboard (TOP — bloc le plus actionnable) ──
          User feedback : « live dashboard doit être placé au top. »
          Funnel + Clubs breakdown en grid 2 colonnes (lg+), JuryActivity
          full-width en dessous. Empty-state texte si pas d'édition active. */}
      <section
        className="mb-12"
        role="region"
        aria-labelledby="overview-charts-heading"
      >
        <GoldRuleSection
          eyebrow={t(OVERVIEW.liveDashboardEyebrow)}
          title={t(OVERVIEW.liveDashboardTitle)}
          hint={t(OVERVIEW.chartsHint)}
          titleId="overview-charts-heading"
        />
        {!active && (
          <div
            className="rounded-[4px] p-6 text-center"
            style={{ background: TINT_ADMIN, border: `1px dashed ${CREAM2}` }}
          >
            <p className="text-[12.5px]" style={{ color: INK }}>
              {t(OVERVIEW.chartsNoActive)}
            </p>
          </div>
        )}
        {active && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4
                className="text-[14px] mb-2 flex items-center gap-2"
                style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: GOLD }}
                  aria-hidden
                />
                {t(OVERVIEW.chartFunnelTitle)}
              </h4>
              <FunnelChart
                stages={conversionQ.data || []}
                loading={conversionQ.isLoading}
                error={conversionQ.isError}
                height={240}
              />
            </div>
            <div>
              <h4
                className="text-[14px] mb-2 flex items-center gap-2"
                style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: GOLD }}
                  aria-hidden
                />
                {t(OVERVIEW.chartClubsTitle)}
              </h4>
              <ClubsBreakdownChart
                rows={clubsAnalQ.data || []}
                loading={clubsAnalQ.isLoading}
                error={clubsAnalQ.isError}
                height={240}
              />
            </div>
            <div className="lg:col-span-2">
              <h4
                className="text-[14px] mb-2 flex items-center gap-2"
                style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: GOLD }}
                  aria-hidden
                />
                {t(OVERVIEW.chartJuryTitle)}
              </h4>
              <JuryActivityTable
                rows={juryQ.data || []}
                loading={juryQ.isLoading}
                error={juryQ.isError}
              />
            </div>
          </div>
        )}
        {/* funnelQ exposé pour un futur KPI delta (le hook reste appelé pour
            tenir la cache chaude, même si on n'en lit pas la valeur ici). */}
        {funnelQ.isError && (
          <p className="sr-only">{t({ fr: 'Erreur funnel', en: 'Funnel error', de: 'Funnel-Fehler' })}</p>
        )}
      </section>

      {/* ── 3. Activity feed Master Platform (contexte — OK si vide) ──
          User feedback : « master platform activity ensuite OK même si vide. »
          → Pas de spinner perpétuel : empty-state immédiat si data === []. */}
      <section
        role="region"
        aria-labelledby="overview-feed-heading"
      >
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
          <div>
            <Eyebrow>{t(OVERVIEW.feedEyebrow)}</Eyebrow>
            <h3
              id="overview-feed-heading"
              className="text-[20px]"
              style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
            >
              {t(OVERVIEW.feedTitle)}
            </h3>
            <p className="text-[12.5px] mt-1 max-w-2xl" style={{ color: INK }}>
              {t(OVERVIEW.feedHint)}
            </p>
          </div>
        </div>
        <ActivityFeedSection feedQ={feedQ} />
      </section>

      {/* ── 4. Annuaire des clubs (refonte hiérarchie) ──
          Auparavant un tab racine du Master Cockpit ; déplacé ici car un club
          n'est pas un objet plateforme au même niveau qu'une compétition.
          On garde la création + l'accès édition globale par souci de
          continuité (master_admin a besoin de provisionner des clubs avant
          de les attacher à une compétition). */}
      <div className="mt-12">
        <ClubsTab />
      </div>

      {/* ROLES non utilisé directement mais tag i18n future-proof — silence eslint. */}
      <span className="sr-only">{t(ROLES.sectionTitle)}</span>
    </section>
  );
}
