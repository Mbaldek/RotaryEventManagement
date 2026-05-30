// Stepper — indicateur d'étapes du tunnel (desktop : rail cliquable ; mobile :
// « Étape 3 / 6 · Projet » + barre de progression fine). Toutes les étapes sont
// librement navigables (pas de gate en brouillon, cf. blueprint §2). Un point
// « incomplet » apparaît quand un champ requis de l'étape manque, sans bloquer.

import React from 'react';
import { Check } from 'lucide-react';
import { NAVY, GOLD, INK, MUTED, CREAM2, SERIF } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { STEPS } from './i18n';

export default function Stepper({ current, onStep, incompleteSteps = {} }) {
  const { t } = useLang();
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <nav aria-label={t({ fr: 'Étapes', en: 'Steps', de: 'Schritte' })} className="mb-7">
      {/* Mobile : compact + barre de progression */}
      <div className="md:hidden">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[11px] uppercase tracking-[0.14em] font-medium" style={{ color: MUTED }}>
            {t({ fr: 'Étape', en: 'Step', de: 'Schritt' })} {currentIndex + 1} / {STEPS.length}
          </span>
          <span className="text-[15px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
            {t(STEPS[currentIndex]?.label)}
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: CREAM2 }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / STEPS.length) * 100}%`, background: GOLD }}
          />
        </div>
      </div>

      {/* Desktop : rail d'étapes cliquables */}
      <ol className="hidden md:flex items-center gap-1 list-none m-0 p-0">
        {STEPS.map((step, i) => {
          const isCurrent = step.id === current;
          const isPast = i < currentIndex;
          const incomplete = incompleteSteps[step.id];
          return (
            <li key={step.id} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => onStep?.(step.id)}
                aria-current={isCurrent ? 'step' : undefined}
                className="group flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] rounded-[4px] px-1 py-1"
              >
                <span
                  className="relative inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold shrink-0 transition-colors"
                  style={{
                    background: isCurrent ? NAVY : isPast ? GOLD : 'transparent',
                    color: isCurrent ? 'white' : isPast ? NAVY : MUTED,
                    border: `1.5px solid ${isCurrent ? NAVY : isPast ? GOLD : CREAM2}`,
                  }}
                >
                  {isPast ? <Check className="w-3.5 h-3.5" aria-hidden /> : i + 1}
                  {incomplete && !isCurrent && (
                    <span
                      aria-hidden
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                      style={{ background: GOLD, border: '1.5px solid white' }}
                    />
                  )}
                </span>
                <span
                  className="text-[12px] font-medium whitespace-nowrap"
                  style={{ color: isCurrent ? NAVY : INK }}
                >
                  {t(step.label)}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <span className="flex-1 h-px mx-2" style={{ background: CREAM2 }} aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
