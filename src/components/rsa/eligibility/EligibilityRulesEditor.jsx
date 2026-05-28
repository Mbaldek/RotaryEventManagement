// EligibilityRulesEditor — liste lisible des critères d'éligibilité, en
// remplacement du `<textarea>` JSON brut de V2 (Master Cockpit + Club Cockpit).
//
// Pour chaque critère du catalogue (catalog.js), une carte Élysée hairline gold :
//   ┌─────────────────────────────────────────────────────────────────────────┐
//   │ [Toggle on/off]   Label en clair                       [Active/Inactif] │
//   │                   Description courte                                    │
//   │                                                                         │
//   │  Paramètres (si activé)               Comportement (Select exclu/flag)  │
//   └─────────────────────────────────────────────────────────────────────────┘
//
// V2.5+ — pivot `docs_required` : la card affiche une LISTE de lignes par
// document, chacune avec son propre toggle + son propre Select behavior. Le
// critère est globalement "actif" SSI au moins un doc est demandé.
//
//   ─── Documents demandés au candidat ─────────
//   [ ✓ ] Pitch deck (PDF)            [ exclu ▼ ]   ← bloquant
//   [ ✓ ] Executive summary           [ flag ▼ ]   ← warning comité
//   [ ✓ ] États financiers            [ flag ▼ ]
//   [ ✗ ] Vidéo de pitch              [ — ]        ← pas demandé du tout
//
// On RÉUTILISE les composants design/form (Field, TextInput, DateField, Select,
// TagSelect) — pas de re-style ad hoc. Le JSON produit est strictement
// compatible avec le format historique consommé par rsa_evaluate_eligibility.
//
// Pattern d'usage :
//   <EligibilityRulesEditor
//     value={form.eligibility_rules}
//     onChange={(v) => setForm({...form, eligibility_rules: v})}
//     disabled={!canEdit}
//   />
//
// Bonus : un toggle "Mode avancé (JSON)" expose un aperçu JSON brut en
// read-only (fallback dev/QA), sans jamais redonner la main au textarea.

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import {
  CREAM, CREAM2, NAVY, MUTED, INK, GOLD, SERIF, EASE,
} from '@/components/design/tokens';
import { DANGER, WARNING } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import Field from '@/components/design/form/Field';
import TextInput from '@/components/design/form/TextInput';
import Select from '@/components/design/form/Select';
import DateField from '@/components/design/form/DateField';
import TagSelect from '@/components/design/form/TagSelect';
import {
  CRITERIA, rulesToState, stateToRules, DOC_CATALOG, docsAnyEnabled,
} from './catalog';
import {
  UI, CRITERIA as I18N_CRITERIA, COUNTRIES, DOCS,
} from './i18n';

// ── Toggle Élysée (chip on/off, ARIA switch) ─────────────────────────────────
function StatusToggle({ active, disabled, onToggle, labelOn, labelOff }) {
  const label = active ? labelOn : labelOff;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={() => !disabled && onToggle(!active)}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] uppercase tracking-[0.14em] font-medium transition-all duration-200 ease-out active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-[#faf7f2] disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        background: active ? NAVY : 'white',
        border: `1px solid ${active ? NAVY : CREAM2}`,
        color: active ? 'white' : MUTED,
      }}
    >
      {active && <Check className="w-3 h-3" aria-hidden />}
      {label}
    </button>
  );
}

