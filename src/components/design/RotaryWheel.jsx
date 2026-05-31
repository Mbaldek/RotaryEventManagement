// RotaryWheel — la roue officielle Rotary International, marque de la plateforme.
//
// L'asset (public/rotary-mark.png) est extrait du vrai logo du club (landing/
// public/logo.svg) : roue or détourée, fond transparent, lettrage « ROTARY
// INTERNATIONAL » et rayons préservés. Servie en local (pas de dépendance
// réseau, contrairement à l'ancienne image Supabase distante du Login).
//
// Posée partout où la marque doit apparaître : header (TopNav), loader de route,
// écrans d'auth. La rotation continue (`spin`) reprend exactement le geste qu'on
// connaît déjà sur le Login (roue qui tourne lentement) ; elle s'immobilise sous
// `prefers-reduced-motion: reduce` (cf. `.rotary-spin` dans index.css).
//
// Props :
//   size      : number — côté en px (carré). Défaut 30 (taille header).
//   spin      : bool   — active la rotation continue.
//   duration  : number — secondes par tour complet. Header ~18, loader ~2.4,
//                        hero Login ~50. Défaut 18.
//   decorative: bool   — si true, alt="" + aria-hidden (la marque est redondante
//                        avec un wordmark adjacent). Défaut false.
//   title     : string — texte alternatif quand non décoratif.

import React from "react";

export default function RotaryWheel({
  size = 30,
  spin = false,
  duration = 18,
  decorative = false,
  title = "Rotary International",
  className = "",
  style,
  ...rest
}) {
  return (
    <img
      src="/rotary-mark.png"
      alt={decorative ? "" : title}
      aria-hidden={decorative ? true : undefined}
      width={size}
      height={size}
      draggable={false}
      className={["object-contain select-none shrink-0", spin && "rotary-spin", className]
        .filter(Boolean)
        .join(" ")}
      style={{
        width: size,
        height: size,
        ...(spin ? { "--rotary-spin-duration": `${duration}s` } : null),
        ...style,
      }}
      {...rest}
    />
  );
}
