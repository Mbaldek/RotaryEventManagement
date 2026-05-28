// FunnelEditorModal.stub — Élysée modal funnel (backdrop-blur) avec tabs latéraux.
//
// FALLBACK STUB : version minimale compatible du contrat livré par l'agent
// CompetitionFunnel. Si le FunnelEditorModal canonique
// (funnel/FunnelEditorModal.jsx) n'existe pas encore au runtime, on import ce stub
// pour ne pas casser ClubFunnel.
//
// Contrat :
//   { open, onClose, title, eyebrow, tabs, activeTab, onTabChange,
//     status?, statusMessage?, destructiveSlot?, width? }
//
// Brand : pattern InviteUserModal — overlay navy 55% + backdrop-blur léger, surface
// blanche, hairlines CREAM2, header NAVY + GOLD eyebrow + Playfair title, ESC
// ferme, click-outside ferme. Tabs en colonne gauche (pill rectangulaire, hairline
// gold quand actif) + body droit scrollable. Footer hairline avec status indicator
// + destructiveSlot optionnel à gauche, bouton "Fermer" à droite.

import React, { useEffect, useId } from 'react';
import { Loader2, Check, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  NAVY,
  GOLD,
  CREAM,
  CREAM2,
  INK,
  MUTED,
  SERIF,
  EASE,
} from '@/components/design';
import { DANGER, SUCCESS } from '@/components/design/tokens.app';

function StatusIndicator({ status, message }) {
  if (!status || status === 'idle') return null;
  let color = MUTED;
  let icon = null;
  if (status === 'saving') {
    color = MUTED;
    icon = <Loader2 className="w-3.5 h-3.5 animate-spin" />;
  } else if (status === 'saved') {
    color = SUCCESS;
    icon = <Check className="w-3.5 h-3.5" />;
  } else if (status === 'error') {
    color = DANGER;
    icon = <AlertTriangle className="w-3.5 h-3.5" />;
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color }}>
      {icon}
      {message || ''}
    </span>
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
  statusMessage = '',
  destructiveSlot = null,
  width = 'standard',
}) {
  const titleId = useId();
  const maxW = width === 'wide' ? 'max-w-[1040px]' : 'max-w-[820px]';
  const active = tabs.find((tab) => tab.id === activeTab) || tabs[0] || null;

  // ESC ferme. On laisse passer pendant un saving.
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
          className="fixed inset-0 z-[80] flex items-start sm:items-center justify-center px-3 sm:px-6 py-8 overflow-y-auto"
          style={{
            background: 'rgba(15, 31, 61, 0.55)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.28, ease: EASE }}
            className={`w-full ${maxW} rounded-[4px] overflow-hidden flex flex-col`}
            style={{
              background: 'white',
              border: `1px solid ${CREAM2}`,
              maxHeight: 'calc(100vh - 64px)',
            }}
          >
            {/* ── Header NAVY ────────────────────────────────────────────── */}
            <div
              className="relative px-6 py-5 shrink-0"
              style={{ background: NAVY, color: 'white' }}
            >
              <button
                type="button"
                onClick={() => onClose?.()}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
                style={{ color: 'rgba(255,255,255,0.7)' }}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
              {eyebrow && (
                <div className="flex items-center gap-2.5 mb-2">
                  <span
                    className="h-[1.5px] w-7 block"
                    style={{ background: GOLD }}
                    aria-hidden
                  />
                  <span
                    className="uppercase text-[10px] tracking-[0.18em] font-medium"
                    style={{ color: GOLD }}
                  >
                    {eyebrow}
                  </span>
                </div>
              )}
              <h2
                id={titleId}
                className="text-[22px] leading-tight"
                style={{ fontFamily: SERIF, fontWeight: 500 }}
              >
                {title}
              </h2>
            </div>

            {/* ── Body : tabs latéraux + panel ──────────────────────────── */}
            <div
              className="flex flex-1 min-h-0 overflow-hidden"
              style={{ background: CREAM }}
            >
              {/* Tabs latéraux */}
              <nav
                className="shrink-0 px-3 py-4 hidden sm:block"
                style={{ background: 'white', borderRight: `1px solid ${CREAM2}`, width: 220 }}
                aria-label="Sections"
              >
                <ul className="flex flex-col gap-1">
                  {tabs.map((tab) => {
                    const isActive = tab.id === activeTab;
                    return (
                      <li key={tab.id}>
                        <button
                          type="button"
                          onClick={() => onTabChange?.(tab.id)}
                          className="w-full text-left px-3 py-2 rounded-[4px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] transition-colors"
                          style={{
                            background: isActive ? '#fdf6e8' : 'transparent',
                            color: isActive ? NAVY : INK,
                            border: `1px solid ${isActive ? GOLD : 'transparent'}`,
                            fontWeight: isActive ? 500 : 400,
                          }}
                          aria-current={isActive ? 'page' : undefined}
                          disabled={tab.disabled}
                        >
                          <span className="flex items-center gap-2">
                            {isActive && (
                              <span
                                className="h-[1.5px] w-3 shrink-0"
                                style={{ background: GOLD }}
                                aria-hidden
                              />
                            )}
                            <span>{tab.label}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {/* Tabs en horizontal sur mobile */}
              <div className="sm:hidden w-full">
                <div
                  className="px-3 py-2 overflow-x-auto"
                  style={{ background: 'white', borderBottom: `1px solid ${CREAM2}` }}
                >
                  <div className="flex gap-1.5 min-w-max">
                    {tabs.map((tab) => {
                      const isActive = tab.id === activeTab;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => onTabChange?.(tab.id)}
                          className="px-3 py-1.5 rounded-full text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                          style={{
                            background: isActive ? NAVY : 'white',
                            color: isActive ? 'white' : INK,
                            border: `1px solid ${isActive ? NAVY : CREAM2}`,
                          }}
                          aria-current={isActive ? 'page' : undefined}
                          disabled={tab.disabled}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Panel actif (scroll) */}
              <div
                className="flex-1 min-w-0 overflow-y-auto"
                role="tabpanel"
                style={{ background: CREAM }}
              >
                <div className="px-6 py-6">
                  {active ? active.render() : null}
                </div>
              </div>
            </div>

            {/* ── Footer : status indicator + destructive slot + close ──── */}
            <div
              className="flex items-center gap-3 flex-wrap px-6 py-3 shrink-0"
              style={{ background: 'white', borderTop: `1px solid ${CREAM2}` }}
            >
              <div className="flex items-center gap-3 flex-wrap min-w-0">
                <StatusIndicator status={status} message={statusMessage} />
                {destructiveSlot}
              </div>
              <button
                type="button"
                onClick={() => onClose?.()}
                className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
                style={{
                  color: INK,
                  background: 'white',
                  border: `1px solid ${CREAM2}`,
                }}
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
