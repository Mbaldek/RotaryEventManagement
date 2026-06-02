// src/components/rsa/admin/platform/hub/CompetitionHub.jsx
// Hub d'accueil admin : grille de cartes compétition (filtrée par rôle). Clic →
// ?competition=<id> (la coquille prend le relais). Avancement par phase déféré
// au Lot 3 — Lot 1 affiche nom + année + statut.

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, ArrowRight } from 'lucide-react';
import { CREAM2, NAVY, INK, MUTED, GOLD, SERIF } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { useHubCompetitions } from './useHubCompetitions';

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
      <div className="py-12 flex items-center justify-center gap-2 text-[14px]" style={{ color: MUTED }}>
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: GOLD }} aria-hidden />
        {t({ fr: 'Chargement des compétitions…', en: 'Loading competitions…', de: 'Wettbewerbe werden geladen…' })}
      </div>
    );
  }

  if (!competitions.length) {
    return (
      <div className="py-10 px-6 text-center rounded-[4px]" style={{ background: 'white', border: `1px dashed ${CREAM2}` }} role="status">
        <p className="text-[14px]" style={{ color: INK }}>
          {t({ fr: 'Aucune compétition.', en: 'No competition.', de: 'Kein Wettbewerb.' })}
        </p>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-5">
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
          <span className="uppercase text-[10px] tracking-[0.18em] font-medium" style={{ color: GOLD }}>
            {t({ fr: 'Compétitions', en: 'Competitions', de: 'Wettbewerbe' })}
          </span>
        </div>
      </header>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-5 list-none m-0 p-0">
        {competitions.map((c) => (
          <li key={c.id} className="flex">
            <button
              type="button"
              onClick={() => open(c.id)}
              className={`group flex-1 text-left rounded-[4px] p-5 bg-white flex items-start justify-between gap-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm ${FOCUS_RING_CLASS}`}
              style={{ border: `1px solid ${CREAM2}` }}
            >
              <span className="min-w-0">
                <span className="uppercase text-[10px] tracking-[0.18em] font-medium" style={{ color: GOLD }}>
                  {c.year || c.status}
                </span>
                <span className="block text-[20px] leading-tight mt-1" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
                  {c.name}
                </span>
              </span>
              <ArrowRight className="w-4 h-4 mt-1 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: NAVY }} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
