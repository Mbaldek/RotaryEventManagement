// CriterionRating — Module 3 (« Espace Jury »).
//
// Port de src/components/rsa/CriterionRating.jsx (legacy 2026) restylé Élysée :
//   - segmented 0..5 buttons : hairline NAVY borders, fill NAVY pour le sélectionné,
//     focus ring GOLD ; plus d'amber-600/amber-700.
//   - weight chip : OCHRE tint (TINT_BEIGE / GOLD) au lieu de amber-50/amber-700.
//   - anchors panel : CREAM2 hairline, INK text, GOLD highlight pour la ligne sélectionnée.
//   - touch target ≥ 44px sur mobile (h-11 sm:h-10) — préservé du legacy.
//
// Le composant 2026 d'origine reste intact pour l'admin/archive (RsaScore.jsx…).
//
// Resolution i18n du criterion via getCriterion(c, lang) (SSOT @/lib/rsa/constants).

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import {
  NAVY,
  INK,
  GOLD,
  CREAM2,
  MUTED,
} from '@/components/design/tokens';
import { getCriterion } from '@/lib/rsa/constants';
import { useLang } from '@/lib/platform/i18n';
import { UI } from './i18n';

export default function CriterionRating({ criterion, value, onChange, disabled, weightPct: weightPctProp }) {
  const [open, setOpen] = useState(false);
  const { lang, t } = useLang();
  const c = getCriterion(criterion, lang);
  // Poids dynamique : `weightPct` fourni par le parent (poids de la session) sinon
  // le poids par défaut du critère.
  const weightPct = weightPctProp != null ? weightPctProp : Math.round((c.weight ?? 0) * 100);

  return (
    <div
      className="rounded-[4px]"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      <div className="flex items-start justify-between gap-3 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[14px]"
              style={{ color: NAVY, fontWeight: 500 }}
            >
              {c.label}
            </span>
            <span
              className="inline-flex items-center text-[10px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                color: NAVY,
                background: '#fdf6e8',
                border: `1px solid ${GOLD}`,
              }}
              aria-label={`Weight ${weightPct}%`}
            >
              {weightPct}%
            </span>
          </div>
          <p className="text-[12px] mt-0.5 leading-snug" style={{ color: INK }}>
            {c.desc}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="p-1 rounded outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] transition-colors"
          style={{ color: MUTED }}
          aria-label={t(UI.anchors)}
          aria-expanded={open}
        >
          {open ? (
            <ChevronUp className="w-4 h-4" aria-hidden />
          ) : (
            <ChevronDown className="w-4 h-4" aria-hidden />
          )}
        </button>
      </div>

      {/* 0..5 segmented buttons — hairline NAVY borders, fill NAVY pour le sélectionné. */}
      <div className="flex gap-1 px-3 pb-3" role="radiogroup" aria-label={c.label}>
        {[0, 1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange?.(n)}
              className="flex-1 min-w-0 h-11 sm:h-10 text-base sm:text-sm rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: selected ? NAVY : 'white',
                color: selected ? 'white' : NAVY,
                border: `1px solid ${selected ? NAVY : CREAM2}`,
                fontWeight: selected ? 600 : 500,
              }}
            >
              {n}
            </button>
          );
        })}
      </div>

      {open && (
        <div
          className="px-3 py-2 rounded-b-[4px]"
          style={{ borderTop: `1px solid ${CREAM2}`, background: '#fbf9f5' }}
        >
          <div
            className="flex items-center gap-1.5 text-[11px] mb-1.5"
            style={{ color: MUTED }}
          >
            <Info className="w-3 h-3" aria-hidden /> {t(UI.anchors)}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {[0, 1, 2, 3, 4, 5].map((n) => {
              const sel = value === n;
              return (
                <React.Fragment key={n}>
                  <dt
                    className="text-[12px] font-semibold"
                    style={{ color: sel ? GOLD : MUTED }}
                  >
                    {n}
                  </dt>
                  <dd
                    className="text-[12px] leading-snug"
                    style={{ color: sel ? NAVY : INK }}
                  >
                    {c.anchors?.[n] ?? ''}
                  </dd>
                </React.Fragment>
              );
            })}
          </dl>
        </div>
      )}
    </div>
  );
}
