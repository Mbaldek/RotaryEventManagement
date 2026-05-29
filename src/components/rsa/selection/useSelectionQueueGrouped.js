// useSelectionQueueGrouped — wrap pur du shape de useSelectionQueue qui
// regroupe les startups par (edition_id, club_id) pour la vue master_admin.
//
// Refonte hiérarchie : un master_admin voit la file de sélection comme un
// arbre Compétition ▸ Club ▸ Dossiers, plutôt qu'une liste plate (qui mélange
// startups de toutes les compétitions et clubs au même niveau).
//
// Volontairement une fonction pure (pas un hook React Query) — la requête de
// base reste useSelectionQueue ; le groupement est dérivé côté client à partir
// de `pages.flat()` (les rows portent déjà edition_id et club_id).
//
// Garantit l'ordre de première apparition (stable visuellement entre rerenders).

export const NO_CLUB_BUCKET = '__noClub__';
export const NO_EDITION_BUCKET = '__noEdition__';

export function groupSelectionPages(pages) {
  const flat = (pages || []).flatMap((p) => p || []);
  if (!flat.length) return [];

  const editionOrder = [];
  const editionsMap = new Map();

  for (const s of flat) {
    const eid = s.edition_id || NO_EDITION_BUCKET;
    const cid = s.club_id || NO_CLUB_BUCKET;
    if (!editionsMap.has(eid)) {
      editionsMap.set(eid, { editionId: eid, clubOrder: [], clubs: new Map() });
      editionOrder.push(eid);
    }
    const bucket = editionsMap.get(eid);
    if (!bucket.clubs.has(cid)) {
      bucket.clubs.set(cid, { clubId: cid, startups: [] });
      bucket.clubOrder.push(cid);
    }
    bucket.clubs.get(cid).startups.push(s);
  }

  return editionOrder.map((eid) => {
    const bucket = editionsMap.get(eid);
    const clubsArr = bucket.clubOrder.map((cid) => bucket.clubs.get(cid));
    const startupsCount = clubsArr.reduce((acc, c) => acc + c.startups.length, 0);
    return {
      editionId: eid,
      startupsCount,
      clubs: clubsArr,
    };
  });
}
