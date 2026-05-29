// Candidater — Chantier 2 : page publique (anon OK) qui liste les compétitions
// RSA ouvertes à candidature. Sert d'entrée découverte / SEO et oriente vers
// `/Login?intent=candidate&edition=…&club=…` qui retombe sur `/MonDossier`.
//
// Pas d'auth-gate : tout le monde voit la liste. Le funnel reste protégé par
// PlatformAuthProvider côté `/MonDossier`.

import React from 'react';
import { PageShell, Footer, GOLD, NAVY, INK, MUTED, SERIF } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import OpenCompetitions from '@/components/rsa/candidature/OpenCompetitions';

const T = {
  eyebrow: { fr: 'Candidatures ouvertes', en: 'Open applications', de: 'Offene Bewerbungen' },
  titleLead: {
    fr: 'Postulez au Rotary Startup Award',
    en: 'Apply to the Rotary Startup Award',
    de: 'Bewerben Sie sich für den Rotary Startup Award',
  },
  subtitle: {
    fr: 'Choisissez la compétition qui vous correspond. Chaque dossier est examiné par le comité du club organisateur.',
    en: 'Pick the competition that matches you. Every application is reviewed by the committee of the organising club.',
    de: 'Wählen Sie den passenden Wettbewerb. Jede Bewerbung wird vom Komitee des organisierenden Clubs geprüft.',
  },
  sectionEyebrow: { fr: 'Compétitions', en: 'Competitions', de: 'Wettbewerbe' },
  footerLeft: {
    fr: `© ${new Date().getFullYear()} Rotary Startup Award`,
    en: `© ${new Date().getFullYear()} Rotary Startup Award`,
    de: `© ${new Date().getFullYear()} Rotary Startup Award`,
  },
};

export default function Candidater() {
  const { t } = useLang();
  return (
    <PageShell nav width="wide" footer={<Footer width="wide" left={t(T.footerLeft)} />}>
      {/* Hero éditorial — eyebrow gold + titre serif + sous-titre court */}
      <header className="mb-12 md:mb-16 max-w-[680px]">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
          <span
            className="uppercase text-[10px] tracking-[0.18em] font-medium"
            style={{ color: GOLD }}
          >
            {t(T.eyebrow)}
          </span>
        </div>
        <h1
          className="text-[34px] md:text-[44px] leading-tight mb-4"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(T.titleLead)}
        </h1>
        <p className="text-[15.5px] leading-relaxed" style={{ color: INK }}>
          {t(T.subtitle)}
        </p>
      </header>

      <section aria-labelledby="open-competitions-title">
        <div className="flex items-center gap-2.5 mb-5">
          <span className="h-[1.5px] w-5" style={{ background: GOLD }} aria-hidden />
          <h2
            id="open-competitions-title"
            className="uppercase text-[11px] tracking-[0.18em] font-medium m-0"
            style={{ color: MUTED }}
          >
            {t(T.sectionEyebrow)}
          </h2>
        </div>
        <OpenCompetitions />
      </section>
    </PageShell>
  );
}
