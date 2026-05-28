// FunnelEditorModal — modale Élysée générique pour les funnels de configuration
// du Master Cockpit (compétition, club, …).
//
// Pattern :
//   * backdrop-blur cream-tinted + click-outside (avec confirm si saving),
//   * header sticky : eyebrow gold + titre Playfair + bouton X,
//   * pill row de tabs sous le header (NAVY actif / hairline inactif),
//   * body scrollable px-6 py-5,
//   * footer sticky : destructiveSlot à gauche, statut autosave + "Fermer" à droite,
//   * ESC ferme, focus trap minimal (réenfourne le focus dans la modale),
//   * animation fade+scale via framer-motion.
//
// Props :
//   open            : bool
//   onClose         : () => void
//   title           : string (titre Playfair)
//   eyebrow         : string (uppercase tracked GOLD)
//   tabs            : Array<{ id, label, render: () => ReactNode, disabled? }>
//   activeTab       : string
//   onTabChange     : (id) => void
//   status?         : 'idle' | 'saving' | 'saved' | 'error'
//   statusMessage?  : string
//   destructiveSlot?: ReactNode
//   width?          : 'standard' | 'wide'

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, X } from 'lucide-react';
import {
  CREAM, CREAM2, NAVY, GOLD, INK, MUTED, SERIF, EASE, TINT_SAGE, GREEN_TODAY,
} from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { COMP, UI } from '../master/i18n';

const WIDTH_MAP = {
  standard: 'max-w-[920px]',
  wide:     'max-w-[1100px]',
};

function StatusIndicator({ status, statusMessage }) {
  const { t } = useLang();
  if (!status || status === 'idle') return null;

  if (status === 'saving') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[12px]"
        style={{ color: MUTED }}
        aria-live="polite"
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: GOLD }} aria-hidden />
        {statusMessage || t(COMP.autosaveSaving)}
      </span>
    );
  }

  if (status === 'saved') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[12px] transition-opacity duration-700"
        style={{ color: MUTED }}
        aria-live="polite"
      >
        <Check className="w-3.5 h-3.5" style={{ color: GREEN_TODAY }} aria-hidden />
        {statusMessage || t(COMP.autosaveSaved)}
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[12px]"
        style={{ color: DANGER }}
        aria-live="assertive"
      >
        {statusMessage || t(COMP.autosaveError)}
      </span>
    );
  }
  return null;
}

function TabPill({ id, label, active, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      role="tab"
      aria-selected={active}
      aria-controls={`funnel-panel-${id}`}
      className="px-3.5 py-1.5 rounded-full text-[12px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        background: active ? NAVY : 'white',
        color: active ? 'white' : INK,
        border: `1px solid ${active ? NAVY : CREAM2}`,
      }}
    >
      {label}
    </button>
  );
}

export default function FunnelEditorModal({
  open,
  onClose,
  title,
  eyebrow,
  tabs = [],
  activeTab,
  onTabChange,
  status = 'idle',
  statusMessage,
  destructiveSlot,
  width = 'standard',
}) {
  const { t } = useLang();
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const [requestClose, setRequestClose] = useState(false);

  const handleAttemptedClose = useCallback(() => {
    if (status === 'saving') {
      const ok = typeof window !== 'undefined'
        ? window.confirm(t(COMP.saveInProgressWarn))
        : true;
      if (!ok) return;
    }
    setRequestClose(false);
    onClose?.();
  }, [onClose, status, t]);

  // ESC ferme la modale.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleAttemptedClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleAttemptedClose]);

  // Body scroll lock + focus initial.
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Place le focus sur le dialog au mount (focus trap minimal).
    if (dialogRef.current) {
      const focusable = dialogRef.current.querySelector(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable) {
        try { focusable.focus({ preventScroll: true }); } catch { /* noop */ }
      }
    }
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus trap minimal — Tab / Shift+Tab cycle dans la modale.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const widthClass = WIDTH_MAP[width] || WIDTH_MAP.standard;

  return (
    <AnimatePresence>
      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          aria-hidden={false}
          onMouseDown={(e) => {
            // click-outside : on n'agit que si on a relâché sur l'overlay (pas
            // sur un enfant qui a propagé l'évènement).
            if (e.target === overlayRef.current) setRequestClose(true);
          }}
          onMouseUp={(e) => {
            if (requestClose && e.target === overlayRef.current) {
              handleAttemptedClose();
            }
            setRequestClose(false);
          }}
          style={{
            background: 'rgba(250, 247, 242, 0.6)', // CREAM at 60%
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.28, ease: EASE }}
            className={`${widthClass} w-full max-h-[90vh] flex flex-col rounded-[4px] overflow-hidden`}
            style={{
              background: 'white',
              border: `1px solid ${CREAM2}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header sticky */}
            <header
              className="px-6 pt-5 pb-4 flex items-start gap-3 flex-wrap"
              style={{ borderBottom: `1px solid ${CREAM2}`, background: 'white' }}
            >
              <div className="flex-1 min-w-0">
                {eyebrow && (
                  <p
                    className="uppercase tracking-[0.18em] text-[10.5px] font-medium mb-1"
                    style={{ color: GOLD }}
                  >
                    {eyebrow}
                  </p>
                )}
                <h2
                  className="text-[22px] md:text-[26px] leading-tight"
                  style={{ fontFamily: SERIF, color: NAVY, fontWeight: 400 }}
                >
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleAttemptedClose}
                className="inline-flex items-center justify-center w-8 h-8 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
                style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
                aria-label={t(COMP.closeModal)}
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </header>

            {/* Tabs pill row */}
            {tabs.length > 0 && (
              <div
                className="px-6 py-3 flex flex-wrap items-center gap-1.5"
                style={{ borderBottom: `1px solid ${CREAM2}`, background: CREAM }}
                role="tablist"
              >
                {tabs.map((tab) => (
                  <TabPill
                    key={tab.id}
                    id={tab.id}
                    label={tab.label}
                    active={activeTab === tab.id}
                    disabled={tab.disabled}
                    onClick={() => onTabChange?.(tab.id)}
                  />
                ))}
              </div>
            )}

            {/* Body scrollable */}
            <div
              id={`funnel-panel-${activeTab}`}
              role="tabpanel"
              className="flex-1 overflow-y-auto px-6 py-5"
              style={{ background: 'white' }}
            >
              {tabs.find((tab) => tab.id === activeTab)?.render?.()}
            </div>

            {/* Footer sticky */}
            <footer
              className="px-6 py-3 flex items-center justify-between gap-3 flex-wrap"
              style={{ borderTop: `1px solid ${CREAM2}`, background: 'white' }}
            >
              <div className="flex-1 min-w-0">
                {destructiveSlot}
              </div>
              <div className="flex items-center gap-4">
                <StatusIndicator status={status} statusMessage={statusMessage} />
                <button
                  type="button"
                  onClick={handleAttemptedClose}
                  className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
                  style={{
                    background: status === 'saved' ? NAVY : 'white',
                    color: status === 'saved' ? 'white' : NAVY,
                    border: `1px solid ${status === 'saved' ? NAVY : CREAM2}`,
                  }}
                >
                  {t(COMP.closeModal)}
                </button>
              </div>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Sub-exports utilitaires (pour les vues plein cockpit qui veulent rendre le
// même statut indicator sans la modale).
export { StatusIndicator, TINT_SAGE };
