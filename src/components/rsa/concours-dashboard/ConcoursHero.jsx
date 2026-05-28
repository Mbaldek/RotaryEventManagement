// ConcoursHero — hero éditorial + KPI bar pour la page /Concours (V2.5).
//
// Pattern : éprouvé d'Index.jsx / RsaJuryHub V1 :
//   - eyebrow gold (rule + uppercase tracked)
//   - serif title sur 2 lignes (lead + italic)
//   - paragraphe intro INK
//   - bloc KPI bar (4 stats sur une ligne, wrap responsive)
//   - selector d'édition à droite (dropdown)
//
// Lecture seule. Aucun bouton "Inscription jury" (la dashboard n'est pas un
// funnel d'acquisition : c'est la vitrine du concours pour ceux qui sont déjà
// dans la maison).

import React from 'react';
import { Eyebrow, EditorialTitle } from '@/components/design';
import { NAVY, INK, MUTED, CREAM2, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { UI } from './i18n';

function Stat({ label, value }) {
  return (
    <div className="min-w-0">
      <div
        className="uppercase text-[9.5px] tracking-[0.18em] font-medium mb-1"
        style={{ color: MUTED }}
      >
        {label}
      </div>
      <div
        className="text-[15px] font-medium leading-tight"
        style={{ color: NAVY, fontFamily: SERIF }}
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
      <div className="flex items-start justify-between gap-6 flex-wrap mb-5">
        <div className="min-w-0 flex-1">
          <Eyebrow>{heroEyebrow}{edition?.year ? ` · ${edition.year}` : ''}</Eyebrow>
          <EditorialTitle lead={titleLead} italic={titleItalic} size="md" />
        </div>

        {/* Edition selector */}
        {Array.isArray(editionsList) && editionsList.length > 1 && (
          <div className="shrink-0">
            <div
              className="uppercase text-[9.5px] tracking-[0.18em] font-medium mb-1"
              style={{ color: MUTED }}
            >
              {t(UI.selectEdition)}
            </div>
            <select
              value={edition?.id || ''}
              onChange={(e) => onEditionChange(e.target.value)}
              className="block bg-white text-[13px] px-3 py-2 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
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

      <p
        className="text-[14px] leading-relaxed max-w-[760px] mb-7"
        style={{ color: INK }}
      >
        {intro}
      </p>

      {/* KPI bar */}
      <div
        className="bg-white rounded-[8px] grid gap-y-5 gap-x-8 px-5 py-4 grid-cols-2 md:grid-cols-4"
        style={{ border: `1px solid ${CREAM2}` }}
      >
        <Stat
          label={t(UI.kpiClubs)}
          value={kpis?.clubsCount != null ? String(kpis.clubsCount) : t(UI.none)}
        />
        <Stat
          label={t(UI.kpiSessionsDone)}
          value={
            kpis?.sessionsTotal != null
              ? `${kpis.sessionsDone || 0} / ${kpis.sessionsTotal}`
              : t(UI.none)
          }
        />
        <Stat
          label={t(UI.kpiFinalists)}
          value={kpis?.finalistsCount != null ? String(kpis.finalistsCount) : t(UI.none)}
        />
        <Stat
          label={t(UI.kpiNext)}
          value={kpis?.nextLabel || t(UI.none)}
        />
      </div>
    </section>
  );
}
