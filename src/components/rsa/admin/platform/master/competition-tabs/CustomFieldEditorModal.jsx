// CustomFieldEditorModal — éditeur de champ custom pour le builder FormulairesTab.
//
// Réutilise FunnelEditorModal (modale Élysée à onglets) — 4 onglets :
//   1. Identité   : key (auto-slug du label FR, lowercase + underscore), labels
//                   FR/EN/DE, type, required, position.
//   2. Helpers    : placeholder FR/EN/DE + help_text FR/EN/DE.
//   3. Options    : liste éditable (value + label FR/EN/DE), drag-to-reorder via
//                   flèches. Visible uniquement si type ∈ {select, multiselect,
//                   checkbox}.
//   4. Validation : selon le type — min/max chars + pattern (text/textarea),
//                   min/max + step (number), min/max items (multiselect), max
//                   size + accepted mimes (file), min/max date (date).
//
// État interne : draft local, on remonte au parent UNIQUEMENT au submit. Pas
// d'autosave par champ — c'est l'autosave de CompetitionEditView qui persiste
// la liste entière des custom_fields_* via patch().
//
// Props :
//   open          : bool
//   onClose       : () => void
//   onSubmit      : (field) => void
//   onDelete?     : () => void   — si fourni, affiché en destructiveSlot
//   field         : object | null  — null = création, sinon édition
//   existingKeys  : string[]      — clés des autres champs (pour erreur dup)
//   defaultPosition : number      — position auto-incrémentée en création

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useLang } from '@/lib/platform/i18n';
import { CREAM2, GOLD, INK, MUTED, NAVY } from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import FunnelEditorModal from '@/components/rsa/admin/platform/funnel/FunnelEditorModal';
import {
  CUSTOM_FIELD_MODAL,
  CUSTOM_FIELD_TYPES,
  CUSTOM_FIELD_TYPES_WITH_OPTIONS,
} from '../i18n';
import {
  FieldLabel, TextRow, TextareaRow, SelectRow, CheckboxRow, SectionNote,
} from './fields';

// ── helpers ─────────────────────────────────────────────────────────────────
// Slugify a label into a lowercase+underscore key (a-z, 0-9, _). Mirror loose
// du contract SQL côté table custom_fields_*.
export function slugifyFieldKey(label) {
  if (!label) return '';
  let s = String(label).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  s = s.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  s = s.replace(/_+/g, '_');
  if (s && /^[0-9]/.test(s)) s = `f_${s}`;
  return s.slice(0, 60);
}

const KEY_REGEX = /^[a-z][a-z0-9_]{0,59}$/;

// Empty trilingual block.
const emptyTri = () => ({ fr: '', en: '', de: '' });

// Default empty field shape — same contract that CustomFieldsRenderer consumes.
export function buildEmptyField(position = 1) {
  return {
    key:          '',
    label:        emptyTri(),
    placeholder:  emptyTri(),
    help_text:    emptyTri(),
    type:         'text',
    required:     false,
    position:     position,
    options:      [],
    validation:   {},
  };
}

// ── Sub: trilingual rows compact ────────────────────────────────────────────
function TriRow({ idPrefix, value = emptyTri(), onChange, labels, hint }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <TextRow
        id={`${idPrefix}-fr`}
        label={labels.fr}
        value={value?.fr ?? ''}
        onChange={(v) => onChange({ ...value, fr: v })}
        hint={hint}
      />
      <TextRow
        id={`${idPrefix}-en`}
        label={labels.en}
        value={value?.en ?? ''}
        onChange={(v) => onChange({ ...value, en: v })}
      />
      <TextRow
        id={`${idPrefix}-de`}
        label={labels.de}
        value={value?.de ?? ''}
        onChange={(v) => onChange({ ...value, de: v })}
      />
    </div>
  );
}

