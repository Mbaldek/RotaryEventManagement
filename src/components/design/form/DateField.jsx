// DateField — date entry in Élysée chrome with a GOLD calendar icon. Wraps a native
// <input type="date"> (reliable, accessible, locale-aware via the browser). Pairs
// with <Field>.
//
// Props (+ native input props): value (yyyy-mm-dd), onChange, min, max, invalid,
// disabled, id, className.

import React, { forwardRef } from "react";
import { Calendar } from "lucide-react";
import { GOLD } from "@/components/design/tokens";
import { inputBase, inputStyle } from "@/components/design/form/chrome";

const DateField = forwardRef(function DateField(
  { invalid = false, disabled = false, className = "", ...props },
  ref,
) {
  return (
    <div className="relative">
      <input
        ref={ref}
        type="date"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={`${inputBase} pr-10 ${className}`}
        style={inputStyle({ invalid, disabled })}
        {...props}
      />
      <Calendar
        aria-hidden
        className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: GOLD }}
      />
    </div>
  );
});

export default DateField;
