import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, Plus, Trash2, ChevronUp, ChevronDown, Check } from "lucide-react";
import { SESSION_BY_ID } from "@/lib/rsa/constants";
import { JuryProfile, SessionConfig, StartupConfirmation } from "@/lib/db";

export default function SetupTab({ sessionId }) {
  const session = SESSION_BY_ID[sessionId];
  const [loading, setLoading] = useState(true);
  const [jurors, setJurors] = useState([]);
  const [startups, setStartups] = useState([]);
  const [sessionRow, setSessionRow] = useState(null);
  const [newStartup, setNewStartup] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [allJury, startupRows, cfg] = await Promise.all([
          JuryProfile.list("nom"),
          StartupConfirmation.filter({ session_id: sessionId }),
          SessionConfig.filter({ session_id: sessionId }),
        ]);
        if (cancelled) return;
        setJurors(allJury);
        const cfgRow = cfg[0] ?? null;
        setSessionRow(cfgRow);

        // Use saved order, or derive from confirmations
        const order = Array.isArray(cfgRow?.session_order) && cfgRow.session_order.length > 0
          ? cfgRow.session_order
          : startupRows.map((s) => s.startup_name).sort((a, b) => a.localeCompare(b));
        // Reconcile with actual confirmations
        const byName = new Map(startupRows.map((s) => [s.startup_name, s]));
        const ordered = order.filter((n) => byName.has(n));
        // Append any confirmations not in order
        for (const s of startupRows) {
          if (!ordered.includes(s.startup_name)) ordered.push(s.startup_name);
        }
        setStartups(ordered.map((n) => byName.get(n)).filter(Boolean));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  async function toggleAssignment(juror) {
    setWorking(true);
    try {
      const assigned = juror.assigned_sessions || [];
      const hasLabel = assigned.includes(session.label);
      const hasId = assigned.includes(session.id);
      let next;
      if (hasLabel || hasId) {
        next = assigned.filter((a) => a !== session.label && a !== session.id);
      } else {
        next = [...assigned, session.label];
      }
      await JuryProfile.update(juror.id, { assigned_sessions: next });
      setJurors((prev) =>
        prev.map((j) => (j.id === juror.id ? { ...j, assigned_sessions: next } : j))
      );
    } catch (err) {
      console.error(err);
      toast.error("Could not update assignment");
    } finally {
      setWorking(false);
    }
  }

  async function toggleValidated(juror) {
    setWorking(true);
    try {
      await JuryProfile.update(juror.id, { validated: !juror.validated });
      setJurors((prev) =>
        prev.map((j) => (j.id === juror.id ? { ...j, validated: !juror.validated } : j))
      );
    } catch (err) {
      console.error(err);
      toast.error("Could not update validation");
    } finally {
      setWorking(false);
    }
  }

  async function addStartup() {
    const name = newStartup.trim();
    if (!name) return;
    if (startups.some((s) => s.startup_name.toLowerCase() === name.toLowerCase())) {
      toast.error("Already in this session");
      return;
    }
    setWorking(true);
    try {
      const row = await StartupConfirmation.create({
        session_id: sessionId,
        startup_name: name,
        status: "confirmed",
      });
      const nextList = [...startups, row];
      setStartups(nextList);
      setNewStartup("");
      await saveOrder(nextList);
    } catch (err) {
      console.error(err);
      toast.error("Could not add startup");
    } finally {
      setWorking(false);
    }
  }

  async function removeStartup(s) {
    if (!confirm(`Remove ${s.startup_name} from this session?`)) return;
    setWorking(true);
    try {
      await StartupConfirmation.delete(s.id);
      const nextList = startups.filter((x) => x.id !== s.id);
      setStartups(nextList);
      await saveOrder(nextList);
    } catch (err) {
      console.error(err);
      toast.error("Could not remove startup");
    } finally {
      setWorking(false);
    }
  }

  async function moveStartup(idx, dir) {
    const next = [...startups];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setStartups(next);
    await saveOrder(next);
  }

  async function saveOrder(list) {
    try {
      await SessionConfig.updateBySessionId(sessionId, {
        session_order: list.map((s) => s.startup_name),
      });
    } catch (err) {
      console.error(err);
      toast.error("Could not save order");
    }
  }

  async function saveSessionField(field, value) {
    try {
      await SessionConfig.updateBySessionId(sessionId, { [field]: value });
      setSessionRow((prev) => ({ ...(prev || {}), [field]: value }));
    } catch (err) {
      console.error(err);
      toast.error("Could not save");
    }
  }

  function copyJurorLink() {
    const url = `${window.location.origin}/RsaScore?s=${sessionId}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Juror link copied"),
      () => toast.error("Copy failed")
    );
  }

  if (loading) {
    return <Loader2 className="w-5 h-5 animate-spin text-stone-400 mx-auto my-12" />;
  }

  const assignedJurors = jurors.filter(
    (j) =>
      (j.assigned_sessions || []).includes(session.label) ||
      (j.assigned_sessions || []).includes(session.id)
  );

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl p-4 border flex items-center gap-3 flex-wrap"
        style={{ background: session.light, borderColor: session.border }}
      >
        <span className="text-2xl">{session.emoji}</span>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-stone-800">{session.label}</h2>
          <p className="text-xs text-stone-600 mt-0.5">{session.date}</p>
        </div>
        <button
          onClick={copyJurorLink}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-stone-300 bg-white hover:bg-stone-50"
        >
          <Copy className="w-3.5 h-3.5" /> Juror link
        </button>
      </div>

      {/* Session metadata */}
      <Section title="Session metadata" subtitle="">
        <div className="grid md:grid-cols-2 gap-3">
          <LabelledInput
            label="Teams link"
            value={sessionRow?.teams_link || ""}
            onBlur={(v) => v !== (sessionRow?.teams_link || "") && saveSessionField("teams_link", v)}
            placeholder="https://teams.microsoft.com/..."
          />
          <LabelledInput
            label="Airtable link"
            value={sessionRow?.airtable_link || ""}
            onBlur={(v) => v !== (sessionRow?.airtable_link || "") && saveSessionField("airtable_link", v)}
            placeholder="https://airtable.com/..."
          />
        </div>
        <div className="mt-3">
          <label className="text-xs text-stone-500 block mb-1">Notes</label>
          <textarea
            defaultValue={sessionRow?.notes || ""}
            onBlur={(e) => e.target.value !== (sessionRow?.notes || "") && saveSessionField("notes", e.target.value)}
            rows={2}
            className="w-full text-sm rounded-md border border-stone-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
      </Section>

      {/* Startups */}
      <Section
        title={`Startups in presentation order (${startups.length})`}
        subtitle="Reorder with arrows · order saved immediately"
      >
        <div className="space-y-2">
          {startups.map((s, i) => (
            <div
              key={s.id}
              className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg p-2"
            >
              <span className="w-6 text-center text-xs text-stone-400 font-semibold">{i + 1}</span>
              <button
                onClick={() => moveStartup(i, -1)}
                disabled={i === 0 || working}
                className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-30"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => moveStartup(i, 1)}
                disabled={i === startups.length - 1 || working}
                className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-30"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <span className="flex-1 text-sm font-medium text-stone-800">{s.startup_name}</span>
              <button
                onClick={() => removeStartup(s)}
                disabled={working}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded disabled:opacity-30"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={newStartup}
            onChange={(e) => setNewStartup(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addStartup()}
            placeholder="Add startup name…"
            className="flex-1 text-sm rounded-md border border-stone-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
          <button
            onClick={addStartup}
            disabled={!newStartup.trim() || working}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium bg-stone-800 text-white hover:bg-stone-900 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </Section>

      {/* Jurors */}
      <Section
        title={`Jurors (${assignedJurors.filter((j) => j.validated).length} validated & assigned · ${jurors.length} total)`}
        subtitle="Toggle the checkmark to assign a juror to this session. A juror must also be validated to see the scoring page."
      >
        <div className="space-y-2">
          {jurors.map((j) => {
            const assigned =
              (j.assigned_sessions || []).includes(session.label) ||
              (j.assigned_sessions || []).includes(session.id);
            return (
              <div
                key={j.id}
                className={`flex items-center gap-3 bg-white border rounded-lg p-2.5 ${
                  assigned ? "border-emerald-300" : "border-stone-200"
                }`}
              >
                <button
                  onClick={() => toggleAssignment(j)}
                  disabled={working}
                  className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${
                    assigned
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "bg-white border-stone-300 text-transparent hover:border-emerald-400"
                  }`}
                >
                  <Check className="w-4 h-4" />
                </button>
                {j.photo_base64 ? (
                  <img src={j.photo_base64} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-xs text-stone-500">
                    {j.prenom?.[0]}
                    {j.nom?.[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-stone-800 truncate">
                    {j.prenom} {j.nom}
                  </div>
                  <div className="text-xs text-stone-500 truncate">{j.qualite}</div>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-stone-600">
                  <input
                    type="checkbox"
                    checked={!!j.validated}
                    onChange={() => toggleValidated(j)}
                    disabled={working}
                  />
                  Validated
                </label>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-stone-700 mb-1">{title}</h3>
      {subtitle && <p className="text-xs text-stone-500 mb-3">{subtitle}</p>}
      {children}
    </section>
  );
}

function LabelledInput({ label, value, onBlur, placeholder }) {
  return (
    <div>
      <label className="text-xs text-stone-500 block mb-1">{label}</label>
      <input
        type="text"
        defaultValue={value}
        onBlur={(e) => onBlur(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm rounded-md border border-stone-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
      />
    </div>
  );
}
