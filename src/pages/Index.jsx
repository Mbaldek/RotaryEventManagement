import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { UpcomingEvent, RestaurantTable, getCurrentUser } from "@/lib/db";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Users,
  Settings,
  CalendarPlus,
  BookOpen,
  CalendarDays,
  MapPin,
  Clock,
  Utensils,
} from "lucide-react";
import CalendarModal from "../components/calendar/CalendarModal";
import FeedbackButton from "../components/feedback/FeedbackButton";

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — "Elysée" (see docs/design-system.md)
const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#faf7f2";   // warm ivory paper — Elysée
const CREAM2 = "#e8e3d9";
const INK = "#3a3a52";
const MUTED = "#9090a8";

const EVENT_TYPE_LABELS = {
  dejeuner_statutaire: "Déjeuner statutaire",
  reunion_commission: "Commission",
  soiree: "Soirée",
  autre: "Autre",
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable section label (— EYEBROW)

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

// ─────────────────────────────────────────────────────────────────────────────
// Serif editorial title — normal lead + italic accent
function EditorialTitle({ lead, italic, size = "lg" }) {
  const cls = {
    lg: "text-[40px] md:text-[56px] leading-[1.02]",
    md: "text-[28px] md:text-[36px] leading-[1.05]",
    sm: "text-[22px] md:text-[26px] leading-[1.1]",
  }[size];

  return (
    <h1
      className={`${cls} font-normal`}
      style={{ fontFamily: "'Playfair Display', serif", color: NAVY }}
    >
      {lead}
      {italic && (
        <>
          <br />
          <span className="italic font-normal" style={{ color: NAVY }}>
            {italic}
          </span>
        </>
      )}
    </h1>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero event card — editorial, minimal

function HeroEventCard({ event }) {
  if (!event) return null;

  const today = new Date().toISOString().split("T")[0];
  const isToday = event.event_date === today;
  const d = daysUntil(event.event_date);
  const dateLabel = isToday
    ? "Aujourd'hui"
    : d === 1
    ? "Demain"
    : d > 1
    ? `Dans ${d} jours`
    : new Date(event.event_date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      });

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
      style={{
        background: "white",
        border: `1px solid ${CREAM2}`,
        borderRadius: 4,
      }}
    >
      {/* Gold accent left bar — breathes gently */}
      <motion.span
        className="absolute left-0 top-6 bottom-6 w-[2px]"
        style={{ background: GOLD }}
        aria-hidden
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
      />
      <motion.span
        className="absolute left-0 top-6 bottom-6 w-[2px]"
        style={{ background: GOLD, filter: "blur(4px)" }}
        aria-hidden
        animate={{ opacity: [0.3, 0.9, 0.3] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="p-6 md:p-8 pl-7 md:pl-10">
        <div className="flex items-baseline justify-between gap-4 mb-5 flex-wrap">
          <Eyebrow color={isToday ? "#1d6b4f" : GOLD}>
            {isToday ? "Aujourd'hui · en direct" : "Prochain déjeuner"}
          </Eyebrow>
          <div
            className="text-xs font-medium capitalize"
            style={{ color: INK }}
          >
            {new Date(event.event_date).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>

        {event.title && (
          <h2
            className="text-[24px] md:text-[32px] leading-tight mb-4"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: NAVY,
              fontWeight: 500,
            }}
          >
            {event.title}
          </h2>
        )}

        {event.speaker_name && (
          <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${CREAM2}` }}>
            <div
              className="text-[10px] uppercase tracking-[0.15em] font-medium mb-2"
              style={{ color: MUTED }}
            >
              Intervenant
            </div>
            <div
              className="text-[18px] md:text-[20px]"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: NAVY,
                fontWeight: 500,
              }}
            >
              {event.speaker_name}
            </div>
            {event.speaker_title && (
              <div className="text-sm mt-1" style={{ color: INK }}>
                {event.speaker_title}
              </div>
            )}
            {event.speaker_theme && (
              <div
                className="text-[15px] md:text-base mt-3 italic"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: NAVY,
                }}
              >
                « {event.speaker_theme} »
              </div>
            )}
          </div>
        )}

        {(event.start_time || event.location) && (
          <div
            className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6 pt-5 text-xs"
            style={{ borderTop: `1px solid ${CREAM2}`, color: INK }}
          >
            <div className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-1 w-1 rounded-full"
                style={{ background: GOLD }}
              />
              <span style={{ color: MUTED }}>{dateLabel}</span>
            </div>
            {event.start_time && (
              <div className="inline-flex items-center gap-1.5">
                <Clock className="w-3 h-3" style={{ color: GOLD }} />
                <span>
                  {event.start_time}
                  {event.end_time ? ` – ${event.end_time}` : ""}
                </span>
              </div>
            )}
            {event.location && (
              <div className="inline-flex items-center gap-1.5">
                <MapPin className="w-3 h-3" style={{ color: GOLD }} />
                <span>{event.location}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Action row — editorial list style, numbered, pastel tint

function ActionRow({ to, number, title, subtitle, icon: Icon, tint, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.06, duration: 0.5 }}
    >
      <Link
        to={to}
        className="group block relative overflow-hidden transition-colors"
        style={{
          background: tint,
          border: `1px solid ${CREAM2}`,
          borderRadius: 4,
        }}
      >
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-[2px] origin-top scale-y-0 group-hover:scale-y-100 transition-transform duration-500 ease-out"
          style={{ background: GOLD }}
        />
        <span
          aria-hidden
          className="absolute inset-y-0 -left-1/3 w-1/3 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
          }}
        />
        <div className="relative flex items-center gap-4 md:gap-5 px-5 py-4 md:px-6 md:py-5">
          <div
            className="text-[11px] tabular-nums font-medium shrink-0 w-6"
            style={{ color: MUTED }}
          >
            {pad2(number)}
          </div>
          <div
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-[6deg]"
            style={{
              background: "white",
              border: `1px solid ${CREAM2}`,
              boxShadow: "0 1px 0 rgba(15,31,61,0.02)",
            }}
          >
            <Icon className="w-4 h-4" style={{ color: NAVY }} />
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[15px] md:text-base relative inline-block"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: NAVY,
                fontWeight: 500,
              }}
            >
              {title}
              <span
                aria-hidden
                className="absolute left-0 right-0 -bottom-0.5 h-[1px] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out"
                style={{ background: GOLD }}
              />
            </div>
            {subtitle && (
              <div className="text-xs mt-0.5" style={{ color: INK }}>
                {subtitle}
              </div>
            )}
          </div>
          <motion.div
            className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
            initial={{ x: 0, y: 0 }}
            whileHover={{ x: 3, y: -3 }}
          >
            <ArrowUpRight className="w-4 h-4" style={{ color: NAVY }} />
          </motion.div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Upcoming list — numbered vertical, editorial

function UpcomingList({ events }) {
  const today = new Date().toISOString().split("T")[0];
  const items = events.filter((e) => e.event_date > today).slice(0, 4);

  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-15% 0px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <Eyebrow>À venir</Eyebrow>
      <h2
        className="text-[26px] md:text-[34px] leading-[1.05] mb-6"
        style={{ fontFamily: "'Playfair Display', serif", color: NAVY }}
      >
        Les prochains{" "}
        <span className="italic" style={{ color: NAVY }}>
          rendez-vous
        </span>
      </h2>

      <div style={{ borderTop: `1px solid ${CREAM2}` }}>
        {items.map((ev, i) => {
          const d = daysUntil(ev.event_date);
          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group flex items-start gap-4 md:gap-6 py-5 transition-colors"
              style={{ borderBottom: `1px solid ${CREAM2}` }}
            >
              <div
                className="shrink-0 w-8 text-[11px] tabular-nums pt-1"
                style={{ color: MUTED }}
              >
                {pad2(i + 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="text-[10px] uppercase tracking-[0.15em] font-medium"
                    style={{ color: GOLD }}
                  >
                    {EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}
                  </span>
                  <span
                    className="h-[1px] flex-1"
                    style={{ background: CREAM2 }}
                  />
                  <span className="text-[10px]" style={{ color: MUTED }}>
                    J-{d}
                  </span>
                </div>
                <div
                  className="text-[17px] md:text-[19px] leading-snug"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: NAVY,
                    fontWeight: 500,
                  }}
                >
                  {ev.title ||
                    ev.speaker_name ||
                    EVENT_TYPE_LABELS[ev.event_type]}
                </div>
                <div
                  className="text-xs mt-1 capitalize"
                  style={{ color: INK }}
                >
                  {new Date(ev.event_date).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                  {ev.speaker_name && ev.title && ` · ${ev.speaker_name}`}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN

export default function Index() {
  const [showCalendar, setShowCalendar] = useState(false);
  const { scrollY } = useScroll();
  const logoY = useTransform(scrollY, [0, 400], [0, -40]);
  const logoScale = useTransform(scrollY, [0, 400], [1, 0.9]);
  const logoOpacity = useTransform(scrollY, [0, 350, 500], [1, 0.9, 0.7]);

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["upcomingEvents"],
    queryFn: () => UpcomingEvent.list("event_date"),
  });

  const { data: allTables = [] } = useQuery({
    queryKey: ["allTables"],
    queryFn: () => RestaurantTable.list("table_number"),
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const today = new Date().toISOString().split("T")[0];
  const todayEvent = upcomingEvents.find(
    (e) => e.event_date === today && e.event_type === "dejeuner_statutaire"
  );
  const nextEvent =
    todayEvent ||
    upcomingEvents.find(
      (e) => e.event_date >= today && e.event_type === "dejeuner_statutaire"
    );

  const todayLabel = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const actions = [
    {
      to: createPageUrl("Dashboard"),
      title: "Vue d'ensemble",
      subtitle: "Tables, convives et plan de salle",
      icon: Users,
      tint: "#ecf1e5",
    },
    {
      to: createPageUrl("TableView"),
      title: "Sélectionner une table",
      subtitle: "Rejoindre un siège libre",
      icon: Utensils,
      tint: "#f5ede0",
    },
    {
      to: createPageUrl("ReservationRequest"),
      title: "Demander une réservation",
      subtitle: "Invité, conjoint ou occasion",
      icon: CalendarPlus,
      tint: "#eff1f6",
    },
  ];

  if (user?.role === "admin") {
    actions.push({
      to: createPageUrl("AdminControl"),
      title: "Panneau de contrôle",
      subtitle: "Gérer événements et utilisateurs",
      icon: Settings,
      tint: "#f3ede5",
    });
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: CREAM, color: NAVY }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
        .grain-bg::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.04;
          mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
        }
      `}</style>

      {/* Ambient gold halo + paper grain */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 30% at 50% 8%, rgba(201,168,76,0.12), transparent 70%)",
        }}
      />
      <div aria-hidden className="absolute inset-0 pointer-events-none grain-bg" />

      <div className="relative max-w-[680px] mx-auto px-5 md:px-8 pt-10 md:pt-16 pb-20">
        {/* Top meta row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between mb-12 md:mb-16"
          style={{ borderBottom: `1px solid ${CREAM2}`, paddingBottom: 16 }}
        >
          <div className="flex items-center gap-2.5">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698886adec2381a5bebb878f/8eca9f2bf_rotaryinterrouecrop.png"
              alt="Rotary"
              className="w-7 h-7"
            />
            <div>
              <div
                className="text-[13px] leading-none"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: NAVY,
                  fontWeight: 500,
                }}
              >
                Rotary Club de Paris
              </div>
              <div
                className="text-[9px] uppercase tracking-[0.15em] mt-1"
                style={{ color: MUTED }}
              >
                Gestionnaire de réunion
              </div>
            </div>
          </div>
          <div
            className="text-[10px] uppercase tracking-[0.15em] hidden sm:block"
            style={{ color: MUTED }}
          >
            {todayLabel}
          </div>
        </motion.div>

        {/* Big animated logo */}
        <motion.div
          style={{ y: logoY, scale: logoScale, opacity: logoOpacity }}
          className="flex justify-center mb-10 md:mb-12"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <motion.div
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(201,168,76,0.38), transparent 65%)",
                filter: "blur(32px)",
              }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.65, 1, 0.65] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698886adec2381a5bebb878f/8eca9f2bf_rotaryinterrouecrop.png"
              alt="Rotary International"
              className="relative w-40 h-40 md:w-52 md:h-52 drop-shadow-[0_12px_30px_rgba(15,31,61,0.22)]"
              animate={{ rotate: 360 }}
              transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
              whileHover={{ scale: 1.06, transition: { duration: 0.4 } }}
            />
          </motion.div>
        </motion.div>

        {/* Hero */}
        <div className="mb-12 md:mb-14">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Eyebrow>Bienvenue</Eyebrow>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
          >
            <EditorialTitle
              lead="Votre déjeuner"
              italic="statutaire hebdomadaire"
              size="lg"
            />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="text-[15px] md:text-base mt-6 max-w-md"
            style={{ color: INK, lineHeight: 1.65 }}
          >
            Retrouvez le programme, réservez votre table et suivez les
            rendez-vous du club — en quelques instants.
          </motion.p>
        </div>

        {/* Next event */}
        {nextEvent && (
          <div className="mb-14 md:mb-16">
            <HeroEventCard event={nextEvent} />
          </div>
        )}

        {/* Actions */}
        <div className="mb-14 md:mb-16">
          <Eyebrow>Accès rapide</Eyebrow>
          <h2
            className="text-[26px] md:text-[34px] leading-[1.05] mb-6"
            style={{ fontFamily: "'Playfair Display', serif", color: NAVY }}
          >
            Que souhaitez-vous{" "}
            <span className="italic">faire aujourd'hui ?</span>
          </h2>
          <div className="space-y-2">
            {actions.map((a, i) => (
              <ActionRow
                key={a.to}
                to={a.to}
                number={i + 1}
                title={a.title}
                subtitle={a.subtitle}
                icon={a.icon}
                tint={a.tint}
                index={i}
              />
            ))}
          </div>
        </div>

        {/* Upcoming */}
        {upcomingEvents.length > 0 && (
          <div className="mb-14 md:mb-16">
            <UpcomingList events={upcomingEvents} />
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              onClick={() => setShowCalendar(true)}
              className="group mt-6 inline-flex items-center gap-2 text-sm transition-colors"
              style={{
                color: NAVY,
                fontFamily: "'Playfair Display', serif",
                fontWeight: 500,
              }}
            >
              <CalendarDays className="w-4 h-4" style={{ color: GOLD }} />
              <span className="italic">Voir le calendrier complet</span>
              <ArrowRight
                className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1"
                style={{ color: GOLD }}
              />
            </motion.button>
          </div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="pt-10"
          style={{ borderTop: `1px solid ${CREAM2}` }}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div
              className="text-[11px] uppercase tracking-[0.15em]"
              style={{ color: MUTED }}
            >
              {allTables.length} table{allTables.length > 1 ? "s" : ""}{" "}
              disponible{allTables.length > 1 ? "s" : ""}
            </div>
            <Link
              to={createPageUrl("Features")}
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] transition-colors hover:opacity-70"
              style={{ color: MUTED }}
            >
              <BookOpen className="w-3 h-3" />
              Documentation
            </Link>
          </div>
        </motion.div>
      </div>

      <CalendarModal
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
      />
      <FeedbackButton />
    </div>
  );
}
