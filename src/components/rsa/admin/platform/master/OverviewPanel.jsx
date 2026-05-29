// OverviewPanel — landing du Master Cockpit (équipe A · cockpit overview).
//
// Layout asymétrique (split 60/40 puis bandes hairline) — anti-template :
//   1) Hero éditorial GAUCHE + KPI rail VERTICAL DROIT sticky (variante
//      H-Cockpit-Split du blueprint §16). PAS de grid 4 cards horizontales.
//   2) Bande activity feed sous le hero, numéroté en hairline gauche (variante
//      L-Numbered-Hairline) — pas de card grid.
//   3) Bande raccourcis "Lancer un cycle" — 3 lignes hairline avec CTA ghost
//      à droite (variante C-Single-Primary appliquée en liste, pas en cards).
//   4) Bande Tableaux : Funnel + ClubsBreakdown + JuryActivity, chaque chart
//      sous un section header S-Gold-Rule (alternance volontaire pour rompre
//      la séquence canonique).
//
// Source de vérité : useAllCompetitions + useAllClubs + useCountsForEdition
// (compétition active) + useActivityFeed (admin_audit_log via RPC) + hooks
// analytics existants (réutilisation sans dupliquer FunnelChart etc.).

import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Loader2, Plus, ArrowUpRight, UserPlus,
  Trophy, Trash2, Megaphone, ShieldCheck, Users, Sparkles, Activity,
} from 'lucide-react';
import {
  Eyebrow, EditorialTitle, CREAM2, NAVY, INK, MUTED, GOLD, GOLD_TEXT,
  GREEN_TODAY, FOCUS_RING_CLASS, SERIF, EASE,
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
import CompetitionFunnel from './CompetitionFunnel';
import ClubFunnel from './ClubFunnel';
import { InviteUserModal } from '@/components/rsa/invite';
import { toast } from 'sonner';

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
// uppercase + Playfair lead. Utilisée pour les tableaux (Tableau de bord).
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

// KPI rail VERTICAL (anti L-Card-Grid). Stack de 5 valeurs séparées par
// hairlines, libellés petits/uppercase tracked en haut, valeur en
// Playfair NAVY en bas. Sticky pour rester visible en scroll.
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
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
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
function ActivityFeedSection({ feedQ }) {
  const { t } = useLang();
  const items = feedQ.data || [];
  if (feedQ.isLoading) {
    return (
      <div className="py-6 flex justify-center">
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: MUTED }} />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div
        className="rounded-[4px] p-6 text-center"
        style={{ background: 'white', border: `1px dashed ${CREAM2}` }}
      >
        <Activity
          className="w-5 h-5 mx-auto mb-2"
          style={{ color: GOLD }}
          aria-hidden
        />
        <p className="text-[12.5px]" style={{ color: INK }}>
          {t(OVERVIEW.feedEmpty)}
        </p>
      </div>
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

// Quick action rows — chaque action est une LIGNE hairline (pas une card)
// avec icône, lead serif + hint, et CTA ghost à droite. Anti-grid.
function QuickActionRow({ Icon, title, hint, onClick }) {
  return (
    <li
      className="grid grid-cols-[40px_1fr_auto] items-center gap-4 py-3.5 group"
      style={{ borderTop: `1px solid ${CREAM2}` }}
    >
      <span
        className="w-10 h-10 rounded-full inline-flex items-center justify-center"
        style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
        aria-hidden
      >
        <Icon className="w-4 h-4" style={{ color: GOLD }} />
      </span>
      <div className="min-w-0">
        <p
          className="text-[15px]"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {title}
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: INK }}>{hint}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium ${FOCUS_RING_CLASS} transition-transform group-hover:translate-x-0.5`}
        style={{ background: NAVY, color: 'white' }}
      >
        <Plus className="w-3.5 h-3.5" /> <ArrowUpRight className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}

// ── OverviewPanel principal ────────────────────────────────────────────────

export default function OverviewPanel() {
  const { t } = useLang();
  const [, setParams] = useSearchParams();

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

  // ── Modals state (raccourcis création) ────────────────────────────────────
  const [competitionFunnelOpen, setCompetitionFunnelOpen] = useState(false);
  const [clubFunnelOpen, setClubFunnelOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Helpers — naviguer vers la sous-vue d'édition créée.
  function goToCompetition(id) {
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.set('tab', 'competitions');
        next.set('subview', 'edit-competition');
        next.set('id', id);
        return next;
      },
      { replace: false },
    );
  }
  function goToClub(id) {
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.set('tab', 'clubs');
        next.set('subview', 'edit-club');
        next.set('id', id);
        return next;
      },
      { replace: false },
    );
  }

  // Pulse phrase (résolue avec compteurs ou fallback noActive).
  const pulse = useMemo(() => {
    if (!active) return t(OVERVIEW.pulseNoActive);
    return t(OVERVIEW.pulseTemplate)
      .replace('{name}', active.name)
      .replace('{applied}', String(counts.startupsCount ?? 0))
      .replace('{sessions}', String(counts.sessionsCount ?? 0))
      .replace('{clubs}', String(counts.clubsCount ?? 0));
  }, [active, counts.startupsCount, counts.sessionsCount, counts.clubsCount, t]);

  return (
    <section className="mb-6">
      {/* ── 1. Hero split éditorial + KPI rail vertical (H-Cockpit-Split) ── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 mb-10">
        <div>
          <Eyebrow>{t(OVERVIEW.eyebrow)}</Eyebrow>
          <div className="mb-3">
            <EditorialTitle
              lead={t(OVERVIEW.titleLead)}
              italic={t(OVERVIEW.titleItalic)}
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

      {/* ── 2. Quick actions (lancer un cycle) — anti-grid, lignes hairline ── */}
      <section
        className="mb-10"
        role="region"
        aria-labelledby="overview-quick-actions-heading"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="h-[1.5px] w-6" style={{ background: GOLD }} aria-hidden />
          <span
            id="overview-quick-actions-heading"
            className="uppercase text-[10px] tracking-[0.18em] font-medium"
            style={{ color: GOLD_TEXT }}
          >
            {t(OVERVIEW.quickActionsEyebrow)}
          </span>
        </div>
        <ul style={{ borderBottom: `1px solid ${CREAM2}` }}>
          <QuickActionRow
            Icon={Sparkles}
            title={t(OVERVIEW.quickCreateCompetition)}
            hint={t(OVERVIEW.quickCreateCompetitionHint)}
            onClick={() => setCompetitionFunnelOpen(true)}
          />
          <QuickActionRow
            Icon={Users}
            title={t(OVERVIEW.quickCreateClub)}
            hint={t(OVERVIEW.quickCreateClubHint)}
            onClick={() => setClubFunnelOpen(true)}
          />
          <QuickActionRow
            Icon={ShieldCheck}
            title={t(OVERVIEW.quickInviteMember)}
            hint={t(OVERVIEW.quickInviteMemberHint)}
            onClick={() => setInviteOpen(true)}
          />
        </ul>
      </section>

      {/* ── 3. Activity feed (numbered hairline) ── */}
      <section
        className="mb-12"
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

      {/* ── 4. Tableau de bord — charts compacts (S-Gold-Rule par section) ── */}
      <section role="region" aria-labelledby="overview-charts-heading">
        <GoldRuleSection
          eyebrow={t(OVERVIEW.chartsEyebrow)}
          title={t({ fr: 'Tableau de bord', en: 'Live dashboard', de: 'Live-Dashboard' })}
          hint={t(OVERVIEW.chartsHint)}
          titleId="overview-charts-heading"
        />
        {!active && (
          <div
            className="rounded-[4px] p-6 text-center"
            style={{ background: 'white', border: `1px dashed ${CREAM2}` }}
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

      {/* ── Modals déclenchées par Quick actions ── */}
      <CompetitionFunnel
        open={competitionFunnelOpen}
        onClose={() => setCompetitionFunnelOpen(false)}
        onCreated={(newId) => {
          // Toast déjà émis côté CompetitionFunnel.
          setCompetitionFunnelOpen(false);
          goToCompetition(newId);
        }}
      />
      <ClubFunnel
        open={clubFunnelOpen}
        onClose={() => setClubFunnelOpen(false)}
        onCreated={(row) => {
          // ClubFunnel callbacks avec la row complète ; on garde le funnel
          // ouvert pour permettre l'édition des tabs suivants (membres, etc.)
          // — symétrique à ClubsTab.handleCreated.
          if (row?.id) {
            // Toast déjà émis côté ClubFunnel ; on ne re-toast pas.
            goToClub(row.id);
            setClubFunnelOpen(false);
          }
        }}
      />
      {inviteOpen && (
        <InviteUserModal
          scope="global"
          onClose={() => setInviteOpen(false)}
          onSuccess={(res) => {
            toast.success(t({
              fr: res?.was_already_existing
                ? 'Rôle mis à jour, email envoyé.'
                : 'Invitation envoyée.',
              en: res?.was_already_existing
                ? 'Role updated, email sent.'
                : 'Invitation sent.',
              de: res?.was_already_existing
                ? 'Rolle aktualisiert, E-Mail versendet.'
                : 'Einladung versendet.',
            }));
            setInviteOpen(false);
          }}
        />
      )}
      {/* ROLES non utilisé directement mais tag i18n future-proof — silence eslint. */}
      <span className="sr-only">{t(ROLES.sectionTitle)}</span>
    </section>
  );
}
