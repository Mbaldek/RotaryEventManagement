import React, { useState } from "react";
import { RestaurantTable, Seat, GlobalSettings } from "@/lib/db";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, CalendarDays, Users } from "lucide-react";
import { createPageUrl } from "@/utils";

import TableLayout from "../components/table/TableLayout";
import SeatForm from "../components/table/SeatForm";
import ChatPanel from "../components/table/ChatPanel";
import BroadcastBanner from "../components/table/BroadcastBanner";
import SeatListItem from "../components/table/SeatListItem";
import CalendarModal from "../components/calendar/CalendarModal";
import FeedbackButton from "../components/feedback/FeedbackButton";

// Design tokens — "Elysée" (see docs/design-system.md)
const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#faf7f2";
const CREAM2 = "#e8e3d9";
const INK = "#3a3a52";
const MUTED = "#9090a8";

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

function pad2(n) {
  return String(n).padStart(2, "0");
}

// ─────────────────────────────────────────────────────────────────────────────
// TablePickerTile — editorial card for the picker grid

function TablePickerTile({ table, index, seatCount }) {
  const isRound = (table.shape || "round") === "round";
  const isPresidential = table.is_presidential;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-5% 0px" }}
      transition={{
        duration: 0.5,
        delay: Math.min(index * 0.04, 0.35),
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link
        to={createPageUrl("TableView") + `?id=${table.id}`}
        className="group relative block overflow-hidden transition-all duration-300 hover:-translate-y-[2px]"
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

        <div className="p-5 flex flex-col items-center">
          <span
            className="text-[10px] uppercase tracking-[0.15em] font-medium self-start"
            style={{ color: GOLD }}
          >
            {isPresidential ? "★ Présidentielle" : `N° ${table.table_number}`}
          </span>

          <div className="my-4">
            <div
              className={`w-20 h-20 flex items-center justify-center transition-transform duration-500 group-hover:rotate-[6deg] ${
                isRound ? "rounded-full" : "rounded-[4px]"
              }`}
              style={{
                background: CREAM,
                border: `1px solid ${CREAM2}`,
              }}
            >
              <span
                className="text-[28px]"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: isPresidential ? GOLD : NAVY,
                  fontWeight: 500,
                }}
              >
                {isPresidential ? "★" : table.table_number}
              </span>
            </div>
          </div>

          <h3
            className="text-[16px] md:text-[17px] leading-tight text-center"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: NAVY,
              fontWeight: 500,
            }}
          >
            {isPresidential ? "Présidentielle" : `Table ${table.table_number}`}
          </h3>
          <p className="text-[11px] mt-1" style={{ color: MUTED }}>
            {isRound ? "Ronde" : "Carrée"} · {seatCount} sièges
          </p>

          <div
            className="flex items-center gap-1.5 mt-4 pt-3 text-[11px] uppercase tracking-[0.15em] w-full justify-center transition-colors"
            style={{
              borderTop: `1px solid ${CREAM2}`,
              color: NAVY,
              fontFamily: "'Playfair Display', serif",
              fontWeight: 500,
            }}
          >
            <span className="italic normal-case" style={{ letterSpacing: "normal" }}>
              Choisir
            </span>
            <ArrowUpRight
              className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]"
              style={{ color: GOLD }}
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function TableView() {
  const location = useLocation();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(location.search);
  const tableId = urlParams.get("id");

  const [selectedSeat, setSelectedSeat] = useState(null);
  const [selectedSeatData, setSelectedSeatData] = useState(null);
  const [mySeatId, setMySeatId] = useState(
    () => localStorage.getItem("mySeatId") || null
  );
  const [chatTarget, setChatTarget] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const queryClient = useQueryClient();

  const { data: table } = useQuery({
    queryKey: ["table", tableId],
    queryFn: async () => {
      const tables = await RestaurantTable.list();
      return tables.find((t) => t.id === tableId);
    },
    enabled: !!tableId,
  });

  const { data: seats = [] } = useQuery({
    queryKey: ["seats", tableId],
    queryFn: () => Seat.filter({ table_id: tableId }),
    enabled: !!tableId,
    refetchInterval: 10000,
  });

  const { data: allTables = [] } = useQuery({
    queryKey: ["allTables"],
    queryFn: () => RestaurantTable.list("table_number"),
  });

  const { data: settings } = useQuery({
    queryKey: ["globalSettings"],
    queryFn: async () => {
      const s = await GlobalSettings.list();
      return s[0] || {};
    },
  });

  const saveSeatMutation = useMutation({
    mutationFn: async ({ seatNumber, data }) => {
      const existing = seats.find((s) => s.seat_number === seatNumber);
      const token = crypto.randomUUID().slice(0, 8);
      if (existing) {
        await Seat.update(existing.id, data);
        return existing.id;
      } else {
        const newSeat = await Seat.create({
          ...data,
          table_id: tableId,
          seat_number: seatNumber,
          guest_token: token,
        });
        return newSeat.id;
      }
    },
    onSuccess: (seatId) => {
      localStorage.setItem("mySeatId", seatId);
      setMySeatId(seatId);
      queryClient.invalidateQueries({ queryKey: ["seats", tableId] });
      setSelectedSeat(null);
    },
  });

  const removeSeatMutation = useMutation({
    mutationFn: async (seatData) => {
      await Seat.update(seatData.id, {
        first_name: "",
        last_name: "",
        job: "",
        email: "",
        phone: "",
        guest_token: "",
      });
      if (mySeatId === seatData.id) {
        localStorage.removeItem("mySeatId");
        setMySeatId(null);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seats", tableId] });
      setSelectedSeat(null);
    },
  });

  const handleSeatClick = (seatNumber, seatData) => {
    if (seatData?.first_name) {
      setSelectedSeat(null);
      setSelectedSeatData(null);
    } else {
      setSelectedSeat(seatNumber);
      setSelectedSeatData(seatData);
    }
    setChatTarget(null);
  };

  const broadcastMessage =
    table?.broadcast_message || settings?.global_broadcast || "";
  const planningUrl = table?.planning_url || settings?.planning_url || "";

  // ───────────────────────────────────────────────────────────────────────────
  // PICKER VIEW (no tableId)
  if (!tableId) {
    return (
      <div
        className="min-h-screen relative"
        style={{ background: CREAM, color: NAVY }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
        `}</style>

        <div className="relative max-w-[1100px] mx-auto px-5 md:px-8 pt-10 md:pt-16 pb-20">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-10"
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
            className="mb-10 md:mb-14 max-w-2xl"
          >
            <Eyebrow>Sélection</Eyebrow>
            <h1
              className="text-[32px] md:text-[48px] leading-[1.05]"
              style={{ fontFamily: "'Playfair Display', serif", color: NAVY }}
            >
              Choisissez <span className="italic">votre table</span>
            </h1>
            <p
              className="text-sm md:text-[15px] mt-5 max-w-lg"
              style={{ color: INK, lineHeight: 1.65 }}
            >
              Choisissez la table à laquelle vous êtes assigné·e. Vous pourrez
              ensuite sélectionner votre siège et vous enregistrer pour la
              séance.
            </p>
          </motion.div>

          {/* How to — numbered editorial steps */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mb-12 md:mb-14"
          >
            <Eyebrow color={MUTED}>Comment procéder</Eyebrow>
            <div style={{ borderTop: `1px solid ${CREAM2}` }}>
              {[
                "Choisissez votre table ci-dessous",
                "Sélectionnez votre siège sur le plan",
                "Enregistrez vos informations pour confirmer",
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
                  className="flex items-center gap-4 md:gap-6 py-4"
                  style={{ borderBottom: `1px solid ${CREAM2}` }}
                >
                  <div
                    className="shrink-0 w-8 text-[11px] tabular-nums"
                    style={{ color: MUTED }}
                  >
                    {pad2(i + 1)}
                  </div>
                  <div
                    className="text-[15px]"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      color: NAVY,
                      fontWeight: 500,
                    }}
                  >
                    {step}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Tables grid */}
          {allTables.length === 0 ? (
            <div
              className="py-20 text-center"
              style={{ border: `1px solid ${CREAM2}`, borderRadius: 4, background: "white" }}
            >
              <Users className="w-10 h-10 mx-auto mb-4" style={{ color: MUTED }} />
              <p className="text-sm" style={{ color: INK }}>
                Aucune table disponible pour le moment.
              </p>
            </div>
          ) : (
            <>
              <Eyebrow>Les tables</Eyebrow>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                {allTables.map((t, i) => (
                  <TablePickerTile
                    key={t.id}
                    table={t}
                    index={i}
                    seatCount={t.is_presidential ? 12 : 8}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <CalendarModal
          isOpen={showCalendar}
          onClose={() => setShowCalendar(false)}
        />
        <FeedbackButton />
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DETAIL VIEW (with tableId)

  const totalSeats = table?.is_presidential ? 12 : 8;

  return (
    <div
      className="min-h-screen relative"
      style={{ background: CREAM, color: NAVY }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
      `}</style>

      <div className="relative max-w-[900px] mx-auto px-5 md:px-8 pt-8 md:pt-12 pb-20">
        {/* Top nav */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between gap-3 flex-wrap mb-6"
        >
          <Link
            to={createPageUrl("TableView")}
            className="group inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] transition-colors"
            style={{ color: MUTED }}
          >
            <ArrowLeft
              className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1"
              style={{ color: GOLD }}
            />
            <span>Toutes les tables</span>
          </Link>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowCalendar(true)}
              className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] font-medium transition-all hover:-translate-y-[1px]"
              style={{
                background: "white",
                color: NAVY,
                border: `1px solid ${CREAM2}`,
                borderRadius: 4,
              }}
            >
              <CalendarDays className="w-3.5 h-3.5" style={{ color: GOLD }} />
              Calendrier
            </button>
            <div
              className="flex items-center gap-0.5 p-0.5"
              style={{ border: `1px solid ${CREAM2}`, borderRadius: 4, background: "white" }}
            >
              {allTables.map((t) => {
                const active = t.id === tableId;
                return (
                  <button
                    key={t.id}
                    onClick={() =>
                      navigate(createPageUrl("TableView") + `?id=${t.id}`)
                    }
                    className="w-8 h-8 flex items-center justify-center text-[11px] font-medium tabular-nums transition-all"
                    style={{
                      background: active ? NAVY : "transparent",
                      color: active ? "white" : MUTED,
                      borderRadius: 3,
                      fontFamily: "'Playfair Display', serif",
                      fontWeight: 500,
                    }}
                  >
                    {t.is_presidential ? "★" : t.table_number}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Table heading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-6"
        >
          <Eyebrow>
            {table?.is_presidential ? "Présidentielle" : `Table N° ${table?.table_number || ""}`}
          </Eyebrow>
          <h1
            className="text-[28px] md:text-[40px] leading-[1.05]"
            style={{ fontFamily: "'Playfair Display', serif", color: NAVY }}
          >
            {table?.is_presidential ? (
              <>
                La table <span className="italic">présidentielle</span>
              </>
            ) : (
              <>
                Table <span className="italic">{table?.table_number}</span>
              </>
            )}
          </h1>
        </motion.div>

        {/* Broadcast */}
        {broadcastMessage && (
          <div className="mb-6">
            <BroadcastBanner message={broadcastMessage} planningUrl={planningUrl} />
          </div>
        )}

        {/* Table Layout */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <TableLayout
            seats={seats}
            onSeatClick={handleSeatClick}
            activeSeatId={mySeatId}
            tableNumber={table?.table_number}
            isPresidential={table?.is_presidential}
            shape={table?.shape}
            color={table?.color}
            rotation={table?.rotation}
          />
        </motion.div>

        {/* Seat Form */}
        <AnimatePresence>
          {selectedSeat && (
            <div className="flex justify-center mb-8">
              <SeatForm
                seatNumber={selectedSeat}
                seatData={selectedSeatData}
                onSave={(data) =>
                  saveSeatMutation.mutate({ seatNumber: selectedSeat, data })
                }
                onRemove={() =>
                  selectedSeatData && removeSeatMutation.mutate(selectedSeatData)
                }
                onClose={() => setSelectedSeat(null)}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Seat List */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.6 }}
        >
          <Eyebrow>Les convives</Eyebrow>
          <h2
            className="text-[24px] md:text-[28px] leading-[1.05] mb-5"
            style={{ fontFamily: "'Playfair Display', serif", color: NAVY }}
          >
            Liste <span className="italic">des sièges</span>
          </h2>
          <div
            className="p-4 md:p-5"
            style={{
              background: "white",
              border: `1px solid ${CREAM2}`,
              borderRadius: 4,
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Array.from({ length: totalSeats }, (_, i) => i + 1).map((seatNum) => {
                const seatData = seats.find((s) => s.seat_number === seatNum);
                return (
                  <SeatListItem
                    key={seatNum}
                    seatNumber={seatNum}
                    seatData={seatData}
                    onClick={() => handleSeatClick(seatNum, seatData)}
                    isActive={seatData?.id === mySeatId}
                    onModify={() => {
                      setSelectedSeat(seatNum);
                      setSelectedSeatData(seatData);
                    }}
                  />
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Chat */}
        <AnimatePresence>
          {chatTarget && mySeatId && (
            <div className="fixed bottom-4 right-4 z-50">
              <ChatPanel
                mySeatId={mySeatId}
                targetSeat={chatTarget}
                onClose={() => setChatTarget(null)}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      <CalendarModal
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
      />
      <FeedbackButton />
    </div>
  );
}
