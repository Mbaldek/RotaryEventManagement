// GuideSpaceHelp — point de montage unique des guides dans un espace.
// <GuideSpaceHelp space="jury" editionId={editionId} />
//
// Rend le bouton trigger + pastille + le drawer. Si aucun guide publié pour
// l'espace/portée, ne rend rien (le bouton n'apparaît pas).

import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle } from 'lucide-react';
import { NAVY, GOLD, CREAM2 } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { useGuides } from './useGuides';
import { GUIDE_UI } from './i18n';
import GuidePanel from './GuidePanel';

export default function GuideSpaceHelp({ space, editionId = null, className = '' }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const { guides, hasGuides, isLoading, isError, showBadge, markSeen } = useGuides(space, editionId);

  // Ack « vu » seulement une fois le drawer ouvert ET le contenu chargé (pas au
  // simple clic) — sinon on enregistre la lecture d'un contenu pas encore affiché.
  // Une seule fois par ouverture (seenRef remis à false à la fermeture).
  const seenRef = useRef(false);
  useEffect(() => {
    if (!open) {
      seenRef.current = false;
      return;
    }
    if (!isLoading && hasGuides && !seenRef.current) {
      seenRef.current = true;
      markSeen();
    }
  }, [open, isLoading, hasGuides, markSeen]);

  // Aucun guide publié → pas de bouton. Pendant le chargement initial hasGuides est
  // false : le bouton n'apparaît qu'une fois les guides connus (jamais de bouton
  // pour un espace sans guide, jamais de flash inverse).
  if (!hasGuides) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t(GUIDE_UI.triggerAria)}
        className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-[12px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] hover:bg-[#faf7f2] transition-colors ${className}`}
        style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}
      >
        <HelpCircle className="w-3.5 h-3.5" aria-hidden />
        {t(GUIDE_UI.trigger)}
        {showBadge && (
          <span
            aria-label={t(GUIDE_UI.newBadgeAria)}
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
            style={{ background: GOLD, boxShadow: '0 0 0 2px white' }}
          />
        )}
      </button>

      <GuidePanel
        open={open}
        space={space}
        guides={guides}
        isLoading={isLoading}
        isError={isError}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
