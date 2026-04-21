import React, { useEffect, useState } from "react";
import { Shield, Users, Radio, Trophy } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
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

export default function RsaAdmin() {
  const { user, isLoadingAuth } = useAuth();
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

  if (isLoadingAuth) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-lg mx-auto mt-20 p-6 text-center">
        <Shield className="w-12 h-12 text-stone-300 mx-auto mb-3" />
        <h1 className="text-lg font-semibold text-stone-800">Admin access required</h1>
        <p className="text-sm text-stone-600 mt-1">
          Only accounts with the <code>admin</code> role in the profiles table can open this
          console.
        </p>
      </div>
    );
  }

  const session = SESSION_BY_ID[sessionId] || SESSIONS[0];
  const sessionRow = sessionRows.find((s) => s.session_id === sessionId);
  const status = sessionRow?.status || JURY_STATUS.DRAFT;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-stone-800">Rotary Startup Award 2026</h1>
          <p className="text-xs text-stone-500 mt-0.5">Live session console</p>
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
