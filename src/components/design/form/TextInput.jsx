// TextInput — single-line text input in Élysée chrome. Pairs with <Field> for
// label/helper/error; pass `id`, `aria-describedby`, `invalid` from the Field
// render-prop. Forwards a ref and any native input props.
//
// Props (+ native input props): value, onChange, placeholder, type, invalid,
// disabled, id, className. `placeholder` is resolved copy (FR/EN/DE).

import React, { forwardRef } from "react";
import { inputBase, inputStyle } from "@/components/design/form/chrome";

const TextInput = forwardRef(function TextInput(
  { invalid = false, disabled = false, type = "text", className = "", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      className={`${inputBase} ${className}`}
      style={inputStyle({ invalid, disabled })}
      {...props}
    />
  );
});

export default TextInput;
