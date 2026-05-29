// SessionCard v2 — mini-récap colorée d'une session sur la page /Concours.
//
// Refonte v3 : la card legacy ressemblait à un bloc de texte aligné. La v2 lui
// rend son identité visuelle via :
//   - barre couleur thématique gauche (3px primary)
//   - emoji content marker en eyebrow + nom session serif
//   - status pill colorée (border = palette.primary, bg = palette.light)
//   - mini-KPI bar (jurés / startups / finaliste) sur fond light tint
//   - winner inline si status=published (gradient gold + 🏆)
//   - click-anywhere → ouvre le drawer détail
//
// Toujours strict Élysée : pas d'ombre, hairlines, serif pour les noms,
// couleurs muted. Les emojis sont des CONTENT MARKERS (cf. designbook §1.3 —
// l'autorisation explicite pour les pages content-heavy comme résultats).

import React from 'react';
import { Users, Rocket, ChevronRight, Calendar, Trophy } from 'lucide-react';
import { NAVY, GOLD, CREAM2, INK, MUTED, SERIF } from '@/components/design/tokens';
import { computeCountdown } from '@/components/rsa/jury/constants';
import ConcoursStatusPill from './ConcoursStatusPill';
import { UI, formatSessionDate } from './i18n';
import { getSessionPalette, getSessionEmoji } from './sessionTheme';

function countdownLabel(cd, t, T) {
  if (!cd) return null;
  if (cd.kind === 'today') return t(T.today);
  if (cd.kind === 'tomorrow') return t(T.tomorrow);
  if (cd.kind === 'in') return t(T.inDays)(cd.days);
  return t(T.ago);
}

