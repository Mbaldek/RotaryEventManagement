// UpcomingList — numbered editorial list of upcoming events. Eyebrow + serif
// section title, then rows separated by hairlines: zero-padded index, a gold
// uppercase type badge, a J-X countdown on the right, serif title and a
// capitalized date line. Scroll-reveals row by row. Extracted from
// src/pages/Index.jsx; visual output unchanged when used with default props.
//
// Props:
//   events     : array  — rows with { id, event_date, event_type, title, speaker_name }
//   eyebrow    : node    — section eyebrow copy (default "À venir")
//   title      : node    — serif heading lead (default "Les prochains")
//   titleItalic: node    — italic accent of the heading (default "rendez-vous")
//   typeLabels : object  — map of event_type → human label (default French map)
//   locale     : string  — date locale (default "fr-FR")
//   limit      : number  — max rows shown (default 4)
//
// Trilingual note: eyebrow/title/titleItalic/typeLabels are copy — pass resolved
// i18n values at the call site; defaults reproduce the original French output.

import React from "react";
import { motion } from "framer-motion";
import { NAVY, GOLD, CREAM2, INK, MUTED, SERIF, EASE } from "@/components/design/tokens";
import Eyebrow from "@/components/design/Eyebrow";

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

const DEFAULT_TYPE_LABELS = {
  dejeuner_statutaire: "Déjeuner statutaire",
  reunion_commission: "Commission",
  soiree: "Soirée",
  autre: "Autre",
};

export default function UpcomingList({
  events,
  eyebrow = "À venir",
  title = "Les prochains",
  titleItalic = "rendez-vous",
  typeLabels = DEFAULT_TYPE_LABELS,
  locale = "fr-FR",
  limit = 4,
}) {
  const today = new Date().toISOString().split("T")[0];
  const items = events.filter((e) => e.event_date > today).slice(0, limit);

  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-15% 0px" }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        className="text-[26px] md:text-[34px] leading-[1.05] mb-6"
        style={{ fontFamily: SERIF, color: NAVY }}
      >
        {title}{" "}
        <span className="italic" style={{ color: NAVY }}>
          {titleItalic}
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
              transition={{ duration: 0.55, delay: i * 0.08, ease: EASE }}
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
                    {typeLabels[ev.event_type] || ev.event_type}
                  </span>
                  <span className="h-[1px] flex-1" style={{ background: CREAM2 }} />
                  <span className="text-[10px]" style={{ color: MUTED }}>
                    J-{d}
                  </span>
                </div>
                <div
                  className="text-[17px] md:text-[19px] leading-snug"
                  style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
                >
                  {ev.title || ev.speaker_name || typeLabels[ev.event_type]}
                </div>
                <div className="text-xs mt-1 capitalize" style={{ color: INK }}>
                  {new Date(ev.event_date).toLocaleDateString(locale, {
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
