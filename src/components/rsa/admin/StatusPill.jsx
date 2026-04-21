import React from "react";
import { JURY_STATUS } from "@/lib/rsa/constants";

const MAP = {
  draft: { label: "DRAFT", cls: "bg-stone-200 text-stone-700 border-stone-300" },
  live: { label: "● LIVE", cls: "bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse" },
  locked: { label: "LOCKED", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  published: { label: "PUBLISHED", cls: "bg-indigo-100 text-indigo-800 border-indigo-300" },
};

export default function StatusPill({ status, size = "md" }) {
  const m = MAP[status] || MAP.draft;
  const pad = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wider border rounded-full ${pad} ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

export const NEXT_STATE = {
  [JURY_STATUS.DRAFT]: { to: JURY_STATUS.LIVE, label: "Open scoring", tone: "emerald" },
  [JURY_STATUS.LIVE]: { to: JURY_STATUS.LOCKED, label: "Lock session", tone: "amber" },
  [JURY_STATUS.LOCKED]: { to: JURY_STATUS.PUBLISHED, label: "Publish results", tone: "indigo" },
  [JURY_STATUS.PUBLISHED]: null,
};

export const PREV_STATE = {
  [JURY_STATUS.LIVE]: { to: JURY_STATUS.DRAFT, label: "Re-close (draft)" },
  [JURY_STATUS.LOCKED]: { to: JURY_STATUS.LIVE, label: "Re-open scoring" },
  [JURY_STATUS.PUBLISHED]: { to: JURY_STATUS.LOCKED, label: "Unpublish" },
};
