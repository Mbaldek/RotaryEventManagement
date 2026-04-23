import React, { useState } from "react";
import { Reservation, RestaurantTable, Seat, UpcomingEvent } from "@/lib/db";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Users,
  Phone,
  Mail,
  MessageSquare,
  Check,
  X,
  Play,
  Square,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import ReservationForm from "../components/reservations/ReservationForm";

// Design tokens — "Elysée"
const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#faf7f2";
const CREAM2 = "#e8e3d9";
const INK = "#3a3a52";
const MUTED = "#9090a8";

// Status palette — editorial soft tints
const STATUS = {
  pending:   { label: "En attente",  tint: "#fbf4e0", text: "#8b6b14", dot: "#c9a84c" },
  confirmed: { label: "Confirmée",   tint: "#ecf1e5", text: "#4c6b2a", dot: "#7ba348" },
  launched:  { label: "Lancée",      tint: "#e8ecf3", text: NAVY,      dot: NAVY },
  cancelled: { label: "Annulée",     tint: "#f3ebe8", text: "#8a4a4a", dot: "#b06a6a" },
};

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

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.pending;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] font-medium"
      style={{
        background: s.tint,
        color: s.text,
        border: `1px solid ${CREAM2}`,
        borderRadius: 3,
      }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: s.dot }}
      />
      {s.label}
    </span>
  );
}

