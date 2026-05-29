// ClubSection — bloc d'un club avec son nom + grid de SessionCards (V2.5).
//
// Layout : eyebrow club + nom serif + meta, hairline gold, puis :
//   - SI une session "prochaine" identifiable (non publiée, date à venir) :
//     bloc "Prochaine session" featured (largeur 640px max sur md+),
//     puis les autres sessions en grid 1/2/3 colonnes dessous.
//   - SINON : grid 1/2/3 colonnes uniforme.
//
// Cf. design-upgrade-blueprint §3.1 + §4.13 (Concours).

import React, { useMemo } from 'react';
import { Eyebrow } from '@/components/design';
import { NAVY, MUTED, GOLD, CREAM2, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import SessionCard from './SessionCard';
import { UI } from './i18n';

export default function ClubSection({
  club,
  sessions,
  startupsCount,
  startupsBySession,
  jurorsBySession,
  finalistsBySource,
  onOpenSession,
}) {
  const { t, lang } = useLang();
  const sessionsList = Array.isArray(sessions) ? sessions : [];
  const sessionsCount = sessionsList.length;

  // "Prochaine session" = la plus proche dans le futur, status != 'published'.
  // Sert à introduire une asymétrie éditoriale (1 featured + grid) au lieu de
  // la grille uniforme qui faisait "template AI" quand un club a 5+ sessions.
  const { featured, others } = useMemo(() => {
    if (!sessionsList.length) return { featured: null, others: [] };
    const now = Date.now();
    const upcoming = sessionsList
      .filter((s) => {
        const status = s?.config?.status || 'draft';
        if (status === 'published') return false;
        const d = s?.session_date ? new Date(s.session_date).getTime() : null;
        return d != null && d >= now;
      })
      .sort((a, b) => new Date(a.session_date) - new Date(b.session_date));
    const f = upcoming[0] || null;
    return {
      featured: f,
      others: f ? sessionsList.filter((s) => s.id !== f.id) : sessionsList,
    };
  }, [sessionsList]);

  const renderCard = (s) => (
    <SessionCard
      key={s.id}
      session={s}
      t={t}
      lang={lang}
      startupsCount={startupsBySession?.[s.id] || 0}
      jurorsCount={jurorsBySession?.[s.id] || 0}
      finalistName={finalistsBySource?.[s.id]?.startup_name || null}
      onOpen={onOpenSession}
    />
  );

  return (
    <section className="mb-12">
      <header className="mb-5">
        <Eyebrow>{t(UI.clubEyebrow)}</Eyebrow>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <h2
            className="text-[26px] font-normal leading-tight"
            style={{ fontFamily: SERIF, color: NAVY }}
          >
            {club?.name || club?.id}
          </h2>
          <div className="text-[12px] flex items-center gap-3" style={{ color: MUTED }}>
            <span>{t(UI.clubSessionsCount)(sessionsCount)}</span>
            <span aria-hidden style={{ color: CREAM2 }}>·</span>
            <span>{t(UI.clubCandidaturesCount)(startupsCount || 0)}</span>
          </div>
        </div>
        <div
          aria-hidden
          className="h-[1.5px] mt-4"
          style={{ background: GOLD, width: 36 }}
        />
      </header>

      {sessionsList.length === 0 ? (
        <div
          className="text-[13px] italic px-4 py-6 rounded-[8px]"
          style={{ color: MUTED, background: 'white', border: `1px dashed ${CREAM2}` }}
        >
          {t(UI.noSessionsForClub)}
        </div>
      ) : featured ? (
        <>
          {/* Featured : prochaine session, eyebrow inline + carte en largeur restreinte. */}
          <div className="mb-7">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
              <span
                className="uppercase text-[10px] tracking-[0.18em] font-medium"
                style={{ color: GOLD }}
              >
                {t({ fr: 'Prochaine session', en: 'Next session', de: 'Nächste Session' })}
              </span>
            </div>
            <div className="md:max-w-[640px]">
              {renderCard(featured)}
            </div>
          </div>
          {others.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {others.map(renderCard)}
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sessionsList.map(renderCard)}
        </div>
      )}
    </section>
  );
}
