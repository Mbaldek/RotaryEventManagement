// PilotageOverview — landing du mode Pilotage du Club Cockpit (Lot 1).
//
// Header éditorial (barre or + eyebrow + titre Playfair) + KPI rail collant à
// droite + timeline des sessions (1 ligne/session, pattern L-Numbered-Hairline)
// avec compteurs startups/jurés et bouton « Ouvrir » → monte la coquille session.
//
// Métriques par session via useClubSessionMetrics ; compteur '—' si indisponible
// (jamais de fausse donnée). Scoring/prep déférés au #3.

import React, { useMemo } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { GOLD, NAVY, MUTED, CREAM2, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { StatusPill } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { CLUB_PILOTAGE } from '../i18n';
import { useClubSessionMetrics, useClubStartupsSummary, useClubJuryAssignmentsCount } from '../useClub';

function KpiRow({ label, value, accent }) {
  return (
    <div
      className="flex items-baseline justify-between gap-3 py-2.5"
      style={{ borderTop: `1px solid ${CREAM2}` }}
    >
      <span className="uppercase tracking-[0.14em] text-[10.5px]" style={{ color: MUTED }}>
        {label}
      </span>
      <span
        className="text-[18px] tabular-nums"
        style={{ fontFamily: SERIF, color: accent || NAVY, fontWeight: 500 }}
      >
        {value}
      </span>
    </div>
  );
}

export default function PilotageOverview({ edition, clubId, sessions, isSessionsLoading, onSelectSession }) {
  const { t } = useLang();

  const ordered = useMemo(
    () => [...(sessions || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [sessions],
  );
  const sessionIds = useMemo(() => ordered.map((s) => s.id), [ordered]);

  const metricsQ = useClubSessionMetrics(edition?.id, clubId, sessionIds);
  const metrics = metricsQ.data || {};
  const startupsSum = useClubStartupsSummary(edition?.id, clubId);
  const jurySum = useClubJuryAssignmentsCount(edition?.id, clubId);

  const statusOf = (s) => s.config?.status || 'draft';
  const counts = {
    total: ordered.length,
    live: ordered.filter((s) => statusOf(s) === 'live').length,
    draft: ordered.filter((s) => statusOf(s) === 'draft').length,
    published: ordered.filter((s) => statusOf(s) === 'published').length,
  };
  const totalStartups = startupsSum.data?.__total__ || 0;
  const uniqueJurors = jurySum.data?.uniqueJurors || 0;

  const num = (v) => (typeof v === 'number' ? v : '—');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(220px,260px)] gap-6">
      {/* Colonne principale */}
      <div>
        {/* Header éditorial */}
        <div className="flex items-center gap-2.5 mb-2">
          <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
          <span className="uppercase text-[10px] tracking-[0.18em] font-medium" style={{ color: GOLD }}>
            {t(CLUB_PILOTAGE.eyebrow)}
          </span>
        </div>
        <h3 className="text-[22px] leading-tight mb-4" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(CLUB_PILOTAGE.title)}
        </h3>

        {/* Timeline sessions */}
        <div className="uppercase tracking-[0.14em] text-[10.5px] mb-2" style={{ color: MUTED }}>
          {t(CLUB_PILOTAGE.sessionsHead)}
        </div>

        {isSessionsLoading && (
          <div className="py-8 flex justify-center" role="status" aria-live="polite">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
          </div>
        )}

        {!isSessionsLoading && ordered.length === 0 && (
          <p className="text-[13px] py-3" style={{ color: MUTED }}>{t(CLUB_PILOTAGE.empty)}</p>
        )}

        {!isSessionsLoading && ordered.length > 0 && (
          <ul className="divide-y" style={{ borderColor: CREAM2 }}>
            {ordered.map((s) => {
              const m = metrics[s.id];
              const startups = m ? m.startups : (metricsQ.isLoading ? '…' : '—');
              const jurors = m ? m.jurors : (metricsQ.isLoading ? '…' : '—');
              return (
                <li key={s.id} className="py-3 flex items-start gap-3 flex-wrap">
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] tabular-nums shrink-0"
                    style={{ background: '#fdf6e8', color: NAVY, border: `1px solid ${CREAM2}` }}
                  >
                    {s.position ?? 0}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-medium" style={{ color: NAVY }}>{s.name}</span>
                      <StatusPill status={s.config?.status || 'draft'} kind="jury" />
                      <span className="text-[11.5px]" style={{ color: MUTED }}>· {s.kind}</span>
                    </div>
                    <p className="text-[11.5px] mt-0.5" style={{ color: MUTED }}>
                      {s.session_date && <span>{s.session_date} · </span>}
                      {startups} {t(CLUB_PILOTAGE.startupsUnit)} · {jurors} {t(CLUB_PILOTAGE.jurorsUnit)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectSession?.(s.id)}
                    className={`inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-[4px] shrink-0 ${FOCUS_RING_CLASS}`}
                    style={{ background: NAVY, color: 'white' }}
                  >
                    {t(CLUB_PILOTAGE.open)} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* KPI rail */}
      <aside className="lg:sticky lg:top-4 self-start">
        <div
          className="rounded-[4px] px-4 py-1"
          style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
        >
          <KpiRow label={t(CLUB_PILOTAGE.kpiSessions)} value={counts.total} />
          <KpiRow label={t(CLUB_PILOTAGE.kpiLive)} value={counts.live} accent={GOLD} />
          <KpiRow label={t(CLUB_PILOTAGE.kpiDraft)} value={counts.draft} />
          <KpiRow label={t(CLUB_PILOTAGE.kpiPublished)} value={counts.published} />
          <KpiRow label={t(CLUB_PILOTAGE.kpiStartups)} value={num(totalStartups)} />
          <KpiRow label={t(CLUB_PILOTAGE.kpiJurors)} value={num(uniqueJurors)} />
          <KpiRow label={t(CLUB_PILOTAGE.kpiCandidates)} value={num(totalStartups)} />
        </div>
      </aside>
    </div>
  );
}
