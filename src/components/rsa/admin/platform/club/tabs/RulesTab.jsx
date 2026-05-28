// RulesTab (Club Cockpit) — onglet « Règles d'éligibilité » club-scoped.
//
// Édite la colonne edition_clubs.eligibility_rules pour le couple
// (edition, club). Format JSON identique à editions.eligibility_rules :
//   { country: { behavior: 'exclu'|'flag'|'none', ... }, created_after: {...}, ... }
//
// On réutilise délibérément le pattern textarea+preview de EditionEditor (RULE_LABELS
// importé depuis candidature/i18n) : un club_admin sait déjà déchiffrer ces règles
// puisqu'il les voit dans l'aperçu candidat. On ne ré-implémente PAS une UI
// dédiée par règle pour V2 (le master cockpit ouvre la voie sur EditionEditor —
// futur V2.1 : factoriser EligibilityRulesEditor en composant partagé).
//
// L'attache via rsa_attach_club_to_edition est idempotente (ON CONFLICT côté SQL)
// — sert aussi de UPSERT des eligibility_rules.

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { CREAM2, NAVY, MUTED, INK, GOLD, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { RULE_LABELS } from '@/components/rsa/candidature/i18n';
import { UI } from '../../i18n';
import { CLUB_RULES } from '../i18n';
import { useEditionClubAttachment, useSaveClubEligibilityRules } from '../useClub';

function FieldLabel({ children, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block uppercase tracking-[0.14em] text-[10.5px] mb-1.5"
      style={{ color: MUTED }}
    >
      {children}
    </label>
  );
}

export default function RulesTab({ edition, clubId }) {
  const { t } = useLang();
  const attachmentQ = useEditionClubAttachment(edition?.id, clubId);
  const save = useSaveClubEligibilityRules(edition?.id, clubId);

  const [rulesText, setRulesText] = useState('{}');
  const [rulesError, setRulesError] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Rehydrate quand l'attachement charge / change (rétro-coup à un autre cockpit
  // ayant modifié les règles via le master).
  useEffect(() => {
    if (!attachmentQ.data) {
      setRulesText('{}');
    } else {
      setRulesText(JSON.stringify(attachmentQ.data.eligibility_rules || {}, null, 2));
    }
    setDirty(false);
    setFeedback(null);
    setRulesError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentQ.data?.edition_id, attachmentQ.data?.club_id]);

  const parsedRules = useMemo(() => {
    if (!rulesText || !rulesText.trim()) return {};
    try {
      const v = JSON.parse(rulesText);
      if (typeof v !== 'object' || Array.isArray(v) || v === null) throw new Error('not_object');
      return v;
    } catch {
      return null;
    }
  }, [rulesText]);

  function onRulesChange(v) {
    setRulesText(v);
    setDirty(true);
    setFeedback(null);
    try {
      const parsed = JSON.parse(v);
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        throw new Error('not_object');
      }
      setRulesError(null);
    } catch {
      setRulesError(t(CLUB_RULES.invalidJson));
    }
  }

  async function onSave() {
    if (rulesError || parsedRules == null) return;
    try {
      await save.mutateAsync({ eligibilityRules: parsedRules });
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
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <p className="text-[13px]" style={{ color: MUTED }}>{t(UI.loading)}</p>
      </div>
    );
  }

  return (
    <section
      className="rounded-[4px] p-5 mb-6"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="club-rules">JSON</FieldLabel>
          <textarea
            id="club-rules"
            rows={14}
            value={rulesText}
            onChange={(e) => onRulesChange(e.target.value)}
            className="w-full text-[12px] font-mono rounded-[4px] px-2.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ background: 'white', border: `1px solid ${rulesError ? '#a23b2d' : CREAM2}`, color: NAVY }}
            disabled={!attachmentQ.data}
          />
          <p className="mt-1 text-[11px]" style={{ color: rulesError ? '#a23b2d' : MUTED }}>
            {rulesError || 'country / created_after / revenue_max / raised_max / founders_majority / registration / docs_required'}
          </p>
        </div>
        <div>
          <FieldLabel>Preview</FieldLabel>
          <ul className="text-[12.5px] space-y-1.5" style={{ color: INK }}>
            {parsedRules && Object.keys(parsedRules).length === 0 && (
              <li className="text-[12px]" style={{ color: MUTED }}>—</li>
            )}
            {parsedRules && Object.entries(parsedRules).map(([key, val]) => {
              const labelDict = RULE_LABELS[key];
              const labelTxt = labelDict ? t(labelDict) : key;
              const behavior = val?.behavior || '—';
              return (
                <li key={key} className="flex items-baseline gap-2">
                  <span className="font-medium" style={{ color: NAVY }}>{labelTxt}</span>
                  <span style={{ color: MUTED }}>·</span>
                  <span style={{ color: behavior === 'exclu' ? '#a23b2d' : '#9a6400' }}>{behavior}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || save.isPending || !!rulesError || !attachmentQ.data}
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
