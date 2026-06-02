// src/components/rsa/admin/platform/hub/CompetitionHub.jsx
// Hub d'accueil admin : INDEX ÉDITORIAL des compétitions (PAS de cards). Header
// filet or 64px + Playfair, puis une ligne par compétition séparée par des filets
// CREAM2 : année (eyebrow gold serif) + nom Playfair + statut muted + flèche.
// Clic → ?competition=<id> (la coquille prend le relais). Filtré par rôle via
// useHubCompetitions. Avancement par phase déféré au Lot 3.

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, ArrowRight } from 'lucide-react';
import { CREAM2, NAVY, MUTED, GOLD, SERIF } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { useHubCompetitions } from './useHubCompetitions';

const STATUS_LABEL = {
  open:   { fr: 'Candidatures ouvertes', en: 'Applications open', de: 'Bewerbungen offen' },
  closed: { fr: 'Clôturée',              en: 'Closed',            de: 'Abgeschlossen' },
  draft:  { fr: 'Brouillon',             en: 'Draft',             de: 'Entwurf' },
};

function Header({ t }) {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <span className="h-[1.5px]" style={{ background: GOLD, width: 64 }} aria-hidden />
        <span className="uppercase text-[10px] tracking-[0.18em] font-medium" style={{ color: GOLD }}>
          {t({ fr: 'Compétitions', en: 'Competitions', de: 'Wettbewerbe' })}
        </span>
      </div>
      <h1
        className="text-[28px] md:text-[32px] leading-tight"
        style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
      >
        {t({ fr: 'Les éditions', en: 'The editions', de: 'Die Ausgaben' })}
      </h1>
    </header>
  );
}

export default function CompetitionHub() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const { competitions, isLoading } = useHubCompetitions();

  const open = (id) => {
    const p = new URLSearchParams(params);
    p.set('competition', id);
    setParams(p, { replace: false });
  };

  if (isLoading) {
    return (
      <div>
        <Header t={t} />
        <div className="py-12 flex items-center gap-2 text-[14px]" style={{ color: MUTED }}>
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: GOLD }} aria-hidden />
          {t({ fr: 'Chargement des compétitions…', en: 'Loading competitions…', de: 'Wettbewerbe werden geladen…' })}
        </div>
      </div>
    );
  }

  if (!competitions.length) {
    return (
      <div>
        <Header t={t} />
        <p className="py-10 text-[15px] italic" style={{ fontFamily: SERIF, color: MUTED }} role="status">
          {t({ fr: 'Aucune compétition pour le moment.', en: 'No competition yet.', de: 'Noch kein Wettbewerb.' })}
        </p>
      </div>
    );
  }

  return (
    <div>
      <Header t={t} />
      <ul className="list-none m-0 p-0" style={{ borderTop: `1px solid ${CREAM2}` }}>
        {competitions.map((c) => {
          const statusDict = STATUS_LABEL[c.status];
          return (
            <li key={c.id} style={{ borderBottom: `1px solid ${CREAM2}` }}>
              <button
                type="button"
                onClick={() => open(c.id)}
                className={`group w-full text-left grid grid-cols-[auto_1fr_auto] items-center gap-5 py-5 outline-none transition-colors hover:bg-[#faf7f0] ${FOCUS_RING_CLASS}`}
              >
                <span
                  className="uppercase text-[12px] tracking-[0.16em] tabular-nums self-center"
                  style={{ color: GOLD, fontFamily: SERIF }}
                >
                  {c.year || '—'}
                </span>
                <span className="min-w-0">
                  <span
                    className="block text-[22px] leading-tight"
                    style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
                  >
                    {c.name}
                  </span>
                  {statusDict ? (
                    <span className="block text-[12.5px] mt-1" style={{ color: MUTED }}>
                      {t(statusDict)}
                    </span>
                  ) : null}
                </span>
                <ArrowRight
                  className="w-4 h-4 mr-1 shrink-0 transition-transform group-hover:translate-x-0.5"
                  style={{ color: NAVY }}
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
