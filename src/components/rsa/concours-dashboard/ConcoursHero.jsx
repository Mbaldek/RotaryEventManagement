// ConcoursHero v2 — Hero H-Ambient (logo Rotary qui respire + halo gold) (V3).
//
// Refonte v3 : abandonne H-Editorial générique pour la variante H-Ambient
// explicitement assignée à Concours dans design-upgrade-blueprint §2.1.
//
// Composition :
//   - Colonne gauche : Eyebrow + Titre serif (lead + italic) + intro INK
//   - Colonne droite : logo Rotary (roue stylisée) sur halo gold qui respire
//     + KPI rail dessous (4 stats verticales)
//   - Edition selector minimaliste sous le titre si > 1 édition
//
// Sur mobile : stack vertical, halo centré au-dessus.

import React from 'react';
import { Eyebrow, EditorialTitle } from '@/components/design';
import { NAVY, GOLD, INK, MUTED, CREAM2, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { UI } from './i18n';

function RotaryAmbientMark() {
  // Stylized Rotary wheel (24-tooth gear) on a breathing gold halo. The halo
  // animates between opacity 0.35 ↔ 0.7 every 4s — slow enough to feel
  // institutional, never "gimmicky".
  return (
    <div
      className="relative shrink-0"
      style={{ width: 168, height: 168 }}
      aria-hidden
    >
      {/* Outer halo */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(closest-side, ${GOLD}55, transparent 70%)`,
          animation: 'concoursHaloBreathe 4s ease-in-out infinite',
        }}
      />
      {/* Inner ring */}
      <div
        className="absolute inset-3 rounded-full flex items-center justify-center"
        style={{
          background: `radial-gradient(closest-side, white, ${GOLD}11)`,
          border: `1px solid ${GOLD}40`,
        }}
      >
        <svg
          width="92"
          height="92"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer cog teeth — 12 short rectangles */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const cx = 50 + Math.cos(angle) * 42;
            const cy = 50 + Math.sin(angle) * 42;
            return (
              <rect
                key={i}
                x={cx - 2}
                y={cy - 4}
                width={4}
                height={8}
                rx={1}
                fill={GOLD}
                transform={`rotate(${(i * 30 + 90)} ${cx} ${cy})`}
              />
            );
          })}
          {/* Outer ring */}
          <circle cx="50" cy="50" r="34" stroke={GOLD} strokeWidth="2.5" fill="white" />
          {/* Inner ring */}
          <circle cx="50" cy="50" r="20" stroke={NAVY} strokeWidth="2" fill="white" />
          {/* Hub */}
          <circle cx="50" cy="50" r="6" fill={NAVY} />
          {/* Spokes — six */}
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i * 60 * Math.PI) / 180;
            const x1 = 50 + Math.cos(angle) * 6;
            const y1 = 50 + Math.sin(angle) * 6;
            const x2 = 50 + Math.cos(angle) * 20;
            const y2 = 50 + Math.sin(angle) * 20;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={NAVY}
                strokeWidth="1.6"
              />
            );
          })}
        </svg>
      </div>
      <style>{`
        @keyframes concoursHaloBreathe {
          0%, 100% { transform: scale(0.92); opacity: 0.5; }
          50% { transform: scale(1.06); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

function HeroStat({ label, value, accent = false }) {
  return (
    <div className="min-w-0">
      <div
        className="uppercase text-[9.5px] tracking-[0.18em] font-semibold mb-1"
        style={{ color: MUTED }}
      >
        {label}
      </div>
      <div
        className="text-[18px] font-medium leading-tight tabular-nums"
        style={{ color: accent ? GOLD : NAVY, fontFamily: SERIF }}
      >
        {value}
      </div>
    </div>
  );
}

export default function ConcoursHero({
  edition,
  editionsList,
  onEditionChange,
  kpis,
}) {
  const { t } = useLang();
  const heroEyebrow = t(UI.heroEyebrow);
  const titleLead = t(UI.heroTitleLead);
  const titleItalic = t(UI.heroTitleItalic);
  const intro = t(UI.heroIntro);

  return (
    <section className="mb-10">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 md:gap-12 items-start">
        {/* LEFT column — copy */}
        <div className="min-w-0">
          <Eyebrow>
            {heroEyebrow}
            {edition?.year ? ` · ${edition.year}` : ''}
          </Eyebrow>
          <EditorialTitle lead={titleLead} italic={titleItalic} size="md" />
          <p
            className="text-[14px] leading-relaxed max-w-[60ch] mt-5"
            style={{ color: INK }}
          >
            {intro}
          </p>

          {/* Edition selector — compact, under the intro */}
          {Array.isArray(editionsList) && editionsList.length > 1 && (
            <div className="mt-5 inline-flex items-center gap-2.5">
              <span
                className="uppercase text-[9.5px] tracking-[0.18em] font-semibold"
                style={{ color: MUTED }}
              >
                {t(UI.selectEdition)}
              </span>
              <select
                value={edition?.id || ''}
                onChange={(e) => onEditionChange(e.target.value)}
                className="block bg-white text-[12.5px] px-3 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
                style={{ border: `1px solid ${CREAM2}`, color: NAVY }}
              >
                {editionsList.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} · {e.year}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* RIGHT column — ambient mark + KPI rail */}
        <div className="flex flex-col items-center md:items-end gap-5">
          <RotaryAmbientMark />

          {/* KPI rail — vertical stacked stats with hairlines */}
          <div
            className="bg-white rounded-[8px] p-5 w-full md:w-[260px] flex flex-col gap-4"
            style={{ border: `1px solid ${CREAM2}` }}
          >
            <HeroStat
              label={t(UI.kpiClubs)}
              value={kpis?.clubsCount != null ? String(kpis.clubsCount) : t(UI.none)}
            />
            <div aria-hidden style={{ height: 1, background: CREAM2 }} />
            <HeroStat
              label={t(UI.kpiSessionsDone)}
              value={
                kpis?.sessionsTotal != null
                  ? `${kpis.sessionsDone || 0} / ${kpis.sessionsTotal}`
                  : t(UI.none)
              }
            />
            <div aria-hidden style={{ height: 1, background: CREAM2 }} />
            <HeroStat
              label={t(UI.kpiFinalists)}
              value={kpis?.finalistsCount != null ? String(kpis.finalistsCount) : t(UI.none)}
              accent={kpis?.finalistsCount > 0}
            />
            <div aria-hidden style={{ height: 1, background: CREAM2 }} />
            <HeroStat
              label={t(UI.kpiNext)}
              value={kpis?.nextLabel || t(UI.none)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
