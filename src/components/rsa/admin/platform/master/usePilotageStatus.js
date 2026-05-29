// usePilotageStatus — agrège l'état "next steps" d'une compétition pour la
// PilotageTab (B-pilotage-tab). Réutilise les hooks existants :
//   * useClubsForEdition  → clubs attachés (junction edition_clubs)
//   * useCountsForEdition → sessions par club (byClub[i].sessions)
//   * club_memberships    → clubs ayant >=1 club_admin (lecture directe Supabase,
//                            une seule requête `IN (club_ids)` pour éviter N
//                            allers-retours par club)
//
// Retourne :
//   { isLoading, isError, summary, steps }
//   summary = {
//     completionPercent: number (0..100),
//     totalClubs:        number,
//     clubsWithAdmin:    number,
//     clubsWithSessions: number,
//     recommendedClubs:  number (1 monoclub, 2 multiclub),
//     hasFinale:         boolean,
//   }
//   steps = [
//     { id: 'created'|'clubs'|'admins'|'sessions'|'finale'|'links',
//       done:    boolean,
//       optional?: boolean,    // step5 optional si aucune session finale
//       blockedBy?: string,    // step depends on previous (UI peut griser)
//       missingClubs?: Array<{ id, name }>,  // step3, step4
//       firstMissing?: { id, name },         // first club sans admin/session
//     }, ...
//   ]
//
// V2.6 sessions-finale unification : step 'finale' est dérivé de useFinale
// (sessions kind='finale' AND club_id IS NULL), plus de lecture du flag
// editions.has_finale (deprecated, drop Phase 2).

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useClubsForEdition, useCountsForEdition, useFinale } from './useMaster';

// Champs identité/calendrier/règles pris en compte pour le "step 1 done %".
// On compte chaque champ rempli ; le pourcentage = filled / total.
function computeIdentityCompletion(competition) {
  if (!competition) return 0;
  const fields = [
    competition.name,
    competition.year,
    competition.status,
    competition.model,
    // calendrier
    competition.application_open,
    competition.application_close,
    competition.selection_date,
    // règles
    competition.eligibility_rules && Object.keys(competition.eligibility_rules || {}).length > 0
      ? competition.eligibility_rules
      : null,
    // hero éditorial — facultatif mais comptés car visibles partout en public
    competition.hero_title,
    competition.hero_tagline,
  ];
  const total = fields.length;
  const filled = fields.filter((v) => v !== null && v !== undefined && v !== '').length;
  return Math.round((filled / total) * 100);
}

// Hook lecture des club_admin par club_id — une seule query `in (club_ids)`.
// Retourne Set<club_id> des clubs qui ont >= 1 club_admin actif.
function useClubsWithAdmin(clubIds) {
  return useQuery({
    queryKey: ['rsa', 'master', 'pilotage', 'clubs-with-admin', (clubIds || []).slice().sort().join(',')],
    enabled: Array.isArray(clubIds) && clubIds.length > 0,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!clubIds || clubIds.length === 0) return new Set();
      const { data, error } = await supabase
        .from('club_memberships')
        .select('club_id, role')
        .in('club_id', clubIds)
        .eq('role', 'club_admin');
      if (error) throw error;
      return new Set((data || []).map((row) => row.club_id));
    },
  });
}

