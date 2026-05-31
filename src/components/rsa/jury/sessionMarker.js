// sessionMarker — pastille couleur déterministe + quorum partagés (design lift).
//
// Le mockup validé (docs/design/mockups/jury-admin-views.html) a REJETÉ la
// version "dashboard IA générique" : pas d'emoji, pas de tuiles colorées pleines.
// Le marqueur de session = une petite PASTILLE ronde (7-8px) d'une couleur muted
// DÉSATURÉE, + un filet d'accent 3px à gauche des cartes. La finale est en OR.
//
// Ce module est la SSOT de cette couleur pour JuryAssignmentsAdmin ET
// JuryProfileDrawer (cohérence des pastilles entre la liste, la matrice, la bande
// quorum et le drawer). On NE réutilise PAS getSessionPalette du concours-dashboard
// (il porte aussi des light/border + emojis) : ici on ne veut qu'un hex d'accent.

import { GOLD } from '@/components/design/tokens';

// Quorum recommandé par session (constante partagée).
export const QUORUM_MIN = 3;

// Pool de couleurs muted éditoriales — alignées sur le mockup
// (--s-food / --s-social / --s-tech / --s-health / --s-green) + 3 extra muted
// pour les éditions à plus de 5 sessions qualificatives. Ordre fixe = priorité.
const ACCENT_POOL = [
  '#6f7a4a', // olive (food)
  '#8a5a6a', // mauve (social)
  '#5a5283', // indigo (tech)
  '#43688a', // bleu (health)
  '#46785f', // teal (green)
  '#9a6b1f', // ochre
  '#4a3a5a', // plum
  '#7a5048', // terre cuite désaturée
];

// Hash stable string -> int positif (djb2 simplifié — déterministe entre reloads
// pour qu'un juré ne voie pas la couleur d'une session changer entre deux refresh).
function hashStr(str) {
  let h = 5381;
  const s = String(str || '');
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// getSessionAccent(session) -> hex muted déterministe.
//   - finale (kind==='finale' OU isFinal) -> GOLD.
//   - sinon -> hash(theme || name || id) modulo pool size.
// On hash en priorité sur le theme (stable) puis le name puis l'id.
export function getSessionAccent(session) {
  if (!session) return ACCENT_POOL[0];
  if (session.kind === 'finale' || session.isFinal) return GOLD;
  const seed = session.theme || session.name || session.id || '';
  return ACCENT_POOL[hashStr(seed) % ACCENT_POOL.length];
}

// True si la session est la grande finale.
export function isFinaleSession(session) {
  return !!session && (session.kind === 'finale' || session.isFinal);
}
