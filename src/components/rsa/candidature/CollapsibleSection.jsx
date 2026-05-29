// CollapsibleSection — wrapper Élysée pour le single-page candidature.
//
// Inspiré §11 « Collapsible Forms » du ui-patterns-catalog-generic. Chaque
// section a :
//  - un header cliquable (toggle expand/collapse)
//  - un eyebrow gold + titre Playfair + sous-titre Inter
//  - un statut visuel (point GOLD si incomplete, check SUCCESS si complet)
//  - une zone collapse animée framer-motion (height auto + opacity)
//
// Accessibilité :
//  - button[aria-expanded] sur le header
//  - aria-controls + aria-labelledby pour relier header au contenu
//  - focus ring GOLD standard
//
// Pas de dépendance npm nouvelle — framer-motion est déjà utilisée partout.

import React, { useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { NAVY, GOLD, INK, MUTED, CREAM2, SERIF, EASE } from '@/components/design';
import { SUCCESS } from '@/components/design/tokens.app';

export default function CollapsibleSection({
  eyebrow,
  title,
  subtitle,
  open,
  onToggle,
  complete = false,
  incomplete = false,
  children,
  // Optionnel — rendre la section non-toggable (toujours ouverte).
  locked = false,
}) {
  const id = useId();
  const contentId = `cs-content-${id}`;
  const headerId = `cs-header-${id}`;
  const isOpen = locked ? true : open;

  return (
    <section
      className="rounded-[6px] bg-white"
      style={{ border: `1px solid ${CREAM2}` }}
      aria-labelledby={headerId}
    >
      <button
        type="button"
        id={headerId}
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={locked ? undefined : onToggle}
        disabled={locked}
        className="w-full flex items-center gap-4 px-5 md:px-6 py-4 md:py-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] rounded-t-[6px]"
        style={{ background: 'transparent' }}
      >
        <div className="flex-1 min-w-0">
          {eyebrow && (
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="h-[1.5px] w-5" style={{ background: GOLD }} aria-hidden />
              <span
                className="uppercase text-[10px] tracking-[0.16em] font-medium"
                style={{ color: GOLD }}
              >
                {eyebrow}
              </span>
            </div>
          )}
          <h3
            className="text-[19px] leading-snug m-0"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {title}
          </h3>
          {subtitle && (
            <p
              className="text-[13px] leading-relaxed mt-1"
              style={{ color: MUTED }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {/* Statut visuel : check vert si complet, point gold si incomplete */}
        {complete ? (
          <span
            className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full"
            style={{ background: '#ecf1e5', border: '1px solid #cfe0bd' }}
            aria-label="complete"
          >
            <Check className="w-3.5 h-3.5" style={{ color: SUCCESS }} aria-hidden />
          </span>
        ) : incomplete ? (
          <span
            className="shrink-0 inline-block w-2 h-2 rounded-full"
            style={{ background: GOLD }}
            aria-label="incomplete"
          />
        ) : null}
        {!locked && (
          <motion.span
            className="shrink-0"
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            aria-hidden
          >
            <ChevronDown className="w-4 h-4" style={{ color: INK }} />
          </motion.span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={contentId}
            role="region"
            aria-labelledby={headerId}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="px-5 md:px-6 pb-5 md:pb-6 pt-2"
              style={{ borderTop: `1px solid ${CREAM2}` }}
            >
              <div className="pt-4 flex flex-col gap-5">{children}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
