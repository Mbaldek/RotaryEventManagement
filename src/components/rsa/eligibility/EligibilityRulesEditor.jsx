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

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, RotateCcw, SlidersHorizontal, Ban } from 'lucide-react';
import {
  CREAM, CREAM2, NAVY, MUTED, INK, GOLD, SERIF, EASE,
} from '@/components/design/tokens';
import { DANGER, WARNING, GOLD_TEXT } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import Field from '@/components/design/form/Field';
import TextInput from '@/components/design/form/TextInput';
import DateField from '@/components/design/form/DateField';
import TagSelect from '@/components/design/form/TagSelect';
import {
  CRITERIA, CRITERIA_BY_KEY, rulesToState, stateToRules, DOC_CATALOG, docsAnyEnabled,
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

// ── BehaviorToggle (V2.5+) ───────────────────────────────────────────────────
// Segmented 2-pill toggle entre `flag` (warning) et `exclu` (blocking). Remplace
// le `<Select>` historique : les deux états sont visibles d'un coup d'œil, plus
// rapide à scanner pour l'admin qui passe de critère en critère.
function BehaviorToggle({ value, disabled, onChange, t }) {
  const isExclu = value === 'exclu';
  const cellCls =
    'px-2.5 py-1 rounded-full text-[11px] uppercase tracking-[0.14em] font-medium transition-all duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap';
  return (
    <div
      role="group"
      aria-label={t(UI.behaviorLabel)}
      className="inline-flex rounded-full p-0.5"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      <button
        type="button"
        onClick={() => !disabled && onChange('flag')}
        disabled={disabled}
        aria-pressed={!isExclu}
        className={cellCls}
        style={{
          background: !isExclu ? WARNING : 'transparent',
          color: !isExclu ? 'white' : MUTED,
        }}
      >
        {t(UI.behaviorFlag)}
      </button>
      <button
        type="button"
        onClick={() => !disabled && onChange('exclu')}
        disabled={disabled}
        aria-pressed={isExclu}
        className={cellCls}
        style={{
          background: isExclu ? DANGER : 'transparent',
          color: isExclu ? 'white' : MUTED,
        }}
      >
        {t(UI.behaviorExclu)}
      </button>
    </div>
  );
}

// ── DocRequirementRow (V2.5+) ────────────────────────────────────────────────
// Une ligne par document du catalogue. Toggle gauche, label + hint au milieu,
// Select inline behavior à droite (grisé/masqué si la ligne est désactivée).
//
// Le pattern reprend la signature visuelle des cartes critères (chip Élysée +
// chip behavior à droite) pour rester cohérent avec le reste de l'éditeur.
function DocRequirementRow({ i18nDoc, enabled, behavior, disabled, onToggle, onBehavior, t }) {
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
      <div className="shrink-0">
        {enabled ? (
          <BehaviorToggle
            value={behavior}
            disabled={disabled}
            onChange={onBehavior}
            t={t}
          />
        ) : (
          <div
            className="text-[12px] uppercase tracking-[0.14em] text-center py-1 px-3 rounded-full"
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
              <div className="mt-4 flex flex-col gap-4">
                <CriterionParams
                  def={def}
                  params={node.params || {}}
                  disabled={disabled}
                  onChange={(nextParams) => onChangeNode({ ...node, params: nextParams })}
                  t={t}
                />
                <Field label={t(UI.behaviorLabel)}>
                  {() => (
                    <BehaviorToggle
                      value={node.behavior}
                      disabled={disabled}
                      onChange={(beh) => onChangeNode({ ...node, behavior: beh })}
                      t={t}
                    />
                  )}
                </Field>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

// ── Résumé lisible d'un critère (mode héritage) ──────────────────────────────
// Rend en une phrase la valeur d'un critère (héritée OU surchargée) pour les
// lignes muted « hérité · … » et le rappel « Valeur de la compétition : … ».
// `node` = bloc JSON canonique du critère ({ behavior, ...params } ou, pour
// docs_required, { [doc_key]: { behavior } }). Renvoie une chaîne déjà localisée.
function summarizeCriterion(def, node, t) {
  if (!node || typeof node !== 'object') return '—';
  if (node.behavior === 'off') return null; // critère désactivé — pas de valeur à montrer
  const behaviorWord = (beh) => (beh === 'exclu' ? t(UI.behaviorExclu) : t(UI.behaviorFlag));

  switch (def.param) {
    case 'tags': {
      const allowed = Array.isArray(node.allowed) ? node.allowed : [];
      const byKey = Object.fromEntries(COUNTRIES.map((c) => [c.value, c]));
      const names = allowed.map((code) => {
        const c = byKey[code];
        return c ? t(c.label) : code;
      });
      const list = names.length ? names.join(', ') : '—';
      return `${list} — ${behaviorWord(node.behavior)}`;
    }
    case 'date': {
      const d = typeof node.date === 'string' ? node.date : '—';
      return `${d} — ${behaviorWord(node.behavior)}`;
    }
    case 'number': {
      const n = Number(node.threshold);
      const formatted = Number.isFinite(n) ? n.toLocaleString('fr-FR') : '—';
      return `${formatted} € — ${behaviorWord(node.behavior)}`;
    }
    case 'docs': {
      const byKey = Object.fromEntries(DOCS.map((d) => [d.value, d]));
      const labels = [];
      for (const docDef of DOC_CATALOG) {
        const entry = node[docDef.key];
        if (entry && typeof entry === 'object') {
          const i18nDoc = byKey[docDef.key];
          labels.push(`${i18nDoc ? t(i18nDoc.label) : docDef.key} (${behaviorWord(entry.behavior)})`);
        }
      }
      return labels.length ? labels.join(', ') : '—';
    }
    case 'none':
    default:
      return behaviorWord(node.behavior);
  }
}

// Construit la valeur initiale d'un override pour un critère (clé absente →
// « Surcharger »). On part de la valeur compétition si présente, sinon des
// defaults du catalogue. Renvoie le bloc JSON canonique du critère.
function seedOverrideForKey(key, inheritedValue) {
  const inherited = inheritedValue?.[key];
  if (inherited && typeof inherited === 'object' && inherited.behavior !== 'off') {
    return inherited; // hérite la valeur exacte de la compétition comme point de départ
  }
  const def = CRITERIA_BY_KEY[key];
  if (!def) return {};
  // Reconstruit un bloc canonique depuis l'état UI par défaut du catalogue.
  const seedState = rulesToState({});
  seedState[key] = { enabled: true, behavior: def.behavior, params: { ...def.defaults } };
  return stateToRules(seedState)[key] || {};
}

// ── Ligne critère en mode héritage ───────────────────────────────────────────
// 3 états : hérité (muted + Surcharger) · surchargé (éditeur + Rétablir +
// Désactiver) · désactivé par le club (badge + Rétablir).
function InheritanceCriterionRow({ def, override, inherited, disabled, labels, onOverride, onRestore, onDisable, onChangeNode, t }) {
  const i18nDict = I18N_CRITERIA[def.key];
  const hasOverride = override !== undefined;
  const isClubDisabled = hasOverride && override?.behavior === 'off';
  const inheritedSummary = summarizeCriterion(def, inherited, t);

  // État HÉRITÉ : ligne muted compacte + bouton Surcharger.
  if (!hasOverride) {
    return (
      <article
        className="rounded-[4px] px-4 py-3 flex items-center gap-3 flex-wrap"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-[14.5px] leading-tight" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
              {t(i18nDict.label)}
            </h4>
            <span
              className="uppercase tracking-[0.14em] text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: CREAM, border: `1px solid ${CREAM2}`, color: MUTED }}
            >
              {labels.badgeInherited}
            </span>
          </div>
          <p className="mt-1 text-[12.5px] tabular-nums" style={{ color: MUTED }}>
            {inheritedSummary == null ? labels.competitionOff : inheritedSummary}
          </p>
        </div>
        <button
          type="button"
          onClick={() => !disabled && onOverride()}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12px] font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ background: 'white', border: `1px solid ${GOLD}`, color: GOLD_TEXT }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden />
          {labels.override}
        </button>
      </article>
    );
  }

  // États SURCHARGÉ / DÉSACTIVÉ : carte mise en avant (filet gold).
  const node = isClubDisabled
    ? null
    : rulesToState({ [def.key]: override })[def.key];

  return (
    <article className="rounded-[4px]" style={{ background: 'white', border: `1px solid ${GOLD}` }}>
      <header className="flex items-start gap-3 flex-wrap px-4 pt-3 pb-2" style={{ borderBottom: `1px solid ${CREAM2}` }}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-[15px] leading-tight" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
              {t(i18nDict.label)}
            </h4>
            <span
              className="inline-flex items-center gap-1 uppercase tracking-[0.14em] text-[10px] px-2 py-0.5 rounded-full"
              style={
                isClubDisabled
                  ? { background: CREAM, border: `1px solid ${CREAM2}`, color: DANGER }
                  : { background: CREAM, border: `1px solid ${GOLD}`, color: GOLD_TEXT }
              }
            >
              <span aria-hidden style={{ width: 5, height: 5, borderRadius: 999, background: isClubDisabled ? DANGER : GOLD }} />
              {isClubDisabled ? labels.badgeClubDisabled : labels.badgeOverridden}
            </span>
          </div>
          {inheritedSummary != null && (
            <p className="mt-1 text-[11.5px] tabular-nums" style={{ color: MUTED }}>
              {labels.competitionValue} : {inheritedSummary}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isClubDisabled && (
            <button
              type="button"
              onClick={() => !disabled && onDisable()}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-[11.5px] font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ background: 'white', border: `1px solid ${CREAM2}`, color: DANGER }}
            >
              <Ban className="w-3.5 h-3.5" aria-hidden />
              {labels.disable}
            </button>
          )}
          <button
            type="button"
            onClick={() => !disabled && onRestore()}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-[11.5px] font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ background: 'white', border: `1px solid ${CREAM2}`, color: INK }}
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden />
            {labels.restore}
          </button>
        </div>
      </header>

      {isClubDisabled ? (
        <p className="px-4 py-3 text-[12px]" style={{ color: INK }}>
          {labels.overrideWarning}
        </p>
      ) : (
        <div className="px-4 pt-3 pb-4">
          <CriterionCard
            def={def}
            node={node}
            disabled={disabled}
            onChangeNode={onChangeNode}
            t={t}
          />
          <p className="mt-2 text-[11.5px]" style={{ color: MUTED }}>
            {labels.overrideWarning}
          </p>
        </div>
      )}
    </article>
  );
}

