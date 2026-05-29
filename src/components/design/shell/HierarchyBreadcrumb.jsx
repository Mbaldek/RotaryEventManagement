// HierarchyBreadcrumb — fil d'ariane Élysée pour la hiérarchie Compétition ▸ Club.
//
// Source de vérité : le scope URL (?scope=master | competition:{eid} | club:{eid}/{cid}).
// Le composant lui-même est dumb : il rend une liste d'items, le parent (Admin.jsx
// via useHierarchyScope) calcule les labels et les handlers onClick.
//
// Design : Eyebrow GOLD uppercase 11px tracking-0.14em. Séparateur `▸` GOLD opacité 0.7.
// Items navigables = boutons MUTED hover underline ; item courant = NAVY aria-current="page".
//
// A11y :
//   * <nav aria-label="Hiérarchie"> + <ol>
//   * chaque parent un <button type="button"> focusable au clavier
//   * dernier item porte aria-current="page"

import React from 'react';
import { GOLD, NAVY, MUTED } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';

const ARIA_LABEL = {
  fr: 'Hiérarchie',
  en: 'Hierarchy',
  de: 'Hierarchie',
};

export default function HierarchyBreadcrumb({ items }) {
  const { t } = useLang();
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <nav aria-label={t(ARIA_LABEL)} className="mb-4">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 list-none m-0 p-0">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const key = `${item.label}-${i}`;
          return (
            <li key={key} className="inline-flex items-center gap-2">
              {i > 0 && (
                <span
                  aria-hidden
                  className="text-[11px]"
                  style={{ color: GOLD, opacity: 0.7 }}
                >
                  {'▸'}
                </span>
              )}
              {isLast || typeof item.onClick !== 'function' ? (
                <span
                  className="uppercase tracking-[0.14em] text-[11px] font-medium"
                  style={{ color: isLast ? NAVY : MUTED }}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={item.onClick}
                  className={`uppercase tracking-[0.14em] text-[11px] font-medium rounded-[2px] hover:underline underline-offset-2 ${FOCUS_RING_CLASS}`}
                  style={{ color: MUTED, background: 'transparent' }}
                >
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
