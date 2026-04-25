import React, { useEffect, useMemo, useState } from "react";
import { Trophy, Loader2, Check, AlertCircle, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { QUALIFYING_SESSIONS, FINAL_SESSION_ID, JURY_STATUS } from "@/lib/rsa/constants";
import { SessionConfig, StartupConfirmation } from "@/lib/db";
import { getPublishedWinner, getPublishedRunnerUp } from "@/lib/rsa/ranking";

// One row per qualifying session — shows the published winner (or "scoring in
// progress") and lets the admin add it to the finale, swap to runner-up, or
// remove. The 5 finalists are strictly bound to the 5 qualifiers (1 each).
export default function FinalistsPicker({ onChanged }) {
  const [qualifierRows, setQualifierRows] = useState([]);
  const [finalists, setFinalists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [allCfg, fc] = await Promise.all([
        SessionConfig.list("session_id"),
        StartupConfirmation.filter({ session_id: FINAL_SESSION_ID }),
      ]);
      const qualIds = QUALIFYING_SESSIONS.map((s) => s.id);
      setQualifierRows(allCfg.filter((c) => qualIds.includes(c.session_id)));
      setFinalists(fc);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const finalistBySource = useMemo(() => {
    const m = new Map();
    for (const f of finalists) {
      if (f.source_session_id) m.set(f.source_session_id, f);
    }
    return m;
  }, [finalists]);

  async function refreshOrder() {
    // Recompute session_order for the finale based on current confirmations.
    const fresh = await StartupConfirmation.filter({ session_id: FINAL_SESSION_ID });
    // Order by source session order (s1 → s5), wildcards (no source) at the end.
    const sorted = [...fresh].sort((a, b) => {
      const ai = QUALIFYING_SESSIONS.findIndex((s) => s.id === a.source_session_id);
      const bi = QUALIFYING_SESSIONS.findIndex((s) => s.id === b.source_session_id);
      if (ai === -1 && bi === -1) return a.startup_name.localeCompare(b.startup_name);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    await SessionConfig.updateBySessionId(FINAL_SESSION_ID, {
      session_order: sorted.map((f) => f.startup_name),
    });
  }

  async function addStartup(qualSession, startupName) {
    setWorking(true);
    try {
      await StartupConfirmation.create({
        session_id: FINAL_SESSION_ID,
        startup_name: startupName,
        source_session_id: qualSession.id,
      });
      await refreshOrder();
      toast.success(`${startupName} ajoutée à la finale`);
      await load();
      onChanged?.();
    } catch (err) {
      console.error(err);
      toast.error("Impossible d'ajouter la finaliste");
    } finally {
      setWorking(false);
    }
  }

  async function removeStartup(finalist) {
    setWorking(true);
    try {
      await StartupConfirmation.delete(finalist.id);
      await refreshOrder();
      toast.success(`${finalist.startup_name} retirée de la finale`);
      await load();
      onChanged?.();
    } catch (err) {
      console.error(err);
      toast.error("Impossible de retirer");
    } finally {
      setWorking(false);
    }
  }

  async function swap(qualSession, current, replacementName) {
    setWorking(true);
    try {
      await StartupConfirmation.delete(current.id);
      await StartupConfirmation.create({
        session_id: FINAL_SESSION_ID,
        startup_name: replacementName,
        source_session_id: qualSession.id,
      });
      await refreshOrder();
      toast.success(`Remplacée par ${replacementName}`);
      await load();
      onChanged?.();
    } catch (err) {
      console.error(err);
      toast.error("Impossible de remplacer");
    } finally {
      setWorking(false);
    }
  }

  async function syncAllWinners() {
    setWorking(true);
    try {
      let added = 0;
      for (const s of QUALIFYING_SESSIONS) {
        const row = qualifierRows.find((r) => r.session_id === s.id);
        if (row?.status !== JURY_STATUS.PUBLISHED) continue;
        const winner = getPublishedWinner(row);
        if (!winner) continue;
        if (finalistBySource.has(s.id)) continue;
        await StartupConfirmation.create({
          session_id: FINAL_SESSION_ID,
          startup_name: winner.startup_name,
          source_session_id: s.id,
        });
        added++;
      }
      await refreshOrder();
      toast.success(
        added === 0
          ? "Aucun nouveau vainqueur à ajouter"
          : `${added} vainqueur${added > 1 ? "s" : ""} ajouté${added > 1 ? "s" : ""}`
      );
      await load();
      onChanged?.();
    } catch (err) {
      console.error(err);
      toast.error("Synchronisation échouée");
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return <Loader2 className="w-5 h-5 animate-spin text-stone-400 mx-auto my-6" />;
  }

  const filledCount = QUALIFYING_SESSIONS.filter((s) => finalistBySource.has(s.id)).length;
  const publishedCount = qualifierRows.filter(
    (r) => r.status === JURY_STATUS.PUBLISHED
  ).length;
  const canSync = publishedCount > filledCount;

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ background: "#fdf6e8", borderColor: "#e8d090" }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-stone-800 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-600" />
            Finalistes ({filledCount}/5)
          </h3>
          <p className="text-xs text-stone-600 mt-0.5">
            Le vainqueur de chaque session qualificative passe en finale.
            Si un vainqueur ne peut pas venir, remplacez-le par le runner-up.
          </p>
        </div>
        <button
          onClick={syncAllWinners}
          disabled={working || !canSync}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-amber-300 bg-white hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed"
          title={
            canSync
              ? "Ajoute tous les vainqueurs publiés non encore présents"
              : "Aucun nouveau vainqueur à ajouter"
          }
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          Synchroniser les vainqueurs
        </button>
      </div>

      <div className="space-y-2">
        {QUALIFYING_SESSIONS.map((s) => {
          const row = qualifierRows.find((r) => r.session_id === s.id);
          const status = row?.status || JURY_STATUS.DRAFT;
          const isPublished = status === JURY_STATUS.PUBLISHED;
          const winner = isPublished ? getPublishedWinner(row) : null;
          const runnerUp = isPublished ? getPublishedRunnerUp(row) : null;
          const finalist = finalistBySource.get(s.id);

          return (
            <div
              key={s.id}
              className="flex items-center gap-3 bg-white border border-stone-200 rounded-lg p-3"
            >
              <span className="text-xl">{s.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-stone-800 truncate">{s.label}</div>
                {finalist ? (
                  <div className="text-xs mt-0.5 text-emerald-700">
                    <Check className="w-3 h-3 inline mr-1" />
                    En finale : <strong>{finalist.startup_name}</strong>
                  </div>
                ) : isPublished && winner ? (
                  <div className="text-xs mt-0.5 text-stone-600">
                    Vainqueur publié : <strong>{winner.startup_name}</strong>
                  </div>
                ) : (
                  <div className="text-xs mt-0.5 text-stone-400 inline-flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {status === JURY_STATUS.LOCKED
                      ? "Scoring verrouillé, à publier"
                      : status === JURY_STATUS.LIVE
                      ? "Scoring en cours"
                      : "Pas encore commencé"}
                  </div>
                )}
                {finalist && runnerUp && finalist.startup_name !== runnerUp.startup_name && (
                  <div className="text-[11px] mt-1 text-stone-500">
                    Runner-up : {runnerUp.startup_name}
                    <button
                      onClick={() => swap(s, finalist, runnerUp.startup_name)}
                      disabled={working}
                      className="ml-2 text-amber-700 hover:text-amber-900 underline disabled:opacity-40"
                    >
                      Remplacer
                    </button>
                  </div>
                )}
              </div>
              <div className="shrink-0">
                {finalist ? (
                  <button
                    onClick={() => removeStartup(finalist)}
                    disabled={working}
                    className="text-xs px-2.5 py-1 rounded border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-red-600 disabled:opacity-40"
                  >
                    Retirer
                  </button>
                ) : isPublished && winner ? (
                  <button
                    onClick={() => addStartup(s, winner.startup_name)}
                    disabled={working}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40"
                  >
                    Ajouter
                  </button>
                ) : (
                  <button
                    disabled
                    className="text-xs px-2.5 py-1 rounded border border-stone-200 text-stone-300 cursor-not-allowed"
                  >
                    En attente
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filledCount === 5 && (
        <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-2 flex items-center gap-2">
          <Check className="w-3.5 h-3.5" />
          Les 5 finalistes sont sélectionnés. La finale est prête.
        </div>
      )}
    </div>
  );
}
