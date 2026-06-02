// src/components/rsa/admin/platform/shell/CompetitionShell.jsx
// Coquille d'une compétition : back link vers le hub + PhaseBar + body par phase.
// Lot 1 : Préparation embarque le CompetitionEditView existant ; Organisation et
// Pilotage sont des lanceurs vers les routes plein-écran. L'état (phase) vit dans
// l'URL (?phase=), source unique de vérité.
//
// Note (Lot 1) : SafeBackLink n'accepte pas de prop onClick (il utilise useSafeBack
// en interne). On utilise à la place un <button> stylé identiquement (même classes
// que SafeBackLink : MUTED, tracking, GOLD focus ring, ArrowLeft icon).

import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { GOLD, NAVY, MUTED, CREAM2, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { useAllCompetitions } from '@/components/rsa/admin/platform/master/useMaster';
import { parseShellState } from '@/lib/platform/competitionShell';
import CompetitionEditView from '@/components/rsa/admin/platform/master/CompetitionEditView';
import PhaseBar from './PhaseBar';
import PhaseLauncher from './PhaseLauncher';

export default function CompetitionShell({ editionId }) {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const competitionsQ = useAllCompetitions();
  const edition = useMemo(
    () => (competitionsQ.data || []).find((c) => c.id === editionId) || null,
    [competitionsQ.data, editionId],
  );

  const { phase } = parseShellState(params, edition);

  const setPhase = (next) => {
    const p = new URLSearchParams(params);
    p.set('phase', next);
    p.delete('screen');
    setParams(p, { replace: false });
  };

  const goHub = () => {
    const p = new URLSearchParams(params);
    p.delete('competition');
    p.delete('phase');
    p.delete('screen');
    p.delete('club');
    setParams(p, { replace: false });
  };

  const orgaItems = [
    { key: 'candidatures', to: `/Selection?edition=${encodeURIComponent(editionId)}`,
      title: t({ fr: 'Candidatures & sélection', en: 'Applications & selection', de: 'Bewerbungen & Auswahl' }),
      hint: t({ fr: 'Dossiers reçus, éligibilité, allocation de session', en: 'Dossiers, eligibility, session allocation', de: 'Dossiers, Eignung, Session-Zuteilung' }) },
    { key: 'jury', to: `/Jury?edition=${encodeURIComponent(editionId)}`,
      title: t({ fr: 'Jury & notation', en: 'Jury & scoring', de: 'Jury & Bewertung' }),
      hint: t({ fr: 'Jurés assignés, pré-lecture, grilles', en: 'Assigned jurors, pre-read, grids', de: 'Juroren, Vorabprüfung, Raster' }) },
  ];

  const pilotageItems = [
    { key: 'resultats', to: `/Resultats?edition=${encodeURIComponent(editionId)}`,
      title: t({ fr: 'Résultats & palmarès', en: 'Results & winners', de: 'Ergebnisse & Sieger' }),
      hint: t({ fr: 'Publication, palmarès public', en: 'Publishing, public results', de: 'Veröffentlichung, Palmarès' }) },
  ];

  return (
    <section>
      <div className="mb-4">
        <button
          type="button"
          onClick={goHub}
          className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.16em] font-medium hover:text-[#0f1f3d] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] rounded-[2px] px-1 py-0.5"
          style={{ color: MUTED }}
          aria-label={t({ fr: '‹ Compétitions', en: '‹ Competitions', de: '‹ Wettbewerbe' })}
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden style={{ color: GOLD }} />
          <span>{t({ fr: '‹ Compétitions', en: '‹ Competitions', de: '‹ Wettbewerbe' })}</span>
        </button>
      </div>

      <header className="mb-4">
        <p className="uppercase tracking-[0.18em] text-[10.5px] font-medium" style={{ color: GOLD }}>
          {t({ fr: 'Compétition', en: 'Competition', de: 'Wettbewerb' })}
        </p>
        <h2 className="text-[24px] md:text-[28px] leading-tight" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {edition?.name || editionId}
        </h2>
      </header>

      <div className="rounded-[4px] px-3 md:px-4 pt-2 mb-5" style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}>
        <PhaseBar activePhase={phase} onChange={setPhase} />
      </div>

      {phase === 'prep' && <CompetitionEditView editionId={editionId} onClose={goHub} />}
      {phase === 'orga' && <PhaseLauncher items={orgaItems} />}
      {phase === 'pilotage' && <PhaseLauncher items={pilotageItems} />}
    </section>
  );
}
