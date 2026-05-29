// DevenirJury — page publique (no auth) du chantier 3.
//
// Hero variant : H-Vertical-Rule (catalog §16.1) — barre gold 2px à gauche +
// eyebrow + serif title + meta MUTED. Casse l'adjacence avec Candidater
// (H-Step-Pictogram). Cf. design-upgrade-blueprint §3.1 + §4.9.
//
// Signature micro : M-Editorial-Veil (mount-only stagger).
//
// Route auto-enregistrée par pages.config.js (lookup par nom de fichier).
// La whitelist ALLOWED_NEXT de postLoginRoute.js autorise déjà `/DevenirJury`.

import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  PageShell,
  PlatformFooter,
  GOLD,
  NAVY,
  INK,
  MUTED,
  SERIF,
  EASE,
} from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import JuryApplicationForm from '@/components/rsa/jury-application/JuryApplicationForm';
import { UI } from '@/components/rsa/jury-application/i18n';

export default function DevenirJury() {
  const { t } = useLang();
  const reduce = useReducedMotion();

  return (
    <PageShell nav width="narrow" footer={<PlatformFooter width="narrow" />}>
      {/* Hero H-Vertical-Rule — barre gold gauche + texte stacké. */}
      <motion.header
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
        className="mb-10 md:mb-14 pl-6 md:pl-8 relative"
      >
        {/* Barre verticale GOLD 2px — signature visuelle du variant. */}
        <motion.span
          aria-hidden
          initial={reduce ? { opacity: 0 } : { scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.3 }}
          className="absolute left-0 top-1 bottom-1 w-[2px]"
          style={{ background: GOLD, transformOrigin: 'top' }}
        />

        <span
          className="uppercase text-[10.5px] tracking-[0.18em] font-medium block"
          style={{ color: GOLD }}
        >
          {t(UI.pageEyebrow)}
        </span>

        <h1
          className="mt-3 text-[36px] md:text-[44px]"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 400, lineHeight: 1.05 }}
        >
          {t(UI.pageTitle)}{' '}
          <span className="italic" style={{ color: INK }}>{t(UI.pageItalic)}</span>
        </h1>

        <p
          className="mt-5 text-[14.5px] leading-relaxed max-w-[58ch]"
          style={{ color: INK, lineHeight: 1.65 }}
        >
          {t(UI.pagePitchLine1)}
          <br />
          {t(UI.pagePitchLine2)}
        </p>

        {/* Lien latéral retour vers la voie startup (CTA C-Pair-Primary-Ghost) */}
        <p className="mt-6 text-[12px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>
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
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.45 }}
      >
        <JuryApplicationForm />
      </motion.section>
    </PageShell>
  );
}
