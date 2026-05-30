// DevenirJury — route publique CANONIQUE d'inscription juré (no auth).
//
// CONSOLIDATION (cf. docs/blueprints/jury-application-funnel.md §2,§4) :
// l'ancien JuryApplicationForm (porte cassée sur lib/rsa/jury-applications.js)
// est remplacé par le funnel unifié scopé par compétition. /DevenirJury et
// /JuryCandidate rendent désormais le MÊME composant JuryFunnel.
//
// Scope : ?competition=<editionId> (canonique) ou ?edition=<editionId> (forward-
// compat des liens DiffusionSection). editionId TOUJOURS résolu et passé à
// rsa_apply_jury ; si absent → écran de sélection de compétition.
//
// Route auto-enregistrée par pages.config.js. La whitelist ALLOWED_NEXT de
// postLoginRoute.js autorise déjà `/DevenirJury`.

import React from 'react';
import JuryFunnel from '@/components/rsa/jury-funnel/JuryFunnel';

export default function DevenirJury() {
  return <JuryFunnel />;
}
