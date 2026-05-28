// HeroEventCard — editorial hero card for the next/today event. White paper,
// hairline border, a breathing gold bar on the left, then eyebrow → serif title →
// speaker block → meta row (date · time · location). Extracted from
// src/pages/Index.jsx; visual output unchanged when used with default props.
//
// Props:
//   event  : object — { event_date, title, speaker_name, speaker_title,
//                       speaker_theme, start_time, end_time, location }
//   locale : string — date locale for toLocaleDateString (default "fr-FR")
//   labels : object — overridable copy so the card is trilingual at call sites:
//       { today, tomorrow, inDays(n), nextEvent, liveToday, speaker }
//     Defaults reproduce the original French strings from Index.jsx exactly.
//
// Trilingual note: the editorial component owns layout, NOT copy. Pass `locale`
// and `labels` from the page's i18n table; never extend the hard-coded defaults
// in production trilingual screens.

import React from "react";
import { motion } from "framer-motion";
import { Clock, MapPin } from "lucide-react";
import { NAVY, GOLD, CREAM2, INK, MUTED, GREEN_TODAY, SERIF, EASE } from "@/components/design/tokens";
import Eyebrow from "@/components/design/Eyebrow";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

const DEFAULT_LABELS = {
  today: "Aujourd'hui",
  tomorrow: "Demain",
  inDays: (n) => `Dans ${n} jours`,
  nextEvent: "Prochain déjeuner",
  liveToday: "Aujourd'hui · en direct",
  speaker: "Intervenant",
};

export default function HeroEventCard({ event, locale = "fr-FR", labels = {} }) {
  if (!event) return null;
  const L = { ...DEFAULT_LABELS, ...labels };

  const today = new Date().toISOString().split("T")[0];
  const isToday = event.event_date === today;
  const d = daysUntil(event.event_date);
  const dateLabel = isToday
    ? L.today
    : d === 1
    ? L.tomorrow
    : d > 1
    ? L.inDays(d)
    : new Date(event.event_date).toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
      });

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="relative"
      style={{ background: "white", border: `1px solid ${CREAM2}`, borderRadius: 4 }}
    >
      {/* Gold accent left bar — breathes gently */}
      <motion.span
        className="absolute left-0 top-6 bottom-6 w-[2px]"
        style={{ background: GOLD }}
        aria-hidden
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
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
          <Eyebrow color={isToday ? GREEN_TODAY : GOLD}>
            {isToday ? L.liveToday : L.nextEvent}
          </Eyebrow>
          <div className="text-xs font-medium capitalize" style={{ color: INK }}>
            {new Date(event.event_date).toLocaleDateString(locale, {
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
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
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
              {L.speaker}
            </div>
            <div
              className="text-[18px] md:text-[20px]"
              style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
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
                style={{ fontFamily: SERIF, color: NAVY }}
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
