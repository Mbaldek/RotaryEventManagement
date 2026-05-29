// fields.jsx — primitives de form Élysée partagées entre les tabs du funnel
// compétition (CompetitionFunnel + CompetitionEditView). Style consistent avec
// EditionEditor / CompetitionEditor existants : label uppercase tracked muted,
// input white avec hairline CREAM2, focus ring gold.
//
// Volontairement légères (pas de Field render-prop ici — on garde la signature
// connue par les autres composants admin/platform pour rester DRY visuel).

import React from 'react';
import { CREAM2, NAVY, MUTED, INK, TINT_ADMIN } from '@/components/design/tokens';

export function FieldLabel({ children, htmlFor, hint }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block uppercase tracking-[0.14em] text-[10.5px] mb-1.5"
      style={{ color: MUTED }}
    >
      {children}
      {hint && (
        <span className="ml-2 normal-case tracking-normal text-[11px]" style={{ color: MUTED }}>
          {hint}
        </span>
      )}
    </label>
  );
}

export function TextRow({
  id, label, hint, value, onChange, type = 'text', placeholder, step, disabled, monospace,
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} hint={hint}>{label}</FieldLabel>
      <input
        id={id}
        type={type}
        step={step}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] disabled:opacity-60 disabled:cursor-not-allowed ${monospace ? 'font-mono' : ''}`}
        style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
      />
    </div>
  );
}

export function SelectRow({ id, label, value, onChange, options, disabled }) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select
        id={id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] disabled:opacity-60"
        style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export function CheckboxRow({ id, label, hint, checked, onChange, disabled }) {
  return (
    <div className="flex items-start gap-2">
      <input
        id={id}
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-1"
      />
      <label htmlFor={id} className="text-[13px]" style={{ color: NAVY }}>
        {label}
        {hint && (
          <span className="block text-[11.5px] mt-0.5" style={{ color: MUTED }}>
            {hint}
          </span>
        )}
      </label>
    </div>
  );
}

export function SectionNote({ children }) {
  return (
    <p
      className="text-[12.5px] py-2 px-3 rounded-[4px] mb-3"
      style={{ background: '#fdf6e8', color: INK, border: `1px solid ${CREAM2}` }}
    >
      {children}
    </p>
  );
}
