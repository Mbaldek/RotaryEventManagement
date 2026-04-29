import React, { useState, useEffect, useMemo, useRef } from "react";
import { RestaurantTable, Seat, GlobalSettings, UpcomingEvent } from "@/lib/db";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, CalendarDays, Users, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { getTableCapacity } from "@/lib/utils";

import TableLayout from "../components/table/TableLayout";
import SeatPickModal from "../components/table/SeatPickModal";
import GuestPopover from "../components/table/GuestPopover";
import StickyMiniBar from "../components/table/StickyMiniBar";
import SalonDrawer from "../components/table/SalonDrawer";
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
  const shape = table.shape || "round";
  const isRound = shape === "round";
  const isRectangle = shape === "rectangle";
  const isPresidential = table.is_presidential;
  const shapeLabel = isRound ? "Ronde" : isRectangle ? "Rectangulaire" : "Carrée";

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
              className={`flex items-center justify-center transition-transform duration-500 group-hover:rotate-[6deg] ${
                isRound ? "rounded-full" : "rounded-[4px]"
              } ${isRectangle ? "w-28 h-14" : "w-20 h-20"}`}
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
            {shapeLabel} · {seatCount} sièges
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

  const [pickingSeat, setPickingSeat] = useState(null);
  const [pickingSeatData, setPickingSeatData] = useState(null);
  const [mySeatId, setMySeatId] = useState(
    () => localStorage.getItem("mySeatId") || null
  );
  const [myToken, setMyToken] = useState(
    () => localStorage.getItem("mySeatToken") || null
  );
  const [chatTarget, setChatTarget] = useState(null);
  const [tableChatOpen, setTableChatOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [salonOpen, setSalonOpen] = useState(false);

  // Hover popover state — open when an occupied non-me seat is hovered/clicked
  const [hoveredData, setHoveredData] = useState(null);
  const [hoveredRect, setHoveredRect] = useState(null);

  // Mini-bar — appears when hero scrolls off screen
  const [showMiniBar, setShowMiniBar] = useState(false);
  const heroRef = useRef(null);

  // Live join splash on the canvas
  const [liveNewSeatNumber, setLiveNewSeatNumber] = useState(null);
  const knownSeatNumbersRef = useRef(null);

  const seatRefs = useRef({});

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

  // Resolve my seat by id directly — independent of `tableId`. Lets the chat
  // panel work when browsing a table other than mine (e.g. via the Salon).
  const { data: mySeatRemote } = useQuery({
    queryKey: ["mySeat", mySeatId],
    queryFn: async () => {
      const rows = await Seat.filter({ id: mySeatId });
      return rows[0] || null;
    },
    enabled: !!mySeatId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: allTables = [] } = useQuery({
    queryKey: ["allTables"],
    queryFn: () => RestaurantTable.list("table_number"),
  });

  // All seats across every table — only fetched when the salon drawer needs it.
  const { data: allSeats = [] } = useQuery({
    queryKey: ["allSeats"],
    queryFn: () => Seat.list(),
    enabled: salonOpen,
    refetchInterval: salonOpen ? 10000 : false,
  });

  const { data: settings } = useQuery({
    queryKey: ["globalSettings"],
    queryFn: async () => {
      const s = await GlobalSettings.list();
      return s[0] || {};
    },
  });

  // Current statutaire lunch — same logic as Index.jsx: today's if any, else
  // the next one. Needed because `seats.event_id` is NOT NULL at the DB level
  // (FK → upcoming_events.id), so a seat can't be inserted without it.
  const { data: currentEvent } = useQuery({
    queryKey: ["currentEvent"],
    queryFn: async () => {
      const events = await UpcomingEvent.list("event_date");
      const today = new Date().toISOString().slice(0, 10);
      return (
        events.find(
          (e) => e.event_date === today && e.event_type === "dejeuner_statutaire"
        ) ||
        events.find(
          (e) => e.event_date >= today && e.event_type === "dejeuner_statutaire"
        ) ||
        null
      );
    },
  });

  const saveSeatMutation = useMutation({
    mutationFn: async ({ seatNumber, data }) => {
      const existing = seats.find((s) => s.seat_number === seatNumber);
      if (existing) {
        await Seat.update(existing.id, data);
        return { id: existing.id, token: existing.guest_token };
      } else {
        if (!currentEvent?.id) {
          throw new Error(
            "Aucun déjeuner statutaire programmé — impossible d'enregistrer un siège."
          );
        }
        const token = crypto.randomUUID().slice(0, 8);
        const newSeat = await Seat.create({
          ...data,
          table_id: tableId,
          seat_number: seatNumber,
          guest_token: token,
          event_id: currentEvent.id,
        });
        return { id: newSeat.id, token };
      }
    },
    onSuccess: ({ id, token }) => {
      localStorage.setItem("mySeatId", id);
      setMySeatId(id);
      if (token) {
        localStorage.setItem("mySeatToken", token);
        setMyToken(token);
      }
      queryClient.invalidateQueries({ queryKey: ["seats", tableId] });
      queryClient.invalidateQueries({ queryKey: ["allSeats"] });
      queryClient.invalidateQueries({ queryKey: ["mySeat", id] });
      setPickingSeat(null);
      setPickingSeatData(null);
    },
    onError: (err) => {
      console.error("[TableView:saveSeat]", err);
      toast.error(err?.message || "Erreur lors de l'enregistrement du siège.");
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
        comment: "",
        member_number: "",
        guest_token: "",
      });
      if (mySeatId === seatData.id) {
        localStorage.removeItem("mySeatId");
        localStorage.removeItem("mySeatToken");
        setMySeatId(null);
        setMyToken(null);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seats", tableId] });
      queryClient.invalidateQueries({ queryKey: ["allSeats"] });
      queryClient.invalidateQueries({ queryKey: ["mySeat"] });
      setPickingSeat(null);
      setPickingSeatData(null);
    },
    onError: (err) => {
      console.error("[TableView:removeSeat]", err);
      toast.error(err?.message || "Erreur lors de la libération du siège.");
    },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Seat interaction — three flows depending on seat state:
  //   - empty (and not reserved)  → open SeatPickModal to take it
  //   - mine                      → open SeatPickModal in edit mode
  //   - someone else              → open GuestPopover anchored to the label
  const closePopover = () => {
    setHoveredData(null);
    setHoveredRect(null);
  };

  const handleSeatClick = (seatNumber, seatData) => {
    setChatTarget(null);
    if (seatData?.is_reserved) return;

    if (seatData?.first_name) {
      const isMine = seatData.id === mySeatId;
      if (isMine) {
        setPickingSeat(seatNumber);
        setPickingSeatData(seatData);
        closePopover();
        return;
      }
      const el = seatRefs.current[seatNumber];
      const rect = el?.getBoundingClientRect() || null;
      setHoveredData(seatData);
      setHoveredRect(rect);
      return;
    }

    setPickingSeat(seatNumber);
    setPickingSeatData(null);
    closePopover();
  };

  const handleSeatHover = (seatNumber, seatData) => {
    if (!seatData?.first_name) return;
    if (seatData.id === mySeatId) return;
    const el = seatRefs.current[seatNumber];
    const rect = el?.getBoundingClientRect() || null;
    setHoveredData(seatData);
    setHoveredRect(rect);
  };

  const handleStartChatFromPopover = (seat) => {
    setChatTarget(seat);
    closePopover();
    setSalonOpen(false);
  };

  const handleStartChatFromSalon = (guest) => {
    setChatTarget(guest);
    setSalonOpen(false);
  };

  const handleSubmitSeat = (form) => {
    if (!pickingSeat) return;
    saveSeatMutation.mutate({ seatNumber: pickingSeat, data: form });
  };

  const handleRemoveSeat = () => {
    if (pickingSeatData) removeSeatMutation.mutate(pickingSeatData);
  };

  const handlePickFirstFreeSeat = () => {
    const total = getTableCapacity(table);
    for (let n = 1; n <= total; n++) {
      const existing = seats.find((s) => s.seat_number === n);
      if (!existing || (!existing.first_name && !existing.is_reserved)) {
        setPickingSeat(n);
        setPickingSeatData(existing || null);
        return;
      }
    }
  };

  // Live join splash — detect newly-arrived seats since the last render.
  useEffect(() => {
    const current = new Set(
      seats.filter((s) => s.first_name).map((s) => s.seat_number)
    );
    const known = knownSeatNumbersRef.current;
    if (known) {
      const fresh = [...current].find((n) => !known.has(n));
      if (fresh != null) {
        setLiveNewSeatNumber(fresh);
        const t = setTimeout(() => setLiveNewSeatNumber(null), 1800);
        knownSeatNumbersRef.current = current;
        return () => clearTimeout(t);
      }
    }
    knownSeatNumbersRef.current = current;
  }, [seats]);

  // Mini-bar — show when hero scrolls past the top.
  useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      setShowMiniBar(rect.bottom < 56);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [tableId]);

  // Prefer the local list (fresher, refreshes every 10 s) when I'm on my own
  // table; fall back to the remote lookup when browsing another table.
  const mySeat = useMemo(
    () => seats.find((s) => s.id === mySeatId) || mySeatRemote || null,
    [seats, mySeatId, mySeatRemote]
  );

  // Anti-usurpation: if the seat I think I own has a different (or empty)
  // guest_token than the one we cached at sign-up time, my session is stale.
  // This happens when someone else takes over the same seat after I left.
  useEffect(() => {
    if (!mySeatId || !myToken || !mySeatRemote) return;
    if (mySeatRemote.guest_token !== myToken) {
      localStorage.removeItem("mySeatId");
      localStorage.removeItem("mySeatToken");
      setMySeatId(null);
      setMyToken(null);
    }
  }, [mySeatId, myToken, mySeatRemote]);

  const stats = useMemo(() => {
    const total = getTableCapacity(table);
    const occupied = seats.filter((s) => s.first_name).length;
    const reserved = seats.filter((s) => s.is_reserved).length;
    return { total, occupied, reserved, free: Math.max(0, total - occupied - reserved) };
  }, [seats, table]);

  const broadcastMessages = [
    table?.broadcast_message,
    settings?.global_broadcast,
  ]
    .map(m => (m || "").trim())
    .filter(Boolean)
    .filter((m, i, arr) => arr.indexOf(m) === i);
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
                    seatCount={getTableCapacity(t)}
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

  const totalSeats = stats.total;
  const ratio = `${stats.occupied + stats.reserved}/${totalSeats}`;
  const occupiedPct = totalSeats ? (stats.occupied / totalSeats) * 100 : 0;
  const reservedPct = totalSeats ? (stats.reserved / totalSeats) * 100 : 0;

  return (
    <div
      className="min-h-screen relative"
      style={{ background: CREAM, color: NAVY }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
      `}</style>

      {/* Top nav — sticky bar including back, salon toggle, calendar, table switcher */}
      <div
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{
          background: "rgba(250,247,242,0.85)",
          borderBottom: `1px solid ${CREAM2}`,
        }}
      >
        <div className="max-w-[1100px] mx-auto px-5 md:px-8 py-3 flex items-center justify-between gap-3 flex-wrap">
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
              onClick={() => setSalonOpen(true)}
              className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] font-medium transition-all hover:-translate-y-[1px]"
              style={{
                background: "white",
                color: NAVY,
                border: `1px solid ${GOLD}`,
                borderRadius: 4,
              }}
            >
              <Users className="w-3.5 h-3.5" style={{ color: GOLD }} />
              <span>Le salon</span>
            </button>

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
                    onClick={() => navigate(createPageUrl("TableView") + `?id=${t.id}`)}
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
        </div>
      </div>

      <StickyMiniBar
        show={showMiniBar}
        tableNumber={table?.table_number}
        isPresidential={table?.is_presidential}
        ratio={ratio}
        mySeatNumber={mySeat?.seat_number}
        onPickSeat={handlePickFirstFreeSeat}
      />

      <div className="relative max-w-[1100px] mx-auto px-5 md:px-8 pt-8 md:pt-12 pb-24">
        {/* Hero */}
        <div ref={heroRef} className="mb-8 md:mb-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-start justify-between gap-6 flex-wrap"
          >
            <div className="min-w-0">
              <Eyebrow>
                {table?.is_presidential ? "Présidentielle" : `Table N° ${table?.table_number || ""}`}
              </Eyebrow>
              <h1
                className="text-[36px] md:text-[56px] leading-[1.02] mt-3"
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

              <div
                className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-4 text-[13px]"
                style={{ color: INK }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: NAVY }} />
                  {stats.occupied} présent{stats.occupied > 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
                  {stats.reserved} réservé{stats.reserved > 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1.5" style={{ color: MUTED }}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full border" style={{ borderColor: CREAM2 }} />
                  {stats.free} libre{stats.free > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {mySeat ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 220, damping: 20 }}
                className="inline-flex items-center gap-3 px-5 py-3"
                style={{ background: "white", border: `1px solid ${GOLD}`, borderRadius: 4 }}
              >
                <span className="relative flex h-2 w-2" aria-hidden>
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ background: GOLD }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{ background: GOLD }}
                  />
                </span>
                <div className="text-left">
                  <div
                    className="text-[9px] uppercase tracking-[0.18em] font-medium"
                    style={{ color: GOLD }}
                  >
                    Vous êtes
                  </div>
                  <div
                    className="text-[15px] leading-tight"
                    style={{ fontFamily: "'Playfair Display', serif", color: NAVY, fontWeight: 500 }}
                  >
                    au siège {mySeat.seat_number}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                onClick={handlePickFirstFreeSeat}
                disabled={stats.free === 0}
                className="group inline-flex items-center gap-2 px-5 py-3 text-[12px] uppercase tracking-[0.18em] font-medium transition-all hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: NAVY, color: "white", borderRadius: 4 }}
              >
                <span>Prenez place</span>
                <ArrowUpRight
                  className="w-4 h-4 transition-transform group-hover:translate-x-[2px] group-hover:-translate-y-[2px]"
                  style={{ color: GOLD }}
                />
              </motion.button>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6"
          >
            <div
              className="relative w-full h-[3px] overflow-hidden flex"
              style={{ background: CREAM2 }}
            >
              <motion.div
                className="h-full"
                style={{ background: NAVY }}
                initial={{ width: 0 }}
                animate={{ width: `${occupiedPct}%` }}
                transition={{ delay: 0.5, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.div
                className="h-full"
                style={{ background: GOLD }}
                initial={{ width: 0 }}
                animate={{ width: `${reservedPct}%` }}
                transition={{ delay: 0.8, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </motion.div>
        </div>

        {/* Broadcast */}
        {(broadcastMessages.length > 0 || planningUrl) && (
          <div className="mb-6">
            <BroadcastBanner messages={broadcastMessages} planningUrl={planningUrl} />
          </div>
        )}

        {/* Table canvas — the central visual */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-2"
        >
          <TableLayout
            seats={seats}
            onSeatClick={handleSeatClick}
            onSeatHover={handleSeatHover}
            activeSeatId={mySeatId}
            liveNewSeatNumber={liveNewSeatNumber}
            tableNumber={table?.table_number}
            isPresidential={table?.is_presidential}
            shape={table?.shape}
            color={table?.color}
            rotation={table?.rotation}
            seatCount={totalSeats}
            seatRefs={seatRefs}
          />
        </motion.div>

        {/* Hint */}
        <div
          className="text-center mt-8 text-[11px] italic"
          style={{ color: MUTED, fontFamily: "'Playfair Display', serif" }}
        >
          Survolez ou cliquez un siège pour en savoir plus.
          <br className="sm:hidden" />
          <span className="hidden sm:inline"> · </span>
          Ouvrez{" "}
          <span
            className="not-italic uppercase tracking-[0.15em]"
            style={{ color: GOLD }}
          >
            Le salon
          </span>{" "}
          pour retrouver un convive à une autre table.
        </div>

        {/* Seat List — kept from previous design */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.6 }}
          className="mt-12 md:mt-16"
        >
          <Eyebrow>Les convives</Eyebrow>
          <h2
            className="text-[24px] md:text-[28px] leading-[1.05] mt-2 mb-5"
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
                      setPickingSeat(seatNum);
                      setPickingSeatData(seatData);
                    }}
                  />
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Guest popover — overlays the canvas; close on outside click */}
      <AnimatePresence>
        {hoveredData && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={closePopover}
            />
            <GuestPopover
              open
              seat={hoveredData}
              seats={seats}
              totalSeats={totalSeats}
              anchorRect={hoveredRect}
              onChat={mySeatId ? handleStartChatFromPopover : undefined}
            />
          </>
        )}
      </AnimatePresence>

      {/* Salon — cross-table directory */}
      <SalonDrawer
        open={salonOpen}
        onClose={() => setSalonOpen(false)}
        allSeats={allSeats}
        allTables={allTables}
        onChat={mySeatId ? handleStartChatFromSalon : undefined}
      />

      {/* Table chat trigger — floating button bottom-right when seated and no
          panel open. Only on my own table: the panel reads `me.table_id`
          server-side, so showing it elsewhere would mismatch the header. */}
      {mySeat && mySeat.table_id === tableId && !chatTarget && !tableChatOpen && (
        <button
          onClick={() => setTableChatOpen(true)}
          aria-label="Chat de la table"
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 px-4 py-3 text-[11px] uppercase tracking-[0.15em] font-medium transition-all hover:-translate-y-[1px]"
          style={{
            background: NAVY,
            color: "white",
            borderRadius: 4,
            boxShadow: "0 8px 20px rgba(15,31,61,0.22)",
          }}
        >
          <MessageSquare className="w-4 h-4" style={{ color: GOLD }} />
          <span>Chat table</span>
        </button>
      )}

      {/* Chat — floating panel bottom-right (DM takes precedence over table) */}
      <AnimatePresence>
        {chatTarget && mySeat && (
          <div className="fixed bottom-4 right-4 z-50">
            <ChatPanel
              mySeat={mySeat}
              targetSeat={chatTarget}
              mode="dm"
              onClose={() => setChatTarget(null)}
            />
          </div>
        )}
        {!chatTarget && tableChatOpen && mySeat && (
          <div className="fixed bottom-4 right-4 z-50">
            <ChatPanel
              mySeat={mySeat}
              mode="table"
              tableNumber={table?.table_number}
              onClose={() => setTableChatOpen(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Seat pick / edit modal */}
      <SeatPickModal
        open={!!pickingSeat}
        seatNumber={pickingSeat}
        seatData={pickingSeatData}
        onClose={() => {
          setPickingSeat(null);
          setPickingSeatData(null);
        }}
        onConfirm={handleSubmitSeat}
        onRemove={handleRemoveSeat}
      />

      <CalendarModal isOpen={showCalendar} onClose={() => setShowCalendar(false)} />
      <FeedbackButton />
    </div>
  );
}
