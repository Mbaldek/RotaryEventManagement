// TopNav — sticky navy top bar: a round gold "R" + serif wordmark, a role-aware
// NavMenu, the LanguageSwitcher, and an account / sign-out affordance. Formalizes
// the hand-rolled navy `Header` pattern from RsaFinaleRsvp / StartupUpload.
//
// Reads usePlatformAuth() internally to build the role-aware default menu:
//   startup (any signed-in, role-less owner) → "Mon dossier"
//   jury   → "Jury"
//   comité → "Sélection"
//   admin  → "Admin"
// Labels are trilingual via useLang. Pass `items` to override the menu entirely.
//
// Props:
//   wordmark   : node — brand title (default "Rotary Startup Award 2026").
//   subtitle   : node — small uppercase line under the wordmark (optional).
//   items      : NavMenu items override (else the role-aware default below).
//   right      : node — extra slot before the language switcher (optional).
//   homeTo     : string — wordmark link target (default "/").
//
// Mobile: the menu collapses behind a hamburger toggle (vertical NavMenu drawer).

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";
import { NAVY, GOLD, SERIF } from "@/components/design/tokens";
import { usePlatformAuth } from "@/lib/platform/auth";
import { useLang } from "@/lib/platform/i18n";
import NavMenu from "@/components/design/shell/NavMenu";
import LanguageSwitcher from "@/components/design/shell/LanguageSwitcher";

const NAV_T = {
  myDossier: { fr: "Mon dossier", en: "My application", de: "Mein Dossier" },
  jury: { fr: "Jury", en: "Jury", de: "Jury" },
  selection: { fr: "Sélection", en: "Selection", de: "Auswahl" },
  admin: { fr: "Admin", en: "Admin", de: "Admin" },
  signOut: { fr: "Se déconnecter", en: "Sign out", de: "Abmelden" },
  menu: { fr: "Menu", en: "Menu", de: "Menü" },
};

export default function TopNav({
  wordmark = "Rotary Startup Award 2026",
  subtitle,
  items,
  right,
  homeTo = "/",
}) {
  const { t } = useLang();
  const { isAuthenticated, signOut } = usePlatformAuth();
  const [open, setOpen] = useState(false);

  // Default role-aware menu. A role-less signed-in user (startup owner) sees only
  // "Mon dossier"; jury/comité/admin see their hubs.
  const defaultItems = [
    { to: "/MonDossier", label: t(NAV_T.myDossier) },
    { to: "/Jury", label: t(NAV_T.jury), roles: ["jury"] },
    { to: "/Selection", label: t(NAV_T.selection), roles: ["comite"] },
    { to: "/Admin", label: t(NAV_T.admin), roles: ["admin"] },
  ];
  const menuItems = items || defaultItems;

  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: NAVY, borderBottom: "1px solid rgba(201,168,76,0.18)" }}
    >
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-3">
        {/* Wordmark */}
        <Link
          to={homeTo}
          className="flex items-center gap-2.5 min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-[#0f1f3d] rounded-[4px]"
        >
          <span
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{ background: `linear-gradient(135deg,${GOLD},#a07828)`, color: NAVY }}
            aria-hidden
          >
            R
          </span>
          <span className="min-w-0">
            <span
              className="block text-[13px] font-semibold text-white truncate"
              style={{ fontFamily: SERIF }}
            >
              {wordmark}
            </span>
            {subtitle && (
              <span className="block text-[9.5px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.45)" }}>
                {subtitle}
              </span>
            )}
          </span>
        </Link>

        {/* Desktop right cluster */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <NavMenu items={menuItems} />
          {right}
          <LanguageSwitcher variant="onNavy" />
          {isAuthenticated && (
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-[#0f1f3d]"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              <LogOut className="w-3.5 h-3.5" />
              {t(NAV_T.signOut)}
            </button>
          )}
        </div>

        {/* Mobile: language + hamburger */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          <LanguageSwitcher variant="onNavy" />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={t(NAV_T.menu)}
            aria-expanded={open}
            className="p-2 rounded-[4px] text-white outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-[#0f1f3d]"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          className="md:hidden px-4 pb-4 pt-1"
          style={{ borderTop: "1px solid rgba(201,168,76,0.12)" }}
        >
          <NavMenu items={menuItems} orientation="vertical" onNavigate={() => setOpen(false)} />
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-[#0f1f3d]"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              <LogOut className="w-3.5 h-3.5" />
              {t(NAV_T.signOut)}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
