// ConcoursTimeline — frise de la saison : signature visuelle + nav d'ancrage + scroll-spy.
// Sans card (rail hairline), sticky sous le TopNav, dots positionnés par date.
import React, { useMemo } from 'react';
import { NAVY, GOLD, MUTED, CREAM, CREAM2, SERIF } from '@/components/design/tokens';
import { formatShortDate } from './i18n';

const LIVE_RED = '#b91c1c';

export default function ConcoursTimeline({ season, finaleSessions = [], activeId, onJump, lang }) {
  const items = useMemo(() => {
    const out = (season?.flat || []).map((s) => ({ session: s, palette: s.palette, finale: false }));
    (finaleSessions || []).forEach((s) =>
      out.push({
        session: { ...s, status: s?.config?.status || 'draft' },
        palette: { primary: GOLD },
        finale: true,
      }));
    return out;
  }, [season, finaleSessions]);

  if (items.length === 0) return null;

  return (
    <section
      className="mb-10 md:mb-12 sticky top-14 z-30 -mx-4 md:-mx-6 px-4 md:px-6 py-3"
      style={{ background: `${CREAM}f2`, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', borderBottom: `1px solid ${CREAM2}` }}
    >
      <div className="overflow-x-auto">
        <div className="relative flex items-start" style={{ minWidth: Math.max(items.length * 96, 480) }}>
          <div aria-hidden className="absolute left-0 right-0" style={{ top: 22, height: 2, background: CREAM2 }} />
          {items.map(({ session: s, palette, finale }) => {
            const isActive = s.id === activeId;
            const isLive = s.status === 'live';
            const isDone = s.status === 'published';
            const dotBg = finale || isDone ? GOLD : isLive ? LIVE_RED : palette.primary;
            const filled = finale || isDone || isLive;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onJump?.(s.id)}
                aria-current={isActive ? 'true' : undefined}
                aria-label={s.name || s.theme || s.id}
                className="flex-1 min-w-[88px] flex flex-col items-center text-center outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] rounded-[4px] px-1"
              >
                <span className="text-[9.5px] uppercase tracking-[0.1em] mb-1.5" style={{ color: MUTED }}>
                  {formatShortDate(s?.session_date, lang) || ''}
                </span>
                <span className="relative" style={{ height: 16, display: 'flex', alignItems: 'center' }}>
                  <span
                    aria-hidden
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: filled ? dotBg : 'white',
                      border: `2px solid ${dotBg}`,
                      boxShadow: isActive
                        ? `0 0 0 4px ${GOLD}66`
                        : isLive
                          ? `0 0 0 3px ${LIVE_RED}33`
                          : 'none',
                      animation: isLive ? 'concoursFriseLive 1.5s ease-in-out infinite' : undefined,
                    }}
                  />
                </span>
                <span
                  className="mt-2 text-[10.5px] leading-tight truncate max-w-[88px]"
                  style={{ color: isActive ? NAVY : MUTED, fontFamily: SERIF }}
                >
                  {s.name || s.theme || ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes concoursFriseLive { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
        @media (prefers-reduced-motion: reduce){ [style*="concoursFriseLive"]{animation:none!important} }`}</style>
    </section>
  );
}
