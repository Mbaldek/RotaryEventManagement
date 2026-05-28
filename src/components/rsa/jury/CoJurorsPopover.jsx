// CoJurorsPopover — petit panel détaillant la liste des co-jurés assignés à la
// session courante (display name = profiles.full_name + qualité + organisation).
//
// Toggle controlled (open / onClose). Render inline (pas de portal Radix — keep simple).

import React from 'react';
import { X, User } from 'lucide-react';
import { NAVY, INK, MUTED, GOLD, CREAM2, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { UI } from './i18n';

export default function CoJurorsPopover({
  open,
  onClose,
  // Array de { user_id, display_name, qualite, organisation }
  jurors = [],
}) {
  const { t } = useLang();
  if (!open) return null;

  return (
    <div
      className="rounded-[4px] p-4 mt-2"
      style={{
        background: '#fbf9f5',
        border: `1px solid ${CREAM2}`,
      }}
      role="region"
      aria-label={t(UI.coJurorsTitle)}
    >
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h4
          className="text-[13px] uppercase tracking-[0.1em] font-medium"
          style={{ color: GOLD }}
        >
          {t(UI.coJurorsTitle)}
        </h4>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ color: MUTED }}
            aria-label="close"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        )}
      </div>
      {jurors.length === 0 ? (
        <p className="text-[12px]" style={{ color: MUTED }}>
          {t(UI.coJurorsEmpty)}
        </p>
      ) : (
        <ul className="flex flex-col gap-1 list-none m-0 p-0">
          {jurors.map((j) => (
            <li key={j.user_id || j.email} className="flex items-start gap-2.5 py-1">
              <User className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: MUTED }} aria-hidden />
              <div className="flex-1 min-w-0">
                <div
                  className="text-[13px] truncate"
                  style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
                >
                  {j.display_name || j.email || '—'}
                </div>
                {(j.qualite || j.organisation) && (
                  <div className="text-[11px]" style={{ color: INK }}>
                    {[j.qualite, j.organisation].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
