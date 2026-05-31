// Hooks TanStack Query du tunnel de candidature (Module 1).
//
// Colocalise les clés de cache + queries + mutations contre les entités RSA
// (@/lib/rsa/entities) et le moteur d'éligibilité. Réutilise le QueryClient
// partagé (via QueryClientProvider monté dans App.jsx). L'autosave est débouncé
// côté CandidatureFunnel ; ici on expose juste les mutations.

import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edition, EditionClub, Startup } from '@/lib/rsa/entities';
import { mergeEligibilityRules } from '@/lib/rsa/eligibility';
import { rulesFromEdition } from './validation';

export const KEYS = {
  activeEdition: ['rsa', 'edition', 'active'],
  myDossier: (editionId) => ['rsa', 'startup', 'mine', editionId],
};

// Édition active (statut 'open', la plus récente). Données de référence.
export function useActiveEdition() {
  return useQuery({
    queryKey: KEYS.activeEdition,
    queryFn: () => Edition.active(),
    staleTime: 5 * 60 * 1000,
  });
}

// Chantier 2 — Fetch d'une édition par ID (candidature contextualisée par URL).
// Utilisé quand l'URL `/MonDossier?edition=…` épingle une compétition précise.
export function useEdition(editionId) {
  return useQuery({
    queryKey: ['rsa', 'edition', editionId],
    queryFn: () => Edition.get(editionId),
    enabled: !!editionId,
    staleTime: 5 * 60 * 1000,
  });
}

// Override d'éligibilité PROPRE au club (sparse) pour un couple (édition, club).
// Lecture directe de edition_clubs.eligibility_rules — ne contient QUE les
// critères que le club surcharge (ou désactive via { behavior: 'off' }).
// null/{} si pas de club choisi ou pas d'override. Cf. blueprint §2/§4.
export function useClubRuleOverride(editionId, clubId) {
  return useQuery({
    queryKey: ['rsa', 'edition-club-rules', editionId, clubId],
    queryFn: () => EditionClub.rulesForClub(editionId, clubId),
    enabled: !!editionId && !!clubId,
    staleTime: 5 * 60 * 1000,
  });
}

// Chantier 2 — Règles d'éligibilité EFFECTIVES pour un couple (édition, club).
// effective = règles compétition (rulesFromEdition) ⊕ override per-club
// (edition_clubs.eligibility_rules), via le helper canonique mergeEligibilityRules
// (merge SHALLOW par critère, twin exact de l'opérateur jsonb `||` côté SQL).
// Avant le choix d'un club → règles compétition seules.
export function useEditionClubRules(editionId, clubId) {
  const editionQ = useEdition(editionId);
  const clubRulesQ = useClubRuleOverride(editionId, clubId);
  const data = React.useMemo(() => {
    const base = rulesFromEdition(editionQ.data) || {};
    const override = clubRulesQ.data || {};
    // Important : si base est undefined (pas de règles configurées sur l'édition)
    // et qu'il n'y a pas d'override, on renvoie undefined pour laisser le
    // consommateur (evaluateEligibility) appliquer DEFAULT_RULES_2026.
    if (
      (!editionQ.data || Object.keys(base).length === 0) &&
      Object.keys(override).length === 0
    ) {
      return undefined;
    }
    return mergeEligibilityRules(base, override);
  }, [editionQ.data, clubRulesQ.data]);
  return {
    data,
    isLoading: editionQ.isLoading || (!!clubId && clubRulesQ.isLoading),
  };
}

// Dossier du candidat courant pour l'édition (RLS scope à owner_id). null si aucun.
export function useMyDossier(editionId) {
  return useQuery({
    queryKey: KEYS.myDossier(editionId),
    queryFn: () => Startup.mine(editionId),
    enabled: !!editionId,
  });
}

// Crée le 1er brouillon (tôt, pour que la ligne existe avant tout upload de doc).
export function useCreateDraft(editionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ownerId, patch }) => Startup.createDraft({ editionId, ownerId, patch }),
    onSuccess: (row) => {
      qc.setQueryData(KEYS.myDossier(editionId), row);
    },
  });
}

// Autosave : update du brouillon + bump updated_at. Optimiste pour rester snappy.
// Sanitize R-H4 : on ne persiste jamais le marqueur transitoire '__other__' du sélecteur
// pays — on stocke null tant que l'utilisateur n'a pas rempli le texte libre.
export function useSaveDraft(editionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => {
      const sanitized = { ...(patch || {}) };
      if (sanitized.country === '__other__') sanitized.country = null;
      return Startup.saveDraft(id, sanitized);
    },
    onMutate: async ({ patch }) => {
      const sanitized = { ...(patch || {}) };
      if (sanitized.country === '__other__') sanitized.country = null;
      const key = KEYS.myDossier(editionId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData(key);
      if (previous) {
        qc.setQueryData(key, { ...previous, ...sanitized, updated_at: new Date().toISOString() });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEYS.myDossier(editionId), ctx.previous);
    },
    onSettled: (row) => {
      if (row) qc.setQueryData(KEYS.myDossier(editionId), row);
    },
  });
}

// Soumission : déléguée AU SERVEUR via le RPC rsa_submit_dossier (SECURITY DEFINER).
// Le serveur recalcule l'éligibilité (twin SQL) et écrit status='soumis'. Le client
// ne fournit AUCUN snapshot d'éligibilité (cf. R-C2) ; la fonction JS evaluateEligibility
// ne sert plus qu'à la prévisualisation UI (StepCompany/StepFinance/StepReview).
//
// Le 2nd argument `edition` a été retiré (on n'a plus besoin des règles côté client pour
// le submit) — on garde la signature pour ne pas casser les imports / appels existants.
export function useSubmitDossier(editionId, _edition) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => Startup.submit(id),
    onSuccess: (row) => {
      if (row) qc.setQueryData(KEYS.myDossier(editionId), row);
      // Invalidate pour resynchroniser sur les éventuels effets de bord serveur
      // (timestamp serveur, eligibility canonique) et éviter qu'un autosave en vol
      // ne réécrive la ligne soumise (cf. R-M1).
      qc.invalidateQueries({ queryKey: KEYS.myDossier(editionId) });
    },
  });
}