// ── Modal main ──────────────────────────────────────────────────────────────
export default function CustomFieldEditorModal({
  open,
  onClose,
  onSubmit,
  onDelete,
  field = null,
  existingKeys = [],
  defaultPosition = 1,
}) {
  const { t, lang } = useLang();
  const isEdit = !!field;

  // Local draft state (initialized from field or empty).
  const [draft, setDraft] = useState(() => field || buildEmptyField(defaultPosition));
  const [activeTab, setActiveTab] = useState('identity');
  const [keyTouched, setKeyTouched] = useState(false);
  const [error, setError] = useState(null);

  // Re-init draft whenever the modal re-opens with a different field.
  useEffect(() => {
    if (!open) return;
    setDraft(field || buildEmptyField(defaultPosition));
    setActiveTab('identity');
    setKeyTouched(!!field?.key);
    setError(null);
  }, [open, field, defaultPosition]);

  // Auto-slug key from label.fr in create mode, until the user manually edits
  // the key field. In edit mode, never auto-overwrite the existing key.
  const handleLabelChange = useCallback((nextLabel) => {
    setDraft((d) => {
      const next = { ...d, label: nextLabel };
      if (!isEdit && !keyTouched) {
        next.key = slugifyFieldKey(nextLabel.fr || '');
      }
      return next;
    });
  }, [isEdit, keyTouched]);

  const updateField = useCallback((patch) => {
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  const updateValidation = useCallback((patch) => {
    setDraft((d) => ({ ...d, validation: { ...(d.validation || {}), ...patch } }));
  }, []);

  // Options helpers
  const setOptions = useCallback((nextOptions) => {
    setDraft((d) => ({ ...d, options: nextOptions }));
  }, []);
  const addOption = useCallback(() => {
    setDraft((d) => ({
      ...d,
      options: [...(d.options || []), { value: '', label: emptyTri() }],
    }));
  }, []);
  const moveOption = useCallback((idx, dir) => {
    setDraft((d) => {
      const arr = [...(d.options || [])];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return d;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return { ...d, options: arr };
    });
  }, []);
  const removeOption = useCallback((idx) => {
    setDraft((d) => {
      const arr = [...(d.options || [])];
      arr.splice(idx, 1);
      return { ...d, options: arr };
    });
  }, []);

  // Computed flags
  const showOptionsTab = useMemo(
    () => CUSTOM_FIELD_TYPES_WITH_OPTIONS.includes(draft.type),
    [draft.type],
  );

  const keyError = useMemo(() => {
    if (!draft.key) return null;
    if (!KEY_REGEX.test(draft.key)) return t(CUSTOM_FIELD_MODAL.fieldKeyInvalid);
    if (existingKeys.includes(draft.key) && draft.key !== field?.key) {
      return t(CUSTOM_FIELD_MODAL.errKeyDuplicate);
    }
    return null;
  }, [draft.key, existingKeys, field, t]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    // Required: label FR present.
    if (!draft.label?.fr?.trim()) {
      setError(t(CUSTOM_FIELD_MODAL.errLabelRequired));
      setActiveTab('identity');
      return;
    }
    if (keyError) {
      setError(keyError);
      setActiveTab('identity');
      return;
    }
    // Required: at least one option for select/multiselect/checkbox.
    if (showOptionsTab && (!draft.options || draft.options.length === 0)) {
      setError(t(CUSTOM_FIELD_MODAL.errOptionsRequired));
      setActiveTab('options');
      return;
    }
    setError(null);
    // Ensure key has a value (fallback to slug of label.fr).
    const finalKey = draft.key || slugifyFieldKey(draft.label.fr);
    const out = {
      ...draft,
      key: finalKey,
      position: Number.isFinite(draft.position) ? draft.position : defaultPosition,
    };
    onSubmit?.(out);
  }, [draft, keyError, showOptionsTab, defaultPosition, onSubmit, t]);

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs = useMemo(() => {
    const base = [
      {
        id: 'identity',
        label: t(CUSTOM_FIELD_MODAL.tabIdentity),
        render: () => renderIdentity(),
      },
      {
        id: 'helpers',
        label: t(CUSTOM_FIELD_MODAL.tabHelpers),
        render: () => renderHelpers(),
      },
    ];
    if (showOptionsTab) {
      base.push({
        id: 'options',
        label: t(CUSTOM_FIELD_MODAL.tabOptions),
        render: () => renderOptions(),
      });
    }
    base.push({
      id: 'validation',
      label: t(CUSTOM_FIELD_MODAL.tabValidation),
      render: () => renderValidation(),
    });
    return base;
  }, [t, draft, showOptionsTab, keyError, error, lang]);

  // If active tab is "options" but options got hidden by a type change, fall
  // back to "validation".
  useEffect(() => {
    if (activeTab === 'options' && !showOptionsTab) setActiveTab('validation');
  }, [activeTab, showOptionsTab]);

  // ── Render helpers (inline closures over draft/updateField) ───────────────
  function renderIdentity() {
    return (
      <div className="space-y-5">
        {error && (
          <p
            className="text-[12.5px] px-3 py-2 rounded-[4px]"
            style={{ color: DANGER, background: '#f6e7e3', border: `1px solid ${CREAM2}` }}
            role="alert"
          >
            {error}
          </p>
        )}
        <TriRow
          idPrefix="cfm-label"
          value={draft.label || emptyTri()}
          onChange={handleLabelChange}
          labels={{
            fr: t(CUSTOM_FIELD_MODAL.fieldLabelFr),
            en: t(CUSTOM_FIELD_MODAL.fieldLabelEn),
            de: t(CUSTOM_FIELD_MODAL.fieldLabelDe),
          }}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <TextRow
              id="cfm-key"
              label={t(CUSTOM_FIELD_MODAL.fieldKey)}
              hint={t(CUSTOM_FIELD_MODAL.fieldKeyHelper)}
              value={draft.key || ''}
              onChange={(v) => {
                setKeyTouched(true);
                // Force lowercase + underscore as user types.
                const cleaned = String(v || '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
                updateField({ key: cleaned });
              }}
              disabled={isEdit}
              monospace
              placeholder="my_custom_field"
            />
            {keyError && (
              <p className="text-[11.5px] mt-1" style={{ color: DANGER }}>{keyError}</p>
            )}
          </div>
          <SelectRow
            id="cfm-type"
            label={t(CUSTOM_FIELD_MODAL.fieldType)}
            value={draft.type || 'text'}
            onChange={(v) => updateField({ type: v })}
            options={CUSTOM_FIELD_TYPES.map((opt) => ({
              value: opt.value,
              label: opt[lang] || opt.en || opt.fr,
            }))}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextRow
            id="cfm-position"
            label={t(CUSTOM_FIELD_MODAL.fieldPosition)}
            hint={t(CUSTOM_FIELD_MODAL.fieldPositionHint)}
            type="number"
            value={draft.position ?? defaultPosition}
            onChange={(v) => updateField({ position: v === '' ? defaultPosition : Number(v) })}
          />
          <div className="pt-6">
            <CheckboxRow
              id="cfm-required"
              label={t(CUSTOM_FIELD_MODAL.fieldRequired)}
              hint={t(CUSTOM_FIELD_MODAL.fieldRequiredHint)}
              checked={!!draft.required}
              onChange={(v) => updateField({ required: !!v })}
            />
          </div>
        </div>
      </div>
    );
  }

  function renderHelpers() {
    return (
      <div className="space-y-5">
        <div>
          <FieldLabel>{t(CUSTOM_FIELD_MODAL.fieldPlaceholder)}</FieldLabel>
          <TriRow
            idPrefix="cfm-placeholder"
            value={draft.placeholder || emptyTri()}
            onChange={(v) => updateField({ placeholder: v })}
            labels={{
              fr: t(CUSTOM_FIELD_MODAL.fieldPlaceholderFr),
              en: t(CUSTOM_FIELD_MODAL.fieldPlaceholderEn),
              de: t(CUSTOM_FIELD_MODAL.fieldPlaceholderDe),
            }}
          />
        </div>
        <div className="pt-3" style={{ borderTop: `1px dashed ${CREAM2}` }}>
          <FieldLabel hint={t(CUSTOM_FIELD_MODAL.fieldHelpTextHint)}>
            {t(CUSTOM_FIELD_MODAL.fieldHelpText)}
          </FieldLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <TextareaRow
              id="cfm-help-fr"
              label={t(CUSTOM_FIELD_MODAL.fieldHelpTextFr)}
              value={draft.help_text?.fr ?? ''}
              onChange={(v) => updateField({ help_text: { ...(draft.help_text || emptyTri()), fr: v } })}
              rows={3}
            />
            <TextareaRow
              id="cfm-help-en"
              label={t(CUSTOM_FIELD_MODAL.fieldHelpTextEn)}
              value={draft.help_text?.en ?? ''}
              onChange={(v) => updateField({ help_text: { ...(draft.help_text || emptyTri()), en: v } })}
              rows={3}
            />
            <TextareaRow
              id="cfm-help-de"
              label={t(CUSTOM_FIELD_MODAL.fieldHelpTextDe)}
              value={draft.help_text?.de ?? ''}
              onChange={(v) => updateField({ help_text: { ...(draft.help_text || emptyTri()), de: v } })}
              rows={3}
            />
          </div>
        </div>
      </div>
    );
  }

  function renderOptions() {
    if (!showOptionsTab) {
      return <SectionNote>{t(CUSTOM_FIELD_MODAL.fieldOptionsNotApplicable)}</SectionNote>;
    }
    const options = draft.options || [];
    return (
      <div className="space-y-4">
        <p className="text-[12.5px]" style={{ color: MUTED }}>
          {t(CUSTOM_FIELD_MODAL.fieldOptionsHint)}
        </p>
        {options.length === 0 && (
          <SectionNote>{t(CUSTOM_FIELD_MODAL.optionsEmpty)}</SectionNote>
        )}
        <ul className="space-y-3">
          {options.map((opt, idx) => (
            <li
              key={idx}
              className="rounded-[4px] p-3"
              style={{ border: `1px solid ${CREAM2}`, background: '#fdfaf5' }}
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <TextRow
                  id={`cfm-opt-${idx}-value`}
                  label={t(CUSTOM_FIELD_MODAL.optionValue)}
                  value={opt.value || ''}
                  onChange={(v) => {
                    const arr = [...options];
                    arr[idx] = { ...arr[idx], value: v };
                    setOptions(arr);
                  }}
                  monospace
                />
                <TextRow
                  id={`cfm-opt-${idx}-fr`}
                  label={t(CUSTOM_FIELD_MODAL.optionLabelFr)}
                  value={opt.label?.fr || ''}
                  onChange={(v) => {
                    const arr = [...options];
                    arr[idx] = { ...arr[idx], label: { ...(arr[idx].label || emptyTri()), fr: v } };
                    setOptions(arr);
                  }}
                />
                <TextRow
                  id={`cfm-opt-${idx}-en`}
                  label={t(CUSTOM_FIELD_MODAL.optionLabelEn)}
                  value={opt.label?.en || ''}
                  onChange={(v) => {
                    const arr = [...options];
                    arr[idx] = { ...arr[idx], label: { ...(arr[idx].label || emptyTri()), en: v } };
                    setOptions(arr);
                  }}
                />
                <TextRow
                  id={`cfm-opt-${idx}-de`}
                  label={t(CUSTOM_FIELD_MODAL.optionLabelDe)}
                  value={opt.label?.de || ''}
                  onChange={(v) => {
                    const arr = [...options];
                    arr[idx] = { ...arr[idx], label: { ...(arr[idx].label || emptyTri()), de: v } };
                    setOptions(arr);
                  }}
                />
              </div>
              <div className="mt-2 flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => moveOption(idx, -1)}
                  disabled={idx === 0}
                  aria-label={t(CUSTOM_FIELD_MODAL.optionMoveUp)}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] disabled:opacity-30"
                  style={{ background: 'white', color: INK, border: `1px solid ${CREAM2}` }}
                >
                  <ArrowUp className="w-3.5 h-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => moveOption(idx, 1)}
                  disabled={idx === options.length - 1}
                  aria-label={t(CUSTOM_FIELD_MODAL.optionMoveDown)}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] disabled:opacity-30"
                  style={{ background: 'white', color: INK, border: `1px solid ${CREAM2}` }}
                >
                  <ArrowDown className="w-3.5 h-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  className="inline-flex items-center gap-1 text-[11.5px] px-2 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                  style={{ background: 'white', color: DANGER, border: `1px solid ${CREAM2}` }}
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden />
                  {t(CUSTOM_FIELD_MODAL.removeOption)}
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addOption}
          className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ background: 'white', color: NAVY, border: `1px solid ${GOLD}` }}
        >
          {t(CUSTOM_FIELD_MODAL.addOption)}
        </button>
      </div>
    );
  }

  function renderValidation() {
    const v = draft.validation || {};
    const type = draft.type;
    let content = null;
    if (type === 'text' || type === 'textarea' || type === 'email' || type === 'url' || type === 'tel') {
      content = (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextRow
              id="cfm-v-min-chars"
              label={t(CUSTOM_FIELD_MODAL.validationMinChars)}
              type="number"
              value={v.min_chars ?? ''}
              onChange={(val) => updateValidation({ min_chars: val === '' ? null : Number(val) })}
            />
            <TextRow
              id="cfm-v-max-chars"
              label={t(CUSTOM_FIELD_MODAL.validationMaxChars)}
              type="number"
              value={v.max_chars ?? ''}
              onChange={(val) => updateValidation({ max_chars: val === '' ? null : Number(val) })}
            />
          </div>
          <TextRow
            id="cfm-v-pattern"
            label={t(CUSTOM_FIELD_MODAL.validationPattern)}
            hint={t(CUSTOM_FIELD_MODAL.validationPatternHint)}
            value={v.pattern ?? ''}
            onChange={(val) => updateValidation({ pattern: val || null })}
            monospace
          />
        </div>
      );
    } else if (type === 'number') {
      content = (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <TextRow
            id="cfm-v-min"
            label={t(CUSTOM_FIELD_MODAL.validationMin)}
            type="number"
            value={v.min ?? ''}
            onChange={(val) => updateValidation({ min: val === '' ? null : Number(val) })}
          />
          <TextRow
            id="cfm-v-max"
            label={t(CUSTOM_FIELD_MODAL.validationMax)}
            type="number"
            value={v.max ?? ''}
            onChange={(val) => updateValidation({ max: val === '' ? null : Number(val) })}
          />
          <TextRow
            id="cfm-v-step"
            label={t(CUSTOM_FIELD_MODAL.validationStep)}
            type="number"
            step="any"
            value={v.step ?? ''}
            onChange={(val) => updateValidation({ step: val === '' ? null : Number(val) })}
          />
        </div>
      );
    } else if (type === 'multiselect' || type === 'checkbox') {
      content = (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextRow
            id="cfm-v-min-items"
            label={t(CUSTOM_FIELD_MODAL.validationMinItems)}
            type="number"
            value={v.min_items ?? ''}
            onChange={(val) => updateValidation({ min_items: val === '' ? null : Number(val) })}
          />
          <TextRow
            id="cfm-v-max-items"
            label={t(CUSTOM_FIELD_MODAL.validationMaxItems)}
            type="number"
            value={v.max_items ?? ''}
            onChange={(val) => updateValidation({ max_items: val === '' ? null : Number(val) })}
          />
        </div>
      );
    } else if (type === 'file') {
      content = (
        <div className="space-y-3">
          <TextRow
            id="cfm-v-max-size"
            label={t(CUSTOM_FIELD_MODAL.validationMaxSize)}
            type="number"
            value={v.max_size_mb ?? ''}
            onChange={(val) => updateValidation({ max_size_mb: val === '' ? null : Number(val) })}
          />
          <TextareaRow
            id="cfm-v-mimes"
            label={t(CUSTOM_FIELD_MODAL.validationAcceptedMimes)}
            hint={t(CUSTOM_FIELD_MODAL.validationAcceptedMimesHint)}
            value={v.accepted_mimes ?? ''}
            onChange={(val) => updateValidation({ accepted_mimes: val || null })}
            rows={2}
          />
        </div>
      );
    } else if (type === 'date') {
      content = (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextRow
            id="cfm-v-min-date"
            label={t(CUSTOM_FIELD_MODAL.validationMinDate)}
            type="date"
            value={v.min_date ?? ''}
            onChange={(val) => updateValidation({ min_date: val || null })}
          />
          <TextRow
            id="cfm-v-max-date"
            label={t(CUSTOM_FIELD_MODAL.validationMaxDate)}
            type="date"
            value={v.max_date ?? ''}
            onChange={(val) => updateValidation({ max_date: val || null })}
          />
        </div>
      );
    } else {
      content = <SectionNote>{t(CUSTOM_FIELD_MODAL.validationNotApplicable)}</SectionNote>;
    }
    return (
      <div className="space-y-4">
        <p className="text-[12.5px]" style={{ color: MUTED }}>
          {t(CUSTOM_FIELD_MODAL.validationSectionIntro)}
        </p>
        {content}
      </div>
    );
  }

  // ── Destructive slot (delete) + submit/cancel in footer ───────────────────
  const destructiveSlot = onDelete ? (
    <button
      type="button"
      onClick={() => onDelete?.()}
      className="text-[11.5px] underline opacity-70 hover:opacity-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] rounded-[2px] inline-flex items-center gap-1.5"
      style={{ color: DANGER }}
    >
      <Trash2 className="w-3.5 h-3.5" aria-hidden />
      {t({ fr: 'Supprimer ce champ', en: 'Delete this field', de: 'Dieses Feld löschen' })}
    </button>
  ) : null;

  // We can't fit a "Submit" button inside FunnelEditorModal's footer (it's
  // hard-coded to show only StatusIndicator + Close). Instead we render an
  // action bar inside each tab body's bottom so the user always sees Save.
  // Wrap the active render with a sticky-ish action row.
  const wrappedTabs = useMemo(() => tabs.map((tab) => ({
    ...tab,
    render: () => (
      <div className="space-y-4">
        {tab.render()}
        <div
          className="pt-4 mt-4 flex items-center justify-end gap-2"
          style={{ borderTop: `1px solid ${CREAM2}` }}
        >
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
            style={{ background: 'white', color: NAVY, border: `1px solid ${CREAM2}` }}
          >
            {t(CUSTOM_FIELD_MODAL.cancel)}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
            style={{ background: NAVY, color: 'white', border: `1px solid ${NAVY}` }}
          >
            {isEdit ? t(CUSTOM_FIELD_MODAL.submitUpdate) : t(CUSTOM_FIELD_MODAL.submitCreate)}
          </button>
        </div>
      </div>
    ),
  })), [tabs, onClose, handleSubmit, isEdit, t]);

  return (
    <FunnelEditorModal
      open={open}
      onClose={onClose}
      title={isEdit ? t(CUSTOM_FIELD_MODAL.titleEdit) : t(CUSTOM_FIELD_MODAL.titleNew)}
      eyebrow={isEdit ? t(CUSTOM_FIELD_MODAL.eyebrowEdit) : t(CUSTOM_FIELD_MODAL.eyebrowNew)}
      tabs={wrappedTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      status="idle"
      destructiveSlot={destructiveSlot}
      width="wide"
    />
  );
}
