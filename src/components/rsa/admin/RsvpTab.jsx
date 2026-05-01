import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Download,
  Copy,
  Trash2,
  Mic2,
  Users,
  Trophy,
  RefreshCcw,
  Check,
  X,
  Search,
} from "lucide-react";
import { FinaleRsvp } from "@/lib/db";
import { SESSION_BY_ID } from "@/lib/rsa/constants";

const ROLE_META = {
  pitcher: {
    Icon: Mic2,
    label: "Pitcher",
    color: "#9a6400",
    bg: "#fdf6e8",
    border: "#e8d090",
  },
  visitor: {
    Icon: Users,
    label: "Visiteur",
    color: "#4a2a7a",
    bg: "#f0eaf8",
    border: "#c8b0e8",
  },
  jury: {
    Icon: Trophy,
    label: "Juré",
    color: "#1a5fa8",
    bg: "#e8f0fb",
    border: "#a8c8f0",
  },
};

export default function RsvpTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | pitcher | visitor | jury | yes | no
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await FinaleRsvp.list("-created_at");
      setRows(data);
    } catch (err) {
      console.error(err);
      toast.error("Could not load RSVPs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const unsub = FinaleRsvp.subscribe(() => load());
    return () => unsub?.();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "yes" && !r.attending) return false;
      if (filter === "no" && r.attending) return false;
      if (["pitcher", "visitor", "jury"].includes(filter) && r.role !== filter) return false;
      if (!q) return true;
      const hay = [r.prenom, r.nom, r.email, r.organisation, r.startup_name, r.message]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, filter, search]);

  const stats = useMemo(() => {
    const out = {
      total: rows.length,
      yes: 0,
      no: 0,
      pitcher: 0,
      visitor: 0,
      jury: 0,
      headcount: 0,
    };
    for (const r of rows) {
      if (r.attending) {
        out.yes++;
        out.headcount += r.party_size || 1;
      } else out.no++;
      if (r.role in out) out[r.role]++;
    }
    return out;
  }, [rows]);

  function copyEmails() {
    const emails = filtered.filter((r) => r.email).map((r) => r.email);
    const dedup = [...new Set(emails)];
    if (dedup.length === 0) {
      toast.error("Aucun email à copier");
      return;
    }
    navigator.clipboard.writeText(dedup.join(", ")).then(
      () => toast.success(`${dedup.length} email${dedup.length > 1 ? "s" : ""} copié${dedup.length > 1 ? "s" : ""}`),
      () => toast.error("Copie impossible")
    );
  }

  function downloadCSV() {
    const headers = [
      "created_at",
      "role",
      "attending",
      "party_size",
      "prenom",
      "nom",
      "organisation",
      "email",
      "telephone",
      "startup_name",
      "source_session_id",
      "message",
    ];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      lines.push(
        headers
          .map((h) => {
            let v = r[h];
            if (v == null) return "";
            if (h === "attending") v = v ? "yes" : "no";
            if (h === "created_at") v = new Date(v).toISOString();
            return csvField(v);
          })
          .join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rsa-finale-rsvp-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function deleteRow(id) {
    setDeleting(id);
    try {
      await FinaleRsvp.delete(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("RSVP supprimé");
    } catch (err) {
      console.error(err);
      toast.error("Suppression impossible");
    } finally {
      setDeleting(null);
    }
  }

  function copyShareLink(role) {
    const base = window.location.origin + "/RsaFinaleRsvp";
    const url = role ? `${base}?role=${role}` : base;
    navigator.clipboard.writeText(url).then(
      () => toast.success(`Lien ${role || "générique"} copié`),
      () => toast.error("Copie impossible")
    );
  }

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div
        className="rounded-xl p-4 border"
        style={{ background: "#fdf6e8", borderColor: "#e8d090" }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xl">🏆</span>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-stone-800">Grande Finale — RSVP</h2>
            <p className="text-xs text-stone-600 mt-0.5">
              Confirmations de présence (pitchers, visiteurs, jury). Mise à jour temps réel.
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-amber-300 bg-white hover:bg-amber-50"
          >
            <RefreshCcw className="w-3.5 h-3.5" /> Recharger
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat
          label="Total réponses"
          value={stats.total}
          sub={`${stats.yes} oui · ${stats.no} non`}
        />
        <Stat
          label="Présents (têtes)"
          value={stats.headcount}
          sub={`${stats.yes} confirmation${stats.yes > 1 ? "s" : ""}`}
          accent="emerald"
        />
        <Stat
          label="Pitchers"
          value={stats.pitcher}
          sub="finalistes"
          accent="amber"
        />
        <Stat label="Visiteurs" value={stats.visitor} sub="invités" accent="violet" />
        <Stat label="Jury" value={stats.jury} sub="juré finale" accent="blue" />
      </div>

      {/* Share links */}
      <div className="rounded-lg border border-stone-200 bg-white p-3 flex items-center gap-3 flex-wrap">
        <span className="text-xs text-stone-500 font-medium">Liens RSVP à partager :</span>
        {[
          { id: "pitcher", lbl: "Pitcher" },
          { id: "visitor", lbl: "Visiteur" },
          { id: "jury", lbl: "Juré" },
          { id: null, lbl: "Générique" },
        ].map((r) => (
          <button
            key={r.lbl}
            onClick={() => copyShareLink(r.id)}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-stone-300 hover:bg-stone-50"
          >
            <Copy className="w-3 h-3" /> {r.lbl}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {[
            { id: "all", lbl: "Tous" },
            { id: "yes", lbl: "Présents" },
            { id: "no", lbl: "Absents" },
            { id: "pitcher", lbl: "Pitcher" },
            { id: "visitor", lbl: "Visiteur" },
            { id: "jury", lbl: "Juré" },
          ].map((f) => {
            const on = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                  on
                    ? "bg-stone-800 text-white border-stone-800"
                    : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"
                }`}
              >
                {f.lbl}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="pl-8 pr-3 py-1.5 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/30 w-48"
            />
          </div>
          <button
            onClick={copyEmails}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-stone-300 bg-white hover:bg-stone-50 disabled:opacity-50"
          >
            <Copy className="w-3.5 h-3.5" /> Copier emails
          </button>
          <button
            onClick={downloadCSV}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-stone-300 bg-white hover:bg-stone-50 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-stone-200 bg-white overflow-x-auto">
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-sm italic">
            Aucun RSVP {filter !== "all" ? "pour ce filtre" : "pour le moment"}.
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-stone-50 border-b border-stone-200 text-xs uppercase tracking-wider text-stone-600">
              <tr>
                <th className="text-left p-3 w-24">Rôle</th>
                <th className="text-center p-3 w-20">Présent</th>
                <th className="text-center p-3 w-16">Pers.</th>
                <th className="text-left p-3">Personne</th>
                <th className="text-left p-3">Société / Startup</th>
                <th className="text-left p-3">Contact</th>
                <th className="text-left p-3">Origine</th>
                <th className="text-left p-3">Message</th>
                <th className="text-right p-3 w-32">Quand</th>
                <th className="text-center p-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const meta = ROLE_META[r.role] || ROLE_META.visitor;
                const Icon = meta.Icon;
                const session = SESSION_BY_ID[r.source_session_id];
                return (
                  <tr key={r.id} className="border-b border-stone-100 hover:bg-stone-50/50">
                    <td className="p-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border"
                        style={{
                          background: meta.bg,
                          color: meta.color,
                          borderColor: meta.border,
                        }}
                      >
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {r.attending ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-rose-500 mx-auto" />
                      )}
                    </td>
                    <td className="p-3 text-center text-sm font-semibold text-stone-700 tabular-nums">
                      {r.attending ? r.party_size || 1 : "—"}
                    </td>
                    <td className="p-3 text-sm">
                      <div className="font-medium text-stone-800">
                        {r.prenom} {r.nom}
                      </div>
                    </td>
                    <td className="p-3 text-sm text-stone-700">
                      <div>{r.organisation || "—"}</div>
                      {r.startup_name && r.startup_name !== r.organisation && (
                        <div className="text-xs text-stone-400">{r.startup_name}</div>
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      {r.email && (
                        <a
                          href={`mailto:${r.email}`}
                          className="text-stone-700 hover:text-amber-700"
                        >
                          {r.email}
                        </a>
                      )}
                      {r.telephone && (
                        <div className="text-stone-500 mt-0.5">{r.telephone}</div>
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      {session ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border"
                          style={{
                            background: session.light,
                            color: session.color,
                            borderColor: session.border,
                          }}
                        >
                          {session.emoji} {session.label.split(/&|—/)[0].trim()}
                        </span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-stone-500 max-w-xs">
                      {r.message ? (
                        <div className="line-clamp-2" title={r.message}>
                          {r.message}
                        </div>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-xs text-stone-500 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `Supprimer la réponse de ${r.prenom} ${r.nom} ?`
                            )
                          ) {
                            deleteRow(r.id);
                          }
                        }}
                        disabled={deleting === r.id}
                        className="text-stone-300 hover:text-rose-600 transition-colors"
                        title="Supprimer"
                      >
                        {deleting === r.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }) {
  const accentMap = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    violet: "text-violet-700",
    blue: "text-blue-700",
  };
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-3">
      <div className="text-[10px] text-stone-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold ${accentMap[accent] || "text-stone-800"}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-stone-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function csvField(s) {
  if (s == null) return "";
  const str = String(s);
  if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}
