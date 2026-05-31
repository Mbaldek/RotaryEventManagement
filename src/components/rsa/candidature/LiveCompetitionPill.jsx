// LiveCompetitionPill — bandeau « live » data-driven affiché au-dessus du
// formulaire de Login. Annonce la/les compétition(s) ouverte(s) à candidature et
// oriente vers /Candidater, SANS jamais énumérer les éditions lui-même :
//
//   • 1 ouverte  → pill riche : nom + date de clôture, deep-linkée
//                  /Candidater?edition=<id>
//   • >1 ouverte → pill générique « N compétitions ouvertes » → /Candidater
//                  (la grille OpenCompetitions y fait la désambiguïsation, 1 carte
//                  par édition avec sa propre deadline). Forward-compat V2 multi-club.
//   • 0 / chargement / erreur → null. Zéro régression : si la requête anon échoue
//     (RLS, réseau) ou si rien n'est ouvert, le Login reste strictement identique.
//
// Couleurs : tint sage + GREEN_TODAY = sémantique « live/open » officielle des
// tokens (cf. tokens.js). Le point pulse pour signaler le live ; il s'immobilise
// sous prefers-reduced-motion via le reset global.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { NAVY, INK, MUTED, GREEN_TODAY, TINT_SAGE } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { Edition } from '@/lib/rsa/entities';
import { formatDate } from '@/components/rsa/candidature/validation';

const T = {
  openUntil: { fr: 'candidatures ouvertes jusqu’au', en: 'applications open until', de: 'Bewerbungen offen bis zum' },
  open: { fr: 'candidatures ouvertes', en: 'applications open', de: 'Bewerbungen offen' },
  apply: { fr: 'Candidater', en: 'Apply', de: 'Bewerben' },
  multi: {
    fr: (n) => `${n} compétitions ouvertes`,
    en: (n) => `${n} competitions open`,
    de: (n) => `${n} Wettbewerbe offen`,
  },
  seeAll: { fr: 'Voir les concours', en: 'See competitions', de: 'Wettbewerbe ansehen' },
};

// Point or/vert « live » — double span : halo qui pulse (animate-ping) + point plein.
function LiveDot() {
  return (
    <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
      <span
        className="absolute inline-flex h-full w-full rounded-full opacity-50 animate-ping"
        style={{ background: GREEN_TODAY }}
      />
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: GREEN_TODAY }} />
    </span>
  );
}

export default function LiveCompetitionPill({ className = '' }) {
  const { t, lang } = useLang();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['rsa', 'open-competitions', 'pill'],
    queryFn: () => Edition.openForApply(),
    staleTime: 60 * 1000,
    retry: false,
  });

  // Chargement, erreur (RLS anon / réseau) et empty produisent tous le même rendu
  // invisible → le Login est inchangé dans tous les cas dégradés.
  if (isLoading || isError || !data || data.length === 0) return null;

  const count = data.length;
  const single = count === 1 ? data[0].edition : null;
  const to = single ? `/Candidater?edition=${encodeURIComponent(single.id)}` : '/Candidater';
  const cta = single ? t(T.apply) : t(T.seeAll);

  return (
    <Link
      to={to}
      className={`group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 rounded-[4px] px-4 py-3 transition-colors ${FOCUS_RING_CLASS} ${className}`}
      style={{ background: TINT_SAGE, border: '1px solid #cfe0bd' }}
    >
      <span className="flex items-center gap-2.5 text-[13px] leading-snug">
        <LiveDot />
        {single ? (
          <span>
            <strong style={{ color: NAVY, fontWeight: 600 }}>{single.name}</strong>
            <span style={{ color: MUTED }}> — </span>
            <span style={{ color: INK }}>
              {single.application_close
                ? `${t(T.openUntil)} ${formatDate(single.application_close, lang)}`
                : t(T.open)}
            </span>
          </span>
        ) : (
          <span style={{ color: INK }}>{t(T.multi)(count)}</span>
        )}
      </span>
      <span
        className="inline-flex items-center gap-1.5 text-[13px] font-medium shrink-0 transition-transform group-hover:translate-x-0.5"
        style={{ color: NAVY }}
      >
        {cta}
        <ArrowRight className="w-3.5 h-3.5" aria-hidden />
      </span>
    </Link>
  );
}
