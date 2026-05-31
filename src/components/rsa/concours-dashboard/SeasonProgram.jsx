// SeasonProgram — liste chronologique de la saison, chapitrée par mois (repli si <=1 mois).
import React from 'react';
import { Eyebrow } from '@/components/design';
import { NAVY, GOLD, MUTED, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import SessionRow from './SessionRow';
import { UI } from './i18n';

function MonthJalon({ label, count, t }) {
  return (
    <header className="flex items-baseline gap-3 mt-12 mb-5 first:mt-0 pl-[18px] relative">
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: GOLD }} />
      <h2 className="text-[20px] md:text-[22px] uppercase tracking-[0.04em]"
        style={{ fontFamily: SERIF, color: NAVY, fontWeight: 400 }}>
        {label}
      </h2>
      <span className="text-[12px]" style={{ color: MUTED }}>{t(UI.monthSessions)(count)}</span>
    </header>
  );
}

export default function SeasonProgram({ season, overview, onOpenSession }) {
  const { t, lang } = useLang();
  const { flat, months, single, nextId } = season;

  const counts = (s) => ({
    jurorsCount: overview?.jurors_by_session?.[s.id] || 0,
    startupsCount: overview?.startups_by_session?.[s.id] || 0,
  });

  const rowProps = (s, index) => ({
    key: s.id, session: s, index, isNext: s.id === nextId,
    ...counts(s), t, lang, onOpen: onOpenSession,
  });

  if (single) {
    return (
      <section className="mb-14">
        <div className="mb-6"><Eyebrow>{t(UI.programOpener)}</Eyebrow></div>
        <div>{flat.map((s, i) => <SessionRow {...rowProps(s, i + 1)} />)}</div>
      </section>
    );
  }

  let n = 0;
  return (
    <section className="mb-14">
      {months.map((m) => (
        <div key={m.key}>
          <MonthJalon label={m.label} count={m.sessions.length} t={t} />
          {m.sessions.map((s) => { n += 1; return <SessionRow {...rowProps(s, n)} />; })}
        </div>
      ))}
    </section>
  );
}
