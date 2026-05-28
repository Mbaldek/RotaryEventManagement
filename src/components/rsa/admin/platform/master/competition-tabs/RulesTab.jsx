// RulesTab — onglet « Règles » du funnel de compétition.
//
// Délègue 100% à <EligibilityRulesEditor /> (territoire de l'agent docs_required
// en parallèle ; l'API { value, onChange, disabled } est stable et ne doit pas
// changer). La valeur courante vient de values.eligibility_rules ; le change
// passe par onPatch({ eligibility_rules: next }).

import React from 'react';
import EligibilityRulesEditor from '@/components/rsa/eligibility/EligibilityRulesEditor';

export default function RulesTab({ values = {}, onPatch, disabled = false }) {
  return (
    <EligibilityRulesEditor
      value={values.eligibility_rules || {}}
      onChange={(next) => onPatch({ eligibility_rules: next || {} })}
      disabled={disabled}
    />
  );
}
