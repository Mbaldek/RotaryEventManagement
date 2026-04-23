import React, { useState, useEffect } from "react";
import { RestaurantTable, Seat, getCurrentUser } from "@/lib/db";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getTableCapacity } from "@/lib/utils";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Settings, CalendarCheck, LayoutGrid } from "lucide-react";
import TableCard from "../components/dashboard/TableCard";
import TableCustomizer from "../components/admin/TableCustomizer";
import { toast } from "sonner";

// Design tokens — "Elysée" (see docs/design-system.md)
const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#faf7f2";
const CREAM2 = "#e8e3d9";
const INK = "#3a3a52";
const MUTED = "#9090a8";

// ─────────────────────────────────────────────────────────────────────────────

function Eyebrow({ children, color = GOLD }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <motion.span
        className="h-[1.5px] block origin-left"
        style={{ background: color, width: 28 }}
        aria-hidden
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-20% 0px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.span
        className="uppercase text-[10px] tracking-[0.18em] font-medium"
        style={{ color }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-20% 0px" }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        {children}
      </motion.span>
    </div>
  );
}

function AnimatedNumber({ value, suffix = "" }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: 1100, bounce: 0 });
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    mv.set(value);
    const unsub = spring.on("change", (v) => setDisplay(Math.round(v)));
    return () => unsub();
  }, [value, mv, spring]);
  return <>{display}{suffix}</>;
}

function StatCell({ value, label, index = 0, isPercent = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative py-2"
    >
      <div
        className="text-[32px] md:text-[42px] leading-none tabular-nums"
        style={{ fontFamily: "'Playfair Display', serif", color: NAVY, fontWeight: 500 }}
      >
        <AnimatedNumber value={value} suffix={isPercent ? "%" : ""} />
      </div>
      <div
        className="text-[10px] uppercase tracking-[0.15em] font-medium mt-2"
        style={{ color: MUTED }}
      >
        {label}
      </div>
    </motion.div>
  );
}

