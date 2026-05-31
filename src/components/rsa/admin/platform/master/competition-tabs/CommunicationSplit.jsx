// CommunicationSplit — onglet « Communication » du CompetitionEditView, scindé
// en deux sous-onglets clairs (toggle souligné-or Élysée) :
//   • Emailing            → CommunicationTabRefonte (modèles par étape du funnel)
//   • URL & palmarès public → CommunicationTab legacy (activation + lien public)
//
// Avant cette refonte, les deux blocs étaient simplement empilés dans
// CompetitionEditView (refonte AU-DESSUS, legacy en-dessous d'une bordure), sans
// libellé distinguant « préparer des emails » de « gérer la page publique des
// résultats ». Le split donne deux contextes nommés + une note d'intro chacun.
//
// Mockup de référence validé : docs/design/mockups/communication-split.html
// ---------------------------------------------------------------------------

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Mail, Link2 } from 'lucide-react';
import {
  GOLD, NAVY, INK, MUTED, CREAM2, EASE,
} from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import CommunicationTab from './CommunicationTab';
import CommunicationTabRefonte from './CommunicationTabRefonte';

// i18n co-localisé — micro-dictionnaire propre au split (intro + libellés
// sous-onglets). Reste trilingue FR/EN/DE strict.
const SPLIT_I18N = {
  subtabsAriaLabel: {
    fr: 'Sous-sections Communication',
    en: 'Communication sub-sections',
    de: 'Kommunikations-Unterbereiche',
  },
  subtabEmailing: {
    fr: 'Emailing',
    en: 'Emailing',
    de: 'E-Mails',
  },
  subtabUrl: {
    fr: 'URL & palmarès public',
    en: 'URL & public results',
    de: 'URL & öffentliche Ergebnisse',
  },
  introEmailing: {
    fr: 'Emailing — les modèles d’email par étape du concours. Chaque carte ouvre un aperçu : destinataires, sujet et corps éditables, prévisualisation. Rien n’est envoyé sans confirmation.',
    en: 'Emailing — the email templates for each stage of the competition. Each card opens a preview: recipients, editable subject and body, preview. Nothing is sent without confirmation.',
    de: 'E-Mails — die E-Mail-Vorlagen für jede Phase des Wettbewerbs. Jede Karte öffnet eine Vorschau: Empfänger, bearbeitbarer Betreff und Text, Vorschau. Nichts wird ohne Bestätigung gesendet.',
  },
  introUrl: {
    fr: 'URL & palmarès public — la page publique des résultats de cette compétition : activation, lien à partager, et options d’affichage.',
    en: 'URL & public results — the public results page for this competition: activation, shareable link, and display options.',
    de: 'URL & öffentliche Ergebnisse — die öffentliche Ergebnisseite dieses Wettbewerbs: Aktivierung, teilbarer Link und Anzeigeoptionen.',
  },
};

// Note d'intro de sous-onglet — style SectionNote (cream/gold hairline).
function SubtabIntro({ children }) {
  return (
    <p
      className="text-[12.5px] py-2 px-3 rounded-[4px] mb-4 leading-relaxed"
      style={{ background: '#fdf6e8', color: INK, border: `1px solid ${CREAM2}` }}
    >
      {children}
    </p>
  );
}

export default function CommunicationSplit({
  editionId,
  competition,
  values = {},
  onPatch,
}) {
  const { t } = useLang();
  const reduce = useReducedMotion();
  const [sub, setSub] = useState('emailing');

  const subtabs = useMemo(() => ([
    { id: 'emailing', label: t(SPLIT_I18N.subtabEmailing), Icon: Mail },
    { id: 'url', label: t(SPLIT_I18N.subtabUrl), Icon: Link2 },
  ]), [t]);

  return (
    <div>
      {/* Switcher 2 sous-onglets — toggle souligné-or Élysée. */}
      <div
        role="tablist"
        aria-label={t(SPLIT_I18N.subtabsAriaLabel)}
        className="flex gap-7 mb-5"
        style={{ borderBottom: `1px solid ${CREAM2}` }}
      >
        {subtabs.map(({ id, label, Icon }) => {
          const on = sub === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`comm-split-tab-${id}`}
              aria-selected={on}
              aria-controls={`comm-split-panel-${id}`}
              onClick={() => setSub(id)}
              className="relative inline-flex items-center gap-1.5 pb-3 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] rounded-[2px]"
              style={{ color: on ? NAVY : MUTED, fontWeight: on ? 500 : 400 }}
            >
              <Icon className="w-4 h-4" aria-hidden style={{ color: on ? GOLD : MUTED }} />
              {label}
              {on && (
                <span
                  aria-hidden
                  className="absolute left-0 right-0 -bottom-px h-0.5"
                  style={{ background: GOLD }}
                />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={sub}
          role="tabpanel"
          id={`comm-split-panel-${sub}`}
          aria-labelledby={`comm-split-tab-${sub}`}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: EASE }}
        >
          {sub === 'emailing' ? (
            <>
              <SubtabIntro>{t(SPLIT_I18N.introEmailing)}</SubtabIntro>
              <CommunicationTabRefonte editionId={editionId} competition={competition} />
            </>
          ) : (
            <>
              <SubtabIntro>{t(SPLIT_I18N.introUrl)}</SubtabIntro>
              <CommunicationTab values={values} onPatch={onPatch} />
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