// ── Mode héritage — sous-composant ───────────────────────────────────────────
// Pilote l'édition d'un override SPARSE par-dessus les règles compétition. Ne
// passe JAMAIS par rulesToState/stateToRules au niveau de l'ensemble (qui
// matérialiserait tous les critères) : on agit clé par clé.
function InheritanceEditor({ value, inheritedValue, onChange, disabled, labels }) {
  const { t } = useLang();
  const sparse = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const inherited = inheritedValue && typeof inheritedValue === 'object' && !Array.isArray(inheritedValue)
    ? inheritedValue : {};

  function setKey(key, nextNode) {
    const next = { ...sparse };
    if (nextNode === undefined) delete next[key];
    else next[key] = nextNode;
    onChange?.(next);
  }

  // Édition inline d'un critère surchargé : on reconstruit le bloc JSON du
  // critère depuis l'état UI de CriterionCard, en réutilisant stateToRules sur
  // un état mono-critère (cohérent avec le format canonique + docs_required).
  function onChangeNode(key, nextUiNode) {
    const block = stateToRules({ [key]: nextUiNode })[key];
    // Un critère surchargé reste présent même si l'utilisateur le désactive dans
    // la card (stateToRules l'omettrait) : on retombe alors sur { behavior:'off' }
    // — c.-à-d. « désactivé par le club », ce qui est l'intention.
    setKey(key, block !== undefined ? block : { behavior: 'off' });
  }

  return (
    <div className="flex flex-col gap-3">
      {CRITERIA.map((def) => (
        <InheritanceCriterionRow
          key={def.key}
          def={def}
          override={Object.prototype.hasOwnProperty.call(sparse, def.key) ? sparse[def.key] : undefined}
          inherited={inherited[def.key]}
          disabled={disabled}
          labels={labels}
          t={t}
          onOverride={() => setKey(def.key, seedOverrideForKey(def.key, inherited))}
          onRestore={() => setKey(def.key, undefined)}
          onDisable={() => setKey(def.key, { behavior: 'off' })}
          onChangeNode={(nextUiNode) => onChangeNode(def.key, nextUiNode)}
        />
      ))}
    </div>
  );
}

