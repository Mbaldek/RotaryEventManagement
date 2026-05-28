// EditorialTitle — two-line serif title: a normal lead line + an italic accent
// line below it (the rotary-startup.org editorial signature). Extracted verbatim
// from src/pages/Index.jsx; visual output unchanged.
//
// Props:
//   lead   : node    — first line (normal weight)
//   italic : node    — optional second line, rendered italic on its own row
//   size   : "lg" | "md" | "sm" — type scale (default "lg")
//
// Trilingual note: pass resolved strings for lead/italic from your i18n table,
//   e.g. <EditorialTitle lead={t.heroLead} italic={t.heroItalic} />.

import React from "react";
import { NAVY, SERIF } from "@/components/design/tokens";

export default function EditorialTitle({ lead, italic, size = "lg" }) {
  const cls = {
    lg: "text-[40px] md:text-[56px] leading-[1.02]",
    md: "text-[28px] md:text-[36px] leading-[1.05]",
    sm: "text-[22px] md:text-[26px] leading-[1.1]",
  }[size];

  return (
    <h1
      className={`${cls} font-normal`}
      style={{ fontFamily: SERIF, color: NAVY }}
    >
      {lead}
      {italic && (
        <>
          <br />
          <span className="italic font-normal" style={{ color: NAVY }}>
            {italic}
          </span>
        </>
      )}
    </h1>
  );
}
