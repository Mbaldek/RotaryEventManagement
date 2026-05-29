// CompetitionAdminCockpit — wrapper "vue aperçu compétition" pour le master_admin.
//
// Permet à un master_admin (depuis le selector de persona de Admin.jsx) de simuler
// la vue qu'un competition_admin verrait sur une édition donnée. Pour V3.0, on
// réutilise telle quelle <CompetitionEditView> avec l'editionId préfixé. La
// frontière de sécurité reste serveur (RLS + RPC SECURITY DEFINER) — le composant
// ne porte aucune garde de rôle (Admin.jsx s'en charge en amont).
//
// Pourquoi ce wrapper ?
//   1. Découpler la "simulation persona" de l'édition concrète : si demain on veut
//      router vers un cockpit competition_admin natif, on change l'implémentation
//      ici sans toucher à Admin.jsx ni à PersonaPreviewBanner.
//   2. Fermer "proprement" la vue aperçu : `onClose` ramène au scope master via
//      le handler injecté par Admin.jsx (clearScope + URL cleanup).

import React from 'react';
import CompetitionEditView from './CompetitionEditView';

export default function CompetitionAdminCockpit({ editionId, onClose }) {
  if (!editionId) return null;
  return <CompetitionEditView editionId={editionId} onClose={onClose} />;
}
