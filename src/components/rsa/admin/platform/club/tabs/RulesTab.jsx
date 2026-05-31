// RulesTab (Club Cockpit) — onglet « Règles d'éligibilité » club-scoped.
//
// Édite la colonne edition_clubs.eligibility_rules pour le couple
// (edition, club). Format JSON identique à editions.eligibility_rules :
//   { country: { behavior: 'exclu'|'flag'|'none', ... }, created_after: {...}, ... }
//
// Deux régimes selon edition.model :
//   - 'multiclub' → MODE HÉRITAGE : les règles sont fixées au niveau de la
//     compétition (edition.eligibility_rules). Le club en hérite et ne stocke
//     qu'un override SPARSE (seulement les critères surchargés). Bandeau d'équité
//     inter-clubs + compteur de divergence. Cf. blueprint §5 / §5.1.
//   - 'monoclub' (ou modèle absent) → édition pleine, comportement legacy inchangé.
//
// V2.5 : on délègue toute l'édition au composant <EligibilityRulesEditor>
// (liste lisible de critères, plus de textarea JSON brut). L'attache via
// rsa_attach_club_to_edition est idempotente (ON CONFLICT côté SQL) — sert
// aussi de UPSERT des eligibility_rules. En mode héritage on n'enregistre QUE
// l'objet sparse.

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { CREAM, CREAM2, NAVY, MUTED, INK, GOLD, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { GOLD_TEXT } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import EligibilityRulesEditor from '@/components/rsa/eligibility/EligibilityRulesEditor';
import { UI } from '../../i18n';
import { CLUB_RULES } from '../i18n';
import { useEditionClubAttachment, useSaveClubEligibilityRules } from '../useClub';

export default function RulesTab({ edition, clubId }) {
  const { t } = useLang();
  const attachmentQ = useEditionClubAttachment(edition?.id, clubId);
  const save = useSaveClubEligibilityRules(edition?.id, clubId);

  const isMulticlub = edition?.model === 'multiclub';
  // Règles de la compétition (SSOT) — héritées par le club en mode multiclub.
  const inheritedValue = useMemo(() => {
    const r = edition?.eligibility_rules;
    return r && typeof r === 'object' && !Array.isArray(r) ? r : {};
  }, [edition?.eligibility_rules]);

  const [rules, setRules] = useState({});
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Rehydrate quand l'attachement charge / change (rétro-coup à un autre cockpit
  // ayant modifié les règles via le master). En mode héritage, `rules` = override
  // SPARSE ; en mode legacy, l'ensemble complet.
  useEffect(() => {
    setRules(attachmentQ.data?.eligibility_rules || {});
    setDirty(false);
    setFeedback(null);

  }, [attachmentQ.data?.edition_id, attachmentQ.data?.club_id]);

  function onRulesChange(nextRules) {
    setRules(nextRules || {});
    setDirty(true);
    setFeedback(null);
  }

  async function onSave() {
    try {
      // En mode héritage, `rules` est déjà l'objet sparse — on l'enregistre tel quel.
      await save.mutateAsync({ eligibilityRules: rules || {} });
      setDirty(false);
      setFeedback({ kind: 'ok', message: t(CLUB_RULES.saved) });
    } catch (err) {
      setFeedback({ kind: 'err', message: err?.message || 'Error' });
    }
  }

  // Labels d'héritage déjà localisés, passés au composant générique (qui ne
  // dépend pas du module i18n du club).
  const inheritanceLabels = useMemo(() => ({
    badgeInherited: t(CLUB_RULES.badgeInherited),
    badgeOverridden: t(CLUB_RULES.badgeOverridden),
    badgeClubDisabled: t(CLUB_RULES.badgeClubDisabled),
    override: t(CLUB_RULES.override),
    restore: t(CLUB_RULES.restore),
    disable: t(CLUB_RULES.disable),
    competitionValue: t(CLUB_RULES.competitionValue),
    competitionOff: t(CLUB_RULES.competitionOff),
    overrideWarning: t(CLUB_RULES.overrideWarning),
  }), [t]);

  // Compteur de divergence = nombre de critères présents dans l'override sparse.
  const divergentCount = isMulticlub && rules && typeof rules === 'object'
    ? Object.keys(rules).length
    : 0;
  const divergentLabel = divergentCount === 0
    ? t(CLUB_RULES.divergentNone)
    : `${divergentCount} ${divergentCount === 1 ? t(CLUB_RULES.divergentSuffixOne) : t(CLUB_RULES.divergentSuffixMany)}`;

  if (!edition) {
    return (
      <div
        className="rounded-[4px] p-6 text-center"
        style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
      >
        <p className="text-[13px]" style={{ color: MUTED }}>{t(UI.loading)}</p>
      </div>
    );
  }

  return (
    <section
      className="rounded-[4px] p-5 mb-6"
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
    >
      <header className="mb-4 flex items-center gap-3 flex-wrap">
        <h3
          className="text-[18px]"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(UI.edition)} · {edition.name}
        </h3>
        {isMulticlub && (
          <span className="uppercase tracking-[0.14em] text-[10.5px]" style={{ color: MUTED }}>
            {t(CLUB_RULES.inheritEyebrow)} · {edition.name}
          </span>
        )}
        <span className="uppercase tracking-[0.14em] text-[10.5px] ml-auto" style={{ color: GOLD }}>
          {clubId}
        </span>
      </header>

      {isMulticlub ? (
        // Bandeau d'héritage : filet gold, message d'équité multiclub (muted).
        <div
          className="rounded-[4px] p-4 mb-4"
          style={{ background: CREAM, borderLeft: `2px solid ${GOLD}`, border: `1px solid ${CREAM2}` }}
        >
          <p className="text-[12.5px]" style={{ color: INK }}>{t(CLUB_RULES.inheritBanner)}</p>
        </div>
      ) : (
        <p className="text-[13px] mb-4" style={{ color: INK }}>{t(CLUB_RULES.intro)}</p>
      )}

      {attachmentQ.isLoading && (
        <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: GOLD }} /></div>
      )}

      {!attachmentQ.isLoading && !attachmentQ.data && (
        <div className="rounded-[4px] p-3 mb-4" style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}`, color: INK }}>
          <p className="text-[12.5px]">{t(CLUB_RULES.notAttached)}</p>
        </div>
      )}

      {isMulticlub ? (
        <EligibilityRulesEditor
          mode="inheritance"
          inheritedValue={inheritedValue}
          value={rules}
          onChange={onRulesChange}
          disabled={!attachmentQ.data}
          inheritanceLabels={inheritanceLabels}
        />
      ) : (
        <EligibilityRulesEditor
          value={rules}
          onChange={onRulesChange}
          disabled={!attachmentQ.data}
        />
      )}

      <div className="mt-5 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || save.isPending || !attachmentQ.data}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50"
          style={{ background: NAVY, color: 'white' }}
        >
          {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {save.isPending ? t(UI.saving) : t(UI.save)}
        </button>
        {isMulticlub && (
          <span
            className="text-[12px] tabular-nums"
            style={{ color: divergentCount === 0 ? MUTED : GOLD_TEXT }}
          >
            {divergentLabel}
          </span>
        )}
        {feedback?.kind === 'ok' && (
          <span className="text-[12.5px]" style={{ color: '#1d6b4f' }}>{feedback.message}</span>
        )}
        {feedback?.kind === 'err' && (
          <span className="text-[12.5px]" style={{ color: '#a23b2d' }}>{feedback.message}</span>
        )}
      </div>
    </section>
  );
}
