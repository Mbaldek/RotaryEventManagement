// CustomFieldsBuilder — split 50/50 editor pour configurer les champs custom
// d'un formulaire (candidat startup ou candidature jury) attaché à une
// compétition.
//
// Layout :
//   * Desktop (≥ md) : grid 2 colonnes — gauche = liste/config, droite =
//     aperçu live "tel que le candidat verra le formulaire". L'aperçu est
//     sticky (top-4) pendant le scroll.
//   * Mobile : empilé. L'aperçu devient une section accordion en bas.
//
// Liste à gauche :
//   * Header : "X champs custom" + bouton "+ Ajouter un champ"
//   * Chaque item : flèches ↑↓ + label (lang courante) + badge type + dot
//     gold "obligatoire" + boutons inline Éditer / Dupliquer / Supprimer.
//   * Hairline gold rule entre items.
//   * Empty state si liste vide.
//
// Aperçu à droite :
//   * Eyebrow "Aperçu du formulaire public"
//   * Utilise <CustomFieldsRenderer fields={fields} values={{}} errors={null}
//     readOnly /> — l'agent C livre ce composant. Si l'import échoue
//     (incompat ou pas encore mergé), un fallback simple liste les champs
//     avec leur label/type/required pour ne pas casser le build.
//
// Props :
//   kind   : 'candidate' | 'jury'           — informationnel pour i18n
//   fields : Array<CustomField>             — source de vérité
//   onChange : (nextFields) => void         — patche le parent
//   disabled : bool                         — read-only
//
// Forme attendue d'un CustomField :
//   {
//     key, label: {fr,en,de}, placeholder: {fr,en,de},
//     help_text: {fr,en,de}, type, required, position,
//     options: [{ value, label: {fr,en,de} }],
//     validation: {…}
//   }

import React, { useCallback, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowUp, ArrowDown, Pencil, Copy, Trash2, ChevronDown, ChevronUp, Plus,
} from 'lucide-react';
import { useLang } from '@/lib/platform/i18n';
import {
  CREAM, CREAM2, EASE, GOLD, INK, MUTED, NAVY,
} from '@/components/design/tokens';
import { DANGER, GOLD_TEXT } from '@/components/design/tokens.app';
import { CUSTOM_FIELD_TYPES, FORMULAIRES } from '../i18n';
import CustomFieldEditorModal, { buildEmptyField } from './CustomFieldEditorModal';

// Live form renderer fournie par l'équipe C
// (src/components/rsa/forms/CustomFieldsRenderer.jsx). Le PreviewPane l'utilise
// en mode `readonly` pour montrer le rendu réel sans interactions parasites.
import CustomFieldsRenderer from '@/components/rsa/forms/CustomFieldsRenderer';

function typeLabel(type, lang) {
  const found = CUSTOM_FIELD_TYPES.find((t) => t.value === type);
  if (!found) return type;
  return found[lang] || found.en || found.fr;
}

function resolveTri(tri, lang) {
  if (!tri) return '';
  if (typeof tri === 'string') return tri;
  return tri[lang] || tri.fr || tri.en || '';
}

// ── PreviewPane ─────────────────────────────────────────────────────────────
// Renders the live preview. Uses CustomFieldsRenderer when available; falls
// back to a structured list otherwise so the build never breaks.
function PreviewPane({ fields, lang, t }) {
  if (!Array.isArray(fields) || fields.length === 0) {
    return (
      <div
        className="rounded-[4px] p-5 text-[12.5px] text-center"
        style={{ background: '#fdfaf5', border: `1px dashed ${CREAM2}`, color: MUTED }}
      >
        {t(FORMULAIRES.previewEmptyState)}
      </div>
    );
  }
  return (
    <div
      className="rounded-[4px] p-4"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      <CustomFieldsRenderer
        fields={fields}
        values={{}}
        errors={{}}
        onChange={() => {}}
        lang={lang}
        readonly
      />
    </div>
  );
}

