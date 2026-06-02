// src/components/rsa/admin/platform/shell/CompetitionShell.jsx
// Coquille d'une compétition : back link vers le hub + PhaseBar + body par phase.
// Lot 1 : Préparation embarque le CompetitionEditView existant ; Organisation et
// Pilotage sont des listes éditoriales (L-Numbered-Hairline, PAS de cards) vers
// les routes plein-écran. L'état (phase) vit dans l'URL (?phase=).
//
// Vague 0 repimp : en-tête de phase (filet or + Playfair) + compteurs live réels
// (useOperationalCounts) injectés en meta des lignes Organisation.
//
// Note : SafeBackLink n'accepte pas de prop onClick (useSafeBack interne) → on
// utilise un <button> stylé identiquement (MUTED, tracking, GOLD focus ring).

import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { GOLD, NAVY, MUTED, CREAM2, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { useAllCompetitions } from '@/components/rsa/admin/platform/master/useMaster';
import { useOperationalCounts } from '@/components/rsa/admin/platform/master/competition-tabs/OperationalSpacesStrip';
import { parseShellState } from '@/lib/platform/competitionShell';
import CompetitionEditView from '@/components/rsa/admin/platform/master/CompetitionEditView';
import PhaseBar from './PhaseBar';
import PhaseLauncher from './PhaseLauncher';

// En-tête éditorial d'une phase (filet or 64px + eyebrow + titre Playfair).
function PhaseSection({ eyebrow, title }) {
  return (
    <header className="mb-5">
      <div className="flex items-center gap-3 mb-2">
        <span className="h-[1.5px]" style={{ background: GOLD, width: 64 }} aria-hidden />
        <span className="uppercase text-[10px] tracking-[0.18em] font-medium" style={{ color: GOLD }}>
          {eyebrow}
        </span>
      </div>
      <h3 className="text-[20px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
        {title}
      </h3>
    </header>
  );
}

export default function CompetitionShell({ editionId }) {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const competitionsQ = useAllCompetitions();
  const edition = useMemo(
    () => (competitionsQ.data || []).find((c) => c.id === editionId) || null,
    [competitionsQ.data, editionId],
  );

  const { phase } = parseShellState(params, edition);

  // Compteurs live (dossiers / à voir / jurés) — réutilise le hook de la strip ops.
  const counts = useOperationalCounts(editionId).data;
  const candMeta = counts
    ? `${counts.total} ${t({ fr: 'doss.', en: 'doss.', de: 'Doss.' })}` +
      (counts.toReview > 0 ? ` · ${counts.toReview} ${t({ fr: 'à voir', en: 'to review', de: 'zu prüfen' })}` : '')
    : undefined;
  const juryMeta = counts && counts.jurors > 0
    ? `${counts.jurors} ${t({ fr: 'jurés', en: 'jurors', de: 'Juroren' })}`
    : undefined;

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
    {
      key: 'candidatures',
      to: `/Selection?edition=${encodeURIComponent(editionId)}`,
      title: t({ fr: 'Candidatures & sélection', en: 'Applications & selection', de: 'Bewerbungen & Auswahl' }),
      hint: t({ fr: 'Dossiers reçus, éligibilité, allocation de session', en: 'Dossiers, eligibility, session allocation', de: 'Dossiers, Eignung, Session-Zuteilung' }),
      meta: candMeta,
    },
    {
      key: 'jury',
      to: `/Jury?edition=${encodeURIComponent(editionId)}`,
      title: t({ fr: 'Jury & notation', en: 'Jury & scoring', de: 'Jury & Bewertung' }),
      hint: t({ fr: 'Jurés assignés, pré-lecture, grilles', en: 'Assigned jurors, pre-read, grids', de: 'Juroren, Vorabprüfung, Raster' }),
      meta: juryMeta,
    },
  ];

  const pilotageItems = [
    {
      key: 'resultats',
      to: `/Resultats?edition=${encodeURIComponent(editionId)}`,
      title: t({ fr: 'Résultats & palmarès', en: 'Results & winners', de: 'Ergebnisse & Sieger' }),
      hint: t({ fr: 'Publication, palmarès public', en: 'Publishing, public results', de: 'Veröffentlichung, Palmarès' }),
    },
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

      <div className="rounded-[4px] px-3 md:px-4 pt-2 mb-6" style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}>
        <PhaseBar activePhase={phase} onChange={setPhase} />
      </div>

      {phase === 'prep' && <CompetitionEditView editionId={editionId} onClose={goHub} embedded />}

      {phase === 'orga' && (
        <>
          <PhaseSection
            eyebrow={t({ fr: 'Organisation', en: 'Organisation', de: 'Organisation' })}
            title={t({ fr: 'Remplir la compétition', en: 'Fill the competition', de: 'Den Wettbewerb füllen' })}
          />
          <PhaseLauncher items={orgaItems} />
        </>
      )}

      {phase === 'pilotage' && (
        <>
          <PhaseSection
            eyebrow={t({ fr: 'Pilotage', en: 'Pilotage', de: 'Steuerung' })}
            title={t({ fr: 'Animer & publier', en: 'Run & publish', de: 'Durchführen & veröffentlichen' })}
          />
          <PhaseLauncher items={pilotageItems} />
        </>
      )}
    </section>
  );
}
