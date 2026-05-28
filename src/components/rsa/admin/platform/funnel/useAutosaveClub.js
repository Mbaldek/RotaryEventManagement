// useAutosaveClub — hook d'autosave débouncé pour un club existant.
//
// Pattern : symétrique de useAutosaveCompetition (livré par l'autre agent en
// parallèle) et inspiré de CandidatureFunnel.flushPending/queueAutosave.
//
// Usage :
//   const {
//     values,      // état local (snappy) — utiliser pour binder les inputs
//     patch,       // (partial) => void — merge local + queue autosave débouncé
//     flush,       // () => Promise — flush immédiat (close, blur, submit…)
//     status,      // 'idle' | 'saving' | 'saved' | 'error'
//     statusMessage,
//     error,       // dernière erreur serveur (string ou null)
//   } = useAutosaveClub({ clubId, initialValues, debounceMs: 600 });
//
// Convention payload : on passe à Club.updateClub({ id, ...partial }) — donc les
// clés doivent être celles du RPC rsa_update_club (camelCase côté JS,
// contactFirstName / contactLastName / clubAddress / etc.). Voir le mapping
// clubRowToForm dans ClubForm.jsx pour la liste exhaustive.
//
// Sécurité : la RLS + RPC SECURITY DEFINER côté serveur sont la frontière
// (master_admin OR club_admin du club). Le hook ne valide rien — il fait juste
// remonter une éventuelle erreur SQL dans `error`.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Club } from '@/lib/rsa/entities';
import { KEYS } from '@/components/rsa/admin/platform/master/useMaster';

const DEFAULT_DEBOUNCE = 600;

export default function useAutosaveClub({
  clubId,
  initialValues = {},
  debounceMs = DEFAULT_DEBOUNCE,
}) {
  const qc = useQueryClient();
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);

  const pendingRef = useRef(null); // accumulateur de patches en attente
  const debounceRef = useRef(null);
  const clubIdRef = useRef(clubId);
  // Garde une seule mutation en vol — on chain plutôt que de lancer en parallèle.
  const inFlightRef = useRef(null);
  // Timer pour repasser 'saved' -> 'idle' après 2s
  const savedTimerRef = useRef(null);

  // Si l'identité du club change, on resync.
  useEffect(() => {
    clubIdRef.current = clubId;
  }, [clubId]);

  // Resync values si le clubId change (par ex. après création).
  // (Intentionnel : on ne veut PAS resync à chaque changement de initialValues,
  //  uniquement quand on bascule sur un autre club.)
  useEffect(() => {
    setValues(initialValues);

  }, [clubId]);

  // ── Persistence interne ─────────────────────────────────────────────────────
  const persist = useCallback(async (patch) => {
    const id = clubIdRef.current;
    if (!id || !patch || Object.keys(patch).length === 0) return null;
    setStatus('saving');
    setStatusMessage('');
    setError(null);

    // Chain : si une mutation est en vol, on attend qu'elle finisse avant de
    // lancer la nôtre (évite l'ordre de paquets out-of-order côté serveur).
    const previous = inFlightRef.current;
    if (previous) {
      try {
        await previous;
      } catch {
        /* ignore — on enchaîne quand même */
      }
    }

    const promise = (async () => {
      try {
        const row = await Club.updateClub({ id, ...patch });
        // Invalidation queries master Pour rafraîchir card list etc.
        qc.invalidateQueries({ queryKey: KEYS.clubs });
        setStatus('saved');
        setStatusMessage('');
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => {
          setStatus('idle');
          setStatusMessage('');
        }, 1800);
        return row;
      } catch (err) {
        setStatus('error');
        const msg = err?.message || 'Error';
        setStatusMessage(msg);
        setError(msg);
        throw err;
      } finally {
        if (inFlightRef.current === promise) inFlightRef.current = null;
      }
    })();
    inFlightRef.current = promise;
    return promise.catch(() => null);
  }, [qc]);

  // ── Flush immédiat ──────────────────────────────────────────────────────────
  const flush = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const patch = pendingRef.current;
    pendingRef.current = null;
    if (patch && Object.keys(patch).length > 0) {
      return persist(patch);
    }
    // Si une mutation est en vol, on l'attend.
    return inFlightRef.current || Promise.resolve(null);
  }, [persist]);

  // ── patch(partial) : merge local + queue débouncée ──────────────────────────
  const patch = useCallback((partial) => {
    if (!partial || typeof partial !== 'object') return;
    setValues((prev) => ({ ...prev, ...partial }));
    pendingRef.current = { ...(pendingRef.current || {}), ...partial };
    if (!clubIdRef.current) {
      // Pas encore créé — on laisse l'accumulateur attendre que le caller appelle
      // patch après création (le ClubFunnel reset values et flush au bon moment).
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const acc = pendingRef.current;
      pendingRef.current = null;
      debounceRef.current = null;
      if (acc && Object.keys(acc).length) persist(acc);
    }, debounceMs);
  }, [persist, debounceMs]);

  // Cleanup au démontage : flush silencieux des changements en attente.
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    const acc = pendingRef.current;
    pendingRef.current = null;
    if (acc && Object.keys(acc).length && clubIdRef.current) {
      // best-effort : on lance et on swallow (unmount -> on ne peut pas await)
      persist(acc).catch(() => {});
    }
  }, [persist]);

  return useMemo(() => ({
    values,
    setValues, // exposé pour reset complet (par ex. après création)
    patch,
    flush,
    status,
    statusMessage,
    error,
  }), [values, patch, flush, status, statusMessage, error]);
}
