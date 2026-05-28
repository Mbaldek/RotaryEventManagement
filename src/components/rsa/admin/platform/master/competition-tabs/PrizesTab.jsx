// PrizesTab — onglet « Prix » du funnel de compétition.
//
// Réutilise <PrizesList editionId={...} scope="competition" /> existant. En
// mode création (pas encore d'editionId), affiche un message d'attente.

import React from 'react';
import { useLang } from '@/lib/platform/i18n';
import PrizesList from '@/components/rsa/prizes/PrizesList';
import { COMP } from '../i18n';
import { SectionNote } from './fields';

export default function PrizesTab({ competition, mode = 'edit' }) {
  const { t } = useLang();
  if (mode === 'create' || !competition?.id) {
    return (
      <SectionNote>
        {t(COMP.prizesAfterCreate)}
      </SectionNote>
    );
  }
  return <PrizesList editionId={competition.id} scope="competition" />;
}
