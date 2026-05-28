// StepShell — en-tête éditorial commun à chaque étape (titre Playfair + sous-titre).
import React from 'react';
import { NAVY, INK, GOLD, SERIF } from '@/components/design';

export default function StepShell({ eyebrow, title, subtitle, children }) {
  return (
    <div>
      {eyebrow && (
        <div className="flex items-center gap-2.5 mb-2">
          <span className="h-[1.5px] w-6" style={{ background: GOLD }} aria-hidden />
          <span className="uppercase text-[10px] tracking-[0.16em] font-medium" style={{ color: GOLD }}>
            {eyebrow}
          </span>
        </div>
      )}
      <h2 className="text-[24px] leading-tight mb-1.5" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
        {title}
      </h2>
      {subtitle && (
        <p className="text-[14px] leading-relaxed mb-6" style={{ color: INK }}>
          {subtitle}
        </p>
      )}
      <div className={subtitle ? '' : 'mt-6'}>
        <div className="flex flex-col gap-5">{children}</div>
      </div>
    </div>
  );
}