function EditorialButton({ to, icon: Icon, children, tone = "default" }) {
  const tones = {
    default: { bg: "white", text: NAVY, border: CREAM2 },
    gold: { bg: "white", text: NAVY, border: GOLD },
  };
  const t = tones[tone];
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.15em] font-medium transition-all hover:-translate-y-[1px]"
      style={{
        background: t.bg,
        color: t.text,
        border: `1px solid ${t.border}`,
        borderRadius: 4,
      }}
    >
      {Icon && <Icon className="w-3.5 h-3.5" style={{ color: GOLD }} />}
      <span>{children}</span>
      <span
        aria-hidden
        className="inline-block transition-transform duration-300 group-hover:translate-x-1"
        style={{ color: GOLD }}
      >
        →
      </span>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [customizingTable, setCustomizingTable] = useState(null);
  const queryClient = useQueryClient();

  const { data: tables = [] } = useQuery({
    queryKey: ["allTables"],
    queryFn: () => RestaurantTable.list("table_number"),
  });

  const { data: allSeats = [] } = useQuery({
    queryKey: ["allSeats"],
    queryFn: () => Seat.list(),
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const customizeTableMutation = useMutation({
    mutationFn: async ({ tableId, data }) => {
      await RestaurantTable.update(tableId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allTables"] });
      setCustomizingTable(null);
      toast.success("Table personnalisée");
    },
  });

  const totalOccupied = allSeats.filter((s) => s.first_name).length;
  const totalReserved = allSeats.filter((s) => s.is_reserved).length;
  const totalCapacity = tables.reduce((sum, t) => sum + getTableCapacity(t), 0);
  const totalTaken = totalOccupied + totalReserved;
  const totalFree = Math.max(0, totalCapacity - totalTaken);

  const getOccupiedSeatsForTable = (tableId) =>
    allSeats.filter((s) => s.table_id === tableId && s.first_name).length;
  const getReservedSeatsForTable = (tableId) =>
    allSeats.filter((s) => s.table_id === tableId && s.is_reserved).length;

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: CREAM, color: NAVY }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
      `}</style>

      <div className="relative max-w-[1100px] mx-auto px-5 md:px-8 pt-10 md:pt-16 pb-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-start justify-between gap-4 flex-wrap mb-10 md:mb-14"
        >
          <div className="max-w-xl">
            <Eyebrow>Vue d'ensemble</Eyebrow>
            <h1
              className="text-[32px] md:text-[48px] leading-[1.05]"
              style={{ fontFamily: "'Playfair Display', serif", color: NAVY }}
            >
              Le salon{" "}
              <span className="italic">et ses convives</span>
            </h1>
            <p
              className="text-sm md:text-[15px] mt-4 max-w-md"
              style={{ color: INK, lineHeight: 1.65 }}
            >
              {tables.length} table{tables.length > 1 ? "s" : ""} · {totalOccupied} occupé
              {totalOccupied > 1 ? "s" : ""} · {totalReserved} réservé
              {totalReserved > 1 ? "s" : ""} · {totalFree} libre
              {totalFree > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <EditorialButton to={createPageUrl("Reservations")} icon={CalendarCheck}>
              Réservations
            </EditorialButton>
            {user?.role === "admin" && (
              <EditorialButton to={createPageUrl("AdminControl")} icon={Settings}>
                Administration
              </EditorialButton>
            )}
          </div>
        </motion.div>

        {/* Stats row — editorial, no boxes */}
        <div
          className="grid grid-cols-3 gap-x-6 gap-y-6 mb-14 md:mb-16 py-6"
          style={{ borderTop: `1px solid ${CREAM2}`, borderBottom: `1px solid ${CREAM2}` }}
        >
          <StatCell value={tables.length} label="Tables" index={0} />
          <StatCell value={totalOccupied} label="Sièges occupés" index={1} />
          <StatCell value={totalReserved} label="Sièges réservés" index={2} />
        </div>

        {/* Tables section */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15% 0px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6 flex items-end justify-between gap-4 flex-wrap"
          >
            <div>
              <Eyebrow>Le plan de salle</Eyebrow>
              <h2
                className="text-[26px] md:text-[34px] leading-[1.05]"
                style={{ fontFamily: "'Playfair Display', serif", color: NAVY }}
              >
                {tables.length > 0 ? (
                  <>
                    Les {tables.length} tables{" "}
                    <span className="italic">du déjeuner</span>
                  </>
                ) : (
                  <span className="italic">Aucune table</span>
                )}
              </h2>
            </div>
          </motion.div>

          {tables.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="py-20 text-center"
              style={{ border: `1px solid ${CREAM2}`, borderRadius: 4, background: "white" }}
            >
              <LayoutGrid className="w-10 h-10 mx-auto mb-4" style={{ color: MUTED }} />
              <p className="text-sm mb-6" style={{ color: INK }}>
                Aucune table n'a encore été créée.
              </p>
              {user?.role === "admin" && (
                <EditorialButton to={createPageUrl("AdminControl")} tone="gold">
                  Créer des tables
                </EditorialButton>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {tables.map((table, i) => {
                const totalSeats = getTableCapacity(table);
                const occupiedCount = getOccupiedSeatsForTable(table.id);
                const reservedCount = getReservedSeatsForTable(table.id);
                return (
                  <motion.div
                    key={table.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-5% 0px" }}
                    transition={{
                      duration: 0.55,
                      delay: Math.min(i * 0.04, 0.4),
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <TableCard
                      table={table}
                      occupiedCount={occupiedCount}
                      reservedCount={reservedCount}
                      totalSeats={totalSeats}
                      onCustomize={setCustomizingTable}
                    />
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Table Customizer Modal */}
      {customizingTable && (
        <TableCustomizer
          table={customizingTable}
          onSave={(data) =>
            customizeTableMutation.mutate({ tableId: customizingTable.id, data })
          }
          onClose={() => setCustomizingTable(null)}
        />
      )}
    </div>
  );
}
