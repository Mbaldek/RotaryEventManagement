// Field — the accessible wrapper around any form control. Owns the label/required/
// helper/error chrome and the ARIA wiring (label association, aria-describedby,
// aria-invalid, aria-required), so the individual controls stay lean.
//
// Two ways to wire the control:
//   1) Render-prop children — receives the generated ids/flags:
//        <Field label="Email" required helper="…" error={err}>
//          {({ id, describedBy, invalid }) => (
//            <TextInput id={id} aria-describedby={describedBy} invalid={invalid} />
//          )}
//        </Field>
//   2) Plain children + pass the same `id` you set on the control. The label's
//      htmlFor uses Field's id, so set the control's id to match (or use the
//      render-prop form, which is the safe path).
//
// Props:
//   label    : node — resolved copy (FR/EN/DE), associated via htmlFor.
//   id       : string — control id (auto-generated if omitted).
//   required : bool — shows a GOLD * and sets aria-required on the render-prop flags.
//   helper   : node — muted hint, linked via aria-describedby.
//   error    : node — danger text, linked via aria-describedby + sets aria-invalid.
//   hideLabel: bool — visually hide the label but keep it for screen readers.
//   children : node | (ctx) => node.

import React, { useId } from "react";
import { MUTED, GOLD, INK } from "@/components/design/tokens";
import { DANGER } from "@/components/design/tokens.app";

export default function Field({
  label,
  id,
  required = false,
  helper,
  error,
  hideLabel = false,
  className = "",
  children,
}) {
  const auto = useId();
  const fieldId = id || `f-${auto}`;
  const helperId = helper ? `${fieldId}-help` : undefined;
  const errorId = error ? `${fieldId}-err` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;
  const invalid = !!error;

  const ctx = { id: fieldId, describedBy, invalid, required };
  const content = typeof children === "function" ? children(ctx) : children;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className={`text-[11px] uppercase tracking-[0.12em] font-medium ${
            hideLabel ? "sr-only" : ""
          }`}
          style={{ color: INK }}
        >
          {label}
          {required && (
            <span aria-hidden style={{ color: GOLD }}>
              {" *"}
            </span>
          )}
        </label>
      )}

      {content}

      {error ? (
        <p id={errorId} className="text-xs" style={{ color: DANGER }} role="alert">
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="text-xs" style={{ color: MUTED }}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}