// ── DocRequirementRow (V2.5+) ────────────────────────────────────────────────
// Une ligne par document du catalogue. Toggle gauche, label + hint au milieu,
// Select inline behavior à droite (grisé/masqué si la ligne est désactivée).
//
// Le pattern reprend la signature visuelle des cartes critères (chip Élysée +
// chip behavior à droite) pour rester cohérent avec le reste de l'éditeur.
function DocRequirementRow({ i18nDoc, enabled, behavior, disabled, onToggle, onBehavior, t }) {
  const behaviorColor = behavior === 'exclu' ? DANGER : WARNING;
  return (
    <li
      className="flex items-center gap-3 px-3 py-2.5 rounded-[4px] transition-all duration-200 ease-out"
      style={{
        background: enabled ? 'white' : CREAM,
        border: `1px solid ${enabled ? GOLD : CREAM2}`,
      }}
    >
      <StatusToggle
        active={enabled}
        disabled={disabled}
        onToggle={(next) => onToggle(next)}
        labelOn={t(I18N_CRITERIA.docs_required.requested)}
        labelOff={t(I18N_CRITERIA.docs_required.notRequested)}
      />
      <div className="min-w-0 flex-1">
        <div
          className="text-[14px] leading-tight"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(i18nDoc.label)}
        </div>
        {i18nDoc.hint && (
          <div className="mt-0.5 text-[12px]" style={{ color: INK }}>
            {t(i18nDoc.hint)}
          </div>
        )}
      </div>
      <div className="w-[160px] shrink-0">
        {enabled ? (
          <Select
            value={behavior}
            onChange={(e) => onBehavior(e.target.value)}
            disabled={disabled}
            options={[
              { value: 'exclu', label: t(UI.behaviorExclu) },
              { value: 'flag', label: t(UI.behaviorFlag) },
            ]}
          />
        ) : (
          <div
            className="text-[12px] uppercase tracking-[0.14em] text-center py-2 rounded-[4px]"
            style={{
              background: CREAM,
              border: `1px dashed ${CREAM2}`,
              color: MUTED,
            }}
            aria-hidden
          >
            —
          </div>
        )}
      </div>
      {enabled && (
        <span
          className="hidden sm:inline uppercase tracking-[0.14em] text-[10.5px] px-2 py-0.5 rounded-full whitespace-nowrap shrink-0"
          style={{ background: 'white', border: `1px solid ${CREAM2}`, color: behaviorColor }}
        >
          {behavior === 'exclu' ? t(UI.behaviorExclu) : t(UI.behaviorFlag)}
        </span>
      )}
    </li>
  );
}

// ── Renderer générique des paramètres d'un critère ───────────────────────────
function CriterionParams({ def, params, disabled, onChange, t }) {
  switch (def.param) {
    case 'tags': {
      const i18nDict = I18N_CRITERIA[def.key];
      return (
        <Field
          label={t(i18nDict.paramLabel)}
          helper={t(i18nDict.paramHelp)}
        >
          {({ id }) => (
            <TagSelect
              id={id}
              value={params.allowed || []}
              onChange={(next) => onChange({ ...params, allowed: next })}
              options={COUNTRIES.map((c) => ({ value: c.value, label: t(c.label) }))}
              placeholder={t(i18nDict.placeholder)}
              disabled={disabled}
            />
          )}
        </Field>
      );
    }
    case 'date': {
      const i18nDict = I18N_CRITERIA[def.key];
      return (
        <Field
          label={t(i18nDict.paramLabel)}
          helper={t(i18nDict.paramHelp)}
        >
          {({ id }) => (
            <DateField
              id={id}
              value={params.date || ''}
              onChange={(e) => onChange({ ...params, date: e.target.value })}
              disabled={disabled}
            />
          )}
        </Field>
      );
    }
    case 'number': {
      const i18nDict = I18N_CRITERIA[def.key];
      return (
        <Field
          label={t(i18nDict.paramLabel)}
          helper={t(i18nDict.paramHelp)}
        >
          {({ id }) => (
            <TextInput
              id={id}
              type="number"
              min={0}
              step={1000}
              value={params.threshold ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                const n = v === '' ? 0 : Number(v);
                onChange({ ...params, threshold: Number.isFinite(n) ? n : 0 });
              }}
              disabled={disabled}
            />
          )}
        </Field>
      );
    }
    case 'docs': {
      // V2.5+ : on rend une LISTE de DocRequirementRow. Chaque doc a son
      // propre toggle + behavior. `params.docs` = { [key]: { behavior } }.
      const docsState = params.docs && typeof params.docs === 'object' ? params.docs : {};
      const docsByKey = Object.fromEntries(DOCS.map((d) => [d.value, d]));
      const setDoc = (key, next) => {
        const nextDocs = { ...docsState };
        if (next === null) delete nextDocs[key];
        else nextDocs[key] = next;
        onChange({ ...params, docs: nextDocs });
      };
      return (
        <div>
          <ul className="flex flex-col gap-2 list-none m-0 p-0">
            {DOC_CATALOG.map((docDef) => {
              const i18nDoc = docsByKey[docDef.key];
              if (!i18nDoc) return null;
              const entry = docsState[docDef.key];
              const enabled = !!entry;
              const behavior = entry?.behavior || docDef.defaultBehavior;
              return (
                <DocRequirementRow
                  key={docDef.key}
                  i18nDoc={i18nDoc}
                  enabled={enabled}
                  behavior={behavior}
                  disabled={disabled}
                  t={t}
                  onToggle={(next) => {
                    if (next) setDoc(docDef.key, { behavior: docDef.defaultBehavior });
                    else setDoc(docDef.key, null);
                  }}
                  onBehavior={(beh) => setDoc(docDef.key, { behavior: beh })}
                />
              );
            })}
          </ul>
          {!docsAnyEnabled(docsState) && (
            <p className="mt-2 text-[12px]" style={{ color: MUTED }}>
              {t(I18N_CRITERIA.docs_required.emptyHint)}
            </p>
          )}
        </div>
      );
    }
    case 'none':
    default:
      return (
        <p className="text-[12px]" style={{ color: MUTED }}>{t(UI.noParams)}</p>
      );
  }
}

