// StatPopover — popover compact réutilisable pour afficher 3 à 4 KPI inline
// au hover/click d'un bouton. Conçu pour le tab "Clubs participants" du Master
// Cockpit (équipe C, deep-links cross-cockpit) mais réutilisable partout dans
// l'app — d'où sa place dans /design/.
//
// API :
//   <StatPopover
//     trigger={(open, ref, props) => <button ref={ref} {...props}>…</button>}
//     title="Aperçu du club"
//     items={[{ label: 'Candidatures', value: 12 }, …]}
//     loading={false}
//     error={null}
//     // optional :
//     placement="auto"     // 'above' | 'below' | 'auto' (auto-positionnement)
//     openOnHover={true}   // hover (laptop) en plus du click (tactile)
//   />
//
// Style Élysée : background CREAM2, hairline gold (1px), texte NAVY/INK,
// labels uppercase tracking-wide en MUTED, valeurs tabulaires (Inter sans serif).
//
// A11y :
//   - role="dialog"
//   - aria-labelledby pointe sur le titre interne
//   - ESC ferme et restore focus sur le trigger
//   - tabindex=-1 sur le popover, focus capturé au mount
//   - click-outside ferme (mousedown global)
//
// Positionnement : par défaut on calcule above/below selon viewport. Le popover
// reste accroché au trigger via un wrapper relative + un absolute child. Un offset
// vertical de 8px sépare le trigger du popover.

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import {
  CREAM2, GOLD, INK, MUTED, NAVY, SERIF, EASE,
} from '@/components/design/tokens';
import { DANGER, GOLD_TEXT } from '@/components/design/tokens.app';

const POPOVER_OFFSET = 8; // px entre trigger et popover

function resolvePlacement(triggerEl, placement) {
  if (!triggerEl) return 'below';
  if (placement === 'above' || placement === 'below') return placement;
  // auto : on regarde l'espace disponible.
  if (typeof window === 'undefined') return 'below';
  const rect = triggerEl.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  // 220 px ~ hauteur typique d'un popover 3-4 KPI ; on bascule au-dessus si on est serré.
  return spaceBelow >= 220 || spaceBelow >= spaceAbove ? 'below' : 'above';
}

export default function StatPopover({
  trigger,
  title,
  items = [],
  loading = false,
  loadingLabel = 'Loading…',
  error = null,
  placement = 'auto',
  openOnHover = true,
  onOpenChange,
}) {
  const [open, setOpen] = useState(false);
  const [resolvedPlacement, setResolvedPlacement] = useState('below');
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const closeTimerRef = useRef(null);
  const titleId = useId();

  const setOpenSafe = useCallback(
    (next) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  const close = useCallback(() => {
    setOpenSafe(false);
  }, [setOpenSafe]);

  // ESC ferme et restore focus sur le trigger.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        try { triggerRef.current?.focus({ preventScroll: true }); } catch { /* noop */ }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Click-outside ferme.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      const pop = popoverRef.current;
      const trig = triggerRef.current;
      if (!pop) return;
      if (pop.contains(e.target)) return;
      if (trig && trig.contains(e.target)) return;
      close();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, close]);

  // Auto-position au mount.
  useLayoutEffect(() => {
    if (!open) return;
    setResolvedPlacement(resolvePlacement(triggerRef.current, placement));
  }, [open, placement]);

  // Hover delay (laptop) : ouverture instantanée, fermeture après 120 ms pour
  // laisser le temps de glisser vers le popover.
  const onMouseEnter = openOnHover
    ? () => {
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
        setOpenSafe(true);
      }
    : undefined;

  const onMouseLeave = openOnHover
    ? () => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(() => {
          setOpenSafe(false);
        }, 120);
      }
    : undefined;

  const onClick = () => {
    // Click toggle (tactile + clavier).
    setOpenSafe(!open);
  };

  // Props passés au trigger (button). On accepte que `trigger` soit une fn render
  // pour laisser le caller maîtriser l'icône, le label, les styles.
  const triggerProps = {
    'aria-haspopup': 'dialog',
    'aria-expanded': open,
    onClick,
    onMouseEnter,
    onMouseLeave,
  };

  return (
    <span className="relative inline-block">
      {typeof trigger === 'function'
        ? trigger(open, triggerRef, triggerProps)
        : trigger}

      <AnimatePresence>
        {open && (
          <motion.div
            ref={popoverRef}
            role="dialog"
            aria-labelledby={titleId}
            tabIndex={-1}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            initial={{ opacity: 0, y: resolvedPlacement === 'below' ? -4 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: resolvedPlacement === 'below' ? -4 : 4 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="absolute z-40 rounded-[4px] shadow-sm px-4 py-3 min-w-[220px] max-w-[280px]"
            style={{
              background: '#fffdf9', // a few % lighter than CREAM2 for readability
              border: `1px solid ${GOLD}`,
              [resolvedPlacement === 'below' ? 'top' : 'bottom']:
                `calc(100% + ${POPOVER_OFFSET}px)`,
              right: 0,
            }}
          >
            {/* Title */}
            <p
              id={titleId}
              className="text-[10.5px] uppercase tracking-[0.18em] font-medium mb-2"
              style={{ color: GOLD_TEXT }}
            >
              {title}
            </p>

            {/* Body : loading / error / items */}
            {loading && (
              <p
                className="inline-flex items-center gap-1.5 text-[12.5px]"
                style={{ color: MUTED }}
                aria-live="polite"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: GOLD }} aria-hidden />
                <span>{loadingLabel}</span>
              </p>
            )}

            {!loading && error && (
              <p className="text-[12.5px]" style={{ color: DANGER }} role="alert">
                {error}
              </p>
            )}

            {!loading && !error && items.length > 0 && (
              <ul className="m-0 p-0 list-none space-y-1.5">
                {items.map((kpi) => (
                  <li
                    key={kpi.label}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span
                      className="text-[11.5px] uppercase tracking-[0.12em]"
                      style={{ color: MUTED }}
                    >
                      {kpi.label}
                    </span>
                    <span
                      className="text-[16px] tabular-nums"
                      style={{
                        color: NAVY,
                        fontFamily: SERIF,
                        fontWeight: 500,
                      }}
                    >
                      {kpi.value}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {!loading && !error && items.length === 0 && (
              <p className="text-[12.5px]" style={{ color: INK }}>—</p>
            )}

            {/* Hairline gold accent on bottom edge — discrete editorial touch */}
            <div
              className="absolute left-3 right-3 h-px"
              style={{ background: CREAM2, bottom: 6 }}
              aria-hidden
            />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
