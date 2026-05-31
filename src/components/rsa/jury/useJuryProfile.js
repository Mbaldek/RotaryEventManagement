// Hooks TanStack Query du drawer profil juré (vue admin "Attribution des jurés").
//
// Colocalisés avec jury/* ; on N'ÉDITE PAS useJury.js (collisions parallèles) — on
// IMPORTE ses exports quand utile. Frontière sécurité = RLS + RPC SECURITY DEFINER ;
// ces hooks sont rendus dans un arbre déjà gaté admin.
//
// Données résolues ici :
//   - useJuryProfileCard(userId)         : platform_jury_profiles (qualite/orga/bio/photo_path)
//   - useJurorPhotoUrl(photoPath)        : signed URL bucket privé 'jury-photos'
//   - useJurorWishes({ email, editionId }) : availability_session_ids depuis jury_applications
//                                            (parcourt les clubs de l'édition, match par email)
//   - useJurorSessionScores({ juryUserId, sessions }) : note moyenne pondérée par session

import { useQueries, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  EditionClub,
  JuryApplication,
  JuryProfile,
  JuryScore,
  Startup,
} from '@/lib/rsa/entities';
import { weightedScore } from '@/lib/rsa/constants';

const PHOTO_BUCKET = 'jury-photos';

export const PROFILE_KEYS = {
  card: (uid) => ['rsa', 'jury', 'profile-card', uid],
  photo: (path) => ['rsa', 'jury', 'profile-photo', path],
  wishes: (email, editionId) => ['rsa', 'jury', 'profile-wishes', editionId, String(email || '').toLowerCase()],
  sessionScores: (uid, sids) => ['rsa', 'jury', 'profile-scores', uid, ...(sids || []).slice().sort()],
};

// ── Fiche profil (qualite / organisation / bio / photo_path) ────────────────
export function useJuryProfileCard(userId) {
  return useQuery({
    queryKey: PROFILE_KEYS.card(userId),
    queryFn: () => JuryProfile.mine(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

// ── URL signée de la photo (bucket privé jury-photos) ───────────────────────
// TTL court régénéré au besoin. Renvoie null si pas de path (le composant
// tombe alors sur les initiales).
export function useJurorPhotoUrl(photoPath) {
  return useQuery({
    queryKey: PROFILE_KEYS.photo(photoPath),
    queryFn: async () => {
      if (!photoPath) return null;
      const { data, error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(photoPath, 300);
      if (error) return null; // photo introuvable / RLS — fallback initiales
      return data?.signedUrl ?? null;
    },
    enabled: !!photoPath,
    staleTime: 4 * 60 * 1000,
  });
}

// ── Sessions souhaitées (availability_session_ids de la candidature jury) ───
// Le juré est rattaché à un club ; sa candidature vit dans jury_applications du
// club. On liste les clubs de l'édition (EditionClub.forEdition) puis on cherche
// la candidature approuvée dont l'email matche. On renvoie availability_session_ids.
export function useJurorWishes({ email, editionId }) {
  return useQuery({
    queryKey: PROFILE_KEYS.wishes(email, editionId),
    queryFn: async () => {
      if (!email || !editionId) return [];
      const target = String(email).toLowerCase();
      const editionClubs = await EditionClub.forEdition(editionId);
      const clubIds = Array.from(
        new Set((editionClubs || []).map((ec) => ec.club_id).filter(Boolean)),
      );
      if (clubIds.length === 0) return [];
      // listByClub(clubId, null) = toutes candidatures ; on filtre par email côté client.
      const lists = await Promise.all(clubIds.map((cid) => JuryApplication.listByClub(cid, null)));
      const all = lists.flat();
      // On privilégie la candidature 'approved' la plus récente, sinon la plus récente tout court.
      const mine = all.filter((a) => String(a.email || '').toLowerCase() === target);
      if (mine.length === 0) return [];
      mine.sort((a, b) => {
        const aApp = a.status === 'approved' ? 0 : 1;
        const bApp = b.status === 'approved' ? 0 : 1;
        if (aApp !== bApp) return aApp - bApp;
        return String(b.applied_at || '').localeCompare(String(a.applied_at || ''));
      });
      const ids = mine[0]?.availability_session_ids;
      return Array.isArray(ids) ? ids : [];
    },
    enabled: !!email && !!editionId,
    staleTime: 2 * 60 * 1000,
  });
}

// ── Scores par session ──────────────────────────────────────────────────────
// Pour CHAQUE session passée, on calcule la note du juré :
//   - Y = nb de startups de la session (Startup.filter({ session_id })).
//   - scores = JuryScore.forSession(sid), filtrés sur jury_user_id === juryUserId.
//   - X = nb de scores COMPLETS (weightedScore non null) du juré dans la session.
//   - note moyenne = moyenne des weightedScore (0..5) sur les X startups notées,
//     null si X === 0.
// Renvoie un map { [sessionId]: { avg, rated, total, hasOpened } } où hasOpened
// indique qu'au moins un score existe pour la session (la grille a été ouverte).
//
// On utilise useQueries pour paralléliser un fetch par session sans violer les
// règles des hooks (le nombre de sessions est stable pendant la vie du drawer).
export function useJurorSessionScores({ juryUserId, sessions }) {
  const list = Array.isArray(sessions) ? sessions : [];

  const queries = useQueries({
    queries: list.map((s) => ({
      queryKey: ['rsa', 'jury', 'profile-session-score', juryUserId, s.id],
      enabled: !!juryUserId && !!s.id,
      staleTime: 30 * 1000,
      queryFn: async () => {
        const [scores, startups] = await Promise.all([
          JuryScore.forSession(s.id),
          Startup.filter({ session_id: s.id }),
        ]);
        const mine = (scores || []).filter((row) => row.jury_user_id === juryUserId);
        const weighted = mine
          .map((row) => weightedScore(row))
          .filter((v) => v != null);
        const rated = weighted.length;
        const total = Array.isArray(startups) ? startups.length : 0;
        const avg = rated > 0 ? weighted.reduce((sum, v) => sum + v, 0) / rated : null;
        return {
          sessionId: s.id,
          avg,
          rated,
          total,
          hasOpened: mine.length > 0,
        };
      },
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const byId = {};
  queries.forEach((q, i) => {
    const s = list[i];
    if (s && q.data) byId[s.id] = q.data;
  });

  return { byId, isLoading, isError };
}
