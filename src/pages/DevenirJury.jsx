// DevenirJury — page publique (no auth) du chantier 3.
//
// Coquille narrative : eyebrow + titre éditorial + 2 lignes de pitch, puis le
// formulaire de candidature spontanée. Le wiring DB / validation / states est
// porté par <JuryApplicationForm />.
//
// Route auto-enregistrée par pages.config.js (lookup par nom de fichier).
// La whitelist ALLOWED_NEXT de postLoginRoute.js autorise déjà `/DevenirJury`.

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PageShell,
  Eyebrow,
  EditorialTitle,
  GOLD,
  NAVY,
  INK,
  MUTED,
  EASE,
} from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import JuryApplicationForm from '@/components/rsa/jury-application/JuryApplicationForm';
import { UI } from '@/components/rsa/jury-application/i18n';

export default function DevenirJury() {
  const { t } = useLang();

  return (
    <PageShell nav width="narrow">
      {/* Hero */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="mb-10 md:mb-12"
      >
        <Eyebrow>{t(UI.pageEyebrow)}</Eyebrow>
        <EditorialTitle lead={t(UI.pageTitle)} italic={t(UI.pageItalic)} size="md" />
        <p
          className="mt-5 text-[14.5px] leading-relaxed max-w-[560px]"
          style={{ color: INK }}
        >
          {t(UI.pagePitchLine1)}
          <br />
          {t(UI.pagePitchLine2)}
        </p>

        {/* Lien latéral retour vers la voie startup (sans imposer la navigation) */}
        <p className="mt-6 text-[12px]" style={{ color: MUTED }}>
          <Link
            to="/Candidater"
            className="underline-offset-4 hover:underline"
            style={{ color: NAVY, textDecorationColor: GOLD }}
          >
            {t(UI.backToCandidater)}
          </Link>
        </p>
      </motion.header>

      {/* Formulaire */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
      >
        <JuryApplicationForm />
      </motion.section>
    </PageShell>
  );
}
