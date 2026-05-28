// Textarea — multi-line text in Élysée chrome. Pairs with <Field>. Forwards a ref.
//
// Props (+ native textarea props): value, onChange, placeholder, rows (default 4),
// invalid, disabled, id, className.

import React, { forwardRef } from "react";
import { inputBase, inputStyle } from "@/components/design/form/chrome";

const Textarea = forwardRef(function Textarea(
  { invalid = false, disabled = false, rows = 4, className = "", ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      className={`${inputBase} resize-y leading-relaxed ${className}`}
      style={inputStyle({ invalid, disabled })}
      {...props}
    />
  );
});

export default Textarea;
