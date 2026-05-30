// JuryCandidate — route publique d'inscription juré (no auth).
//
// CONSOLIDATION (cf. docs/blueprints/jury-application-funnel.md §2,§4) : cette
// route rendait historiquement un funnel distinct. Elle rend désormais le MÊME
// formulaire unifié JuryFunnel que /DevenirJury — porte UNIQUE scopée par
// compétition.
//
// Deep-links conservés : les liens club_admin /JuryCandidate?club=<id> (générés
// par JuryApplicationsTab) continuent de fonctionner — JuryFunnel résout
// l'editionId du club via EditionClub.forClub et pré-remplit le step Club.
// Le scope explicite ?competition=/?edition= prime quand il est fourni.

import React from 'react';
import JuryFunnel from '@/components/rsa/jury-funnel/JuryFunnel';

export default function JuryCandidate() {
  return <JuryFunnel />;
}
