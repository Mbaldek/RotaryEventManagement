// Select — single-choice select in Élysée chrome with a GOLD chevron. Uses a
// native <select> re-skinned (accessible by default, no extra theming debt) rather
// than the default-themed shadcn ui/select. Pairs with <Field>.
//
// Props (+ native select props): value, onChange, options [{ value, label }],
// placeholder (rendered as a disabled first option), invalid, disabled, id, className.
// `placeholder` and each option `label` are resolved copy (FR/EN/DE).

import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { GOLD } from "@/components/design/tokens";
import { inputBase, inputStyle } from "@/components/design/form/chrome";

const Select = forwardRef(function Select(
  { options = [], placeholder, value, onChange, invalid = false, disabled = false, className = "", ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={`${inputBase} appearance-none pr-10 ${className} ${
          value == null || value === "" ? "text-[#9090a8]" : ""
        }`}
        style={inputStyle({ invalid, disabled })}
        {...props}
      >
        {placeholder != null && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value} style={{ color: "#3a3a52" }}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: GOLD }}
      />
    </div>
  );
});

export default Select;
