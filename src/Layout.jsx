import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Settings, UtensilsCrossed } from "lucide-react";
import NotificationProvider from "@/components/notifications/NotificationProvider";

// Pages rendered standalone (no Rotary lunch chrome, no lunch notifications).
// These are the Rotary Startup Award sub-site — separate from the lunch app.
const STANDALONE_PAGES = new Set(["RsaScore", "RsaDashboard", "RsaJuryForm", "RsaJuryView", "RsaAdmin", "StartupUpload"]);

export default function Layout({ children, currentPageName }) {
  if (STANDALONE_PAGES.has(currentPageName)) {
    return <>{children}</>;
  }
  return (
    <div className="min-h-screen bg-stone-50">
      <style>{`
        :root {
          --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
        }
        body {
          font-family: var(--font-sans);
          -webkit-font-smoothing: antialiased;
        }
      `}</style>

      {/* Minimal top bar */}
      <nav className="bg-white border-b border-stone-200/60 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            to={createPageUrl("Index")}
            className="flex items-center gap-3 text-stone-800 hover:text-amber-700 transition-colors"
          >
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698886adec2381a5bebb878f/8eca9f2bf_rotaryinterrouecrop.png" 
              alt="Rotary Logo" 
              className="w-8 h-8"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-wide leading-tight">Rotary Club de Paris</span>
              <span className="text-[10px] text-stone-500 leading-tight">Gestionnaire de réunion</span>
            </div>
          </Link>
          <Link
            to={createPageUrl("AdminControl")}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Admin
          </Link>
        </div>
      </nav>

      <NotificationProvider>
        {children}
      </NotificationProvider>
    </div>
  );
}