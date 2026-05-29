// SafeBackLink — petit lien "← Retour" Élysée à poser en haut d'une page
// interne (Admin, Selection, Jury, MonDossier, …). Utilise useSafeBack pour
// faire navigate(-1) quand on a une entrée précédente dans le SPA, ou un
// fallback explicite (ex. "/Admin") quand l'utilisateur a atterri direct
// (deep-link, ouverture d'onglet, magic-link).
//
// Pourquoi ce composant : centraliser le style (Eyebrow gold + flèche + label)
// pour éviter le copier-coller dans MasterCockpit / ClubCockpit / Admin /
// MonDossier. Look hairline minimal pour rester discret au-dessus des headers
// éditoriaux existants.
//
// Props :
//   to       : chemin de fallback si pas d'history (default "/").
//   label    : libellé (default "Retour").
//   className: extra classes utilitaires Tailwind.

import React from "react";
import { ArrowLeft } from "lucide-react";
import { GOLD, MUTED } from "@/components/design/tokens";
import { useSafeBack } from "@/lib/platform/useSafeBack";

export default function SafeBackLink({
  to = "/",
  label = "Retour",
  className = "",
}) {
  const safeBack = useSafeBack(to);
  return (
    <button
      type="button"
      onClick={safeBack}
      className={`inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.16em] font-medium hover:text-[#0f1f3d] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] rounded-[2px] px-1 py-0.5 ${className}`}
      style={{ color: MUTED }}
      aria-label={label}
    >
      <ArrowLeft className="w-3.5 h-3.5" aria-hidden style={{ color: GOLD }} />
      <span>{label}</span>
    </button>
  );
}