// ── Composant principal ──────────────────────────────────────────────────────
/**
 * @param {object}  props
 * @param {object}  props.value           JSON eligibility_rules courant. En mode
 *   héritage = override SPARSE du club (seulement les critères surchargés).
 * @param {func}    props.onChange         (next: object) => void — JSON canonique
 *   (mode legacy) ou override sparse mis à jour (mode héritage).
 * @param {boolean} props.disabled         bloque toute édition (lecture seule).
 * @param {string}  [props.mode]           'inheritance' pour activer le mode club.
 * @param {object}  [props.inheritedValue] règles de la COMPÉTITION (mode héritage).
 * @param {object}  [props.inheritanceLabels] strings déjà localisées (CLUB_RULES).
 */
export default function EligibilityRulesEditor({
  value,
  onChange,
  disabled = false,
  mode,
  inheritedValue,
  inheritanceLabels,
}) {
  const { t } = useLang();
  const [state, setState] = useState(() => rulesToState(value));

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

  // Mode héritage (compétition multiclub) : on rend la liste par critère pilotée
  // par l'override sparse + les règles compétition. Le chrome (titre, bandeau,
  // compteur) est porté par le RulesTab club ; on ne re-rend pas d'en-tête ici.
  if (mode === 'inheritance') {
    return (
      <InheritanceEditor
        value={value}
        inheritedValue={inheritedValue}
        onChange={onChange}
        disabled={disabled}
        labels={inheritanceLabels || {}}
      />
    );
  }

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

    </section>
  );
}

// Re-exports utilitaires pour tests / pages voisines (pas d'usage interne).
export { rulesToState, stateToRules };
