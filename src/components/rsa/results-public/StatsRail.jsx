// StatsRail — 4 KPI compacts sous le Hero de /Resultats (V3 visual sweep).
//
// Reproduit le pattern KPI rail introduit sur /Concours (ConcoursHero) en
// version horizontale plus discrète. Affiche : sessions tenues, startups en
// compétition (proxy = somme des entrées de classement), jurés mobilisés
// (max des n par session — proxy raisonnable, la vue public ne donne pas
// d'identifiants jurés), grand lauréat (1 si défini, sinon 0).

import React from 'react';
import { Trophy } from 'lucide-react';
import { NAVY, GOLD, MUTED, CREAM2, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { T as RES_T } from './i18n';

function Stat({ label, value, accent = false }) {
  return (
    <div className="min-w-0 flex-1">
      <div
        className="uppercase text-[9.5px] tracking-[0.18em] font-semibold mb-1"
        style={{ color: MUTED }}
      >
        {label}
      </div>
      <div
        className="text-[22px] md:text-[26px] font-medium leading-none tabular-nums flex items-baseline gap-1.5"
        style={{ color: accent ? GOLD : NAVY, fontFamily: SERIF }}
      >
        {value}
        {accent && <Trophy className="w-4 h-4" style={{ color: GOLD }} aria-hidden />}
      </div>
    </div>
  );
}

// Compute KPIs from the palmares shape (qualifyingSessions + finaleSession + laureat).
function computeKpis(palmares) {
  if (!palmares) return null;
  const qual = palmares.qualifyingSessions || [];
  const finale = palmares.finaleSession || null;
  const sessionsCount = qual.length + (finale ? 1 : 0);

  // Startups : somme des classements distincts par session qualif (proxy public).
  let startupsCount = 0;
  let maxN = 0;
  for (const s of qual) {
    const ranking = Array.isArray(s.final_ranking) ? s.final_ranking : [];
    startupsCount += ranking.length;
    for (const r of ranking) {
      if (typeof r.n === 'number' && r.n > maxN) maxN = r.n;
    }
  }
  if (finale) {
    const fRanking = Array.isArray(finale.final_ranking) ? finale.final_ranking : [];
    for (const r of fRanking) {
      const norm = typeof r.n === 'number' ? r.n : (typeof r.juror_count === 'number' ? r.juror_count : 0);
      if (norm > maxN) maxN = norm;
    }
  }

  const laureatCount = palmares.laureat ? 1 : 0;

  return {
    sessionsCount,
    startupsCount,
    jurorsCount: maxN,
    laureatCount,
  };
}

export default function StatsRail({ palmares }) {
  const { t } = useLang();
  const kpis = computeKpis(palmares);
  if (!kpis) return null;
  const tT = t(RES_T);

  return (
    <section className="mb-12 md:mb-14">
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 px-5 md:px-7 py-5 md:py-6 rounded-[8px]"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <Stat label={tT.statsRailSessions} value={kpis.sessionsCount} />
        <Stat label={tT.statsRailStartups} value={kpis.startupsCount} />
        <Stat label={tT.statsRailJurors} value={kpis.jurorsCount || '—'} />
        <Stat
          label={tT.statsRailLaureat}
          value={kpis.laureatCount > 0 ? '1' : '—'}
          accent={kpis.laureatCount > 0}
        />
      </div>
    </section>
  );
}
