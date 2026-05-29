// PersonaPreviewBanner — bandeau Élysée affiché en haut d'une page admin lorsqu'un
// master_admin bascule en "vue aperçu" d'un scope club/compétition. Le bandeau
// rappelle que la session courante est une simulation et propose un retour 1-clic
// au scope Master.
//
// Design tokens : TINT_BEIGE en background, hairline GOLD, icone Sparkles GOLD,
// texte NAVY/INK. Bouton X discret pour fermer.
//
// Props :
//   scopeLabel : string — libellé déjà résolu (ex. "Club admin · Paris" ou
//                "Admin compétition · 2027"). Le composant ne dépend pas de la
//                source du label, juste de l'affichage.
//   onReturn   : () => void — handler "Retour à Master" (reset scope=master +
//                cleanup URL côté parent).
//
// a11y :
//   * role="alert" + aria-live="polite" — annonce non-intrusive au lecteur d'écran.
//   * bouton "Retour à Master" a un aria-label explicite trilingue.
//
// Animation : fade + slideDown léger à l'entrée (200ms, EASE éditoriale). Respecte
// useReducedMotion (fade-only).

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import {
  CREAM2, EASE, GOLD, INK, NAVY, TINT_BEIGE,
} from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { UI } from '@/components/rsa/admin/platform/i18n';

export default function PersonaPreviewBanner({ scopeLabel, onReturn }) {
  const { t } = useLang();
  const reduce = useReducedMotion();

  // Résout le label complet "Vue aperçu : {scope}". Le dico est une fonction
  // (lang -> (scope) -> string) ; on passe par t() pour obtenir la fn,
  // puis on l'invoque.
  const bannerFn = t(UI.personaPreviewBanner);
  const bannerText = typeof bannerFn === 'function'
    ? bannerFn(scopeLabel)
    : `${bannerFn} ${scopeLabel || ''}`.trim();

  const returnLabel = t(UI.returnToMaster);

  return (
    <motion.div
      role="alert"
      aria-live="polite"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: EASE }}
      className="rounded-[4px] px-4 py-2.5 mb-5 flex items-center gap-3 flex-wrap"
      style={{
        background: TINT_BEIGE,
        border: `1px solid ${GOLD}`,
      }}
    >
      <span
        className="inline-flex items-center justify-center shrink-0"
        aria-hidden
      >
        <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
      </span>

      <span
        className="text-[12.5px] flex-1 min-w-0"
        style={{ color: NAVY, lineHeight: 1.5 }}
      >
        {bannerText}
      </span>

      <button
        type="button"
        onClick={onReturn}
        aria-label={returnLabel}
        className={`inline-flex items-center gap-1.5 text-[11.5px] uppercase tracking-[0.14em] font-medium px-2.5 py-1 rounded-[3px] transition-colors ${FOCUS_RING_CLASS}`}
        style={{
          background: 'white',
          border: `1px solid ${CREAM2}`,
          color: INK,
        }}
      >
        <X className="w-3.5 h-3.5" aria-hidden style={{ color: GOLD }} />
        <span>{returnLabel}</span>
      </button>
    </motion.div>
  );
}
