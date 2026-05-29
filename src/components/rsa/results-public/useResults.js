// useResults — hook React Query qui charge l'intégralité du palmarès d'une édition
// publique en UNE seule requête à la vue `public.public_palmares` (cf.
// docs/hardening/m4c-public-results-rls.md).
//
// La vue renvoie une ligne par session publiée d'une édition publique
// (public_results_enabled = true ET session_config.status = 'published'). Chaque
// ligne embarque le snapshot `final_ranking` jsonb (tableau ordonné par
// final_rank ASC), matérialisé par `rsa_publish_session`.
//
// Si `editionId` est fourni (via ?edition=2026), on filtre dessus. Sinon, on
// retient l'édition publiée la plus récente (max edition_year). Toute la résolution
// est faite côté client : pas de cascade de queries.
//
// Performance : staleTime généreux (5 min) — la page peut être hammered le jour de
// la finale, et les données sont stables une fois publiées. Pas de subscribe
// Realtime (résultats figés post-publish).

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const STALE_MS = 5 * 60 * 1000; // 5 minutes

async function fetchPalmaresRows(editionId) {
  let q = supabase.from('public_palmares').select('*');
  if (editionId) q = q.eq('edition_id', editionId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// Agrège la liste à plat de la vue en un objet structuré pour la page :
//   { edition, finaleSession, qualifyingSessions, laureat, specialPrizeRanking,
//     finalistsFromFinale, hasResults }
function shapePalmares(rows, requestedEditionId) {
  if (!rows.length) return null;

  // Si pas d'editionId demandé : retient l'édition la plus récente disponible.
  let pickedEditionId = requestedEditionId;
  if (!pickedEditionId) {
    pickedEditionId = rows.reduce((acc, r) => {
      if (!acc) return r.edition_id;
      return r.edition_year > rows.find((x) => x.edition_id === acc).edition_year
        ? r.edition_id
        : acc;
    }, null);
  }

  const editionRows = rows.filter((r) => r.edition_id === pickedEditionId);
  if (!editionRows.length) return null;

  // Tous les rows partagent les colonnes edition_* — on en extrait UNE.
  const ref = editionRows[0];
  const edition = {
    id: ref.edition_id,
    name: ref.edition_name,
    year: ref.edition_year,
    finale_date: ref.finale_date,
    awards_date: ref.awards_date,
    prize_main: ref.prize_main,
    prize_special: ref.prize_special,
    finalists_per_session: ref.finalists_per_session,
  };

  // Sépare finale et sessions qualificatives. Une édition n'a (par convention) qu'UNE
  // finale (`is_final = true` OR `session_kind = 'finale'`). On accepte les deux pour
  // robustesse (la legacy 2026 utilise `is_final`, M4 préfère `kind='finale'`).
  const finaleSession = editionRows.find(
    (r) => r.is_final === true || r.session_kind === 'finale',
  );

  const qualifyingSessions = editionRows
    .filter((r) => r !== finaleSession)
    .sort((a, b) => (a.session_position ?? 0) - (b.session_position ?? 0));

  // Lauréat : rank 1 du final_ranking de la finale.
  const finaleRanking = Array.isArray(finaleSession?.final_ranking)
    ? finaleSession.final_ranking
    : [];
  const laureat = finaleRanking.find((r) => r.final_rank === 1) || null;
  const specialPrize = finaleRanking.find((r) => r.final_rank === 2) || null;
  // Finalistes = tous ceux qui ont participé à la finale.
  const finalistsFromFinale = finaleRanking;

  return {
    edition,
    finaleSession: finaleSession || null,
    qualifyingSessions,
    laureat,
    specialPrize,
    finalistsFromFinale,
    hasResults: Boolean(finaleSession || qualifyingSessions.length),
  };
}

// Charge l'édition la plus récente non publique pour deviner une "date prévue" à
// afficher dans le placeholder "pas encore public". Cosmétique — on ne casse pas la
// page si la requête échoue (anon RLS peut rejeter selon configuration).
export function useNextEditionHint() {
  return useQuery({
    queryKey: ['rsa', 'public-palmares', 'next-edition-hint'],
    queryFn: async () => {
      // On essaye d'attraper UNE édition non publique pour deviner la date prévue.
      // Si la RLS bloque (probable côté anon), on renvoie null silencieusement.
      try {
        const { data, error } = await supabase
          .from('editions')
          .select('id, year, finale_date, public_results_enabled, status')
          .eq('public_results_enabled', false)
          .order('year', { ascending: false })
          .limit(1);
        if (error) return null;
        return data?.[0] ?? null;
      } catch {
        return null;
      }
    },
    staleTime: STALE_MS,
    retry: false,
  });
}

// Charge l'info "édition ouverte" (status='open') pour décider d'afficher le CTA
// "candidater à l'édition suivante" en footer. Anon peut lire les editions non-draft
// via la policy editions_anon_public_only (uniquement public_results_enabled=true),
// donc si l'édition open n'est pas public_results_enabled, la requête renverra []. On
// reste résilient : pas d'erreur fatale.
export function useOpenEditionLink() {
  return useQuery({
    queryKey: ['rsa', 'public-palmares', 'open-edition'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('editions')
          .select('id, year, status')
          .eq('status', 'open')
          .order('year', { ascending: false })
          .limit(1);
        if (error) return null;
        return data?.[0] ?? null;
      } catch {
        return null;
      }
    },
    staleTime: STALE_MS,
    retry: false,
  });
}

// Hook principal — la page passe un editionId facultatif (du query param).
export function useResults(editionId) {
  const queryKey = useMemo(
    () => ['rsa', 'public-palmares', editionId || '__latest__'],
    [editionId],
  );

  const query = useQuery({
    queryKey,
    queryFn: () => fetchPalmaresRows(editionId),
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
  });

  const shaped = useMemo(
    () => (query.data ? shapePalmares(query.data, editionId) : null),
    [query.data, editionId],
  );

  return {
    ...query,
    palmares: shaped,
  };
}
