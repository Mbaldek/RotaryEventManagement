// OpenCompetitions — liste publique des compétitions ouvertes à candidature.
// 1 carte par édition (plus de différenciation par club côté candidat : la
// startup candidate au concours en général, l'admin route ensuite). Sert
// d'entrée découverte depuis `/Candidater` et navigue vers `/Candidater?edition=…`
// qui prépare Step1Picker / claim post-magic-link.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, Calendar } from 'lucide-react';
import { NAVY, GOLD, INK, MUTED, CREAM2, SERIF } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { Edition } from '@/lib/rsa/entities';
import { formatDate } from '@/components/rsa/candidature/validation';
import { summarizeRules, ELIGIBILITY_COPY } from '@/components/rsa/candidature/eligibilitySummary';

// Petit dictionnaire local — pas de pollution de l'i18n principal du funnel.
// Les libellés de critères / clôture sont mutualisés dans ELIGIBILITY_COPY.
const T = {
  loading: { fr: 'Chargement des compétitions…', en: 'Loading competitions…', de: 'Wettbewerbe werden geladen…' },
  empty: {
    fr: 'Aucune candidature ouverte pour le moment.',
    en: 'No application open at the moment.',
    de: 'Derzeit ist keine Bewerbung geöffnet.',
  },
  errorTitle: {
    fr: 'Impossible de charger les compétitions',
    en: 'Could not load the competitions',
    de: 'Wettbewerbe konnten nicht geladen werden',
  },
  errorBody: {
    fr: 'Un problème de connexion est survenu. Veuillez réessayer.',
    en: 'A connection problem occurred. Please try again.',
    de: 'Es ist ein Verbindungsproblem aufgetreten. Bitte erneut versuchen.',
  },
  retry: { fr: 'Réessayer', en: 'Retry', de: 'Erneut versuchen' },
  cta: { fr: 'Candidater', en: 'Apply', de: 'Bewerben' },
};

function CompetitionRow({ entry }) {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const { edition, rules } = entry;
  const criteria = summarizeRules(rules, t, lang);
  const closeDate = edition.application_close ? formatDate(edition.application_close, lang) : null;

  const handleApply = () => {
    navigate(`/Candidater?edition=${encodeURIComponent(edition.id)}`);
  };

  return (
    <li style={{ borderBottom: `1px solid ${CREAM2}` }}>
      <button
        type="button"
        onClick={handleApply}
        className={`group w-full text-left grid grid-cols-[auto_1fr_auto] items-center gap-5 py-5 outline-none transition-colors hover:bg-[#faf7f0] ${FOCUS_RING_CLASS}`}
      >
        {/* Eyebrow année / left column */}
        <span
          className="uppercase text-[12px] tracking-[0.16em] tabular-nums self-start pt-0.5 w-10 shrink-0"
          style={{ color: GOLD, fontFamily: SERIF }}
        >
          {edition.year || '—'}
        </span>

        {/* Centre : nom + sous-ligne critères + date */}
        <span className="min-w-0">
          <span
            className="block text-[22px] leading-tight"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {edition.name}
          </span>

          {criteria.length > 0 && (
            <span className="block text-[12px] mt-1 truncate" style={{ color: MUTED }}>
              {criteria.join(' · ')}
            </span>
          )}

          <span className="mt-1.5 inline-flex items-center gap-1" style={{ color: MUTED }}>
            <Calendar className="w-3 h-3 shrink-0" aria-hidden />
            <span className="text-[11.5px]">
              {closeDate ? (
                <>
                  {t(ELIGIBILITY_COPY.deadline)}&nbsp;<strong style={{ color: INK, fontWeight: 500 }}>{closeDate}</strong>
                </>
              ) : (
                t(ELIGIBILITY_COPY.noDeadline)
              )}
            </span>
          </span>
        </span>

        {/* CTA label + arrow */}
        <span className="shrink-0 inline-flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color: NAVY }}>
          <span className="hidden sm:inline">{t(T.cta)}</span>
          <ArrowRight
            className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </button>
    </li>
  );
}

export default function OpenCompetitions() {
  const { t } = useLang();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rsa', 'open-competitions'],
    queryFn: () => Edition.openForApply(),
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="py-12 flex items-center justify-center gap-2 text-[14px]" style={{ color: MUTED }}>
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: GOLD }} aria-hidden />
        {t(T.loading)}
      </div>
    );
  }

  // Panne backend : état distinct du vrai empty — on signale clairement le
  // problème de connexion et on offre un bouton « Réessayer », sans laisser
  // croire qu'aucune compétition n'est ouverte.
  if (isError) {
    return (
      <div className="py-10" role="alert">
        <p className="text-[15px] mb-1.5" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(T.errorTitle)}
        </p>
        <p className="text-[13.5px] mb-4" style={{ color: INK }}>
          {t(T.errorBody)}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className={`text-[13.5px] font-medium px-4 py-2 rounded-[4px] text-white ${FOCUS_RING_CLASS}`}
          style={{ background: NAVY }}
        >
          {t(T.retry)}
        </button>
      </div>
    );
  }

  // Vrai empty state — succès backend mais aucune compétition ouverte.
  if (!data || data.length === 0) {
    return (
      <p className="py-10 text-[14px] italic" style={{ fontFamily: SERIF, color: MUTED }} role="status">
        {t(T.empty)}
      </p>
    );
  }

  return (
    <ul className="list-none m-0 p-0" style={{ borderTop: `1px solid ${CREAM2}` }}>
      {data.map((entry) => (
        <CompetitionRow key={entry.edition.id} entry={entry} />
      ))}
    </ul>
  );
}
