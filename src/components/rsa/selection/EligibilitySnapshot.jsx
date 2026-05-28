// EligibilitySnapshot — read-only render of the eligibility JSONB snapshot stored
// at submission time. We NEVER re-evaluate here; this is the candidate's exact
// view at submit. Uses RULE_LABELS from candidature/i18n.js (SSOT).

import React from 'react';
import { Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { NAVY, INK, MUTED, SERIF, TINT_SAGE } from '@/components/design';
import {
  TINT_WARNING,
  TINT_DANGER,
  WARNING,
  DANGER,
  SUCCESS,
} from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { RULE_LABELS, UI, VERDICT_LABELS } from './i18n';
import { formatDateTime } from './constants';

const VERDICT_TONE = {
  eligible: { bg: TINT_SAGE,    accent: SUCCESS, Icon: CheckCircle2 },
  flagged:  { bg: TINT_WARNING, accent: WARNING, Icon: Info },
  excluded: { bg: TINT_DANGER,  accent: DANGER,  Icon: AlertTriangle },
};

function Chip({ behavior, label, detail }) {
  const isExclu = behavior === 'exclu';
  const bg = isExclu ? TINT_DANGER : TINT_WARNING;
  const dot = isExclu ? DANGER : WARNING;
  return (
    <li className="flex items-start gap-2 text-[13px]" style={{ color: INK }}>
      <span
        className="inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
        style={{ background: dot }}
        aria-hidden
      />
      <span>
        <span
          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] font-medium mr-1.5 align-middle"
          style={{ background: bg, color: NAVY }}
        >
          {label}
        </span>
        {detail || null}
      </span>
    </li>
  );
}

export default function EligibilitySnapshot({ eligibility }) {
  const { t, lang } = useLang();
  if (!eligibility || typeof eligibility !== 'object' || !Object.keys(eligibility).length) {
    return (
      <p className="text-[13px]" style={{ color: MUTED }}>
        {t(UI.noEffectiveDecision)}
      </p>
    );
  }

  const verdict = eligibility.verdict || 'flagged';
  const tone = VERDICT_TONE[verdict] || VERDICT_TONE.flagged;
  const Icon = tone.Icon;
  const failed = Array.isArray(eligibility.failed) ? eligibility.failed : [];
  const evaluatedAt = eligibility.evaluated_at
    ? formatDateTime(eligibility.evaluated_at, lang)
    : null;

  return (
    <section
      className="rounded-[4px] p-4"
      style={{ background: tone.bg, border: `1px solid ${tone.accent}33` }}
    >
      <div className="flex items-start gap-2.5">
        <Icon
          className="w-4.5 h-4.5 mt-0.5 shrink-0"
          style={{ color: tone.accent, width: 18, height: 18 }}
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <div
            className="text-[14px]"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {t(VERDICT_LABELS[verdict]) || verdict}
          </div>

          {failed.length > 0 && (
            <ul className="flex flex-col gap-1.5 mt-3 list-none m-0 p-0">
              {failed.map((c) => {
                const ruleLabel = t(RULE_LABELS[c.rule]) || c.rule;
                const behaviorLabel =
                  c.behavior === 'exclu' ? 'exclu' : c.behavior || 'flag';
                return (
                  <Chip
                    key={c.rule}
                    behavior={c.behavior}
                    label={`${ruleLabel} · ${behaviorLabel}`}
                    detail={c.detail || (c.missing ? `missing: ${c.missing.join(', ')}` : '')}
                  />
                );
              })}
            </ul>
          )}

          <p className="text-[11px] mt-3" style={{ color: MUTED }}>
            {evaluatedAt && (
              <span>{t(UI.snapshotComputedOn).replace('{date}', evaluatedAt)} · </span>
            )}
            {t(UI.rulesNote)}
          </p>
        </div>
      </div>
    </section>
  );
}
