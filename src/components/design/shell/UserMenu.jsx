// UserMenu — dropdown éditorial Élysée pour l'avatar/email cliquable dans TopNav.
//
// Remplace le bouton "Se déconnecter" autonome de la TopNav : le sign-out
// devient une entry parmi d'autres dans un menu groupé sous l'identité du user.
// Pourquoi ? Trois shortcuts cross-rôle utiles (vue candidat, palmarès public,
// doc onboarding) qui méritent un toit propre, et l'identité (email) devient
// le visual anchor naturel.
//
// API :
//   <UserMenu />   — lit usePlatformAuth() pour l'email + signOut, useLang pour i18n.
//
// a11y :
//   * Trigger : <button aria-haspopup="menu" aria-expanded={open}>
//   * Panel  : role="menu" + role="menuitem" sur chaque entry
//   * ESC ferme le menu et redonne le focus au trigger
//   * Click-outside ferme le menu
//   * Focus-visible ring GOLD via FOCUS_RING_CLASS
//
// Implémentation propre, pas de lib dropdown : useState + useRef + useEffect
// pour le click-outside / ESC. Animation framer-motion (fade+translate) avec
// AnimatePresence pour l'apparition / disparition, EASE token Élysée.

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, User, Trophy, BookOpen, LogOut } from 'lucide-react';
import { GOLD, NAVY, CREAM, INK, EASE } from '@/components/design/tokens';
import { FOCUS_RING_CLASS, HAIRLINE } from '@/components/design/tokens.app';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';

// — i18n labels —
const T = {
  candidateView: { fr: 'Vue candidat', en: 'Candidate view', de: 'Bewerber-Ansicht' },
  publicResults: { fr: 'Palmarès public', en: 'Public results', de: 'Öffentliche Ergebnisse' },
  documentation: { fr: 'Documentation', en: 'Documentation', de: 'Dokumentation' },
  signOut: { fr: 'Se déconnecter', en: 'Sign out', de: 'Abmelden' },
  menuLabel: { fr: 'Menu utilisateur', en: 'User menu', de: 'Benutzermenü' },
  accountAria: { fr: 'Compte', en: 'Account', de: 'Konto' },
};

// Tronque la partie locale d'un email pour rester lisible dans la TopNav sans
// déborder. On garde le domaine complet (utile pour reconnaître son compte).
// "mathieu.balderacchi@gmail.com" -> "mathieu.balderacc…@gmail.com" sur écrans étroits
// (mais on s'autorise jusqu'à ~24 chars total via CSS truncate).
function shortenEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email;
}

export default function UserMenu() {
  const { authUser, signOut } = usePlatformAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const triggerId = useId();

  const close = useCallback(() => setOpen(false), []);

  // Click-outside + ESC.
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (ev) => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;
      if (trigger.contains(ev.target) || panel.contains(ev.target)) return;
      setOpen(false);
    };
    const onKeyDown = (ev) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        setOpen(false);
        // Redonne le focus au trigger pour respecter le pattern "Escape
        // restore focus" recommandé par l'APG.
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const go = useCallback(
    (path) => {
      setOpen(false);
      navigate(path);
    },
    [navigate],
  );

  const onSignOut = useCallback(async () => {
    setOpen(false);
    try {
      await signOut();
    } catch {
      /* signOut interne logge déjà. On ne propage pas. */
    }
  }, [signOut]);

  // Si pas d'auth, on ne rend rien — la TopNav appelle UserMenu seulement quand
  // isAuthenticated, mais on garde une garde défensive pour les snapshots.
  if (!authUser) return null;

  const emailDisplay = shortenEmail(authUser.email || '');

  // Style commun pour les menuitems — light surface CREAM, INK text, GOLD active rule.
  const itemBase =
    'flex items-center gap-2.5 w-full px-3 py-2 text-left text-[13px] font-medium transition-colors ' +
    'hover:bg-[rgba(201,168,76,0.08)] ' +
    FOCUS_RING_CLASS;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-label={t(T.accountAria)}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={
          'inline-flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[13px] font-medium transition-colors ' +
          FOCUS_RING_CLASS +
          ' focus-visible:ring-offset-[#0f1f3d]'
        }
        style={{ color: 'rgba(255,255,255,0.85)' }}
      >
        {/* Pastille avatar — initiale en GOLD sur NAVY translucide */}
        <span
          aria-hidden
          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
          style={{
            background: 'rgba(201,168,76,0.18)',
            color: GOLD,
            border: '1px solid rgba(201,168,76,0.35)',
          }}
        >
          {emailDisplay.charAt(0).toUpperCase() || '?'}
        </span>
        <span className="hidden sm:inline max-w-[180px] truncate">{emailDisplay}</span>
        <ChevronDown
          className="w-3.5 h-3.5 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="menu"
            aria-labelledby={triggerId}
            aria-label={t(T.menuLabel)}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="absolute right-0 top-full mt-2 w-56 rounded-[4px] overflow-hidden z-50"
            style={{
              background: CREAM,
              border: `1px solid ${HAIRLINE}`,
              boxShadow: '0 8px 24px rgba(15,31,61,0.18)',
              color: INK,
            }}
          >
            {/* En-tête : email complet sur fond CREAM, rappel d'identité */}
            <div
              className="px-3 py-2 text-[11px] uppercase tracking-[0.08em] truncate"
              style={{ color: NAVY, borderBottom: `1px solid ${HAIRLINE}` }}
              title={emailDisplay}
            >
              {emailDisplay}
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={() => go('/MonDossier')}
              className={itemBase}
              style={{ color: INK }}
            >
              <User className="w-3.5 h-3.5" style={{ color: GOLD }} aria-hidden />
              {t(T.candidateView)}
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => go('/Resultats')}
              className={itemBase}
              style={{ color: INK }}
            >
              <Trophy className="w-3.5 h-3.5" style={{ color: GOLD }} aria-hidden />
              {t(T.publicResults)}
            </button>

            <a
              role="menuitem"
              href="/docs/onboarding/generic.md"
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className={itemBase}
              style={{ color: INK, textDecoration: 'none' }}
            >
              <BookOpen className="w-3.5 h-3.5" style={{ color: GOLD }} aria-hidden />
              {t(T.documentation)}
            </a>

            <div style={{ borderTop: `1px solid ${HAIRLINE}` }}>
              <button
                type="button"
                role="menuitem"
                onClick={onSignOut}
                className={itemBase}
                style={{ color: INK }}
              >
                <LogOut className="w-3.5 h-3.5" style={{ color: GOLD }} aria-hidden />
                {t(T.signOut)}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
