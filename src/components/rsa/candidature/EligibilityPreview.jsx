// EligibilityPreview — panneau d'éligibilité informatif, NON bloquant (blueprint §5).
//
// Recalcule à la volée via evaluateEligibility (fonction pure). Affiche le verdict
// (eligible/flagged/excluded) en bannière teintée + une puce par échec (chip warning
// pour 'exclu', chip info pour 'flag'). N'empêche JAMAIS la soumission. `onlyRules`
// permet de filtrer pour un affichage inline par étape.
//
// Règles EFFECTIVES (blueprint §4) : la preview évalue contre compétition ⊕ override
// du club choisi. Tant qu'aucun club n'est sélectionné (startup.club_id vide), seules
// les règles compétition s'appliquent ; dès qu'un club est choisi, on fusionne son
// override (edition_clubs.eligibility_rules) via mergeEligibilityRules. Le merge ne
// touche RIEN si le club n'a pas d'override (monoclub / sparse vide).

import React, { useMemo } from 'react';
import { Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { NAVY, INK, MUTED, SERIF } from '@/components/design';
import { TINT_SAGE } from '@/components/design/tokens';
import { TINT_WARNING, TINT_DANGER, WARNING, DANGER, SUCCESS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { evaluateEligibility, mergeEligibilityRules } from '@/lib/rsa/eligibility';
import { useClubRuleOverride } from './useCandidature';
import { RULE_LABELS, VERDICT_COPY, ELIGIBILITY_TITLE, FLAG_CHIP, EXCLU_CHIP } from './i18n';

const VERDICT_TONE = {
  eligible: { bg: TINT_SAGE, accent: SUCCESS, Icon: CheckCircle2 },
  flagged: { bg: TINT_WARNING, accent: WARNING, Icon: Info },
  excluded: { bg: TINT_DANGER, accent: DANGER, Icon: AlertTriangle },
};

function Chip({ behavior, label, detail }) {
  const isExclu = behavior === 'exclu';
  const bg = isExclu ? TINT_DANGER : TINT_WARNING;
  const dot = isExclu ? DANGER : WARNING;
  return (
    <li className="flex items-start gap-2 text-[13px]" style={{ color: INK }}>
      <span className="inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: dot }} aria-hidden />
      <span>
        <span
          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] font-medium mr-1.5 align-middle"
          style={{ background: bg, color: NAVY }}
        >
          {label}
        </span>
        {detail}
      </span>
    </li>
  );
}

export default function EligibilityPreview({ startup, rules, editionId, onlyRules, compact = false, className = '' }) {
  const { t } = useLang();

  // Club choisi par le candidat (StepClub persiste startups.club_id). Avant le
  // choix → null → aucun override fetché (hook désactivé via enabled).
  // L'édition vient du prop si fourni, sinon de la ligne startups (edition_id),
  // de sorte que la preview reste autonome dans chaque étape du funnel.
  const resolvedEditionId = editionId || startup?.edition_id || null;
  const clubId = startup?.club_id || null;
  const { data: clubOverride } = useClubRuleOverride(resolvedEditionId, clubId);

  // Règles effectives = compétition ⊕ override club. On NE fusionne que s'il y a
  // réellement un override : sinon on laisse `rules` tel quel (préserve le repli
  // `undefined` -> DEFAULT_RULES_2026 d'evaluateEligibility).
  const effectiveRules = useMemo(() => {
    if (!clubOverride || Object.keys(clubOverride).length === 0) return rules;
    return mergeEligibilityRules(rules, clubOverride);
  }, [rules, clubOverride]);

  const result = useMemo(() => evaluateEligibility(startup || {}, effectiveRules), [startup, effectiveRules]);

  const failed = onlyRules
    ? result.failed.filter((c) => onlyRules.includes(c.rule))
    : result.failed;

  // En mode inline (onlyRules) : on ne montre rien s'il n'y a pas d'échec pertinent.
  if (onlyRules && failed.length === 0) return null;

  // Verdict effectif pour la teinte (en inline, dérivé des échecs filtrés).
  const verdict = onlyRules
    ? failed.some((c) => c.behavior === 'exclu')
      ? 'excluded'
      : failed.length
        ? 'flagged'
        : 'eligible'
    : result.verdict;

  const tone = VERDICT_TONE[verdict] || VERDICT_TONE.flagged;
  const copy = VERDICT_COPY[verdict];
  const { Icon } = tone;

  return (
    <section
      className={`rounded-[4px] p-4 ${className}`}
      style={{ background: tone.bg, border: `1px solid ${tone.accent}33` }}
      aria-label={t(ELIGIBILITY_TITLE)}
    >
      <div className="flex items-start gap-2.5">
        <Icon className="w-4.5 h-4.5 mt-0.5 shrink-0" style={{ color: tone.accent, width: 18, height: 18 }} aria-hidden />
        <div className="flex-1 min-w-0">
          {!compact && (
            <div className="text-[10px] uppercase tracking-[0.14em] font-medium mb-0.5" style={{ color: MUTED }}>
              {t(ELIGIBILITY_TITLE)}
            </div>
          )}
          <div className="text-[14px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
            {t(copy?.title)}
          </div>
          <p className="text-[13px] leading-relaxed mt-1" style={{ color: INK }}>
            {t(copy?.body)}
          </p>

          {failed.length > 0 && (
            <ul className="flex flex-col gap-1.5 mt-3 list-none m-0 p-0">
              {failed.map((c) => (
                <Chip
                  key={c.rule}
                  behavior={c.behavior}
                  label={`${t(RULE_LABELS[c.rule]) || c.rule} · ${c.behavior === 'exclu' ? t(EXCLU_CHIP) : t(FLAG_CHIP)}`}
                  detail={c.detail}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
