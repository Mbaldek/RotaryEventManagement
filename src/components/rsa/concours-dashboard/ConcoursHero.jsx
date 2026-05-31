// ConcoursHero — en-tête éditorial + ligne de stats (refonte « La Saison »).
// Plus de logo, plus de halo, plus de selector, plus de KPI cards.
import React from 'react';
import { Eyebrow, EditorialTitle } from '@/components/design';
import { NAVY, GOLD, INK, MUTED } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { UI } from './i18n';

function Stat({ value, label, accent }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="tabular-nums text-[14px] font-semibold" style={{ color: accent ? GOLD : NAVY }}>
        {value}
      </span>
      <span className="uppercase text-[10px] tracking-[0.14em]" style={{ color: MUTED }}>{label}</span>
    </span>
  );
}

export default function ConcoursHero({ edition, kpis }) {
  const { t } = useLang();
  const clubs = kpis?.clubsCount ?? 0;
  const sessions = kpis?.sessionsTotal ?? 0;

  return (
    <section className="mb-10 md:mb-12">
      <Eyebrow>
        {t(UI.heroEyebrow)}{edition?.year ? ` · ${t({ fr: 'Édition', en: 'Edition', de: 'Ausgabe' })} ${edition.year}` : ''}
      </Eyebrow>
      <EditorialTitle lead={t(UI.heroTitleLead)} italic={t(UI.heroTitleItalic)} size="lg" />
      <span aria-hidden className="block h-[1.5px] w-7 mt-5" style={{ background: GOLD }} />
      <p className="mt-5 text-[15px] md:text-[16px] max-w-[60ch]" style={{ color: INK, lineHeight: 1.65 }}>
        {t(UI.heroIntro)(clubs, sessions)}
      </p>

      <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <Stat value={clubs} label={t(UI.statClubs)} />
        <span aria-hidden style={{ color: MUTED }}>·</span>
        <Stat value={`${kpis?.sessionsDone || 0}/${sessions}`} label={t(UI.statSessions)} />
        <span aria-hidden style={{ color: MUTED }}>·</span>
        <Stat value={kpis?.finalistsCount ?? 0} label={t(UI.statFinalists)} accent={kpis?.finalistsCount > 0} />
        {kpis?.nextLabel && (
          <>
            <span aria-hidden style={{ color: MUTED }}>·</span>
            <span className="text-[12px]" style={{ color: NAVY }}>
              <span className="uppercase text-[10px] tracking-[0.14em]" style={{ color: MUTED }}>{t(UI.statNext)} </span>
              {kpis.nextLabel}
            </span>
          </>
        )}
      </div>
    </section>
  );
}
