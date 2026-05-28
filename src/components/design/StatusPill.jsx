// StatusPill — encodes the platform lifecycles as Élysée pastel pills. One shared
// status→token map so every role (startup / jury / comité / admin) renders identical
// states. NAVY/INK text throughout to hold contrast on the soft tints (audit §7).
//
// Lifecycles supported (kind):
//   eligibility (src/lib/rsa/eligibility.js VERDICT): eligible | flagged | excluded
//   jury        (src/lib/rsa/constants.js JURY_STATUS): draft | live | locked | published
//   dossier     : draft | submitted | under_review | shortlisted | waitlist | finalist | winner | rejected
//                 The dossier kind also accepts the alias 'liste_attente' for waitlist (Module 2,
//                 startups.status uses the French key — the pill maps both to the same tone).
//
// Props:
//   status : string — the raw status value.
//   kind   : "eligibility" | "jury" | "dossier" — disambiguates statuses shared across
//            lifecycles (e.g. "draft"). If omitted, the first kind containing `status`
//            is used (eligibility → jury → dossier).
//   label  : node — resolved copy override (FR/EN/DE). If omitted, the raw status is
//            shown humanized — call sites SHOULD pass a translated `label`.
//   size   : "sm" (default) | "md".
//   dot    : bool (default true) — show the leading status dot.
//   className.
//
// The STATUS_MAP is exported so other components (ListRow, DataTable) reuse the tones.

import React from "react";
import { NAVY, INK, CREAM2, GREEN_TODAY, TINT_SAGE, TINT_BLUE, GOLD, MUTED } from "@/components/design/tokens";
import { DANGER, TINT_DANGER, WARNING, TINT_WARNING } from "@/components/design/tokens.app";

// tone: { bg, dot, text }. Text stays NAVY/INK on pastels for AA contrast; the dot
// carries the semantic hue.
const NEUTRAL = { bg: CREAM2, dot: MUTED, text: INK };
const INFO = { bg: TINT_BLUE, dot: "#5a7ab0", text: NAVY };
const SUCCESS = { bg: TINT_SAGE, dot: GREEN_TODAY, text: NAVY };
const WARN = { bg: TINT_WARNING, dot: WARNING, text: NAVY };
const DANGER_TONE = { bg: TINT_DANGER, dot: DANGER, text: NAVY };
const ACCENT = { bg: "#fdf6e8", dot: GOLD, text: NAVY };
const ACCENT_FILLED = { bg: GOLD, dot: NAVY, text: NAVY };
const LIVE = { bg: TINT_SAGE, dot: GREEN_TODAY, text: GREEN_TODAY };

export const STATUS_MAP = {
  eligibility: {
    eligible: SUCCESS,
    flagged: WARN,
    excluded: DANGER_TONE,
  },
  jury: {
    draft: NEUTRAL,
    live: LIVE,
    locked: INFO,
    published: ACCENT,
  },
  dossier: {
    draft: NEUTRAL,
    submitted: INFO,
    under_review: WARN,
    // waitlist : ton ocre apaisé (WARN) mais distinct sémantiquement de "under_review".
    // Module 2 alias 'liste_attente' (FR business key) mappe vers la même tonalité.
    waitlist: WARN,
    liste_attente: WARN,
    shortlisted: SUCCESS,
    finalist: ACCENT,
    winner: ACCENT_FILLED,
    rejected: DANGER_TONE,
  },
};

const KIND_ORDER = ["eligibility", "jury", "dossier"];

function resolveTone(status, kind) {
  if (kind && STATUS_MAP[kind]?.[status]) return STATUS_MAP[kind][status];
  for (const k of KIND_ORDER) {
    if (STATUS_MAP[k]?.[status]) return STATUS_MAP[k][status];
  }
  return NEUTRAL;
}

function humanize(s) {
  return String(s || "").replace(/_/g, " ");
}

export default function StatusPill({ status, kind, label, size = "sm", dot = true, className = "" }) {
  const tone = resolveTone(status, kind);
  const pad = size === "md" ? "px-3 py-1 text-[12px]" : "px-2.5 py-0.5 text-[11px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ${pad} ${className}`}
      style={{ background: tone.bg, color: tone.text, border: `1px solid ${CREAM2}` }}
    >
      {dot && (
        <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tone.dot }} aria-hidden />
      )}
      <span className="capitalize">{label ?? humanize(status)}</span>
    </span>
  );
}
