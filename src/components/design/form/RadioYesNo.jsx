// RadioYesNo — binary eligibility question (founders majority, registration…) as a
// segmented two-option control. Implemented as an accessible radiogroup (arrow-key
// navigation, roving focus, GOLD focus ring). Selected = GOLD ring + TINT_BEIGE.
//
// Props:
//   value     : true | false | null — current choice.
//   onChange  : (boolean) => void.
//   yesLabel  : node — resolved copy (FR/EN/DE), default "Oui".
//   noLabel   : node — resolved copy, default "Non".
//   invalid, disabled, id, name, className.

import React from "react";
import { NAVY, GOLD, CREAM2, INK, TINT_BEIGE } from "@/components/design/tokens";

function Option({ checked, disabled, onSelect, children, position, group, onKeyNav }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      tabIndex={checked ? 0 : -1}
      onClick={() => !disabled && onSelect()}
      onKeyDown={onKeyNav}
      data-group={group}
      data-pos={position}
      className="flex-1 min-h-[44px] px-4 py-2.5 text-[14px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-[#faf7f2] disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        background: checked ? TINT_BEIGE : "white",
        border: `1px solid ${checked ? GOLD : CREAM2}`,
        color: checked ? NAVY : INK,
        borderRadius: 4,
      }}
    >
      {children}
    </button>
  );
}

export default function RadioYesNo({
  value = null,
  onChange,
  yesLabel = "Oui",
  noLabel = "Non",
  invalid = false,
  disabled = false,
  id,
  name,
  className = "",
}) {
  const group = name || id || "yesno";

  // Arrow keys toggle between the two options.
  const onKeyNav = (e) => {
    if (disabled) return;
    if (["ArrowLeft", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      onChange?.(true);
    } else if (["ArrowRight", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      onChange?.(false);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-invalid={invalid || undefined}
      id={id}
      className={`flex gap-2 ${className}`}
    >
      <Option
        group={group}
        position="yes"
        checked={value === true}
        disabled={disabled}
        onSelect={() => onChange?.(true)}
        onKeyNav={onKeyNav}
      >
        {yesLabel}
      </Option>
      <Option
        group={group}
        position="no"
        checked={value === false}
        disabled={disabled}
        onSelect={() => onChange?.(false)}
        onKeyNav={onKeyNav}
      >
        {noLabel}
      </Option>
    </div>
  );
}
