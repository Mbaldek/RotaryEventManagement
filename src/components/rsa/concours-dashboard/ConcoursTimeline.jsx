// ConcoursTimeline — bande horizontale du parcours de la compétition (V3).
//
// Nouvelle composition v3 : entre le Hero et les ClubSections, une timeline
// horizontale qui visualise TOUTES les sessions de l'édition (qualifying + finale)
// en un coup d'œil. Chaque session = dot coloré par sa palette thématique +
// date courte + état (pulse rouge si live, check vert si published, contour gris
// sinon). Click sur un dot → ouvre le drawer détail.
//
// La timeline rend horizontale ce que la stack Hero+ClubSections rend
// verticalement (chronologie linéaire vs groupement par club). Sur mobile,
// scroll horizontal naturel.

import React, { useMemo } from 'react';
import { Eyebrow } from '@/components/design';
import { NAVY, GOLD, INK, MUTED, CREAM2, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { computeCountdown } from '@/components/rsa/jury/constants';
import { getSessionPalette, getSessionEmoji } from './sessionTheme';
import { UI, formatShortDate } from './i18n';

function statusKindOf(status, days) {
  if (status === 'live') return 'live';
  if (status === 'published') return 'done';
  if (status === 'locked') return 'locked';
  if (typeof days === 'number' && days < 0) return 'past';
  return 'upcoming';
}

function LegendDot({ color, label, kind }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: INK }}>
      <span
        aria-hidden
        className="inline-block"
        style={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: kind === 'upcoming' ? 'white' : color,
          border: `1.5px solid ${color}`,
          boxShadow: kind === 'live' ? `0 0 0 3px ${color}33` : 'none',
        }}
      />
      <span style={{ color: MUTED }}>{label}</span>
    </div>
  );
}

