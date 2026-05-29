// CockpitTabs — barre d'onglets éditoriale partagée pour Master/Club/Admin cockpits.
//
// Pourquoi ce composant ?
//   Les anciens onglets cockpit utilisaient un style "pill" (rounded-full, fond
//   NAVY sur active) qui dégageait la même odeur visuelle qu'un filter chip de
//   data table. Ce n'est pas la bonne sémantique pour une navigation principale
//   (overview / clubs / etc.). On bascule sur un style "T-Underline-Editorial"
//   plus stripe-like, conforme à la hiérarchie Élysée :
//     · row horizontale + border-bottom CREAM2 fin
//     · tab inactif  : MUTED text, font-normal, hairline transparent
//     · tab actif    : NAVY text, font-medium, underline GOLD 2px
//     · hover inactif : INK text, underline CREAM2 (préview discrète)
//     · count badge optionnel à droite du label
//     · scroll horizontal au-dessous de lg avec gradient fade sur les bords
//
// API :
//   <CockpitTabs
//      idPrefix="master"                       // utilisé pour générer ids ARIA
//      items={[{ id, label, count?, disabled? }]}
//      active="overview"
//      onChange={(id) => setTab(id)}
//      ariaLabel="Cockpit navigation"          // role=tablist label
//      align="start"                           // "start" | "end" | "center"
//      className=""                            // optionnel — wrapper externe
//   />
//
// a11y :
//   * role=tablist sur le conteneur, role=tab sur chaque bouton
//   * aria-selected, aria-controls, id sur chaque tab (apparié aux panels)
//   * Keyboard : ←/→ pour naviguer, Home/End pour bords, Enter/Space activate
//     (le bouton natif gère Enter/Space ; on intercepte arrow/home/end)
//   * Le composant ne change PAS l'active automatiquement sur arrow — il appelle
//     onChange seulement quand l'utilisateur fait Enter/Space, sauf si la prop
//     `autoActivate` est passée (pattern "automatic activation" de l'APG).
//
// Pas de re-rendu sticky : c'est juste un <div> avec une row de <button>. Le
// panel <div role="tabpanel"> reste rendu par le caller (qui contrôle l'état
// d'affichage du contenu).

import React, { useCallback, useRef } from 'react';
import {
  NAVY, INK, MUTED, GOLD, CREAM2,
} from '@/components/design/tokens';

const ALIGN = {
  start:  'justify-start',
  center: 'justify-center',
  end:    'justify-end',
};

export default function CockpitTabs({
  idPrefix,
  items = [],
  active,
  onChange,
  ariaLabel,
  align = 'start',
  autoActivate = false,
  className = '',
}) {
  const refs = useRef({});

  const focusableIds = items.filter((it) => !it.disabled).map((it) => it.id);

  const focusTab = useCallback((id) => {
    const node = refs.current[id];
    if (node) node.focus();
  }, []);

  const onKeyDown = useCallback((e) => {
    const key = e.key;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
    e.preventDefault();
    const list = focusableIds;
    if (list.length === 0) return;
    const currentId = e.target?.dataset?.tabId || active;
    const idx = list.indexOf(currentId);
    let nextIdx = idx;
    if (key === 'ArrowLeft')  nextIdx = idx <= 0 ? list.length - 1 : idx - 1;
    if (key === 'ArrowRight') nextIdx = idx >= list.length - 1 ? 0 : idx + 1;
    if (key === 'Home')       nextIdx = 0;
    if (key === 'End')        nextIdx = list.length - 1;
    const nextId = list[nextIdx];
    focusTab(nextId);
    if (autoActivate) onChange?.(nextId);
  }, [active, focusableIds, autoActivate, onChange, focusTab]);

  return (
    <div
      className={`relative ${className}`}
      style={{ borderBottom: `1px solid ${CREAM2}` }}
    >
      {/* Scroll container — overflow-x sur mobile, wrap libre au-dessus de lg */}
      <div
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        className={`flex flex-nowrap lg:flex-wrap items-end gap-x-6 gap-y-0 overflow-x-auto lg:overflow-visible -mb-px ${ALIGN[align] || ALIGN.start}`}
        style={{
          // Hide scrollbar on Firefox; on Chrome see ::-webkit below via Tailwind
          scrollbarWidth: 'none',
        }}
      >
        {items.map((item) => {
          const isActive = item.id === active;
          const isDisabled = !!item.disabled;
          const tabId   = `${idPrefix}-tab-${item.id}`;
          const panelId = `${idPrefix}-panel-${item.id}`;

          return (
            <button
              key={item.id}
              ref={(node) => { refs.current[item.id] = node; }}
              type="button"
              role="tab"
              id={tabId}
              data-tab-id={item.id}
              aria-selected={isActive}
              aria-controls={panelId}
              aria-disabled={isDisabled || undefined}
              disabled={isDisabled}
              tabIndex={isActive ? 0 : -1}
              onClick={isDisabled ? undefined : () => onChange?.(item.id)}
              className={[
                'group relative inline-flex items-center gap-1.5 shrink-0',
                'px-1 py-3 text-[12.5px] outline-none',
                'transition-colors duration-150',
                'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] rounded-[2px]',
                isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
              ].join(' ')}
              style={{
                color: isActive ? NAVY : MUTED,
                fontWeight: isActive ? 500 : 400,
                background: 'transparent',
                border: 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive && !isDisabled) {
                  e.currentTarget.style.color = INK;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive && !isDisabled) {
                  e.currentTarget.style.color = MUTED;
                }
              }}
            >
              <span>{item.label}</span>
              {typeof item.count === 'number' && (
                <span
                  className="inline-flex items-center justify-center min-w-[20px] px-1.5 text-[10.5px] tabular-nums rounded-full"
                  style={{
                    background: isActive ? '#fdf6e8' : '#f4f1ea',
                    color: isActive ? NAVY : MUTED,
                    border: `1px solid ${CREAM2}`,
                    lineHeight: '16px',
                    height: 16,
                  }}
                >
                  {item.count}
                </span>
              )}
              {/* Underline GOLD 2px sur active — overlay le hairline parent */}
              <span
                aria-hidden
                className="absolute left-0 right-0 bottom-0 transition-colors duration-150"
                style={{
                  height: 2,
                  background: isActive ? GOLD : 'transparent',
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
