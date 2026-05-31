// SessionRow — ligne éditoriale d'une session (remplace la card). Pas de surface :
// hairline en bas, filet couleur gauche, underline gold au hover. Cliquable -> drawer.
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { NAVY, GOLD, INK, MUTED, CREAM, CREAM2, SERIF } from '@/components/design/tokens';
import ConcoursStatusPill from './ConcoursStatusPill';
import { UI, formatSessionDate } from './i18n';

const LIVE_RED = '#b91c1c';

function countdownLabel(cd, t) {
  if (!cd) return null;
  if (cd.kind === 'today') return t(UI.today);
  if (cd.kind === 'tomorrow') return t(UI.tomorrow);
  if (cd.kind === 'in') return t(UI.inDays)(cd.days);
  return t(UI.ago);
}

export default function SessionRow({ session, index, isNext, jurorsCount, startupsCount, t, lang, onOpen }) {
  const { palette, status, countdown: cd } = session;
  const days = cd ? (cd.kind === 'past' || cd.kind === 'yesterday' ? -cd.days : cd.days) : null;
  const isLive = status === 'live';
  const isPublished = status === 'published';
  const dateLabel = formatSessionDate(session?.session_date, lang);
  const winner = session?.config?.winner || null;
  const cdLabel = countdownLabel(cd, t);

  const open = () => onOpen?.(session);

  return (
    <article
      id={`session-${session.id}`}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      }}
      aria-label={`${session.name || session.theme || ''} — ${dateLabel || ''}`}
      className="group relative grid grid-cols-[auto_1fr_auto] gap-x-4 md:gap-x-6 items-start cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] rounded-[4px]"
      style={{
        paddingLeft: 18,
        paddingTop: isLive ? 18 : 14,
        paddingBottom: isLive ? 18 : 14,
        paddingRight: 8,
        borderBottom: `1px solid ${CREAM2}`,
        background: isLive ? CREAM : 'transparent',
      }}
    >
      <span aria-hidden className="absolute left-0 top-0 bottom-0"
        style={{ width: isLive ? 4 : 2, background: palette.primary }} />

      <span className="tabular-nums text-[15px] pt-0.5" style={{ fontFamily: SERIF, color: GOLD }}>
        {String(index).padStart(2, '0')}
      </span>

      <div className="min-w-0">
        {(session.theme || (isNext && !isLive)) && (
          <div className="uppercase text-[10px] tracking-[0.16em] font-semibold mb-1"
            style={{ color: session.theme ? palette.primary : GOLD }}>
            {session.theme}
            {isNext && !isLive && (
              <span style={{ color: GOLD }}>
                {session.theme ? ' · ' : ''}{t({ fr: 'PROCHAINE', en: 'NEXT', de: 'NÄCHSTE' })}
              </span>
            )}
          </div>
        )}
        <h3 className="text-[17px] md:text-[18px] font-medium leading-snug inline-block relative"
          style={{ fontFamily: SERIF, color: NAVY }}>
          {session.name || session.theme || session.id}
          <span aria-hidden
            className="absolute left-0 -bottom-0.5 h-px w-full origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
            style={{ background: GOLD }} />
        </h3>
        <div className="mt-1.5 text-[12px] flex flex-wrap items-center gap-x-3 gap-y-1" style={{ color: MUTED }}>
          {session.clubName && <span>{session.clubName}</span>}
          {dateLabel && <><span aria-hidden style={{ color: CREAM2 }}>·</span><span>{dateLabel}</span></>}
        </div>
        <div className="mt-1 text-[12px] flex flex-wrap items-center gap-x-3 gap-y-1" style={{ color: INK }}>
          <span className="tabular-nums">{jurorsCount || 0} {t(UI.cardJurorsShort)}</span>
          <span aria-hidden style={{ color: CREAM2 }}>·</span>
          <span className="tabular-nums">{startupsCount || 0} {t(UI.cardStartupsShort)}</span>
          {isLive && (
            <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: LIVE_RED }}>
              <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: LIVE_RED,
                animation: 'concoursStatusPulse 1.5s ease-in-out infinite' }} />
              {t(UI.rowScoringLive)}
            </span>
          )}
          {isPublished && winner?.startup_name && (
            <span style={{ color: GOLD }}>
              {t(UI.rowLaureate)} · <span style={{ color: NAVY, fontFamily: SERIF }}>{winner.startup_name}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] font-semibold"
            style={{ color: LIVE_RED }}>● LIVE</span>
        ) : isPublished ? (
          <ConcoursStatusPill status={status} days={days} T={UI} t={t}
            tintBg={palette.light} tintBorder={palette.border} tintFg={palette.primary} />
        ) : (
          <span className="text-[12px] tabular-nums font-medium" style={{ color: isNext ? GOLD : MUTED }}>
            {cdLabel || ''}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: palette.primary }}>
          {isLive ? t(UI.rowFollowLive) : t(UI.rowOpen)}
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>

      <style>{`@keyframes concoursStatusPulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @media (prefers-reduced-motion: reduce){ [style*="concoursStatusPulse"]{animation:none!important} }`}</style>
    </article>
  );
}