export default function ConcoursTimeline({
  sessionsByClub,
  finaleSessions,
  clubs,
  onOpenSession,
}) {
  const { t, lang } = useLang();

  // Flatten + sort all sessions by date. Each session keeps its palette
  // (resolved using its index in its OWN club, so the rotation stays the
  // same as ClubSection — visual consistency).
  const items = useMemo(() => {
    const out = [];
    const clubsArr = Array.isArray(clubs) ? clubs : [];
    const clubNameById = Object.fromEntries(clubsArr.map((c) => [c.id, c.name]));
    Object.entries(sessionsByClub || {}).forEach(([clubId, sessions]) => {
      (sessions || []).forEach((s, i) => {
        out.push({
          session: s,
          palette: getSessionPalette(s, i),
          emoji: getSessionEmoji(s),
          clubName: clubNameById[clubId] || null,
        });
      });
    });
    (finaleSessions || []).forEach((s) => {
      out.push({
        session: s,
        palette: getSessionPalette(s, 0),
        emoji: getSessionEmoji(s),
        clubName: null,
      });
    });
    out.sort((a, b) => {
      const da = a.session?.session_date ? Date.parse(a.session.session_date) : 0;
      const db = b.session?.session_date ? Date.parse(b.session.session_date) : 0;
      return da - db;
    });
    return out;
  }, [sessionsByClub, finaleSessions, clubs]);

  if (items.length === 0) {
    return (
      <section className="mb-10">
        <header className="mb-4">
          <Eyebrow>{t(UI.timelineEyebrow)}</Eyebrow>
          <h2
            className="text-[22px] font-normal leading-tight"
            style={{ fontFamily: SERIF, color: NAVY }}
          >
            {t(UI.timelineTitle)}
          </h2>
        </header>
        <div
          className="text-[13px] italic px-4 py-6 rounded-[8px]"
          style={{ color: MUTED, background: 'white', border: `1px dashed ${CREAM2}` }}
        >
          {t(UI.timelineEmpty)}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <header className="mb-5 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <Eyebrow>{t(UI.timelineEyebrow)}</Eyebrow>
          <h2
            className="text-[22px] font-normal leading-tight"
            style={{ fontFamily: SERIF, color: NAVY }}
          >
            {t(UI.timelineTitle)}
          </h2>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <LegendDot color={MUTED} kind="upcoming" label={t(UI.timelineLegendUpcoming)} />
          <LegendDot color="#b91c1c" kind="live" label={t(UI.timelineLegendLive)} />
          <LegendDot color={GOLD} kind="done" label={t(UI.timelineLegendDone)} />
        </div>
      </header>

      <div
        className="bg-white rounded-[10px] px-5 py-6 overflow-x-auto"
        style={{ border: `1px solid ${CREAM2}` }}
      >
        <div className="relative" style={{ minWidth: Math.max(items.length * 110, 600) }}>
          {/* Horizontal rail */}
          <div
            aria-hidden
            className="absolute left-0 right-0"
            style={{ top: 28, height: 2, background: CREAM2, borderRadius: 1 }}
          />
          {/* Gold accent under the upcoming part — anchored after the last "done" */}
          <div
            className="relative flex items-start"
            style={{ gap: items.length > 1 ? `${100 / items.length}%` : 0 }}
          >
            {items.map((it, idx) => {
              const status = it.session?.config?.status || 'draft';
              const cd = computeCountdown(it.session?.session_date);
              const days = cd
                ? cd.kind === 'past' || cd.kind === 'yesterday'
                  ? -cd.days
                  : cd.days
                : null;
              const kind = statusKindOf(status, days);
              const isLive = kind === 'live';
              const isDone = kind === 'done';
              const dot = (
                <button
                  type="button"
                  onClick={() => onOpenSession?.(it.session)}
                  className="relative outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] rounded-full"
                  aria-label={it.session?.name || it.session?.id}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: isDone ? GOLD : isLive ? '#b91c1c' : it.palette.primary,
                    border: `2px solid white`,
                    boxShadow: isLive
                      ? `0 0 0 4px ${it.palette.light}, 0 0 0 5px rgba(185,28,28,0.35)`
                      : `0 0 0 3px ${it.palette.light}`,
                    cursor: 'pointer',
                    animation: isLive ? 'concoursTimelinePulse 1.5s ease-in-out infinite' : undefined,
                  }}
                />
              );
              return (
                <div
                  key={it.session.id}
                  className="flex-1 min-w-[110px] flex flex-col items-center text-center"
                >
                  {/* Date above */}
                  <div
                    className="text-[10.5px] uppercase tracking-[0.12em] font-medium mb-1.5"
                    style={{ color: MUTED }}
                  >
                    {formatShortDate(it.session?.session_date, lang) || t(UI.none)}
                  </div>
                  {/* Dot */}
                  <div className="relative" style={{ height: 28, display: 'flex', alignItems: 'center' }}>
                    {dot}
                  </div>
                  {/* Label below */}
                  <button
                    type="button"
                    onClick={() => onOpenSession?.(it.session)}
                    className="mt-2.5 group max-w-[120px] focus:outline-none"
                  >
                    <div className="flex items-center justify-center gap-1 text-[10.5px] mb-0.5">
                      {it.emoji && <span aria-hidden style={{ fontSize: 11 }}>{it.emoji}</span>}
                      <span
                        className="uppercase tracking-[0.1em] font-semibold truncate"
                        style={{ color: it.palette.primary, maxWidth: 95 }}
                      >
                        {it.session?.theme || it.session?.name || ''}
                      </span>
                    </div>
                    <div
                      className="text-[11.5px] leading-tight font-medium truncate group-hover:underline"
                      style={{ color: NAVY, fontFamily: SERIF, maxWidth: 120, textDecorationColor: GOLD }}
                      title={it.session?.name}
                    >
                      {it.session?.name || '—'}
                    </div>
                    {it.clubName && (
                      <div
                        className="text-[9.5px] mt-0.5 truncate"
                        style={{ color: MUTED, maxWidth: 120 }}
                      >
                        {it.clubName}
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes concoursTimelinePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
      `}</style>
    </section>
  );
}
