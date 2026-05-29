// FormulairesTab — onglet « Formulaires » du funnel d'édition compétition.
//
// Placé entre les onglets Prix et Finale dans CompetitionEditView. Permet à
// l'admin compétition d'ajouter des champs custom aux deux formulaires
// publics liés à cette compétition :
//   - Formulaire candidat startup   (custom_fields_candidate)
//   - Formulaire candidature jury   (custom_fields_jury)
//
// Le squelette obligatoire des formulaires (nom, email, etc.) reste géré
// ailleurs (CandidatureFunnel) — ce builder ne touche que la couche custom.
//
// Layout :
//   * Header éditorial (eyebrow gold + Playfair + intro courte).
//   * Sub-tabs light (souligné gold sur actif) entre "candidat" et "jury",
//     avec count badge.
//   * Body : <CustomFieldsBuilder kind=… fields=… onChange=… />.
//
// Les changements sont remontés au parent via onPatch({ custom_fields_*: … }) ;
// c'est useAutosaveCompetition qui persiste la nouvelle liste en base.

import React, { useCallback, useState } from 'react';
import { useLang } from '@/lib/platform/i18n';
import {
  CREAM2, GOLD, INK, MUTED, NAVY, SERIF,
} from '@/components/design/tokens';
import { GOLD_TEXT } from '@/components/design/tokens.app';
import { FORMULAIRES } from '../i18n';
import CustomFieldsBuilder from './CustomFieldsBuilder';

const SUB_TABS = [
  { id: 'candidate', dictKey: 'subTabCandidate', kind: 'candidate' },
  { id: 'jury',      dictKey: 'subTabJury',      kind: 'jury' },
];

// ── Sub-tabs (light style) ──────────────────────────────────────────────────
function SubTabsBar({ items, active, onChange, ariaLabel }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex flex-wrap items-end gap-x-6 gap-y-0 -mb-px"
      style={{ borderBottom: `1px solid ${CREAM2}` }}
    >
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`formulaires-subtab-${item.id}`}
            aria-selected={isActive}
            aria-controls={`formulaires-subpanel-${item.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.id)}
            className="group relative inline-flex items-center gap-2 shrink-0 px-1 py-2.5 text-[12.5px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] rounded-[2px]"
            style={{
              color: isActive ? NAVY : MUTED,
              fontWeight: isActive ? 500 : 400,
              background: 'transparent',
              border: 'none',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = INK;
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = MUTED;
            }}
          >
            <span>{item.label}</span>
            {typeof item.count === 'number' && (
              <span
                className="inline-flex items-center justify-center min-w-[20px] px-1.5 text-[10.5px] tabular-nums rounded-full"
                style={{
                  background: isActive ? '#fdf6e8' : '#f4f1ea',
                  color: isActive ? NAVY : MUTED,
                  border: `1px solid ${CREAM2}`,
                  lineHeight: '16px',
                  height: 16,
                }}
              >
                {item.count}
              </span>
            )}
            <span
              aria-hidden
              className="absolute left-0 right-0 bottom-0"
              style={{
                height: 1,
                background: isActive ? GOLD : 'transparent',
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

// ── Main tab ────────────────────────────────────────────────────────────────
export default function FormulairesTab({ values = {}, onPatch, disabled = false }) {
  const { t } = useLang();

  const [activeSub, setActiveSub] = useState('candidate');

  // Source the two custom-field lists from competition values. We support
  // both flat keys (custom_fields_candidate / custom_fields_jury) and a
  // nested forms_config bag for forward-compat with downstream schema.
  const candidateFields = Array.isArray(values.custom_fields_candidate)
    ? values.custom_fields_candidate
    : Array.isArray(values.forms_config?.candidate)
      ? values.forms_config.candidate
      : [];
  const juryFields = Array.isArray(values.custom_fields_jury)
    ? values.custom_fields_jury
    : Array.isArray(values.forms_config?.jury)
      ? values.forms_config.jury
      : [];

  const patchCandidate = useCallback((nextFields) => {
    onPatch?.({ custom_fields_candidate: nextFields });
  }, [onPatch]);

  const patchJury = useCallback((nextFields) => {
    onPatch?.({ custom_fields_jury: nextFields });
  }, [onPatch]);

  const items = SUB_TABS.map((s) => {
    const count = s.kind === 'candidate' ? candidateFields.length : juryFields.length;
    return {
      id:    s.id,
      label: t(FORMULAIRES[s.dictKey]),
      count,
      kind:  s.kind,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header section editorial */}
      <header className="space-y-2">
        <p
          className="uppercase tracking-[0.18em] text-[10.5px] font-medium"
          style={{ color: GOLD_TEXT }}
        >
          {t(FORMULAIRES.sectionEyebrow)}
        </p>
        <h3
          className="text-[20px] md:text-[22px] leading-tight"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 400 }}
        >
          {t(FORMULAIRES.sectionTitle)}
        </h3>
        <p className="text-[12.5px] max-w-[68ch]" style={{ color: INK }}>
          {t(FORMULAIRES.sectionIntro)}
        </p>
      </header>

      {/* Sub-tabs */}
      <SubTabsBar
        items={items}
        active={activeSub}
        onChange={setActiveSub}
        ariaLabel={t(FORMULAIRES.sectionTitle)}
      />

      {/* Builder body — switch by active sub-tab */}
      <div
        id={`formulaires-subpanel-${activeSub}`}
        role="tabpanel"
        aria-labelledby={`formulaires-subtab-${activeSub}`}
      >
        {activeSub === 'candidate' ? (
          <CustomFieldsBuilder
            kind="candidate"
            fields={candidateFields}
            onChange={patchCandidate}
            disabled={disabled}
          />
        ) : (
          <CustomFieldsBuilder
            kind="jury"
            fields={juryFields}
            onChange={patchJury}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
}