export default function SessionCard({
  session,
  t,
  lang,
  indexInClub = 0,
  startupsCount,
  jurorsCount,
  finalistName,
  onOpen,
}) {
  const status = session?.config?.status || 'draft';
  const cd = computeCountdown(session?.session_date);
  const days = cd ? (cd.kind === 'past' || cd.kind === 'yesterday' ? -cd.days : cd.days) : null;
  const cdLabel = countdownLabel(cd, t, UI);
  const dateLabel = formatSessionDate(session?.session_date, lang);
  const isPublished = status === 'published';
  const isLive = status === 'live';
  const palette = getSessionPalette(session, indexInClub);
  const emoji = getSessionEmoji(session);
  const winner = session?.config?.winner || null;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(session)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen?.(session);
        }
      }}
      className="group relative bg-white rounded-[10px] overflow-hidden cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
      style={{ border: `1px solid ${CREAM2}` }}
    >
      {/* Color rail left */}
      <div
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: palette.primary }}
      />

      <div className="p-5 pl-6 flex flex-col gap-4">
        {/* Header */}
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Eyebrow with emoji marker */}
            {emoji && (
              <div
                className="text-[11px] uppercase tracking-[0.16em] font-semibold flex items-center gap-1.5 mb-1.5"
                style={{ color: palette.primary }}
              >
                <span aria-hidden style={{ fontSize: 13 }}>{emoji}</span>
                <span>{session?.theme || t(UI.themeFallback)}</span>
              </div>
            )}
            <h3
              className="text-[17px] font-medium leading-tight truncate"
              style={{ fontFamily: SERIF, color: NAVY }}
            >
              {session?.name || session?.theme || session?.id}
            </h3>
            {dateLabel && (
              <div
                className="text-[11.5px] mt-1 flex items-center gap-1.5"
                style={{ color: MUTED }}
              >
                <Calendar className="w-3 h-3" />
                <span className="truncate">{dateLabel}</span>
              </div>
            )}
          </div>
          <ConcoursStatusPill
            status={status}
            days={days}
            T={UI}
            t={t}
            tintBg={palette.light}
            tintBorder={palette.border}
            tintFg={palette.primary}
          />
        </header>

        {/* Countdown line — gold (or red for live) */}
        {cdLabel && status !== 'published' && (
          <div
            className="text-[10.5px] uppercase tracking-[0.18em] font-semibold inline-flex items-center gap-1.5 -mt-1"
            style={{ color: isLive ? '#b91c1c' : palette.primary }}
          >
            {isLive && (
              <span
                aria-hidden
                style={{
                  width: 7,
                  height: 7,
                  background: '#b91c1c',
                  borderRadius: '50%',
                  animation: 'concoursStatusPulse 1.5s ease-in-out infinite',
                }}
              />
            )}
            {cdLabel}
          </div>
        )}

        {/* KPI bar — fond light tint pour ancrer la couleur thématique */}
        <div
          className="rounded-[6px] px-3 py-2 flex items-center gap-4 flex-wrap text-[12px]"
          style={{ background: palette.light, color: INK }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" style={{ color: palette.primary }} />
            <span className="font-medium tabular-nums" style={{ color: NAVY }}>
              {jurorsCount || 0}
            </span>
            <span style={{ color: MUTED }}>{t(UI.cardJurorsShort)}</span>
          </span>
          <span aria-hidden style={{ color: palette.border }}>·</span>
          <span className="inline-flex items-center gap-1.5">
            <Rocket className="w-3.5 h-3.5" style={{ color: palette.primary }} />
            <span className="font-medium tabular-nums" style={{ color: NAVY }}>
              {startupsCount || 0}
            </span>
            <span style={{ color: MUTED }}>{t(UI.cardStartupsShort)}</span>
          </span>
        </div>

        {/* Winner banner (published) OR finalist chip OR open CTA */}
        {isPublished && winner ? (
          <div
            className="rounded-[6px] px-3 py-2.5 flex items-center gap-2.5 text-[12.5px]"
            style={{
              background: 'linear-gradient(135deg, rgba(201,168,76,0.18), rgba(201,168,76,0.04))',
              border: `1px solid ${GOLD}66`,
            }}
          >
            <Trophy className="w-4 h-4 shrink-0" style={{ color: '#9a6400' }} aria-hidden />
            <div className="flex-1 min-w-0">
              <div
                className="uppercase text-[9px] tracking-[0.18em] font-semibold"
                style={{ color: '#9a6400' }}
              >
                {t(UI.cardWinner)}
              </div>
              <div
                className="font-medium mt-0.5 truncate"
                style={{ color: NAVY, fontFamily: SERIF }}
              >
                {winner.startup_name}
              </div>
            </div>
            {typeof winner.final_score === 'number' && (
              <div className="shrink-0 text-right">
                <div
                  className="text-[18px] font-medium leading-none tabular-nums"
                  style={{ color: '#9a6400', fontFamily: SERIF }}
                >
                  {winner.final_score.toFixed(2)}
                </div>
                <div className="text-[9px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>
                  /5
                </div>
              </div>
            )}
          </div>
        ) : isPublished && finalistName ? (
          <div
            className="rounded-[6px] px-3 py-2.5 flex items-center gap-2 text-[12.5px]"
            style={{
              background: 'linear-gradient(135deg, rgba(201,168,76,0.10), rgba(201,168,76,0.02))',
              border: `1px solid ${GOLD}55`,
            }}
          >
            <Trophy className="w-3.5 h-3.5 shrink-0" style={{ color: '#9a6400' }} aria-hidden />
            <div className="flex-1 min-w-0">
              <div
                className="uppercase text-[9px] tracking-[0.16em] font-semibold"
                style={{ color: '#9a6400' }}
              >
                {t(UI.cardFinalistLabel)}
              </div>
              <div
                className="font-medium mt-0.5 truncate"
                style={{ color: NAVY, fontFamily: SERIF }}
              >
                {finalistName}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1 mt-auto">
            <span
              className="inline-flex items-center gap-1 text-[11.5px] font-medium transition-transform duration-200 group-hover:translate-x-0.5"
              style={{ color: palette.primary }}
            >
              {t(UI.cardOpenSession)}
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
