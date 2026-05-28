// NavMenu — role-filtered navigation items for the TopNav.
//
// Items with a `roles` array show only when usePlatformAuth().hasRole matches one
// of them; items WITHOUT `roles` always show for any authenticated user (the
// role-less startup owner accessing their own dossier). Items may set
// `requireAuth: false` to also show when signed out (rare — e.g. a public link).
//
// Props:
//   items   : [{ to, label, roles?: string[], requireAuth?: bool, end?: bool }]
//             `label` is already-resolved copy (FR/EN/DE), never hard-coded here.
//   onNavigate : optional callback fired on item click (e.g. close a mobile menu).
//   orientation: "horizontal" (default) | "vertical" (mobile drawer).
//
// Styling: white text, GOLD active state — matches the navy TopNav.

import React from "react";
import { NavLink } from "react-router-dom";
import { GOLD } from "@/components/design/tokens";
import { usePlatformAuth } from "@/lib/platform/auth";

export default function NavMenu({ items = [], onNavigate, orientation = "horizontal" }) {
  const { isAuthenticated, hasRole } = usePlatformAuth();

  const visible = items.filter((item) => {
    if (item.requireAuth === false) return true;
    if (!isAuthenticated) return false;
    if (!item.roles || item.roles.length === 0) return true; // any signed-in user
    return item.roles.some((r) => hasRole(r));
  });

  if (visible.length === 0) return null;

  const wrap =
    orientation === "vertical"
      ? "flex flex-col gap-1"
      : "flex items-center gap-1 md:gap-2";

  return (
    <nav className={wrap} aria-label="Primary">
      {visible.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className="px-2.5 py-1.5 rounded-[4px] text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-[#0f1f3d]"
          style={({ isActive }) => ({
            color: isActive ? GOLD : "rgba(255,255,255,0.7)",
          })}
        >
          {({ isActive }) => (
            <span className="relative inline-block">
              {item.label}
              <span
                aria-hidden
                className="absolute left-0 right-0 -bottom-1 h-[1.5px] origin-left transition-transform duration-300"
                style={{
                  background: GOLD,
                  transform: isActive ? "scaleX(1)" : "scaleX(0)",
                }}
              />
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
