// ConfirmModal — modale de confirmation réutilisable, alignée sur le pattern
// RevokeConfirmModal / DeleteCompetitionModal du Master Cockpit (overlay flou,
// scroll-lock, ESC-to-close, restore-focus, tokens Élysée).
//
// Deux modes :
//   * Confirm simple : pas de prop `confirmPhrase`. Le bouton primaire est
//     toujours actif (sauf `busy`). Usage type window.confirm().
//   * Typed-confirm : prop `confirmPhrase` non vide. Un input doit matcher
//     exactement la phrase pour activer le bouton primaire. Usage type
//     window.prompt() de garde-fou.
//
// Toutes les strings VISIBLES sont passées par le parent (déjà résolues via
// t()) — ce composant ne hardcode aucune copie utilisateur. Il reste donc
// trilingue de fait : c'est l'appelant qui fournit les libellés traduits.
//
// Props :
//   open          : bool                       — monté/démonté par le parent
//   title         : string                     — titre (SERIF, navy)
//   body          : ReactNode                  — corps explicatif
//   confirmLabel  : string                     — libellé bouton primaire
//   cancelLabel   : string                     — libellé bouton secondaire
//   onConfirm     : () => void | Promise<void> — action confirmée
//   onClose       : () => void                 — fermeture / annulation
//   danger        : bool                        — bouton primaire en rouge (défaut true)
//   busy          : bool                        — spinner + boutons désactivés
//   icon          : LucideIcon                  — icône d'en-tête (défaut AlertTriangle)
//   confirmPhrase : string                      — si fourni → mode typed-confirm
//   inputLabel    : string                      — label de l'input (typed-confirm)
//   mismatch      : string                      — message d'erreur si la saisie ne matche pas

import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, AlertTriangle } from 'lucide-react';
import { CREAM2, NAVY, MUTED, INK, SERIF, EASE, TINT_ADMIN } from '@/components/design/tokens';
import { DANGER, FOCUS_RING_CLASS } from '@/components/design/tokens.app';

export default function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
  danger = true,
  busy = false,
  icon: Icon = AlertTriangle,
  confirmPhrase,
  inputLabel,
  mismatch,
}) {
  const titleId = useId();
  const isTyped = typeof confirmPhrase === 'string' && confirmPhrase.length > 0;

  const [typed, setTyped] = useState('');
  const [error, setError] = useState(null);

  const inputRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const restoreFocusRef = useRef(null);

  const accent = danger ? DANGER : NAVY;

  // Reset transient state on open/close so a reused instance starts fresh.
  useEffect(() => {
    if (open) {
      setTyped('');
      setError(null);
    }
  }, [open]);

  // Scroll-lock + ESC-to-close + restore-focus.
  useEffect(() => {
    if (!open) return undefined;
    restoreFocusRef.current = document.activeElement;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);

    // Autofocus : input en mode typed, sinon bouton primaire.
    const focusTarget = isTyped ? inputRef.current : confirmBtnRef.current;
    focusTarget?.focus?.();

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      const el = restoreFocusRef.current;
      if (el && typeof el.focus === 'function') el.focus();
    };
  }, [open, isTyped, onClose]);

  const matches = !isTyped || typed.trim() === confirmPhrase.trim();
  const primaryDisabled = busy || !matches;

  const handleConfirm = async (e) => {
    e?.preventDefault?.();
    if (isTyped && !matches) {
      setError(mismatch || null);
      return;
    }
    setError(null);
    await onConfirm?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{
            background: 'rgba(15, 31, 61, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={() => { if (!busy) onClose?.(); }}
        >
          <motion.form
            key="card"
            onSubmit={handleConfirm}
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[4px] max-w-[520px] w-full overflow-hidden"
            style={{ border: `1px solid ${CREAM2}` }}
          >
            <header className="px-6 pt-5 pb-3" style={{ borderBottom: `1px solid ${CREAM2}` }}>
              <h2
                id={titleId}
                className="text-[19px] leading-tight flex items-center gap-2"
                style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
              >
                {Icon && <Icon className="w-5 h-5 shrink-0" style={{ color: accent }} aria-hidden />}
                {title}
              </h2>
            </header>

            <div className="px-6 py-4 flex flex-col gap-3">
              {body && (
                <div className="text-[13px]" style={{ color: INK }}>
                  {body}
                </div>
              )}

              {isTyped && (
                <div className="flex flex-col gap-1.5">
                  {inputLabel && (
                    <label
                      htmlFor={`${titleId}-input`}
                      className="uppercase tracking-[0.14em] text-[10.5px]"
                      style={{ color: MUTED }}
                    >
                      {inputLabel}
                    </label>
                  )}
                  <input
                    id={`${titleId}-input`}
                    ref={inputRef}
                    type="text"
                    value={typed}
                    onChange={(e) => { setTyped(e.target.value); setError(null); }}
                    placeholder={confirmPhrase}
                    disabled={busy}
                    className={`w-full text-[13px] font-mono rounded-[4px] px-2.5 py-2 outline-none ${FOCUS_RING_CLASS}`}
                    style={{ background: 'white', border: `1px solid ${error ? DANGER : CREAM2}`, color: NAVY }}
                  />
                  {error && (
                    <p className="text-[12px]" style={{ color: DANGER }} role="alert">{error}</p>
                  )}
                </div>
              )}
            </div>

            <footer
              className="px-6 py-4 flex items-center justify-end gap-3"
              style={{ borderTop: `1px solid ${CREAM2}`, background: TINT_ADMIN }}
            >
              <button
                type="button"
                onClick={() => onClose?.()}
                disabled={busy}
                className={`text-[13px] px-3 py-2 rounded-[4px] ${FOCUS_RING_CLASS} disabled:opacity-50`}
                style={{ color: INK, background: 'white', border: `1px solid ${CREAM2}` }}
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmBtnRef}
                type="submit"
                disabled={primaryDisabled}
                className={`inline-flex items-center gap-2 text-[13px] font-medium px-4 py-2 rounded-[4px] ${FOCUS_RING_CLASS}`}
                style={{
                  background: primaryDisabled ? MUTED : accent,
                  color: 'white',
                  border: `1px solid ${primaryDisabled ? MUTED : accent}`,
                  cursor: primaryDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
                {confirmLabel}
              </button>
            </footer>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
