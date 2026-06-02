// src/components/rsa/admin/platform/shell/PhaseBar.jsx
// Barre horizontale des 3 phases (Option A). Mince wrapper autour de CockpitTabs
// pour parler le même langage visuel que les onglets éditoriaux existants.
// L'état (phase active) est piloté par l'URL via le parent (CompetitionShell).

import React from 'react';
import CockpitTabs from '@/components/design/shell/CockpitTabs';
import { useLang } from '@/lib/platform/i18n';
import { PHASES } from '@/lib/platform/competitionShell';

export default function PhaseBar({ activePhase, onChange }) {
  const { t } = useLang();
  return (
    <CockpitTabs
      idPrefix="competition-phase"
      items={PHASES.map((p) => ({ id: p.id, label: t(p.label) }))}
      active={activePhase}
      onChange={onChange}
      ariaLabel="Phases de la compétition"
    />
  );
}
