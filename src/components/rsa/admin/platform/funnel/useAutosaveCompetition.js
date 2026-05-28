// useAutosaveCompetition — hook d'autosave debounced pour une compétition.
//
// API :
//   const {
//     values,           // state local du form (toujours frais)
//     patch,            // (fields) => void  — merge + déclenche save debounced
//     flush,            // () => Promise     — force le save immédiat
//     status,           // 'idle' | 'saving' | 'saved' | 'error'
//     statusMessage,    // "Enregistré il y a 3s"
//     errorMessage,     // string | null (dernière erreur Supabase)
//   } = useAutosaveCompetition({ editionId, initialValues, debounceMs });
//
// Workflow interne :
//   * pendingRef.current accumule les patchs (merge) avant la save effective ;
//   * un setTimeout(debounceMs) déclenche la save → Edition.patch via
//     useUpdateCompetition ;
//   * si un nouveau patch arrive pendant qu'on save, on l'accumule et on relance
//     le debounce ;
//   * unmount → flush automatique (best effort) ;
//   * lastSavedAt tracké → statusMessage rafraîchi toutes les 5s.
//
// Note : initialValues n'est utilisé qu'au premier mount ; les rehydrations
// (ex. nouveau editionId) sont gérées par le consommateur (re-mount key={id}).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUpdateCompetition } from '../master/useMaster';
import { useLang } from '@/lib/platform/i18n';
import { COMP } from '../master/i18n';

function formatAgo(t, ms) {
  if (ms == null) return '';
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 3) return t(COMP.autosaveJustNow);
  if (sec < 60) return t(COMP.autosaveSecondsAgo).replace('{n}', String(sec));
  const min = Math.floor(sec / 60);
  if (min < 60) return t(COMP.autosaveMinutesAgo).replace('{n}', String(min));
  const h = Math.floor(min / 60);
  return t(COMP.autosaveHoursAgo).replace('{n}', String(h));
}

export default function useAutosaveCompetition({
  editionId,
  initialValues = {},
  debounceMs = 600,
}) {
  const { t } = useLang();
  const update = useUpdateCompetition();

  const [values, setValues] = useState(() => initialValues || {});
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [tick, setTick] = useState(0); // pour rafraîchir le message ago

  const pendingRef = useRef(null);
  const debounceRef = useRef(null);
  const inFlightRef = useRef(false);
  const editionIdRef = useRef(editionId);
  // V2.6 fix M1 : bypass setState après unmount (les mutations en vol au
  // moment de la fermeture de la modale terminent leur await silencieusement).
  const isUnmountedRef = useRef(false);

  // Garde la référence courante (un editionId qui change en cours est rare —
  // créa puis édition — mais on veut taper le bon ID si une save est en vol).
  useEffect(() => {
    editionIdRef.current = editionId;
  }, [editionId]);

  // Tick toutes les 5s pour rafraîchir le "il y a Xs".
  useEffect(() => {
    if (!lastSavedAt) return undefined;
    const id = window.setInterval(() => setTick((n) => n + 1), 5000);
    return () => window.clearInterval(id);
  }, [lastSavedAt]);

  const runSave = useCallback(async () => {
    const id = editionIdRef.current;
    if (!id) return; // pas encore créé — caller doit appeler create d'abord
    const acc = pendingRef.current;
    pendingRef.current = null;
    debounceRef.current = null;
    if (!acc || Object.keys(acc).length === 0) return;
    inFlightRef.current = true;
    if (!isUnmountedRef.current) {
      setStatus('saving');
      setErrorMessage(null);
    }
    try {
      await update.mutateAsync({ id, patch: acc });
      // Si un patch est arrivé en cours, on le sauvegarde tout de suite.
      if (pendingRef.current && Object.keys(pendingRef.current).length > 0) {
        // Re-run sans debounce — un autre flush couvrira l'éventuel suivant.
        await runSave();
        return;
      }
      if (!isUnmountedRef.current) {
        setLastSavedAt(Date.now());
        setStatus('saved');
      }
    } catch (err) {
      if (!isUnmountedRef.current) {
        setStatus('error');
        setErrorMessage(err?.message || 'Save failed');
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [update]);

  const patch = useCallback(
    (fields) => {
      if (!fields || typeof fields !== 'object') return;
      setValues((prev) => ({ ...prev, ...fields }));
      pendingRef.current = { ...(pendingRef.current || {}), ...fields };
      // Skip réseau si pas d'editionId (mode pré-création) — le state local
      // continue d'évoluer ; le consommateur fera Create puis flush manuel.
      if (!editionIdRef.current) return;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        runSave();
      }, debounceMs);
    },
    [debounceMs, runSave],
  );

  const flush = useCallback(async () => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (!editionIdRef.current) return;
    if (!pendingRef.current || Object.keys(pendingRef.current).length === 0) return;
    await runSave();
  }, [runSave]);

  // Flush au démontage (best effort — on swallow l'éventuelle rejection).
  useEffect(() => () => {
    // V2.6 fix M1 : marque unmount AVANT le flush final pour bypasser les
    // setState post-await dans runSave().
    isUnmountedRef.current = true;
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (editionIdRef.current && pendingRef.current && Object.keys(pendingRef.current).length > 0) {
      runSave().catch(() => {});
    }
  }, [runSave]);

  const statusMessage = useMemo(() => {
    // tick est utilisé pour réactualiser le memo
    void tick;
    if (status === 'saving') return t(COMP.autosaveSaving);
    if (status === 'error') return errorMessage || t(COMP.autosaveError);
    if (status === 'saved' && lastSavedAt) {
      const ago = formatAgo(t, Date.now() - lastSavedAt);
      return t(COMP.autosaveSavedAgo).replace('{ago}', ago);
    }
    return '';
  }, [status, errorMessage, lastSavedAt, t, tick]);

  // Setter de remplacement complet (pour rehydrater depuis le serveur si besoin).
  const reset = useCallback((next) => {
    setValues(next || {});
    pendingRef.current = null;
    setStatus('idle');
    setErrorMessage(null);
    setLastSavedAt(null);
  }, []);

  return {
    values,
    patch,
    flush,
    reset,
    status,
    statusMessage,
    errorMessage,
    isSaving: status === 'saving',
  };
}