// Editorial outline action button
function ActionBtn({ onClick, icon: Icon, children, tone = "default", className = "" }) {
  const tones = {
    default: { bg: "white", color: NAVY, border: CREAM2, iconColor: GOLD },
    gold:    { bg: "white", color: NAVY, border: GOLD,   iconColor: GOLD },
    danger:  { bg: "white", color: "#8a4a4a", border: "#e5cfcf", iconColor: "#b06a6a" },
    ghost:   { bg: "transparent", color: MUTED, border: CREAM2, iconColor: MUTED },
  };
  const t = tones[tone];
  return (
    <button
      onClick={onClick}
      className={`group inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-[0.15em] font-medium transition-all hover:-translate-y-[1px] ${className}`}
      style={{
        background: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`,
        borderRadius: 4,
      }}
    >
      {Icon && <Icon className="w-3.5 h-3.5" style={{ color: t.iconColor }} />}
      <span>{children}</span>
    </button>
  );
}

// Primary CTA (solid navy)
function PrimaryCTA({ onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className="group inline-flex items-center gap-2 px-4 py-2.5 text-[11px] uppercase tracking-[0.15em] font-medium transition-all hover:-translate-y-[1px]"
      style={{
        background: NAVY,
        color: "white",
        border: `1px solid ${NAVY}`,
        borderRadius: 4,
      }}
    >
      {Icon && <Icon className="w-3.5 h-3.5" style={{ color: GOLD }} />}
      <span>{children}</span>
      <ArrowUpRight
        className="w-3.5 h-3.5 transition-transform group-hover:translate-x-[2px] group-hover:-translate-y-[2px]"
        style={{ color: GOLD }}
      />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Reservations() {
  const [showForm, setShowForm] = useState(false);
  const [launchingReservation, setLaunchingReservation] = useState(null);
  const [availableTables, setAvailableTables] = useState([]);
  const queryClient = useQueryClient();

  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations"],
    queryFn: () => Reservation.list("-reservation_date"),
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["allTables"],
    queryFn: () => RestaurantTable.list("table_number"),
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["upcomingEvents"],
    queryFn: () => UpcomingEvent.list("event_date"),
  });

  const today = new Date().toISOString().split("T")[0];
  const futureEvents = upcomingEvents.filter(
    (ev) => ev.event_date && ev.event_date >= today
  );

  const createReservationMutation = useMutation({
    mutationFn: async (data) => {
      await Reservation.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setShowForm(false);
      toast.success("Réservation créée avec succès");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      await Reservation.update(id, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      const statusText = variables.status === "confirmed" ? "confirmée" : "annulée";
      toast.success(`Réservation ${statusText}`);
    },
  });

  const deleteReservationMutation = useMutation({
    mutationFn: async (id) => {
      await Reservation.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      toast.success("Réservation supprimée");
    },
  });

  const launchReservationMutation = useMutation({
    mutationFn: async ({ reservation, tableId }) => {
      const allSeats = await Seat.list();
      const selectedTable = tables.find((t) => t.id === tableId);
      if (!selectedTable) throw new Error("Table introuvable");

      const maxSeats = selectedTable.is_presidential ? 12 : 8;
      const tableSeats = allSeats.filter((s) => s.table_id === tableId);
      const occupiedNumbers = tableSeats.map((s) => s.seat_number);

      const available = [];
      for (let i = 1; i <= maxSeats; i++) {
        if (!occupiedNumbers.includes(i)) available.push(i);
      }

      if (available.length < reservation.number_of_people) {
        throw new Error(
          `Table ${selectedTable.table_number} n'a que ${available.length} place(s) disponible(s)`
        );
      }

      const availableSeatNumbers = available.slice(0, reservation.number_of_people);
      const seatsToCreate = [];
      for (let idx = 0; idx < reservation.number_of_people; idx++) {
        seatsToCreate.push({
          event_id: reservation.event_id,
          table_id: tableId,
          seat_number: availableSeatNumbers[idx],
          is_reserved: true,
          reserved_by: reservation.guest_name,
          reservation_id: reservation.id,
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          member_number: "",
          comment: "",
          guest_token: crypto.randomUUID().slice(0, 8),
        });
      }

      await Seat.bulkCreate(seatsToCreate);
      await Reservation.update(reservation.id, {
        status: "launched",
        table_id: tableId,
        table_number: selectedTable.table_number,
      });

      return selectedTable;
    },
    onSuccess: (selectedTable) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["allSeats"] });
      toast.success(
        `Réservation lancée · Table ${selectedTable.table_number} assignée`
      );
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors du lancement");
    },
  });

  const releaseReservationMutation = useMutation({
    mutationFn: async (reservation) => {
      const seats = await Seat.filter({ reservation_id: reservation.id });
      await Promise.all(seats.map((seat) => Seat.delete(seat.id)));
      await Reservation.update(reservation.id, {
        status: "confirmed",
        table_id: null,
        table_number: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["allSeats"] });
      toast.success("Réservation libérée — sièges supprimés");
    },
  });

  const handleShowAvailableTables = async (reservation) => {
    const allSeats = await Seat.list();
    const available = [];
    for (const table of tables) {
      const maxSeats = table.is_presidential ? 12 : 8;
      const tableSeats = allSeats.filter((s) => s.table_id === table.id);
      const occupiedCount = tableSeats.length;
      const freeSeats = maxSeats - occupiedCount;
      if (freeSeats >= reservation.number_of_people) {
        available.push({ ...table, freeSeats, maxSeats });
      }
    }
    setAvailableTables(available);
    setLaunchingReservation(reservation);
  };

  const byStatus = {
    pending:   reservations.filter((r) => r.status === "pending"),
    confirmed: reservations.filter((r) => r.status === "confirmed"),
    launched:  reservations.filter((r) => r.status === "launched"),
    cancelled: reservations.filter((r) => r.status === "cancelled"),
  };

  return (
    <div
      className="min-h-screen relative"
      style={{ background: CREAM, color: NAVY }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
      `}</style>

      <div className="relative max-w-[1000px] mx-auto px-5 md:px-8 pt-10 md:pt-14 pb-20">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <Link
            to={createPageUrl("Index")}
            className="group inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] transition-colors"
            style={{ color: MUTED }}
          >
            <ArrowLeft
              className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1"
              style={{ color: GOLD }}
            />
            <span>Retour à l'accueil</span>
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-start justify-between gap-4 flex-wrap mb-10 md:mb-14"
        >
          <div>
            <Eyebrow>Le carnet</Eyebrow>
            <h1
              className="text-[32px] md:text-[48px] leading-[1.05]"
              style={{ fontFamily: "'Playfair Display', serif", color: NAVY }}
            >
              Les <span className="italic">réservations</span>
            </h1>
            <p
              className="text-sm md:text-[15px] mt-4"
              style={{ color: INK, lineHeight: 1.65 }}
            >
              {reservations.length} demande{reservations.length > 1 ? "s" : ""} enregistrée
              {reservations.length > 1 ? "s" : ""}
              {byStatus.pending.length > 0
                ? ` · ${byStatus.pending.length} en attente`
                : ""}
              {byStatus.launched.length > 0
                ? ` · ${byStatus.launched.length} lancée${
                    byStatus.launched.length > 1 ? "s" : ""
                  }`
                : ""}
            </p>
          </div>
          <PrimaryCTA
            icon={Plus}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Fermer" : "Nouvelle réservation"}
          </PrimaryCTA>
        </motion.div>

        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="mb-10"
            >
              <ReservationForm
                tables={tables}
                events={futureEvents}
                onSubmit={(data) => createReservationMutation.mutate(data)}
                onCancel={() => setShowForm(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reservations list */}
        {reservations.length === 0 ? (
          <div
            className="py-20 text-center"
            style={{ border: `1px solid ${CREAM2}`, borderRadius: 4, background: "white" }}
          >
            <p className="text-sm italic" style={{ color: MUTED, fontFamily: "'Playfair Display', serif" }}>
              Aucune réservation pour le moment.
            </p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {reservations.map((reservation, i) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                index={i}
                onConfirm={() => updateStatusMutation.mutate({ id: reservation.id, status: "confirmed" })}
                onCancel={() => updateStatusMutation.mutate({ id: reservation.id, status: "cancelled" })}
                onLaunch={() => handleShowAvailableTables(reservation)}
                onRelease={() => releaseReservationMutation.mutate(reservation)}
                onDelete={() => deleteReservationMutation.mutate(reservation.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Table Selection Modal */}
      <AnimatePresence>
        {launchingReservation && (
          <TableSelectionModal
            reservation={launchingReservation}
            availableTables={availableTables}
            onSelect={(tableId) => {
              launchReservationMutation.mutate({
                reservation: launchingReservation,
                tableId,
              });
              setLaunchingReservation(null);
              setAvailableTables([]);
            }}
            onClose={() => {
              setLaunchingReservation(null);
              setAvailableTables([]);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ReservationCard({
  reservation,
  index,
  onConfirm,
  onCancel,
  onLaunch,
  onRelease,
  onDelete,
}) {
  const date = new Date(reservation.reservation_date).toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-5% 0px" }}
      transition={{
        duration: 0.55,
        delay: Math.min(index * 0.04, 0.3),
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group relative transition-all duration-300 hover:-translate-y-[1px]"
      style={{ background: "white", border: `1px solid ${CREAM2}`, borderRadius: 4 }}
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[2px] origin-top scale-y-0 group-hover:scale-y-100 transition-transform duration-500 ease-out"
        style={{ background: GOLD }}
      />

      <div className="p-5 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div className="min-w-0 flex-1">
            <div
              className="text-[10px] uppercase tracking-[0.15em] font-medium mb-1.5"
              style={{ color: MUTED }}
            >
              {date}
            </div>
            <h3
              className="text-[20px] md:text-[24px] leading-tight"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: NAVY,
                fontWeight: 500,
              }}
            >
              {reservation.guest_name}
            </h3>
            {reservation.table_number && (
              <div
                className="inline-flex items-center gap-1.5 mt-2 text-[11px] uppercase tracking-[0.15em]"
                style={{ color: GOLD, fontWeight: 500 }}
              >
                <span className="inline-block w-1 h-1 rounded-full" style={{ background: GOLD }} />
                Table {reservation.table_number}
              </div>
            )}
          </div>
          <StatusBadge status={reservation.status} />
        </div>

        {/* Meta grid */}
        <div
          className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3 text-[13px]"
          style={{ borderTop: `1px solid ${CREAM2}`, borderBottom: `1px solid ${CREAM2}`, color: INK }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" style={{ color: GOLD }} />
            {reservation.number_of_people} personne{reservation.number_of_people > 1 ? "s" : ""}
          </span>
          {reservation.guest_email && (
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} />
              <span className="truncate">{reservation.guest_email}</span>
            </span>
          )}
          {reservation.guest_phone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" style={{ color: GOLD }} />
              {reservation.guest_phone}
            </span>
          )}
        </div>

        {/* Notes */}
        {reservation.notes && (
          <div
            className="flex items-start gap-2.5 mt-4 p-3 text-[13px] italic"
            style={{
              background: CREAM,
              borderRadius: 3,
              color: INK,
              fontFamily: "'Playfair Display', serif",
            }}
          >
            <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: GOLD }} />
            <span>« {reservation.notes} »</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-5">
          {reservation.status === "pending" && (
            <>
              <ActionBtn icon={Check} tone="gold" onClick={onConfirm} className="flex-1 min-w-[140px]">
                Confirmer
              </ActionBtn>
              <ActionBtn icon={X} tone="danger" onClick={onCancel} className="flex-1 min-w-[140px]">
                Annuler
              </ActionBtn>
            </>
          )}

          {reservation.status === "confirmed" && (
            <>
              <ActionBtn icon={Play} tone="gold" onClick={onLaunch} className="flex-1 min-w-[180px]">
                Lancer · Choisir table
              </ActionBtn>
              <ActionBtn tone="ghost" onClick={onDelete}>
                Supprimer
              </ActionBtn>
            </>
          )}

          {reservation.status === "launched" && (
            <ActionBtn icon={Square} tone="danger" onClick={onRelease} className="flex-1">
              Libérer · supprimer les sièges
            </ActionBtn>
          )}

          {reservation.status === "cancelled" && (
            <ActionBtn tone="ghost" onClick={onDelete} className="w-full">
              Supprimer définitivement
            </ActionBtn>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function TableSelectionModal({ reservation, availableTables, onSelect, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,31,61,0.5)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-xl w-full max-h-[80vh] overflow-auto"
        style={{ background: CREAM, border: `1px solid ${CREAM2}`, borderRadius: 4 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 md:p-7" style={{ borderBottom: `1px solid ${CREAM2}` }}>
          <Eyebrow>Assignation</Eyebrow>
          <h2
            className="text-[22px] md:text-[26px] leading-tight"
            style={{ fontFamily: "'Playfair Display', serif", color: NAVY, fontWeight: 500 }}
          >
            Choisir une table pour{" "}
            <span className="italic">{reservation.guest_name}</span>
          </h2>
          <p className="text-xs md:text-[13px] mt-2" style={{ color: MUTED }}>
            {reservation.number_of_people} personne
            {reservation.number_of_people > 1 ? "s" : ""} ·{" "}
            {availableTables.length} table
            {availableTables.length > 1 ? "s" : ""} disponible
            {availableTables.length > 1 ? "s" : ""}
          </p>
        </div>

        <div className="p-6 md:p-7 space-y-2">
          {availableTables.length === 0 ? (
            <div className="text-center py-10">
              <p
                className="text-sm italic"
                style={{ color: MUTED, fontFamily: "'Playfair Display', serif" }}
              >
                Aucune table ne dispose de {reservation.number_of_people}{" "}
                place{reservation.number_of_people > 1 ? "s" : ""} libre
                {reservation.number_of_people > 1 ? "s" : ""}.
              </p>
            </div>
          ) : (
            availableTables.map((table, i) => (
              <motion.button
                key={table.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.04, duration: 0.4 }}
                onClick={() => onSelect(table.id)}
                className="group w-full transition-all duration-300 hover:-translate-y-[1px] text-left relative overflow-hidden"
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
                <div className="flex items-center justify-between p-4">
                  <div>
                    <div
                      className="text-[10px] uppercase tracking-[0.15em] font-medium mb-1"
                      style={{ color: GOLD }}
                    >
                      {table.is_presidential ? "★ Présidentielle" : `N° ${table.table_number}`}
                    </div>
                    <p
                      className="text-[16px] md:text-[17px]"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        color: NAVY,
                        fontWeight: 500,
                      }}
                    >
                      {table.is_presidential ? "Présidentielle" : `Table ${table.table_number}`}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: MUTED }}>
                      {table.freeSeats} place{table.freeSeats > 1 ? "s" : ""} libre
                      {table.freeSeats > 1 ? "s" : ""} sur {table.maxSeats}
                    </p>
                  </div>
                  <ChevronRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                    style={{ color: GOLD }}
                  />
                </div>
              </motion.button>
            ))
          )}
        </div>

        <div className="p-6 md:p-7" style={{ borderTop: `1px solid ${CREAM2}` }}>
          <ActionBtn tone="ghost" onClick={onClose} className="w-full">
            Annuler
          </ActionBtn>
        </div>
      </motion.div>
    </motion.div>
  );
}