export default function usePilotageStatus({ competition }) {
  const editionId = competition?.id || null;
  const isMonoclub = (competition?.model || 'multiclub') === 'monoclub';

  // V3 — Fallback "couverture admin" : un master_admin global ou un
  // competition_admin de cette édition couvre tous les clubs (peuvent agir sur
  // n'importe quel club de l'édition via les RPC étendues 20260602/20260603).
  // Si l'un des deux existe, on considère que chaque club a un admin "couvert",
  // même sans club_admin local — sinon le step 3 reste TODO en permanence pour
  // les éditions pilotées en central.
  const { isMasterAdmin, isCompetitionAdminOf } = usePlatformAuth();
  const editionHasGlobalCoverage =
    !!editionId && (isMasterAdmin || isCompetitionAdminOf?.(editionId));

  // 1) Clubs attachés (junction edition_clubs)
  const attachedQ = useClubsForEdition(editionId);
  const attached = useMemo(() => attachedQ.data || [], [attachedQ.data]);
  const attachedClubIds = useMemo(
    () => attached.map((row) => row.club_id).filter(Boolean),
    [attached],
  );

  // 2) Sessions par club (déjà agrégé par useCountsForEdition)
  const countsQ = useCountsForEdition(editionId);
  const byClub = useMemo(() => countsQ.data?.byClub || [], [countsQ.data]);
  const clubsWithSessionsSet = useMemo(() => {
    const set = new Set();
    for (const bucket of byClub) {
      if ((bucket.sessions || 0) > 0 && bucket.club?.id) {
        set.add(bucket.club.id);
      }
    }
    return set;
  }, [byClub]);

  // 3) Clubs avec >=1 club_admin (une seule requête)
  const adminsQ = useClubsWithAdmin(attachedClubIds);
  const clubsWithAdminSet = useMemo(
    () => adminsQ.data || new Set(),
    [adminsQ.data],
  );

  // 4) Grande Finale fédérée — V2.6 sessions-finale unification : on dérive
  // l'existence de la finale depuis sessions (kind='finale', club_id IS NULL)
  // au lieu de lire editions.has_finale (column deprecated, drop en Phase 2).
  // Cf. docs/blueprints/sessions-finale-unification.md.
  const finaleQ = useFinale(editionId);
  const finaleSession = finaleQ.data || null;

  const isLoading = attachedQ.isLoading || countsQ.isLoading || adminsQ.isLoading || finaleQ.isLoading;
  const isError = attachedQ.isError || countsQ.isError || adminsQ.isError || finaleQ.isError;

  // ── Composition des steps ────────────────────────────────────────────────
  return useMemo(() => {
    const recommendedClubs = isMonoclub ? 1 : 2;
    const totalClubs = attached.length;

    // Liste enrichie {id, name} pour les CTAs "ouvre le cockpit de {clubName}"
    const attachedListEnriched = attached.map((row) => ({
      id:   row.club_id,
      name: row.club?.name || row.club_id,
    }));

    // V3 — Si un master_admin OU competition_admin couvre toute l'édition,
    // chaque club est implicitement "administré" (ils peuvent agir sur tous les
    // clubs via les RPC étendues 20260602/20260603). Sinon, on retombe sur la
    // règle d'origine : il faut un club_admin local à chaque club.
    const clubsMissingAdmin = editionHasGlobalCoverage
      ? []
      : attachedListEnriched.filter((c) => !clubsWithAdminSet.has(c.id));
    const clubsMissingSessions = attachedListEnriched.filter(
      (c) => !clubsWithSessionsSet.has(c.id),
    );

    const clubsWithAdmin = totalClubs - clubsMissingAdmin.length;
    const clubsWithSessions = totalClubs - clubsMissingSessions.length;

    // Step 1 — Compétition créée
    const identityPercent = computeIdentityCompletion(competition);
    const step1 = {
      id: 'created',
      done: true, // toujours done puisqu'on est dans l'edit-view
      identityPercent,
    };

    // Step 2 — Clubs attachés
    const step2Done = isMonoclub
      ? totalClubs >= 1
      : totalClubs >= recommendedClubs;
    const step2 = {
      id: 'clubs',
      done: step2Done,
      count: totalClubs,
      recommended: recommendedClubs,
    };

    // Step 3 — Club admins
    const step3Done = totalClubs > 0 && clubsMissingAdmin.length === 0;
    const step3 = {
      id: 'admins',
      done: step3Done,
      blockedBy: totalClubs === 0 ? 'clubs' : null,
      total: totalClubs,
      withAdmin: clubsWithAdmin,
      missingClubs: clubsMissingAdmin.slice(0, 5), // borne UI
    };

    // Step 4 — Sessions configurées
    const step4Done = totalClubs > 0 && clubsMissingSessions.length === 0;
    const step4 = {
      id: 'sessions',
      done: step4Done,
      blockedBy: totalClubs === 0
        ? 'clubs'
        : clubsWithAdmin === 0
          ? 'admins'
          : null,
      total: totalClubs,
      withSessions: clubsWithSessions,
      missingClubs: clubsMissingSessions.slice(0, 5),
      firstMissing: clubsMissingSessions[0] || attachedListEnriched[0] || null,
    };

    // Step 5 — Grande Finale configurée (optional si pas de session finale).
    // V2.6 : dérivé de l'existence d'une session kind='finale' AND club_id IS
    // NULL (cf. useFinale). Plus de lecture de editions.has_finale.
    // Les champs éditoriaux (location) restent lus depuis editions.finale_config
    // tant que la colonne existe — Phase 2 les migrera dans session_config.
    const hasFinale = !!finaleSession;
    const finaleCfg = (competition?.finale_config && typeof competition.finale_config === 'object')
      ? competition.finale_config
      : {};
    const finaleDate = finaleSession?.session_date || finaleCfg.date || null;
    const finaleName = finaleSession?.name || finaleCfg.name || null;
    const finaleLocation = finaleCfg.location || null;
    const step5Done = hasFinale && !!finaleDate && !!finaleLocation && !!finaleName;
    const step5 = {
      id: 'finale',
      done: step5Done,
      optional: !hasFinale,
      enabled: hasFinale,
      date:     finaleDate,
      location: finaleLocation,
      name:     finaleName,
      missingDate: hasFinale && !finaleDate,
      missingLocation: hasFinale && !finaleLocation,
    };

    // Step 6 — URLs publiques (toujours "open" — pas de "done" automatique,
    // on considère done quand step 1-5 sont done & step 2-4 ne sont pas vides)
    const step6Done = step1.done && step2.done && step3.done && step4.done && (step5.done || step5.optional);

    // Mode mono-club OR 0-1 club attaché → 2 liens génériques (apply + jury)
    // + 1 lien public. Le candidat/juré peut arriver sans préciser le club, le
    // form le déduira (mono : auto-sélectionné ; multi : il sélectionne).
    //
    // Mode multi-club avec ≥2 clubs attachés → 1 lien apply ET 1 lien jury PAR
    // CLUB (= N mini-compétitions). Pré-remplir &club= permet de masquer le
    // sélecteur de club dans le funnel candidat/juré et lui parle directement
    // de SA mini-compétition. Plus 1 lien public commun.
    let links = [];
    if (editionId) {
      const useGenericLinks = isMonoclub || attached.length <= 1;
      if (useGenericLinks) {
        links = [
          { key: 'apply',  path: `/Candidater?edition=${editionId}`, clubName: null },
          { key: 'jury',   path: `/DevenirJury?edition=${editionId}`, clubName: null },
          { key: 'public', path: '/Concours', clubName: null },
        ];
      } else {
        for (const row of attachedListEnriched) {
          links.push({
            key: `apply:${row.id}`,
            kind: 'apply',
            path: `/Candidater?edition=${editionId}&club=${encodeURIComponent(row.id)}`,
            clubId: row.id,
            clubName: row.name,
          });
          links.push({
            key: `jury:${row.id}`,
            kind: 'jury',
            path: `/DevenirJury?edition=${editionId}&club=${encodeURIComponent(row.id)}`,
            clubId: row.id,
            clubName: row.name,
          });
        }
        links.push({ key: 'public', kind: 'public', path: '/Concours', clubName: null });
      }
    }

    const step6 = {
      id: 'links',
      done: step6Done,
      isMulticlub: !isMonoclub && attached.length > 1,
      links,
    };

    // Completion percent — moyenne pondérée des steps requis (5 ou 6 selon
    // has_finale). Step1 contribue à hauteur de son identityPercent ; les
    // autres steps : 100 si done sinon 0.
    const requiredSteps = [
      step1.identityPercent,                    // 0..100
      step2.done ? 100 : 0,
      step3.done ? 100 : 0,
      step4.done ? 100 : 0,
    ];
    if (!step5.optional) {
      requiredSteps.push(step5.done ? 100 : 0);
    }
    const completionPercent = Math.round(
      requiredSteps.reduce((a, b) => a + b, 0) / requiredSteps.length,
    );

    return {
      isLoading,
      isError,
      summary: {
        completionPercent,
        totalClubs,
        clubsWithAdmin,
        clubsWithSessions,
        recommendedClubs,
        hasFinale,
        isMonoclub,
      },
      steps: [step1, step2, step3, step4, step5, step6],
    };
  }, [
    competition,
    attached,
    clubsWithAdminSet,
    clubsWithSessionsSet,
    finaleSession,
    editionId,
    isMonoclub,
    isLoading,
    isError,
    editionHasGlobalCoverage,
  ]);
}
