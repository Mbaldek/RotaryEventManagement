// ScoringWeightsEditor — réglage des poids des 6 critères de notation.
//
// Paramètre de COMPÉTITION (édition), pas de session : monté dans l'onglet
// « Critères de notation » de CompetitionEditView. Les 6 critères sont fixes
// (note 0–5) ; seul leur poids (%) varie. La somme doit faire 100.
//
// Contrat (même forme que EligibilityRulesEditor) :
//   value    : map { criterionId: pct entier }  (ou null/incomplet → défaut)
//   onChange : (nextPctMap) => void
//   disabled : bool

import React, { useMemo } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { GOLD, NAVY, INK, MUTED, CREAM2 } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { CRITERIA, DEFAULT_WEIGHTS_PCT, getCriterion, weightsSumPct } from '@/lib/rsa/constants';

const TX = {
  title: { fr: 'Critères de notation', en: 'Scoring criteria', de: 'Bewertungskriterien' },
  hint: {
    fr: 'Les 6 critères sont fixes (note 0–5). Ajustez le poids de chacun pour cette compétition. La somme doit faire 100 %.',
    en: 'The 6 criteria are fixed (score 0–5). Adjust each weight for this competition. The total must be 100%.',
    de: 'Die 6 Kriterien sind fest (Bewertung 0–5). Passen Sie das Gewicht je Wettbewerb an. Summe = 100 %.',
  },
  total: { fr: 'Total', en: 'Total', de: 'Summe' },
  mustSum: { fr: 'La somme doit faire 100 %.', en: 'Total must be 100%.', de: 'Summe muss 100 % sein.' },
  reset: { fr: 'Réinitialiser (20/20/20/20/10/10)', en: 'Reset (20/20/20/20/10/10)', de: 'Zurücksetzen (20/20/20/20/10/10)' },
};

export default function ScoringWeightsEditor({ value, onChange, disabled = false }) {
  const { lang, t } = useLang();

  // Préremplissage : value valide sinon défaut standard.
  const pct = useMemo(() => {
    const base = { ...DEFAULT_WEIGHTS_PCT };
    if (value && typeof value === 'object') {
      for (const c of CRITERIA) {
        if (Number.isFinite(Number(value[c.id]))) base[c.id] = Number(value[c.id]);
      }
    }
    return base;
  }, [value]);

  const sum = weightsSumPct(pct);
  const valid = sum === 100;

  function setCriterion(id, v) {
    const n = Math.max(0, Math.min(100, Number(v) || 0));
    onChange?.({ ...pct, [id]: n });
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <SlidersHorizontal className="w-4 h-4" style={{ color: GOLD }} aria-hidden />
        <h3 className="text-[15px]" style={{ color: NAVY, fontWeight: 500 }}>{t(TX.title)}</h3>
      </div>
      <p className="text-[12.5px] mb-4" style={{ color: MUTED }}>{t(TX.hint)}</p>

      <div className="space-y-2 max-w-xl">
        {CRITERIA.map((raw) => {
          const c = getCriterion(raw, lang);
          return (
            <div key={raw.id} className="flex items-center gap-3">
              <label htmlFor={`cw_${raw.id}`} className="flex-1 text-[13px] truncate" style={{ color: INK }}>
                {c.label}
              </label>
              <div className="inline-flex items-center gap-1">
                <input
                  id={`cw_${raw.id}`}
                  type="number"
                  min={0}
                  max={100}
                  value={pct[raw.id] ?? 0}
                  disabled={disabled}
                  onChange={(e) => setCriterion(raw.id, e.target.value)}
                  className={`w-16 text-right text-[13px] tabular-nums rounded-[4px] px-2 py-1 disabled:opacity-60 ${FOCUS_RING_CLASS}`}
                  style={{ background: 'white', color: NAVY, border: `1px solid ${CREAM2}` }}
                />
                <span className="text-[12px]" style={{ color: MUTED }}>%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 max-w-xl" style={{ borderTop: `1px solid ${CREAM2}` }}>
        <span className="text-[12.5px]" style={{ color: valid ? NAVY : '#a23b2d' }}>
          {t(TX.total)} : <strong className="tabular-nums">{sum}%</strong>
          {!valid && <span className="ml-2">· {t(TX.mustSum)}</span>}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange?.({ ...DEFAULT_WEIGHTS_PCT })}
            className={`text-[12px] px-2.5 py-1.5 rounded-[4px] ${FOCUS_RING_CLASS}`}
            style={{ color: MUTED, border: `1px solid ${CREAM2}`, background: 'white' }}
          >
            {t(TX.reset)}
          </button>
        )}
      </div>
    </div>
  );
}
