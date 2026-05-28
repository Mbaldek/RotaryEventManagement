// Skeleton — placeholder loader Élysée (CREAM pulse).
//
// Bloc rectangulaire à coins légers (rounded-[4px]) qui pulse doucement avec
// le rythme natif de Tailwind `animate-pulse`. Couleur : CREAM2 (#e8e3d9)
// teintée vers un beige un peu plus chaud (#f3eee5) pour rester lisible sur
// background blanc OU CREAM sans saturer.
//
// Respecte `prefers-reduced-motion` : `motion-reduce:animate-none` désactive
// le pulse pour les utilisateurs sensibles aux animations.
//
// Usage :
//   <Skeleton height={20} width="60%" />
//   <Skeleton height={48} className="mb-2" />
//   <div className="space-y-2">
//     {[0,1,2].map((i) => <Skeleton key={i} height={56} />)}
//   </div>
//
// Props :
//   height?   number | string  Hauteur (px par défaut, ou string CSS).
//   width?    number | string  Largeur (default '100%').
//   className?  string         Classes additionnelles (ex: 'mb-2', 'rounded-full').

import React from 'react';

export default function Skeleton({ height = 40, width = '100%', className = '' }) {
  const h = typeof height === 'number' ? `${height}px` : height;
  const w = typeof width === 'number' ? `${width}px` : width;
  return (
    <div
      aria-hidden
      className={`rounded-[4px] animate-pulse motion-reduce:animate-none ${className}`}
      style={{ height: h, width: w, background: '#f3eee5' }}
    />
  );
}

// SkeletonList — stack de N skeletons pour une liste.
// Pratique pour remplacer un <Loader2 /> dans CompetitionsTab / ClubsTab / etc.
export function SkeletonList({ count = 3, height = 72, gap = 12 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </div>
  );
}
