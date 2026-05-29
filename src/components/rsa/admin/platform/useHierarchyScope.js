// useHierarchyScope — source de vérité unique pour la hiérarchie Master ▸ Compétition ▸ Club.
//
// Source = scope URL (?scope=master | competition:{eid} | club:{eid}/{cid}). Le hook
// expose :
//   * parsed              : { kind, editionId, clubId, isLegacy }
//   * breadcrumbItems     : items pour <HierarchyBreadcrumb />
//   * resolvedLegacyScope : string canonique si on a résolu un ?scope=club:{cid} legacy
//                           en ?scope=club:{eid}/{cid}, sinon null
//   * isResolvingLegacy   : boolean
//
// Convention :
//   - club:{eid}/{cid}  = forme canonique V3 (club scopé à une édition)
//   - club:{cid}        = forme legacy V2 (juste un club_id)
//   - competition:{eid} = vue compétition
//   - master            = vue plateforme
//
// La résolution legacy cherche la 1re édition active où le club participe
// (cf. EditionClub.forClub). Si aucune édition n'est trouvée, on retombe
// silencieusement sur le defaultScope côté caller (effectiveScope).

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EditionClub } from '@/lib/rsa/entities';
import { useAllCompetitions, useAllClubs } from './master/useMaster';

const LABEL_MASTER = { fr: 'Master', en: 'Master', de: 'Master' };

export function parseScope(scope) {
  if (!scope || scope === 'master') {
    return { kind: 'master', editionId: null, clubId: null, isLegacy: false };
  }
  if (scope === 'legacy') {
    return { kind: 'legacy', editionId: null, clubId: null, isLegacy: false };
  }
  if (scope === 'none') {
    return { kind: 'none', editionId: null, clubId: null, isLegacy: false };
  }
  if (scope.startsWith('competition:')) {
    return {
      kind: 'competition',
      editionId: scope.slice('competition:'.length),
      clubId: null,
      isLegacy: false,
    };
  }
  if (scope.startsWith('club:')) {
    const rest = scope.slice('club:'.length);
    if (rest.includes('/')) {
      const [editionId, clubId] = rest.split('/');
      return { kind: 'club', editionId, clubId, isLegacy: false };
    }
    return { kind: 'club', editionId: null, clubId: rest, isLegacy: true };
  }
  return { kind: 'master', editionId: null, clubId: null, isLegacy: false };
}

export default function useHierarchyScope({ scope, t, setScope }) {
  const parsed = useMemo(() => parseScope(scope), [scope]);

  // Résolution silencieuse club:{cid} → club:{eid}/{cid}.
  const legacyResolution = useQuery({
    queryKey: ['rsa', 'hierarchy', 'resolve-club', parsed.clubId],
    enabled: parsed.isLegacy && !!parsed.clubId,
    staleTime: 60 * 1000,
    queryFn: () => EditionClub.forClub(parsed.clubId),
  });

  const resolvedLegacyScope = (parsed.isLegacy && legacyResolution.data)
    ? `club:${legacyResolution.data}/${parsed.clubId}`
    : null;

  // Forme effective utilisée pour résoudre les labels du breadcrumb.
  const effective = useMemo(
    () => (resolvedLegacyScope ? parseScope(resolvedLegacyScope) : parsed),
    [parsed, resolvedLegacyScope],
  );

  // Hooks data — n'invoque pas plus que nécessaire : useAllCompetitions est gratuit
  // si le master a déjà loadé sa liste (staleTime 60s, partagé via React Query).
  // useAllClubs idem. Pour un caller hors master (club_admin), ces hooks renverront
  // simplement [] via RPC ; on n'a alors qu'à utiliser les ids bruts.
  const competitionsQ = useAllCompetitions();
  const allClubsQ = useAllClubs();

  const breadcrumbItems = useMemo(() => {
    if (effective.kind !== 'competition' && effective.kind !== 'club') return [];

    const items = [{
      label: t(LABEL_MASTER),
      onClick: () => setScope('master'),
    }];

    const ed = (competitionsQ.data || []).find((c) => c.id === effective.editionId);
    items.push({
      label: ed?.name || effective.editionId,
      onClick: effective.kind === 'club'
        ? () => setScope(`competition:${effective.editionId}`)
        : null,
    });

    if (effective.kind === 'club') {
      const cl = (allClubsQ.data || []).find((c) => c.id === effective.clubId);
      items.push({
        label: cl?.name || effective.clubId,
        onClick: null,
      });
    }

    return items;
  }, [effective, competitionsQ.data, allClubsQ.data, t, setScope]);

  return {
    parsed,
    effective,
    resolvedLegacyScope,
    isResolvingLegacy: legacyResolution.isLoading,
    breadcrumbItems,
  };
}
