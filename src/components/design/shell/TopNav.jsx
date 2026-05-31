// TopNav — sticky navy top bar: a round gold "R" + serif wordmark, a role-aware
// NavMenu, the LanguageSwitcher, and the UserMenu dropdown for the signed-in user.
//
// Role-aware default menu via computePrimaryNav (pure helper) :
//   admin (any form) → Administration (single item)
//   comité / jury     → Sélection and/or Jury
//   default            → Mon dossier + Concours
//
// The bouton "Se déconnecter" inline a été remplacé par <UserMenu /> : Logout
// reste accessible mais est groupé avec d'autres shortcuts (Vue candidat,
// Palmarès public, Documentation) sous l'identité du user.
//
// Props :
//   wordmark   : node — brand title. When omitted, falls back to a neutral
//                trilingual default ("Plateforme" / "Platform" / "Plattform").
//   subtitle   : node — small uppercase line under the wordmark (optional).
//   items      : NavMenu items override (else computePrimaryNav default below).
//                Compat préservée : passe un tableau d'items déjà labelisé
//                (string ou node), pas un dico { fr, en, de }.
//   right      : node — extra slot before the language switcher (optional).
//   homeTo     : string — wordmark link target (default "/").
//
// Mobile : le menu se replie derrière un hamburger (NavMenu vertical drawer),
// les mêmes items qu'en desktop pour cohérence. UserMenu reste visible juste
// en dessous du drawer.

import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { NAVY, SERIF } from "@/components/design/tokens";
import RotaryWheel from "@/components/design/RotaryWheel";
import { usePlatformAuth } from "@/lib/platform/auth";
import { useLang } from "@/lib/platform/i18n";
import NavMenu from "@/components/design/shell/NavMenu";
import LanguageSwitcher from "@/components/design/shell/LanguageSwitcher";
import UserMenu from "@/components/design/shell/UserMenu";
import { computePrimaryNav } from "@/lib/platform/computePrimaryNav";

const NAV_T = {
  menu: { fr: "Menu", en: "Menu", de: "Menü" },
  // Neutral default wordmark — pages avec branding spécifique passent leur propre prop.
  defaultWordmark: { fr: "Plateforme", en: "Platform", de: "Plattform" },
};

export default function TopNav({
  wordmark,
  subtitle,
  items,
  right,
  homeTo = "/",
}) {
  const { t } = useLang();
  // Default neutre + trilingue quand aucun wordmark n'est passé en prop.
  const resolvedWordmark = wordmark ?? t(NAV_T.defaultWordmark);
  const {
    isAuthenticated,
    roles,
    clubMemberships,
    // V2.5 — competitionAdminEditions n'existe pas encore sur le ctx auth :
    // on degrade gracieusement avec [] (le helper sait gérer null/undefined).
  } = usePlatformAuth();
  const [open, setOpen] = useState(false);

  // ÉQUIPE C nav-refactor : computePrimaryNav remplace l'ancien bloc defaultItems
  // hand-rolled. Labels résolus via t() pour respecter useLang. Items sans
  // `show` filter — computePrimaryNav garantit déjà la cohérence rôle.
  const defaultItems = useMemo(() => {
    if (!isAuthenticated) return [];
    return computePrimaryNav({
      roles,
      clubMemberships,
      competitionAdminEditions: [],
    }).map((it) => ({ to: it.to, label: t(it.label) }));
  }, [isAuthenticated, roles, clubMemberships, t]);

  const menuItems = items || defaultItems;

  return (
    <header
      id="nav"
      role="banner"
      className="sticky top-0 z-50"
      style={{ background: NAVY, borderBottom: "1px solid rgba(201,168,76,0.18)" }}
    >
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-3">
        {/* Wordmark */}
        <Link
          to={homeTo}
          className="flex items-center gap-2.5 min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-[#0f1f3d] rounded-[4px]"
        >
          {/* Marque officielle Rotary International — roue or qui tourne lentement
              (le geste qu'on connaît déjà sur le Login). Décorative : le wordmark
              adjacent porte déjà le nom. */}
          <RotaryWheel size={32} spin duration={18} decorative />
          <span className="min-w-0">
            <span
              className="block text-[13px] font-semibold text-white truncate"
              style={{ fontFamily: SERIF }}
            >
              {resolvedWordmark}
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
          {isAuthenticated && <UserMenu />}
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
            <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(201,168,76,0.12)" }}>
              <UserMenu />
            </div>
          )}
        </div>
      )}
    </header>
  );
}
