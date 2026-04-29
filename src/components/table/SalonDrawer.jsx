import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, MessageCircle } from "lucide-react";

const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#faf7f2";
const CREAM2 = "#e8e3d9";
const INK = "#3a3a52";
const MUTED = "#9090a8";

function getInitials(first, last) {
  const a = (first || "").trim().charAt(0);
  const b = (last || "").trim().charAt(0);
  return (a + b).toUpperCase() || "·";
}

function Eyebrow({ children }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-[1.5px] block" style={{ background: GOLD, width: 28 }} aria-hidden />
      <span
        className="uppercase text-[10px] tracking-[0.18em] font-medium"
        style={{ color: GOLD }}
      >
        {children}
      </span>
    </div>
  );
}

export default function SalonDrawer({ open, onClose, allSeats, allTables, onChat }) {
  const [query, setQuery] = useState("");

  const guests = useMemo(() => {
    const tableMap = new Map(allTables.map((t) => [t.id, t]));
    return allSeats
      .filter((s) => s.first_name)
      .map((s) => {
        const t = tableMap.get(s.table_id);
        // Keep `table_number` numeric (downstream consumers like ChatPanel
        // rely on it). `table_label` is the display string only.
        return {
          ...s,
          table_number: t?.table_number,
          table_label: t?.is_presidential ? "Prés." : t?.table_number,
          is_presidential: !!t?.is_presidential,
          gold: !!t?.is_presidential,
        };
      })
      .sort((a, b) => {
        // presidential first, then by table number, then by seat number
        if (a.gold && !b.gold) return -1;
        if (!a.gold && b.gold) return 1;
        const tn = (a.table_number || 0) - (b.table_number || 0);
        if (tn !== 0) return tn;
        return (a.seat_number || 0) - (b.seat_number || 0);
      });
  }, [allSeats, allTables]);

  const filtered = guests.filter((g) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      `${g.first_name} ${g.last_name}`.toLowerCase().includes(q) ||
      (g.job || "").toLowerCase().includes(q) ||
      String(g.table_label ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 backdrop-blur-sm"
            style={{ background: "rgba(15,31,61,0.35)" }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[420px] flex flex-col"
            style={{ background: CREAM, borderLeft: `1px solid ${CREAM2}` }}
          >
            <div
              className="px-5 py-5 flex items-start justify-between gap-3"
              style={{ borderBottom: `1px solid ${CREAM2}` }}
            >
              <div>
                <Eyebrow>Le salon</Eyebrow>
                <h2
                  className="text-[22px] leading-tight mt-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: NAVY,
                    fontWeight: 500,
                  }}
                >
                  Qui est <span className="italic">à la salle ?</span>
                </h2>
                <p className="text-[11px] mt-1" style={{ color: MUTED }}>
                  {guests.length} convive{guests.length > 1 ? "s" : ""} toutes tables confondues
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Fermer"
                className="shrink-0 w-8 h-8 flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                style={{ border: `1px solid ${CREAM2}`, borderRadius: 4 }}
              >
                <X className="w-4 h-4" style={{ color: MUTED }} />
              </button>
            </div>

            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${CREAM2}` }}>
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{ background: "white", border: `1px solid ${CREAM2}`, borderRadius: 4 }}
              >
                <Search className="w-3.5 h-3.5" style={{ color: MUTED }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher par nom, métier, table…"
                  className="flex-1 bg-transparent text-[13px] outline-none"
                  style={{ color: NAVY, fontFamily: "Inter, sans-serif" }}
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="text-[10px] uppercase tracking-[0.1em]"
                    style={{ color: MUTED }}
                  >
                    Effacer
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {filtered.length === 0 ? (
                <div
                  className="text-center py-10 text-[13px] italic"
                  style={{ color: MUTED, fontFamily: "'Playfair Display', serif" }}
                >
                  {query
                    ? `Personne ne correspond à « ${query} ».`
                    : "Aucun convive enregistré pour l'instant."}
                </div>
              ) : (
                filtered.map((g, i) => (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 + Math.min(i, 12) * 0.025, duration: 0.35 }}
                    className="group relative flex items-center gap-3 p-3 transition-all hover:-translate-y-[1px] overflow-hidden"
                    style={{
                      background: "white",
                      border: `1px solid ${CREAM2}`,
                      borderRadius: 4,
                    }}
                  >
                    <span
                      aria-hidden
                      className="absolute left-0 top-0 bottom-0 w-[2px] origin-top scale-y-0 group-hover:scale-y-100 transition-transform duration-500 ease-out"
                      style={{ background: GOLD }}
                    />
                    <div
                      className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                      style={{
                        background: g.gold ? GOLD : NAVY,
                        color: "white",
                        fontFamily: "'Playfair Display', serif",
                        fontWeight: 500,
                        fontSize: 12,
                      }}
                    >
                      {getInitials(g.first_name, g.last_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[14px] leading-tight truncate"
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          color: NAVY,
                          fontWeight: 500,
                        }}
                      >
                        {g.first_name} {g.last_name}
                      </div>
                      {g.job && (
                        <div className="text-[11px] truncate" style={{ color: INK }}>
                          {g.job}
                        </div>
                      )}
                    </div>
                    <span
                      className="shrink-0 text-[10px] uppercase tracking-[0.12em] font-medium px-2 py-0.5"
                      style={{
                        color: GOLD,
                        border: `1px solid ${CREAM2}`,
                        borderRadius: 2,
                      }}
                    >
                      {g.is_presidential ? "★" : `T. ${g.table_label}`}
                    </span>
                    {onChat && (
                      <button
                        onClick={() => onChat(g)}
                        aria-label="Chat"
                        className="shrink-0 w-8 h-8 flex items-center justify-center transition-all hover:scale-110"
                        style={{
                          background: "rgba(201,168,76,0.10)",
                          border: `1px solid ${CREAM2}`,
                          borderRadius: 4,
                        }}
                      >
                        <MessageCircle className="w-3.5 h-3.5" style={{ color: GOLD }} />
                      </button>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
