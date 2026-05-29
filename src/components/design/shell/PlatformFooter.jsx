// PlatformFooter — footer standard de la plateforme RSA (app.rotary-startup.org).
//
// Wrapper léger autour de <Footer> avec le contenu canonique trilingue :
//   - left  : © YYYY @DBEK for Rotary Startup Award & Platform for Rotary Club of Paris
//   - right : Contact (mailto) · rotary-startup.org (lien externe)
//
// Trilingue via useLang (FR/EN/DE), sans hard-code de copy. Width par défaut
// hérité du <Footer> de base (narrow). Override possible via prop `width`.
//
// Pourquoi ne pas mettre la copy directement dans <Footer> ?
//   <Footer> reste copy-agnostic (catalog §10 : composants jamais hard-codés).
//   Ce wrapper applique la copy "policy" plateforme uniquement.

import React from 'react';
import Footer from '@/components/design/shell/Footer';
import { NAVY, GOLD } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';

const COPY = {
  credit: {
    fr: '@DBEK pour Rotary Startup Award & Plateforme du Rotary Club de Paris',
    en: '@DBEK for Rotary Startup Award & Platform for Rotary Club of Paris',
    de: '@DBEK für Rotary Startup Award & Plattform des Rotary Club de Paris',
  },
  contact: {
    fr: 'Contact',
    en: 'Contact',
    de: 'Kontakt',
  },
  landingLabel: {
    fr: 'rotary-startup.org',
    en: 'rotary-startup.org',
    de: 'rotary-startup.org',
  },
};

const CONTACT_EMAIL = 'contact@rotary-startup.org';
const LANDING_URL = 'https://rotary-startup.org';

export default function PlatformFooter({ width = 'narrow', className = '' }) {
  const { t } = useLang();
  const year = new Date().getFullYear();

  return (
    <Footer
      width={width}
      className={className}
      left={
        <span>
          © {year} {t(COPY.credit)}
        </span>
      }
      right={
        <>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className={`hover:underline rounded-[2px] ${FOCUS_RING_CLASS}`}
            style={{ color: NAVY, textDecorationColor: GOLD }}
          >
            {t(COPY.contact)}
          </a>
          <a
            href={LANDING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`hover:underline rounded-[2px] ${FOCUS_RING_CLASS}`}
            style={{ color: NAVY, textDecorationColor: GOLD }}
          >
            {t(COPY.landingLabel)} ↗
          </a>
        </>
      }
    />
  );
}
