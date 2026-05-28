// TagSelect — multi-select shown as removable pills (sectors, countries…). A native
// <select> drives picking (accessible, keyboard-friendly); chosen values render as
// CREAM pills with a × in MUTED. Pairs with <Field>.
//
// Props:
//   value      : string[] — selected option values.
//   onChange   : (next: string[]) => void.
//   options    : [{ value, label }] — `label` is resolved copy (FR/EN/DE).
//   placeholder: node — shown in the picker's first (disabled) option.
//   max        : number — optional cap on selected count.
//   invalid, disabled, id, className.

import React from "react";
import { X } from "lucide-react";
import { CREAM, CREAM2, NAVY, MUTED } from "@/components/design/tokens";
import Select from "@/components/design/form/Select";

export default function TagSelect({
  value = [],
  onChange,
  options = [],
  placeholder,
  max,
  invalid = false,
  disabled = false,
  id,
  className = "",
}) {
  const selected = new Set(value);
  const atMax = typeof max === "number" && value.length >= max;

  const available = options.filter((o) => !selected.has(o.value));
  const labelOf = (v) => options.find((o) => o.value === v)?.label ?? v;

  const add = (e) => {
    const v = e.target.value;
    if (!v || selected.has(v) || atMax) return;
    onChange?.([...value, v]);
  };
  const remove = (v) => onChange?.(value.filter((x) => x !== v));

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 list-none m-0 p-0">
          {value.map((v) => (
            <li key={v}>
              <span
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[12px]"
                style={{ background: CREAM, border: `1px solid ${CREAM2}`, color: NAVY }}
              >
                {labelOf(v)}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => remove(v)}
                    aria-label={`Remove ${labelOf(v)}`}
                    className="rounded-full p-0.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                    style={{ color: MUTED }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Select
        id={id}
        value=""
        onChange={add}
        invalid={invalid}
        disabled={disabled || atMax || available.length === 0}
        placeholder={placeholder}
        options={available}
      />
    </div>
  );
}
