import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Shield, Users, Radio, Trophy, LogOut } from "lucide-react";
import { SESSIONS, SESSION_BY_ID, JURY_STATUS } from "@/lib/rsa/constants";
import { SessionConfig } from "@/lib/db";
import SetupTab from "@/components/rsa/admin/SetupTab";
import LiveTab from "@/components/rsa/admin/LiveTab";
import ResultsTab from "@/components/rsa/admin/ResultsTab";
import StatusPill from "@/components/rsa/admin/StatusPill";

const TABS = [
  { id: "setup", label: "Setup", Icon: Users },
  { id: "live", label: "Live", Icon: Radio },
  { id: "results", label: "Results", Icon: Trophy },
];

const GATE_KEY_LS = "rsa_admin_gate";
const GATE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const EXPECTED_KEY = import.meta.env.VITE_RSA_ADMIN_KEY || "";

function gateIsValid() {
  try {
    const raw = localStorage.getItem(GATE_KEY_LS);
    if (!raw) return false;
    const { expires } = JSON.parse(raw);
    return typeof expires === "number" && expires > Date.now();
  } catch {
    return false;
  }
}

function saveGate() {
  localStorage.setItem(
    GATE_KEY_LS,
    JSON.stringify({ expires: Date.now() + GATE_TTL_MS })
  );
}

function clearGate() {
  localStorage.removeItem(GATE_KEY_LS);
}

export default function RsaAdmin() {
  const [params, setParams] = useSearchParams();
  const [authed, setAuthed] = useState(() => {
    // Accept ?k=<key> on entry, then strip it
    const k = params.get("k");
    if (k && EXPECTED_KEY && k === EXPECTED_KEY) {
      saveGate();
      return true;
    }
    return gateIsValid();
  });
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState("");

  // Strip the key from the URL once consumed (avoids leaving it in history).
  useEffect(() => {
    if (params.get("k")) {
      const next = new URLSearchParams(params);
      next.delete("k");
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const [sessionRows, setSessionRows] = useState([]);
  const [sessionId, setSessionId] = useState(() => {
    // Default to the first session with status=live, else first session
    return localStorage.getItem("rsa_admin_session") || SESSIONS[0].id;
  });
  const [tab, setTab] = useState(() => localStorage.getItem("rsa_admin_tab") || "live");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const all = await SessionConfig.list("session_id");
      if (cancelled) return;
      setSessionRows(all);
      // Auto-pick the live session if any, else keep current
      const live = all.find((s) => s.status === JURY_STATUS.LIVE);
      if (live && !localStorage.getItem("rsa_admin_session")) {
        setSessionId(live.session_id);
      }
    }
    load();
    const unsub = SessionConfig.subscribe(() => {
      SessionConfig.list("session_id").then((rows) => !cancelled && setSessionRows(rows));
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("rsa_admin_session", sessionId);
  }, [sessionId]);

  useEffect(() => {
    localStorage.setItem("rsa_admin_tab", tab);
  }, [tab]);

  if (!authed) {
    function submit(e) {
      e?.preventDefault();
      if (!EXPECTED_KEY) {
        setKeyError("VITE_RSA_ADMIN_KEY is not set on this deploy — contact the organizer.");
        return;
      }
      if (keyInput.trim() === EXPECTED_KEY) {
        saveGate();
        setAuthed(true);
        setKeyError("");
      } else {
        setKeyError("Clé invalide.");
      }
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
        <form
          onSubmit={submit}
          className="max-w-md w-full bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-stone-600" />
            </div>
            <div>
              <h1 className="font-semibold text-stone-800">Console admin</h1>
              <p className="text-xs text-stone-500">Rotary Startup Award 2026</p>
            </div>
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Clé d'accès</label>
            <input
              autoFocus
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Coller la clé ici"
              className="w-full text-sm rounded-md border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
            {keyError && <p className="text-xs text-rose-600 mt-1">{keyError}</p>}
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 rounded-md text-sm font-medium bg-stone-800 text-white hover:bg-stone-900"
          >
            Entrer
          </button>
          <p className="text-[11px] text-stone-400 text-center">
            Tu peux aussi ouvrir <code>/RsaAdmin?k=&lt;clé&gt;</code> directement. La session
            reste valide 30 jours sur ce navigateur.
          </p>
        </form>
      </div>
    );
  }

  const session = SESSION_BY_ID[sessionId] || SESSIONS[0];
  const sessionRow = sessionRows.find((s) => s.session_id === sessionId);
  const status = sessionRow?.status || JURY_STATUS.DRAFT;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-stone-800">Rotary Startup Award 2026</h1>
            <p className="text-xs text-stone-500 mt-0.5">Live session console</p>
          </div>
          <a
            href="/RsaDashboard"
            className="text-[11px] text-stone-500 hover:text-stone-800 underline"
            title="Retour au dashboard RSA"
          >
            ↩ Dashboard
          </a>
          <button
            onClick={() => {
              clearGate();
              setAuthed(false);
            }}
            className="text-[11px] text-stone-400 hover:text-stone-700 inline-flex items-center gap-1"
            title="Effacer la clé d'accès sur ce navigateur"
          >
            <LogOut className="w-3 h-3" /> Déconnexion
          </button>
        </div>

        {/* Session selector */}
        <div className="flex flex-col items-end gap-2">
          <label className="text-[10px] uppercase tracking-wider text-stone-500">Session</label>
          <div className="flex gap-1 flex-wrap justify-end">
            {SESSIONS.map((s) => {
              const row = sessionRows.find((r) => r.session_id === s.id);
              const active = s.id === sessionId;
              return (
                <button
                  key={s.id}
                  onClick={() => setSessionId(s.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all flex items-center gap-1.5 ${
                    active
                      ? "bg-stone-800 text-white border-stone-800"
                      : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"
                  }`}
                >
                  <span>{s.emoji}</span>
                  <span className="hidden sm:inline">{s.label.split(" ")[0]}</span>
                  {row && row.status !== JURY_STATUS.DRAFT && (
                    <StatusPill status={row.status} size="sm" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-stone-200 mb-5 flex gap-1">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          const highlight = id === "live" && status === JURY_STATUS.LIVE;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? "border-stone-800 text-stone-800"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {highlight && !active && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      <div key={sessionId + "::" + tab}>
        {tab === "setup" && <SetupTab sessionId={sessionId} />}
        {tab === "live" && <LiveTab sessionId={sessionId} onResultsReady={() => {}} />}
        {tab === "results" && <ResultsTab sessionId={sessionId} />}
      </div>
    </div>
  );
}
