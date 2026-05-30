// RulesTab (Club Cockpit) — onglet « Règles d'éligibilité » club-scoped.
//
// Édite la colonne edition_clubs.eligibility_rules pour le couple
// (edition, club). Format JSON identique à editions.eligibility_rules :
//   { country: { behavior: 'exclu'|'flag'|'none', ... }, created_after: {...}, ... }
//
// V2.5 : on délègue toute l'édition au composant <EligibilityRulesEditor>
// (liste lisible de critères, plus de textarea JSON brut). L'attache via
// rsa_attach_club_to_edition est idempotente (ON CONFLICT côté SQL) — sert
// aussi de UPSERT des eligibility_rules.

import React, { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { CREAM2, NAVY, MUTED, INK, GOLD, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import EligibilityRulesEditor from '@/components/rsa/eligibility/EligibilityRulesEditor';
import { UI } from '../../i18n';
import { CLUB_RULES } from '../i18n';
import { useEditionClubAttachment, useSaveClubEligibilityRules } from '../useClub';

export default function RulesTab({ edition, clubId }) {
  const { t } = useLang();
  const attachmentQ = useEditionClubAttachment(edition?.id, clubId);
  const save = useSaveClubEligibilityRules(edition?.id, clubId);

  const [rules, setRules] = useState({});
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Rehydrate quand l'attachement charge / change (rétro-coup à un autre cockpit
  // ayant modifié les règles via le master).
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
      await save.mutateAsync({ eligibilityRules: rules || {} });
      setDirty(false);
      setFeedback({ kind: 'ok', message: t(CLUB_RULES.saved) });
    } catch (err) {
      setFeedback({ kind: 'err', message: err?.message || 'Error' });
    }
  }

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
        <span className="uppercase tracking-[0.14em] text-[10.5px]" style={{ color: GOLD }}>
          {clubId}
        </span>
      </header>

      <p className="text-[13px] mb-4" style={{ color: INK }}>{t(CLUB_RULES.intro)}</p>

      {attachmentQ.isLoading && (
        <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: GOLD }} /></div>
      )}

      {!attachmentQ.isLoading && !attachmentQ.data && (
        <div className="rounded-[4px] p-3 mb-4" style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}`, color: INK }}>
          <p className="text-[12.5px]">{t(CLUB_RULES.notAttached)}</p>
        </div>
      )}

      <EligibilityRulesEditor
        value={rules}
        onChange={onRulesChange}
        disabled={!attachmentQ.data}
      />

      <div className="mt-5 flex items-center gap-3">
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
