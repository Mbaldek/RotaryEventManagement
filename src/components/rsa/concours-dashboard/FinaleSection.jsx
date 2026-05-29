// FinaleSection v2 — bloc Grande Finale enrichi (V3).
//
// Refonte v3 :
//   - Gradient gold étendu en background
//   - Trophée gold animé en eyebrow (pulse subtil)
//   - Finalistes chips colorés par leur SESSION SOURCE (theme_color depuis RPC v2)
//     → on voit en un regard l'origine thématique de chaque finaliste
//   - Ratio confirmés/attendus en KPI tabular
//   - RSVP CTA pleine largeur (mobile-first)

import React from 'react';
import { Link } from 'react-router-dom';
import { Eyebrow } from '@/components/design';
import { NAVY, INK, MUTED, GOLD, SERIF } from '@/components/design/tokens';
import { Calendar, MapPin, ArrowRight, Trophy } from 'lucide-react';
import { useLang } from '@/lib/platform/i18n';
import { computeCountdown } from '@/components/rsa/jury/constants';
import ConcoursStatusPill from './ConcoursStatusPill';
import { UI, formatSessionDate } from './i18n';
import { createPageUrl } from '@/utils';
import { getSessionPalette } from './sessionTheme';

function FinalistChip({ finalist }) {
  // Derive the source palette from theme_color (now provided by RPC v2 as
  // `source_session_theme_color`). Fall back to neutral if not available.
  const sourcePalette = finalist?.source_session_theme_color
    ? getSessionPalette(
        { id: finalist.source_session_id, config: { theme_color: finalist.source_session_theme_color } },
        0,
      )
    : { primary: MUTED, light: '#f5f3ef', border: '#e8e3d9' };

  return (
    <li
      className="bg-white rounded-full pl-1 pr-3 py-1 flex items-center gap-2 text-[12.5px]"
      style={{ border: `1px solid ${GOLD}55`, color: NAVY }}
    >
      <span
        aria-hidden
        className="inline-block rounded-full"
        style={{
          width: 24,
          height: 24,
          background: sourcePalette.light,
          border: `1.5px solid ${sourcePalette.primary}`,
        }}
      />
      <span className="font-medium">{finalist.startup_name || finalist.name}</span>
      {finalist.source_session_name && (
        <span style={{ color: sourcePalette.primary, fontSize: 10.5, fontWeight: 500 }}>
          · {finalist.source_session_name}
        </span>
      )}
    </li>
  );
}

export default function FinaleSection({
  edition,
  finaleSession,
  finalists,
  totalFinalistsExpected,
}) {
  const { t, lang } = useLang();
  const hasFinale = !!finaleSession;
  const status = finaleSession?.config?.status || 'draft';
  const cd = computeCountdown(finaleSession?.session_date);
  const days = cd ? (cd.kind === 'past' || cd.kind === 'yesterday' ? -cd.days : cd.days) : null;
  const dateLabel = formatSessionDate(finaleSession?.session_date, lang);
  const finalistsList = Array.isArray(finalists) ? finalists : [];

  return (
    <section className="mb-12">
      <header className="mb-5 flex items-end gap-4 flex-wrap">
        <div>
          <Eyebrow>{t(UI.finaleEyebrow)}</Eyebrow>
          <h2
            className="text-[28px] font-normal leading-tight flex items-center gap-3"
            style={{ fontFamily: SERIF, color: NAVY }}
          >
            <Trophy
              className="w-7 h-7"
              style={{
                color: GOLD,
                animation: 'concoursTrophyShimmer 3s ease-in-out infinite',
              }}
              aria-hidden
            />
            {t(UI.finaleTitle)}
          </h2>
          <div
            aria-hidden
            className="h-[1.5px] mt-3"
            style={{ background: GOLD, width: 36 }}
          />
        </div>
      </header>

      <div
        className="relative rounded-[12px] p-6 md:p-8 overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, rgba(201,168,76,0.18) 0%, rgba(250,247,242,1) 60%)',
          border: `1px solid ${GOLD}77`,
        }}
      >
        {/* Decorative halo top-right */}
        <div
          aria-hidden
          className="absolute -top-20 -right-20 rounded-full"
          style={{
            width: 240,
            height: 240,
            background: `radial-gradient(closest-side, ${GOLD}33, transparent 70%)`,
          }}
        />

        {!hasFinale ? (
          <p className="text-[14px] italic relative" style={{ color: MUTED }}>
            {t(UI.finaleNoData)}
          </p>
        ) : (
          <div className="relative">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
              <div className="min-w-0">
                <h3
                  className="text-[22px] font-normal leading-tight"
                  style={{ fontFamily: SERIF, color: NAVY }}
                >
                  {finaleSession.name || finaleSession.theme || finaleSession.id}
                </h3>
                <div
                  className="text-[12.5px] mt-2 flex flex-wrap items-center gap-x-4 gap-y-1"
                  style={{ color: INK }}
                >
                  {dateLabel && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" style={{ color: GOLD }} />
                      {dateLabel}
                    </span>
                  )}
                  {finaleSession.notes && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" style={{ color: GOLD }} />
                      {finaleSession.notes}
                    </span>
                  )}
                </div>
              </div>
              <ConcoursStatusPill
                status={status}
                days={days}
                T={UI}
                t={t}
                tintBg="#fdf6e8"
                tintBorder={GOLD}
                tintFg="#9a6400"
              />
            </div>

            {/* Finalistes */}
            <div className="mb-5">
              <div
                className="uppercase text-[10px] tracking-[0.18em] font-semibold mb-3 flex items-center gap-2"
                style={{ color: NAVY }}
              >
                {t(UI.finaleFinalistsLabel)(finalistsList.length, totalFinalistsExpected || 0)}
              </div>
              {finalistsList.length === 0 ? (
                <div className="text-[13px] italic" style={{ color: MUTED }}>
                  {t(UI.finaleNoFinalists)}
                </div>
              ) : (
                <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
                  {finalistsList.map((f) => (
                    <FinalistChip key={f.id || f.startup_name || f.name} finalist={f} />
                  ))}
                </ul>
              )}
            </div>

            {/* RSVP CTA */}
            {(edition?.finale_rsvp_enabled ||
              edition?.status === 'finale' ||
              edition?.status === 'sessions') && (
              <Link
                to={createPageUrl('RsaFinaleRsvp')}
                className="inline-flex items-center gap-2 rounded-[6px] px-5 py-2.5 text-[13px] font-medium transition-transform duration-150 hover:translate-x-0.5"
                style={{ background: NAVY, color: 'white' }}
              >
                {t(UI.finaleRsvpCta)}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes concoursTrophyShimmer {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
      `}</style>
    </section>
  );
}