// ── Builder main ────────────────────────────────────────────────────────────
export default function CustomFieldsBuilder({
  kind: _kind = 'candidate',
  fields = [],
  onChange,
  disabled = false,
}) {
  const { t, lang } = useLang();
  const reduce = useReducedMotion();
  const safeFields = Array.isArray(fields) ? fields : [];

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIdx, setEditingIdx] = useState(-1); // -1 = create

  // Mobile preview accordion (open by default on desktop, collapsed on mobile)
  const [previewOpenMobile, setPreviewOpenMobile] = useState(false);

  // Sorted view by position (with stable index fallback).
  const sortedFields = useMemo(() => {
    return safeFields
      .map((f, idx) => ({ field: f, idx }))
      .sort((a, b) => {
        const ap = Number.isFinite(a.field.position) ? a.field.position : a.idx + 1;
        const bp = Number.isFinite(b.field.position) ? b.field.position : b.idx + 1;
        return ap - bp;
      });
  }, [safeFields]);

  const existingKeys = useMemo(
    () => safeFields.map((f) => f.key).filter(Boolean),
    [safeFields],
  );

  const handleAdd = useCallback(() => {
    setEditingIdx(-1);
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((idx) => {
    setEditingIdx(idx);
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback((nextField) => {
    if (!onChange) return;
    if (editingIdx === -1) {
      // Add — auto position at end.
      const position = (safeFields.length + 1);
      const fieldWithPos = { ...nextField, position: nextField.position || position };
      onChange([...safeFields, fieldWithPos]);
    } else {
      const next = [...safeFields];
      next[editingIdx] = nextField;
      onChange(next);
    }
    setModalOpen(false);
    setEditingIdx(-1);
  }, [editingIdx, onChange, safeFields]);

  const handleDelete = useCallback((idx) => {
    if (!onChange) return;
    const confirmed = typeof window !== 'undefined'
      ? window.confirm(t(FORMULAIRES.deleteConfirm))
      : true;
    if (!confirmed) return;
    const next = safeFields.filter((_, i) => i !== idx);
    // Re-number positions to keep them sequential.
    const renumbered = next.map((f, i) => ({ ...f, position: i + 1 }));
    onChange(renumbered);
  }, [onChange, safeFields, t]);

  const handleDeleteFromModal = useCallback(() => {
    if (editingIdx === -1) {
      setModalOpen(false);
      return;
    }
    const confirmed = typeof window !== 'undefined'
      ? window.confirm(t(FORMULAIRES.deleteConfirm))
      : true;
    if (!confirmed) return;
    const next = safeFields.filter((_, i) => i !== editingIdx);
    const renumbered = next.map((f, i) => ({ ...f, position: i + 1 }));
    onChange?.(renumbered);
    setModalOpen(false);
    setEditingIdx(-1);
  }, [editingIdx, safeFields, onChange, t]);

  const handleDuplicate = useCallback((idx) => {
    if (!onChange) return;
    const src = safeFields[idx];
    if (!src) return;
    // Generate a unique key by appending _copy[/_N].
    const baseKey = src.key || 'field';
    let candidateKey = `${baseKey}_copy`;
    let n = 2;
    while (existingKeys.includes(candidateKey)) {
      candidateKey = `${baseKey}_copy_${n}`;
      n += 1;
    }
    const dup = {
      ...src,
      key: candidateKey,
      label: { ...(src.label || {}) },
      placeholder: { ...(src.placeholder || {}) },
      help_text: { ...(src.help_text || {}) },
      options: Array.isArray(src.options)
        ? src.options.map((o) => ({ value: o.value, label: { ...(o.label || {}) } }))
        : [],
      validation: { ...(src.validation || {}) },
      position: safeFields.length + 1,
    };
    onChange([...safeFields, dup]);
  }, [existingKeys, onChange, safeFields]);

  const handleMove = useCallback((idx, dir) => {
    if (!onChange) return;
    const target = idx + dir;
    if (target < 0 || target >= safeFields.length) return;
    const next = [...safeFields];
    [next[idx], next[target]] = [next[target], next[idx]];
    const renumbered = next.map((f, i) => ({ ...f, position: i + 1 }));
    onChange(renumbered);
  }, [onChange, safeFields]);

  // Resolved fields for preview, sorted by position.
  const previewFields = useMemo(
    () => sortedFields.map(({ field }) => field),
    [sortedFields],
  );

  const countLabel = safeFields.length === 1
    ? t(FORMULAIRES.listHeadingOne)
    : t(FORMULAIRES.listHeading).replace('{count}', String(safeFields.length));

  // Stagger animation on field rows.
  const STAGGER_PARENT = {
    initial: {},
    animate: { transition: { staggerChildren: 0.03, delayChildren: 0.04 } },
  };
  const STAGGER_CHILD = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.24, ease: EASE } },
  };
  const parent = reduce ? {} : STAGGER_PARENT;
  const child = reduce ? {} : STAGGER_CHILD;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* LEFT — Field list/config */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p
            className="uppercase tracking-[0.14em] text-[11px]"
            style={{ color: MUTED }}
          >
            {countLabel}
          </p>
          <button
            type="button"
            onClick={handleAdd}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50"
            style={{ background: NAVY, color: 'white', border: `1px solid ${NAVY}` }}
            aria-label={t(FORMULAIRES.addField)}
          >
            <Plus className="w-3.5 h-3.5" aria-hidden />
            {t(FORMULAIRES.addField)}
          </button>
        </div>

        {sortedFields.length === 0 ? (
          <div
            className="rounded-[4px] p-5 text-center"
            style={{ background: '#fdfaf5', border: `1px dashed ${CREAM2}` }}
          >
            <p className="text-[12.5px]" style={{ color: MUTED }}>
              {t(FORMULAIRES.emptyState)}
            </p>
          </div>
        ) : (
          <motion.ul
            className="space-y-0"
            variants={parent}
            initial="initial"
            animate="animate"
          >
            {sortedFields.map(({ field, idx }, displayIdx) => {
              const isFirst = displayIdx === 0;
              const isLast = displayIdx === sortedFields.length - 1;
              const label = resolveTri(field.label, lang) || field.key || '—';
              return (
                <motion.li
                  key={field.key || idx}
                  variants={child}
                  className="py-3 flex items-start gap-3"
                  style={{ borderTop: isFirst ? 'none' : `1px solid ${GOLD}33` }}
                >
                  {/* Drag-to-reorder via arrows */}
                  <div className="flex flex-col gap-0.5 pt-0.5" aria-label={t(FORMULAIRES.dragHandle)}>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, -1)}
                      disabled={disabled || isFirst}
                      aria-label={t(FORMULAIRES.moveUp)}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] disabled:opacity-30"
                      style={{ color: INK, background: 'transparent' }}
                    >
                      <ArrowUp className="w-3.5 h-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 1)}
                      disabled={disabled || isLast}
                      aria-label={t(FORMULAIRES.moveDown)}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] disabled:opacity-30"
                      style={{ color: INK, background: 'transparent' }}
                    >
                      <ArrowDown className="w-3.5 h-3.5" aria-hidden />
                    </button>
                  </div>

                  {/* Label + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[13px]"
                        style={{ color: NAVY, fontWeight: 500 }}
                      >
                        {label}
                      </span>
                      <span
                        className="text-[10.5px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-[2px]"
                        style={{
                          background: '#fdf6e8',
                          color: GOLD_TEXT,
                          border: `1px solid ${CREAM2}`,
                        }}
                      >
                        {typeLabel(field.type, lang)}
                      </span>
                      {field.required && (
                        <span
                          className="inline-flex items-center gap-1 text-[10.5px]"
                          style={{ color: DANGER }}
                          title={t(FORMULAIRES.requiredDot)}
                        >
                          <span
                            aria-hidden
                            style={{
                              display: 'inline-block',
                              width: 6, height: 6, borderRadius: 9999,
                              background: DANGER,
                            }}
                          />
                          {t(FORMULAIRES.requiredDot)}
                        </span>
                      )}
                    </div>
                    {field.key && (
                      <p
                        className="text-[10.5px] font-mono mt-0.5"
                        style={{ color: MUTED }}
                      >
                        {field.key}
                      </p>
                    )}
                  </div>

                  {/* Inline actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEdit(idx)}
                      disabled={disabled}
                      aria-label={t(FORMULAIRES.editField)}
                      title={t(FORMULAIRES.editField)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] disabled:opacity-30"
                      style={{ background: 'white', color: NAVY, border: `1px solid ${CREAM2}` }}
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(idx)}
                      disabled={disabled}
                      aria-label={t(FORMULAIRES.duplicateField)}
                      title={t(FORMULAIRES.duplicateField)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] disabled:opacity-30"
                      style={{ background: 'white', color: INK, border: `1px solid ${CREAM2}` }}
                    >
                      <Copy className="w-3.5 h-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(idx)}
                      disabled={disabled}
                      aria-label={t(FORMULAIRES.deleteField)}
                      title={t(FORMULAIRES.deleteField)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] disabled:opacity-30"
                      style={{ background: 'white', color: DANGER, border: `1px solid ${CREAM2}` }}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden />
                    </button>
                  </div>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </div>

      {/* RIGHT — Live preview. Desktop sticky, mobile accordion below. */}
      {/* Desktop preview pane */}
      <div className="hidden md:block">
        <div className="sticky top-4">
          <p
            className="uppercase tracking-[0.18em] text-[10.5px] font-medium mb-2"
            style={{ color: GOLD_TEXT }}
          >
            {t(FORMULAIRES.previewEyebrow)}
          </p>
          <PreviewPane fields={previewFields} lang={lang} t={t} />
        </div>
      </div>

      {/* Mobile preview accordion */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setPreviewOpenMobile((s) => !s)}
          aria-expanded={previewOpenMobile}
          className="w-full inline-flex items-center justify-between gap-2 text-[12.5px] px-3 py-2 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ background: CREAM, color: NAVY, border: `1px solid ${CREAM2}` }}
        >
          <span>
            {previewOpenMobile
              ? t(FORMULAIRES.previewToggleClose)
              : t(FORMULAIRES.previewToggleOpen)}
          </span>
          {previewOpenMobile ? (
            <ChevronUp className="w-4 h-4" aria-hidden />
          ) : (
            <ChevronDown className="w-4 h-4" aria-hidden />
          )}
        </button>
        {previewOpenMobile && (
          <div className="mt-3">
            <p
              className="uppercase tracking-[0.18em] text-[10.5px] font-medium mb-2"
              style={{ color: GOLD_TEXT }}
            >
              {t(FORMULAIRES.previewEyebrow)}
            </p>
            <PreviewPane fields={previewFields} lang={lang} t={t} />
          </div>
        )}
      </div>

      {/* Modal */}
      <CustomFieldEditorModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingIdx(-1); }}
        onSubmit={handleSubmit}
        onDelete={editingIdx !== -1 ? handleDeleteFromModal : undefined}
        field={editingIdx === -1 ? null : safeFields[editingIdx]}
        existingKeys={existingKeys.filter((k) => editingIdx === -1 || k !== safeFields[editingIdx]?.key)}
        defaultPosition={safeFields.length + 1}
      />
    </div>
  );
}

// Re-export helper for parents that need to build an empty field shape.
export { buildEmptyField };