// ── Carte critère ────────────────────────────────────────────────────────────
function CriterionCard({ def, node, disabled, onChangeNode, t }) {
  const i18nDict = I18N_CRITERIA[def.key];
  const enabled = !!node.enabled;
  const behaviorColor = node.behavior === 'exclu' ? DANGER : WARNING;
  const isDocs = def.key === 'docs_required';

  return (
    <article
      className="rounded-[4px] p-4 transition-all duration-200 ease-out"
      style={{
        background: 'white',
        border: `1px solid ${enabled ? GOLD : CREAM2}`,
        opacity: enabled ? 1 : 0.92,
      }}
    >
      <header className="flex items-start gap-3 flex-wrap">
        <StatusToggle
          active={enabled}
          disabled={disabled}
          onToggle={(next) => onChangeNode({ ...node, enabled: next })}
          labelOn={t(UI.active)}
          labelOff={t(UI.inactive)}
        />
        <div className="min-w-0 flex-1">
          <h4
            className="text-[15px] leading-tight"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {t(i18nDict.label)}
          </h4>
          <p className="mt-1 text-[12.5px]" style={{ color: INK }}>
            {t(i18nDict.desc)}
          </p>
        </div>
        {/* Pour les critères classiques : chip behavior à droite.
            Pour docs_required : pas de behavior unique — chaque ligne le porte. */}
        {enabled && !isDocs && (
          <span
            className="uppercase tracking-[0.14em] text-[10.5px] px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ background: 'white', border: `1px solid ${CREAM2}`, color: behaviorColor }}
          >
            {node.behavior === 'exclu' ? t(UI.behaviorExclu) : t(UI.behaviorFlag)}
          </span>
        )}
      </header>

      <AnimatePresence initial={false}>
        {enabled && (
          <motion.div
            key="params"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            style={{ overflow: 'hidden' }}
          >
            {isDocs ? (
              // Layout dédié docs_required : la mini-liste prend toute la largeur.
              <div className="mt-4">
                <CriterionParams
                  def={def}
                  params={node.params || {}}
                  disabled={disabled}
                  onChange={(nextParams) => onChangeNode({ ...node, params: nextParams })}
                  t={t}
                />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4">
                <div>
                  <CriterionParams
                    def={def}
                    params={node.params || {}}
                    disabled={disabled}
                    onChange={(nextParams) => onChangeNode({ ...node, params: nextParams })}
                    t={t}
                  />
                </div>
                <div>
                  <Field label={t(UI.behaviorLabel)}>
                    {({ id }) => (
                      <Select
                        id={id}
                        value={node.behavior}
                        onChange={(e) => onChangeNode({ ...node, behavior: e.target.value })}
                        disabled={disabled}
                        options={[
                          { value: 'exclu', label: t(UI.behaviorExclu) },
                          { value: 'flag', label: t(UI.behaviorFlag) },
                        ]}
                      />
                    )}
                  </Field>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

// ── Composant principal ──────────────────────────────────────────────────────
/**
 * @param {object}  props
 * @param {object}  props.value     JSON eligibility_rules courant.
 * @param {func}    props.onChange  (next: object) => void — JSON canonique.
 * @param {boolean} props.disabled  bloque toute édition (lecture seule).
 */
export default function EligibilityRulesEditor({ value, onChange, disabled = false }) {
  const { t } = useLang();
  const [state, setState] = useState(() => rulesToState(value));
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Re-hydrate quand la prop value change "de l'extérieur" (rechargement,
  // changement d'édition…). On compare via JSON pour éviter une boucle
  // infinie : onChange ré-écrit `value` à chaque keystroke, on ne veut pas
  // reset le state local à ce moment-là.
  useEffect(() => {
    const incoming = JSON.stringify(value || {});
    const fromState = JSON.stringify(stateToRules(state));
    if (incoming !== fromState) {
      setState(rulesToState(value));
    }
  }, [JSON.stringify(value || {})]);

  function patchNode(key, nextNode) {
    if (disabled) return;
    // Cas spécial docs_required : si l'admin désactive la card globalement, on
    // efface tous les docs ; si l'admin la réactive sans aucun doc, on hydrate
    // avec les defaults (pitch_deck + exec_summary en exclu).
    if (key === 'docs_required') {
      const wasEnabled = !!state.docs_required?.enabled;
      if (!nextNode.enabled && wasEnabled) {
        nextNode = { ...nextNode, params: { docs: {} } };
      } else if (nextNode.enabled && !wasEnabled) {
        const currentDocs = nextNode.params?.docs;
        if (!currentDocs || Object.keys(currentDocs).length === 0) {
          nextNode = {
            ...nextNode,
            params: { docs: { pitch_deck: { behavior: 'exclu' }, exec_summary: { behavior: 'exclu' } } },
          };
        }
      }
    }
    const next = { ...state, [key]: nextNode };
    setState(next);
    onChange?.(stateToRules(next));
  }

  const previewJson = useMemo(
    () => JSON.stringify(stateToRules(state), null, 2),
    [state],
  );

  return (
    <section
      className="rounded-[4px] p-5"
      style={{ background: CREAM, border: `1px solid ${CREAM2}` }}
    >
      <header className="mb-4">
        <h3
          className="text-[17px]"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(UI.title)}
        </h3>
        <p className="mt-1 text-[12.5px]" style={{ color: INK }}>
          {t(UI.intro)}
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {CRITERIA.map((def) => (
          <CriterionCard
            key={def.key}
            def={def}
            node={state[def.key] || { enabled: false, behavior: def.behavior, params: { ...def.defaults } }}
            disabled={disabled}
            onChangeNode={(next) => patchNode(def.key, next)}
            t={t}
          />
        ))}
      </div>

      {/* Mode avancé : aperçu JSON read-only (dev/QA fallback) */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[11.5px] uppercase tracking-[0.14em] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ color: MUTED }}
        >
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" aria-hidden /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden />}
          {t(UI.advancedMode)}
        </button>
        {showAdvanced && (
          <div className="mt-2">
            <p className="text-[11px] mb-1" style={{ color: MUTED }}>{t(UI.advancedHint)}</p>
            <pre
              className="text-[12px] font-mono rounded-[4px] p-3 overflow-x-auto"
              style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
              aria-readonly="true"
            >
              {previewJson}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}

// Re-exports utilitaires pour tests / pages voisines (pas d'usage interne).
export { rulesToState, stateToRules };
